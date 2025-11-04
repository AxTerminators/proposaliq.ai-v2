
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, TrendingUp, Clock, AlertCircle, Lightbulb, RefreshCw, Zap, Target, Sparkles, Loader2, CheckCircle, BarChart3, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";

export default function AdaptiveLearningPanel({ organization, user }) {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [learningInsights, setLearningInsights] = useState(null);
  const [error, setError] = useState(null);

  const { data: patterns = [] } = useQuery({
    queryKey: ['scheduling-patterns', organization?.id, user?.email],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.SchedulingPattern.filter({
        organization_id: organization.id,
        is_active: true
      }, '-confidence_score');
    },
    enabled: !!organization?.id,
  });

  const { data: performanceHistory = [] } = useQuery({
    queryKey: ['task-performance-history', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.TaskPerformanceHistory.filter({
        organization_id: organization.id
      }, '-actual_completion_date', 100); // Changed from 50 to 100
    },
    enabled: !!organization?.id,
  });

  const runAdaptiveLearning = async () => {
    if (performanceHistory.length < 5) {
      alert("Need at least 5 completed tasks to identify patterns. Keep using ProposalIQ!");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Prepare comprehensive historical analysis
      const userHistory = performanceHistory.filter(h => h.assigned_to_email === user.email);
      const teamHistory = performanceHistory.filter(h => h.assigned_to_email !== user.email);

      // Calculate user performance metrics
      const userMetrics = {
        total_tasks: userHistory.length,
        avg_variance_percentage: userHistory.length > 0
          ? userHistory.reduce((sum, h) => sum + Math.abs(h.variance_percentage || 0), 0) / userHistory.length
          : 0,
        on_time_rate: userHistory.length > 0
          ? (userHistory.filter(h => h.variance_days <= 0).length / userHistory.length) * 100
          : 0,
        avg_quality: userHistory.length > 0
          ? userHistory.reduce((sum, h) => sum + (h.quality_score || 3), 0) / userHistory.length
          : 0,
        avg_complexity: userHistory.length > 0
          ? userHistory.reduce((sum, h) => sum + (h.complexity_rating || 3), 0) / userHistory.length
          : 0
      };

      // Comprehensive pattern analysis prompt
      const analysisPrompt = `You are an expert in behavioral analysis and productivity optimization. Analyze this user's task performance history to identify actionable scheduling patterns using machine learning techniques.

**USER PERFORMANCE SUMMARY:**
- Total Tasks Completed: ${userMetrics.total_tasks}
- On-Time Delivery Rate: ${userMetrics.on_time_rate.toFixed(1)}%
- Average Variance: ${userMetrics.avg_variance_percentage.toFixed(1)}%
- Average Quality Score: ${userMetrics.avg_quality.toFixed(1)}/5
- Average Task Complexity: ${userMetrics.avg_complexity.toFixed(1)}/5

**DETAILED TASK HISTORY:**
${userHistory.slice(0, 30).map((h, idx) => `
${idx + 1}. ${h.task_title}
   - Estimated: ${h.estimated_hours}h → Actual: ${h.actual_hours}h (${h.variance_percentage?.toFixed(0)}% variance)
   - Due: ${moment(h.estimated_completion_date).format('MMM D')} → Completed: ${moment(h.actual_completion_date).format('MMM D')} (${h.variance_days} days ${h.variance_days > 0 ? 'late' : 'early'})
   - Quality: ${h.quality_score}/5 | Complexity: ${h.complexity_rating}/5
   - Blockers: ${h.blockers_encountered?.length || 0} (${h.blockers_encountered?.map(b => b.blocker_type).join(', ') || 'none'})
   - Interruptions: ${h.interruptions_count || 0} | Context Switches: ${h.context_switches || 0}
`).join('\n')}

**CURRENT DETECTED PATTERNS:**
${patterns.map(p => `- ${p.pattern_name}: ${p.confidence_score}% confidence, applied ${p.times_applied} times with ${p.accuracy_rate?.toFixed(0)}% accuracy`).join('\n')}

**TEAM BENCHMARKS (for comparison):**
- Team Avg On-Time Rate: ${teamHistory.length > 0 ? ((teamHistory.filter(h => h.variance_days <= 0).length / teamHistory.length) * 100).toFixed(1) : 'N/A'}%
- Team Avg Quality: ${teamHistory.length > 0 ? (teamHistory.reduce((sum, h) => sum + (h.quality_score || 3), 0) / teamHistory.length).toFixed(1) : 'N/A'}/5

**YOUR TASK - ADVANCED PATTERN DETECTION:**

Using behavioral analysis, time-series modeling, and ML pattern recognition:

1. **Task Duration Patterns**: 
   - Which types of tasks does user consistently overestimate/underestimate?
   - What's the typical overrun percentage by task complexity?
   - Recommended buffer multipliers for different task types

2. **Optimal Working Hours**:
   - When is user most productive?
   - When do quality and speed peak?
   - Worst hours for scheduling complex work

3. **Blocker Patterns**:
   - What blockers appear frequently?
   - Which blocker types cause the most delay?
   - How to predict and prevent common blockers

4. **Quality vs Speed Trade-offs**:
   - Does rushing lead to lower quality?
   - Optimal pace for this user

5. **Context Switching Impact**:
   - How do interruptions affect performance?
   - Recommended max concurrent tasks

6. **Collaboration Patterns**:
   - Performance on solo vs collaborative tasks
   - Optimal team size for this user

7. **Personalized Scheduling Rules**:
   - Specific recommendations for future task scheduling
   - Adaptive time estimates for different scenarios

Return comprehensive, actionable patterns with high predictive value.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            patterns_identified: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern_type: { type: "string" },
                  pattern_name: { type: "string" },
                  description: { type: "string" },
                  confidence_score: { type: "number", minimum: 0, maximum: 100 },
                  sample_size: { type: "number" },
                  pattern_data: { type: "object" },
                  recommendation: { type: "string" },
                  expected_impact: { type: "string" }
                }
              }
            },
            optimal_working_hours: {
              type: "object",
              properties: {
                best_hours: { type: "array", items: { type: "number" } },
                worst_hours: { type: "array", items: { type: "number" } },
                peak_productivity_window: { type: "string" },
                recommended_schedule: { type: "string" }
              }
            },
            task_estimation_insights: {
              type: "object",
              properties: {
                typical_overrun_percentage: { type: "number" },
                underestimation_tendency: { type: "string", enum: ["high", "moderate", "low"] },
                recommended_buffer_multiplier: { type: "number" },
                complexity_adjustment: {
                  type: "object",
                  properties: {
                    low_complexity: { type: "number" },
                    medium_complexity: { type: "number" },
                    high_complexity: { type: "number" }
                  }
                }
              }
            },
            blocker_intelligence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  blocker_type: { type: "string" },
                  frequency: { type: "number" },
                  avg_delay_hours: { type: "number" },
                  prevention_strategy: { type: "string" }
                }
              }
            },
            productivity_insights: {
              type: "object",
              properties: {
                optimal_task_duration: { type: "string" },
                max_concurrent_tasks: { type: "number" },
                context_switch_tolerance: { type: "string", enum: ["high", "medium", "low"] },
                break_frequency_recommendation: { type: "string" },
                deep_work_capacity_hours: { type: "number" }
              }
            },
            personalized_scheduling_rules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rule_name: { type: "string" },
                  rule_description: { type: "string" },
                  when_to_apply: { type: "string" },
                  expected_improvement: { type: "string" }
                }
              }
            },
            strengths: {
              type: "array",
              items: { type: "string" },
              description: "User's scheduling strengths"
            },
            growth_areas: {
              type: "array",
              items: { type: "string" },
              description: "Areas for improvement"
            },
            vs_team_comparison: {
              type: "object",
              properties: {
                relative_speed: { type: "string", enum: ["faster", "average", "slower"] },
                relative_quality: { type: "string", enum: ["higher", "average", "lower"] },
                unique_strengths: { type: "array", items: { type: "string" } }
              }
            }
          },
          required: [
            "patterns_identified",
            "optimal_working_hours",
            "task_estimation_insights",
            "productivity_insights",
            "personalized_scheduling_rules"
          ]
        }
      });

      // Save identified patterns
      if (result.patterns_identified) {
        for (const pattern of result.patterns_identified || []) {
          await base44.entities.SchedulingPattern.create({
            organization_id: organization.id,
            user_email: user.email,
            pattern_type: pattern.pattern_type || 'task_duration',
            pattern_name: pattern.pattern_name,
            pattern_data: pattern.pattern_data || {},
            confidence_score: pattern.confidence_score || 0,
            sample_size: pattern.sample_size || performanceHistory.length,
            last_occurrence: new Date().toISOString(),
            times_applied: 0,
            accuracy_rate: 0,
            created_by_ai: true,
            is_active: true
          });
        }
      }

      setLearningInsights(result);
      queryClient.invalidateQueries({ queryKey: ['scheduling-patterns'] });
      alert(`✓ Adaptive learning complete! Discovered ${result.patterns_identified.length} patterns.`);
      
    } catch (err) {
      console.error("Error running adaptive learning:", err);
      setError(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const userPatterns = patterns.filter(p => p.user_email === user.email);
  // Team patterns are not explicitly used in the new detailed insights display but kept for potential future use or old sections if !learningInsights
  const teamPatterns = patterns.filter(p => !p.user_email); 

  // Filter user history for statistics card below
  const userHistory = performanceHistory.filter(h => h.assigned_to_email === user.email);


  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Adaptive Learning & Patterns</CardTitle>
                <CardDescription>AI learns from your behavior to optimize future scheduling</CardDescription>
              </div>
            </div>
            <Button 
              onClick={runAdaptiveLearning}
              disabled={analyzing || performanceHistory.length < 5}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Learning...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Patterns
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {performanceHistory.length < 5 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Need at least 5 completed tasks to enable adaptive learning. Current: {performanceHistory.length}. 
            Complete more tasks and the AI will identify your unique patterns!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-4 text-center">
            <Brain className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
            <div className="text-3xl font-bold text-indigo-600">{patterns.length}</div>
            <div className="text-sm text-indigo-900">Active Patterns</div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-3xl font-bold text-purple-600">{performanceHistory.length}</div>
            <div className="text-sm text-purple-900">Tasks Analyzed</div>
          </CardContent>
        </Card>

        <Card className="border-pink-200 bg-pink-50">
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-6 h-6 mx-auto mb-2 text-pink-600" />
            <div className="text-3xl font-bold text-pink-600">
              {patterns.length > 0 && patterns.some(p => p.accuracy_rate > 0)
                ? Math.round(patterns.filter(p => p.accuracy_rate > 0).reduce((sum, p) => sum + (p.accuracy_rate || 0), 0) / patterns.filter(p => p.accuracy_rate > 0).length)
                : 0}%
            </div>
            <div className="text-sm text-pink-900">Avg Accuracy</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-3xl font-bold text-blue-600">
              {userHistory.filter(h => h.variance_days <= 0).length}
            </div>
            <div className="text-sm text-blue-900">On-Time Completions</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Learning Insights */}
      {learningInsights && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="productivity">Productivity</TabsTrigger>
            <TabsTrigger value="rules">Scheduling Rules</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Optimal Hours */}
            {learningInsights.optimal_working_hours && (
              <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-green-600" />
                    Your Optimal Working Hours
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-semibold text-green-900 mb-3">Peak Productivity Window</h5>
                      <p className="text-2xl font-bold text-green-600 mb-2">
                        {learningInsights.optimal_working_hours.peak_productivity_window}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {learningInsights.optimal_working_hours.best_hours?.map(hour => (
                          <Badge key={hour} className="bg-green-600 text-white">
                            {moment().hour(hour).format('ha')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-semibold text-red-900 mb-3">Avoid Scheduling During</h5>
                      <div className="flex flex-wrap gap-2">
                        {learningInsights.optimal_working_hours.worst_hours?.map(hour => (
                          <Badge key={hour} className="bg-red-100 text-red-800">
                            {moment().hour(hour).format('ha')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                    <p className="text-sm text-green-900">
                      <strong>AI Recommendation:</strong> {learningInsights.optimal_working_hours.recommended_schedule}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Task Estimation Insights */}
            {learningInsights.task_estimation_insights && (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Task Estimation Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-semibold text-blue-900 mb-2">Typical Overrun</h5>
                      <div className="text-4xl font-bold text-blue-600 mb-1">
                        +{learningInsights.task_estimation_insights.typical_overrun_percentage?.toFixed(0)}%
                      </div>
                      <Badge className={cn(
                        "text-white",
                        learningInsights.task_estimation_insights.underestimation_tendency === 'high' ? 'bg-red-600' :
                        learningInsights.task_estimation_insights.underestimation_tendency === 'moderate' ? 'bg-yellow-600' :
                        'bg-green-600'
                      )}>
                        {learningInsights.task_estimation_insights.underestimation_tendency} underestimation tendency
                      </Badge>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h5 className="font-semibold text-purple-900 mb-2">Recommended Buffer</h5>
                      <div className="text-4xl font-bold text-purple-600 mb-1">
                        ×{learningInsights.task_estimation_insights.recommended_buffer_multiplier?.toFixed(2)}
                      </div>
                      <p className="text-sm text-slate-600">Multiply estimates by this factor</p>
                    </div>
                  </div>

                  {learningInsights.task_estimation_insights.complexity_adjustment && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-3">Complexity-Based Adjustments</h5>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Low Complexity Tasks</span>
                          <Badge>×{learningInsights.task_estimation_insights.complexity_adjustment.low_complexity?.toFixed(2)}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">Medium Complexity Tasks</span>
                          <Badge>×{learningInsights.task_estimation_insights.complexity_adjustment.medium_complexity?.toFixed(2)}</Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-700">High Complexity Tasks</span>
                          <Badge>×{learningInsights.task_estimation_insights.complexity_adjustment.high_complexity?.toFixed(2)}</Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Strengths & Growth Areas */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-900">Your Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {learningInsights.strengths?.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-green-900">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-lg text-amber-900">Growth Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {learningInsights.growth_areas?.map((area, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Target className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <span className="text-amber-900">{area}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-4">
            {learningInsights.patterns_identified?.map((pattern, idx) => (
              <Card key={idx} className="border-2 hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900 text-lg">{pattern.pattern_name}</h4>
                        <Badge className="bg-indigo-600 text-white">
                          {pattern.confidence_score}% confidence
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {pattern.pattern_type?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{pattern.description}</p>
                      <p className="text-sm text-indigo-700">
                        <strong>→ Recommendation:</strong> {pattern.recommendation}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        Based on {pattern.sample_size} data points • Expected Impact: {pattern.expected_impact}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Productivity Tab */}
          <TabsContent value="productivity" className="space-y-6">
            {learningInsights.productivity_insights && (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle>Productivity Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <h5 className="text-sm font-semibold text-purple-900 mb-2">Optimal Task Duration</h5>
                      <p className="text-xl font-bold text-purple-600">
                        {learningInsights.productivity_insights.optimal_task_duration}
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="text-sm font-semibold text-blue-900 mb-2">Max Concurrent Tasks</h5>
                      <p className="text-xl font-bold text-blue-600">
                        {learningInsights.productivity_insights.max_concurrent_tasks}
                      </p>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <h5 className="text-sm font-semibold text-green-900 mb-2">Deep Work Capacity</h5>
                      <p className="text-xl font-bold text-green-600">
                        {learningInsights.productivity_insights.deep_work_capacity_hours}h/day
                      </p>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-lg">
                      <h5 className="text-sm font-semibold text-amber-900 mb-2">Context Switch Tolerance</h5>
                      <Badge className={cn(
                        "text-white capitalize",
                        learningInsights.productivity_insights.context_switch_tolerance === 'high' ? 'bg-green-600' :
                        learningInsights.productivity_insights.context_switch_tolerance === 'medium' ? 'bg-yellow-600' :
                        'bg-red-600'
                      )}>
                        {learningInsights.productivity_insights.context_switch_tolerance}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
                    <p className="text-sm text-indigo-900">
                      <strong>Break Recommendation:</strong> {learningInsights.productivity_insights.break_frequency_recommendation}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Blocker Intelligence */}
            {learningInsights.blocker_intelligence && learningInsights.blocker_intelligence.length > 0 && (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                    Common Blockers & Prevention
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {learningInsights.blocker_intelligence.map((blocker, idx) => (
                      <div key={idx} className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-orange-900 capitalize">
                            {blocker.blocker_type.replace(/_/g, ' ')}
                          </h5>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-100 text-orange-800">
                              {blocker.frequency}x occurrences
                            </Badge>
                            <Badge className="bg-red-100 text-red-800">
                              ~{blocker.avg_delay_hours}h avg delay
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-green-800">
                          <strong>Prevention Strategy:</strong> {blocker.prevention_strategy}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Scheduling Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Personalized Scheduling Rules</CardTitle>
                <CardDescription>AI-generated rules customized to your work style</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {learningInsights.personalized_scheduling_rules?.map((rule, idx) => (
                    <div key={idx} className="p-4 border-2 rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-slate-900 mb-2">{rule.rule_name}</h5>
                          <p className="text-sm text-slate-600 mb-2">{rule.rule_description}</p>
                          <div className="space-y-1 text-xs">
                            <p className="text-slate-700">
                              <strong>When to Apply:</strong> {rule.when_to_apply}
                            </p>
                            <p className="text-green-700">
                              <strong>Expected Improvement:</strong> {rule.expected_improvement}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {learningInsights.vs_team_comparison && (
              <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-600" />
                    How You Compare to Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-white rounded-lg">
                      <div className="text-sm text-slate-600 mb-1">Relative Speed</div>
                      <Badge className={cn(
                        "text-white capitalize text-base px-3 py-1",
                        learningInsights.vs_team_comparison.relative_speed === 'faster' ? 'bg-green-600' :
                        learningInsights.vs_team_comparison.relative_speed === 'average' ? 'bg-blue-600' :
                        'bg-orange-600'
                      )}>
                        {learningInsights.vs_team_comparison.relative_speed}
                      </Badge>
                    </div>

                    <div className="p-4 bg-white rounded-lg">
                      <div className="text-sm text-slate-600 mb-1">Relative Quality</div>
                      <Badge className={cn(
                        "text-white capitalize text-base px-3 py-1",
                        learningInsights.vs_team_comparison.relative_quality === 'higher' ? 'bg-green-600' :
                        learningInsights.vs_team_comparison.relative_quality === 'average' ? 'bg-blue-600' :
                        'bg-orange-600'
                      )}>
                        {learningInsights.vs_team_comparison.relative_quality}
                      </Badge>
                    </div>
                  </div>

                  {learningInsights.vs_team_comparison.unique_strengths?.length > 0 && (
                    <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
                      <h5 className="font-semibold text-purple-900 mb-2">Your Unique Strengths</h5>
                      <ul className="space-y-1">
                        {learningInsights.vs_team_comparison.unique_strengths.map((strength, idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Your Patterns (Only display if no detailed insights are generated yet) */}
      {userPatterns.length > 0 && !learningInsights && (
        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900">Your Active Patterns ({userPatterns.length})</h4>
          {userPatterns.map((pattern) => (
            <Card key={pattern.id} className="border-none shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-600" />
                      {pattern.pattern_name}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {pattern.sample_size} tasks • {pattern.confidence_score}% confidence • Applied {pattern.times_applied || 0}x
                    </div>
                  </div>
                  <Badge className="bg-indigo-600 text-white capitalize">
                    {pattern.pattern_type.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {pattern.pattern_data?.average_duration_hours && (
                  <div className="text-sm text-slate-700 mb-2">
                    <strong>Avg Duration:</strong> {pattern.pattern_data.average_duration_hours.toFixed(1)} hours
                  </div>
                )}

                {pattern.pattern_data?.typical_overrun_percentage !== undefined && (
                  <div className="text-sm mb-2">
                    <span className="text-slate-700"><strong>Typical Overrun:</strong> </span>
                    <span className={cn(
                      "font-semibold",
                      pattern.pattern_data.typical_overrun_percentage > 20 ? "text-red-600" :
                      pattern.pattern_data.typical_overrun_percentage > 10 ? "text-amber-600" :
                      "text-green-600"
                    )}>
                      {pattern.pattern_data.typical_overrun_percentage.toFixed(0)}%
                    </span>
                  </div>
                )}

                {pattern.pattern_data?.best_hours?.length > 0 && (
                  <div className="text-sm text-slate-700 mb-3">
                    <strong>Peak Hours:</strong> {pattern.pattern_data.best_hours.map(h => 
                      moment().hour(h).format('ha')
                    ).join(', ')}
                  </div>
                )}

                {pattern.accuracy_rate !== undefined && pattern.accuracy_rate > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                      <span>Pattern Accuracy (when applied)</span>
                      <span>{pattern.accuracy_rate?.toFixed(0)}%</span>
                    </div>
                    <Progress value={pattern.accuracy_rate || 0} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Adaptive Learning Status */}
      {patterns.length > 0 && (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Brain className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-900 mb-2">🎯 Adaptive Learning Active</h4>
                <p className="text-sm text-green-800 mb-3">
                  The AI has identified {patterns.length} scheduling patterns from your work history. 
                  Future task estimates and scheduling suggestions are now automatically adjusted based on your actual performance.
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">
                    <strong>Auto-Adjustments:</strong> Task estimates are being adjusted by{' '}
                    {patterns[0]?.pattern_data?.typical_overrun_percentage 
                      ? `${Math.round(patterns[0].pattern_data.typical_overrun_percentage)}%`
                      : 'a learning threshold'} based on your patterns
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>Optimal Scheduling:</strong> Tasks are being suggested during your peak hours for better outcomes
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
