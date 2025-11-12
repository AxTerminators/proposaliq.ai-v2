import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { Building2, TrendingUp, Award, DollarSign, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Client Comparison Matrix
 * Side-by-side comparison of client performance metrics
 */
export default function ClientComparisonMatrix({ clientOrganizations = [], consultingFirm }) {
  // Fetch proposals for all clients
  const { data: allProposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['comparison-proposals', clientOrganizations.map(c => c.id)],
    queryFn: async () => {
      if (clientOrganizations.length === 0) return [];
      
      const proposals = [];
      for (const client of clientOrganizations) {
        const clientProps = await base44.entities.Proposal.filter({
          organization_id: client.id
        });
        proposals.push(...clientProps.map(p => ({
          ...p,
          client_org_id: client.id
        })));
      }
      return proposals;
    },
    enabled: clientOrganizations.length > 0,
  });

  // Fetch health scores
  const { data: healthScores = [], isLoading: loadingHealth } = useQuery({
    queryKey: ['comparison-health', clientOrganizations.map(c => c.id)],
    queryFn: async () => {
      if (clientOrganizations.length === 0) return [];
      
      const scores = [];
      for (const client of clientOrganizations) {
        const clientScores = await base44.entities.ClientHealthScore.filter(
          { client_id: client.id },
          '-calculated_date',
          1
        );
        if (clientScores.length > 0) {
          scores.push({
            ...clientScores[0],
            client_id: client.id
          });
        }
      }
      return scores;
    },
    enabled: clientOrganizations.length > 0,
  });

  const comparisonData = React.useMemo(() => {
    return clientOrganizations.map(client => {
      const clientProps = allProposals.filter(p => p.client_org_id === client.id);
      const health = healthScores.find(s => s.client_id === client.id);
      const wonProps = clientProps.filter(p => p.status === 'won');
      const revenue = wonProps.reduce((sum, p) => sum + (p.contract_value || 0), 0);

      return {
        id: client.id,
        name: client.organization_name,
        totalProposals: clientProps.length,
        wonProposals: wonProps.length,
        winRate: clientProps.length > 0 ? Math.round((wonProps.length / clientProps.length) * 100) : 0,
        revenue: revenue,
        healthScore: health?.overall_score || 0,
        engagementScore: health?.engagement_score || 0,
        satisfactionScore: health?.satisfaction_score || 0,
        activityScore: health?.activity_score || 0,
        churnRisk: health?.churn_risk || 'unknown',
        trend: health?.trend || 'stable'
      };
    }).sort((a, b) => b.healthScore - a.healthScore);
  }, [clientOrganizations, allProposals, healthScores]);

  const radarData = React.useMemo(() => {
    if (comparisonData.length === 0) return [];
    
    const topClients = comparisonData.slice(0, 3);
    
    return [
      {
        metric: 'Health',
        ...Object.fromEntries(topClients.map(c => [c.name, c.healthScore]))
      },
      {
        metric: 'Engagement',
        ...Object.fromEntries(topClients.map(c => [c.name, c.engagementScore]))
      },
      {
        metric: 'Satisfaction',
        ...Object.fromEntries(topClients.map(c => [c.name, c.satisfactionScore]))
      },
      {
        metric: 'Activity',
        ...Object.fromEntries(topClients.map(c => [c.name, c.activityScore]))
      },
      {
        metric: 'Win Rate',
        ...Object.fromEntries(topClients.map(c => [c.name, c.winRate]))
      }
    ];
  }, [comparisonData]);

  const isLoading = loadingProposals || loadingHealth;

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Radar Chart - Top 3 Clients */}
      {comparisonData.length >= 2 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" />
              Performance Comparison (Top 3)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" stroke="#64748b" style={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#64748b" />
                {comparisonData.slice(0, 3).map((client, idx) => (
                  <Radar
                    key={client.id}
                    name={client.name}
                    dataKey={client.name}
                    stroke={['#3b82f6', '#8b5cf6', '#22c55e'][idx]}
                    fill={['#3b82f6', '#8b5cf6', '#22c55e'][idx]}
                    fillOpacity={0.3}
                  />
                ))}
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Comparison Table */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Client Metrics Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">Health Score</TableHead>
                  <TableHead className="text-center">Proposals</TableHead>
                  <TableHead className="text-center">Win Rate</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-center">Trend</TableHead>
                  <TableHead className="text-center">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        client.healthScore >= 70 ? 'bg-green-100 text-green-700' :
                        client.healthScore >= 50 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {client.healthScore}/100
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {client.wonProposals}/{client.totalProposals}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        client.winRate >= 50 ? 'bg-green-100 text-green-700' :
                        client.winRate >= 30 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      )}>
                        {client.winRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${(client.revenue / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell className="text-center">
                      {client.trend === 'improving' ? (
                        <TrendingUp className="w-5 h-5 text-green-600 mx-auto" />
                      ) : client.trend === 'declining' ? (
                        <TrendingDown className="w-5 h-5 text-red-600 mx-auto" />
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        client.churnRisk === 'low' ? 'bg-green-100 text-green-700' :
                        client.churnRisk === 'medium' ? 'bg-amber-100 text-amber-700' :
                        client.churnRisk === 'high' ? 'bg-red-100 text-red-700' :
                        client.churnRisk === 'critical' ? 'bg-red-600 text-white' :
                        'bg-slate-100 text-slate-700'
                      )}>
                        {client.churnRisk}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}