
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  RefreshCw,
  Sparkles
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
  const [analyzingChurn, setAnalyzingChurn] = useState(false);
  const [churnPrediction, setChurnPrediction] = useState(null);
  const [error, setError] = useState(null);

  // Query health scores
  const { data: healthScores = [] } = useQuery({
    queryKey: ['client-health', organization?.id],
    queryFn: () => base44.entities.ClientHealthScore.filter({
      organization_id: organization.id
    }, '-calculated_date'),
    initialData: [],
    enabled: !!organization?.id
  });

  // Query proposals for calculations
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: () => base44.entities.Proposal.list(),
    initialData: [],
    enabled: !!organization?.id
  });

  // Query engagement metrics
  const { data: engagementMetrics = [] } = useQuery({
    queryKey: ['engagement-metrics'],
    queryFn: () => base44.entities.ClientEngagementMetric.list('-created_date', 1000),
    initialData: []
  });

  // Query meetings
  const { data: meetings = [] } = useQuery({
    queryKey: ['client-meetings', organization?.id],
    queryFn: () => base44.entities.ClientMeeting.filter({
      organization_id: organization.id
    }),
    initialData: [],
    enabled: !!organization?.id
  });

  const runChurnPredictionAnalysis = async (client) => {
    if (!client?.id || !organization?.id) {
      alert("Client or Organization data required");
      return;
    }

    setAnalyzingChurn(true);
    setError(null);
    setChurnPrediction(null); // Clear previous prediction

    try {
      // Calculate engagement metrics
      const clientProposals = proposals.filter(p => 
        p.shared_with_client_ids?.includes(client.id)
      );
      const wonProposals = clientProposals.filter(p => p.status === 'client_accepted').length;
      const totalProposals = clientProposals.length;
      const clientWinRate = totalProposals > 0 ? (wonProposals / totalProposals) * 100 : 0;

      const lastEngagement = client.last_engagement_date 
        ? new Date(client.last_engagement_date) 
        : null;
      
      const daysSinceEngagement = lastEngagement 
        ? Math.floor((Date.now() - lastEngagement.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const avgResponseTime = client.avg_response_time_hours || 0;
      // Fetching scores from healthScores to ensure consistency with overall health calc
      const healthScoreData = healthScores.find(h => h.client_id === client.id);
      const engagementScore = healthScoreData?.engagement_score || 0;


      // Recent activity analysis
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const recentEngagement = engagementMetrics.filter(m => 
        m.client_id === client.id && new Date(m.created_date) >= last30Days
      );

      const recentMeetings = meetings.filter(m => 
        m.client_id === client.id && new Date(m.scheduled_date) >= last30Days
      );

      // Calculate interaction frequency
      const totalInteractions = recentEngagement.length + recentMeetings.length;
      const interactionFrequency = totalInteractions / 30; // per day

      const healthScore = healthScores.find(h => h.client_id === client.id);

      // Build comprehensive AI prompt
      const prompt = `You are an expert in client relationship management and churn prediction using machine learning. Analyze this client's engagement data to predict churn risk and provide retention strategies.

**CLIENT PROFILE:**
- Client: ${client.client_name}
- Relationship Status: ${client.relationship_status}
- Industry: ${client.industry || 'Unknown'}
- Portal Access: ${client.portal_access_enabled ? 'Enabled' : 'Disabled'}

**ENGAGEMENT METRICS:**
- Current Engagement Score: ${engagementScore}/100
- Days Since Last Engagement: ${daysSinceEngagement}
- Average Response Time: ${avgResponseTime} hours
- Total Proposals Shared: ${totalProposals}
- Win Rate: ${clientWinRate.toFixed(1)}%
- Interaction Frequency (last 30 days): ${interactionFrequency.toFixed(2)} per day
- Recent Activities (last 30 days): ${recentEngagement.length}
- Recent Meetings (last 30 days): ${recentMeetings.length}
- Last Portal Access: ${client.last_portal_access ? moment(client.last_portal_access).fromNow() : 'Never'}
- Overall Health Score: ${healthScore?.overall_score || 'Not calculated'}
- Current Churn Risk: ${healthScore?.churn_risk || 'Unknown'}

**ENGAGEMENT BREAKDOWN (Last 30 Days):**
${recentEngagement.slice(0, 10).map(e => `- ${e.event_type}: ${e.time_spent_seconds ? Math.round(e.time_spent_seconds / 60) + ' min' : 'N/A'}`).join('\n')}

**HISTORICAL TREND:**
${healthScores.filter(h => h.client_id === client.id).sort((a,b) => moment(b.calculated_date).valueOf() - moment(a.calculated_date).valueOf()).slice(0, 5).map(h => `- ${moment(h.calculated_date).format('MM/DD/YYYY')}: Overall ${h.overall_score}/100, Churn Risk: ${h.churn_risk}`).join('\n')}

**YOUR TASK - ADVANCED CHURN PREDICTION:**

Using pattern analysis, behavioral modeling, and predictive algorithms:

1. Calculate **churn probability** (0-100%) for next 90 days
2. Assess **engagement patterns** and trajectory
3. Identify **warning signals** and behavioral changes
4. Compare to **healthy client baseline**
5. Predict **likely churn timeline** if at risk
6. Calculate **lifetime value at risk**
7. Provide **retention strategies** ranked by impact
8. Recommend **immediate interventions**

Return comprehensive JSON analysis with actionable insights.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            churn_probability: { type: "number", minimum: 0, maximum: 100 },
            churn_risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
            confidence_in_prediction: { type: "string", enum: ["high", "medium", "low"] },
            engagement_trend: { type: "string", enum: ["improving", "stable", "declining", "critical_decline"] },
            health_score: { type: "number", minimum: 0, maximum: 100 },
            engagement_patterns: {
              type: "object",
              properties: {
                portal_usage: { type: "string", enum: ["high", "medium", "low", "none"] },
                response_speed: { type: "string", enum: ["fast", "average", "slow", "very_slow"] },
                meeting_attendance: { type: "string", enum: ["excellent", "good", "fair", "poor"] },
                feedback_quality: { type: "string", enum: ["engaged", "moderate", "minimal", "none"] },
                content_interaction: { type: "string", enum: ["high", "medium", "low", "minimal"] }
              }
            },
            warning_signals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  signal_type: { type: "string" },
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  description: { type: "string" },
                  first_detected: { type: "string" },
                  impact_on_churn_probability: { type: "number" }
                }
              }
            },
            positive_signals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  signal_type: { type: "string" },
                  description: { type: "string" },
                  strength: { type: "string", enum: ["strong", "moderate", "weak"] }
                }
              }
            },
            predicted_churn_timeline: {
              type: "object",
              properties: {
                likely_churn_date: { type: "string" },
                days_until_churn: { type: "number" },
                critical_intervention_deadline: { type: "string" },
                reasoning: { type: "string" }
              }
            },
            retention_strategies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
                  strategy: { type: "string" },
                  expected_impact: { type: "string" },
                  churn_reduction_percentage: { type: "number" },
                  implementation_difficulty: { type: "string", enum: ["easy", "moderate", "difficult"] },
                  timeline: { type: "string" },
                  estimated_cost: { type: "string" }
                }
              }
            },
            lifetime_value_at_risk: {
              type: "object",
              properties: {
                estimated_ltv: { type: "number" },
                ltv_at_risk: { type: "number" },
                potential_revenue_loss: { type: "number" },
                calculation_basis: { type: "string" }
              }
            },
            comparison_to_healthy_clients: {
              type: "object",
              properties: {
                engagement_gap: { type: "string" },
                response_time_gap: { type: "string" },
                activity_gap: { type: "string" },
                key_differences: { type: "array", items: { type: "string" } }
              }
            },
            recommended_next_steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step_number: { type: "number" },
                  action: { type: "string" },
                  deadline: { type: "string" },
                  assigned_to: { type: "string" },
                  expected_outcome: { type: "string" }
                }
              }
            }
          },
          required: [
            "churn_probability",
            "churn_risk_level",
            "health_score",
            "warning_signals",
            "retention_strategies",
            "recommended_next_steps"
          ]
        }
      });

      setChurnPrediction(result);
      alert("✓ AI churn prediction complete!");

    } catch (err) {
      console.error("Error analyzing churn risk:", err);
      setError(err);
      alert("Error analyzing churn risk. Please check console for details.");
    } finally {
      setAnalyzingChurn(false);
    }
  };

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

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "$0";
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value?.toLocaleString() || 0}`;
  };

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
              // Only render clients for whom a health score has been calculated
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
                  onClick={() => {
                    setSelectedClient(client);
                    setChurnPrediction(null); // Clear AI prediction when selecting a new client
                    setError(null);
                  }}
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

            {clients.length > 0 && clients.filter(c => getHealthScore(c.id)).length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Heart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="font-medium mb-2">No health data yet</p>
                <p className="text-sm">Click "Recalculate All" to generate health scores</p>
              </div>
            )}
             {clients.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Heart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="font-medium mb-2">No clients available</p>
                <p className="text-sm">Please add clients to your organization to monitor their health.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Health View */}
      {detailHealth && selectedClient && (
        <div className="space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Health Details: {selectedClient.contact_name || selectedClient.client_name}
                  </CardTitle>
                  <CardDescription>
                    Last calculated {moment(detailHealth.calculated_date).fromNow()}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => runChurnPredictionAnalysis(selectedClient)}
                  disabled={analyzingChurn}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {analyzingChurn ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Churn Prediction
                    </>
                  )}
                </Button>
              </div>
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
                    {formatCurrency(detailHealth.lifetime_value)}
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

          {/* AI Churn Prediction */}
          {error && (
             <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Error retrieving AI churn prediction: {error.message || "An unknown error occurred."}
              </AlertDescription>
            </Alert>
          )}

          {churnPrediction && (
            <Card className={`border-2 shadow-xl ${
              churnPrediction.churn_risk_level === 'critical' ? 'border-red-500 bg-red-50' :
              churnPrediction.churn_risk_level === 'high' ? 'border-orange-500 bg-orange-50' :
              churnPrediction.churn_risk_level === 'medium' ? 'border-yellow-500 bg-yellow-50' :
              'border-green-500 bg-green-50'
            }`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  AI Churn Prediction Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-6 bg-white rounded-lg">
                  <p className={`text-5xl font-bold mb-2 ${
                    churnPrediction.churn_probability >= 70 ? 'text-red-600' :
                    churnPrediction.churn_probability >= 50 ? 'text-orange-600' :
                    churnPrediction.churn_probability >= 30 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {churnPrediction.churn_probability}%
                  </p>
                  <p className="text-sm text-slate-600 mb-3">Churn Probability (Next 90 Days)</p>
                  <div className="flex items-center justify-center gap-3">
                    <Badge className={cn("text-white text-base px-4 py-2",
                      churnPrediction.churn_risk_level === 'critical' ? 'bg-red-600' :
                      churnPrediction.churn_risk_level === 'high' ? 'bg-orange-600' :
                      churnPrediction.churn_risk_level === 'medium' ? 'bg-yellow-600' :
                      'bg-green-600'
                    )}>
                      {churnPrediction.churn_risk_level.toUpperCase()} RISK
                    </Badge>
                    {churnPrediction.confidence_in_prediction && (
                      <Badge className={cn(
                        churnPrediction.confidence_in_prediction === 'high' ? 'bg-blue-100 text-blue-800' :
                        churnPrediction.confidence_in_prediction === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      )}>
                        {churnPrediction.confidence_in_prediction} confidence
                      </Badge>
                    )}
                  </div>
                </div>

                {churnPrediction.warning_signals && churnPrediction.warning_signals.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-900 mb-3">Warning Signals</h4>
                    <div className="space-y-2">
                      {churnPrediction.warning_signals.map((signal, idx) => (
                        <div key={idx} className="p-3 bg-red-100 border border-red-300 rounded-lg">
                          <div className="flex items-start justify-between mb-1">
                            <h5 className="font-semibold text-red-900">{signal.signal_type}</h5>
                            <Badge className={cn("text-white text-xs",
                              signal.severity === 'critical' ? 'bg-red-600' :
                              signal.severity === 'high' ? 'bg-orange-600' :
                              'bg-yellow-600'
                            )}>
                              {signal.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-700">{signal.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {churnPrediction.retention_strategies && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Retention Strategies</h4>
                    <div className="space-y-3">
                      {churnPrediction.retention_strategies.slice(0, 5).map((strategy, idx) => (
                        <div key={idx} className="p-4 border-2 rounded-lg bg-white">
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={cn("text-white",
                                  strategy.priority === 'urgent' ? 'bg-red-600' :
                                  strategy.priority === 'high' ? 'bg-orange-600' :
                                  'bg-yellow-600'
                                )}>
                                  {strategy.priority.toUpperCase()}
                                </Badge>
                                {strategy.churn_reduction_percentage && (
                                  <Badge className="bg-green-100 text-green-800">
                                    -{strategy.churn_reduction_percentage}% Churn Risk
                                  </Badge>
                                )}
                              </div>
                              <p className="font-semibold text-slate-900 mb-1">{strategy.strategy}</p>
                              <p className="text-sm text-slate-600">{strategy.expected_impact}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {churnPrediction.lifetime_value_at_risk && (
                  <Card className="border-purple-200 bg-purple-50">
                    <CardHeader>
                      <CardTitle className="text-lg">Financial Impact</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Estimated LTV</p>
                          <p className="text-xl font-bold text-purple-600">
                            {formatCurrency(churnPrediction.lifetime_value_at_risk.estimated_ltv)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 mb-1">At Risk</p>
                          <p className="text-xl font-bold text-red-600">
                            {formatCurrency(churnPrediction.lifetime_value_at_risk.ltv_at_risk)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Potential Loss</p>
                          <p className="text-xl font-bold text-orange-600">
                            {formatCurrency(churnPrediction.lifetime_value_at_risk.potential_revenue_loss)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
