import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, ChevronLeft, Edit2, Trash2, Check, X, Lock, Filter, DollarSign } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [sortBy, setSortBy] = useState("date_added"); // date_added, alphabetical, due_date

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

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  const columnName = column.label || column.display_name || "Untitled";

  // Calculate total contract value for this column
  const totalValue = proposals.reduce((sum, proposal) => {
    return sum + (proposal.contract_value || 0);
  }, 0);

  // Sort proposals based on selected sort option
  const sortedProposals = [...proposals].sort((a, b) => {
    switch (sortBy) {
      case "alphabetical":
        return (a.proposal_name || "").localeCompare(b.proposal_name || "");
      case "due_date":
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      case "date_added":
      default:
        return new Date(b.created_date) - new Date(a.created_date);
    }
  });

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
            {totalValue > 0 && (
              <div className="text-xs font-semibold text-green-700 transform rotate-90 whitespace-nowrap mt-4">
                ${(totalValue / 1000000).toFixed(1)}M
              </div>
            )}
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                      >
                        <Filter className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleSortChange("date_added")}
                        className={sortBy === "date_added" ? "bg-slate-100" : ""}
                      >
                        <div className="flex items-center gap-2">
                          {sortBy === "date_added" && <Check className="w-4 h-4" />}
                          <span>Date Added (Newest)</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleSortChange("alphabetical")}
                        className={sortBy === "alphabetical" ? "bg-slate-100" : ""}
                      >
                        <div className="flex items-center gap-2">
                          {sortBy === "alphabetical" && <Check className="w-4 h-4" />}
                          <span>Alphabetical (A-Z)</span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleSortChange("due_date")}
                        className={sortBy === "due_date" ? "bg-slate-100" : ""}
                      >
                        <div className="flex items-center gap-2">
                          {sortBy === "due_date" && <Check className="w-4 h-4" />}
                          <span>Due Date (Earliest)</span>
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
          
          {/* Total Value Display */}
          {totalValue > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <DollarSign className="w-3 h-3" />
                  <span>Total Value</span>
                </div>
                <div className="font-bold text-green-700">
                  ${totalValue >= 1000000 
                    ? `${(totalValue / 1000000).toFixed(2)}M` 
                    : totalValue >= 1000 
                    ? `${(totalValue / 1000).toFixed(0)}K`
                    : totalValue.toLocaleString()}
                </div>
              </div>
            </div>
          )}
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
              {sortedProposals.map((proposal, index) => (
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