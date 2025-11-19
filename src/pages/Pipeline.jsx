import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, Table, BarChart3, Zap, AlertCircle, RefreshCw, Database, Building2, Activity, X, Layers, DollarSign, TrendingUp, Search as SearchIcon, Settings, Trash2, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import ProposalsKanban from "@/components/proposals/ProposalsKanban";
import ProposalsList from "@/components/proposals/ProposalsList";
import ProposalsTable from "@/components/proposals/ProposalsTable";
import PipelineAnalytics from "@/components/analytics/PipelineAnalytics";
import SnapshotGenerator from "@/components/analytics/SnapshotGenerator";
import SmartAutomationEngine from "@/components/automation/SmartAutomationEngine";
import AIWorkflowSuggestions from "@/components/automation/AIWorkflowSuggestions";
import AutomationExecutor from "@/components/automation/AutomationExecutor";
import MobileKanbanView from "@/components/mobile/MobileKanbanView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SampleDataGuard from "@/components/ui/SampleDataGuard";
import PredictiveHealthDashboard from "@/components/proposals/PredictiveHealthDashboard";
import QuickCreateProposal from "@/components/proposals/QuickCreateProposal";
import QuickBoardCreation from "@/components/proposals/QuickBoardCreation";
import BoardAnalytics from "@/components/proposals/BoardAnalytics";
import SavedViews from "@/components/proposals/SavedViews";
import BoardActivityFeed from "@/components/proposals/BoardActivityFeed";
import GlobalSearch from "@/components/proposals/GlobalSearch";
import MultiBoardAnalytics from "@/components/analytics/MultiBoardAnalytics";
import { Badge } from "@/components/ui/badge";
import ProposalCardModal from "@/components/proposals/ProposalCardModal";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PipelineBanner from "@/components/proposals/PipelineBanner";
import AdvancedFilterPanel from "@/components/proposals/AdvancedFilterPanel";

