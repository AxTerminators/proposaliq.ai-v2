import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import KanbanCard from "./KanbanCard";

export default function KanbanColumn({
  column,
  proposals,
  provided,
  snapshot,
  onCardClick,
  onToggleCollapse,
  isCollapsed,
  organization
}) {
  const proposalCount = proposals?.length || 0;

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Column Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-900" style={{ color: '#0f172a' }}>
              {column?.label || 'Untitled Column'}
            </h3>
          </div>
          <Badge variant="secondary" className="text-sm ml-2">
            {proposalCount}
          </Badge>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
        {proposals?.map((proposal, index) => (
          <Draggable key={proposal.id} draggableId={proposal.id} index={index}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.draggableProps}
                {...provided.dragHandleProps}
              >
                <KanbanCard
                  proposal={proposal}
                  index={index}
                  onClick={() => onCardClick(proposal)}
                  isDragging={snapshot.isDragging}
                  organization={organization}
                />
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
        
        {proposals?.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm">
            No proposals
          </div>
        )}
      </div>
    </div>
  );
}