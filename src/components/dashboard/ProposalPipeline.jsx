import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LayoutGrid,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function ProposalPipeline({ proposals = [], organization }) {
  const navigate = useNavigate();

  const activeProposals = proposals.filter(p =>
    ['qualifying', 'planning', 'drafting', 'reviewing'].includes(p.status)
  ).slice(0, 5);

  const urgentProposals = activeProposals.filter(p =>
    p.due_date && moment(p.due_date).diff(moment(), 'days') <= 7
  );

  const getStatusColor = (status) => {
    const colors = {
      qualifying: 'bg-slate-500',
      planning: 'bg-cyan-500',
      drafting: 'bg-blue-500',
      reviewing: 'bg-purple-500',
      submitted: 'bg-indigo-500',
      won: 'bg-green-500',
      lost: 'bg-red-500',
      archived: 'bg-gray-500'
    };
    return colors[status] || 'bg-slate-500';
  };

  const getStatusLabel = (status) => {
    const labels = {
      qualifying: 'Qualifying',
      planning: 'Planning',
      drafting: 'Drafting',
      reviewing: 'Reviewing',
      submitted: 'Submitted',
      won: 'Won',
      lost: 'Lost',
      archived: 'Archived'
    };
    return labels[status] || status;
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-600" />
            Active Proposals
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(createPageUrl("Pipeline"))}
          >
            View Proposal Board
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeProposals.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <LayoutGrid className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="mb-2">No active proposals</p>
            <Button
              size="sm"
              onClick={() => navigate(createPageUrl("Pipeline"))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Proposal
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {urgentProposals.length > 0 && (
              <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  <p className="font-semibold">
                    {urgentProposals.length} proposal{urgentProposals.length > 1 ? 's' : ''} due within 7 days
                  </p>
                </div>
              </div>
            )}

            {activeProposals.map((proposal) => {
              const daysUntilDue = proposal.due_date
                ? moment(proposal.due_date).diff(moment(), 'days')
                : null;
              const isUrgent = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0;
              const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

              return (
                <div
                  key={proposal.id}
                  onClick={() => navigate(createPageUrl("Pipeline"))}
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md",
                    isOverdue ? 'border-red-300 bg-red-50' :
                    isUrgent ? 'border-orange-300 bg-orange-50' :
                    'border-slate-200 bg-white hover:border-blue-300'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">
                        {proposal.proposal_name}
                      </h4>
                      {proposal.agency_name && (
                        <p className="text-sm text-slate-600">{proposal.agency_name}</p>
                      )}
                    </div>
                    <Badge className={cn("text-white", getStatusColor(proposal.status))}>
                      {getStatusLabel(proposal.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      {proposal.due_date && (
                        <div className={cn(
                          "flex items-center gap-1",
                          isOverdue ? 'text-red-600 font-semibold' :
                          isUrgent ? 'text-orange-600 font-semibold' :
                          'text-slate-600'
                        )}>
                          <Clock className="w-4 h-4" />
                          {isOverdue
                            ? `${Math.abs(daysUntilDue)}d overdue`
                            : isUrgent
                            ? `${daysUntilDue}d left`
                            : moment(proposal.due_date).format('MMM D')}
                        </div>
                      )}
                      {proposal.contract_value && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <TrendingUp className="w-4 h-4" />
                          ${(proposal.contract_value / 1000000).toFixed(1)}M
                        </div>
                      )}
                    </div>

                    {proposal.progress_summary?.completion_percentage >= 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-2">
                          <div
                            className={cn(
                              "h-2 rounded-full transition-all",
                              proposal.progress_summary.completion_percentage === 100 ? 'bg-green-500' :
                              proposal.progress_summary.completion_percentage >= 75 ? 'bg-blue-500' :
                              'bg-yellow-500'
                            )}
                            style={{ width: `${proposal.progress_summary.completion_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-600">
                          {proposal.progress_summary.completion_percentage}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("Pipeline"))}
              className="w-full"
            >
              View All on Proposal Board
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}