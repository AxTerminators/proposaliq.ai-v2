
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Settings, Plus, ChevronsLeft, ChevronsRight, Loader2, AlertTriangle, Trash2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanColumn from "./KanbanColumn";
import MobileKanbanView from "../mobile/MobileKanbanView";
import BoardConfigDialog from "./BoardConfigDialog";
import ProposalCardModal from "./ProposalCardModal";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment"; // Keep moment as it might be used internally by other components or future features

const defaultColumns = [
  { id: 'evaluating', label: 'Evaluating', color: 'bg-blue-100', order: 0, type: 'default_status', default_status_mapping: 'evaluating', wip_limit: 0, wip_limit_type: 'soft' },
  { id: 'watch_list', label: 'Watch List', color: 'bg-yellow-100', order: 1, type: 'default_status', default_status_mapping: 'watch_list', wip_limit: 0, wip_limit_type: 'soft' },
  { id: 'draft', label: 'Draft', color: 'bg-slate-100', order: 2, type: 'default_status', default_status_mapping: 'draft', wip_limit: 0, wip_limit_type: 'soft' },
  { id: 'in_progress', label: 'In Review', color: 'bg-purple-100', order: 3, type: 'default_status', default_status_mapping: 'in_progress', wip_limit: 5, wip_limit_type: 'soft' },
  { id: 'submitted', label: 'Submitted', color: 'bg-indigo-100', order: 4, type: 'default_status', default_status_mapping: 'submitted', wip_limit: 0, wip_limit_type: 'soft' },
  { id: 'won', label: 'Won', color: 'bg-green-100', order: 5, type: 'default_status', default_status_mapping: 'won', wip_limit: 0, wip_limit_type: 'soft' },
  { id: 'lost', label: 'Lost', color: 'bg-red-100', order: 6, type: 'default_status', default_status_mapping: 'lost', wip_limit: 0, wip_limit_type: 'soft' },
  { id: 'archived', label: 'Archived', color: 'bg-slate-100', order: 7, type: 'default_status', default_status_mapping: 'archived', wip_limit: 0, wip_limit_type: 'soft' }
];

// New defaultColumns based on outline (different color classes, removed order/wip_limit)
const outlineDefaultColumns = [
  { id: 'evaluating', label: 'Evaluating', color: 'from-slate-400 to-slate-600', type: 'default_status', default_status_mapping: 'evaluating' },
  { id: 'watch_list', label: 'Watch List', color: 'from-amber-400 to-amber-600', type: 'default_status', default_status_mapping: 'watch_list' },
  { id: 'draft', label: 'Draft', color: 'from-blue-400 to-blue-600', type: 'default_status', default_status_mapping: 'draft' },
  { id: 'in_progress', label: 'In Progress', color: 'from-purple-400 to-purple-600', type: 'default_status', default_status_mapping: 'in_progress' },
  { id: 'submitted', label: 'Submitted', color: 'from-indigo-400 to-indigo-600', type: 'default_status', default_status_mapping: 'submitted' },
  { id: 'won', label: 'Won', color: 'from-green-400 to-green-600', type: 'default_status', default_status_mapping: 'won' },
  { id: 'lost', label: 'Lost', color: 'from-red-400 to-red-600', type: 'default_status', default_status_mapping: 'lost' },
  { id: 'archived', label: 'Archived', color: 'from-gray-400 to-gray-600', type: 'default_status', default_status_mapping: 'archived' }
];


