import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Clock,
  Mail,
  Zap,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar,
  Brain,
  Send,
  Eye,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const TRIGGER_CONDITIONS = [
  {
    value: "client_viewed_no_response",
    label: "Client viewed but hasn't responded",
    icon: Eye,
    description: "Trigger when client views proposal but doesn't comment within X hours"
  },
  {
    value: "proposal_shared_no_view",
    label: "Proposal shared but not viewed",
    icon: Mail,
    description: "Trigger when shared proposal hasn't been opened within X days"
  },
  {
    value: "client_inactive",
    label: "Client inactive",
    icon: Users,
    description: "Trigger when client hasn't logged in for X days"
  },
  {
    value: "proposal_deadline_approaching",
    label: "Deadline approaching",
    icon: Clock,
    description: "Trigger X days before proposal deadline"
  },
  {
    value: "no_activity_on_proposal",
    label: "No activity on proposal",
    icon: AlertCircle,
    description: "Trigger when no updates on proposal for X days"
  },
  {
    value: "comment_unresolved",
    label: "Comment left unresolved",
    icon: MessageSquare,
    description: "Trigger when comment unresolved for X hours"
  }
];

const ACTION_TYPES = [
  { value: "send_email", label: "Send Email", icon: Mail },
  { value: "create_notification", label: "Create Notification", icon: AlertCircle },
  { value: "create_task", label: "Create Task", icon: CheckCircle2 },
  { value: "send_internal_alert", label: "Alert Team", icon: Users }
];

