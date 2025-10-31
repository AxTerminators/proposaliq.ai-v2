import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Bell,
  BellOff,
  Settings,
  Eye,
  MessageSquare,
  Clock,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calendar,
  Zap,
  Brain,
  Filter,
  Volume2,
  VolumeX
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { toast } from "sonner";

const NOTIFICATION_RULES = [
  {
    id: 'client_viewed_no_action',
    category: 'engagement',
    icon: Eye,
    color: 'blue',
    title: 'Client Viewed But No Action',
    description: 'Alert when client views proposal but doesn\'t comment or respond within X hours',
    default_enabled: true,
    default_threshold: 24,
    threshold_label: 'Hours after view',
    priority: 'high'
  },
  {
    id: 'proposal_deadline_approaching',
    category: 'deadline',
    icon: Clock,
    color: 'red',
    title: 'Proposal Deadline Approaching',
    description: 'Alert X days before proposal submission deadline',
    default_enabled: true,
    default_threshold: 3,
    threshold_label: 'Days before deadline',
    priority: 'critical'
  },
  {
    id: 'client_engagement_drop',
    category: 'engagement',
    icon: TrendingDown,
    color: 'orange',
    title: 'Engagement Drop Detected',
    description: 'Alert when client activity drops significantly (no login for X days)',
    default_enabled: true,
    default_threshold: 7,
    threshold_label: 'Days inactive',
    priority: 'medium'
  },
  {
    id: 'high_value_proposal_pending',
    category: 'revenue',
    icon: DollarSign,
    color: 'green',
    title: 'High-Value Proposal Pending',
    description: 'Daily reminder for proposals over $X with no decision',
    default_enabled: true,
    default_threshold: 100000,
    threshold_label: 'Minimum contract value ($)',
    priority: 'high'
  },
  {
    id: 'unresolved_comment',
    category: 'collaboration',
    icon: MessageSquare,
    color: 'purple',
    title: 'Unresolved Comment',
    description: 'Alert when comment remains unresolved for X hours',
    default_enabled: true,
    default_threshold: 12,
    threshold_label: 'Hours unresolved',
    priority: 'medium'
  },
  {
    id: 'task_overdue',
    category: 'tasks',
    icon: AlertTriangle,
    color: 'red',
    title: 'Task Overdue',
    description: 'Alert when task becomes overdue',
    default_enabled: true,
    default_threshold: 0,
    threshold_label: 'Days overdue',
    priority: 'high'
  },
  {
    id: 'client_approval_pending',
    category: 'approvals',
    icon: CheckCircle2,
    color: 'amber',
    title: 'Client Approval Pending',
    description: 'Remind when approval request pending for X days',
    default_enabled: true,
    default_threshold: 2,
    threshold_label: 'Days pending',
    priority: 'medium'
  },
  {
    id: 'proposal_not_opened',
    category: 'engagement',
    icon: Eye,
    color: 'slate',
    title: 'Proposal Not Opened',
    description: 'Alert when shared proposal not viewed within X days',
    default_enabled: false,
    default_threshold: 3,
    threshold_label: 'Days after sharing',
    priority: 'low'
  },
  {
    id: 'milestone_reminder',
    category: 'milestones',
    icon: Calendar,
    color: 'indigo',
    title: 'Milestone Reminder',
    description: 'Alert X days before major proposal milestones',
    default_enabled: true,
    default_threshold: 2,
    threshold_label: 'Days before milestone',
    priority: 'medium'
  },
  {
    id: 'competitor_activity',
    category: 'intelligence',
    icon: Brain,
    color: 'purple',
    title: 'Competitor Activity Alert',
    description: 'Notify when competitor wins similar contract or new intel available',
    default_enabled: false,
    default_threshold: 0,
    threshold_label: 'N/A',
    priority: 'low'
  }
];

