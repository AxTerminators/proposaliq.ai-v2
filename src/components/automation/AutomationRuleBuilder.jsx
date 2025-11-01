import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Plus,
  X,
  Sparkles,
  Save,
  AlertCircle,
  ArrowRight,
  Users,
  Bell,
  Calendar,
  Tag,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

const TRIGGER_TYPES = [
  { value: 'on_status_change', label: 'When Status Changes', icon: ArrowRight },
  { value: 'on_column_move', label: 'When Moved to Different Column', icon: ArrowRight },
  { value: 'on_due_date_approaching', label: 'When Due Date Approaching', icon: Calendar },
  { value: 'on_task_completion', label: 'When Task Completed', icon: Sparkles },
  { value: 'on_all_subtasks_complete', label: 'When All Subtasks Complete', icon: Sparkles },
  { value: 'on_field_change', label: 'When Field Changes', icon: Tag },
  { value: 'on_time_in_stage', label: 'When Time in Stage Exceeds', icon: Calendar },
  { value: 'on_creation', label: 'When Proposal Created', icon: Plus },
];

const ACTION_TYPES = [
  { value: 'move_to_column', label: 'Move to Column', icon: ArrowRight },
  { value: 'change_status', label: 'Change Status', icon: ArrowRight },
  { value: 'send_notification', label: 'Send Notification', icon: Bell },
  { value: 'assign_user', label: 'Assign User', icon: Users },
  { value: 'set_field_value', label: 'Set Field Value', icon: Tag },
  { value: 'create_calendar_event', label: 'Create Calendar Event', icon: Calendar },
  { value: 'add_comment', label: 'Add Comment', icon: MessageSquare },
];

