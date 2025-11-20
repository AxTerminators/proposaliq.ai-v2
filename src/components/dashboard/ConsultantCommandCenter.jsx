import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap,
  AlertCircle,
  Clock,
  CheckCircle2,
  MessageSquare,
  Eye,
  TrendingUp,
  Target,
  Flame,
  Brain,
  ArrowRight,
  Calendar,
  Users,
  FileText,
  Bell,
  Timer,
  Award,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PRIORITY_COLORS = {
  critical: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", icon: AlertCircle },
  high: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", icon: Flame },
  medium: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", icon: Clock },
  low: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", icon: CheckCircle2 }
};

export default function ConsultantCommandCenter({ user, organization }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timeSaved, setTimeSaved] = useState(0);

  // Query all data needed for command center
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', organization.id],
    queryFn: () => base44.entities.Organization.filter({ 
      organization_type: 'client_organization',
      parent_organization_id: organization.id 
    }),
    initialData: []
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', organization.id],
    queryFn: () => base44.entities.Proposal.filter({ organization_id: organization.id }),
    initialData: []
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['all-tasks', organization.id],
    queryFn: async () => {
      const allTasks = [];
      for (const proposal of proposals) {
        const proposalTasks = await base44.entities.ProposalTask.filter({ proposal_id: proposal.id });
        allTasks.push(...proposalTasks.map(t => ({ ...t, proposal_name: proposal.proposal_name })));
      }
      return allTasks;
    },
    initialData: [],
    enabled: proposals.length > 0
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email, is_read: false }),
    initialData: []
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['recent-comments'],
    queryFn: async () => {
      const allComments = await base44.entities.ProposalComment.list('-created_date', 100);
      return allComments.filter(c => !c.is_resolved);
    },
    initialData: []
  });

  const { data: clientNotifications = [] } = useQuery({
    queryKey: ['client-notifications'],
    queryFn: () => base44.entities.ClientNotification.filter({ is_read: false }),
    initialData: []
  });

  const { data: engagementMetrics = [] } = useQuery({
    queryKey: ['recent-engagement'],
    queryFn: () => base44.entities.ClientEngagementMetric.list('-created_date', 200),
    initialData: []
  });

  // Calculate action items
  const calculateActionItems = () => {
    const items = [];
    const now = new Date();

    // 1. CRITICAL: Proposals due in 48 hours
    proposals.forEach(proposal => {
      if (!proposal.due_date || !['in_progress', 'draft'].includes(proposal.status)) return;
      const hoursUntilDue = (new Date(proposal.due_date) - now) / (1000 * 60 * 60);
      
      if (hoursUntilDue > 0 && hoursUntilDue <= 48) {
        items.push({
          id: `proposal-due-${proposal.id}`,
          type: 'deadline',
          priority: hoursUntilDue <= 24 ? 'critical' : 'high',
          title: `Proposal due in ${Math.round(hoursUntilDue)} hours`,
          description: proposal.proposal_name,
          action: 'Review & Submit',
          url: createPageUrl(`ProposalBuilder?id=${proposal.id}`),
          metadata: { proposal_id: proposal.id, hours: hoursUntilDue }
        });
      }
    });

    // 2. HIGH: Client viewed but no response (24+ hours)
    const recentViews = engagementMetrics.filter(m => 
      m.event_type === 'page_view' && 
      moment(m.created_date).isAfter(moment().subtract(72, 'hours'))
    );

    const viewsByClient = {};
    recentViews.forEach(view => {
      if (!viewsByClient[view.client_id]) {
        viewsByClient[view.client_id] = { last_view: view.created_date, proposal_id: view.proposal_id };
      }
    });

    Object.entries(viewsByClient).forEach(([clientId, data]) => {
      const hoursSinceView = (now - new Date(data.last_view)) / (1000 * 60 * 60);
      if (hoursSinceView >= 24 && hoursSinceView <= 72) {
        const client = clients.find(c => c.id === clientId);
        const proposal = proposals.find(p => p.id === data.proposal_id);
        
        if (client && proposal) {
          items.push({
            id: `follow-up-${clientId}`,
            type: 'follow_up',
            priority: hoursSinceView >= 48 ? 'high' : 'medium',
            title: `${client.contact_name || client.organization_name} viewed but no response`,
            description: `Viewed ${proposal.proposal_name} ${Math.round(hoursSinceView)} hours ago`,
            action: 'Send Follow-up',
            url: createPageUrl(`ClientPortal?token=${client.access_token}`),
            metadata: { client_id: clientId, hours: hoursSinceView }
          });
        }
      }
    });

    // 3. MEDIUM: Unresolved comments
    comments.forEach(comment => {
      const proposal = proposals.find(p => p.id === comment.proposal_id);
      if (!proposal) return;
      
      const hoursSinceComment = (now - new Date(comment.created_date)) / (1000 * 60 * 60);
      if (hoursSinceComment >= 12) {
        items.push({
          id: `comment-${comment.id}`,
          type: 'comment',
          priority: comment.comment_type === 'issue' ? 'high' : 'medium',
          title: 'Unresolved comment needs response',
          description: `${proposal.proposal_name} - ${comment.content.substring(0, 50)}...`,
          action: 'Respond',
          url: createPageUrl(`ProposalBuilder?id=${proposal.id}`),
          metadata: { comment_id: comment.id }
        });
      }
    });

    // 4. MEDIUM: Tasks overdue
    tasks.forEach(task => {
      if (task.status === 'completed' || !task.due_date) return;
      const daysOverdue = moment().diff(moment(task.due_date), 'days');
      
      if (daysOverdue > 0) {
        items.push({
          id: `task-overdue-${task.id}`,
          type: 'task',
          priority: daysOverdue >= 3 ? 'high' : 'medium',
          title: `Task overdue by ${daysOverdue} days`,
          description: `${task.proposal_name}: ${task.title}`,
          action: 'Complete Task',
          url: createPageUrl(`Tasks`),
          metadata: { task_id: task.id, days_overdue: daysOverdue }
        });
      }
    });

    // 5. LOW: Client hasn't logged in (7+ days)
    clients.forEach(client => {
      if (!client.last_portal_access) return;
      const daysSinceLogin = moment().diff(moment(client.last_portal_access), 'days');
      
      if (daysSinceLogin >= 7 && daysSinceLogin <= 14) {
        items.push({
          id: `inactive-${client.id}`,
          type: 'engagement',
          priority: 'low',
          title: `${client.contact_name || client.organization_name} inactive for ${daysSinceLogin} days`,
          description: 'Consider sending an engagement email',
          action: 'Re-engage',
          url: createPageUrl(`Clients`),
          metadata: { client_id: client.id, days: daysSinceLogin }
        });
      }
    });

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  };

  const actionItems = calculateActionItems();

  // AI Suggestions
  const generateAISuggestions = () => {
    const suggestions = [];

    // Suggest following up on high-value proposals
    const highValueProposals = proposals
      .filter(p => p.contract_value && p.contract_value > 100000 && p.status === 'submitted')
      .sort((a, b) => b.contract_value - a.contract_value)
      .slice(0, 3);

    highValueProposals.forEach(proposal => {
      suggestions.push({
        id: `ai-follow-up-${proposal.id}`,
        icon: DollarSign,
        color: 'text-green-600',
        title: 'High-value proposal pending',
        description: `${proposal.proposal_name} ($${(proposal.contract_value / 1000).toFixed(0)}K) - Consider status check`,
        action: 'Check Status',
        url: createPageUrl(`ProposalBuilder?id=${proposal.id}`)
      });
    });

    // Suggest reaching out to engaged clients
    const engagedClients = clients
      .filter(c => c.last_portal_access && moment().diff(moment(c.last_portal_access), 'days') <= 3)
      .slice(0, 2);

    engagedClients.forEach(client => {
      suggestions.push({
        id: `ai-engage-${client.id}`,
        icon: TrendingUp,
        color: 'text-purple-600',
        title: 'Client highly engaged',
        description: `${client.contact_name || client.organization_name} - Good time to share new proposals`,
        action: 'Share Content',
        url: createPageUrl(`Clients`)
      });
    });

    // Suggest reviewing stale proposals
    const staleProposals = proposals
      .filter(p => p.status === 'in_progress' && moment().diff(moment(p.updated_date), 'days') >= 7)
      .slice(0, 2);

    staleProposals.forEach(proposal => {
      suggestions.push({
        id: `ai-stale-${proposal.id}`,
        icon: Clock,
        color: 'text-amber-600',
        title: 'Stale proposal needs attention',
        description: `${proposal.proposal_name} - No updates in ${moment().diff(moment(proposal.updated_date), 'days')} days`,
        action: 'Review',
        url: createPageUrl(`ProposalBuilder?id=${proposal.id}`)
      });
    });

    return suggestions.slice(0, 5);
  };

  const aiSuggestions = generateAISuggestions();

  // Quick stats
  const stats = {
    criticalItems: actionItems.filter(i => i.priority === 'critical').length,
    dueSoon: proposals.filter(p => {
      if (!p.due_date || !['in_progress', 'draft'].includes(p.status)) return false;
      const days = moment(p.due_date).diff(moment(), 'days');
      return days >= 0 && days <= 7;
    }).length,
    unreadNotifications: notifications.length + clientNotifications.length,
    tasksToday: tasks.filter(t => {
      if (t.status === 'completed' || !t.due_date) return false;
      return moment(t.due_date).isSame(moment(), 'day');
    }).length
  };

  // Load saved time from local storage
  useEffect(() => {
    const saved = localStorage.getItem('consultant_time_saved');
    if (saved) setTimeSaved(parseInt(saved));
  }, []);

  const addTimeSaved = (minutes) => {
    const newTotal = timeSaved + minutes;
    setTimeSaved(newTotal);
    localStorage.setItem('consultant_time_saved', newTotal.toString());
  };

  return (
    <div className="space-y-6">
      {/* Header with Time Saved */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">⚡ Command Center</h2>
              <p className="text-indigo-100">Your daily productivity dashboard</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <Timer className="w-5 h-5" />
                <span className="text-3xl font-bold">{Math.floor(timeSaved / 60)}h {timeSaved % 60}m</span>
              </div>
              <p className="text-sm text-indigo-100">Time Saved This Month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className={cn("border-none shadow-lg", stats.criticalItems > 0 ? "bg-red-50 border-2 border-red-300" : "")}>
          <CardContent className="p-4 text-center">
            <AlertCircle className={cn("w-8 h-8 mx-auto mb-2", stats.criticalItems > 0 ? "text-red-600" : "text-slate-400")} />
            <p className="text-3xl font-bold text-slate-900">{stats.criticalItems}</p>
            <p className="text-sm text-slate-600">Critical Items</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.dueSoon}</p>
            <p className="text-sm text-slate-600">Due This Week</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Bell className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.unreadNotifications}</p>
            <p className="text-sm text-slate-600">Notifications</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.tasksToday}</p>
            <p className="text-sm text-slate-600">Tasks Today</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="actions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="actions" className="relative">
            Action Items
            {actionItems.length > 0 && (
              <Badge className="ml-2 bg-red-600">{actionItems.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Brain className="w-4 h-4 mr-2" />
            AI Suggestions
            <Badge className="ml-2 bg-purple-600">{aiSuggestions.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Action Items Tab */}
        <TabsContent value="actions" className="space-y-4">
          {actionItems.length === 0 ? (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <Award className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-2xl font-bold text-slate-900 mb-2">All Caught Up! 🎉</h3>
                <p className="text-slate-600">No urgent action items right now. Great work!</p>
              </CardContent>
            </Card>
          ) : (
            actionItems.map(item => {
              const priorityConfig = PRIORITY_COLORS[item.priority];
              const Icon = priorityConfig.icon;

              return (
                <Card 
                  key={item.id}
                  className={cn(
                    "border-2 hover:shadow-xl transition-all cursor-pointer",
                    priorityConfig.border
                  )}
                  onClick={() => {
                    navigate(item.url);
                    addTimeSaved(5); // 5 minutes saved per quick action
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", priorityConfig.bg)}>
                        <Icon className={cn("w-6 h-6", priorityConfig.text)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-slate-900">{item.title}</h4>
                          <Badge className={cn("capitalize", priorityConfig.bg, priorityConfig.text)}>
                            {item.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{item.description}</p>
                        <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600">
                          {item.action}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* AI Suggestions Tab */}
        <TabsContent value="ai" className="space-y-4">
          {aiSuggestions.map(suggestion => {
            const Icon = suggestion.icon;

            return (
              <Card 
                key={suggestion.id}
                className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer"
                onClick={() => {
                  navigate(suggestion.url);
                  addTimeSaved(10); // 10 minutes saved per AI suggestion
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Icon className={cn("w-6 h-6", suggestion.color)} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 mb-1">{suggestion.title}</h4>
                      <p className="text-sm text-slate-600 mb-3">{suggestion.description}</p>
                      <Button size="sm" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                        <Brain className="w-4 h-4 mr-2" />
                        {suggestion.action}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {aiSuggestions.length === 0 && (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <Brain className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                <p className="text-slate-600">No AI suggestions at the moment</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}