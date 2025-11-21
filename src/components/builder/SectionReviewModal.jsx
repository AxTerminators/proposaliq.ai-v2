import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  User,
  Calendar
} from "lucide-react";
import moment from "moment";

/**
 * SectionReviewModal - Phase 2 Implementation
 * 
 * Modal for reviewing sections marked for review. Provides two actions:
 * 1. Approve - marks section as approved and allows proposal to continue
 * 2. Send Back for Regeneration - sends section back to Writing column with feedback
 */
export default function SectionReviewModal({ 
  isOpen, 
  onClose, 
  section, 
  proposal,
  organization,
  currentUser 
}) {
  const queryClient = useQueryClient();
  const [reviewAction, setReviewAction] = useState(null); // 'approve' or 'send_back'
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.ProposalSection.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections'] });
    }
  });

  const updateProposalMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.Proposal.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ProposalComment.create(data);
    }
  });

  const handleApprove = async () => {
    if (!section || !currentUser) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Update section status to approved
      await updateSectionMutation.mutateAsync({
        id: section.id,
        data: {
          status: 'approved',
          reviewer_assigned: currentUser.email
        }
      });

      // Create approval comment if feedback provided
      if (feedback.trim()) {
        await createCommentMutation.mutateAsync({
          proposal_id: proposal.id,
          section_id: section.id,
          organization_id: organization.id,
          author_email: currentUser.email,
          author_name: currentUser.full_name,
          content: `✅ **Section Approved**\n\n${feedback}`,
          comment_type: 'approval'
        });
      }

      // Send notification to section author
      if (section.marked_for_review_by) {
        try {
          await base44.entities.Notification.create({
            organization_id: organization.id,
            user_email: section.marked_for_review_by,
            notification_type: 'approval_request',
            title: 'Section Approved',
            message: `Your section "${section.section_name}" has been approved by ${currentUser.full_name}.`,
            link_url: `/ai-assisted-writer?proposalId=${proposal.id}`,
            priority: 'normal',
            is_read: false,
            related_proposal_id: proposal.id,
            related_entity_id: section.id,
            related_entity_type: 'section',
            from_user_email: currentUser.email,
            from_user_name: currentUser.full_name
          });
        } catch (notifError) {
          console.error("Error creating notification:", notifError);
        }
      }

      alert("✅ Section approved successfully!");
      onClose();
      
    } catch (error) {
      console.error("Error approving section:", error);
      setError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendBack = async () => {
    if (!section || !currentUser) return;

    if (!feedback.trim()) {
      alert("Please provide feedback for the writer before sending back.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Update section status to rework_needed
      await updateSectionMutation.mutateAsync({
        id: section.id,
        data: {
          status: 'rework_needed',
          reviewer_assigned: currentUser.email
        }
      });

      // Create feedback comment - THIS IS KEY for Phase 3
      await createCommentMutation.mutateAsync({
        proposal_id: proposal.id,
        section_id: section.id,
        organization_id: organization.id,
        author_email: currentUser.email,
        author_name: currentUser.full_name,
        content: `🔄 **Sent Back for Regeneration**\n\n${feedback}`,
        comment_type: 'issue'
      });

      // Move proposal back to Writing column
      const kanbanConfigs = await base44.entities.KanbanConfig.filter({
        organization_id: organization.id
      });

      let writingColumnId = null;
      for (const config of kanbanConfigs) {
        const writingColumn = config.columns?.find(col => 
          col.label?.toLowerCase().includes('writing') || 
          col.label?.toLowerCase().includes('draft') ||
          col.id?.toLowerCase().includes('writing')
        );
        if (writingColumn) {
          writingColumnId = writingColumn.id;
          break;
        }
      }

      // Update proposal to Writing column
      if (writingColumnId) {
        await updateProposalMutation.mutateAsync({
          id: proposal.id,
          data: {
            custom_workflow_stage_id: writingColumnId,
            action_required: true,
            action_required_description: `Section "${section.section_name}" needs rework - reviewer feedback provided`
          }
        });
      } else {
        // Fallback: update status to in_progress
        await updateProposalMutation.mutateAsync({
          id: proposal.id,
          data: {
            status: 'in_progress',
            action_required: true,
            action_required_description: `Section "${section.section_name}" needs rework - reviewer feedback provided`
          }
        });
      }

      // Send notification to section author
      if (section.marked_for_review_by) {
        try {
          await base44.entities.Notification.create({
            organization_id: organization.id,
            user_email: section.marked_for_review_by,
            notification_type: 'status_change',
            title: 'Section Needs Rework',
            message: `Your section "${section.section_name}" has been sent back for regeneration by ${currentUser.full_name}.`,
            link_url: `/ai-assisted-writer?proposalId=${proposal.id}`,
            priority: 'high',
            is_read: false,
            related_proposal_id: proposal.id,
            related_entity_id: section.id,
            related_entity_type: 'section',
            from_user_email: currentUser.email,
            from_user_name: currentUser.full_name
          });
        } catch (notifError) {
          console.error("Error creating notification:", notifError);
        }
      }

      alert("🔄 Section sent back for regeneration. Writer has been notified with your feedback.");
      onClose();
      
    } catch (error) {
      console.error("Error sending section back:", error);
      setError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (reviewAction === 'approve') {
      handleApprove();
    } else if (reviewAction === 'send_back') {
      handleSendBack();
    }
  };

  if (!section) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            Review Section: {section.section_name}
          </DialogTitle>
          <DialogDescription>
            Review the content and either approve it or send it back for regeneration with feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Section Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs text-slate-500">Submitted by</p>
                <p className="text-sm font-medium text-slate-900">
                  {section.marked_for_review_by || 'Unknown'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-xs text-slate-500">Submitted</p>
                <p className="text-sm font-medium text-slate-900">
                  {section.marked_for_review_date 
                    ? moment(section.marked_for_review_date).fromNow()
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Badge 
              className={
                section.status === 'pending_review' 
                  ? 'bg-amber-100 text-amber-800'
                  : section.status === 'rework_needed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
              }
            >
              Status: {section.status.replace(/_/g, ' ').toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {section.word_count || 0} words
            </Badge>
          </div>

          {/* Section Content Preview */}
          <div className="border rounded-lg p-4 bg-white">
            <h3 className="font-semibold text-slate-900 mb-3">Section Content:</h3>
            <div 
              className="prose prose-sm max-w-none text-slate-700 max-h-96 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: section.content || '<p class="text-slate-500">No content available</p>' }}
            />
          </div>

          {/* Review Action Selection */}
          {!reviewAction && (
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Choose Review Action:</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => setReviewAction('approve')}
                  className="h-auto py-4 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  <div className="text-left">
                    <div className="font-semibold">Approve</div>
                    <div className="text-xs opacity-90">Content is ready</div>
                  </div>
                </Button>
                <Button
                  onClick={() => setReviewAction('send_back')}
                  variant="outline"
                  className="h-auto py-4 border-red-300 hover:bg-red-50"
                >
                  <XCircle className="w-5 h-5 mr-2 text-red-600" />
                  <div className="text-left">
                    <div className="font-semibold text-red-700">Send Back</div>
                    <div className="text-xs text-red-600">Needs regeneration</div>
                  </div>
                </Button>
              </div>
            </div>
          )}

          {/* Feedback Input */}
          {reviewAction && (
            <div className="space-y-3">
              <Alert className={reviewAction === 'approve' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                <AlertDescription className="text-sm">
                  {reviewAction === 'approve' 
                    ? '✅ Approving this section. You can optionally add feedback for the writer.'
                    : '🔄 Sending back for regeneration. Please provide specific feedback on what needs to be improved.'}
                </AlertDescription>
              </Alert>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {reviewAction === 'send_back' ? 'Feedback (Required)' : 'Feedback (Optional)'}
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    reviewAction === 'send_back'
                      ? "Explain what needs to be changed, improved, or regenerated. Be specific to help the writer."
                      : "Optional: Add comments or suggestions for the writer."
                  }
                  className="min-h-32"
                  required={reviewAction === 'send_back'}
                />
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error.message || 'An error occurred. Please try again.'}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          {reviewAction && (
            <Button
              variant="outline"
              onClick={() => {
                setReviewAction(null);
                setFeedback("");
              }}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {reviewAction && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (reviewAction === 'send_back' && !feedback.trim())}
              className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {reviewAction === 'approve' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve Section
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Send Back for Regeneration
                    </>
                  )}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}