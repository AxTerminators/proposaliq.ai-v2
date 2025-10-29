import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, ChevronLeft, Edit2, Trash2, Check, X, Lock } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";

export default function KanbanColumn({ 
  column, 
  proposals, 
  onProposalClick,
  isDraggingOver,
  isCollapsed,
  onToggleCollapse
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(column.label || column.display_name || "Untitled");

  const handleSaveRename = () => {
    if (editedName.trim()) {
      // For now, just update locally - you can add a mutation here if needed
      setIsEditing(false);
    }
  };

  const handleCancelRename = () => {
    setEditedName(column.label || column.display_name || "Untitled");
    setIsEditing(false);
  };

  const columnName = column.label || column.display_name || "Untitled";

  if (isCollapsed) {
    return (
      <div className="flex-shrink-0 w-16 transition-all duration-300">
        <Card className="h-full border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-2 border-b bg-slate-50">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 mx-auto"
              onClick={() => onToggleCollapse && onToggleCollapse(column.id)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-2 flex flex-col items-center gap-2">
            <div 
              className="writing-mode-vertical text-sm font-semibold text-slate-700 whitespace-nowrap cursor-pointer hover:text-slate-900"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              onClick={() => onToggleCollapse && onToggleCollapse(column.id)}
            >
              {columnName}
            </div>
            <Badge variant="secondary" className="text-xs">
              {proposals.length}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-80 transition-all duration-300">
      <Card className="h-full flex flex-col border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b bg-slate-50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => onToggleCollapse && onToggleCollapse(column.id)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              {isEditing ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveRename()}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={handleSaveRename}
                  >
                    <Check className="w-3 h-3 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0"
                    onClick={handleCancelRename}
                  >
                    <X className="w-3 h-3 text-red-600" />
                  </Button>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-slate-900 truncate">
                    {columnName}
                  </h3>
                  <Badge variant="secondary" className="ml-auto flex-shrink-0">
                    {proposals.length}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <CardContent
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 p-3 overflow-y-auto ${
                isDraggingOver ? "bg-blue-50" : ""
              }`}
              style={{ minHeight: "200px", maxHeight: "calc(100vh - 300px)" }}
            >
              {proposals.map((proposal, index) => (
                <KanbanCard
                  key={proposal.id}
                  proposal={proposal}
                  index={index}
                  onProposalClick={onProposalClick}
                />
              ))}
              {provided.placeholder}
              {proposals.length === 0 && !isDraggingOver && (
                <div className="text-center text-slate-400 text-sm py-8">
                  No proposals here
                </div>
              )}
            </CardContent>
          )}
        </Droppable>
      </Card>
    </div>
  );
}