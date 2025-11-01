import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageCircle, 
  Plus, 
  Search,
  Send,
  Users,
  Clock,
  Pin,
  Lock,
  Unlock
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MentionHelper from "../components/collaboration/MentionHelper";
import moment from "moment";

export default function Discussions() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [newComment, setNewComment] = useState("");
  
  const [newDiscussion, setNewDiscussion] = useState({
    title: "",
    description: "",
    category: "general",
    is_pinned: false
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Get organization from active_client_id or client_accesses
        let orgId = currentUser.active_client_id;
        
        // If no active_client_id, get first organization from client_accesses
        if (!orgId && currentUser.client_accesses && currentUser.client_accesses.length > 0) {
          orgId = currentUser.client_accesses[0].organization_id;
        }
        
        // Fallback to created_by for backward compatibility
        if (!orgId) {
          const orgs = await base44.entities.Organization.filter(
            { created_by: currentUser.email },
            '-created_date',
            1
          );
          if (orgs.length > 0) {
            orgId = orgs[0].id;
          }
        }
        
        // Load the full organization details
        if (orgId) {
          const orgs = await base44.entities.Organization.filter({ id: orgId });
          if (orgs.length > 0) {
            setOrganization(orgs[0]);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: discussions, isLoading } = useQuery({
    queryKey: ['discussions', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Discussion.filter(
        { organization_id: organization.id },
        '-updated_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const { data: comments } = useQuery({
    queryKey: ['discussion-comments', selectedDiscussion?.id, organization?.id],
    queryFn: async () => {
      if (!selectedDiscussion?.id || !organization?.id) return [];
      return base44.entities.DiscussionComment.filter(
        { 
          discussion_id: selectedDiscussion.id,
          organization_id: organization.id
        },
        'created_date'
      );
    },
    initialData: [],
    enabled: !!selectedDiscussion?.id && !!organization?.id,
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => {
        const accesses = u.client_accesses || [];
        return accesses.some(a => a.organization_id === organization.id);
      });
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const createDiscussionMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Discussion.create({
        ...data,
        organization_id: organization.id,
        created_by_name: user.full_name,
        participant_count: 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      setShowNewDiscussion(false);
      setNewDiscussion({ title: "", description: "", category: "general", is_pinned: false });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ discussionId, content }) => {
      const comment = await base44.entities.DiscussionComment.create({
        discussion_id: discussionId,
        organization_id: organization.id,
        content,
        author_name: user.full_name,
        author_email: user.email
      });

      await base44.entities.Discussion.update(discussionId, {
        last_activity_date: new Date().toISOString(),
        comment_count: (selectedDiscussion.comment_count || 0) + 1
      });

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-comments'] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      setNewComment("");
    },
  });

  const handleCreateDiscussion = () => {
    if (newDiscussion.title.trim()) {
      createDiscussionMutation.mutate(newDiscussion);
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

  const filteredDiscussions = discussions.filter(d => 
    d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category) => {
    const colors = {
      general: "bg-blue-100 text-blue-800",
      technical: "bg-purple-100 text-purple-800",
      strategy: "bg-green-100 text-green-800",
      feedback: "bg-amber-100 text-amber-800",
      question: "bg-pink-100 text-pink-800"
    };
    return colors[category] || colors.general;
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Team Discussions</h1>
          <p className="text-slate-600">Collaborate and share ideas with your team</p>
        </div>
        <Button 
          onClick={() => setShowNewDiscussion(!showNewDiscussion)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Discussion
        </Button>
      </div>

      {showNewDiscussion && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Start a New Discussion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Discussion title"
              value={newDiscussion.title}
              onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
            />
            <Textarea
              placeholder="What would you like to discuss?"
              value={newDiscussion.description}
              onChange={(e) => setNewDiscussion({ ...newDiscussion, description: e.target.value })}
              rows={4}
            />
            <div className="flex gap-2 flex-wrap">
              {["general", "technical", "strategy", "feedback", "question"].map((cat) => (
                <Button
                  key={cat}
                  variant={newDiscussion.category === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setNewDiscussion({ ...newDiscussion, category: cat })}
                  className="capitalize"
                >
                  {cat}
                </Button>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowNewDiscussion(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateDiscussion} disabled={!newDiscussion.title.trim()}>
                Create Discussion
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {isLoading ? (
                [1,2,3].map(i => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))
              ) : filteredDiscussions.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No discussions yet</p>
                  <p className="text-xs mt-1">Start a new discussion to get started</p>
                </div>
              ) : (
                filteredDiscussions.map((discussion) => (
                  <div
                    key={discussion.id}
                    onClick={() => setSelectedDiscussion(discussion)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedDiscussion?.id === discussion.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 line-clamp-2">{discussion.title}</h3>
                      {discussion.is_pinned && (
                        <Pin className="w-4 h-4 text-amber-500 flex-shrink-0 ml-2" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">{discussion.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={getCategoryColor(discussion.category)}>
                          {discussion.category}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          {discussion.comment_count || 0}
                        </span>
                      </div>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {moment(discussion.last_activity_date || discussion.created_date).fromNow()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selectedDiscussion ? (
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {selectedDiscussion.is_pinned && (
                        <Pin className="w-4 h-4 text-amber-500" />
                      )}
                      <CardTitle>{selectedDiscussion.title}</CardTitle>
                    </div>
                    <p className="text-sm text-slate-600">{selectedDiscussion.description}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <Badge className={getCategoryColor(selectedDiscussion.category)}>
                        {selectedDiscussion.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3 h-3" />
                        {selectedDiscussion.participant_count || 1} participants
                      </div>
                      <span className="text-xs text-slate-500">
                        Started by {selectedDiscussion.created_by_name} • {moment(selectedDiscussion.created_date).fromNow()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto">
                  {comments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm">No comments yet</p>
                      <p className="text-xs mt-1">Be the first to share your thoughts</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
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
                    ))
                  )}
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Share your thoughts... (Use @email to mention someone)"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <MentionHelper 
                      text={newComment}
                      teamMembers={teamMembers}
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || createCommentMutation.isPending}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {createCommentMutation.isPending ? 'Sending...' : 'Send Comment'}
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
    </div>
  );
}