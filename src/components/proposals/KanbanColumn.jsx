import React, { useState, useRef, useEffect, useMemo } from "react";
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
  MoreVertical,
  Lock,
  AlertCircle,
  ChevronLeft,
  Settings,
  Shield,
  CheckCircle,
  FileText,
  DollarSign,
  ChevronDown,
  ArrowUpAZ,
  ArrowDownZA,
  Calendar,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanCard from "./KanbanCard";

function getUserRole(user) {
  if (!user) return 'viewer';
  if (user.role === 'admin') return 'organization_owner';
  return user.organization_app_role || user.role || 'viewer';
}

export default function KanbanColumn({
  column,
  proposals,
  provided,
  snapshot,
  onCardClick,
  onToggleCollapse,
  organization,
  onRenameColumn,
  onConfigureColumn,
  user,
  dragHandleProps,
  onCreateProposal,
  selectedProposalIds = [],
  onToggleProposalSelection,
  totalCount = proposals.length,
  visibleCount = proposals.length,
  hasMore = false,
  onLoadMore,
  onLoadAll,
  onColumnSortChange,
  onClearColumnSort,
  currentSort,
}) {
  const proposalCount = proposals.length;
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(column.label);
  const inputRef = useRef(null);

  const selectionMode = selectedProposalIds.length > 0;

  const totalValue = useMemo(() => {
    return proposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
  }, [proposals]);

  const formattedValue = useMemo(() => {
    if (totalValue === 0) return null;
    if (totalValue >= 1000000) {
      return `${(totalValue / 1000000).toFixed(1)}M`;
    } else if (totalValue >= 1000) {
      return `${(totalValue / 1000).toFixed(0)}K`;
    }
    return `${totalValue.toLocaleString()}`;
  }, [totalValue]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const currentUserRole = getUserRole(user);
  const canDragToHere = !column.can_drag_to_here_roles?.length ||
                        column.can_drag_to_here_roles.includes(currentUserRole);
  const canDragFromHere = !column.can_drag_from_here_roles?.length ||
                          column.can_drag_from_here_roles.includes(currentUserRole);

  const wipLimit = column.wip_limit || 0;
  const isAtWipLimit = wipLimit > 0 && totalCount >= wipLimit;
  const isNearWipLimit = wipLimit > 0 && totalCount >= wipLimit * 0.8 && totalCount < wipLimit;

  const handleNameClick = (e) => {
    e?.stopPropagation?.();
    if (!column.is_locked) {
      setIsEditingName(true);
      setEditedName(column.label);
    }
  };

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== column.label) {
      onRenameColumn(column.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditedName(column.label);
    setIsEditingName(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  const handleSort = (sortBy, direction) => {
    onColumnSortChange?.(column.id, sortBy, direction);
  };

  const handleClearSort = () => {
    onClearColumnSort?.(column.id);
  };

  return (
    <div
      className={cn(
        "w-full md:w-80 flex-shrink-0 bg-white border-2 border-slate-200 rounded-xl shadow-sm transition-all duration-200 ease-out flex flex-col",
        snapshot.isDraggingOver && "border-blue-400 bg-blue-50 shadow-lg md:scale-[1.02]"
      )}
    >
      {/* Column Header */}
      <div
        {...(dragHandleProps || {})}
        className={cn(
          "relative bg-gradient-to-r rounded-t-xl flex-shrink-0 min-h-[56px] md:min-h-[60px] transition-all duration-200",
          column.color || "from-slate-400 to-slate-600",
          !column.is_locked && "md:cursor-grab md:active:cursor-grabbing"
        )}
      >
        <div className="p-2.5 md:p-3 h-full flex items-center">
          <div className="flex items-center gap-2 w-full">
            {/* Collapse Button - Hidden on mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e?.stopPropagation?.();
                onToggleCollapse?.(column.id);
              }}
              className="hidden md:flex h-7 w-7 hover:bg-white/20 text-white flex-shrink-0 transition-transform duration-200 hover:scale-110 active:scale-95 min-h-[44px] min-w-[44px]"
              title="Collapse column"
              aria-label="Collapse column"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Column Name */}
            <div className="flex-1 min-w-0 mr-1">
              {isEditingName ? (
                <Input
                  ref={inputRef}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleNameSave}
                  className="h-8 md:h-8 bg-white text-slate-900 font-semibold border-2 border-white/30 text-sm px-2 min-h-[44px]"
                  placeholder="Column name..."
                />
              ) : (
                <button
                  onClick={handleNameClick}
                  className={cn(
                    "text-left w-full min-h-[44px] flex items-center",
                    !column.is_locked && "md:cursor-pointer hover:opacity-90 transition-opacity"
                  )}
                  disabled={column.is_locked}
                  title={column.label}
                  aria-label={`Column: ${column.label}`}
                >
                  <h3 className="font-bold text-white text-sm md:text-base truncate leading-tight">
                    {column.label}
                  </h3>
                </button>
              )}
            </div>

            {/* Metadata Badges */}
            {!isEditingName && (
              <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                <Badge
                  variant="secondary"
                  className="bg-white/20 text-white hover:bg-white/30 border-white/30 text-xs font-bold h-6 min-w-[28px] px-1.5 flex items-center justify-center"
                  title={hasMore 
                    ? `Showing ${visibleCount} of ${totalCount} proposals` 
                    : `${totalCount} ${totalCount === 1 ? 'proposal' : 'proposals'}`
                  }
                >
                  {hasMore ? `${visibleCount}/${totalCount}` : totalCount}
                </Badge>

                {formattedValue && (
                  <Badge
                    variant="secondary"
                    className="bg-white/20 text-white hover:bg-white/30 border-white/30 text-xs font-bold h-6 px-2 flex items-center gap-0.5"
                    title={`Total value: $${formattedValue}`}
                  >
                    <DollarSign className="w-3 h-3" title="Total value" />
                    {formattedValue}
                  </Badge>
                )}

                {wipLimit > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs font-bold h-6 px-1.5 flex items-center",
                      isAtWipLimit ? "bg-red-500 text-white hover:bg-red-600" :
                      isNearWipLimit ? "bg-yellow-500 text-white hover:bg-yellow-600" :
                      "bg-white/20 text-white hover:bg-white/30 border-white/30"
                    )}
                    title={`Work in progress limit: ${totalCount}/${wipLimit} ${column.wip_limit_type === 'hard' ? '(Hard Limit)' : '(Soft Limit)'}`}
                  >
                    {column.wip_limit_type === 'hard' && <AlertCircle className="w-3 h-3 mr-0.5" title="Hard limit" />}
                    {totalCount}/{wipLimit}
                  </Badge>
                )}

                {!canDragFromHere && (
                  <Badge
                    variant="secondary"
                    className="bg-orange-500 text-white hover:bg-orange-600 text-xs font-bold h-6 px-1.5 flex items-center gap-0.5"
                    title="Protected column - only specific roles can move proposals out"
                  >
                    <Shield className="w-3 h-3" title="Protected" />
                  </Badge>
                )}

                {column.requires_approval_to_exit && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold h-6 px-1.5 flex items-center gap-0.5"
                    title="Requires approval to move proposals out of this column"
                  >
                    <CheckCircle className="w-3 h-3" title="Approval required" />
                  </Badge>
                )}

                {column.is_locked && (
                  <div
                    className="flex-shrink-0 pl-0.5 h-6 flex items-center"
                    title="System column (locked)"
                  >
                    <Lock className="w-4 h-4 text-white/90" title="Locked" />
                  </div>
                )}
              </div>
            )}

            {/* Menu */}
            {!isEditingName && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 md:h-7 md:w-7 hover:bg-white/20 text-white flex-shrink-0 ml-1 min-h-[44px] min-w-[44px]"
                    title="Column options"
                    aria-label="Column options"
                  >
                    <MoreVertical className="w-5 h-5 md:w-4 md:h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={(e) => {
                    e?.stopPropagation?.();
                    onConfigureColumn?.();
                  }}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Column
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleSort('name', 'asc')}>
                    <ArrowUpAZ className="w-4 h-4 mr-2" />
                    Sort A → Z (Title)
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleSort('name', 'desc')}>
                    <ArrowDownZA className="w-4 h-4 mr-2" />
                    Sort Z → A (Title)
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleSort('due_date', 'asc')}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Sort by Due Date (Earliest)
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleSort('due_date', 'desc')}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Sort by Due Date (Latest)
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleSort('created_date', 'desc')}>
                    <Clock className="w-4 h-4 mr-2" />
                    Sort by Recently Added
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleSort('created_date', 'asc')}>
                    <Clock className="w-4 h-4 mr-2" />
                    Sort by Oldest First
                  </DropdownMenuItem>

                  {currentSort && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleClearSort}
                        className="text-red-600 focus:text-red-600"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Clear Sort
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Proposal Cards Container */}
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={cn(
          "flex-1 overflow-y-auto p-2 md:p-3 space-y-2 md:space-y-2 min-h-[120px] transition-all duration-200",
          snapshot.isDraggingOver && "bg-blue-50/50"
        )}
      >
        {!canDragToHere && totalCount > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-orange-900">
                <strong>Restricted:</strong> Only {column.can_drag_to_here_roles?.join(', ')} can move proposals here.
              </p>
            </div>
          </div>
        )}

        {isAtWipLimit && column.wip_limit_type === 'hard' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-900">
                <strong>WIP Limit Reached:</strong> Cannot add more proposals until others are moved out.
              </p>
            </div>
          </div>
        )}

        {proposals.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No proposals</p>
            <p className="text-xs mt-1">Drag here or create new</p>
          </div>
        ) : (
          <>
            {proposals.map((proposal, index) => (
              <Draggable
                key={proposal.id}
                draggableId={proposal.id}
                index={index}
                type="card"
                isDragDisabled={!canDragFromHere}
              >
                {(providedCard, snapshotCard) => (
                  <KanbanCard
                    proposal={proposal}
                    provided={providedCard}
                    snapshot={snapshotCard}
                    onClick={onCardClick}
                    organization={organization}
                    isSelected={selectedProposalIds.includes(proposal.id)}
                    onToggleSelection={onToggleProposalSelection}
                    selectionMode={selectionMode}
                  />
                )}
              </Draggable>
            ))}

            {hasMore && (
              <div className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadMore?.();
                  }}
                  className="w-full border-dashed border-2 hover:bg-blue-50 hover:border-blue-400 h-9"
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Load More ({totalCount - visibleCount})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadAll?.();
                  }}
                  className="w-full text-xs text-slate-600 hover:text-blue-600 h-7"
                >
                  Show All {totalCount}
                </Button>
              </div>
            )}
          </>
        )}

        {provided.placeholder}
      </div>
    </div>
  );
}