
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, Users, Clock, CheckCircle, X, Lightbulb, Loader2, Target, Brain, Sparkles, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function PredictiveRiskAlerts({ organization, allEvents, teamMembers }) {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const { data: predictions = [], isLoading } = useQuery({
    queryKey: ['schedule-risk-predictions', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ScheduleRiskPrediction.filter({
        organization_id: organization.id,
        is_active: true
      }, '-risk_level');
    },
    enabled: !!organization?.id,
  });

  const { data: performanceHistory = [] } = useQuery({
    queryKey: ['task-performance', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      // Fetch up to 100 recent historical performance records for the organization
      return base44.entities.TaskPerformanceHistory.filter({
        organization_id: organization.id
      }, '-actual_completion_date', 100);
    },
    enabled: !!organization?.id,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (predictionId) => {
      return base44.entities.ScheduleRiskPrediction.update(predictionId, {
        user_acknowledged: true,
        acknowledged_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-risk-predictions'] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (predictionId) => {
      return base44.entities.ScheduleRiskPrediction.update(predictionId, {
        is_active: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-risk-predictions'] });
    },
  });

  const runPredictiveAnalysis = async () => {
    if (allEvents.length < 3) {
      setError(new Error("Need at least 3 scheduled events to run risk analysis. Current: " + allEvents.length));
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Get upcoming events
      const upcomingEvents = allEvents.filter(event =>
        moment(event.start_date).isAfter(moment()) &&
        moment(event.start_date).isBefore(moment().add(60, 'days')) // Increased to 60 days for wider scope
      );

      // Group historical performance by team member
      const teamPerformance = teamMembers.map(member => {
        const memberHistory = performanceHistory.filter(h => h.assigned_to_email === member.email);
        
        return {
          email: member.email,
          name: member.full_name,
          total_tasks: memberHistory.length,
          avg_variance_days: memberHistory.length > 0
            ? memberHistory.reduce((sum, h) => sum + (h.variance_days || 0), 0) / memberHistory.length
            : 0,
          on_time_rate: memberHistory.length > 0
            ? (memberHistory.filter(h => h.variance_days <= 0).length / memberHistory.length) * 100
            : 100, // Assume 100% if no history
          avg_quality: memberHistory.length > 0
            ? memberHistory.reduce((sum, h) => sum + (h.quality_score || 3), 0) / memberHistory.length
            : 3, // Default quality
          common_blockers: memberHistory
            .flatMap(h => h.blockers_encountered || [])
            .reduce((acc, b) => {
              const key = b.blocker_type;
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {})
        };
      });

      // Comprehensive AI risk analysis
      const analysisPrompt = `You are an expert project manager with ML-powered risk prediction capabilities. Analyze this schedule and predict delay risks using pattern recognition and historical data.

**UPCOMING EVENTS (Next 60 Days): ${upcomingEvents.length}**
${upcomingEvents.slice(0, 15).map(event => `
- **${event.title}** (ID: ${event.id})
  Type: ${event.source_type}
  Due: ${moment(event.start_date).format('MMM D, YYYY')} (${moment(event.start_date).diff(moment(), 'days')} days)
  Assigned: ${event.assigned_to || 'Unassigned'}
  Priority: ${event.priority || 'N/A'}
  ${event.proposal_id ? `Proposal: Yes` : ''}
`).join('\n')}

**TEAM PERFORMANCE HISTORY:**
${teamPerformance.map(tp => `
- **${tp.name}** (${tp.email})
  Historical Tasks: ${tp.total_tasks}
  On-Time Rate: ${tp.on_time_rate.toFixed(0)}%
  Avg Delay: ${tp.avg_variance_days.toFixed(1)} days
  Quality Score: ${tp.avg_quality.toFixed(1)}/5
  Common Blockers: ${Object.entries(tp.common_blockers).slice(0, 3).map(([type, count]) => `${type} (${count}x)`).join(', ') || 'None'}
`).join('\n')}

**CURRENT WORKLOAD:**
${teamMembers.map(member => {
  const memberEvents = allEvents.filter(e =>
    e.assigned_to === member.email || e.created_by_email === member.email
  );
  const upcomingCount = memberEvents.filter(e => moment(e.start_date).isAfter(moment())).length;
  return `- ${member.full_name} (${member.email}): ${upcomingCount} upcoming tasks/events`;
}).join('\n')}

**YOUR TASK - PATTERN-BASED RISK PREDICTION:**

Analyze each upcoming event and predict:

1.  **Delay Risk Classification**: low/medium/high/critical based on:
    -   Team member's historical performance on similar tasks
    -   Current workload and capacity
    -   Task complexity and dependencies
    -   Historical blocker patterns
    -   Time until deadline

2.  **Delay Probability (0-100%)**: Statistical likelihood of delay

3.  **Predicted Delay Duration**: Expected days late if delay occurs

4.  **Risk Factors**: Specific factors increasing delay risk (e.g., 'workload', 'complexity', 'dependencies', 'team_availability', 'historical_pattern', 'external_dependency'). Each factor should have a description and an impact_score (0-10).

5.  **Mitigations**: Actionable recommendations to reduce risk.

6.  **Impacted Dependencies**: What other events/tasks get delayed if this one slips, including their titles and potential impact description.

7.  **Confidence Level**: How certain you are in this prediction (0-100%).

8.  **Prediction Basis**: A brief list of key data points or patterns that led to the prediction (e.g., "Assigned team member's high workload," "Similar tasks historically delayed," "Complex task type").

For 'team_member_analysis' field, please estimate 'current_workload_hours', 'available_capacity' (in hours), 'concurrent_tasks', and 'historical_on_time_rate' for the assigned member based on the provided data.

Focus on events with medium+ risk. Provide comprehensive, actionable risk intelligence.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            risk_predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  event_id: { type: "string", description: "The unique ID of the event being predicted." },
                  event_title: { type: "string", description: "The title of the event." },
                  risk_level: { type: "string", enum: ["low", "medium", "high", "critical"], description: "Overall risk level." },
                  delay_probability: { type: "number", minimum: 0, maximum: 100, description: "Probability of delay in percentage." },
                  predicted_delay_days: { type: "number", description: "Estimated delay in days if risk materializes." },
                  risk_factors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        factor_type: { type: "string", enum: ["workload", "complexity", "dependencies", "team_availability", "historical_pattern", "external_dependency", "priority", "resource_availability"], description: "Type of risk factor." },
                        description: { type: "string", description: "Detailed description of the risk factor." },
                        impact_score: { type: "number", minimum: 0, maximum: 10, description: "Impact score of the factor (0-10)." }
                      },
                      required: ["factor_type", "description", "impact_score"]
                    },
                    description: "List of identified risk factors."
                  },
                  impacted_events: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        event_title: { type: "string", description: "Title of the dependent event." },
                        potential_impact: { type: "string", description: "Description of the potential impact on this dependent event." }
                      },
                      required: ["event_title", "potential_impact"]
                    },
                    description: "Other events potentially impacted by this delay."
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Actionable recommendations to mitigate risk."
                  },
                  team_member_analysis: {
                    type: "object",
                    properties: {
                      assigned_to: { type: "string", description: "Email of the assigned team member." },
                      current_workload_hours: { type: "number", description: "Estimated current workload in hours." },
                      available_capacity: { type: "number", description: "Estimated available capacity in hours." },
                      concurrent_tasks: { type: "number", description: "Number of tasks assigned concurrently." },
                      historical_on_time_rate: { type: "number", description: "Assigned member's historical on-time task completion rate (0-100%)." }
                    },
                    description: "Detailed analysis of the assigned team member's capacity and history."
                  },
                  confidence_score: { type: "number", minimum: 0, maximum: 100, description: "Confidence level of the prediction." },
                  prediction_basis: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key reasons/data points for the prediction."
                  }
                },
                required: ["event_id", "event_title", "risk_level", "delay_probability", "predicted_delay_days", "risk_factors", "recommendations", "confidence_score"]
              }
            },
            overall_schedule_health: {
              type: "object",
              properties: {
                health_score: { type: "number", minimum: 0, maximum: 100, description: "Overall health score of the schedule." },
                critical_path_risks: { type: "number", description: "Number of risks on the critical path." },
                team_capacity_utilization: { type: "number", description: "Overall team capacity utilization in percentage." },
                recommended_buffer_days: { type: "number", description: "Recommended buffer days to absorb potential delays." }
              },
              required: ["health_score", "critical_path_risks", "team_capacity_utilization", "recommended_buffer_days"]
            },
            strategic_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["urgent", "high", "medium", "low"], description: "Priority of the recommendation." },
                  recommendation: { type: "string", description: "Strategic recommendation to improve schedule health." },
                  expected_impact: { type: "string", description: "Expected outcome if recommendation is followed." },
                  applicable_to: { type: "array", items: { type: "string" }, description: "Areas or events this recommendation applies to." }
                },
                required: ["priority", "recommendation", "expected_impact"]
              },
              description: "Strategic, high-level recommendations for the entire schedule."
            }
          },
          required: ["risk_predictions", "overall_schedule_health", "strategic_recommendations"]
        }
      });

      // Create/update prediction records
      for (const pred of result.risk_predictions || []) {
        if (pred.risk_level === 'low') continue; // Only store medium+ risks

        // Find the original event to get source_type and scheduled_date
        const event = upcomingEvents.find(e => e.id === pred.event_id);
        if (!event) {
          console.warn(`Event with ID ${pred.event_id} not found for prediction. Skipping.`);
          continue;
        }

        // Check if prediction already exists for this event
        const existing = predictions.find(p => p.event_id === event.id);

        const predictionData = {
          organization_id: organization.id,
          event_id: event.id,
          event_source_type: event.source_type, // From original event
          event_title: pred.event_title || event.title, // Use AI title or original event title
          scheduled_date: event.start_date, // From original event
          risk_level: pred.risk_level,
          delay_probability: pred.delay_probability,
          predicted_delay_days: pred.predicted_delay_days || 0,
          risk_factors: pred.risk_factors || [],
          impacted_events: pred.impacted_events || [],
          recommendations: pred.recommendations || [],
          team_member_analysis: pred.team_member_analysis || {},
          confidence_score: pred.confidence_score || 0,
          prediction_basis: pred.prediction_basis || [],
          last_calculated: new Date().toISOString(),
          is_active: true,
          user_acknowledged: false // New predictions are unacknowledged by default
        };

        if (existing) {
          await base44.entities.ScheduleRiskPrediction.update(existing.id, predictionData);
        } else {
          await base44.entities.ScheduleRiskPrediction.create(predictionData);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['schedule-risk-predictions'] });
      alert(`✓ AI risk analysis complete! Found ${result.risk_predictions?.filter(p => p.risk_level !== 'low').length} potential risks.`);

    } catch (err) {
      console.error("Error running predictive analysis:", err);
      setError(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'from-red-500 to-red-700';
      case 'high': return 'from-orange-500 to-orange-700';
      case 'medium': return 'from-amber-500 to-amber-700';
      default: return 'from-blue-500 to-blue-700'; // Fallback for low/default
    }
  };

  const getRiskBadgeColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-amber-600 text-white';
      default: return 'bg-blue-600 text-white'; // Fallback for low/default
    }
  };

  const unacknowledgedPredictions = predictions.filter(p => !p.user_acknowledged);
  const criticalPredictions = predictions.filter(p => p.risk_level === 'critical');
  const highPredictions = predictions.filter(p => p.risk_level === 'high');

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-red-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Predictive Risk Alerts</CardTitle>
                <CardDescription>ML-powered delay prediction from historical patterns</CardDescription>
              </div>
            </div>
            <Button
              onClick={runPredictiveAnalysis}
              disabled={analyzing || allEvents.length < 3}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run AI Risk Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {allEvents.length < 3 && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription>
            Need at least 3 scheduled events to run risk analysis. Current: {allEvents.length}.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Dashboard */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-600" />
            <div className="text-3xl font-bold text-red-600">{unacknowledgedPredictions.length}</div>
            <div className="text-sm text-red-900">New Risks</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-600" />
            <div className="text-3xl font-bold text-red-600">{criticalPredictions.length}</div>
            <div className="text-sm text-red-900">Critical</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-600" />
            <div className="text-3xl font-bold text-orange-600">{highPredictions.length}</div>
            <div className="text-sm text-orange-900">High Risk</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <Brain className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-3xl font-bold text-blue-600">
              {predictions.length > 0
                ? Math.round(predictions.reduce((acc, p) => acc + (p.confidence_score || 0), 0) / predictions.length)
                : 0}%
            </div>
            <div className="text-sm text-blue-900">Avg Confidence</div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4 text-center">
            <Target className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-3xl font-bold text-purple-600">{performanceHistory.length}</div>
            <div className="text-sm text-purple-900">Historical Data Points</div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Predictions */}
      {predictions.length === 0 && !isLoading && !analyzing ? (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Brain className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Risk Predictions Yet</h3>
            <p className="text-sm text-slate-600 mb-4">
              Run AI analysis to identify potential scheduling risks using ML pattern recognition
            </p>
            <Button
              onClick={runPredictiveAnalysis}
              disabled={analyzing || allEvents.length < 3}
              className="bg-gradient-to-r from-red-600 to-orange-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Run First Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Risks ({predictions.length})</TabsTrigger>
            <TabsTrigger value="critical">Critical ({criticalPredictions.length})</TabsTrigger>
            <TabsTrigger value="high">High ({highPredictions.length})</TabsTrigger>
            <TabsTrigger value="unacked">New ({unacknowledgedPredictions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {predictions.length === 0 ? (
                 <Card className="border-green-200 bg-green-50">
                 <CardContent className="p-12 text-center">
                   <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                   <h3 className="text-lg font-semibold text-green-900 mb-2">All Clear!</h3>
                   <p className="text-green-700">
                     No scheduling risks detected in your upcoming events.
                   </p>
                 </CardContent>
               </Card>
            ) : (
              predictions.map((prediction) => (
                <Card key={prediction.id} className={cn(
                  "border-2 transition-all hover:shadow-lg",
                  !prediction.user_acknowledged && "shadow-lg ring-2 ring-blue-400",
                  prediction.risk_level === 'critical' && "border-red-500",
                  prediction.risk_level === 'high' && "border-orange-500",
                  prediction.risk_level === 'medium' && "border-amber-500"
                )}>
                  <CardHeader className={cn("bg-gradient-to-r text-white", getRiskColor(prediction.risk_level))}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          {prediction.event_title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className={getRiskBadgeColor(prediction.risk_level)}>
                            {prediction.risk_level.toUpperCase()} RISK
                          </Badge>
                          <Badge className="bg-white/20 text-white">
                            {prediction.delay_probability}% delay probability
                          </Badge>
                          {prediction.predicted_delay_days > 0 && (
                            <Badge className="bg-white/20 text-white">
                              +{prediction.predicted_delay_days} day forecast
                            </Badge>
                          )}
                          <Badge className="bg-white/20 text-white">
                            {prediction.confidence_score}% confidence
                          </Badge>
                        </div>
                      </div>
                      {!prediction.user_acknowledged && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/20"
                          onClick={() => dismissMutation.mutate(prediction.id)}
                          title="Dismiss this alert"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {/* Event Details */}
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-slate-500 mb-1">Scheduled Date</div>
                        <div className="font-semibold text-slate-900">
                          {moment(prediction.scheduled_date).format('MMM D, YYYY')}
                        </div>
                        <div className="text-xs text-slate-600">
                          {moment(prediction.scheduled_date).fromNow()}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1">Predicted Outcome</div>
                        <div className={cn(
                          "font-semibold",
                          prediction.predicted_delay_days > 0 ? "text-red-600" : "text-green-600"
                        )}>
                          {prediction.predicted_delay_days > 0
                            ? `+${prediction.predicted_delay_days} day${prediction.predicted_delay_days > 1 ? 's' : ''} late`
                            : 'On track'}
                        </div>
                      </div>
                    </div>

                    {/* Team Member Analysis */}
                    {prediction.team_member_analysis && prediction.team_member_analysis.assigned_to && (
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Team Member Capacity Analysis: {prediction.team_member_analysis.assigned_to}
                        </h5>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-slate-600">Current Workload:</span>
                            <span className="font-bold text-slate-900 ml-2">
                              {prediction.team_member_analysis.current_workload_hours || 'N/A'}h
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Available Capacity:</span>
                            <span className="font-bold text-green-600 ml-2">
                              {prediction.team_member_analysis.available_capacity || 'N/A'}h
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Concurrent Tasks:</span>
                            <span className="font-bold text-slate-900 ml-2">
                              {prediction.team_member_analysis.concurrent_tasks || 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-600">Historical On-Time:</span>
                            <span className={cn(
                              "font-bold ml-2",
                              (prediction.team_member_analysis.historical_on_time_rate || 0) >= 80 ? "text-green-600" :
                              (prediction.team_member_analysis.historical_on_time_rate || 0) >= 60 ? "text-yellow-600" :
                              "text-red-600"
                            )}>
                              {prediction.team_member_analysis.historical_on_time_rate || 'N/A'}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Risk Factors */}
                    {prediction.risk_factors && prediction.risk_factors.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          Identified Risk Factors
                        </h5>
                        <div className="space-y-2">
                          {prediction.risk_factors.map((factor, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0",
                                (factor.impact_score || 0) >= 7 ? "bg-red-600" :
                                (factor.impact_score || 0) >= 5 ? "bg-orange-600" :
                                "bg-amber-600"
                              )}>
                                {factor.impact_score}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-slate-900 capitalize mb-1">
                                  {factor.factor_type?.replace(/_/g, ' ')}
                                </div>
                                <div className="text-sm text-slate-700">{factor.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Impacted Events */}
                    {prediction.impacted_events && prediction.impacted_events.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-orange-600" />
                          Downstream Impact
                        </h5>
                        <div className="space-y-2">
                          {prediction.impacted_events.map((impact, index) => (
                            <div key={index} className="p-2 bg-orange-50 border border-orange-200 rounded text-sm">
                              <div className="font-medium text-orange-900">{impact.event_title}</div>
                              <div className="text-xs text-slate-700">{impact.potential_impact}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Recommendations */}
                    {prediction.recommendations && prediction.recommendations.length > 0 && (
                      <div>
                        <h5 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4 text-green-600" />
                          AI Mitigation Strategies
                        </h5>
                        <div className="space-y-2">
                          {prediction.recommendations.map((rec, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                                {index + 1}
                              </div>
                              <div className="text-sm text-green-900">{rec}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prediction Basis */}
                    {prediction.prediction_basis && prediction.prediction_basis.length > 0 && (
                      <div className="p-3 bg-slate-50 rounded-lg border">
                        <div className="text-xs font-semibold text-slate-700 mb-2">Analysis Based On:</div>
                        <div className="flex flex-wrap gap-2">
                          {prediction.prediction_basis.map((basis, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {basis}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="text-xs text-slate-500">
                        Last updated {moment(prediction.last_calculated).fromNow()}
                      </div>
                      <div className="flex gap-2">
                        {!prediction.user_acknowledged && (
                          <Button
                            size="sm"
                            onClick={() => acknowledgeMutation.mutate(prediction.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissMutation.mutate(prediction.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="critical" className="space-y-4">
            {criticalPredictions.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <p className="text-green-800">No critical risks found</p>
                </CardContent>
              </Card>
            ) : (
              criticalPredictions.map((prediction) => (
                <Card key={prediction.id} className="border-2 border-red-500 bg-red-50/50">
                  <CardHeader className={cn("bg-gradient-to-r text-white", getRiskColor(prediction.risk_level))}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          {prediction.event_title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className={getRiskBadgeColor(prediction.risk_level)}>
                            {prediction.risk_level.toUpperCase()} RISK
                          </Badge>
                          <Badge className="bg-white/20 text-white">
                            {prediction.delay_probability}% delay probability
                          </Badge>
                          {prediction.predicted_delay_days > 0 && (
                            <Badge className="bg-white/20 text-white">
                              +{prediction.predicted_delay_days} day forecast
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!prediction.user_acknowledged && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/20"
                          onClick={() => dismissMutation.mutate(prediction.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-red-800">
                      {prediction.delay_probability}% chance of {prediction.predicted_delay_days}+ day delay.
                      <span className="ml-2 font-medium">Risk factors: {prediction.risk_factors?.map(f => f.factor_type.replace(/_/g, ' ')).join(', ')}.</span>
                    </p>
                    <div className="flex items-center justify-end pt-3 border-t mt-4">
                      {!prediction.user_acknowledged && (
                        <Button
                          size="sm"
                          onClick={() => acknowledgeMutation.mutate(prediction.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="high" className="space-y-4">
            {highPredictions.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <p className="text-green-800">No high risks found</p>
                </CardContent>
              </Card>
            ) : (
              highPredictions.map((prediction) => (
                <Card key={prediction.id} className="border-2 border-orange-500 bg-orange-50/50">
                  <CardHeader className={cn("bg-gradient-to-r text-white", getRiskColor(prediction.risk_level))}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          {prediction.event_title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className={getRiskBadgeColor(prediction.risk_level)}>
                            {prediction.risk_level.toUpperCase()} RISK
                          </Badge>
                          <Badge className="bg-white/20 text-white">
                            {prediction.delay_probability}% delay probability
                          </Badge>
                          {prediction.predicted_delay_days > 0 && (
                            <Badge className="bg-white/20 text-white">
                              +{prediction.predicted_delay_days} day forecast
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!prediction.user_acknowledged && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/20"
                          onClick={() => dismissMutation.mutate(prediction.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-orange-800">
                      {prediction.delay_probability}% chance of {prediction.predicted_delay_days}+ day delay.
                      <span className="ml-2 font-medium">Risk factors: {prediction.risk_factors?.map(f => f.factor_type.replace(/_/g, ' ')).join(', ')}.</span>
                    </p>
                    <div className="flex items-center justify-end pt-3 border-t mt-4">
                      {!prediction.user_acknowledged && (
                        <Button
                          size="sm"
                          onClick={() => acknowledgeMutation.mutate(prediction.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="unacked" className="space-y-4">
            {unacknowledgedPredictions.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <p className="text-green-800">No new risks to acknowledge</p>
                </CardContent>
              </Card>
            ) : (
              unacknowledgedPredictions.map((prediction) => (
                <Card key={prediction.id} className={cn("border-2 border-blue-500 bg-blue-50/50")}>
                  <CardHeader className={cn("bg-gradient-to-r text-white", getRiskColor(prediction.risk_level))}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          {prediction.event_title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className={getRiskBadgeColor(prediction.risk_level)}>
                            {prediction.risk_level.toUpperCase()} RISK
                          </Badge>
                          <Badge className="bg-white/20 text-white">
                            {prediction.delay_probability}% delay probability
                          </Badge>
                          {prediction.predicted_delay_days > 0 && (
                            <Badge className="bg-white/20 text-white">
                              +{prediction.predicted_delay_days} day forecast
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!prediction.user_acknowledged && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-white hover:bg-white/20"
                          onClick={() => dismissMutation.mutate(prediction.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <p className="text-sm text-blue-800">
                      This is a new alert. {prediction.delay_probability}% chance of {prediction.predicted_delay_days}+ day delay.
                      <span className="ml-2 font-medium">Risk factors: {prediction.risk_factors?.map(f => f.factor_type.replace(/_/g, ' ')).join(', ')}.</span>
                    </p>
                    <div className="flex items-center justify-end pt-3 border-t mt-4">
                      {!prediction.user_acknowledged && (
                        <Button
                          size="sm"
                          onClick={() => acknowledgeMutation.mutate(prediction.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
