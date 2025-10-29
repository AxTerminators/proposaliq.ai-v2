import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, CheckSquare, MessageCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import Phase1 from "../components/builder/Phase1";
import Phase2 from "../components/builder/Phase2";
import Phase3 from "../components/builder/Phase3";
import Phase4 from "../components/builder/Phase4";
import Phase5 from "../components/builder/Phase5";
import Phase6 from "../components/builder/Phase6";
import Phase7 from "../components/builder/Phase7";
import TaskManager from "../components/tasks/TaskManager";
import ProposalDiscussion from "../components/collaboration/ProposalDiscussion";

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
  const [currentPhase, setCurrentPhase] = useState("phase1");
  const [proposalId, setProposalId] = useState(null);
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
        navigate(createPageUrl("Proposals"));
      }
    } catch (error) {
      console.error("Error loading proposal:", error);
      navigate(createPageUrl("Proposals"));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Proposals"))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Proposals
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {proposalData.proposal_name || "New Proposal"}
          </h1>
          <p className="text-slate-600">Follow the steps to build your proposal</p>
        </div>

        <Card className="border-none shadow-xl mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Progress</CardTitle>
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

        {proposalId && (
          <Tabs defaultValue="builder" className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="builder">Proposal Builder</TabsTrigger>
              <TabsTrigger value="tasks">
                <CheckSquare className="w-4 h-4 mr-2" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="discussions">
                <MessageCircle className="w-4 h-4 mr-2" />
                Discussions
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
                  <Phase6 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} />
                )}
                {currentPhase === "phase7" && (
                  <Phase7 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} />
                )}
              </div>

              {currentPhase !== "phase7" && (
                <div className="flex justify-between">
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
          </Tabs>
        )}

        {!proposalId && (
          <>
            <div className="mb-6">
              {currentPhase === "phase1" && (
                <Phase1 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} />
              )}
            </div>

            {currentPhase !== "phase7" && (
              <div className="flex justify-between">
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
    </div>
  );
}