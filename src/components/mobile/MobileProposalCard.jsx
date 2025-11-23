import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  DollarSign,
  Building2,
  Target,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const STATUS_CONFIG = {
  evaluating: { label: 'Evaluating', color: 'bg-slate-500' },
  watch_list: { label: 'Watch List', color: 'bg-amber-500' },
  draft: { label: 'Draft', color: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-purple-500' },
  submitted: { label: 'Submitted', color: 'bg-indigo-500' },
  won: { label: 'Won', color: 'bg-green-500' },
  lost: { label: 'Lost', color: 'bg-red-500' },
  archived: { label: 'Archived', color: 'bg-gray-500' },
};

const formatCurrency = (value) => {
  if (!value) return null;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

export default function MobileProposalCard({ proposal, showProgress = true }) {
  const navigate = useNavigate();
  const statusConfig = STATUS_CONFIG[proposal.status] || { label: proposal.status, color: 'bg-gray-500' };
  
  const daysUntilDue = proposal.due_date 
    ? moment(proposal.due_date).diff(moment(), 'days')
    : null;
  
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isUrgent = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;

  const progressPercentage = proposal.progress_summary?.completion_percentage || 0;

  const handleClick = () => {
    navigate(createPageUrl("ProposalBuilder") + `?proposal_id=${proposal.id}`);
  };

  return (
    <Card 
      className="border-2 border-slate-200 cursor-pointer active:scale-98 transition-transform"
      onClick={handleClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-bold text-slate-900 text-base flex-1 line-clamp-2">
            {proposal.proposal_name}
          </h3>
          <Badge className={cn("text-white", statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Key Details */}
        <div className="space-y-2 text-sm mb-3">
          {proposal.agency_name && (
            <div className="flex items-center gap-2 text-slate-700">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="truncate">{proposal.agency_name}</span>
            </div>
          )}

          {proposal.solicitation_number && (
            <div className="flex items-center gap-2 text-slate-700">
              <Target className="w-4 h-4 text-slate-500" />
              <span className="truncate">{proposal.solicitation_number}</span>
            </div>
          )}

          {proposal.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className={cn(
                "w-4 h-4",
                isOverdue ? "text-red-600" : isUrgent ? "text-amber-600" : "text-slate-500"
              )} />
              <span className={cn(
                isOverdue ? "text-red-600 font-semibold" : isUrgent ? "text-amber-600" : "text-slate-700"
              )}>
                {moment(proposal.due_date).format('MMM D, YYYY')}
                {isOverdue && " (Overdue)"}
                {isUrgent && !isOverdue && ` (${daysUntilDue}d left)`}
              </span>
            </div>
          )}

          {proposal.contract_value && (
            <div className="flex items-center gap-2 text-green-700 font-semibold">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span>{formatCurrency(proposal.contract_value)}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && progressPercentage > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600">Progress</span>
              <span className="font-semibold text-slate-900">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all bg-gradient-to-r",
                  progressPercentage >= 75 ? "from-green-400 to-green-600" :
                  progressPercentage >= 50 ? "from-blue-400 to-blue-600" :
                  progressPercentage >= 25 ? "from-amber-400 to-amber-600" :
                  "from-red-400 to-red-600"
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer Badges */}
        <div className="flex flex-wrap gap-2 text-xs">
          {proposal.proposal_type_category && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {proposal.proposal_type_category}
            </Badge>
          )}

          {proposal.match_score > 0 && (
            <Badge variant="outline" className="gap-1">
              <Target className="w-3 h-3" />
              {proposal.match_score}%
            </Badge>
          )}

          {proposal.assigned_team_members?.length > 0 && (
            <Badge variant="outline" className="gap-1">
              <Users className="w-3 h-3" />
              {proposal.assigned_team_members.length}
            </Badge>
          )}

          {proposal.action_required && (
            <Badge className="bg-red-600 text-white gap-1">
              <AlertCircle className="w-3 h-3" />
              Action Required
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}