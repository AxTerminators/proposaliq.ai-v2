import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProposalPipeline({ proposals = [], organization }) {
  const navigate = useNavigate();
  
  // Defensive check to ensure we have an array
  const safeProposals = Array.isArray(proposals) ? proposals : [];

  const activeProposals = safeProposals.filter(p => 
    ['evaluating', 'draft', 'in_progress'].includes(p.status)
  ).slice(0, 5);

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
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Active Proposals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeProposals.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No active proposals</p>
              <p className="text-xs mt-1">Create your first proposal to get started</p>
            </div>
          ) : (
            activeProposals.map((proposal) => (
              <div
                key={proposal.id}
                onClick={() => navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`))}
                className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 line-clamp-1">
                    {proposal.proposal_name}
                  </h3>
                  <Badge className={getStatusColor(proposal.status)}>
                    {proposal.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-600">
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
  );
}