export default function Pipeline() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState("kanban");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSampleDataGuard, setShowSampleDataGuard] = useState(false);
  const [showHealthDashboard, setShowHealthDashboard] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState(null);
  const hasInitialized = useRef(false);
  const [isCreatingMasterBoard, setIsCreatingMasterBoard] = useState(false);
  const [showBoardSwitcher, setShowBoardSwitcher] = useState(false);
  const [showNewProposalDialog, setShowNewProposalDialog] = useState(false);
  const [showCreateBoardDialog, setShowCreateBoardDialog] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showQuickBoardCreate, setShowQuickBoardCreate] = useState(false);
  const [showBoardAnalytics, setShowBoardAnalytics] = useState(false);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [savedFilters, setSavedFilters] = useState({
    searchQuery: "",
    filterAgency: "all",
    filterAssignee: "all"
  });
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [listGroupBy, setListGroupBy] = useState('none');
  const [tableGroupBy, setTableGroupBy] = useState('none');
  const [showMultiBoardAnalytics, setShowMultiBoardAnalytics] = useState(false);
  const [showBoardManager, setShowBoardManager] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(null);
  const [showDeleteBoardDialog, setShowDeleteBoardDialog] = useState(false);
  const [selectedProposalToOpen, setSelectedProposalToOpen] = useState(null);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [initialModalToOpen, setInitialModalToOpen] = useState(null);
  const [pendingProposalModal, setPendingProposalModal] = useState(null);
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [showMigrateConfirm, setShowMigrateConfirm] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showQuickFilters, setShowQuickFilters] = useState(false);
  const [advancedFilteredProposals, setAdvancedFilteredProposals] = useState(null);
  const [showSavedViews, setShowSavedViews] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      return currentUser;
    },
    staleTime: 300000,
    retry: 1
  });

  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['current-organization', user?.email],
    queryFn: async () => {
      if (!user) return null;

      let orgId = user.active_client_id;

      if (!orgId && user.client_accesses?.length > 0) {
        orgId = user.client_accesses[0].organization_id;
      }

      if (!orgId) {
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          orgId = orgs[0].id;
        }
      }

      if (orgId) {
        const orgs = await base44.entities.Organization.filter({ id: orgId });
        if (orgs.length > 0) {
          return orgs[0];
        }
      }

      return null;
    },
    enabled: !!user,
    staleTime: 300000,
    retry: 1
  });

  const { data: allBoards = [], isLoading: isLoadingBoards, refetch: refetchBoards } = useQuery({
    queryKey: ['all-kanban-boards', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      console.log('[Pipeline] Fetching all boards for org:', organization.id);
      const boards = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        'board_type'
      );
      console.log('[Pipeline] Found boards:', boards.length);
      return boards;
    },
    enabled: !!organization?.id,
    staleTime: 60000,
    retry: 1,
  });

  const { data: proposalsData = [], isLoading: isLoadingProposals, error: proposalsError, refetch: refetchProposals } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        console.log('[Pipeline] No organization ID, skipping proposal fetch');
        return [];
      }
      console.log('[Pipeline] Fetching proposals for org:', organization.id);
      const results = await base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
      console.log('[Pipeline] Fetched proposals:', results.length);
      return results || [];
    },
    enabled: !!organization?.id,
    staleTime: 10000,
    retry: 3,
    retryDelay: 1000,
    initialData: [],
  });

  const proposals = proposalsData;

  useEffect(() => {
    const ensureMasterBoard = async () => {
      if (organization?.id && allBoards.length === 0 && !isLoadingBoards) {
        console.log('[Pipeline] No boards found, auto-creating master board');
        try {
          const response = await base44.functions.invoke('ensureMasterBoardOnFirstLoad', {
            organization_id: organization.id
          });

          if (response.data.success && response.data.was_created) {
            console.log('[Pipeline] Master board auto-created');
            await refetchBoards();
          }
        } catch (error) {
          console.error('[Pipeline] Error auto-creating master board:', error);
        }
      }
    };

    ensureMasterBoard();
  }, [organization?.id, allBoards.length, isLoadingBoards, refetchBoards]);

  // Initialize board selection from localStorage, URL, or default - runs only once
  useEffect(() => {
    if (allBoards.length === 0 || hasInitialized.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const boardIdFromUrl = urlParams.get('boardId');
    const boardIdFromStorage = localStorage.getItem('selectedBoardId');

    console.log('[Pipeline] 🔍 Initializing board selection');
    console.log('[Pipeline] URL boardId:', boardIdFromUrl);
    console.log('[Pipeline] LocalStorage boardId:', boardIdFromStorage);
    console.log('[Pipeline] Available boards:', allBoards.map(b => ({ id: b.id, name: b.board_name })));

    // Priority 1: Try to restore from localStorage
    if (boardIdFromStorage) {
      const boardExists = allBoards.find(b => b.id === boardIdFromStorage);
      if (boardExists) {
        console.log('[Pipeline] ✅ Restored board from localStorage:', boardExists.board_name);
        setSelectedBoardId(boardIdFromStorage);
        hasInitialized.current = true;
        return;
      } else {
        console.warn('[Pipeline] ⚠️ Board from localStorage not found, clearing...');
        localStorage.removeItem('selectedBoardId');
      }
    }

    // Priority 2: Try to restore from URL
    if (boardIdFromUrl) {
      const boardExists = allBoards.find(b => b.id === boardIdFromUrl);
      if (boardExists) {
        console.log('[Pipeline] ✅ Restored board from URL:', boardExists.board_name);
        setSelectedBoardId(boardIdFromUrl);
        localStorage.setItem('selectedBoardId', boardIdFromUrl);
        hasInitialized.current = true;
        return;
      } else {
        console.warn('[Pipeline] ⚠️ Board from URL not found, falling back to default');
      }
    }

    // Priority 3: Auto-select default board
    const masterBoard = allBoards.find(b => b.is_master_board === true);
    const boardToSelect = masterBoard || allBoards[0];
    console.log('[Pipeline] 🎯 Auto-selecting default board:', boardToSelect?.board_name);
    setSelectedBoardId(boardToSelect?.id);
    if (boardToSelect?.id) {
      localStorage.setItem('selectedBoardId', boardToSelect.id);
    }
    hasInitialized.current = true;
  }, [allBoards]);

  // Save to localStorage when board changes (only after initialization)
  useEffect(() => {
    if (!selectedBoardId || !hasInitialized.current) return;

    console.log('[Pipeline] 💾 Saving board selection to localStorage:', selectedBoardId);
    localStorage.setItem('selectedBoardId', selectedBoardId);

    // Also update URL for sharing
    const urlParams = new URLSearchParams(window.location.search);
    const currentBoardIdInUrl = urlParams.get('boardId');

    if (currentBoardIdInUrl !== selectedBoardId) {
      urlParams.set('boardId', selectedBoardId);
      
      const newUrl = `${createPageUrl("Pipeline")}?${urlParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
      
      console.log('[Pipeline] 📝 Updated URL with boardId:', selectedBoardId);
    }
  }, [selectedBoardId]);

  const selectedBoard = allBoards.find(b => b.id === selectedBoardId);

  // Read proposalId and tab from URL parameter on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const proposalIdFromUrl = urlParams.get('proposalId');
    const openTab = urlParams.get('tab'); // Also read tab parameter
    
    // Only proceed if a proposalId is in the URL, proposals are loaded, and no modal is currently open
    if (proposalIdFromUrl && proposals.length > 0 && !showProposalModal) {
      console.log('[Pipeline] 🔗 Found proposalId in URL:', proposalIdFromUrl);
      console.log('[Pipeline] 📑 Tab to open:', openTab || 'default');
      
      // Find the proposal
      const proposal = proposals.find(p => p.id === proposalIdFromUrl);
      
      if (proposal) {
        console.log('[Pipeline] ✅ Found proposal:', proposal.proposal_name);
        
        // Auto-open the modal
        setSelectedProposalToOpen(proposal);
        setShowProposalModal(true);
        
        // Store the tab to open if specified
        if (openTab) {
          sessionStorage.setItem('openProposalTab', openTab);
        }
        
        // Clear the URL parameter to avoid reopening on refresh, preserve other params
        urlParams.delete('proposalId');
        urlParams.delete('tab');
        const newUrl = urlParams.toString() 
          ? `${createPageUrl("Pipeline")}?${urlParams.toString()}`
          : createPageUrl("Pipeline");
        window.history.replaceState({}, '', newUrl);
      } else {
        console.warn('[Pipeline] ⚠️ Proposal not found for ID:', proposalIdFromUrl);
      }
    }
  }, [proposals, showProposalModal]);

  // Effect to handle pending proposal modal after board switch
  useEffect(() => {
    if (!pendingProposalModal) return;
    
    const { proposal, initialModal, targetBoardType, targetBoardId } = pendingProposalModal;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[Pipeline] 🔍 CHECKING MODAL READINESS');
    console.log('[Pipeline] Pending proposal:', proposal.proposal_name);
    console.log('[Pipeline] Target board type:', targetBoardType);
    console.log('[Pipeline] Target board ID:', targetBoardId);
    console.log('[Pipeline] Current board ID:', selectedBoard?.id);
    console.log('[Pipeline] Current board type:', selectedBoard?.board_type);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Check if the currently selected board matches the target
    let isCorrectBoard = false;
    
    if (targetBoardId) {
      isCorrectBoard = selectedBoard?.id === targetBoardId;
      console.log('[Pipeline] 🎯 Matching by board ID:', isCorrectBoard ? 'MATCH ✅' : 'NO MATCH ❌');
    } else if (targetBoardType === 'rfp_15_column') {
      isCorrectBoard = selectedBoard?.board_type === 'rfp_15_column';
      console.log('[Pipeline] 🎯 Matching by board type:', isCorrectBoard ? 'MATCH ✅' : 'NO MATCH ❌');
    } else {
      isCorrectBoard = selectedBoard?.applies_to_proposal_types?.includes(proposal.proposal_type_category) || false;
      console.log('[Pipeline] 🎯 Matching by proposal type:', isCorrectBoard ? 'MATCH ✅' : 'NO MATCH ❌');
    }
    
    if (isCorrectBoard && selectedBoard) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[Pipeline] ✅ OPENING MODAL NOW!');
      console.log('[Pipeline] Board name:', selectedBoard.board_name);
      console.log('[Pipeline] Modal to open:', initialModal);
      console.log('[Pipeline] Setting state...');
      
      // CRITICAL: Use setTimeout to ensure state updates don't conflict
      setTimeout(() => {
        console.log('[Pipeline] 🎭 Setting modal state...');
        setSelectedProposalToOpen(proposal);
        setInitialModalToOpen(initialModal);
        setShowProposalModal(true);
        setPendingProposalModal(null);
        console.log('[Pipeline] ✅ Modal state set!');
      }, 100);
    } else {
      console.log('[Pipeline] ⏳ Waiting for correct board...');
      console.log('[Pipeline] Reason:', !selectedBoard ? 'No selected board' : 'Board mismatch');
    }
  }, [selectedBoard, pendingProposalModal]);

  const filteredProposals = useMemo(() => {
    if (!selectedBoard) return proposals;
    if (!proposals) return [];

    if (selectedBoard.is_master_board) {
      return proposals;
    }

    // Also check board_type for special boards like rfp_15_column
    if (selectedBoard.board_type === 'rfp_15_column') {
      return proposals.filter(p => p.proposal_type_category === 'RFP_15_COLUMN');
    }

    if (selectedBoard.applies_to_proposal_types && selectedBoard.applies_to_proposal_types.length > 0) {
      return proposals.filter(p =>
        selectedBoard.applies_to_proposal_types.includes(p.proposal_type_category)
      );
    }

    return proposals;
  }, [proposals, selectedBoard]);

  const handleAdvancedFilterChange = (filtered) => {
    // If the filtered array has the same length as the base proposals (filteredProposals),
    // it means no filter is effectively applied, so we can set `advancedFilteredProposals` to null.
    // This allows `effectiveProposals` to fall back to `filteredProposals` directly, avoiding unnecessary processing.
    setAdvancedFilteredProposals(filtered.length === filteredProposals.length ? null : filtered);
  };

  // Get unique team members for advanced filters
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

  // Apply advanced filters to proposals
  const effectiveProposals = useMemo(() => {
    if (advancedFilteredProposals !== null) {
      return advancedFilteredProposals;
    }
    return filteredProposals;
  }, [filteredProposals, advancedFilteredProposals]);

  const pipelineStats = useMemo(() => {
    const totalValue = effectiveProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const formattedValue = totalValue >= 1000000
      ? `$${(totalValue / 1000000).toFixed(1)}M`
      : totalValue >= 1000
      ? `$${(totalValue / 1000).toFixed(0)}K`
      : `$${totalValue.toLocaleString()}`;

    const wonCount = proposals.filter(p => p.status === 'won').length;
    const submittedProposals = proposals.filter(p => ['submitted', 'won', 'lost'].includes(p.status)).length;
    const winRate = submittedProposals > 0 ? Math.round((wonCount / submittedProposals) * 100) : 0;

    const today = new Date();
    const urgentProposals = effectiveProposals.filter(p => {
      if (!p.due_date) return false;
      const dueDate = new Date(p.due_date);
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil >= 0 && daysUntil <= 7;
    }).length;

    return {
      totalValue: formattedValue,
      winRate,
      urgentCount: urgentProposals
    };
  }, [effectiveProposals, proposals]);

  const { data: automationRules = [], refetch: refetchRules } = useQuery({
    queryKey: ['automation-rules', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalAutomationRule.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id,
    staleTime: 60000,
    retry: 1,
    initialData: [],
  });

  const handleCreateTypeSpecificBoard = async (boardType) => {
    if (!organization?.id) {
      alert("Organization not found");
      return;
    }

    setIsCreatingBoard(true);
    try {
      const response = await base44.functions.invoke('createTypeSpecificBoard', {
        organization_id: organization.id,
        board_type: boardType.toLowerCase()
      });

      if (response.data.success) {
        if (response.data.was_created) {
          alert(`✅ ${response.data.message}`);
          await refetchBoards();

          const updatedBoards = await base44.entities.KanbanConfig.filter({
            organization_id: organization.id,
            board_type: boardType.toLowerCase()
          });
          if (updatedBoards.length > 0) {
            setSelectedBoardId(updatedBoards[0].id);
          }
        } else {
          alert(`Board already exists!`);
        }
        setShowCreateBoardDialog(false);
      }
    } catch (error) {
      console.error('Error creating board:', error);
      alert('Error creating board: ' + error.message);
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const handleCreateMasterBoard = async () => {
    if (!organization?.id) {
      alert("Organization not found");
      return;
    }

    setIsCreatingMasterBoard(true);
    try {
      const response = await base44.functions.invoke('ensureMasterBoardOnFirstLoad', {
        organization_id: organization.id
      });

      if (response.data.success) {
        alert(`✅ ${response.data.was_created ? 'Master board created!' : 'Master board already exists'}`);
        await refetchBoards();

        const updatedBoards = await base44.entities.KanbanConfig.filter({
          organization_id: organization.id,
          is_master_board: true
        });
        if (updatedBoards.length > 0) {
          setSelectedBoardId(updatedBoards[0].id);
        }
      }
    } catch (error) {
      console.error('Error creating master board:', error);
      alert('Error creating master board: ' + error.message);
    } finally {
      setIsCreatingMasterBoard(false);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      console.log('[Pipeline] Organization changed, refetching data');
      refetchProposals();
      refetchBoards();
    }
  }, [organization?.id, refetchProposals, refetchBoards]);

  const handleCreateProposal = () => {
    if (user?.using_sample_data === true) {
      setShowSampleDataGuard(true);
    } else {
      setShowNewProposalDialog(true);
    }
  };

  const proceedToProposalBuilder = () => {
    setShowNewProposalDialog(true);
  };

  const handleProposalCreated = async (createdProposal, openModal = null, boardConfig = null) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[Pipeline] 📝 HANDLE PROPOSAL CREATED CALLED');
    console.log('[Pipeline] Proposal:', createdProposal.proposal_name);
    console.log('[Pipeline] Type:', createdProposal.proposal_type_category);
    console.log('[Pipeline] ID:', createdProposal.id);
    console.log('[Pipeline] Modal to open:', openModal);
    console.log('[Pipeline] Board config provided:', !!boardConfig);
    if (boardConfig) {
      console.log('[Pipeline] Board config details:', {
        id: boardConfig.id,
        name: boardConfig.board_name,
        type: boardConfig.board_type
      });
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Refetch proposals
    console.log('[Pipeline] 🔄 Refetching proposals...');
    await refetchProposals();
    console.log('[Pipeline] ✅ Proposals refetched');
    
    // CRITICAL: Refetch boards to ensure we have the latest
    console.log('[Pipeline] 🔄 Refetching boards...');
    const boardsRefetchResult = await refetchBoards();
    console.log('[Pipeline] ✅ Boards refetched, count:', boardsRefetchResult?.data?.length || 'unknown');

    const proposalType = createdProposal.proposal_type_category;

    if (!proposalType) {
      console.warn('[Pipeline] ⚠️ No proposal type category, aborting');
      return;
    }

    // PERFORMANCE FIX: Reduced wait time from 500ms to 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get fresh boards from query cache
    const freshBoards = queryClient.getQueryData(['all-kanban-boards', organization?.id]) || [];
    console.log('[Pipeline] 📋 Fresh boards from cache:', freshBoards.map(b => ({ id: b.id, type: b.board_type, name: b.board_name })));

    // Find the correct board - Prioritize boardConfig if provided
    let matchingBoard = null;
    
    if (boardConfig) {
      console.log('[Pipeline] 🎯 Using provided board config:', boardConfig.board_name);
      matchingBoard = freshBoards.find(b => b.id === boardConfig.id);
      if (!matchingBoard) {
        console.error('[Pipeline] ❌ Provided board not found in fresh boards! ID:', boardConfig.id);
      } else {
        console.log('[Pipeline] ✅ Successfully found provided board in fresh data');
      }
    }
    
    if (!matchingBoard) {
      if (proposalType === 'RFP_15_COLUMN') {
        matchingBoard = freshBoards.find(board => board.board_type === 'rfp_15_column');
        console.log('[Pipeline] 🎯 Searched for 15-column board:', matchingBoard ? 'FOUND ✅' : 'NOT FOUND ❌');
      } else {
        matchingBoard = freshBoards.find(board =>
          board.applies_to_proposal_types?.includes(proposalType)
        );
        console.log('[Pipeline] 🔍 Searched for type-specific board:', matchingBoard ? 'FOUND ✅' : 'NOT FOUND ❌');
      }
    }

    if (matchingBoard) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[Pipeline] ✅ SWITCHING TO BOARD');
      console.log('[Pipeline] Board name:', matchingBoard.board_name);
      console.log('[Pipeline] Board ID:', matchingBoard.id);
      console.log('[Pipeline] Board type:', matchingBoard.board_type);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // CRITICAL FIX: Force board selection immediately
      setSelectedBoardId(matchingBoard.id);
      
      // If there's an `openModal` and we found a matching board, open the modal directly.
      if (openModal) {
        setSelectedProposalToOpen(createdProposal);
        setInitialModalToOpen(openModal);
        setShowProposalModal(true);
        setPendingProposalModal(null); // Clear pending state if it was set elsewhere, ensures clean slate.
      }
      
      // PERFORMANCE FIX: Reduced wait time from 300ms to 50ms
      await new Promise(resolve => setTimeout(resolve, 50));
      
      console.log('[Pipeline] ✅ Board switch initiated, view should now show:', matchingBoard.board_name);
    } else {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('[Pipeline] ❌ NO MATCHING BOARD FOUND!');
      console.error('[Pipeline] This is a critical error');
      console.error('[Pipeline] Proposal type:', proposalType);
      console.error('[Pipeline] Available boards:', freshBoards.length);
      console.error('[Pipeline] Board types available:', freshBoards.map(b => b.board_type));
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Show helpful error message
      alert(
        `⚠️ Board Not Found\n\n` +
        `Could not find the "${proposalType}" board.\n\n` +
        `Available boards:\n` +
        freshBoards.map(b => `• ${b.board_name} (${b.board_type})`).join('\n') +
        `\n\nThe proposal was created but is only visible on the Master Board.`
      );
    }
  };

  const handleGenerateSampleData = async () => {
    if (confirm('Generate sample proposal data for testing?')) {
      try {
        await base44.functions.invoke('generateSampleData', {});
        alert('Sample data generated! Refreshing...');
        refetchProposals();
      } catch (error) {
        console.error('Error generating sample data:', error);
        alert('Error generating sample data: ' + error.message);
      }
    }
  };

  // NEW: Temporary migration handler
  const handleMigrateMasterBoard = async () => {
    if (!organization?.id) {
      toast.error("Organization not found");
      return;
    }

    if (!confirm('⚠️ This will DELETE your current master board and create a new one with the updated 7-column structure.\n\nAre you sure you want to proceed?')) {
      return;
    }

    setIsMigrating(true);
    try {
      const response = await base44.functions.invoke('migrateMasterBoardColumns', {
        organization_id: organization.id
      });

      if (response.data.success) {
        toast.success('✅ Master board migrated successfully! Refreshing...');
        await refetchBoards();
        // Reload the page to ensure everything is fresh
        window.location.reload();
      } else {
        toast.error('Migration failed: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error migrating master board:', error);
      toast.error('Error migrating master board: ' + error.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleMigrateProposals = async () => {
    setShowMigrateConfirm(true);
  };

  const confirmMigrate = async () => {
    if (!organization?.id) {
      toast.error("Organization not found");
      return;
    }

    setShowMigrateConfirm(false);
    setIsMigrating(true);
    
    try {
      const response = await base44.functions.invoke('categorizeExistingProposals', {
        organization_id: organization.id,
        dry_run: false
      });

      if (response.data.success) {
        const { newly_categorized, already_categorized, total_proposals } = response.data;

        toast.success(
          `✅ Categorization Complete!`,
          {
            description: `${newly_categorized} proposals categorized, ${already_categorized} already categorized`,
            duration: 5000,
          }
        );

        await refetchProposals();
      }
    } catch (error) {
      console.error('Error during migration:', error);
      toast.error('Error during migration: ' + error.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleQuickBoardCreated = async (newBoard) => {
    await refetchBoards();
    setSelectedBoardId(newBoard.id);
    alert(`✅ Board "${newBoard.board_name}" created successfully!`);
  };

  const handleApplySavedView = (filters) => {
    setSavedFilters(filters);
  };

  const getBoardIcon = (boardType, isMaster) => {
    if (isMaster) return "⭐";
    switch (boardType) {
      case 'rfp': return "📋";
      case 'rfp_15_column': return "🎯";
      case 'rfi': return "📝";
      case 'sbir': return "🔬";
      case 'gsa': return "🏛️";
      case 'idiq': return "📑";
      case 'state_local': return "🏢";
      case 'template_workspace': return "📂";
      case 'custom_proposal': return "🎨";
      case 'custom_project': return "🛠️";
      default: return "📊";
    }
  };

  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId) => {
      return base44.entities.KanbanConfig.delete(boardId);
    },
    onSuccess: async (_, deletedBoardId) => {
      await queryClient.invalidateQueries({ queryKey: ['all-kanban-boards'] });
      await refetchBoards();

      setShowDeleteBoardDialog(false);
      setDeletingBoard(null);
      alert('✅ Board deleted successfully!');
      
      if (selectedBoardId === deletedBoardId) {
        const updatedBoards = queryClient.getQueryData(['all-kanban-boards', organization?.id]);
        const masterBoard = updatedBoards?.find(b => b.is_master_board === true);
        const boardToSelect = masterBoard || (updatedBoards?.length > 0 ? updatedBoards[0] : null);

        if (boardToSelect) {
          setSelectedBoardId(boardToSelect.id);
        } else {
          setSelectedBoardId(null);
        }
      }
    },
    onError: (error) => {
      alert(`Error deleting board: ${error.message}`);
    }
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (id) => {
      // Delete proposal directly - calendar sync not implemented yet
      return base44.entities.Proposal.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setProposalToDelete(null);
    },
  });

  const handleDeleteBoard = (board) => {
    setDeletingBoard(board);
    setShowDeleteBoardDialog(true);
  };

  const confirmDeleteBoard = () => {
    if (deletingBoard) {
      deleteBoardMutation.mutate(deletingBoard.id);
    }
  };

  const getModalBoardConfig = () => {
    if (!selectedProposalToOpen) return selectedBoard;
    
    const proposalType = selectedProposalToOpen.proposal_type_category;
    
    // For 15-column proposals, explicitly find that board
    if (proposalType === 'RFP_15_COLUMN') {
      const rfp15Board = allBoards.find(board => board.board_type === 'rfp_15_column');
      console.log('[Pipeline] Modal board config for 15-column:', rfp15Board ? 'FOUND' : 'FALLBACK TO SELECTED');
      return rfp15Board || selectedBoard;
    }
    
    // For other types, find by applies_to_proposal_types
    const typeBoard = allBoards.find(board =>
      board.applies_to_proposal_types?.includes(proposalType)
    );
    
    return typeBoard || selectedBoard;
  };

  // Debug logging for modal state
  useEffect(() => {
    console.log('[Pipeline] 🎬 Modal State Update:', {
      showProposalModal,
      hasSelectedProposal: !!selectedProposalToOpen,
      proposalName: selectedProposalToOpen?.proposal_name,
      initialModal: initialModalToOpen,
      hasPending: !!pendingProposalModal
    });
  }, [showProposalModal, selectedProposalToOpen, initialModalToOpen, pendingProposalModal]);

  // DEBUG: Log when showNewProposalDialog changes
  useEffect(() => {
    console.log('[Pipeline] 🎭 QuickCreate Dialog State:', {
      isOpen: showNewProposalDialog,
      hasHandleProposalCreated: typeof handleProposalCreated === 'function'
    });
  }, [showNewProposalDialog]);

  if (proposalsError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Unable to Load Pipeline</h2>
            <p className="text-lg text-slate-600 mb-6">
              {proposalsError?.message || "An error occurred"}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleRetry} className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingUser || isLoadingOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <LayoutGrid className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Loading Pipeline</h2>
            <p className="text-lg text-slate-600 mb-2">
              Setting up your workspace...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span>Please wait</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organization && !isLoadingOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">No Organization Found</h2>
            <p className="text-lg text-slate-600 mb-6">
              You need to set up your organization before accessing the pipeline.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(createPageUrl("Onboarding"))} className="bg-blue-600 hover:bg-blue-700">
                <Building2 className="w-4 h-4 mr-2" />
                Set Up Organization
              </Button>
              <Button variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoadingBoards && allBoards.length === 0 && organization && !isLoadingOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Layers className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Setup Your Proposal Board</h2>
            <p className="text-lg text-slate-600 mb-8 max-w-lg mx-auto">
              Get started by creating your master board to view and manage all proposals in one place.
            </p>
            <Button
              onClick={handleCreateMasterBoard}
              disabled={isCreatingMasterBoard}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6"
            >
              {isCreatingMasterBoard ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Creating Master Board...
                </>
              ) : (
                <>
                  <Layers className="w-5 h-5 mr-2" />
                  Create Master Board
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AutomationExecutor
        organization={organization}
        proposals={proposals}
        automationRules={automationRules}
      />

      <PipelineBanner
        selectedBoard={selectedBoard}
        allBoards={allBoards}
        onCreateProposal={handleCreateProposal}
        onBoardChange={setSelectedBoardId}
        onCreateBoard={() => setShowQuickBoardCreate(true)}
        onShowStats={() => setShowBoardAnalytics(!showBoardAnalytics)}
        onShowPortfolio={() => setShowMultiBoardAnalytics(!showMultiBoardAnalytics)}
        onShowAutomation={() => setShowAutomation(!showAutomation)}
        onShowAnalytics={() => setShowAnalytics(!showAnalytics)}
        onShowActivity={() => setShowActivityFeed(!showActivityFeed)}
        onShowSavedViews={() => setShowSavedViews(!showSavedViews)}
        onManageBoards={() => setShowBoardManager(true)}
        onCategorizeProposals={handleMigrateProposals}
        onMigrateMasterBoard={handleMigrateMasterBoard}
        onShowAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
        onShowHelp={() => setShowHelp(!showHelp)}
        onShowQuickFilters={() => setShowQuickFilters(!showQuickFilters)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pipelineValue={pipelineStats.totalValue}
        winRate={pipelineStats.winRate}
        showStats={showBoardAnalytics}
        showPortfolio={showMultiBoardAnalytics}
        showAutomation={showAutomation}
        showAnalytics={showAnalytics}
        showActivity={showActivityFeed}
        isMobile={isMobile}
      />

      {/* Advanced Filters Panel - Render when showAdvancedFilters is true */}
      {showAdvancedFilters && (
        <div className="flex-shrink-0 p-4 lg:p-6 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-900">Advanced Filters</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAdvancedFilters(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <AdvancedFilterPanel
            proposals={filteredProposals}
            onFilterChange={handleAdvancedFilterChange}
            teamMembers={uniqueTeamMembers}
          />
        </div>
      )}

      {/* Saved Views Panel */}
      {showSavedViews && (
        <div className="flex-shrink-0 mx-6 mt-6">
          <SavedViews
            organization={organization}
            onApplyView={handleApplySavedView}
          />
        </div>
      )}

      {showHealthDashboard && (
        <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 mx-6 mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-purple-600" />
                Predictive Health Analysis
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHealthDashboard(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PredictiveHealthDashboard
              proposal={showHealthDashboard}
              organization={organization}
            />
          </CardContent>
        </Card>
      )}

      {showBoardAnalytics && selectedBoard && (
        <div className="flex-shrink-0 mx-6 mt-6">
          <BoardAnalytics
            board={selectedBoard}
            proposals={proposals}
            organization={organization}
          />
        </div>
      )}

      {showMultiBoardAnalytics && (
        <div className="flex-shrink-0 mx-6 mt-6">
          <MultiBoardAnalytics
            proposals={proposals}
            allBoardConfigs={allBoards}
            organization={organization}
          />
        </div>
      )}

      {showActivityFeed && (
        <div className="flex-shrink-0 mx-6 mt-6">
          <BoardActivityFeed
            organization={organization}
            boardId={selectedBoardId}
          />
        </div>
      )}

      <div className="flex-1 min-h-0">
        {isLoadingProposals || isLoadingBoards ? (
          <div className="flex items-center justify-center h-full p-6">
            <Card className="max-w-md border-none shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading your pipeline...</h3>
                <p className="text-sm text-slate-600">
                  {isLoadingBoards ? "Loading boards..." : "Loading proposals..."}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {!isMobile && showAutomation && (
              <div className="p-6 space-y-6 h-full overflow-y-auto">
                <AIWorkflowSuggestions
                  organization={organization}
                  proposals={effectiveProposals}
                  automationRules={automationRules}
                />
                <SmartAutomationEngine organization={organization} />
              </div>
            )}

            {!isMobile && showAnalytics && (
              <div className="p-6 space-y-6 h-full overflow-y-auto">
                <SnapshotGenerator organization={organization} proposals={effectiveProposals} />
                <PipelineAnalytics organization={organization} proposals={effectiveProposals} />
              </div>
            )}

            {!showAutomation && !showAnalytics && !showBoardAnalytics && !showActivityFeed && !showMultiBoardAnalytics && !showSavedViews && (
              <>
                {isMobile ? (
                  <div className="p-4 h-full overflow-y-auto">
                    <MobileKanbanView proposals={effectiveProposals} columns={selectedBoard?.columns || []} />
                  </div>
                ) : (
                  <div className="h-full">
                    {viewMode === "kanban" && (
                      <ProposalsKanban
                        proposals={effectiveProposals}
                        organization={organization}
                        user={user}
                        kanbanConfig={selectedBoard}
                        onRefresh={() => {
                          refetchProposals();
                        }}
                        showQuickFilters={showQuickFilters}
                        showHelp={showHelp}
                      />
                    )}
                    {viewMode === "list" && (
                      <div className="p-6 h-full overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-bold text-slate-900">List View</h2>
                          <Select value={listGroupBy} onValueChange={setListGroupBy}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Group by..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Grouping</SelectItem>
                              <SelectItem value="proposal_type_category">Group by Type</SelectItem>
                              <SelectItem value="status">Group by Status</SelectItem>
                              <SelectItem value="agency">Group by Agency</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <ProposalsList
                          proposals={effectiveProposals}
                          organization={organization}
                          groupBy={listGroupBy}
                        />
                      </div>
                    )}
                    {viewMode === "table" && (
                      <div className="p-6 h-full overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-bold text-slate-900">Table View</h2>
                          <Select value={tableGroupBy} onValueChange={setTableGroupBy}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Group by..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Grouping</SelectItem>
                              <SelectItem value="proposal_type_category">Group by Type</SelectItem>
                              <SelectItem value="status">Group by Status</SelectItem>
                              <SelectItem value="agency">Group by Agency</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <ProposalsTable
                          proposals={effectiveProposals}
                          organization={organization}
                          groupBy={tableGroupBy}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <QuickCreateProposal
        isOpen={showNewProposalDialog}
        onClose={() => {
          console.log('[Pipeline] 🚪 Closing QuickCreate dialog');
          setShowNewProposalDialog(false);
        }}
        organization={organization}
        preselectedType={selectedBoard?.applies_to_proposal_types?.[0] || null}
        onSuccess={(proposal, modal, board) => {
          console.log('[Pipeline] 📞 onSuccess CALLBACK INVOKED!', {
            proposal: proposal?.proposal_name,
            modal,
            board: board?.board_name
          });
          handleProposalCreated(proposal, modal, board);
        }}
      />

      {showProposalModal && selectedProposalToOpen && (
        <ProposalCardModal
          proposal={selectedProposalToOpen}
          isOpen={showProposalModal}
          onClose={() => {
            console.log('[Pipeline] 🚪 ProposalCardModal closing');
            setShowProposalModal(false);
            setSelectedProposalToOpen(null);
            setInitialModalToOpen(null);
          }}
          organization={organization}
          kanbanConfig={getModalBoardConfig()}
          initialModalToOpen={initialModalToOpen}
        />
      )}

      <QuickBoardCreation
        isOpen={showQuickBoardCreate}
        onClose={() => setShowQuickBoardCreate(false)}
        organization={organization}
        onBoardCreated={handleQuickBoardCreated}
      />

      <Dialog open={showCreateBoardDialog} onOpenChange={setShowCreateBoardDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Create New Board
            </DialogTitle>
            <DialogDescription>
              Choose which type of board you want to create
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
            {[
              { type: 'RFP', icon: '📋', name: 'RFP Board', description: '8-phase detailed workflow' },
              { type: 'RFP_15_COLUMN', icon: '🎯', name: 'RFP (15-Column) Board', description: '15-phase detailed workflow' },
              { type: 'RFI', icon: '📝', name: 'RFI Board', description: 'Simplified information gathering' },
              { type: 'SBIR', icon: '🔬', name: 'SBIR Board', description: 'Research-focused workflow' },
              { type: 'GSA', icon: '🏛️', name: 'GSA Schedule Board', description: 'Schedule-specific process' },
              { type: 'IDIQ', icon: '📑', name: 'IDIQ Board', description: 'Contract vehicle workflow' },
              { type: 'STATE_LOCAL', icon: '🏢', name: 'State/Local Board', description: 'Non-federal process' },
            ].map(option => (
              <Button
                key={option.type}
                variant="outline"
                className="h-auto flex flex-col items-start p-4 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => handleCreateTypeSpecificBoard(option.type)}
                disabled={isCreatingBoard}
              >
                <div className="text-3xl mb-2">{option.icon}</div>
                <div className="font-semibold text-sm text-slate-900 mb-1">{option.name}</div>
                <div className="text-xs text-slate-600">{option.description}</div>
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateBoardDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBoardManager} onOpenChange={setShowBoardManager}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Manage Boards
            </DialogTitle>
            <DialogDescription>
              View and manage all your Kanban boards
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {allBoards.map(board => {
              const icon = getBoardIcon(board.board_type, board.is_master_board);
              const boardProposalCount = proposals.filter(p => {
                if (board.is_master_board) return true;
                if (board.board_type === 'rfp_15_column') return p.proposal_type_category === 'RFP_15_COLUMN';
                if (board.applies_to_proposal_types && board.applies_to_proposal_types.length > 0) {
                    return board.applies_to_proposal_types.includes(p.proposal_type_category);
                }
                return false;
              }).length;

              return (
                <Card key={board.id} className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{icon}</div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{board.board_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {board.is_master_board ? 'Master Board' : board.board_type.toUpperCase()}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              {boardProposalCount} proposal{boardProposalCount !== 1 ? 's' : ''}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {board.columns?.length || 0} columns
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!board.is_master_board && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBoard(board)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete board"
                            disabled={deleteBoardMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteBoardDialog} onOpenChange={setShowDeleteBoardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Board?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to delete <strong>"{deletingBoard?.board_name}"</strong>?
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-900 text-sm">
                  ⚠️ <strong>Note:</strong> Proposals on this board will NOT be deleted. They will still appear on your Master Board and can be reassigned to other boards.
                </p>
              </div>
              
              <p className="text-sm">
                This action only deletes the board configuration and cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBoardMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBoard}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteBoardMutation.isPending}
            >
              {deleteBoardMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Yes, Delete Board
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ConfirmDialog
        isOpen={showMigrateConfirm}
        onClose={() => setShowMigrateConfirm(false)}
        onConfirm={confirmMigrate}
        title="Categorize Existing Proposals"
        variant="default"
        confirmText="Yes, Categorize Now"
        cancelText="Cancel"
        isLoading={isMigrating}
      >
        <div className="space-y-3">
          <p className="text-slate-700">
            This will analyze all your existing proposals and assign them to the appropriate board type based on:
          </p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
              <span>Project type field</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
              <span>Keywords in proposal name/title</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
              <span>Agency patterns</span>
            </li>
          </ul>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              ℹ️ Your proposals will NOT be modified except for the category assignment.
            </p>
          </div>
        </div>
      </ConfirmDialog>

      <GlobalSearch
        organization={organization}
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
      />

      <SampleDataGuard
        isOpen={showSampleDataGuard}
        onClose={() => setShowSampleDataGuard(false)}
        onProceed={proceedToProposalBuilder}
      />
    </div>
  );
}