export default function SmartNotificationSystem({ user, organization }) {
  const queryClient = useQueryClient();
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({});
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load settings from user data
  useEffect(() => {
    const loadSettings = async () => {
      const userData = await base44.auth.me();
      const settings = userData.notification_rules || {};
      
      // Initialize with defaults if not set
      const initialSettings = {};
      NOTIFICATION_RULES.forEach(rule => {
        initialSettings[rule.id] = settings[rule.id] || {
          enabled: rule.default_enabled,
          threshold: rule.default_threshold
        };
      });
      
      setNotificationSettings(initialSettings);
      setDigestEnabled(userData.digest_enabled !== false);
      setSoundEnabled(userData.sound_enabled !== false);
    };
    
    loadSettings();
  }, []);

  // Query active notifications
  const { data: activeNotifications = [] } = useQuery({
    queryKey: ['active-notifications', user.email],
    queryFn: () => base44.entities.Notification.filter({
      user_email: user.email,
      is_read: false
    }, '-created_date', 50),
    initialData: [],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Query data for notification generation
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', organization.id],
    queryFn: () => base44.entities.Proposal.filter({ organization_id: organization.id }),
    initialData: []
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', organization.id],
    queryFn: () => base44.entities.Client.filter({ organization_id: organization.id }),
    initialData: []
  });

  const { data: engagementMetrics = [] } = useQuery({
    queryKey: ['engagement-metrics'],
    queryFn: () => base44.entities.ClientEngagementMetric.list('-created_date', 500),
    initialData: []
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const allTasks = [];
      for (const proposal of proposals) {
        const proposalTasks = await base44.entities.ProposalTask.filter({ proposal_id: proposal.id });
        allTasks.push(...proposalTasks);
      }
      return allTasks;
    },
    initialData: [],
    enabled: proposals.length > 0
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      return base44.auth.updateMe({
        notification_rules: settings,
        digest_enabled: digestEnabled,
        sound_enabled: soundEnabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setShowSettingsDialog(false);
      toast.success("Notification settings saved");
    }
  });

  // Generate notifications based on rules
  const generateNotificationsMutation = useMutation({
    mutationFn: async () => {
      const newNotifications = [];
      const now = new Date();

      // Rule: Client viewed but no action
      if (notificationSettings.client_viewed_no_action?.enabled) {
        const threshold = notificationSettings.client_viewed_no_action.threshold;
        const recentViews = engagementMetrics.filter(m => 
          m.event_type === 'page_view' &&
          moment(m.created_date).isBefore(moment().subtract(threshold, 'hours'))
        );

        const viewsByProposal = {};
        recentViews.forEach(view => {
          if (!viewsByProposal[view.proposal_id]) {
            viewsByProposal[view.proposal_id] = { client_id: view.client_id, last_view: view.created_date };
          }
        });

        for (const [proposalId, data] of Object.entries(viewsByProposal)) {
          const proposal = proposals.find(p => p.id === proposalId);
          const client = clients.find(c => c.id === data.client_id);
          
          // Check if client took any action since view
          const actions = engagementMetrics.filter(m => 
            m.proposal_id === proposalId &&
            m.client_id === data.client_id &&
            ['comment_added', 'annotation_created'].includes(m.event_type) &&
            moment(m.created_date).isAfter(moment(data.last_view))
          );

          if (actions.length === 0 && proposal && client) {
            newNotifications.push({
              user_email: user.email,
              notification_type: 'status_change',
              title: `${client.contact_name || client.client_name} viewed but no response`,
              message: `Viewed "${proposal.proposal_name}" ${moment(data.last_view).fromNow()} but hasn't taken action`,
              related_proposal_id: proposalId,
              action_url: `/ProposalBuilder?id=${proposalId}`,
              from_user_name: client.contact_name || client.client_name
            });
          }
        }
      }

      // Rule: Proposal deadline approaching
      if (notificationSettings.proposal_deadline_approaching?.enabled) {
        const threshold = notificationSettings.proposal_deadline_approaching.threshold;
        proposals.forEach(proposal => {
          if (!proposal.due_date || !['draft', 'in_progress'].includes(proposal.status)) return;
          
          const daysUntilDue = moment(proposal.due_date).diff(moment(), 'days');
          if (daysUntilDue >= 0 && daysUntilDue <= threshold) {
            newNotifications.push({
              user_email: user.email,
              notification_type: 'deadline_reminder',
              title: `Proposal due in ${daysUntilDue} days`,
              message: `"${proposal.proposal_name}" deadline: ${moment(proposal.due_date).format('MMM D, YYYY')}`,
              related_proposal_id: proposal.id,
              action_url: `/ProposalBuilder?id=${proposal.id}`
            });
          }
        });
      }

      // Rule: Client engagement drop
      if (notificationSettings.client_engagement_drop?.enabled) {
        const threshold = notificationSettings.client_engagement_drop.threshold;
        clients.forEach(client => {
          if (!client.last_portal_access) return;
          const daysInactive = moment().diff(moment(client.last_portal_access), 'days');
          
          if (daysInactive >= threshold && daysInactive <= threshold + 1) {
            newNotifications.push({
              user_email: user.email,
              notification_type: 'status_change',
              title: `${client.contact_name || client.client_name} inactive`,
              message: `No activity for ${daysInactive} days - consider re-engagement`,
              action_url: `/Clients`,
              from_user_name: client.contact_name || client.client_name
            });
          }
        });
      }

      // Rule: High-value proposal pending
      if (notificationSettings.high_value_proposal_pending?.enabled) {
        const threshold = notificationSettings.high_value_proposal_pending.threshold;
        proposals.forEach(proposal => {
          if (proposal.contract_value && proposal.contract_value >= threshold && proposal.status === 'submitted') {
            // Check if already notified today
            const todayNotification = activeNotifications.find(n => 
              n.related_proposal_id === proposal.id && 
              moment(n.created_date).isSame(moment(), 'day')
            );
            
            if (!todayNotification) {
              newNotifications.push({
                user_email: user.email,
                notification_type: 'status_change',
                title: `High-value proposal pending: $${(proposal.contract_value / 1000).toFixed(0)}K`,
                message: `"${proposal.proposal_name}" awaiting decision`,
                related_proposal_id: proposal.id,
                action_url: `/ProposalBuilder?id=${proposal.id}`
              });
            }
          }
        });
      }

      // Rule: Task overdue
      if (notificationSettings.task_overdue?.enabled) {
        tasks.forEach(task => {
          if (task.status === 'completed' || !task.due_date) return;
          const daysOverdue = moment().diff(moment(task.due_date), 'days');
          
          if (daysOverdue > 0 && task.assigned_to_email === user.email) {
            newNotifications.push({
              user_email: user.email,
              notification_type: 'task_assigned',
              title: `Task overdue: ${task.title}`,
              message: `Overdue by ${daysOverdue} days`,
              action_url: `/Tasks`,
              related_entity_type: 'task'
            });
          }
        });
      }

      // Create notifications in database
      for (const notification of newNotifications) {
        await base44.entities.Notification.create(notification);
      }

      return newNotifications;
    },
    onSuccess: (notifications) => {
      queryClient.invalidateQueries({ queryKey: ['active-notifications'] });
      if (notifications.length > 0) {
        toast.info(`${notifications.length} new notification(s) generated`);
        
        // Play sound if enabled
        if (soundEnabled && typeof Audio !== 'undefined') {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTQIGmi77eiaUhELTKXh8bllHgU7k9nyz3oqBSl+zPDajz0JFF','...');
          audio.volume = 0.3;
          audio.play().catch(() => {}); // Ignore if audio doesn't play
        }
      }
    }
  });

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(notificationSettings);
  };

  const updateRuleSetting = (ruleId, field, value) => {
    setNotificationSettings({
      ...notificationSettings,
      [ruleId]: {
        ...notificationSettings[ruleId],
        [field]: value
      }
    });
  };

  const groupedRules = NOTIFICATION_RULES.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {});

  const enabledRulesCount = Object.values(notificationSettings).filter(s => s.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-6 h-6 text-blue-600" />
                Smart Notifications
              </CardTitle>
              <CardDescription>
                Proactive alerts based on client behavior and deadlines
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => generateNotificationsMutation.mutate()} variant="outline">
                <Zap className="w-4 h-4 mr-2" />
                Generate Now
              </Button>
              <Button onClick={() => setShowSettingsDialog(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6 text-center">
            <Bell className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold text-slate-900">{enabledRulesCount}</p>
            <p className="text-sm text-slate-600">Active Rules</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <p className="text-3xl font-bold text-slate-900">{activeNotifications.length}</p>
            <p className="text-sm text-slate-600">Unread Alerts</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-3xl font-bold text-slate-900">
              {NOTIFICATION_RULES.filter(r => notificationSettings[r.id]?.enabled && r.priority === 'critical').length}
            </p>
            <p className="text-sm text-slate-600">Critical Rules Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription>
              Configure when and how you want to be notified
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Global Settings */}
            <Card className="bg-slate-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-600" />
                    <Label>Daily Digest Email</Label>
                  </div>
                  <Switch checked={digestEnabled} onCheckedChange={setDigestEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {soundEnabled ? <Volume2 className="w-4 h-4 text-slate-600" /> : <VolumeX className="w-4 h-4 text-slate-600" />}
                    <Label>Sound Alerts</Label>
                  </div>
                  <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                </div>
              </CardContent>
            </Card>

            {/* Rules by Category */}
            {Object.entries(groupedRules).map(([category, rules]) => (
              <div key={category}>
                <h3 className="font-semibold text-slate-900 mb-3 capitalize flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  {category.replace('_', ' ')} Rules
                </h3>
                <div className="space-y-3">
                  {rules.map(rule => {
                    const Icon = rule.icon;
                    const settings = notificationSettings[rule.id] || {};
                    const colorClasses = {
                      blue: 'text-blue-600',
                      green: 'text-green-600',
                      red: 'text-red-600',
                      orange: 'text-orange-600',
                      purple: 'text-purple-600',
                      amber: 'text-amber-600',
                      slate: 'text-slate-600',
                      indigo: 'text-indigo-600'
                    };

                    return (
                      <Card key={rule.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Icon className={cn("w-5 h-5 mt-1", colorClasses[rule.color])} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold text-slate-900">{rule.title}</h4>
                                  <p className="text-sm text-slate-600">{rule.description}</p>
                                </div>
                                <Switch
                                  checked={settings.enabled || false}
                                  onCheckedChange={(checked) => updateRuleSetting(rule.id, 'enabled', checked)}
                                />
                              </div>
                              {settings.enabled && rule.threshold_label !== 'N/A' && (
                                <div className="flex items-center gap-3 mt-3">
                                  <Label className="text-xs text-slate-600">{rule.threshold_label}:</Label>
                                  <Input
                                    type="number"
                                    value={settings.threshold || rule.default_threshold}
                                    onChange={(e) => updateRuleSetting(rule.id, 'threshold', parseInt(e.target.value))}
                                    className="w-24 h-8 text-sm"
                                    min="0"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={saveSettingsMutation.isPending}>
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}