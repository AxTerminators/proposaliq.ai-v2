import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  FileText,
  Calendar,
  MessageSquare
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import moment from "moment";

/**
 * Client Analytics Dashboard
 * Detailed analytics for a specific client organization
 */
export default function ClientAnalyticsDashboard({ clientOrganization, consultingFirm }) {
  // Fetch proposals for this client
  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['client-analytics-proposals', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      return base44.entities.Proposal.filter({
        organization_id: clientOrganization.id
      }, '-created_date');
    },
    enabled: !!clientOrganization?.id,
  });

  // Fetch engagement metrics
  const { data: engagementMetrics = [], isLoading: loadingMetrics } = useQuery({
    queryKey: ['client-engagement-metrics', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      return base44.entities.ClientEngagementMetric.filter({
        client_id: clientOrganization.id
      }, '-created_date');
    },
    enabled: !!clientOrganization?.id,
  });

  // Fetch annotations
  const { data: annotations = [] } = useQuery({
    queryKey: ['client-annotations-analytics', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      return base44.entities.ProposalAnnotation.filter({
        client_id: clientOrganization.id
      });
    },
    enabled: !!clientOrganization?.id,
  });

  const analytics = React.useMemo(() => {
    const totalProposals = proposals.length;
    const wonProposals = proposals.filter(p => p.status === 'won').length;
    const activeProposals = proposals.filter(p => 
      ['draft', 'in_progress', 'submitted'].includes(p.status)
    ).length;
    const winRate = totalProposals > 0 ? Math.round((wonProposals / totalProposals) * 100) : 0;
    const totalRevenue = proposals
      .filter(p => p.status === 'won')
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const pipelineValue = proposals
      .filter(p => ['draft', 'in_progress', 'submitted'].includes(p.status))
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);

    // Monthly proposal creation trend
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const month = moment().subtract(i, 'months');
      const monthStart = month.startOf('month');
      const monthEnd = month.endOf('month');
      
      const created = proposals.filter(p =>
        moment(p.created_date).isBetween(monthStart, monthEnd, null, '[]')
      ).length;
      
      const won = proposals.filter(p =>
        p.status === 'won' && moment(p.updated_date).isBetween(monthStart, monthEnd, null, '[]')
      ).length;

      monthlyData.push({
        month: month.format('MMM'),
        created,
        won
      });
    }

    // Status distribution
    const statusData = [
      { name: 'Won', value: proposals.filter(p => p.status === 'won').length, color: '#22c55e' },
      { name: 'Active', value: activeProposals, color: '#3b82f6' },
      { name: 'Lost', value: proposals.filter(p => p.status === 'lost').length, color: '#ef4444' },
      { name: 'Other', value: proposals.filter(p => !['won', 'lost', 'draft', 'in_progress', 'submitted'].includes(p.status)).length, color: '#94a3b8' }
    ].filter(d => d.value > 0);

    // Engagement by type
    const engagementByType = {};
    engagementMetrics.forEach(metric => {
      engagementByType[metric.event_type] = (engagementByType[metric.event_type] || 0) + 1;
    });

    const engagementData = Object.entries(engagementByType)
      .map(([type, count]) => ({
        type: type.replace('_', ' '),
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalProposals,
      wonProposals,
      activeProposals,
      winRate,
      totalRevenue,
      pipelineValue,
      monthlyData,
      statusData,
      engagementData,
      totalAnnotations: annotations.length,
      totalEngagements: engagementMetrics.length
    };
  }, [proposals, engagementMetrics, annotations]);

  const isLoading = loadingProposals || loadingMetrics;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{analytics.totalProposals}</div>
            <p className="text-sm text-slate-600">Total Proposals</p>
            <p className="text-xs text-slate-500 mt-1">{analytics.activeProposals} active</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{analytics.winRate}%</div>
            <p className="text-sm text-slate-600">Win Rate</p>
            <p className="text-xs text-slate-500 mt-1">{analytics.wonProposals} won</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              ${(analytics.totalRevenue / 1000000).toFixed(1)}M
            </div>
            <p className="text-sm text-slate-600">Revenue</p>
            <p className="text-xs text-slate-500 mt-1">
              ${(analytics.pipelineValue / 1000).toFixed(0)}K pipeline
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-8 h-8 text-amber-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{analytics.totalAnnotations}</div>
            <p className="text-sm text-slate-600">Annotations</p>
            <p className="text-xs text-slate-500 mt-1">{analytics.totalEngagements} total engagements</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Proposal Activity (6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Created"
                />
                <Line 
                  type="monotone" 
                  dataKey="won" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Won"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Proposal Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {analytics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Activity */}
      {analytics.engagementData.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              Top Engagement Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="type" stroke="#64748b" style={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#22c55e" name="Activity Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}