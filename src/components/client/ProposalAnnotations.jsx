import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare,
  Highlighter,
  StickyNote,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Reply,
  Eye,
  EyeOff
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function ProposalAnnotations({ proposal, sectionId, currentMember, client }) {
  const queryClient = useQueryClient();
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState({
    content: "",
    annotation_type: "comment",
    priority: "medium",
    visible_to_consultant: true
  });
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: annotations } = useQuery({
    queryKey: ['proposal-annotations', proposal.id, sectionId],
    queryFn: () => base44.entities.ProposalAnnotation.filter({
      proposal_id: proposal.id,
      section_id: sectionId || { $exists: false }
    }, '-created_date'),
    initialData: []
  });

  const createAnnotationMutation = useMutation({
    mutationFn: async (annotationData) => {
      return await base44.entities.ProposalAnnotation.create({
        ...annotationData,
        proposal_id: proposal.id,
        section_id: sectionId,
        client_id: client.id,
        team_member_id: currentMember.id,
        author_name: currentMember.member_name,
        author_email: currentMember.member_email,
        is_resolved: false,
        replies: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-annotations'] });
      setShowAnnotationDialog(false);
      setNewAnnotation({
        content: "",
        annotation_type: "comment",
        priority: "medium",
        visible_to_consultant: true
      });
    },
  });

  const addReplyMutation = useMutation({
    mutationFn: async ({ annotationId, replyContent }) => {
      const annotation = annotations.find(a => a.id === annotationId);
      const updatedReplies = [
        ...(annotation.replies || []),
        {
          author_name: currentMember.member_name,
          author_email: currentMember.member_email,
          content: replyContent,
          created_date: new Date().toISOString()
        }
      ];
      
      return await base44.entities.ProposalAnnotation.update(annotationId, {
        replies: updatedReplies
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-annotations'] });
      setReplyingTo(null);
      setReplyContent("");
    },
  });

  const resolveAnnotationMutation = useMutation({
    mutationFn: async (annotationId) => {
      return await base44.entities.ProposalAnnotation.update(annotationId, {
        is_resolved: true,
        resolved_by: currentMember.member_email,
        resolved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-annotations'] });
    },
  });

  const deleteAnnotationMutation = useMutation({
    mutationFn: async (annotationId) => {
      return await base44.entities.ProposalAnnotation.delete(annotationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-annotations'] });
    },
  });

  const handleCreateAnnotation = () => {
    if (!newAnnotation.content.trim()) {
      alert("Please enter annotation content");
      return;
    }
    createAnnotationMutation.mutate(newAnnotation);
  };

  const handleAddReply = (annotationId) => {
    if (!replyContent.trim()) {
      alert("Please enter a reply");
      return;
    }
    addReplyMutation.mutate({ annotationId, replyContent });
  };

  const getAnnotationIcon = (type) => {
    const icons = {
      highlight: Highlighter,
      sticky_note: StickyNote,
      comment: MessageSquare,
      suggestion: MessageSquare,
      question: AlertCircle,
      issue: AlertCircle
    };
    return icons[type] || MessageSquare;
  };

  const getAnnotationColor = (type) => {
    const colors = {
      highlight: "bg-yellow-100 text-yellow-700 border-yellow-300",
      sticky_note: "bg-pink-100 text-pink-700 border-pink-300",
      comment: "bg-blue-100 text-blue-700 border-blue-300",
      suggestion: "bg-purple-100 text-purple-700 border-purple-300",
      question: "bg-amber-100 text-amber-700 border-amber-300",
      issue: "bg-red-100 text-red-700 border-red-300"
    };
    return colors[type] || "bg-slate-100 text-slate-700 border-slate-300";
  };

  const getPriorityBadge = (priority) => {
    const configs = {
      low: { color: "bg-slate-100 text-slate-700", label: "Low" },
      medium: { color: "bg-blue-100 text-blue-700", label: "Medium" },
      high: { color: "bg-orange-100 text-orange-700", label: "High" },
      critical: { color: "bg-red-100 text-red-700", label: "Critical" }
    };
    const config = configs[priority] || configs.medium;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const unresolvedAnnotations = annotations.filter(a => !a.is_resolved);
  const resolvedAnnotations = annotations.filter(a => a.is_resolved);

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Annotations & Comments</h3>
              <p className="text-sm text-slate-600">
                {unresolvedAnnotations.length} active • {resolvedAnnotations.length} resolved
              </p>
            </div>
            <Button onClick={() => setShowAnnotationDialog(true)}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Add Annotation
            </Button>
          </div>

          {/* Unresolved Annotations */}
          {unresolvedAnnotations.length > 0 && (
            <div className="space-y-4 mb-6">
              <h4 className="font-semibold text-slate-700">Active Annotations</h4>
              {unresolvedAnnotations.map((annotation) => {
                const Icon = getAnnotationIcon(annotation.annotation_type);
                const isAuthor = annotation.team_member_id === currentMember.id;

                return (
                  <div
                    key={annotation.id}
                    className={`p-4 rounded-lg border-2 ${getAnnotationColor(annotation.annotation_type)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        <span className="font-semibold">{annotation.author_name}</span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {annotation.annotation_type.replace(/_/g, ' ')}
                        </Badge>
                        {getPriorityBadge(annotation.priority)}
                        {!annotation.visible_to_consultant && (
                          <Badge variant="outline" className="text-xs">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Internal Only
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {currentMember.permissions?.can_approve && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resolveAnnotationMutation.mutate(annotation.id)}
                            title="Mark as Resolved"
                          >
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        {isAuthor && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this annotation?')) {
                                deleteAnnotationMutation.mutate(annotation.id);
                              }
                            }}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-800 mb-2">{annotation.content}</p>

                    {annotation.text_selection?.selected_text && (
                      <div className="p-2 bg-white/50 rounded mb-2 text-sm italic">
                        "{annotation.text_selection.selected_text}"
                      </div>
                    )}

                    <p className="text-xs text-slate-600 mb-3">
                      {moment(annotation.created_date).format('MMM D, YYYY [at] h:mm A')}
                    </p>

                    {/* Replies */}
                    {annotation.replies && annotation.replies.length > 0 && (
                      <div className="space-y-2 mt-3 pl-4 border-l-2">
                        {annotation.replies.map((reply, idx) => (
                          <div key={idx} className="p-2 bg-white/50 rounded">
                            <p className="text-sm font-semibold text-slate-700">{reply.author_name}</p>
                            <p className="text-sm text-slate-800">{reply.content}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {moment(reply.created_date).fromNow()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Form */}
                    {replyingTo === annotation.id ? (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={2}
                          placeholder="Type your reply..."
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAddReply(annotation.id)}
                            disabled={addReplyMutation.isPending}
                          >
                            <Reply className="w-3 h-3 mr-1" />
                            Reply
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyingTo(annotation.id)}
                        className="mt-2"
                      >
                        <Reply className="w-3 h-3 mr-1" />
                        Reply
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Resolved Annotations */}
          {resolvedAnnotations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-700">Resolved</h4>
              {resolvedAnnotations.map((annotation) => {
                const Icon = getAnnotationIcon(annotation.annotation_type);

                return (
                  <div
                    key={annotation.id}
                    className="p-3 rounded-lg bg-slate-50 border opacity-60"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-slate-500" />
                          <span className="font-medium text-slate-700">{annotation.author_name}</span>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm text-slate-600">{annotation.content}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Resolved by {annotation.resolved_by} • {moment(annotation.resolved_date).fromNow()}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {annotations.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>No annotations yet</p>
              <p className="text-sm mt-1">Add comments, highlights, or questions</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Annotation Dialog */}
      <Dialog open={showAnnotationDialog} onOpenChange={setShowAnnotationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Annotation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Annotation Type</label>
              <Select
                value={newAnnotation.annotation_type}
                onValueChange={(value) => setNewAnnotation({ ...newAnnotation, annotation_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comment">Comment</SelectItem>
                  <SelectItem value="highlight">Highlight</SelectItem>
                  <SelectItem value="sticky_note">Sticky Note</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <Select
                value={newAnnotation.priority}
                onValueChange={(value) => setNewAnnotation({ ...newAnnotation, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <Textarea
                value={newAnnotation.content}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, content: e.target.value })}
                rows={4}
                placeholder="Enter your annotation..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="visible_to_consultant"
                checked={newAnnotation.visible_to_consultant}
                onChange={(e) => setNewAnnotation({ ...newAnnotation, visible_to_consultant: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="visible_to_consultant" className="text-sm">
                Visible to consultant
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAnnotationDialog(false);
                setNewAnnotation({
                  content: "",
                  annotation_type: "comment",
                  priority: "medium",
                  visible_to_consultant: true
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateAnnotation} disabled={createAnnotationMutation.isPending}>
              Add Annotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}