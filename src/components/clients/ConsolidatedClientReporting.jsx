import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Award,
  Building2,
  Loader2,
  Calendar,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'];

/**
 * Consolidated Client Reporting Dashboard
 * Aggregates data across all client workspaces for consulting firm view
 */
export default function ConsolidatedClientReporting({ consultingFirm }) {
  const [timeRange, setTimeRange] = useState('30d');

  // Fetch all client organizations
  const { data: clientOrganizations = [] } = useQuery({
    queryKey: ['reporting-client-orgs', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.Organization.filter({
        organization_type: 'client_organization',
        parent_organization_id: consultingFirm.id,
        is_archived: false
      });
    },
    enabled: !!consultingFirm?.id,
  });

  // Fetch all relationships
  const { data: relationships = [] } = useQuery({
    queryKey: ['reporting-relationships', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.OrganizationRelationship.filter({
        consulting_firm_id: consultingFirm.id
      });
    },
    enabled: !!consultingFirm?.id,
  });

  // Fetch all proposals across all client workspaces
  const { data: allProposals = [], isLoading } = useQuery({
    queryKey: ['reporting-all-proposals', consultingFirm?.id, clientOrganizations.map(c => c.id).join(',')],
    queryFn: async () => {
      if (clientOrganizations.length === 0) return [];

      const clientOrgIds = clientOrganizations.map(c => c.id);
      const proposals = [];

      // Fetch proposals for each client organization
      for (const orgId of clientOrgIds) {
        const orgProposals = await base44.entities.Proposal.filter({
          organization_id: orgId
        });
        proposals.push(...orgProposals);
      }

      return proposals;
    },
    enabled: clientOrganizations.length > 0,
  });

  // Calculate aggregated metrics
  const metrics = React.useMemo(() => {
    const totalClients = clientOrganizations.length;
    const activeClients = relationships.filter(r => r.relationship_status === 'active').length;
    
    const totalProposals = allProposals.length;
    const wonProposals = allProposals.filter(p => p.status === 'won' || p.status === 'client_accepted').length;
    const inProgressProposals = allProposals.filter(p => 
      ['draft', 'in_progress', 'client_review'].includes(p.status)
    ).length;

    const totalContractValue = allProposals
      .filter(p => p.status === 'won' || p.status === 'client_accepted')
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);

    const pipelineValue = allProposals
      .filter(p => ['draft', 'in_progress', 'submitted', 'client_review'].includes(p.status))
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);

    const overallWinRate = totalProposals > 0 
      ? Math.round((wonProposals / totalProposals) * 100) 
      : 0;

    return {
      totalClients,
      activeClients,
      totalProposals,
      wonProposals,
      inProgressProposals,
      totalContractValue,
      pipelineValue,
      overallWinRate
    };
  }, [clientOrganizations, relationships, allProposals]);

  // Client breakdown data
  const clientBreakdown = React.useMemo(() => {
    return clientOrganizations.map(clientOrg => {
      const relationship = relationships.find(r => r.client_organization_id === clientOrg.id);
      const clientProposals = allProposals.filter(p => p.organization_id === clientOrg.id);
      const wonCount = clientProposals.filter(p => p.status === 'won').length;
      const totalValue = clientProposals
        .filter(p => p.status === 'won')
        .reduce((sum, p) => sum + (p.contract_value || 0), 0);

      return {
        name: clientOrg.organization_name,
        proposals: clientProposals.length,
        won: wonCount,
        winRate: clientProposals.length > 0 ? Math.round((wonCount / clientProposals.length) * 100) : 0,
        value: totalValue,
        status: relationship?.relationship_status || 'unknown'
      };
    }).sort((a, b) => b.value - a.value);
  }, [clientOrganizations, relationships, allProposals]);

  // Status distribution
  const statusDistribution = React.useMemo(() => {
    const distribution = {};
    allProposals.forEach(p => {
      const status = p.status || 'unknown';
      distribution[status] = (distribution[status] || 0) + 1;
    });

    return Object.entries(distribution).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count
    }));
  }, [allProposals]);

  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <Badge className="bg-blue-600 text-white">
                {metrics.activeClients} Active
              </Badge>
            </div>
            <div className="text-3xl font-bold text-blue-900">
              {metrics.totalClients}
            </div>
            <div className="text-sm text-blue-700">Total Clients</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              <Badge className="bg-purple-600 text-white">
                {metrics.inProgressProposals} Active
              </Badge>
            </div>
            <div className="text-3xl font-bold text-purple-900">
              {metrics.totalProposals}
            </div>
            <div className="text-sm text-purple-700">Total Proposals</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <Badge className="bg-green-600 text-white">
                {formatCurrency(metrics.pipelineValue)} Pipeline
              </Badge>
            </div>
            <div className="text-3xl font-bold text-green-900">
              {formatCurrency(metrics.totalContractValue)}
            </div>
            <div className="text-sm text-green-700">Total Contract Value</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-amber-600" />
              <Badge className="bg-amber-600 text-white">
                {metrics.wonProposals} Won
              </Badge>
            </div>
            <div className="text-3xl font-bold text-amber-900">
              {metrics.overallWinRate}%
            </div>
            <div className="text-sm text-amber-700">Overall Win Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Client Performance Chart */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Client Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientBreakdown.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="proposals" fill="#3B82F6" name="Proposals" />
                  <Bar dataKey="won" fill="#10B981" name="Won" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Proposal Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client Leaderboard */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            Top Performing Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {clientBreakdown.slice(0, 5).map((client, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:border-blue-300 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">#{idx + 1}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{client.name}</p>
                    <p className="text-xs text-slate-600">
                      {client.proposals} proposals • {client.won} won
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-900">{formatCurrency(client.value)}</p>
                  <Badge className={cn(
                    "text-xs",
                    client.winRate >= 50 ? "bg-green-100 text-green-700" :
                    client.winRate >= 30 ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {client.winRate}% win rate
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}