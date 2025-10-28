import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Plus,
  Send,
  Pin,
  Search,
  User,
  Calendar
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Discussions() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [commentText, setCommentText] = useState("");
  
  const [newDiscussion, setNewDiscussion] = useState({
    title: "",
    content: "",
    category: "general",
    tags: []
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const orgs = await base44.entities.Organization.filter({ created_by: currentUser.email }, '-created_date', 1);
        if (orgs.length > 0) setOrganization(orgs[0]);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: discussions, isLoading } = useQuery({
    queryKey: ['discussions'],
    queryFn: () => base44.entities.Discussion.list('-created_date'),
    initialData: []
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', selectedDiscussion?.id],
    queryFn: () => selectedDiscussion 
      ? base44.entities.DiscussionComment.filter({ discussion_id: selectedDiscussion.id }, 'created_date')
      : [],
    initialData: [],
    enabled: !!selectedDiscussion
  });

  const createDiscussionMutation = useMutation({
    mutationFn: (data) => base44.entities.Discussion.create({
      ...data,
      organization_id: organization?.id,
      author_email: user?.email,
      author_name: user?.full_name
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      setShowNewDiscussion(false);
      setNewDiscussion({ title: "", content: "", category: "general", tags: [] });
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content) => {
      const mentions = content.match(/@(\w+)/g)?.map(m => m.substring(1)) || [];
      
      const comment = await base44.entities.DiscussionComment.create({
        discussion_id: selectedDiscussion.id,
        content,
        author_email: user?.email,
        author_name: user?.full_name,
        mentions
      });

      await base44.entities.Discussion.update(selectedDiscussion.id, {
        comment_count: (selectedDiscussion.comment_count || 0) + 1,
        last_activity: new Date().toISOString()
      });

      if (mentions.length > 0) {
        for (const mention of mentions) {
          await base44.integrations.Core.SendEmail({
            to: `${mention}@example.com`,
            subject: `You were mentioned in "${selectedDiscussion.title}"`,
            body: `${user?.full_name} mentioned you in a discussion:\n\n${content}`
          });
        }
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', selectedDiscussion.id] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      setCommentText("");
    }
  });

  const filteredDiscussions = discussions.filter(d =>
    d.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedDiscussions = filteredDiscussions.filter(d => d.is_pinned);
  const regularDiscussions = filteredDiscussions.filter(d => !d.is_pinned);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Team Discussions</h1>
          <p className="text-slate-600">Collaborate with your team on proposals and projects</p>
        </div>
        <Button 
          onClick={() => setShowNewDiscussion(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Discussion
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-none shadow-lg">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search discussions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pinnedDiscussions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                    <Pin className="w-3 h-3" />
                    Pinned
                  </h3>
                  {pinnedDiscussions.map(discussion => (
                    <div
                      key={discussion.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedDiscussion?.id === discussion.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                      }`}
                      onClick={() => setSelectedDiscussion(discussion)}
                    >
                      <h4 className="font-semibold text-sm text-slate-900 mb-1 line-clamp-2">
                        {discussion.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Badge variant="outline" className="text-xs capitalize">
                          {discussion.category}
                        </Badge>
                        <span>•</span>
                        <span>{discussion.comment_count || 0} comments</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {pinnedDiscussions.length > 0 && (
                  <h3 className="text-xs font-semibold text-slate-500 uppercase mt-4">
                    All Discussions
                  </h3>
                )}
                {regularDiscussions.length === 0 ? (
                  <p className="text-center py-8 text-slate-500 text-sm">No discussions yet</p>
                ) : (
                  regularDiscussions.map(discussion => (
                    <div
                      key={discussion.id}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        selectedDiscussion?.id === discussion.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                      }`}
                      onClick={() => setSelectedDiscussion(discussion)}
                    >
                      <h4 className="font-semibold text-sm text-slate-900 mb-1 line-clamp-2">
                        {discussion.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Badge variant="outline" className="text-xs capitalize">
                          {discussion.category}
                        </Badge>
                        <span>•</span>
                        <span>{discussion.comment_count || 0} comments</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {showNewDiscussion ? (
            <Card className="border-none shadow-xl">
              <CardHeader className="border-b">
                <CardTitle>Create New Discussion</CardTitle>
                <CardDescription>Start a conversation with your team</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Discussion title..."
                    value={newDiscussion.title}
                    onChange={(e) => setNewDiscussion({...newDiscussion, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Select
                    value={newDiscussion.category}
                    onValueChange={(value) => setNewDiscussion({...newDiscussion, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="question">Question</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="What would you like to discuss? Use @username to mention team members..."
                    value={newDiscussion.content}
                    onChange={(e) => setNewDiscussion({...newDiscussion, content: e.target.value})}
                    rows={6}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowNewDiscussion(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createDiscussionMutation.mutate(newDiscussion)}
                    disabled={!newDiscussion.title || !newDiscussion.content}
                  >
                    Create Discussion
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : selectedDiscussion ? (
            <Card className="border-none shadow-xl">
              <CardHeader className="border-b">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="capitalize">
                        {selectedDiscussion.category}
                      </Badge>
                      {selectedDiscussion.is_pinned && (
                        <Badge className="bg-amber-100 text-amber-700">
                          <Pin className="w-3 h-3 mr-1" />
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl mb-2">{selectedDiscussion.title}</CardTitle>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {selectedDiscussion.author_name}
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedDiscussion.created_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="prose prose-sm max-w-none">
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedDiscussion.content}</p>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Comments ({comments.length})
                  </h3>
                  
                  <div className="space-y-4 mb-6">
                    {comments.map(comment => (
                      <div key={comment.id} className="bg-slate-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-xs">
                              {comment.author_name?.[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-slate-900">{comment.author_name}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(comment.created_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap ml-10">{comment.content}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a comment... Use @username to mention someone"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => createCommentMutation.mutate(commentText)}
                      disabled={!commentText.trim()}
                      className="self-end"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <MessageCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 mb-4">Select a discussion to view details</p>
                <Button onClick={() => setShowNewDiscussion(true)}>
                  Start a New Discussion
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}