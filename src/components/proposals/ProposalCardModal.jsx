import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  DollarSign,
  FileText,
  CheckSquare,
  MessageCircle,
  Activity,
  Users,
  Tag,
  AlertCircle,
  Link2,
  Clock,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  ExternalLink
} from "lucide-react";
import { createPageUrl } from "@/utils";
import moment from "moment";
import { cn } from "@/lib/utils";

export default function ProposalCardModal({ proposal, isOpen, onClose, organization }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProposal, setEditedProposal] = useState(proposal);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setEditedProposal(proposal);
  }, [proposal]);

  // Fetch subtasks
  const { data: subtasks = [] } = useQuery({
    queryKey: ['proposal-subtasks', proposal?.id],
    queryFn: () => base44.entities.ProposalSubtask.filter(
      { proposal_id: proposal.id },
      'order'
    ),
    enabled: !!proposal?.id && isOpen,
    initialData: []
  });

  // Fetch dependencies
  const { data: dependencies = [] } = useQuery({
    queryKey: ['proposal-dependencies', proposal?.id],
    queryFn: () => base44.entities.ProposalDependency.filter(
      { proposal_id: proposal.id }
    ),
    enabled: !!proposal?.id && isOpen,
    initialData: []
  });

  // Fetch comments
  const { data: comments = [] } = useQuery({
    queryKey: ['proposal-comments', proposal?.id],
    queryFn: () => base44.entities.ProposalComment.filter(
      { proposal_id: proposal.id },
      '-created_date'
    ),
    enabled: !!proposal?.id && isOpen,
    initialData: []
  });

  // Fetch activity log
  const { data: activities = [] } = useQuery({
    queryKey: ['proposal-activities', proposal?.id],
    queryFn: () => base44.entities.ActivityLog.filter(
      { proposal_id: proposal.id },
      '-created_date',
      20
    ),
    enabled: !!proposal?.id && isOpen,
    initialData: []
  });

  const updateProposalMutation = useMutation({
    mutationFn: (updates) => base44.entities.Proposal.update(proposal.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setIsEditing(false);
    }
  });

  const handleSave = () => {
    updateProposalMutation.mutate(editedProposal);
  };

  const handleCancel = () => {
    setEditedProposal(proposal);
    setIsEditing(false);
  };

  const handleOpenProposal = () => {
    window.open(createPageUrl("ProposalBuilder") + `?id=${proposal.id}`, '_blank');
  };

  if (!proposal) return null;

  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const daysUntilDue = proposal.due_date ? moment(proposal.due_date).diff(moment(), 'days') : null;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  value={editedProposal.proposal_name}
                  onChange={(e) => setEditedProposal({...editedProposal, proposal_name: e.target.value})}
                  className="text-xl font-bold"
                />
              ) : (
                <DialogTitle className="text-2xl">{proposal.proposal_name}</DialogTitle>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="capitalize">
                  {proposal.status?.replace('_', ' ')}
                </Badge>
                {proposal.project_type && (
                  <Badge variant="secondary">{proposal.project_type}</Badge>
                )}
                {proposal.is_blocked && (
                  <Badge className="bg-red-100 text-red-700">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Blocked
                  </Badge>
                )}
                {isOverdue && (
                  <Badge className="bg-red-100 text-red-700">Overdue</Badge>
                )}
                {isDueSoon && (
                  <Badge className="bg-amber-100 text-amber-700">Due Soon</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={updateProposalMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button size="sm" onClick={handleOpenProposal}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Full
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Subtasks
                {totalSubtasks > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {completedSubtasks}/{totalSubtasks}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Comments
                {comments.length > 0 && (
                  <Badge variant="secondary" className="ml-1">{comments.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity" className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="overview" className="space-y-6 mt-0">
                <OverviewTab 
                  proposal={isEditing ? editedProposal : proposal}
                  isEditing={isEditing}
                  onUpdate={setEditedProposal}
                  subtaskProgress={subtaskProgress}
                  dependencies={dependencies}
                  organization={organization}
                />
              </TabsContent>

              <TabsContent value="tasks" className="mt-0">
                <SubtasksTab 
                  proposal={proposal}
                  subtasks={subtasks}
                  organization={organization}
                />
              </TabsContent>

              <TabsContent value="comments" className="mt-0">
                <CommentsTab 
                  proposal={proposal}
                  comments={comments}
                  organization={organization}
                />
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <ActivityTab activities={activities} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Overview Tab Component
function OverviewTab({ proposal, isEditing, onUpdate, subtaskProgress, dependencies, organization }) {
  return (
    <div className="space-y-6 px-1">
      {/* Progress Section */}
      {subtaskProgress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-slate-600">{Math.round(subtaskProgress)}%</span>
          </div>
          <Progress value={subtaskProgress} className="h-2" />
        </div>
      )}

      {/* Key Details Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-600">Due Date</div>
              {isEditing ? (
                <Input
                  type="date"
                  value={proposal.due_date || ''}
                  onChange={(e) => onUpdate({...proposal, due_date: e.target.value})}
                  className="mt-1"
                />
              ) : (
                <div className="text-sm mt-1">
                  {proposal.due_date ? moment(proposal.due_date).format('MMM D, YYYY') : 'Not set'}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-slate-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-600">Contract Value</div>
              {isEditing ? (
                <Input
                  type="number"
                  value={proposal.contract_value || ''}
                  onChange={(e) => onUpdate({...proposal, contract_value: parseFloat(e.target.value)})}
                  className="mt-1"
                  placeholder="Enter value"
                />
              ) : (
                <div className="text-sm mt-1">
                  {proposal.contract_value 
                    ? `$${proposal.contract_value.toLocaleString()}` 
                    : 'Not set'}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-slate-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-600">Agency</div>
              {isEditing ? (
                <Input
                  value={proposal.agency_name || ''}
                  onChange={(e) => onUpdate({...proposal, agency_name: e.target.value})}
                  className="mt-1"
                  placeholder="Agency name"
                />
              ) : (
                <div className="text-sm mt-1">{proposal.agency_name || 'Not set'}</div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-slate-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-600">Lead Writer</div>
              {isEditing ? (
                <Input
                  value={proposal.lead_writer_email || ''}
                  onChange={(e) => onUpdate({...proposal, lead_writer_email: e.target.value})}
                  className="mt-1"
                  placeholder="Email address"
                />
              ) : (
                <div className="text-sm mt-1">{proposal.lead_writer_email || 'Not assigned'}</div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Tag className="w-5 h-5 text-slate-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-600">Solicitation #</div>
              {isEditing ? (
                <Input
                  value={proposal.solicitation_number || ''}
                  onChange={(e) => onUpdate({...proposal, solicitation_number: e.target.value})}
                  className="mt-1"
                  placeholder="Solicitation number"
                />
              ) : (
                <div className="text-sm mt-1">{proposal.solicitation_number || 'Not set'}</div>
              )}
            </div>
          </div>

          {dependencies.length > 0 && (
            <div className="flex items-start gap-3">
              <Link2 className="w-5 h-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-600">Dependencies</div>
                <div className="text-sm mt-1">
                  <Badge variant="outline">{dependencies.length} active</Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Blocker Alert */}
      {proposal.is_blocked && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-900">Proposal is Blocked</div>
              <div className="text-sm text-red-800 mt-1">{proposal.blocker_reason}</div>
              {proposal.blocked_date && (
                <div className="text-xs text-red-600 mt-1">
                  Since {moment(proposal.blocked_date).format('MMM D, YYYY')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Project Title/Description */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-slate-600">Project Title</div>
        {isEditing ? (
          <Textarea
            value={proposal.project_title || ''}
            onChange={(e) => onUpdate({...proposal, project_title: e.target.value})}
            rows={2}
            placeholder="Enter project title"
          />
        ) : (
          <div className="text-sm text-slate-900">
            {proposal.project_title || 'No project title set'}
          </div>
        )}
      </div>

      {/* Custom Fields */}
      {proposal.custom_fields && Object.keys(proposal.custom_fields).length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-slate-700">Custom Fields</div>
          <div className="grid md:grid-cols-2 gap-3">
            {Object.entries(proposal.custom_fields).map(([key, value]) => (
              <div key={key} className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs font-medium text-slate-600">{key}</div>
                <div className="text-sm text-slate-900 mt-1">{value || 'Not set'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Subtasks Tab Component
function SubtasksTab({ proposal, subtasks, organization }) {
  const queryClient = useQueryClient();
  const [newSubtask, setNewSubtask] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const createSubtaskMutation = useMutation({
    mutationFn: (data) => base44.entities.ProposalSubtask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-subtasks'] });
      setNewSubtask("");
      setShowAddForm(false);
    }
  });

  const updateSubtaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProposalSubtask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const deleteSubtaskMutation = useMutation({
    mutationFn: (id) => base44.entities.ProposalSubtask.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-subtasks'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    
    createSubtaskMutation.mutate({
      proposal_id: proposal.id,
      organization_id: organization.id,
      title: newSubtask,
      status: 'not_started',
      order: subtasks.length
    });
  };

  const handleToggleSubtask = (subtask) => {
    const newStatus = subtask.status === 'completed' ? 'not_started' : 'completed';
    updateSubtaskMutation.mutate({
      id: subtask.id,
      data: {
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString() : null
      }
    });
  };

  return (
    <div className="space-y-4 px-1">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">
          Subtasks ({subtasks.filter(s => s.status === 'completed').length}/{subtasks.length})
        </div>
        {!showAddForm && (
          <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Subtask
          </Button>
        )}
      </div>

      {showAddForm && (
        <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
          <Input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            placeholder="Enter subtask title..."
            onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
            autoFocus
          />
          <Button size="sm" onClick={handleAddSubtask} disabled={createSubtaskMutation.isPending}>
            Add
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setShowAddForm(false); setNewSubtask(""); }}>
            Cancel
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {subtasks.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No subtasks yet. Add one to get started!
          </div>
        ) : (
          subtasks.map((subtask) => (
            <div 
              key={subtask.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border hover:border-blue-300 transition-all group",
                subtask.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
              )}
            >
              <button
                onClick={() => handleToggleSubtask(subtask)}
                className={cn(
                  "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  subtask.status === 'completed' 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-slate-300 hover:border-green-500'
                )}
              >
                {subtask.status === 'completed' && (
                  <CheckSquare className="w-4 h-4 text-white" />
                )}
              </button>
              
              <div className="flex-1">
                <div className={cn(
                  "text-sm",
                  subtask.status === 'completed' && 'line-through text-slate-500'
                )}>
                  {subtask.title}
                </div>
                {subtask.due_date && (
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {moment(subtask.due_date).format('MMM D')}
                  </div>
                )}
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteSubtaskMutation.mutate(subtask.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Comments Tab Component
function CommentsTab({ proposal, comments, organization }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const createCommentMutation = useMutation({
    mutationFn: (data) => base44.entities.ProposalComment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-comments'] });
      setNewComment("");
    }
  });

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;
    
    createCommentMutation.mutate({
      proposal_id: proposal.id,
      author_email: user.email,
      author_name: user.full_name,
      content: newComment,
      comment_type: 'general'
    });
  };

  return (
    <div className="space-y-4 px-1">
      <div className="space-y-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
        />
        <div className="flex justify-end">
          <Button 
            size="sm" 
            onClick={handleAddComment}
            disabled={!newComment.trim() || createCommentMutation.isPending}
          >
            Post Comment
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No comments yet. Start the conversation!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-sm">{comment.author_name}</div>
                  <div className="text-xs text-slate-500">
                    {moment(comment.created_date).fromNow()}
                  </div>
                </div>
                {comment.comment_type !== 'general' && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {comment.comment_type}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">
                {comment.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Activity Tab Component
function ActivityTab({ activities }) {
  return (
    <div className="space-y-3 px-1">
      {activities.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          No activity yet
        </div>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="flex gap-3 p-3 hover:bg-slate-50 rounded-lg">
            <Activity className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-slate-900">{activity.action_description}</div>
              <div className="text-xs text-slate-500 mt-1">
                {activity.user_name} • {moment(activity.created_date).fromNow()}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}