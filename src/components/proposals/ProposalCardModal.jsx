
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
  Sparkles,
  PlayCircle,
  CheckCircle2,
  Circle,
  AlertCircle,
  ExternalLink,
  FileEdit,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import TaskManager from "../tasks/TaskManager";
import ProposalDiscussion from "../collaboration/ProposalDiscussion";
import ProposalFiles from "../collaboration/ProposalFiles";
import { getActionConfig, isNavigateAction, isModalAction, isAIAction } from "./ChecklistActionRegistry";
import WinProbabilityTracker from "../analytics/WinProbabilityTracker"; // New import

// Import modal components
import BasicInfoModal from "./modals/BasicInfoModal";
import TeamFormationModal from "./modals/TeamFormationModal";
import ResourceGatheringModal from "./modals/ResourceGatheringModal";
import SolicitationUploadModal from "./modals/SolicitationUploadModal";
import EvaluationModal from "./modals/EvaluationModal";
import WinStrategyModal from "./modals/WinStrategyModal";
import ContentPlanningModal from "./modals/ContentPlanningModal";
import PricingReviewModal from "./modals/PricingReviewModal";

export default function ProposalCardModal({ proposal, isOpen, onClose, organization, kanbanConfig }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("checklist");
  const [user, setUser] = useState(null);
  const [activeModalName, setActiveModalName] = useState(null);

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
    // Phase 1 - Basic Info
    'enter_basic_info': 'BasicInfoModal',
    'select_prime_contractor': 'BasicInfoModal',
    'add_solicitation_number': 'BasicInfoModal',
    'open_basic_info_modal': 'BasicInfoModal',
    'open_modal_phase1': 'BasicInfoModal',
    
    // Phase 2 - Team
    'form_team': 'TeamFormationModal',
    'add_teaming_partners': 'TeamFormationModal',
    'define_roles': 'TeamFormationModal',
    'open_team_formation_modal': 'TeamFormationModal',
    'open_modal_phase2': 'TeamFormationModal',
    
    // Phase 2 - Resources
    'gather_resources': 'ResourceGatheringModal',
    'link_boilerplate': 'ResourceGatheringModal',
    'link_past_performance': 'ResourceGatheringModal',
    'open_resource_gathering_modal': 'ResourceGatheringModal',
    
    // Phase 3 - Solicitation
    'upload_solicitation': 'SolicitationUploadModal',
    'extract_requirements': 'SolicitationUploadModal',
    'set_contract_value': 'SolicitationUploadModal',
    'open_solicitation_upload_modal': 'SolicitationUploadModal',
    'open_modal_phase3': 'SolicitationUploadModal',
    'run_ai_analysis_phase3': 'SolicitationUploadModal',
    
    // Phase 4 - Evaluation
    'run_evaluation': 'EvaluationModal',
    'calculate_confidence_score': 'EvaluationModal',
    'open_evaluation_modal': 'EvaluationModal',
    'open_modal_phase4': 'EvaluationModal',
    'run_evaluation_phase4': 'EvaluationModal',
    
    // Phase 5 - Win Strategy
    'develop_win_strategy': 'WinStrategyModal',
    'generate_win_themes': 'WinStrategyModal',
    'refine_themes': 'WinStrategyModal',
    'open_win_strategy_modal': 'WinStrategyModal',
    'open_modal_phase5': 'WinStrategyModal',
    'generate_win_themes_phase5': 'WinStrategyModal',
    
    // Phase 5 - Content Planning
    'plan_content': 'ContentPlanningModal',
    'select_sections': 'ContentPlanningModal',
    'set_writing_strategy': 'ContentPlanningModal',
    'open_content_planning_modal': 'ContentPlanningModal',
    
    // Phase 7 - Pricing
    'review_pricing': 'PricingReviewModal',
    'open_pricing_review_modal': 'PricingReviewModal',
  };

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

  // Get current column configuration
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

  const updateProposalMutation = useMutation({
    mutationFn: async (updates) => {
      return base44.entities.Proposal.update(proposal.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  // Handle checklist item click
  const handleChecklistItemClick = async (item) => {
    console.log('[ProposalCardModal] ✨ Checklist item clicked:', item.label, 'Action:', item.associated_action);

    // If no associated action, treat as manual checkbox
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

    console.log('[ProposalCardModal] ✅ Action config found:', actionConfig);

    // Check if this action maps to a modal
    const modalName = ACTION_TO_MODAL_MAP[item.associated_action];
    
    if (modalName && MODAL_COMPONENTS[modalName]) {
      console.log('[ProposalCardModal] 🎯 Opening modal:', modalName);
      setActiveModalName(modalName);
      return;
    }

    // Handle navigation actions
    if (isNavigateAction(item.associated_action)) {
      console.log('[ProposalCardModal] 🔗 Navigating to:', actionConfig.path);
      const pageName = actionConfig.path.replace(/^\//, '');
      const url = `${createPageUrl(pageName)}?id=${proposal.id}`;
      navigate(url);
      onClose(); // Close modal when navigating
      return;
    }

    // Handle system_check or manual_check - toggle completion
    if (item.type === 'system_check' || item.type === 'manual_check') {
      await handleChecklistItemToggle(item);
    }
  };

  // Handler for checking/unchecking checklist items
  const handleChecklistItemToggle = async (item) => {
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
      ?.filter(ci => ci.required && ci.type !== 'system_check')
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

  // Handle modal close
  const handleModalClose = () => {
    console.log('[ProposalCardModal] 🚪 Closing modal');
    setActiveModalName(null);
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
  };

  // Render active modal dynamically
  const renderActiveModal = () => {
    if (!activeModalName) return null;
    
    const ModalComponent = MODAL_COMPONENTS[activeModalName];
    if (!ModalComponent) {
      console.error('[ProposalCardModal] ❌ Modal component not found:', activeModalName);
      return null;
    }

    console.log('[ProposalCardModal] 🎭 Rendering modal:', activeModalName);
    return (
      <ModalComponent
        isOpen={true}
        onClose={handleModalClose}
        proposalId={proposal.id}
      />
    );
  };

  // System check validation
  const systemCheckStatus = (item) => {
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

  // Determine icon based on action type
  const getItemIcon = (item, isCompleted) => {
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="border-b p-6 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">{proposal.proposal_name}</DialogTitle>
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
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent sticky top-0 z-10 bg-white">
                <TabsTrigger 
                  value="checklist" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 py-3 px-4 flex items-center gap-2"
                >
                  <CheckSquare className="w-4 h-4" />
                  Stage Checklist
                  {checklistItems.filter(item => item.required && !(item.type === 'system_check' ? systemCheckStatus(item) : checklistStatus[item.id]?.completed)).length > 0 && (
                    <Badge className="ml-2 bg-red-500">
                      {checklistItems.filter(item => item.required && !(item.type === 'system_check' ? systemCheckStatus(item) : checklistStatus[item.id]?.completed)).length}
                    </Badge>
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
                  value="win-probability" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 py-3 px-4 flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  Win Probability
                </TabsTrigger>
              </TabsList>

              {/* Checklist Tab */}
              <TabsContent value="checklist" className="p-6 space-y-4">
                {currentColumn && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center",
                        currentColumn.color
                      )}>
                        <span className="text-white font-bold text-sm">
                          {currentColumn.label.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{currentColumn.label} Stage</h3>
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
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((item) => {
                            const itemStatus = checklistStatus[item.id] || {};
                            const isCompleted = item.type === 'system_check' 
                              ? systemCheckStatus(item)
                              : itemStatus.completed || false;
                            
                            const isClickable = !isCompleted && (item.associated_action || item.type === 'manual_check');

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
                                    {/* Icon */}
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
                                              {item.label}
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

                                        {/* Click to Start Button for clickable items */}
                                        {isClickable && (
                                          <Button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleChecklistItemClick(item);
                                            }}
                                            size="sm"
                                            className={cn(
                                              "flex-shrink-0",
                                              isModalAction(item.associated_action) ? "bg-indigo-600 hover:bg-indigo-700" :
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
                                            Click to Start
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

                    {/* Summary */}
                    <Card className="mt-6 bg-slate-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Checklist Progress</p>
                            <p className="text-xs text-slate-500">
                              {checklistItems.filter(item => {
                                if (item.type === 'system_check') {
                                  return systemCheckStatus(item);
                                }
                                return checklistStatus[item.id]?.completed || false;
                              }).length} of {checklistItems.length} items complete
                            </p>
                          </div>
                          <div className="text-right">
                            {checklistItems.filter(item => item.required && !(item.type === 'system_check' ? systemCheckStatus(item) : checklistStatus[item.id]?.completed)).length === 0 ? (
                              <Badge className="bg-green-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Ready to Progress
                              </Badge>
                            ) : (
                              <Badge className="bg-orange-500">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {checklistItems.filter(item => item.required && !(item.type === 'system_check' ? systemCheckStatus(item) : checklistStatus[item.id]?.completed)).length} Required Items
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
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

              <TabsContent value="win-probability" className="mt-0 p-6">
                {organization && (
                  <WinProbabilityTracker
                    proposal={proposal}
                    organization={organization}
                    showCompact={false}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Render Modal Dynamically */}
      {renderActiveModal()}
    </>
  );
}
