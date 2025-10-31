import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  ResponsiveContainer
} from 'recharts';
import {
  AlertCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Calendar,
  Filter,
  Search,
  Download,
  Check,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', chart: '#ef4444' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', chart: '#f97316' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', chart: '#f59e0b' },
  low: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', chart: '#3b82f6' }
};

export default function ErrorMonitoringDashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString()
  });

  useEffect(() => {
    const now = new Date();
    let start;
    switch (timeRange) {
      case '24h':
        start = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
    setDateRange({ start: start.toISOString(), end: now.toISOString() });
  }, [timeRange]);

  const { data: errorLogs = [], refetch, isLoading } = useQuery({
    queryKey: ['error-logs', dateRange],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.filter({
        action_type: 'error_occurred'
      }, '-created_date', 500);
      
      return logs.filter(log => {
        if (!log.created_date) return false;
        const logDate = new Date(log.created_date);
        return logDate >= new Date(dateRange.start) && logDate <= new Date(dateRange.end);
      });
    },
    staleTime: 30000
  });

  const handleRefresh = async () => {
    setLoading(true);
    await refetch();
    setTimeout(() => setLoading(false), 500);
  };

  // Parse error details
  const parsedErrors = errorLogs.map(log => {
    try {
      const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      return {
        ...log,
        parsedDetails: details,
        severity: details?.severity || 'medium',
        errorType: details?.error_type || 'Error',
        errorMessage: details?.error_message || 'Unknown error'
      };
    } catch (e) {
      return {
        ...log,
        parsedDetails: {},
        severity: 'medium',
        errorType: 'Error',
        errorMessage: 'Parse error'
      };
    }
  });

  // Filter errors
  const filteredErrors = parsedErrors.filter(error => {
    const matchesSearch = !searchQuery || 
      error.errorMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.target_entity?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      error.errorType?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = severityFilter === 'all' || error.severity === severityFilter;
    
    return matchesSearch && matchesSeverity;
  });

  // Calculate stats
  const stats = {
    total: parsedErrors.length,
    critical: parsedErrors.filter(e => e.severity === 'critical').length,
    high: parsedErrors.filter(e => e.severity === 'high').length,
    medium: parsedErrors.filter(e => e.severity === 'medium').length,
    low: parsedErrors.filter(e => e.severity === 'low').length
  };

  // Errors by severity
  const severityData = [
    { name: 'Critical', value: stats.critical, color: SEVERITY_COLORS.critical.chart },
    { name: 'High', value: stats.high, color: SEVERITY_COLORS.high.chart },
    { name: 'Medium', value: stats.medium, color: SEVERITY_COLORS.medium.chart },
    { name: 'Low', value: stats.low, color: SEVERITY_COLORS.low.chart }
  ].filter(d => d.value > 0);

  // Errors over time
  const dailyErrors = parsedErrors.reduce((acc, error) => {
    if (!error.created_date) return acc;
    const date = new Date(error.created_date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { date, total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    }
    acc[date].total++;
    acc[date][error.severity]++;
    return acc;
  }, {});

  const timelineData = Object.values(dailyErrors)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Errors by type
  const errorsByType = parsedErrors.reduce((acc, error) => {
    const type = error.errorType || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const errorTypeData = Object.entries(errorsByType)
    .map(([name, value]) => ({ name: name.substring(0, 30), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Errors by user
  const errorsByUser = parsedErrors.reduce((acc, error) => {
    const user = error.target_entity || 'Anonymous';
    if (!acc[user]) {
      acc[user] = { user, count: 0, critical: 0 };
    }
    acc[user].count++;
    if (error.severity === 'critical') acc[user].critical++;
    return acc;
  }, {});

  const topAffectedUsers = Object.values(errorsByUser)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-red-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-600" />
            Error Monitoring
          </h1>
          <p className="text-slate-600 mt-1">Track, analyze, and resolve application errors</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-sm text-slate-600 mt-1">Total Errors</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <XCircle className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{stats.critical}</p>
            <p className="text-sm opacity-90 mt-1">Critical</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{stats.high}</p>
            <p className="text-sm opacity-90 mt-1">High Priority</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{stats.medium}</p>
            <p className="text-sm opacity-90 mt-1">Medium</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-6 h-6 opacity-80" />
            </div>
            <p className="text-3xl font-bold">{stats.low}</p>
            <p className="text-sm opacity-90 mt-1">Low Priority</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="errors">Error List</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Errors Over Time */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Errors Over Time</CardTitle>
                <CardDescription>Daily error count by severity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="critical" stroke="#ef4444" name="Critical" />
                    <Line type="monotone" dataKey="high" stroke="#f97316" name="High" />
                    <Line type="monotone" dataKey="medium" stroke="#f59e0b" name="Medium" />
                    <Line type="monotone" dataKey="low" stroke="#3b82f6" name="Low" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Errors by Severity */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Errors by Severity</CardTitle>
                <CardDescription>Distribution of error severity levels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Most Common Errors */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Most Common Error Types</CardTitle>
              <CardDescription>Top 10 error types by frequency</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={errorTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Error List Tab */}
        <TabsContent value="errors" className="space-y-6">
          {/* Filters */}
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search errors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Error List */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Error Details</CardTitle>
              <CardDescription>{filteredErrors.length} errors found</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredErrors.map((error, idx) => {
                  const colors = SEVERITY_COLORS[error.severity];
                  return (
                    <div key={error.id || idx} className={cn("p-4 rounded-lg border-2", colors.border, colors.bg)}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={cn(colors.bg, colors.text, "border", colors.border)}>
                            {error.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {error.errorType}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(error.created_date).toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="font-medium text-slate-900 mb-2">{error.errorMessage}</p>
                      
                      {error.target_entity && (
                        <p className="text-sm text-slate-600 mb-2">
                          <strong>User:</strong> {error.target_entity}
                        </p>
                      )}
                      
                      {error.parsedDetails?.context && (
                        <details className="mt-2">
                          <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-900">
                            View Details
                          </summary>
                          <pre className="mt-2 p-3 bg-white rounded text-xs overflow-x-auto">
                            {JSON.stringify(error.parsedDetails.context, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          {/* Most Affected Users */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Most Affected Users</CardTitle>
              <CardDescription>Users experiencing the most errors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topAffectedUsers.map((userData, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{userData.user}</p>
                        {userData.critical > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {userData.critical} critical
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{userData.count}</p>
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