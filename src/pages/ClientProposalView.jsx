import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft,
  CheckCircle2, 
  XCircle,
  MessageSquare,
  Send,
  Eye,
  FileText,
  Calendar,
  DollarSign,
  Building2,
  AlertCircle,
  Shield,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import moment from "moment";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ClientProposalView() {
  const queryClient = useQueryClient();
  const [clientToken, setClientToken] = useState(null);
  const [proposalId, setProposalId] = useState(null);
  const [client, setClient] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const propId = urlParams.get('proposal');
        
        if (!token || !propId) {
          setError("Invalid access link.");
          setLoading(false);
          return;
        }

        setClientToken(token);
        setProposalId(propId);

        // Verify client token
        const clients = await base44.entities.Client.filter({ access_token: token });
        if (clients.length === 0) {
          setError("Invalid or expired access link.");
          setLoading(false);
          return;
        }

        const clientData = clients[0];
        setClient(clientData);

        // Load organization
        const orgs = await base44.entities.Organization.filter({ id: clientData.organization_id });
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setError("An error occurred. Please try again.");
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const { data: proposal, isLoading: proposalLoading } = useQuery({
    queryKey: ['client-proposal', proposalId, client?.id],
    queryFn: async () => {
      if (!proposalId || !client?.id) return null;
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      if (proposals.length === 0) return null;
      
      const prop = proposals[0];
      
      // Verify client has access
      if (!prop.shared_with_client_ids?.includes(client.id) || !prop.client_view_enabled) {
        throw new Error("Access denied");
      }

      // Update last viewed timestamp
      await base44.entities.Proposal.update(proposalId, {
        client_last_viewed: new Date().toISOString()
      });

      return prop;
    },
    enabled: !!proposalId && !!client?.id,
  });

  const { data: sections } = useQuery({
    queryKey: ['client-proposal-sections', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalSection.filter({ proposal_id: proposalId }, 'order');
    },
    initialData: [],
    enabled: !!proposalId,
  });

  const { data: comments } = useQuery({
    queryKey: ['client-proposal-comments', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalComment.filter({ proposal_id: proposalId }, 'created_date');
    },
    initialData: [],
    enabled: !!proposalId,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      const comment = await base44.entities.ProposalComment.create({
        proposal_id: proposalId,
        author_email: client.contact_email,
        author_name: client.contact_name || client.client_name,
        content,
        comment_type: "general"
      });

      // Update feedback count
      await base44.entities.Proposal.update(proposalId, {
        client_feedback_count: (proposal.client_feedback_count || 0) + 1
      });

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-proposal-comments'] });
      queryClient.invalidateQueries({ queryKey: ['client-proposal'] });
      setNewComment("");
    },
  });

  const acceptProposalMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Proposal.update(proposalId, {
        status: "client_accepted",
        client_decision_date: new Date().toISOString(),
        client_decision_notes: decisionNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-proposal'] });
      setShowAcceptDialog(false);
      setDecisionNotes("");
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Proposal.update(proposalId, {
        status: "client_rejected",
        client_decision_date: new Date().toISOString(),
        client_decision_notes: decisionNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-proposal'] });
      setShowRejectDialog(false);
      setDecisionNotes("");
    },
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim());
    }
  };

  if (loading || proposalLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-16 w-full mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md border-none shadow-xl">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-slate-600">{error || "Proposal not found or you don't have access."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canTakeAction = !['client_accepted', 'client_rejected', 'won', 'lost'].includes(proposal.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => window.location.href = `/ClientPortal?token=${clientToken}`}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal
          </Button>
        </div>

        {/* Proposal Header */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-2">{proposal.proposal_name}</CardTitle>
                {proposal.project_title && (
                  <p className="text-slate-600 text-lg mb-3">{proposal.project_title}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={proposal.status === 'client_accepted' ? 'default' : 'secondary'} className="text-sm">
                    {proposal.status === 'client_accepted' && <CheckCircle2 className="w-4 h-4 mr-1" />}
                    {proposal.status === 'client_rejected' && <XCircle className="w-4 h-4 mr-1" />}
                    {proposal.status === 'client_review' && <AlertCircle className="w-4 h-4 mr-1" />}
                    {proposal.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  {proposal.due_date && (
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      Due: {moment(proposal.due_date).format('MMMM D, YYYY')}
                    </Badge>
                  )}
                </div>
              </div>
              {organization?.custom_branding?.logo_url && (
                <img 
                  src={organization.custom_branding.logo_url} 
                  alt="Company Logo" 
                  className="h-12 object-contain"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {proposal.agency_name && (
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Agency</p>
                    <p className="font-medium text-slate-900">{proposal.agency_name}</p>
                  </div>
                </div>
              )}
              {proposal.contract_value && (
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Estimated Value</p>
                    <p className="font-medium text-slate-900">
                      ${proposal.contract_value.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {proposal.solicitation_number && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500">Solicitation #</p>
                    <p className="font-medium text-slate-900">{proposal.solicitation_number}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canTakeAction && (
              <div className="flex gap-3 mt-6 pt-6 border-t">
                <Button
                  onClick={() => setShowAcceptDialog(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Accept Proposal
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  Reject Proposal
                </Button>
              </div>
            )}

            {proposal.client_decision_date && (
              <div className={`mt-6 p-4 rounded-lg border-2 ${
                proposal.status === 'client_accepted' 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-300'
              }`}>
                <p className="font-semibold mb-1">
                  {proposal.status === 'client_accepted' ? 'You accepted this proposal' : 'You rejected this proposal'}
                </p>
                <p className="text-sm text-slate-600">
                  {moment(proposal.client_decision_date).format('MMMM D, YYYY [at] h:mm A')}
                </p>
                {proposal.client_decision_notes && (
                  <p className="text-sm mt-2 italic">"{proposal.client_decision_notes}"</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proposal Content */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Proposal Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sections.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>No content available yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sections.map(section => (
                  <div key={section.id} className="border-b pb-6 last:border-b-0">
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">
                      {section.section_name}
                    </h3>
                    <div 
                      className="prose prose-slate max-w-none"
                      dangerouslySetInnerHTML={{ __html: section.content || '<p class="text-slate-500 italic">Content pending...</p>' }}
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Discussion & Feedback ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing Comments */}
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900">{comment.author_name}</span>
                    <span className="text-xs text-slate-500">
                      {moment(comment.created_date).fromNow()}
                    </span>
                  </div>
                  <p className="text-slate-700">{comment.content}</p>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No comments yet. Be the first to provide feedback!</p>
                </div>
              )}
            </div>

            {/* Add Comment */}
            <div className="border-t pt-6">
              <Label className="mb-2">Add Your Feedback or Questions</Label>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts, ask questions, or request changes..."
                rows={4}
                className="mb-3"
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
              >
                {addCommentMutation.isPending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 py-4">
          <p>Questions? Contact {organization?.contact_name} at {organization?.contact_email}</p>
        </div>
      </div>

      {/* Accept Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Accept This Proposal
            </DialogTitle>
            <DialogDescription>
              By accepting, you agree to move forward with this proposal. Your consultant will be notified immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Optional: Add a note about your decision</Label>
              <Textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Any additional comments or requirements..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => acceptProposalMutation.mutate()}
              disabled={acceptProposalMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {acceptProposalMutation.isPending ? 'Accepting...' : 'Confirm Acceptance'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Reject This Proposal
            </DialogTitle>
            <DialogDescription>
              Let your consultant know why you're rejecting this proposal so they can better serve you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Reason for rejection (optional but recommended)</Label>
              <Textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Please share your concerns or reasons..."
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => rejectProposalMutation.mutate()}
              disabled={rejectProposalMutation.isPending}
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {rejectProposalMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}