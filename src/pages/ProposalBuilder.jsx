import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, CheckSquare, MessageCircle, Paperclip, Zap, Trash2, AlertTriangle, Users } from "lucide-react";
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

import Phase1 from "../components/builder/Phase1";
import Phase2 from "../components/builder/Phase2";
import Phase3 from "../components/builder/Phase3";
import Phase4 from "../components/builder/Phase4";
import Phase5 from "../components/builder/Phase5";
import Phase6 from "../components/builder/Phase6";
import Phase7 from "../components/builder/Phase7";
import TaskManager from "../components/tasks/TaskManager";
import ProposalDiscussion from "../components/collaboration/ProposalDiscussion";
import ProposalFiles from "../components/collaboration/ProposalFiles";
import AutomationHub from "../components/workflows/AutomationHub";
import FloatingChatButton from "../components/collaboration/FloatingChatButton";
import ClientSharingPanel from "../components/builder/ClientSharingPanel";

const PHASES = [
  { id: "phase1", label: "Prime Contractor" },
  { id: "phase2", label: "Referenced Docs" },
  { id: "phase3", label: "Solicitation Details" },
  { id: "phase4", label: "Evaluator" },
  { id: "phase5", label: "Strategy" },
  { id: "phase6", label: "Proposal Writer" },
  { id: "phase7", label: "Finalize" }
];

export default function ProposalBuilder() {
  const navigate = useNavigate();
  const [organization, setOrganization] = React.useState(null);
  const [user, setUser] = React.useState(null);
  const [subscription, setSubscription] = React.useState(null);
  const [currentPhase, setCurrentPhase] = useState("phase1");
  const [proposalId, setProposalId] = useState(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [proposalData, setProposalData] = useState({
    proposal_name: "",
    prime_contractor_id: "",
    prime_contractor_name: "",
    project_type: "RFP",
    solicitation_number: "",
    agency_name: "",
    project_title: "",
    due_date: "",
    teaming_partner_ids: [],
    status: "evaluating"
  });

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
          
          // Load subscription to check features
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
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id && organization?.id) {
      loadProposal(id);
    }
  }, [organization?.id]);

  const loadProposal = async (id) => {
    try {
      const proposals = await base44.entities.Proposal.filter({ 
        id,
        organization_id: organization.id 
      }, '-created_date', 1);
      
      if (proposals.length > 0) {
        const proposal = proposals[0];
        setProposalId(id);
        setProposalData(proposal);
        setCurrentPhase(proposal.current_phase || "phase1");
      } else {
        alert("Proposal not found or you don't have access to it.");
        navigate(createPageUrl("Pipeline"));
      }
    } catch (error) {
      console.error("Error loading proposal:", error);
      navigate(createPageUrl("Pipeline"));
    }
  };

  const saveProposal = async () => {
    if (!organization?.id) {
      alert("No organization found. Please complete onboarding first.");
      return;
    }

    try {
      if (proposalId) {
        const existing = await base44.entities.Proposal.filter({
          id: proposalId,
          organization_id: organization.id
        });
        
        if (existing.length === 0) {
          alert("You don't have permission to edit this proposal.");
          return;
        }

        await base44.entities.Proposal.update(proposalId, {
          ...proposalData,
          current_phase: currentPhase
        });
      } else {
        const created = await base44.entities.Proposal.create({
          ...proposalData,
          organization_id: organization.id,
          current_phase: currentPhase,
          status: "evaluating"
        });
        setProposalId(created.id);
        return created.id;
      }
      return proposalId;
    } catch (error) {
      console.error("Error saving proposal:", error);
    }
  };

  const handleDeleteProposal = async () => {
    if (!proposalId) return;
    
    setIsDeleting(true);
    try {
      await base44.entities.Proposal.delete(proposalId);
      navigate(createPageUrl("Pipeline"));
    } catch (error) {
      console.error("Error deleting proposal:", error);
      alert("Error deleting proposal. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleNext = async () => {
    const savedId = await saveProposal();
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

  // Check if client portal features are available
  const hasClientPortal = subscription?.features_enabled?.client_portal === true;

  // Guard clause - ensure all data is loaded before rendering tabs
  const isDataLoaded = proposalId && user && organization;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 pb-32">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl("Pipeline"))}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pipeline
            </Button>
            
            {proposalId && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteWarning(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Proposal
              </Button>
            )}
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {proposalData.proposal_name || "New Proposal"}
          </h1>
          <p className="text-slate-600">Follow the steps to build your proposal</p>
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

        {isDataLoaded ? (
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
              <div className="mb-6">
                {currentPhase === "phase1" && (
                  <Phase1 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} />
                )}
                {currentPhase === "phase2" && (
                  <Phase2 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} />
                )}
                {currentPhase === "phase3" && (
                  <Phase3 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} />
                )}
                {currentPhase === "phase4" && (
                  <Phase4 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} />
                )}
                {currentPhase === "phase5" && (
                  <Phase5 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} />
                )}
                {currentPhase === "phase6" && (
                  <Phase6 
                    proposalData={proposalData} 
                    setProposalData={setProposalData} 
                    proposalId={proposalId}
                    onNavigateToPhase={(phaseId) => setCurrentPhase(phaseId)}
                  />
                )}
                {currentPhase === "phase7" && (
                  <Phase7 
                    proposal={{ id: proposalId, ...proposalData }}
                    user={user}
                    organization={organization}
                    teamMembers={[]}
                  />
                )}
              </div>

              {currentPhase !== "phase7" && (
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
                    onClick={handleNext}
                    disabled={currentPhaseIndex === PHASES.length - 1}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </TabsContent>

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
          </Tabs>
        ) : (
          <>
            <div className="mb-6">
              {currentPhase === "phase1" && (
                <Phase1 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} />
              )}
            </div>

            {currentPhase !== "phase7" && (
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
                  onClick={handleNext}
                  disabled={currentPhaseIndex === PHASES.length - 1}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating AI Chat Button - Now Draggable */}
      {proposalId && <FloatingChatButton proposalId={proposalId} />}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
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
    </div>
  );
}