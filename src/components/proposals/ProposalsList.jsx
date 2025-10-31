import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Building2, TrendingUp, FileText, Sparkles } from "lucide-react";

const statusConfig = {
  evaluating: { label: "Evaluating", color: "bg-blue-100 text-blue-700" },
  watch_list: { label: "Watch List", color: "bg-yellow-100 text-yellow-700" },
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700" },
  submitted: { label: "Submitted", color: "bg-purple-100 text-purple-700" },
  won: { label: "Won", color: "bg-green-100 text-green-700" },
  lost: { label: "Lost", color: "bg-red-100 text-red-700" },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-500" }
};

export default function ProposalsList({ proposals }) {
  const navigate = useNavigate();

  if (proposals.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-20 h-20 mx-auto text-slate-300 mb-4" />
        <p className="text-slate-600 text-lg mb-2">No proposals found</p>
        <p className="text-slate-500">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {proposals.map((proposal) => (
        <Card
          key={proposal.id}
          onClick={() => navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`))}
          className="cursor-pointer hover:shadow-lg transition-all border-slate-200"
        >
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {proposal.proposal_name}
                      </h3>
                      {proposal.is_sample_data && (
                        <Badge className="bg-amber-100 text-amber-700">
                          <Sparkles className="w-3 h-3 mr-1" />
                          SAMPLE
                        </Badge>
                      )}
                    </div>
                    {proposal.solicitation_number && (
                      <p className="text-sm text-slate-500">
                        Solicitation: {proposal.solicitation_number}
                      </p>
                    )}
                  </div>
                  <Badge className={statusConfig[proposal.status]?.color}>
                    {statusConfig[proposal.status]?.label || proposal.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                  {proposal.agency_name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {proposal.agency_name}
                    </div>
                  )}
                  {proposal.due_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      Due: {new Date(proposal.due_date).toLocaleDateString()}
                    </div>
                  )}
                  {proposal.match_score && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-slate-400" />
                      Match Score: {proposal.match_score}/100
                    </div>
                  )}
                </div>

                {proposal.project_type && (
                  <div className="mt-3">
                    <Badge variant="outline">{proposal.project_type}</Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}