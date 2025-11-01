import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, GripVertical } from "lucide-react";
import KanbanCard from "./KanbanCard";
import { cn } from "@/lib/utils";

function KanbanColumn({ 
  column, 
  proposals, 
  onProposalClick, 
  onDeleteProposal, 
  isDraggingOver,
  isCollapsed,
  onToggleCollapse,
  dragHandleProps
}) {
  return (
    <Card className={cn(
      "flex-shrink-0 border-slate-200",
      isDraggingOver && "ring-2 ring-blue-400 bg-blue-50"
    )}>
      <CardHeader 
        className={cn(
          "p-4 border-b bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors",
          column.color
        )}
        onClick={() => onToggleCollapse(column.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4 text-slate-400" />
            </div>
            {!isCollapsed && (
              <>
                <h3 className="font-semibold text-slate-900 truncate">{column.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {proposals.length}
                </Badge>
              </>
            )}
            {isCollapsed && (
              <div className="flex flex-col items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-sm" style={{ writingMode: 'vertical-rl' }}>
                  {column.label}
                </h3>
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-xs font-semibold text-slate-700">
                    {proposals.length}
                  </span>
                </div>
              </div>
            )}
          </div>
          <ChevronRight className={cn(
            "w-4 h-4 text-slate-400 transition-transform flex-shrink-0",
            isCollapsed && "rotate-180"
          )} />
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="p-4 space-y-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
          {proposals.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No proposals
            </div>
          ) : (
            proposals.map((proposal, index) => (
              <KanbanCard
                key={proposal.id}
                proposal={proposal}
                index={index}
                onProposalClick={onProposalClick}
                onDeleteProposal={onDeleteProposal}
              />
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default React.memo(KanbanColumn);