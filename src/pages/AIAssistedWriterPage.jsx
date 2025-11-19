import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOrganization } from "@/components/layout/OrganizationContext";
import { createPageUrl } from "@/utils";
import Phase6 from "@/components/builder/Phase6";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";

/**
 * AIAssistedWriterPage - Safe wrapper for Phase6
 * 
 * This page:
 * - Extracts proposalId from URL
 * - Fetches proposal with proper loading/error states
 * - Uses OrganizationContext to get organization
 * - Passes organization as prop to Phase6 (avoiding org fetch issues)
 * - Provides safe navigation back to Pipeline
 */
export default function AIAssistedWriterPage() {
  const navigate = useNavigate();
  const { organization, user, loading: orgLoading } = useOrganization();
  
  // Extract proposalId from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const proposalId = urlParams.get('proposalId');

  // Fetch proposal data with error handling
  const { 
    data: proposal, 
    isLoading: proposalLoading, 
    error: proposalError 
  } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: async () => {
      if (!proposalId) throw new Error('No proposal ID provided');
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      if (!proposals || proposals.length === 0) {
        throw new Error('Proposal not found');
      }
      return proposals[0];
    },
    enabled: !!proposalId,
    retry: 1
  });

  // Handle navigation back to Pipeline
  const handleGoToPipeline = () => {
    navigate(createPageUrl("Pipeline"));
  };

  // Show loading state
  if (orgLoading || proposalLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="border-none shadow-xl max-w-md w-full">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
            <p className="text-slate-600 text-lg">Loading AI Writer...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (!proposalId || proposalError || !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="border-none shadow-xl max-w-md w-full">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Proposal</h2>
            <p className="text-slate-600 mb-6">
              {proposalError?.message || 'Proposal not found or invalid ID'}
            </p>
            <Button onClick={handleGoToPipeline} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pipeline
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if no organization
  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Card className="border-none shadow-xl max-w-md w-full">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Organization Found</h2>
            <p className="text-slate-600 mb-6">
              Unable to load your organization. Please try logging out and back in.
            </p>
            <Button onClick={handleGoToPipeline} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pipeline
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Phase6 with safe props
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleGoToPipeline}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pipeline
          </Button>
        </div>

        {/* Phase6 Component with safe props */}
        <Phase6
          proposalData={proposal}
          setProposalData={() => {}} // No-op for now, Phase6 saves directly
          proposalId={proposalId}
          organization={organization} // Pass organization object to avoid fetch issues
          onSaveAndGoToPipeline={handleGoToPipeline}
        />
      </div>
    </div>
  );
}