
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  AlertCircle,
  Eye,
  BarChart3,
  Clock,
  Award,
  Activity,
  ArrowRight,
  Briefcase,
  Package
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import moment from "moment";
import ClientActivityFeed from "../components/clients/ClientActivityFeed";
import TimeTrackingPanel from "../components/consultant/TimeTrackingPanel";
import CrossClientResourceAnalytics from "../components/consultant/CrossClientResourceAnalytics";

/**
 * Consultant Dashboard
 * Unified view of all client engagements for consulting firms
 */
export default function ConsultantDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [consultingFirm, setConsultingFirm] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        let firmId = currentUser.active_client_id;
        if (!firmId && currentUser.client_accesses?.length > 0) {
          firmId = currentUser.client_accesses[0].organization_id;
        }
        if (firmId) {
          const orgs = await base44.entities.Organization.filter({ id: firmId });
          if (orgs.length > 0) {
            setConsultingFirm(orgs[0]);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  // Fetch all client organizations
  const { data: clientOrgs = [], isLoading: loadingClients } = useQuery({
    queryKey: ['consultant-client-orgs', consultingFirm?.id],
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
  const { data: relationships = [] } = useQuery({
    queryKey: ['consultant-relationships', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.OrganizationRelationship.filter({
        consulting_firm_id: consultingFirm.id
      });
    },
    enabled: !!consultingFirm?.id,
  });

  // Fetch all proposals across clients
  const { data: allClientProposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['all-client-proposals-dashboard', clientOrgs.map(c => c.id)],
    queryFn: async () => {
      if (clientOrgs.length === 0) return [];
      
      const allProps = [];
      for (const client of clientOrgs) {
        const props = await base44.entities.Proposal.filter({
          organization_id: client.id
        });
        allProps.push(...props.map(p => ({
          ...p,
          client_org_id: client.id,
          client_org_name: client.organization_name
        })));
      }
      return allProps;
    },
    enabled: clientOrgs.length > 0,
  });

  // Fetch health scores
  const { data: healthScores = [] } = useQuery({
    queryKey: ['all-health-scores', clientOrgs.map(c => c.id)],
    queryFn: async () => {
      if (clientOrgs.length === 0) return [];
      
      const scores = [];
      for (const client of clientOrgs) {
        const clientScores = await base44.entities.ClientHealthScore.filter(
          { client_id: client.id },
          '-calculated_date',
          1
        );
        if (clientScores.length > 0) {
          scores.push({
            ...clientScores[0],
            client_name: client.organization_name
          });
        }
      }
      return scores;
    },
    enabled: clientOrgs.length > 0,
  });

  const isLoading = loadingClients || loadingProposals;

  // Calculate metrics
  const metrics = React.useMemo(() => {
    const activeClients = clientOrgs.length;
    const totalProposals = allClientProposals.length;
    const activeProposals = allClientProposals.filter(p => 
      ['draft', 'in_progress', 'submitted'].includes(p.status)
    ).length;
    const wonProposals = allClientProposals.filter(p => p.status === 'won').length;
    const totalRevenue = allClientProposals
      .filter(p => p.status === 'won')
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const pipelineValue = allClientProposals
      .filter(p => ['draft', 'in_progress', 'submitted'].includes(p.status))
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const winRate = totalProposals > 0 ? ((wonProposals / totalProposals) * 100).toFixed(1) : 0;
    
    const atRiskClients = healthScores.filter(s => 
      s.churn_risk === 'high' || s.churn_risk === 'critical'
    ).length;

    return {
      activeClients,
      totalProposals,
      activeProposals,
      wonProposals,
      totalRevenue,
      pipelineValue,
      winRate,
      atRiskClients
    };
  }, [clientOrgs, allClientProposals, healthScores]);

  // Client engagement overview
  const clientEngagement = React.useMemo(() => {
    return clientOrgs.map(client => {
      const clientProps = allClientProposals.filter(p => p.client_org_id === client.id);
      const relationship = relationships.find(r => r.client_organization_id === client.id);
      const health = healthScores.find(s => s.client_id === client.id);

      return {
        id: client.id,
        name: client.organization_name,
        activeProposals: clientProps.filter(p => 
          ['draft', 'in_progress', 'submitted'].includes(p.status)
        ).length,
        totalProposals: clientProps.length,
        pipelineValue: clientProps
          .filter(p => ['draft', 'in_progress', 'submitted'].includes(p.status))
          .reduce((sum, p) => sum + (p.contract_value || 0), 0),
        lastActivity: relationship?.last_interaction_date,
        healthScore: health?.overall_score,
        churnRisk: health?.churn_risk,
        status: relationship?.relationship_status || 'active'
      };
    }).sort((a, b) => b.activeProposals - a.activeProposals);
  }, [clientOrgs, allClientProposals, relationships, healthScores]);

  // Weekly activity
  const weeklyActivity = React.useMemo(() => {
    const weeks = [];
    for (let i = 6; i >= 0; i--) {
      const week = moment().subtract(i, 'weeks');
      const weekStart = week.startOf('week');
      const weekEnd = week.endOf('week');
      
      const created = allClientProposals.filter(p =>
        moment(p.created_date).isBetween(weekStart, weekEnd, null, '[]')
      ).length;
      
      const won = allClientProposals.filter(p =>
        p.status === 'won' && moment(p.updated_date).isBetween(weekStart, weekEnd, null, '[]')
      ).length;

      weeks.push({
        week: week.format('MMM D'),
        created,
        won
      });
    }
    return weeks;
  }, [allClientProposals]);

  if (!consultingFirm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  const isConsultingFirm = consultingFirm.organization_type === 'consulting_firm' ||
                           consultingFirm.organization_type === 'consultancy' ||
                           (consultingFirm.organization_type === 'demo' && consultingFirm.demo_view_mode === 'consultancy');

  if (!isConsultingFirm) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Feature Not Available
            </h3>
            <p className="text-slate-600">
              Consultant dashboard is only available for consulting firms.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            Consultant Dashboard
          </h1>
          <p className="text-slate-600">
            Overview of all client engagements and active work
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("ClientOrganizationManager"))}
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Clients
          </Button>
          <Button
            onClick={() => navigate(createPageUrl("ConsolidatedReporting"))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Full Analytics
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {isLoading ? (
        <div className="grid md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Building2 className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold mb-1">{metrics.activeClients}</div>
              <p className="text-blue-100 text-sm">Active Clients</p>
              {metrics.atRiskClients > 0 && (
                <p className="text-xs text-blue-200 mt-2">
                  ⚠️ {metrics.atRiskClients} at risk
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold mb-1">{metrics.activeProposals}</div>
              <p className="text-purple-100 text-sm">Active Proposals</p>
              <p className="text-xs text-purple-200 mt-2">
                {metrics.totalProposals} total
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold mb-1">
                ${(metrics.totalRevenue / 1000000).toFixed(1)}M
              </div>
              <p className="text-green-100 text-sm">Total Revenue</p>
              <p className="text-xs text-green-200 mt-2">
                ${(metrics.pipelineValue / 1000000).toFixed(1)}M pipeline
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-8 h-8 opacity-80" />
              </div>
              <div className="text-3xl font-bold mb-1">{metrics.winRate}%</div>
              <p className="text-amber-100 text-sm">Overall Win Rate</p>
              <p className="text-xs text-amber-200 mt-2">
                {metrics.wonProposals} won
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Weekly Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" stroke="#64748b" style={{ fontSize: 12 }} />
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
              <Activity className="w-5 h-5 text-purple-600" />
              Client Health Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { 
                      name: 'Healthy', 
                      value: healthScores.filter(s => s.overall_score >= 70).length,
                      color: '#22c55e'
                    },
                    { 
                      name: 'At Risk', 
                      value: healthScores.filter(s => s.overall_score < 70 && s.overall_score >= 50).length,
                      color: '#f59e0b'
                    },
                    { 
                      name: 'Critical', 
                      value: healthScores.filter(s => s.overall_score < 50).length,
                      color: '#ef4444'
                    }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                  outerRadius={100}
                  dataKey="value"
                >
                  {[0, 1, 2].map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#22c55e', '#f59e0b', '#ef4444'][index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout - Engagements + Widgets */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Client Engagements - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Active Client Engagements
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(createPageUrl("ClientOrganizationManager"))}
                >
                  View All Clients
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {clientEngagement.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>No active clients</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientEngagement.slice(0, 5).map(client => (
                    <div
                      key={client.id}
                      className="p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-all cursor-pointer group"
                      onClick={() => navigate(`${createPageUrl("ClientOrganizationManager")}?client=${client.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {client.name[0]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-slate-900 truncate">
                              {client.name}
                            </p>
                            {client.status && (
                              <Badge className={cn(
                                client.status === 'active' ? 'bg-green-100 text-green-700' :
                                'bg-slate-100 text-slate-700'
                              )}>
                                {client.status}
                              </Badge>
                            )}
                            {client.churnRisk && ['high', 'critical'].includes(client.churnRisk) && (
                              <Badge className="bg-red-100 text-red-700">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                At Risk
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-4 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-slate-500">Active</p>
                              <p className="font-semibold text-blue-700">{client.activeProposals}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Total</p>
                              <p className="font-semibold text-slate-900">{client.totalProposals}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Pipeline</p>
                              <p className="font-semibold text-purple-700">
                                ${(client.pipelineValue / 1000).toFixed(0)}K
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Health</p>
                              <p className={cn(
                                "font-semibold",
                                client.healthScore >= 70 ? "text-green-700" :
                                client.healthScore >= 50 ? "text-amber-700" :
                                "text-red-700"
                              )}>
                                {client.healthScore ? `${client.healthScore}/100` : 'N/A'}
                              </p>
                            </div>
                          </div>

                          {client.lastActivity && (
                            <p className="text-xs text-slate-500 mt-2">
                              <Clock className="w-3 h-3 inline mr-1" />
                              Last activity: {moment(client.lastActivity).fromNow()}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
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
        </div>

        {/* Right Sidebar - Quick Tools */}
        <div className="space-y-6">
          <TimeTrackingPanel consultingFirm={consultingFirm} user={user} />
          
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Proposals This Month</span>
                <Badge className="bg-blue-100 text-blue-700">
                  {allClientProposals.filter(p =>
                    moment(p.created_date).isAfter(moment().startOf('month'))
                  ).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Wins This Quarter</span>
                <Badge className="bg-green-100 text-green-700">
                  {allClientProposals.filter(p =>
                    p.status === 'won' &&
                    moment(p.updated_date).isAfter(moment().startOf('quarter'))
                  ).length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Avg Response Time</span>
                <Badge className="bg-purple-100 text-purple-700">
                  {healthScores.length > 0
                    ? Math.round(
                        healthScores.reduce((sum, s) => sum + (s.response_time_score || 0), 0) / healthScores.length
                      )
                    : 0
                  }h
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resource Analytics */}
      <CrossClientResourceAnalytics consultingFirm={consultingFirm} />

      {/* At-Risk Clients Alert */}
      {metrics.atRiskClients > 0 && (
        <Card className="border-2 border-red-300 bg-gradient-to-r from-red-50 to-rose-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-5 h-5" />
              {metrics.atRiskClients} Client{metrics.atRiskClients !== 1 ? 's' : ''} Need Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthScores
                .filter(s => s.churn_risk === 'high' || s.churn_risk === 'critical')
                .map(score => (
                  <div key={score.client_id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                    <div>
                      <p className="font-semibold text-slate-900">{score.client_name}</p>
                      <p className="text-sm text-red-700">
                        {score.days_since_interaction} days since last interaction
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`${createPageUrl("ClientOrganizationManager")}?client=${score.client_id}`)}
                    >
                      Review
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
