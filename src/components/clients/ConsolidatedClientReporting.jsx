import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import {
  Building2,
  TrendingUp,
  DollarSign,
  Target,
  Award,
  Users,
  FileText,
  ArrowRight,
  Eye,
  ChevronRight,
  Loader2,
  BarChart3
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import moment from "moment";

const STATUS_COLORS = {
  'draft': '#94a3b8',
  'in_progress': '#3b82f6',
  'submitted': '#8b5cf6',
  'won': '#22c55e',
  'lost': '#ef4444',
  'on_hold': '#f59e0b'
};

/**
 * Consolidated Client Reporting Dashboard
 * Aggregated analytics across all client workspaces
 */
export default function ConsolidatedClientReporting({ consultingFirm }) {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('all');

  // Fetch all client organizations
  const { data: clientOrgs = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['client-orgs-reporting', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.Organization.filter({
        organization_type: 'client_organization',
        parent_organization_id: consultingFirm.id,
        is_archived: false
      }, '-created_date');
    },
    enabled: !!consultingFirm?.id,
  });

  // Fetch all relationships
  const { data: relationships = [], isLoading: loadingRelationships } = useQuery({
    queryKey: ['all-relationships', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.OrganizationRelationship.filter({
        consulting_firm_id: consultingFirm.id
      });
    },
    enabled: !!consultingFirm?.id,
  });

  // Fetch all proposals across all client workspaces
  const { data: allProposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['all-client-proposals', consultingFirm?.id, clientOrgs.map(c => c.id)],
    queryFn: async () => {
      if (clientOrgs.length === 0) return [];
      
      const allProps = [];
      for (const clientOrg of clientOrgs) {
        const props = await base44.entities.Proposal.filter({
          organization_id: clientOrg.id
        });
        allProps.push(...props.map(p => ({
          ...p,
          client_org_id: clientOrg.id,
          client_org_name: clientOrg.organization_name
        })));
      }
      return allProps;
    },
    enabled: clientOrgs.length > 0,
  });

  const isLoading = loadingOrgs || loadingRelationships || loadingProposals;

  // Calculate metrics
  const metrics = React.useMemo(() => {
    const totalClients = clientOrgs.length;
    const activeClients = relationships.filter(r => r.relationship_status === 'active').length;
    const totalProposals = allProposals.length;
    const wonProposals = allProposals.filter(p => p.status === 'won').length;
    const totalContractValue = allProposals
      .filter(p => p.status === 'won')
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const pipelineValue = allProposals
      .filter(p => ['draft', 'in_progress', 'submitted'].includes(p.status))
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const winRate = totalProposals > 0 ? ((wonProposals / totalProposals) * 100).toFixed(1) : 0;

    return {
      totalClients,
      activeClients,
      totalProposals,
      wonProposals,
      totalContractValue,
      pipelineValue,
      winRate
    };
  }, [clientOrgs, relationships, allProposals]);

  // Client performance breakdown
  const clientPerformance = React.useMemo(() => {
    return clientOrgs.map(clientOrg => {
      const clientProps = allProposals.filter(p => p.client_org_id === clientOrg.id);
      const wonProps = clientProps.filter(p => p.status === 'won');
      const relationship = relationships.find(r => r.client_organization_id === clientOrg.id);

      return {
        id: clientOrg.id,
        name: clientOrg.organization_name,
        totalProposals: clientProps.length,
        wonProposals: wonProps.length,
        winRate: clientProps.length > 0 ? ((wonProps.length / clientProps.length) * 100).toFixed(1) : 0,
        contractValue: wonProps.reduce((sum, p) => sum + (p.contract_value || 0), 0),
        pipelineValue: clientProps
          .filter(p => ['draft', 'in_progress', 'submitted'].includes(p.status))
          .reduce((sum, p) => sum + (p.contract_value || 0), 0),
        lastActivity: relationship?.last_interaction_date,
        status: relationship?.relationship_status || 'active'
      };
    }).sort((a, b) => b.contractValue - a.contractValue);
  }, [clientOrgs, allProposals, relationships]);

  // Status distribution
  const statusDistribution = React.useMemo(() => {
    const dist = {};
    allProposals.forEach(p => {
      dist[p.status] = (dist[p.status] || 0) + 1;
    });

    return Object.entries(dist).map(([status, count]) => ({
      name: status.replace('_', ' '),
      value: count,
      color: STATUS_COLORS[status] || '#64748b'
    }));
  }, [allProposals]);

  // Monthly proposal trend
  const monthlyTrend = React.useMemo(() => {
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const month = moment().subtract(i, 'months');
      const monthKey = month.format('MMM YY');
      
      const created = allProposals.filter(p => 
        moment(p.created_date).format('MMM YY') === monthKey
      ).length;
      
      const won = allProposals.filter(p => 
        p.status === 'won' && moment(p.created_date).format('MMM YY') === monthKey
      ).length;

      last6Months.push({
        month: monthKey,
        created,
        won
      });
    }
    return last6Months;
  }, [allProposals]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-8 h-8 opacity-80" />
              <Badge className="bg-white/20 text-white">Total</Badge>
            </div>
            <div className="text-3xl font-bold mb-1">{metrics.totalClients}</div>
            <p className="text-blue-100 text-sm">Client Workspaces</p>
            <p className="text-xs text-blue-200 mt-2">{metrics.activeClients} active</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 opacity-80" />
              <Badge className="bg-white/20 text-white">All Clients</Badge>
            </div>
            <div className="text-3xl font-bold mb-1">{metrics.totalProposals}</div>
            <p className="text-purple-100 text-sm">Total Proposals</p>
            <p className="text-xs text-purple-200 mt-2">{metrics.wonProposals} won</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
              <Badge className="bg-white/20 text-white">Won</Badge>
            </div>
            <div className="text-3xl font-bold mb-1">
              ${(metrics.totalContractValue / 1000000).toFixed(1)}M
            </div>
            <p className="text-green-100 text-sm">Total Contract Value</p>
            <p className="text-xs text-green-200 mt-2">
              ${(metrics.pipelineValue / 1000000).toFixed(1)}M pipeline
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 opacity-80" />
              <Badge className="bg-white/20 text-white">Performance</Badge>
            </div>
            <div className="text-3xl font-bold mb-1">{metrics.winRate}%</div>
            <p className="text-amber-100 text-sm">Overall Win Rate</p>
            <p className="text-xs text-amber-200 mt-2">
              {metrics.wonProposals} of {metrics.totalProposals} won
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Proposal Activity Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
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

        {/* Status Distribution */}
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
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Client Performance Leaderboard */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Client Performance Leaderboard
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(createPageUrl("ClientOrganizationManager"))}
            >
              Manage Clients
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {clientPerformance.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No client data available
            </div>
          ) : (
            <div className="space-y-3">
              {clientPerformance.slice(0, 10).map((client, idx) => (
                <div
                  key={client.id}
                  className="p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-all cursor-pointer group"
                  onClick={() => navigate(`${createPageUrl("ClientOrganizationManager")}?client=${client.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0",
                      idx === 0 ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white" :
                      idx === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                      idx === 2 ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white" :
                      "bg-slate-200 text-slate-700"
                    )}>
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900 truncate">
                          {client.name}
                        </p>
                        <Badge className={cn(
                          "text-xs",
                          client.status === 'active' ? "bg-green-100 text-green-700" :
                          client.status === 'prospect' ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-700"
                        )}>
                          {client.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Proposals</p>
                          <p className="font-semibold text-slate-900">{client.totalProposals}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Won</p>
                          <p className="font-semibold text-green-700">{client.wonProposals}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Win Rate</p>
                          <p className="font-semibold text-blue-700">{client.winRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Value</p>
                          <p className="font-semibold text-purple-700">
                            ${(client.contractValue / 1000).toFixed(0)}K
                          </p>
                        </div>
                      </div>

                      {client.lastActivity && (
                        <p className="text-xs text-slate-500 mt-1">
                          Last activity: {moment(client.lastActivity).fromNow()}
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Performers by Category */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Highest Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {clientPerformance
              .filter(c => c.totalProposals >= 3)
              .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate))
              .slice(0, 3)
              .map((client, idx) => (
                <div key={client.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{['🥇', '🥈', '🥉'][idx]}</span>
                    <span className="font-medium text-slate-900 text-sm truncate">
                      {client.name}
                    </span>
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    {client.winRate}%
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Highest Contract Value</CardTitle>
          </CardHeader>
          <CardContent>
            {clientPerformance
              .filter(c => c.contractValue > 0)
              .sort((a, b) => b.contractValue - a.contractValue)
              .slice(0, 3)
              .map((client, idx) => (
                <div key={client.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{['🥇', '🥈', '🥉'][idx]}</span>
                    <span className="font-medium text-slate-900 text-sm truncate">
                      {client.name}
                    </span>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700">
                    ${(client.contractValue / 1000).toFixed(0)}K
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Most Active</CardTitle>
          </CardHeader>
          <CardContent>
            {clientPerformance
              .sort((a, b) => b.totalProposals - a.totalProposals)
              .slice(0, 3)
              .map((client, idx) => (
                <div key={client.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{['🥇', '🥈', '🥉'][idx]}</span>
                    <span className="font-medium text-slate-900 text-sm truncate">
                      {client.name}
                    </span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">
                    {client.totalProposals} proposals
                  </Badge>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Client Performance Bar Chart */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Client Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={clientPerformance.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                stroke="#64748b" 
                style={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="totalProposals" fill="#3b82f6" name="Total Proposals" />
              <Bar dataKey="wonProposals" fill="#22c55e" name="Won Proposals" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}