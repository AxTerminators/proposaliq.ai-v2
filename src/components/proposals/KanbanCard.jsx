import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  DollarSign,
  Users,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  MoreVertical,
  Sparkles,
  ListChecks
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formatCurrency = (value) => {
  if (!value) return null;
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  } else {
    return `$${value.toLocaleString()}`;
  }
};

export default function KanbanCard({ proposal, index, onClick, column }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const completedChecklistItems = column?.checklist_items 
    ? column.checklist_items.filter(item => 
        proposal.current_stage_checklist_status?.[column.id]?.[item.id]?.completed
      ).length 
    : 0;

  const totalChecklistItems = column?.checklist_items?.length || 0;
  const checklistProgress = totalChecklistItems > 0 
    ? Math.round((completedChecklistItems / totalChecklistItems) * 100) 
    : 0;

  const hasRequiredIncomplete = column?.checklist_items?.some(item => 
    item.required && !proposal.current_stage_checklist_status?.[column.id]?.[item.id]?.completed
  );

  return (
    <Draggable draggableId={proposal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "mb-3 group",
            snapshot.isDragging && "opacity-50"
          )}
          style={{
            ...provided.draggableProps.style,
            // Override any transform during drag to ensure smooth following
            ...(snapshot.isDragging && {
              transform: provided.draggableProps.style?.transform,
              transition: 'none',
            })
          }}
        >
          <Card
            className={cn(
              "cursor-pointer hover:shadow-xl border-2",
              "bg-white",
              snapshot.isDragging 
                ? "shadow-2xl border-blue-400 rotate-2 scale-105" 
                : "border-slate-200 hover:border-slate-300",
              "transition-shadow duration-200",
              proposal.is_blocked && "border-red-300 bg-red-50/30",
              proposal.action_required && !proposal.is_blocked && "border-amber-300 bg-amber-50/30"
            )}
            onClick={(e) => {
              if (!isMenuOpen && !snapshot.isDragging) {
                onClick(proposal);
              }
            }}
            style={{
              transition: snapshot.isDragging ? 'none' : 'box-shadow 0.2s, border-color 0.2s',
            }}
          >
            <CardContent className="p-4">
              {/* Drag Handle + Header */}
              <div className="flex items-start gap-2 mb-3">
                <div
                  {...provided.dragHandleProps}
                  className="cursor-grab active:cursor-grabbing pt-1 opacity-0 group-hover:opacity-100 transition-opacity touch-none"
                  style={{ touchAction: 'none' }}
                >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 flex-1">
                      {proposal.proposal_name}
                    </h4>
                    
                    <DropdownMenu onOpenChange={setIsMenuOpen}>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          onClick(proposal);
                        }}>
                          Open Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {proposal.solicitation_number && (
                    <p className="text-xs text-slate-500 mb-2">
                      {proposal.solicitation_number}
                    </p>
                  )}

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {proposal.is_sample_data && (
                      <Badge className="text-xs bg-amber-100 text-amber-700">
                        <Sparkles className="w-3 h-3 mr-1" />
                        SAMPLE
                      </Badge>
                    )}
                    {proposal.is_blocked && (
                      <Badge className="text-xs bg-red-100 text-red-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Blocked
                      </Badge>
                    )}
                    {proposal.action_required && !proposal.is_blocked && (
                      <Badge className="text-xs bg-amber-100 text-amber-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Action Required
                      </Badge>
                    )}
                  </div>

                  {/* Checklist Progress */}
                  {totalChecklistItems > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <ListChecks className="w-3 h-3" />
                          <span>{completedChecklistItems}/{totalChecklistItems}</span>
                          {hasRequiredIncomplete && (
                            <AlertCircle className="w-3 h-3 text-amber-500 ml-1" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-700">{checklistProgress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-300 rounded-full",
                            checklistProgress === 100 ? "bg-green-500" : "bg-blue-500"
                          )}
                          style={{ width: `${checklistProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Card Details */}
                  <div className="space-y-2 text-xs">
                    {proposal.agency_name && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Users className="w-3.5 h-3.5" />
                        <span className="truncate">{proposal.agency_name}</span>
                      </div>
                    )}
                    
                    {proposal.due_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className={cn(
                          moment(proposal.due_date).isBefore(moment()) 
                            ? "text-red-600 font-medium" 
                            : moment(proposal.due_date).diff(moment(), 'days') < 7
                            ? "text-amber-600 font-medium"
                            : "text-slate-600"
                        )}>
                          {moment(proposal.due_date).format('MMM D, YYYY')}
                        </span>
                      </div>
                    )}
                    
                    {proposal.contract_value && (
                      <div className="flex items-center gap-1.5 text-green-700 font-medium">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{formatCurrency(proposal.contract_value)}</span>
                      </div>
                    )}

                    {proposal.assigned_team_members && proposal.assigned_team_members.length > 0 && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Users className="w-3.5 h-3.5" />
                        <span className="truncate">
                          {proposal.assigned_team_members.length} member{proposal.assigned_team_members.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}