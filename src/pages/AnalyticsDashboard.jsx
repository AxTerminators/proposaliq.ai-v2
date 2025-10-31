import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Activity,
  Users,
  TrendingUp,
  Zap,
  Clock,
  Target,
  Sparkles,
  Download,
  RefreshCw,
  Filter,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString()
  });

  // Update date range when time range changes
  useEffect(() => {
    const now = new Date();
    let start;
    switch (timeRange) {
      case '7d':
        start = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now - 30 * 24 * 60 * 60 * 1000);
    }
    setDateRange({ start: start.toISOString(), end: now.toISOString() });
  }, [timeRange]);

  // Fetch activity logs
  const { data: activityLogs = [], refetch, isLoading } = useQuery({
    queryKey: ['analytics-activity', dateRange],
    queryFn: async () => {
      const logs = await base44.entities.ActivityLog.list('-created_date', 1000);
      return logs.filter(log => {
        if (!log.created_date) return false;
        const logDate = new Date(log.created_date);
        return logDate >= new Date(dateRange.start) && logDate <= new Date(dateRange.end);
      });
    },
    staleTime: 60000 // Cache for 1 minute
  });

  const handleRefresh = async () => {
    setLoading(true);
    await refetch();
    setTimeout(() => setLoading(false), 500);
  };

  // Calculate overview stats
  const stats = {
    totalEvents: activityLogs.length,
    uniqueUsers: new Set(activityLogs.map(l => l.user_email).filter(Boolean)).size,
    aiOperations: activityLogs.filter(l => 
      l.action_type?.includes('ai_') || 
      l.action_type?.includes('section_generated')
    ).length,
    avgEventsPerUser: 0
  };
  stats.avgEventsPerUser = stats.uniqueUsers > 0 
    ? Math.round(stats.totalEvents / stats.uniqueUsers) 
    : 0;

  // Events by type
  const eventsByType = activityLogs.reduce((acc, log) => {
    const type = log.action_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const topEvents = Object.entries(eventsByType)
    .map(([name, value]) => ({ 
      name: name.replace(/_/g, ' ').substring(0, 30), 
      value 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Events over time (daily)
  const dailyEvents = activityLogs.reduce((acc, log) => {
    if (!log.created_date) return acc;
    const date = new Date(log.created_date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, total: 0, ai_operations: 0, proposals: 0 };
    }
    acc[date].total++;
    if (log.action_type?.includes('ai_') || log.action_type?.includes('section_generated')) {
      acc[date].ai_operations++;
    }
    if (log.action_type?.includes('proposal')) {
      acc[date].proposals++;
    }
    return acc;
  }, {});

  const timelineData = Object.values(dailyEvents)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30);

  // Active users over time
  const dailyUsers = activityLogs.reduce((acc, log) => {
    if (!log.created_date || !log.user_email) return acc;
    const date = new Date(log.created_date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, users: new Set() };
    }
    acc[date].users.add(log.user_email);
    return acc;
  }, {});

  const userTimelineData = Object.entries(dailyUsers)
    .map(([date, data]) => ({ date, count: data.users.size }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30);

  // Top users
  const userActivity = activityLogs.reduce((acc, log) => {
    if (!log.user_email) return acc;
    if (!acc[log.user_email]) {
      acc[log.user_email] = { 
        email: log.user_email, 
        name: log.user_name || log.user_email,
        count: 0,
        lastActive: log.created_date
      };
    }
    acc[log.user_email].count++;
    if (new Date(log.created_date) > new Date(acc[log.user_email].lastActive)) {
      acc[log.user_email].lastActive = log.created_date;
    }
    return acc;
  }, {});

  const topUsers = Object.values(userActivity)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Feature adoption
  const featureUsage = activityLogs.reduce((acc, log) => {
    const metadata = log.metadata ? (typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata) : {};
    const feature = metadata.feature_name || log.action_type;
    if (feature) {
      acc[feature] = (acc[feature] || 0) + 1;
    }
    return acc;
  }, {});

  const featureData = Object.entries(featureUsage)
    .map(([name, value]) => ({ 
      name: name.replace(/_/g, ' ').substring(0, 25), 
      value 
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="text-slate-600 mt-1">User behavior, feature adoption, and platform insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={loading || isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", (loading || isLoading) && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-4xl font-bold">{stats.totalEvents.toLocaleString()}</p>
            <p className="text-sm opacity-90 mt-1">Total Events</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-4xl font-bold">{stats.uniqueUsers}</p>
            <p className="text-sm opacity-90 mt-1">Active Users</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Sparkles className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-4xl font-bold">{stats.aiOperations}</p>
            <p className="text-sm opacity-90 mt-1">AI Operations</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-4xl font-bold">{stats.avgEventsPerUser}</p>
            <p className="text-sm opacity-90 mt-1">Avg Events/User</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Activity Timeline */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Activity Over Time</CardTitle>
                <CardDescription>Daily event count</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorTotal)"
                      name="Total Events"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Daily Active Users</CardTitle>
                <CardDescription>Unique users per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="Active Users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Events */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Most Frequent Events</CardTitle>
              <CardDescription>Top 10 actions in your app</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topEvents} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Most Active Users</CardTitle>
              <CardDescription>Top 10 users by activity count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topUsers.map((user, idx) => (
                  <div key={user.email} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{user.count}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(user.lastActive).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Feature Adoption</CardTitle>
                <CardDescription>Usage distribution across features</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={featureData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {featureData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Feature Usage Count</CardTitle>
                <CardDescription>Total interactions per feature</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Recent Events</CardTitle>
              <CardDescription>Last 50 events in your app</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {activityLogs.slice(0, 50).map((log, idx) => (
                  <div key={log.id || idx} className="p-3 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {log.action_type?.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {new Date(log.created_date).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-900">{log.action_description}</p>
                        {log.user_name && (
                          <p className="text-xs text-slate-500 mt-1">
                            by {log.user_name} ({log.user_email})
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}