import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Heart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
  DollarSign,
  Calendar,
  Target,
  Zap,
  Brain,
  Loader2,
  RefreshCw
} from "lucide-react";
import {
  LineChart,
  Line,
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
} from 'recharts';
import { cn } from "@/lib/utils";
import moment from "moment";

const RISK_COLORS = {
  low: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", icon: CheckCircle2 },
  medium: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", icon: AlertTriangle },
  high: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", icon: AlertTriangle },
  critical: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", icon: AlertTriangle }
};

const TREND_ICONS = {
  improving: { icon: TrendingUp, color: "text-green-600" },
  stable: { icon: Activity, color: "text-blue-600" },
  declining: { icon: TrendingDown, color: "text-red-600" }
};

export default function ClientHealthMonitor({ clients = [], organization }) {
  const queryClient = useQueryClient();
  const [calculatingHealth, setCalculatingHealth] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Query health scores
  const { data: healthScores = [] } = useQuery({
    queryKey: ['client-health', organization.id],
    queryFn: () => base44.entities.ClientHealthScore.filter({
      organization_id: organization.id
    }, '-calculated_date'),
    initialData: []
  });

  // Query proposals for calculations
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', organization.id],
    queryFn: () => base44.entities.Proposal.list(),
    initialData: []
  });

  // Query engagement metrics
  const { data: engagementMetrics = [] } = useQuery({
    queryKey: ['engagement-metrics'],
    queryFn: () => base44.entities.ClientEngagementMetric.list('-created_date', 1000),
    initialData: []
  });

  // Calculate health score mutation
  const calculateHealthMutation = useMutation({
    mutationFn: async (client) => {
      // Get client-specific data
      const clientProposals = proposals.filter(p => 
        p.shared_with_client_ids?.includes(client.id)
      );
      const clientMetrics = engagementMetrics.filter(m => m.client_id === client.id);

      // Calculate scores
      const engagementScore = Math.min(
        (clientMetrics.length / 50) * 100, // Normalize to 50 engagements = 100%
        100
      );

      const activityScore = (() => {
        const recentActivity = clientMetrics.filter(m => 
          moment(m.created_date).isAfter(moment().subtract(7, 'days'))
        );
        return Math.min((recentActivity.length / 10) * 100, 100);
      })();

      const responseTimeScore = (() => {
        if (!client.avg_response_time_hours) return 50;
        if (client.avg_response_time_hours < 24) return 100;
        if (client.avg_response_time_hours < 48) return 80;
        if (client.avg_response_time_hours < 72) return 60;
        return 40;
      })();

      const proposalsWon = clientProposals.filter(p => p.status === 'client_accepted').length;
      const totalDecided = clientProposals.filter(p => 
        ['client_accepted', 'client_rejected'].includes(p.status)
      ).length;
      const winRate = totalDecided > 0 ? (proposalsWon / totalDecided) : 0;
      const satisfactionScore = winRate * 100;

      const overallScore = Math.round(
        (engagementScore * 0.3) +
        (activityScore * 0.25) +
        (responseTimeScore * 0.2) +
        (satisfactionScore * 0.25)
      );

      // Determine churn risk
      const daysSinceInteraction = client.last_engagement_date 
        ? moment().diff(moment(client.last_engagement_date), 'days')
        : 999;

      let churnRisk = 'low';
      let churnProbability = 10;

      if (overallScore < 40 || daysSinceInteraction > 30) {
        churnRisk = 'critical';
        churnProbability = 75;
      } else if (overallScore < 60 || daysSinceInteraction > 14) {
        churnRisk = 'high';
        churnProbability = 50;
      } else if (overallScore < 75 || daysSinceInteraction > 7) {
        churnRisk = 'medium';
        churnProbability = 25;
      }

      // Determine trend
      let trend = 'stable';
      if (overallScore > 75 && activityScore > 70) trend = 'improving';
      if (overallScore < 50 || activityScore < 30) trend = 'declining';

      // Generate risk factors and recommendations
      const riskFactors = [];
      const recommendations = [];

      if (daysSinceInteraction > 14) {
        riskFactors.push("No activity in over 2 weeks");
        recommendations.push("Schedule a check-in call immediately");
      }
      if (responseTimeScore < 60) {
        riskFactors.push("Slow response times");
        recommendations.push("Send a personalized follow-up email");
      }
      if (winRate < 0.5 && totalDecided > 0) {
        riskFactors.push("Low win rate on proposals");
        recommendations.push("Review proposal quality and client needs");
      }
      if (engagementScore < 50) {
        riskFactors.push("Low engagement with proposals");
        recommendations.push("Share more relevant content or schedule demo");
      }

      if (riskFactors.length === 0) {
        riskFactors.push("No significant risks detected");
        recommendations.push("Continue current engagement strategy");
      }

      // Create or update health score
      const existing = healthScores.find(s => s.client_id === client.id);
      
      const healthData = {
        client_id: client.id,
        organization_id: organization.id,
        overall_score: overallScore,
        engagement_score: Math.round(engagementScore),
        satisfaction_score: Math.round(satisfactionScore),
        activity_score: Math.round(activityScore),
        response_time_score: Math.round(responseTimeScore),
        churn_risk: churnRisk,
        churn_probability: churnProbability,
        trend: trend,
        last_interaction: client.last_engagement_date,
        days_since_interaction: daysSinceInteraction,
        total_proposals: clientProposals.length,
        proposals_won: proposalsWon,
        win_rate: Math.round(winRate * 100),
        lifetime_value: clientProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0),
        risk_factors: riskFactors,
        recommended_actions: recommendations,
        calculated_date: new Date().toISOString()
      };

      if (existing) {
        return base44.entities.ClientHealthScore.update(existing.id, healthData);
      } else {
        return base44.entities.ClientHealthScore.create(healthData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-health'] });
    }
  });

  const calculateAllHealth = async () => {
    setCalculatingHealth(true);
    try {
      for (const client of clients) {
        await calculateHealthMutation.mutateAsync(client);
      }
      alert("✓ Health scores updated for all clients!");
    } catch (error) {
      console.error("Error calculating health:", error);
      alert("Error calculating health scores");
    } finally {
      setCalculatingHealth(false);
    }
  };

  // Get health score for a client
  const getHealthScore = (clientId) => {
    return healthScores.find(s => s.client_id === clientId);
  };

  // Aggregate statistics
  const stats = {
    averageHealth: Math.round(
      healthScores.reduce((sum, s) => sum + s.overall_score, 0) / (healthScores.length || 1)
    ),
    atRiskCount: healthScores.filter(s => ['high', 'critical'].includes(s.churn_risk)).length,
    healthyCount: healthScores.filter(s => s.overall_score >= 75).length,
    decliningCount: healthScores.filter(s => s.trend === 'declining').length
  };

  const detailHealth = selectedClient ? getHealthScore(selectedClient.id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-600" />
                Client Health Monitor
              </CardTitle>
              <CardDescription>
                Track client health, predict churn, and take proactive action
              </CardDescription>
            </div>
            <Button onClick={calculateAllHealth} disabled={calculatingHealth}>
              {calculatingHealth ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recalculate All
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6 text-center">
            <Heart className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.averageHealth}</p>
            <p className="text-sm text-slate-600">Avg Health Score</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-3xl font-bold text-green-600">{stats.healthyCount}</p>
            <p className="text-sm text-slate-600">Healthy Clients</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
            <p className="text-3xl font-bold text-red-600">{stats.atRiskCount}</p>
            <p className="text-sm text-slate-600">At Risk</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6 text-center">
            <TrendingDown className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <p className="text-3xl font-bold text-orange-600">{stats.decliningCount}</p>
            <p className="text-sm text-slate-600">Declining</p>
          </CardContent>
        </Card>
      </div>

      {/* Client List with Health Scores */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Client Health Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {clients.map(client => {
              const health = getHealthScore(client.id);
              if (!health) return null;

              const riskConfig = RISK_COLORS[health.churn_risk];
              const trendConfig = TREND_ICONS[health.trend];
              const TrendIcon = trendConfig.icon;
              const RiskIcon = riskConfig.icon;

              return (
                <Card 
                  key={client.id} 
                  className={cn(
                    "border-2 cursor-pointer hover:shadow-md transition-all",
                    riskConfig.border,
                    selectedClient?.id === client.id && "ring-2 ring-blue-500"
                  )}
                  onClick={() => setSelectedClient(client)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${riskConfig.bg}`}>
                          <span className={`text-2xl font-bold ${riskConfig.text}`}>
                            {health.overall_score}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">
                            {client.contact_name || client.client_name}
                          </h4>
                          <p className="text-sm text-slate-600">{client.client_organization}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendIcon className={`w-5 h-5 ${trendConfig.color}`} />
                        <Badge className={cn("capitalize", riskConfig.bg, riskConfig.text)}>
                          <RiskIcon className="w-3 h-3 mr-1" />
                          {health.churn_risk} risk
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-600">Engagement</p>
                        <p className="font-bold text-slate-900">{health.engagement_score}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-600">Activity</p>
                        <p className="font-bold text-slate-900">{health.activity_score}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-600">Response</p>
                        <p className="font-bold text-slate-900">{health.response_time_score}</p>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <p className="text-xs text-slate-600">Win Rate</p>
                        <p className="font-bold text-slate-900">{health.win_rate}%</p>
                      </div>
                    </div>

                    <Progress value={health.overall_score} className="h-2" />
                  </CardContent>
                </Card>
              );
            })}

            {clients.filter(c => getHealthScore(c.id)).length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Heart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="font-medium mb-2">No health data yet</p>
                <p className="text-sm">Click "Recalculate All" to generate health scores</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Health View */}
      {detailHealth && selectedClient && (
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle>
              Health Details: {selectedClient.contact_name || selectedClient.client_name}
            </CardTitle>
            <CardDescription>
              Last calculated {moment(detailHealth.calculated_date).fromNow()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Breakdown */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Score Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={[
                  { metric: 'Engagement', score: detailHealth.engagement_score },
                  { metric: 'Activity', score: detailHealth.activity_score },
                  { metric: 'Response Time', score: detailHealth.response_time_score },
                  { metric: 'Satisfaction', score: detailHealth.satisfaction_score }
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar name="Scores" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Churn Risk Analysis */}
            <div className={`p-6 rounded-lg border-2 ${RISK_COLORS[detailHealth.churn_risk].border} ${RISK_COLORS[detailHealth.churn_risk].bg}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Churn Risk Assessment</h3>
                  <p className={`text-2xl font-bold ${RISK_COLORS[detailHealth.churn_risk].text}`}>
                    {detailHealth.churn_probability}% Probability
                  </p>
                </div>
                <Badge className={cn("text-lg px-4 py-2 capitalize", RISK_COLORS[detailHealth.churn_risk].bg, RISK_COLORS[detailHealth.churn_risk].text)}>
                  {detailHealth.churn_risk} Risk
                </Badge>
              </div>
              <Progress value={detailHealth.churn_probability} className="h-3" />
            </div>

            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-slate-600">Lifetime Value</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  ${(detailHealth.lifetime_value || 0).toLocaleString()}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  <p className="text-sm text-slate-600">Win Rate</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{detailHealth.win_rate}%</p>
                <p className="text-xs text-slate-500">
                  {detailHealth.proposals_won} / {detailHealth.total_proposals} proposals
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-slate-600">Last Activity</p>
                </div>
                <p className="text-2xl font-bold text-slate-900">{detailHealth.days_since_interaction}</p>
                <p className="text-xs text-slate-500">days ago</p>
              </div>
            </div>

            {/* Risk Factors */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Risk Factors
              </h3>
              <div className="space-y-2">
                {detailHealth.risk_factors?.map((factor, idx) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    ⚠️ {factor}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Actions */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Recommended Actions
              </h3>
              <div className="space-y-2">
                {detailHealth.recommended_actions?.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-blue-900">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}