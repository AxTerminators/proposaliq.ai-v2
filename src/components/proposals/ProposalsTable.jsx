import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ChevronDown, ChevronRight, Building2, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLazyLoadProposals } from "./useLazyLoadProposals";
import { STATUS_CONFIG, TYPE_EMOJIS } from "./proposalConstants";
import { formatCurrency, formatDueDate, groupProposals } from "./proposalUtils";

export default function ProposalsTable({ proposals, organization, groupBy = 'none' }) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const groupedProposals = useMemo(() => 
    groupProposals(proposals, groupBy), 
    [proposals, groupBy]
  );

  const handleRowClick = (proposal) => {
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

  // Mobile Card View Component
  const MobileProposalCard = ({ proposal }) => {
    const statusConfig = STATUS_CONFIG[proposal.status] || { label: proposal.status, color: 'bg-gray-100' };
    
    return (
      <div
        onClick={() => handleRowClick(proposal)}
        className="bg-white border-2 border-slate-200 rounded-lg p-4 cursor-pointer hover:shadow-md hover:border-blue-400 transition-all active:scale-[0.98] min-h-[44px] touch-manipulation"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h4 className="font-semibold text-slate-900 text-base flex-1 line-clamp-2">
            {proposal.proposal_name}
          </h4>
          {proposal.is_sample_data && (
            <Badge className="bg-amber-500 text-white text-xs h-6 flex-shrink-0">SAMPLE</Badge>
          )}
        </div>

        <div className="space-y-2 text-sm">
          {proposal.agency_name && (
            <div className="flex items-center gap-2 text-slate-600">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{proposal.agency_name}</span>
            </div>
          )}

          {proposal.due_date && (
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formatDueDate(proposal.due_date)}</span>
            </div>
          )}

          {proposal.contract_value && (
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span>{formatCurrency(proposal.contract_value)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge className={statusConfig.color}>
            {statusConfig.label}
          </Badge>
          
          {proposal.match_score > 0 && (
            <Badge variant="outline">{proposal.match_score}%</Badge>
          )}
          
          {proposal.proposal_type_category && (
            <Badge className="bg-purple-100 text-purple-700">
              {TYPE_EMOJIS[proposal.proposal_type_category]} {proposal.proposal_type_category}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedProposals).map(([group, items]) => {
        // **NEW: Lazy loading per group**
        const GroupTable = () => {
          const { visibleProposals, hasMore, loadMore, loadAll, visibleCount, totalCount } = 
            useLazyLoadProposals(items, 25, 25);
          const [isOpen, setIsOpen] = useState(true);

          const GroupWrapper = groupBy !== 'none' ? Collapsible : React.Fragment;
          const groupProps = groupBy !== 'none' ? { open: isOpen, onOpenChange: setIsOpen } : {};

          return (
            <GroupWrapper {...groupProps}>
              {groupBy !== 'none' && (
                <div className="mb-3">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors">
                      <ChevronRight className={cn(
                        "w-5 h-5 text-slate-600 transition-transform",
                        isOpen && "rotate-90"
                      )} />
                      <h3 className="text-lg font-bold text-slate-900">
                        {groupBy === 'proposal_type_category' && `${TYPE_EMOJIS[group] || '📊'} ${group} Proposals`}
                        {groupBy === 'status' && `${STATUS_CONFIG[group]?.label || group}`}
                        {groupBy === 'agency' && group}
                      </h3>
                      <Badge variant="secondary" className="ml-2">
                        {totalCount}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                </div>
              )}
              
              <CollapsibleContent>
                {isMobile ? (
                  /* Mobile Card View */
                  <div className="space-y-3">
                    {visibleProposals.map((proposal) => (
                      <MobileProposalCard key={proposal.id} proposal={proposal} />
                    ))}
                  </div>
                ) : (
                  /* Desktop Table View */
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Proposal Name</TableHead>
                          <TableHead>Agency</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleProposals.map((proposal) => {
                          const statusConfig = STATUS_CONFIG[proposal.status] || { label: proposal.status, color: 'bg-gray-100' };
                          
                          return (
                            <TableRow
                              key={proposal.id}
                              className="cursor-pointer hover:bg-blue-50 transition-colors"
                              onClick={() => handleRowClick(proposal)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {proposal.proposal_name}
                                  {proposal.is_sample_data && (
                                    <Badge className="bg-amber-500 text-white text-xs">SAMPLE</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{proposal.agency_name || 'N/A'}</TableCell>
                              <TableCell>
                                {formatDueDate(proposal.due_date)}
                              </TableCell>
                              <TableCell className="font-semibold text-green-700">
                                {formatCurrency(proposal.contract_value)}
                              </TableCell>
                              <TableCell>
                                <Badge className={statusConfig.color}>
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {proposal.match_score > 0 ? (
                                  <Badge variant="outline">{proposal.match_score}%</Badge>
                                ) : (
                                  'N/A'
                                )}
                              </TableCell>
                              <TableCell>
                                {proposal.proposal_type_category && (
                                  <Badge className="bg-purple-100 text-purple-700">
                                    {TYPE_EMOJIS[proposal.proposal_type_category]} {proposal.proposal_type_category}
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Load More Footer */}
                {hasMore && (
                  <div className={cn(
                    "p-4 space-y-3",
                    !isMobile && "border-t bg-slate-50"
                  )}>
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      className="w-full border-dashed border-2 hover:bg-blue-50 hover:border-blue-400 min-h-[44px]"
                    >
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Load More ({totalCount - visibleCount} remaining)
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadAll}
                      className="w-full text-slate-600 hover:text-blue-600 min-h-[44px]"
                    >
                      Show All {totalCount} {isMobile ? 'Cards' : 'Rows'}
                    </Button>
                    <div className="text-center text-xs text-slate-500">
                      Showing {visibleCount} of {totalCount}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </GroupWrapper>
          );
        };

        return <GroupTable key={group} />;
      })}
    </div>
  );
}