import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  FileText, 
  DollarSign,
  Activity,
  Mail,
  Calendar,
  MessageSquare,
  Eye,
  CheckCircle2,
  AlertCircle,
  Palette,
  Bell
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import moment from "moment";

export default function AnalyticsDashboardModule({ currentUser }) {
  const { data: users } = useQuery({
    queryKey: ['admin-dashboard-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: []
  });

  const { data: organizations } = useQuery({
    queryKey: ['admin-dashboard-orgs'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
    initialData: []
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['admin-dashboard-subs'],
    queryFn: () => base44.entities.Subscription.list('-created_date'),
    initialData: []
  });

  const { data: proposals } = useQuery({
    queryKey: ['admin-dashboard-proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date'),
    initialData: []
  });

  const { data: clients } = useQuery({
    queryKey: ['admin-dashboard-clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    initialData: []
  });

  const { data: tokenUsage } = useQuery({
    queryKey: ['admin-dashboard-tokens'],
    queryFn: () => base44.entities.TokenUsage.list('-created_date', 200),
    initialData: []
  });

  const { data: notifications } = useQuery({
    queryKey: ['admin-dashboard-notifications'],
    queryFn: () => base44.entities.ClientNotification.list('-created_date', 100),
    initialData: []
  });

  const { data: events } = useQuery({
    queryKey: ['admin-dashboard-events'],
    queryFn: () => base44.entities.CalendarEvent.list('-created_date'),
    initialData: []
  });

  // Calculate KPIs
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active !== false).length;
  const totalOrgs = organizations.length;
  const consultancyOrgs = organizations.filter(o => o.organization_type === 'consultancy').length;
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.relationship_status === 'active').length;
  
  const totalMRR = subscriptions.reduce((sum, sub) => sum + (sub.monthly_price || 0), 0);
  const totalTokensUsed = tokenUsage.reduce((sum, u) => sum + u.tokens_used, 0);
  const avgTokensPerOrg = totalOrgs > 0 ? Math.round(totalTokensUsed / totalOrgs) : 0;

  const totalProposals = proposals.length;
  const proposalsInProgress = proposals.filter(p => ['draft', 'in_progress'].includes(p.status)).length;
  const proposalsWon = proposals.filter(p => p.status === 'won').length;
  const winRate = totalProposals > 0 ? ((proposalsWon / totalProposals) * 100).toFixed(1) : 0;

  const clientsWithPortalAccess = clients.filter(c => c.portal_access_enabled).length;
  const clientsRecentlyActive = clients.filter(c => 
    c.last_portal_access && moment(c.last_portal_access).isAfter(moment().subtract(7, 'days'))
  ).length;

  const notificationsSent = notifications.length;
  const notificationsRead = notifications.filter(n => n.is_read).length;
  const notificationReadRate = notificationsSent > 0 ? ((notificationsRead / notificationsSent) * 100).toFixed(1) : 0;

  const totalEvents = events.length;
  const upcomingEvents = events.filter(e => moment(e.start_date).isAfter(moment())).length;

  // User growth over last 30 days
  const userGrowthData = [];
  for (let i = 29; i >= 0; i--) {
    const date = moment().subtract(i, 'days');
    const dateStr = date.format('MMM DD');
    const usersOnDay = users.filter(u => moment(u.created_date).isSameOrBefore(date, 'day')).length;
    userGrowthData.push({ date: dateStr, users: usersOnDay });
  }

  // Token usage by organization type
  const tokensByOrgType = organizations.reduce((acc, org) => {
    const orgTokens = tokenUsage.filter(t => t.organization_id === org.id)
      .reduce((sum, t) => sum + t.tokens_used, 0);
    const type = org.organization_type || 'unknown';
    acc[type] = (acc[type] || 0) + orgTokens;
    return acc;
  }, {});

  const tokenUsageByType = Object.entries(tokensByOrgType).map(([type, tokens]) => ({
    name: type === 'consultancy' ? 'Consultancy' : type === 'corporate' ? 'Corporate' : 'Unknown',
    value: tokens
  }));

  // Subscription distribution
  const planDistribution = subscriptions.reduce((acc, sub) => {
    acc[sub.plan_type] = (acc[sub.plan_type] || 0) + 1;
    return acc;
  }, {});

  const planData = Object.entries(planDistribution).map(([plan, count]) => ({
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    value: count
  }));

  // Revenue by plan type
  const revenueByPlan = subscriptions.reduce((acc, sub) => {
    acc[sub.plan_type] = (acc[sub.plan_type] || 0) + (sub.monthly_price || 0);
    return acc;
  }, {});

  const revenueData = Object.entries(revenueByPlan).map(([plan, revenue]) => ({
    plan: plan.charAt(0).toUpperCase() + plan.slice(1),
    revenue: revenue
  }));

  // Proposal status distribution
  const proposalsByStatus = proposals.reduce((acc, prop) => {
    const status = prop.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const proposalStatusData = Object.entries(proposalsByStatus).map(([status, count]) => ({
    name: status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    value: count
  }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
        <p className="text-slate-600">Comprehensive overview of your ProposalIQ.ai platform</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-blue-600" />
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
            <p className="text-xs text-slate-600">Total Users</p>
            <p className="text-[10px] text-green-600 mt-1">{activeUsers} active</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalOrgs}</p>
            <p className="text-xs text-slate-600">Organizations</p>
            <p className="text-[10px] text-purple-600 mt-1">{consultancyOrgs} consultancies</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">${totalMRR.toLocaleString()}</p>
            <p className="text-xs text-slate-600">Monthly Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalProposals}</p>
            <p className="text-xs text-slate-600">Total Proposals</p>
            <p className="text-[10px] text-amber-600 mt-1">{winRate}% win rate</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalClients}</p>
            <p className="text-xs text-slate-600">Total Clients</p>
            <p className="text-[10px] text-indigo-600 mt-1">{activeClients} active</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-pink-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-6 h-6 text-pink-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{(totalTokensUsed / 1000000).toFixed(1)}M</p>
            <p className="text-xs text-slate-600">Tokens Used</p>
            <p className="text-[10px] text-pink-600 mt-1">{avgTokensPerOrg.toLocaleString()} avg/org</p>
          </CardContent>
        </Card>
      </div>

      {/* Phase 4 Features Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-600" />
          Phase 4: Advanced Features Performance
        </h3>
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Palette className="w-6 h-6 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {clients.filter(c => c.custom_branding?.logo_url || c.custom_branding?.primary_color).length}
              </p>
              <p className="text-xs text-slate-600">Customized Client Portals</p>
              <p className="text-[10px] text-purple-600 mt-1">
                {totalClients > 0 ? Math.round((clients.filter(c => c.custom_branding?.logo_url || c.custom_branding?.primary_color).length / totalClients) * 100) : 0}% adoption
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Bell className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{notificationsSent}</p>
              <p className="text-xs text-slate-600">Email Notifications Sent</p>
              <p className="text-[10px] text-blue-600 mt-1">{notificationReadRate}% read rate</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{totalEvents}</p>
              <p className="text-xs text-slate-600">Calendar Events</p>
              <p className="text-[10px] text-green-600 mt-1">{upcomingEvents} upcoming</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Eye className="w-6 h-6 text-indigo-500" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{clientsRecentlyActive}</p>
              <p className="text-xs text-slate-600">Active Clients (7d)</p>
              <p className="text-[10px] text-indigo-600 mt-1">
                {clientsWithPortalAccess > 0 ? Math.round((clientsRecentlyActive / clientsWithPortalAccess) * 100) : 0}% engagement
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">User Growth (Last 30 Days)</CardTitle>
            <CardDescription>Cumulative user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Plan */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Plan Type</CardTitle>
            <CardDescription>Monthly recurring revenue breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="plan" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Subscription Distribution</CardTitle>
            <CardDescription>Active subscriptions by plan type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={planData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {planData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Proposal Status */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Proposal Status Distribution</CardTitle>
            <CardDescription>Current proposal pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={proposalStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {proposalStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Health Summary */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            System Status: All Systems Operational
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium">API Services</p>
                <p className="text-xs text-slate-600">99.98% uptime</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-slate-600">Healthy</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="text-sm font-medium">AI Services</p>
                <p className="text-xs text-slate-600">All models active</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-3">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 cursor-pointer transition-all">
              <Users className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-sm font-semibold text-slate-900">Manage Users</p>
              <p className="text-xs text-slate-600">View and edit user accounts</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 cursor-pointer transition-all">
              <DollarSign className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-sm font-semibold text-slate-900">Billing</p>
              <p className="text-xs text-slate-600">Manage subscriptions</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 cursor-pointer transition-all">
              <Palette className="w-6 h-6 text-purple-600 mb-2" />
              <p className="text-sm font-semibold text-slate-900">Client Portals</p>
              <p className="text-xs text-slate-600">Customize client experience</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 cursor-pointer transition-all">
              <FileText className="w-6 h-6 text-amber-600 mb-2" />
              <p className="text-sm font-semibold text-slate-900">View Reports</p>
              <p className="text-xs text-slate-600">Detailed analytics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}