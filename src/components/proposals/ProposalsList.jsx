
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Building2, Target, FileText } from "lucide-react";
import moment from "moment";
import { cn } from "@/lib/utils";

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

export default function ProposalsList({ proposals, organization, groupBy = 'none' }) {
  const navigate = useNavigate();

  const groupedProposals = useMemo(() => {
    if (groupBy === 'type') {
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
      {Object.entries(groupedProposals).map(([group, items]) => (
        <div key={group}>
          {groupBy !== 'none' && (
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {groupBy === 'type' && `${TYPE_EMOJIS[group] || '📊'} ${group} Proposals`}
                {groupBy === 'status' && `${STATUS_CONFIG[group]?.label || group}`}
                {groupBy === 'agency' && `${group}`}
              </h3>
              <Badge variant="secondary" className="text-sm">
                {items.length}
              </Badge>
            </div>
          )}
          
          <div className="space-y-3">
            {items.map((proposal) => {
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
                              <span>{moment(proposal.due_date).format('MMM D, YYYY')}</span>
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
        </div>
      ))}
    </div>
  );
}
