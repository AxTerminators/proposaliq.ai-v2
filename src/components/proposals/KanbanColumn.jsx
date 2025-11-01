import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

const KanbanColumn = React.memo(({ 
  column, 
  proposals, 
  isCollapsed, 
  onToggleCollapse, 
  onEditColumn, 
  onCardClick 
}) => {
  const columnProposals = proposals.filter(p => {
    if (column.type === 'default_status') {
      return p.status === column.default_status_mapping;
    } else {
      return p.custom_workflow_stage_id === column.id;
    }
  });

  return (
    <Card className="border-slate-200 shadow-sm h-full flex flex-col">
      <CardHeader className="pb-3 space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleCollapse(column.id)}
              className="h-6 w-6"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <h3 className="font-semibold text-slate-900 text-sm">{column.label}</h3>
            <Badge variant="secondary" className="text-xs">
              {columnProposals.length}
            </Badge>
          </div>
          {column.type === 'custom_stage' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEditColumn(column)}
              className="h-6 w-6"
            >
              <Pencil className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="flex-1 overflow-y-auto pt-0" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <Droppable droppableId={column.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[200px] transition-colors ${
                  snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg' : ''
                }`}
              >
                {columnProposals.map((proposal, index) => (
                  <KanbanCard
                    key={proposal.id}
                    proposal={proposal}
                    index={index}
                    onClick={() => onCardClick(proposal)}
                  />
                ))}
                {provided.placeholder}
                {columnProposals.length === 0 && !snapshot.isDraggingOver && (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No proposals
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </CardContent>
      )}
    </Card>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;