import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KanbanColumn({ 
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
    <div className={`flex flex-col h-full ${column.color} rounded-lg border-2 ${
      isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
    } transition-all`}>
      <div className="p-3 border-b border-slate-200 bg-white/50 rounded-t-lg">
        <div className="flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div 
              {...dragHandleProps} 
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-200 rounded transition-colors"
              title="Drag to reorder column"
            >
              <GripVertical className="w-4 h-4 text-slate-400" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {!isCollapsed && (
              <>
                <h3 className="font-semibold text-slate-900 truncate">{column.label}</h3>
                <Badge variant="secondary" className="text-xs mt-1">
                  {proposals.length} {proposals.length === 1 ? 'proposal' : 'proposals'}
                </Badge>
              </>
            )}
            {isCollapsed && (
              <div className="text-center">
                <div className="transform -rotate-90 whitespace-nowrap text-xs font-semibold text-slate-700">
                  {column.label}
                </div>
                <Badge variant="secondary" className="text-xs mt-2">
                  {proposals.length}
                </Badge>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-6 w-6"
            onClick={() => onToggleCollapse(column.id)}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px]">
          {proposals.map((proposal, index) => (
            <Draggable key={proposal.id} draggableId={proposal.id} index={index} type="proposal">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <KanbanCard
                    proposal={proposal}
                    onClick={() => onProposalClick(proposal)}
                    onDelete={() => onDeleteProposal(proposal)}
                    isDragging={snapshot.isDragging}
                  />
                </div>
              )}
            </Draggable>
          ))}
          
          {proposals.length === 0 && !isDraggingOver && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No proposals
            </div>
          )}
          
          {isDraggingOver && proposals.length === 0 && (
            <div className="text-center py-8 text-blue-500 text-sm">
              Drop here
            </div>
          )}
        </div>
      )}
    </div>
  );
}