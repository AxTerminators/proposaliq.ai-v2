import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { GripVertical, MoreVertical, ChevronRight, ChevronLeft, ArrowUpDown, Trash2, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanCard from "./KanbanCard";

export default function KanbanColumn({
  column,
  proposals,
  onProposalClick,
  onDeleteProposal,
  isDraggingOver,
  isCollapsed,
  onToggleCollapse,
  dragHandleProps,
  onSortChange,
  currentSort,
  onDeleteColumn,
  organization
}) {
  const proposalCount = proposals?.length || 0;
  const wipLimit = column.wip_limit || 0;
  const wipLimitType = column.wip_limit_type || 'soft';
  const hasWipLimit = wipLimit > 0;
  const isApproachingLimit = hasWipLimit && proposalCount >= wipLimit * 0.8;
  const isExceedingLimit = hasWipLimit && proposalCount > wipLimit;

  return (
    <Card
      className={cn(
        "h-full flex flex-col border-2 transition-all duration-200",
        isDraggingOver && "border-blue-500 bg-blue-50",
        isCollapsed ? "w-16" : "w-80",
        column.color || "bg-white"
      )}
    >
      <CardHeader className="p-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing flex-shrink-0">
              <GripVertical className="w-4 h-4 text-slate-400" />
            </div>
          )}

          <button
            onClick={() => onToggleCollapse(column.id)}
            className="flex-1 text-left"
          >
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs font-semibold transform -rotate-90 whitespace-nowrap origin-center">
                  {column.label}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1">
                  {proposalCount}
                </Badge>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                    {column.label}
                    {column.type === 'custom_stage' && (
                      <Badge variant="outline" className="text-[10px] px-1">Custom</Badge>
                    )}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {proposalCount}
                  </Badge>
                </div>

                {/* WIP Limit Indicator */}
                {hasWipLimit && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={cn(
                        "font-medium",
                        isExceedingLimit && "text-red-600",
                        isApproachingLimit && !isExceedingLimit && "text-amber-600",
                        !isApproachingLimit && "text-slate-600"
                      )}>
                        WIP Limit: {proposalCount}/{wipLimit}
                      </span>
                      {isExceedingLimit && (
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                      )}
                      {isApproachingLimit && !isExceedingLimit && (
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                      )}
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all rounded-full",
                          isExceedingLimit && "bg-red-500",
                          isApproachingLimit && !isExceedingLimit && "bg-amber-500",
                          !isApproachingLimit && "bg-green-500"
                        )}
                        style={{
                          width: `${Math.min((proposalCount / wipLimit) * 100, 100)}%`
                        }}
                      />
                    </div>
                    {isExceedingLimit && wipLimitType === 'hard' && (
                      <div className="mt-1 text-[10px] text-red-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Hard limit exceeded - no new items allowed
                      </div>
                    )}
                    {isExceedingLimit && wipLimitType === 'soft' && (
                      <div className="mt-1 text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" />
                        Soft limit exceeded - consider moving items
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </button>

          {!isCollapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onSortChange(column.id, 'date_newest')}>
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  Sort by Date (Newest)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange(column.id, 'name_asc')}>
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  Sort by Name (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange(column.id, 'name_desc')}>
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  Sort by Name (Z-A)
                </DropdownMenuItem>
                {column.type === 'custom_stage' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDeleteColumn(column)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Column
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="flex-1 overflow-y-auto p-3">
          {proposals?.map((proposal, index) => (
            <KanbanCard
              key={proposal.id}
              proposal={proposal}
              index={index}
              onDelete={onDeleteProposal}
              organization={organization}
            />
          ))}
          {proposals?.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No proposals
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}