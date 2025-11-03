import React, { useState, useRef, useEffect } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ChevronsLeft,
  MoreVertical,
  Pencil,
  Trash2,
  SortAsc,
  SortDesc,
  Calendar,
  Clock,
  X,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from "lucide-react";
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
  organization,
  columnSort,
  onSortChange,
  onClearSort,
  onDeleteColumn,
  onRenameColumn,
  dragOverColumnColor,
  kanbanConfig
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(column.label);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSubmit = () => {
    if (editedName.trim() && editedName !== column.label) {
      onRenameColumn(column.id, editedName.trim());
    } else {
      setEditedName(column.label);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditedName(column.label);
      setIsEditingName(false);
    }
  };

  // Calculate checklist completion for this column
  const proposalsWithIncompleteRequired = proposals.filter(p => {
    const checklistStatus = p.current_stage_checklist_status?.[column.id] || {};
    const checklistItems = column.checklist_items || [];
    return checklistItems.some(item => item.required && !checklistStatus[item.id]?.completed);
  }).length;

  const totalChecklistItems = column.checklist_items?.length || 0;

  // Check if column has WIP limit
  const wipLimit = column.wip_limit || 0;
  const isOverWipLimit = wipLimit > 0 && proposals.length > wipLimit;
  const isNearWipLimit = wipLimit > 0 && proposals.length === wipLimit;

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div
        className={cn(
          "flex-shrink-0 p-4 border-b-2 bg-gradient-to-r transition-all",
          column.color || 'from-slate-400 to-slate-600',
          snapshot.isDraggingOver && 'border-blue-500',
          dragOverColumnColor && `from-${dragOverColumnColor.split(' ')[0]} to-${dragOverColumnColor.split(' ')[2]}`
        )}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <Input
                ref={inputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleNameKeyDown}
                className="h-7 text-sm font-semibold bg-white/90"
              />
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm truncate">
                  {column.label}
                </h3>
                {column.is_locked && (
                  <Lock className="w-3 h-3 text-white/70 flex-shrink-0" title="Locked workflow stage" />
                )}
                {column.type === 'locked_phase' && (
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                    Phase
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleCollapse(column.id)}
              className="h-7 w-7 text-white/90 hover:bg-white/20"
              title="Collapse column"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>

            {!column.is_locked && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white/90 hover:bg-white/20"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Rename Column
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onDeleteColumn(column.id)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Column Stats */}
        <div className="flex items-center justify-between text-xs text-white/90">
          <div className="flex items-center gap-3">
            <span className="font-semibold">
              {proposals.length} {proposals.length === 1 ? 'proposal' : 'proposals'}
            </span>
            
            {proposalsWithIncompleteRequired > 0 && (
              <div className="flex items-center gap-1 text-yellow-200">
                <AlertCircle className="w-3 h-3" />
                <span>{proposalsWithIncompleteRequired} need action</span>
              </div>
            )}

            {totalChecklistItems > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{totalChecklistItems} checklist items</span>
              </div>
            )}
          </div>

          {wipLimit > 0 && (
            <Badge 
              className={cn(
                "text-xs",
                isOverWipLimit ? "bg-red-500 text-white" :
                isNearWipLimit ? "bg-yellow-500 text-white" :
                "bg-white/20 text-white"
              )}
            >
              {proposals.length}/{wipLimit}
            </Badge>
          )}
        </div>

        {/* Sort Options */}
        {proposals.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-white/90 hover:bg-white/20"
                >
                  {columnSort ? (
                    <>
                      {columnSort.direction === 'asc' ? <SortAsc className="w-3 h-3 mr-1" /> : <SortDesc className="w-3 h-3 mr-1" />}
                      Sorted by {columnSort.by}
                    </>
                  ) : (
                    'Sort'
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onSortChange('name')}>
                  Sort by Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange('due_date')}>
                  Sort by Due Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange('created_date')}>
                  Sort by Created Date
                </DropdownMenuItem>
                {columnSort && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onClearSort}>
                      <X className="w-4 h-4 mr-2" />
                      Clear Sort
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* WIP Limit Warning */}
        {isOverWipLimit && (
          <div className="mt-2 p-2 bg-red-500/20 border border-red-300/30 rounded text-xs text-white">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            WIP limit exceeded! Consider moving proposals forward.
          </div>
        )}
      </div>

      {/* Cards Container */}
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={cn(
          "flex-1 overflow-y-auto p-3 space-y-3 transition-all",
          snapshot.isDraggingOver && 'bg-blue-50/50'
        )}
      >
        {proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <div className="text-center">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm">No proposals here</p>
              {column.type === 'locked_phase' && (
                <p className="text-xs mt-1">Drag proposals to this stage</p>
              )}
            </div>
          </div>
        ) : (
          proposals.map((proposal, index) => (
            <Draggable key={proposal.id} draggableId={proposal.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                >
                  <KanbanCard
                    proposal={proposal}
                    onClick={() => onCardClick(proposal)}
                    isDragging={snapshot.isDragging}
                    organization={organization}
                    columnColor={column.color}
                    dragOverColumnColor={proposal.__dragOverColumnColor}
                    column={column}
                  />
                </div>
              )}
            </Draggable>
          ))
        )}
        {provided.placeholder}
      </div>
    </div>
  );
}