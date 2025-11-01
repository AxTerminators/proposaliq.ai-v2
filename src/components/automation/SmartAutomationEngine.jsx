import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import AutomationRuleBuilder from "./AutomationRuleBuilder";

export default function SmartAutomationEngine({ organization }) {
  const queryClient = useQueryClient();
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-600" />
            Smart Automation Engine
          </h2>
          <p className="text-slate-600 mt-1">Automate your workflow with intelligent rules and triggers</p>
        </div>
        <Button onClick={() => setShowRuleBuilder(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Create Automation Rule
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{automationRules.length}</div>
            <div className="text-sm text-slate-600">Total Rules</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Play className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {automationRules.filter(r => r.is_active).length}
            </div>
            <div className="text-sm text-slate-600">Active Rules</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {automationRules.reduce((sum, r) => sum + (r.trigger_count || 0), 0)}
            </div>
            <div className="text-sm text-slate-600">Total Triggers</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {automationRules.filter(r => r.trigger_count > 0).length}
            </div>
            <div className="text-sm text-slate-600">Rules Used</div>
          </CardContent>
        </Card>
      </div>

      {/* Automation Rules List */}
      {automationRules.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Zap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Automation Rules Yet</h3>
            <p className="text-slate-600 mb-6">
              Create your first automation rule to streamline your workflow
            </p>
            <Button onClick={() => setShowRuleBuilder(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {automationRules.map((rule) => (
            <Card key={rule.id} className={cn(
              "border-none shadow-lg transition-all",
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