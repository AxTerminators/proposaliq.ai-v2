
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
  Shield, // Shield icon is still imported but its usage is removed as per the changes.
  GripVertical,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { getActionConfig, isModalAction, isNavigateAction, isAIAction } from "./ChecklistActionRegistry";
import ChecklistItemRenderer from "./ChecklistItemRenderer";
import BasicInfoModal from "./modals/BasicInfoModal";
import TeamFormationModal from "./modals/TeamFormationModal";
import ResourceGatheringModal from "./modals/ResourceGatheringModal";
import SolicitationUploadModal from "./modals/SolicitationUploadModal";
import EvaluationModal from "./modals/EvaluationModal";
import WinStrategyModal from "./modals/WinStrategyModal";
import ContentPlanningModal from "./modals/ContentPlanningModal";
import PricingReviewModal from "./modals/PricingReviewModal";
import WinProbabilityTracker from "../analytics/WinProbabilityTracker"; // NEW IMPORT

export default function KanbanCard({
  proposal,
  column,
  provided, // NEW PROP
  organization, // NEW PROP
  onCardClick,
  dragHandleProps // NEW PROP
  // isDragging, // REMOVED PROP (now handled by provided.draggableProps.style internally by rbd)
  // isDragDisabled, // REMOVED PROP
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Modal state - store modal NAME as string
  const [activeModalName, setActiveModalName] = useState(null);

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

  // Map modal component names to actual components - WITH CORRECT STRING KEYS
  const MODAL_COMPONENTS = {
    'BasicInfoModal': BasicInfoModal,
    'TeamFormationModal': TeamFormationModal,
    'ResourceGatheringModal': ResourceGatheringModal,
    'SolicitationUploadModal': SolicitationUploadModal,
    'EvaluationModal': EvaluationModal,
    'WinStrategyModal': WinStrategyModal,
    'ContentPlanningModal': ContentPlanningModal,
    'PricingReviewModal': PricingReviewModal,
  };

  // Map action IDs directly to modal names
  const ACTION_TO_MODAL_MAP = {
    // Phase 1 - Basic Info
    'enter_basic_info': 'BasicInfoModal',
    'select_prime_contractor': 'BasicInfoModal',
    'add_solicitation_number': 'BasicInfoModal',
    'open_basic_info_modal': 'BasicInfoModal',
    'open_modal_phase1': 'BasicInfoModal',
    
    // Phase 2 - Team
    'form_team': 'TeamFormationModal',
    'add_teaming_partners': 'TeamFormationModal',
    'define_roles': 'TeamFormationModal',
    'open_team_formation_modal': 'TeamFormationModal',
    'open_modal_phase2': 'TeamFormationModal',
    
    // Phase 2 - Resources
    'gather_resources': 'ResourceGatheringModal',
    'link_boilerplate': 'ResourceGatheringModal',
    'link_past_performance': 'ResourceGatheringModal',
    'open_resource_gathering_modal': 'ResourceGatheringModal',
    
    // Phase 3 - Solicitation
    'upload_solicitation': 'SolicitationUploadModal',
    'extract_requirements': 'SolicitationUploadModal',
    'set_contract_value': 'SolicitationUploadModal',
    'open_solicitation_upload_modal': 'SolicitationUploadModal',
    'open_modal_phase3': 'SolicitationUploadModal',
    'run_ai_analysis_phase3': 'SolicitationUploadModal', // AI action also maps to modal
    
    // Phase 4 - Evaluation
    'run_evaluation': 'EvaluationModal',
    'calculate_confidence_score': 'EvaluationModal',
    'open_evaluation_modal': 'EvaluationModal',
    'open_modal_phase4': 'EvaluationModal',
    'run_evaluation_phase4': 'EvaluationModal', // AI action also maps to modal
    
    // Phase 5 - Win Strategy
    'develop_win_strategy': 'WinStrategyModal',
    'generate_win_themes': 'WinStrategyModal',
    'refine_themes': 'WinStrategyModal',
    'open_win_strategy_modal': 'WinStrategyModal',
    'open_modal_phase5': 'WinStrategyModal',
    'generate_win_themes_phase5': 'WinStrategyModal', // AI action also maps to modal
    
    // Phase 5 - Content Planning
    'plan_content': 'ContentPlanningModal',
    'select_sections': 'ContentPlanningModal',
    'set_writing_strategy': 'ContentPlanningModal',
    'open_content_planning_modal': 'ContentPlanningModal',
    
    // Phase 7 - Pricing
    'review_pricing': 'PricingReviewModal',
    'open_pricing_review_modal': 'PricingReviewModal',
  };

  const handleArchive = (e) => {
    e.stopPropagation();
    updateProposalMutation.mutate({ status: 'archived', custom_workflow_stage_id: null });
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    const phase = proposal.current_phase || 'phase1';
    navigate(createPageUrl("ProposalBuilder") + `?id=${proposal.id}&phase=${phase}`);
  };

  // Removed handleCardClick as onCardClick will be directly applied to the draggable div.

  // Handle checklist item click
  const handleChecklistItemClick = async (item) => {
    console.log('[KanbanCard] ✨ Checklist item clicked:', item.label, 'Action:', item.associated_action);

    const actionConfig = getActionConfig(item.associated_action);

    if (!actionConfig) {
      console.warn(`[KanbanCard] ⚠️ No action config found for: ${item.associated_action}`);
      return;
    }

    console.log('[KanbanCard] ✅ Action config found:', actionConfig);

    // Check if this action maps to a modal
    const modalName = ACTION_TO_MODAL_MAP[item.associated_action];
    
    if (modalName && MODAL_COMPONENTS[modalName]) {
      console.log('[KanbanCard] 🎯 Opening modal:', modalName);
      setActiveModalName(modalName);
      return;
    }

    // Handle navigation actions
    if (isNavigateAction(item.associated_action)) {
      console.log('[KanbanCard] 🔗 Navigation handled by ChecklistItemRenderer');
      return;
    }

    // Handle system_check or manual_check - toggle completion
    if (item.type === 'system_check' || item.type === 'manual_check') {
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
    }
  };

  // Handle modal close
  const handleModalClose = () => {
    console.log('[KanbanCard] 🚪 Closing modal');
    setActiveModalName(null);
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
  };

  // Render active modal dynamically
  const renderActiveModal = () => {
    if (!activeModalName) return null;
    
    const ModalComponent = MODAL_COMPONENTS[activeModalName];
    if (!ModalComponent) {
      console.error('[KanbanCard] ❌ Modal component not found:', activeModalName);
      return null;
    }

    console.log('[KanbanCard] 🎭 Rendering modal:', activeModalName);
    return (
      <ModalComponent
        isOpen={true}
        onClose={handleModalClose}
        proposalId={proposal.id}
      />
    );
  };

  return (
    <>
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        onClick={onCardClick}
        className={cn(
          "bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-300",
          proposal.is_blocked && "border-red-300 bg-red-50"
        )}
      >
        <Card className="relative"> {/* Removed bg-white from here as it's on the outer div */}
          <CardContent className="p-4">
            {/* Drag Indicator - Visual only */}
            {/* The dragHandleProps should be applied to the GripVertical's parent div */}
            <div {...dragHandleProps} className="absolute left-1 top-2 opacity-0 group-hover:opacity-40 transition-opacity pointer-events-auto cursor-grab">
              <GripVertical className="w-4 h-4 text-slate-600" />
            </div>

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

            {/* Disabled Indicator - REMOVED as isDragDisabled prop is removed */}
            {/* {isDragDisabled && (
              <div className="absolute top-2 right-2">
                <Shield className="w-5 h-5 text-orange-500" title="Cannot move from this column" />
              </div>
            )} */}

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

            {/* Card Content (Main Section) */}
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
            </div>
          </CardContent>

          {/* Win Probability Badge - NEWLY ADDED */}
          <div className="px-4 pb-3">
            <WinProbabilityTracker
              proposal={proposal}
              organization={organization}
              showCompact={true}
            />
          </div>

          {/* Footer - MOVED OUT OF CardContent, added px-4 */}
          <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-slate-200">
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

          {/* Urgency Corner Indicator */}
          {(isOverdue || isDueSoon) && (
            <div className={cn(
              "absolute top-0 right-0 w-0 h-0 border-t-[24px] border-r-[24px] rounded-tr-lg",
              isOverdue ? "border-t-red-500 border-r-red-500" : "border-t-orange-400 border-r-orange-400"
            )} />
          )}
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
