import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, CheckSquare, MessageCircle, Paperclip, Zap, Trash2, AlertTriangle, Users, MessageSquare, Shield } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

// Lazy load heavy phase components
const Phase1 = React.lazy(() => import("../components/builder/Phase1"));
const Phase2 = React.lazy(() => import("../components/builder/Phase2"));
const Phase3 = React.lazy(() => import("../components/builder/Phase3"));
const Phase4 = React.lazy(() => import("../components/builder/Phase4"));
const Phase5 = React.lazy(() => import("../components/builder/Phase5"));
const Phase6 = React.lazy(() => import("../components/builder/Phase6"));
const Phase7 = React.lazy(() => import("../components/builder/Phase7"));
const Phase7Pricing = React.lazy(() => import("../components/builder/Phase7Pricing"));
const TaskManager = React.lazy(() => import("../components/tasks/TaskManager"));
const ProposalDiscussion = React.lazy(() => import("../components/collaboration/ProposalDiscussion"));
const ProposalFiles = React.lazy(() => import("../components/collaboration/ProposalFiles"));
const AutomationHub = React.lazy(() => import("../components/workflows/AutomationHub"));
const ClientSharingPanel = React.lazy(() => import("../components/builder/ClientSharingPanel"));
const ProposalAssistant = React.lazy(() => import("../components/assistant/ProposalAssistant"));

// Keep these non-lazy as they're small
import FloatingChatButton from "../components/collaboration/FloatingChatButton";
import SampleDataGuard from "../components/ui/SampleDataGuard";
import UniversalAlert from "../components/ui/UniversalAlert";
import LoadingState from "../components/ui/LoadingState";

const PHASES = [
  { id: "phase1", label: "Prime Contractor" },
  { id: "phase2", label: "Referenced Docs" },
  { id: "phase3", label: "Solicitation Details" },
  { id: "phase4", label: "Evaluator" },
  { id: "phase5", label: "Strategy" },
  { id: "phase6", label: "Proposal Writer" },
  { id: "phase7", label: "Pricing & Cost Build" },
  { id: "phase8", label: "Finalize" }
];

const getKanbanStatusFromPhase = (phaseId) => {
  switch (phaseId) {
    case "phase1":
    case "phase2":
    case "phase3":
    case "phase4":
      return "evaluating";
    case "phase5":
    case "phase6":
      return "draft";
    case "phase7":
      return "in_progress";
    case "phase8":
      return "in_progress";
    default:
      return "evaluating";
  }
};

