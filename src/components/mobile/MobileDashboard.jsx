import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  FileText,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Activity,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function MobileDashboard({ organization, user }) {
  const navigate = useNavigate();

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['dashboard-proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date',
        50
      );
    },
    enabled: !!organization?.id,
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['dashboard-activity', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ActivityLog.filter(
        { organization_id: organization.id },
        '-created_date',
        10
      );
    },
    enabled: !!organization?.id,
  });

  // Calculate metrics
  const activeProposals = proposals.filter(p => !['won', 'lost', 'archived'].includes(p.status));
  const totalValue = proposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
  const wonProposals = proposals.filter(p => p.status === 'won').length;
  const submittedProposals = proposals.filter(p => ['submitted', 'won', 'lost'].includes(p.status));
  const winRate = submittedProposals.length > 0 
    ? Math.round((wonProposals / submittedProposals.length) * 100)
    : 0;

  const urgentProposals = activeProposals.filter(p => {
    if (!p.due_date) return false;
    const daysUntil = moment(p.due_date).diff(moment(), 'days');
    return daysUntil >= 0 && daysUntil <= 7;
  });

  const formatValue = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600 mt-3">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
        <p className="text-sm text-slate-600">
          Welcome back, {user?.full_name?.split(' ')[0] || 'there'}!
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Action */}
        <Button
          onClick={() => navigate(createPageUrl("ProposalBuilder"))}
          className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-base"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create New Proposal
        </Button>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <Badge variant="outline" className="text-xs">Pipeline</Badge>
              </div>
              <p className="text-xl font-bold text-green-900">{formatValue(totalValue)}</p>
              <p className="text-xs text-green-700 mt-1">Total Value</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <Badge variant="outline" className="text-xs">Success</Badge>
              </div>
              <p className="text-xl font-bold text-blue-900">{winRate}%</p>
              <p className="text-xs text-blue-700 mt-1">Win Rate</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <Badge variant="outline" className="text-xs">Active</Badge>
              </div>
              <p className="text-xl font-bold text-purple-900">{activeProposals.length}</p>
              <p className="text-xs text-purple-700 mt-1">In Progress</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <Badge variant="outline" className="text-xs">Urgent</Badge>
              </div>
              <p className="text-xl font-bold text-amber-900">{urgentProposals.length}</p>
              <p className="text-xs text-amber-700 mt-1">Due Soon</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-4">No recent activity</p>
            ) : (
              recentActivity.slice(0, 5).map(activity => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 line-clamp-2">
                      <span className="font-semibold">{activity.user_name}</span>{' '}
                      {activity.action_description}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {moment(activity.created_date).fromNow()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between h-12"
              onClick={() => navigate(createPageUrl("Pipeline"))}
            >
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                View Pipeline
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between h-12"
              onClick={() => navigate(createPageUrl("Calendar"))}
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                View Calendar
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-between h-12"
              onClick={() => navigate(createPageUrl("Tasks"))}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                My Tasks
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}