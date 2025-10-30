import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ThumbsDown,
  Upload,
  Paperclip,
  Download,
  Trash2,
  Check,
  X,
  Reply
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ClientProposalView() {
  const queryClient = useQueryClient();
  const [clientToken, setClientToken] = useState(null);
  const [proposalId, setProposalId] = useState(null);
  const [client, setClient] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState("general");
  const [commentPriority, setCommentPriority] = useState("medium");
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileDescription, setFileDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

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

        const clients = await base44.entities.Client.filter({ access_token: token });
        if (clients.length === 0) {
          setError("Invalid or expired access link.");
          setLoading(false);
          return;
        }

        const clientData = clients[0];
        setClient(clientData);

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
      
      if (!prop.shared_with_client_ids?.includes(client.id) || !prop.client_view_enabled) {
        throw new Error("Access denied");
      }

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

  const { data: clientFiles } = useQuery({
    queryKey: ['client-uploaded-files', proposalId, client?.id],
    queryFn: async () => {
      if (!proposalId || !client?.id) return [];
      return base44.entities.ClientUploadedFile.filter({ 
        proposal_id: proposalId,
        client_id: client.id 
      }, '-created_date');
    },
    initialData: [],
    enabled: !!proposalId && !!client?.id,
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, type, priority, parentId }) => {
      const comment = await base44.entities.ProposalComment.create({
        proposal_id: proposalId,
        author_email: client.contact_email,
        author_name: client.contact_name || client.client_name,
        content,
        comment_type: type,
        is_from_client: true,
        client_priority: priority,
        parent_comment_id: parentId || null
      });

      await base44.entities.Proposal.update(proposalId, {
        client_feedback_count: (proposal.client_feedback_count || 0) + 1
      });

      await base44.entities.Notification.create({
        user_email: proposal.created_by,
        notification_type: "comment_reply",
        title: parentId ? "Client Replied to Your Comment" : "Client Feedback Received",
        message: `${client.contact_name || client.client_name} ${parentId ? 'replied' : 'commented'} on "${proposal.proposal_name}": ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
        related_proposal_id: proposalId,
        related_entity_id: comment.id,
        related_entity_type: "comment",
        from_user_email: client.contact_email,
        from_user_name: client.contact_name || client.client_name,
        action_url: `/ProposalBuilder?id=${proposalId}`
      });

      await base44.entities.ClientNotification.create({
        client_id: client.id,
        proposal_id: proposalId,
        notification_type: "consultant_reply",
        title: "Your feedback was submitted",
        message: `Your ${type} feedback has been sent to your consultant.`,
        action_url: `/ClientProposalView?proposal=${proposalId}`,
        from_consultant_email: proposal.created_by,
        priority: "normal"
      });

      await base44.entities.ActivityLog.create({
        proposal_id: proposalId,
        user_email: client.contact_email,
        user_name: client.contact_name || client.client_name,
        action_type: "comment_added",
        action_description: `Client ${client.contact_name || client.client_name} added ${type} feedback`
      });

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-proposal-comments'] });
      queryClient.invalidateQueries({ queryKey: ['client-proposal'] });
      setNewComment("");
      setCommentType("general");
      setCommentPriority("medium");
      setReplyingTo(null);
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, description }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const uploadedFile = await base44.entities.ClientUploadedFile.create({
        client_id: client.id,
        proposal_id: proposalId,
        organization_id: organization.id,
        file_name: file.name,
        file_url: file_url,
        file_size: file.size,
        file_type: file.type,
        description: description,
        uploaded_by_name: client.contact_name || client.client_name,
        uploaded_by_email: client.contact_email
      });

      await base44.entities.Notification.create({
        user_email: proposal.created_by,
        notification_type: "comment_reply",
        title: "Client Uploaded a File",
        message: `${client.contact_name || client.client_name} uploaded "${file.name}" to "${proposal.proposal_name}"`,
        related_proposal_id: proposalId,
        related_entity_id: uploadedFile.id,
        related_entity_type: "comment",
        from_user_email: client.contact_email,
        from_user_name: client.contact_name || client.client_name,
        action_url: `/ProposalBuilder?id=${proposalId}`
      });

      await base44.entities.ActivityLog.create({
        proposal_id: proposalId,
        user_email: client.contact_email,
        user_name: client.contact_name || client.client_name,
        action_type: "file_uploaded",
        action_description: `Client uploaded ${file.name}`
      });

      return uploadedFile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-uploaded-files'] });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setFileDescription("");
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId) => {
      await base44.entities.ClientUploadedFile.delete(fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-uploaded-files'] });
    },
  });

  const acceptProposalMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Proposal.update(proposalId, {
        status: "client_accepted",
        client_decision_date: new Date().toISOString(),
        client_decision_notes: decisionNotes
      });

      await base44.entities.Notification.create({
        user_email: proposal.created_by,
        notification_type: "status_change",
        title: "🎉 Client Accepted Proposal!",
        message: `Great news! ${client.contact_name || client.client_name} has accepted "${proposal.proposal_name}"${decisionNotes ? `: "${decisionNotes}"` : ''}`,
        related_proposal_id: proposalId,
        related_entity_type: "proposal",
        from_user_email: client.contact_email,
        from_user_name: client.contact_name || client.client_name,
        action_url: `/ProposalBuilder?id=${proposalId}`
      });

      await base44.entities.ActivityLog.create({
        proposal_id: proposalId,
        user_email: client.contact_email,
        user_name: client.contact_name || client.client_name,
        action_type: "status_changed",
        action_description: `Client ${client.contact_name || client.client_name} accepted the proposal`
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

      await base44.entities.Notification.create({
        user_email: proposal.created_by,
        notification_type: "status_change",
        title: "Client Rejected Proposal",
        message: `${client.contact_name || client.client_name} has rejected "${proposal.proposal_name}"${decisionNotes ? `. Reason: "${decisionNotes}"` : '. No reason provided.'}`,
        related_proposal_id: proposalId,
        related_entity_type: "proposal",
        from_user_email: client.contact_email,
        from_user_name: client.contact_name || client.client_name,
        action_url: `/ProposalBuilder?id=${proposalId}`
      });

      await base44.entities.ActivityLog.create({
        proposal_id: proposalId,
        user_email: client.contact_email,
        user_name: client.contact_name || client.client_name,
        action_type: "status_changed",
        action_description: `Client ${client.contact_name || client.client_name} rejected the proposal`
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
      addCommentMutation.mutate({
        content: newComment.trim(),
        type: commentType,
        priority: commentPriority,
        parentId: replyingTo?.id
      });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowUploadDialog(true);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      await uploadFileMutation.mutateAsync({ 
        file: selectedFile, 
        description: fileDescription 
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Build comment tree for threaded replies
  const buildCommentTree = (comments) => {
    const commentMap = {};
    const rootComments = [];

    comments.forEach(comment => {
      commentMap[comment.id] = { ...comment, replies: [] };
    });

    comments.forEach(comment => {
      if (comment.parent_comment_id && commentMap[comment.parent_comment_id]) {
        commentMap[comment.parent_comment_id].replies.push(commentMap[comment.id]);
      } else {
        rootComments.push(commentMap[comment.id]);
      }
    });

    return rootComments;
  };

  const CommentThread = ({ comment, depth = 0 }) => {
    const isFromClient = comment.author_email === client?.contact_email;
    
    return (
      <div className={`${depth > 0 ? 'ml-8 mt-3' : ''}`}>
        <div className={`p-4 rounded-lg border ${isFromClient ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{comment.author_name}</span>
              {isFromClient && <Badge className="bg-blue-600 text-white text-xs">You</Badge>}
              {comment.comment_type !== 'general' && (
                <Badge variant="outline" className="text-xs capitalize">
                  {comment.comment_type}
                </Badge>
              )}
              {comment.client_priority && comment.client_priority !== 'medium' && (
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    comment.client_priority === 'urgent' ? 'border-red-500 text-red-700' :
                    comment.client_priority === 'high' ? 'border-orange-500 text-orange-700' :
                    'border-slate-500 text-slate-700'
                  }`}
                >
                  {comment.client_priority}
                </Badge>
              )}
              {comment.is_resolved && (
                <Badge className="bg-green-100 text-green-700 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Resolved
                </Badge>
              )}
            </div>
            <span className="text-xs text-slate-500">
              {moment(comment.created_date).fromNow()}
            </span>
          </div>
          <p className="text-slate-700 whitespace-pre-wrap">{comment.content}</p>
          {!isFromClient && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setReplyingTo(comment)}
            >
              <Reply className="w-3 h-3 mr-1" />
              Reply
            </Button>
          )}
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map(reply => (
              <CommentThread key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const commentTree = buildCommentTree(comments);

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

        {/* Client Uploaded Files */}
        {clientFiles.length > 0 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Your Uploaded Files ({clientFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientFiles.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3 flex-1">
                      <Paperclip className="w-5 h-5 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{file.file_name}</p>
                        {file.description && (
                          <p className="text-sm text-slate-600 truncate">{file.description}</p>
                        )}
                        <p className="text-xs text-slate-500">
                          {(file.file_size / 1024).toFixed(1)} KB • {moment(file.created_date).fromNow()}
                          {file.viewed_by_consultant && (
                            <span className="ml-2 text-green-600">
                              <CheckCircle2 className="w-3 h-3 inline mr-1" />
                              Viewed by consultant
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(file.file_url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete "${file.file_name}"?`)) {
                            deleteFileMutation.mutate(file.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
              {commentTree.map(comment => (
                <CommentThread key={comment.id} comment={comment} />
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
              {replyingTo && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-1">
                      Replying to {replyingTo.author_name}
                    </p>
                    <p className="text-xs text-blue-700 line-clamp-2">{replyingTo.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setReplyingTo(null)}
                    className="h-6 w-6"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs mb-1">Feedback Type</Label>
                  <Select value={commentType} onValueChange={setCommentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Comment</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="suggestion">Suggestion</SelectItem>
                      <SelectItem value="issue">Issue/Concern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1">Priority</Label>
                  <Select value={commentPriority} onValueChange={setCommentPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Label className="mb-2">Your Feedback or Questions</Label>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts, ask questions, or request changes..."
                rows={4}
                className="mb-3"
              />
              <div className="flex gap-3">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  asChild
                >
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Paperclip className="w-4 h-4 mr-2" />
                    Attach File
                  </label>
                </Button>
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  className="flex-1"
                >
                  {addCommentMutation.isPending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {replyingTo ? 'Send Reply' : 'Send Feedback'}
                    </>
                  )}
                </Button>
              </div>
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

      {/* Upload File Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File to Consultant</DialogTitle>
            <DialogDescription>
              Share a file with your consultant related to this proposal
            </DialogDescription>
          </DialogHeader>
          
          {selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Paperclip className="w-8 h-8 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Description (Optional)</Label>
                <Textarea
                  placeholder="What is this file for?"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadDialog(false);
                    setSelectedFile(null);
                    setFileDescription("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFileUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}