
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Users,
  Bell,
  Calendar,
  Tag,
  Brain,
  TrendingUp,
  Lightbulb,
  Target,
  ThumbsUp,
  ThumbsDown,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import AutomationRuleBuilder from "./AutomationRuleBuilder";
import moment from "moment";

export default function SmartAutomationEngine({ organization, user }) {
  const queryClient = useQueryClient();
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [analyzingBehavior, setAnalyzingBehavior] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [error, setError] = useState(null);

  const { data: automationRules = [], isLoading } = useQuery({
    queryKey: ['automation-rules', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalAutomationRule.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id,
    initialData: []
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ['activity-logs-for-analysis', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      // Fetch recent activity logs for analysis
      return base44.entities.ActivityLog.list('-created_date', 200);
    },
    enabled: !!organization?.id,
    initialData: []
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals-for-analysis', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      // Fetch recent proposals for analysis
      return base44.entities.Proposal.filter({
        organization_id: organization.id
      }, '-created_date', 100);
    },
    enabled: !!organization?.id,
    initialData: []
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ ruleId, isActive }) => {
      return base44.entities.ProposalAutomationRule.update(ruleId, { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId) => {
      return base44.entities.ProposalAutomationRule.delete(ruleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
    }
  });

  const suggestAutomations = async () => {
    if (activityLogs.length < 20) {
      alert("Need at least 20 activity logs to analyze behavior patterns. Continue using ProposalIQ!");
      return;
    }

    setAnalyzingBehavior(true);
    setError(null);

    try {
      // Analyze user behavior patterns
      const statusChanges = activityLogs.filter(log => log.action_type === 'status_changed');
      const taskPatterns = activityLogs.filter(log => log.action_type === 'task_created' || log.action_type === 'task_updated');
      const userActions = activityLogs.filter(log => log.user_email === user?.email);

      // Group proposals by status transitions
      const statusTransitions = statusChanges.reduce((acc, log) => {
        try {
          const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          const key = `${metadata?.from_status || 'unknown'} → ${metadata?.to_status || 'unknown'}`;
          acc[key] = (acc[key] || 0) + 1;
        } catch (e) {
          // Skip invalid metadata
        }
        return acc;
      }, {});

      // Identify repetitive manual actions
      const manualActionPatterns = userActions.reduce((acc, log) => {
        const key = `${log.action_type}_${log.user_email}`;
        if (!acc[key]) {
          acc[key] = { type: log.action_type, count: 0, user: log.user_email };
        }
        acc[key].count++;
        return acc;
      }, {});

      const analysisPrompt = `You are an expert in workflow automation and process optimization. Analyze this user's behavior to suggest intelligent automation rules.

**ORGANIZATION BEHAVIOR ANALYSIS:**

**Status Transition Patterns (${statusChanges.length} changes):**
${Object.entries(statusTransitions).slice(0, 10).map(([transition, count]) => 
  `- ${transition}: ${count} times`
).join('\n')}

**Proposal Pipeline Stats:**
- Total Proposals: ${proposals.length}
- Status Distribution: ${JSON.stringify(proposals.reduce((acc, p) => {
  acc[p.status] = (acc[p.status] || 0) + 1;
  return acc;
}, {}))}
- Avg Time in Draft: ${proposals.filter(p => p.status === 'draft').length > 0 ? 'Multiple proposals' : 'N/A'}

**User Activity Patterns (${userActions.length} actions by this user):**
${Object.values(manualActionPatterns).slice(0, 15).map(pattern => 
  `- ${pattern.type.replace(/_/g, ' ')}: ${pattern.count} times`
).join('\n')}

**Task Creation Patterns:**
${taskPatterns.slice(0, 10).map(log => 
  `- ${log.action_description || log.action_type}`
).join('\n')}

**Existing Automation Rules:**
${automationRules.map(rule => 
  `- ${rule.rule_name}: ${rule.trigger?.trigger_type} → ${rule.actions?.length || 0} actions (used ${rule.trigger_count || 0}x)`
).join('\n')}

**YOUR TASK - INTELLIGENT AUTOMATION SUGGESTIONS:**

Based on behavioral analysis, identify repetitive manual workflows that could be automated. Suggest 5-10 high-value automation rules:

1. **Identify Repetitive Patterns**: What does user do manually over and over?
2. **Status-Based Automations**: Auto-transition proposals when conditions met
3. **Notification Automations**: Auto-notify team when key events happen
4. **Task Automations**: Auto-create tasks at certain proposal stages
5. **Assignment Automations**: Auto-assign to specific users based on criteria
6. **Calendar Automations**: Auto-create calendar events for deadlines
7. **Field Update Automations**: Auto-populate or update fields

For each suggestion, provide:
- Clear automation name
- What triggers it (be specific)
- What actions it performs
- Estimated time savings per week
- Confidence in usefulness (0-100%)
- Why this automation would be valuable
- How many times it would have triggered historically

Focus on automations that save the most time and reduce manual overhead.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            automation_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  suggestion_id: { type: "string" },
                  automation_name: { type: "string" },
                  description: { type: "string" },
                  value_proposition: { type: "string" },
                  trigger: {
                    type: "object",
                    properties: {
                      trigger_type: { 
                        type: "string",
                        enum: ["on_status_change", "on_column_move", "on_due_date_approaching", "on_task_completion", "on_all_subtasks_complete", "on_field_change", "on_time_in_stage", "on_creation", "scheduled"]
                      },
                      trigger_conditions: { type: "object" }
                    }
                  },
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action_type: { 
                          type: "string",
                          enum: ["move_to_column", "change_status", "send_notification", "create_subtask", "assign_user", "set_field_value", "create_calendar_event", "add_comment", "send_email"]
                        },
                        action_config: { type: "object" },
                        action_description: { type: "string" }
                      }
                    }
                  },
                  estimated_time_savings_hours_per_week: { type: "number" },
                  confidence_score: { type: "number", minimum: 0, maximum: 100 },
                  priority: { type: "string", enum: ["high", "medium", "low"] },
                  historical_trigger_count: { type: "number" },
                  use_cases: { type: "array", items: { type: "string" } },
                  implementation_complexity: { type: "string", enum: ["simple", "moderate", "complex"] },
                  recommended: { type: "boolean" }
                }
              }
            },
            behavior_insights: {
              type: "object",
              properties: {
                most_repetitive_actions: { type: "array", items: { type: "string" } },
                workflow_bottlenecks: { type: "array", items: { type: "string" } },
                automation_potential_score: { type: "number", minimum: 0, maximum: 100 },
                total_potential_time_savings_hours_per_week: { type: "number" }
              }
            },
            quick_wins: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  impact: { type: "string" }
                }
              }
            }
          },
          required: ["automation_suggestions", "behavior_insights"]
        }
      });

      setAiSuggestions(result);
      alert(`✓ AI analyzed your workflow! Found ${result.automation_suggestions?.length || 0} automation opportunities.`);

    } catch (err) {
      console.error("Error analyzing behavior:", err);
      setError(err);
    } finally {
      setAnalyzingBehavior(false);
    }
  };

  const createAutomationFromSuggestion = async (suggestion) => {
    try {
      await base44.entities.ProposalAutomationRule.create({
        organization_id: organization.id,
        rule_name: suggestion.automation_name,
        description: suggestion.description,
        is_active: true,
        trigger: suggestion.trigger,
        actions: suggestion.actions || [],
        applies_to: {
          scope: "all_proposals"
        },
        created_by: user?.email
      });

      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      
      // Remove from suggestions
      setAiSuggestions(prev => ({
        ...prev,
        automation_suggestions: prev.automation_suggestions.filter(s => s.suggestion_id !== suggestion.suggestion_id)
      }));

      alert(`✓ Automation "${suggestion.automation_name}" created successfully!`);
    } catch (error) {
      console.error("Error creating automation:", error);
      alert("Failed to create automation rule.");
    }
  };

  const dismissSuggestion = (suggestionId) => {
    setAiSuggestions(prev => ({
      ...prev,
      automation_suggestions: prev.automation_suggestions.filter(s => s.suggestion_id !== suggestionId)
    }));
  };

  const handleEditRule = (rule) => {
    setEditingRule(rule);
    setShowRuleBuilder(true);
  };

  const handleCloseBuilder = () => {
    setShowRuleBuilder(false);
    setEditingRule(null);
  };

  const handleToggleRule = (rule) => {
    toggleRuleMutation.mutate({ ruleId: rule.id, isActive: !rule.is_active });
  };

  const handleDeleteRule = (rule) => {
    if (confirm(`Delete automation rule "${rule.rule_name}"?`)) {
      deleteRuleMutation.mutate(rule.id);
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'move_to_column': return ArrowRight;
      case 'assign_user': return Users;
      case 'send_notification': return Bell;
      case 'create_calendar_event': return Calendar;
      case 'set_field_value': return Tag;
      default: return Zap;
    }
  };

  const getTriggerDescription = (rule) => {
    const trigger = rule.trigger;
    if (!trigger) return "Unknown trigger";

    switch (trigger.trigger_type) {
      case 'on_status_change':
        return `When status changes ${trigger.trigger_conditions?.from_status ? `from ${trigger.trigger_conditions.from_status}` : ''} ${trigger.trigger_conditions?.to_status ? `to ${trigger.trigger_conditions.to_status}` : ''}`;
      case 'on_column_move':
        return 'When moved to a different column';
      case 'on_due_date_approaching':
        return `${trigger.trigger_conditions?.days_before || 3} days before due date`;
      case 'on_task_completion':
        return 'When a task is completed';
      case 'on_all_subtasks_complete':
        return 'When all subtasks are completed';
      case 'on_field_change':
        return `When ${trigger.trigger_conditions?.field || 'field'} changes`;
      case 'on_time_in_stage':
        return `After ${trigger.trigger_conditions?.days_in_stage || 7} days in same stage`;
      case 'on_creation':
        return 'When proposal is created';
      case 'scheduled':
        return `Every ${trigger.trigger_conditions?.interval || 'day'}`;
      default:
        return trigger.trigger_type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Smart Automation Engine</CardTitle>
                <CardDescription>AI-powered workflow automation with behavioral suggestions</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={suggestAutomations}
                disabled={analyzingBehavior || activityLogs.length < 20}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {analyzingBehavior ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    AI Suggest Automations
                  </>
                )}
              </Button>
              <Button onClick={() => setShowRuleBuilder(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Create Rule
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {activityLogs.length < 20 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Need at least 20 activity logs to enable AI automation suggestions. Current: {activityLogs.length}. 
            Keep using ProposalIQ and AI will learn your patterns!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Stats Dashboard */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4 text-center">
            <Zap className="w-6 h-6 mx-auto mb-2 text-purple-600" />
            <div className="text-3xl font-bold text-purple-600">{automationRules.length}</div>
            <div className="text-sm text-purple-900">Total Rules</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <Play className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-3xl font-bold text-green-600">
              {automationRules.filter(r => r.is_active).length}
            </div>
            <div className="text-sm text-green-900">Active Rules</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-3xl font-bold text-blue-600">
              {automationRules.reduce((sum, r) => sum + (r.trigger_count || 0), 0)}
            </div>
            <div className="text-sm text-blue-900">Total Triggers</div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-4 text-center">
            <Brain className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
            <div className="text-3xl font-bold text-indigo-600">
              {aiSuggestions?.automation_suggestions?.length || 0}
            </div>
            <div className="text-sm text-indigo-900">AI Suggestions</div>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions */}
      {aiSuggestions && (
        <Tabs defaultValue="suggestions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="suggestions">
              AI Suggestions ({aiSuggestions.automation_suggestions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="insights">Behavior Insights</TabsTrigger>
            <TabsTrigger value="quick-wins">Quick Wins</TabsTrigger>
          </TabsList>

          {/* AI Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-4">
            {aiSuggestions.automation_suggestions?.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
                  <p className="text-green-800 font-semibold">
                    Your workflow is already well-optimized! No additional automation opportunities found.
                  </p>
                </CardContent>
              </Card>
            ) : (
              aiSuggestions.automation_suggestions?.map((suggestion, idx) => (
                <Card key={suggestion.suggestion_id} className={cn(
                  "border-2 hover:shadow-xl transition-all",
                  suggestion.recommended && "border-indigo-500 bg-indigo-50/50"
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-lg">{suggestion.automation_name}</h4>
                            {suggestion.recommended && (
                              <Badge className="bg-indigo-600 text-white">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Recommended
                              </Badge>
                            )}
                            <Badge className={cn(
                              "text-white",
                              suggestion.priority === 'high' && 'bg-red-600',
                              suggestion.priority === 'medium' && 'bg-yellow-600',
                              suggestion.priority === 'low' && 'bg-green-600'
                            )}>
                              {suggestion.priority?.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {suggestion.confidence_score}% confidence
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-slate-700 mb-3">{suggestion.description}</p>
                          
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
                            <p className="text-sm text-green-900">
                              <strong>💡 Value:</strong> {suggestion.value_proposition}
                            </p>
                          </div>

                          {/* Trigger Display */}
                          <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                            <div className="text-xs font-semibold text-blue-900 uppercase mb-1">Trigger</div>
                            <div className="text-sm text-blue-900">
                              {suggestion.trigger?.trigger_type?.replace(/_/g, ' ')}
                              {suggestion.trigger?.trigger_conditions && 
                                ` (${JSON.stringify(suggestion.trigger.trigger_conditions).slice(0, 100)})`
                              }
                            </div>
                          </div>

                          {/* Actions Display */}
                          <div className="mb-3">
                            <div className="text-xs font-semibold text-slate-700 uppercase mb-2">Actions Performed</div>
                            <div className="space-y-2">
                              {suggestion.actions?.map((action, actionIdx) => {
                                const Icon = getActionIcon(action.action_type);
                                return (
                                  <div key={actionIdx} className="flex items-start gap-2 p-2 bg-purple-50 rounded">
                                    <Icon className="w-4 h-4 text-purple-600 mt-0.5" />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-slate-900 capitalize">
                                        {action.action_type?.replace(/_/g, ' ')}
                                      </div>
                                      {action.action_description && (
                                        <div className="text-xs text-slate-600">{action.action_description}</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Impact Metrics */}
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="p-2 bg-white rounded border text-center">
                              <div className="text-lg font-bold text-green-600">
                                {suggestion.estimated_time_savings_hours_per_week}h
                              </div>
                              <div className="text-xs text-slate-600">Saved/Week</div>
                            </div>
                            <div className="p-2 bg-white rounded border text-center">
                              <div className="text-lg font-bold text-blue-600">
                                {suggestion.historical_trigger_count}x
                              </div>
                              <div className="text-xs text-slate-600">Would've Run</div>
                            </div>
                            <div className="p-2 bg-white rounded border text-center">
                              <Badge className={cn(
                                "text-white capitalize",
                                suggestion.implementation_complexity === 'simple' && 'bg-green-600',
                                suggestion.implementation_complexity === 'moderate' && 'bg-yellow-600',
                                suggestion.implementation_complexity === 'complex' && 'bg-red-600'
                              )}>
                                {suggestion.implementation_complexity}
                              </Badge>
                              <div className="text-xs text-slate-600 mt-1">Complexity</div>
                            </div>
                          </div>

                          {/* Use Cases */}
                          {suggestion.use_cases && suggestion.use_cases.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-slate-700 uppercase mb-1">Use Cases:</div>
                              <div className="flex flex-wrap gap-1">
                                {suggestion.use_cases.slice(0, 3).map((useCase, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {useCase}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => createAutomationFromSuggestion(suggestion)}
                          className="bg-gradient-to-r from-green-600 to-emerald-600"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Create
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dismissSuggestion(suggestion.suggestion_id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Behavior Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {aiSuggestions.behavior_insights && (
              <>
                <Card className="border-none shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-indigo-600" />
                      Workflow Intelligence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                      <div className="text-5xl font-bold text-indigo-600 mb-2">
                        {aiSuggestions.behavior_insights.automation_potential_score}
                      </div>
                      <div className="text-sm text-slate-700 font-semibold">Automation Potential Score</div>
                      <p className="text-xs text-slate-600 mt-1">
                        Higher = More opportunities to automate
                      </p>
                    </div>

                    {aiSuggestions.behavior_insights.total_potential_time_savings_hours_per_week > 0 && (
                      <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg text-center">
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          {aiSuggestions.behavior_insights.total_potential_time_savings_hours_per_week}h/week
                        </div>
                        <p className="text-sm text-green-900">
                          Potential time savings if all suggestions implemented
                        </p>
                      </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h5 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Most Repetitive Actions
                        </h5>
                        <ul className="space-y-2">
                          {aiSuggestions.behavior_insights.most_repetitive_actions?.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded">
                              <div className="w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                {idx + 1}
                              </div>
                              <span className="text-sm text-red-900">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Workflow Bottlenecks
                        </h5>
                        <ul className="space-y-2">
                          {aiSuggestions.behavior_insights.workflow_bottlenecks?.map((bottleneck, idx) => (
                            <li key={idx} className="flex items-start gap-2 p-2 bg-amber-50 rounded">
                              <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                {idx + 1}
                              </div>
                              <span className="text-sm text-amber-900">{bottleneck}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Quick Wins Tab */}
          <TabsContent value="quick-wins" className="space-y-4">
            {aiSuggestions.quick_wins?.map((win, idx) => (
              <Card key={idx} className="border-2 border-green-300 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-semibold text-green-900 mb-1">{win.title}</h5>
                      <p className="text-sm text-green-800 mb-2">{win.description}</p>
                      <p className="text-xs text-slate-700">
                        <strong>Impact:</strong> {win.impact}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {/* Existing Automation Rules */}
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle>Your Automation Rules ({automationRules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {automationRules.length === 0 ? (
            <div className="p-12 text-center">
              <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Automation Rules Yet</h3>
              <p className="text-slate-600 mb-6">
                Create your first automation rule to streamline your workflow
              </p>
              <Button onClick={() => setShowRuleBuilder(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {automationRules.map((rule) => (
                <Card key={rule.id} className={cn(
                  "border-2 transition-all",
                  rule.is_active ? "bg-white" : "bg-slate-50 opacity-75"
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-slate-900">{rule.rule_name}</h3>
                          <Badge variant={rule.is_active ? "default" : "secondary"} className="text-xs">
                            {rule.is_active ? 'Active' : 'Paused'}
                          </Badge>
                          {rule.trigger_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Triggered {rule.trigger_count}x
                            </Badge>
                          )}
                          {rule.last_triggered_date && (
                            <Badge variant="outline" className="text-xs">
                              Last: {moment(rule.last_triggered_date).fromNow()}
                            </Badge>
                          )}
                        </div>
                        
                        {rule.description && (
                          <p className="text-sm text-slate-600 mb-4">{rule.description}</p>
                        )}

                        <div className="flex items-start gap-2 mb-4">
                          <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Trigger</div>
                            <div className="text-sm text-slate-900">{getTriggerDescription(rule)}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
                            <Zap className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Actions</div>
                            <div className="flex flex-wrap gap-2">
                              {rule.actions?.map((action, idx) => {
                                const Icon = getActionIcon(action.action_type);
                                return (
                                  <Badge key={idx} variant="secondary" className="text-xs gap-1">
                                    <Icon className="w-3 h-3" />
                                    {action.action_type.replace(/_/g, ' ')}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {rule.applies_to && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs text-slate-500">
                              <strong>Applies to:</strong> {rule.applies_to.scope === 'all_proposals' ? 'All proposals' : 'Specific proposals'}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => handleToggleRule(rule)}
                          disabled={toggleRuleMutation.isPending}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRule(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteRule(rule)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rule Builder Dialog */}
      {showRuleBuilder && (
        <AutomationRuleBuilder
          organization={organization}
          rule={editingRule}
          onClose={handleCloseBuilder}
        />
      )}
    </div>
  );
}