export default function ProposalBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [subscription, setSubscription] = useState(null);
  
  const [currentPhase, setCurrentPhase] = useState("phase1");
  const [proposalId, setProposalId] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantMinimized, setAssistantMinimized] = useState(false);
  const [showSampleDataGuard, setShowSampleDataGuard] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "info",
    title: "",
    description: ""
  });
  
  const urlParams = new URLSearchParams(window.location.search);
  const proposalIdFromUrl = urlParams.get("id");
  const boardTypeFromUrl = urlParams.get("boardType");

  const [proposalData, setProposalData] = useState({
    proposal_name: "",
    organization_id: "",
    prime_contractor_id: "",
    prime_contractor_name: "",
    project_type: "",
    solicitation_number: "",
    agency_name: "",
    project_title: "",
    due_date: "",
    contract_value: "",
    teaming_partner_ids: [],
    current_phase: "phase1",
    status: "evaluating",
    proposal_type_category: boardTypeFromUrl || "",
  });

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Pipeline"));
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        navigate(createPageUrl("Pipeline"));
      }
    };
    checkAccess();
  }, [navigate]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
          
          const subs = await base44.entities.Subscription.filter(
            { organization_id: orgs[0].id },
            '-created_date',
            1
          );
          if (subs.length > 0) {
            setSubscription(subs[0]);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const phaseParam = urlParams.get('phase');
    
    if (proposalIdFromUrl && organization?.id) {
      loadProposal(proposalIdFromUrl, phaseParam);
    } else if (phaseParam) {
      setCurrentPhase(phaseParam);
    }
  }, [organization?.id, proposalIdFromUrl]);

  useEffect(() => {
    if (!proposalIdFromUrl && user?.using_sample_data === true) {
      setShowSampleDataGuard(true);
    }
  }, [user, proposalIdFromUrl]);

  useEffect(() => {
    if (!proposalId || !organization?.id) return;
    
    const autoSaveInterval = setInterval(async () => {
      if (proposalData.proposal_name) {
        await saveProposal();
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, [proposalId, proposalData, organization?.id]);

  useEffect(() => {
    const ensureProposalSaved = async () => {
      if (!proposalId && proposalData.proposal_name && organization?.id) {
        console.log("Auto-saving proposal on phase navigation...");
        const savedId = await saveProposal();
        if (savedId) {
          console.log("Proposal auto-saved with ID:", savedId);
        }
      }
    };

    if (organization?.id) {
      ensureProposalSaved();
    }
  }, [currentPhase, organization?.id, proposalId]);

  const proceedWithNewProposal = () => {
    setShowSampleDataGuard(false);
  };

  const loadProposal = async (id, phaseFromUrl) => {
    try {
      const proposals = await base44.entities.Proposal.filter({ 
        id,
        organization_id: organization.id 
      }, '-created_date', 1);
      
      if (proposals.length > 0) {
        const proposal = proposals[0];
        setProposalId(id);
        setProposalData(proposal);
        
        if (phaseFromUrl && PHASES.some(p => p.id === phaseFromUrl)) {
          setCurrentPhase(phaseFromUrl);
        } else if (proposal.current_phase) {
          setCurrentPhase(proposal.current_phase);
        } else {
          setCurrentPhase("phase1");
        }
      } else {
        setAlertConfig({
          type: "error",
          title: "Proposal Not Found",
          description: "Proposal not found or you don't have access to it."
        });
        setShowAlert(true);
        navigate(createPageUrl("Pipeline"));
      }
    } catch (error) {
      console.error("Error loading proposal:", error);
      navigate(createPageUrl("Pipeline"));
    }
  };

  const saveProposal = async () => {
    if (!organization?.id) {
      console.error("No organization found");
      setSaveError("No organization found.");
      return null;
    }

    if (!proposalData.proposal_name?.trim()) {
      setSaveError("Proposal name is required.");
      return null;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      if (proposalId) {
        const existing = await base44.entities.Proposal.filter({
          id: proposalId,
          organization_id: organization.id
        });
        
        if (existing.length === 0) {
          console.error("Proposal not found or no access");
          setIsSaving(false);
          setSaveError("Proposal not found or no access.");
          return null;
        }

        const currentProposal = existing[0];
        const derivedPhaseStatus = getKanbanStatusFromPhase(currentPhase);
        
        let statusToSave;
        if (currentProposal.status === "submitted") {
          statusToSave = "submitted";
        } else if (currentProposal.status !== derivedPhaseStatus && currentProposal.status !== "") {
          statusToSave = currentProposal.status;
        } else {
          statusToSave = derivedPhaseStatus;
        }

        await base44.entities.Proposal.update(proposalId, {
          ...proposalData,
          current_phase: currentPhase,
          status: statusToSave
        });
        
        setLastSaved(new Date());
        setIsSaving(false);
        setHasUnsavedChanges(false);
        queryClient.invalidateQueries(['proposal', proposalId]);
        return proposalId;
      } else {
        const initialStatus = getKanbanStatusFromPhase(currentPhase);
        const created = await base44.entities.Proposal.create({
          ...proposalData,
          organization_id: organization.id,
          current_phase: currentPhase,
          status: initialStatus
        });
        setProposalId(created.id);
        setLastSaved(new Date());
        setIsSaving(false);
        setHasUnsavedChanges(false);
        queryClient.invalidateQueries(['proposals']);
        
        window.history.replaceState(null, '', `${createPageUrl("ProposalBuilder")}?id=${created.id}&phase=${currentPhase}`);
        
        return created.id;
      }
    } catch (error) {
      console.error("Error saving proposal:", error);
      setAlertConfig({
        type: "error",
        title: "Save Failed",
        description: "Unable to save proposal. Please try again or contact support."
      });
      setShowAlert(true);
      setSaveError("An error occurred during save.");
      setIsSaving(false);
      return null;
    }
  };

  const markAsSubmitted = async () => {
    if (!proposalId || !organization?.id) return;
    
    try {
      await base44.entities.Proposal.update(proposalId, {
        status: "submitted"
      });
      
      setProposalData(prev => ({ ...prev, status: "submitted" }));
      queryClient.invalidateQueries(['proposal', proposalId]);
    } catch (error) {
      console.error("Error marking proposal as submitted:", error);
    }
  };

  const handleSaveAndGoToPipeline = async () => {
    await saveProposal();
    navigate(createPageUrl("Pipeline"));
  };

  const handleDeleteProposal = async () => {
    if (!proposalId) return;
    
    setIsDeleting(true);
    try {
      await base44.entities.Proposal.delete(proposalId);
      queryClient.invalidateQueries(['proposals']);
      navigate(createPageUrl("Pipeline"));
    } catch (error) {
      console.error("Error deleting proposal:", error);
      setAlertConfig({
        type: "error",
        title: "Delete Failed",
        description: "Unable to delete proposal. Please try again."
      });
      setShowAlert(true);
      setIsDeleting(false);
    }
  };

  const handleNext = async () => {
    if (!proposalData.proposal_name?.trim()) {
      setAlertConfig({
        type: "warning",
        title: "Proposal Name Required",
        description: "Please enter a Proposal Name before continuing."
      });
      setShowAlert(true);
      return;
    }

    const savedId = await saveProposal();
    
    if (!savedId && !proposalId) {
      setAlertConfig({
        type: "error",
        title: "Save Failed",
        description: "Unable to save proposal. Please try again."
      });
      setShowAlert(true);
      return;
    }
    
    if (!proposalId && savedId) {
      setProposalId(savedId);
    }
    
    const currentIndex = PHASES.findIndex(p => p.id === currentPhase);
    if (currentIndex < PHASES.length - 1) {
      setCurrentPhase(PHASES[currentIndex + 1].id);
    }
  };

  const handlePrevious = async () => {
    await saveProposal();
    const currentIndex = PHASES.findIndex(p => p.id === currentPhase);
    if (currentIndex > 0) {
      setCurrentPhase(PHASES[currentIndex - 1].id);
    }
  };

  const currentPhaseIndex = PHASES.findIndex(p => p.id === currentPhase);
  const progress = ((currentPhaseIndex + 1) / PHASES.length) * 100;

  const hasClientPortal = subscription?.features_enabled?.client_portal === true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 pb-32">
      <div className={`max-w-7xl mx-auto transition-all duration-300 ${showAssistant && !assistantMinimized ? 'mr-96' : ''}`}>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate(createPageUrl("Pipeline"))}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Proposal Board
              </Button>
              
              <Badge className="bg-red-100 text-red-700">
                <Shield className="w-4 h-4 mr-1" />
                Admin Only - Legacy Builder
              </Badge>
            </div>
            
            <div className="flex gap-2">
              {proposalId && !showAssistant && (
                <Button
                  variant="outline"
                  onClick={() => setShowAssistant(true)}
                  className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  AI Assistant
                </Button>
              )}
              
              {proposalId && (
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Proposal
                </Button>
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {proposalData.proposal_name || "New Proposal"}
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-slate-600">Follow the steps to build your proposal</p>
            {isSaving && (
              <span className="text-sm text-blue-600 flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Saving...
              </span>
            )}
            {!isSaving && lastSaved && (
              <span className="text-sm text-green-600">
                ✓ Last saved {new Date(lastSaved).toLocaleTimeString()}
              </span>
            )}
            {saveError && (
              <span className="text-sm text-red-600">
                <AlertTriangle className="w-4 h-4 inline-block mr-1" />
                Error: {saveError}
              </span>
            )}
          </div>
        </div>

        <Card className="border-none shadow-xl mb-6">
          <CardHeader>
            <div className="text-lg font-semibold mb-2">Progress</div>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-3 mb-4" />
            <div className="flex justify-between overflow-x-auto pb-2 gap-2">
              {PHASES.map((phase, index) => (
                <div
                  key={phase.id}
                  className={`flex flex-col items-center gap-2 cursor-pointer min-w-fit px-2 ${
                    index <= currentPhaseIndex ? "text-blue-600" : "text-slate-400"
                  }`}
                  onClick={() => setCurrentPhase(phase.id)}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index < currentPhaseIndex
                        ? "bg-blue-600 text-white"
                        : index === currentPhaseIndex
                        ? "bg-blue-100 text-blue-600 border-2 border-blue-600"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {index < currentPhaseIndex ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className="text-xs font-medium text-center whitespace-nowrap">{phase.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* REMOVED isDataLoaded condition - now always shows tabs */}
        <Tabs defaultValue="builder" className="mb-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="builder">Builder</TabsTrigger>
            {hasClientPortal && (
              <TabsTrigger value="client-sharing">
                <Users className="w-4 h-4 mr-2" />
                Client Sharing
              </TabsTrigger>
            )}
            <TabsTrigger value="tasks">
              <CheckSquare className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="discussions">
              <MessageCircle className="w-4 h-4 mr-2" />
              Discussions
            </TabsTrigger>
            <TabsTrigger value="files">
              <Paperclip className="w-4 h-4 mr-2" />
              Files
            </TabsTrigger>
            <TabsTrigger value="automation">
              <Zap className="w-4 h-4 mr-2" />
              Automation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-6">
            <React.Suspense fallback={<LoadingState message="Loading phase..." />}>
              <div className="mb-6">
                {currentPhase === "phase1" && (
                  <Phase1 
                    proposalData={proposalData} 
                    setProposalData={setProposalData} 
                    proposalId={proposalId}
                    onSaveAndGoToPipeline={handleSaveAndGoToPipeline}
                  />
                )}
                {currentPhase === "phase2" && (
                  <Phase2 
                    proposalData={proposalData} 
                    setProposalData={setProposalData} 
                    proposalId={proposalId}
                    onSaveAndGoToPipeline={handleSaveAndGoToPipeline}
                  />
                )}
                {currentPhase === "phase3" && (
                  <Phase3 
                    proposalData={proposalData} 
                    setProposalData={setProposalData} 
                    proposalId={proposalId}
                    onSaveAndGoToPipeline={handleSaveAndGoToPipeline}
                  />
                )}
                {currentPhase === "phase4" && (
                  <Phase4 
                    proposalData={proposalData} 
                    setProposalData={setProposalData} 
                    proposalId={proposalId}
                    onSaveAndGoToPipeline={handleSaveAndGoToPipeline}
                  />
                )}
                {currentPhase === "phase5" && (
                  <Phase5 
                    proposalData={proposalData} 
                    setProposalData={setProposalData} 
                    proposalId={proposalId}
                    onSaveAndGoToPipeline={handleSaveAndGoToPipeline}
                  />
                )}
                {currentPhase === "phase6" && (
                  <Phase6 
                    proposalData={proposalData} 
                    setProposalData={setProposalData} 
                    proposalId={proposalId}
                    onNavigateToPhase={(phaseId) => setCurrentPhase(phaseId)}
                    onSaveAndGoToPipeline={handleSaveAndGoToPipeline}
                  />
                )}
                {currentPhase === "phase7" && (
                  <Phase7Pricing 
                    proposalData={proposalData} 
                    setProposalData={setProposalData} 
                    proposalId={proposalId}
                    onSaveAndGoToPipeline={handleSaveAndGoToPipeline}
                  />
                )}
                {currentPhase === "phase8" && (
                  <Phase7
                    proposal={{ id: proposalId, ...proposalData }}
                    user={user}
                    organization={organization}
                    teamMembers={[]}
                    onMarkAsSubmitted={markAsSubmitted}
                    onSaveAndGoToPipeline={handleSaveAndGoToPipeline}
                  />
                )}
              </div>
            </React.Suspense>

            {currentPhaseIndex !== PHASES.length - 1 && (
              <div className="flex justify-between max-w-4xl">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentPhaseIndex === 0}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveAndGoToPipeline}
                  className="bg-white hover:bg-slate-50"
                >
                  Save and Go to Pipeline
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={currentPhaseIndex === PHASES.length - 1}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {currentPhaseIndex === PHASES.length - 1 && (
              <div className="flex justify-end max-w-4xl">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentPhaseIndex === 0}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSaveAndGoToPipeline}
                  className="ml-auto bg-white hover:bg-slate-50"
                >
                  Save and Go to Pipeline
                </Button>
              </div>
            )}
          </TabsContent>

          <React.Suspense fallback={<LoadingState message="Loading..." />}>
            {hasClientPortal && (
              <TabsContent value="client-sharing">
                <ClientSharingPanel 
                  proposal={{ id: proposalId, ...proposalData }}
                  organization={organization}
                />
              </TabsContent>
            )}

            <TabsContent value="tasks">
              <TaskManager 
                proposal={{ id: proposalId, ...proposalData }}
                user={user}
                organization={organization}
              />
            </TabsContent>

            <TabsContent value="discussions">
              <ProposalDiscussion
                proposal={{ id: proposalId, ...proposalData }}
                user={user}
                organization={organization}
              />
            </TabsContent>

            <TabsContent value="files">
              <ProposalFiles
                proposal={{ id: proposalId, ...proposalData }}
                user={user}
                organization={organization}
              />
            </TabsContent>

            <TabsContent value="automation">
              <AutomationHub
                proposal={{ id: proposalId, ...proposalData }}
                organization={organization}
                user={user}
              />
            </TabsContent>
          </React.Suspense>
        </Tabs>
      </div>

      {showAssistant && proposalId && (
        <React.Suspense fallback={null}>
          <ProposalAssistant
            proposal={{ id: proposalId, ...proposalData }}
            currentPhase={currentPhase}
            onClose={() => {
              setShowAssistant(false);
              setAssistantMinimized(false);
            }}
            isMinimized={assistantMinimized}
            onToggleMinimize={() => setAssistantMinimized(!assistantMinimized)}
          />
        </React.Suspense>
      )}

      {proposalId && <FloatingChatButton proposalId={proposalId} />}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Permanently Delete This Proposal?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p className="font-medium text-slate-900 text-base">
                You are about to permanently delete: <span className="font-bold text-red-600">{proposalData.proposal_name}</span>
              </p>
              
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-900 font-bold text-base mb-3">⚠️ WARNING: This action CANNOT be undone!</p>
                <p className="text-red-800 font-medium mb-2">All associated data will be permanently destroyed:</p>
                <ul className="list-disc pl-5 space-y-1.5 text-red-800">
                  <li>All proposal sections and written content</li>
                  <li>Comments, discussions, and collaboration history</li>
                  <li>Tasks and assignments</li>
                  <li>Uploaded solicitation documents and files</li>
                  <li>AI evaluation and confidence scoring data</li>
                  <li>Win themes and competitive strategies</li>
                  <li>Compliance requirements and tracking</li>
                  <li>Pricing strategies and cost data</li>
                  <li>Review rounds and feedback</li>
                </ul>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
                <p className="text-amber-900 font-semibold text-base flex items-start gap-2">
                  <span>💡</span>
                  <span>
                    <strong>Alternative:</strong> Consider moving this proposal to "Archived" status instead. 
                    This preserves all data while removing it from active view, allowing you to reference it later if needed.
                  </span>
                </p>
              </div>

              <p className="text-slate-700 font-medium text-base">
                Are you absolutely sure you want to proceed with permanent deletion?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProposal}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Yes, Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UniversalAlert
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        type={alertConfig.type}
        title={alertConfig.title}
        description={alertConfig.description}
      />

      <SampleDataGuard
        isOpen={showSampleDataGuard}
        onClose={() => {
          setShowSampleDataGuard(false);
          if (user?.using_sample_data === true && !proposalIdFromUrl) {
            navigate(createPageUrl("Pipeline"));
          }
        }}
        onProceed={proceedWithNewProposal}
      />
    </div>
  );
}