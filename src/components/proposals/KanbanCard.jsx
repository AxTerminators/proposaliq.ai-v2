import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle2,
  MoreVertical,
  ExternalLink,
  Eye,
  Archive,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function KanbanCard({ proposal, index, onClick, isDragging, organization }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const progress = proposal.progress_summary?.completion_percentage || 0;
  
  const isOverdue = proposal.due_date && moment(proposal.due_date).isBefore(moment());
  const daysUntilDue = proposal.due_date ? moment(proposal.due_date).diff(moment(), 'days') : null;

  const archiveMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Proposal.update(proposal.id, {
        status: 'archived',
        custom_workflow_stage_id: null
      });
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

  const handleOpenFull = (e) => {
    e.stopPropagation();
    const phase = proposal.current_phase || 'phase1';
    navigate(createPageUrl("ProposalBuilder") + `?id=${proposal.id}&phase=${phase}`);
  };

  const handleViewCard = (e) => {
    e.stopPropagation();
    onClick();
  };

  const handleArchive = (e) => {
    e.stopPropagation();
    archiveMutation.mutate();
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
      <Card
        onClick={onClick}
        className={cn(
          "cursor-pointer hover:shadow-lg transition-all duration-200 border-2",
          isDragging && "shadow-2xl rotate-2 opacity-70",
          isOverdue && "border-red-300 bg-red-50"
        )}
      >
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold text-slate-900 line-clamp-2 flex-1">
              {proposal.proposal_name}
            </CardTitle>
            
            {/* Three Dots Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-slate-100"
                >
                  <MoreVertical className="w-4 h-4 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleOpenFull}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Full
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleViewCard}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Card
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  Move to Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {proposal.project_type && (
              <Badge variant="outline" className="text-xs">
                {proposal.project_type}
              </Badge>
            )}
            {proposal.agency_name && (
              <Badge variant="secondary" className="text-xs truncate max-w-[150px]">
                {proposal.agency_name}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-2 space-y-3">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600">Progress</span>
              <span className="font-semibold text-slate-900">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Due Date */}
          {proposal.due_date && (
            <div className={cn(
              "flex items-center gap-2 text-xs",
              isOverdue ? "text-red-600" : daysUntilDue <= 7 ? "text-amber-600" : "text-slate-600"
            )}>
              {isOverdue ? (
                <AlertCircle className="w-3 h-3" />
              ) : daysUntilDue <= 7 ? (
                <Clock className="w-3 h-3" />
              ) : (
                <Calendar className="w-3 h-3" />
              )}
              <span>
                {isOverdue ? "Overdue" : moment(proposal.due_date).format('MMM D, YYYY')}
                {daysUntilDue !== null && !isOverdue && ` (${daysUntilDue}d)`}
              </span>
            </div>
          )}

          {/* Contract Value */}
          {proposal.contract_value && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <DollarSign className="w-3 h-3" />
              <span>${(proposal.contract_value / 1000000).toFixed(1)}M</span>
            </div>
          )}

          {/* Assigned Team Members */}
          {proposal.assigned_team_members && proposal.assigned_team_members.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Users className="w-3 h-3" />
              <span>{proposal.assigned_team_members.length} team member{proposal.assigned_team_members.length !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Blocker Warning */}
          {proposal.is_blocked && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span className="line-clamp-1">{proposal.blocker_reason || "Blocked"}</span>
            </div>
          )}
        </CardContent>
      </Card>

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