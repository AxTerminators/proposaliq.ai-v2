import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import KanbanCard from "./KanbanCard";
import { cn } from "@/lib/utils";

export default function KanbanColumn({ 
  column, 
  proposals, 
  onProposalClick, 
  onDeleteProposal,
  isDraggingOver, 
  isCollapsed, 
  onToggleCollapse 
}) {
  return (
    <Card className={cn(
      "border-2 transition-all h-fit",
      isDraggingOver && "border-blue-400 bg-blue-50",
      isCollapsed && "cursor-pointer"
    )}>
      <CardHeader 
        className="p-3 border-b flex flex-row items-center justify-between space-y-0"
        onClick={isCollapsed ? () => onToggleCollapse(column.id) : undefined}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center w-full gap-2">
            <div 
              className={cn("w-3 h-3 rounded-full", column.color)}
            />
            <div className="writing-mode-vertical text-sm font-semibold whitespace-nowrap">
              {column.label}
            </div>
            <Badge variant="secondary" className="text-xs">
              {proposals.length}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(column.id);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-1">
              <div className={cn("w-3 h-3 rounded-full", column.color)} />
              <CardTitle className="text-sm font-semibold">
                {column.label}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {proposals.length}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleCollapse(column.id)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardHeader>
      
      {!isCollapsed && (
        <CardContent className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
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
                onDelete={onDeleteProposal}
              />
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
}