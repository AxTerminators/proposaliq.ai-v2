import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  CheckCircle2, 
  Bell,
  Activity
} from "lucide-react";
import WorkflowManager from "./WorkflowManager";
import ApprovalManager from "./ApprovalManager";

export default function AutomationHub({ proposal, organization, user }) {
  const [remindersSent, setRemindersSent] = useState([]);

  // Guard clause - don't render if required props are missing
  if (!proposal || !organization || !user) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600">Loading automation hub...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <AutomationHubContent 
      proposal={proposal} 
      organization={organization} 
      user={user}
      remindersSent={remindersSent}
      setRemindersSent={setRemindersSent}
    />
  );
}

function AutomationHubContent({ proposal, organization, user, remindersSent, setRemindersSent }) {
  // Check for due date reminders
  useQuery({
    queryKey: ['check-reminders', proposal.id],
    queryFn: async () => {
      // Get active reminder rules
      const rules = await base44.entities.WorkflowRule.filter({
        organization_id: organization.id,
        rule_type: "due_date_reminder",
        is_active: true
      });

      // Get all tasks for this proposal
      const tasks = await base44.entities.ProposalTask.filter({
        proposal_id: proposal.id
      });

      const now = new Date();
      const reminders = [];

      // Check proposal due date
      if (proposal.due_date) {
        const dueDate = new Date(proposal.due_date);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        for (const rule of rules) {
          const daysBefore = rule.trigger_conditions?.days_before_due || 7;
          
          if (daysUntilDue === daysBefore && daysUntilDue > 0) {
            // Send reminders
            const actions = rule.actions || [];
            for (const action of actions) {
              if (action.action_type === "send_reminder") {
                const recipients = action.notification_recipients || [user.email];
                
                for (const recipient of recipients) {
                  const alreadySent = remindersSent.some(r => 
                    r.proposal_id === proposal.id && 
                    r.recipient === recipient &&
                    r.days === daysBefore
                  );

                  if (!alreadySent) {
                    await base44.entities.Notification.create({
                      user_email: recipient,
                      notification_type: "deadline_reminder",
                      title: `Proposal Due in ${daysBefore} Days`,
                      message: action.notification_message || 
                        `${proposal.proposal_name} is due on ${new Date(proposal.due_date).toLocaleDateString()}`,
                      related_proposal_id: proposal.id,
                      from_user_email: "system",
                      from_user_name: "ProposalIQ Automation",
                      action_url: `/app/ProposalBuilder?id=${proposal.id}`
                    });

                    reminders.push({
                      proposal_id: proposal.id,
                      recipient,
                      days: daysBefore,
                      sent_date: new Date().toISOString()
                    });
                  }
                }
              }
            }
          }
        }
      }

      // Check task due dates
      for (const task of tasks) {
        if (task.due_date && task.status !== "completed") {
          const taskDueDate = new Date(task.due_date);
          const daysUntilDue = Math.ceil((taskDueDate - now) / (1000 * 60 * 60 * 24));

          for (const rule of rules) {
            const daysBefore = rule.trigger_conditions?.days_before_due || 3;
            
            if (daysUntilDue === daysBefore && daysUntilDue > 0) {
              const alreadySent = remindersSent.some(r => 
                r.task_id === task.id && 
                r.recipient === task.assigned_to_email &&
                r.days === daysBefore
              );

              if (!alreadySent && task.assigned_to_email) {
                await base44.entities.Notification.create({
                  user_email: task.assigned_to_email,
                  notification_type: "deadline_reminder",
                  title: `Task Due in ${daysBefore} Days`,
                  message: `Your task "${task.title}" is due on ${new Date(task.due_date).toLocaleDateString()}`,
                  related_proposal_id: proposal.id,
                  related_entity_id: task.id,
                  related_entity_type: "task",
                  from_user_email: "system",
                  from_user_name: "ProposalIQ Automation",
                  action_url: `/app/ProposalBuilder?id=${proposal.id}`
                });

                reminders.push({
                  task_id: task.id,
                  recipient: task.assigned_to_email,
                  days: daysBefore,
                  sent_date: new Date().toISOString()
                });
              }
            }
          }
        }
      }

      if (reminders.length > 0) {
        setRemindersSent(prev => [...prev, ...reminders]);
      }

      return reminders;
    },
    refetchInterval: 1000 * 60 * 60, // Check every hour
    enabled: true,
  });

  // Check for workflow triggers when tasks change
  useQuery({
    queryKey: ['check-workflow-triggers', proposal.id],
    queryFn: async () => {
      // Get active workflow rules
      const rules = await base44.entities.WorkflowRule.filter({
        organization_id: organization.id,
        is_active: true
      });

      // Get all tasks for this proposal
      const tasks = await base44.entities.ProposalTask.filter({
        proposal_id: proposal.id
      });

      for (const rule of rules) {
        if (rule.rule_type === "task_completion") {
          // Check if all tasks are completed
          const allTasksComplete = tasks.length > 0 && tasks.every(t => t.status === "completed");
          
          if (allTasksComplete && rule.trigger_conditions?.all_tasks_status === "completed") {
            // Execute actions
            const actions = rule.actions || [];
            for (const action of actions) {
              if (action.action_type === "change_status" && action.target_status) {
                // Update proposal status
                await base44.entities.Proposal.update(proposal.id, {
                  status: action.target_status
                });

                // Log activity
                await base44.entities.ActivityLog.create({
                  proposal_id: proposal.id,
                  user_email: "system",
                  user_name: "Automation",
                  action_type: "status_changed",
                  action_description: `Status automatically changed to ${action.target_status} by workflow rule: ${rule.rule_name}`
                });

                // Send notification to stakeholders
                await base44.entities.Notification.create({
                  user_email: user.email,
                  notification_type: "status_change",
                  title: "Proposal Status Changed",
                  message: `${proposal.proposal_name} status changed to ${action.target_status}`,
                  related_proposal_id: proposal.id,
                  from_user_email: "system",
                  from_user_name: "ProposalIQ Automation",
                  action_url: `/app/ProposalBuilder?id=${proposal.id}`
                });
              }

              if (action.action_type === "send_notification") {
                const recipients = action.notification_recipients || [user.email];
                for (const recipient of recipients) {
                  await base44.entities.Notification.create({
                    user_email: recipient,
                    notification_type: "status_change",
                    title: rule.rule_name,
                    message: action.notification_message || `Workflow triggered: ${rule.rule_name}`,
                    related_proposal_id: proposal.id,
                    from_user_email: "system",
                    from_user_name: "ProposalIQ Automation",
                    action_url: `/app/ProposalBuilder?id=${proposal.id}`
                  });
                }
              }
            }

            // Update rule trigger count
            await base44.entities.WorkflowRule.update(rule.id, {
              trigger_count: (rule.trigger_count || 0) + 1,
              last_triggered: new Date().toISOString()
            });
          }
        }
      }
    },
    refetchInterval: 1000 * 60 * 5, // Check every 5 minutes
    enabled: true,
  });

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-600" />
            Automation Hub
          </CardTitle>
          <p className="text-sm text-slate-600">
            Automated workflows, approvals, and reminders for this proposal
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="workflows" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflows">
            <Zap className="w-4 h-4 mr-2" />
            Workflow Rules
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="w-4 h-4 mr-2" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows">
          <WorkflowManager organization={organization} user={user} />
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalManager 
            proposal={proposal} 
            organization={organization} 
            user={user} 
          />
        </TabsContent>

        <TabsContent value="activity">
          <AutomationActivity proposal={proposal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AutomationActivity({ proposal }) {
  const { data: activityLogs, isLoading } = useQuery({
    queryKey: ['activity-logs', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.ActivityLog.filter(
        { proposal_id: proposal.id },
        '-created_date',
        50
      );
    },
    initialData: [],
    enabled: !!proposal?.id,
  });

  const automationLogs = activityLogs.filter(log => 
    log.user_email === "system" || log.user_name === "Automation"
  );

  return (
    <Card className="border-none shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Automation Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {automationLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No automation activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {automationLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  {log.action_type === "status_changed" ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Bell className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {log.action_description}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(log.created_date).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}