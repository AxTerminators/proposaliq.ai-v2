
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  ChevronRight,
  RefreshCw,
  Brain,
  Loader2,
  AlertCircle,
  CheckCircle,
  Zap,
  Eye,
  BarChart3,
  Calendar,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";
import moment from "moment";

export default function AIInsightsCard({ proposals = [], opportunities = [], user, organization }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [error, setError] = useState(null);

  const generateBasicInsights = useCallback(() => {
    setLoading(true);
    const newInsights = [];

    // High-confidence stale proposals
    const highConfidenceStale = proposals.filter(p => {
      if (!p || !p.ai_confidence_score) return false;
      if (!['in_progress', 'draft'].includes(p.status)) return false;

      let confidence;
      try {
        confidence = JSON.parse(p.ai_confidence_score).overall_score;
      } catch (e) {
        confidence = 0;
      }

      if (confidence < 70) return false;

      const lastActivity = p.updated_date ? new Date(p.updated_date) : new Date(p.created_date);
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      return daysSinceActivity > 7;
    });

    if (highConfidenceStale.length > 0) {
      newInsights.push({
        type: 'opportunity',
        icon: TrendingUp,
        title: `${highConfidenceStale.length} High-Confidence Proposal${highConfidenceStale.length > 1 ? 's' : ''} Needs Attention`,
        description: `You have ${highConfidenceStale.length} proposal${highConfidenceStale.length > 1 ? 's' : ''} with high win probability (>70%) but no recent activity.`,
        actionText: 'Review Now',
        actionUrl: createPageUrl("Pipeline"),
        color: "green",
        priority: 'high'
      });
    }

    // Stale proposals
    const staleProposals = proposals.filter(p => {
      if (!p || !['in_progress', 'draft'].includes(p.status)) return false;
      if (!p.updated_date) return false;
      const daysSinceUpdate = Math.floor(
        (new Date() - new Date(p.updated_date)) / (1000 * 60 * 60 * 24)
      );
      return daysSinceUpdate > 7;
    });

    if (staleProposals.length > 0) {
      newInsights.push({
        type: "warning",
        icon: AlertTriangle,
        title: "Proposals Need Attention",
        description: `${staleProposals.length} proposals haven't been updated in over a week`,
        actionText: "Review Now",
        actionUrl: createPageUrl("Pipeline"),
        color: "amber",
        priority: "medium"
      });
    }

    // High-match opportunities
    const highMatchOpps = opportunities.filter(o => o && o.match_score >= 80);
    if (highMatchOpps.length > 0) {
      newInsights.push({
        type: "opportunity",
        icon: Target,
        title: "High-Match Opportunities",
        description: `${highMatchOpps.length} new opportunities match your profile above 80%`,
        actionText: "View Opportunities",
        actionUrl: createPageUrl("OpportunityFinder"),
        color: "green",
        priority: "high"
      });
    }

    // Win rate trend
    const recentProposals = proposals.filter(p => {
      if (!p || !['won', 'lost'].includes(p.status) || !p.updated_date) return false;
      const monthsAgo = (new Date() - new Date(p.updated_date)) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo <= 3;
    });

    const recentWon = recentProposals.filter(p => p.status === 'won').length;
    const recentLost = recentProposals.filter(p => p.status === 'lost').length;

    if (recentWon + recentLost >= 3) {
      const recentWinRate = (recentWon / (recentWon + recentLost)) * 100;
      const wonProposalsOverall = proposals.filter(p => p?.status === 'won').length;
      const allDecidedOverall = proposals.filter(p => p && ['won', 'lost'].includes(p.status)).length;
      const overallWinRate = allDecidedOverall > 0 ? (wonProposalsOverall / allDecidedOverall) * 100 : 0;

      if (recentWinRate > overallWinRate + 10) {
        newInsights.push({
          type: "success",
          icon: TrendingUp,
          title: "Win Rate Improving",
          description: `Recent win rate (${recentWinRate.toFixed(0)}%) is ${(recentWinRate - overallWinRate).toFixed(0)}% above average`,
          actionText: "View Analytics",
          actionUrl: createPageUrl("Analytics"),
          color: "green",
          priority: "medium"
        });
      } else if (recentWinRate < overallWinRate - 10) {
        newInsights.push({
          type: "alert",
          icon: TrendingDown,
          title: "Win Rate Declining",
          description: `Recent win rate (${recentWinRate.toFixed(0)}%) is below your average. Consider strategy review.`,
          actionText: "Analyze",
          actionUrl: createPageUrl("Analytics"),
          color: "red",
          priority: "high"
        });
      }
    }

    // Upcoming deadlines
    const upcomingDeadlines = proposals.filter(p => {
      if (!p || !p.due_date || !['in_progress', 'draft'].includes(p.status)) return false;
      const daysUntil = Math.floor(
        (new Date(p.due_date) - new Date()) / (1000 * 60 * 60 * 24)
      );
      return daysUntil >= 0 && daysUntil <= 7;
    });

    if (upcomingDeadlines.length > 0) {
      newInsights.push({
        type: "info",
        icon: Lightbulb,
        title: "Upcoming Deadlines",
        description: `${upcomingDeadlines.length} proposals due within 7 days`,
        actionText: "View Calendar",
        actionUrl: createPageUrl("Calendar"),
        color: "blue",
        priority: "medium"
      });
    }

    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    newInsights.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

    if (newInsights.length === 0) {
      newInsights.push({
        type: "success",
        icon: Sparkles,
        title: "Everything Looks Good",
        description: "Your proposals are on track. Keep up the great work!",
        actionText: "View Dashboard",
        actionUrl: createPageUrl("Dashboard"),
        color: "blue",
        priority: "low"
      });
    }

    setInsights(newInsights.slice(0, 3));
    setLoading(false);
  }, [proposals, opportunities]);

  // FIXED: Remove generateBasicInsights from dependency array to prevent infinite loop
  useEffect(() => {
    if (proposals.length > 0 || opportunities.length > 0) {
      generateBasicInsights();
    } else {
      setInsights([{
        type: "info",
        icon: Sparkles,
        title: "No Data Yet",
        description: "Start adding proposals to see AI insights.",
        actionText: "Get Started",
        actionUrl: createPageUrl("Dashboard"),
        color: "blue",
        priority: "low"
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, opportunities]); // Only depend on props, not the callback itself

  const runAIInsightAnalysis = async () => {
    if (proposals.length < 3) {
      alert("Need at least 3 proposals to run AI anomaly detection and predictive insights.");
      return;
    }

    setAiAnalyzing(true);
    setError(null);

    try {
      // Prepare comprehensive data analysis
      const recentActivity = proposals.map(p => ({
        id: p.id,
        name: p.proposal_name,
        status: p.status,
        created: moment(p.created_date).format('YYYY-MM-DD'),
        updated: moment(p.updated_date).format('YYYY-MM-DD'),
        days_since_update: moment().diff(moment(p.updated_date), 'days'),
        contract_value: p.contract_value || 0,
        due_date: p.due_date,
        days_until_due: p.due_date ? moment(p.due_date).diff(moment(), 'days') : null,
        phase: p.current_phase,
        project_type: p.project_type,
        agency: p.agency_name
      }));

      const statusDistribution = proposals.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});

      const wonProposals = proposals.filter(p => p.status === 'won');
      const lostProposals = proposals.filter(p => p.status === 'lost');
      const avgWinValue = wonProposals.length > 0 
        ? wonProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0) / wonProposals.length
        : 0;

      // Calculate velocity
      const last30Days = proposals.filter(p => 
        moment(p.created_date).isAfter(moment().subtract(30, 'days'))
      );
      const previous30Days = proposals.filter(p => 
        moment(p.created_date).isBetween(moment().subtract(60, 'days'), moment().subtract(30, 'days'))
      );

      const analysisPrompt = `You are an expert business intelligence analyst specializing in proposal management and predictive analytics. Analyze this data to provide advanced insights using anomaly detection, trend analysis, and predictive modeling.

**PROPOSAL PORTFOLIO (${proposals.length} total):**

Status Distribution:
${Object.entries(statusDistribution).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

Recent Activity (Last 30 days): ${last30Days.length} proposals
Previous Period (30-60 days ago): ${previous30Days.length} proposals
Velocity Change: ${last30Days.length - previous30Days.length} proposals

Won: ${wonProposals.length} (Avg Value: $${(avgWinValue / 1000000).toFixed(1)}M)
Lost: ${lostProposals.length}
Win Rate: ${proposals.filter(p => ['won', 'lost'].includes(p.status)).length > 0 
  ? ((wonProposals.length / proposals.filter(p => ['won', 'lost'].includes(p.status)).length) * 100).toFixed(0) 
  : 0}%

**DETAILED PROPOSAL DATA:**
${recentActivity.slice(0, 20).map(p => `
- ${p.name} | ${p.status} | Created: ${p.created} | Updated: ${p.updated} (${p.days_since_update} days ago)
  Value: $${(p.contract_value / 1000000).toFixed(1)}M | ${p.days_until_due !== null ? `Due in ${p.days_until_due} days` : 'No due date'}
  Type: ${p.project_type} | Agency: ${p.agency} | Phase: ${p.phase}
`).join('\n')}

**OPPORTUNITY PIPELINE:**
${opportunities.length > 0 ? `
Total Opportunities: ${opportunities.length}
Strong Matches (70%+): ${opportunities.filter(o => o.match_score >= 70).length}
AI Analyzed: ${opportunities.filter(o => o.ai_analysis).length}
Avg Match Score: ${opportunities.length > 0 ? (opportunities.reduce((sum, o) => sum + (o.match_score || 0), 0) / opportunities.length).toFixed(0) : 0}%
` : 'No opportunities tracked'}

**YOUR TASK - ADVANCED AI INSIGHTS:**

Using anomaly detection, predictive modeling, and trend analysis:

1. **Anomaly Detection**: 
   - Identify unusual patterns (sudden drop in activity, unusual status durations, value outliers)
   - Flag proposals behaving differently than historical patterns
   - Detect workflow bottlenecks

2. **Predictive Insights**:
   - Revenue forecasting for next 30/60/90 days
   - Win probability trends
   - Pipeline health predictions
   - Risk of proposal abandonment

3. **Strategic Recommendations**:
   - High-priority actions to improve performance
   - Resource allocation suggestions
   - Process improvement opportunities

4. **Trend Analysis**:
   - Win rate trajectory
   - Value trends
   - Activity velocity changes
   - Agency/type performance patterns

5. **Opportunity Intelligence**:
   - Best opportunities to pursue
   - Market gaps or oversaturation

Return 5-8 high-value, actionable insights with confidence scores.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            critical_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  insight_id: { type: "string" },
                  insight_type: { 
                    type: "string", 
                    enum: ["anomaly", "prediction", "recommendation", "trend", "opportunity", "risk", "celebration"]
                  },
                  priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  detailed_analysis: { type: "string" },
                  confidence_score: { type: "number", minimum: 0, maximum: 100 },
                  impact_level: { type: "string", enum: ["high", "medium", "low"] },
                  actionable_steps: { type: "array", items: { type: "string" } },
                  estimated_impact: { type: "string" },
                  time_sensitivity: { type: "string", enum: ["immediate", "this_week", "this_month", "no_rush"] },
                  related_proposals: { type: "array", items: { type: "string" } },
                  metrics: {
                    type: "object",
                    properties: {
                      metric_name: { type: "string" },
                      current_value: { type: "number" },
                      predicted_value: { type: "number" },
                      change_percentage: { type: "number" }
                    }
                  }
                },
                required: ["insight_type", "priority", "title", "description", "confidence_score"]
              }
            },
            anomalies_detected: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  anomaly_type: { type: "string" },
                  description: { type: "string" },
                  affected_entities: { type: "array", items: { type: "string" } },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] }
                }
              }
            },
            predictions: {
              type: "object",
              properties: {
                revenue_forecast_30_days: { type: "number" },
                revenue_forecast_60_days: { type: "number" },
                revenue_forecast_90_days: { type: "number" },
                expected_wins_30_days: { type: "number" },
                expected_losses_30_days: { type: "number" },
                pipeline_health_score: { type: "number", minimum: 0, maximum: 100 },
                pipeline_trend: { type: "string", enum: ["accelerating", "stable", "slowing", "concerning"] },
                bottleneck_areas: { type: "array", items: { type: "string" } }
              }
            },
            strategic_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recommendation: { type: "string" },
                  category: { type: "string", enum: ["resource_allocation", "process_improvement", "strategy", "training", "tools"] },
                  expected_roi: { type: "string" },
                  implementation_effort: { type: "string", enum: ["low", "medium", "high"] }
                }
              }
            },
            quick_wins: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  expected_benefit: { type: "string" },
                  time_to_implement: { type: "string" }
                }
              }
            }
          },
          required: ["critical_insights", "predictions"]
        }
      });

      setAiInsights(result);
      
      // Convert AI insights to display format
      const aiGeneratedInsights = result.critical_insights?.map(insight => ({
        type: insight.insight_type,
        icon: getInsightIcon(insight.insight_type),
        title: insight.title,
        description: insight.description,
        actionText: insight.actionable_steps?.[0] || "Learn More",
        actionUrl: createPageUrl("Analytics"),
        color: getInsightColor(insight.priority),
        priority: insight.priority === 'critical' ? 'high' : insight.priority,
        aiGenerated: true,
        confidence: insight.confidence_score,
        detailedAnalysis: insight.detailed_analysis,
        metrics: insight.metrics
      })) || [];

      setInsights(aiGeneratedInsights.slice(0, 5));
      alert(`✓ AI insights generated! Found ${result.critical_insights?.length || 0} actionable insights.`);

    } catch (err) {
      console.error("Error running AI analysis:", err);
      setError(err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'anomaly': return AlertCircle;
      case 'prediction': return Brain;
      case 'recommendation': return Lightbulb;
      case 'trend': return BarChart3;
      case 'opportunity': return Target;
      case 'risk': return AlertTriangle;
      case 'celebration': return Sparkles;
      default: return Eye;
    }
  };

  const getInsightColor = (priority) => {
    switch (priority) {
      case 'critical': return 'red';
      case 'high': return 'amber';
      case 'medium': return 'blue';
      default: return 'green';
    }
  };

  const colorMap = {
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      iconBg: "bg-amber-100"
    },
    green: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      iconBg: "bg-green-100"
    },
    red: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      iconBg: "bg-red-100"
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      iconBg: "bg-blue-100"
    }
  };

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI Insights
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={generateBasicInsights}
              disabled={loading}
              title="Refresh basic insights"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runAIInsightAnalysis}
              disabled={aiAnalyzing || proposals.length < 3}
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              {aiAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-1" />
                  AI Deep Dive
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {proposals.length < 3 && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              Need at least 3 proposals for AI-powered anomaly detection and predictions.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-sm">{error.message}</AlertDescription>
          </Alert>
        )}

        {/* AI Predictions Summary */}
        {aiInsights?.predictions && (
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg mb-3">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-purple-900">AI Predictive Analytics</h4>
              <Badge className="bg-purple-600 text-white text-xs">
                {aiInsights.predictions.pipeline_health_score}% health
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-white p-3 rounded-lg text-center">
                <DollarSign className="w-4 h-4 mx-auto mb-1 text-green-600" />
                <div className="text-lg font-bold text-slate-900">
                  ${(aiInsights.predictions.revenue_forecast_30_days / 1000000).toFixed(1)}M
                </div>
                <div className="text-xs text-slate-600">30-Day Forecast</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center">
                <Target className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                <div className="text-lg font-bold text-slate-900">
                  {aiInsights.predictions.expected_wins_30_days}
                </div>
                <div className="text-xs text-slate-600">Expected Wins</div>
              </div>
              <div className="bg-white p-3 rounded-lg text-center">
                <TrendingUp className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                <div className="text-lg font-bold text-purple-600 capitalize">
                  {aiInsights.predictions.pipeline_trend}
                </div>
                <div className="text-xs text-slate-600">Trend</div>
              </div>
            </div>

            {aiInsights.predictions.bottleneck_areas?.length > 0 && (
              <div className="text-xs text-purple-800">
                <strong>Bottlenecks:</strong> {aiInsights.predictions.bottleneck_areas.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Anomalies */}
        {aiInsights?.anomalies_detected && aiInsights.anomalies_detected.length > 0 && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-900 text-sm">
              <strong>Anomalies Detected:</strong> {aiInsights.anomalies_detected[0].description}
              {aiInsights.anomalies_detected.length > 1 && ` (+${aiInsights.anomalies_detected.length - 1} more)`}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Insights */}
        {insights.map((insight, idx) => {
          const colors = colorMap[insight.color];
          return (
            <div
              key={idx}
              className={cn(
                "p-4 rounded-lg border-2 transition-all hover:shadow-md relative",
                colors.bg,
                colors.border
              )}
            >
              {insight.aiGenerated && (
                <Badge className="absolute top-2 right-2 bg-purple-600 text-white text-xs">
                  <Brain className="w-3 h-3 mr-1" />
                  AI
                </Badge>
              )}
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colors.iconBg)}>
                  <insight.icon className={cn("w-5 h-5", colors.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn("font-semibold mb-1", colors.text)}>
                    {insight.title}
                  </h4>
                  <p className="text-sm text-slate-600 mb-2">{insight.description}</p>
                  
                  {insight.confidence && (
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>AI Confidence</span>
                        <span>{insight.confidence}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div 
                          className="bg-purple-600 h-1.5 rounded-full"
                          style={{ width: `${insight.confidence}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {insight.metrics && (
                    <div className="text-xs text-slate-700 mb-2 p-2 bg-white/50 rounded">
                      <strong>{insight.metrics.metric_name}:</strong> {insight.metrics.current_value} → {insight.metrics.predicted_value}
                      <Badge className="ml-2 text-xs" variant={insight.metrics.change_percentage > 0 ? "default" : "destructive"}>
                        {insight.metrics.change_percentage > 0 ? '+' : ''}{insight.metrics.change_percentage}%
                      </Badge>
                    </div>
                  )}

                  <Button
                    variant="link"
                    size="sm"
                    className={cn("p-0 h-auto font-medium", colors.text)}
                    asChild
                  >
                    <a href={insight.actionUrl}>
                      {insight.actionText}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Strategic Recommendations */}
        {aiInsights?.strategic_recommendations && aiInsights.strategic_recommendations.length > 0 && (
          <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-lg">
            <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Strategic Recommendations
            </h5>
            <ul className="space-y-2">
              {aiInsights.strategic_recommendations.slice(0, 3).map((rec, idx) => (
                <li key={idx} className="text-sm">
                  <div className="flex items-start gap-2">
                    <Badge className={cn(
                      "text-white capitalize flex-shrink-0",
                      rec.implementation_effort === 'low' ? 'bg-green-600' :
                      rec.implementation_effort === 'medium' ? 'bg-yellow-600' :
                      'bg-red-600'
                    )}>
                      {rec.implementation_effort}
                    </Badge>
                    <div className="flex-1">
                      <div className="text-slate-800 font-medium">{rec.recommendation}</div>
                      <div className="text-xs text-slate-600">ROI: {rec.expected_roi}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Wins */}
        {aiInsights?.quick_wins && aiInsights.quick_wins.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <h5 className="font-semibold text-green-900 mb-2 text-sm flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Quick Wins
            </h5>
            <ul className="space-y-1">
              {aiInsights.quick_wins.slice(0, 2).map((win, idx) => (
                <li key={idx} className="text-xs text-green-800 flex items-start gap-2">
                  <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium">{win.action}</span>
                    <span className="text-green-700"> • {win.time_to_implement}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
