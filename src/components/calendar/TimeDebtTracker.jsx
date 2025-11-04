
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingDown, 
  TrendingUp, 
  Focus, 
  Clock, 
  AlertCircle, 
  Lightbulb,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Brain,
  Sparkles,
  Loader2,
  Target,
  Zap,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart, Area, AreaChart } from "recharts";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";


export default function TimeDebtTracker({ organization, user }) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(moment());
  const [viewMode, setViewMode] = useState('week');
  const [analyzingProductivity, setAnalyzingProductivity] = useState(false);
  const [productivityInsights, setProductivityInsights] = useState(null);
  const [error, setError] = useState(null);

  const { data: trackingData = [] } = useQuery({
    queryKey: ['time-debt-tracking', organization?.id, user?.email, selectedDate.format('YYYY-MM-DD'), viewMode], // Added viewMode to key for refetch
    queryFn: async () => {
      if (!organization?.id || !user?.email) return [];
      
      const startDate = moment(selectedDate).startOf(viewMode).format('YYYY-MM-DD');
      const endDate = moment(selectedDate).endOf(viewMode).format('YYYY-MM-DD');
      
      return base44.entities.TimeDebtTracking.filter({
        organization_id: organization.id,
        user_email: user.email,
        date: { $gte: startDate, $lte: endDate }
      }, 'date');
    },
    enabled: !!organization?.id && !!user?.email,
  });

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['focus-blocks', organization?.id, user?.email],
    queryFn: async () => {
      if (!organization?.id || !user?.email) return [];
      return base44.entities.CalendarEvent.filter({
        organization_id: organization.id,
        created_by_email: user.email,
        event_type: 'time_block'
      });
    },
    enabled: !!organization?.id && !!user?.email,
  });

  // Calculate aggregate metrics
  const totalPlannedHours = trackingData.reduce((sum, d) => sum + (d.planned_focus_hours || 0), 0);
  const totalActualHours = trackingData.reduce((sum, d) => sum + (d.actual_focus_hours || 0), 0);
  const totalDebt = totalPlannedHours - totalActualHours;
  const achievementRate = totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours * 100) : 0;

  // Prepare chart data
  const chartData = trackingData.map(d => ({
    date: moment(d.date).format('MMM D'),
    planned: d.planned_focus_hours || 0,
    actual: d.actual_focus_hours || 0,
    productivity: d.productivity_score || 0,
    debt: (d.planned_focus_hours || 0) - (d.actual_focus_hours || 0)
  }));

  // Identify productivity patterns
  const productivityByHour = Array.from({ length: 24 }, (_, hour) => {
    const relevantData = trackingData.filter(d => 
      d.most_productive_hours?.includes(hour)
    );
    return {
      hour,
      frequency: relevantData.length,
      avgProductivity: relevantData.length > 0 
        ? relevantData.reduce((sum, d) => sum + (d.productivity_score || 0), 0) / relevantData.length
        : 0
    };
  });

  const peakHours = productivityByHour
    .filter(h => h.frequency > 0)
    .sort((a, b) => b.avgProductivity - a.avgProductivity)
    .slice(0, 5); // Changed to top 5 peak hours

  const navigate = (direction) => {
    if (direction === 'prev') {
      setSelectedDate(moment(selectedDate).subtract(1, viewMode));
    } else {
      setSelectedDate(moment(selectedDate).add(1, viewMode));
    }
  };

  const runProductivityAnalysis = async () => {
    if (trackingData.length < 5) {
      alert("Need at least 5 days of time tracking data to analyze productivity patterns. Continue blocking focus time!");
      return;
    }

    setAnalyzingProductivity(true);
    setError(null);

    try {
      // Prepare comprehensive productivity data
      const analysisPrompt = `You are a productivity expert specializing in deep work optimization and time management. Analyze this time tracking data to provide personalized productivity insights and recommendations.

**TIME DEBT SUMMARY (${trackingData.length} days):**
- Total Planned Focus: ${totalPlannedHours.toFixed(1)}h
- Total Actual Focus: ${totalActualHours.toFixed(1)}h
- Time Debt: ${totalDebt.toFixed(1)}h (${totalDebt > 0 ? 'deficit' : 'surplus'})
- Achievement Rate: ${achievementRate.toFixed(0)}%
- Avg Productivity Score: ${trackingData.length > 0 ? (trackingData.reduce((sum, d) => sum + (d.productivity_score || 0), 0) / trackingData.length).toFixed(0) : 0}/100

**DAILY BREAKDOWN:**
${trackingData.map((day, idx) => `
Day ${idx + 1} (${moment(day.date).format('MMM D, ddd')}):
- Planned: ${day.planned_focus_hours || 0}h → Actual: ${day.actual_focus_hours || 0}h (${day.time_debt_hours > 0 ? '-' + day.time_debt_hours : '+' + Math.abs(day.time_debt_hours)}h)
- Productivity: ${day.productivity_score || 0}/100
- Interruptions: ${day.interruptions?.length || 0} (${day.interruptions?.map(i => i.type).join(', ') || 'none'})
- Context Switches: ${day.context_switches || 0}
- Meeting Hours: ${day.meeting_hours || 0}h
- Deep Work: ${day.deep_work_hours || 0}h
- Focus Sessions: ${day.focus_sessions?.length || 0}
- Peak Hours: ${day.most_productive_hours?.map(h => moment().hour(h).format('ha')).join(', ') || 'N/A'}
`).join('\n')}

**INTERRUPTION PATTERNS:**
${JSON.stringify(trackingData.flatMap(d => d.interruptions || []).reduce((acc, int) => {
  acc[int.type] = (acc[int.type] || 0) + 1;
  return acc;
}, {}))}

**YOUR TASK - COMPREHENSIVE PRODUCTIVITY ANALYSIS:**

Using behavioral science, productivity research, and data analysis:

1. **Time Debt Root Causes**: Why isn't user achieving planned focus time?

2. **Productivity Patterns**:
   - Best days of week
   - Optimal time blocks
   - Energy curve throughout day
   - When quality is highest

3. **Interruption Impact Analysis**:
   - Which interruption types most harmful
   - True cost of context switching
   - Recommended protection strategies

4. **Focus Time Optimization**:
   - Ideal focus block duration
   - Optimal number of blocks per day
   - Best spacing between blocks
   - Recovery time needed

5. **Personalized Recommendations**:
   - Specific schedule adjustments
   - Protection strategies
   - Habit improvements
   - Tool/process changes

6. **Predictive Insights**:
   - Best days to schedule deep work
   - Times to avoid scheduling
   - Capacity forecasting

Return actionable, research-backed productivity intelligence.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            time_debt_analysis: {
              type: "object",
              properties: {
                primary_causes: { type: "array", items: { type: "string" } },
                deficit_pattern: { type: "string", enum: ["consistent", "growing", "sporadic", "improving"] },
                critical_issue: { type: "string" },
                recovery_plan: { type: "string" }
              },
              required: ["primary_causes", "deficit_pattern", "critical_issue", "recovery_plan"]
            },
            productivity_profile: {
              type: "object",
              properties: {
                energy_curve: {
                  type: "object",
                  properties: {
                    peak_energy_hours: { type: "array", items: { type: "number" } },
                    low_energy_hours: { type: "array", items: { type: "number" } },
                    description: { type: "string" }
                  },
                  required: ["peak_energy_hours", "low_energy_hours", "description"]
                },
                best_days_of_week: { type: "array", items: { type: "string" } },
                worst_days_of_week: { type: "array", items: { type: "string" } },
                optimal_focus_block_duration: { type: "number", description: "Minutes" },
                optimal_blocks_per_day: { type: "number" },
                deep_work_capacity_hours: { type: "number" }
              },
              required: ["energy_curve", "best_days_of_week", "worst_days_of_week", "optimal_focus_block_duration", "optimal_blocks_per_day", "deep_work_capacity_hours"]
            },
            interruption_analysis: {
              type: "object",
              properties: {
                most_disruptive_type: { type: "string" },
                avg_interruptions_per_day: { type: "number" },
                productivity_drop_per_interruption: { type: "number", description: "Percentage" },
                true_cost_of_context_switching: { type: "string" },
                protection_strategies: { type: "array", items: { type: "string" } }
              },
              required: ["most_disruptive_type", "avg_interruptions_per_day", "productivity_drop_per_interruption", "true_cost_of_context_switching", "protection_strategies"]
            },
            focus_optimization: {
              type: "object",
              properties: {
                recommended_schedule: { type: "string" },
                ideal_block_duration: { type: "number" },
                spacing_between_blocks_minutes: { type: "number" },
                recovery_time_needed_minutes: { type: "number" },
                max_deep_work_sessions_per_day: { type: "number" }
              },
              required: ["recommended_schedule", "ideal_block_duration", "spacing_between_blocks_minutes", "recovery_time_needed_minutes", "max_deep_work_sessions_per_day"]
            },
            personalized_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  category: { type: "string", enum: ["schedule", "habits", "tools", "environment", "boundaries"] },
                  recommendation: { type: "string" },
                  expected_impact: { type: "string" },
                  implementation_difficulty: { type: "string", enum: ["easy", "moderate", "difficult"] },
                  estimated_time_savings_hours_per_week: { type: "number" }
                },
                required: ["priority", "category", "recommendation", "expected_impact", "implementation_difficulty", "estimated_time_savings_hours_per_week"]
              }
            },
            predictive_insights: {
              type: "object",
              properties: {
                best_days_for_deep_work: { type: "array", items: { type: "string" } },
                times_to_avoid_complex_tasks: { type: "string" },
                weekly_capacity_forecast: { type: "number", description: "Hours of productive focus time per week" },
                sustainability_score: { type: "number", minimum: 0, maximum: 100 },
                burnout_risk: { type: "string", enum: ["low", "medium", "high"] }
              },
              required: ["best_days_for_deep_work", "times_to_avoid_complex_tasks", "weekly_capacity_forecast", "sustainability_score", "burnout_risk"]
            },
            productivity_score_breakdown: {
              type: "object",
              properties: {
                focus_achievement: { type: "number", minimum: 0, maximum: 100 },
                interruption_management: { type: "number", minimum: 0, maximum: 100 },
                time_consistency: { type: "number", minimum: 0, maximum: 100 },
                deep_work_quality: { type: "number", minimum: 0, maximum: 100 },
                overall_effectiveness: { type: "number", minimum: 0, maximum: 100 }
              },
              required: ["focus_achievement", "interruption_management", "time_consistency", "deep_work_quality", "overall_effectiveness"]
            },
            actionable_insights: {
              type: "array",
              items: { type: "string" },
              description: "Top 5-7 key insights"
            }
          },
          required: [
            "time_debt_analysis",
            "productivity_profile",
            "interruption_analysis",
            "personalized_recommendations",
            "actionable_insights",
            "focus_optimization",
            "predictive_insights",
            "productivity_score_breakdown"
          ]
        }
      });

      setProductivityInsights(result);
      alert("✓ Productivity analysis complete!");

    } catch (err) {
      console.error("Error analyzing productivity:", err);
      setError(err);
    } finally {
      setAnalyzingProductivity(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Focus className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Time Debt & Productivity Analysis</CardTitle>
                <CardDescription>Track focus time performance and get AI-powered productivity insights</CardDescription>
              </div>
            </div>
            <Button
              onClick={runProductivityAnalysis}
              disabled={analyzingProductivity || trackingData.length < 5}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {analyzingProductivity ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Productivity Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {trackingData.length < 5 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Need at least 5 days of time tracking data for AI analysis. Current: {trackingData.length}. 
            Block focus time on your calendar to start tracking!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Time Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-slate-900 min-w-[200px] text-center">
            {selectedDate.format(viewMode === 'week' ? '[Week of] MMM D, YYYY' : 'MMMM YYYY')}
          </span>
          <Button size="sm" variant="outline" onClick={() => navigate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Select value={viewMode} onValueChange={setViewMode}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="month">Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Metrics */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-3xl font-bold text-blue-600">{totalPlannedHours.toFixed(1)}h</div>
            <div className="text-sm text-blue-900">Planned Focus</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <Focus className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-3xl font-bold text-green-600">{totalActualHours.toFixed(1)}h</div>
            <div className="text-sm text-green-900">Actual Focus</div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-2",
          totalDebt > 0 ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"
        )}>
          <CardContent className="p-4 text-center">
            {totalDebt > 0 ? (
              <TrendingDown className="w-6 h-6 mx-auto mb-2 text-red-600" />
            ) : (
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
            )}
            <div className={cn(
              "text-3xl font-bold",
              totalDebt > 0 ? "text-red-600" : "text-green-600"
            )}>
              {Math.abs(totalDebt).toFixed(1)}h
            </div>
            <div className="text-sm">Time {totalDebt > 0 ? 'Debt' : 'Surplus'}</div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-3xl font-bold text-purple-600">{achievementRate.toFixed(0)}%</div>
            <div className="text-sm text-purple-900">Achievement</div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
            <div className="text-3xl font-bold text-indigo-600">
              {trackingData.length > 0 
                ? (trackingData.reduce((sum, d) => sum + (d.productivity_score || 0), 0) / trackingData.length).toFixed(0)
                : 0}
            </div>
            <div className="text-sm text-indigo-900">Avg Productivity</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Productivity Insights */}
      {productivityInsights && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
            <TabsTrigger value="recommendations">Actions</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Time Debt Analysis */}
            {productivityInsights.time_debt_analysis && (
              <Card className={cn(
                "border-2",
                totalDebt > 5 ? "border-red-500 bg-red-50" :
                totalDebt > 0 ? "border-amber-500 bg-amber-50" :
                "border-green-500 bg-green-50"
              )}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className={cn(
                      "w-5 h-5",
                      totalDebt > 5 ? "text-red-600" : totalDebt > 0 ? "text-amber-600" : "text-green-600"
                    )} />
                    Time Debt Root Cause Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-white rounded-lg border">
                    <h5 className="font-semibold text-slate-900 mb-2">Pattern Identified</h5>
                    <Badge className={cn(
                      "text-white text-base px-3 py-1 capitalize",
                      productivityInsights.time_debt_analysis.deficit_pattern === 'growing' && 'bg-red-600',
                      productivityInsights.time_debt_analysis.deficit_pattern === 'improving' && 'bg-green-600',
                      productivityInsights.time_debt_analysis.deficit_pattern === 'consistent' && 'bg-blue-600',
                      productivityInsights.time_debt_analysis.deficit_pattern === 'sporadic' && 'bg-yellow-600'
                    )}>
                      {productivityInsights.time_debt_analysis.deficit_pattern.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">Primary Causes:</h5>
                    <ul className="space-y-2">
                      {productivityInsights.time_debt_analysis.primary_causes?.map((cause, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                            {idx + 1}
                          </div>
                          <span className="text-slate-700">{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {productivityInsights.time_debt_analysis.critical_issue && (
                    <Alert className="bg-red-100 border-red-300">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-900">
                        <strong>Critical Issue:</strong> {productivityInsights.time_debt_analysis.critical_issue}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                    <h5 className="font-semibold text-green-900 mb-2">Recovery Plan:</h5>
                    <p className="text-sm text-green-800">
                      {productivityInsights.time_debt_analysis.recovery_plan}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Productivity Score Breakdown */}
            {productivityInsights.productivity_score_breakdown && (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle>Productivity Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={[
                      { metric: 'Focus Achievement', score: productivityInsights.productivity_score_breakdown.focus_achievement },
                      { metric: 'Interruption Management', score: productivityInsights.productivity_score_breakdown.interruption_management },
                      { metric: 'Time Consistency', score: productivityInsights.productivity_score_breakdown.time_consistency },
                      { metric: 'Deep Work Quality', score: productivityInsights.productivity_score_breakdown.deep_work_quality },
                      { metric: 'Overall Effectiveness', score: productivityInsights.productivity_score_breakdown.overall_effectiveness }
                    ]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis domain={[0, 100]} />
                      <Radar name="Scores" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Optimization Tab */}
          <TabsContent value="optimization" className="space-y-6">
            {/* Productivity Profile */}
            {productivityInsights.productivity_profile && (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-indigo-600" />
                    Your Productivity Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Energy Curve */}
                  {productivityInsights.productivity_profile.energy_curve && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-3">Energy Curve</h5>
                      <p className="text-sm text-slate-600 mb-3">
                        {productivityInsights.productivity_profile.energy_curve.description}
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-green-900 font-semibold mb-2">Peak Energy Hours</div>
                          <div className="flex flex-wrap gap-2">
                            {productivityInsights.productivity_profile.energy_curve.peak_energy_hours?.map(hour => (
                              <Badge key={hour} className="bg-green-600 text-white">
                                {moment().hour(hour).format('ha')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                          <div className="text-sm text-red-900 font-semibold mb-2">Low Energy Hours</div>
                          <div className="flex flex-wrap gap-2">
                            {productivityInsights.productivity_profile.energy_curve.low_energy_hours?.map(hour => (
                              <Badge key={hour} className="bg-red-100 text-red-800">
                                {moment().hour(hour).format('ha')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Day of Week Patterns */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-900 font-semibold mb-2">Best Days for Deep Work</div>
                      <div className="flex flex-wrap gap-2">
                        {productivityInsights.productivity_profile.best_days_of_week?.map(day => (
                          <Badge key={day} className="bg-blue-600 text-white capitalize">
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="text-sm text-orange-900 font-semibold mb-2">Avoid Scheduling Complex Work</div>
                      <div className="flex flex-wrap gap-2">
                        {productivityInsights.productivity_profile.worst_days_of_week?.map(day => (
                          <Badge key={day} className="bg-orange-100 text-orange-800 capitalize">
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Capacity Metrics */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 bg-purple-50 rounded-lg text-center">
                      <div className="text-sm text-purple-900 mb-1">Optimal Block Duration</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {productivityInsights.productivity_profile.optimal_focus_block_duration} min
                      </div>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-lg text-center">
                      <div className="text-sm text-indigo-900 mb-1">Blocks Per Day</div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {productivityInsights.productivity_profile.optimal_blocks_per_day}
                      </div>
                    </div>
                    <div className="p-4 bg-pink-50 rounded-lg text-center">
                      <div className="text-sm text-pink-900 mb-1">Daily Capacity</div>
                      <div className="text-2xl font-bold text-pink-600">
                        {productivityInsights.productivity_profile.deep_work_capacity_hours}h
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Focus Optimization */}
            {productivityInsights.focus_optimization && (
              <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    Recommended Focus Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-700 leading-relaxed">
                    {productivityInsights.focus_optimization.recommended_schedule}
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">Ideal Block Duration</div>
                      <div className="text-xl font-bold text-indigo-600">
                        {productivityInsights.focus_optimization.ideal_block_duration} min
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">Break Between Blocks</div>
                      <div className="text-xl font-bold text-indigo-600">
                        {productivityInsights.focus_optimization.spacing_between_blocks_minutes} min
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">Recovery Time</div>
                      <div className="text-xl font-bold text-indigo-600">
                        {productivityInsights.focus_optimization.recovery_time_needed_minutes} min
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <div className="text-xs text-slate-600 mb-1">Max Sessions/Day</div>
                      <div className="text-xl font-bold text-indigo-600">
                        {productivityInsights.focus_optimization.max_deep_work_sessions_per_day}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interruption Analysis */}
            {productivityInsights.interruption_analysis && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-lg text-red-900">Interruption Impact Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 bg-white rounded-lg">
                      <div className="text-sm text-slate-600 mb-1">Most Disruptive Type</div>
                      <div className="font-bold text-red-600 capitalize">
                        {productivityInsights.interruption_analysis.most_disruptive_type}
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-lg">
                      <div className="text-sm text-slate-600 mb-1">Avg Interruptions/Day</div>
                      <div className="font-bold text-red-600">
                        {productivityInsights.interruption_analysis.avg_interruptions_per_day.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-red-100 border-red-300">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-900">
                      <strong>Cost of Context Switching:</strong> {productivityInsights.interruption_analysis.true_cost_of_context_switching}
                    </AlertDescription>
                  </Alert>

                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">Protection Strategies:</h5>
                    <div className="space-y-2">
                      {productivityInsights.interruption_analysis.protection_strategies?.map((strategy, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-lg border-2 border-green-200 text-sm">
                          <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700">{strategy}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Insights */}
            {productivityInsights.actionable_insights && (
              <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-600" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {productivityInsights.actionable_insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                          {idx + 1}
                        </div>
                        <span className="text-sm text-slate-700">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Personalized Recommendations</CardTitle>
                <CardDescription>Data-driven actions to improve your productivity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {productivityInsights.personalized_recommendations?.map((rec, idx) => (
                    <div key={idx} className="p-4 border-2 rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className={cn(
                              "text-white",
                              rec.priority === 'critical' && 'bg-red-600',
                              rec.priority === 'high' && 'bg-orange-600',
                              rec.priority === 'medium' && 'bg-yellow-600',
                              rec.priority === 'low' && 'bg-green-600'
                            )}>
                              {rec.priority.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {rec.category}
                            </Badge>
                            <Badge className={cn(
                              rec.implementation_difficulty === 'easy' && 'bg-green-100 text-green-800',
                              rec.implementation_difficulty === 'moderate' && 'bg-yellow-100 text-yellow-800',
                              rec.implementation_difficulty === 'difficult' && 'bg-red-100 text-red-800'
                            )}>
                              {rec.implementation_difficulty} to implement
                            </Badge>
                          </div>
                          
                          <p className="font-semibold text-slate-900 mb-2">{rec.recommendation}</p>
                          <p className="text-sm text-slate-600 mb-2">{rec.expected_impact}</p>
                          
                          {rec.estimated_time_savings_hours_per_week > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-green-700">
                                Save ~{rec.estimated_time_savings_hours_per_week}h/week
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            {productivityInsights.predictive_insights && (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    Predictive Capacity Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 text-center">
                      <div className="text-sm text-purple-900 mb-2">Weekly Capacity Forecast</div>
                      <div className="text-4xl font-bold text-purple-600 mb-1">
                        {productivityInsights.predictive_insights.weekly_capacity_forecast}h
                      </div>
                      <p className="text-xs text-slate-600">of productive focus time</p>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 text-center">
                      <div className="text-sm text-blue-900 mb-2">Sustainability Score</div>
                      <div className="text-4xl font-bold text-blue-600 mb-1">
                        {productivityInsights.predictive_insights.sustainability_score}
                      </div>
                      <Badge className={cn(
                        "text-white mt-2",
                        productivityInsights.predictive_insights.burnout_risk === 'low' && 'bg-green-600',
                        productivityInsights.predictive_insights.burnout_risk === 'medium' && 'bg-yellow-600',
                        productivityInsights.predictive_insights.burnout_risk === 'high' && 'bg-red-600'
                      )}>
                        {productivityInsights.predictive_insights.burnout_risk} burnout risk
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-lg border-2 border-indigo-200">
                    <h5 className="font-semibold text-indigo-900 mb-2">Best Days for Complex Tasks:</h5>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {productivityInsights.predictive_insights.best_days_for_deep_work?.map(day => (
                        <Badge key={day} className="bg-indigo-600 text-white capitalize">
                          {day}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-slate-600">
                      <strong>Avoid Complex Tasks:</strong> {productivityInsights.predictive_insights.times_to_avoid_complex_tasks}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Historical Charts */}
      {chartData.length > 0 && (
        <Tabs defaultValue="comparison" className="space-y-6">
          <TabsList>
            <TabsTrigger value="comparison">Planned vs Actual</TabsTrigger>
            <TabsTrigger value="trend">Productivity Trend</TabsTrigger>
            <TabsTrigger value="debt">Time Debt Trend</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm">Focus Time: Planned vs Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="planned" fill="#94a3b8" name="Planned" />
                    <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm">Productivity Score Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="productivity" stroke="#8b5cf6" strokeWidth={3} name="Productivity" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="debt">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-sm">Time Debt Accumulation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="debt" stroke="#ef4444" fill="#fecaca" name="Time Debt" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Peak Hours Display (only if AI analysis not run yet) */}
      {peakHours.length > 0 && !productivityInsights && (
        <Card className="border-none shadow-lg bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Your Peak Productivity Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {peakHours.map((hourData, index) => (
              <div key={hourData.hour} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">
                      {moment().hour(hourData.hour).format('h:00 A')} - {moment().hour(hourData.hour + 1).format('h:00 A')}
                    </div>
                    <div className="text-xs text-slate-600">
                      Peak {hourData.frequency} time{hourData.frequency > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
                <Badge className="bg-purple-600">
                  {hourData.avgProductivity.toFixed(0)}% avg
                </Badge>
              </div>
            ))}
            <div className="mt-4 p-3 bg-white rounded-lg border-2 border-purple-300">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5" />
                <div className="text-sm text-slate-700">
                  <strong>AI Recommendation:</strong> Try blocking these hours for your most important deep work tasks. 
                  Your data shows you're {peakHours[0]?.avgProductivity.toFixed(0)}% more productive during these periods.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {trackingData.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Focus className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Time Tracking Data Yet</h3>
            <p className="text-sm text-slate-600 mb-4">
              Start blocking focus time on your calendar to begin tracking productivity patterns
            </p>
            <p className="text-xs text-slate-500">
              Create calendar events with type "Time Block / Focus Time" to enable automatic tracking
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
