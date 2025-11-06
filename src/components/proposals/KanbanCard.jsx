
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  DollarSign,
  Building2,
  AlertCircle,
  MoreVertical,
  Edit,
  Archive,
  Trash2,
  CheckSquare,
  MessageCircle,
  Paperclip,
  Sparkles,
  PlayCircle,
  Shield,
  GripVertical,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import ChecklistItemRenderer from "./ChecklistItemRenderer";
import BasicInfoModal from "./modals/BasicInfoModal";
import TeamFormationModal from "./modals/TeamFormationModal";
import ResourceGatheringModal from "./modals/ResourceGatheringModal";
import SolicitationUploadModal from "./modals/SolicitationUploadModal";
import EvaluationModal from "./modals/EvaluationModal";
import WinStrategyModal from "./modals/WinStrategyModal";
import ContentPlanningModal from "./modals/ContentPlanningModal";
import PricingReviewModal from "./modals/PricingReviewModal";

export default function KanbanCard({
  proposal,
  isDragging,
  isDragDisabled,
  column,
  onCardClick
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Modal state - SIMPLY store which modal is open
  const [activeModal, setActiveModal] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['proposal-tasks-count', proposal.id],
    queryFn: () => base44.entities.ProposalTask.filter({ proposal_id: proposal.id }),
    enabled: !!proposal.id,
    initialData: []
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ['proposal-subtasks-count', proposal.id],
    queryFn: () => base44.entities.ProposalSubtask.filter({ proposal_id: proposal.id }),
    enabled: !!proposal.id,
    initialData: []
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['proposal-comments-count', proposal.id],
    queryFn: () => base44.entities.ProposalComment.filter({ proposal_id: proposal.id }),
    enabled: !!proposal.id,
    initialData: []
  });

  const { data: files = [] } = useQuery({
    queryKey: ['proposal-files-count', proposal.id],
    queryFn: () => base44.entities.SolicitationDocument.filter({ proposal_id: proposal.id }),
    enabled: !!proposal.id,
    initialData: []
  });

  const checklistItems = column?.checklist_items || [];
  const checklistStatus = proposal.current_stage_checklist_status?.[column?.id] || {};
  const completedChecklistItems = checklistItems.filter(item =>
    checklistStatus[item.id]?.completed
  ).length;
  const hasActionRequired = checklistItems.some(item =>
    item.required && !checklistStatus[item.id]?.completed
  );

  const completedTasks = tasks.filter(t => t.status === 'completed').length +
                         subtasks.filter(s => s.status === 'completed').length;
  const totalTasks = tasks.length + subtasks.length;

  const daysUntilDue = proposal.due_date ? moment(proposal.due_date).diff(moment(), 'days') : null;
  const isOverdue = proposal.due_date && moment(proposal.due_date).isBefore(moment(), 'day');
  const isDueSoon = !isOverdue && daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0;

  const updateProposalMutation = useMutation({
    mutationFn: (updates) => base44.entities.Proposal.update(proposal.id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals'] })
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Proposal.delete(proposal.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals'] })
  });

  const handleArchive = (e) => {
    e.stopPropagation();
    updateProposalMutation.mutate({ status: 'archived', custom_workflow_stage_id: null });
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    const phase = proposal.current_phase || 'phase1';
    navigate(createPageUrl("ProposalBuilder") + `?id=${proposal.id}&phase=${phase}`);
  };

  const handleCardClick = (e) => {
    // Don't trigger click if we're dragging or if clicking interactive elements
    if (isDragging) return; // Changed from snapshot.isDragging
    if (e.target.closest('button') || e.target.closest('[role="menu"]') || e.target.closest('input')) return;
    onCardClick?.(proposal);
  };

  // Handle checklist item click - SIMPLIFIED LOGIC
  const handleChecklistItemClick = async (item) => {
    console.log('[KanbanCard] 🎯 CHECKLIST CLICKED:', {
      label: item.label,
      action: item.associated_action,
      type: item.type
    });

    // If no associated action, treat as manual checkbox toggle
    if (!item.associated_action) {
      console.log('[KanbanCard] No action, toggling checkbox');
      await toggleChecklistItem(item);
      return;
    }

    // Determine which modal to open based on action
    let modalToOpen = null;

    // Direct mapping of ALL possible action names to modals
    if (item.associated_action.includes('basic_info') || 
        item.associated_action.includes('phase1')) {
      modalToOpen = 'BasicInfoModal';
    } else if (item.associated_action.includes('team') || 
               item.associated_action.includes('phase2')) {
      modalToOpen = 'TeamFormationModal';
    } else if (item.associated_action.includes('resource')) {
      modalToOpen = 'ResourceGatheringModal';
    } else if (item.associated_action.includes('solicitation') || 
               item.associated_action.includes('upload') ||
               item.associated_action.includes('phase3')) {
      modalToOpen = 'SolicitationUploadModal';
    } else if (item.associated_action.includes('evaluation') || 
               item.associated_action.includes('phase4')) {
      modalToOpen = 'EvaluationModal';
    } else if (item.associated_action.includes('win') || 
               item.associated_action.includes('strategy') ||
               item.associated_action.includes('phase5')) {
      modalToOpen = 'WinStrategyModal';
    } else if (item.associated_action.includes('content') || 
               item.associated_action.includes('plan')) {
      modalToOpen = 'ContentPlanningModal';
    } else if (item.associated_action.includes('pricing')) {
      modalToOpen = 'PricingReviewModal';
    }

    if (modalToOpen) {
      console.log('[KanbanCard] ✅ Opening modal:', modalToOpen);
      setActiveModal(modalToOpen);
    } else {
      console.log('[KanbanCard] ⚠️ No modal mapping for:', item.associated_action);
      // Fallback to checkbox toggle if no modal was opened
      await toggleChecklistItem(item);
    }
  };

  // Toggle checkbox item
  const toggleChecklistItem = async (item) => {
    const currentStatus = checklistStatus[item.id]?.completed || false;
    const newChecklistStatus = {
      ...proposal.current_stage_checklist_status,
      [column.id]: {
        ...(proposal.current_stage_checklist_status?.[column.id] || {}),
        [item.id]: {
          completed: !currentStatus,
          completed_by: 'current_user',
          completed_date: new Date().toISOString()
        }
      }
    };

    await updateProposalMutation.mutateAsync({
      current_stage_checklist_status: newChecklistStatus
    });
  };

  // Handle modal close
  const handleModalClose = () => {
    console.log('[KanbanCard] 🚪 Closing modal');
    setActiveModal(null);
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
  };

  // Render active modal - DIRECT COMPONENT RENDERING
  const renderActiveModal = () => {
    if (!activeModal) return null;
    
    console.log('[KanbanCard] 🎭 Rendering modal:', activeModal);

    const modalProps = {
      isOpen: true,
      onClose: handleModalClose,
      proposalId: proposal.id
    };

    // Render the correct modal component
    switch (activeModal) {
      case 'BasicInfoModal':
        return <BasicInfoModal {...modalProps} />;
      case 'TeamFormationModal':
        return <TeamFormationModal {...modalProps} />;
      case 'ResourceGatheringModal':
        return <ResourceGatheringModal {...modalProps} />;
      case 'SolicitationUploadModal':
        return <SolicitationUploadModal {...modalProps} />;
      case 'EvaluationModal':
        return <EvaluationModal {...modalProps} />;
      case 'WinStrategyModal':
        return <WinStrategyModal {...modalProps} />;
      case 'ContentPlanningModal':
        return <ContentPlanningModal {...modalProps} />;
      case 'PricingReviewModal':
        return <PricingReviewModal {...modalProps} />;
      default:
        console.error('[KanbanCard] ❌ Unknown modal:', activeModal);
        return null;
    }
  };

  return (
    <>
      {/* The outer div consuming react-beautiful-dnd props (`provided.innerRef`, etc.)
          is now expected to be in the parent component.
          This div is the direct draggable element that receives styling. */}
      <div
        onClick={handleCardClick}
        className={cn(
          "relative group",
          isDragging // Changed from snapshot.isDragging
            ? "shadow-2xl opacity-90"
            : "shadow-sm hover:shadow-md transition-shadow",
          hasActionRequired && "ring-2 ring-orange-400",
          isDragDisabled && "opacity-60 cursor-not-allowed"
        )}
      >
        <Card className="relative bg-white">
          <CardContent className="p-4">
            {/* Drag Indicator - Visual only */}
            {!isDragDisabled && !isDragging && ( // Changed from snapshot.isDragging
              <div className="absolute left-1 top-2 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none">
                <GripVertical className="w-4 h-4 text-slate-600" />
              </div>
            )}

            {/* Action Required Pulse */}
            {hasActionRequired && (
              <div className="absolute -top-2 -left-2 z-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-75" />
                  <div className="relative w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <PlayCircle className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Disabled Indicator */}
            {isDragDisabled && (
              <div className="absolute top-2 right-2">
                <Shield className="w-5 h-5 text-orange-500" title="Cannot move from this column" />
              </div>
            )}

            {/* Three Dots Menu */}
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Proposal
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Card Content */}
            <div className="space-y-3 pr-6">
              {/* Title */}
              <div>
                <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-1">
                  {proposal.proposal_name}
                </h4>
                {proposal.solicitation_number && (
                  <p className="text-xs text-slate-500 font-mono">
                    {proposal.solicitation_number}
                  </p>
                )}
              </div>

              {/* Agency & Project */}
              {(proposal.agency_name || proposal.project_title) && (
                <div className="space-y-1">
                  {proposal.agency_name && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{proposal.agency_name}</span>
                    </div>
                  )}
                  {proposal.project_title && (
                    <p className="text-xs text-slate-600 line-clamp-2 pl-5">
                      {proposal.project_title}
                    </p>
                  )}
                </div>
              )}

              {/* Checklist - NOW USING ChecklistItemRenderer */}
              {checklistItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Checklist</span>
                    <span className="text-xs text-slate-600">{completedChecklistItems}/{checklistItems.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {checklistItems.slice(0, 3).map((item) => (
                      <ChecklistItemRenderer
                        key={item.id}
                        item={item}
                        isCompleted={checklistStatus[item.id]?.completed}
                        onItemClick={handleChecklistItemClick}
                        proposal={proposal}
                      />
                    ))}
                    {checklistItems.length > 3 && (
                      <p className="text-xs text-slate-500 pl-5.5">+{checklistItems.length - 3} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {proposal.progress_summary?.completion_percentage >= 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Progress</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {proposal.progress_summary.completion_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        proposal.progress_summary.completion_percentage === 100 ? 'bg-green-500' :
                        proposal.progress_summary.completion_percentage >= 75 ? 'bg-blue-500' :
                        proposal.progress_summary.completion_percentage >= 50 ? 'bg-yellow-500' :
                        'bg-orange-500'
                      )}
                      style={{ width: `${proposal.progress_summary.completion_percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Metadata Icons */}
              <div className="flex items-center gap-2 flex-wrap">
                {totalTasks > 0 && (
                  <Badge variant="secondary" className="text-xs font-medium">
                    <CheckSquare className="w-3 h-3 mr-1" />
                    {completedTasks}/{totalTasks}
                  </Badge>
                )}

                {comments.length > 0 && (
                  <Badge variant="secondary" className="text-xs font-medium">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    {comments.length}
                  </Badge>
                )}

                {files.length > 0 && (
                  <Badge variant="secondary" className="text-xs font-medium">
                    <Paperclip className="w-3 h-3 mr-1" />
                    {files.length}
                  </Badge>
                )}

                {(proposal.evaluation_results || proposal.ai_confidence_score) && (
                  <Badge variant="secondary" className="text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Badge>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                {proposal.due_date && (
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs",
                    isOverdue ? 'text-red-600 font-semibold' :
                    isDueSoon ? 'text-orange-600 font-semibold' :
                    'text-slate-600'
                  )}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` :
                      isDueSoon ? `${daysUntilDue}d left` :
                      moment(proposal.due_date).format('MMM D')}
                    </span>
                  </div>
                )}

                {proposal.contract_value && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 ml-auto">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="font-medium">
                      ${(proposal.contract_value / 1000000).toFixed(1)}M
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Urgency Corner Indicator */}
            {(isOverdue || isDueSoon) && (
              <div className={cn(
                "absolute top-0 right-0 w-0 h-0 border-t-[24px] border-r-[24px] rounded-tr-lg",
                isOverdue ? "border-t-red-500 border-r-red-500" : "border-t-orange-400 border-r-orange-400"
              )} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Delete Proposal?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold text-slate-900">
                "{proposal.proposal_name}"
              </p>
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <p className="text-red-900 font-semibold text-sm">
                  ⚠️ This cannot be undone!
                </p>
                <p className="text-red-800 text-sm mt-2">
                  All data will be permanently deleted.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                deleteMutation.mutate();
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Render Modal Dynamically */}
      {renderActiveModal()}
    </>
  );
}
