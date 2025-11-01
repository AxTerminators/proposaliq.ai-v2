import React, { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, X, Trash2, AlertCircle } from "lucide-react";
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
  onDeleteColumn
}) {
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [deleteWarningMessage, setDeleteWarningMessage] = useState('');
  
  const proposalCount = proposals?.length || 0;
  
  // Get the column label and color
  const columnLabel = column?.label || column?.name || column?.title || column?.id || 'Untitled Column';
  const columnColor = column?.color || 'from-slate-400 to-slate-600';

  const getSortIcon = (sortType) => {
    if (!columnSort || columnSort.sortBy !== sortType) {
      return <ArrowUpDown className="w-4 h-4 ml-2" />;
    }
    return columnSort.sortDirection === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-2" /> : 
      <ArrowDown className="w-4 h-4 ml-2" />;
  };

  const getSortLabel = () => {
    if (!columnSort) return null;
    const { sortBy, sortDirection } = columnSort;
    const labels = {
      name: 'A to Z',
      due_date: 'Due Date',
      created_date: 'Date Added'
    };
    return `${labels[sortBy]} (${sortDirection === 'asc' ? 'Ascending' : 'Descending'})`;
  };

  const handleDeleteClick = () => {
    if (proposalCount > 0) {
      setDeleteWarningMessage(`The column "${columnLabel}" cannot be deleted because it currently contains ${proposalCount} proposal${proposalCount !== 1 ? 's' : ''}. Please move or delete all proposals from this column before attempting to delete it.`);
      setShowDeleteWarning(true);
    } else {
      // Column is empty, proceed with deletion
      if (onDeleteColumn) {
        onDeleteColumn(column.id);
      }
    }
  };

  const canDeleteColumn = column.type === 'custom_stage';

  return (
    <>
      <div className="flex flex-col h-full min-h-[500px]">
        {/* Column Header with Gradient Color */}
        <div className={cn(
          "p-4 border-b border-slate-200",
          `bg-gradient-to-r ${columnColor}`
        )}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-white drop-shadow-md">
                {columnLabel}
              </h3>
              {columnSort && (
                <div className="text-xs text-white/90 mt-1 flex items-center gap-1">
                  Sorted: {getSortLabel()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/90 text-slate-900 hover:bg-white text-sm font-semibold">
                {proposalCount}
              </Badge>
              
              {/* Three Dots Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Sort This Column By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSortChange('name')}>
                    <span className="flex items-center flex-1">
                      A to Z
                      {getSortIcon('name')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSortChange('due_date')}>
                    <span className="flex items-center flex-1">
                      Due Date
                      {getSortIcon('due_date')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSortChange('created_date')}>
                    <span className="flex items-center flex-1">
                      Date Added
                      {getSortIcon('created_date')}
                    </span>
                  </DropdownMenuItem>
                  {columnSort && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onClearSort} className="text-slate-600">
                        <X className="w-4 h-4 mr-2" />
                        Clear Sort
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* Delete Column Option - Only for Custom Columns */}
                  {canDeleteColumn && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Column
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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

      {/* Delete Warning Dialog */}
      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Cannot Delete Column
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-700">
              {deleteWarningMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDeleteWarning(false)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}