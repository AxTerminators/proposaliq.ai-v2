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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  FileText,
  Award,
  Clock,
  Target,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

/**
 * Client Analytics Dashboard
 * Detailed analytics for a specific client organization
 */
export default function ClientAnalyticsDashboard({ clientOrganization, consultingFirm }) {
  // Fetch proposals for this client
  const { data: proposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['client-proposals-analytics', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      return base44.entities.Proposal.filter({
        organization_id: clientOrganization.id
      }, '-created_date');
    },
    enabled: !!clientOrganization?.id,
  });

  // Fetch relationship data
  const { data: relationship } = useQuery({
    queryKey: ['client-relationship', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return null;
      const rels = await base44.entities.OrganizationRelationship.filter({
        client_organization_id: clientOrganization.id
      });
      return rels.length > 0 ? rels[0] : null;
    },
    enabled: !!clientOrganization?.id,
  });

  const metrics = React.useMemo(() => {
    const total = proposals.length;
    const won = proposals.filter(p => p.status === 'won').length;
    const lost = proposals.filter(p => p.status === 'lost').length;
    const inProgress = proposals.filter(p => 
      ['draft', 'in_progress', 'submitted'].includes(p.status)
    ).length;
    
    const totalValue = proposals
      .filter(p => p.status === 'won')
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);
    
    const pipelineValue = proposals
      .filter(p => ['draft', 'in_progress', 'submitted'].includes(p.status))
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);

    const winRate = total > 0 ? ((won / total) * 100).toFixed(1) : 0;

    // Average time to win
    const wonProposals = proposals.filter(p => p.status === 'won');
    const avgTimeToWin = wonProposals.length > 0
      ? wonProposals.reduce((sum, p) => {
          const days = moment(p.updated_date).diff(moment(p.created_date), 'days');
          return sum + days;
        }, 0) / wonProposals.length
      : 0;

    return {
      total,
      won,
      lost,
      inProgress,
      totalValue,
      pipelineValue,
      winRate,
      avgTimeToWin: Math.round(avgTimeToWin)
    };
  }, [proposals]);

  // Monthly activity
  const monthlyActivity = React.useMemo(() => {
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const month = moment().subtract(i, 'months');
      const monthKey = month.format('MMM YY');
      
      const created = proposals.filter(p => 
        moment(p.created_date).format('MMM YY') === monthKey
      ).length;
      
      const won = proposals.filter(p => 
        p.status === 'won' && moment(p.updated_date).format('MMM YY') === monthKey
      ).length;

      last6Months.push({ month: monthKey, created, won });
    }
    return last6Months;
  }, [proposals]);

  const isLoading = loadingProposals;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <FileText className="w-8 h-8 opacity-80 mb-3" />
            <div className="text-3xl font-bold mb-1">{metrics.total}</div>
            <p className="text-blue-100 text-sm">Total Proposals</p>
            <p className="text-xs text-blue-200 mt-2">{metrics.inProgress} active</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <Award className="w-8 h-8 opacity-80 mb-3" />
            <div className="text-3xl font-bold mb-1">{metrics.won}</div>
            <p className="text-green-100 text-sm">Proposals Won</p>
            <p className="text-xs text-green-200 mt-2">{metrics.winRate}% win rate</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <CardContent className="p-6">
            <DollarSign className="w-8 h-8 opacity-80 mb-3" />
            <div className="text-3xl font-bold mb-1">
              ${(metrics.totalValue / 1000).toFixed(0)}K
            </div>
            <p className="text-purple-100 text-sm">Contract Value</p>
            <p className="text-xs text-purple-200 mt-2">
              ${(metrics.pipelineValue / 1000).toFixed(0)}K pipeline
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <Clock className="w-8 h-8 opacity-80 mb-3" />
            <div className="text-3xl font-bold mb-1">{metrics.avgTimeToWin}</div>
            <p className="text-amber-100 text-sm">Avg Days to Win</p>
            <p className="text-xs text-amber-200 mt-2">From creation to win</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Proposal Activity (Last 6 Months)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyActivity}>
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

      {/* Proposal Status Breakdown */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Proposal Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {proposals.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No proposals yet</p>
            ) : (
              <>
                {['draft', 'in_progress', 'submitted', 'won', 'lost', 'on_hold'].map(status => {
                  const count = proposals.filter(p => p.status === status).length;
                  if (count === 0) return null;

                  const percentage = (count / proposals.length) * 100;
                  const colors = {
                    'draft': 'bg-slate-500',
                    'in_progress': 'bg-blue-500',
                    'submitted': 'bg-purple-500',
                    'won': 'bg-green-500',
                    'lost': 'bg-red-500',
                    'on_hold': 'bg-amber-500'
                  };

                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {status.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={cn("h-2 rounded-full", colors[status])}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}