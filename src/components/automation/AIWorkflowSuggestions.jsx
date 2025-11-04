import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Sparkles,
  Loader2,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Zap,
  Play,
  Eye,
  Target,
  Activity,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function AIWorkflowSuggestions({ organization, proposals = [], automationRules = [] }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [behavioralInsights, setBehavioralInsights] = useState(null);
  const [analyzingBehavior, setAnalyzingBehavior] = useState(false);
  const [error, setError] = useState(null);

  // Load activity logs for behavioral analysis
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activity-logs-automation', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const allLogs = await base44.entities.ActivityLog.list('-created_date', 500);
      return allLogs.filter(log => 
        proposals.some(p => p.id === log.proposal_id)
      );
    },
    enabled: !!organization?.id && proposals.length > 0,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData) => {
      return base44.entities.ProposalAutomationRule.create({
        ...ruleData,
        organization_id: organization.id,
        is_active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    }
  });

  const runBehavioralAnalysis = async () => {
    if (activityLogs.length < 20) {
      alert("Need at least 20 logged activities to analyze behavioral patterns. Keep working in ProposalIQ!");
      return;
    }

    setAnalyzingBehavior(true);
    setError(null);

    try {
      // Analyze user behavior patterns
      const actionDistribution = activityLogs.reduce((acc, log) => {
        acc[log.action_type] = (acc[log.action_type] || 0) + 1;
        return acc;
      }, {});

      const userActivity = activityLogs.reduce((acc, log) => {
        if (!log.user_email) return acc;
        if (!acc[log.user_email]) {
          acc[log.user_email] = { email: log.user_email, actions: [] };
        }
        acc[log.user_email].actions.push(log);
        return acc;
      }, {});

      const analysisPrompt = `You are an expert in workflow optimization and behavioral analysis. Analyze this team's proposal management behavior to suggest intelligent automation opportunities.

**BEHAVIORAL DATA ANALYSIS:**

**Overall Activity Patterns (${activityLogs.length} actions):**
${Object.entries(actionDistribution).map(([action, count]) => 
  `- ${action.replace(/_/g, ' ')}: ${count} times`
).join('\n')}

**Team Member Patterns:**
${Object.values(userActivity).slice(0, 10).map(user => `
- ${user.email}:
  Total actions: ${user.actions.length}
  Most common: ${user.actions.reduce((acc, log) => {
    acc[log.action_type] = (acc[log.action_type] || 0) + 1;
    return acc;
  }, {})}
  Activity trend: ${user.actions.slice(-10).map(a => moment(a.created_date).format('MMM D')).join(', ')}
`).join('\n')}

**Proposal Flow Analysis:**
${proposals.slice(0, 10).map(p => {
  const pLogs = activityLogs.filter(log => log.proposal_id === p.id);
  return `
- ${p.proposal_name}:
  Status: ${p.status}
  Total activities: ${pLogs.length}
  Timeline: Created ${moment(p.created_date).fromNow()}
  Last activity: ${pLogs.length > 0 ? moment(pLogs[0].created_date).fromNow() : 'No activity'}
  Current stage time: ${moment().diff(moment(p.updated_date), 'days')} days
`;
}).join('\n')}

**CURRENT AUTOMATION RULES:**
${automationRules.map(r => `- ${r.rule_name}: ${r.trigger?.trigger_type} → ${r.actions?.length} actions (triggered ${r.trigger_count || 0}x)`).join('\n')}

**YOUR TASK - BEHAVIORAL WORKFLOW INTELLIGENCE:**

Analyze team behavior to identify:

1. **Repetitive Manual Tasks**: What tasks do users repeatedly do that could be automated?

2. **Workflow Bottlenecks**: Where do proposals get stuck and why?

3. **Missed Opportunities**: What beneficial actions are NOT happening but should be?

4. **Team Collaboration Patterns**: How does the team work together? What could be improved?

5. **Time-Based Patterns**: What happens at specific times or intervals?

6. **Smart Automation Suggestions**: Propose 5-7 automation rules that would:
   - Eliminate repetitive work
   - Prevent bottlenecks
   - Improve team coordination
   - Ensure nothing falls through cracks
   - Accelerate proposal delivery

For each suggestion, provide:
- Specific trigger and conditions
- Concrete actions to take
- Expected time savings
- Priority level
- Implementation ease

Be creative and identify non-obvious automation opportunities!`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            behavioral_insights: {
              type: "object",
              properties: {
                repetitive_tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      task_description: { type: "string" },
                      frequency: { type: "number" },
                      time_cost_per_occurrence_minutes: { type: "number" },
                      automation_potential: { type: "string", enum: ["high", "medium", "low"] }
                    }
                  }
                },
                workflow_bottlenecks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      bottleneck_location: { type: "string" },
                      avg_time_stuck_days: { type: "number" },
                      root_cause: { type: "string" },
                      proposed_solution: { type: "string" }
                    }
                  }
                },
                missed_opportunities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      opportunity_description: { type: "string" },
                      potential_benefit: { type: "string" },
                      how_to_automate: { type: "string" }
                    }
                  }
                },
                collaboration_patterns: {
                  type: "object",
                  properties: {
                    most_active_hours: { type: "array", items: { type: "number" } },
                    avg_response_time_hours: { type: "number" },
                    team_size: { type: "number" },
                    collaboration_bottlenecks: { type: "array", items: { type: "string" } },
                    recommended_improvements: { type: "array", items: { type: "string" } }
                  }
                }
              }
            },
            automation_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rule_name: { type: "string" },
                  description: { type: "string" },
                  category: {
                    type: "string",
                    enum: ["bottleneck_prevention", "team_coordination", "quality_assurance", "deadline_management", "efficiency", "communication"]
                  },
                  value_proposition: { type: "string" },
                  trigger: {
                    type: "object",
                    properties: {
                      trigger_type: { type: "string" },
                      trigger_conditions: { type: "object" }
                    }
                  },
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action_type: { type: "string" },
                        action_config: { type: "object" }
                      }
                    }
                  },
                  expected_impact: { type: "string" },
                  time_savings_hours_per_month: { type: "number" },
                  priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  implementation_difficulty: { type: "string", enum: ["easy", "moderate", "complex"] },
                  confidence_score: { type: "number", minimum: 0, maximum: 100 },
                  prevents_issues: { type: "array", items: { type: "string" } },
                  enables_benefits: { type: "array", items: { type: "string" } }
                }
              }
            },
            overall_automation_maturity: {
              type: "object",
              properties: {
                current_level: { type: "string", enum: ["beginner", "intermediate", "advanced", "expert"] },
                automation_coverage: { type: "number", minimum: 0, maximum: 100 },
                recommended_next_steps: { type: "array", items: { type: "string" } },
                potential_time_savings_hours_per_month: { type: "number" }
              }
            }
          },
          required: ["behavioral_insights", "automation_suggestions", "overall_automation_maturity"]
        }
      });

      setBehavioralInsights(result);
      alert(`✓ Behavioral analysis complete! Found ${result.automation_suggestions.length} automation opportunities.`);

    } catch (err) {
      console.error("Error analyzing behavior:", err);
      setError(err);
    } finally {
      setAnalyzingBehavior(false);
    }
  };

  const generateSuggestions = async () => {
    setGenerating(true);
    setError(null);

    try {
      const statusDistribution = proposals.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});

      const avgProposalsPerStatus = Object.values(statusDistribution).reduce((a, b) => a + b, 0) / Math.max(Object.keys(statusDistribution).length, 1);

      const prompt = `You are an AI workflow optimization expert. Analyze this proposal pipeline and suggest intelligent automation rules.

**PIPELINE STATE:**
- Total proposals: ${proposals.length}
- Active automation rules: ${automationRules.length}
- Status distribution: ${JSON.stringify(statusDistribution)}
- Stuck proposals: ${Object.entries(statusDistribution).filter(([_, count]) => count > avgProposalsPerStatus * 1.5).map(([status]) => status).join(', ') || 'None'}

**SUGGEST 5-7 HIGH-VALUE AUTOMATION RULES:**

For each, provide complete rule configuration ready to implement.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rule_name: { type: "string" },
                  description: { type: "string" },
                  value_proposition: { type: "string" },
                  trigger: { type: "object" },
                  actions: { type: "array" },
                  expected_impact: { type: "string" },
                  priority: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
    } catch (err) {
      console.error("Error generating suggestions:", err);
      setError(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleImplementSuggestion = async (suggestion) => {
    try {
      await createRuleMutation.mutateAsync({
        rule_name: suggestion.rule_name,
        description: suggestion.description,
        trigger: suggestion.trigger,
        actions: suggestion.actions,
        applies_to: { scope: 'all_proposals' },
        execution_order: 0
      });
      
      alert(`✓ Automation rule "${suggestion.rule_name}" created!`);
      
      if (suggestions) {
        setSuggestions(suggestions.filter(s => s.rule_name !== suggestion.rule_name));
      }
      if (behavioralInsights?.automation_suggestions) {
        setBehavioralInsights({
          ...behavioralInsights,
          automation_suggestions: behavioralInsights.automation_suggestions.filter(s => s.rule_name !== suggestion.rule_name)
        });
      }
    } catch (error) {
      console.error("Error creating rule:", error);
      alert("Error creating automation rule");
    }
  };

  const allSuggestions = [
    ...(suggestions || []),
    ...(behavioralInsights?.automation_suggestions || [])
  ];

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">AI Workflow Intelligence</CardTitle>
              <CardDescription>
                Behavioral analysis and smart automation suggestions
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={runBehavioralAnalysis} 
              disabled={analyzingBehavior || activityLogs.length < 20}
              variant="outline"
            >
              {analyzingBehavior ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Analyze Behavior
                </>
              )}
            </Button>
            <Button 
              onClick={generateSuggestions} 
              disabled={generating || proposals.length === 0}
              className="bg-gradient-to-r from-indigo-600 to-purple-600"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Quick Suggestions
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activityLogs.length < 20 && (
          <Alert className="bg-amber-50 border-amber-200 mb-6">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Need at least 20 logged activities for behavioral analysis. Current: {activityLogs.length}.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {proposals.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed rounded-lg bg-white">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">
              Create some proposals first to get personalized automation suggestions
            </p>
          </div>
        )}

        {behavioralInsights && (
          <Tabs defaultValue="insights" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="maturity">Maturity</TabsTrigger>
            </TabsList>

            {/* Behavioral Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              {/* Repetitive Tasks */}
              {behavioralInsights.behavioral_insights?.repetitive_tasks?.length > 0 && (
                <Card className="border-2 border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Repetitive Manual Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {behavioralInsights.behavioral_insights.repetitive_tasks.map((task, idx) => (
                        <div key={idx} className="p-4 bg-white rounded-lg border-2 border-red-300">
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-red-900">{task.task_description}</h5>
                            <Badge className={
                              task.automation_potential === 'high' ? 'bg-red-600' :
                              task.automation_potential === 'medium' ? 'bg-orange-600' :
                              'bg-yellow-600'
                            } className="text-white">
                              {task.automation_potential} automation potential
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-slate-600">Frequency:</span>
                              <span className="font-bold text-red-900 ml-2">{task.frequency}x</span>
                            </div>
                            <div>
                              <span className="text-slate-600">Time Cost:</span>
                              <span className="font-bold text-red-900 ml-2">~{task.time_cost_per_occurrence_minutes} min/occurrence</span>
                            </div>
                          </div>
                          <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-800">
                            <strong>Potential Savings:</strong> {(task.frequency * task.time_cost_per_occurrence_minutes / 60).toFixed(1)} hours/month if automated
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Collaboration Patterns */}
              {behavioralInsights.behavioral_insights?.collaboration_patterns && (
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="w-5 h-5 text-blue-600" />
                      Team Collaboration Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg text-center">
                        <div className="text-sm text-blue-900 mb-1">Team Size</div>
                        <div className="text-3xl font-bold text-blue-600">
                          {behavioralInsights.behavioral_insights.collaboration_patterns.team_size}
                        </div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg text-center">
                        <div className="text-sm text-purple-900 mb-1">Avg Response Time</div>
                        <div className="text-3xl font-bold text-purple-600">
                          {behavioralInsights.behavioral_insights.collaboration_patterns.avg_response_time_hours}h
                        </div>
                      </div>
                      <div className="p-4 bg-indigo-50 rounded-lg text-center">
                        <div className="text-sm text-indigo-900 mb-1">Peak Activity</div>
                        <div className="text-xl font-bold text-indigo-600">
                          {behavioralInsights.behavioral_insights.collaboration_patterns.most_active_hours?.map(h => 
                            moment().hour(h).format('ha')
                          ).join(', ')}
                        </div>
                      </div>
                    </div>

                    {behavioralInsights.behavioral_insights.collaboration_patterns.recommended_improvements?.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="font-semibold text-slate-900">Recommended Improvements:</h5>
                        {behavioralInsights.behavioral_insights.collaboration_patterns.recommended_improvements.map((rec, idx) => (
                          <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span className="text-green-900">{rec}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Bottlenecks Tab */}
            <TabsContent value="bottlenecks" className="space-y-4">
              {behavioralInsights.behavioral_insights?.workflow_bottlenecks?.map((bottleneck, idx) => (
                <Card key={idx} className="border-2 border-orange-300 bg-orange-50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-orange-900 text-lg mb-2">{bottleneck.bottleneck_location}</h4>
                        <p className="text-sm text-orange-800 mb-3">
                          <strong>Root Cause:</strong> {bottleneck.root_cause}
                        </p>
                        <div className="p-3 bg-white rounded-lg border border-orange-200">
                          <div className="text-xs font-semibold text-orange-900 uppercase mb-1">Proposed Solution</div>
                          <div className="text-sm text-slate-700">{bottleneck.proposed_solution}</div>
                        </div>
                        <div className="mt-2 text-sm">
                          <Badge className="bg-red-600 text-white">
                            Avg {bottleneck.avg_time_stuck_days} days stuck
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Missed Opportunities Tab */}
            <TabsContent value="opportunities" className="space-y-4">
              {behavioralInsights.behavioral_insights?.missed_opportunities?.map((opp, idx) => (
                <Card key={idx} className="border-2 border-green-300 bg-green-50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900 mb-2">{opp.opportunity_description}</h4>
                        <p className="text-sm text-green-800 mb-3">
                          <strong>Potential Benefit:</strong> {opp.potential_benefit}
                        </p>
                        <div className="p-3 bg-white rounded-lg border border-green-200">
                          <div className="text-xs font-semibold text-green-900 uppercase mb-1">How to Automate</div>
                          <div className="text-sm text-slate-700">{opp.how_to_automate}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Automation Maturity Tab */}
            <TabsContent value="maturity" className="space-y-6">
              {behavioralInsights.overall_automation_maturity && (
                <>
                  <Card className="border-none shadow-xl">
                    <CardHeader>
                      <CardTitle>Automation Maturity Assessment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200 text-center">
                          <div className="text-sm text-indigo-900 mb-2">Current Level</div>
                          <Badge className={
                            behavioralInsights.overall_automation_maturity.current_level === 'expert' ? 'bg-green-600' :
                            behavioralInsights.overall_automation_maturity.current_level === 'advanced' ? 'bg-blue-600' :
                            behavioralInsights.overall_automation_maturity.current_level === 'intermediate' ? 'bg-yellow-600' :
                            'bg-orange-600'
                          } className="text-white text-lg px-4 py-2 capitalize">
                            {behavioralInsights.overall_automation_maturity.current_level}
                          </Badge>
                        </div>

                        <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-blue-200 text-center">
                          <div className="text-sm text-blue-900 mb-2">Automation Coverage</div>
                          <div className="text-4xl font-bold text-blue-600">
                            {behavioralInsights.overall_automation_maturity.automation_coverage}%
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                        <h5 className="font-semibold text-green-900 mb-2">Potential Monthly Savings</h5>
                        <div className="text-3xl font-bold text-green-600">
                          {behavioralInsights.overall_automation_maturity.potential_time_savings_hours_per_month}h
                        </div>
                        <p className="text-sm text-green-800 mt-1">
                          ~${(behavioralInsights.overall_automation_maturity.potential_time_savings_hours_per_month * 50).toFixed(0)} in labor costs
                        </p>
                      </div>

                      <div>
                        <h5 className="font-semibold text-slate-900 mb-3">Recommended Next Steps:</h5>
                        <div className="space-y-2">
                          {behavioralInsights.overall_automation_maturity.recommended_next_steps?.map((step, idx) => (
                            <div key={idx} className="p-3 bg-white rounded-lg border-2 border-indigo-200 text-sm">
                              <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {idx + 1}
                                </div>
                                <span className="text-slate-700">{step}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!behavioralInsights && !suggestions && proposals.length > 0 && (
          <div className="p-8 text-center border-2 border-dashed rounded-lg bg-white">
            <Brain className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Unlock AI Workflow Intelligence</h3>
            <p className="text-slate-600 mb-4">
              Let AI analyze your team's behavior and suggest powerful automation opportunities
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={runBehavioralAnalysis} disabled={activityLogs.length < 20}>
                <Activity className="w-4 h-4 mr-2" />
                Deep Behavioral Analysis
              </Button>
              <Button onClick={generateSuggestions} variant="outline">
                <Sparkles className="w-4 h-4 mr-2" />
                Quick Suggestions
              </Button>
            </div>
          </div>
        )}

        {allSuggestions.length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-slate-900">
                {allSuggestions.length} Automation {allSuggestions.length === 1 ? 'Opportunity' : 'Opportunities'} Identified
              </span>
            </div>

            {allSuggestions.map((suggestion, idx) => (
              <Card key={idx} className="border-2 border-indigo-200 bg-white hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900 text-lg">{suggestion.rule_name}</h4>
                        <Badge className={cn(
                          suggestion.priority === 'critical' && "bg-red-600 text-white",
                          suggestion.priority === 'high' && "bg-orange-600 text-white",
                          suggestion.priority === 'medium' && "bg-yellow-600 text-white",
                          suggestion.priority === 'low' && "bg-blue-600 text-white"
                        )}>
                          {suggestion.priority} priority
                        </Badge>
                        {suggestion.category && (
                          <Badge variant="outline" className="capitalize">
                            {suggestion.category.replace(/_/g, ' ')}
                          </Badge>
                        )}
                        {suggestion.implementation_difficulty && (
                          <Badge className={
                            suggestion.implementation_difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            suggestion.implementation_difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {suggestion.implementation_difficulty} to implement
                          </Badge>
                        )}
                        {suggestion.confidence_score && (
                          <Badge className="bg-purple-100 text-purple-800">
                            {suggestion.confidence_score}% confidence
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{suggestion.description}</p>
                    </div>
                    <Button
                      onClick={() => handleImplementSuggestion(suggestion)}
                      disabled={createRuleMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {createRuleMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Implement
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-green-900 uppercase mb-1">Value Proposition</div>
                          <div className="text-sm text-green-800">{suggestion.value_proposition}</div>
                        </div>
                      </div>
                    </div>

                    {suggestion.time_savings_hours_per_month && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-900 font-semibold">Expected Time Savings</span>
                          <div className="text-right">
                            <div className="text-xl font-bold text-blue-600">
                              {suggestion.time_savings_hours_per_month}h/month
                            </div>
                            <div className="text-xs text-blue-700">
                              ~${(suggestion.time_savings_hours_per_month * 50).toFixed(0)}/month value
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-purple-900 uppercase mb-1">Expected Impact</div>
                          <div className="text-sm text-purple-800">{suggestion.expected_impact}</div>
                        </div>
                      </div>
                    </div>

                    {suggestion.prevents_issues?.length > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-xs font-semibold text-red-900 uppercase mb-2">Prevents:</div>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.prevents_issues.map((issue, i) => (
                            <Badge key={i} variant="outline" className="text-xs text-red-800">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestion.enables_benefits?.length > 0 && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-xs font-semibold text-green-900 uppercase mb-2">Enables:</div>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.enables_benefits.map((benefit, i) => (
                            <Badge key={i} variant="outline" className="text-xs text-green-800">
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-xs font-semibold text-slate-900 uppercase mb-2">Trigger</div>
                        <div className="text-sm text-slate-700 capitalize">
                          {suggestion.trigger?.trigger_type?.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="text-xs font-semibold text-slate-900 uppercase mb-2">Actions</div>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.actions?.map((action, i) => (
                            <Badge key={i} variant="secondary" className="text-xs capitalize">
                              {action.action_type?.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}