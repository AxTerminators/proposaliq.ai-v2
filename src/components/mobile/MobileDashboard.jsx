import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Target, 
  FileText,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MobileDashboard({ 
  user, 
  organization, 
  proposals = [], 
  stats = {},
  onCreateProposal 
}) {
  const navigate = useNavigate();
  
  // Defensive check to ensure we have an array
  const safeProposals = Array.isArray(proposals) ? proposals : [];
  
  const activeProposals = safeProposals
    .filter(p => ['evaluating', 'draft', 'in_progress'].includes(p.status))
    .slice(0, 3);

  const getStatusColor = (status) => {
    const colors = {
      evaluating: "bg-yellow-100 text-yellow-800",
      draft: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      submitted: "bg-purple-100 text-purple-800",
      won: "bg-green-100 text-green-800",
      lost: "bg-red-100 text-red-800",
    };
    return colors[status] || colors.draft;
  };

  return (
    <div className="space-y-4">
      {/* Welcome Header */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back!
              </h1>
              <p className="text-blue-100 text-sm">
                {organization?.organization_name || 'Your Organization'}
              </p>
            </div>
          </div>
          <Button 
            onClick={onCreateProposal}
            className="w-full bg-white text-blue-600 hover:bg-blue-50"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Proposal
          </Button>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-slate-600">Total</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stats.total_proposals || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-green-600" />
              <span className="text-xs text-slate-600">Win Rate</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {stats.win_rate || 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-slate-600">Pipeline Value</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              ${((stats.total_value || 0) / 1000000).toFixed(1)}M
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Proposals */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Active Proposals
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(createPageUrl("Pipeline"))}
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeProposals.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No active proposals</p>
              </div>
            ) : (
              activeProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  onClick={() => navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`))}
                  className="p-4 border border-slate-200 rounded-lg active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-2">
                      {proposal.proposal_name}
                    </h3>
                    <Badge className={getStatusColor(proposal.status)}>
                      {proposal.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{proposal.agency_name || 'Agency'}</span>
                    {proposal.contract_value && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {(proposal.contract_value / 1000000).toFixed(1)}M
                      </span>
                    )}
                  </div>
                  {proposal.due_date && (
                    <p className="text-xs text-slate-500 mt-2">
                      Due: {new Date(proposal.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}