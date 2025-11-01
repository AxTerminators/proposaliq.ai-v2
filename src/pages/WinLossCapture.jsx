import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingDown, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import WinLossAnalyzer from "../components/analytics/WinLossAnalyzer";

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function WinLossCapture() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showAnalyzer, setShowAnalyzer] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals-winloss', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { 
          organization_id: organization.id,
          status: { $in: ['won', 'lost'] }
        },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const { data: analyses, isLoading: loadingAnalyses } = useQuery({
    queryKey: ['winloss-analyses', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.WinLossAnalysis.filter(
        { organization_id: organization.id },
        '-decision_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  // Get proposals without analysis
  const proposalsNeedingAnalysis = proposals.filter(p => 
    !analyses.some(a => a.proposal_id === p.id)
  );

  const handleCaptureAnalysis = (proposal) => {
    setSelectedProposal(proposal);
    setShowAnalyzer(true);
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Win/Loss Capture</h1>
          <p className="text-slate-600">Document lessons learned from wins and losses</p>
        </div>
        <Button onClick={() => navigate(createPageUrl("WinLossInsights"))}>
          View Insights
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1,2].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : proposalsNeedingAnalysis.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">All Caught Up!</h3>
            <p className="text-slate-600">
              All your won and lost proposals have been analyzed
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Proposals Awaiting Analysis ({proposalsNeedingAnalysis.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {proposalsNeedingAnalysis.map((proposal) => (
              <Card key={proposal.id} className="border-none shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      proposal.status === 'won' 
                        ? 'bg-green-100' 
                        : 'bg-red-100'
                    }`}>
                      {proposal.status === 'won' ? (
                        <Trophy className="w-6 h-6 text-green-600" />
                      ) : (
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">
                        {proposal.proposal_name}
                      </h3>
                      {proposal.agency_name && (
                        <p className="text-sm text-slate-600 mb-3">{proposal.agency_name}</p>
                      )}
                      <Button 
                        size="sm"
                        onClick={() => handleCaptureAnalysis(proposal)}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Capture Analysis
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showAnalyzer && selectedProposal && (
        <WinLossAnalyzer
          proposal={selectedProposal}
          organization={organization}
          onClose={() => {
            setShowAnalyzer(false);
            setSelectedProposal(null);
          }}
          onSuccess={() => {
            setShowAnalyzer(false);
            setSelectedProposal(null);
          }}
        />
      )}
    </div>
  );
}