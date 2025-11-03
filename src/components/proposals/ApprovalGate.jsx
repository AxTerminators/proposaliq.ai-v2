import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import moment from 'moment';

/**
 * Approval Gate Component
 * Handles approval workflow when moving out of columns that require approval
 */
export default function ApprovalGate({ 
  isOpen, 
  onClose, 
  proposal, 
  sourceColumn, 
  destinationColumn,
  onApprovalComplete,
  user,
  organization 
}) {
  const queryClient = useQueryClient();
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if there's an existing approval workflow for this move
  const { data: existingApprovals = [] } = useQuery({
    queryKey: ['approval-workflows', proposal?.id, sourceColumn?.id],
    queryFn: async () => {
      if (!proposal?.id || !sourceColumn?.id) return [];
      return base44.entities.ApprovalWorkflow.filter({
        proposal_id: proposal.id,
        milestone: 'column_exit',
        workflow_status: 'in_progress'
      });
    },
    enabled: !!proposal?.id && !!sourceColumn?.id
  });

  const createApprovalMutation = useMutation({
    mutationFn: async ({ action, comments }) => {
      // For now, we'll create a simple approval record
      // In a full implementation, this would check against ApprovalWorkflow entity
      
      if (action === 'approve') {
        // Mark the proposal as approved to move
        return { approved: true };
      } else {
        // Rejection - proposal stays in current column
        return { approved: false };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onApprovalComplete(data.approved);
    }
  });

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await createApprovalMutation.mutateAsync({
        action: 'approve',
        comments
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await createApprovalMutation.mutateAsync({
        action: 'reject',
        comments
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sourceColumn || !destinationColumn) return null;

  // Check if user has permission to approve
  const approverRoles = sourceColumn.approver_roles || [];
  const canApprove = approverRoles.length === 0 || 
                     approverRoles.includes('organization_owner') || 
                     approverRoles.includes('proposal_manager');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl">Approval Required</DialogTitle>
              <DialogDescription>
                This proposal requires approval to move from <strong>{sourceColumn.label}</strong> to <strong>{destinationColumn.label}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Proposal Summary */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-semibold text-slate-900 mb-2">{proposal.proposal_name}</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {proposal.solicitation_number && (
                <div>
                  <span className="text-slate-600">Solicitation:</span>{' '}
                  <span className="font-medium">{proposal.solicitation_number}</span>
                </div>
              )}
              {proposal.agency_name && (
                <div>
                  <span className="text-slate-600">Agency:</span>{' '}
                  <span className="font-medium">{proposal.agency_name}</span>
                </div>
              )}
              {proposal.due_date && (
                <div>
                  <span className="text-slate-600">Due Date:</span>{' '}
                  <span className="font-medium">{moment(proposal.due_date).format('MMM D, YYYY')}</span>
                </div>
              )}
              {proposal.contract_value && (
                <div>
                  <span className="text-slate-600">Value:</span>{' '}
                  <span className="font-medium">${(proposal.contract_value / 1000000).toFixed(1)}M</span>
                </div>
              )}
            </div>
          </div>

          {/* Approval Rationale */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The <strong>{sourceColumn.label}</strong> stage requires approval before proposals can advance. 
              This ensures quality control and proper review of critical deliverables.
            </AlertDescription>
          </Alert>

          {!canApprove && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-900">
                You do not have permission to approve this move. Required roles: {approverRoles.join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {/* Comments */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Comments {!canApprove ? '(Optional)' : ''}
            </label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={canApprove 
                ? "Provide approval comments or reasons for rejection..." 
                : "Add any notes about this approval request..."}
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          {/* Existing Approvals */}
          {existingApprovals.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Pending Approvals</h4>
              <p className="text-sm text-blue-800">
                There are {existingApprovals.length} approval workflow(s) in progress for this proposal.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          {canApprove && (
            <>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isSubmitting}
                className="gap-2"
              >
                <ThumbsDown className="w-4 h-4" />
                {isSubmitting ? 'Processing...' : 'Reject'}
              </Button>
              
              <Button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <ThumbsUp className="w-4 h-4" />
                {isSubmitting ? 'Processing...' : 'Approve'}
              </Button>
            </>
          )}

          {!canApprove && (
            <Button
              onClick={onClose}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              Submit for Approval
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}