
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Kept these imports, though the Card component itself is replaced with motion.div
import { Badge } from "@/components/ui/badge"; // Kept, though not used in the new outline
import { Progress } from "@/components/ui/progress"; // Kept, but its usage is manual in the new outline
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
  Edit, // Added Edit icon
  Archive,
  Trash2,
  Building2, // Added Building2 icon
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { motion } from "framer-motion"; // Added framer-motion import

export default function KanbanCard({ proposal, onClick, isDragging, organization }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    'active': 'border-purple-500', // Example additional status
    // Default color if status not found
  };


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
    e.stopPropagation(); // Stop propagation from the dropdown item
    const phase = proposal.current_phase || 'phase1';
    navigate(createPageUrl("ProposalBuilder") + `?id=${proposal.id}&phase=${phase}`);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Stop propagation from the dropdown item
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
          "group relative bg-white rounded-lg shadow-sm hover:shadow-xl transition-all duration-200 cursor-pointer",
          "border-l-4",
          isDragging ? 'shadow-2xl rotate-2 opacity-90' : '',
          statusColors[proposal.status] || 'border-slate-400'
        )}
        onClick={onClick}
      >
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

          {/* Progress Bar */}
          {progressPercentage >= 0 && ( // Changed from > 0 to >= 0 to show for 0%
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600">Progress</span>
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
