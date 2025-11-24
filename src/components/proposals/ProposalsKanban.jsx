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
  LayoutGrid,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Star,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import BoardConfigDialog from "./BoardConfigDialog";
import ProposalCardModal from "./ProposalCardModal";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ApprovalGate from "./ApprovalGate";
import { Card, CardContent } from "@/components/ui/card";
import KanbanOnboardingTour from "./KanbanOnboardingTour";
import KanbanHelpPanel from "./KanbanHelpPanel";
import QuickCreateProposal from "./QuickCreateProposal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AdvancedFilterPanel from "./AdvancedFilterPanel";
import GlobalSearch from "./GlobalSearch";
import BulkActionsPanel from "./BulkActionsPanel";
import WinToPromoteDialog from "./WinToPromoteDialog";
import ConfirmDialog from "../ui/ConfirmDialog";
import { toast } from 'sonner';
import { useLazyLoadColumns } from "./useLazyLoadProposals";


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

export default function ProposalsKanban({ proposals, organization, user, kanbanConfig: propKanbanConfig, onRefresh, showQuickFilters, showHelp, onOpenProposal }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const boardRef = useRef(null);
  const autoScrollIntervalRef = useRef(null);
  const columnRefs = useRef({});

  const [showFilters, setShowFilters] = useState(false);
  const [magneticColumnId, setMagneticColumnId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAgency, setFilterAgency] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [showBoardConfig, setShowBoardConfig] = useState(false);
  const [columnSorts, setColumnSorts] = useState({});
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const [showApprovalGate, setShowApprovalGate] = useState(false);
  const [approvalGateData, setApprovalGateData] = useState(null);
  const [dragInProgress, setDragInProgress] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showNewProposalDialog, setShowNewProposalDialog] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [advancedFilteredProposals, setAdvancedFilteredProposals] = useState(null);
  const [selectedProposalIds, setSelectedProposalIds] = useState([]);
  const [showWinPromoteDialog, setShowWinPromoteDialog] = useState(false);
  const [winningProposal, setWinningProposal] = useState(null);
  const [showDeleteColumnConfirm, setShowDeleteColumnConfirm] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState(null);

  // Sync external props to internal state
  useEffect(() => {
    if (showQuickFilters !== undefined) {
      setShowFilters(showQuickFilters);
    }
  }, [showQuickFilters]);

  useEffect(() => {
    if (showHelp !== undefined) {
      setShowHelpPanel(showHelp);
    }
  }, [showHelp]);

  // Use propKanbanConfig if provided, otherwise fetch
  const { data: fetchedKanbanConfig, isLoading: isLoadingConfig, error: configError } = useQuery({
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
    enabled: !!organization?.id && !propKanbanConfig,
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  // Use provided config or fetched config
  const kanbanConfig = propKanbanConfig || fetchedKanbanConfig;

  useEffect(() => {
    console.log('[Kanban] Data update:', {
      proposalsCount: proposals.length,
      hasConfig: !!kanbanConfig,
      columnsCount: kanbanConfig?.columns?.length || 0,
      isLoadingConfig,
      boardType: kanbanConfig?.board_type,
      isMasterBoard: kanbanConfig?.is_master_board
    });
  }, [proposals.length, kanbanConfig, isLoadingConfig]);

  const hasKanbanConfig = useMemo(() => {
    return !!kanbanConfig && kanbanConfig.columns && kanbanConfig.columns.length > 0;
  }, [kanbanConfig]);

  // IMPROVED: More explicit legacy detection - only flag boards that are truly legacy
  const isLegacyConfig = useMemo(() => {
    if (!kanbanConfig?.columns) return false;
    
    // NEW BOARDS: If board has board_type or is_master_board flag, it's NOT legacy
    if (kanbanConfig.board_type || kanbanConfig.is_master_board === true || kanbanConfig.is_master_board === false) {
      return false;
    }
    
    // LEGACY DETECTION: Old boards that lack the new metadata
    const hasOldColumns = kanbanConfig.columns.some(col => 
      ['new', 'evaluate', 'qualify', 'gather', 'analyze', 'strategy', 'outline', 'drafting', 'review', 'final', 'submitted', 'won', 'lost', 'archived'].includes(col.id)
    );
    
    const hasNewColumns = kanbanConfig.columns.some(col => 
      ['initiate', 'team', 'resources', 'solicit'].includes(col.id)
    );
    
    // Only flag as legacy if it has old columns, no new columns, and lacks new board metadata
    return hasOldColumns && !hasNewColumns && kanbanConfig.columns.length > 1 && kanbanConfig.columns.length < 15;
  }, [kanbanConfig]);

  const columns = kanbanConfig?.columns || [];
  const effectiveCollapsedColumns = kanbanConfig?.collapsed_column_ids || [];

  const toggleColumnCollapse = async (columnId) => {
    if (!kanbanConfig) return;

    console.log('[Kanban] 🔄 Toggling collapse for column:', columnId);

    const currentCollapsed = kanbanConfig.collapsed_column_ids || [];
    const newCollapsed = currentCollapsed.includes(columnId)
      ? currentCollapsed.filter(id => id !== columnId)
      : [...currentCollapsed, columnId];

    console.log('[Kanban] New collapsed columns:', newCollapsed);

    // OPTIMISTIC UPDATE: Update the cache immediately for instant UI response
    queryClient.setQueryData(['all-kanban-boards', organization?.id], (oldBoards) => {
      if (!oldBoards) return oldBoards;
      return oldBoards.map(board => 
        board.id === kanbanConfig.id 
          ? { ...board, collapsed_column_ids: newCollapsed }
          : board
      );
    });

    if (!propKanbanConfig) {
      queryClient.setQueryData(['kanban-config', organization?.id], (oldConfig) => {
        if (!oldConfig) return oldConfig;
        return { ...oldConfig, collapsed_column_ids: newCollapsed };
      });
    }

    try {
      await base44.entities.KanbanConfig.update(kanbanConfig.id, {
        collapsed_column_ids: newCollapsed
      });

      console.log('[Kanban] ✅ Database updated successfully');
    } catch (error) {
      console.error('[Kanban] ❌ Error updating collapse state:', error);
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      queryClient.invalidateQueries({ queryKey: ['all-kanban-boards'] });
      toast.error('Failed to update column collapse state. Please try again.');
    }
  };

  // UPDATED: Check UserPreference instead of just localStorage
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!hasKanbanConfig || isLoadingConfig || !user || !organization) {
        return;
      }

      try {
        // Check UserPreference first
        const prefs = await base44.entities.UserPreference.filter({
          user_email: user.email,
          organization_id: organization.id,
          preference_type: "onboarding_status",
          preference_name: "kanban_board_onboarding_completed"
        });

        if (prefs.length > 0) {
          // User has completed onboarding, don't show tour
          console.log('[KanbanOnboarding] User has completed tour previously');
          return;
        }

        // Fallback check to localStorage (for backwards compatibility)
        const tourCompleted = localStorage.getItem('kanban_tour_completed');
        if (tourCompleted) {
          // Migrate localStorage flag to UserPreference
          try {
            await base44.entities.UserPreference.create({
              user_email: user.email,
              organization_id: organization.id,
              preference_type: "onboarding_status",
              preference_name: "kanban_board_onboarding_completed",
              preference_data: JSON.stringify({ 
                completed: true, 
                migrated_from_localStorage: true,
                completed_date: new Date().toISOString() 
              }),
              is_default: false
            });
            console.log('[KanbanOnboarding] Migrated localStorage flag to UserPreference');
          } catch (e) {
            console.warn('[KanbanOnboarding] Could not migrate localStorage flag:', e);
          }
          return;
        }

        // Show the tour
        setTimeout(() => {
          setShowOnboardingTour(true);
        }, 1000);
      } catch (error) {
        console.error('[KanbanOnboarding] Error checking onboarding status:', error);
        // Fallback to localStorage check only
        const tourCompleted = localStorage.getItem('kanban_tour_completed');
        if (!tourCompleted) {
          setTimeout(() => {
            setShowOnboardingTour(true);
          }, 1000);
        }
      }
    };

    checkOnboardingStatus();
  }, [hasKanbanConfig, isLoadingConfig, user, organization]);

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

  // Get unique team members for filters (for AdvancedFilterPanel)
  const uniqueTeamMembers = useMemo(() => {
    const members = new Set();
    proposals.forEach(p => {
      if (p.assigned_team_members) {
        p.assigned_team_members.forEach(email => members.add(email));
      }
      if (p.lead_writer_email) {
        members.add(p.lead_writer_email);
      }
    });
    return Array.from(members).sort();
  }, [proposals]);

  const filteredProposals = useMemo(() => {
    // If advanced filters are applied, use those results
    if (advancedFilteredProposals !== null) {
      return advancedFilteredProposals;
    }

    // Otherwise use basic filters
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
  }, [proposals, searchQuery, filterAgency, filterAssignee, advancedFilteredProposals]);

  const proposalColumnAssignments = useMemo(() => {
    const assignments = {};
    
    filteredProposals.forEach(proposal => {
      if (!proposal) return;
      
      // MASTER BOARD LOGIC - map by status_mapping array
      if (kanbanConfig?.is_master_board) {
        // Find the master column that includes this proposal's status
        const matchingColumn = columns.find(col => 
          col.type === 'master_status' && 
          col.status_mapping?.includes(proposal.status)
        );
        
        if (matchingColumn) {
          assignments[proposal.id] = {
            columnId: matchingColumn.id,
            columnType: 'master_status'
          };
        } else {
          // Fallback to first column if no match
          console.warn('[Kanban] No master column match for proposal:', proposal.proposal_name, 'status:', proposal.status, 'assigned to first column.');
          if (columns.length > 0) {
            assignments[proposal.id] = {
              columnId: columns[0].id,
              columnType: 'master_status'
            };
          }
        }
      } 
      // CUSTOM BOARD LOGIC - Updated hierarchy
      else {
        // Priority 1: Terminal status columns ALWAYS take priority (submitted, won, lost, archived)
        if (['submitted', 'won', 'lost', 'archived'].includes(proposal.status)) {
          const matchingTerminalColumn = columns.find(
            col => col.status_mapping?.includes(proposal.status) || 
                   col.default_status_mapping === proposal.status
          );
          if (matchingTerminalColumn) {
            assignments[proposal.id] = {
              columnId: matchingTerminalColumn.id,
              columnType: matchingTerminalColumn.type
            };
          }
        }
        // Priority 2: Custom workflow stage ID (for proposals in custom boards)
        else if (proposal.custom_workflow_stage_id) {
          const matchingCustomColumn = columns.find(col => col.id === proposal.custom_workflow_stage_id);
          if (matchingCustomColumn) {
            assignments[proposal.id] = {
              columnId: proposal.custom_workflow_stage_id,
              columnType: 'custom_stage'
            };
          }
        } 
        // Priority 3: Fallback to Master Board status_mapping arrays
        else {
          const matchingColumn = columns.find(col => 
            col.status_mapping?.includes(proposal.status)
          );
          if (matchingColumn) {
            assignments[proposal.id] = {
              columnId: matchingColumn.id,
              columnType: matchingColumn.type || 'custom_stage'
            };
          }
        }
      }
    });
    
    const unassigned = filteredProposals.filter(p => p && !assignments[p.id]);
    if (unassigned.length > 0) {
      console.warn('[Kanban] Unassigned proposals:', unassigned.map(p => ({
        id: p.id,
        name: p.proposal_name,
        custom_workflow_stage_id: p.custom_workflow_stage_id,
        current_phase: p.current_phase,
        status: p.status,
        type: p.proposal_type_category
      })));
    }
    
    return assignments;
  }, [filteredProposals, columns, kanbanConfig]);

  const getProposalsForColumn = useCallback((column) => {
    if (!column || !proposals) {
      return [];
    }

    let columnProposals;

    // TERMINAL COLUMNS: Show ALL proposals with matching status, regardless of type
    if (column.is_terminal) {
      columnProposals = filteredProposals.filter(proposal => {
        if (!proposal) return false;
        
        // Match by status for terminal columns
        const statusMatch = proposal.status === column.default_status_mapping;
        
        return statusMatch;
      });
    } 
    // NON-TERMINAL COLUMNS: Filter by assignment
    else {
      columnProposals = filteredProposals.filter(proposal => {
        if (!proposal) return false;
        
        const assignment = proposalColumnAssignments[proposal.id];
        if (!assignment) return false;
        
        return assignment.columnId === column.id;
      });
    }

    // Apply sorting
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
  }, [filteredProposals, proposalColumnAssignments, columnSorts, proposals]);

  const validColumns = Array.isArray(columns) ? columns : [];

  // **NEW: Lazy loading for columns**
  const proposalsByColumn = useMemo(() => {
    const byColumn = {};
    
    validColumns.forEach(column => {
      byColumn[column.id] = getProposalsForColumn(column);
    });
    
    return byColumn;
  }, [validColumns, getProposalsForColumn]);

  const {
    getVisibleProposals,
    hasMore,
    loadMore,
    loadAll,
    getStats
  } = useLazyLoadColumns(proposalsByColumn, 10, 10);

  const handleColumnSortChange = (columnId, sortBy, direction) => {
    setColumnSorts(prev => {
      const current = prev[columnId];
      if (current?.by === sortBy && direction === undefined) { // If same sort by and no explicit direction, toggle
        return {
          ...prev,
          [columnId]: { by: sortBy, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        };
      } else { // If new sort by, or explicit direction provided, use that
        return {
          ...prev,
          [columnId]: { by: sortBy, direction: direction || 'asc' } // If direction is undefined, default to 'asc'
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
    },
  });

  const getUserRole = () => {
    if (!user || !organization) {
      console.log('[RBAC] No user or organization, defaulting to viewer');
      return 'viewer';
    }
    
    if (user.role === 'admin') {
      console.log('[RBAC] User is platform admin, granting organization_owner role');
      return 'organization_owner';
    }

    const orgAccess = user.client_accesses?.find(
      access => access.organization_id === organization.id
    );

    const role = orgAccess?.role || 'viewer';
    
    console.log('[RBAC] User role for this organization:', {
      userEmail: user.email,
      organizationId: organization.id,
      organizationName: organization.organization_name,
      role: role,
      allAccesses: user.client_accesses
    });

    return role;
  };

  const getStatusFromPhase = (phase_mapping) => {
    switch (phase_mapping) {
      case 'phase1':
      case 'phase2':
      case 'phase3':
      case 'phase4':
        return 'qualifying';
      case 'phase5':
      case 'phase6':
        return 'drafting';
      case 'phase7':
        return 'reviewing';
      default:
        return 'qualifying';
    }
  };

  const performProposalMove = async (proposal, sourceColumn, destinationColumn, destinationIndex) => {
    try {
      setDragInProgress(true);

      const updatesForMovedProposal = {};

      if (destinationColumn.type === 'locked_phase') {
        updatesForMovedProposal.current_phase = destinationColumn.phase_mapping;
        updatesForMovedProposal.status = getStatusFromPhase(destinationColumn.phase_mapping);
        updatesForMovedProposal.custom_workflow_stage_id = destinationColumn.id;
      } else if (destinationColumn.type === 'custom_stage') {
        updatesForMovedProposal.custom_workflow_stage_id = destinationColumn.id;
        updatesForMovedProposal.current_phase = null;
        updatesForMovedProposal.status = destinationColumn.status_mapping?.[0] || 'qualifying';
      } else if (destinationColumn.type === 'default_status') {
        updatesForMovedProposal.status = destinationColumn.default_status_mapping;
        updatesForMovedProposal.current_phase = null;
        // CRITICAL FIX: Don't clear custom_workflow_stage_id for terminal columns
        // This preserves the board association so proposals stay on their type-specific boards
        if (!destinationColumn.is_terminal && !['submitted', 'won', 'lost', 'archived'].includes(destinationColumn.default_status_mapping)) {
          updatesForMovedProposal.custom_workflow_stage_id = null;
        }
        // For terminal columns, keep the existing custom_workflow_stage_id to maintain board association
      } else if (destinationColumn.type === 'master_status') {
        if (destinationColumn.status_mapping && destinationColumn.status_mapping.length > 0) {
          updatesForMovedProposal.status = destinationColumn.status_mapping[0];
        }
        updatesForMovedProposal.current_phase = null;
        // Don't clear custom_workflow_stage_id on master board either
      }

      if (sourceColumn.id !== destinationColumn.id) {
        const updatedChecklistStatus = { ...(proposal.current_stage_checklist_status || {}) };
        if (!updatedChecklistStatus[destinationColumn.id]) {
          updatedChecklistStatus[destinationColumn.id] = {};
        }
        updatesForMovedProposal.current_stage_checklist_status = updatedChecklistStatus;
        
        console.log('[Kanban] 🔄 Preserving checklist status:', {
          proposalName: proposal.proposal_name,
          sourceColumn: sourceColumn.label,
          destinationColumn: destinationColumn.label,
          existingChecklistData: updatedChecklistStatus[destinationColumn.id],
          hasExistingData: Object.keys(updatedChecklistStatus[destinationColumn.id] || {}).length > 0
        });
      }

      // **FIXED: Check if required items are actually incomplete**
      const destinationChecklistStatus = proposal.current_stage_checklist_status?.[destinationColumn.id] || {};
      const hasIncompleteRequiredItems = destinationColumn.checklist_items
        ?.filter(item => item && item.required && item.type !== 'system_check')
        .some(item => !destinationChecklistStatus[item.id]?.completed);
      
      updatesForMovedProposal.action_required = hasIncompleteRequiredItems || false;
      updatesForMovedProposal.action_required_description = hasIncompleteRequiredItems 
        ? `Complete required items in ${destinationColumn.label}` 
        : null;

      console.log('[Kanban] 📋 Action Required Status:', {
        destinationColumn: destinationColumn.label,
        hasRequiredItems: destinationColumn.checklist_items?.some(item => item.required),
        hasIncompleteRequiredItems,
        action_required: updatesForMovedProposal.action_required,
        existingChecklistStatus: destinationChecklistStatus
      });

      const newColumnProposalsMap = {};
      columns.forEach(col => {
          newColumnProposalsMap[col.id] = getProposalsForColumn(col);
      });

      newColumnProposalsMap[sourceColumn.id] = newColumnProposalsMap[sourceColumn.id].filter(
          p => p.id !== proposal.id
      );

      const destColumnProposals = Array.from(newColumnProposalsMap[destinationColumn.id]);
      const existingIndexInDest = destColumnProposals.findIndex(p => p.id === proposal.id);
      if (existingIndexInDest !== -1) {
          destColumnProposals.splice(existingIndexInDest, 1);
      }
      destColumnProposals.splice(destinationIndex, 0, proposal);
      newColumnProposalsMap[destinationColumn.id] = destColumnProposals;

      const batchOrderUpdates = newColumnProposalsMap[destinationColumn.id].map((item, idx) => ({
        proposalId: item.id,
        updates: { manual_order: idx }
      }));

      const draggedProposalOrderUpdate = batchOrderUpdates.find(u => u.proposalId === proposal.id);
      if (draggedProposalOrderUpdate) {
        updatesForMovedProposal.manual_order = draggedProposalOrderUpdate.updates.manual_order;
      } else {
        updatesForMovedProposal.manual_order = destinationIndex;
      }

      console.log('[Kanban] Moving proposal:', {
        proposalId: proposal.id,
        proposalName: proposal.proposal_name,
        from: sourceColumn.label,
        to: destinationColumn.label,
        updates: updatesForMovedProposal
      });

      console.log('[Drag] 💾 Updating proposal in database...');

      // Update in database first - no optimistic update to avoid disappearing cards
      await updateProposalMutation.mutateAsync({
        proposalId: proposal.id,
        updates: updatesForMovedProposal
      });

      console.log('[Drag] ✅ Proposal updated successfully');

      const otherUpdatesInDestColumn = batchOrderUpdates.filter(u => u.proposalId !== proposal.id);
      if (otherUpdatesInDestColumn.length > 0) {
        // Run these in parallel for better performance
        await Promise.all(otherUpdatesInDestColumn.map(item => updateProposalMutation.mutateAsync(item)));
      }

      // **NEW: Check if moved from submitted to won - trigger promote dialog**
      const isMovingToWon = (
        (sourceColumn.default_status_mapping === 'submitted' || sourceColumn.status_mapping?.includes('submitted')) &&
        (destinationColumn.default_status_mapping === 'won' || destinationColumn.status_mapping?.includes('won'))
      );

      if (isMovingToWon) {
        console.log('[Kanban] 🎉 Proposal won! Showing promote dialog...');
        setTimeout(() => {
          setWinningProposal(proposal);
          setShowWinPromoteDialog(true);
        }, 300);
      }

      if (destinationColumn.wip_limit > 0 && destinationColumn.wip_limit_type === 'soft') {
          if (newColumnProposalsMap[destinationColumn.id].length > destinationColumn.wip_limit) {
              toast(`⚠️ Note: "${destinationColumn.label}" has exceeded its WIP limit of ${destinationColumn.wip_limit}. Current count: ${newColumnProposalsMap[destinationColumn.id].length}`);
          }
      }
    } catch (error) {
      console.error("[Drag] ❌ Error moving proposal:", error);
      toast.error("Failed to move proposal. Please try again.");
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    } finally {
      setDragInProgress(false);
      console.log('[Drag] 🔄 Refreshing proposals from server...');
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  };

  const handleDragUpdate = (update) => {
    if (update.destination && update.type === "card") {
      setDragOverColumnId(update.destination.droppableId);
    } else {
      setDragOverColumnId(null);
    }
  };

  // Mouse position-based auto-scroll and magnetic snapping during drag
  useEffect(() => {
    let rafId = null;
    let scrollAnimationId = null;
    let continuousScrollInterval = null;
    
    const smoothScroll = (targetScroll) => {
      const board = boardRef.current;
      if (!board) return;

      const currentScroll = board.scrollLeft;
      const distance = targetScroll - currentScroll;
      const speed = Math.abs(distance) > 100 ? 25 : 15; // Faster for larger distances
      
      if (Math.abs(distance) > 1) {
        board.scrollLeft += Math.sign(distance) * speed;
        scrollAnimationId = requestAnimationFrame(() => smoothScroll(targetScroll));
      } else {
        board.scrollLeft = targetScroll;
        scrollAnimationId = null;
      }
    };
    
    const handleMouseMove = (e) => {
      if (!dragInProgress || !boardRef.current) return;

      // Use requestAnimationFrame to throttle updates and prevent render thrashing
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        const board = boardRef.current;
        if (!board) return;
        
        const threshold = 350; // INCREASED: Larger trigger zone (was 250)
        const maxScrollSpeed = 50; // DOUBLED: Much faster scrolling (was 25)
        const viewportWidth = window.innerWidth;
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Magnetic snapping - find which column the mouse is over or scrolling towards
        let closestColumnId = null;
        let closestDistance = Infinity;
        const magneticThreshold = 400; // Increased threshold for wider detection
        
        // Get scroll position to account for off-screen columns
        const scrollLeft = board.scrollLeft;

        Object.entries(columnRefs.current).forEach(([columnId, ref]) => {
          if (ref) {
            const rect = ref.getBoundingClientRect();
            
            // Calculate column position relative to the scrollable container
            const columnLeftInContainer = rect.left + scrollLeft;
            const columnRightInContainer = rect.right + scrollLeft;
            const mouseXInContainer = mouseX + scrollLeft;
            
            // Check if column is near the mouse position (accounting for scroll)
            const isNearHorizontally = 
              mouseXInContainer >= columnLeftInContainer - magneticThreshold && 
              mouseXInContainer <= columnRightInContainer + magneticThreshold;
            
            // Check if column is visible or partially visible in viewport
            const isVisible = rect.right > 0 && rect.left < viewportWidth;
            
            // Calculate distance from mouse to column center
            const columnCenterX = rect.left + rect.width / 2;
            const distance = Math.abs(mouseX - columnCenterX);
            
            // Column is magnetic if:
            // 1. Mouse is near it horizontally (in container coordinates)
            // 2. Mouse is vertically aligned with column
            // 3. It's the closest column so far
            if (isNearHorizontally && 
                mouseY >= rect.top && 
                mouseY <= rect.bottom + 100 && 
                distance < closestDistance &&
                (isVisible || Math.abs(mouseX - (rect.left < 0 ? 0 : viewportWidth)) < threshold * 2)) {
              closestDistance = distance;
              closestColumnId = columnId;
            }
          }
        });

        setMagneticColumnId(closestColumnId);

        // ENHANCED: Aggressive auto-scroll - continuous even when mouse is still
        const scrollEdgeThreshold = threshold;
        let shouldScroll = false;
        let scrollDirection = 0;

        // Check if near left edge
        if (mouseX < scrollEdgeThreshold && board.scrollLeft > 0) {
          shouldScroll = true;
          scrollDirection = -1;
          const distanceFromEdge = mouseX;
          const speedMultiplier = Math.max(0.3, (scrollEdgeThreshold - distanceFromEdge) / scrollEdgeThreshold); // Min 30% speed
          const scrollSpeed = Math.ceil(speedMultiplier * maxScrollSpeed) || 5; // Minimum 5px scroll
          board.scrollLeft -= scrollSpeed;
          
          // CONTINUOUS SCROLL: Start interval if not already running
          if (!continuousScrollInterval) {
            continuousScrollInterval = setInterval(() => {
              const board = boardRef.current;
              if (board && board.scrollLeft > 0) {
                board.scrollLeft -= scrollSpeed;
              } else {
                clearInterval(continuousScrollInterval);
                continuousScrollInterval = null;
              }
            }, 16); // ~60fps
          }
        }
        // Check if near right edge
        else if (mouseX > viewportWidth - scrollEdgeThreshold && 
                 board.scrollLeft < board.scrollWidth - board.clientWidth) {
          shouldScroll = true;
          scrollDirection = 1;
          const distanceFromEdge = viewportWidth - mouseX;
          const speedMultiplier = Math.max(0.3, (scrollEdgeThreshold - distanceFromEdge) / scrollEdgeThreshold); // Min 30% speed
          const scrollSpeed = Math.ceil(speedMultiplier * maxScrollSpeed) || 5; // Minimum 5px scroll
          board.scrollLeft += scrollSpeed;
          
          // CONTINUOUS SCROLL: Start interval if not already running
          if (!continuousScrollInterval) {
            continuousScrollInterval = setInterval(() => {
              const board = boardRef.current;
              if (board && board.scrollLeft < board.scrollWidth - board.clientWidth) {
                board.scrollLeft += scrollSpeed;
              } else {
                clearInterval(continuousScrollInterval);
                continuousScrollInterval = null;
              }
            }, 16); // ~60fps
          }
        }
        // Stop continuous scroll if mouse moves away from edges
        else if (continuousScrollInterval) {
          clearInterval(continuousScrollInterval);
          continuousScrollInterval = null;
        }

        // If we have a magnetic column that's partially off-screen, scroll to reveal it
        if (closestColumnId && columnRefs.current[closestColumnId] && !shouldScroll) {
          const magneticColumnRect = columnRefs.current[closestColumnId].getBoundingClientRect();
          const scrollOffset = 150; // Padding from edge
          
          if (magneticColumnRect.left < scrollOffset && board.scrollLeft > 0) {
            // Column is off-screen to the left, scroll left to reveal it
            const targetScrollLeft = Math.max(0, board.scrollLeft + magneticColumnRect.left - scrollOffset);
            board.scrollLeft = targetScrollLeft;
          } else if (magneticColumnRect.right > viewportWidth - scrollOffset && 
                     board.scrollLeft < board.scrollWidth - board.clientWidth) {
            // Column is off-screen to the right, scroll right to reveal it
            const targetScrollLeft = Math.min(
              board.scrollWidth - board.clientWidth, 
              board.scrollLeft + (magneticColumnRect.right - viewportWidth) + scrollOffset
            );
            board.scrollLeft = targetScrollLeft;
          }
        }
      });
    };

    if (dragInProgress) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (scrollAnimationId) {
        cancelAnimationFrame(scrollAnimationId);
      }
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
        autoScrollIntervalRef.current = null;
      }
      if (continuousScrollInterval) {
        clearInterval(continuousScrollInterval);
        continuousScrollInterval = null;
      }
    };
  }, [dragInProgress]);

  const onDragEnd = async (result) => {
    console.log('[Drag] 🎯 onDragEnd called', { result, hasDestination: !!result.destination });
    
    setDragOverColumnId(null);
    setDragInProgress(false);
    setMagneticColumnId(null);
    
    // Clear auto-scroll interval
    if (autoScrollIntervalRef.current) {
      clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }

    if (!result.destination) {
      console.log('[Drag] ⚠️ No destination - drag cancelled or dropped outside');
      return;
    }

    const { source, destination, draggableId, type } = result;

    if (type === "column") {
      if (source.index === destination.index) return;

      const reorderedColumns = Array.from(columns);
      const [movedColumn] = reorderedColumns.splice(source.index, 1);
      
      if (movedColumn.is_locked) {
        toast.error("Cannot reorder locked system columns.");
        queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
        return;
      }

      reorderedColumns.splice(destination.index, 0, movedColumn);

      reorderedColumns.forEach((col, idx) => {
        col.order = idx;
      });

      try {
        await base44.entities.KanbanConfig.update(kanbanConfig.id, {
          columns: reorderedColumns
        });
        queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      } catch (error) {
        console.error("Error reordering columns:", error);
        toast.error("Failed to reorder columns. Please try again.");
        queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      }
      return;
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const proposal = proposals.find(p => p.id === draggableId);
    if (!proposal) return;

    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destinationColumn = columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destinationColumn) return;

    const userRole = getUserRole();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[RBAC] 🎯 DRAG ATTEMPT ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[RBAC] Proposal:', proposal.proposal_name);
    console.log('[RBAC] From Column:', sourceColumn.label, `(type: ${sourceColumn.type})`);
    console.log('[RBAC] To Column:', destinationColumn.label, `(type: ${destinationColumn.type})`);
    console.log('[RBAC] Your Role:', userRole);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('[RBAC] 🔍 Checking SOURCE column permissions...');
    console.log('[RBAC] Source column "can_drag_from_here_roles":', sourceColumn.can_drag_from_here_roles);
    
    if (sourceColumn?.can_drag_from_here_roles?.length > 0) {
      const hasPermissionToDragFrom = sourceColumn.can_drag_from_here_roles.includes(userRole);
      console.log('[RBAC] Permission to drag FROM source?', hasPermissionToDragFrom ? '✅ YES' : '❌ NO');
      
      if (!hasPermissionToDragFrom) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[RBAC] ❌ DRAG BLOCKED!');
        console.error('[RBAC] Reason: Cannot drag FROM source column');
        console.error('[RBAC] Column:', sourceColumn.label);
        console.error('[RBAC] Required roles:', sourceColumn.can_drag_from_here_roles);
        console.error('[RBAC] Your role:', userRole);
        console.error('[RBAC] FIX: Go to Configure → Edit \'' + sourceColumn.label + '\' column → Add \'' + userRole + '\' to "Can Drag From Here Roles"');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        toast.error(`🔒 Cannot drag from "${sourceColumn.label}"\n\n` +
              `Required roles: ${sourceColumn.can_drag_from_here_roles.join(', ')}\n` +
              `Your role: ${userRole}\n\n` +
              `FIX: Go to Configure → Edit "${sourceColumn.label}" → Update "Can Drag From Here Roles"`);
        return;
      }
    } else {
      console.log('[RBAC] ✅ No restrictions on dragging from source column');
    }

    console.log('[RBAC] 🔍 Checking DESTINATION column permissions...');
    console.log('[RBAC] Destination column "can_drag_to_here_roles":', destinationColumn.can_drag_to_here_roles);
    
    if (destinationColumn?.can_drag_to_here_roles?.length > 0) {
      const hasPermissionToDragTo = destinationColumn.can_drag_to_here_roles.includes(userRole);
      console.log('[RBAC] Permission to drag TO destination?', hasPermissionToDragTo ? '✅ YES' : '❌ NO');
      
      if (!hasPermissionToDragTo) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('[RBAC] ❌ DRAG BLOCKED!');
        console.error('[RBAC] Reason: Cannot drag TO destination column');
        console.error('[RBAC] Column:', destinationColumn.label);
        console.error('[RBAC] Required roles:', destinationColumn.can_drag_to_here_roles);
        console.error('[RBAC] Your role:', userRole);
        console.error('[RBAC] FIX: Go to Configure → Edit \'' + destinationColumn.label + '\' column → Add \'' + userRole + '\' to "Can Drag To Here Roles"');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        toast.error(`🔒 Cannot drag to "${destinationColumn.label}"\n\n` +
              `Required roles: ${destinationColumn.can_drag_to_here_roles.join(', ')}\n` +
              `Your role: ${userRole}\n\n` +
              `FIX: Go to Configure → Edit "${destinationColumn.label}" → Update "Can Drag To Here Roles"`);
        return;
      }
    } else {
      console.log('[RBAC] ✅ No restrictions on dragging to destination column');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[RBAC] ✅ ALL PERMISSION CHECKS PASSED - Proceeding with move');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const currentDestProposals = getProposalsForColumn(destinationColumn);
    if (destinationColumn?.wip_limit > 0 && destinationColumn?.wip_limit_type === 'hard') {
      if (source.droppableId !== destination.droppableId && currentDestProposals.length >= destinationColumn.wip_limit) {
        toast.error(`Cannot move to "${destinationColumn.label}". WIP limit of ${destinationColumn.wip_limit} has been reached. Please move other proposals out first.`);
        return;
      }
    }

    // Check if approval is required when exiting source column
    // Only require approval when moving to terminal/end-state columns
    if (sourceColumn?.requires_approval_to_exit) {
      const terminalColumns = ['submitted', 'won', 'lost', 'archived'];
      const isMovingToTerminalState = terminalColumns.includes(destinationColumn.id) || destinationColumn.is_terminal;
      
      console.log('[RBAC] 🔐 Checking approval requirements...');
      console.log('[RBAC] Source requires approval to exit:', sourceColumn.requires_approval_to_exit);
      console.log('[RBAC] Destination column ID:', destinationColumn.id);
      console.log('[RBAC] Is moving to terminal state?', isMovingToTerminalState);
      
      if (isMovingToTerminalState) {
        console.log('[RBAC] ⚠️ Approval required - showing approval gate');
        setApprovalGateData({
          proposal,
          sourceColumn,
          destinationColumn,
          destinationIndex: destination.index
        });
        setShowApprovalGate(true);
        return;
      } else {
        console.log('[RBAC] ✅ No approval required - destination is not a terminal state');
      }
    }

    await performProposalMove(proposal, sourceColumn, destinationColumn, destination.index);
  };

  const handleApprovalComplete = async (approved) => {
    setShowApprovalGate(false);

    if (approved && approvalGateData) {
      await performProposalMove(
        approvalGateData.proposal,
        approvalGateData.sourceColumn,
        approvalGateData.destinationColumn,
        approvalGateData.destinationIndex
      );
    }

    setApprovalGateData(null);
  };

  const handleCardClick = (proposal, initialModal = null) => {
    // If on master board and onOpenProposal is provided, delegate to parent
    if (kanbanConfig?.is_master_board && onOpenProposal) {
      onOpenProposal(proposal, initialModal);
    } else {
      setSelectedProposal(proposal);
      setShowProposalModal(true);
    }
  };

  const handleCreateProposal = () => {
    setShowNewProposalDialog(true);
  };

  const handleAddColumn = async (insertIndex) => {
    if (!kanbanConfig) {
      toast.error("Please configure your board first using the 'Configure Board' button");
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

    try {
      await base44.entities.KanbanConfig.update(kanbanConfig.id, {
        columns: updatedColumns
      });
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      toast.success("New column added successfully!");
    } catch (error) {
      console.error("Error adding column:", error);
      toast.error("Failed to add new column. Please try again.");
    }
  };

  const handleDeleteColumn = async (columnId) => {
    if (!kanbanConfig) return;

    const column = columns.find(c => c.id === columnId);
    if (!column || column.is_locked) {
      toast.error(`Cannot delete "${column?.label || 'this column'}" - it is a locked system column`);
      return;
    }

    const proposalsInColumn = proposals.filter(p => p.custom_workflow_stage_id === columnId);

    if (proposalsInColumn.length > 0) {
      toast.error(`Cannot delete "${column.label}" - it contains ${proposalsInColumn.length} proposals. Move them first.`);
      return;
    }

    setColumnToDelete(column);
    setShowDeleteColumnConfirm(true);
  };

  const confirmDeleteColumn = async () => {
    if (!columnToDelete) return;

    const updatedColumns = columns.filter(c => c.id !== columnToDelete.id);

    updatedColumns.forEach((col, idx) => {
      col.order = idx;
    });

    try {
      await base44.entities.KanbanConfig.update(kanbanConfig.id, {
        columns: updatedColumns
      });

      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      setShowDeleteColumnConfirm(false);
      setColumnToDelete(null);
      toast.success(`Column "${columnToDelete.label}" deleted successfully`);
    } catch (error) {
      console.error("Error deleting column:", error);
      toast.error("Failed to delete column. Please try again.");
      setShowDeleteColumnConfirm(false);
      setColumnToDelete(null);
    }
  };


  const handleRenameColumn = async (columnId, newLabel) => {
    if (!kanbanConfig) return;

    const updatedColumns = columns.map(col =>
      col.id === columnId ? { ...col, label: newLabel } : col
    );

    try {
      await base44.entities.KanbanConfig.update(kanbanConfig.id, {
        columns: updatedColumns
      });
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      toast.success("Column renamed successfully!");
    } catch (error) {
      console.error("Error renaming column:", error);
      toast.error("Failed to rename column. Please try again.");
    }
  };

  const handleConfigureColumn = () => {
    setShowBoardConfig(true);
  };

  const handleCreateProposalInColumn = (column) => {
    setShowNewProposalDialog(true);
  };

  const handleCreateProposalWithType = (proposalType) => {
    setShowNewProposalDialog(false);
  };

  const handleAdvancedFilterChange = (filtered) => {
    setAdvancedFilteredProposals(filtered.length === proposals.length ? null : filtered);
  };

  const handleToggleProposalSelection = (proposalId) => {
    setSelectedProposalIds(prev => 
      prev.includes(proposalId)
        ? prev.filter(id => id !== proposalId)
        : [...prev, proposalId]
    );
  };

  const handleClearSelection = () => {
    setSelectedProposalIds([]);
  };

  const selectedProposalsData = useMemo(() => {
    return proposals.filter(p => selectedProposalIds.includes(p.id));
  }, [proposals, selectedProposalIds]);

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAgency("all");
    setFilterAssignee("all");
    setAdvancedFilteredProposals(null);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (filterAgency !== "all") count++;
    if (filterAssignee !== "all") count++;
    if (advancedFilteredProposals !== null) count++;
    return count;
  }, [searchQuery, filterAgency, filterAssignee, advancedFilteredProposals]);

  if (isLoadingConfig && !propKanbanConfig) {
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

  if (configError && !propKanbanConfig) {
    return (
      <div className="flex items-center justify-center min-h-[600px] p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="2xl font-bold text-slate-900 mb-3">Error Loading Board Configuration</h2>
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

  if (isLegacyConfig && !isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[600px] p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Update Your Kanban Board Configuration</h2>
            <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
              Your Kanban board is using an outdated configuration. Please create a new board from the Pipeline page using the "Create Board" option.
            </p>
            <Button
              onClick={() => setShowBoardConfig(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6"
            >
              <Settings className="w-5 h-5 mr-2" />
              Configure Board
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasKanbanConfig && !isLoadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-[600px] p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <LayoutGrid className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">No Board Configuration Found</h2>
            <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
              This board doesn't have a configuration yet. The master board should have been created automatically. Please return to the Pipeline page.
            </p>
            <Button
              onClick={() => navigate(createPageUrl("Pipeline"))}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6"
            >
              <LayoutGrid className="w-5 h-5 mr-2" />
              Go to Pipeline
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              Configure
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 bg-white border-b border-slate-200">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                {kanbanConfig?.board_name || 'Proposal Board'}
              </h2>
              {kanbanConfig?.is_master_board && (
                <Badge className="bg-amber-100 text-amber-700">
                  <Star className="w-3 h-3 mr-1 fill-amber-700" />
                  Master Board
                </Badge>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-sm">Quick Filters</h3>
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

              {advancedFilteredProposals !== null && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge className="bg-blue-600 text-white">
                    Advanced filters active: {advancedFilteredProposals.length} results
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAdvancedFilteredProposals(null)}
                    className="h-7"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-slate-100">
        <DragDropContext
          onDragEnd={onDragEnd}
          onDragUpdate={handleDragUpdate}
          onBeforeDragStart={() => {
            setDragInProgress(true);
          }}
        >
          <div ref={boardRef} className="overflow-x-auto overflow-y-auto h-full px-4">
            <Droppable droppableId="all-columns" direction="horizontal" type="column" mode="virtual" renderClone={(provided, snapshot, rubric) => {
              const column = validColumns[rubric.source.index];
              return (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className="w-80 opacity-80"
                >
                  <div className="bg-white border-2 border-blue-400 rounded-xl shadow-xl p-3">
                    <div className="font-semibold text-slate-900">{column?.label || 'Column'}</div>
                  </div>
                </div>
              );
            }}>
              {(providedOuter) => (
                <div
                  ref={providedOuter.innerRef}
                  {...providedOuter.droppableProps}
                  className="flex gap-4 pt-4 pb-4"
                  style={{
                    minWidth: 'min-content',
                    alignItems: 'flex-start',
                    minHeight: '100%'
                  }}
                >
                  {validColumns.map((column, index) => {
                    const isCollapsed = effectiveCollapsedColumns.includes(column.id);
                    const columnProposals = getVisibleProposals(column.id);
                    const stats = getStats(column.id);

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
                              "transition-all duration-200 ease-out",
                              snapshotDraggable.isDragging && "opacity-70 scale-105"
                            )}
                            style={{
                              ...providedDraggable.draggableProps.style,
                              transition: 'all 0.2s ease-out'
                            }}
                          >
                            {isCollapsed ? (
                              <div
                                className="w-12 bg-white border-2 border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer"
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
                                    {stats.total}
                                  </Badge>
                                  <ChevronsRight className="w-4 h-4 text-slate-600" />
                                </div>
                              </div>
                            ) : (
                              <Droppable droppableId={column.id} type="card">
                                {(providedDroppable, snapshotDroppable) => (
                                  <div ref={(el) => columnRefs.current[column.id] = el}>
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
                                      selectedProposalIds={selectedProposalIds}
                                      onToggleProposalSelection={handleToggleProposalSelection}
                                      totalCount={stats.total}
                                      visibleCount={stats.visible}
                                      hasMore={hasMore(column.id)}
                                      onLoadMore={() => loadMore(column.id)}
                                      onLoadAll={() => loadAll(column.id)}
                                      onColumnSortChange={handleColumnSortChange}
                                      onClearColumnSort={handleClearColumnSort}
                                      currentSort={columnSorts[column.id]}
                                      isMagnetic={magneticColumnId === column.id}
                                      kanbanConfig={kanbanConfig}
                                    />
                                  </div>
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
          </div>
        </DragDropContext>
      </div>

      <GlobalSearch
        organization={organization}
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
      />

      <BulkActionsPanel
        selectedProposals={selectedProposalsData}
        onClearSelection={handleClearSelection}
        organization={organization}
        kanbanConfig={kanbanConfig}
      />

      {showBoardConfig && (
        <BoardConfigDialog
          isOpen={showBoardConfig}
          onClose={() => setShowBoardConfig(false)}
          organization={organization}
          currentConfig={kanbanConfig}
          onAddColumn={handleAddColumn}
          onDeleteColumn={handleDeleteColumn}
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

      <KanbanOnboardingTour
        isOpen={showOnboardingTour}
        onClose={() => setShowOnboardingTour(false)}
        onComplete={async () => {
          if (user && organization) {
            try {
              await base44.entities.UserPreference.create({
                user_email: user.email,
                organization_id: organization.id,
                preference_type: "onboarding_status",
                preference_name: "kanban_board_onboarding_completed",
                preference_data: JSON.stringify({ completed: true, completed_date: new Date().toISOString() }),
                is_default: false
              });
              console.log('[KanbanOnboarding] Kanban tour completion recorded in UserPreference.');
            } catch (e) {
              console.error('[KanbanOnboarding] Failed to record tour completion in UserPreference:', e);
            }
          } else {
            console.warn('[KanbanOnboarding] User or organization not available to record tour completion.');
          }
          setShowOnboardingTour(false);
        }}
        user={user}
        organization={organization}
      />

      <KanbanHelpPanel
        isOpen={showHelpPanel}
        onClose={() => setShowHelpPanel(false)}
      />

      <QuickCreateProposal
        isOpen={showNewProposalDialog}
        onClose={() => setShowNewProposalDialog(false)}
        organization={organization}
        preselectedType={kanbanConfig?.applies_to_proposal_types?.[0] || null}
      />

      {showWinPromoteDialog && winningProposal && (
        <WinToPromoteDialog
          isOpen={showWinPromoteDialog}
          onClose={() => {
            setShowWinPromoteDialog(false);
            setWinningProposal(null);
          }}
          proposal={winningProposal}
          organization={organization}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteColumnConfirm}
        onClose={() => {
          setShowDeleteColumnConfirm(false);
          setColumnToDelete(null);
        }}
        onConfirm={confirmDeleteColumn}
        title="Delete Column?"
        variant="danger"
        confirmText="Yes, Delete Column"
        cancelText="Cancel"
      >
        <p className="text-slate-700">
          Are you sure you want to delete the column <strong>"{columnToDelete?.label}"</strong>?
          This action cannot be undone.
        </p>
      </ConfirmDialog>
    </div>
  );
}