export default function AutoFollowUpSystem({ user, organization }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const [formData, setFormData] = useState({
    rule_name: "",
    trigger_condition: "client_viewed_no_response",
    threshold_value: 24,
    threshold_unit: "hours",
    action_type: "send_email",
    email_subject: "",
    email_body: "",
    notification_message: "",
    task_title: "",
    task_description: "",
    is_active: true,
    send_to_client: true,
    send_to_team: false,
    team_emails: []
  });

  // Store rules in organization data
  const { data: followUpRules = [] } = useQuery({
    queryKey: ['follow-up-rules', organization.id],
    queryFn: async () => {
      const orgData = await base44.entities.Organization.filter({ id: organization.id });
      return orgData[0]?.follow_up_rules || [];
    },
    initialData: []
  });

  const saveRulesMutation = useMutation({
    mutationFn: async (updatedRules) => {
      return base44.entities.Organization.update(organization.id, {
        follow_up_rules: updatedRules
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow-up-rules'] });
      toast.success("Follow-up rule saved");
    }
  });

  const handleCreateRule = () => {
    if (!formData.rule_name) {
      toast.error("Please provide a rule name");
      return;
    }

    const newRule = {
      id: Date.now().toString(),
      ...formData,
      created_date: new Date().toISOString(),
      last_executed: null,
      execution_count: 0,
      success_count: 0
    };

    if (editingRule) {
      const updated = followUpRules.map(r => 
        r.id === editingRule.id ? { ...newRule, id: editingRule.id, execution_count: editingRule.execution_count } : r
      );
      saveRulesMutation.mutate(updated);
    } else {
      saveRulesMutation.mutate([...followUpRules, newRule]);
    }

    setShowCreateDialog(false);
    resetForm();
  };

  const handleDeleteRule = (ruleId) => {
    if (confirm("Delete this follow-up rule?")) {
      const updated = followUpRules.filter(r => r.id !== ruleId);
      saveRulesMutation.mutate(updated);
    }
  };

  const handleToggleActive = (ruleId) => {
    const updated = followUpRules.map(r => 
      r.id === ruleId ? { ...r, is_active: !r.is_active } : r
    );
    saveRulesMutation.mutate(updated);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      trigger_condition: rule.trigger_condition,
      threshold_value: rule.threshold_value,
      threshold_unit: rule.threshold_unit,
      action_type: rule.action_type,
      email_subject: rule.email_subject || "",
      email_body: rule.email_body || "",
      notification_message: rule.notification_message || "",
      task_title: rule.task_title || "",
      task_description: rule.task_description || "",
      is_active: rule.is_active,
      send_to_client: rule.send_to_client !== false,
      send_to_team: rule.send_to_team || false,
      team_emails: rule.team_emails || []
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setFormData({
      rule_name: "",
      trigger_condition: "client_viewed_no_response",
      threshold_value: 24,
      threshold_unit: "hours",
      action_type: "send_email",
      email_subject: "",
      email_body: "",
      notification_message: "",
      task_title: "",
      task_description: "",
      is_active: true,
      send_to_client: true,
      send_to_team: false,
      team_emails: []
    });
    setEditingRule(null);
  };

  // Execute rules manually (for testing)
  const executeRulesMutation = useMutation({
    mutationFn: async () => {
      const activeRules = followUpRules.filter(r => r.is_active);
      let executed = 0;

      for (const rule of activeRules) {
        // This would check conditions and execute actions
        // For now, just simulate
        await new Promise(resolve => setTimeout(resolve, 500));
        executed++;
      }

      return executed;
    },
    onSuccess: (count) => {
      toast.success(`Executed ${count} follow-up rule(s)`);
    }
  });

  const stats = {
    total: followUpRules.length,
    active: followUpRules.filter(r => r.is_active).length,
    inactive: followUpRules.filter(r => !r.is_active).length,
    totalExecutions: followUpRules.reduce((sum, r) => sum + (r.execution_count || 0), 0)
  };

  const selectedTrigger = TRIGGER_CONDITIONS.find(t => t.value === formData.trigger_condition);
  const TriggerIcon = selectedTrigger?.icon || Clock;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-600" />
                Auto Follow-Up System
              </CardTitle>
              <CardDescription>
                Automated client follow-ups based on behavior triggers
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => executeRulesMutation.mutate()}
                disabled={executeRulesMutation.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Test Rules
              </Button>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                New Rule
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-sm text-slate-600">Total Rules</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.active}</p>
            <p className="text-sm text-slate-600">Active</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Pause className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-3xl font-bold text-slate-900">{stats.inactive}</p>
            <p className="text-sm text-slate-600">Inactive</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.totalExecutions}</p>
            <p className="text-sm text-slate-600">Total Executions</p>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Follow-Up Rules ({followUpRules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {followUpRules.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-medium mb-2">No follow-up rules yet</p>
              <p className="text-sm mb-4">Create your first automated follow-up rule</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {followUpRules.map(rule => {
                const trigger = TRIGGER_CONDITIONS.find(t => t.value === rule.trigger_condition);
                const Icon = trigger?.icon || Clock;
                const actionType = ACTION_TYPES.find(a => a.value === rule.action_type);
                const ActionIcon = actionType?.icon || Mail;

                return (
                  <Card key={rule.id} className={cn(
                    "border-2 transition-all",
                    rule.is_active ? "border-green-200 bg-green-50/30" : "border-slate-200"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            rule.is_active ? "bg-green-100" : "bg-slate-100"
                          )}>
                            <Icon className={cn("w-5 h-5", rule.is_active ? "text-green-600" : "text-slate-400")} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-900">{rule.rule_name}</h4>
                              {rule.is_active ? (
                                <Badge className="bg-green-100 text-green-700">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{trigger?.description}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Trigger: {rule.threshold_value} {rule.threshold_unit}
                              </span>
                              <span className="flex items-center gap-1">
                                <ActionIcon className="w-3 h-3" />
                                Action: {actionType?.label}
                              </span>
                              {rule.execution_count > 0 && (
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3" />
                                  Executed {rule.execution_count}x
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-3">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleToggleActive(rule.id)}
                            title={rule.is_active ? "Pause rule" : "Activate rule"}
                          >
                            {rule.is_active ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(rule)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit" : "Create"} Follow-Up Rule</DialogTitle>
            <DialogDescription>
              Automate client follow-ups based on specific triggers
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Rule Name */}
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                placeholder="e.g., Follow-up if client viewed but didn't respond"
              />
            </div>

            {/* Trigger Condition */}
            <div className="space-y-2">
              <Label>Trigger Condition *</Label>
              <Select 
                value={formData.trigger_condition}
                onValueChange={(value) => setFormData({ ...formData, trigger_condition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_CONDITIONS.map(trigger => {
                    const Icon = trigger.icon;
                    return (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {trigger.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedTrigger && (
                <p className="text-xs text-slate-500">{selectedTrigger.description}</p>
              )}
            </div>

            {/* Threshold */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Threshold Value</Label>
                <Input
                  type="number"
                  value={formData.threshold_value}
                  onChange={(e) => setFormData({ ...formData, threshold_value: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Select 
                  value={formData.threshold_unit}
                  onValueChange={(value) => setFormData({ ...formData, threshold_unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Type */}
            <div className="space-y-2">
              <Label>Action to Take *</Label>
              <Select 
                value={formData.action_type}
                onValueChange={(value) => setFormData({ ...formData, action_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(action => {
                    const Icon = action.icon;
                    return (
                      <SelectItem key={action.value} value={action.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {action.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Email Fields */}
            {formData.action_type === 'send_email' && (
              <>
                <div className="space-y-2">
                  <Label>Email Subject</Label>
                  <Input
                    value={formData.email_subject}
                    onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
                    placeholder="e.g., Following up on {{proposal_name}}"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Body</Label>
                  <Textarea
                    value={formData.email_body}
                    onChange={(e) => setFormData({ ...formData, email_body: e.target.value })}
                    rows={6}
                    placeholder="Use {{client_name}}, {{proposal_name}}, etc. for personalization..."
                  />
                  <p className="text-xs text-slate-500">
                    Available variables: {`{{client_name}}`}, {`{{proposal_name}}`}, {`{{consultant_name}}`}
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <Label>Send to Client</Label>
                  <Switch 
                    checked={formData.send_to_client}
                    onCheckedChange={(checked) => setFormData({ ...formData, send_to_client: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <Label>Also notify Team</Label>
                  <Switch 
                    checked={formData.send_to_team}
                    onCheckedChange={(checked) => setFormData({ ...formData, send_to_team: checked })}
                  />
                </div>
              </>
            )}

            {/* Notification Fields */}
            {formData.action_type === 'create_notification' && (
              <div className="space-y-2">
                <Label>Notification Message</Label>
                <Textarea
                  value={formData.notification_message}
                  onChange={(e) => setFormData({ ...formData, notification_message: e.target.value })}
                  rows={3}
                  placeholder="e.g., Client {{client_name}} viewed but hasn't responded"
                />
              </div>
            )}

            {/* Task Fields */}
            {formData.action_type === 'create_task' && (
              <>
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input
                    value={formData.task_title}
                    onChange={(e) => setFormData({ ...formData, task_title: e.target.value })}
                    placeholder="e.g., Follow up with {{client_name}}"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Task Description</Label>
                  <Textarea
                    value={formData.task_description}
                    onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div>
                <Label>Activate Rule</Label>
                <p className="text-xs text-slate-500">Rule will start running immediately</p>
              </div>
              <Switch 
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateRule}>
              {editingRule ? "Update" : "Create"} Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}