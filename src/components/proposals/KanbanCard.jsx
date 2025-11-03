import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Users,
  AlertCircle,
  Clock,
  MoreVertical,
  Edit,
  Archive,
  Trash2,
  Building2,
  CheckSquare,
  MessageCircle,
  Paperclip,
  Sparkles,
  Target,
  PlayCircle,
  CheckCircle2,
  Circle
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { motion } from "framer-motion";

// Map gradient colors to solid shadow colors
const GRADIENT_TO_SHADOW_COLOR = {
  'from-slate-400 to-slate-600': 'rgba(100, 116, 139, 0.4)',
  'from-gray-400 to-gray-600': 'rgba(107, 114, 128, 0.4)',
  'from-amber-400 to-amber-600': 'rgba(251, 191, 36, 0.4)',
  'from-orange-400 to-orange-600': 'rgba(251, 146, 60, 0.4)',
  'from-blue-400 to-blue-600': 'rgba(96, 165, 250, 0.4)',
  'from-cyan-400 to-cyan-600': 'rgba(34, 211, 238, 0.4)',
  'from-purple-400 to-purple-600': 'rgba(192, 132, 252, 0.4)',
  'from-indigo-400 to-indigo-600': 'rgba(129, 140, 248, 0.4)',
  'from-pink-400 to-pink-600': 'rgba(244, 114, 182, 0.4)',
  'from-rose-400 to-rose-600': 'rgba(251, 113, 133, 0.4)',
  'from-green-400 to-green-600': 'rgba(74, 222, 128, 0.4)',
  'from-emerald-400 to-emerald-600': 'rgba(52, 211, 153, 0.4)',
  'from-teal-400 to-teal-600': 'rgba(45, 212, 191, 0.4)',
  'from-red-400 to-red-600': 'rgba(248, 113, 113, 0.4)',
  'from-violet-400 to-violet-600': 'rgba(167, 139, 250, 0.4)',
  'from-fuchsia-400 to-fuchsia-600': 'rgba(232, 121, 249, 0.4)',
  'from-lime-400 to-lime-600': 'rgba(163, 230, 53, 0.4)',
  'from-yellow-400 to-yellow-600': 'rgba(250, 204, 21, 0.4)',
};

