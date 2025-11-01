import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageCircle, 
  Plus, 
  Send,
  Users,
  Clock,
  Pin,
  ArrowLeft,
  Loader2
} from "lucide-react";
import MentionHelper from "./MentionHelper";
import moment from "moment";

export default function ProposalDiscussion({ proposal, user, organization }) {
  // Guard clause
  if (!proposal || !user || !organization) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600">Loading discussions...</p>
        </CardContent>
      </Card>
    );
  }

  return <ProposalDiscussionContent proposal={proposal} user={user} organization={organization} />;
}

function ProposalDiscussionContent({ proposal, user, organization }) {
  const queryClient = useQueryClient();
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [newDiscussionTitle, setNewDiscussionTitle] = useState("");
  const [newDiscussionContent, setNewDiscussionContent] = useState("");
  const [newComment, setNewComment] = useState("");
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);

  const { data: discussions, isLoading } = useQuery({
    queryKey: ['proposal-discussions', proposal.id, organization.id],
    queryFn: async () => {
      return base44.entities.Discussion.filter(
        { 
          proposal_id: proposal.id,
          organization_id: organization.id
        },
        '-updated_date'
      );
    },
    initialData: [],
  });

  const { data: comments } = useQuery({
    queryKey: ['discussion-comments', selectedDiscussion?.id, organization.id],
    queryFn: async () => {
      if (!selectedDiscussion?.id) return [];
      return base44.entities.DiscussionComment.filter(
        { 
          discussion_id: selectedDiscussion.id,
          organization_id: organization.id
        },
        'created_date'
      );
    },
    initialData: [],
    enabled: !!selectedDiscussion?.id,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', organization.id],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => {
        const accesses = u.client_accesses || [];
        return accesses.some(a => a.organization_id === organization.id);
      });
    },
    initialData: [],
  });

  const createDiscussionMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Discussion.create({
        ...data,
        organization_id: organization.id,
        proposal_id: proposal.id,
        author_email: user.email,
        author_name: user.full_name,
        category: "proposal",
        comment_count: 0,
        last_activity: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-discussions'] });
      setShowNewDiscussion(false);
      setNewDiscussionTitle("");
      setNewDiscussionContent("");
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ discussionId, content }) => {
      // Extract mentions from content
      const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const mentions = [...content.matchAll(mentionRegex)].map(match => match[1]);

      const comment = await base44.entities.DiscussionComment.create({
        discussion_id: discussionId,
        organization_id: organization.id,
        content,
        author_email: user.email,
        author_name: user.full_name,
        mentions: mentions
      });

      // Update discussion activity
      await base44.entities.Discussion.update(discussionId, {
        last_activity: new Date().toISOString(),
        comment_count: (selectedDiscussion.comment_count || 0) + 1
      });

      // Create notifications for mentions
      for (const mentionedEmail of mentions) {
        if (mentionedEmail !== user.email) {
          await base44.entities.Notification.create({
            user_email: mentionedEmail,
            notification_type: "mention",
            title: "You were mentioned in a discussion",
            message: `${user.full_name} mentioned you in "${selectedDiscussion.title}"`,
            related_proposal_id: proposal.id,
            related_entity_id: discussionId,
            related_entity_type: "comment",
            from_user_email: user.email,
            from_user_name: user.full_name,
            action_url: `/app/ProposalBuilder?id=${proposal.id}`
          });
        }
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-comments'] });
      queryClient.invalidateQueries({ queryKey: ['proposal-discussions'] });
      setNewComment("");
    },
  });

  const handleCreateDiscussion = () => {
    if (newDiscussionTitle.trim() && newDiscussionContent.trim()) {
      createDiscussionMutation.mutate({
        title: newDiscussionTitle,
        content: newDiscussionContent
      });
    }
  };

  const handleAddComment = () => {
    if (newComment.trim() && selectedDiscussion) {
      createCommentMutation.mutate({
        discussionId: selectedDiscussion.id,
        content: newComment
      });
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">Loading discussions...</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left Column - Discussion List */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="border-none shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Discussions</CardTitle>
              <Button 
                size="sm" 
                onClick={() => setShowNewDiscussion(!showNewDiscussion)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {showNewDiscussion && (
                <div className="p-4 border-b bg-blue-50">
                  <Input
                    placeholder="Discussion title"
                    value={newDiscussionTitle}
                    onChange={(e) => setNewDiscussionTitle(e.target.value)}
                    className="mb-2"
                  />
                  <Textarea
                    placeholder="What would you like to discuss?"
                    value={newDiscussionContent}
                    onChange={(e) => setNewDiscussionContent(e.target.value)}
                    rows={3}
                    className="mb-2"
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleCreateDiscussion}
                      disabled={!newDiscussionTitle.trim() || !newDiscussionContent.trim() || createDiscussionMutation.isPending}
                    >
                      {createDiscussionMutation.isPending ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create'
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setShowNewDiscussion(false);
                        setNewDiscussionTitle("");
                        setNewDiscussionContent("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {discussions.length === 0 && !showNewDiscussion ? (
                <div className="text-center py-12 text-slate-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No discussions yet</p>
                  <p className="text-xs mt-1">Start a new discussion to get started</p>
                </div>
              ) : (
                <div>
                  {discussions.map((discussion) => (
                    <div
                      key={discussion.id}
                      onClick={() => setSelectedDiscussion(discussion)}
                      className={`p-4 border-b cursor-pointer transition-all ${
                        selectedDiscussion?.id === discussion.id
                          ? 'bg-blue-50 border-l-4 border-l-blue-600'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-900 line-clamp-2 flex-1">
                          {discussion.title}
                        </h4>
                        {discussion.is_pinned && (
                          <Pin className="w-4 h-4 text-amber-500 flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-3">{discussion.content}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {discussion.comment_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {discussion.author_name}
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {moment(discussion.last_activity || discussion.created_date).fromNow()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Discussion Detail */}
      <div className="lg:col-span-2">
        {selectedDiscussion ? (
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex items-start gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDiscussion(null)}
                  className="lg:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {selectedDiscussion.is_pinned && (
                      <Pin className="w-4 h-4 text-amber-500" />
                    )}
                    <CardTitle className="text-xl">{selectedDiscussion.title}</CardTitle>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{selectedDiscussion.content}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Started by {selectedDiscussion.author_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {moment(selectedDiscussion.created_date).fromNow()}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[400px] mb-6">
                {comments.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No comments yet</p>
                    <p className="text-xs mt-1">Be the first to share your thoughts</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 p-4 bg-slate-50 rounded-lg">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                            {comment.author_name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-900">{comment.author_name}</span>
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

              <div className="border-t pt-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder="Share your thoughts... (Use @email to mention someone)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <MentionHelper />
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || createCommentMutation.isPending}
                    >
                      {createCommentMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Comment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-lg h-full flex items-center justify-center">
            <CardContent className="text-center py-12">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a Discussion</h3>
              <p className="text-sm text-slate-600">
                Choose a discussion from the list to view and participate
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}