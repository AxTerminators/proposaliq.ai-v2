
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, Table, BarChart3, Zap, AlertCircle, RefreshCw, Database, Building2, Activity, X, Layers, DollarSign, TrendingUp, Search as SearchIcon, Settings, Trash2 } from "lucide-react";
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
  const [isCreatingMasterBoard, setIsCreatingMasterBoard] = useState(false);
  const [showBoardSwitcher, setShowBoardSwitcher] = useState(false); // Unused in final UI but kept for now.
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
  const [pendingProposalModal, setPendingProposalModal] = useState(null); // NEW: Track pending modal

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

  useEffect(() => {
    if (allBoards.length > 0 && !selectedBoardId) {
      const masterBoard = allBoards.find(b => b.is_master_board === true);
      const boardToSelect = masterBoard || allBoards[0];
      console.log('[Pipeline] Auto-selecting board:', boardToSelect?.board_name);
      setSelectedBoardId(boardToSelect?.id);
    } else if (allBoards.length === 0 && selectedBoardId) {
      setSelectedBoardId(null);
    }
  }, [allBoards, selectedBoardId]);

  const selectedBoard = allBoards.find(b => b.id === selectedBoardId);

  // NEW: Effect to handle pending proposal modal after board switch
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
    console.log('[Pipeline] All boards count:', allBoards.length);
    console.log('[Pipeline] All boards:', allBoards.map(b => ({ id: b.id, type: b.board_type, name: b.board_name })));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Check if the currently selected board matches the target
    let isCorrectBoard = false;
    
    if (targetBoardId) {
      // If we have specific board ID, match by ID
      isCorrectBoard = selectedBoard?.id === targetBoardId;
      console.log('[Pipeline] 🎯 Matching by board ID:', isCorrectBoard ? 'MATCH' : 'NO MATCH');
    } else if (targetBoardType === 'rfp_15_column') {
      // Match by board type for 15-column
      isCorrectBoard = selectedBoard?.board_type === 'rfp_15_column';
      console.log('[Pipeline] 🎯 Matching by board type:', isCorrectBoard ? 'MATCH' : 'NO MATCH');
    } else {
      // Match by applies_to_proposal_types for other boards
      isCorrectBoard = selectedBoard?.applies_to_proposal_types?.includes(proposal.proposal_type_category) || false;
      console.log('[Pipeline] 🎯 Matching by proposal type:', isCorrectBoard ? 'MATCH' : 'NO MATCH');
    }
    
    if (isCorrectBoard && selectedBoard) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[Pipeline] ✅ CORRECT BOARD SELECTED - OPENING MODAL');
      console.log('[Pipeline] Board name:', selectedBoard.board_name);
      console.log('[Pipeline] Modal to open:', initialModal);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      setSelectedProposalToOpen(proposal);
      setInitialModalToOpen(initialModal);
      setShowProposalModal(true);
      setPendingProposalModal(null); // Clear pending state
    } else {
      console.log('[Pipeline] ⏳ Waiting for correct board...');
      console.log('[Pipeline] Reason:', !selectedBoard ? 'No selected board' : 'Board mismatch');
    }
  }, [selectedBoard, pendingProposalModal, allBoards]);

  const { data: proposals = [], isLoading: isLoadingProposals, error: proposalsError, refetch: refetchProposals } = useQuery({
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

  const filteredProposals = useMemo(() => {
    if (!selectedBoard || !proposals) return proposals;

    if (selectedBoard.is_master_board) {
      return proposals;
    }

    if (selectedBoard.applies_to_proposal_types && selectedBoard.applies_to_proposal_types.length > 0) {
      return proposals.filter(p =>
        selectedBoard.applies_to_proposal_types.includes(p.proposal_type_category)
      );
    }

    return proposals;
  }, [proposals, selectedBoard]);

  const pipelineStats = useMemo(() => {
    const totalValue = filteredProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const formattedValue = totalValue >= 1000000
      ? `$${(totalValue / 1000000).toFixed(1)}M`
      : totalValue >= 1000
      ? `$${(totalValue / 1000).toFixed(0)}K`
      : `$${totalValue.toLocaleString()}`;

    const wonProposals = proposals.filter(p => p.status === 'won').length;
    const submittedProposals = proposals.filter(p => ['submitted', 'won', 'lost'].includes(p.status)).length;
    const winRate = submittedProposals > 0 ? Math.round((wonProposals / submittedProposals) * 100) : 0;

    const today = new Date();
    const urgentProposals = filteredProposals.filter(p => {
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
  }, [filteredProposals, proposals]);

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
    console.log('[Pipeline] 📝 HANDLE PROPOSAL CREATED');
    console.log('[Pipeline] Proposal:', createdProposal.proposal_name);
    console.log('[Pipeline] Type:', createdProposal.proposal_type_category);
    console.log('[Pipeline] ID:', createdProposal.id);
    console.log('[Pipeline] Modal to open:', openModal);
    console.log('[Pipeline] Board config provided:', !!boardConfig);
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

    // Wait a moment for state to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get fresh boards from query cache
    const freshBoards = queryClient.getQueryData(['all-kanban-boards', organization?.id]) || [];
    console.log('[Pipeline] 📋 Fresh boards from cache:', freshBoards.map(b => ({ id: b.id, type: b.board_type, name: b.board_name })));

    // Find the correct board - use provided boardConfig or search
    let matchingBoard = null;
    
    if (boardConfig) {
      console.log('[Pipeline] 🎯 Using provided board config:', boardConfig.board_name);
      // Verify it exists in fresh boards
      matchingBoard = freshBoards.find(b => b.id === boardConfig.id);
      if (!matchingBoard) {
        console.error('[Pipeline] ❌ Provided board not found in fresh boards! Searching...');
      }
    }
    
    if (!matchingBoard) {
      if (proposalType === 'RFP_15_COLUMN') {
        matchingBoard = freshBoards.find(board => board.board_type === 'rfp_15_column');
        console.log('[Pipeline] 🎯 Searched for 15-column board:', matchingBoard ? 'FOUND' : 'NOT FOUND');
        
        if (matchingBoard) {
          console.log('[Pipeline] 📋 Found 15-column board:', {
            id: matchingBoard.id,
            name: matchingBoard.board_name,
            columnsCount: matchingBoard.columns?.length
          });
        }
      } else {
        matchingBoard = freshBoards.find(board =>
          board.applies_to_proposal_types?.includes(proposalType)
        );
        console.log('[Pipeline] 🔍 Searched for type-specific board:', matchingBoard ? 'FOUND' : 'NOT FOUND');
      }
    }

    if (matchingBoard) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[Pipeline] 🔄 SWITCHING TO BOARD');
      console.log('[Pipeline] Board name:', matchingBoard.board_name);
      console.log('[Pipeline] Board ID:', matchingBoard.id);
      console.log('[Pipeline] Board type:', matchingBoard.board_type);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // For 15-column workflow, set up pending modal and switch board
      if (proposalType === 'RFP_15_COLUMN' && openModal) {
        console.log('[Pipeline] 🎯 Setting up pending modal:', openModal);
        
        // Set up the pending modal data WITH the board ID
        setPendingProposalModal({
          proposal: createdProposal,
          initialModal: openModal,
          targetBoardType: 'rfp_15_column',
          targetBoardId: matchingBoard.id
        });
        
        console.log('[Pipeline] 🔀 Setting selectedBoardId to:', matchingBoard.id);
        // Switch the board - the useEffect will handle opening the modal
        setSelectedBoardId(matchingBoard.id);
      } else {
        // For other types, just switch the board
        console.log('[Pipeline] 🔀 Switching to board (no modal):', matchingBoard.id);
        setSelectedBoardId(matchingBoard.id);
      }
    } else {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('[Pipeline] ❌ NO MATCHING BOARD FOUND!');
      console.error('[Pipeline] This is a critical error');
      console.error('[Pipeline] Proposal type:', proposalType);
      console.error('[Pipeline] Available boards:', freshBoards.length);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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

  const handleRetry = () => {
    window.location.reload();
  };

  const handleMigrateProposals = async () => {
    if (!organization?.id) {
      alert("Organization not found");
      return;
    }

    const confirmed = confirm(
      '📊 Categorize Existing Proposals\n\n' +
      'This will analyze all your existing proposals and assign them to the appropriate board type (RFP, RFI, SBIR, etc.) based on:\n\n' +
      '• Project type field\n' +
      '• Keywords in proposal name/title\n' +
      '• Agency patterns\n\n' +
      'Your proposals will NOT be modified except for the category assignment.\n\n' +
      'Continue?'
    );

    if (!confirmed) return;

    setIsMigrating(true);
    try {
      const response = await base44.functions.invoke('categorizeExistingProposals', {
        organization_id: organization.id,
        dry_run: false
      });

      if (response.data.success) {
        const { newly_categorized, already_categorized, total_proposals } = response.data;

        alert(
          `✅ Categorization Complete!\n\n` +
          `Total Proposals: ${total_proposals}\n` +
          `Already Categorized: ${already_categorized}\n` +
          `Newly Categorized: ${newly_categorized}\n\n` +
          `Your proposals are now organized by type.`
        );

        await refetchProposals();
      }
    } catch (error) {
      console.error('Error migrating proposals:', error);
      alert('Error during migration: ' + error.message);
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

  const handleDeleteBoard = (board) => {
    setDeletingBoard(board);
    setShowDeleteBoardDialog(true);
  };

  const confirmDeleteBoard = () => {
    if (deletingBoard) {
      deleteBoardMutation.mutate(deletingBoard.id);
    }
  };

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

  const showDataRecovery = filteredProposals.length === 0 && !isLoadingProposals;
  const canGenerateSampleData = organization?.is_sample_data === true;

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

  return (
    <div className="flex flex-col h-full">
      <AutomationExecutor
        organization={organization}
        proposals={proposals}
        automationRules={automationRules}
      />

      <div className="flex-shrink-0 p-4 lg:p-6 border-b bg-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1 lg:mb-2">Proposal Board</h1>
              <p className="text-sm lg:text-base text-slate-600">Manage your active proposals</p>
            </div>

            {allBoards.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {allBoards.map(board => {
                  const isSelected = selectedBoardId === board.id;
                  const icon = getBoardIcon(board.board_type, board.is_master_board);

                  return (
                    <Button
                      key={board.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedBoardId(board.id)}
                      className={cn(
                        "gap-2 transition-all",
                        isSelected && "ring-2 ring-blue-400"
                      )}
                      title={board.board_name}
                    >
                      <span className="text-lg">{icon}</span>
                      <span className="hidden sm:inline">{board.board_name}</span>
                    </Button>
                  );
                })}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuickBoardCreate(true)}
                  className="gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:border-blue-300"
                  title="Quick create board from template"
                >
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="hidden sm:inline">Quick Create</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBoardManager(true)}
                  className="gap-2"
                  title="Manage boards"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Manage Boards</span>
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 lg:gap-3 w-full lg:w-auto items-center">
            {!isMobile && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowGlobalSearch(true)}
                  size="sm"
                  className="h-9"
                >
                  <SearchIcon className="w-4 h-4 mr-2" />
                  Global Search
                </Button>
                <SavedViews
                  organization={organization}
                  user={user}
                  currentFilters={savedFilters}
                  onApplyView={handleApplySavedView}
                />
                <Button
                  variant={showActivityFeed ? "default" : "outline"}
                  onClick={() => setShowActivityFeed(!showActivityFeed)}
                  size="sm"
                  className="h-9"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  {showActivityFeed ? 'Hide' : 'Show'} Activity
                </Button>
                <Button
                  variant={showBoardAnalytics ? "default" : "outline"}
                  onClick={() => setShowBoardAnalytics(!showBoardAnalytics)}
                  size="sm"
                  className="h-9"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {showBoardAnalytics ? 'Hide' : 'Show'} Board Stats
                </Button>
                <Button
                  variant={showMultiBoardAnalytics ? "default" : "outline"}
                  onClick={() => setShowMultiBoardAnalytics(!showMultiBoardAnalytics)}
                  size="sm"
                  className="h-9"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  {showMultiBoardAnalytics ? 'Hide' : 'Show'} Portfolio
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMigrateProposals}
                  disabled={isMigrating}
                  size="sm"
                  className="h-9"
                  title="Categorize existing proposals by type"
                >
                  {isMigrating ? (
                    <>
                      <div className="animate-spin mr-2">⏳</div>
                      Migrating...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Categorize Proposals
                    </>
                  )}
                </Button>
                <Button
                  variant={showAutomation ? "default" : "outline"}
                  onClick={() => setShowAutomation(!showAutomation)}
                  size="sm"
                  className="h-9"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {showAutomation ? 'Hide' : 'Show'} Automation
                </Button>
                <Button
                  variant={showAnalytics ? "default" : "outline"}
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  size="sm"
                  className="h-9"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {showAnalytics ? 'Hide' : 'Show'} Analytics
                </Button>
              </>
            )}

            <div className="hidden lg:flex gap-1 border rounded-lg p-0.5 h-9 items-center">
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("table")}
              >
                <Table className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {filteredProposals.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-900">{pipelineStats.totalValue}</span>
              <span className="text-green-700">Pipeline Value</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-blue-900">{pipelineStats.winRate}%</span>
              <span className="text-blue-700">Win Rate</span>
            </div>

            {pipelineStats.urgentCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-orange-900">{pipelineStats.urgentCount}</span>
                <span className="text-orange-700">Due This Week</span>
              </div>
            )}
          </div>
        )}
      </div>

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
                  proposals={filteredProposals}
                  automationRules={automationRules}
                />
                <SmartAutomationEngine organization={organization} />
              </div>
            )}

            {!isMobile && showAnalytics && (
              <div className="p-6 space-y-6 h-full overflow-y-auto">
                <SnapshotGenerator organization={organization} proposals={filteredProposals} />
                <PipelineAnalytics organization={organization} proposals={filteredProposals} />
              </div>
            )}

            {!showAutomation && !showAnalytics && !showBoardAnalytics && !showActivityFeed && !showMultiBoardAnalytics && (
              <>
                {isMobile ? (
                  <div className="p-4 h-full overflow-y-auto">
                    <MobileKanbanView proposals={filteredProposals} columns={selectedBoard?.columns || []} />
                  </div>
                ) : (
                  <div className="h-full">
                    {viewMode === "kanban" && (
                      <ProposalsKanban
                        proposals={filteredProposals}
                        organization={organization}
                        user={user}
                        kanbanConfig={selectedBoard}
                        onRefresh={() => {
                          refetchProposals();
                        }}
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
                          proposals={filteredProposals}
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
                          proposals={filteredProposals}
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
        onClose={() => setShowNewProposalDialog(false)}
        organization={organization}
        preselectedType={selectedBoard?.applies_to_proposal_types?.[0] || null}
        onSuccess={handleProposalCreated}
      />

      {showProposalModal && selectedProposalToOpen && (
        <ProposalCardModal
          proposal={selectedProposalToOpen}
          isOpen={showProposalModal}
          onClose={() => {
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

          <div className="flex justify-end pt-4 border-t">
            <Button variant="ghost" onClick={() => setShowCreateBoardDialog(false)}>
              Cancel
            </Button>
          </div>
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
