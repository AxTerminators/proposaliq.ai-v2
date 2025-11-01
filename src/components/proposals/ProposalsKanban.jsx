
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import MobileKanbanView from "../mobile/MobileKanbanView";
import BoardConfigDialog from "./BoardConfigDialog";
import ProposalCardModal from "./ProposalCardModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Plus, ChevronsLeft, ChevronsRight, Search, X, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

export default function ProposalsKanban({ proposals, organization, onRefresh }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showBoardConfig, setShowBoardConfig] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAgency, setFilterAgency] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

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

  const addColumnMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");

      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );

      const currentConfig = configs.length > 0 ? configs[0] : null;
      const currentColumns = currentConfig?.columns || defaultColumns;

      const newColumn = {
        id: `custom_${Date.now()}`,
        label: 'New Column',
        color: 'from-blue-400 to-blue-600',
        type: 'custom_stage',
        order: currentColumns.length
      };

      const updatedColumns = [...currentColumns, newColumn];

      const configData = {
        organization_id: organization.id,
        columns: updatedColumns,
        swimlane_config: currentConfig?.swimlane_config || {
          enabled: false,
          group_by: 'none',
          custom_field_name: '',
          show_empty_swimlanes: false
        },
        view_settings: currentConfig?.view_settings || {
          default_view: 'kanban',
          show_card_details: ['assignees', 'due_date', 'progress', 'value'],
          compact_mode: false
        },
        collapsed_column_ids: currentConfig?.collapsed_column_ids || []
      };

      if (currentConfig) {
        return base44.entities.KanbanConfig.update(currentConfig.id, configData);
      } else {
        return base44.entities.KanbanConfig.create(configData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
    }
  });

  const handleAddColumn = () => {
    addColumnMutation.mutate();
  };

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
    let columnProposals = [];
    
    if (column.type === 'default_status') {
      columnProposals = proposals.filter(p => p.status === column.default_status_mapping);
    } else if (column.type === 'custom_stage') {
      columnProposals = proposals.filter(p => p.custom_workflow_stage_id === column.id);
    }

    // Apply filters
    if (searchQuery) {
      columnProposals = columnProposals.filter(p => 
        p.proposal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.solicitation_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterAgency !== "all") {
      columnProposals = columnProposals.filter(p => p.agency_name === filterAgency);
    }

    if (filterAssignee !== "all") {
      columnProposals = columnProposals.filter(p => 
        p.lead_writer_email === filterAssignee ||
        p.assigned_team_members?.includes(filterAssignee)
      );
    }

    return columnProposals;
  }, [proposals, searchQuery, filterAgency, filterAssignee]);

  const handleCreateProposal = () => {
    navigate(createPageUrl("ProposalBuilder"));
  };

  // Get unique agencies for filter
  const uniqueAgencies = useMemo(() => {
    const agencies = [...new Set(proposals.map(p => p.agency_name).filter(Boolean))];
    return agencies.sort();
  }, [proposals]);

  // Get unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set();
    proposals.forEach(p => {
      if (p.lead_writer_email) assignees.add(p.lead_writer_email);
      if (p.assigned_team_members) {
        p.assigned_team_members.forEach(email => assignees.add(email));
      }
    });
    return Array.from(assignees).sort();
  }, [proposals]);

  const activeFiltersCount = [
    searchQuery !== "",
    filterAgency !== "all",
    filterAssignee !== "all"
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAgency("all");
    setFilterAssignee("all");
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
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-2 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </span>
            )}
          </Button>
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

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-900">Filter Proposals</h3>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search proposals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Agency Filter */}
            <Select value={filterAgency} onValueChange={setFilterAgency}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Agency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agencies</SelectItem>
                {uniqueAgencies.map(agency => (
                  <SelectItem key={agency} value={agency}>{agency}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Assignee Filter */}
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Team Members</SelectItem>
                {uniqueAssignees.map(email => (
                  <SelectItem key={email} value={email}>{email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-0 overflow-x-auto pb-4">
          {columns.map((column, index) => {
            const isCollapsed = effectiveCollapsedColumns.includes(column.id);
            const columnProposals = getProposalsForColumn(column);

            return (
              <React.Fragment key={column.id}>
                {/* Add Column Button - Before First Column */}
                {index === 0 && (
                  <div className="flex-shrink-0 flex items-start justify-center px-2 pt-4">
                    <button
                      onClick={handleAddColumn}
                      className="w-10 h-10 rounded-full bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center transition-all hover:scale-125 active:scale-95 shadow-sm hover:shadow-lg group"
                      title="Add new column"
                    >
                      <Plus className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors font-bold" />
                    </button>
                  </div>
                )}

                {/* Column */}
                {isCollapsed ? (
                  <div
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
                ) : (
                  <div className="flex-shrink-0 relative">
                    <button
                      onClick={() => toggleColumnCollapse(column.id)}
                      className="absolute -left-2 top-4 z-10 w-6 h-10 bg-white rounded-l-lg shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors border-r"
                      title="Collapse column"
                    >
                      <ChevronsLeft className="w-3 h-3 text-slate-500" />
                    </button>
                    
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "w-80 bg-white rounded-lg shadow-md border-2 transition-all",
                            snapshot.isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                          )}
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
                )}

                {/* Add Column Button - Between Columns and After Last Column */}
                <div className="flex-shrink-0 flex items-start justify-center px-2 pt-4">
                  <button
                    onClick={handleAddColumn}
                    className="w-10 h-10 rounded-full bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center transition-all hover:scale-125 active:scale-95 shadow-sm hover:shadow-lg group"
                    title="Add new column"
                  >
                    <Plus className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors font-bold" />
                  </button>
                </div>
              </React.Fragment>
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
