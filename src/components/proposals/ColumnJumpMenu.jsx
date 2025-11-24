import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ColumnJumpMenu({ 
  isOpen, 
  onClose, 
  columns, 
  currentColumnId, 
  onSelectColumn,
  userRole,
  draggedProposal 
}) {
  const handleColumnClick = (column) => {
    // Check RBAC permissions
    if (column.can_drag_to_here_roles?.length > 0) {
      if (!column.can_drag_to_here_roles.includes(userRole)) {
        return; // Can't drop here
      }
    }

    onSelectColumn(column);
    onClose();
  };

  const canDropInColumn = (column) => {
    if (column.can_drag_to_here_roles?.length > 0) {
      return column.can_drag_to_here_roles.includes(userRole);
    }
    return true;
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move to Column</DialogTitle>
          <p className="text-sm text-slate-600">
            Select a column to move "{draggedProposal?.proposal_name || 'this proposal'}" to
          </p>
        </DialogHeader>

        <div className="grid gap-2 mt-4">
          {columns.map((column) => {
            const isCurrent = column.id === currentColumnId;
            const canDrop = canDropInColumn(column);

            return (
              <Button
                key={column.id}
                onClick={() => canDrop && handleColumnClick(column)}
                variant={isCurrent ? "secondary" : "outline"}
                disabled={isCurrent || !canDrop}
                className={cn(
                  "w-full justify-between h-auto py-4 px-4",
                  !canDrop && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className={cn(
                      "w-3 h-8 rounded",
                      `bg-gradient-to-br ${column.color || 'from-gray-400 to-gray-600'}`
                    )}
                  />
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">
                      {column.label}
                    </div>
                    {column.is_locked && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        System Column
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCurrent && (
                    <Badge variant="secondary">Current</Badge>
                  )}
                  {!canDrop && (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                  {canDrop && !isCurrent && (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </Button>
            );
          })}
        </div>

        <div className="mt-4 text-xs text-slate-500 text-center">
          Press <kbd className="px-2 py-1 bg-slate-100 rounded border">J</kbd> during drag to open this menu
        </div>
      </DialogContent>
    </Dialog>
  );
}