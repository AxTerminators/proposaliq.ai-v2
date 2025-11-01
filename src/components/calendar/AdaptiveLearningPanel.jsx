import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, Clock, AlertCircle, Lightbulb, RefreshCw, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function AdaptiveLearningPanel({ organization, user }) {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);

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
      }, '-actual_completion_date', 50);
    },
    enabled: !!organization?.id,
  });

  const runAdaptiveLearning = async () => {
    setAnalyzing(true);
    try {
      // Analyze historical data to identify patterns
      const analysisPrompt = `Analyze this historical task performance data to identify scheduling patterns and provide adaptive recommendations.

HISTORICAL DATA (${performanceHistory.length} completed tasks):
${performanceHistory.slice(0, 20).map(h => `
- Task: ${h.task_title}
- Assigned to: ${h.assigned_to_email}
- Estimated: ${h.estimated_hours}h, Actual: ${h.actual_hours}h (${h.variance_percentage?.toFixed(0)}% variance)
- Due: ${h.estimated_completion_date}, Completed: ${moment(h.actual_completion_date).format('YYYY-MM-DD')} (${h.variance_days} days ${h.variance_days > 0 ? 'late' : 'early'})
- Quality: ${h.quality_score}/5, Complexity: ${h.complexity_rating}/5
${h.blockers_encountered?.length > 0 ? `- Blockers: ${h.blockers_encountered.map(b => b.description).join(', ')}` : ''}
`).join('\n')}

CURRENT PATTERNS:
${patterns.map(p => `- ${p.pattern_name}: ${p.pattern_data?.average_duration_hours}h avg, ${p.confidence_score}% confidence`).join('\n')}

Identify:
1. Task duration patterns by type/complexity
2. Team member performance patterns (who tends to overrun vs underestimate)
3. Optimal working hours for each team member
4. Common blockers and how to account for them
5. Buffer time recommendations
6. Recommended scheduling adjustments for future similar tasks

Return actionable patterns and specific recommendations.`;

      const response = await base44.integrations.Core.InvokeLLM({
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
                  confidence_score: { type: "number" },
                  pattern_data: { type: "object" },
                  recommendation: { type: "string" }
                }
              }
            },
            team_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user_email: { type: "string" },
                  typical_overrun_percentage: { type: "number" },
                  best_hours: { type: "array", items: { type: "number" } },
                  recommended_buffer: { type: "number" }
                }
              }
            },
            scheduling_recommendations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      // Save new patterns
      if (response.patterns_identified) {
        for (const pattern of response.patterns_identified) {
          await base44.entities.SchedulingPattern.create({
            organization_id: organization.id,
            pattern_type: pattern.pattern_type || 'task_duration',
            pattern_name: pattern.pattern_name,
            pattern_data: pattern.pattern_data || {},
            confidence_score: pattern.confidence_score || 0,
            sample_size: performanceHistory.length,
            last_occurrence: new Date().toISOString(),
            created_by_ai: true,
            is_active: true
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['scheduling-patterns'] });
      
    } catch (error) {
      console.error("Error running adaptive learning:", error);
      alert("Failed to analyze patterns");
    } finally {
      setAnalyzing(false);
    }
  };

  const userPatterns = patterns.filter(p => p.user_email === user.email);
  const teamPatterns = patterns.filter(p => !p.user_email);

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              Adaptive Learning & Pattern Recognition
            </CardTitle>
            <Button 
              onClick={runAdaptiveLearning}
              disabled={analyzing || performanceHistory.length < 5}
              size="sm"
              className="bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analyze Patterns
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600">{patterns.length}</div>
              <div className="text-sm text-slate-600">Active Patterns</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{performanceHistory.length}</div>
              <div className="text-sm text-slate-600">Tasks Analyzed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">
                {patterns.length > 0 
                  ? Math.round(patterns.reduce((sum, p) => sum + (p.accuracy_rate || 0), 0) / patterns.length)
                  : 0}%
              </div>
              <div className="text-sm text-slate-600">Avg Accuracy</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {performanceHistory.length < 5 && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <strong>Learning in Progress:</strong> Complete at least 5 tasks to enable adaptive learning. 
                The system needs historical data to identify your patterns and improve scheduling accuracy.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Your Personal Patterns */}
      {userPatterns.length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-900 mb-3">Your Scheduling Patterns</h4>
          <div className="space-y-3">
            {userPatterns.map((pattern) => (
              <Card key={pattern.id} className="border-none shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-600" />
                        {pattern.pattern_name}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Based on {pattern.sample_size} tasks • {pattern.confidence_score}% confidence
                      </div>
                    </div>
                    <Badge className="bg-indigo-600">
                      {pattern.pattern_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {pattern.pattern_data?.average_duration_hours && (
                    <div className="text-sm text-slate-700 mb-2">
                      <strong>Avg Duration:</strong> {pattern.pattern_data.average_duration_hours.toFixed(1)} hours
                    </div>
                  )}

                  {pattern.pattern_data?.typical_overrun_percentage && (
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
                    <div className="text-sm text-slate-700 mb-2">
                      <strong>Peak Hours:</strong> {pattern.pattern_data.best_hours.map(h => 
                        moment().hour(h).format('ha')
                      ).join(', ')}
                    </div>
                  )}

                  {pattern.accuracy_rate !== undefined && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>Pattern Accuracy</span>
                        <span>{pattern.accuracy_rate?.toFixed(0)}%</span>
                      </div>
                      <Progress value={pattern.accuracy_rate || 0} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Team-Wide Patterns */}
      {teamPatterns.length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-900 mb-3">Team-Wide Patterns</h4>
          <div className="space-y-3">
            {teamPatterns.map((pattern) => (
              <Card key={pattern.id} className="border-none shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-600" />
                        {pattern.pattern_name}
                      </div>
                      <div className="text-xs text-slate-600 mt-1">
                        Team-wide pattern • {pattern.confidence_score}% confidence
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {pattern.pattern_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {patterns.length > 0 && (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                <strong>AI is Adapting Your Schedule:</strong> Based on your patterns, the system is automatically 
                adjusting future task estimates and suggesting optimal scheduling times. Tasks similar to ones you've 
                completed are now being scheduled {patterns[0]?.pattern_data?.typical_overrun_percentage > 0 
                  ? `with ${Math.round(patterns[0].pattern_data.typical_overrun_percentage)}% more time` 
                  : 'more accurately'} to match your actual performance.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}