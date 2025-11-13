
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  X,
  CheckSquare,
  MessageCircle,
  Paperclip,
  Calendar,
  DollarSign,
  Building2,
  FileQuestion,
  Sparkles,
  PlayCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
  ExternalLink,
  FileEdit,
  Zap,
  Shield,
  Activity,
  Target,
  Upload,
  Layers,
  Trash2,
  ChevronsRight,
  ChevronsLeft,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { toast } from "sonner";
import TaskManager from "../tasks/TaskManager";
import ProposalDiscussion from "../collaboration/ProposalDiscussion";
import ProposalFiles from "../collaboration/ProposalFiles";
import DataCallManager from "../datacalls/DataCallManager";
import { getActionConfig, isNavigateAction, isModalAction, isAIAction } from "./ChecklistActionRegistry";
import ConfirmDialog from "../ui/ConfirmDialog";
import ProposalTimelineEditor from "./ProposalTimelineEditor";

// Import ALL modal components
import BasicInfoModal from "./modals/BasicInfoModal";
import TeamFormationModal from "./modals/TeamFormationModal";
import ResourceGatheringModal from "./modals/ResourceGatheringModal";
import SolicitationUploadModal from "./modals/SolicitationUploadModal";
import EvaluationModal from "./modals/EvaluationModal";
import WinStrategyModal from "./modals/WinStrategyModal";
import ContentPlanningModal from "./modals/ContentPlanningModal";
import PricingReviewModal from "./modals/PricingReviewModal";
import WinToPromoteDialog from "./WinToPromoteDialog";
import ApprovalGate from "./ApprovalGate";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ProposalCardModal({ proposal: proposalProp, isOpen, onClose, organization, kanbanConfig, initialModalToOpen = null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("checklist");
  const [user, setUser] = useState(null);
  const [activeModalName, setActiveModalName] = useState(null);
  const [activeChecklistItemId, setActiveChecklistItemId] = useState(null);
  const [showWinPromoteDialog, setShowWinPromoteDialog] = useState(false);
  const [previousStatus, setPreviousStatus] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isMovingStage, setIsMovingStage] = useState(false);
  const [showApprovalGate, setShowApprovalGate] = useState(false);
  const [approvalGateData, setApprovalGateData] = useState(null);
  const [showIncompleteTasksConfirm, setShowIncompleteTasksConfirm] = useState(false);
  const [pendingStageMove, setPendingStageMove] = useState(null);

  // Map modal component names to actual components
  const MODAL_COMPONENTS = {
    'BasicInfoModal': BasicInfoModal,
    'TeamFormationModal': TeamFormationModal,
    'ResourceGatheringModal': ResourceGatheringModal,
    'SolicitationUploadModal': SolicitationUploadModal,
    'EvaluationModal': EvaluationModal,
    'WinStrategyModal': WinStrategyModal,
    'ContentPlanningModal': ContentPlanningModal,
    'PricingReviewModal': PricingReviewModal,
  };

  // Map action IDs directly to modal names
  const ACTION_TO_MODAL_MAP = {
    'enter_basic_info': 'BasicInfoModal',
    'select_prime_contractor': 'BasicInfoModal',
    'add_solicitation_number': 'BasicInfoModal',
    'open_basic_info_modal': 'BasicInfoModal',
    'open_modal_phase1': 'BasicInfoModal',
    'form_team': 'TeamFormationModal',
    'add_teaming_partners': 'TeamFormationModal',
    'define_roles': 'TeamFormationModal',
    'open_team_formation_modal': 'TeamFormationModal',
    'open_modal_phase2': 'TeamFormationModal',
    'open_team_modal': 'TeamFormationModal',
    'gather_resources': 'ResourceGatheringModal',
    'link_boilerplate': 'ResourceGatheringModal',
    'link_past_performance': 'ResourceGatheringModal',
    'open_resource_gathering_modal': 'ResourceGatheringModal',
    'open_resources_modal': 'ResourceGatheringModal',
    'upload_solicitation': 'SolicitationUploadModal',
    'extract_requirements': 'SolicitationUploadModal',
    'set_contract_value': 'SolicitationUploadModal',
    'open_solicitation_upload_modal': 'SolicitationUploadModal',
    'open_modal_phase3': 'SolicitationUploadModal',
    'run_ai_analysis_phase3': 'SolicitationUploadModal',
    'navigate_solicitation_upload': 'SolicitationUploadModal',
    'run_evaluation': 'EvaluationModal',
    'calculate_confidence_score': 'EvaluationModal',
    'open_evaluation_modal': 'EvaluationModal',
    'open_modal_phase4': 'EvaluationModal',
    'run_evaluation_phase4': 'EvaluationModal',
    'navigate_evaluation': 'EvaluationModal',
    'develop_win_strategy': 'WinStrategyModal',
    'generate_win_themes': 'WinStrategyModal',
    'refine_themes': 'WinStrategyModal',
    'open_win_strategy_modal': 'WinStrategyModal',
    'open_modal_phase5': 'WinStrategyModal',
    'generate_win_themes_phase5': 'WinStrategyModal',
    'navigate_win_strategy': 'WinStrategyModal',
    'plan_content': 'ContentPlanningModal',
    'select_sections': 'ContentPlanningModal',
    'set_writing_strategy': 'ContentPlanningModal',
    'open_content_planning_modal': 'ContentPlanningModal',
    'navigate_content_planning': 'ContentPlanningModal',
    'review_pricing': 'PricingReviewModal',
    'open_pricing_review_modal': 'PricingReviewModal',
  };

  const { data: proposal } = useQuery({
    queryKey: ['proposal-modal', proposalProp.id],
    queryFn: async () => {
      const proposals = await base44.entities.Proposal.filter({ id: proposalProp.id });
      return proposals[0] || proposalProp;
    },
    initialData: proposalProp,
    enabled: isOpen,
    staleTime: 0,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (isOpen) {
      const tabToOpen = sessionStorage.getItem('openProposalTab');
      if (tabToOpen) {
        console.log('[ProposalCardModal] 📑 Opening tab from deep link:', tabToOpen);
        setActiveTab(tabToOpen);
        sessionStorage.removeItem('openProposalTab');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: sharedClients = [] } = useQuery({
    queryKey: ['proposal-modal-shared-clients', proposal.id],
    queryFn: async () => {
      if (!proposal.shared_with_client_ids || proposal.shared_with_client_ids.length === 0) {
        return [];
      }
      
      const allClients = await base44.entities.Client.list();
      return allClients.filter(c => proposal.shared_with_client_ids.includes(c.id));
    },
    enabled: !!proposal?.shared_with_client_ids && proposal.shared_with_client_ids.length > 0 && isOpen,
    staleTime: 60000
  });

  useEffect(() => {
    if (isOpen && initialModalToOpen) {
      setTimeout(() => {
        setActiveModalName(initialModalToOpen);
      }, 200);
    }
  }, [isOpen, initialModalToOpen, proposal.proposal_name]);

  useEffect(() => {
    if (isOpen && proposal) {
      setPreviousStatus(proposal.status);
    }
  }, [isOpen, proposal?.id, proposal?.status]);

  const { data: allBoards = [] } = useQuery({
    queryKey: ['all-kanban-boards', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const boards = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        'board_type'
      );
      return boards.filter(b => !b.is_master_board);
    },
    enabled: !!organization?.id && isOpen,
  });

  const currentColumn = kanbanConfig?.columns?.find(col => {
    if (col.type === 'locked_phase') {
      return col.phase_mapping === proposal.current_phase;
    } else if (col.type === 'custom_stage') {
      return col.id === proposal.custom_workflow_stage_id;
    } else if (col.type === 'default_status') {
      return col.default_status_mapping === proposal.status;
    }
    return false;
  });

  const checklistItems = currentColumn?.checklist_items || [];
  const checklistStatus = proposal.current_stage_checklist_status?.[currentColumn?.id] || {};

  // **NEW: Calculate stage progress and find next/previous columns**
  const stageProgress = React.useMemo(() => {
    if (!kanbanConfig?.columns || !currentColumn) {
      return { current: 0, total: 0, next: null, previous: null };
    }

    const sortedColumns = [...kanbanConfig.columns]
      .filter(col => !col.is_terminal) // Exclude terminal columns from progress
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentIndex = sortedColumns.findIndex(col => col.id === currentColumn.id);
    const nextColumn = currentIndex >= 0 && currentIndex < sortedColumns.length - 1 
      ? sortedColumns[currentIndex + 1] 
      : null;
    const previousColumn = currentIndex > 0 
      ? sortedColumns[currentIndex - 1] 
      : null;

    return {
      current: currentIndex + 1,
      total: sortedColumns.length,
      next: nextColumn,
      previous: previousColumn,
      isLastStage: currentIndex === sortedColumns.length - 1
    };
  }, [kanbanConfig, currentColumn]);

  // **NEW: Check if all required items are complete**
  const allRequiredComplete = React.useMemo(() => {
    return currentColumn?.checklist_items
      ?.filter(ci => ci && ci.required && ci.type !== 'system_check')
      .every(ci => checklistStatus[ci.id]?.completed || false) || false;
  }, [currentColumn, checklistStatus]);

  const updateProposalMutation = useMutation({
    mutationFn: async (updates) => {
      console.log('[ProposalCardModal] 💾 Updating proposal with:', updates);
      return base44.entities.Proposal.update(proposal.id, updates);
    },
    onSuccess: async (updatedProposal) => {
      console.log('[ProposalCardModal] ✅ Proposal updated successfully');
      
      queryClient.setQueryData(['proposal-modal', proposal.id], updatedProposal);
      
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal-modal', proposal.id] });
      
      const statusChangedToWon = previousStatus !== 'won' && updatedProposal.status === 'won';
      
      if (statusChangedToWon) {
        console.log('[ProposalCardModal] 🎉 Status changed to won! Showing promote dialog...');
        setTimeout(() => {
          setShowWinPromoteDialog(true);
        }, 500);
      }
      
      setPreviousStatus(updatedProposal.status);
    }
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async () => {
      return base44.entities.Proposal.delete(proposal.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setShowDeleteConfirm(false);
      onClose();
    },
  });

  const handleDeleteProposal = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    await deleteProposalMutation.mutateAsync();
  };

  const getCurrentBoardId = () => {
    const rfp15Board = allBoards.find(b => b.board_type === 'rfp_15_column');
    if (rfp15Board && proposal.proposal_type_category === 'RFP_15_COLUMN') {
      return rfp15Board.id;
    }

    const typeBoard = allBoards.find(b => 
      !b.is_master_board && 
      b.applies_to_proposal_types?.includes(proposal.proposal_type_category)
    );
    
    if (typeBoard) {
      return typeBoard.id;
    }

    return '';
  };

  const handleBoardReassignment = async (newBoardId) => {
    if (!newBoardId) return;
    
    const newBoard = allBoards.find(b => b.id === newBoardId);
    if (!newBoard) return;

    try {
      let newProposalType;
      
      if (newBoard.board_type === 'rfp_15_column') {
        newProposalType = 'RFP_15_COLUMN';
      } else {
        newProposalType = newBoard.applies_to_proposal_types?.[0] || 'OTHER';
      }

      const newBoardColumns = newBoard.columns || [];
      const firstColumn = newBoardColumns.find(col => !col.is_terminal);
      
      if (!firstColumn) {
        alert('❌ Error: New board has no workflow columns.');
        return;
      }

      const updates = {
        proposal_type_category: newProposalType
      };

      if (firstColumn.type === 'custom_stage') {
        updates.custom_workflow_stage_id = firstColumn.id;
        updates.current_phase = null;
        updates.status = 'in_progress';
      } else if (firstColumn.type === 'locked_phase') {
        updates.custom_workflow_stage_id = firstColumn.id;
        updates.current_phase = firstColumn.phase_mapping;
        updates.status = firstColumn.default_status_mapping || 'evaluating';
      } else if (firstColumn.type === 'default_status') {
        updates.status = firstColumn.default_status_mapping;
        updates.current_phase = null;
        updates.custom_workflow_stage_id = null;
      } else if (firstColumn.type === 'master_status') {
        updates.status = firstColumn.status_mapping?.[0] || 'evaluating';
        updates.current_phase = null;
        updates.custom_workflow_stage_id = null;
      }

      updates.current_stage_checklist_status = {
        [firstColumn.id]: {}
      };

      const hasRequiredItems = firstColumn.checklist_items?.some(item => item.required);
      updates.action_required = hasRequiredItems;
      updates.action_required_description = hasRequiredItems 
        ? `Complete required items in ${firstColumn.label}` 
        : null;

      updates.manual_order = 0;

      await updateProposalMutation.mutateAsync(updates);

      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
      await queryClient.refetchQueries({ queryKey: ['proposals'] });
      
      alert(`✅ Proposal moved to "${newBoard.board_name}" → "${firstColumn.label}" column!`);
      
      onClose();
      
    } catch (error) {
      console.error('[ProposalCardModal] Error reassigning board:', error);
      alert('❌ Error moving proposal to new board. Please try again.');
    }
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

  // **UPDATED: Handle stage navigation with custom dialog**
  const handleMoveToStage = async (targetColumn, direction = 'forward') => {
    if (!targetColumn || !currentColumn) return;

    // Check if all required items are complete
    const hasIncompleteRequired = currentColumn.checklist_items
      ?.filter(ci => ci && ci.required && ci.type !== 'system_check')
      .some(ci => !checklistStatus[ci.id]?.completed);

    // Show custom confirmation if moving forward with incomplete tasks
    if (direction === 'forward' && hasIncompleteRequired) {
      setPendingStageMove({ targetColumn, direction });
      setShowIncompleteTasksConfirm(true);
      return;
    }

    // If no incomplete tasks OR moving backward, check for approval gate directly
    if (currentColumn.requires_approval_to_exit && direction === 'forward') {
      console.log('[ProposalCardModal] 🔐 Approval required to exit column:', currentColumn.label);
      setApprovalGateData({
        proposal,
        sourceColumn: currentColumn,
        destinationColumn: targetColumn,
        direction
      });
      setShowApprovalGate(true);
      return;
    }

    // Proceed with move if no incomplete tasks and no approval needed (or moving backward)
    await performStageMove(targetColumn);
  };

  const handleConfirmIncompleteMove = async () => {
    setShowIncompleteTasksConfirm(false);
    
    if (pendingStageMove) {
      const { targetColumn, direction } = pendingStageMove;
      
      // Check if approval is required AFTER user confirmed incomplete tasks
      if (currentColumn.requires_approval_to_exit && direction === 'forward') {
        console.log('[ProposalCardModal] 🔐 Approval required to exit column:', currentColumn.label);
        setApprovalGateData({
          proposal,
          sourceColumn: currentColumn,
          destinationColumn: targetColumn,
          direction: direction
        });
        setShowApprovalGate(true);
        setPendingStageMove(null);
        return;
      }
      
      await performStageMove(targetColumn);
      setPendingStageMove(null);
    }
  };

  const performStageMove = async (targetColumn) => {
    setIsMovingStage(true);
    
    try {
      const updates = {};

      // Determine updates based on target column type
      if (targetColumn.type === 'locked_phase') {
        updates.current_phase = targetColumn.phase_mapping;
        updates.status = getStatusFromPhase(targetColumn.phase_mapping);
        updates.custom_workflow_stage_id = targetColumn.id;
      } else if (targetColumn.type === 'custom_stage') {
        updates.custom_workflow_stage_id = targetColumn.id;
        updates.current_phase = null;
        updates.status = 'in_progress';
      } else if (targetColumn.type === 'default_status') {
        updates.status = targetColumn.default_status_mapping;
        updates.current_phase = null;
        updates.custom_workflow_stage_id = null;
      } else if (targetColumn.type === 'master_status') {
        if (targetColumn.status_mapping && targetColumn.status_mapping.length > 0) {
          updates.status = targetColumn.status_mapping[0];
        }
        updates.current_phase = null;
        updates.custom_workflow_stage_id = null;
      }

      // Preserve existing checklist data, only initialize if target column has no data
      const updatedChecklistStatus = { ...(proposal.current_stage_checklist_status || {}) };
      if (!updatedChecklistStatus[targetColumn.id]) {
        updatedChecklistStatus[targetColumn.id] = {};
      }
      updates.current_stage_checklist_status = updatedChecklistStatus;

      const hasRequiredItems = targetColumn.checklist_items?.some(item => item.required);
      updates.action_required = hasRequiredItems;
      updates.action_required_description = hasRequiredItems 
        ? `Complete required items in ${targetColumn.label}` 
        : null;

      updates.manual_order = 0;

      await updateProposalMutation.mutateAsync(updates);
      
      // Show success toast
      toast.success(
        `✅ Moved to "${targetColumn.label}"`,
        {
          description: `Continue working on the new stage checklist`,
          duration: 3000,
        }
      );

      // The modal will automatically update to show the new stage's checklist
      
    } catch (error) {
      console.error('[ProposalCardModal] Error moving stage:', error);
      toast.error('Failed to move to next stage. Please try again.');
    } finally {
      setIsMovingStage(false);
    }
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

  const handleApprovalComplete = async (approved) => {
    setShowApprovalGate(false);

    if (approved && approvalGateData) {
      await performStageMove(approvalGateData.destinationColumn);
    }

    setApprovalGateData(null);
  };

  const handleChecklistItemClick = async (item) => {
    console.log('[ProposalCardModal] ✨ Checklist item clicked:', item.label, 'Action:', item.associated_action);

    // If already completed, and it's a manual check, toggle it back to incomplete
    const isCurrentlyCompleted = item.type === 'system_check' 
      ? systemCheckStatus(item)
      : checklistStatus[item.id]?.completed || false;
      
    if (isCurrentlyCompleted && item.type === 'manual_check' && !item.associated_action) {
      await handleChecklistItemToggle(item);
      return;
    }

    if (!item.associated_action) {
      await handleChecklistItemToggle(item);
      return;
    }

    const actionConfig = getActionConfig(item.associated_action);

    if (!actionConfig) {
      console.warn(`[ProposalCardModal] ⚠️ No action config found for: ${item.associated_action}`);
      await handleChecklistItemToggle(item);
      return;
    }

    if (isNavigateAction(item.associated_action)) {
      const url = `${createPageUrl(actionConfig.path)}?id=${proposal.id}`;
      navigate(url);
      onClose();
      return;
    }

    const modalName = ACTION_TO_MODAL_MAP[item.associated_action];
    
    if (modalName && MODAL_COMPONENTS[modalName]) {
      setActiveChecklistItemId(item.id);
      setActiveModalName(modalName);
      return;
    }

    if (item.type === 'system_check' || item.type === 'manual_check') {
      await handleChecklistItemToggle(item);
    }
  };

  const handleChecklistItemToggle = async (item) => {
    if (!item || !currentColumn) {
      console.error('[ProposalCardModal] Cannot toggle - invalid item or column');
      return;
    }

    const currentStatus = proposal.current_stage_checklist_status || {};
    const columnStatus = currentStatus[currentColumn?.id] || {};
    const itemStatus = columnStatus[item.id] || {};
    
    const isCurrentlyCompleted = itemStatus.completed || false;
    
    const updatedColumnStatus = {
      ...columnStatus,
      [item.id]: {
        completed: !isCurrentlyCompleted,
        completed_by: !isCurrentlyCompleted ? (user?.email || "system") : null,
        completed_date: !isCurrentlyCompleted ? new Date().toISOString() : null
      }
    };
    
    const updatedChecklistStatus = {
      ...currentStatus,
      [currentColumn?.id]: updatedColumnStatus
    };
    
    const allRequiredComplete = currentColumn?.checklist_items
      ?.filter(ci => ci && ci.required && ci.type !== 'system_check')
      .every(ci => {
        if (ci.id === item.id) {
          return !isCurrentlyCompleted;
        }
        return updatedColumnStatus[ci.id]?.completed || false;
      });

    await updateProposalMutation.mutateAsync({
      current_stage_checklist_status: updatedChecklistStatus,
      action_required: !allRequiredComplete
    });
  };

  const handleModalClose = async (checklistItemId = null) => {
    console.log('[ProposalCardModal] 🚪 Closing modal, checklist item ID:', checklistItemId || activeChecklistItemId);
    
    setActiveModalName(null);
    
    const itemIdToComplete = checklistItemId || activeChecklistItemId;
    
    if (itemIdToComplete && currentColumn) {
      const currentStatus = proposal.current_stage_checklist_status || {};
      const columnStatus = currentStatus[currentColumn.id] || {};
      
      const updatedColumnStatus = {
        ...columnStatus,
        [itemIdToComplete]: {
          completed: true,
          completed_by: user?.email || "system",
          completed_date: new Date().toISOString()
        }
      };
      
      const updatedChecklistStatus = {
        ...currentStatus,
        [currentColumn.id]: updatedColumnStatus
      };
      
      const allRequiredComplete = currentColumn.checklist_items
        ?.filter(ci => ci && ci.required && ci.type !== 'system_check')
        .every(ci => {
          if (ci.id === itemIdToComplete) {
            return true;
          }
          return updatedColumnStatus[ci.id]?.completed || false;
        });

      await updateProposalMutation.mutateAsync({
        current_stage_checklist_status: updatedChecklistStatus,
        action_required: !allRequiredComplete
      });
    }
    
    setActiveChecklistItemId(null);
    
    await queryClient.invalidateQueries({ queryKey: ['proposals'] });
  };

  const renderActiveModal = () => {
    if (!activeModalName) {
      return null;
    }
    
    const ModalComponent = MODAL_COMPONENTS[activeModalName];
    if (!ModalComponent) {
      return null;
    }

    return (
      <ModalComponent
        isOpen={true}
        onClose={() => {
          handleModalClose();
        }}
        proposalId={proposal.id}
      />
    );
  };

  const systemCheckStatus = (item) => {
    if (!item || !item.id) return false;

    switch (item.id) {
      case 'contract_value_present':
        return proposal.contract_value ? true : false;
      case 'due_date_present':
        return proposal.due_date ? true : false;
      case 'complete_sections':
        const sections = proposal.sections || [];
        const totalSections = sections?.length || 0;
        const completedSections = sections?.filter(s => s.status === 'approved').length || 0;
        return totalSections > 0 && completedSections === totalSections;
      default:
        return false;
    }
  };

  const getItemIcon = (item, isCompleted) => {
    if (!item) return <Circle className="w-6 h-6 text-slate-400" />;

    if (isCompleted) {
      return <CheckCircle2 className="w-6 h-6 text-green-600" />;
    }

    if (!item.associated_action || item.type === 'manual_check') {
      return <Circle className="w-6 h-6 text-slate-400 hover:text-slate-600" />;
    }

    if (isNavigateAction(item.associated_action)) {
      return <ExternalLink className="w-6 h-6 text-blue-500" />;
    }

    if (isAIAction(item.associated_action)) {
      return <Sparkles className="w-6 h-6 text-purple-500" />;
    }

    if (isModalAction(item.associated_action)) {
      return <FileEdit className="w-6 h-6 text-indigo-500" />;
    }

    if (item.type === 'system_check') {
      return <AlertCircle className="w-6 h-6 text-orange-500" />;
    }

    return <Circle className="w-6 h-6 text-slate-400" />;
  };

  if (!proposal) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="border-b p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <DialogTitle className="text-2xl">{proposal.proposal_name}</DialogTitle>
                  {/* **NEW: Stage Progress Indicator** */}
                  {stageProgress.total > 0 && (
                    <Badge variant="outline" className="text-sm">
                      Stage {stageProgress.current} of {stageProgress.total}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {proposal.solicitation_number && (
                    <Badge variant="outline" className="font-mono">
                      {proposal.solicitation_number}
                    </Badge>
                  )}
                  {currentColumn && (
                    <Badge className={cn("bg-gradient-to-r", currentColumn.color, "text-white")}>
                      {currentColumn.label}
                    </Badge>
                  )}
                  {proposal.agency_name && (
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Building2 className="w-4 h-4" />
                      {proposal.agency_name}
                    </div>
                  )}
                  {proposal.contract_value && (
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <DollarSign className="w-4 h-4" />
                      ${(proposal.contract_value / 1000000).toFixed(1)}M
                    </div>
                  )}
                  {proposal.due_date && (
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      {moment(proposal.due_date).format('MMM D, YYYY')}
                    </div>
                  )}
                </div>

                {sharedClients.length > 0 && (
                  <div className="mt-3 p-3 bg-purple-50 border-2 border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 text-purple-700" />
                      <span className="text-sm font-semibold text-purple-900">
                        Shared with {sharedClients.length} client{sharedClients.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sharedClients.map(client => (
                        <div 
                          key={client.id}
                          className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-purple-200"
                        >
                          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {client.client_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900}>{client.client_name}</p>
                            <p className="text-xs text-slate-500">{client.contact_email}</p>
                          </div>
                          {client.engagement_score && (
                            <Badge className="bg-purple-100 text-purple-700 text-xs ml-2">
                              {client.engagement_score}% engaged
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {allBoards.length > 0 && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                          <Layers className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                          Board Assignment
                        </Label>
                        <Select
                          value={getCurrentBoardId()}
                          onValueChange={handleBoardReassignment}
                        >
                          <SelectTrigger className="w-full h-10 bg-white border-2 border-blue-300 hover:border-blue-400">
                            <SelectValue placeholder="Select board..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allBoards.map(board => {
                              const icon = getBoardIcon(board.board_type, board.is_master_board);
                              return (
                                <SelectItem key={board.id} value={board.id}>
                                  <span className="flex items-center gap-2">
                                    <span className="text-lg">{icon}</span>
                                    <span>{board.board_name}</span>
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
                          <span>💡</span>
                          <span><strong>Move this proposal</strong> to a different workflow board (Master board shows all automatically)</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteProposal}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Delete proposal"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent sticky top-0 z-10 bg-white">
                <TabsTrigger 
                  value="checklist" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 py-3 px-4 flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Stage Checklist
                  {checklistItems.filter(item => item && item.required && !(item.type === 'system_check' ? systemCheckStatus(item) : checklistStatus[item?.id]?.completed)).length > 0 && (
                    <Badge className="ml-2 bg-red-500">
                      {checklistItems.filter(item => item && item.required && !(item.type === 'system_check' ? systemCheckStatus(item) : checklistStatus[item?.id]?.completed)).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="timeline" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 py-3 px-4 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Timeline
                  {proposal.timeline_status === 'complete' && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="tasks" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 py-3 px-4 flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Tasks
                </TabsTrigger>
                <TabsTrigger 
                  value="data-calls" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 py-3 px-4 flex items-center gap-2"
                >
                  <FileQuestion className="w-4 h-4" />
                  Data Calls
                </TabsTrigger>
                <TabsTrigger 
                  value="discussions" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 py-3 px-4 flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Discussions
                </TabsTrigger>
                <TabsTrigger 
                  value="files" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 py-3 px-4 flex items-center gap-2"
                >
                  <Paperclip className="w-4 h-4" />
                  Files
                </TabsTrigger>
                <TabsTrigger 
                  value="quick-actions" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 py-3 px-4 flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Quick Actions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="checklist" className="p-6 space-y-4">
                {currentColumn ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
                        currentColumn.color
                      )}>
                        <span className="text-white font-bold text-sm">
                          {currentColumn.label?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{currentColumn.label || 'Current Stage'}</h3>
                        <p className="text-sm text-slate-500">
                          Complete these items to progress to the next stage
                        </p>
                      </div>
                    </div>

                    {checklistItems.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No checklist items for this stage</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {checklistItems
                          .filter(item => item != null)
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((item) => {
                            if (!item) return null;

                            const itemStatus = checklistStatus[item.id] || {};
                            const isCompleted = item.type === 'system_check' 
                              ? systemCheckStatus(item)
                              : itemStatus.completed || false;
                            
                            const isClickable = item.associated_action || item.type === 'manual_check';

                            return (
                              <Card 
                                key={item.id}
                                className={cn(
                                  "border-2 transition-all",
                                  isCompleted ? "border-green-200 bg-green-50" : "border-slate-200",
                                  item.required && !isCompleted && "border-orange-200 bg-orange-50",
                                  isClickable && "hover:border-blue-300 hover:shadow-md"
                                )}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-1 flex-shrink-0">
                                      {getItemIcon(item, isCompleted)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <div className="font-medium flex items-center gap-2 flex-wrap">
                                            <span className={cn(
                                              isCompleted ? "text-green-900" : "text-slate-900"
                                            )}>
                                              {item.label || 'Unnamed Item'}
                                            </span>
                                            {item.required && !isCompleted && (
                                              <Badge className="bg-red-500 text-xs">Required</Badge>
                                            )}
                                          </div>
                                          
                                          {item.type === 'system_check' && !isCompleted && (
                                            <p className="text-xs text-slate-600 mt-1">
                                              This will be automatically checked when data is provided
                                            </p>
                                          )}

                                          {isCompleted && itemStatus.completed_date && (
                                            <p className="text-xs text-green-700 mt-1">
                                              ✓ Completed {moment(itemStatus.completed_date).fromNow()}
                                              {itemStatus.completed_by && ` by ${itemStatus.completed_by}`}
                                            </p>
                                          )}
                                        </div>

                                        {isClickable && (
                                          <Button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleChecklistItemClick(item);
                                            }}
                                            size="sm"
                                            className={cn(
                                              "flex-shrink-0",
                                              isCompleted && item.associated_action 
                                                ? "bg-green-600 hover:bg-green-700" 
                                                : isModalAction(item.associated_action) ? "bg-indigo-600 hover:bg-indigo-700" :
                                                  isNavigateAction(item.associated_action) ? "bg-blue-600 hover:bg-blue-700" :
                                                  "bg-slate-600 hover:bg-slate-700"
                                            )}
                                          >
                                            {isModalAction(item.associated_action) && (
                                              <FileEdit className="w-4 h-4 mr-1.5" />
                                            )}
                                            {isNavigateAction(item.associated_action) && (
                                              <ExternalLink className="w-4 h-4 mr-1.5" />
                                            )}
                                            {item.type === 'manual_check' && !item.associated_action && (
                                              <Circle className="w-4 h-4 mr-1.5" />
                                            )}
                                            {isCompleted && item.associated_action ? 'Click to Edit' : 'Click to Start'}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                      </div>
                    )}

                    <Card className="mt-6 bg-slate-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Checklist Progress</p>
                            <p className="text-xs text-slate-500">
                              {checklistItems.filter(item => {
                                if (!item) return false;
                                if (item.type === 'system_check') {
                                  return systemCheckStatus(item);
                                }
                                return checklistStatus[item.id]?.completed || false;
                              }).length} of {checklistItems.length} items complete
                            </p>
                          </div>
                          <div className="text-right">
                            {checklistItems.filter(item => item && item.required && !(item.type === 'system_check' ? systemCheckStatus(item) : checklistStatus[item.id]?.completed)).length === 0 ? (
                              <Badge className="bg-green-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Ready to Progress
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-500">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {checklistItems.filter(item => item && item.required && !(item.type === 'system_check' ? systemCheckStatus(item) : checklistStatus[item.id]?.completed)).length} Required Items
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Unable to determine current stage</p>
                    <p className="text-xs mt-2">The proposal may not be properly assigned to a column</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-0 p-6">
                {user && organization && (
                  <ProposalTimelineEditor
                    proposal={proposal}
                    onUpdate={async (updatedProposal) => {
                      // Update the local proposal state in the modal to reflect changes immediately
                      queryClient.setQueryData(['proposal-modal', proposal.id], updatedProposal);
                      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
                      await queryClient.invalidateQueries({ queryKey: ['proposal-modal', proposal.id] });
                    }}
                    organizationUsers={organization.members || []}
                  />
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-0 p-6">
                {user && organization && (
                  <TaskManager 
                    user={user} 
                    organization={organization}
                    proposalId={proposal.id}
                    embedded={true}
                  />
                )}
              </TabsContent>

              <TabsContent value="data-calls" className="mt-0 p-6">
                {user && organization && (
                  <DataCallManager
                    proposal={proposal}
                    organization={organization}
                    user={user}
                  />
                )}
              </TabsContent>

              <TabsContent value="discussions" className="mt-0 p-6">
                {user && organization && (
                  <ProposalDiscussion
                    proposal={proposal}
                    user={user}
                    organization={organization}
                  />
                )}
              </TabsContent>

              <TabsContent value="files" className="mt-0 p-6">
                {organization && (
                  <ProposalFiles
                    proposal={proposal}
                    organization={organization}
                  />
                )}
              </TabsContent>

              <TabsContent value="quick-actions" className="mt-0 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => {
                      navigate(createPageUrl("proposals/WriteContentStandalone") + `?id=${proposal.id}`);
                      onClose();
                    }}
                    className="h-24 flex-col gap-2 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                  >
                    <FileEdit className="w-8 h-8" />
                    <span>Write Content</span>
                  </Button>

                  <Button
                    onClick={() => {
                      navigate(createPageUrl("proposals/ComplianceMatrixStandalone") + `?id=${proposal.id}`);
                      onClose();
                    }}
                    className="h-24 flex-col gap-2 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700"
                  >
                    <Shield className="w-8 h-8" />
                    <span>Compliance Matrix</span>
                  </Button>

                  <Button
                    onClick={() => {
                      navigate(createPageUrl("proposals/PricingBuildStandalone") + `?id=${proposal.id}`);
                      onClose();
                    }}
                    className="h-24 flex-col gap-2 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                  >
                    <DollarSign className="w-8 h-8" />
                    <span>Build Pricing</span>
                  </Button>

                  <Button
                    onClick={() => {
                      navigate(createPageUrl("proposals/RedTeamReviewStandalone") + `?id=${proposal.id}`);
                      onClose();
                    }}
                    className="h-24 flex-col gap-2 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                  >
                    <Activity className="w-8 h-8" />
                    <span>Red Team Review</span>
                  </Button>

                  <Button
                    onClick={() => {
                      navigate(createPageUrl("proposals/SubmissionReadyStandalone") + `?id=${proposal.id}`);
                      onClose();
                    }}
                    className="h-24 flex-col gap-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    <Target className="w-8 h-8" />
                    <span>Submission Checklist</span>
                  </Button>

                  <Button
                    onClick={() => {
                      navigate(createPageUrl("ExportCenter") + `?id=${proposal.id}`);
                      onClose();
                    }}
                    className="h-24 flex-col gap-2 bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                  >
                    <Upload className="w-8 h-8" />
                    <span>Export Proposal</span>
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* **NEW: Stage Navigation Buttons at Bottom** */}
          <div className="border-t bg-slate-50 p-4 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              {/* Previous Stage Button */}
              <Button
                variant="outline"
                onClick={() => handleMoveToStage(stageProgress.previous, 'backward')}
                disabled={!stageProgress.previous || isMovingStage}
                className={cn(
                  "flex-1 h-12",
                  !stageProgress.previous && "opacity-50 cursor-not-allowed"
                )}
              >
                {isMovingStage ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Moving...
                  </>
                ) : stageProgress.previous ? (
                  <>
                    <ChevronsLeft className="w-5 h-5 mr-2" />
                    Go Back: {stageProgress.previous.label}
                  </>
                ) : (
                  <>
                    <ChevronsLeft className="w-5 h-5 mr-2 opacity-50" />
                    First Stage
                  </>
                )}
              </Button>

              {/* Next Stage Button */}
              <Button
                onClick={() => handleMoveToStage(stageProgress.next, 'forward')}
                disabled={!stageProgress.next || isMovingStage || stageProgress.isLastStage}
                className={cn(
                  "flex-1 h-12 font-semibold",
                  allRequiredComplete && stageProgress.next
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white",
                  (!stageProgress.next || stageProgress.isLastStage) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isMovingStage ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Moving...
                  </>
                ) : stageProgress.next ? (
                  <>
                    Go To: {stageProgress.next.label}
                    <ChevronsRight className="w-5 h-5 ml-2" />
                  </>
                ) : stageProgress.isLastStage ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Workflow Complete
                  </>
                ) : (
                  <>
                    Next Stage
                    <ChevronsRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* **NEW: Custom Incomplete Tasks Confirmation Dialog** */}
      <ConfirmDialog
        isOpen={showIncompleteTasksConfirm}
        onClose={() => {
          setShowIncompleteTasksConfirm(false);
          setPendingStageMove(null);
        }}
        onConfirm={handleConfirmIncompleteMove}
        title="Move with Incomplete Tasks?"
        variant="warning"
        confirmText={`Move to ${pendingStageMove?.targetColumn?.label || 'Next Stage'}`}
        cancelText="Stay Here"
      >
        <div className="space-y-3">
          <p className="text-slate-700">
            Some required tasks in <strong>"{currentColumn?.label}"</strong> are incomplete.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-900">
              ⚠️ Moving without completing all required tasks may affect your workflow.
            </p>
          </div>
          <p className="text-sm text-slate-600">
            Are you sure you want to continue to <strong>"{pendingStageMove?.targetColumn?.label}"</strong>?
          </p>
        </div>
      </ConfirmDialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Proposal?"
        variant="danger"
        confirmText="Yes, Delete Proposal"
        cancelText="Cancel"
        isLoading={deleteProposalMutation.isPending}
      >
        <div className="space-y-3">
          <p className="text-slate-700">
            Are you sure you want to delete <strong>"{proposal.proposal_name}"</strong>?
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              ⚠️ <strong>Warning:</strong> This action cannot be undone. All associated tasks, discussions, files, and data will be permanently deleted.
            </p>
          </div>
        </div>
      </ConfirmDialog>

      {/* **Approval Gate Dialog** */}
      {showApprovalGate && approvalGateData && (
        <ApprovalGate
          isOpen={showApprovalGate}
          onClose={() => {
            setShowApprovalGate(false);
            setApprovalGateData(null);
            setIsMovingStage(false);
          }}
          proposal={approvalGateData.proposal}
          sourceColumn={approvalGateData.sourceColumn}
          destinationColumn={approvalGateData.destinationColumn}
          onApprovalComplete={handleApprovalComplete}
          user={user}
          organization={organization}
        />
      )}

      {renderActiveModal()}
      
      {showWinPromoteDialog && (
        <WinToPromoteDialog
          isOpen={showWinPromoteDialog}
          onClose={() => setShowWinPromoteDialog(false)}
          proposal={proposal}
          organization={organization}
        />
      )}
    </>
  );
}