export default function KanbanCard({ proposal, onClick, isDragging, organization, columnColor, dragOverColumnColor, column }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch tasks for this proposal
  const { data: tasks = [] } = useQuery({
    queryKey: ['proposal-tasks-count', proposal.id],
    queryFn: () => base44.entities.ProposalTask.filter({ proposal_id: proposal.id }),
    enabled: !!proposal.id,
    initialData: []
  });

  // Fetch subtasks for this proposal
  const { data: subtasks = [] } = useQuery({
    queryKey: ['proposal-subtasks-count', proposal.id],
    queryFn: () => base44.entities.ProposalSubtask.filter({ proposal_id: proposal.id }),
    enabled: !!proposal.id,
    initialData: []
  });

  // Fetch comments for this proposal
  const { data: comments = [] } = useQuery({
    queryKey: ['proposal-comments-count', proposal.id],
    queryFn: () => base44.entities.ProposalComment.filter({ proposal_id: proposal.id }),
    enabled: !!proposal.id,
    initialData: []
  });

  // Fetch files for this proposal
  const { data: files = [] } = useQuery({
    queryKey: ['proposal-files-count', proposal.id],
    queryFn: () => base44.entities.SolicitationDocument.filter({ proposal_id: proposal.id }),
    enabled: !!proposal.id,
    initialData: []
  });

  const progressPercentage = proposal.progress_summary?.completion_percentage || 0;

  const daysUntilDue = proposal.due_date ? moment(proposal.due_date).diff(moment(), 'days') : null;
  const isOverdue = proposal.due_date && moment(proposal.due_date).isBefore(moment(), 'day');
  const isDueSoon = !isOverdue && daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0;

  const urgencyColor = isOverdue
    ? 'bg-red-500'
    : isDueSoon
      ? 'bg-amber-500'
      : 'bg-transparent';

  const statusColors = {
    'draft': 'border-slate-400',
    'pending_review': 'border-orange-500',
    'submitted': 'border-blue-500',
    'approved': 'border-green-500',
    'declined': 'border-red-500',
    'archived': 'border-gray-500',
    'active': 'border-purple-500',
  };

  // Get checklist items from column configuration
  const checklistItems = column?.checklist_items || [];
  const checklistStatus = proposal.current_stage_checklist_status?.[column?.id] || {};
  
  // Calculate checklist completion
  const completedChecklistItems = checklistItems.filter(item => 
    checklistStatus[item.id]?.completed
  ).length;
  const totalChecklistItems = checklistItems.length;
  const checklistPercentage = totalChecklistItems > 0 
    ? Math.round((completedChecklistItems / totalChecklistItems) * 100) 
    : 0;

  // Check if there are required incomplete items
  const hasActionRequired = checklistItems.some(item => 
    item.required && !checklistStatus[item.id]?.completed
  );

  // Calculate task counts
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  const totalTasks = tasks.length + subtasks.length;
  const totalCompletedTasks = completedTasks + completedSubtasks;

  // Get shadow color based on column or drag state
  const getShadowColor = () => {
    if (isDragging && dragOverColumnColor) {
      return GRADIENT_TO_SHADOW_COLOR[dragOverColumnColor] || 'rgba(0, 0, 0, 0.1)';
    }
    return GRADIENT_TO_SHADOW_COLOR[columnColor] || 'rgba(0, 0, 0, 0.1)';
  };

  const shadowColor = getShadowColor();

  const updateProposalMutation = useMutation({
    mutationFn: async (updates) => {
      return base44.entities.Proposal.update(proposal.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Proposal.delete(proposal.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const handleArchive = () => {
    updateProposalMutation.mutate({ status: 'archived', custom_workflow_stage_id: null });
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    const phase = proposal.current_phase || 'phase1';
    navigate(createPageUrl("ProposalBuilder") + `?id=${proposal.id}&phase=${phase}`);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        className={cn(
          "group relative bg-white rounded-lg transition-all duration-200 cursor-pointer",
          "border-l-4",
          isDragging ? 'rotate-2 opacity-90' : '',
          statusColors[proposal.status] || 'border-slate-400'
        )}
        style={{
          boxShadow: isDragging 
            ? `0 20px 25px -5px ${shadowColor}, 0 10px 10px -5px ${shadowColor}`
            : `0 4px 6px -1px ${shadowColor}, 0 2px 4px -1px ${shadowColor}`
        }}
        onClick={onClick}
      >
        {/* Action Required Indicator - Top Left */}
        {hasActionRequired && (
          <div className="absolute -top-2 -left-2 z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
              <PlayCircle className="relative w-6 h-6 text-red-600 bg-white rounded-full" title="Action Required" />
            </div>
          </div>
        )}

        {/* Three Dots Menu - Top Right */}
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Proposal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleArchive} className="text-slate-600">
                <Archive className="w-4 h-4 mr-2" />
                Move to Archived
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Card Content */}
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3 pr-8">
            <div className="flex-1 min-w-0">
              <h3 className="font-normal text-slate-900 text-sm mb-1 truncate">
                {proposal.proposal_name}
              </h3>
              {proposal.solicitation_number && (
                <p className="text-xs text-slate-500 font-mono">
                  {proposal.solicitation_number}
                </p>
              )}
            </div>
          </div>

          {/* Agency & Project Title */}
          {(proposal.agency_name || proposal.project_title) && (
            <div className="mb-3 space-y-1">
              {proposal.agency_name && (
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <Building2 className="w-3 h-3" />
                  <span className="truncate">{proposal.agency_name}</span>
                </div>
              )}
              {proposal.project_title && (
                <p className="text-xs text-slate-600 line-clamp-2">
                  {proposal.project_title}
                </p>
              )}
            </div>
          )}

          {/* Checklist Display (if any items exist) */}
          {totalChecklistItems > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">Stage Checklist</span>
                <span className="text-xs text-slate-600">{completedChecklistItems}/{totalChecklistItems}</span>
              </div>
              <div className="space-y-1">
                {checklistItems.slice(0, 3).map((item) => {
                  const isCompleted = checklistStatus[item.id]?.completed;
                  return (
                    <div key={item.id} className="flex items-center gap-2 text-xs">
                      {isCompleted ? (
                        <CheckCircle2 className="w-3 h-3 text-green-600 flex-shrink-0" />
                      ) : item.required ? (
                        <Circle className="w-3 h-3 text-red-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 text-slate-300 flex-shrink-0" />
                      )}
                      <span className={cn(
                        "truncate",
                        isCompleted ? "text-slate-400 line-through" : "text-slate-700"
                      )}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
                {checklistItems.length > 3 && (
                  <p className="text-xs text-slate-500 pl-5">+{checklistItems.length - 3} more</p>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {progressPercentage >= 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">Overall Progress</span>
                <span className="text-xs font-semibold text-slate-700">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    progressPercentage === 100 ? 'bg-green-500' :
                    progressPercentage >= 75 ? 'bg-blue-500' :
                    progressPercentage >= 50 ? 'bg-yellow-500' :
                    'bg-orange-500'
                  )}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick Access Icons */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {/* Tasks */}
            {totalTasks > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-xs">
                <CheckSquare className="w-3 h-3 text-blue-600" />
                <span className="text-blue-700 font-medium">{totalCompletedTasks}/{totalTasks}</span>
              </div>
            )}

            {/* Comments/Discussions */}
            {comments.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 rounded text-xs">
                <MessageCircle className="w-3 h-3 text-purple-600" />
                <span className="text-purple-700 font-medium">{comments.length}</span>
              </div>
            )}

            {/* Files */}
            {files.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded text-xs">
                <Paperclip className="w-3 h-3 text-green-600" />
                <span className="text-green-700 font-medium">{files.length}</span>
              </div>
            )}

            {/* AI Insights (if evaluation or confidence score exists) */}
            {(proposal.evaluation_results || proposal.ai_confidence_score) && (
              <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded text-xs">
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span className="text-indigo-700 font-medium">AI</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs">
            {/* Due Date */}
            {proposal.due_date && (
              <div className={cn(
                "flex items-center gap-1",
                isOverdue ? 'text-red-600 font-semibold' :
                isDueSoon ? 'text-amber-600 font-semibold' :
                'text-slate-600'
              )}>
                <Calendar className="w-3 h-3" />
                <span>
                  {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` :
                   isDueSoon ? `${daysUntilDue}d left` :
                   moment(proposal.due_date).format('MMM D')}
                </span>
              </div>
            )}

            {/* Contract Value */}
            {proposal.contract_value && (
              <div className="flex items-center gap-1 text-slate-600">
                <DollarSign className="w-3 h-3" />
                <span>${(proposal.contract_value / 1000000).toFixed(1)}M</span>
              </div>
            )}
          </div>

          {/* Urgency Indicator */}
          {(isOverdue || isDueSoon) && (
            <div className={cn(
              "absolute top-0 right-0 w-3 h-3 rounded-bl-lg",
              urgencyColor
            )} />
          )}
        </div>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Delete Proposal Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p className="font-semibold text-slate-900">
                You are about to permanently delete:
              </p>
              <p className="text-base font-bold text-red-600">
                "{proposal.proposal_name}"
              </p>
              <div className="p-3 bg-red-50 border-l-4 border-red-600 rounded">
                <p className="text-red-900 font-semibold">
                  ⚠️ WARNING: This action cannot be undone!
                </p>
                <p className="text-red-800 text-sm mt-2">
                  All proposal data including sections, comments, tasks, files, and history will be permanently deleted and is NOT retrievable.
                </p>
              </div>
              <p className="text-slate-700">
                Are you absolutely sure you want to proceed?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Yes, Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}