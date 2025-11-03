
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
  ChevronRight, // New
  ChevronDown, // New
  Settings, // New
  Shield, // New
  CheckCircle, // New (replaces CheckCircle2 in new context for "Approval Gate")
  FileText // New
} from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanCard from "./KanbanCard";

// Helper function
function getUserRole(user) {
  if (!user) return 'viewer';
  // Assuming user.role for app-level roles and user.organization_app_role for org-specific roles
  // Adjust this logic based on your actual user object structure and roles.
  // Example: if 'admin' maps to 'organization_owner' for internal logic
  if (user.role === 'admin') return 'organization_owner';
  // Fallback to a common role or viewer if no specific role is found
  return user.organization_app_role || user.role || 'viewer';
}

export default function KanbanColumn({
  column,
  proposals,
  provided,
  snapshot,
  onConfigureColumn, // New prop
  user, // New prop
}) {
  // State for internal collapse, replacing prop
  const [isCollapsed, setIsCollapsed] = useState(false); 
  // Renaming functionality removed from column header, so these states are removed.
  // const [isEditingName, setIsEditingName] = useState(false);
  // const [editedName, setEditedName] = useState(column.label);
  // const inputRef = useRef(null);

  // useEffect(() => {
  //   if (isEditingName && inputRef.current) {
  //     inputRef.current.focus();
  //     inputRef.current.select();
  //   }
  // }, [isEditingName]);

  // Renaming handlers removed.
  // const handleNameSubmit = () => {
  //   if (editedName.trim() && editedName !== column.label) {
  //     onRenameColumn(column.id, editedName.trim());
  //   } else {
  //     setEditedName(column.label);
  //   }
  //   setIsEditingName(false);
  // };

  // const handleNameKeyDown = (e) => {
  //   if (e.key === 'Enter') {
  //     handleNameSubmit();
  //   } else if (e.key === 'Escape') {
  //     setEditedName(column.label);
  //     setIsEditingName(false);
  //   }
  // };

  // Calculate checklist completion for this column - This logic is removed based on the outline.
  // const proposalsWithIncompleteRequired = proposals.filter(p => {
  //   const checklistStatus = p.current_stage_checklist_status?.[column.id] || {};
  //   const checklistItems = column.checklist_items || [];
  //   return checklistItems.some(item => item.required && !checklistStatus[item.id]?.completed);
  // }).length;

  // const totalChecklistItems = column.checklist_items?.length || 0;

  const proposalCount = proposals.length; // Use proposals.length for consistency

  // Check user permissions for this column
  const currentUserRole = getUserRole(user);
  const canDragToHere = !column.can_drag_to_here_roles || column.can_drag_to_here_roles.length === 0 ||
                        column.can_drag_to_here_roles.includes(currentUserRole);
  const canDragFromHere = !column.can_drag_from_here_roles || column.can_drag_from_here_roles.length === 0 ||
                          column.can_drag_from_here_roles.includes(currentUserRole);

  // Check WIP limit status
  const wipLimit = column.wip_limit || 0; // Ensure wipLimit is always a number
  const isAtWipLimit = wipLimit > 0 && proposalCount >= wipLimit;
  const isNearWipLimit = wipLimit > 0 && proposalCount >= wipLimit * 0.8 && proposalCount < wipLimit;

  return (
    <div
      ref={provided.innerRef}
      {...provided.droppableProps}
      className={cn(
        "flex flex-col rounded-xl border-2 transition-all duration-200",
        snapshot.isDraggingOver
          ? "border-blue-400 bg-blue-50 shadow-lg scale-[1.02]"
          : "border-slate-200 bg-white shadow-md"
      )}
      style={{ minWidth: "320px", maxWidth: "320px" }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-xl">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hover:bg-white/50 p-1 rounded transition-colors"
            title={isCollapsed ? "Expand column" : "Collapse column"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-slate-600" title="Expand" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" title="Collapse" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl flex-shrink-0">{column.emoji || "📋"}</span>
              <h3 className="font-bold text-slate-900 truncate text-base">
                {column.label}
              </h3>
              {column.is_locked && (
                <Badge className="bg-purple-100 text-purple-700 text-xs flex-shrink-0">
                  <Lock className="w-3 h-3 mr-1" title="Locked phase" />
                  Locked
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600">{proposalCount}</span>

              {/* WIP Limit Indicator */}
              {wipLimit > 0 && (
                <Badge
                  className={cn(
                    "text-xs",
                    isAtWipLimit ? "bg-red-100 text-red-700" :
                    isNearWipLimit ? "bg-yellow-100 text-yellow-700" :
                    "bg-slate-100 text-slate-700"
                  )}
                >
                  WIP: {proposalCount}/{wipLimit}
                  {column.wip_limit_type === 'hard' && (
                    <AlertCircle className="w-3 h-3 ml-1 inline" title="Hard limit - blocks drag and drop" />
                  )}
                </Badge>
              )}

              {/* RBAC Indicators */}
              {!canDragFromHere && (
                <Badge className="bg-orange-100 text-orange-700 text-xs">
                  <Shield className="w-3 h-3 mr-1" title="Protected - restricted exit" />
                  Protected Exit
                </Badge>
              )}

              {column.requires_approval_to_exit && (
                <Badge className="bg-amber-100 text-amber-700 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" title="Requires approval to move out" />
                  Approval Gate
                </Badge>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
              <MoreVertical className="w-4 h-4" title="Column options" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onConfigureColumn}>
              <Settings className="w-4 h-4 mr-2" title="Configure" />
              Configure Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Column Content */}
      {!isCollapsed && (
        <div
          className="flex-1 p-3 space-y-3 overflow-y-auto"
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
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" title="No proposals" />
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
        <div className="p-4 text-center">
          <p className="text-sm text-slate-500">{proposalCount} proposals</p>
        </div>
      )}
    </div>
  );
}
