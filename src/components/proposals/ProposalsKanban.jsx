
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Settings,
  Filter,
  Search,
  X,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn, // Not used after removal, but keeping for now if other places might still use it or if it's a shared icon lib
  ZoomOut, // Not used after removal, but keeping for now if other places might still use it or if it's a shared icon lib
  LayoutGrid,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import BoardConfigDialog from "./BoardConfigDialog";
import ProposalCardModal from "./ProposalCardModal";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ApprovalGate from "./ApprovalGate";
import KanbanSetupWizard from "./KanbanSetupWizard";
import { Card, CardContent } from "@/components/ui/card";
import KanbanOnboardingTour from "./KanbanOnboardingTour";
import KanbanHelpPanel from "./KanbanHelpPanel";

// DEPRECATED: Old default columns - kept for reference only
// New boards should use TEMPLATE_8_PHASE_WORKFLOW from KanbanSetupWizard
const LEGACY_DEFAULT_COLUMNS = [
  {
    id: 'new',
    label: 'New',
    color: 'from-blue-900 to-indigo-950',
    type: 'locked_phase',
    phase_mapping: 'phase1',
    is_locked: true,
    order: 0,
    checklist_items: []
  }
];

export default function ProposalsKanban({ proposals, organization, user, onRefresh }) {
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
  // const [zoomLevel, setZoomLevel] = useState(1); // Removed zoom functionality
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const [showApprovalGate, setShowApprovalGate] = useState(false);
  const [approvalGateData, setApprovalGateData] = useState(null);
  const [dragInProgress, setDragInProgress] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Fetch kanban config with better error handling and retry
  const { data: kanbanConfig, isLoading: isLoadingConfig, error: configError } = useQuery({
    queryKey: ['kanban-config', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      console.log('[Kanban] Fetching config for org:', organization.id);
      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );
      console.log('[Kanban] Config fetched:', configs.length > 0 ? 'Found' : 'Not found');
      return configs.length > 0 ? configs[0] : null;
    },
    enabled: !!organization?.id,
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  // Log when data changes to debug loading issues
  useEffect(() => {
    console.log('[Kanban] Data update:', {
      proposalsCount: proposals.length,
      hasConfig: !!kanbanConfig,
      columnsCount: kanbanConfig?.columns?.length || 0,
      isLoadingConfig
    });
  }, [proposals.length, kanbanConfig, isLoadingConfig]);

  // Check if config exists and has columns
  const hasKanbanConfig = useMemo(() => {
    return !!kanbanConfig && kanbanConfig.columns && kanbanConfig.columns.length > 0;
  }, [kanbanConfig]);

  // Check if this is a legacy/old configuration that needs migration
  const isLegacyConfig = useMemo(() => {
    if (!kanbanConfig?.columns) return false;
    
    // Check if it has the old column structure (14 columns with specific IDs)
    const hasOldColumns = kanbanConfig.columns.some(col => 
      ['new', 'evaluate', 'qualify', 'gather', 'analyze', 'strategy', 'outline', 'drafting', 'review', 'final', 'submitted', 'won', 'lost', 'archived'].includes(col.id)
    );
    
    // Check if it's missing the new workflow structure (e.g., 'initiate', 'team', 'resources', 'solicit' are key new template columns)
    const hasNewColumns = kanbanConfig.columns.some(col => 
      ['initiate', 'team', 'resources', 'solicit'].includes(col.id)
    );
    
    // A legacy config would have the old columns and not the new ones, and might have a specific count (like the old 14)
    // The previous 14-column default didn't have custom stages beyond the locked ones, so checking for its length is also a good indicator.
    // The new 8-phase workflow (15 columns) has different IDs.
    return hasOldColumns && !hasNewColumns && kanbanConfig.columns.length > 1 && kanbanConfig.columns.length < 15;
  }, [kanbanConfig]);


  const columns = kanbanConfig?.columns || []; // Use empty array if no config, setup wizard will create
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

  // Removed zoom functionality
  // const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  // const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  // const handleZoomReset = () => setZoomLevel(1);

  // Removed useEffect for wheel event
  // useEffect(() => {
  //   const handleWheel = (e) => {
  //     if (e.ctrlKey || e.metaKey) {
  //       e.preventDefault();
  //       if (e.deltaY < 0) {
  //         handleZoomIn();
  //       } else {
  //         handleZoomOut();
  //       }
  //     }
  //   };

  //   const board = boardRef.current;
  //   if (board) {
  //     board.addEventListener('wheel', handleWheel, { passive: false });
  //   }

  //   return () => {
  //     if (board) {
  //       board.removeEventListener('wheel', handleWheel);
  //     }
  //   };
  // }, [handleZoomIn, handleZoomOut]);

  // Check if user has completed the tour
  useEffect(() => {
    // Only show tour if config is loaded and successful
    if (hasKanbanConfig && !isLoadingConfig) {
      const tourCompleted = localStorage.getItem('kanban_tour_completed');
      if (!tourCompleted) {
        // Show tour after a brief delay to let the board render
        setTimeout(() => {
          setShowOnboardingTour(true);
        }, 1000);
      }
    }
  }, [hasKanbanConfig, isLoadingConfig]);

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

  // Enhanced getProposalsForColumn with better logging and null checks
  const getProposalsForColumn = useCallback((column) => {
    if (!column || !proposals) {
      console.warn('[Kanban] Missing column or proposals:', { column: !!column, proposals: !!proposals });
      return [];
    }

    let columnProposals = [];

    if (column.type === 'default_status') {
      columnProposals = filteredProposals.filter(p => p && p.status === column.default_status_mapping);
    } else if (column.type === 'custom_stage') {
      columnProposals = filteredProposals.filter(p => p && p.custom_workflow_stage_id === column.id);
    } else if (column.type === 'locked_phase') {
      columnProposals = filteredProposals.filter(p => p && p.current_phase === column.phase_mapping);
    }

    // Debug logging for empty columns
    if (columnProposals.length === 0 && proposals.length > 0 && column.type === 'locked_phase') {
      console.log('[Kanban] Empty column debug:', {
        columnId: column.id,
        columnLabel: column.label,
        phaseMapping: column.phase_mapping,
        totalProposals: proposals.length,
        sampleProposalPhases: proposals.slice(0, 3).map(p => ({ id: p.id, phase: p.current_phase, status: p.status }))
      });
    }

    // Sort proposals for display, but manual_order is used for drag persistence
    const sort = columnSorts[column.id];
    if (sort) {
      columnProposals = [...columnProposals].sort((a, b) => {
        if (sort.by === 'name') {
          return sort.direction === 'asc'
            ? a.proposal_name?.localeCompare(b.proposal_name || '')
            : b.proposal_name?.localeCompare(a.proposal_name || '');
        } else if (sort.by === 'due_date') {
          const dateA = a.due_date ? new Date(a.due_date) : new Date('9999-12-31');
          const dateB = b.due_date ? new Date(b.due_date) : new Date('9999-12-31');
          return sort.direction === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        } else if (sort.by === 'created_date') {
          return sort.direction === 'asc'
            ? new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
            : new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
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
  }, [filteredProposals, columnSorts, proposals]);


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
      // Invalidate queries will be handled at the end of performProposalMove
      // queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  // Helper function to get user's role
  const getUserRole = () => {
    if (!user) return 'viewer';
    if (user.role === 'admin') return 'organization_owner'; // Assuming 'admin' in user maps to 'organization_owner' role for columns
    return user.organization_app_role || 'viewer'; // Assuming organization_app_role is a field on user
  };

  // Helper function to get status from phase
  const getStatusFromPhase = (phase_mapping) => {
    switch (phase_mapping) {
      case 'phase1':
      case 'phase2':
      case 'phase3':
      case 'phase4':
        return 'evaluating';
      case 'phase5':
      case 'phase6':
        return 'draft';
      case 'phase7':
        return 'in_progress';
      default:
        return 'evaluating';
    }
  };

  // Helper function to perform the actual proposal move
  const performProposalMove = async (proposal, sourceColumn, destinationColumn, destinationIndex) => {
    try {
      setDragInProgress(true);

      const updatesForMovedProposal = {};

      // 1. Update status/phase/custom_workflow_stage_id based on destination column
      if (destinationColumn.type === 'locked_phase') {
        updatesForMovedProposal.current_phase = destinationColumn.phase_mapping;
        updatesForMovedProposal.status = getStatusFromPhase(destinationColumn.phase_mapping);
        updatesForMovedProposal.custom_workflow_stage_id = null;
      } else if (destinationColumn.type === 'custom_stage') {
        updatesForMovedProposal.custom_workflow_stage_id = destinationColumn.id;
        updatesForMovedProposal.current_phase = null;
        // Status for custom stages might need to be set based on overall phase they belong to
        // For now, it will retain its previous 'status' if not explicitly set.
      } else if (destinationColumn.type === 'default_status') {
        updatesForMovedProposal.status = destinationColumn.default_status_mapping;
        updatesForMovedProposal.current_phase = null;
        updatesForMovedProposal.custom_workflow_stage_id = null;
      }

      // 2. Reset checklist status for new stage (if column changed)
      if (sourceColumn.id !== destinationColumn.id) {
        const updatedChecklistStatus = { ...(proposal.current_stage_checklist_status || {}) };
        updatedChecklistStatus[destinationColumn.id] = {}; // Reset checklist items for the new column
        updatesForMovedProposal.current_stage_checklist_status = updatedChecklistStatus;
      }

      // 3. Set action_required based on required checklist items in new column
      const hasRequiredItems = destinationColumn.checklist_items?.some(item => item.required);
      updatesForMovedProposal.action_required = hasRequiredItems;
      updatesForMovedProposal.action_required_description = hasRequiredItems ? `Complete required items in ${destinationColumn.label}` : null;

      // 4. Handle reordering within the column and update manual_order
      // Create a *temporary* representation of the columns with the moved proposal
      const newColumnProposalsMap = {};
      columns.forEach(col => {
          newColumnProposalsMap[col.id] = getProposalsForColumn(col); // This is still based on `proposals` from query
      });

      // Remove the dragged proposal from its original column's temporary list
      newColumnProposalsMap[sourceColumn.id] = newColumnProposalsMap[sourceColumn.id].filter(
          p => p.id !== proposal.id
      );

      // Add the dragged proposal to the destination column's temporary list at the correct index
      const destColumnProposals = Array.from(newColumnProposalsMap[destinationColumn.id]);
      const existingIndexInDest = destColumnProposals.findIndex(p => p.id === proposal.id);
      if (existingIndexInDest !== -1) {
          destColumnProposals.splice(existingIndexInDest, 1); // Ensure it's not duplicated if it was already there
      }
      destColumnProposals.splice(destinationIndex, 0, proposal);
      newColumnProposalsMap[destinationColumn.id] = destColumnProposals;

      // Prepare batch updates for manual_order for all proposals in the destination column
      const batchOrderUpdates = newColumnProposalsMap[destinationColumn.id].map((item, idx) => ({
        proposalId: item.id,
        updates: { manual_order: idx }
      }));

      // Find the main update for the dragged proposal from batchOrderUpdates
      const draggedProposalOrderUpdate = batchOrderUpdates.find(u => u.proposalId === proposal.id);
      if (draggedProposalOrderUpdate) {
        updatesForMovedProposal.manual_order = draggedProposalOrderUpdate.updates.manual_order;
      } else {
        updatesForMovedProposal.manual_order = destinationIndex; // Fallback
      }

      // Execute the main update for the dragged proposal
      await updateProposalMutation.mutateAsync({
        proposalId: proposal.id,
        updates: updatesForMovedProposal
      });

      // Execute batch updates for other proposals in the destination column (if any changes)
      const otherUpdatesInDestColumn = batchOrderUpdates.filter(u => u.proposalId !== proposal.id);
      if (otherUpdatesInDestColumn.length > 0) {
        await Promise.all(otherUpdatesInDestColumn.map(item => updateProposalMutation.mutateAsync(item)));
      }

      // 5. Show WIP limit warning (soft enforcement)
      if (destinationColumn.wip_limit > 0 && destinationColumn.wip_limit_type === 'soft') {
          if (newColumnProposalsMap[destinationColumn.id].length > destinationColumn.wip_limit) {
              alert(`⚠️ Note: "${destinationColumn.label}" has exceeded its WIP limit of ${destinationColumn.wip_limit}. Current count: ${newColumnProposalsMap[destinationColumn.id].length}`);
          }
      }
    } catch (error) {
      console.error("Error moving proposal:", error);
      alert("Failed to move proposal. Please try again.");
      queryClient.invalidateQueries({ queryKey: ['proposals'] }); // Force refresh on error
    } finally {
      setDragInProgress(false);
      queryClient.invalidateQueries({ queryKey: ['proposals'] }); // Invalidate queries to refresh the UI
    }
  };

  const handleDragUpdate = (update) => {
    if (update.destination && update.type === "card") {
      setDragOverColumnId(update.destination.droppableId);
    } else {
      setDragOverColumnId(null);
    }
  };

  const onDragEnd = async (result) => {
    // Reset drag state immediately
    setDragOverColumnId(null);
    setDragInProgress(false);

    if (!result.destination) return;

    const { source, destination, draggableId, type } = result;

    // Handle column reordering
    if (type === "column") {
      // Don't allow reordering if source and destination are the same
      if (source.index === destination.index) return;

      const reorderedColumns = Array.from(columns);
      const [movedColumn] = reorderedColumns.splice(source.index, 1);
      
      // Don't allow moving locked columns
      if (movedColumn.is_locked) {
        alert("Cannot reorder locked system columns.");
        queryClient.invalidateQueries({ queryKey: ['kanban-config'] }); // Ensure UI reflects original order
        return;
      }

      reorderedColumns.splice(destination.index, 0, movedColumn);

      // Update order property
      reorderedColumns.forEach((col, idx) => {
        col.order = idx;
      });

      // Save to database
      await base44.entities.KanbanConfig.update(kanbanConfig.id, {
        columns: reorderedColumns
      });

      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      return;
    }

    // Handle card moves (existing logic)
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const proposal = proposals.find(p => p.id === draggableId);
    if (!proposal) return;

    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destinationColumn = columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destinationColumn) return;

    // **PHASE 3: RBAC Check - Can user drag FROM this column?**
    if (sourceColumn?.can_drag_from_here_roles?.length > 0) {
      const userRole = getUserRole();
      if (!sourceColumn.can_drag_from_here_roles.includes(userRole)) {
        alert(`You don't have permission to move proposals out of "${sourceColumn.label}". Required role: ${sourceColumn.can_drag_from_here_roles.join(', ')}`);
        return;
      }
    }

    // **PHASE 3: RBAC Check - Can user drag TO this column?**
    if (destinationColumn?.can_drag_to_here_roles?.length > 0) {
      const userRole = getUserRole();
      if (!destinationColumn.can_drag_to_here_roles.includes(userRole)) {
        alert(`You don't have permission to move proposals into "${destinationColumn.label}". Required role: ${destinationColumn.can_drag_to_here_roles.join(', ')}`);
        return;
      }
    }

    // **PHASE 3: WIP Limit Check (HARD enforcement)**
    const currentDestProposals = getProposalsForColumn(destinationColumn);
    if (destinationColumn?.wip_limit > 0 && destinationColumn?.wip_limit_type === 'hard') {
      // If the item is *not* moving within the same column and limit is reached
      if (source.droppableId !== destination.droppableId && currentDestProposals.length >= destinationColumn.wip_limit) {
        alert(`Cannot move to "${destinationColumn.label}". WIP limit of ${destinationColumn.wip_limit} has been reached. Please move other proposals out first.`);
        return;
      }
    }

    // **PHASE 3: Approval Gate Check**
    if (sourceColumn?.requires_approval_to_exit) {
      // Open approval gate modal
      setApprovalGateData({
        proposal,
        sourceColumn,
        destinationColumn,
        destinationIndex: destination.index
      });
      setShowApprovalGate(true);
      return; // Don't proceed with move until approved
    }

    // If all checks pass, proceed with the move
    await performProposalMove(proposal, sourceColumn, destinationColumn, destination.index);
  };

  // Handle approval gate completion
  const handleApprovalComplete = async (approved) => {
    setShowApprovalGate(false);

    if (approved && approvalGateData) {
      // Approval granted, perform the move
      await performProposalMove(
        approvalGateData.proposal,
        approvalGateData.sourceColumn,
        approvalGateData.destinationColumn,
        approvalGateData.destinationIndex
      );
    }

    setApprovalGateData(null);
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
      alert(`Cannot delete column "${columnToDelete.label}" as it is a locked system column.`);
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

  const handleConfigureColumn = () => {
    setShowBoardConfig(true);
  };

  const handleCreateProposalInColumn = (column) => {
    // Navigate to proposal builder
    // Could potentially set initial phase based on column in the future
    navigate(createPageUrl("ProposalBuilder"));
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

  const handleRunMigration = async () => {
    if (!window.confirm('⚠️ IMPORTANT: This will migrate your Kanban board to the new 8-phase workflow.\n\nYour existing proposals will be preserved and mapped to new columns.\n\nThis action cannot be undone.\n\nContinue?')) {
      return;
    }

    setIsMigrating(true);
    
    try {
      const response = await base44.functions.invoke('migrateToNewKanbanWorkflow', {
        organization_id: organization.id
      });

      if (response.data.success) {
        alert(`✅ Migration Completed Successfully!\n\n` +
              `• ${response.data.migration_log.proposals_migrated} proposals migrated\n` +
              `• ${response.data.migration_log.new_columns_count} new columns created\n\n` +
              `Your board will now reload with the new workflow.`);
        
        // Refresh the config and proposals
        queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
        queryClient.invalidateQueries({ queryKey: ['proposals'] });
        
        if (onRefresh) {
          onRefresh();
        }
      } else {
        throw new Error(response.data.message || 'Migration failed');
      }
    } catch (error) {
      console.error('Migration error:', error);
      alert(`❌ Migration Failed\n\n${error.message || 'Unknown error occurred'}\n\nPlease contact support if this issue persists.`);
    } finally {
      setIsMigrating(false);
    }
  };

  // Show loading state while fetching config
  if (isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[600px] p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <LayoutGrid className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Loading Your Board</h2>
            <p className="text-lg text-slate-600 mb-4">
              Please wait while we load your Kanban configuration...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show config error if any
  if (configError) {
    return (
      <div className="flex items-center justify-center min-h-[600px] p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Error Loading Board Configuration</h2>
            <p className="text-lg text-slate-600 mb-6">
              {configError.message || "Failed to load Kanban configuration"}
            </p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['kanban-config'] })} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show legacy config migration prompt
  if (isLegacyConfig && !isLoadingConfig) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[600px] p-6">
          <Card className="max-w-2xl border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Upgrade to New Workflow</h2>
              <p className="text-lg text-slate-600 mb-6 max-w-lg mx-auto">
                We've detected you're using an older Kanban board configuration. 
                Upgrade to our new 8-phase workflow system for better proposal management with:
              </p>
              <div className="text-left mb-8 max-w-lg mx-auto bg-slate-50 rounded-lg p-6">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-slate-700">Interactive checklists for each proposal stage</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-slate-700">AI-powered actions and modals</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-slate-700">15 optimized workflow stages</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-slate-700">Approval gates and automation rules</span>
                  </li>
                </ul>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-900">
                  <strong>Note:</strong> Your existing proposals will be preserved and mapped to the new workflow stages. This process takes just a few seconds.
                </p>
              </div>
              
              {user?.role === 'admin' ? (
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={handleRunMigration}
                    disabled={isMigrating}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6"
                  >
                    {isMigrating ? (
                      <>
                        <div className="animate-spin mr-2">⏳</div>
                        Migrating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Run Automatic Migration
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowSetupWizard(true)}
                    disabled={isMigrating}
                    className="text-lg px-8 py-6"
                  >
                    Manual Setup
                  </Button>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Admin Access Required:</strong> Only organization administrators can perform this migration. Please contact your admin to upgrade your workflow.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <KanbanSetupWizard
          isOpen={showSetupWizard}
          onClose={() => setShowSetupWizard(false)}
          organization={organization}
        />
      </>
    );
  }

  // If no kanban config (and not loading), show setup wizard prompt
  if (!hasKanbanConfig && !isLoadingConfig) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[600px] p-6">
          <Card className="max-w-2xl border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <LayoutGrid className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Setup Your Kanban Board</h2>
              <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
                Get started by choosing a workflow template that matches your proposal process.
                You can customize it later to fit your exact needs.
              </p>
              <Button
                onClick={() => setShowSetupWizard(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Setup Workflow
              </Button>
            </CardContent>
          </Card>
        </div>

        <KanbanSetupWizard
          isOpen={showSetupWizard}
          onClose={() => setShowSetupWizard(false)}
          organization={organization}
        />
      </>
    );
  }

  // Add a check to ensure columns is an array before rendering
  const validColumns = Array.isArray(columns) ? columns : [];

  if (validColumns.length === 0 && !isLoadingConfig && hasKanbanConfig) {
    return (
      <div className="flex items-center justify-center min-h-[600px] p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">No Columns Configured</h2>
            <p className="text-lg text-slate-600 mb-6">
              Your Kanban board exists but has no columns. Please configure your board.
            </p>
            <Button onClick={() => setShowBoardConfig(true)} className="bg-blue-600 hover:bg-blue-700">
              <Settings className="w-4 h-4 mr-2" />
              Configure Board
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Top Controls Bar */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200">
        <div className="p-4 space-y-4">
          {/* Main Action Bar */}
          <div className="flex items-center justify-between gap-4">
            <Button
              onClick={handleCreateProposal}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Proposal
            </Button>

            <div className="flex items-center gap-2">
              {/* Zoom Controls - REMOVED (causes drag issues) */}
              
              {/* Filters Button */}
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center bg-white text-blue-600 hover:bg-white">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

              {/* Configure Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBoardConfig(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>

              {/* Help Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHelpPanel(true)}
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-sm">Filter Proposals</h3>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                    <X className="w-4 h-4 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search proposals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={filterAgency} onValueChange={setFilterAgency}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Agencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agencies</SelectItem>
                    {uniqueAgencies.map(agency => (
                      <SelectItem key={agency} value={agency}>{agency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Team Members" />
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
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden bg-slate-100">
        <div ref={boardRef} className="h-full overflow-x-auto overflow-y-visible p-4">
          <DragDropContext
            onDragEnd={onDragEnd}
            onDragUpdate={handleDragUpdate}
            onBeforeDragStart={() => {
              setDragInProgress(true);
            }}
          >
            <Droppable droppableId="all-columns" direction="horizontal" type="column">
              {(providedOuter) => (
                <div
                  ref={providedOuter.innerRef}
                  {...providedOuter.droppableProps}
                  className="flex gap-4 h-full"
                  style={{
                    // REMOVED zoom transform that was causing drag issues
                    // transform: `scale(${zoomLevel})`,
                    // transformOrigin: 'top left',
                    minWidth: 'min-content'
                  }}
                >
                  {validColumns.map((column, index) => {
                    const isCollapsed = effectiveCollapsedColumns.includes(column.id);
                    const columnProposals = getProposalsForColumn(column);

                    return (
                      <Draggable
                        key={column.id}
                        draggableId={column.id}
                        index={index}
                        type="column"
                        isDragDisabled={column.is_locked}
                      >
                        {(providedDraggable, snapshotDraggable) => (
                          <div 
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            className={cn(
                              "transition-opacity",
                              snapshotDraggable.isDragging && "opacity-70"
                            )}
                          >
                            {isCollapsed ? (
                              <div
                                className="w-12 bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => toggleColumnCollapse(column.id)}
                                {...providedDraggable.dragHandleProps}
                              >
                                <div className="p-3 flex flex-col items-center gap-3 h-full">
                                  <div
                                    className="text-xs font-semibold text-slate-700 whitespace-nowrap"
                                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                                  >
                                    {column.label}
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    {columnProposals.length}
                                  </Badge>
                                  <ChevronsRight className="w-4 h-4 text-slate-400 mt-auto" />
                                </div>
                              </div>
                            ) : (
                              <Droppable droppableId={column.id} type="card">
                                {(providedDroppable, snapshotDroppable) => (
                                  <KanbanColumn
                                    column={column}
                                    proposals={columnProposals}
                                    provided={providedDroppable}
                                    snapshot={snapshotDroppable}
                                    onCardClick={handleCardClick}
                                    onToggleCollapse={toggleColumnCollapse}
                                    organization={organization}
                                    onRenameColumn={handleRenameColumn}
                                    onConfigureColumn={handleConfigureColumn}
                                    user={user}
                                    dragHandleProps={providedDraggable.dragHandleProps}
                                    onCreateProposal={handleCreateProposalInColumn}
                                  />
                                )}
                              </Droppable>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {providedOuter.placeholder}
                </div>
              )}
            </Droppable>
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

      {/* Approval Gate Modal */}
      {showApprovalGate && approvalGateData && (
        <ApprovalGate
          isOpen={showApprovalGate}
          onClose={() => {
            setShowApprovalGate(false);
            setApprovalGateData(null);
          }}
          proposal={approvalGateData.proposal}
          sourceColumn={approvalGateData.sourceColumn}
          destinationColumn={approvalGateData.destinationColumn}
          onApprovalComplete={handleApprovalComplete}
          user={user}
          organization={organization}
        />
      )}

      {/* Onboarding Tour */}
      <KanbanOnboardingTour
        isOpen={showOnboardingTour}
        onClose={() => setShowOnboardingTour(false)}
        onComplete={() => {
          localStorage.setItem('kanban_tour_completed', 'true');
          setShowOnboardingTour(false);
        }}
      />

      {/* Help Panel */}
      <KanbanHelpPanel
        isOpen={showHelpPanel}
        onClose={() => setShowHelpPanel(false)}
      />
    </>
  );
}
