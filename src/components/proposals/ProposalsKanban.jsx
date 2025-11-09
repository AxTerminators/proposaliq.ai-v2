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

export default function ProposalsKanban({ proposals, organization, user, kanbanConfig: propKanbanConfig, onRefresh }) {
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
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const [showApprovalGate, setShowApprovalGate] = useState(false);
  const [approvalGateData, setApprovalGateData] = useState(null);
  const [dragInProgress, setDragInProgress] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showNewProposalDialog, setShowNewProposalDialog] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [advancedFilteredProposals, setAdvancedFilteredProposals] = useState(null);
  const [selectedProposalIds, setSelectedProposalIds] = useState([]);

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
      isMasterBoard: kanbanConfig?.is_master_board,
      boardCategory: kanbanConfig?.board_category
    });
  }, [proposals.length, kanbanConfig, isLoadingConfig]);

  const hasKanbanConfig = useMemo(() => {
    return !!kanbanConfig && kanbanConfig.columns && kanbanConfig.columns.length > 0;
  }, [kanbanConfig]);

  // UPDATED: Legacy detection now considers board_category
  const isLegacyConfig = useMemo(() => {
    if (!kanbanConfig?.columns) return false;
    
    // NEW BOARDS: If board has board_category, it's NOT legacy
    if (kanbanConfig.board_category) {
      return false;
    }
    
    // If board has board_type or is_master_board flag, it's NOT legacy
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
    
    return hasOldColumns && !hasNewColumns && kanbanConfig.columns.length > 1 && kanbanConfig.columns.length < 15;
  }, [kanbanConfig]);

  const columns = kanbanConfig?.columns || [];
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

  useEffect(() => {
    if (hasKanbanConfig && !isLoadingConfig) {
      const tourCompleted = localStorage.getItem('kanban_tour_completed');
      if (!tourCompleted) {
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
    if (advancedFilteredProposals !== null) {
      return advancedFilteredProposals;
    }

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
      
      if (kanbanConfig?.is_master_board) {
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
          console.warn('[Kanban] No master column match for proposal:', proposal.proposal_name, 'status:', proposal.status);
          if (columns.length > 0) {
            assignments[proposal.id] = {
              columnId: columns[0].id,
              columnType: 'master_status'
            };
          }
        }
      } 
      else if (kanbanConfig?.board_category === 'proposal_board') {
        if (proposal.custom_workflow_stage_id) {
          const matchingColumn = columns.find(col => col.id === proposal.custom_workflow_stage_id);
          if (matchingColumn) {
            assignments[proposal.id] = {
              columnId: proposal.custom_workflow_stage_id,
              columnType: 'custom_stage'
            };
          }
        }
        else if (['won', 'lost', 'archived', 'submitted'].includes(proposal.status)) {
          const matchingTerminalColumn = columns.find(
            col => col.type === 'default_status' && 
                   col.default_status_mapping === proposal.status &&
                   col.is_terminal === true
          );
          if (matchingTerminalColumn) {
            assignments[proposal.id] = {
              columnId: matchingTerminalColumn.id,
              columnType: 'default_status'
            };
          }
        }
        else if (proposal.current_phase) {
          const matchingLockedPhaseColumn = columns.find(
            col => col.type === 'locked_phase' && col.phase_mapping === proposal.current_phase
          );
          if (matchingLockedPhaseColumn) {
            assignments[proposal.id] = {
              columnId: matchingLockedPhaseColumn.id,
              columnType: 'locked_phase'
            };
          }
        }
        else {
          const matchingDefaultStatusColumn = columns.find(
            col => col.type === 'default_status' && col.default_status_mapping === proposal.status
          );
          if (matchingDefaultStatusColumn) {
            assignments[proposal.id] = {
              columnId: matchingDefaultStatusColumn.id,
              columnType: 'default_status'
            };
          }
        }
      }
      else if (kanbanConfig?.board_category === 'project_management_board') {
        if (proposal.custom_workflow_stage_id) {
          assignments[proposal.id] = {
            columnId: proposal.custom_workflow_stage_id,
            columnType: 'custom_stage'
          };
        }
      }
      else {
        if (proposal.custom_workflow_stage_id) {
          assignments[proposal.id] = {
            columnId: proposal.custom_workflow_stage_id,
            columnType: 'custom_stage'
          };
        } 
        else if (['won', 'lost', 'archived', 'submitted'].includes(proposal.status)) {
          const matchingTerminalColumn = columns.find(
            col => col.type === 'default_status' && 
                   col.default_status_mapping === proposal.status &&
                   col.is_terminal === true
          );
          if (matchingTerminalColumn) {
            assignments[proposal.id] = {
              columnId: matchingTerminalColumn.id,
              columnType: 'default_status'
            };
          }
        }
        else if (proposal.current_phase) {
          const matchingLockedPhaseColumn = columns.find(
            col => col.type === 'locked_phase' && col.phase_mapping === proposal.current_phase
          );
          if (matchingLockedPhaseColumn) {
            assignments[proposal.id] = {
              columnId: matchingLockedPhaseColumn.id,
              columnType: 'locked_phase'
            };
          }
        }
        else {
          const matchingDefaultStatusColumn = columns.find(
            col => col.type === 'default_status' && col.default_status_mapping === proposal.status
          );
          if (matchingDefaultStatusColumn) {
            assignments[proposal.id] = {
              columnId: matchingDefaultStatusColumn.id,
              columnType: 'default_status'
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

    if (column.is_terminal) {
      columnProposals = filteredProposals.filter(proposal => {
        if (!proposal) return false;
        const statusMatch = proposal.status === column.default_status_mapping;
        return statusMatch;
      });
    } 
    else {
      columnProposals = filteredProposals.filter(proposal => {
        if (!proposal) return false;
        
        const assignment = proposalColumnAssignments[proposal.id];
        if (!assignment) return false;
        
        return assignment.columnId === column.id;
      });
    }

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
        
        if (kanbanConfig?.board_category === 'proposal_board' && destinationColumn.master_board_status_mapping) {
          updatesForMovedProposal.status = destinationColumn.master_board_status_mapping;
        } else {
          updatesForMovedProposal.status = 'in_progress';
        }
      } else if (destinationColumn.type === 'default_status') {
        updatesForMovedProposal.status = destinationColumn.default_status_mapping;
        updatesForMovedProposal.current_phase = null;
        updatesForMovedProposal.custom_workflow_stage_id = null;
      } else if (destinationColumn.type === 'master_status') {
        if (destinationColumn.status_mapping && destinationColumn.status_mapping.length > 0) {
          updatesForMovedProposal.status = destinationColumn.status_mapping[0];
        }
        updatesForMovedProposal.current_phase = null;
        updatesForMovedProposal.custom_workflow_stage_id = null;
      }

      if (sourceColumn.id !== destinationColumn.id) {
        const updatedChecklistStatus = { ...(proposal.current_stage_checklist_status || {}) };
        updatedChecklistStatus[destinationColumn.id] = {};
        updatesForMovedProposal.current_stage_checklist_status = updatedChecklistStatus;
      }

      const hasRequiredItems = destinationColumn.checklist_items?.some(item => item.required);
      updatesForMovedProposal.action_required = hasRequiredItems;
      updatesForMovedProposal.action_required_description = hasRequiredItems ? `Complete required items in ${destinationColumn.label}` : null;

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
        boardCategory: kanbanConfig?.board_category,
        updates: updatesForMovedProposal
      });

      await updateProposalMutation.mutateAsync({
        proposalId: proposal.id,
        updates: updatesForMovedProposal
      });

      const otherUpdatesInDestColumn = batchOrderUpdates.filter(u => u.proposalId !== proposal.id);
      if (otherUpdatesInDestColumn.length > 0) {
        await Promise.all(otherUpdatesInDestColumn.map(item => updateProposalMutation.mutateAsync(item)));
      }

      if (destinationColumn.wip_limit > 0 && destinationColumn.wip_limit_type === 'soft') {
        if (newColumnProposalsMap[destinationColumn.id].length > destinationColumn.wip_limit) {
          alert(`⚠️ Note: "${destinationColumn.label}" has exceeded its WIP limit of ${destinationColumn.wip_limit}. Current count: ${newColumnProposalsMap[destinationColumn.id].length}`);
        }
      }
    } catch (error) {
      console.error("Error moving proposal:", error);
      alert("Failed to move proposal. Please try again.");
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    } finally {
      setDragInProgress(false);
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

  const onDragEnd = async (result) => {
    setDragOverColumnId(null);
    setDragInProgress(false);

    if (!result.destination) return;

    const { source, destination, draggableId, type } = result;

    if (type === "column") {
      if (source.index === destination.index) return;

      const reorderedColumns = Array.from(columns);
      const [movedColumn] = reorderedColumns.splice(source.index, 1);
      
      if (movedColumn.is_locked) {
        alert("Cannot reorder locked system columns.");
        queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
        return;
      }

      reorderedColumns.splice(destination.index, 0, movedColumn);

      reorderedColumns.forEach((col, idx) => {
        col.order = idx;
      });

      await base44.entities.KanbanConfig.update(kanbanConfig.id, {
        columns: reorderedColumns
      });

      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
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
        
        alert(`🔒 Cannot drag from "${sourceColumn.label}"\n\n` +
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
        
        alert(`🔒 Cannot drag to "${destinationColumn.label}"\n\n` +
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
        alert(`Cannot move to "${destinationColumn.label}". WIP limit of ${destinationColumn.wip_limit} has been reached. Please move other proposals out first.`);
        return;
      }
    }

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

  const handleCardClick = (proposal) => {
    setSelectedProposal(proposal);
    setShowProposalModal(true);
  };

  const handleCreateProposal = () => {
    setShowNewProposalDialog(true);
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

  if (isLegacyConfig && !isLoadingConfig) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[600px] p-6">
          <Card className="max-w-2xl border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-3">Update Your Kanban Board Configuration</h2>
              <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
                It looks like your Kanban board is using an outdated configuration.
                Choose a new workflow template to get access to the latest features.
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
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 bg-white border-b border-slate-200">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Proposal Board</h2>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowGlobalSearch(true)}
                variant="outline"
                size="sm"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <AdvancedFilterPanel
                proposals={proposals}
                onFilterChange={handleAdvancedFilterChange}
                teamMembers={uniqueTeamMembers}
              />
              <Button
                onClick={() => setShowBoardConfig(true)}
                variant="outline"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Board
              </Button>
            </div>
          </div>

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
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Quick Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center bg-white text-blue-600 hover:bg-white">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>

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
                                  <ChevronsRight className="w-4 h-4" />
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
                                    selectedProposalIds={selectedProposalIds}
                                    onToggleProposalSelection={handleToggleProposalSelection}
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
        onComplete={() => {
          localStorage.setItem('kanban_tour_completed', 'true');
          setShowOnboardingTour(false);
        }}
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
    </div>
  );
}