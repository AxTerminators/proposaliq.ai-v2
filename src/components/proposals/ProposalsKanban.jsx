
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Plus, Loader2, RotateCcw, GripVertical, AlertTriangle, Trash2, Sliders, Search, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanColumn from "./KanbanColumn";
import BoardConfigDialog from "./BoardConfigDialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import moment from "moment"; // Import moment for date calculations

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

export default function ProposalsKanban({ proposals = [], onProposalClick, isLoading, user, organization }) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState(defaultColumns);
  const [columnConfig, setColumnConfig] = useState(defaultColumns);
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [showBoardConfig, setShowBoardConfig] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("bg-blue-100");
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState([]);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  const [quickAddPosition, setQuickAddPosition] = useState(null);
  const [quickColumnName, setQuickColumnName] = useState("");
  const [quickColumnColor, setQuickColumnColor] = useState("bg-blue-100");
  const [columnSorts, setColumnSorts] = useState({});
  const [showColumnDeleteWarning, setShowColumnDeleteWarning] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState(null);
  const [columnDeleteError, setColumnDeleteError] = useState(null);
  const [boardConfig, setBoardConfig] = useState(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDueDate, setFilterDueDate] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Load saved config on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (!organization?.id) return;

      try {
        const configs = await base44.entities.KanbanConfig.filter(
          { organization_id: organization.id },
          '-created_date',
          1
        );

        if (configs.length > 0) {
          if (configs[0].columns) {
            const savedColumns = configs[0].columns.sort((a, b) => a.order - b.order);
            setColumns(savedColumns);
            setColumnConfig(savedColumns);
          }
          
          if (configs[0].collapsed_column_ids) {
            setCollapsedColumns(configs[0].collapsed_column_ids);
          }

          setBoardConfig(configs[0]);
        }
      } catch (error) {
        console.error("Error loading kanban config:", error);
      }
    };

    loadConfig();
  }, [organization?.id]);

  const saveColumnConfigMutation = useMutation({
    mutationFn: async (columnsToSave) => {
      if (!organization?.id) throw new Error("No organization");

      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );

      const configData = {
        organization_id: organization.id,
        columns: columnsToSave.map((col, idx) => ({
          ...col,
          order: idx
        })),
        collapsed_column_ids: collapsedColumns,
        swimlane_config: boardConfig?.swimlane_config || { enabled: false, group_by: 'none' },
        view_settings: boardConfig?.view_settings || { default_view: 'kanban', show_card_details: [], compact_mode: false }
      };

      if (configs.length > 0) {
        return base44.entities.KanbanConfig.update(configs[0].id, configData);
      } else {
        return base44.entities.KanbanConfig.create(configData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
    }
  });

  const updateProposalMutation = useMutation({
    mutationFn: async ({ proposalId, updates }) => {
      return base44.entities.Proposal.update(proposalId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (proposalId) => {
      return base44.entities.Proposal.delete(proposalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setShowDeleteWarning(false);
      setProposalToDelete(null);
    }
  });

  const resetToDefaultMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");

      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );

      const configData = {
        organization_id: organization.id,
        columns: defaultColumns,
        collapsed_column_ids: [],
        swimlane_config: { enabled: false, group_by: 'none' },
        view_settings: { default_view: 'kanban', show_card_details: ['assignees', 'due_date', 'progress', 'value'], compact_mode: false }
      };

      if (configs.length > 0) {
        return base44.entities.KanbanConfig.update(configs[0].id, configData);
      } else {
        return base44.entities.KanbanConfig.create(configData);
      }
    },
    onSuccess: () => {
      setColumns(defaultColumns);
      setColumnConfig(defaultColumns);
      setCollapsedColumns([]);
      setColumnSorts({});
      setBoardConfig(null);
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      setShowResetWarning(false);
    }
  });

  // Get unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const assignees = new Set();
    proposals.forEach(p => {
      if (p.lead_writer_email) assignees.add(p.lead_writer_email);
      if (p.assigned_team_members) { // Check if assigned_team_members exists
        p.assigned_team_members.forEach(email => assignees.add(email));
      }
    });
    return Array.from(assignees);
  }, [proposals]);

  // Filter proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter(proposal => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = proposal.proposal_name?.toLowerCase().includes(query);
        const matchesAgency = proposal.agency_name?.toLowerCase().includes(query);
        const matchesNumber = proposal.solicitation_number?.toLowerCase().includes(query);
        if (!matchesName && !matchesAgency && !matchesNumber) return false;
      }

      // Assignee filter
      if (filterAssignee !== "all") {
        if (filterAssignee === "me") {
          const isAssigned = 
            proposal.lead_writer_email === user?.email ||
            proposal.assigned_team_members?.includes(user?.email);
          if (!isAssigned) return false;
        } else if (filterAssignee === "unassigned") {
          if (proposal.lead_writer_email || proposal.assigned_team_members?.length > 0) return false;
        } else {
          const hasAssignee = 
            proposal.lead_writer_email === filterAssignee ||
            proposal.assigned_team_members?.includes(filterAssignee);
          if (!hasAssignee) return false;
        }
      }

      // Priority filter (based on contract value)
      if (filterPriority !== "all") {
        // If contract_value is null/undefined/0, it's considered 'low' or not matching high/medium
        if (filterPriority === "high" && (!proposal.contract_value || proposal.contract_value < 1000000)) return false;
        if (filterPriority === "medium" && (!proposal.contract_value || proposal.contract_value < 100000 || proposal.contract_value >= 1000000)) return false;
        if (filterPriority === "low" && proposal.contract_value >= 100000) return false; // If value is >= 100K, it's NOT low
      }

      // Due date filter
      if (filterDueDate !== "all") {
        if (!proposal.due_date) return false;
        const daysUntil = moment(proposal.due_date).diff(moment(), 'days'); // Compares exact date/time
        
        if (filterDueDate === "overdue" && daysUntil >= 0) return false; // Not overdue if daysUntil >= 0
        if (filterDueDate === "week" && (daysUntil < 0 || daysUntil > 7)) return false; // Not due this week if outside [0, 7]
        if (filterDueDate === "month" && (daysUntil < 0 || daysUntil > 30)) return false; // Not due this month if outside [0, 30]
      }

      return true;
    });
  }, [proposals, searchQuery, filterAssignee, filterPriority, filterDueDate, user]);

  const hasActiveFilters = searchQuery || filterAssignee !== "all" || filterPriority !== "all" || filterDueDate !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAssignee("all");
    setFilterPriority("all");
    setFilterDueDate("all");
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (result) => {
    setIsDragging(false);

    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'column') {
      const newColumns = Array.from(columns);
      const [removed] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, removed);

      const updatedColumns = newColumns.map((col, idx) => ({
        ...col,
        order: idx
      }));

      setColumns(updatedColumns);
      saveColumnConfigMutation.mutate(updatedColumns);
      return;
    }

    if (type === 'proposal') { // Explicitly check type for proposal cards
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return;
      }

      // Find the proposal being dragged using its ID from result.draggableId
      const draggedProposal = filteredProposals.find(p => p.id === result.draggableId);
      if (!draggedProposal) {
          console.error("Dragged proposal not found in filtered list:", result.draggableId);
          return;
      }

      const sourceColumn = columns.find(col => col.id === source.droppableId);
      const destColumn = columns.find(col => col.id === destination.droppableId);

      if (!sourceColumn || !destColumn) {
          console.error("Source or destination column not found.");
          return;
      }

      // Check WIP limit before moving (for hard limits only)
      // Count proposals currently in the destination column, excluding the dragged one if it's already there
      const proposalsInDestColumnBeforeMove = filteredProposals.filter(p => {
        const isInDest = destColumn.type === 'default_status'
          ? p?.status === destColumn.default_status_mapping && !p?.custom_workflow_stage_id
          : p?.custom_workflow_stage_id === destColumn.id;
        
        return isInDest && p.id !== draggedProposal.id; // Exclude the dragged proposal from WIP count
      });

      const wipLimit = destColumn.wip_limit || 0;
      const wipLimitType = destColumn.wip_limit_type || 'soft';
      const hasHardLimit = wipLimit > 0 && wipLimitType === 'hard';

      if (hasHardLimit && proposalsInDestColumnBeforeMove.length >= wipLimit) {
        alert(`Cannot move proposal. Hard WIP limit of ${wipLimit} reached for "${destColumn.label}" column.`);
        return;
      }

      let updates = {};
      if (destColumn.type === 'default_status') {
        updates = {
          status: destColumn.default_status_mapping,
          custom_workflow_stage_id: null
        };
      } else {
        updates = {
          custom_workflow_stage_id: destColumn.id,
          status: 'in_progress' // Set to in_progress if moving to a custom stage
        };
      }

      updateProposalMutation.mutate({
        proposalId: draggedProposal.id,
        updates
      });
    }
  };

  const handleProposalClick = (proposal) => {
    if (onProposalClick) {
      onProposalClick(proposal);
    }
  };

  const handleDeleteProposal = (proposal) => {
    setProposalToDelete(proposal);
    setShowDeleteWarning(true);
  };

  const handleAddColumn = () => {
    if (!newColumnLabel.trim()) {
      alert("Please enter a column name");
      return;
    }

    const newColumn = {
      id: `custom_${Date.now()}`,
      label: newColumnLabel,
      color: newColumnColor,
      order: columnConfig.length,
      type: 'custom_stage',
      wip_limit: 0,
      wip_limit_type: 'soft'
    };

    const updatedColumns = [...columnConfig, newColumn];
    setColumnConfig(updatedColumns);
    setNewColumnLabel("");
    setNewColumnColor("bg-blue-100");
  };

  const handleQuickAddColumn = (position) => {
    setQuickAddPosition(position);
    setQuickColumnName("");
    setQuickColumnColor("bg-blue-100");
    setShowQuickAddDialog(true);
  };

  const handleQuickAddSubmit = () => {
    if (!quickColumnName.trim()) {
      alert("Please enter a column name");
      return;
    }

    const newColumn = {
      id: `custom_${Date.now()}`,
      label: quickColumnName,
      color: quickColumnColor,
      order: quickAddPosition,
      type: 'custom_stage',
      wip_limit: 0,
      wip_limit_type: 'soft'
    };

    const updatedColumns = [...columnConfig];
    updatedColumns.splice(quickAddPosition, 0, newColumn);
    
    const reorderedColumns = updatedColumns.map((col, idx) => ({
      ...col,
      order: idx
    }));

    setColumnConfig(reorderedColumns);
    setColumns(reorderedColumns);
    saveColumnConfigMutation.mutate(reorderedColumns);
    setShowQuickAddDialog(false);
  };

  const handleToggleCollapse = async (columnId) => {
    const newCollapsed = collapsedColumns.includes(columnId)
      ? collapsedColumns.filter(id => id !== columnId)
      : [...collapsedColumns, columnId];
    
    setCollapsedColumns(newCollapsed);

    if (!organization?.id) return;

    try {
      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );

      const configData = {
        organization_id: organization.id,
        columns: columns,
        collapsed_column_ids: newCollapsed,
        swimlane_config: boardConfig?.swimlane_config,
        view_settings: boardConfig?.view_settings
      };

      if (configs.length > 0) {
        await base44.entities.KanbanConfig.update(configs[0].id, configData);
      } else {
        await base44.entities.KanbanConfig.create(configData);
      }
    } catch (error) {
      console.error("Error saving collapse state:", error);
    }
  };

  const handleSortChange = (columnId, sortType) => {
    setColumnSorts(prev => ({
      ...prev,
      [columnId]: sortType
    }));
  };

  const handleDeleteColumn = async (column) => {
    if (!column || !column.id) {
      alert("Invalid column");
      return;
    }

    if (column.type === 'default_status') {
      alert("Default columns cannot be deleted. You can only customize their labels and colors.");
      return;
    }

    const proposalsInColumn = (proposals || []).filter(p => p?.custom_workflow_stage_id === column.id);

    if (proposalsInColumn.length > 0) {
      setColumnDeleteError({
        columnLabel: column.label,
        count: proposalsInColumn.length
      });
      setColumnToDelete(null);
      setShowColumnDeleteWarning(true);
      return;
    }

    setColumnToDelete(column);
    setColumnDeleteError(null);
    setShowColumnDeleteWarning(true);
  };

  const confirmDeleteColumn = () => {
    if (!columnToDelete) return;

    const newColumns = columns.filter(col => col?.id !== columnToDelete.id);
    setColumns(newColumns);
    setColumnConfig(prev => prev.filter(col => col?.id !== columnToDelete.id));
    
    saveColumnConfigMutation.mutate(newColumns);
    
    setShowColumnDeleteWarning(false);
    setColumnToDelete(null);
    setColumnDeleteError(null);
  };

  const handleSaveColumns = () => {
    setColumns(columnConfig);
    saveColumnConfigMutation.mutate(columnConfig);
    setIsEditingColumns(false);
  };

  const handleResetToDefault = () => {
    setShowResetWarning(true);
  };

  const confirmReset = () => {
    resetToDefaultMutation.mutate();
  };

  const handleColumnChange = (columnId, field, value) => {
    setColumnConfig(prev =>
      prev.map(col =>
        col.id === columnId ? { ...col, [field]: value } : col
      )
    );
  };

  const handleColumnOrderChange = (columnId, newOrderStr) => {
    const newOrder = parseInt(newOrderStr);
    if (isNaN(newOrder) || newOrder < 1 || newOrder > columnConfig.length) return;

    const currentIndex = columnConfig.findIndex(col => col.id === columnId);
    if (currentIndex === -1) return;

    const targetIndex = newOrder - 1;
    if (currentIndex === targetIndex) return;

    const newColumns = Array.from(columnConfig);
    const [removed] = newColumns.splice(currentIndex, 1);
    newColumns.splice(targetIndex, 0, removed);

    const reorderedColumns = newColumns.map((col, idx) => ({
      ...col,
      order: idx
    }));

    setColumnConfig(reorderedColumns);
  };

  const handleConfigDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(columnConfig);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const reorderedColumns = items.map((col, idx) => ({
      ...col,
      order: idx
    }));

    setColumnConfig(reorderedColumns);
  };

  const confirmDelete = () => {
    if (proposalToDelete) {
      deleteProposalMutation.mutate(proposalToDelete.id);
    }
  };

  // Group proposals by swimlane if enabled - USE FILTERED PROPOSALS
  const groupedProposals = useMemo(() => {
    const swimlaneConfig = boardConfig?.swimlane_config;
    const isSwimlanesEnabled = swimlaneConfig?.enabled && swimlaneConfig?.group_by !== 'none';

    if (!isSwimlanesEnabled) {
      const grouped = {};
      
      columns.forEach(column => {
        let columnProposals = [];
        
        if (column.type === 'default_status') {
          columnProposals = filteredProposals.filter(p => 
            p?.status === column.default_status_mapping && !p?.custom_workflow_stage_id
          );
        } else {
          columnProposals = filteredProposals.filter(p => 
            p?.custom_workflow_stage_id === column.id
          );
        }

        const sortType = columnSorts[column.id];
        if (sortType) {
          columnProposals = [...columnProposals].sort((a, b) => {
            if (sortType === 'date_newest') {
              return new Date(b.created_date) - new Date(a.created_date);
            } else if (sortType === 'name_asc') {
              return (a.proposal_name || '').localeCompare(b.proposal_name || '');
            } else if (sortType === 'name_desc') {
              return (b.proposal_name || '').localeCompare(a.proposal_name || '');
            }
            return 0;
          });
        }

        grouped[column.id] = columnProposals;
      });

      return { swimlanes: [{ id: 'default', label: 'All Proposals', data: grouped }] };
    }

    // Swimlanes enabled
    const swimlanes = [];
    const groupBy = swimlaneConfig.group_by;
    const customFieldName = swimlaneConfig.custom_field_name;

    const swimlaneValues = new Set();
    filteredProposals.forEach(p => {
      let value = 'Unassigned';
      if (groupBy === 'lead_writer') {
        value = p.lead_writer_email || 'Unassigned';
      } else if (groupBy === 'project_type') {
        value = p.project_type || 'Other';
      } else if (groupBy === 'agency') {
        value = p.agency_name || 'Unknown Agency';
      } else if (groupBy === 'contract_value_range') {
        if (!p.contract_value) value = 'Unknown';
        else if (p.contract_value < 100000) value = '<$100K';
        else if (p.contract_value < 1000000) value = '$100K-$1M';
        else value = '>$1M';
      } else if (groupBy === 'custom_field' && customFieldName) {
        value = p.custom_fields?.[customFieldName] || 'Not Set';
      }
      swimlaneValues.add(value);
    });

    Array.from(swimlaneValues).sort().forEach(swimlaneValue => {
      const swimlaneProposals = filteredProposals.filter(p => {
        let value = 'Unassigned';
        if (groupBy === 'lead_writer') {
          value = p.lead_writer_email || 'Unassigned';
        } else if (groupBy === 'project_type') {
          value = p.project_type || 'Other';
        } else if (groupBy === 'agency') {
          value = p.agency_name || 'Unknown Agency';
        } else if (groupBy === 'contract_value_range') {
          if (!p.contract_value) value = 'Unknown';
          else if (p.contract_value < 100000) value = '<$100K';
          else if (p.contract_value < 1000000) value = '$100K-$1M';
          else value = '>$1M';
        } else if (groupBy === 'custom_field' && customFieldName) {
          value = p.custom_fields?.[customFieldName] || 'Not Set';
        }
        return value === swimlaneValue;
      });

      const grouped = {};
      columns.forEach(column => {
        let columnProposals = [];
        
        if (column.type === 'default_status') {
          columnProposals = swimlaneProposals.filter(p => 
            p?.status === column.default_status_mapping && !p?.custom_workflow_stage_id
          );
        } else {
          columnProposals = swimlaneProposals.filter(p => 
            p?.custom_workflow_stage_id === column.id
          );
        }

        const sortType = columnSorts[column.id];
        if (sortType) {
          columnProposals = [...columnProposals].sort((a, b) => {
            if (sortType === 'date_newest') {
              return new Date(b.created_date) - new Date(a.created_date);
            } else if (sortType === 'name_asc') {
              return (a.proposal_name || '').localeCompare(b.proposal_name || '');
            } else if (sortType === 'name_desc') {
              return (b.proposal_name || '').localeCompare(a.proposal_name || '');
            }
            return 0;
          });
        }

        grouped[column.id] = columnProposals;
      });

      swimlanes.push({
        id: swimlaneValue,
        label: swimlaneValue,
        data: grouped
      });
    });

    return { swimlanes };
  }, [filteredProposals, columns, columnSorts, boardConfig]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search proposals by name, agency, or solicitation number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <Badge className="ml-1 bg-blue-600 text-white h-5 w-5 p-0 flex items-center justify-center rounded-full">
                {[searchQuery, filterAssignee !== "all", filterPriority !== "all", filterDueDate !== "all"].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-slate-50 rounded-lg border">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs mb-2 block">Assignee</Label>
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  <SelectItem value="me">My Proposals</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {uniqueAssignees.map(email => (
                    <SelectItem key={email} value={email}>{email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs mb-2 block">Priority (by value)</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High (&gt;$1M)</SelectItem>
                  <SelectItem value="medium">Medium ($100K-$1M)</SelectItem>
                  <SelectItem value="low">Low (&lt;$100K)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label className="text-xs mb-2 block">Due Date</Label>
              <Select value={filterDueDate} onValueChange={setFilterDueDate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="week">Due This Week</SelectItem>
                  <SelectItem value="month">Due This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            )}
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-slate-600 px-1">
            <span>Showing <strong>{filteredProposals.length}</strong> of <strong>{proposals.length}</strong> proposals</span>
          </div>
        )}
      </div>

      {/* Board Controls */}
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowBoardConfig(true)}
          disabled={isDragging}
        >
          <Sliders className="w-4 h-4 mr-2" />
          Configure Board
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleResetToDefault}
          disabled={resetToDefaultMutation.isPending || isDragging}
        >
          {resetToDefaultMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4 mr-2" />
          )}
          Reset to Default
        </Button>
        <Dialog open={isEditingColumns} onOpenChange={setIsEditingColumns}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isDragging}>
              <Settings2 className="w-4 h-4 mr-2" />
              Customize Columns
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customize Kanban Columns</DialogTitle>
              <DialogDescription>
                Edit column labels, colors, WIP limits, reorder columns by dragging, or add custom workflow stages.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Existing Columns with Drag and Drop */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Existing Columns (Drag to Reorder)</h3>
                <DragDropContext onDragEnd={handleConfigDragEnd}>
                  <Droppable droppableId="column-config-list">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {columnConfig.map((column, index) => {
                          if (!column || !column.id) return null;
                          
                          return (
                            <Draggable key={column.id} draggableId={column.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex gap-4 items-center p-4 border rounded-lg ${
                                    snapshot.isDragging ? 'bg-blue-50 border-blue-300 shadow-lg' : 'bg-slate-50'
                                  }`}
                                >
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-5 h-5 text-slate-400" />
                                  </div>
                                  
                                  <div className="w-16">
                                    <Label className="text-xs font-semibold">Order</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max={columnConfig.length}
                                      value={index + 1}
                                      onChange={(e) => handleColumnOrderChange(column.id, e.target.value)}
                                      className="h-8 text-center"
                                    />
                                  </div>

                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Label className="text-xs font-semibold">Label</Label>
                                      {column.type === 'default_status' && (
                                        <span className="text-xs text-slate-500 italic">(Default Column)</span>
                                      )}
                                      {column.type === 'custom_stage' && (
                                        <span className="text-xs text-blue-600 italic">(Custom Stage)</span>
                                      )}
                                    </div>
                                    <Input
                                      value={column.label || ""}
                                      onChange={(e) => handleColumnChange(column.id, 'label', e.target.value)}
                                      placeholder="Column name"
                                    />
                                  </div>
                                  
                                  <div className="w-32 space-y-2">
                                    <Label className="text-xs font-semibold">Color</Label>
                                    <select
                                      value={column.color || "bg-slate-100"}
                                      onChange={(e) => handleColumnChange(column.id, 'color', e.target.value)}
                                      className="w-full px-3 py-2 border rounded-md"
                                    >
                                      <option value="bg-slate-100">Gray</option>
                                      <option value="bg-blue-100">Blue</option>
                                      <option value="bg-purple-100">Purple</option>
                                      <option value="bg-indigo-100">Indigo</option>
                                      <option value="bg-green-100">Green</option>
                                      <option value="bg-yellow-100">Yellow</option>
                                      <option value="bg-red-100">Red</option>
                                      <option value="bg-pink-100">Pink</option>
                                      <option value="bg-amber-100">Amber</option>
                                      <option value="bg-teal-100">Teal</option>
                                    </select>
                                  </div>

                                  <div className="w-28 space-y-2">
                                    <Label className="text-xs font-semibold">WIP Limit</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={column.wip_limit || 0}
                                      onChange={(e) => handleColumnChange(column.id, 'wip_limit', parseInt(e.target.value) || 0)}
                                      className="h-8"
                                      placeholder="0 = none"
                                    />
                                  </div>

                                  <div className="w-24 space-y-2">
                                    <Label className="text-xs font-semibold">Type</Label>
                                    <select
                                      value={column.wip_limit_type || "soft"}
                                      onChange={(e) => handleColumnChange(column.id, 'wip_limit_type', e.target.value)}
                                      className="w-full px-2 py-1 border rounded-md text-xs h-8"
                                    >
                                      <option value="soft">Soft</option>
                                      <option value="hard">Hard</option>
                                    </select>
                                  </div>

                                  <div>
                                    {column.type === 'custom_stage' ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteColumn(column)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    ) : (
                                      <div className="w-10" />
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              {/* Add New Column */}
              <div className="border-t pt-4 mt-6">
                <h3 className="font-semibold text-sm mb-3">Add New Custom Column</h3>
                <div className="flex gap-4 items-end p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                  <div className="flex-1 space-y-2">
                    <Label>Column Name</Label>
                    <Input
                      value={newColumnLabel}
                      onChange={(e) => setNewColumnLabel(e.target.value)}
                      placeholder="e.g., Client Review, Legal Approval..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddColumn();
                        }
                      }}
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <Label>Color</Label>
                    <select
                      value={newColumnColor}
                      onChange={(e) => setNewColumnColor(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="bg-slate-100">Gray</option>
                      <option value="bg-blue-100">Blue</option>
                      <option value="bg-purple-100">Purple</option>
                      <option value="bg-indigo-100">Indigo</option>
                      <option value="bg-green-100">Green</option>
                      <option value="bg-yellow-100">Yellow</option>
                      <option value="bg-red-100">Red</option>
                      <option value="bg-pink-100">Pink</option>
                      <option value="bg-amber-100">Amber</option>
                      <option value="bg-teal-100">Teal</option>
                    </select>
                  </div>
                  <Button onClick={handleAddColumn} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Column
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-between gap-2">
              <Button variant="outline" onClick={handleResetToDefault}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditingColumns(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveColumns}>
                  {saveColumnConfigMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Board Config Dialog */}
      <BoardConfigDialog
        open={showBoardConfig} {/* Changed isOpen to open */}
        onClose={() => {
          setShowBoardConfig(false);
          // Reload config after changes
          queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
        }}
        organization={organization}
        currentConfig={boardConfig}
        onConfigSaved={(newConfig) => {
          setBoardConfig(newConfig);
          // Re-fetch proposals or re-evaluate groupedProposals if swimlanes changed
          queryClient.invalidateQueries({ queryKey: ['proposals'] });
          queryClient.invalidateQueries({ queryKey: ['kanban-config'] }); // Ensure this is invalidated too
        }}
      />

      {/* Reset Warning Dialog */}
      <AlertDialog open={showResetWarning} onOpenChange={setShowResetWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Reset Kanban Board to Default?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="font-medium text-slate-900">This action will reset your Kanban board and you will lose the following customizations:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>All custom column names will revert to original names</li>
                <li>All custom column colors will revert to default colors</li>
                <li>All WIP limits will be reset</li>
                <li>All custom workflow stages will be permanently deleted</li>
                <li>All collapsed columns will be expanded</li>
                <li>Column order will be reset to the default sequence</li>
                <li>All column sorting preferences will be cleared</li>
                <li>Swimlane configuration will be reset</li>
              </ul>
              <p className="text-amber-700 font-medium pt-2">⚠️ This action cannot be undone. Your proposals and data will remain safe.</p>
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

      {/* Column Delete Warning Dialog */}
      <AlertDialog open={showColumnDeleteWarning} onOpenChange={setShowColumnDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {columnDeleteError ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Cannot Delete Non-Empty Column
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Delete Custom Column?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              {columnDeleteError ? (
                <>
                  <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                    <p className="text-red-900 font-bold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Column Contains Proposals
                    </p>
                    <p className="text-red-800 mb-3">
                      The column <strong>"{columnDeleteError.columnLabel}"</strong> contains <strong>{columnDeleteError.count} proposal{columnDeleteError.count !== 1 ? 's' : ''}</strong>.
                    </p>
                    <p className="text-red-900 font-semibold">
                      To prevent accidental data loss, you must move all proposals out of this column before it can be deleted.
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-900 text-sm font-medium mb-1">💡 How to proceed:</p>
                    <ol className="text-blue-800 text-sm space-y-1 list-decimal pl-5">
                      <li>Drag all proposals from "{columnDeleteError.columnLabel}" to another column</li>
                      <li>Verify the column is empty</li>
                      <li>Try deleting the column again</li>
                    </ol>
                  </div>
                </>
              ) : columnToDelete ? (
                <>
                  <p className="text-slate-900">
                    You are about to permanently delete the custom column <strong>"{columnToDelete.label}"</strong>.
                  </p>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-900 text-sm">
                      ✓ This column is currently empty, so no proposals will be affected.
                    </p>
                  </div>
                  <p className="text-amber-700 font-medium">
                    ⚠️ This action cannot be undone.
                  </p>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {columnDeleteError ? (
              <AlertDialogAction onClick={() => {
                setShowColumnDeleteWarning(false);
                setColumnDeleteError(null);
              }}>
                Got It!
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel onClick={() => {
                  setShowColumnDeleteWarning(false);
                  setColumnToDelete(null);
                }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDeleteColumn}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Column
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Proposal Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Permanently Delete Proposal?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="font-medium text-slate-900">
                You are about to permanently delete: <span className="font-bold text-red-600">{proposalToDelete?.proposal_name}</span>
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-900 font-semibold mb-2">⚠️ This action cannot be undone!</p>
                <p className="text-red-800 text-sm">All associated data will be irretrievably lost, including:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-red-800 text-sm">
                  <li>All proposal sections and content</li>
                  <li>Comments and discussions</li>
                  <li>Tasks and assignments</li>
                  <li>Uploaded documents and files</li>
                  <li>Evaluation and scoring data</li>
                  <li>Win themes and strategies</li>
                </ul>
              </div>
              <p className="text-amber-700 font-medium">
                💡 Consider moving to "Archived" status instead if you might need this data later.
              </p>
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

      {/* Quick Add Column Dialog */}
      <Dialog open={showQuickAddDialog} onOpenChange={setShowQuickAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
            <DialogDescription>
              Create a new custom column.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="quick-column-name">Column Name</Label>
              <Input
                id="quick-column-name"
                value={quickColumnName}
                onChange={(e) => setQuickColumnName(e.target.value)}
                placeholder="e.g., Client Review, Legal Approval..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleQuickAddSubmit();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-column-color">Color</Label>
              <Select value={quickColumnColor} onValueChange={setQuickColumnColor}>
                <SelectTrigger id="quick-column-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bg-slate-100">Gray</SelectItem>
                  <SelectItem value="bg-blue-100">Blue</SelectItem>
                  <SelectItem value="bg-purple-100">Purple</SelectItem>
                  <SelectItem value="bg-indigo-100">Indigo</SelectItem>
                  <SelectItem value="bg-green-100">Green</SelectItem>
                  <SelectItem value="bg-yellow-100">Yellow</SelectItem>
                  <SelectItem value="bg-red-100">Red</SelectItem>
                  <SelectItem value="bg-pink-100">Pink</SelectItem>
                  <SelectItem value="bg-amber-100">Amber</SelectItem>
                  <SelectItem value="bg-teal-100">Teal</option>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuickAddSubmit} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Render Kanban Board with Swimlanes - use filteredProposals instead of proposals */}
      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {groupedProposals.swimlanes.map((swimlane) => (
          <div key={swimlane.id} className="mb-8">
            {groupedProposals.swimlanes.length > 1 && (
              <div className="mb-4 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 border-l-4 border-blue-500 rounded-r-lg">
                <h3 className="font-semibold text-slate-900">{swimlane.label}</h3>
              </div>
            )}
            
            <Droppable droppableId="all-columns" direction="horizontal" type="column">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex gap-0 overflow-x-auto pb-4"
                >
                  {columns.map((column, index) => {
                    if (!column || !column.id) return null;

                    const isColumnCollapsed = collapsedColumns.includes(column.id);
                    return (
                      <React.Fragment key={column.id}>
                        <div className="group relative flex items-start flex-shrink-0">
                          <div className="h-16 w-2 hover:w-8 transition-all duration-200 flex items-center justify-center cursor-pointer" onClick={() => handleQuickAddColumn(index)}>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                              <Plus className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        <Draggable 
                          key={column.id} 
                          draggableId={column.id} 
                          index={index} 
                          type="column"
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "flex-shrink-0 transition-all duration-300",
                                isColumnCollapsed ? 'w-16' : 'w-80',
                                snapshot.isDragging && 'opacity-50'
                              )}
                            >
                              <Droppable droppableId={column.id} type="proposal">
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                  >
                                    <KanbanColumn
                                      column={column}
                                      proposals={swimlane.data[column.id] || []}
                                      onProposalClick={handleProposalClick}
                                      onDeleteProposal={handleDeleteProposal}
                                      isDraggingOver={snapshot.isDraggingOver}
                                      isBoardDragging={isDragging} {/* Added this prop for global drag state */}
                                      isCollapsed={isColumnCollapsed}
                                      onToggleCollapse={() => handleToggleCollapse(column.id)} {/* Updated prop usage */}
                                      dragHandleProps={provided.dragHandleProps}
                                      onSortChange={handleSortChange}
                                      currentSort={columnSorts[column.id]}
                                      onDeleteColumn={() => handleDeleteColumn(column)} {/* Updated prop usage */}
                                      organization={organization}
                                    />
                                    {provided.placeholder}
                                  </div>
                                )}
                              </Droppable>
                            </div>
                          )}
                        </Draggable>
                      </React.Fragment>
                    );
                  })}

                  <div className="group relative flex items-start flex-shrink-0">
                    <div className="h-16 w-2 hover:w-8 transition-all duration-200 flex items-center justify-center cursor-pointer" onClick={() => handleQuickAddColumn(columns.length)}>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>
    </div>
  );
}
