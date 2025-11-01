import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Sparkles,
  Loader2,
  CheckCircle2,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Zap,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AIWorkflowSuggestions({ organization, proposals = [], automationRules = [] }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

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

  const generateSuggestions = async () => {
    setGenerating(true);
    try {
      // Analyze current workflow patterns
      const statusDistribution = {};
      proposals.forEach(p => {
        statusDistribution[p.status] = (statusDistribution[p.status] || 0) + 1;
      });

      const avgProposalsPerStatus = Object.values(statusDistribution).reduce((a, b) => a + b, 0) / Object.keys(statusDistribution).length;

      const prompt = `You are an AI workflow optimization expert. Analyze this proposal pipeline data and suggest intelligent automation rules.

**CURRENT STATE:**
- Total proposals: ${proposals.length}
- Active automation rules: ${automationRules.length}
- Status distribution: ${JSON.stringify(statusDistribution)}
- Proposals stuck in stages: ${Object.entries(statusDistribution).filter(([_, count]) => count > avgProposalsPerStatus * 1.5).map(([status]) => status).join(', ') || 'None'}

**SUGGEST 3-5 AUTOMATION RULES** that would:
1. Reduce bottlenecks
2. Improve team collaboration
3. Ensure timely delivery
4. Enhance process efficiency
5. Prevent proposals from stalling

For each suggestion, provide:
- Rule name
- Why it's valuable
- What triggers it
- What actions it performs
- Expected impact

Return JSON:
{
  "suggestions": [
    {
      "rule_name": "string",
      "description": "string",
      "value_proposition": "string (why this is valuable)",
      "trigger": {
        "trigger_type": "on_status_change|on_time_in_stage|on_due_date_approaching|etc",
        "trigger_conditions": {}
      },
      "actions": [
        {
          "action_type": "send_notification|assign_user|move_to_column|etc",
          "action_config": {}
        }
      ],
      "expected_impact": "string",
      "priority": "high|medium|low"
    }
  ]
}`;

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
    } catch (error) {
      console.error("Error generating suggestions:", error);
      alert("Error generating AI suggestions: " + error.message);
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
      
      alert(`✓ Automation rule "${suggestion.rule_name}" created and activated!`);
      
      // Remove from suggestions
      setSuggestions(suggestions.filter(s => s.rule_name !== suggestion.rule_name));
    } catch (error) {
      console.error("Error creating rule:", error);
      alert("Error creating automation rule");
    }
  };

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-indigo-600" />
              AI Workflow Suggestions
            </CardTitle>
            <CardDescription>
              Let AI analyze your pipeline and suggest powerful automation rules
            </CardDescription>
          </div>
          <Button onClick={generateSuggestions} disabled={generating || proposals.length === 0}>
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Suggestions
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {proposals.length === 0 && (
          <div className="p-8 text-center border-2 border-dashed rounded-lg bg-white">
            <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">
              Create some proposals first to get personalized automation suggestions
            </p>
          </div>
        )}

        {!suggestions && proposals.length > 0 && (
          <div className="p-8 text-center border-2 border-dashed rounded-lg bg-white">
            <Lightbulb className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Get AI-Powered Suggestions</h3>
            <p className="text-slate-600 mb-4">
              Click "Generate Suggestions" to let AI analyze your pipeline and recommend automation rules
            </p>
          </div>
        )}

        {suggestions && suggestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-slate-900">
                {suggestions.length} Automation {suggestions.length === 1 ? 'Rule' : 'Rules'} Suggested
              </span>
            </div>

            {suggestions.map((suggestion, idx) => (
              <Card key={idx} className="border-2 border-indigo-200 bg-white">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-900 text-lg">{suggestion.rule_name}</h4>
                        <Badge className={cn(
                          suggestion.priority === 'high' && "bg-red-100 text-red-700",
                          suggestion.priority === 'medium' && "bg-amber-100 text-amber-700",
                          suggestion.priority === 'low' && "bg-blue-100 text-blue-700"
                        )}>
                          {suggestion.priority} priority
                        </Badge>
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
                        <div>
                          <div className="text-xs font-semibold text-green-900 uppercase mb-1">Why This Helps</div>
                          <div className="text-sm text-green-800">{suggestion.value_proposition}</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-blue-900 uppercase mb-1">Expected Impact</div>
                          <div className="text-sm text-blue-800">{suggestion.expected_impact}</div>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <div className="text-xs font-semibold text-purple-900 uppercase mb-2">Trigger</div>
                        <div className="text-sm text-purple-800">
                          {suggestion.trigger.trigger_type.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-xs font-semibold text-amber-900 uppercase mb-2">Actions</div>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.actions?.map((action, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {action.action_type.replace(/_/g, ' ')}
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