import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, GripVertical, ArrowUpDown } from "lucide-react";
import KanbanCard from "./KanbanCard";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function KanbanColumn({ 
  column, 
  proposals, 
  onProposalClick, 
  onDeleteProposal, 
  isDraggingOver,
  isCollapsed,
  onToggleCollapse,
  dragHandleProps,
  onSortChange,
  currentSort
}) {
  const handleSortClick = (e, sortType) => {
    e.stopPropagation();
    if (onSortChange) {
      onSortChange(column.id, sortType);
    }
  };

  const getSortLabel = () => {
    if (!currentSort) return "Sort";
    switch(currentSort) {
      case "date_newest": return "Newest";
      case "name_asc": return "A-Z";
      case "name_desc": return "Z-A";
      default: return "Sort";
    }
  };

  return (
    <Card className={cn(
      "flex-shrink-0 border-slate-200",
      isDraggingOver && "ring-2 ring-blue-400 bg-blue-50"
    )}>
      <CardHeader 
        className={cn(
          "p-4 border-b bg-slate-50",
          column.color
        )}
      >
        <div 
          {...dragHandleProps}
          className="flex items-center justify-between cursor-grab active:cursor-grabbing hover:bg-slate-100 -m-4 p-4 rounded-t-lg transition-colors"
          style={{ touchAction: 'none' }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <h3 className="font-semibold text-slate-900 truncate select-none">{column.label}</h3>
                <Badge variant="secondary" className="text-xs select-none">
                  {proposals.length}
                </Badge>
                
                {/* Sort Dropdown */}
                {proposals.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ArrowUpDown className="w-3 h-3 mr-1" />
                        {getSortLabel()}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={(e) => handleSortClick(e, "date_newest")}>
                        📅 Date Added (Newest First)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleSortClick(e, "name_asc")}>
                        🔤 A to Z
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleSortClick(e, "name_desc")}>
                        🔠 Z to A
                      </DropdownMenuItem>
                      {currentSort && (
                        <DropdownMenuItem 
                          onClick={(e) => handleSortClick(e, null)}
                          className="text-slate-500"
                        >
                          ✖ Clear Sort
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
            {isCollapsed && (
              <div className="flex flex-col items-center gap-2">
                <h3 className="font-semibold text-slate-900 text-sm select-none" style={{ writingMode: 'vertical-rl' }}>
                  {column.label}
                </h3>
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                  <span className="text-xs font-semibold text-slate-700 select-none">
                    {proposals.length}
                  </span>
                </div>
              </div>
            )}
          </div>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(column.id);
            }}
            className="hover:bg-slate-200 rounded p-1 transition-colors z-10"
          >
            <ChevronRight 
              className={cn(
                "w-4 h-4 text-slate-400 transition-transform flex-shrink-0",
                isCollapsed && "rotate-180"
              )} 
            />
          </button>
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