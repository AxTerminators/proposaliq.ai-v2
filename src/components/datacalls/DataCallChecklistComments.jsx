import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MessageSquare, Send, User } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { cn } from "@/lib/utils";

export default function DataCallChecklistComments({ 
  dataCall, 
  checklistItemId, 
  user 
}) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Fetch comments for this specific checklist item
  const { data: comments = [] } = useQuery({
    queryKey: ['checklist-comments', dataCall?.id, checklistItemId],
    queryFn: async () => {
      if (!dataCall?.id || !checklistItemId) return [];
      
      // Using section_id field to store checklist_item_id
      return await base44.entities.ProposalComment.filter({
        proposal_id: dataCall.id,
        section_id: checklistItemId
      }, '-created_date');
    },
    enabled: !!dataCall?.id && !!checklistItemId
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.ProposalComment.create({
        proposal_id: dataCall.id,
        section_id: checklistItemId,
        author_email: user.email,
        author_name: user.full_name,
        content: content,
        comment_type: 'general'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-comments', dataCall.id, checklistItemId] });
      setNewComment('');
      toast.success('Comment added!');
    },
    onError: (error) => {
      toast.error('Failed to add comment: ' + error.message);
    }
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative",
            comments.length > 0 && "text-blue-600"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          {comments.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-blue-600">
              {comments.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Item Comments ({comments.length})
          </h4>

          {/* Comment Input */}
          <div className="space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment about this item..."
              rows={2}
              className="text-sm"
            />
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              size="sm"
              className="w-full"
            >
              {addCommentMutation.isPending ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>

          {/* Comments List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No comments yet
              </p>
            ) : (
              comments.map(comment => (
                <Card key={comment.id} className="bg-slate-50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {comment.author_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-900">
                            {comment.author_name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {moment(comment.created_date).fromNow()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}