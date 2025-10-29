import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Send, 
  Loader2
} from "lucide-react";
import moment from "moment";

export default function TaskComments({ proposal, task, user }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ['task-comments', task?.id],
    queryFn: async () => {
      if (!task?.id) return [];
      return base44.entities.ProposalComment.filter(
        { task_id: task.id },
        'created_date'
      );
    },
    initialData: [],
    enabled: !!task?.id,
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
            title: "You were mentioned in a task comment",
            message: `${user.full_name} mentioned you in task: ${task.title}`,
            related_proposal_id: proposal.id,
            related_entity_id: task.id,
            related_entity_type: "comment",
            from_user_email: user.email,
            from_user_name: user.full_name,
            action_url: `/app/ProposalBuilder?id=${proposal.id}`
          });
        }
      }

      // Notify task assignee if they're not the commenter
      if (task.assigned_to_email && task.assigned_to_email !== user.email) {
        await base44.entities.Notification.create({
          user_email: task.assigned_to_email,
          notification_type: "comment_reply",
          title: "New comment on your task",
          message: `${user.full_name} commented on: ${task.title}`,
          related_proposal_id: proposal.id,
          related_entity_id: task.id,
          related_entity_type: "comment",
          from_user_email: user.email,
          from_user_name: user.full_name,
          action_url: `/app/ProposalBuilder?id=${proposal.id}`
        });
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments'] });
      setNewComment("");
    },
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      createCommentMutation.mutate({
        proposal_id: proposal.id,
        task_id: task.id,
        author_email: user.email,
        author_name: user.full_name,
        content: newComment,
        comment_type: "general"
      });
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-slate-600" />
          <h4 className="font-semibold text-slate-900">Comments</h4>
          <Badge variant="secondary">{comments.length}</Badge>
        </div>

        <ScrollArea className="h-[300px] mb-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No comments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs">
                      {comment.author_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-slate-900">{comment.author_name}</span>
                      <span className="text-xs text-slate-500">
                        {moment(comment.created_date).fromNow()}
                      </span>
                    </div>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment... (Use @email to mention someone)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end">
            <Button 
              size="sm"
              onClick={handleAddComment}
              disabled={!newComment.trim() || createCommentMutation.isPending}
            >
              {createCommentMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3 mr-2" />
                  Comment
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}