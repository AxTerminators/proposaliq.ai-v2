import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Users, Clock, CheckCircle, X, Lightbulb, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function PredictiveRiskAlerts({ organization, allEvents, teamMembers }) {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

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
    setAnalyzing(true);
    try {
      // Get upcoming events and tasks
      const upcomingEvents = allEvents.filter(event => 
        moment(event.start_date).isAfter(moment()) &&
        moment(event.start_date).isBefore(moment().add(30, 'days'))
      );

      // Analyze each event with AI
      for (const event of upcomingEvents.slice(0, 10)) { // Limit to 10 to avoid token overuse
        // Skip if already has recent prediction
        const existingPrediction = predictions.find(p => 
          p.event_id === event.id && 
          moment(p.last_calculated).isAfter(moment().subtract(24, 'hours'))
        );
        
        if (existingPrediction) continue;

        // Get team member workload
        const assignedEmail = event.assigned_to || event.created_by_email;
        const teamMember = teamMembers.find(m => m.email === assignedEmail);
        
        const memberEvents = allEvents.filter(e => 
          e.assigned_to === assignedEmail || e.created_by_email === assignedEmail
        );

        // Use AI to analyze risk
        const analysisPrompt = `Analyze this scheduled event for delay risk:

Event: ${event.title}
Type: ${event.source_type}
Scheduled Date: ${moment(event.start_date).format('MMMM D, YYYY')}
Days Until Due: ${moment(event.start_date).diff(moment(), 'days')}
Assigned To: ${teamMember?.full_name || 'Unassigned'}

Team Member Context:
- Current active tasks: ${memberEvents.length}
- Tasks due in next 7 days: ${memberEvents.filter(e => moment(e.start_date).diff(moment(), 'days') <= 7).length}

Analyze and provide:
1. Risk level (low/medium/high/critical)
2. Delay probability (0-100%)
3. Predicted delay in days (if any)
4. Top 3 risk factors
5. Top 3 recommendations to mitigate risk
6. Confidence in prediction (0-100%)`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt: analysisPrompt,
          response_json_schema: {
            type: "object",
            properties: {
              risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
              delay_probability: { type: "number" },
              predicted_delay_days: { type: "number" },
              risk_factors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    factor_type: { type: "string" },
                    description: { type: "string" },
                    impact_score: { type: "number" }
                  }
                }
              },
              recommendations: {
                type: "array",
                items: { type: "string" }
              },
              confidence_score: { type: "number" }
            }
          }
        });

        // Create prediction record
        if (response.risk_level !== 'low') { // Only store medium+ risks
          await base44.entities.ScheduleRiskPrediction.create({
            organization_id: organization.id,
            event_id: event.id,
            event_source_type: event.source_type,
            event_title: event.title,
            scheduled_date: event.start_date,
            risk_level: response.risk_level,
            delay_probability: response.delay_probability,
            predicted_delay_days: response.predicted_delay_days || 0,
            risk_factors: response.risk_factors || [],
            recommendations: response.recommendations || [],
            confidence_score: response.confidence_score || 0,
            last_calculated: new Date().toISOString(),
            is_active: true,
            user_acknowledged: false
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['schedule-risk-predictions'] });
    } catch (error) {
      console.error("Error running predictive analysis:", error);
      alert("Failed to run predictive analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'from-red-500 to-red-700';
      case 'high': return 'from-orange-500 to-orange-700';
      case 'medium': return 'from-amber-500 to-amber-700';
      default: return 'from-blue-500 to-blue-700';
    }
  };

  const getRiskBadgeColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-amber-600 text-white';
      default: return 'bg-blue-600 text-white';
    }
  };

  const unacknowledgedPredictions = predictions.filter(p => !p.user_acknowledged);
  const criticalPredictions = predictions.filter(p => p.risk_level === 'critical');

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-purple-600" />
              Predictive Risk Analysis
            </CardTitle>
            <Button 
              onClick={runPredictiveAnalysis}
              disabled={analyzing}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900">{unacknowledgedPredictions.length}</div>
              <div className="text-sm text-slate-600">New Risks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{criticalPredictions.length}</div>
              <div className="text-sm text-slate-600">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {predictions.length > 0 
                  ? Math.round(predictions.reduce((acc, p) => acc + p.confidence_score, 0) / predictions.length)
                  : 0}%
              </div>
              <div className="text-sm text-slate-600">Avg Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {predictions.length === 0 && !isLoading && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Risk Predictions Yet</h3>
            <p className="text-sm text-slate-600 mb-4">Run AI analysis to identify potential scheduling risks</p>
            <Button onClick={runPredictiveAnalysis} disabled={analyzing}>
              <TrendingUp className="w-4 h-4 mr-2" />
              Run First Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {predictions.map((prediction) => (
          <Card key={prediction.id} className={cn(
            "border-2 transition-all",
            !prediction.user_acknowledged && "shadow-lg",
            prediction.risk_level === 'critical' && "border-red-500 bg-red-50/50",
            prediction.risk_level === 'high' && "border-orange-500 bg-orange-50/50",
            prediction.risk_level === 'medium' && "border-amber-500 bg-amber-50/50"
          )}>
            <CardHeader className={cn("bg-gradient-to-r text-white", getRiskColor(prediction.risk_level))}>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {prediction.event_title}
                  </CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge className={getRiskBadgeColor(prediction.risk_level)}>
                      {prediction.risk_level.toUpperCase()} RISK
                    </Badge>
                    <Badge className="bg-white/20 text-white">
                      {prediction.delay_probability}% delay probability
                    </Badge>
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
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-500 mb-1">Scheduled Date</div>
                  <div className="font-semibold text-slate-900">
                    {moment(prediction.scheduled_date).format('MMM D, YYYY')}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Predicted Delay</div>
                  <div className="font-semibold text-red-600">
                    {prediction.predicted_delay_days > 0 
                      ? `+${prediction.predicted_delay_days} day${prediction.predicted_delay_days > 1 ? 's' : ''}`
                      : 'On track'}
                  </div>
                </div>
              </div>

              {prediction.risk_factors && prediction.risk_factors.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Risk Factors
                  </div>
                  <div className="space-y-2">
                    {prediction.risk_factors.slice(0, 3).map((factor, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0 mt-1.5",
                          factor.impact_score >= 7 ? "bg-red-500" :
                          factor.impact_score >= 5 ? "bg-amber-500" :
                          "bg-blue-500"
                        )} />
                        <div>
                          <div className="font-medium text-slate-900 capitalize">
                            {factor.factor_type?.replace(/_/g, ' ')}
                          </div>
                          <div className="text-slate-600">{factor.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {prediction.recommendations && prediction.recommendations.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    AI Recommendations
                  </div>
                  <div className="space-y-1">
                    {prediction.recommendations.slice(0, 3).map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm bg-white rounded p-2 border">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="text-slate-700">{rec}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-xs text-slate-500">
                  Confidence: {prediction.confidence_score}% • Updated {moment(prediction.last_calculated).fromNow()}
                </div>
                {!prediction.user_acknowledged && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeMutation.mutate(prediction.id)}
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}