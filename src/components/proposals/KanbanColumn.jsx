
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
}) {
  // Safety check for provided
  if (!provided) {
    console.error('[KanbanColumn] Provided is undefined for column:', column?.label);
    return (
      <div className="flex flex-col h-full w-80 flex-shrink-0">
        <div className="p-4 bg-slate-100 border border-slate-300 rounded-lg">
          <p className="text-sm text-slate-600">Loading column...</p>
        </div>
      </div>
    );
  }

  const proposalCount = proposals?.length || 0;
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(column?.label || '');
  const inputRef = useRef(null);

  // Calculate total dollar value in this column
  const totalValue = useMemo(() => {
    return (proposals || []).reduce((sum, p) => sum + (p.contract_value || 0), 0);
  }, [proposals]);

  // Format dollar value for display
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

  useEffect(() => {
    setEditedName(column?.label || '');
  }, [column?.label]);

  const currentUserRole = getUserRole(user);
  const canDragToHere = !column?.can_drag_to_here_roles?.length || 
                        column.can_drag_to_here_roles.includes(currentUserRole);
  const canDragFromHere = !column?.can_drag_from_here_roles?.length || 
                          column.can_drag_from_here_roles.includes(currentUserRole);

  const wipLimit = column?.wip_limit || 0;
  const isAtWipLimit = wipLimit > 0 && proposalCount >= wipLimit;
  const isNearWipLimit = wipLimit > 0 && proposalCount >= wipLimit * 0.8 && proposalCount < wipLimit;

  const handleNameClick = (e) => {
    e.stopPropagation();
    if (!column?.is_locked) {
      setIsEditingName(true);
      setEditedName(column?.label || '');
    }
  };

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== column?.label) {
      onRenameColumn(column.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditedName(column?.label || '');
    setIsEditingName(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      handleNameCancel();
    }
  };

  return (
    <div
      ref={provided.innerRef}
      {...provided.droppableProps}
      className="flex flex-col h-full w-80 flex-shrink-0"
    >
      {/* Column Header */}
      <div 
        {...(dragHandleProps || {})}
        className={cn(
          "relative bg-gradient-to-r rounded-t-xl flex-shrink-0 min-h-[60px]",
          column?.color || "from-slate-400 to-slate-600",
          !column?.is_locked && "cursor-grab active:cursor-grabbing"
        )}
      >
        <div className="p-3 h-full flex items-center">
          <div className="flex items-center gap-2 w-full">
            {/* Collapse Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse(column.id);
              }}
              className="h-7 w-7 hover:bg-white/20 text-white flex-shrink-0"
              title="Collapse column"
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
                  className="h-8 bg-white text-slate-900 font-semibold border-2 border-white/30 text-sm px-2"
                  placeholder="Column name..."
                />
              ) : (
                <button
                  onClick={handleNameClick}
                  className={cn(
                    "text-left w-full",
                    !column?.is_locked && "cursor-pointer hover:opacity-90 transition-opacity"
                  )}
                  disabled={column?.is_locked}
                  title={column?.label}
                >
                  <h3 className="font-bold text-white text-base truncate leading-tight">
                    {column?.label || 'Untitled'}
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
                  title={`${proposalCount} ${proposalCount === 1 ? 'proposal' : 'proposals'}`}
                >
                  {proposalCount}
                </Badge>

                {formattedValue && (
                  <Badge 
                    variant="secondary" 
                    className="bg-white/20 text-white hover:bg-white/30 border-white/30 text-xs font-bold h-6 px-2 flex items-center gap-0.5"
                    title={`Total value: $${formattedValue}`}
                  >
                    <DollarSign className="w-3 h-3" />
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
                    title={`Work in progress limit: ${proposalCount}/${wipLimit} ${column.wip_limit_type === 'hard' ? '(Hard Limit)' : '(Soft Limit)'}`}
                  >
                    {column.wip_limit_type === 'hard' && <AlertCircle className="w-3 h-3 mr-0.5" />}
                    {proposalCount}/{wipLimit}
                  </Badge>
                )}

                {!canDragFromHere && (
                  <Badge 
                    variant="secondary" 
                    className="bg-orange-500 text-white hover:bg-orange-600 text-xs font-bold h-6 px-1.5 flex items-center gap-0.5"
                    title="Protected column - only specific roles can move proposals out"
                  >
                    <Shield className="w-3 h-3" />
                  </Badge>
                )}

                {column?.requires_approval_to_exit && (
                  <Badge 
                    variant="secondary" 
                    className="bg-amber-500 text-white hover:bg-amber-600 text-xs font-bold h-6 px-1.5 flex items-center gap-0.5"
                    title="Requires approval to move proposals out of this column"
                  >
                    <CheckCircle className="w-3 h-3" />
                  </Badge>
                )}

                {column?.is_locked && (
                  <div 
                    className="flex-shrink-0 pl-0.5 h-6 flex items-center"
                    title="System column (locked)"
                  >
                    <Lock className="w-4 h-4 text-white/90" />
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
                    className="h-7 w-7 hover:bg-white/20 text-white flex-shrink-0 ml-1"
                    title="Column options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={onConfigureColumn}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configure Column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Column Body */}
      <div className={cn(
        "flex-1 bg-slate-50 rounded-b-xl border-2 border-t-0 border-slate-200 overflow-hidden",
        snapshot?.isDraggingOver && "bg-blue-50 border-blue-300"
      )}>
        <div 
          className="h-full overflow-y-auto p-3 space-y-3"
          style={{ minHeight: '300px' }}
        >
          {/* Warning Messages */}
          {!canDragToHere && proposalCount > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-900">
                  <strong>Restricted:</strong> Only {column.can_drag_to_here_roles?.join(', ')} can move proposals here.
                </p>
              </div>
            </div>
          )}

          {isAtWipLimit && column.wip_limit_type === 'hard' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-900">
                  <strong>WIP Limit Reached:</strong> Cannot add more proposals until others are moved out.
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {proposalCount === 0 && (
            <button 
              onClick={() => onCreateProposal && onCreateProposal(column)}
              className="w-full p-8 hover:bg-slate-100 rounded-lg transition-all group border-2 border-dashed border-slate-300 hover:border-blue-400"
              title="Click to create a new proposal"
            >
              <FileText className="w-12 h-12 text-slate-300 group-hover:text-blue-500 mx-auto mb-3 transition-colors" />
              <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">
                No proposals yet
              </p>
              <p className="text-xs text-slate-400 mt-1 group-hover:text-blue-500 transition-colors">
                Click to add one
              </p>
            </button>
          )}

          {proposalCount > 0 && (
            <>
              {proposals.map((proposal, index) => (
                <Draggable
                  key={proposal.id}
                  draggableId={proposal.id}
                  index={index}
                  type="card"
                  isDragDisabled={!canDragFromHere}
                >
                  {(cardProvided, cardSnapshot) => {
                    // COMPREHENSIVE safety check for card provided
                    if (!cardProvided || !cardProvided.innerRef || !cardProvided.draggableProps || !cardProvided.dragHandleProps) {
                      console.warn('[KanbanColumn] Card provided is missing required properties for proposal:', proposal.id);
                      return null;
                    }
                    
                    return (
                      <div
                        ref={cardProvided.innerRef}
                        {...cardProvided.draggableProps}
                        {...cardProvided.dragHandleProps}
                        style={cardProvided.draggableProps.style}
                      >
                        <KanbanCard
                          proposal={proposal}
                          isDragging={cardSnapshot.isDragging}
                          isDragDisabled={!canDragFromHere}
                          column={column}
                          onCardClick={onCardClick}
                        />
                      </div>
                    );
                  }}
                </Draggable>
              ))}
            </>
          )}
          {provided.placeholder}
        </div>
      </div>
    </div>
  );
}
