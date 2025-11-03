import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Settings,
  Filter,
  Search,
  X,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import BoardConfigDialog from "./BoardConfigDialog";
import ProposalCardModal from "./ProposalCardModal";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// New 13-column default configuration
const DEFAULT_COLUMNS = [
  { 
    id: 'new', 
    label: 'New', 
    color: 'from-slate-400 to-slate-600', 
    type: 'locked_phase',
    phase_mapping: 'phase1',
    is_locked: true,
    order: 0,
    checklist_items: [
      { id: 'basic_info', label: 'Add Basic Information', type: 'modal_trigger', associated_action: 'open_modal_phase1', required: true, order: 0 },
      { id: 'name_solicitation', label: 'Name & Solicitation #', type: 'manual_check', required: true, order: 1 }
    ]
  },
  { 
    id: 'evaluate', 
    label: 'Evaluate', 
    color: 'from-blue-400 to-blue-600', 
    type: 'locked_phase',
    phase_mapping: 'phase1',
    is_locked: true,
    order: 1,
    checklist_items: [
      { id: 'identify_prime', label: 'Identify Prime Contractor', type: 'modal_trigger', associated_action: 'open_modal_phase1', required: true, order: 0 },
      { id: 'add_partners', label: 'Add Teaming Partners', type: 'manual_check', required: false, order: 1 }
    ]
  },
  { 
    id: 'qualify', 
    label: 'Qualify', 
    color: 'from-cyan-400 to-cyan-600', 
    type: 'locked_phase',
    phase_mapping: 'phase3',
    is_locked: true,
    order: 2,
    checklist_items: [
      { id: 'solicitation_details', label: 'Enter Solicitation Details', type: 'modal_trigger', associated_action: 'open_modal_phase3', required: true, order: 0 },
      { id: 'contract_value', label: 'Add Contract Value', type: 'system_check', required: true, order: 1 },
      { id: 'due_date', label: 'Set Due Date', type: 'system_check', required: true, order: 2 }
    ]
  },
  { 
    id: 'gather', 
    label: 'Gather', 
    color: 'from-teal-400 to-teal-600', 
    type: 'locked_phase',
    phase_mapping: 'phase2',
    is_locked: true,
    order: 3,
    checklist_items: [
      { id: 'upload_solicitation', label: 'Upload Solicitation Document', type: 'modal_trigger', associated_action: 'open_modal_phase2', required: true, order: 0 },
      { id: 'reference_docs', label: 'Add Reference Documents', type: 'modal_trigger', associated_action: 'open_modal_phase2', required: false, order: 1 }
    ]
  },
  { 
    id: 'analyze', 
    label: 'Analyze', 
    color: 'from-green-400 to-green-600', 
    type: 'locked_phase',
    phase_mapping: 'phase3',
    is_locked: true,
    order: 4,
    checklist_items: [
      { id: 'run_ai_analysis', label: 'Run AI Compliance Analysis', type: 'ai_trigger', associated_action: 'run_ai_analysis_phase3', required: true, order: 0 },
      { id: 'review_requirements', label: 'Review Compliance Requirements', type: 'manual_check', required: true, order: 1 }
    ]
  },
  { 
    id: 'strategy', 
    label: 'Strategy', 
    color: 'from-lime-400 to-lime-600', 
    type: 'locked_phase',
    phase_mapping: 'phase4',
    is_locked: true,
    order: 5,
    checklist_items: [
      { id: 'run_evaluation', label: 'Run Strategic Evaluation', type: 'ai_trigger', associated_action: 'run_evaluation_phase4', required: true, order: 0 },
      { id: 'go_no_go', label: 'Make Go/No-Go Decision', type: 'manual_check', required: true, order: 1 },
      { id: 'competitor_analysis', label: 'Complete Competitor Analysis', type: 'modal_trigger', associated_action: 'open_modal_phase4', required: false, order: 2 }
    ]
  },
  { 
    id: 'outline', 
    label: 'Outline', 
    color: 'from-yellow-400 to-yellow-600', 
    type: 'locked_phase',
    phase_mapping: 'phase5',
    is_locked: true,
    order: 6,
    checklist_items: [
      { id: 'select_sections', label: 'Select Proposal Sections', type: 'modal_trigger', associated_action: 'open_modal_phase5', required: true, order: 0 },
      { id: 'generate_win_themes', label: 'Generate Win Themes', type: 'ai_trigger', associated_action: 'generate_win_themes_phase5', required: false, order: 1 },
      { id: 'set_strategy', label: 'Set Writing Strategy', type: 'modal_trigger', associated_action: 'open_modal_phase5', required: true, order: 2 }
    ]
  },
  { 
    id: 'drafting', 
    label: 'Drafting', 
    color: 'from-orange-400 to-orange-600', 
    type: 'locked_phase',
    phase_mapping: 'phase6',
    is_locked: true,
    order: 7,
    checklist_items: [
      { id: 'start_writing', label: 'Start Content Generation', type: 'modal_trigger', associated_action: 'open_modal_phase6', required: true, order: 0 },
      { id: 'complete_sections', label: 'Complete All Sections', type: 'system_check', required: true, order: 1 }
    ]
  },
  { 
    id: 'review', 
    label: 'Review', 
    color: 'from-amber-400 to-amber-600', 
    type: 'locked_phase',
    phase_mapping: 'phase7',
    is_locked: true,
    order: 8,
    checklist_items: [
      { id: 'internal_review', label: 'Complete Internal Review', type: 'manual_check', required: true, order: 0 },
      { id: 'red_team', label: 'Conduct Red Team Review', type: 'modal_trigger', associated_action: 'open_red_team_review', required: false, order: 1 }
    ]
  },
  { 
    id: 'final', 
    label: 'Final', 
    color: 'from-rose-400 to-rose-600', 
    type: 'locked_phase',
    phase_mapping: 'phase7',
    is_locked: true,
    order: 9,
    checklist_items: [
      { id: 'readiness_check', label: 'Run Submission Readiness Check', type: 'ai_trigger', associated_action: 'run_readiness_check_phase7', required: true, order: 0 },
      { id: 'final_review', label: 'Final Executive Review', type: 'manual_check', required: true, order: 1 }
    ],
    requires_approval_to_exit: true,
    approver_roles: ['organization_owner', 'proposal_manager']
  },
  { 
    id: 'submitted', 
    label: 'Submitted', 
    color: 'from-indigo-400 to-indigo-600', 
    type: 'default_status', 
    default_status_mapping: 'submitted',
    is_locked: true,
    order: 10,
    checklist_items: []
  },
  { 
    id: 'won', 
    label: 'Won', 
    color: 'from-green-500 to-emerald-600', 
    type: 'default_status', 
    default_status_mapping: 'won',
    is_locked: true,
    order: 11,
    checklist_items: []
  },
  { 
    id: 'lost', 
    label: 'Lost', 
    color: 'from-red-400 to-red-600', 
    type: 'default_status', 
    default_status_mapping: 'lost',
    is_locked: true,
    order: 12,
    checklist_items: []
  },
  { 
    id: 'archived', 
    label: 'Archive', 
    color: 'from-gray-400 to-gray-600', 
    type: 'default_status', 
    default_status_mapping: 'archived',
    is_locked: true,
    order: 13,
    checklist_items: []
  }
];

