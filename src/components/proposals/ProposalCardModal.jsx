
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
  ExternalLink,
  MessageSquare, // New import
  Paperclip,     // New import
  Target,        // New import
  TrendingUp,    // New import
  User,          // New import
  Loader2        // New import
} from "lucide-react";
import { createPageUrl } from "@/utils";
import moment from "moment";
import { cn } from "@/lib/utils";

// Status configuration for badges and icons
const statusConfig = {
  evaluating: { label: "Evaluating", color: "bg-blue-100 text-blue-700", icon: Target },
  watch_list: { label: "Watch List", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", icon: MessageSquare },
  in_progress: { label: "In Progress", color: "bg-purple-100 text-purple-700", icon: TrendingUp },
  submitted: { label: "Submitted", color: "bg-indigo-100 text-indigo-700", icon: CheckSquare },
  won: { label: "Won", color: "bg-green-100 text-green-700", icon: CheckSquare },
  lost: { label: "Lost", color: "bg-red-100 text-red-700", icon: AlertCircle },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-500", icon: Paperclip }
};

// Priority configuration for badges
const priorityConfig = {
  low: { label: "Low", color: "bg-blue-100 text-blue-700" },
  medium: { label: "Medium", color: "bg-yellow-100 text-yellow-700" },
  high: { label: "High", color: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700" }
};


export default function ProposalCardModal({ proposal, isOpen, onClose, organization, kanbanConfig }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['proposal-tasks', proposal?.id],
    queryFn: () => base44.entities.ProposalTask.filter(
      { proposal_id: proposal.id }
    ),
    enabled: !!proposal?.id && isOpen,
    initialData: []
  });

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

  // Fetch files
  const { data: files = [] } = useQuery({
    queryKey: ['solicitation-documents', proposal?.id],
    queryFn: () => base44.entities.SolicitationDocument.filter(
      { proposal_id: proposal.id }
    ),
    enabled: !!proposal?.id && isOpen,
    initialData: []
  });

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  const totalTasksAndSubtasks = tasks.length + subtasks.length;
  const totalCompletedTasksAndSubtasks = completedTasks + completedSubtasks;
  const completionPercentage = totalTasksAndSubtasks > 0 ? Math.round((totalCompletedTasksAndSubtasks / totalTasksAndSubtasks) * 100) : 0;

  const handleOpenProposal = () => {
    const phase = proposal.current_phase || 'phase1';
    const url = createPageUrl("ProposalBuilder") + `?id=${proposal.id}&phase=${phase}`;
    navigate(url);
  };

  if (!proposal) return null;

  const StatusIcon = statusConfig[proposal.status]?.icon || Target;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-2">
                {proposal.proposal_name}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn(statusConfig[proposal.status]?.color)}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig[proposal.status]?.label}
                </Badge>
                {proposal.project_type && (
                  <Badge variant="outline" className="capitalize">{proposal.project_type.replace('_', ' ')}</Badge>
                )}
                {proposal.solicitation_number && (
                  <Badge variant="secondary" className="text-xs">
                    {proposal.solicitation_number}
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={handleOpenProposal} className="flex-shrink-0">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Full
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 text-slate-600 mb-1">
              <CheckSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Progress</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{completionPercentage}%</div>
            <div className="text-xs text-slate-500 mt-1">
              {totalCompletedTasksAndSubtasks} of {totalTasksAndSubtasks} tasks
            </div>
          </div>

          {proposal.contract_value && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Value</span>
              </div>
              <div className="text-2xl font-bold text-slate-900">
                ${(proposal.contract_value / 1000000).toFixed(1)}M
              </div>
            </div>
          )}

          {proposal.due_date && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Due Date</span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {moment(proposal.due_date).format('MMM D, YYYY')}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {moment(proposal.due_date).fromNow()}
              </div>
            </div>
          )}

          {proposal.agency_name && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Agency</span>
              </div>
              <div className="text-sm font-bold text-slate-900 truncate">
                {proposal.agency_name}
              </div>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">
              Tasks ({totalTasksAndSubtasks})
            </TabsTrigger>
            <TabsTrigger value="comments">
              Comments ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="files">
              Files ({files.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pt-4">
            {proposal.project_title && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Project Title</h3>
                <p className="text-sm text-slate-600">{proposal.project_title}</p>
              </div>
            )}

            {proposal.prime_contractor_name && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Prime Contractor</h3>
                <p className="text-sm text-slate-600">{proposal.prime_contractor_name}</p>
              </div>
            )}

            {proposal.current_phase && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Current Phase</h3>
                <Badge variant="secondary" className="capitalize">{proposal.current_phase.replace('phase', 'Phase ')}</Badge>
              </div>
            )}

            {(proposal.is_blocked || proposal.blocker_reason) && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-900">Blocked</h3>
                    {proposal.blocker_reason && (
                      <p className="text-sm text-red-700 mt-1">{proposal.blocker_reason}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tasks" className="space-y-3 pt-4">
            {totalTasksAndSubtasks === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No tasks yet</p>
              </div>
            ) : (
              <>
                {tasks.map(task => (
                  <div key={task.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={cn(
                            "text-xs capitalize",
                            task.status === 'completed' ? 'bg-green-100 text-green-700' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          )}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          {task.priority && priorityConfig[task.priority] && (
                            <Badge className={cn("text-xs capitalize", priorityConfig[task.priority]?.color)}>
                              {priorityConfig[task.priority]?.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {task.assigned_to_name && (
                        <div className="text-xs text-slate-600">{task.assigned_to_name}</div>
                      )}
                    </div>
                  </div>
                ))}
                {subtasks.map(subtask => (
                  <div key={subtask.id} className="p-3 bg-slate-50 rounded-lg ml-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 text-sm">{subtask.title}</h4>
                        {subtask.description && (
                          <p className="text-xs text-slate-600 mt-1">{subtask.description}</p>
                        )}
                        <Badge className={cn(
                          "text-xs mt-2 capitalize",
                          subtask.status === 'completed' ? 'bg-green-100 text-green-700' :
                          subtask.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        )}>
                          {subtask.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-3 pt-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No comments yet</p>
              </div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-medium text-slate-900 text-sm">{comment.author_name}</span>
                    <span className="text-xs text-slate-500">
                      {moment(comment.created_date).fromNow()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                  {comment.comment_type && comment.comment_type !== 'general' && (
                    <Badge variant="outline" className="text-xs mt-2 capitalize">
                      {comment.comment_type.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="files" className="space-y-3 pt-4">
            {files.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Paperclip className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No files uploaded yet</p>
              </div>
            ) : (
              files.map(file => (
                <div key={file.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Paperclip className="w-4 h-4 text-slate-400" />
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 text-sm">{file.file_name}</h4>
                        <p className="text-xs text-slate-500">
                          {file.document_type} • {(file.file_size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.file_url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
