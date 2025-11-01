import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import MobileKanbanView from "../mobile/MobileKanbanView";
import BoardConfigDialog from "./BoardConfigDialog";
import ProposalCardModal from "./ProposalCardModal";
import { Button } from "@/components/ui/button";
import { Settings, Plus, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProposalsKanban({ proposals, organization, onRefresh }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showBoardConfig, setShowBoardConfig] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { data: kanbanConfig } = useQuery({
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

  const defaultColumns = [
    { id: 'evaluating', label: 'Evaluating', color: 'from-slate-400 to-slate-600', type: 'default_status', default_status_mapping: 'evaluating' },
    { id: 'watch_list', label: 'Watch List', color: 'from-amber-400 to-amber-600', type: 'default_status', default_status_mapping: 'watch_list' },
    { id: 'draft', label: 'Draft', color: 'from-blue-400 to-blue-600', type: 'default_status', default_status_mapping: 'draft' },
    { id: 'in_progress', label: 'In Progress', color: 'from-purple-400 to-purple-600', type: 'default_status', default_status_mapping: 'in_progress' },
    { id: 'submitted', label: 'Submitted', color: 'from-indigo-400 to-indigo-600', type: 'default_status', default_status_mapping: 'submitted' },
    { id: 'won', label: 'Won', color: 'from-green-400 to-green-600', type: 'default_status', default_status_mapping: 'won' },
    { id: 'lost', label: 'Lost', color: 'from-red-400 to-red-600', type: 'default_status', default_status_mapping: 'lost' },
    { id: 'archived', label: 'Archived', color: 'from-gray-400 to-gray-600', type: 'default_status', default_status_mapping: 'archived' }
  ];

  const columns = kanbanConfig?.columns || defaultColumns;

  const effectiveCollapsedColumns = useMemo(() => {
    if (kanbanConfig?.collapsed_column_ids) {
      return kanbanConfig.collapsed_column_ids;
    }
    return collapsedColumns;
  }, [kanbanConfig?.collapsed_column_ids, collapsedColumns]);

  const toggleColumnCollapse = useCallback((columnId) => {
    setCollapsedColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );

    if (kanbanConfig?.id) {
      const newCollapsedIds = effectiveCollapsedColumns.includes(columnId)
        ? effectiveCollapsedColumns.filter(id => id !== columnId)
        : [...effectiveCollapsedColumns, columnId];
      
      base44.entities.KanbanConfig.update(kanbanConfig.id, {
        collapsed_column_ids: newCollapsedIds
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      });
    }
  }, [kanbanConfig, effectiveCollapsedColumns, queryClient]);

  const updateProposalMutation = useMutation({
    mutationFn: async ({ proposalId, updates }) => {
      return base44.entities.Proposal.update(proposalId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      if (onRefresh) onRefresh();
    }
  });

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const destinationColumn = columns.find(col => col.id === destination.droppableId);
    if (!destinationColumn) return;

    let newStatus;
    if (destinationColumn.type === 'default_status') {
      newStatus = destinationColumn.default_status_mapping;
    } else if (destinationColumn.type === 'custom_stage') {
      newStatus = 'draft';
    }

    updateProposalMutation.mutate({
      proposalId: draggableId,
      updates: {
        status: newStatus,
        custom_workflow_stage_id: destinationColumn.type === 'custom_stage' ? destinationColumn.id : null
      }
    });
  };

  const handleCardClick = (proposal) => {
    setSelectedProposal(proposal);
    setShowProposalModal(true);
  };

  const getProposalsForColumn = useCallback((column) => {
    if (column.type === 'default_status') {
      return proposals.filter(p => p.status === column.default_status_mapping);
    } else if (column.type === 'custom_stage') {
      return proposals.filter(p => p.custom_workflow_stage_id === column.id);
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
          >
            <Settings className="w-4 h-4 mr-2" />
            Configure Board
          </Button>
          <Button size="sm" onClick={handleCreateProposal}>
            <Plus className="w-4 h-4 mr-2" />
            New Proposal
          </Button>
        </div>
      </div>

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
                
                <Droppable droppableId={column.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`w-80 bg-white rounded-lg shadow-md border-2 transition-all ${
                        snapshot.isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                      }`}
                    >
                      <KanbanColumn
                        column={column}
                        proposals={columnProposals}
                        provided={provided}
                        snapshot={snapshot}
                        onCardClick={handleCardClick}
                        onToggleCollapse={toggleColumnCollapse}
                        isCollapsed={isCollapsed}
                        organization={organization}
                      />
                    </div>
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
          onClose={() => setShowBoardConfig(false)}
          organization={organization}
          currentConfig={kanbanConfig}
        />
      )}

      {showProposalModal && selectedProposal && (
        <ProposalCardModal
          proposal={selectedProposal}
          isOpen={showProposalModal}
          onClose={() => {
            setShowProposalModal(false);
            setSelectedProposal(null);
          }}
          organization={organization}
        />
      )}
    </div>
  );
}