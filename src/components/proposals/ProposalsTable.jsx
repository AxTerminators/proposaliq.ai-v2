import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";
import moment from "moment";
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

const STATUS_CONFIG = {
  evaluating: { label: 'Evaluating', color: 'bg-slate-100 text-slate-700' },
  watch_list: { label: 'Watch List', color: 'bg-amber-100 text-amber-700' },
  draft: { label: 'Draft', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', color: 'bg-purple-100 text-purple-700' },
  submitted: { label: 'Submitted', color: 'bg-indigo-100 text-indigo-700' },
  won: { label: 'Won', color: 'bg-green-100 text-green-700' },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-700' },
  client_review: { label: 'Client Review', color: 'bg-cyan-100 text-cyan-700' },
};

const TYPE_EMOJIS = {
  RFP: '📄',
  RFI: '📝',
  SBIR: '💡',
  GSA: '🏛️',
  IDIQ: '📑',
  STATE_LOCAL: '🏙️',
  OTHER: '📊'
};

const formatCurrency = (value) => {
  if (!value) return 'N/A';
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
};

export default function ProposalsTable({ proposals, organization, groupBy = 'none' }) {
  const navigate = useNavigate();

  const groupedProposals = useMemo(() => {
    if (groupBy === 'proposal_type_category') {
      const groups = {};
      proposals.forEach(p => {
        const type = p.proposal_type_category || 'OTHER';
        if (!groups[type]) groups[type] = [];
        groups[type].push(p);
      });
      return groups;
    } else if (groupBy === 'status') {
      const groups = {};
      proposals.forEach(p => {
        const status = p.status || 'unknown';
        if (!groups[status]) groups[status] = [];
        groups[status].push(p);
      });
      return groups;
    } else if (groupBy === 'agency') {
      const groups = {};
      proposals.forEach(p => {
        const agency = p.agency_name || 'No Agency';
        if (!groups[agency]) groups[agency] = [];
        groups[agency].push(p);
      });
      return groups;
    } else {
      return { all: proposals };
    }
  }, [proposals, groupBy]);

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
                              {proposal.due_date 
                                ? moment(proposal.due_date).format('MMM D, YYYY')
                                : 'N/A'
                              }
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

                  {/* **NEW: Load More Footer in Table** */}
                  {hasMore && (
                    <div className="border-t bg-slate-50 p-4 space-y-3">
                      <Button
                        variant="outline"
                        onClick={loadMore}
                        className="w-full border-dashed border-2 hover:bg-blue-50 hover:border-blue-400"
                      >
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Load More ({totalCount - visibleCount} remaining)
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadAll}
                        className="w-full text-slate-600 hover:text-blue-600"
                      >
                        Show All {totalCount} Rows
                      </Button>
                      <div className="text-center text-xs text-slate-500">
                        Showing {visibleCount} of {totalCount}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </GroupWrapper>
          );
        };

        return <GroupTable key={group} />;
      })}
    </div>
  );
}