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
import moment from "moment";

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

  const [searchQuery, setSearchQuery] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDueDate, setFilterDueDate] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

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

  const uniqueAssignees = useMemo(() => {
    const assignees = new Set();
    proposals.forEach(p => {
      if (p.lead_writer_email) assignees.add(p.lead_writer_email);
      if (p.assigned_team_members) {
        p.assigned_team_members.forEach(email => assignees.add(email));
      }
    });
    return Array.from(assignees);
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    return proposals.filter(proposal => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = proposal.proposal_name?.toLowerCase().includes(query);
        const matchesAgency = proposal.agency_name?.toLowerCase().includes(query);
        const matchesNumber = proposal.solicitation_number?.toLowerCase().includes(query);
        if (!matchesName && !matchesAgency && !matchesNumber) return false;
      }

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

      if (filterPriority !== "all") {
        if (filterPriority === "high" && (!proposal.contract_value || proposal.contract_value < 1000000)) return false;
        if (filterPriority === "medium" && (!proposal.contract_value || proposal.contract_value < 100000 || proposal.contract_value >= 1000000)) return false;
        if (filterPriority === "low" && proposal.contract_value >= 100000) return false;
      }

      if (filterDueDate !== "all") {
        if (!proposal.due_date) return false;
        const daysUntil = moment(proposal.due_date).diff(moment(), 'days');
        if (filterDueDate === "overdue" && daysUntil >= 0) return false;
        if (filterDueDate === "week" && (daysUntil < 0 || daysUntil > 7)) return false;
        if (filterDueDate === "month" && (daysUntil < 0 || daysUntil > 30)) return false;
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

    if (type === 'proposal') {
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return;
      }

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

      const proposalsInDestColumnBeforeMove = filteredProposals.filter(p => {
        const isInDest = destColumn.type === 'default_status'
          ? p?.status === destColumn.default_status_mapping && !p?.custom_workflow_stage_id
          : p?.custom_workflow_stage_id === destColumn.id;
        
        return isInDest && p.id !== draggedProposal.id;
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
          status: 'in_progress'
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

  const handleResetToDefault = () => {
    setShowResetWarning(true);
  };

  const confirmReset = () => {
    resetToDefaultMutation.mutate();
  };

  const confirmDelete = () => {
    if (proposalToDelete) {
      deleteProposalMutation.mutate(proposalToDelete.id);
    }
  };

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
      </div>

      <BoardConfigDialog
        open={showBoardConfig}
        onClose={() => {
          setShowBoardConfig(false);
          queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
        }}
        organization={organization}
        currentConfig={boardConfig}
        onConfigSaved={(newConfig) => {
          setBoardConfig(newConfig);
          queryClient.invalidateQueries({ queryKey: ['proposals'] });
          queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
        }}
      />

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
            <AlertDialogDescription>
              {columnDeleteError ? (
                <div className="space-y-2">
                  <p className="text-red-600">
                    The column "{columnDeleteError.columnLabel}" contains {columnDeleteError.count} proposal(s).
                  </p>
                  <p>Please move all proposals out of this column before deleting it.</p>
                </div>
              ) : (
                `Are you sure you want to delete the "${columnToDelete?.label}" column? This action cannot be undone.`
              )}
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

      <Dialog open={showQuickAddDialog} onOpenChange={setShowQuickAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
            <DialogDescription>
              Create a new custom column
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
                  <SelectItem value="bg-teal-100">Teal</SelectItem>
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
                                      isBoardDragging={isDragging}
                                      isCollapsed={isColumnCollapsed}
                                      onToggleCollapse={() => handleToggleCollapse(column.id)}
                                      dragHandleProps={provided.dragHandleProps}
                                      onSortChange={handleSortChange}
                                      currentSort={columnSorts[column.id]}
                                      onDeleteColumn={() => handleDeleteColumn(column)}
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