import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Phase6 from "../components/builder/Phase6";

export default function ContentDevelopment() {
  const navigate = useNavigate();
  const [proposalId, setProposalId] = useState(null);
  const [proposalData, setProposalData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id) {
      setProposalId(id);
      loadProposal(id);
    } else {
      // No proposal ID, redirect to Pipeline
      navigate(createPageUrl("Pipeline"));
    }
  }, [navigate]);

  const loadProposal = async (id) => {
    try {
      setLoading(true);
      const proposals = await base44.entities.Proposal.filter({ id });
      if (proposals.length > 0) {
        setProposalData(proposals[0]);
      } else {
        alert("Proposal not found");
        navigate(createPageUrl("Pipeline"));
      }
    } catch (error) {
      console.error("Error loading proposal:", error);
      alert("Error loading proposal");
      navigate(createPageUrl("Pipeline"));
    } finally {
      setLoading(false);
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
          <p className="text-slate-600 text-lg">Loading proposal content...</p>
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Content Development</h1>
          <p className="text-slate-600">
            Generate and edit proposal sections with AI assistance
          </p>
          {proposalData.proposal_name && (
            <p className="text-sm text-slate-500 mt-1">
              <strong>Proposal:</strong> {proposalData.proposal_name}
            </p>
          )}
        </div>

        {/* Phase 6 Component */}
        <Phase6
          proposalData={proposalData}
          setProposalData={setProposalData}
          proposalId={proposalId}
          onSaveAndGoToPipeline={handleSaveAndGoToPipeline}
        />
      </div>
    </div>
  );
}