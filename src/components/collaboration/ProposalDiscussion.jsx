
import React, { useState, useRef, useEffect, useMemo } from "react";
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
  Loader2,
  AtSign
} from "lucide-react";
import moment from "moment";

export default function ProposalDiscussion({ proposal, user, organization }) {
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
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const textareaRef = useRef(null);

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

  // FIXED: Simpler approach - always include current user + fetch others
  const { data: fetchedTeamMembers = [] } = useQuery({
    queryKey: ['team-members-for-mentions', organization.id],
    queryFn: async () => {
      console.log('[Mentions] 🔍 Starting user fetch...');
      console.log('[Mentions] Current user:', user.email);
      console.log('[Mentions] Current org:', organization.id);
      
      try {
        const allUsers = await base44.entities.User.list();
        console.log('[Mentions] ✅ User.list() returned:', allUsers.length, 'users');
        
        if (allUsers.length === 0) {
          console.error('[Mentions] ❌ CRITICAL: User.list() returned 0 users!');
          return [];
        }
        
        // Log all users
        allUsers.forEach((u, idx) => {
          console.log(`[Mentions] User ${idx + 1}:`, {
            name: u.full_name,
            email: u.email,
            accesses: u.client_accesses
          });
        });
        
        // Filter by organization
        const orgUsers = allUsers.filter(u => {
          const accesses = u.client_accesses || [];
          const hasAccess = accesses.some(a => a.organization_id === organization.id);
          return hasAccess;
        });
        
        console.log('[Mentions] ✅ Filtered to org users:', orgUsers.length);
        
        // If no org users, return all (better than nothing)
        return orgUsers.length > 0 ? orgUsers : allUsers;
      } catch (error) {
        console.error('[Mentions] ❌ Error in query:', error);
        return [];
      }
    },
    staleTime: 300000,
  });

  // CRITICAL FIX: Always include current user as fallback
  const teamMembers = useMemo(() => {
    console.log('[Mentions] 🔧 Building final team members list...');
    console.log('[Mentions] Fetched members:', fetchedTeamMembers.length);
    console.log('[Mentions] Current user:', user.email);
    
    // Always include current user
    const members = [...fetchedTeamMembers];
    
    // Check if current user is already in the list
    const currentUserExists = members.some(m => m.email === user.email);
    
    if (!currentUserExists) {
      console.log('[Mentions] ➕ Adding current user to list');
      members.push({
        email: user.email,
        full_name: user.full_name,
        id: user.id
      });
    } else {
      console.log('[Mentions] ✓ Current user already in list');
    }
    
    console.log('[Mentions] 📋 Final team members:', members.length);
    members.forEach(m => console.log('[Mentions]   -', m.full_name, '(', m.email, ')'));
    
    // Ensure uniqueness, e.g., if current user was added because they weren't in fetchedTeamMembers,
    // but another fetch later might include them, or if the initial fetch already had them
    const uniqueMembers = Array.from(new Map(members.map(item => [item.email, item])).values());
    
    return uniqueMembers;
  }, [fetchedTeamMembers, user]);

  const checkForMentions = (text) => {
    if (!textareaRef.current) {
      console.log('[Mentions] ❌ No textarea ref');
      return;
    }
    
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    
    console.log('[Mentions] 🔍 Check - Text:', text);
    console.log('[Mentions] 📍 Cursor:', cursorPos);
    
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    console.log('[Mentions] 🎯 Last @ at:', lastAtIndex);
    
    if (lastAtIndex === -1) {
      setShowMentionDropdown(false);
      setMentionFilter("");
      return;
    }
    
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    console.log('[Mentions] 📄 Text after @:', textAfterAt);
    
    if (textAfterAt.includes(' ')) {
      console.log('[Mentions] ❌ Space found');
      setShowMentionDropdown(false);
      setMentionFilter("");
      return;
    }
    
    console.log('[Mentions] ✅ SHOWING DROPDOWN!');
    console.log('[Mentions] 🔎 Filter:', textAfterAt);
    console.log('[Mentions] 👥 Total members:', teamMembers.length);
    
    setMentionFilter(textAfterAt);
    setShowMentionDropdown(true);
  };

  const handleTextareaChange = (e) => {
    setNewComment(e.target.value);
    checkForMentions(e.target.value);
  };

  const handleMentionSelect = (member) => {
    console.log('[Mentions] 🎯 Member clicked:', member.email);
    
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
    // If no filter, show all members
    if (!mentionFilter) {
      console.log('[Mentions] 📋 No filter, showing all:', teamMembers.length);
      return teamMembers;
    }
    
    const filtered = teamMembers.filter(member => 
      member.email.toLowerCase().includes(mentionFilter.toLowerCase()) ||
      (member.full_name && member.full_name.toLowerCase().includes(mentionFilter.toLowerCase()))
    );
    console.log('[Mentions] 🔍 Filtered:', filtered.length, 'from', teamMembers.length);
    return filtered;
  }, [teamMembers, mentionFilter]);

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
          // Create in-app notification
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
            action_url: `/app/Pipeline?proposalId=${proposal.id}` // Updated line
          });

          // NEW: Send email notification
          try {
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
                      <a href="${window.location.origin}/app/Pipeline?proposalId=${proposal.id}" 
                         style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        View Discussion →
                      </a>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        Proposal: ${proposal.proposal_name}
                      </p>
                    </div>
                  </div>
                </div>
              `
            });
            console.log('[Mentions] ✅ Email sent to:', mentionedEmail);
          } catch (emailError) {
            console.error('[Mentions] ❌ Failed to send email to:', mentionedEmail, emailError);
            // Don't fail the whole operation if email fails
          }
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
            <ScrollArea className="h-[500px]">
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
                <div className="text-center py-8 text-slate-500 px-4">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No discussions yet</p>
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
              {comments.length > 0 && (
                <ScrollArea className="h-[300px] mb-4">
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

              <div className="space-y-3">
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
                  
                  {/* Enhanced debug indicator */}
                  {showMentionDropdown && (
                    <div className="absolute -top-10 left-0 text-xs bg-green-500 text-white px-3 py-1 rounded shadow-lg z-[10000]">
                      ✓ Dropdown active! Total: {teamMembers.length} | Filtered: {filteredTeamMembers.length}
                    </div>
                  )}
                  
                  {/* IMPROVED: Always show dropdown if @ is typed, even with 0 results */}
                  {showMentionDropdown && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border-4 border-green-500 rounded-lg shadow-2xl max-h-80 overflow-y-auto z-[9999]">
                      <div className="p-3">
                        <div className="text-sm text-green-700 font-bold px-2 py-2 flex items-center gap-2 bg-green-50 rounded mb-2">
                          <AtSign className="w-4 h-4" />
                          🎉 Mention Dropdown (Filter: "{mentionFilter || '(empty)'}") 
                        </div>
                        
                        {filteredTeamMembers.length === 0 ? (
                          <div className="text-center py-6 text-slate-500">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No team members found</p>
                            <p className="text-xs mt-1">Total members available: {teamMembers.length}</p>
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
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2 text-xs text-blue-900">
                    <AtSign className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold mb-1">💡 Mention team members</p>
                      <p className="text-blue-700">
                        Type <strong>@</strong> to see a list of team members - they'll be notified!
                        <br />
                        <span className="text-xs opacity-75">
                          (Available: {teamMembers.length} members)
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
                
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
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-lg h-full flex items-center justify-center min-h-[400px]">
            <CardContent className="text-center py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <h3 className="text-base font-semibold text-slate-900 mb-1">Select a Discussion</h3>
              <p className="text-sm text-slate-600">
                Choose from the list or create a new one
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