export default function AutomationRuleBuilder({ organization, rule, onClose }) {
  const queryClient = useQueryClient();
  const [ruleName, setRuleName] = useState(rule?.rule_name || "");
  const [description, setDescription] = useState(rule?.description || "");
  const [triggerType, setTriggerType] = useState(rule?.trigger?.trigger_type || "on_status_change");
  const [triggerConditions, setTriggerConditions] = useState(rule?.trigger?.trigger_conditions || {});
  const [actions, setActions] = useState(rule?.actions || []);
  const [appliesTo, setAppliesTo] = useState(rule?.applies_to || { scope: 'all_proposals' });
  const [isActive, setIsActive] = useState(rule?.is_active ?? true);

  // Fetch kanban columns for dropdown
  const { data: kanbanConfig } = useQuery({
    queryKey: ['kanban-config', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );
      return configs.length > 0 ? configs[0] : null;
    },
    enabled: !!organization?.id
  });

  // Fetch team members for user assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const users = await base44.entities.User.list();
      return users.filter(u => 
        u.client_accesses?.some(access => access.organization_id === organization.id)
      );
    },
    enabled: !!organization?.id
  });

  const saveRuleMutation = useMutation({
    mutationFn: async (ruleData) => {
      if (rule?.id) {
        return base44.entities.ProposalAutomationRule.update(rule.id, ruleData);
      } else {
        return base44.entities.ProposalAutomationRule.create({
          ...ruleData,
          organization_id: organization.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      onClose();
    }
  });

  const handleAddAction = () => {
    setActions([...actions, { action_type: 'send_notification', action_config: {} }]);
  };

  const handleRemoveAction = (index) => {
    setActions(actions.filter((_, idx) => idx !== index));
  };

  const handleActionChange = (index, field, value) => {
    const newActions = [...actions];
    if (field === 'action_type') {
      newActions[index] = { action_type: value, action_config: {} };
    } else {
      newActions[index] = {
        ...newActions[index],
        action_config: {
          ...newActions[index].action_config,
          [field]: value
        }
      };
    }
    setActions(newActions);
  };

  const handleSave = () => {
    if (!ruleName.trim()) {
      alert("Please enter a rule name");
      return;
    }

    if (actions.length === 0) {
      alert("Please add at least one action");
      return;
    }

    const ruleData = {
      rule_name: ruleName,
      description,
      is_active: isActive,
      trigger: {
        trigger_type: triggerType,
        trigger_conditions: triggerConditions
      },
      actions,
      applies_to: appliesTo,
      execution_order: 0
    };

    saveRuleMutation.mutate(ruleData);
  };

  const columns = kanbanConfig?.columns || [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            {rule ? 'Edit Automation Rule' : 'Create Automation Rule'}
          </DialogTitle>
          <DialogDescription>
            Define triggers and actions to automate your workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g., Auto-assign when moved to In Progress"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this rule do?"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="font-medium text-sm">Rule Status</div>
                <div className="text-xs text-slate-600">Enable or disable this rule</div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          {/* Trigger Configuration */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              When This Happens (Trigger)
            </h3>

            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trigger-specific conditions */}
            {triggerType === 'on_status_change' && (
              <div className="grid md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div className="space-y-2">
                  <Label>From Status (optional)</Label>
                  <Select
                    value={triggerConditions.from_status || ''}
                    onValueChange={(value) => setTriggerConditions({...triggerConditions, from_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Any Status</SelectItem>
                      <SelectItem value="evaluating">Evaluating</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Status</Label>
                  <Select
                    value={triggerConditions.to_status || ''}
                    onValueChange={(value) => setTriggerConditions({...triggerConditions, to_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="evaluating">Evaluating</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {triggerType === 'on_due_date_approaching' && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                <Label>Days Before Due Date</Label>
                <Input
                  type="number"
                  value={triggerConditions.days_before || 3}
                  onChange={(e) => setTriggerConditions({...triggerConditions, days_before: parseInt(e.target.value)})}
                  placeholder="3"
                />
              </div>
            )}

            {triggerType === 'on_time_in_stage' && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                <Label>Days in Same Stage</Label>
                <Input
                  type="number"
                  value={triggerConditions.days_in_stage || 7}
                  onChange={(e) => setTriggerConditions({...triggerConditions, days_in_stage: parseInt(e.target.value)})}
                  placeholder="7"
                />
              </div>
            )}

            {triggerType === 'on_field_change' && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                <Label>Field Name</Label>
                <Input
                  value={triggerConditions.field || ''}
                  onChange={(e) => setTriggerConditions({...triggerConditions, field: e.target.value})}
                  placeholder="e.g., contract_value, agency_name"
                />
              </div>
            )}
          </div>

          {/* Actions Configuration */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Do These Things (Actions)
              </h3>
              <Button size="sm" variant="outline" onClick={handleAddAction}>
                <Plus className="w-4 h-4 mr-2" />
                Add Action
              </Button>
            </div>

            {actions.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed rounded-lg bg-slate-50">
                <Zap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">No actions yet. Click "Add Action" to get started.</p>
              </div>
            )}

            <div className="space-y-3">
              {actions.map((action, idx) => {
                const Icon = ACTION_TYPES.find(t => t.value === action.action_type)?.icon || Zap;
                
                return (
                  <div key={idx} className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-600 rounded-lg flex-shrink-0">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Action {idx + 1}</Label>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAction(idx)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>

                        <Select
                          value={action.action_type}
                          onValueChange={(value) => handleActionChange(idx, 'action_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Action-specific configuration */}
                        {action.action_type === 'move_to_column' && (
                          <div className="space-y-2">
                            <Label>Target Column</Label>
                            <Select
                              value={action.action_config.column_id || ''}
                              onValueChange={(value) => handleActionChange(idx, 'column_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                {columns.map((col) => (
                                  <SelectItem key={col.id} value={col.id}>
                                    {col.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {action.action_type === 'change_status' && (
                          <div className="space-y-2">
                            <Label>New Status</Label>
                            <Select
                              value={action.action_config.status || ''}
                              onValueChange={(value) => handleActionChange(idx, 'status', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="evaluating">Evaluating</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="submitted">Submitted</SelectItem>
                                <SelectItem value="won">Won</SelectItem>
                                <SelectItem value="lost">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {action.action_type === 'send_notification' && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Notification Message</Label>
                              <Textarea
                                value={action.action_config.message || ''}
                                onChange={(e) => handleActionChange(idx, 'message', e.target.value)}
                                placeholder="Enter notification message"
                                rows={2}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Send To</Label>
                              <Select
                                value={action.action_config.recipient_type || 'assigned_users'}
                                onValueChange={(value) => handleActionChange(idx, 'recipient_type', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="assigned_users">Assigned Team Members</SelectItem>
                                  <SelectItem value="lead_writer">Lead Writer</SelectItem>
                                  <SelectItem value="all_team">All Team Members</SelectItem>
                                  <SelectItem value="specific_user">Specific User</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {action.action_config.recipient_type === 'specific_user' && (
                              <div className="space-y-2">
                                <Label>Select User</Label>
                                <Select
                                  value={action.action_config.user_email || ''}
                                  onValueChange={(value) => handleActionChange(idx, 'user_email', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select user" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {teamMembers.map((member) => (
                                      <SelectItem key={member.email} value={member.email}>
                                        {member.full_name} ({member.email})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        )}

                        {action.action_type === 'assign_user' && (
                          <div className="space-y-2">
                            <Label>Assign To</Label>
                            <Select
                              value={action.action_config.user_email || ''}
                              onValueChange={(value) => handleActionChange(idx, 'user_email', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                              <SelectContent>
                                {teamMembers.map((member) => (
                                  <SelectItem key={member.email} value={member.email}>
                                    {member.full_name} ({member.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {action.action_type === 'set_field_value' && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Field Name</Label>
                              <Input
                                value={action.action_config.field_name || ''}
                                onChange={(e) => handleActionChange(idx, 'field_name', e.target.value)}
                                placeholder="e.g., priority, custom_fields.Status"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>New Value</Label>
                              <Input
                                value={action.action_config.field_value || ''}
                                onChange={(e) => handleActionChange(idx, 'field_value', e.target.value)}
                                placeholder="Enter value"
                              />
                            </div>
                          </div>
                        )}

                        {action.action_type === 'add_comment' && (
                          <div className="space-y-2">
                            <Label>Comment Text</Label>
                            <Textarea
                              value={action.action_config.comment_text || ''}
                              onChange={(e) => handleActionChange(idx, 'comment_text', e.target.value)}
                              placeholder="Enter comment text (supports variables like {proposal_name}, {due_date})"
                              rows={3}
                            />
                          </div>
                        )}

                        {action.action_type === 'create_calendar_event' && (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label>Event Title</Label>
                              <Input
                                value={action.action_config.event_title || ''}
                                onChange={(e) => handleActionChange(idx, 'event_title', e.target.value)}
                                placeholder="e.g., Review {proposal_name}"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Days Until Event</Label>
                              <Input
                                type="number"
                                value={action.action_config.days_offset || 0}
                                onChange={(e) => handleActionChange(idx, 'days_offset', parseInt(e.target.value))}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Applies To */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-slate-900">Apply To</h3>
            <Select
              value={appliesTo.scope}
              onValueChange={(value) => setAppliesTo({ ...appliesTo, scope: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_proposals">All Proposals</SelectItem>
                <SelectItem value="specific_columns">Specific Columns</SelectItem>
                <SelectItem value="specific_proposal_types">Specific Project Types</SelectItem>
              </SelectContent>
            </Select>

            {appliesTo.scope === 'specific_proposal_types' && (
              <div className="p-4 bg-slate-50 rounded-lg">
                <Label className="mb-2 block">Project Types</Label>
                <div className="flex flex-wrap gap-2">
                  {['RFP', 'RFQ', 'RFI', 'IFB', 'Other'].map(type => (
                    <Badge
                      key={type}
                      variant={appliesTo.proposal_types?.includes(type) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const current = appliesTo.proposal_types || [];
                        const updated = current.includes(type)
                          ? current.filter(t => t !== type)
                          : [...current, type];
                        setAppliesTo({ ...appliesTo, proposal_types: updated });
                      }}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveRuleMutation.isPending}>
            {saveRuleMutation.isPending ? (
              <>
                <Save className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Rule
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}