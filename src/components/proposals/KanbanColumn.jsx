
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
  MoreVertical,
  Lock,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronDown,
  Settings,
  Shield,
  CheckCircle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanCard from "./KanbanCard";

// Helper function
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
  isCollapsed,
  organization,
  columnSort,
  onSortChange,
  onClearSort,
  onDeleteColumn,
  onRenameColumn,
  dragOverColumnColor,
  kanbanConfig,
  onConfigureColumn,
  user,
}) {
  const proposalCount = proposals.length;

  // Check user permissions for this column
  const currentUserRole = getUserRole(user);
  const canDragToHere = !column.can_drag_to_here_roles || column.can_drag_to_here_roles.length === 0 ||
                        column.can_drag_to_here_roles.includes(currentUserRole);
  const canDragFromHere = !column.can_drag_from_here_roles || column.can_drag_from_here_roles.length === 0 ||
                          column.can_drag_from_here_roles.includes(currentUserRole);

  // Check WIP limit status
  const wipLimit = column.wip_limit || 0;
  const isAtWipLimit = wipLimit > 0 && proposalCount >= wipLimit;
  const isNearWipLimit = wipLimit > 0 && proposalCount >= wipLimit * 0.8 && proposalCount < wipLimit;

  return (
    <div
      ref={provided.innerRef}
      {...provided.droppableProps}
      className={cn(
        "flex flex-col rounded-xl border-2 transition-all duration-200 overflow-hidden",
        snapshot.isDraggingOver
          ? "border-blue-400 bg-blue-50 shadow-lg scale-[1.02]"
          : "border-slate-200 bg-white shadow-md"
      )}
      style={{ minWidth: "320px", maxWidth: "320px" }}
    >
      {/* Column Header with Gradient Banner */}
      <div className={cn(
        "relative p-4 bg-gradient-to-r",
        column.color || "from-slate-400 to-slate-600"
      )}>
        <div className="flex items-center gap-3">
          {/* Collapse/Expand Button */}
          <button
            onClick={() => onToggleCollapse(column.id)}
            className="hover:bg-white/20 p-1.5 rounded-lg transition-colors flex-shrink-0"
            title={isCollapsed ? "Expand column" : "Collapse column"}
          >
            <ChevronLeft className={cn(
              "w-5 h-5 text-white transition-transform",
              isCollapsed && "rotate-180"
            )} />
          </button>

          {/* Column Name & Count */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-lg truncate flex items-center gap-2">
                {column.label}
                <span className="text-sm font-normal opacity-90">
                  {proposalCount}
                </span>
              </h3>
            </div>

            {/* Status Badges - Only show non-lock badges */}
            {(wipLimit > 0 || !canDragFromHere || column.requires_approval_to_exit) && (
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {/* WIP Limit Indicator */}
                {wipLimit > 0 && (
                  <Badge
                    className={cn(
                      "text-xs backdrop-blur-sm",
                      isAtWipLimit ? "bg-red-100/90 text-red-700 border-red-300" :
                      isNearWipLimit ? "bg-yellow-100/90 text-yellow-700 border-yellow-300" :
                      "bg-white/20 text-white border-white/30"
                    )}
                  >
                    WIP: {proposalCount}/{wipLimit}
                    {column.wip_limit_type === 'hard' && (
                      <AlertCircle className="w-3 h-3 ml-1 inline" />
                    )}
                  </Badge>
                )}

                {/* RBAC Indicators */}
                {!canDragFromHere && (
                  <Badge className="bg-orange-100/90 text-orange-700 border-orange-300 text-xs backdrop-blur-sm">
                    <Shield className="w-3 h-3 mr-1" />
                    Protected Exit
                  </Badge>
                )}

                {column.requires_approval_to_exit && (
                  <Badge className="bg-amber-100/90 text-amber-700 border-amber-300 text-xs backdrop-blur-sm">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approval Gate
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Lock Icon (if locked) */}
          {column.is_locked && (
            <div 
              className="flex-shrink-0 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
              title="This column is locked"
            >
              <Lock className="w-5 h-5 text-white" />
            </div>
          )}

          {/* Column Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 hover:bg-white/20 text-white">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onConfigureColumn}>
                <Settings className="w-4 h-4 mr-2" />
                Configure Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Column Content */}
      {!isCollapsed && (
        <div
          className="flex-1 p-3 space-y-3 overflow-y-auto bg-slate-50"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          {/* RBAC Warning */}
          {!canDragToHere && proposalCount > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-orange-800">
                  <strong>Restricted Access:</strong> Only {column.can_drag_to_here_roles?.join(', ')} can move proposals here.
                </p>
              </div>
            </div>
          )}

          {/* WIP Limit Warning */}
          {isAtWipLimit && column.wip_limit_type === 'hard' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-800">
                  <strong>WIP Limit Reached:</strong> Cannot add more proposals until others are moved out.
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {proposalCount === 0 ? (
            <div className="text-center py-12 px-4">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No proposals yet</p>
            </div>
          ) : (
            proposals.map((proposal, index) => (
              <Draggable
                key={proposal.id}
                draggableId={proposal.id}
                index={index}
                isDragDisabled={!canDragFromHere}
              >
                {(provided, snapshot) => (
                  <KanbanCard
                    proposal={proposal}
                    provided={provided}
                    snapshot={snapshot}
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
      )}

      {/* Collapsed State */}
      {isCollapsed && (
        <div className="p-4 text-center bg-slate-50">
          <p className="text-sm text-slate-500">{proposalCount} proposals</p>
        </div>
      )}
    </div>
  );
}
