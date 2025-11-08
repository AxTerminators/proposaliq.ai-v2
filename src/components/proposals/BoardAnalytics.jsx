import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  AlertCircle,
  Zap,
  DollarSign,
  Calendar,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];

export default function BoardAnalytics({ board, proposals, organization }) {
  // Calculate board-specific metrics
  const metrics = useMemo(() => {
    if (!board || !proposals) return null;

    const boardProposals = proposals.filter(p => {
      // Master board shows all
      if (board.is_master_board) return true;
      
      // Type-specific boards filter by type
      return board.applies_to_proposal_types?.includes(p.proposal_type_category);
    });

    // Total value in pipeline
    const totalValue = boardProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    
    // Win rate
    const submittedProposals = boardProposals.filter(p => ['submitted', 'won', 'lost'].includes(p.status));
    const wonProposals = boardProposals.filter(p => p.status === 'won');
    const winRate = submittedProposals.length > 0 
      ? Math.round((wonProposals.length / submittedProposals.length) * 100) 
      : 0;
    
    // Average cycle time (from creation to submission/win/loss)
    const completedProposals = boardProposals.filter(p => ['submitted', 'won', 'lost'].includes(p.status));
    const cycleTimes = completedProposals.map(p => {
      const created = moment(p.created_date);
      const completed = moment(p.updated_date);
      return completed.diff(created, 'days');
    });
    const avgCycleTime = cycleTimes.length > 0 
      ? Math.round(cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length)
      : 0;
    
    // Proposals per column
    const columnDistribution = board.columns?.map(col => {
      const count = boardProposals.filter(p => {
        if (col.type === 'master_status') {
          return col.status_mapping?.includes(p.status);
        } else if (col.type === 'custom_stage') {
          return p.custom_workflow_stage_id === col.id;
        } else if (col.type === 'default_status') {
          return p.status === col.default_status_mapping;
        } else if (col.type === 'locked_phase') {
          return p.current_phase === col.phase_mapping;
        }
        return false;
      }).length;
      
      return {
        name: col.label,
        count: count,
        color: col.color
      };
    }) || [];

    // Bottleneck detection (columns with > 25% of active proposals)
    const activeProposals = boardProposals.filter(p => !['won', 'lost', 'archived'].includes(p.status));
    const bottlenecks = columnDistribution.filter(col => {
      const percentage = activeProposals.length > 0 ? (col.count / activeProposals.length) * 100 : 0;
      return percentage > 25 && col.count > 2;
    });

    // Overdue proposals
    const today = new Date();
    const overdueProposals = boardProposals.filter(p => {
      if (!p.due_date) return false;
      return new Date(p.due_date) < today && !['submitted', 'won', 'lost', 'archived'].includes(p.status);
    });

    // Proposals created in last 30 days
    const thirtyDaysAgo = moment().subtract(30, 'days');
    const recentProposals = boardProposals.filter(p => moment(p.created_date).isAfter(thirtyDaysAgo));

    // Velocity (proposals moving to submitted/won/lost per week)
    const sevenDaysAgo = moment().subtract(7, 'days');
    const weeklyVelocity = boardProposals.filter(p => 
      ['submitted', 'won', 'lost'].includes(p.status) &&
      moment(p.updated_date).isAfter(sevenDaysAgo)
    ).length;

    // Team member workload
    const teamWorkload = {};
    boardProposals.forEach(p => {
      if (p.assigned_team_members?.length > 0) {
        p.assigned_team_members.forEach(email => {
          teamWorkload[email] = (teamWorkload[email] || 0) + 1;
        });
      }
    });

    const workloadData = Object.entries(teamWorkload).map(([email, count]) => ({
      name: email.split('@')[0],
      proposals: count
    })).sort((a, b) => b.proposals - a.proposals);

    // Trend analysis (comparing last 30 days to previous 30 days)
    const sixtyDaysAgo = moment().subtract(60, 'days');
    const last30Days = boardProposals.filter(p => 
      moment(p.created_date).isAfter(thirtyDaysAgo)
    ).length;
    const previous30Days = boardProposals.filter(p => 
      moment(p.created_date).isBetween(sixtyDaysAgo, thirtyDaysAgo)
    ).length;
    
    const trend = last30Days > previous30Days ? 'up' : last30Days < previous30Days ? 'down' : 'stable';
    const trendPercentage = previous30Days > 0 
      ? Math.abs(Math.round(((last30Days - previous30Days) / previous30Days) * 100))
      : 0;

    return {
      totalValue,
      winRate,
      avgCycleTime,
      columnDistribution,
      bottlenecks,
      overdueCount: overdueProposals.length,
      recentCount: recentProposals.length,
      weeklyVelocity,
      workloadData,
      trend,
      trendPercentage,
      totalProposals: boardProposals.length,
      activeProposals: activeProposals.length
    };
  }, [board, proposals]);

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">No analytics available</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <Badge variant="outline" className="text-xs">Pipeline</Badge>
            </div>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(metrics.totalValue)}</p>
            <p className="text-xs text-blue-700 mt-1">Total Value</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <Badge variant="outline" className="text-xs">Success</Badge>
            </div>
            <p className="text-2xl font-bold text-green-900">{metrics.winRate}%</p>
            <p className="text-xs text-green-700 mt-1">Win Rate</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <Badge variant="outline" className="text-xs">Speed</Badge>
            </div>
            <p className="text-2xl font-bold text-purple-900">{metrics.avgCycleTime}d</p>
            <p className="text-xs text-purple-700 mt-1">Avg Cycle Time</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-amber-600" />
              <Badge variant="outline" className="text-xs">Velocity</Badge>
            </div>
            <p className="text-2xl font-bold text-amber-900">{metrics.weeklyVelocity}</p>
            <p className="text-xs text-amber-700 mt-1">This Week</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend & Alerts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Activity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                metrics.trend === 'up' ? 'bg-green-100' : metrics.trend === 'down' ? 'bg-red-100' : 'bg-slate-100'
              )}>
                {metrics.trend === 'up' ? (
                  <TrendingUp className="w-6 h-6 text-green-600" />
                ) : metrics.trend === 'down' ? (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                ) : (
                  <BarChart3 className="w-6 h-6 text-slate-600" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {metrics.trend === 'up' ? '+' : metrics.trend === 'down' ? '-' : ''}{metrics.trendPercentage}%
                </p>
                <p className="text-sm text-slate-600">vs. previous 30 days</p>
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              <span className="font-semibold">{metrics.recentCount}</span> proposals created in last 30 days
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Overdue Proposals</span>
              <Badge variant={metrics.overdueCount > 0 ? "destructive" : "outline"}>
                {metrics.overdueCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Bottleneck Columns</span>
              <Badge variant={metrics.bottlenecks.length > 0 ? "default" : "outline"}>
                {metrics.bottlenecks.length}
              </Badge>
            </div>
            {metrics.bottlenecks.length > 0 && (
              <div className="text-xs text-slate-600 bg-amber-50 p-2 rounded">
                <strong>Bottlenecks:</strong> {metrics.bottlenecks.map(b => b.name).join(', ')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Column Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposals by Column</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.columnDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Workload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Team Workload
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.workloadData.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No assigned team members</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.workloadData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="proposals" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-slate-50 to-blue-50">
        <CardHeader>
          <CardTitle className="text-base">Board Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-slate-900">{metrics.totalProposals}</p>
              <p className="text-xs text-slate-600">Total Proposals</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{metrics.activeProposals}</p>
              <p className="text-xs text-slate-600">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{wonProposals.length}</p>
              <p className="text-xs text-slate-600">Won</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{metrics.overdueCount}</p>
              <p className="text-xs text-slate-600">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}