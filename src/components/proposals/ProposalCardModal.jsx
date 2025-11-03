
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  X,
  CheckSquare,
  MessageCircle,
  Paperclip,
  Calendar,
  DollarSign,
  Building2,
  Users,
  Sparkles,
  PlayCircle,
  CheckCircle2,
  Circle,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import TaskManager from "../tasks/TaskManager";
import ProposalDiscussion from "../collaboration/ProposalDiscussion";
import ProposalFiles from "../collaboration/ProposalFiles";
import PhaseModal from "./PhaseModal";
import AIActionModal from "./AIActionModal";
import ChecklistSystemValidator from "./ChecklistSystemValidator";

export default function ProposalCardModal({ proposal, isOpen, onClose, organization, kanbanConfig }) {
  const queryClient = useQueryClient();
  const [currentTab, setCurrentTab] = useState("checklist");
  const [user, setUser] = useState(null);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedAIAction, setSelectedAIAction] = useState(null);

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

  // Calculate checklist completion
  const completedChecklistItems = checklistItems.filter(item => 
    checklistStatus[item.id]?.completed
  ).length;
  const totalChecklistItems = checklistItems.length;

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ itemId, completed }) => {
      const updatedStatus = {
        ...proposal.current_stage_checklist_status,
        [currentColumn.id]: {
          ...(proposal.current_stage_checklist_status?.[currentColumn.id] || {}),
          [itemId]: {
            completed,
            completed_by: user.email,
            completed_date: new Date().toISOString()
          }
        }
      };

      // Check if there are any required incomplete items
      const hasActionRequired = checklistItems.some(item => 
        item.required && !updatedStatus[currentColumn.id]?.[item.id]?.completed
      );

      return base44.entities.Proposal.update(proposal.id, {
        current_stage_checklist_status: updatedStatus,
        action_required: hasActionRequired,
        action_required_description: hasActionRequired 
          ? `Complete required items in ${currentColumn.label}` 
          : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const handleChecklistToggle = (itemId, currentStatus) => {
    updateChecklistMutation.mutate({
      itemId,
      completed: !currentStatus
    });
  };

  const handleChecklistAction = (action, item) => {
    // Handle different action types
    if (action.startsWith('open_modal_')) {
      // Extract phase from action (e.g., 'open_modal_phase1' -> 'phase1')
      const phase = action.replace('open_modal_', '');
      setSelectedPhase(phase);
      setShowPhaseModal(true);
    } else if (action.startsWith('run_ai_') || action.startsWith('run_') || action.startsWith('generate_')) {
      // Trigger AI action
      setSelectedAIAction(action);
      setShowAIModal(true);
    } else if (action === 'open_red_team_review') {
      // Navigate to proposal builder Phase 7
      window.location.href = `/proposal-builder?id=${proposal.id}&phase=phase7`;
    }
  };

  const handlePhaseModalSave = () => {
    setShowPhaseModal(false);
    setSelectedPhase(null);
    // Refresh proposal data
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
  };

  const handleAIActionComplete = (result) => {
    // AI action completed successfully
    console.log("AI Action Result:", result);
    setShowAIModal(false);
    setSelectedAIAction(null);
    
    // Optionally mark the checklist item as complete
    // This would require knowing which item triggered it
  };

  return (
    <>
      {/* System validator to automatically check system_check items */}
      <ChecklistSystemValidator 
        proposal={proposal}
        kanbanConfig={kanbanConfig}
        user={user}
      />

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
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

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="checklist" className="gap-2">
                <CheckSquare className="w-4 h-4" />
                Checklist
                {totalChecklistItems > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {completedChecklistItems}/{totalChecklistItems}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="gap-2">
                <CheckSquare className="w-4 h-4" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="discussions" className="gap-2">
                <MessageCircle className="w-4 h-4" />
                Discussions
              </TabsTrigger>
              <TabsTrigger value="files" className="gap-2">
                <Paperclip className="w-4 h-4" />
                Files
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="checklist" className="mt-0 space-y-6">
                {totalChecklistItems === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600">No checklist items for this stage</p>
                  </div>
                ) : (
                  <>
                    {/* Progress Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-slate-900">
                          {currentColumn?.label} Stage Progress
                        </h3>
                        <span className="text-2xl font-bold text-blue-600">
                          {totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${totalChecklistItems > 0 ? (completedChecklistItems / totalChecklistItems) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <p className="text-sm text-slate-600 mt-2">
                        {completedChecklistItems} of {totalChecklistItems} items completed
                      </p>
                    </div>

                    {/* Checklist Items */}
                    <div className="space-y-3">
                      {checklistItems
                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                        .map((item) => {
                          const isCompleted = checklistStatus[item.id]?.completed;
                          const canCheck = item.type === 'manual_check' || item.type === 'system_check';
                          const hasAction = item.type === 'modal_trigger' || item.type === 'ai_trigger';

                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "p-4 rounded-lg border-2 transition-all",
                                isCompleted 
                                  ? "bg-green-50 border-green-200" 
                                  : item.required 
                                    ? "bg-white border-red-200" 
                                    : "bg-white border-slate-200"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                {canCheck ? (
                                  <Checkbox
                                    checked={isCompleted}
                                    onCheckedChange={() => handleChecklistToggle(item.id, isCompleted)}
                                    className="mt-1"
                                    disabled={item.type === 'system_check'} // Disable checkbox for system_check
                                  />
                                ) : (
                                  <div className="mt-1">
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    ) : item.required ? (
                                      <AlertCircle className="w-5 h-5 text-red-500" />
                                    ) : (
                                      <Circle className="w-5 h-5 text-slate-300" />
                                    )}
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                      "font-medium",
                                      isCompleted ? "text-slate-500 line-through" : "text-slate-900"
                                    )}>
                                      {item.label}
                                    </span>
                                    {item.required && !isCompleted && (
                                      <Badge variant="destructive" className="text-xs">
                                        Required
                                      </Badge>
                                    )}
                                    {item.type === 'ai_trigger' && (
                                      <Badge className="text-xs bg-purple-100 text-purple-700">
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        AI
                                      </Badge>
                                    )}
                                    {item.type === 'system_check' && (
                                      <Badge variant="secondary" className="text-xs">
                                        System Check
                                      </Badge>
                                    )}
                                  </div>

                                  {checklistStatus[item.id]?.completed_by && (
                                    <p className="text-xs text-slate-500">
                                      Completed by {checklistStatus[item.id].completed_by} on{' '}
                                      {moment(checklistStatus[item.id].completed_date).format('MMM D, YYYY h:mm A')}
                                    </p>
                                  )}
                                </div>

                                {hasAction && !isCompleted && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleChecklistAction(item.associated_action, item)}
                                    className="flex-shrink-0"
                                  >
                                    <PlayCircle className="w-4 h-4 mr-2" />
                                    {item.type === 'modal_trigger' ? 'Open' : 'Run'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="tasks" className="mt-0">
                {user && organization && (
                  <TaskManager 
                    user={user} 
                    organization={organization}
                    proposalId={proposal.id}
                    embedded={true}
                  />
                )}
              </TabsContent>

              <TabsContent value="discussions" className="mt-0">
                {user && organization && (
                  <ProposalDiscussion
                    proposal={proposal}
                    user={user}
                    organization={organization}
                  />
                )}
              </TabsContent>

              <TabsContent value="files" className="mt-0">
                {organization && (
                  <ProposalFiles
                    proposal={proposal}
                    organization={organization}
                  />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Phase Modal */}
      {showPhaseModal && selectedPhase && (
        <PhaseModal
          isOpen={showPhaseModal}
          onClose={() => {
            setShowPhaseModal(false);
            setSelectedPhase(null);
          }}
          proposal={proposal}
          phaseId={selectedPhase}
          onSave={handlePhaseModalSave}
        />
      )}

      {/* AI Action Modal */}
      {showAIModal && selectedAIAction && (
        <AIActionModal
          isOpen={showAIModal}
          onClose={() => {
            setShowAIModal(false);
            setSelectedAIAction(null);
          }}
          actionType={selectedAIAction}
          proposal={proposal}
          onComplete={handleAIActionComplete}
        />
      )}
    </>
  );
}
