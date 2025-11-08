
import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Users, CheckCircle2, AlertCircle, Clock, Sparkles, Check } from "lucide-react"; // Added Check
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

export default function KanbanCard({ 
  proposal, 
  provided, // Added provided prop
  snapshot, // Added snapshot prop
  onClick, 
  column,
  organization, // Added organization prop
  isSelectionMode = false, // Added isSelectionMode prop
  isSelected = false, // Added isSelected prop
  onToggleSelection // Added onToggleSelection prop
}) {
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

  const isActionRequired = proposal.action_required; // Derived from proposal.action_required

  // The Draggable component is now assumed to be an external wrapper,
  // passing `provided` and `snapshot` directly to KanbanCard.
  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      onClick={() => {
        if (isSelectionMode) {
          onToggleSelection(proposal.id);
        } else {
          onClick(proposal); // Pass the entire proposal object to onClick
        }
      }}
      className={cn(
        "mb-3 bg-white rounded-xl border-2 transition-all cursor-pointer group relative", // Added mb-3 here for spacing
        snapshot.isDragging ? "shadow-2xl border-blue-400 rotate-2" : "shadow-md hover:shadow-xl border-slate-200 hover:border-blue-300",
        isActionRequired && "ring-2 ring-amber-400 border-amber-400",
        isSelected && "ring-2 ring-blue-500 border-blue-500"
      )}
    >
      {/* Selection Checkbox - Top Right */}
      {isSelectionMode && (
        <div 
          className="absolute top-2 right-2 z-10"
          onClick={(e) => {
            e.stopPropagation(); // Prevent the card's onClick from firing
            onToggleSelection(proposal.id);
          }}
        >
          <div className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer",
            isSelected 
              ? "bg-blue-600 border-blue-600" 
              : "bg-white border-slate-300 hover:border-blue-400"
          )}>
            {isSelected && (
              <Check className="w-3 h-3 text-white" />
            )}
          </div>
        </div>
      )}

      {/* The Card component now becomes purely structural inside the main div */}
      <Card className="shadow-none border-none">
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
  );
}
