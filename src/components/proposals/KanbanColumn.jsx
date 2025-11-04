
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
  Check,
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
}) {
  const proposalCount = proposals.length;
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(column.label);
  const inputRef = useRef(null);

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
  const isAtWipLimit = wipLimit > 0 && proposalCount >= wipLimit;
  const isNearWipLimit = wipLimit > 0 && proposalCount >= wipLimit * 0.8 && proposalCount < wipLimit;

  const handleNameClick = (e) => {
    e.stopPropagation();
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
          "relative bg-gradient-to-r rounded-t-xl",
          column.color || "from-slate-400 to-slate-600",
          !column.is_locked && "cursor-grab active:cursor-grabbing"
        )}
      >
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            {/* Collapse Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleCollapse(column.id)}
              className="h-8 w-8 hover:bg-white/20 text-white flex-shrink-0"
              title="Collapse column"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {/* Column Title */}
            <div className="flex-1 min-w-0">
              {isEditingName ? (
                <Input
                  ref={inputRef}
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleNameSave}
                  className="h-9 bg-white text-slate-900 font-semibold border-2 border-white/30"
                  placeholder="Column name..."
                />
              ) : (
                <button
                  onClick={handleNameClick}
                  className={cn(
                    "text-left w-full group",
                    !column.is_locked && "cursor-pointer"
                  )}
                  disabled={column.is_locked}
                >
                  <h3 className={cn(
                    "font-bold text-white text-lg truncate",
                    !column.is_locked && "group-hover:opacity-90 transition-opacity"
                  )}>
                    {column.label}
                  </h3>
                  <p className="text-white/80 text-sm mt-0.5">
                    {proposalCount} {proposalCount === 1 ? 'proposal' : 'proposals'}
                  </p>
                </button>
              )}
            </div>

            {/* Lock Icon */}
            {column.is_locked && (
              <div 
                className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="This column is locked"
              >
                <Lock className="w-5 h-5 text-white" />
              </div>
            )}

            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-white/20 text-white flex-shrink-0"
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
          </div>

          {/* Status Badges */}
          {(wipLimit > 0 || !canDragFromHere || column.requires_approval_to_exit) && (
            <div className="flex items-center gap-2 flex-wrap">
              {wipLimit > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs font-medium",
                    isAtWipLimit ? "bg-red-500/90 text-white hover:bg-red-500" :
                    isNearWipLimit ? "bg-yellow-500/90 text-white hover:bg-yellow-500" :
                    "bg-white/20 text-white hover:bg-white/30 border-white/30"
                  )}
                >
                  {column.wip_limit_type === 'hard' && (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  )}
                  WIP: {proposalCount}/{wipLimit}
                </Badge>
              )}

              {!canDragFromHere && (
                <Badge variant="secondary" className="bg-orange-500/90 text-white hover:bg-orange-500 text-xs font-medium">
                  <Shield className="w-3 h-3 mr-1" />
                  Protected
                </Badge>
              )}

              {column.requires_approval_to_exit && (
                <Badge variant="secondary" className="bg-amber-500/90 text-white hover:bg-amber-500 text-xs font-medium">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approval
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Column Body */}
      <div className="flex-1 bg-slate-50 rounded-b-xl border-2 border-t-0 border-slate-200 overflow-hidden">
        <div className="h-full overflow-y-auto p-3 space-y-3">
          {/* Warnings */}
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
                  <strong>WIP Limit:</strong> Cannot add more until others are moved out.
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {proposalCount === 0 ? (
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
          ) : (
            proposals.map((proposal, index) => (
              <Draggable
                key={proposal.id}
                draggableId={proposal.id}
                index={index}
                type="card"
                isDragDisabled={!canDragFromHere}
              >
                {(cardProvided, cardSnapshot) => (
                  <KanbanCard
                    proposal={proposal}
                    provided={cardProvided}
                    snapshot={cardSnapshot}
                    isDragDisabled={!canDragFromHere}
                    column={column}
                    onCardClick={onCardClick}
                  />
                )}
              </Draggable>
            ))
          )}
          {provided.placeholder}
        </div>
      </div>
    </div>
  );
}
