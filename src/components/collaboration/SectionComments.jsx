import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare,
  Send,
  Reply,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  X
} from "lucide-react";
import moment from "moment";

export default function SectionComments({ section, proposal, user }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [commentType, setCommentType] = useState("general");
  const [replyingTo, setReplyingTo] = useState(null);

  const { data: comments } = useQuery({
    queryKey: ['section-comments', section.id],
    queryFn: async () => {
      return base44.entities.ProposalComment.filter({
        proposal_id: proposal.id,
        section_id: section.id
      }, 'created_date');
    },
    initialData: [],
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, type, parentId }) => {
      const comment = await base44.entities.ProposalComment.create({
        proposal_id: proposal.id,
        section_id: section.id,
        author_email: user.email,
        author_name: user.full_name,
        content,
        comment_type: type,
        parent_comment_id: parentId || null,
        is_from_client: false
      });

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
      setReplyingTo(null);
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

  const unresolveCommentMutation = useMutation({
    mutationFn: async (commentId) => {
      return await base44.entities.ProposalComment.update(commentId, {
        is_resolved: false,
        resolved_by: null,
        resolved_date: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-comments'] });
    },
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate({
        content: newComment.trim(),
        type: commentType,
        parentId: replyingTo?.id
      });
    }
  };

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
    const isFromClient = comment.is_from_client;
    
    return (
      <div className={`${depth > 0 ? 'ml-8 mt-3' : ''}`}>
        <div className={`p-4 rounded-lg border ${
          comment.is_resolved 
            ? 'bg-green-50 border-green-200' 
            : isFromClient 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <span className="text-white text-xs font-semibold">
                  {comment.author_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-900 text-sm">{comment.author_name}</span>
                {isFromClient && (
                  <Badge className="bg-blue-600 text-white text-xs ml-2">Client</Badge>
                )}
                {comment.comment_type !== 'general' && (
                  <Badge variant="outline" className="text-xs ml-2 capitalize">
                    {comment.comment_type}
                  </Badge>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-500">
              {moment(comment.created_date).fromNow()}
            </span>
          </div>

          <p className="text-slate-700 whitespace-pre-wrap text-sm mb-3">{comment.content}</p>

          <div className="flex items-center gap-2">
            {comment.is_resolved ? (
              <>
                <Badge className="bg-green-100 text-green-700 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Resolved
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => unresolveCommentMutation.mutate(comment.id)}
                  className="h-7 text-xs"
                >
                  Unresolve
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyingTo(comment)}
                  className="h-7 text-xs"
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Button>
                {!isFromClient && depth === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => resolveCommentMutation.mutate(comment.id)}
                    className="h-7 text-xs text-green-600 hover:text-green-700"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Mark Resolved
                  </Button>
                )}
              </>
            )}
          </div>
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
  const unresolvedCount = comments.filter(c => !c.is_resolved && !c.parent_comment_id).length;

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Section Comments
          </div>
          <div className="flex items-center gap-2">
            {unresolvedCount > 0 && (
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                {unresolvedCount} Unresolved
              </Badge>
            )}
            <Badge variant="secondary">
              {comments.length} Total
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Existing Comments */}
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          {commentTree.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No comments on this section yet</p>
            </div>
          ) : (
            commentTree.map(comment => (
              <CommentThread key={comment.id} comment={comment} />
            ))
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

          <div className="mb-3">
            <Select value={commentType} onValueChange={setCommentType}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Comment</SelectItem>
                <SelectItem value="question">Question</SelectItem>
                <SelectItem value="suggestion">Suggestion</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
                <SelectItem value="approval">Approval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? "Write your reply..." : "Add a comment..."}
              rows={3}
              className="flex-1"
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
                  {replyingTo ? 'Reply' : 'Send'}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}