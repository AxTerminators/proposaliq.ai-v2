import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Users, CheckCircle2, AlertCircle, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Type badge configuration
const TYPE_BADGES = {
  RFP: { emoji: '📋', color: 'bg-blue-100 text-blue-700 border-blue-300', label: 'RFP' },
  RFI: { emoji: '❓', color: 'bg-slate-100 text-slate-700 border-slate-300', label: 'RFI' },
  SBIR: { emoji: '🔬', color: 'bg-purple-100 text-purple-700 border-purple-300', label: 'SBIR' },
  GSA: { emoji: '🏛️', color: 'bg-green-100 text-green-700 border-green-300', label: 'GSA' },
  IDIQ: { emoji: '📑', color: 'bg-indigo-100 text-indigo-700 border-indigo-300', label: 'IDIQ' },
  STATE_LOCAL: { emoji: '🏢', color: 'bg-amber-100 text-amber-700 border-amber-300', label: 'State/Local' },
  OTHER: { emoji: '📄', color: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Other' }
};

const formatCurrency = (value) => {
  if (!value) return null;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

const getDaysUntilDue = (dueDate) => {
  if (!dueDate) return null;
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function KanbanCard({ proposal, index, onClick, column }) {
  const typeBadge = TYPE_BADGES[proposal.proposal_type_category] || TYPE_BADGES.OTHER;
  const daysUntilDue = getDaysUntilDue(proposal.due_date);
  const isUrgent = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

  const currentStageChecklist = proposal.current_stage_checklist_status?.[column?.id] || {};
  const columnChecklistItems = column?.checklist_items || [];
  const requiredItems = columnChecklistItems.filter(item => item.required);
  const completedRequiredItems = requiredItems.filter(item => currentStageChecklist[item.id]?.completed);
  const hasRequiredItems = requiredItems.length > 0;
  const allRequiredCompleted = hasRequiredItems && completedRequiredItems.length === requiredItems.length;

  return (
    <Draggable draggableId={proposal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "mb-3 transition-all",
            snapshot.isDragging && "rotate-2 scale-105"
          )}
        >
          <Card className="cursor-pointer hover:shadow-lg transition-all border-slate-200 hover:border-blue-300">
            <CardContent className="p-4">
              {/* Header with Title and Type Badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-slate-900 text-sm leading-tight flex-1 line-clamp-2">
                  {proposal.proposal_name}
                </h3>
                <Badge className={cn("border flex-shrink-0", typeBadge.color)}>
                  <span className="mr-1">{typeBadge.emoji}</span>
                  {typeBadge.label}
                </Badge>
              </div>

              {/* Metadata */}
              <div className="space-y-2 text-xs">
                {proposal.agency_name && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="font-medium truncate">{proposal.agency_name}</span>
                  </div>
                )}

                {proposal.solicitation_number && (
                  <div className="text-slate-500 font-mono truncate">
                    {proposal.solicitation_number}
                  </div>
                )}

                {/* Contract Value */}
                {proposal.contract_value && (
                  <div className="flex items-center gap-1 text-green-700 font-semibold">
                    <DollarSign className="w-3 h-3" />
                    {formatCurrency(proposal.contract_value)}
                  </div>
                )}

                {/* Due Date */}
                {proposal.due_date && (
                  <div className={cn(
                    "flex items-center gap-1.5",
                    isOverdue ? "text-red-600 font-semibold" :
                    isUrgent ? "text-orange-600 font-semibold" :
                    "text-slate-600"
                  )}>
                    <Calendar className="w-3 h-3" />
                    {isOverdue && "Overdue "}
                    {isUrgent && !isOverdue && "Due in " + daysUntilDue + "d"}
                    {!isUrgent && !isOverdue && new Date(proposal.due_date).toLocaleDateString()}
                  </div>
                )}

                {/* Assigned Team */}
                {proposal.assigned_team_members?.length > 0 && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Users className="w-3 h-3" />
                    {proposal.assigned_team_members.length} assigned
                  </div>
                )}

                {/* Progress Indicator */}
                {proposal.progress_summary && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600">Progress</span>
                        <span className="font-semibold text-slate-900">
                          {Math.round(proposal.progress_summary.completion_percentage || 0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all"
                          style={{ width: `${proposal.progress_summary.completion_percentage || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Checklist Progress */}
                {hasRequiredItems && (
                  <div className="flex items-center gap-2 pt-2">
                    {allRequiredCompleted ? (
                      <div className="flex items-center gap-1.5 text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">All required items complete</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-700">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">
                          {completedRequiredItems.length}/{requiredItems.length} required
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Required Badge */}
                {proposal.action_required && (
                  <Badge className="bg-orange-100 text-orange-700 border-orange-300 text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Action Required
                  </Badge>
                )}

                {/* Sample Data Badge */}
                {proposal.is_sample_data && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    SAMPLE
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}