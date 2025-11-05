import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Phase7 from "../components/builder/Phase7";

export default function FinalReview() {
  const navigate = useNavigate();
  const [proposalId, setProposalId] = useState(null);
  const [proposalData, setProposalData] = useState({});
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id) {
      setProposalId(id);
      loadData(id);
    } else {
      // No proposal ID, redirect to Pipeline
      navigate(createPageUrl("Pipeline"));
    }
  }, [navigate]);

  const loadData = async (id) => {
    try {
      setLoading(true);

      // Load user
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load organization
      const orgs = await base44.entities.Organization.filter(
        { created_by: currentUser.email },
        '-created_date',
        1
      );
      if (orgs.length > 0) {
        setOrganization(orgs[0]);

        // Load team members
        const allUsers = await base44.entities.User.list();
        const members = allUsers.filter(u => {
          const accesses = u.client_accesses || [];
          return accesses.some(a => a.organization_id === orgs[0].id);
        });
        setTeamMembers(members);
      }

      // Load proposal
      const proposals = await base44.entities.Proposal.filter({ id });
      if (proposals.length > 0) {
        setProposalData(proposals[0]);
      } else {
        alert("Proposal not found");
        navigate(createPageUrl("Pipeline"));
      }
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Error loading data");
      navigate(createPageUrl("Pipeline"));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsSubmitted = async () => {
    try {
      await base44.entities.Proposal.update(proposalId, {
        status: 'submitted',
        custom_workflow_stage_id: null // Remove from custom column if in one
      });

      alert("✓ Proposal marked as submitted!");
      navigate(createPageUrl("Pipeline"));
    } catch (error) {
      console.error("Error marking as submitted:", error);
      alert("Error marking as submitted. Please try again.");
    }
  };

  const handleSaveAndGoToPipeline = () => {
    navigate(createPageUrl("Pipeline"));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading review data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={handleSaveAndGoToPipeline}
          className="mb-4 hover:bg-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Pipeline
        </Button>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Final Review & Submission</h1>
          <p className="text-slate-600">
            Complete final checks, reviews, and submit your proposal
          </p>
          {proposalData.proposal_name && (
            <p className="text-sm text-slate-500 mt-1">
              <strong>Proposal:</strong> {proposalData.proposal_name}
            </p>
          )}
        </div>

        {/* Phase 7 Component */}
        <Phase7
          proposal={proposalData}
          user={user}
          organization={organization}
          teamMembers={teamMembers}
          onMarkAsSubmitted={handleMarkAsSubmitted}
          onSaveAndGoToPipeline={handleSaveAndGoToPipeline}
        />
      </div>
    </div>
  );
}