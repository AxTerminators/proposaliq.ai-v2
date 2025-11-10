
import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Clock,
  MessageSquare,
  FileText,
  Calendar,
  Target,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function EnhancedClientHealthMonitor({ client, organization }) {
  const queryClient = useQueryClient();

  // FIXED: Add safety checks
  if (!client || !organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading health monitor...</p>
        </div>
      </div>
    );
  }

  // FIXED: Add error handling and safer queries
  const { data: proposals = [] } = useQuery({
    queryKey: ['health-proposals', client?.id, organization?.id],
    queryFn: async () => {
      if (!organization?.id || !client?.id) return [];
      const allProposals = await base44.entities.Proposal.filter({ organization_id: organization.id });
      return allProposals.filter(p => 
        p?.shared_with_client_ids && Array.isArray(p.shared_with_client_ids) && p.shared_with_client_ids.includes(client.id)
      );
    },
    enabled: !!organization?.id && !!client?.id,
    initialData: [],
    retry: 1
  });

  const { data: engagementMetrics = [] } = useQuery({
    queryKey: ['health-engagement', client?.id, organization?.id],
    queryFn: () => {
      if (!organization?.id || !client?.id) return [];
      return base44.entities.ClientEngagementMetric.filter({
        client_id: client.id,
        organization_id: organization.id
      }, '-created_date', 500)
    },
    enabled: !!organization?.id && !!client?.id,
    initialData: [],
    retry: 1
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['health-meetings', client?.id, organization?.id],
    queryFn: () => {
      if (!organization?.id || !client?.id) return [];
      return base44.entities.ClientMeeting.filter({
        client_id: client.id,
        organization_id: organization.id
      });
    },
    enabled: !!organization?.id && !!client?.id,
    initialData: [],
    retry: 1
  });

  const { data: feedbacks = [] } = useQuery({
    queryKey: ['health-feedback', client?.id, organization?.id],
    queryFn: () => {
      if (!organization?.id || !client?.id) return [];
      return base44.entities.Feedback.filter({
        client_id: client.id,
        organization_id: organization.id
      });
    },
    enabled: !!organization?.id && !!client?.id,
    initialData: [],
    retry: 1
  });

  // Calculate comprehensive health metrics
  const healthMetrics = useMemo(() => {
    const now = moment();
    const last30Days = moment().subtract(30, 'days');
    
    // Engagement Score (0-100)
    const recentEngagement = engagementMetrics.filter(m => 
      moment(m.created_date).isAfter(last30Days)
    );
    const engagementScore = Math.min(100, (recentEngagement.length / 50) * 100);
    
    // Activity Score (0-100) - based on last interaction
    const lastInteraction = client.last_engagement_date 
      ? moment(client.last_engagement_date)
      : null;
    const daysSinceInteraction = lastInteraction ? now.diff(lastInteraction, 'days') : 999;
    const activityScore = Math.max(0, 100 - (daysSinceInteraction * 3));
    
    // Response Time Score (0-100) - faster is better
    const avgResponseTime = client.avg_response_time_hours || 48;
    const responseTimeScore = Math.max(0, 100 - (avgResponseTime / 2));
    
    // Satisfaction Score (0-100) - based on feedback
    const avgSatisfaction = feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + (f.user_satisfaction_rating || 3), 0) / feedbacks.length
      : 3;
    const satisfactionScore = (avgSatisfaction / 5) * 100;
    
    // Overall Health Score
    const overallScore = Math.round(
      (engagementScore * 0.3) +
      (activityScore * 0.3) +
      (responseTimeScore * 0.2) +
      (satisfactionScore * 0.2)
    );
    
    // Determine trend
    const previousScore = client.engagement_score || 50;
    const trend = overallScore > previousScore + 5 ? 'improving' :
                  overallScore < previousScore - 5 ? 'declining' : 'stable';
    
    // Churn risk calculation
    let churnRisk = 'low';
    let churnProbability = 0;
    
    if (daysSinceInteraction > 30) {
      churnRisk = 'critical';
      churnProbability = 80;
    } else if (daysSinceInteraction > 14) {
      churnRisk = 'high';
      churnProbability = 50;
    } else if (engagementScore < 30) {
      churnRisk = 'medium';
      churnProbability = 25;
    } else {
      churnProbability = 10;
    }
    
    // Identify risk factors
    const riskFactors = [];
    if (daysSinceInteraction > 14) {
      riskFactors.push('No recent activity - last engagement over 2 weeks ago');
    }
    if (engagementScore < 30) {
      riskFactors.push('Low engagement - minimal interaction with proposals');
    }
    if (avgResponseTime > 72) {
      riskFactors.push('Slow response times - averaging over 3 days');
    }
    if (proposals.filter(p => p.status === 'client_review').length > 3) {
      riskFactors.push('Multiple pending reviews - may be overwhelmed');
    }
    if (avgSatisfaction < 3) {
      riskFactors.push('Below average satisfaction scores');
    }
    
    // Generate recommendations
    const recommendations = [];
    if (daysSinceInteraction > 7) {
      recommendations.push('Schedule a check-in call to re-engage');
    }
    if (engagementScore < 50) {
      recommendations.push('Share more interactive content or simplified summaries');
    }
    if (avgResponseTime > 48) {
      recommendations.push('Send gentle reminders about pending items');
    }
    if (proposals.filter(p => p.status === 'client_review').length > 2) {
      recommendations.push('Offer to discuss proposals in a consolidated meeting');
    }
    if (meetings.filter(m => m.status === 'scheduled').length === 0) {
      recommendations.push('Propose a regular touchpoint meeting schedule');
    }
    
    // Lifecycle metrics
    const totalProposals = proposals.length;
    const wonProposals = proposals.filter(p => p.status === 'client_accepted').length;
    const winRate = totalProposals > 0 ? (wonProposals / totalProposals) * 100 : 0;
    const lifetimeValue = proposals
      .filter(p => p.status === 'client_accepted')
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);
    
    return {
      overallScore,
      engagementScore,
      activityScore,
      responseTimeScore,
      satisfactionScore,
      trend,
      churnRisk,
      churnProbability,
      riskFactors,
      recommendations,
      daysSinceInteraction,
      totalProposals,
      wonProposals,
      winRate,
      lifetimeValue
    };
  }, [client, proposals, engagementMetrics, meetings, feedbacks]);

  // Update health score mutation
  const updateHealthScoreMutation = useMutation({
    mutationFn: async () => {
      if (!client?.id || !organization?.id) throw new Error("Client or Organization ID is missing.");
      const existingScores = await base44.entities.ClientHealthScore.filter({
        client_id: client.id
      });
      
      const scoreData = {
        client_id: client.id,
        organization_id: organization.id,
        overall_score: healthMetrics.overallScore,
        engagement_score: healthMetrics.engagementScore,
        satisfaction_score: healthMetrics.satisfactionScore,
        activity_score: healthMetrics.activityScore,
        response_time_score: healthMetrics.responseTimeScore,
        churn_risk: healthMetrics.churnRisk,
        churn_probability: healthMetrics.churnProbability,
        trend: healthMetrics.trend,
        last_interaction: client.last_engagement_date,
        days_since_interaction: healthMetrics.daysSinceInteraction,
        total_proposals: healthMetrics.totalProposals,
        proposals_won: healthMetrics.wonProposals,
        win_rate: healthMetrics.winRate,
        lifetime_value: healthMetrics.lifetimeValue,
        risk_factors: healthMetrics.riskFactors,
        recommended_actions: healthMetrics.recommendations,
        calculated_date: new Date().toISOString()
      };
      
      if (existingScores.length > 0) {
        return base44.entities.ClientHealthScore.update(existingScores[0].id, scoreData);
      } else {
        return base44.entities.ClientHealthScore.create(scoreData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-health-scores'] });
    },
  });

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 70) return 'bg-green-100';
    if (score >= 40) return 'bg-amber-100';
    return 'bg-red-100';
  };

  const getRiskColor = (risk) => {
    const colors = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700'
    };
    return colors[risk] || colors.low;
  };

  const TrendIcon = healthMetrics.trend === 'improving' ? TrendingUp :
                    healthMetrics.trend === 'declining' ? TrendingDown : Activity;

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-600" />
                Client Health Score
              </CardTitle>
              <CardDescription>
                Comprehensive health assessment based on engagement, activity, and satisfaction
              </CardDescription>
            </div>
            <Button
              onClick={() => updateHealthScoreMutation.mutate()}
              disabled={updateHealthScoreMutation.isPending}
              variant="outline"
              size="sm"
            >
              <Zap className="w-4 h-4 mr-2" />
              {updateHealthScoreMutation.isPending ? 'Updating...' : 'Recalculate'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-shrink-0">
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold",
                getScoreBgColor(healthMetrics.overallScore)
              )}>
                <span className={getScoreColor(healthMetrics.overallScore)}>
                  {healthMetrics.overallScore}
                </span>
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendIcon className={cn(
                    "w-5 h-5",
                    healthMetrics.trend === 'improving' ? 'text-green-600' :
                    healthMetrics.trend === 'declining' ? 'text-red-600' : 'text-slate-600'
                  )} />
                  <span className="text-sm font-medium text-slate-700">
                    Trend: <span className="capitalize">{healthMetrics.trend}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getRiskColor(healthMetrics.churnRisk)}>
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {healthMetrics.churnRisk.toUpperCase()} Risk
                  </Badge>
                  <span className="text-sm text-slate-600">
                    {healthMetrics.churnProbability}% churn probability
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">Engagement</p>
                  <Progress value={healthMetrics.engagementScore} className="h-2" />
                  <p className="text-xs text-slate-500 mt-1">{healthMetrics.engagementScore.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Activity</p>
                  <Progress value={healthMetrics.activityScore} className="h-2" />
                  <p className="text-xs text-slate-500 mt-1">{healthMetrics.activityScore.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Response Time</p>
                  <Progress value={healthMetrics.responseTimeScore} className="h-2" />
                  <p className="text-xs text-slate-500 mt-1">{healthMetrics.responseTimeScore.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Satisfaction</p>
                  <Progress value={healthMetrics.satisfactionScore} className="h-2" />
                  <p className="text-xs text-slate-500 mt-1">{healthMetrics.satisfactionScore.toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Factors & Recommendations */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Risk Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthMetrics.riskFactors.length > 0 ? (
              <div className="space-y-2">
                {healthMetrics.riskFactors.map((risk, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-900">{risk}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-700">No significant risk factors identified</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <Target className="w-5 h-5" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthMetrics.recommendations.length > 0 ? (
              <div className="space-y-2">
                {healthMetrics.recommendations.map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-900">{rec}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-700">Client relationship is healthy - maintain current engagement</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle Metrics */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Client Lifecycle Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <FileText className="w-8 h-8 text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{healthMetrics.totalProposals}</p>
              <p className="text-sm text-slate-600">Total Proposals</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <CheckCircle2 className="w-8 h-8 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{healthMetrics.wonProposals}</p>
              <p className="text-sm text-slate-600">Proposals Won</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{healthMetrics.winRate.toFixed(0)}%</p>
              <p className="text-sm text-slate-600">Win Rate</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
              <Target className="w-8 h-8 text-amber-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900">
                ${(healthMetrics.lifetimeValue / 1000000).toFixed(2)}M
              </p>
              <p className="text-sm text-slate-600">Lifetime Value</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
