import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { 
  Zap,
  FileText,
  Users,
  Calendar,
  CheckSquare,
  Eye,
  MessageSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  Mail,
  Phone,
  Navigation,
  ArrowRight,
  ChevronRight,
  Menu,
  Bell,
  Search,
  Plus,
  Home,
  BarChart3,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { toast } from "sonner";

const QUICK_ACTIONS = [
  {
    id: 'proposals_due_soon',
    icon: AlertTriangle,
    label: 'Due Soon',
    color: 'red',
    query: 'proposals'
  },
  {
    id: 'unread_notifications',
    icon: Bell,
    label: 'Notifications',
    color: 'blue',
    query: 'notifications'
  },
  {
    id: 'tasks_today',
    icon: CheckSquare,
    label: 'Tasks Today',
    color: 'green',
    query: 'tasks'
  },
  {
    id: 'active_clients',
    icon: Users,
    label: 'Active Clients',
    color: 'purple',
    query: 'clients'
  },
  {
    id: 'recent_views',
    icon: Eye,
    label: 'Client Views',
    color: 'amber',
    query: 'engagement'
  },
  {
    id: 'unresolved_comments',
    icon: MessageSquare,
    label: 'Comments',
    color: 'indigo',
    query: 'comments'
  }
];

const NAVIGATION_SHORTCUTS = [
  { label: 'Dashboard', icon: Home, url: 'Dashboard', color: 'blue' },
  { label: 'Proposals', icon: FileText, url: 'Proposals', color: 'purple' },
  { label: 'Clients', icon: Users, url: 'Clients', color: 'green' },
  { label: 'Tasks', icon: CheckSquare, url: 'Tasks', color: 'red' },
  { label: 'Calendar', icon: Calendar, url: 'Calendar', color: 'amber' },
  { label: 'Analytics', icon: BarChart3, url: 'Analytics', color: 'indigo' }
];

export default function MobileQuickActions({ user, organization }) {
  const navigate = useNavigate();
  const [showSheet, setShowSheet] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);

  // Query data for quick actions
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

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email, is_read: false }),
    initialData: []
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['all-tasks'],
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

  const { data: engagementMetrics = [] } = useQuery({
    queryKey: ['recent-engagement'],
    queryFn: () => base44.entities.ClientEngagementMetric.list('-created_date', 50),
    initialData: []
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments'],
    queryFn: async () => {
      const allComments = await base44.entities.ProposalComment.list('-created_date', 50);
      return allComments.filter(c => !c.is_resolved);
    },
    initialData: []
  });

  // Calculate stats for each action
  const stats = {
    proposals_due_soon: proposals.filter(p => {
      if (!p.due_date || !['draft', 'in_progress'].includes(p.status)) return false;
      const daysUntil = moment(p.due_date).diff(moment(), 'days');
      return daysUntil >= 0 && daysUntil <= 7;
    }).length,
    unread_notifications: notifications.length,
    tasks_today: tasks.filter(t => {
      if (t.status === 'completed' || !t.due_date) return false;
      return moment(t.due_date).isSame(moment(), 'day');
    }).length,
    active_clients: clients.filter(c => c.relationship_status === 'active').length,
    recent_views: engagementMetrics.filter(m => 
      m.event_type === 'page_view' && 
      moment(m.created_date).isAfter(moment().subtract(24, 'hours'))
    ).length,
    unresolved_comments: comments.length
  };

  const handleActionClick = (action) => {
    setSelectedAction(action);
    setShowSheet(true);
  };

  const getActionDetails = () => {
    if (!selectedAction) return { items: [], title: "" };

    switch (selectedAction.id) {
      case 'proposals_due_soon':
        const dueSoon = proposals.filter(p => {
          if (!p.due_date || !['draft', 'in_progress'].includes(p.status)) return false;
          const daysUntil = moment(p.due_date).diff(moment(), 'days');
          return daysUntil >= 0 && daysUntil <= 7;
        }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        return {
          title: "Proposals Due Soon",
          items: dueSoon.map(p => ({
            id: p.id,
            title: p.proposal_name,
            subtitle: `Due ${moment(p.due_date).fromNow()}`,
            badge: `${moment(p.due_date).diff(moment(), 'days')} days`,
            badgeColor: moment(p.due_date).diff(moment(), 'days') <= 3 ? 'red' : 'amber',
            onClick: () => navigate(createPageUrl(`ProposalBuilder?id=${p.id}`))
          }))
        };

      case 'unread_notifications':
        return {
          title: "Unread Notifications",
          items: notifications.slice(0, 10).map(n => ({
            id: n.id,
            title: n.title,
            subtitle: n.message,
            badge: moment(n.created_date).fromNow(),
            badgeColor: 'blue',
            onClick: () => {
              if (n.action_url) navigate(n.action_url);
            }
          }))
        };

      case 'tasks_today':
        const todayTasks = tasks.filter(t => {
          if (t.status === 'completed' || !t.due_date) return false;
          return moment(t.due_date).isSame(moment(), 'day');
        });
        return {
          title: "Tasks Due Today",
          items: todayTasks.map(t => ({
            id: t.id,
            title: t.title,
            subtitle: t.proposal_name,
            badge: t.priority,
            badgeColor: t.priority === 'urgent' ? 'red' : t.priority === 'high' ? 'orange' : 'blue',
            onClick: () => navigate(createPageUrl('Tasks'))
          }))
        };

      case 'active_clients':
        const activeClients = clients.filter(c => c.relationship_status === 'active');
        return {
          title: "Active Clients",
          items: activeClients.map(c => ({
            id: c.id,
            title: c.contact_name || c.client_name,
            subtitle: c.client_organization,
            badge: c.last_portal_access ? moment(c.last_portal_access).fromNow() : 'Never',
            badgeColor: 'green',
            onClick: () => navigate(createPageUrl('Clients'))
          }))
        };

      case 'recent_views':
        const recentViews = engagementMetrics
          .filter(m => m.event_type === 'page_view' && moment(m.created_date).isAfter(moment().subtract(24, 'hours')))
          .slice(0, 10);
        return {
          title: "Recent Client Views",
          items: recentViews.map(m => {
            const proposal = proposals.find(p => p.id === m.proposal_id);
            const client = clients.find(c => c.id === m.client_id);
            return {
              id: m.id,
              title: client?.contact_name || 'Unknown Client',
              subtitle: proposal?.proposal_name || 'Proposal',
              badge: moment(m.created_date).fromNow(),
              badgeColor: 'amber',
              onClick: () => {
                if (proposal) navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`));
              }
            };
          })
        };

      case 'unresolved_comments':
        return {
          title: "Unresolved Comments",
          items: comments.slice(0, 10).map(c => {
            const proposal = proposals.find(p => p.id === c.proposal_id);
            return {
              id: c.id,
              title: c.author_name,
              subtitle: c.content.substring(0, 50) + '...',
              badge: moment(c.created_date).fromNow(),
              badgeColor: 'indigo',
              onClick: () => {
                if (proposal) navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`));
              }
            };
          })
        };

      default:
        return { items: [], title: "" };
    }
  };

  const actionDetails = getActionDetails();

  return (
    <div className="md:hidden">
      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-50">
        <Button
          onClick={() => setShowSheet(true)}
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          size="icon"
        >
          <Zap className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Quick Actions Grid (Swipe Up) */}
      <Sheet open={showSheet} onOpenChange={setShowSheet}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Zap className="w-6 h-6 text-blue-600" />
              Quick Actions
            </SheetTitle>
            <SheetDescription>
              Handle urgent items on the go
            </SheetDescription>
          </SheetHeader>

          {!selectedAction ? (
            <ScrollArea className="h-[calc(85vh-120px)]">
              <div className="space-y-4">
                {/* Quick Action Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {QUICK_ACTIONS.map(action => {
                    const Icon = action.icon;
                    const count = stats[action.id];
                    const colorClasses = {
                      red: 'bg-red-100 text-red-700 border-red-300',
                      blue: 'bg-blue-100 text-blue-700 border-blue-300',
                      green: 'bg-green-100 text-green-700 border-green-300',
                      purple: 'bg-purple-100 text-purple-700 border-purple-300',
                      amber: 'bg-amber-100 text-amber-700 border-amber-300',
                      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300'
                    };

                    return (
                      <Card 
                        key={action.id}
                        className={cn(
                          "border-2 cursor-pointer active:scale-95 transition-transform",
                          colorClasses[action.color]
                        )}
                        onClick={() => handleActionClick(action)}
                      >
                        <CardContent className="p-4 text-center">
                          <Icon className="w-8 h-8 mx-auto mb-2" />
                          <p className="text-2xl font-bold mb-1">{count}</p>
                          <p className="text-xs font-medium">{action.label}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Navigation Shortcuts */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-700 px-2">Quick Navigation</h3>
                  {NAVIGATION_SHORTCUTS.map(shortcut => {
                    const Icon = shortcut.icon;
                    const colorClasses = {
                      blue: 'bg-blue-600',
                      purple: 'bg-purple-600',
                      green: 'bg-green-600',
                      red: 'bg-red-600',
                      amber: 'bg-amber-600',
                      indigo: 'bg-indigo-600'
                    };

                    return (
                      <button
                        key={shortcut.url}
                        onClick={() => {
                          navigate(createPageUrl(shortcut.url));
                          setShowSheet(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border-2 hover:border-blue-300 active:scale-95 transition-all"
                      >
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", colorClasses[shortcut.color])}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-medium text-slate-900">{shortcut.label}</span>
                        <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                      </button>
                    );
                  })}
                </div>

                {/* Quick Create */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-700 px-2">Quick Create</h3>
                  <button
                    onClick={() => {
                      navigate(createPageUrl('ProposalBuilder'));
                      setShowSheet(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg active:scale-95 transition-transform"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">New Proposal</span>
                    <ArrowRight className="w-5 h-5 ml-auto" />
                  </button>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-[calc(85vh-120px)] flex flex-col">
              {/* Back Button */}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedAction(null)}
                className="mb-3 self-start"
              >
                ← Back
              </Button>

              {/* Action Details */}
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {actionDetails.items.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <p className="text-sm">No items to show</p>
                    </div>
                  ) : (
                    actionDetails.items.map(item => {
                      const badgeColorClasses = {
                        red: 'bg-red-100 text-red-700',
                        amber: 'bg-amber-100 text-amber-700',
                        orange: 'bg-orange-100 text-orange-700',
                        blue: 'bg-blue-100 text-blue-700',
                        green: 'bg-green-100 text-green-700',
                        indigo: 'bg-indigo-100 text-indigo-700'
                      };

                      return (
                        <button
                          key={item.id}
                          onClick={item.onClick}
                          className="w-full p-3 bg-white rounded-lg border-2 hover:border-blue-300 active:scale-95 transition-all text-left"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 line-clamp-1 mb-1">
                                {item.title}
                              </h4>
                              <p className="text-sm text-slate-600 line-clamp-2">
                                {item.subtitle}
                              </p>
                            </div>
                            <Badge className={cn("ml-2 text-xs flex-shrink-0", badgeColorClasses[item.badgeColor])}>
                              {item.badge}
                            </Badge>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}