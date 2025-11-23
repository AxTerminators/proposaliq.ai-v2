import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Building2, Target, FileText, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLazyLoadProposals } from "./useLazyLoadProposals";
import { STATUS_CONFIG, TYPE_EMOJIS } from "./proposalConstants";
import { formatCurrency, formatDueDate, groupProposals } from "./proposalUtils";

export default function ProposalsList({ proposals, organization, groupBy = 'none' }) {
  const navigate = useNavigate();

  const groupedProposals = useMemo(() => 
    groupProposals(proposals, groupBy), 
    [proposals, groupBy]
  );

  const handleProposalClick = (proposal) => {
    navigate(createPageUrl("ProposalBuilder") + `?proposal_id=${proposal.id}`);
  };

  if (proposals.length === 0) {
    return (
      <div className="text-center py-16">
        <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No proposals found</h3>
        <p className="text-slate-600">Create your first proposal to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedProposals).map(([group, items]) => {
        // **NEW: Lazy loading per group**
        const GroupView = () => {
          const { visibleProposals, hasMore, loadMore, loadAll, visibleCount, totalCount } = 
            useLazyLoadProposals(items, 15, 15);

          return (
            <>
              {groupBy !== 'none' && (
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-bold text-slate-900">
                    {groupBy === 'proposal_type_category' && `${TYPE_EMOJIS[group] || '📊'} ${group} Proposals`}
                    {groupBy === 'status' && `${STATUS_CONFIG[group]?.label || group}`}
                    {groupBy === 'agency' && `${group}`}
                  </h3>
                  <Badge variant="secondary" className="text-sm">
                    {totalCount}
                  </Badge>
                </div>
              )}
              
              <div className="space-y-3">
                {visibleProposals.map((proposal) => {
                  const statusConfig = STATUS_CONFIG[proposal.status] || { label: proposal.status, color: 'bg-gray-100' };
                  
                  return (
                    <Card
                      key={proposal.id}
                      className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-300"
                      onClick={() => handleProposalClick(proposal)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-3">
                              <h3 className="font-bold text-slate-900 text-lg flex-1">
                                {proposal.proposal_name}
                              </h3>
                              {proposal.is_sample_data && (
                                <Badge className="bg-amber-500 text-white">SAMPLE</Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                              {proposal.solicitation_number && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <FileText className="w-4 h-4" />
                                  <span className="truncate">{proposal.solicitation_number}</span>
                                </div>
                              )}
                              
                              {proposal.agency_name && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Building2 className="w-4 h-4" />
                                  <span className="truncate">{proposal.agency_name}</span>
                                </div>
                              )}
                              
                              {proposal.due_date && (
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Calendar className="w-4 h-4" />
                                  <span>{formatDueDate(proposal.due_date)}</span>
                                </div>
                              )}
                              
                              {proposal.contract_value && (
                                <div className="flex items-center gap-2 text-green-700">
                                  <DollarSign className="w-4 h-4" />
                                  <span className="font-semibold">{formatCurrency(proposal.contract_value)}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-3">
                              <Badge className={statusConfig.color}>
                                {statusConfig.label}
                              </Badge>
                              
                              {proposal.proposal_type_category && (
                                <Badge className="bg-purple-100 text-purple-700">
                                  {TYPE_EMOJIS[proposal.proposal_type_category]} {proposal.proposal_type_category}
                                </Badge>
                              )}
                              
                              {proposal.match_score > 0 && (
                                <Badge variant="outline" className="gap-1">
                                  <Target className="w-3 h-3" />
                                  {proposal.match_score}% match
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* **NEW: Load More Section** */}
              {hasMore && (
                <div className="mt-6 space-y-3">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    className="w-full border-2 border-dashed hover:bg-blue-50 hover:border-blue-400 h-12"
                  >
                    <ChevronDown className="w-5 h-5 mr-2" />
                    Load More Proposals ({totalCount - visibleCount} remaining)
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadAll}
                    className="w-full text-slate-600 hover:text-blue-600"
                  >
                    Show All {totalCount} Proposals
                  </Button>
                  <div className="text-center text-xs text-slate-500">
                    Showing {visibleCount} of {totalCount}
                  </div>
                </div>
              )}
            </>
          );
        };

        return <GroupView key={group} />;
      })}
    </div>
  );
}