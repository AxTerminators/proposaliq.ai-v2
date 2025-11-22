import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SectionReviewModal from "../builder/SectionReviewModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Clock,
  Target,
  Check,
  Building2,
  MoreVertical,
  Copy,
  Archive,
  Trash2,
  Edit,
  Flag,
  Lock,
  Unlock,
  Eye
} from "lucide-react";
import moment from "moment";
import { toast } from "sonner";

export default function KanbanCard({ 
  proposal, 
  provided, 
  snapshot, 
  onClick, 
  organization,
  isSelected = false,
  onToggleSelection,
  selectionMode = false,
  onDuplicate,
  onArchive,
  onDelete
}) {
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(proposal.proposal_name);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentReviewSectionIndex, setCurrentReviewSectionIndex] = useState(0);

  // Fetch current user using React Query
  const { data: currentUser } = useQuery({
    queryKey: ['current-user-for-review'],
    queryFn: async () => {
      return base44.auth.me();
    },
    staleTime: 300000,
    retry: 1
  });

  // Fetch subtasks for this proposal
  const { data: subtasks = [] } = useQuery({
    queryKey: ['proposal-subtasks', proposal.id],
    queryFn: async () => {
      return base44.entities.ProposalSubtask.filter({
        proposal_id: proposal.id
      });
    },
    staleTime: 30000
  });

  // Fetch sections for review status
  const { data: sections = [] } = useQuery({
    queryKey: ['proposal-sections', proposal.id],
    queryFn: async () => {
      return base44.entities.ProposalSection.filter({
        proposal_id: proposal.id
      });
    },
    staleTime: 30000
  });

  // Get sections pending review
  const pendingReviewSections = useMemo(() => {
    return sections.filter(s => s.status === 'pending_review');
  }, [sections]);

  // Shared clients display - simplified to avoid entity query issues
  const sharedClients = [];

  // Calculate completion
  const completedSubtasks = subtasks.filter(t => t.status === 'completed').length;
  const completionPercentage = subtasks.length > 0 
    ? Math.round((completedSubtasks / subtasks.length) * 100)
    : 0;

  // Check for action required
  const isActionRequired = proposal.action_required || false;

  // Format contract value
  const formattedValue = useMemo(() => {
    if (!proposal.contract_value) return null;
    const value = proposal.contract_value;
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  }, [proposal.contract_value]);

  // Calculate days until due
  const daysUntilDue = useMemo(() => {
    if (!proposal.due_date) return null;
    const today = moment();
    const due = moment(proposal.due_date);
    const days = due.diff(today, 'days');
    return days;
  }, [proposal.due_date]);

  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isUrgent = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;

  // Determine priority level based on urgency and value
  const priorityLevel = useMemo(() => {
    if (isOverdue) return 'critical';
    if (isUrgent) return 'high';
    if (proposal.contract_value >= 5000000) return 'high';
    if (proposal.contract_value >= 1000000) return 'medium';
    return 'normal';
  }, [isOverdue, isUrgent, proposal.contract_value]);

  // Toggle blocked status mutation
  const toggleBlockedMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Proposal.update(proposal.id, {
        is_blocked: !proposal.is_blocked,
        blocked_date: !proposal.is_blocked ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      toast.success(proposal.is_blocked ? 'Proposal unblocked' : 'Proposal blocked');
    }
  });

  // Quick edit name mutation
  const updateNameMutation = useMutation({
    mutationFn: async (newName) => {
      return base44.entities.Proposal.update(proposal.id, {
        proposal_name: newName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setIsEditingName(false);
      toast.success('Proposal name updated');
    }
  });

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== proposal.proposal_name) {
      updateNameMutation.mutate(editedName.trim());
    } else {
      setIsEditingName(false);
      setEditedName(proposal.proposal_name);
    }
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === 'Escape') {
      setIsEditingName(false);
      setEditedName(proposal.proposal_name);
    }
  };

  const handleContextAction = (action, e) => {
    e.stopPropagation();
    setShowMenu(false);
    
    switch(action) {
      case 'duplicate':
        onDuplicate?.(proposal);
        break;
      case 'archive':
        onArchive?.(proposal);
        break;
      case 'delete':
        onDelete?.(proposal);
        break;
      case 'toggle-block':
        toggleBlockedMutation.mutate();
        break;
      case 'edit':
        onClick?.(proposal);
        break;
    }
  };

  // Border color based on priority
  const getBorderColor = () => {
    if (proposal.is_blocked) return 'border-red-500';
    if (priorityLevel === 'critical') return 'border-red-400';
    if (priorityLevel === 'high') return 'border-orange-400';
    if (priorityLevel === 'medium') return 'border-yellow-400';
    return 'border-slate-200';
  };

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={(e) => {
        if (selectionMode) {
          e?.stopPropagation?.();
          onToggleSelection?.(proposal.id);
        } else {
          onClick?.(proposal);
        }
      }}
      className={cn(
        "bg-white rounded-lg shadow-sm border-2 p-4 mb-3 cursor-pointer hover:shadow-md relative transition-all",
        snapshot.isDragging && "shadow-2xl border-blue-400 scale-105",
        isActionRequired && "ring-2 ring-amber-400",
        isSelected && "ring-2 ring-blue-500",
        !snapshot.isDragging && !isSelected && getBorderColor()
      )}
      style={{
        ...provided.draggableProps.style,
        // CRITICAL FIX: Force full opacity during drag - no transitions
        opacity: snapshot.isDragging ? '1 !important' : '1',
        visibility: 'visible',
      }}
    >
      {/* Selection Checkbox (if in selection mode) */}
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e?.stopPropagation?.();
              onToggleSelection?.(proposal.id);
            }}
            className="w-5 h-5 rounded border-2 border-slate-300 checked:bg-blue-600 checked:border-blue-600"
            onClick={(e) => e?.stopPropagation?.()}
          />
        </div>
      )}

      {/* Header with Context Menu */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="w-full font-semibold text-slate-900 border border-blue-400 rounded px-1 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
            ) : (
              <h4 
                className="font-semibold text-slate-900 mb-1 line-clamp-2 hover:text-blue-600 cursor-text"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setIsEditingName(true);
                }}
              >
                {proposal.proposal_name}
              </h4>
            )}
            {proposal.agency_name && (
              <p className="text-xs text-slate-600 truncate">{proposal.agency_name}</p>
            )}
          </div>
          <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mt-1 -mr-2 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
              >
                <MoreVertical className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => handleContextAction('edit', e)}>
                <Edit className="w-4 h-4 mr-2" />
                Open Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleContextAction('duplicate', e)}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleContextAction('toggle-block', e)}>
                {proposal.is_blocked ? (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Unblock
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Block
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => handleContextAction('archive', e)}>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => handleContextAction('delete', e)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Metadata Badges & Priority Indicator */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {priorityLevel === 'critical' && (
          <Badge className="bg-red-500 text-white text-xs">
            <Flag className="w-3 h-3 mr-1" />
            Critical
          </Badge>
        )}
        {priorityLevel === 'high' && (
          <Badge className="bg-orange-500 text-white text-xs">
            <Flag className="w-3 h-3 mr-1" />
            High Priority
          </Badge>
        )}
        {proposal.is_blocked && (
          <Badge className="bg-red-600 text-white text-xs">
            <Lock className="w-3 h-3 mr-1" />
            Blocked
          </Badge>
        )}
        {proposal.status && (
          <Badge variant="outline" className="text-xs">
            {proposal.status}
          </Badge>
        )}
        {proposal.proposal_type_category && (
          <Badge className="bg-purple-100 text-purple-700 text-xs">
            {proposal.proposal_type_category}
          </Badge>
        )}
      </div>

      {/* Stats Row */}
      <div className="space-y-2">
        {/* NEW: Shared Clients */}
        {sharedClients.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <Building2 className="w-3 h-3 text-purple-600" />
            <div className="flex items-center gap-1 flex-wrap">
              {sharedClients.slice(0, 2).map((client, idx) => (
                <Badge 
                  key={client.id} 
                  className="bg-purple-100 text-purple-700 text-xs h-5"
                  title={client.client_name}
                >
                  {client.client_name}
                </Badge>
              ))}
              {sharedClients.length > 2 && (
                <Badge className="bg-purple-100 text-purple-700 text-xs h-5">
                  +{sharedClients.length - 2} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Due Date */}
        {proposal.due_date && (
          <div className={cn(
            "flex items-center gap-2 text-xs",
            isOverdue ? "text-red-600" : isUrgent ? "text-amber-600" : "text-slate-600"
          )}>
            <Calendar className="w-3 h-3" />
            <span>{moment(proposal.due_date).format('MMM D, YYYY')}</span>
            {isOverdue && <Badge variant="destructive" className="text-xs h-5">Overdue</Badge>}
            {isUrgent && !isOverdue && <Badge className="bg-amber-500 text-white text-xs h-5">Urgent</Badge>}
          </div>
        )}

        {/* Contract Value */}
        {formattedValue && (
          <div className="flex items-center gap-2 text-xs text-green-700">
            <DollarSign className="w-3 h-3" />
            <span className="font-semibold">{formattedValue}</span>
          </div>
        )}

        {/* Team Members */}
        {proposal.assigned_team_members?.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Users className="w-3 h-3" />
            <span>{proposal.assigned_team_members.length} member{proposal.assigned_team_members.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Enhanced Progress Bar */}
        {subtasks.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-600">Progress</span>
                <span className="text-slate-500">
                  {completedSubtasks}/{subtasks.length} tasks
                </span>
              </div>
              <span className={cn(
                "font-medium",
                completionPercentage === 100 ? "text-green-600" : "text-slate-900"
              )}>
                {completionPercentage}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  completionPercentage === 100 ? 'bg-green-500' :
                  completionPercentage >= 75 ? 'bg-blue-500' :
                  completionPercentage >= 50 ? 'bg-yellow-500' :
                  'bg-orange-500'
                )}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Match Score */}
        {proposal.match_score > 0 && (
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <Target className="w-3 h-3" />
            <span>{proposal.match_score}% match</span>
          </div>
        )}

        {/* Action Required */}
        {isActionRequired && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
            <AlertCircle className="w-3 h-3" />
            <span className="font-medium">{proposal.action_required_description || 'Action required'}</span>
          </div>
        )}

        {/* Review Sections Button */}
        {pendingReviewSections.length > 0 && (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentReviewSectionIndex(0);
              setShowReviewModal(true);
            }}
            className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            Review {pendingReviewSections.length} Section{pendingReviewSections.length !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Enhanced Warning/Blocking Indicators */}
      {(proposal.is_blocked || isActionRequired || isOverdue) && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          {proposal.is_blocked && (
            <div className="flex items-start gap-2 p-2 bg-red-50 rounded text-xs border border-red-200">
              <Lock className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-red-900">Blocked</div>
                {proposal.blocker_reason && (
                  <div className="text-red-700 mt-0.5 line-clamp-2">{proposal.blocker_reason}</div>
                )}
                {proposal.blocked_date && (
                  <div className="text-red-600 mt-1 text-[10px]">
                    Since {moment(proposal.blocked_date).format('MMM D, YYYY')}
                  </div>
                )}
              </div>
            </div>
          )}
          {isOverdue && !proposal.is_blocked && (
            <div className="flex items-start gap-2 p-2 bg-red-50 rounded text-xs border border-red-200">
              <Clock className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-red-900">Overdue</div>
                <div className="text-red-700 mt-0.5">
                  {Math.abs(daysUntilDue)} {Math.abs(daysUntilDue) === 1 ? 'day' : 'days'} past due
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section Review Modal */}
      {pendingReviewSections.length > 0 && currentUser && (
        <SectionReviewModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setCurrentReviewSectionIndex(0);
          }}
          section={pendingReviewSections[currentReviewSectionIndex]}
          proposal={proposal}
          organization={organization}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}