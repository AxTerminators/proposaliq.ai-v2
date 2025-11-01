import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  DollarSign,
  Users,
  Clock,
  Target,
  Award,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Eye,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createPageUrl } from "@/utils";
import moment from "moment";

export default function KanbanCard({ proposal, onClick, user, organization }) {
  const getStatusColor = (status) => {
    const colors = {
      evaluating: "#3b82f6",
      watch_list: "#eab308",
      draft: "#64748b",
      in_progress: "#f97316",
      submitted: "#8b5cf6",
      won: "#10b981",
      lost: "#ef4444",
      archived: "#94a3b8"
    };
    return colors[status] || "#64748b";
  };

  const getStatusIcon = (status) => {
    const icons = {
      evaluating: Target,
      watch_list: Eye,
      draft: AlertCircle,
      in_progress: Clock,
      submitted: CheckCircle2,
      won: Award,
      lost: TrendingDown,
      archived: AlertCircle
    };
    const Icon = icons[status] || AlertCircle;
    return <Icon className="w-4 h-4" />;
  };

  const getStatusLabel = (status) => {
    const labels = {
      evaluating: "Evaluating",
      watch_list: "Watch List",
      draft: "Draft",
      in_progress: "In Progress",
      submitted: "Submitted",
      won: "Won",
      lost: "Lost",
      archived: "Archived"
    };
    return labels[status] || status;
  };

  const daysUntilDue = proposal.due_date
    ? Math.ceil((new Date(proposal.due_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group"
    >
      <Card 
        className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4"
        style={{ borderLeftColor: getStatusColor(proposal.status) }}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-slate-900 line-clamp-2 flex-1">
                {proposal.proposal_name}
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onClick();
                  }}>
                    Open Proposal
                  </DropdownMenuItem>
                  {(proposal.status === 'won' || proposal.status === 'lost') && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = createPageUrl(`WinLossCapture?proposalId=${proposal.id}`);
                    }}>
                      Capture Win/Loss
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Status Badge */}
            <Badge 
              className="flex items-center gap-1 w-fit"
              style={{ 
                backgroundColor: getStatusColor(proposal.status),
                color: 'white'
              }}
            >
              {getStatusIcon(proposal.status)}
              {getStatusLabel(proposal.status)}
            </Badge>

            {/* Agency */}
            {proposal.agency_name && (
              <p className="text-sm text-slate-600 line-clamp-1">
                {proposal.agency_name}
              </p>
            )}

            {/* Metadata */}
            <div className="space-y-1.5 text-xs text-slate-600">
              {proposal.due_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {moment(proposal.due_date).format('MMM D, YYYY')}
                    {daysUntilDue !== null && daysUntilDue >= 0 && (
                      <span className={`ml-1 ${daysUntilDue <= 7 ? 'text-red-600 font-semibold' : ''}`}>
                        ({daysUntilDue}d)
                      </span>
                    )}
                  </span>
                </div>
              )}

              {proposal.contract_value && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>${(proposal.contract_value / 1000000).toFixed(1)}M</span>
                </div>
              )}

              {proposal.teaming_partner_ids?.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{proposal.teaming_partner_ids.length} partners</span>
                </div>
              )}
            </div>

            {/* Win/Loss Capture Button for won/lost proposals */}
            {(proposal.status === 'won' || proposal.status === 'lost') && (
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = createPageUrl(`WinLossCapture?proposalId=${proposal.id}`);
                }}
              >
                {proposal.status === 'won' ? (
                  <>
                    <Award className="w-4 h-4 mr-2" />
                    Capture Win Insights
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Capture Loss Insights
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}