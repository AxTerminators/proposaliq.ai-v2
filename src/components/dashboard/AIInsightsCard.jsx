
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Eye,
  Clock,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";
import moment from "moment";

export default function AIInsightsCard({ proposals = [], opportunities = [], user, organization }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningDeepAnalysis, setRunningDeepAnalysis] = useState(false);
  const [deepInsights, setDeepInsights] = useState(null);

  // Load activity logs for anomaly detection
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activity-insights', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const logs = await base44.entities.ActivityLog.list('-created_date', 200);
      return logs.filter(log => proposals.some(p => p.id === log.proposal_id));
    },
    enabled: !!organization?.id && proposals.length > 0,
  });

  // Trigger insight generation when proposals or opportunities data changes
  useEffect(() => {
    // Only generate if there's data to analyze
    if (proposals.length > 0 || opportunities.length > 0) {
      generateInsights();
    } else {
      // If no data, display a default "get started" insight
      setInsights([{
        type: "info",
        icon: Sparkles,
        title: "No Data Yet",
        description: "Start adding proposals to see AI insights.",
        actionText: "Get Started",
        actionUrl: createPageUrl("Dashboard"), // Link to a general dashboard or getting started guide
        color: "blue",
        priority: "low"
      }]);
    }
  }, [proposals, opportunities]);

  const runDeepAnomalyDetection = async () => {
    if (proposals.length < 5 || activityLogs.length < 50) {
      alert("Need at least 5 proposals and 50 activities for deep analysis");
      return;
    }

    setRunningDeepAnalysis(true);

    try {
      // Prepare comprehensive data for analysis
      const proposalsByStatus = proposals.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});

      const avgTimeToStatus = {};
      proposals.filter(p => ['submitted', 'won', 'lost'].includes(p.status)).forEach(p => {
        const days = moment(p.updated_date).diff(moment(p.created_date), 'days');
        avgTimeToStatus[p.status] = (avgTimeToStatus[p.status] || []);
        avgTimeToStatus[p.status].push(days);
      });

      const analysisPrompt = `You are an expert data scientist specializing in proposal management analytics. Perform deep anomaly detection and predictive analysis on this data.

**PROPOSAL PORTFOLIO (${proposals.length} total):**
${Object.entries(proposalsByStatus).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

**TIME-TO-COMPLETION ANALYSIS:**
${Object.entries(avgTimeToStatus).map(([status, days]) => {
  const avg = days.reduce((a, b) => a + b, 0) / days.length;
  return `- ${status}: avg ${avg.toFixed(0)} days (range: ${Math.min(...days)}-${Math.max(...days)})`;
}).join('\n')}

**RECENT ACTIVITY PATTERNS (${activityLogs.length} actions):**
${activityLogs.slice(0, 20).map(log => 
  `- ${moment(log.created_date).format('MMM D')}: ${log.action_type} by ${log.user_email}`
).join('\n')}

**PROPOSAL HEALTH INDICATORS:**
${proposals.slice(0, 10).map(p => {
  const age = moment().diff(moment(p.created_date), 'days');
  const staleness = moment().diff(moment(p.updated_date), 'days');
  return `
- ${p.proposal_name}:
  Status: ${p.status} | Age: ${age}d | Last update: ${staleness}d ago
  Value: $${((p.contract_value || 0) / 1000000).toFixed(1)}M
