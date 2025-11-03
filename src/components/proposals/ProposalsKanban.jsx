
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
  ZoomOut,
  LayoutGrid, // Added import for LayoutGrid
  Sparkles, // Added import for Sparkles
  HelpCircle // Added import for HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import BoardConfigDialog from "./BoardConfigDialog";
import ProposalCardModal from "./ProposalCardModal";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ApprovalGate from "./ApprovalGate";
import KanbanSetupWizard from "./KanbanSetupWizard"; // Added import
import { Card, CardContent } from "@/components/ui/card"; // Added import
import KanbanOnboardingTour from "./KanbanOnboardingTour";
import KanbanHelpPanel from "./KanbanHelpPanel"; // Added import

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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const [showApprovalGate, setShowApprovalGate] = useState(false);
  const [approvalGateData, setApprovalGateData] = useState(null);
  const [dragInProgress, setDragInProgress] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false); // Added state for setup wizard
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false); // New state for help panel

  // Fetch kanban config
  const { data: kanbanConfig, isLoading: isLoadingConfig } = useQuery({ // Added isLoading: isLoadingConfig
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
        // Only create default if it's the first time and there's no custom config available.
        // For now, let the setup wizard handle initial creation if none exists,
        // so we can return null here to trigger the wizard.
        return null;
      }

      return configs[0];
    },
    enabled: !!organization?.id
  });

  // Check if Kanban config exists and has columns
  const hasKanbanConfig = useMemo(() => {
    return !!kanbanConfig && kanbanConfig.columns && kanbanConfig.columns.length > 0;
  }, [kanbanConfig]);

  const columns = kanbanConfig?.columns || DEFAULT_COLUMNS; // Still use DEFAULT_COLUMNS as a fallback for internal logic
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
  }, [handleZoomIn, handleZoomOut]);

  // Check if user has completed the tour
  useEffect(() => {
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

  const getProposalsForColumn = useCallback((column) => {
    let columnProposals = [];

    if (column.type === 'default_status') {
      columnProposals = filteredProposals.filter(p => p.status === column.default_status_mapping);
    } else if (column.type === 'custom_stage') {
      columnProposals = filteredProposals.filter(p => p.custom_workflow_stage_id === column.id);
    } else if (column.type === 'locked_phase') {
      columnProposals = filteredProposals.filter(p => p.current_phase === column.phase_mapping);
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
  }, [filteredProposals, columnSorts]);


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

  const onDragEnd = async (result) => {
    setDragOverColumnId(null);

    if (!result.destination || dragInProgress) return;

    const { source, destination, draggableId } = result;

    // If dropped in same position, do nothing
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

  // If no kanban config, show setup wizard prompt
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelpPanel(true)}
              title="Help & shortcuts"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Help
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
            onDragEnd={onDragEnd}
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
