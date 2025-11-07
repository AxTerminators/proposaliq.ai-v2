import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  TrendingUp,
  Sparkles,
  LayoutGrid,
  MessageSquare,
  Calendar,
  Library,
  Award,
  Users,
  Clock,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function MobileDashboard({
  user,
  organization,
  proposals = [],
  stats,
  onCreateProposal
}) {
  const navigate = useNavigate();

  const recentProposals = proposals
    .filter(p => ['evaluating', 'draft', 'in_progress'].includes(p.status))
    .slice(0, 5);

  const quickActions = [
    {
      icon: Plus,
      label: "New Proposal",
      color: "from-blue-500 to-indigo-600",
      action: onCreateProposal
    },
    {
      icon: LayoutGrid,
      label: "Board",
      color: "from-purple-500 to-pink-600",
      action: () => navigate(createPageUrl("Pipeline"))
    },
    {
      icon: MessageSquare,
      label: "AI Chat",
      color: "from-green-500 to-emerald-600",
      action: () => navigate(createPageUrl("Chat"))
    },
    {
      icon: Calendar,
      label: "Calendar",
      color: "from-amber-500 to-orange-600",
      action: () => navigate(createPageUrl("Calendar"))
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome, {user?.full_name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-sm text-slate-600">{organization?.organization_name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <LayoutGrid className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.total_proposals}</p>
            <p className="text-xs text-slate-600">Proposals</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">
              ${(stats.total_value / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-slate-600">Pipeline Value</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Sparkles className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.win_rate}%</p>
            <p className="text-xs text-slate-600">Win Rate</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-900">{stats.active_proposals}</p>
            <p className="text-xs text-slate-600">Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, idx) => (
              <Button
                key={idx}
                onClick={action.action}
                className={cn(
                  "h-20 flex-col gap-2 bg-gradient-to-br text-white border-none",
                  action.color
                )}
              >
                <action.icon className="w-6 h-6" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Proposals */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Proposals</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(createPageUrl("Pipeline"))}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentProposals.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No active proposals</p>
          ) : (
            <div className="space-y-3">
              {recentProposals.map((proposal) => {
                const daysUntilDue = proposal.due_date
                  ? moment(proposal.due_date).diff(moment(), 'days')
                  : null;
                const isUrgent = daysUntilDue !== null && daysUntilDue <= 7;

                return (
                  <div
                    key={proposal.id}
                    onClick={() => navigate(createPageUrl("Pipeline"))}
                    className={cn(
                      "p-3 border rounded-lg cursor-pointer transition-all active:scale-95",
                      isUrgent ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-sm text-slate-900 line-clamp-1">
                        {proposal.proposal_name}
                      </h4>
                      <Badge className={cn("text-white text-xs ml-2", getStatusColor(proposal.status))}>
                        {getStatusLabel(proposal.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600">
                      {proposal.due_date && (
                        <div className={cn(
                          "flex items-center gap-1",
                          isUrgent && "text-orange-600 font-semibold"
                        )}>
                          <Clock className="w-3 h-3" />
                          {daysUntilDue >= 0 ? `${daysUntilDue}d` : `${Math.abs(daysUntilDue)}d overdue`}
                        </div>
                      )}
                      {proposal.contract_value && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${(proposal.contract_value / 1000000).toFixed(1)}M
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}