export default function ProposalsKanban({ proposals, organization, onRefresh }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const boardRef = useRef(null);
  
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAgency, setFilterAgency] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [showBoardConfig, setShowBoardConfig] = useState(false);
  const [columnSorts, setColumnSorts] = useState({});
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // Fetch kanban config
  const { data: kanbanConfig } = useQuery({
    queryKey: ['kanban-config', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );
      
      // If no config exists, create one with default 13-column structure
      if (configs.length === 0) {
        const newConfig = await base44.entities.KanbanConfig.create({
          organization_id: organization.id,
          columns: DEFAULT_COLUMNS,
          collapsed_column_ids: [],
          view_settings: {
            default_view: 'kanban',
            show_card_details: ['assignees', 'due_date', 'progress', 'value', 'tasks', 'discussions', 'files'],
            compact_mode: false
          }
        });
        return newConfig;
      }
      
      return configs[0];
    },
    enabled: !!organization?.id
  });

  const columns = kanbanConfig?.columns || DEFAULT_COLUMNS;
  const effectiveCollapsedColumns = kanbanConfig?.collapsed_column_ids || [];

  const toggleColumnCollapse = async (columnId) => {
    if (!kanbanConfig) return;
    
    const currentCollapsed = kanbanConfig.collapsed_column_ids || [];
    const newCollapsed = currentCollapsed.includes(columnId)
      ? currentCollapsed.filter(id => id !== columnId)
      : [...currentCollapsed, columnId];
    
    await base44.entities.KanbanConfig.update(kanbanConfig.id, {
      collapsed_column_ids: newCollapsed
    });
    
    queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoomLevel(1);

  useEffect(() => {
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    };

    const board = boardRef.current;
    if (board) {
      board.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (board) {
        board.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  const uniqueAgencies = useMemo(() => {
    const agencies = proposals
      .map(p => p.agency_name)
      .filter(Boolean);
    return [...new Set(agencies)].sort();
  }, [proposals]);

  const uniqueAssignees = useMemo(() => {
    const assignees = proposals
      .flatMap(p => p.assigned_team_members || [])
      .filter(Boolean);
    return [...new Set(assignees)].sort();
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    return proposals.filter(proposal => {
      const matchesSearch = !searchQuery || 
        proposal.proposal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.project_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proposal.solicitation_number?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesAgency = filterAgency === "all" || proposal.agency_name === filterAgency;
      
      const matchesAssignee = filterAssignee === "all" || 
        (proposal.assigned_team_members || []).includes(filterAssignee);
      
      return matchesSearch && matchesAgency && matchesAssignee;
    });
  }, [proposals, searchQuery, filterAgency, filterAssignee]);

  const getProposalsForColumn = (column) => {
    let columnProposals = [];
    
    if (column.type === 'default_status') {
      columnProposals = filteredProposals.filter(p => p.status === column.default_status_mapping);
    } else if (column.type === 'custom_stage') {
      columnProposals = filteredProposals.filter(p => p.custom_workflow_stage_id === column.id);
    } else if (column.type === 'locked_phase') {
      columnProposals = filteredProposals.filter(p => p.current_phase === column.phase_mapping);
    }

    const sort = columnSorts[column.id];
    if (sort) {
      columnProposals = [...columnProposals].sort((a, b) => {
        if (sort.by === 'name') {
          return sort.direction === 'asc' 
            ? a.proposal_name.localeCompare(b.proposal_name)
            : b.proposal_name.localeCompare(a.proposal_name);
        } else if (sort.by === 'due_date') {
          const dateA = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
          const dateB = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
          return sort.direction === 'asc' ? dateA - dateB : dateB - dateA;
        } else if (sort.by === 'created_date') {
          return sort.direction === 'asc'
            ? new Date(a.created_date) - new Date(b.created_date)
            : new Date(b.created_date) - new Date(a.created_date);
        }
        return 0;
      });
    } else {
      columnProposals = [...columnProposals].sort((a, b) => {
        const orderA = a.manual_order ?? 999999;
        const orderB = b.manual_order ?? 999999;
        return orderA - orderB;
      });
    }

    return columnProposals;
  };

  const handleColumnSortChange = (columnId, sortBy) => {
    setColumnSorts(prev => {
      const current = prev[columnId];
      if (current?.by === sortBy) {
        return {
          ...prev,
          [columnId]: { by: sortBy, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        };
      } else {
        return {
          ...prev,
          [columnId]: { by: sortBy, direction: 'asc' }
        };
      }
    });
  };

  const handleClearColumnSort = (columnId) => {
    setColumnSorts(prev => {
      const newSorts = { ...prev };
      delete newSorts[columnId];
      return newSorts;
    });
  };

  const updateProposalMutation = useMutation({
    mutationFn: async ({ proposalId, updates }) => {
      return base44.entities.Proposal.update(proposalId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  const handleDragStart = (start) => {
    // Track when drag starts
  };

  const handleDragUpdate = (update) => {
    if (update.destination) {
      setDragOverColumnId(update.destination.droppableId);
    } else {
      setDragOverColumnId(null);
    }
  };

  const handleDragEnd = async (result) => {
    setDragOverColumnId(null);
    
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceColumn = columns.find(c => c.id === source.droppableId);
    const destColumn = columns.find(c => c.id === destination.droppableId);
    
    const updates = {};
    
    // Update based on destination column type
    if (destColumn.type === 'default_status') {
      updates.status = destColumn.default_status_mapping;
      updates.custom_workflow_stage_id = null;
    } else if (destColumn.type === 'custom_stage') {
      updates.custom_workflow_stage_id = destColumn.id;
    } else if (destColumn.type === 'locked_phase') {
      updates.current_phase = destColumn.phase_mapping;
    }

    const destProposals = getProposalsForColumn(destColumn);
    const reorderedProposals = Array.from(destProposals);
    const movedProposal = proposals.find(p => p.id === draggableId);
    
    if (source.droppableId === destination.droppableId) {
      const originalIndexInColumn = reorderedProposals.findIndex(p => p.id === draggableId);
      if (originalIndexInColumn !== -1) {
        reorderedProposals.splice(originalIndexInColumn, 1);
      }
    }
    
    reorderedProposals.splice(destination.index, 0, movedProposal);

    await updateProposalMutation.mutateAsync({ 
      proposalId: draggableId, 
      updates: { ...updates, manual_order: destination.index } 
    });

    const updatesToBatch = [];
    for (let i = 0; i < reorderedProposals.length; i++) {
      if (reorderedProposals[i].id !== draggableId && reorderedProposals[i].manual_order !== i) {
        updatesToBatch.push({
          proposalId: reorderedProposals[i].id,
          updates: { manual_order: i }
        });
      }
    }

    if (updatesToBatch.length > 0) {
      await Promise.all(updatesToBatch.map(item => updateProposalMutation.mutateAsync(item)));
    }

    queryClient.invalidateQueries({ queryKey: ['proposals'] });
  };

  const handleCardClick = (proposal) => {
    setSelectedProposal(proposal);
    setShowProposalModal(true);
  };

  const handleCreateProposal = () => {
    navigate(createPageUrl("ProposalBuilder"));
  };

  const handleAddColumn = async (insertIndex) => {
    if (!kanbanConfig) {
      alert("Please configure your board first using the 'Configure Board' button");
      return;
    }

    const newColumnId = `custom_${Date.now()}`;
    const newColumn = {
      id: newColumnId,
      label: `New Stage ${columns.length + 1}`,
      color: 'from-gray-400 to-gray-600',
      type: 'custom_stage',
      order: insertIndex,
      checklist_items: []
    };

    const updatedColumns = [...columns];
    updatedColumns.splice(insertIndex, 0, newColumn);

    updatedColumns.forEach((col, idx) => {
      col.order = idx;
    });

    await base44.entities.KanbanConfig.update(kanbanConfig.id, {
      columns: updatedColumns
    });

    queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
  };

  const handleDeleteColumn = async (columnId) => {
    if (!kanbanConfig) return;

    const columnToDelete = columns.find(c => c.id === columnId);
    if (!columnToDelete || columnToDelete.is_locked) {
      return;
    }

    const proposalsInColumn = proposals.filter(p => p.custom_workflow_stage_id === columnId);
    
    if (proposalsInColumn.length > 0) {
      alert(`Cannot delete column "${columnToDelete.label}" because it contains ${proposalsInColumn.length} proposals. Please move them to another column first.`);
      return;
    }

    const updatedColumns = columns.filter(c => c.id !== columnId);
    
    updatedColumns.forEach((col, idx) => {
      col.order = idx;
    });

    await base44.entities.KanbanConfig.update(kanbanConfig.id, {
      columns: updatedColumns
    });

    queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
  };

  const handleRenameColumn = async (columnId, newLabel) => {
    if (!kanbanConfig) return;

    const updatedColumns = columns.map(col => 
      col.id === columnId ? { ...col, label: newLabel } : col
    );

    await base44.entities.KanbanConfig.update(kanbanConfig.id, {
      columns: updatedColumns
    });

    queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAgency("all");
    setFilterAssignee("all");
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filterAgency !== "all") count++;
    if (filterAssignee !== "all") count++;
    return count;
  }, [searchQuery, filterAgency, filterAssignee]);

  return (
    <>
      <div className="flex-shrink-0 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 pl-[30px]">
            <Button
              onClick={handleCreateProposal}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
              title="Create a new proposal"
            >
              <Plus className="w-4 h-4 mr-2" title="New proposal" />
              Start New Proposal
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-0.5 border rounded-lg bg-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="h-8 w-8 p-0"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" title="Zoom out" />
              </Button>
              <button
                onClick={handleZoomReset}
                className="px-2 h-8 text-xs font-medium text-slate-600 hover:text-slate-900 min-w-[3rem] flex items-center justify-center"
                title="Reset zoom to 100%"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 2}
                className="h-8 w-8 p-0"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" title="Zoom in" />
              </Button>
            </div>

            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              title={showFilters ? "Hide filters" : "Show filters"}
            >
              <Filter className="w-4 h-4 mr-2" title="Filter" />
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
              title="Configure board columns and settings"
            >
              <Settings className="w-4 h-4 mr-2" title="Settings" />
              Configure Board
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-900">Filter Proposals</h3>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  title="Clear all active filters"
                >
                  <X className="w-4 h-4 mr-1" title="Clear" />
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" title="Search" />
                <Input
                  placeholder="Search proposals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  title="Search by name, title, or solicitation number"
                />
              </div>

              <Select value={filterAgency} onValueChange={setFilterAgency}>
                <SelectTrigger title="Filter by agency">
                  <SelectValue placeholder="Filter by Agency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agencies</SelectItem>
                  {uniqueAgencies.map(agency => (
                    <SelectItem key={agency} value={agency}>{agency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger title="Filter by team member">
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

        {zoomLevel !== 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700 text-center">
            💡 Tip: Hold Ctrl/Cmd and scroll to zoom, or use the zoom controls above
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div ref={boardRef} className="h-full overflow-x-auto overflow-y-visible px-6">
          <DragDropContext 
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
            onDragUpdate={handleDragUpdate}
          >
            <div 
              className="flex gap-0 pb-4 pt-4 h-full"
              style={{ 
                zoom: zoomLevel,
                minWidth: 'min-content'
              }}
            >
              {columns.map((column, index) => {
                const isCollapsed = effectiveCollapsedColumns.includes(column.id);
                const columnProposals = getProposalsForColumn(column);
                const columnSort = columnSorts[column.id];
                const dragOverColor = dragOverColumnId === column.id ? column.color : null;

                return (
                  <React.Fragment key={column.id}>
                    {index === 0 && (
                      <div className="flex-shrink-0 flex items-start justify-center w-3 relative z-50" style={{ top: '-12px' }}>
                        <button
                          onClick={() => handleAddColumn(0)}
                          className="w-6 h-6 rounded-full bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center transition-all hover:scale-125 active:scale-95 shadow-sm hover:shadow-lg group"
                          title="Add new column before this one"
                        >
                          <Plus className="w-3 h-3 text-slate-500 group-hover:text-blue-600 transition-colors font-bold" title="Add column" />
                        </button>
                      </div>
                    )}

                    {isCollapsed ? (
                      <div
                        className="flex-shrink-0 w-10 bg-gradient-to-b from-slate-100 to-slate-200 rounded-lg shadow-md flex flex-col items-center justify-between py-3 px-1 cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => toggleColumnCollapse(column.id)}
                        title={`Expand ${column.label} column`}
                      >
                        <div 
                          className="text-xs font-semibold text-slate-700 whitespace-nowrap"
                          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        >
                          {column.label}
                        </div>
                        <div className="mt-2 px-1.5 py-0.5 bg-white rounded-full text-xs font-bold text-slate-600">
                          {columnProposals.length}
                        </div>
                        <ChevronsRight className="w-3 h-3 text-slate-500 mt-2" title="Expand" />
                      </div>
                    ) : (
                      <Droppable droppableId={column.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "w-80 h-full bg-white rounded-lg shadow-md border-2 transition-all flex-shrink-0",
                              snapshot.isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                            )}
                          >
                            <KanbanColumn
                              column={column}
                              proposals={columnProposals.map(proposal => ({
                                ...proposal,
                                __dragOverColumnColor: dragOverColor
                              }))}
                              provided={provided}
                              snapshot={snapshot}
                              onCardClick={handleCardClick}
                              onToggleCollapse={toggleColumnCollapse}
                              isCollapsed={isCollapsed}
                              organization={organization}
                              columnSort={columnSort}
                              onSortChange={(sortBy) => handleColumnSortChange(column.id, sortBy)}
                              onClearSort={() => handleClearColumnSort(column.id)}
                              onDeleteColumn={handleDeleteColumn}
                              onRenameColumn={handleRenameColumn}
                              dragOverColumnColor={dragOverColor}
                              kanbanConfig={kanbanConfig}
                            />
                          </div>
                        )}
                      </Droppable>
                    )}

                    <div className="flex-shrink-0 flex items-start justify-center w-3 relative z-50" style={{ top: '-12px' }}>
                      <button
                        onClick={() => handleAddColumn(index + 1)}
                        className="w-6 h-6 rounded-full bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center transition-all hover:scale-125 active:scale-95 shadow-sm hover:shadow-lg group"
                        title="Add new column after this one"
                      >
                        <Plus className="w-3 h-3 text-slate-500 group-hover:text-blue-600 transition-colors font-bold" title="Add column" />
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      </div>

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
          kanbanConfig={kanbanConfig}
        />
      )}
    </>
  );
}