import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  MoreVertical,
  Edit2,
  Trash2,
  Settings,
  DollarSign,
  Plus,
  ChevronsLeft,
  Lock,
  TrendingUp,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  X,
  AlertCircle
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
  organization,
  onRenameColumn,
  onConfigureColumn,
  user,
  dragHandleProps,
  onCreateProposal,
  selectedProposalIds = [],
  onToggleProposalSelection
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(column.label);
  const [sortBy, setSortBy] = useState(null);

  const totalValue = proposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
  const formatValue = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const handleRename = () => {
    if (newName.trim() && newName !== column.label) {
      onRenameColumn(column.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const getUserRole = () => {
    if (!user || !organization) return 'viewer';
    if (user.role === 'admin') return 'organization_owner';
    const orgAccess = user.client_accesses?.find(
      access => access.organization_id === organization.id
    );
    return orgAccess?.role || 'viewer';
  };

  const userRole = getUserRole();
  const canDragToHere = !column.can_drag_to_here_roles || 
                        column.can_drag_to_here_roles.length === 0 || 
                        column.can_drag_to_here_roles.includes(userRole);
  const canDragFromHere = !column.can_drag_from_here_roles || 
                          column.can_drag_from_here_roles.length === 0 || 
                          column.can_drag_from_here_roles.includes(userRole);

  const isWIPLimitExceeded = column.wip_limit > 0 && proposals.length > column.wip_limit;

  return (
    <div className="flex flex-col h-full w-80 flex-shrink-0">
      {/* FIXED: Column header - no scroll */}
      <div className={cn(
        "rounded-t-xl shadow-lg overflow-hidden flex-shrink-0",
        `bg-gradient-to-r ${column.color}`
      )}>
        <div 
          {...dragHandleProps}
          className="px-4 py-3 cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center justify-between mb-2">
            {isRenaming ? (
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                className="h-8 bg-white/90"
                autoFocus
              />
            ) : (
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                {column.is_locked && <Lock className="w-4 h-4" />}
                {column.label}
              </h3>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleCollapse(column.id);
                }}
                className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded"
                title="Collapse column"
              >
                <ChevronsLeft className="w-5 h-5" />
              </button>

              {!column.is_locked && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/20 rounded">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Rename Column
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onConfigureColumn}>
                      <Settings className="w-4 h-4 mr-2" />
                      Configure Column
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-white/90 text-sm">
            <div className="flex items-center gap-1">
              <span className="font-semibold">{proposals.length}</span>
              <span>card{proposals.length !== 1 ? 's' : ''}</span>
            </div>
            {totalValue > 0 && (
              <>
                <span className="text-white/50">|</span>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-semibold">{formatValue(totalValue)}</span>
                </div>
              </>
            )}
            {column.wip_limit > 0 && (
              <>
                <span className="text-white/50">|</span>
                <div className={cn(
                  "flex items-center gap-1",
                  isWIPLimitExceeded && "text-red-300 font-bold"
                )}>
                  <span>Limit: {column.wip_limit}</span>
                  {isWIPLimitExceeded && <AlertCircle className="w-4 h-4" />}
                </div>
              </>
            )}
          </div>

          {(!canDragToHere || !canDragFromHere) && (
            <div className="mt-2 flex gap-2 text-xs">
              {!canDragToHere && (
                <Badge className="bg-red-500/80 text-white">
                  🔒 Restricted Entry
                </Badge>
              )}
              {!canDragFromHere && (
                <Badge className="bg-amber-500/80 text-white">
                  🔒 Restricted Exit
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* FIXED: Cards area - ONLY vertical scroll, no horizontal scroll */}
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className={cn(
          "flex-1 rounded-b-xl bg-white shadow-lg",
          "overflow-y-auto overflow-x-hidden",
          "p-3 space-y-3",
          snapshot.isDraggingOver && "bg-blue-50 ring-2 ring-blue-400"
        )}
        style={{
          minHeight: '200px'
        }}
      >
        {proposals.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm mb-2">No proposals</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCreateProposal?.(column)}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add proposal
            </Button>
          </div>
        ) : (
          proposals.map((proposal, index) => (
            <KanbanCard
              key={proposal.id}
              proposal={proposal}
              index={index}
              onClick={() => onCardClick(proposal)}
              organization={organization}
              isSelected={selectedProposalIds.includes(proposal.id)}
              onToggleSelection={onToggleProposalSelection}
            />
          ))
        )}
        {provided.placeholder}
      </div>
    </div>
  );
}