import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useOrganization } from "@/components/layout/OrganizationContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createPageUrl } from "@/utils";
import Phase5 from "@/components/builder/Phase5";

export default function ProposalStrategyConfigPage() {
  const { currentOrganization } = useOrganization();
  
  // Get proposalId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const proposalId = urlParams.get('proposalId');

  // Fetch proposal data
  const { data: proposal, isLoading, error } = useQuery({
    queryKey: ['proposal', proposalId],
    queryFn: async () => {
      if (!proposalId) throw new Error('No proposal ID provided');
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      if (proposals.length === 0) throw new Error('Proposal not found');
      return proposals[0];
    },
    enabled: !!proposalId,
    retry: 1
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-indigo-600 animate-spin" />
            <p className="text-slate-600">Loading strategy configuration...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !proposal || !proposalId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <Alert className="bg-red-50 border-red-200 mb-6">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <AlertDescription className="text-red-800">
                {error?.message || 'Proposal not found or invalid proposal ID'}
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <Button
                onClick={() => window.location.href = createPageUrl('Pipeline')}
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Pipeline
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No organization
  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Organization context not available. Please refresh the page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSaveAndReturn = () => {
    window.location.href = createPageUrl('Pipeline');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navigation Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleSaveAndReturn}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pipeline
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{proposal.proposal_name}</h1>
            <p className="text-slate-600">{proposal.agency_name} • {proposal.project_title}</p>
          </div>
        </div>

        {/* Phase 5 Component */}
        <Phase5
          proposalData={proposal}
          setProposalData={() => {}} // Not used in standalone mode
          proposalId={proposalId}
          organizationId={currentOrganization.id}
          onSaveAndGoToPipeline={handleSaveAndReturn}
        />
      </div>
    </div>
  );
}