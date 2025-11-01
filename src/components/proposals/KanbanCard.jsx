import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  DollarSign, 
  Users, 
  AlertCircle,
  Clock,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function KanbanCard({ proposal, index, onClick, isDragging, organization }) {
  const progress = proposal.progress_summary?.completion_percentage || 0;
  
  const isOverdue = proposal.due_date && moment(proposal.due_date).isBefore(moment());
  const daysUntilDue = proposal.due_date ? moment(proposal.due_date).diff(moment(), 'days') : null;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer hover:shadow-lg transition-all duration-200 border-2",
        isDragging && "shadow-2xl rotate-2 opacity-70",
        isOverdue && "border-red-300 bg-red-50"
      )}
    >
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold text-slate-900 line-clamp-2">
          {proposal.proposal_name}
        </CardTitle>
        
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {proposal.project_type && (
            <Badge variant="outline" className="text-xs">
              {proposal.project_type}
            </Badge>
          )}
          {proposal.agency_name && (
            <Badge variant="secondary" className="text-xs truncate max-w-[150px]">
              {proposal.agency_name}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-600">Progress</span>
            <span className="font-semibold text-slate-900">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Due Date */}
        {proposal.due_date && (
          <div className={cn(
            "flex items-center gap-2 text-xs",
            isOverdue ? "text-red-600" : daysUntilDue <= 7 ? "text-amber-600" : "text-slate-600"
          )}>
            {isOverdue ? (
              <AlertCircle className="w-3 h-3" />
            ) : daysUntilDue <= 7 ? (
              <Clock className="w-3 h-3" />
            ) : (
              <Calendar className="w-3 h-3" />
            )}
            <span>
              {isOverdue ? "Overdue" : moment(proposal.due_date).format('MMM D, YYYY')}
              {daysUntilDue !== null && !isOverdue && ` (${daysUntilDue}d)`}
            </span>
          </div>
        )}

        {/* Contract Value */}
        {proposal.contract_value && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <DollarSign className="w-3 h-3" />
            <span>${(proposal.contract_value / 1000000).toFixed(1)}M</span>
          </div>
        )}

        {/* Assigned Team Members */}
        {proposal.assigned_team_members && proposal.assigned_team_members.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Users className="w-3 h-3" />
            <span>{proposal.assigned_team_members.length} team member{proposal.assigned_team_members.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Blocker Warning */}
        {proposal.is_blocked && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span className="line-clamp-1">{proposal.blocker_reason || "Blocked"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}