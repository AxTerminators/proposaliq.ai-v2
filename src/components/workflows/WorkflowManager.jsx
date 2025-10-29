import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Zap, 
  Plus, 
  Pencil, 
  Trash2, 
  PlayCircle,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";

export default function WorkflowManager({ organization, user }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    rule_name: "",
    rule_type: "task_completion",
    trigger_conditions: {},
    actions: [],
    is_active: true,
    applies_to: "all_proposals"
  });

  const { data: rules, isLoading } = useQuery({
    queryKey: ['workflow-rules', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.WorkflowRule.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData) => {
      return base44.entities.WorkflowRule.create({
        ...ruleData,
        organization_id: organization.id,
        trigger_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.WorkflowRule.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
      setEditingRule(null);
      resetForm();
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId) => {
      await base44.entities.WorkflowRule.delete(ruleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }) => {
      return base44.entities.WorkflowRule.update(id, { is_active: isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
    },
  });

  const resetForm = () => {
    setFormData({
      rule_name: "",
      rule_type: "task_completion",
      trigger_conditions: {},
      actions: [],
      is_active: true,
      applies_to: "all_proposals"
    });
  };

  const handleSaveRule = () => {
    if (editingRule) {
      updateRuleMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createRuleMutation.mutate(formData);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      rule_type: rule.rule_type,
      trigger_conditions: rule.trigger_conditions || {},
      actions: rule.actions || [],
      is_active: rule.is_active,
      applies_to: rule.applies_to
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (rule) => {
    if (confirm(`Delete workflow rule "${rule.rule_name}"?`)) {
      deleteRuleMutation.mutate(rule.id);
    }
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        {
          action_type: "send_notification",
          notification_recipients: [],
          notification_message: ""
        }
      ]
    });
  };

  const updateAction = (index, field, value) => {
    const newActions = [...formData.actions];
    newActions[index] = { ...newActions[index], [field]: value };
    setFormData({ ...formData, actions: newActions });
  };

  const removeAction = (index) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index)
    });
  };

  const getRuleTypeLabel = (type) => {
    const labels = {
      task_completion: "Task Completion",
      status_change: "Status Change",
      due_date_reminder: "Due Date Reminder",
      approval_required: "Approval Required",
      time_based: "Time-Based"
    };
    return labels[type] || type;
  };

  const getRuleTypeColor = (type) => {
    const colors = {
      task_completion: "bg-blue-100 text-blue-700",
      status_change: "bg-purple-100 text-purple-700",
      due_date_reminder: "bg-amber-100 text-amber-700",
      approval_required: "bg-green-100 text-green-700",
      time_based: "bg-slate-100 text-slate-700"
    };
    return colors[type] || "bg-slate-100 text-slate-700";
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Automated Workflows
            </CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Create rules to automate proposal progression and notifications
            </p>
          </div>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading workflow rules...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Zap className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium mb-2">No workflow rules yet</p>
            <p className="text-sm mb-4">Create automated rules to streamline your proposal process</p>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Rule
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <Card key={rule.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-slate-900">{rule.rule_name}</h4>
                        <Badge className={getRuleTypeColor(rule.rule_type)}>
                          {getRuleTypeLabel(rule.rule_type)}
                        </Badge>
                        {rule.is_active ? (
                          <Badge className="bg-green-100 text-green-700">
                            <PlayCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p className="flex items-center gap-2">
                          <span className="font-medium">Actions:</span>
                          <span>{rule.actions?.length || 0} configured</span>
                        </p>
                        {rule.trigger_count > 0 && (
                          <p className="flex items-center gap-2">
                            <span className="font-medium">Triggered:</span>
                            <span>{rule.trigger_count} times</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, isActive: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(rule)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rule)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Workflow Rule" : "Create Workflow Rule"}</DialogTitle>
            <DialogDescription>
              Define triggers and actions to automate your proposal workflow
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rule Name *</Label>
                <Input
                  placeholder="e.g., Auto-advance to In Review"
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Trigger Type *</Label>
                <Select value={formData.rule_type} onValueChange={(value) => setFormData({ ...formData, rule_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task_completion">Task Completion</SelectItem>
                    <SelectItem value="status_change">Status Change</SelectItem>
                    <SelectItem value="due_date_reminder">Due Date Reminder</SelectItem>
                    <SelectItem value="approval_required">Approval Required</SelectItem>
                    <SelectItem value="time_based">Time-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Applies To</Label>
                <Select value={formData.applies_to} onValueChange={(value) => setFormData({ ...formData, applies_to: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_proposals">All Proposals</SelectItem>
                    <SelectItem value="proposal_type">Specific Proposal Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Actions</Label>
                <Button size="sm" variant="outline" onClick={addAction}>
                  <Plus className="w-3 h-3 mr-2" />
                  Add Action
                </Button>
              </div>

              {formData.actions.map((action, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Action {index + 1}</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAction(index)}
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>

                    <Select
                      value={action.action_type}
                      onValueChange={(value) => updateAction(index, 'action_type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="change_status">Change Proposal Status</SelectItem>
                        <SelectItem value="send_notification">Send Notification</SelectItem>
                        <SelectItem value="create_task">Create Task</SelectItem>
                        <SelectItem value="require_approval">Require Approval</SelectItem>
                        <SelectItem value="send_reminder">Send Reminder</SelectItem>
                      </SelectContent>
                    </Select>

                    {action.action_type === "change_status" && (
                      <Select
                        value={action.target_status}
                        onValueChange={(value) => updateAction(index, 'target_status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="in_review">In Review</SelectItem>
                          <SelectItem value="submitted">Submitted</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {(action.action_type === "send_notification" || action.action_type === "send_reminder") && (
                      <Textarea
                        placeholder="Notification message..."
                        value={action.notification_message || ""}
                        onChange={(e) => updateAction(index, 'notification_message', e.target.value)}
                        rows={2}
                      />
                    )}
                  </div>
                </Card>
              ))}

              {formData.actions.length === 0 && (
                <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No actions configured</p>
                  <p className="text-xs mt-1">Add at least one action to this rule</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingRule(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveRule}
              disabled={!formData.rule_name || formData.actions.length === 0 || createRuleMutation.isPending || updateRuleMutation.isPending}
            >
              {(createRuleMutation.isPending || updateRuleMutation.isPending) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingRule ? "Update Rule" : "Create Rule"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}