export default function ProposalsKanban({ proposals = [], organization, onRefresh }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Changed from 1024 to 768
  const [showBoardConfig, setShowBoardConfig] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState([]); // This state is now managed by the config
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);

  // Remaining state variables from original code that are still needed for dialogs
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showResetWarning, setShowResetWarning] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Changed from 1024 to 768
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: kanbanConfigData } = useQuery({
    queryKey: ['kanban-config', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );
      return configs.length > 0 ? configs[0] : null;
    },
    enabled: !!organization?.id,
    initialData: null
  });

  const columns = useMemo(() => {
    if (kanbanConfigData?.columns) {
      // Ensure existing columns have the new 'order' property for dnd if not present
      return kanbanConfigData.columns.map((col, idx) => ({ ...col, order: col.order ?? idx })).sort((a,b) => a.order - b.order);
    }
    // For initial load, if no config, use the outlineDefaultColumns for desktop view, but ensure order is set.
    // The original defaultColumns have more properties which are useful, so merging outline changes into them.
    return outlineDefaultColumns.map((outlineCol, idx) => {
      const existingCol = defaultColumns.find(dc => dc.id === outlineCol.id);
      return {
        ...existingCol, // retain existing properties like wip_limit if present
        ...outlineCol, // override with new color and ensure type/default_status_mapping
        order: existingCol?.order ?? idx, // Keep existing order or assign new
      };
    }).sort((a,b) => a.order - b.order);
  }, [kanbanConfigData]);

  const effectiveCollapsedColumns = useMemo(() => {
    if (kanbanConfigData?.collapsed_column_ids) {
      return kanbanConfigData.collapsed_column_ids;
    }
    return []; // Default to empty array if no config or property exists
  }, [kanbanConfigData?.collapsed_column_ids]);

  const updateKanbanConfigMutation = useMutation({
    mutationFn: async (updatedConfig) => {
      if (!organization?.id) throw new Error("No organization");

      if (kanbanConfigData?.id) {
        return base44.entities.KanbanConfig.update(kanbanConfigData.id, updatedConfig);
      } else {
        return base44.entities.KanbanConfig.create(updatedConfig);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
    }
  });


  const toggleColumnCollapse = useCallback((columnId) => {
    const newCollapsedIds = effectiveCollapsedColumns.includes(columnId)
      ? effectiveCollapsedColumns.filter(id => id !== columnId)
      : [...effectiveCollapsedColumns, columnId];
    
    updateKanbanConfigMutation.mutate({
      organization_id: organization.id,
      columns: columns.map((col, idx) => ({ ...col, order: idx })), // Ensure current column order is saved
      collapsed_column_ids: newCollapsedIds,
      swimlane_config: kanbanConfigData?.swimlane_config || { enabled: false, group_by: 'none' },
      view_settings: kanbanConfigData?.view_settings || { default_view: 'kanban', show_card_details: ['assignees', 'due_date', 'progress', 'value'], compact_mode: false }
    });
  }, [columns, effectiveCollapsedColumns, kanbanConfigData, organization.id, updateKanbanConfigMutation]);

  const updateProposalMutation = useMutation({
    mutationFn: async ({ proposalId, updates }) => {
      return base44.entities.Proposal.update(proposalId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      if (onRefresh) onRefresh();
    }
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (proposalId) => {
      return base44.entities.Proposal.delete(proposalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      if (onRefresh) onRefresh();
      setShowDeleteWarning(false);
      setProposalToDelete(null);
    }
  });

  const resetToDefaultMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");

      const configData = {
        organization_id: organization.id,
        columns: outlineDefaultColumns.map((col, idx) => ({ ...col, order: idx })), // Use the outline's default columns
        collapsed_column_ids: [],
        swimlane_config: { enabled: false, group_by: 'none' },
        view_settings: { default_view: 'kanban', show_card_details: ['assignees', 'due_date', 'progress', 'value'], compact_mode: false }
      };

      if (kanbanConfigData?.id) {
        return base44.entities.KanbanConfig.update(kanbanConfigData.id, configData);
      } else {
        return base44.entities.KanbanConfig.create(configData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] }); // Invalidate proposals as their column might change
      setShowResetWarning(false);
      if (onRefresh) onRefresh();
    }
  });


  const handleDragEnd = (result) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'column') {
      // Column reordering logic (kept from original code but not in outline's dragEnd)
      // If column reordering is desired, it would be implemented here,
      // but the outline only refers to proposal dragging in handleDragEnd.
      // For now, removing it to match outline's intent.
      // If needed, it would look like:
      // const newColumns = Array.from(columns);
      // const [removed] = newColumns.splice(source.index, 1);
      // newColumns.splice(destination.index, 0, removed);
      // const updatedColumns = newColumns.map((col, idx) => ({ ...col, order: idx }));
      // updateKanbanConfigMutation.mutate({ ...kanbanConfigData, columns: updatedColumns });
      return;
    }

    if (type === 'proposal') {
      const draggedProposal = proposals.find(p => p.id === draggableId);
      if (!draggedProposal) {
        console.error("Dragged proposal not found:", draggableId);
        return;
      }

      const destinationColumn = columns.find(col => col.id === destination.droppableId);
      if (!destinationColumn) return;

      // WIP Limit check (re-introduced from original for safety, as outline didn't specify removal)
      const proposalsInDestColumnBeforeMove = proposals.filter(p => {
        const isInDest = destinationColumn.type === 'default_status'
          ? p?.status === destinationColumn.default_status_mapping && !p?.custom_workflow_stage_id
          : p?.custom_workflow_stage_id === destinationColumn.id;
        
        return isInDest && p.id !== draggedProposal.id;
      });

      const wipLimit = destinationColumn.wip_limit || 0;
      const wipLimitType = destinationColumn.wip_limit_type || 'soft';
      const hasHardLimit = wipLimit > 0 && wipLimitType === 'hard';

      if (hasHardLimit && proposalsInDestColumnBeforeMove.length >= wipLimit) {
        alert(`Cannot move proposal. Hard WIP limit of ${wipLimit} reached for "${destinationColumn.label}" column.`);
        return;
      }

      let updates = {};
      if (destinationColumn.type === 'default_status') {
        updates = {
          status: destinationColumn.default_status_mapping,
          custom_workflow_stage_id: null
        };
      } else {
        // If moving to a custom column, status should typically be 'in_progress' or a suitable default
        updates = {
          custom_workflow_stage_id: destinationColumn.id,
          status: 'in_progress' // Assuming custom stages imply 'in_progress'
        };
      }

      updateProposalMutation.mutate({
        proposalId: draggableId,
        updates
      });
    }
  };

  const handleCardClick = (proposal) => {
    setSelectedProposal(proposal);
    setShowProposalModal(true);
  };

  const handleDeleteProposal = (proposal) => {
    setProposalToDelete(proposal);
    setShowDeleteWarning(true);
  };

  const confirmDelete = () => {
    if (proposalToDelete) {
      deleteProposalMutation.mutate(proposalToDelete.id);
    }
  };

  const handleResetToDefault = () => {
    setShowResetWarning(true);
  };

  const confirmReset = () => {
    resetToDefaultMutation.mutate();
  };

  const getProposalsForColumn = useCallback((column) => {
    if (column.type === 'default_status') {
      return proposals.filter(p =>
        p?.status === column.default_status_mapping && !p?.custom_workflow_stage_id
      );
    } else if (column.type === 'custom_stage') {
      return proposals.filter(p =>
        p?.custom_workflow_stage_id === column.id
      );
    }
    return [];
  }, [proposals]);

  const handleCreateProposal = () => {
    navigate(createPageUrl("ProposalBuilder"));
  };

  if (isMobile) {
    return (
      <MobileKanbanView
        proposals={proposals}
        columns={columns}
        organization={organization}
        onCardClick={handleCardClick}
        onCreateProposal={handleCreateProposal}
        onDeleteProposal={handleDeleteProposal} // Pass delete handler to mobile view
        onRefresh={onRefresh} // Pass refresh handler to mobile view
        kanbanConfig={kanbanConfigData} // Pass config to mobile view if needed
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Proposal Pipeline</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBoardConfig(true)}
            disabled={updateKanbanConfigMutation.isPending || resetToDefaultMutation.isPending}
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure Board
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
            disabled={resetToDefaultMutation.isPending || updateKanbanConfigMutation.isPending}
          >
            {resetToDefaultMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Reset to Default
          </Button>
          <Button size="sm" onClick={handleCreateProposal}>
            <Plus className="w-4 h-4 mr-2" />
            New Proposal
          </Button>
        </div>
      </div>

      <AlertDialog open={showResetWarning} onOpenChange={setShowResetWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Reset Kanban Board to Default?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will reset your Kanban board configuration. All customizations will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReset}
              className="bg-red-600 hover:bg-red-700"
              disabled={resetToDefaultMutation.isPending}
            >
              {resetToDefaultMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset to Default'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Permanently Delete Proposal?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to permanently delete: <strong>{proposalToDelete?.proposal_name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteProposalMutation.isPending}
            >
              {deleteProposalMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const isCollapsed = effectiveCollapsedColumns.includes(column.id);
            const columnProposals = getProposalsForColumn(column);

            if (isCollapsed) {
              return (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-16 bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg shadow-md flex flex-col items-center justify-between p-2 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => toggleColumnCollapse(column.id)}
                >
                  <div className="writing-mode-vertical text-sm font-semibold text-slate-700 whitespace-nowrap">
                    {column.label}
                  </div>
                  <div className="mt-2 px-2 py-1 bg-white rounded-full text-xs font-bold text-slate-600">
                    {columnProposals.length}
                  </div>
                  <ChevronsRight className="w-4 h-4 text-slate-500 mt-2" />
                </div>
              );
            }

            return (
              <div key={column.id} className="flex-shrink-0 relative">
                <button
                  onClick={() => toggleColumnCollapse(column.id)}
                  className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-6 h-12 bg-white rounded-l-lg shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors border-r"
                  title="Collapse column"
                >
                  <ChevronsLeft className="w-4 h-4 text-slate-500" />
                </button>
                
                <Droppable droppableId={column.id} type="proposal">
                  {(provided, snapshot) => (
                    <KanbanColumn
                      column={column}
                      proposals={columnProposals}
                      provided={provided}
                      snapshot={snapshot}
                      onCardClick={handleCardClick}
                      onDeleteProposal={handleDeleteProposal}
                      organization={organization}
                      // Pass down other required props if KanbanColumn needs them for filtering/sorting/etc.
                      boardConfig={kanbanConfigData}
                    />
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {showBoardConfig && (
        <BoardConfigDialog
          isOpen={showBoardConfig}
          onClose={() => {
            setShowBoardConfig(false);
            queryClient.invalidateQueries({ queryKey: ['kanban-config'] }); // Re-fetch config when dialog closes
            queryClient.invalidateQueries({ queryKey: ['proposals'] }); // Re-fetch proposals in case swimlanes changed
          }}
          organization={organization}
          currentConfig={kanbanConfigData} // Pass the data from useQuery
        />
      )}

      {showProposalModal && selectedProposal && (
        <ProposalCardModal
          proposal={selectedProposal}
          isOpen={showProposalModal}
          onClose={() => {
            setShowProposalModal(false);
            setSelectedProposal(null);
            queryClient.invalidateQueries({ queryKey: ['proposals'] }); // Invalidate to reflect any changes made in modal
            if (onRefresh) onRefresh();
          }}
          organization={organization}
          kanbanConfig={kanbanConfigData} // Pass the board config
        />
      )}
    </div>
  );
}
