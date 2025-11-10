import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
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
  Building2
} from "lucide-react";
import moment from "moment";

export default function KanbanCard({ 
  proposal, 
  provided, 
  snapshot, 
  onClick, 
  organization,
  isSelected = false,
  onToggleSelection,
  selectionMode = false
}) {
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

  // NEW: Fetch shared clients for this proposal
  const { data: sharedClients = [] } = useQuery({
    queryKey: ['proposal-shared-clients', proposal.id],
    queryFn: async () => {
      if (!proposal.shared_with_client_ids || proposal.shared_with_client_ids.length === 0) {
        return [];
      }
      
      const allClients = await base44.entities.Client.list();
      return allClients.filter(c => proposal.shared_with_client_ids.includes(c.id));
    },
    enabled: !!proposal.shared_with_client_ids && proposal.shared_with_client_ids.length > 0,
    staleTime: 60000
  });

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

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={(e) => {
        if (selectionMode) {
          e.stopPropagation();
          onToggleSelection?.(proposal.id);
        } else {
          onClick(proposal);
        }
      }}
      className={cn(
        "bg-white rounded-lg shadow-sm border-2 p-4 mb-3 cursor-pointer transition-all hover:shadow-md relative",
        snapshot.isDragging ? "shadow-xl border-blue-400 rotate-2 scale-105" : "border-slate-200",
        isActionRequired && "ring-2 ring-amber-400 border-amber-400",
        isSelected && "ring-2 ring-blue-500 border-blue-500"
      )}
    >
      {/* Selection Checkbox (if in selection mode) */}
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelection?.(proposal.id);
            }}
            className="w-5 h-5 rounded border-2 border-slate-300 checked:bg-blue-600 checked:border-blue-600"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Header */}
      <div className="mb-3">
        <h4 className="font-semibold text-slate-900 mb-1 line-clamp-2">
          {proposal.proposal_name}
        </h4>
        {proposal.agency_name && (
          <p className="text-xs text-slate-600 truncate">{proposal.agency_name}</p>
        )}
      </div>

      {/* Metadata Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
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

        {/* Progress Bar */}
        {subtasks.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>{completedSubtasks}/{subtasks.length} tasks</span>
              <span>{completionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  completionPercentage === 100 ? 'bg-green-500' :
                  completionPercentage >= 50 ? 'bg-blue-500' :
                  'bg-amber-500'
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
      </div>
    </div>
  );
}