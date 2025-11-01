import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Calendar,
  DollarSign,
  Users,
  MoreVertical,
  Trash2,
  AlertCircle,
  Clock,
  CheckSquare,
  Sparkles,
  Edit3,
  Save,
  X,
  Copy,
  Archive,
  Tag,
  Link2,
  AlertTriangle,
  Flame
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import moment from "moment";
import ProposalCardModal from "./ProposalCardModal";

export default function KanbanCard({ proposal, index, onDelete, organization }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(proposal.proposal_name);

  const { data: subtasks = [] } = useQuery({
    queryKey: ['proposal-subtasks', proposal.id],
    queryFn: () => base44.entities.ProposalSubtask.filter(
      { proposal_id: proposal.id },
      'order'
    ),
    initialData: []
  });

  const { data: dependencies = [] } = useQuery({
    queryKey: ['proposal-dependencies', proposal.id],
    queryFn: () => base44.entities.ProposalDependency.filter(
      { proposal_id: proposal.id }
    ),
    initialData: []
  });

  const updateProposalMutation = useMutation({
    mutationFn: ({ proposalId, updates }) => base44.entities.Proposal.update(proposalId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const duplicateProposalMutation = useMutation({
    mutationFn: async () => {
      const newProposal = {
        ...proposal,
        proposal_name: `${proposal.proposal_name} (Copy)`,
        status: 'draft',
        created_date: new Date().toISOString()
      };
      delete newProposal.id;
      delete newProposal.updated_date;
      return base44.entities.Proposal.create(newProposal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const archiveProposalMutation = useMutation({
    mutationFn: () => base44.entities.Proposal.update(proposal.id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const toggleSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, status }) => {
      return base44.entities.ProposalSubtask.update(subtaskId, {
        status,
        completed_date: status === 'completed' ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-subtasks'] });
    }
  });

  const daysUntilDue = proposal.due_date 
    ? moment(proposal.due_date).diff(moment(), 'days')
    : null;

  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;

  const completedSubtasks = subtasks.filter(s => s.status === 'completed').length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const activeDependencies = dependencies.filter(d => d.status === 'active').length;

  const getTimeInStage = () => {
    const stageDate = proposal.stage_entered_date || proposal.updated_date || proposal.created_date;
    const daysSince = moment().diff(moment(stageDate), 'days');
    if (daysSince === 0) return { text: 'Today', days: 0 };
    if (daysSince === 1) return { text: '1 day', days: 1 };
    if (daysSince < 7) return { text: `${daysSince} days`, days: daysSince };
    if (daysSince < 30) return { text: `${Math.floor(daysSince / 7)} weeks`, days: daysSince };
    return { text: `${Math.floor(daysSince / 30)} months`, days: daysSince };
  };

  const timeInStage = getTimeInStage();
  const isStale = timeInStage.days > 14;
  const isAging = timeInStage.days > 7 && timeInStage.days <= 14;

  const getPriorityInfo = () => {
    if (proposal.priority_level) {
      return {
        level: proposal.priority_level,
        label: proposal.priority_level.charAt(0).toUpperCase() + proposal.priority_level.slice(1),
        color: proposal.priority_level === 'urgent' ? 'bg-red-100 text-red-700' :
               proposal.priority_level === 'high' ? 'bg-orange-100 text-orange-700' :
               proposal.priority_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
               'bg-slate-100 text-slate-600'
      };
    }
    
    if (proposal.contract_value) {
      if (proposal.contract_value >= 1000000) {
        return { level: 'high', label: 'High Value', color: 'bg-green-100 text-green-700' };
      } else if (proposal.contract_value >= 100000) {
        return { level: 'medium', label: 'Medium Value', color: 'bg-blue-100 text-blue-700' };
      }
    }
    
    return null;
  };

  const priorityInfo = getPriorityInfo();

  const handleSaveTitle = () => {
    if (editedTitle.trim() && editedTitle !== proposal.proposal_name) {
      updateProposalMutation.mutate({
        proposalId: proposal.id,
        updates: { proposal_name: editedTitle }
      });
    }
    setIsEditingTitle(false);
  };

  const handleCancelEdit = () => {
    setEditedTitle(proposal.proposal_name);
    setIsEditingTitle(false);
  };

  const handleDuplicate = () => {
    if (confirm(`Duplicate "${proposal.proposal_name}"?`)) {
      duplicateProposalMutation.mutate();
    }
  };

  const handleArchive = () => {
    if (confirm(`Archive "${proposal.proposal_name}"?`)) {
      archiveProposalMutation.mutate();
    }
  };

  const handleToggleSubtask = (subtask) => {
    const newStatus = subtask.status === 'completed' ? 'not_started' : 'completed';
    toggleSubtaskMutation.mutate({ subtaskId: subtask.id, status: newStatus });
  };

  return (
    <>
      <Draggable draggableId={proposal.id} index={index}>
        {(provided, snapshot) => (
          <ContextMenu>
            <ContextMenuTrigger>
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <Card
                  className={cn(
                    "mb-3 cursor-pointer hover:shadow-lg transition-all group",
                    snapshot.isDragging && "shadow-2xl rotate-2 opacity-80",
                    isOverdue && "border-l-4 border-l-red-600 bg-red-50",
                    isDueSoon && !isOverdue && "border-l-4 border-l-amber-500 bg-amber-50",
                    isStale && !isOverdue && !isDueSoon && "border-l-4 border-l-slate-400",
                    proposal.is_blocked && "border-2 border-red-400 bg-red-50"
                  )}
                  onClick={() => !isEditingTitle && setShowModal(true)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      {isEditingTitle ? (
                        <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveTitle();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveTitle}>
                            <Save className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                            <X className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <h4 className="font-semibold text-sm line-clamp-2 flex-1">{proposal.proposal_name}</h4>
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit Title
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(); }}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => { e.stopPropagation(); onDelete(proposal); }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {proposal.is_sample_data && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700">
                          <Sparkles className="w-3 h-3 mr-1" />
                          SAMPLE
                        </Badge>
                      )}
                      {proposal.is_blocked && (
                        <Badge className="text-[10px] bg-red-100 text-red-700">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Blocked
                        </Badge>
                      )}
                      {priorityInfo && (
                        <Badge className={cn("text-[10px]", priorityInfo.color)}>
                          {priorityInfo.level === 'urgent' && <Flame className="w-3 h-3 mr-1" />}
                          {priorityInfo.label}
                        </Badge>
                      )}
                      {isStale && !isOverdue && !isDueSoon && (
                        <Badge className="text-[10px] bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3 mr-1" />
                          Stale
                        </Badge>
                      )}
                      {isAging && !isOverdue && !isDueSoon && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Aging
                        </Badge>
                      )}
                      {activeDependencies > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          <Link2 className="w-3 h-3 mr-1" />
                          {activeDependencies} deps
                        </Badge>
                      )}
                      {proposal.labels?.map((label, idx) => (
                        <Badge key={idx} className={cn("text-[10px]", label.color || "bg-blue-100 text-blue-700")}>
                          <Tag className="w-3 h-3 mr-1" />
                          {label.name}
                        </Badge>
                      ))}
                    </div>

                    {proposal.agency_name && (
                      <p className="text-xs text-slate-600 truncate">{proposal.agency_name}</p>
                    )}

                    {totalSubtasks > 0 && (
                      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" />
                            {completedSubtasks}/{totalSubtasks} subtasks
                          </span>
                          <span className="font-semibold text-slate-900">{Math.round(subtaskProgress)}%</span>
                        </div>
                        <Progress value={subtaskProgress} className="h-1.5" />
                        
                        {subtasks.slice(0, 2).map(subtask => (
                          <button
                            key={subtask.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSubtask(subtask);
                            }}
                            className="w-full flex items-center gap-2 text-xs hover:bg-slate-50 rounded p-1 transition-colors"
                          >
                            <div className={cn(
                              "w-3 h-3 rounded border-2 flex-shrink-0 flex items-center justify-center",
                              subtask.status === 'completed' 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-slate-300'
                            )}>
                              {subtask.status === 'completed' && (
                                <CheckSquare className="w-2 h-2 text-white" />
                              )}
                            </div>
                            <span className={cn(
                              "truncate flex-1 text-left",
                              subtask.status === 'completed' && "line-through text-slate-500"
                            )}>
                              {subtask.title}
                            </span>
                          </button>
                        ))}
                        {totalSubtasks > 2 && (
                          <div className="text-xs text-slate-500 pl-5">+{totalSubtasks - 2} more</div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                      <div className="flex items-center gap-3">
                        {proposal.due_date && (
                          <div className={cn(
                            "flex items-center gap-1",
                            isOverdue && "text-red-700 font-semibold",
                            isDueSoon && !isOverdue && "text-amber-700 font-semibold"
                          )}>
                            <Calendar className="w-3 h-3" />
                            {moment(proposal.due_date).format('MMM D')}
                          </div>
                        )}
                        {proposal.contract_value && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${(proposal.contract_value / 1000000).toFixed(1)}M
                          </div>
                        )}
                        {proposal.assigned_team_members?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {proposal.assigned_team_members.length}
                          </div>
                        )}
                      </div>
                      <div className={cn(
                        "flex items-center gap-1",
                        isStale && "text-slate-500 font-semibold",
                        isAging && "text-amber-600"
                      )}>
                        <Clock className="w-3 h-3" />
                        {timeInStage.text}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ContextMenuTrigger>
            
            <ContextMenuContent>
              <ContextMenuItem onClick={() => setShowModal(true)}>
                Open
              </ContextMenuItem>
              <ContextMenuItem onClick={() => setIsEditingTitle(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Title
              </ContextMenuItem>
              <ContextMenuItem onClick={handleDuplicate}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleArchive}>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onDelete(proposal)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )}
      </Draggable>

      {showModal && (
        <ProposalCardModal
          proposal={proposal}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          organization={organization}
        />
      )}
    </>
  );
}