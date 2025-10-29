import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Lightbulb,
  Loader2
} from "lucide-react";
import moment from "moment";

export default function SectionComments({ proposal, section, user }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState("general");

  const { data: comments, isLoading } = useQuery({
    queryKey: ['section-comments', section?.id],
    queryFn: async () => {
      if (!section?.id) return [];
      return base44.entities.ProposalComment.filter(
        { section_id: section.id },
        'created_date'
      );
    },
    initialData: [],
    enabled: !!section?.id,
  });

  const createCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      // Extract mentions from content
      const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const mentions = [...commentData.content.matchAll(mentionRegex)].map(match => match[1]);

      const comment = await base44.entities.ProposalComment.create({
        ...commentData,
        mentions: mentions
      });

      // Create notifications for mentions
      for (const mentionedEmail of mentions) {
        if (mentionedEmail !== user.email) {
          await base44.entities.Notification.create({
            user_email: mentionedEmail,
            notification_type: "mention",
            title: "You were mentioned in a section comment",
            message: `${user.full_name} mentioned you in "${section.section_name}"`,
            related_proposal_id: proposal.id,
            related_entity_id: section.id,
            related_entity_type: "section",
            from_user_email: user.email,
            from_user_name: user.full_name,
            action_url: `/app/ProposalBuilder?id=${proposal.id}`
          });
        }
      }

      // Log activity
      await base44.entities.ActivityLog.create({
        proposal_id: proposal.id,
        user_email: user.email,
        user_name: user.full_name,
        action_type: "comment_added",
        action_description: `commented on ${section.section_name}`,
        section_id: section.id,
        related_entity_id: comment.id
      });

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-comments'] });
      setNewComment("");
      setCommentType("general");
    },
  });

  const resolveCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      return await base44.entities.ProposalComment.update(commentId, {
        is_resolved: true,
        resolved_by: user.email,
        resolved_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-comments'] });
    },
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      createCommentMutation.mutate({
        proposal_id: proposal.id,
        section_id: section.id,
        author_email: user.email,
        author_name: user.full_name,
        content: newComment,
        comment_type: commentType
      });
    }
  };

  const getCommentIcon = (type) => {
    switch (type) {
      case "suggestion": return <Lightbulb className="w-4 h-4 text-amber-600" />;
      case "question": return <HelpCircle className="w-4 h-4 text-blue-600" />;
      case "issue": return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "approval": return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <MessageSquare className="w-4 h-4 text-slate-600" />;
    }
  };

  const getCommentTypeColor = (type) => {
    switch (type) {
      case "suggestion": return "bg-amber-100 text-amber-700";
      case "question": return "bg-blue-100 text-blue-700";
      case "issue": return "bg-red-100 text-red-700";
      case "approval": return "bg-green-100 text-green-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  const unresolvedComments = comments.filter(c => !c.is_resolved);
  const resolvedComments = comments.filter(c => c.is_resolved);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Section Comments
          {unresolvedComments.length > 0 && (
            <Badge variant="destructive">{unresolvedComments.length} unresolved</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-[400px] mb-6">
          {comments.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No comments yet</p>
              <p className="text-xs mt-1">Be the first to comment on this section</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Unresolved Comments */}
              {unresolvedComments.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Unresolved ({unresolvedComments.length})
                  </h4>
                  {unresolvedComments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-4 bg-white border-2 border-slate-200 rounded-lg">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                          {comment.author_name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-slate-900">{comment.author_name}</span>
                          <Badge variant="outline" className={getCommentTypeColor(comment.comment_type)}>
                            {getCommentIcon(comment.comment_type)}
                            <span className="ml-1">{comment.comment_type}</span>
                          </Badge>
                          <span className="text-xs text-slate-500 ml-auto">
                            {moment(comment.created_date).fromNow()}
                          </span>
                        </div>
                        <p className="text-slate-700 text-sm whitespace-pre-wrap mb-3">{comment.content}</p>
                        {comment.author_email !== user.email && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveCommentMutation.mutate(comment.id)}
                            disabled={resolveCommentMutation.isPending}
                          >
                            <CheckCircle className="w-3 h-3 mr-2" />
                            Mark as Resolved
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Resolved Comments */}
              {resolvedComments.length > 0 && (
                <>
                  <h4 className="text-sm font-semibold text-slate-500 flex items-center gap-2 mt-6">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Resolved ({resolvedComments.length})
                  </h4>
                  {resolvedComments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-4 bg-slate-50 rounded-lg opacity-60">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
                          {comment.author_name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-slate-700">{comment.author_name}</span>
                          <Badge variant="outline" className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolved
                          </Badge>
                          <span className="text-xs text-slate-500 ml-auto">
                            {moment(comment.created_date).fromNow()}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm whitespace-pre-wrap">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="border-t pt-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Select value={commentType} onValueChange={setCommentType}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">💬 General</SelectItem>
                  <SelectItem value="suggestion">💡 Suggestion</SelectItem>
                  <SelectItem value="question">❓ Question</SelectItem>
                  <SelectItem value="issue">⚠️ Issue</SelectItem>
                  <SelectItem value="approval">✅ Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Add a comment... (Use @email to mention someone)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-500">
                💡 Tip: Use @email to notify team members
              </p>
              <Button 
                onClick={handleAddComment}
                disabled={!newComment.trim() || createCommentMutation.isPending}
              >
                {createCommentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Add Comment
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}