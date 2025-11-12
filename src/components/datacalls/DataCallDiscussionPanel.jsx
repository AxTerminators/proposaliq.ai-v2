import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, User, Clock, AtSign } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { cn } from "@/lib/utils";

export default function DataCallDiscussionPanel({ dataCall, user }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [mentioning, setMentioning] = useState(false);

  // Fetch comments (using ProposalComment with special flag)
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['data-call-comments', dataCall?.id],
    queryFn: async () => {
      if (!dataCall?.id) return [];
      // Store data call comments as ProposalComment with special metadata
      const allComments = await base44.entities.ProposalComment.filter({
        proposal_id: dataCall.id // Using proposal_id field for data_call_id
      }, '-created_date');
      return allComments;
    },
    enabled: !!dataCall?.id
  });

  const addCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      const mentions = extractMentions(commentData.content);
      
      await base44.entities.ProposalComment.create({
        proposal_id: dataCall.id,
        author_email: user.email,
        author_name: user.full_name,
        content: commentData.content,
        mentions: mentions,
        comment_type: 'general'
      });

      // Create notifications for mentioned users
      for (const mentionedEmail of mentions) {
        await base44.entities.Notification.create({
          user_email: mentionedEmail,
          notification_type: 'mention',
          title: 'You were mentioned in a data call',
          message: `${user.full_name} mentioned you in "${dataCall.request_title}"`,
          related_proposal_id: dataCall.id,
          from_user_email: user.email,
          from_user_name: user.full_name,
          action_url: `/data-calls?id=${dataCall.id}`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-call-comments', dataCall.id] });
      setNewComment('');
      toast.success('Comment added!');
    },
    onError: (error) => {
      toast.error('Failed to add comment: ' + error.message);
    }
  });

  const extractMentions = (text) => {
    const mentionRegex = /@(\S+@\S+\.\S+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(m => m.substring(1)) : [];
  };

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment... Use @email to mention team members"
              rows={3}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                <AtSign className="w-3 h-3 inline mr-1" />
                Type @ followed by email to mention someone
              </p>
              <Button
                onClick={handleSubmit}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                size="sm"
              >
                {addCommentMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post Comment
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-600">No comments yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Start a discussion with your team
              </p>
            </CardContent>
          </Card>
        ) : (
          comments.map(comment => (
            <Card key={comment.id} className="border-l-4 border-l-blue-400">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {comment.author_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-900">
                        {comment.author_name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {moment(comment.created_date).fromNow()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {comment.content}
                    </p>

                    {comment.mentions?.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <AtSign className="w-3 h-3 text-slate-400" />
                        <div className="flex gap-1 flex-wrap">
                          {comment.mentions.map(email => (
                            <Badge key={email} variant="secondary" className="text-xs">
                              {email}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {comments.length > 5 && (
        <div className="text-center text-xs text-slate-400">
          <Clock className="w-3 h-3 inline mr-1" />
          Showing {comments.length} comments
        </div>
      )}
    </div>
  );
}