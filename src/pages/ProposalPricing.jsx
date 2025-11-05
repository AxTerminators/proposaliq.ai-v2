import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Phase7Pricing from "../components/builder/Phase7Pricing";

export default function ProposalPricing() {
  const navigate = useNavigate();
  const [proposalId, setProposalId] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProposal = async () => {
      try {
        // Get proposalId from URL
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('proposalId');
        
        if (!id) {
          setError("No proposal ID provided");
          setIsLoading(false);
          return;
        }

        setProposalId(id);

        // Load proposal data
        const proposals = await base44.entities.Proposal.filter({ id });
        
        if (proposals.length === 0) {
          setError("Proposal not found");
          setIsLoading(false);
          return;
        }

        setProposal(proposals[0]);
        setIsLoading(false);
      } catch (err) {
        console.error("Error loading proposal:", err);
        setError("Failed to load proposal");
        setIsLoading(false);
      }
    };

    loadProposal();
  }, []);

  const handleBackToKanban = () => {
    navigate(createPageUrl("Pipeline"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading pricing workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBackToKanban}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pipeline
          </Button>
          
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-900">
              {error || "Proposal not found"}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleBackToKanban}
              className="hover:bg-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pipeline
            </Button>
            <div className="border-l border-slate-300 pl-4">
              <h1 className="text-2xl font-bold text-slate-900">
                {proposal.proposal_name}
              </h1>
              <p className="text-sm text-slate-600">
                {proposal.agency_name} • {proposal.solicitation_number}
              </p>
            </div>
          </div>
        </div>

        {/* Phase7Pricing Content */}
        <Phase7Pricing
          proposalData={proposal}
          setProposalData={setProposal}
          proposalId={proposalId}
          onSaveAndGoToPipeline={handleBackToKanban}
        />
      </div>
    </div>
  );
}