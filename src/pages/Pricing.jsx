import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, FileText, ArrowRight, Calculator, Users } from "lucide-react";
import PricingModule from "../components/pricing/PricingModule";

export default function PricingPage() {
  const navigate = useNavigate();
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState(null);

  useEffect(() => {
    const loadProposals = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        
        if (orgs.length > 0) {
          setOrganizationId(orgs[0].id);
          const allProposals = await base44.entities.Proposal.filter(
            { organization_id: orgs[0].id },
            '-created_date'
          );
          setProposals(allProposals);
        }
      } catch (error) {
        console.error("Error loading proposals:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProposals();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (!selectedProposal) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Pricing & Cost Management</h1>
          <p className="text-slate-600">
            Select a proposal to manage labor rates, CLINs, and pricing strategy
          </p>
        </div>

        {proposals.length === 0 ? (
          <Card className="border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Proposals Yet</h3>
              <p className="text-slate-600 mb-6">
                Create a proposal first to start managing pricing and costs
              </p>
              <Button onClick={() => navigate(createPageUrl("ProposalBuilder"))}>
                Create Proposal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proposals.map((proposal) => (
              <Card 
                key={proposal.id}
                className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer hover:border-blue-300"
                onClick={() => setSelectedProposal(proposal)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-base">{proposal.proposal_name}</CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {proposal.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {proposal.agency_name} • {proposal.solicitation_number}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-4">
                    <span>{proposal.project_type}</span>
                    {proposal.due_date && (
                      <span>Due: {new Date(proposal.due_date).toLocaleDateString()}</span>
                    )}
                  </div>
                  <Button className="w-full" size="sm">
                    <Calculator className="w-4 h-4 mr-2" />
                    Manage Pricing
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg">Pricing Module Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">Labor Rate Management</h4>
                  <p className="text-sm text-slate-600">
                    Fully burdened rates with fringe, overhead, and G&A calculations
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">CLIN Builder</h4>
                  <p className="text-sm text-slate-600">
                    Build CLINs with labor allocations, ODCs, and automatic cost rollup
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1">AI Price-to-Win</h4>
                  <p className="text-sm text-slate-600">
                    AI-powered pricing analysis and competitive strategy recommendations
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button 
            variant="ghost" 
            onClick={() => setSelectedProposal(null)}
            className="mb-2"
          >
            ← Back to Proposals
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">{selectedProposal.proposal_name}</h1>
          <p className="text-slate-600">
            {selectedProposal.agency_name} • {selectedProposal.solicitation_number}
          </p>
        </div>
        <Badge className="text-base capitalize">
          {selectedProposal.status?.replace('_', ' ')}
        </Badge>
      </div>

      <PricingModule
        proposalId={selectedProposal.id}
        proposalData={selectedProposal}
        organizationId={organizationId}
      />
    </div>
  );
}