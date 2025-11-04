
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom"; // Added useNavigate
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
import { Card, CardContent } from "@/components/ui/card"; // Added Card, CardContent
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
// Removed ChecklistSystemValidator as its logic is now integrated

// Helper function to create page URL (assuming it's available globally or imported)
// If not, you might need to define it or replace it with direct paths.
const createPageUrl = (pageName) => {
  // This is a placeholder. In a real app, this would map page names to routes.
  // Example: if (pageName === "ProposalBuilder") return "/proposal-builder";
  // For now, returning a generic path.
  if (pageName === "ProposalBuilder") return "/proposal-builder";
  return `/${pageName.toLowerCase()}`;
};


export default function ProposalCardModal({ proposal, isOpen, onClose, organization, kanbanConfig }) {
  const navigate = useNavigate(); // Initialized useNavigate
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("checklist"); // Changed from currentTab to activeTab
  const [user, setUser] = useState(null);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [selectedPhaseAction, setSelectedPhaseAction] = useState(null); // Changed from selectedPhase to selectedPhaseAction
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

  const updateProposalMutation = useMutation({
    mutationFn: async (updates) => {
      return base44.entities.Proposal.update(proposal.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  // Handler for checking/unchecking checklist items
  const handleChecklistItemToggle = async (item) => {
    const currentStatus = proposal.current_stage_checklist_status || {};
    const columnStatus = currentStatus[currentColumn?.id] || {};
    const itemStatus = columnStatus[item.id] || {};
    
    const isCurrentlyCompleted = itemStatus.completed || false;
    
    // Update the checklist status
    const updatedColumnStatus = {
      ...columnStatus,
      [item.id]: {
        completed: !isCurrentlyCompleted,
        completed_by: !isCurrentlyCompleted ? (user?.email || "system") : null, // Use user.email or a default
        completed_date: !isCurrentlyCompleted ? new Date().toISOString() : null
      }
    };
    
    const updatedChecklistStatus = {
      ...currentStatus,
      [currentColumn?.id]: updatedColumnStatus
    };
    
    // Check if all required items are now complete
    const allRequiredComplete = currentColumn?.checklist_items
      ?.filter(ci => ci.required && ci.type !== 'system_check') // Only consider manual/trigger required items
      .every(ci => {
        if (ci.id === item.id) {
          return !isCurrentlyCompleted; // Use the new status for this item
        }
        return updatedColumnStatus[ci.id]?.completed || false;
      });

    await updateProposalMutation.mutateAsync({
      current_stage_checklist_status: updatedChecklistStatus,
      action_required: !allRequiredComplete
    });
  };

  // Handler for modal trigger items
  const handleModalTriggerClick = (item) => {
    const actionMap = {
      'open_modal_phase1': 'phase1',
      'open_modal_phase2': 'phase2',
      'open_modal_phase3': 'phase3',
      'open_modal_phase4': 'phase4',
      'open_modal_phase5': 'phase5',
      'open_modal_phase6': 'phase6',
      'open_modal_phase7': 'phase7'
    };
    
    const phase = actionMap[item.associated_action];
    if (phase) {
      setSelectedPhaseAction({ phase, itemId: item.id });
      setShowPhaseModal(true);
    }
  };

  // Handler when phase modal closes successfully
  const handlePhaseModalComplete = async () => {
    if (selectedPhaseAction) {
      // Mark the checklist item as complete
      const currentStatus = proposal.current_stage_checklist_status || {};
      const columnStatus = currentStatus[currentColumn?.id] || {};
      
      const updatedColumnStatus = {
        ...columnStatus,
        [selectedPhaseAction.itemId]: {
          completed: true,
          completed_by: (user?.email || "system"), // Use user.email or a default
          completed_date: new Date().toISOString()
        }
      };
      
      const updatedChecklistStatus = {
        ...currentStatus,
        [currentColumn?.id]: updatedColumnStatus
      };
      
      // Check if all required items are now complete
      const allRequiredComplete = currentColumn?.checklist_items
        ?.filter(ci => ci.required && ci.type !== 'system_check') // Only consider manual/trigger required items
        .every(ci => updatedColumnStatus[ci.id]?.completed || false);
      
      await updateProposalMutation.mutateAsync({
        current_stage_checklist_status: updatedChecklistStatus,
        action_required: !allRequiredComplete
      });
    }
    
    setShowPhaseModal(false);
    setSelectedPhaseAction(null);
  };
  
  const handleAIActionComplete = (result) => {
    // AI action completed successfully
    console.log("AI Action Result:", result);
    setShowAIModal(false);
    setSelectedAIAction(null);
    
    // Optionally mark the checklist item as complete
    // This would require knowing which item triggered it
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
  };

  // System check validation
  const systemCheckStatus = (item) => {
    switch (item.id) {
      case 'contract_value_present': // Renamed from 'contract_value' to avoid conflict if `proposal.contract_value` is used elsewhere directly for display
        return proposal.contract_value ? true : false;
      case 'due_date_present': // Renamed from 'due_date'
        return proposal.due_date ? true : false;
      case 'complete_sections':
        // This assumes 'sections' would be passed as a prop or fetched,
        // For now, let's make it always false or add a placeholder.
        // If sections are not provided, this check cannot be reliably performed.
        // Assuming 'sections' might be an array of objects on the proposal itself.
        const sections = proposal.sections || []; // Placeholder: assuming sections might be on proposal
        const totalSections = sections?.length || 0;
        const completedSections = sections?.filter(s => s.status === 'approved').length || 0;
        return totalSections > 0 && completedSections === totalSections;
      default:
        return false;
    }
  };


  return (
    <>
      {/* ChecklistSystemValidator component removed as its logic is now inline with systemCheckStatus function */}

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

                            return (
                              <Card 
                                key={item.id}
                                className={cn(
                                  "border-2 transition-all",
                                  isCompleted ? "border-green-200 bg-green-50" : "border-slate-200",
                                  item.required && !isCompleted && "border-orange-200 bg-orange-50"
                                )}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-3">
                                    {/* Checkbox for manual items */}
                                    {item.type === 'manual_check' && (
                                      <button
                                        onClick={() => handleChecklistItemToggle(item)}
                                        className="mt-1 flex-shrink-0"
                                      >
                                        {isCompleted ? (
                                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                                        ) : (
                                          <Circle className="w-6 h-6 text-slate-400 hover:text-slate-600" />
                                        )}
                                      </button>
                                    )}

                                    {/* System check indicator */}
                                    {item.type === 'system_check' && (
                                      <div className="mt-1 flex-shrink-0">
                                        {isCompleted ? (
                                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                                        ) : (
                                          <AlertCircle className="w-6 h-6 text-orange-500" />
                                        )}
                                      </div>
                                    )}

                                    {/* AI trigger indicator */}
                                    {item.type === 'ai_trigger' && (
                                      <div className="mt-1 flex-shrink-0">
                                        {isCompleted ? (
                                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                                        ) : (
                                          <Sparkles className="w-6 h-6 text-blue-500" />
                                        )}
                                      </div>
                                    )}

                                    {/* Modal trigger indicator */}
                                    {item.type === 'modal_trigger' && (
                                      <div className="mt-1 flex-shrink-0">
                                        {isCompleted ? (
                                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                                        ) : (
                                          <PlayCircle className="w-6 h-6 text-indigo-500" />
                                        )}
                                      </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                          <p className={cn(
                                            "font-medium",
                                            isCompleted ? "text-green-900" : "text-slate-900"
                                          )}>
                                            {item.label}
                                            {item.required && !isCompleted && (
                                              <Badge className="ml-2 bg-red-500 text-xs">Required</Badge>
                                            )}
                                          </p>
                                          
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

                                        {/* Action button for modal_trigger and ai_trigger items */}
                                        {!isCompleted && (item.type === 'modal_trigger' || item.type === 'ai_trigger') && (
                                          <Button
                                            onClick={() => {
                                              if (item.type === 'modal_trigger') {
                                                handleModalTriggerClick(item);
                                              } else if (item.type === 'ai_trigger') {
                                                // Handle AI trigger
                                                const phase = proposal.current_phase || 'phase1';
                                                navigate(createPageUrl("ProposalBuilder") + `?id=${proposal.id}&phase=${phase}`);
                                                onClose();
                                              }
                                            }}
                                            size="sm"
                                            className={cn(
                                              item.type === 'modal_trigger' ? "bg-indigo-600 hover:bg-indigo-700" : "bg-blue-600 hover:bg-blue-700"
                                            )}
                                          >
                                            {item.type === 'modal_trigger' ? (
                                              <>
                                                <PlayCircle className="w-4 h-4 mr-1" />
                                                Start
                                              </>
                                            ) : (
                                              <>
                                                <Sparkles className="w-4 h-4 mr-1" />
                                                Run AI
                                              </>
                                            )}
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
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Phase Modal for modal_trigger items */}
      {showPhaseModal && selectedPhaseAction && (
        <PhaseModal
          isOpen={showPhaseModal}
          onClose={() => {
            setShowPhaseModal(false);
            setSelectedPhaseAction(null);
          }}
          proposal={proposal}
          phaseId={selectedPhaseAction.phase} // Use phaseId as prop name matches PhaseModal component
          onComplete={handlePhaseModalComplete} // Changed from onSave to onComplete
          embedded={true}
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
