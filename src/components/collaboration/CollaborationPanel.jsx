import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  CheckSquare, 
  Activity,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserPlus,
  Loader2,
  MoreVertical,
  Reply,
  Check
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CollaborationPanel({ proposalId, sectionId = null }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("comments");
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to_email: "",
    priority: "medium",
    due_date: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ['proposal-comments', proposalId, sectionId],
    queryFn: async () => {
      const filters = { proposal_id: proposalId };
      if (sectionId) filters.section_id = sectionId;
      return base44.entities.ProposalComment.filter(filters, '-created_date');
    },
    initialData: [],
    enabled: !!proposalId
  });

  // Fetch tasks
  const { data: tasks } = useQuery({
    queryKey: ['proposal-tasks', proposalId, sectionId],
    queryFn: async () => {
      const filters = { proposal_id: proposalId };
      if (sectionId) filters.section_id = sectionId;
      return base44.entities.ProposalTask.filter(filters, '-created_date');
    },
    initialData: [],
    enabled: !!proposalId
  });

  // Fetch activity log
  const { data: activities } = useQuery({
    queryKey: ['proposal-activities', proposalId],
    queryFn: () => base44.entities.ActivityLog.filter({ proposal_id: proposalId }, '-created_date', 20),
    initialData: [],
    enabled: !!proposalId
  });

  // Fetch team members
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: []
  });

  // Create notification
  const createNotification = async (toUserEmail, type, title, message, relatedEntityId, relatedEntityType) => {
    if (toUserEmail === user.email) return; // Don't notify yourself

    try {
      await base44.entities.Notification.create({
        user_email: toUserEmail,
        notification_type: type,
        title,
        message,
        related_proposal_id: proposalId,
        related_entity_id: relatedEntityId,
        related_entity_type: relatedEntityType,
        from_user_email: user.email,
        from_user_name: user.full_name || user.email
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  // Log activity
  const logActivity = async (actionType, description, relatedEntityId = null) => {
    try {
      await base44.entities.ActivityLog.create({
        proposal_id: proposalId,
        user_email: user.email,
        user_name: user.full_name || user.email,
        action_type: actionType,
        action_description: description,
        section_id: sectionId,
        related_entity_id: relatedEntityId
      });
      queryClient.invalidateQueries({ queryKey: ['proposal-activities'] });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      return base44.entities.ProposalComment.create(commentData);
    },
    onSuccess: async (newCommentData) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-comments'] });
      setNewComment("");
      setReplyingTo(null);

      // Log activity
      await logActivity(
        "comment_added",
        `Added a comment${sectionId ? ' on a section' : ''}`,
        newCommentData.id
      );

      // Create notifications for mentions
      if (newCommentData.mentions && newCommentData.mentions.length > 0) {
        for (const mentionedEmail of newCommentData.mentions) {
          await createNotification(
            mentionedEmail,
            "mention",
            "You were mentioned",
            `${user.full_name || user.email} mentioned you in a comment`,
            newCommentData.id,
            "comment"
          );
        }
      }

      // Notify parent comment author if replying
      if (replyingTo && replyingTo.author_email !== user.email) {
        await createNotification(
          replyingTo.author_email,
          "comment_reply",
          "New reply to your comment",
          `${user.full_name || user.email} replied to your comment`,
          newCommentData.id,
          "comment"
        );
      }
    }
  });

  // Update comment mutation (resolve)
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, updates }) => base44.entities.ProposalComment.update(commentId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-comments'] });
    }
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      return base44.entities.ProposalTask.create(taskData);
    },
    onSuccess: async (newTaskData) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks'] });
      setNewTask({
        title: "",
        description: "",
        assigned_to_email: "",
        priority: "medium",
        due_date: ""
      });

      // Log activity
      await logActivity(
        "task_created",
        `Created task: ${newTaskData.title}`,
        newTaskData.id
      );

      // Notify assigned user
      await createNotification(
        newTaskData.assigned_to_email,
        "task_assigned",
        "New task assigned",
        `${user.full_name || user.email} assigned you a task: ${newTaskData.title}`,
        newTaskData.id,
        "task"
      );
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }) => base44.entities.ProposalTask.update(taskId, updates),
    onSuccess: async (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['proposal-tasks'] });
      
      if (updatedTask.status === 'completed') {
        await logActivity(
          "task_updated",
          `Completed task: ${updatedTask.title}`,
          updatedTask.id
        );
      }
    }
  });

  const handleCommentSubmit = () => {
    if (!newComment.trim() || !user) return;

    // Extract mentions
    const mentions = (newComment.match(/@(\S+)/g) || [])
      .map(m => m.substring(1))
      .filter(email => teamMembers.some(tm => tm.email === email));

    const commentData = {
      proposal_id: proposalId,
      section_id: sectionId,
      parent_comment_id: replyingTo?.id,
      author_email: user.email,
      author_name: user.full_name || user.email,
      content: newComment,
      mentions,
      comment_type: "general"
    };

    createCommentMutation.mutate(commentData);
  };

  const handleTaskSubmit = () => {
    if (!newTask.title.trim() || !newTask.assigned_to_email || !user) return;

    const assignedUser = teamMembers.find(tm => tm.email === newTask.assigned_to_email);

    const taskData = {
      proposal_id: proposalId,
      section_id: sectionId,
      title: newTask.title,
      description: newTask.description,
      assigned_to_email: newTask.assigned_to_email,
      assigned_to_name: assignedUser?.full_name || newTask.assigned_to_email,
      assigned_by_email: user.email,
      assigned_by_name: user.full_name || user.email,
      priority: newTask.priority,
      due_date: newTask.due_date,
      status: "todo"
    };

    createTaskMutation.mutate(taskData);
  };

  const handleResolveComment = (comment) => {
    updateCommentMutation.mutate({
      commentId: comment.id,
      updates: {
        is_resolved: true,
        resolved_by: user.email,
        resolved_date: new Date().toISOString()
      }
    });
  };

  const handleTaskStatusChange = (task, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'completed') {
      updates.completed_date = new Date().toISOString();
    }
    updateTaskMutation.mutate({ taskId: task.id, updates });
  };

  // Group comments by parent
  const topLevelComments = comments.filter(c => !c.parent_comment_id);
  const getReplies = (commentId) => comments.filter(c => c.parent_comment_id === commentId);

  // Filter tasks by status
  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    review: tasks.filter(t => t.status === 'review'),
    completed: tasks.filter(t => t.status === 'completed')
  };

  return (
    <Card className="border-none shadow-lg h-full flex flex-col">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-lg">Collaboration</CardTitle>
      </CardHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-6 mt-3">
          <TabsTrigger value="comments" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comments
            {comments.filter(c => !c.is_resolved).length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {comments.filter(c => !c.is_resolved).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Tasks
            {tasks.filter(t => t.status !== 'completed').length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {tasks.filter(t => t.status !== 'completed').length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Activity
          </TabsTrigger>
        </TabsList>

        {/* Comments Tab */}
        <TabsContent value="comments" className="flex-1 flex flex-col p-6 pt-4 space-y-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {topLevelComments.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No comments yet</p>
                  <p className="text-xs text-slate-400">Start a conversation with your team</p>
                </div>
              ) : (
                topLevelComments.map((comment) => (
                  <div key={comment.id} className={`p-3 rounded-lg border ${comment.is_resolved ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {comment.author_name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm text-slate-900">{comment.author_name}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(comment.created_date).toLocaleString()}
                            </p>
                            {comment.is_resolved && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                          
                          {/* Replies */}
                          {getReplies(comment.id).length > 0 && (
                            <div className="mt-3 space-y-2 pl-4 border-l-2 border-slate-200">
                              {getReplies(comment.id).map((reply) => (
                                <div key={reply.id} className="flex items-start gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs font-bold">
                                      {reply.author_name?.[0]?.toUpperCase() || 'U'}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium text-xs text-slate-900">{reply.author_name}</p>
                                      <p className="text-xs text-slate-500">
                                        {new Date(reply.created_date).toLocaleString()}
                                      </p>
                                    </div>
                                    <p className="text-sm text-slate-700">{reply.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex gap-2 mt-2">
                            {!comment.is_resolved && (
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResolveComment(comment)}
                                  className="h-7 text-xs"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Resolve
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Comment Input */}
          <div className="space-y-2 border-t pt-4">
            {replyingTo && (
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                <span className="text-blue-900">Replying to {replyingTo.author_name}</span>
                <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)} className="h-6">
                  Cancel
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment... Use @email to mention someone"
                className="flex-1 min-h-[60px]"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCommentSubmit();
                  }
                }}
              />
              <Button
                onClick={handleCommentSubmit}
                disabled={!newComment.trim() || createCommentMutation.isPending}
                className="self-end"
              >
                {createCommentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Tip: Use @email to mention team members
            </p>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="flex-1 flex flex-col p-6 pt-4 space-y-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Task Creation Form */}
              <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="p-4 space-y-3">
                  <Input
                    placeholder="Task title..."
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  />
                  <Textarea
                    placeholder="Task description (optional)..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    className="min-h-[60px]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={newTask.assigned_to_email}
                      onValueChange={(value) => setNewTask({...newTask, assigned_to_email: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.email}>
                            {member.full_name || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({...newTask, priority: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleTaskSubmit}
                      disabled={!newTask.title.trim() || !newTask.assigned_to_email || createTaskMutation.isPending}
                    >
                      {createTaskMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Create Task"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Task Lists by Status */}
              {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                statusTasks.length > 0 && (
                  <div key={status}>
                    <h3 className="font-semibold text-sm text-slate-700 mb-2 capitalize flex items-center gap-2">
                      {status === 'todo' && <Clock className="w-4 h-4" />}
                      {status === 'in_progress' && <Activity className="w-4 h-4" />}
                      {status === 'review' && <AlertCircle className="w-4 h-4" />}
                      {status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                      {status.replace('_', ' ')} ({statusTasks.length})
                    </h3>
                    <div className="space-y-2">
                      {statusTasks.map((task) => (
                        <Card key={task.id} className="border-slate-200">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-medium text-sm text-slate-900">{task.title}</p>
                                {task.description && (
                                  <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {task.assigned_to_name}
                                  </Badge>
                                  <Badge className={`text-xs ${
                                    task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                    task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {task.priority}
                                  </Badge>
                                  {task.due_date && (
                                    <Badge variant="outline" className="text-xs">
                                      Due: {new Date(task.due_date).toLocaleDateString()}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleTaskStatusChange(task, 'todo')}>
                                    Mark as To Do
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleTaskStatusChange(task, 'in_progress')}>
                                    Mark as In Progress
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleTaskStatusChange(task, 'review')}>
                                    Mark as In Review
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleTaskStatusChange(task, 'completed')}>
                                    Mark as Completed
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )
              ))}

              {tasks.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <CheckSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No tasks yet</p>
                  <p className="text-xs text-slate-400">Create tasks to track work on this proposal</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="flex-1 p-6 pt-4">
          <ScrollArea className="h-full pr-4">
            <div className="space-y-3">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">
                        {activity.user_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{activity.user_name}</span> {activity.action_description}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(activity.created_date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </Card>
  );
}