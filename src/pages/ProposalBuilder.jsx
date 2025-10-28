import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl, hasPermission, logActivity } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Check, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import Phase1 from "../components/builder/Phase1";
import Phase2 from "../components/builder/Phase2";
import Phase3 from "../components/builder/Phase3";
import Phase4 from "../components/builder/Phase4";
import Phase5 from "../components/builder/Phase5";
import Phase6 from "../components/builder/Phase6";
import Phase7 from "../components/builder/Phase7";

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
    status: "draft"
  });
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [user, setUser] = useState(null);
  const [isNewProposal, setIsNewProposal] = useState(true);

  // SECURITY: Load current user's organization and check permissions
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id && currentOrgId && user) {
      setIsNewProposal(false);
      loadProposal(id);
    }
  }, [currentOrgId, user]);

  const loadProposal = async (id) => {
    try {
      // SECURITY FIX: Verify the proposal belongs to the current organization
      const proposals = await base44.entities.Proposal.filter({ 
        id,
        organization_id: currentOrgId 
      }, '-created_date', 1);
      
      if (proposals.length > 0) {
        const proposal = proposals[0];
        setProposalId(id);
        setProposalData(proposal);
        setCurrentPhase(proposal.current_phase || "phase1");
        
        // Log activity
        await logActivity({
          user,
          organizationId: currentOrgId,
          actionType: "view",
          resourceType: "proposal",
          resourceId: id,
          resourceName: proposal.proposal_name,
          details: `Opened proposal in builder: ${proposal.proposal_name}`
        });
      } else {
        // Proposal not found or doesn't belong to this organization
        alert("Proposal not found or you don't have access to it.");
        navigate(createPageUrl("Proposals"));
      }
    } catch (error) {
      console.error("Error loading proposal:", error);
      navigate(createPageUrl("Proposals"));
    }
  };

  const saveProposal = async () => {
    if (!currentOrgId) {
      alert("Organization not found. Please complete onboarding first.");
      return;
    }

    // Check permissions for new proposals
    if (!proposalId && !hasPermission(user, 'can_create_proposals')) {
      alert("You don't have permission to create proposals.");
      navigate(createPageUrl("Proposals"));
      return;
    }

    try {
      if (proposalId) {
        // SECURITY: Verify ownership before update
        const existing = await base44.entities.Proposal.filter({
          id: proposalId,
          organization_id: currentOrgId
        });
        
        if (existing.length === 0) {
          alert("You don't have permission to edit this proposal.");
          return;
        }

        await base44.entities.Proposal.update(proposalId, {
          ...proposalData,
          current_phase: currentPhase
        });
        
        // Log activity
        await logActivity({
          user,
          organizationId: currentOrgId,
          actionType: "edit",
          resourceType: "proposal",
          resourceId: proposalId,
          resourceName: proposalData.proposal_name,
          details: `Updated proposal at ${currentPhase}`
        });
      } else {
        // SECURITY: Always include organization_id when creating
        const created = await base44.entities.Proposal.create({
          ...proposalData,
          organization_id: currentOrgId,
          current_phase: currentPhase
        });
        setProposalId(created.id);
        
        // Log activity
        await logActivity({
          user,
          organizationId: currentOrgId,
          actionType: "create",
          resourceType: "proposal",
          resourceId: created.id,
          resourceName: proposalData.proposal_name,
          details: `Created new proposal: ${proposalData.proposal_name}`
        });
        
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

  // Check if user can create proposals
  const canCreate = user && hasPermission(user, 'can_create_proposals');
  
  if (isNewProposal && !canCreate && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Denied</h2>
              <p className="text-slate-600 mb-6">
                Your role ({user.user_role || 'viewer'}) does not allow creating new proposals.
              </p>
              <Button onClick={() => navigate(createPageUrl("Proposals"))}>
                Back to Proposals
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

        <div className="mb-6">
          {currentPhase === "phase1" && (
            <Phase1 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} user={user} />
          )}
          {currentPhase === "phase2" && (
            <Phase2 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} user={user} />
          )}
          {currentPhase === "phase3" && (
            <Phase3 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} user={user} />
          )}
          {currentPhase === "phase4" && (
            <Phase4 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} user={user} />
          )}
          {currentPhase === "phase5" && (
            <Phase5 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} user={user} />
          )}
          {currentPhase === "phase6" && (
            <Phase6 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} user={user} />
          )}
          {currentPhase === "phase7" && (
            <Phase7 proposalData={proposalData} setProposalData={setProposalData} proposalId={proposalId} user={user} />
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
      </div>
    </div>
  );
}