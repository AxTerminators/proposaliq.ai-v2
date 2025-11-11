
import React, { useState, useEffect, useRef, useMemo } from "react";
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
  AtSign,
  ExternalLink,
  FileText
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const textareaRef = useRef(null);
  
  const [newDiscussion, setNewDiscussion] = useState({
    title: "",
    content: "",
    category: "general",
    is_pinned: false
  });

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        let orgId = currentUser.active_client_id;
        
        if (!orgId && currentUser.client_accesses && currentUser.client_accesses.length > 0) {
          orgId = currentUser.client_accesses[0].organization_id;
        }
        
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

  const { data: fetchedTeamMembers = [] } = useQuery({
    queryKey: ['team-members-for-mentions', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const allUsers = await base44.entities.User.list();
      
      const orgUsers = allUsers.filter(u => {
        const accesses = u.client_accesses || [];
        return accesses.some(a => a.organization_id === organization.id);
      });
      
      return orgUsers.length > 0 ? orgUsers : allUsers;
    },
    enabled: !!organization?.id,
    staleTime: 300000,
  });

  const teamMembers = useMemo(() => {
    if (!user) return fetchedTeamMembers;
    
    const members = [...fetchedTeamMembers];
    const currentUserExists = members.some(m => m.email === user.email);
    
    if (!currentUserExists) {
      members.push({
        email: user.email,
        full_name: user.full_name,
        id: user.id
      });
    }
    
    const uniqueMembers = Array.from(new Map(members.map(item => [item.email, item])).values());
    return uniqueMembers;
  }, [fetchedTeamMembers, user]);

  const checkForMentions = (text) => {
    if (!textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex === -1) {
      setShowMentionDropdown(false);
      setMentionFilter("");
      return;
    }
    
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    
    if (textAfterAt.includes(' ')) {
      setShowMentionDropdown(false);
      setMentionFilter("");
      return;
    }
    
    setMentionFilter(textAfterAt);
    setShowMentionDropdown(true);
  };

  const handleTextareaChange = (e) => {
    setNewComment(e.target.value);
    checkForMentions(e.target.value);
  };

  const handleMentionSelect = (member) => {
    if (!textareaRef.current) return;
    
    const text = newComment;
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = text.substring(0, lastAtIndex);
      const afterCursor = text.substring(cursorPos);
      
      const newText = beforeAt + '@' + member.email + ' ' + afterCursor;
      
      setNewComment(newText);
      setShowMentionDropdown(false);
      setMentionFilter("");
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = beforeAt.length + member.email.length + 2;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  const filteredTeamMembers = useMemo(() => {
    if (!mentionFilter) return teamMembers;
    
    return teamMembers.filter(member => 
      member.email.toLowerCase().includes(mentionFilter.toLowerCase()) ||
      (member.full_name && member.full_name.toLowerCase().includes(mentionFilter.toLowerCase()))
    );
  }, [teamMembers, mentionFilter]);

  const { data: linkedProposal } = useQuery({
    queryKey: ['linked-proposal', selectedDiscussion?.proposal_id],
    queryFn: async () => {
      if (!selectedDiscussion?.proposal_id) return null;
      const proposals = await base44.entities.Proposal.filter({ id: selectedDiscussion.proposal_id });
      return proposals.length > 0 ? proposals[0] : null;
    },
    enabled: !!selectedDiscussion?.proposal_id,
  });

  const createDiscussionMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Discussion.create({
        ...data,
        organization_id: organization.id,
        author_email: user.email,
        author_name: user.full_name,
        comment_count: 0,
        last_activity: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      setShowNewDiscussion(false);
      setNewDiscussion({ title: "", content: "", category: "general", is_pinned: false });
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ discussionId, content }) => {
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

      await base44.entities.Discussion.update(discussionId, {
        last_activity: new Date().toISOString(),
        comment_count: (selectedDiscussion.comment_count || 0) + 1
      });

      // Send notifications AND emails to mentioned users
      for (const mentionedEmail of mentions) {
        if (mentionedEmail !== user.email) {
          await base44.entities.Notification.create({
            user_email: mentionedEmail,
            notification_type: "mention",
            title: "You were mentioned in a discussion",
            message: `${user.full_name} mentioned you in "${selectedDiscussion.title}"`,
            related_proposal_id: selectedDiscussion.proposal_id,
            related_entity_id: discussionId,
            related_entity_type: "comment",
            from_user_email: user.email,
            from_user_name: user.full_name,
            action_url: selectedDiscussion.proposal_id 
              ? `/app/Pipeline?proposalId=${selectedDiscussion.proposal_id}&tab=discussions`
              : `/app/Discussions`
          });

          try {
            const emailLink = selectedDiscussion.proposal_id
              ? `${window.location.origin}/app/Pipeline?proposalId=${selectedDiscussion.proposal_id}&tab=discussions`
              : `${window.location.origin}/app/Discussions`;

            await base44.integrations.Core.SendEmail({
              to: mentionedEmail,
              subject: `${user.full_name} mentioned you in "${selectedDiscussion.title}"`,
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">💬 You were mentioned!</h1>
                  </div>
                  
                  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
                      <strong>${user.full_name}</strong> mentioned you in a discussion:
                    </p>
                    
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                      <h2 style="font-size: 18px; color: #1f2937; margin: 0 0 10px 0;">
                        "${selectedDiscussion.title}"
                      </h2>
                      <p style="color: #6b7280; font-size: 14px; margin: 0; white-space: pre-wrap;">
                        ${content.substring(0, 300)}${content.length > 300 ? '...' : ''}
                      </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="${emailLink}" 
                         style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        View Discussion →
                      </a>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        Discussion: ${selectedDiscussion.title}
                      </p>
                    </div>
                  </div>
                </div>
              `
            });
          } catch (emailError) {
            console.error('[Mentions] Failed to send email:', emailError);
          }
        }
      }

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-comments'] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      setNewComment("");
    },
  });

  const handleCreateDiscussion = () => {
    if (newDiscussion.title.trim() && newDiscussion.content.trim()) {
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
    d.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (category) => {
    const colors = {
      general: "bg-blue-100 text-blue-800",
      proposal: "bg-purple-100 text-purple-800",
      question: "bg-pink-100 text-pink-800",
      announcement: "bg-green-100 text-green-800"
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
              value={newDiscussion.content}
              onChange={(e) => setNewDiscussion({ ...newDiscussion, content: e.target.value })}
              rows={4}
            />
            <div className="flex gap-2 flex-wrap">
              {["general", "proposal", "question", "announcement"].map((cat) => (
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
              <Button onClick={handleCreateDiscussion} disabled={!newDiscussion.title.trim() || !newDiscussion.content.trim()}>
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
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {[1,2,3].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : filteredDiscussions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 px-4">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No discussions yet</p>
                    <p className="text-xs mt-1">Start a new discussion to get started</p>
                  </div>
                ) : (
                  <div>
                    {filteredDiscussions.map((discussion) => (
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
                          <h3 className="font-semibold text-slate-900 line-clamp-2 flex-1">{discussion.title}</h3>
                          {discussion.is_pinned && (
                            <Pin className="w-4 h-4 text-amber-500 flex-shrink-0 ml-2" />
                          )}
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{discussion.content}</p>
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
                    <p className="text-sm text-slate-600 mb-3">{selectedDiscussion.content}</p>
                    <div className="flex items-center gap-3">
                      <Badge className={getCategoryColor(selectedDiscussion.category)}>
                        {selectedDiscussion.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3 h-3" />
                        Started by {selectedDiscussion.author_name}
                      </div>
                      <span className="text-xs text-slate-500">
                        {moment(selectedDiscussion.created_date).fromNow()}
                      </span>
                      
                      {linkedProposal && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`${createPageUrl("Pipeline")}?proposalId=${linkedProposal.id}&tab=discussions`)}
                          className="ml-auto gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          View Proposal
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Share your thoughts... (Type @ to mention someone)"
                      value={newComment}
                      onChange={handleTextareaChange}
                      onKeyUp={(e) => checkForMentions(e.target.value)}
                      onClick={(e) => checkForMentions(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    
                    {showMentionDropdown && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-2 border-blue-300 rounded-lg shadow-xl max-h-80 overflow-y-auto z-[9999]">
                        <div className="p-3">
                          {filteredTeamMembers.length === 0 ? (
                            <div className="text-center py-6 text-slate-500">
                              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No team members found</p>
                            </div>
                          ) : (
                            filteredTeamMembers.map((member) => (
                              <button
                                key={member.email}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMentionSelect(member);
                                }}
                                className="w-full text-left px-3 py-3 hover:bg-blue-100 rounded-md transition-colors flex items-center gap-3 border-b border-slate-100 last:border-0 cursor-pointer"
                              >
                                <Avatar className="w-10 h-10 flex-shrink-0">
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
                                    {member.full_name?.[0]?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">
                                    {member.full_name || 'User'}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">{member.email}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || createCommentMutation.isPending}
                    >
                      {createCommentMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-2">⏳</div>
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

                {comments.length > 0 && (
                  <ScrollArea className="h-[400px]">
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
                  </ScrollArea>
                )}
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
