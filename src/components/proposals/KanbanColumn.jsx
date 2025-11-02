
import React, { useState, useRef, useEffect } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { MoreVertical, ArrowUpDown, ArrowUp, ArrowDown, X, Trash2, AlertCircle, Edit2, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanCard from "./KanbanCard";

// Hard-locked columns that cannot be renamed at all
const HARD_LOCKED_COLUMNS = ['evaluating', 'draft', 'in_progress', 'submitted', 'archived'];

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
  onRenameColumn
}) {
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [deleteWarningMessage, setDeleteWarningMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedLabel, setEditedLabel] = useState('');
  const inputRef = useRef(null);
  
  const proposalCount = proposals?.length || 0;
  
  // Calculate total contract value for this column
  const totalContractValue = proposals?.reduce((sum, proposal) => {
    return sum + (proposal.contract_value || 0);
  }, 0) || 0;
  
  // Get the column label and color
  const columnLabel = column?.label || column?.name || column?.title || column?.id || 'Untitled Column';
  const columnColor = column?.color || 'from-slate-400 to-slate-600';

  // Determine if this column can be renamed
  const isHardLocked = column.type === 'default_status' && HARD_LOCKED_COLUMNS.includes(column.id);
  const canRename = !isHardLocked; // Custom columns and soft-locked default columns can be renamed

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (canRename) {
      setEditedLabel(columnLabel);
      setIsEditing(true);
    }
  };

  const handleSaveLabel = () => {
    if (editedLabel.trim() && editedLabel !== columnLabel) {
      if (onRenameColumn) {
        onRenameColumn(column.id, editedLabel.trim());
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveLabel();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

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

  // Format currency
  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    } else if (value > 0) {
      return `$${value.toLocaleString()}`;
    }
    return null;
  };

  return (
    <>
      <div className="flex flex-col h-full min-h-[500px] rounded-lg overflow-hidden">
        {/* Column Header with Gradient Color */}
        <div className={cn(
          "p-4 border-b border-slate-200 relative",
          `bg-gradient-to-r ${columnColor}`
        )}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 mr-2">
              {isEditing ? (
                <Input
                  ref={inputRef}
                  value={editedLabel}
                  onChange={(e) => setEditedLabel(e.target.value)}
                  onBlur={handleSaveLabel}
                  onKeyDown={handleKeyDown}
                  className="font-bold text-lg bg-white/90 text-slate-900 border-white h-9 px-2"
                  title="Press Enter to save, Escape to cancel"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h3 
                    className={cn(
                      "font-bold text-lg text-white drop-shadow-md",
                      canRename && "cursor-pointer hover:opacity-80 transition-opacity"
                    )}
                    onDoubleClick={handleDoubleClick}
                    title={canRename ? "Double-click to rename column" : columnLabel}
                  >
                    {columnLabel}
                  </h3>
                  {canRename && (
                    <Edit2 
                      className="w-3 h-3 text-white/60 hover:text-white/90 cursor-pointer transition-colors"
                      onClick={handleDoubleClick}
                      title="Rename column"
                    />
                  )}
                </div>
              )}
              
              {columnSort && !isEditing && (
                <div className="text-xs text-white/90 mt-1 flex items-center gap-1">
                  Sorted: {getSortLabel()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/90 text-slate-900 hover:bg-white text-sm font-semibold" title={`${proposalCount} proposal${proposalCount !== 1 ? 's' : ''} in this column`}>
                {proposalCount}
              </Badge>
              
              {/* Three Dots Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    title="Column options"
                  >
                    <MoreVertical className="w-4 h-4" title="Options" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Sort This Column By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onSortChange('name')} title="Sort proposals alphabetically">
                    <span className="flex items-center flex-1">
                      A to Z
                      {getSortIcon('name')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSortChange('due_date')} title="Sort proposals by due date">
                    <span className="flex items-center flex-1">
                      Due Date
                      {getSortIcon('due_date')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onSortChange('created_date')} title="Sort proposals by date created">
                    <span className="flex items-center flex-1">
                      Date Added
                      {getSortIcon('created_date')}
                    </span>
                  </DropdownMenuItem>
                  {columnSort && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onClearSort} className="text-slate-600" title="Remove sorting">
                        <X className="w-4 h-4 mr-2" title="Clear" />
                        Clear Sort
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* Rename Option - For editable columns */}
                  {canRename && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDoubleClick} className="text-blue-600" title="Change column name">
                        <Edit2 className="w-4 h-4 mr-2" title="Rename" />
                        Rename Column
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* Delete Column Option - Only for Custom Columns */}
                  {canDeleteColumn && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600" title="Delete this column">
                        <Trash2 className="w-4 h-4 mr-2" title="Delete" />
                        Delete Column
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Total Contract Value - Positioned in center between title and badge */}
          {totalContractValue > 0 && !isEditing && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded px-2 py-0.5">
              <DollarSign className="w-3 h-3 text-white/80" title="Total contract value" />
              <span className="text-xs font-semibold text-white/90" title={`Total: $${totalContractValue.toLocaleString()}`}>
                {formatCurrency(totalContractValue)}
              </span>
            </div>
          )}
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
              <AlertCircle className="w-5 h-5" title="Warning" />
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
