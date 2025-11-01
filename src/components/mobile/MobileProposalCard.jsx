import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Building2,
  DollarSign,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const statusConfig = {
  evaluating: { label: "Evaluating", color: "bg-blue-100 text-blue-700", icon: "🔍" },
  watch_list: { label: "Watch List", color: "bg-yellow-100 text-yellow-700", icon: "👀" },
  draft: { label: "Draft", color: "bg-slate-100 text-slate-700", icon: "📝" },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700", icon: "⚡" },
  submitted: { label: "Submitted", color: "bg-purple-100 text-purple-700", icon: "📤" },
  won: { label: "Won", color: "bg-green-100 text-green-700", icon: "🏆" },
  lost: { label: "Lost", color: "bg-red-100 text-red-700", icon: "❌" },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-500", icon: "📦" }
};

export default function MobileProposalCard({ proposal, showProgress = false, compact = false }) {
  const navigate = useNavigate();

  const daysUntilDue = proposal.due_date 
    ? moment(proposal.due_date).diff(moment(), 'days')
    : null;

  const isUrgent = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

  const progressSummary = proposal.progress_summary || {};
  const completionPercentage = progressSummary.completion_percentage || 0;

  const handleClick = () => {
    navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`));
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className="w-full p-3 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all active:scale-98 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{statusConfig[proposal.status]?.icon}</span>
              <div className="font-semibold text-slate-900 truncate">{proposal.proposal_name}</div>
            </div>
            {proposal.agency_name && (
              <div className="text-xs text-slate-600 truncate">{proposal.agency_name}</div>
            )}
          </div>
          <ArrowRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
        </div>
      </button>
    );
  }

  return (
    <Card 
      onClick={handleClick}
      className={cn(
        "border-none shadow-lg hover:shadow-xl transition-all cursor-pointer active:scale-98",
        isUrgent && "border-l-4 border-l-red-500",
        isOverdue && "border-l-4 border-l-red-700 bg-red-50"
      )}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{statusConfig[proposal.status]?.icon}</span>
              <h3 className="font-semibold text-slate-900 text-lg line-clamp-2">{proposal.proposal_name}</h3>
            </div>
            {proposal.is_sample_data && (
              <Badge className="bg-amber-100 text-amber-700 mb-2">
                <Sparkles className="w-3 h-3 mr-1" />
                SAMPLE
              </Badge>
            )}
          </div>
          <Badge className={statusConfig[proposal.status]?.color}>
            {statusConfig[proposal.status]?.label}
          </Badge>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {proposal.agency_name && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">{proposal.agency_name}</span>
            </div>
          )}
          
          {proposal.contract_value && (
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <DollarSign className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>${(proposal.contract_value / 1000000).toFixed(1)}M</span>
            </div>
          )}

          {proposal.due_date && (
            <div className={cn(
              "flex items-center gap-2 text-sm col-span-2",
              isOverdue ? "text-red-700 font-semibold" : isUrgent ? "text-red-600" : "text-slate-700"
            )}>
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>
                {isOverdue 
                  ? `Overdue by ${Math.abs(daysUntilDue)} days`
                  : `Due in ${daysUntilDue} days`
                }
              </span>
            </div>
          )}

          {proposal.assigned_team_members?.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-700 col-span-2">
              <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>{proposal.assigned_team_members.length} team member{proposal.assigned_team_members.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {showProgress && completionPercentage > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Progress</span>
              <span className="font-semibold text-slate-900">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            {progressSummary.sections_total > 0 && (
              <div className="text-xs text-slate-500">
                {progressSummary.sections_completed}/{progressSummary.sections_total} sections completed
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}