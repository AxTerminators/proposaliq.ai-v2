import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { 
  TrendingUp, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  Target
} from "lucide-react";
import moment from "moment";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function EnhancedDataCallAnalytics({ organization }) {
  const { data: dataCalls = [], isLoading } = useQuery({
    queryKey: ['data-calls-analytics', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.DataCallRequest.filter({
        organization_id: organization.id
      });
    },
    enabled: !!organization?.id
  });

  // Calculate response time metrics
  const responseMetrics = React.useMemo(() => {
    const completed = dataCalls.filter(dc => dc.overall_status === 'completed');
    
    const responseTimes = completed
      .filter(dc => dc.sent_date && dc.completed_date)
      .map(dc => {
        const sent = new Date(dc.sent_date);
        const completed = new Date(dc.completed_date);
        const days = Math.floor((completed - sent) / (1000 * 60 * 60 * 24));
        return {
          id: dc.id,
          title: dc.request_title,
          days,
          recipient: dc.assigned_to_name || dc.assigned_to_email
        };
      });

    const avgResponseTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((sum, rt) => sum + rt.days, 0) / responseTimes.length)
      : 0;

    return { responseTimes, avgResponseTime };
  }, [dataCalls]);

  // Response time by recipient
  const recipientPerformance = React.useMemo(() => {
    const byRecipient = {};
    
    responseMetrics.responseTimes.forEach(rt => {
      if (!byRecipient[rt.recipient]) {
        byRecipient[rt.recipient] = { total: 0, count: 0 };
      }
      byRecipient[rt.recipient].total += rt.days;
      byRecipient[rt.recipient].count += 1;
    });

    return Object.entries(byRecipient).map(([recipient, data]) => ({
      recipient: recipient || 'Unknown',
      avgDays: Math.round(data.total / data.count),
      count: data.count
    })).sort((a, b) => a.avgDays - b.avgDays);
  }, [responseMetrics]);

  // Status distribution
  const statusDistribution = React.useMemo(() => {
    const distribution = {};
    dataCalls.forEach(dc => {
      const status = dc.overall_status || 'unknown';
      distribution[status] = (distribution[status] || 0) + 1;
    });

    return Object.entries(distribution).map(([status, count]) => ({
      name: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count
    }));
  }, [dataCalls]);

  // Completion rate over time (last 6 weeks)
  const completionTrend = React.useMemo(() => {
    const weeks = [];
    for (let i = 5; i >= 0; i--) {
      const weekStart = moment().subtract(i, 'weeks').startOf('week');
      const weekEnd = moment().subtract(i, 'weeks').endOf('week');
      
      const sent = dataCalls.filter(dc => 
        dc.sent_date && 
        moment(dc.sent_date).isBetween(weekStart, weekEnd, null, '[]')
      ).length;

      const completed = dataCalls.filter(dc => 
        dc.completed_date && 
        moment(dc.completed_date).isBetween(weekStart, weekEnd, null, '[]')
      ).length;

      weeks.push({
        week: weekStart.format('MMM D'),
        sent,
        completed
      });
    }
    return weeks;
  }, [dataCalls]);

  // Bottleneck analysis
  const bottlenecks = React.useMemo(() => {
    const overdue = dataCalls.filter(dc => 
      dc.due_date && 
      new Date(dc.due_date) < new Date() && 
      dc.overall_status !== 'completed'
    );

    const slowRecipients = recipientPerformance
      .filter(r => r.avgDays > responseMetrics.avgResponseTime)
      .slice(0, 3);

    return { overdue, slowRecipients };
  }, [dataCalls, recipientPerformance, responseMetrics]);

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Response Time</p>
                <p className="text-3xl font-bold text-blue-600">
                  {responseMetrics.avgResponseTime}
                  <span className="text-lg text-slate-500 ml-1">days</span>
                </p>
              </div>
              <Clock className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Completion Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {dataCalls.length > 0 
                    ? Math.round((dataCalls.filter(dc => dc.overall_status === 'completed').length / dataCalls.length) * 100)
                    : 0}%
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Recipients</p>
                <p className="text-3xl font-bold text-purple-600">
                  {new Set(dataCalls.map(dc => dc.assigned_to_email)).size}
                </p>
              </div>
              <Users className="w-10 h-10 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Overdue Items</p>
                <p className="text-3xl font-bold text-red-600">
                  {bottlenecks.overdue.length}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Completion Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completion Trend (6 Weeks)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sent" stroke="#3B82F6" name="Sent" />
                <Line type="monotone" dataKey="completed" stroke="#10B981" name="Completed" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recipient Performance */}
      {recipientPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Response Time by Recipient</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={recipientPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="recipient" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgDays" fill="#3B82F6" name="Avg Days" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Bottlenecks */}
      {(bottlenecks.overdue.length > 0 || bottlenecks.slowRecipients.length > 0) && (
        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Identified Bottlenecks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bottlenecks.overdue.length > 0 && (
              <div>
                <p className="font-semibold text-sm text-slate-900 mb-2">
                  ⏰ {bottlenecks.overdue.length} Overdue Data Calls
                </p>
                <div className="space-y-1">
                  {bottlenecks.overdue.slice(0, 3).map(dc => (
                    <p key={dc.id} className="text-sm text-slate-700">
                      • {dc.request_title} - {moment(dc.due_date).fromNow()}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {bottlenecks.slowRecipients.length > 0 && (
              <div>
                <p className="font-semibold text-sm text-slate-900 mb-2">
                  🐌 Slower Than Average Recipients
                </p>
                <div className="space-y-1">
                  {bottlenecks.slowRecipients.map(r => (
                    <p key={r.recipient} className="text-sm text-slate-700">
                      • {r.recipient} - {r.avgDays} days avg ({r.count} requests)
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}