`;
}).join('\n')}

**YOUR TASK - ADVANCED ANALYTICS:**

1.  **Anomaly Detection**: Identify unusual patterns, outliers, and concerning trends

2.  **Predictive Insights**: Forecast risks and opportunities

3.  **Performance Benchmarking**: Compare against expected performance

4.  **Hidden Patterns**: Discover non-obvious insights

5.  **Actionable Recommendations**: Specific actions to improve outcomes

Return comprehensive intelligence with high predictive value.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            anomalies_detected: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  anomaly_type: { type: "string", enum: ["outlier", "trend", "pattern_break", "performance_gap", "bottleneck"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["info", "warning", "critical"] },
                  affected_proposals: { type: "array", items: { type: "string" } },
                  recommended_action: { type: "string" },
                  urgency: { type: "string", enum: ["immediate", "soon", "when_possible"] }
                }
              }
            },
            predictive_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  insight_type: { type: "string", enum: ["risk_forecast", "opportunity", "trend_projection", "capacity_alert"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  confidence: { type: "number", minimum: 0, maximum: 100 },
                  time_horizon: { type: "string" },
                  expected_impact: { type: "string" },
                  preventive_actions: { type: "array", items: { type: "string" } }
                }
              }
            },
            performance_benchmarks: {
              type: "object",
              properties: {
                win_rate_vs_industry: { type: "string", enum: ["above", "at", "below"] },
                cycle_time_vs_optimal: { type: "string", enum: ["faster", "on_pace", "slower"] },
                team_productivity_rating: { type: "string", enum: ["excellent", "good", "average", "needs_improvement"] },
                overall_performance_score: { type: "number", minimum: 0, maximum: 100 },
                key_strengths: { type: "array", items: { type: "string" } },
                improvement_areas: { type: "array", items: { type: "string" } }
              }
            },
            hidden_patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern_description: { type: "string" },
                  significance: { type: "string", enum: ["high", "medium", "low"] },
                  actionable_insight: { type: "string" }
                }
              }
            },
            priority_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
                  expected_benefit: { type: "string" },
                  time_to_implement_hours: { type: "number" },
                  roi_potential: { type: "string", enum: ["high", "medium", "low"] }
                }
              }
            }
          },
          required: ["anomalies_detected", "predictive_insights", "performance_benchmarks", "priority_actions"]
        }
      });

      setDeepInsights(result);
      alert(`✓ Deep analysis complete! Found ${result.anomalies_detected.length} anomalies and ${result.predictive_insights.length} predictive insights.`);

    } catch (error) {
      console.error("Error running deep analysis:", error);
      alert("Error running deep analysis");
    } finally {
      setRunningDeepAnalysis(false);
    }
  };

  // Generate AI insights based on data
  const generateInsights = () => {
    setLoading(true);
    const newInsights = [];

    // 1. Proposals with high AI confidence but no recent activity
    const highConfidenceStale = proposals.filter(p => {
      // Ensure p and its properties exist and are relevant for this insight
      if (!p || !p.ai_confidence_score) return false;
      if (!['in_progress', 'draft'].includes(p.status)) return false; // Only consider active, user-editable statuses

      let confidence;
      try {
        confidence = JSON.parse(p.ai_confidence_score).overall_score;
      } catch (e) {
        console.error("Error parsing ai_confidence_score for proposal:", p.id, e);
        confidence = 0; // Default to 0 if parsing fails
      }

      if (confidence < 70) return false; // Must be high confidence

      const lastActivity = p.updated_date ? new Date(p.updated_date) : new Date(p.created_date);
      const daysSinceActivity = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      return daysSinceActivity > 7; // No recent activity for over a week
    });

    if (highConfidenceStale.length > 0) {
      newInsights.push({
        type: 'opportunity',
        icon: TrendingUp,
        title: `${highConfidenceStale.length} High-Confidence Proposal${highConfidenceStale.length > 1 ? 's' : ''} Ready`,
        description: `High win probability (>70%) proposals need attention to maintain momentum.`,
        actionText: 'Review Now',
        actionUrl: createPageUrl("Pipeline"),
        color: "green",
        priority: 'high'
      });
    }

    // Active proposals needing attention (stale proposals)
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
        title: "Stale Proposals Detected",
        description: `${staleProposals.length} proposals haven't been updated in over a week - potential bottleneck`,
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
    // Filter proposals for win/loss statuses within the last 3 months
    const recentProposals = proposals.filter(p => {
      if (!p || !['won', 'lost'].includes(p.status) || !p.updated_date) return false;
      const monthsAgo = (new Date() - new Date(p.updated_date)) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo <= 3;
    });

    const recentWon = recentProposals.filter(p => p.status === 'won').length;
    const recentLost = recentProposals.filter(p => p.status === 'lost').length;

    if (recentWon + recentLost >= 3) { // Require at least 3 decided proposals recently to calculate trend
      const recentWinRate = (recentWon / (recentWon + recentLost)) * 100;
      const wonProposalsOverall = proposals.filter(p => p?.status === 'won').length;
      const allDecidedOverall = proposals.filter(p => p && ['won', 'lost'].includes(p.status)).length;
      const overallWinRate = allDecidedOverall > 0 ? (wonProposalsOverall / allDecidedOverall) * 100 : 0;

      if (recentWinRate > overallWinRate + 10) {
        newInsights.push({
          type: "success",
          icon: TrendingUp,
          title: "Win Rate Trending Up",
          description: `Recent win rate (${recentWinRate.toFixed(0)}%) is ${(recentWinRate - overallWinRate).toFixed(0)}% above average - momentum building`,
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
          description: `Recent performance below average - ${(overallWinRate - recentWinRate).toFixed(0)}% drop. Strategy review recommended.`,
          actionText: "Analyze",
          actionUrl: createPageUrl("WinLossInsights"),
          color: "red",
          priority: "high"
        });
      }
    }

    // Deadlines approaching
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
        icon: Clock,
        title: "Imminent Deadlines",
        description: `${upcomingDeadlines.length} proposals due within 7 days - final push needed`,
        actionText: "View Calendar",
        actionUrl: createPageUrl("Calendar"),
        color: "blue",
        priority: "high"
      });
    }

    // Sort insights by priority (high > medium > low)
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    newInsights.sort((a, b) => (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0));

    // Default insight if none generated so far (or if only low priority insights)
    if (newInsights.length === 0) {
      newInsights.push({
        type: "success",
        icon: CheckCircle,
        title: "All Systems Optimal",
        description: "Your proposals are on track. Pipeline healthy, no urgent issues detected.",
        actionText: "View Dashboard",
        actionUrl: createPageUrl("Dashboard"),
        color: "green",
        priority: "low"
      });
    }

    setInsights(newInsights.slice(0, 4)); // Show top 4 insights
    setLoading(false);
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
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              AI Intelligence Center
            </CardTitle>
            <CardDescription>Anomaly detection & predictive insights</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={generateInsights}
              disabled={loading}
              title="Refresh quick insights"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
            <Button
              size="sm"
              onClick={runDeepAnomalyDetection}
              disabled={runningDeepAnalysis || proposals.length < 5}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            >
              {runningDeepAnalysis ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Deep Analysis
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {deepInsights ? (
          <Tabs defaultValue="anomalies" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="benchmarks">Performance</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            {/* Anomalies Tab */}
            <TabsContent value="anomalies" className="space-y-3">
              {deepInsights.anomalies_detected?.map((anomaly, idx) => (
                <div key={idx} className={cn(
                  "p-4 rounded-lg border-2",
                  anomaly.severity === 'critical' && "bg-red-50 border-red-200",
                  anomaly.severity === 'warning' && "bg-amber-50 border-amber-200",
                  anomaly.severity === 'info' && "bg-blue-50 border-blue-200"
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      anomaly.severity === 'critical' && "bg-red-100",
                      anomaly.severity === 'warning' && "bg-amber-100",
                      anomaly.severity === 'info' && "bg-blue-100"
                    )}>
                      <AlertTriangle className={cn(
                        "w-5 h-5",
                        anomaly.severity === 'critical' && "text-red-600",
                        anomaly.severity === 'warning' && "text-amber-600",
                        anomaly.severity === 'info' && "text-blue-600"
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{anomaly.title}</h4>
                        <Badge className={
                          cn("text-white text-xs",
                          anomaly.urgency === 'immediate' && 'bg-red-600',
                          anomaly.urgency === 'soon' && 'bg-orange-600',
                          anomaly.urgency === 'when_possible' && 'bg-blue-600'
                        )}>
                          {anomaly.urgency}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 mb-2">{anomaly.description}</p>
                      <div className="p-2 bg-white rounded text-xs">
                        <strong>Recommended Action:</strong> {anomaly.recommended_action}
                      </div>
                      {anomaly.affected_proposals?.length > 0 && (
                        <div className="mt-2 text-xs text-slate-600">
                          Affects {anomaly.affected_proposals.length} proposal{anomaly.affected_proposals.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {deepInsights.anomalies_detected?.length === 0 && (
                <p className="text-sm text-slate-500 italic">No anomalies detected at this time.</p>
              )}
            </TabsContent>

            {/* Predictions Tab */}
            <TabsContent value="predictions" className="space-y-3">
              {deepInsights.predictive_insights?.map((insight, idx) => (
                <div key={idx} className="p-4 border-2 border-purple-200 rounded-lg bg-purple-50">
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-purple-900">{insight.title}</h4>
                        <Badge className="bg-purple-600 text-white text-xs">
                          {insight.confidence}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-purple-800 mb-2">{insight.description}</p>
                      <div className="text-xs text-slate-600 mb-2">
                        <strong>Time Horizon:</strong> {insight.time_horizon}
                      </div>
                      <div className="p-2 bg-white rounded text-xs">
                        <strong>Expected Impact:</strong> {insight.expected_impact}
                      </div>
                      {insight.preventive_actions?.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-semibold text-purple-900 mb-1">Prevention:</div>
                          <ul className="space-y-1 pl-4 list-disc list-outside">
                            {insight.preventive_actions.map((action, i) => (
                              <li key={i} className="text-xs text-slate-700">
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {deepInsights.predictive_insights?.length === 0 && (
                <p className="text-sm text-slate-500 italic">No predictive insights available at this time.</p>
              )}
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="benchmarks" className="space-y-4">
              {deepInsights.performance_benchmarks && (
                <>
                  <Card className="border-2 border-indigo-200 bg-indigo-50">
                    <CardContent className="p-6">
                      <div className="text-center mb-6">
                        <div className="text-5xl font-bold text-indigo-600 mb-2">
                          {deepInsights.performance_benchmarks.overall_performance_score}
                        </div>
                        <div className="text-sm text-indigo-900">Overall Performance Score</div>
                        <Badge className={
                          cn("text-white mt-2 capitalize",
                          deepInsights.performance_benchmarks.team_productivity_rating === 'excellent' && 'bg-green-600',
                          deepInsights.performance_benchmarks.team_productivity_rating === 'good' && 'bg-blue-600',
                          deepInsights.performance_benchmarks.team_productivity_rating === 'average' && 'bg-yellow-600',
                          deepInsights.performance_benchmarks.team_productivity_rating === 'needs_improvement' && 'bg-red-600'
                        )}>
                          {deepInsights.performance_benchmarks.team_productivity_rating}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-white rounded-lg text-center">
                          <div className="text-xs text-slate-600 mb-1">Win Rate vs Industry</div>
                          <Badge className={
                            cn("text-white capitalize",
                            deepInsights.performance_benchmarks.win_rate_vs_industry === 'above' && 'bg-green-600',
                            deepInsights.performance_benchmarks.win_rate_vs_industry === 'at' && 'bg-blue-600',
                            deepInsights.performance_benchmarks.win_rate_vs_industry === 'below' && 'bg-red-600'
                          )}>
                            {deepInsights.performance_benchmarks.win_rate_vs_industry} average
                          </Badge>
                        </div>
                        <div className="p-3 bg-white rounded-lg text-center">
                          <div className="text-xs text-slate-600 mb-1">Cycle Time</div>
                          <Badge className={
                            cn("text-white capitalize",
                            deepInsights.performance_benchmarks.cycle_time_vs_optimal === 'faster' && 'bg-green-600',
                            deepInsights.performance_benchmarks.cycle_time_vs_optimal === 'on_pace' && 'bg-blue-600',
                            deepInsights.performance_benchmarks.cycle_time_vs_optimal === 'slower' && 'bg-red-600'
                          )}>
                            {deepInsights.performance_benchmarks.cycle_time_vs_optimal}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-semibold text-green-900 mb-2">Key Strengths</h5>
                          <ul className="space-y-1">
                            {deepInsights.performance_benchmarks.key_strengths?.map((strength, i) => (
                              <li key={i} className="text-sm text-green-800 flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {strength}
                              </li>
                            ))}
                            {deepInsights.performance_benchmarks.key_strengths?.length === 0 && (
                                <li className="text-sm text-slate-500 italic">No specific strengths identified.</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-semibold text-amber-900 mb-2">Growth Areas</h5>
                          <ul className="space-y-1">
                            {deepInsights.performance_benchmarks.improvement_areas?.map((area, i) => (
                              <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                                <Target className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                {area}
                              </li>
                            ))}
                            {deepInsights.performance_benchmarks.improvement_areas?.length === 0 && (
                                <li className="text-sm text-slate-500 italic">No specific improvement areas identified.</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {deepInsights.hidden_patterns?.length > 0 && (
                    <Card className="border-2 border-purple-200 bg-purple-50">
                      <CardHeader className="py-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Eye className="w-5 h-5 text-purple-600" />
                          Hidden Patterns Discovered
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {deepInsights.hidden_patterns.map((pattern, idx) => (
                            <div key={idx} className="p-3 bg-white rounded-lg border">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={
                                  cn("text-white text-xs",
                                  pattern.significance === 'high' && 'bg-purple-600',
                                  pattern.significance === 'medium' && 'bg-indigo-600',
                                  pattern.significance === 'low' && 'bg-blue-600'
                                )}>
                                  {pattern.significance} significance
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-700 mb-2">{pattern.pattern_description}</p>
                              <div className="p-2 bg-green-50 rounded text-xs text-green-800">
                                <strong>→ Insight:</strong> {pattern.actionable_insight}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-3">
              {deepInsights.priority_actions?.map((action, idx) => (
                <div key={idx} className="p-4 border-2 rounded-lg bg-white hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0",
                      action.priority === 'urgent' && 'bg-red-600',
                      action.priority === 'high' && 'bg-orange-600',
                      action.priority === 'medium' && 'bg-yellow-600',
                      action.priority === 'low' && 'bg-blue-600'
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900">{action.action}</h4>
                        <Badge className={
                          cn("text-white",
                          action.priority === 'urgent' && 'bg-red-600',
                          action.priority === 'high' && 'bg-orange-600',
                          action.priority === 'medium' && 'bg-yellow-600',
                          action.priority === 'low' && 'bg-blue-600'
                        )}>
                          {action.priority}
                        </Badge>
                        <Badge className={
                          cn(
                            action.roi_potential === 'high' && 'bg-green-100 text-green-800',
                            action.roi_potential === 'medium' && 'bg-yellow-100 text-yellow-800',
                            action.roi_potential === 'low' && 'bg-slate-100 text-slate-800'
                          )
                        }>
                          {action.roi_potential} ROI
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{action.expected_benefit}</p>
                      <div className="text-xs text-slate-500">
                        Est. implementation: {action.time_to_implement_hours}h
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {deepInsights.priority_actions?.length === 0 && (
                <p className="text-sm text-slate-500 italic">No priority actions recommended at this time.</p>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, idx) => {
              const colors = colorMap[insight.color];
              return (
                <div
                  key={idx}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all hover:shadow-md",
                    colors.bg,
                    colors.border
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", colors.iconBg)}>
                      <insight.icon className={cn("w-5 h-5", colors.text)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("font-semibold mb-1", colors.text)}>
                        {insight.title}
                      </h4>
                      <p className="text-sm text-slate-600 mb-2">{insight.description}</p>
                      <Button
                        variant="link"
                        size="sm"
                        className={cn("p-0 h-auto font-medium", colors.text)}
                        asChild // Render as an anchor tag
                      >
                        <a href={insight.actionUrl} onClick={(e) => {
                          // Prevent default navigation if actionUrl is a placeholder
                          if (insight.actionUrl === '#') {
                            e.preventDefault();
                            console.log(`Action for "${insight.title}": ${insight.actionText} (No specific URL defined)`);
                          }
                          // If it's a real URL, let the default behavior (navigation) happen
                        }}>
                          {insight.actionText}
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {proposals.length >= 5 && activityLogs.length >= 50 && (
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 mt-4">
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-indigo-900">
                    <strong>Unlock Advanced Intelligence:</strong> Run deep analysis to detect anomalies, predict risks, and discover hidden patterns in your data.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
