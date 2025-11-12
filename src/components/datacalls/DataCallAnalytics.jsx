import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { TrendingUp, Clock, CheckCircle2, Users, Award } from "lucide-react";
import moment from "moment";

export default function DataCallAnalytics({ organization }) {
  const { data: allDataCalls = [], isLoading } = useQuery({
    queryKey: ['data-call-analytics', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.DataCallRequest.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id
  });

  const metrics = React.useMemo(() => {
    const total = allDataCalls.length;
    const completed = allDataCalls.filter(dc => dc.overall_status === 'completed').length;
    const active = allDataCalls.filter(dc => !['completed'].includes(dc.overall_status)).length;
    const overdue = allDataCalls.filter(dc =>
      dc.due_date && 
      new Date(dc.due_date) < new Date() &&
      dc.overall_status !== 'completed'
    ).length;

    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

    // Average response time (days from sent to completed)
    const completedWithDates = allDataCalls.filter(dc => 
      dc.overall_status === 'completed' && dc.sent_date && dc.completed_date
    );
    
    const avgResponseTime = completedWithDates.length > 0
      ? completedWithDates.reduce((sum, dc) => {
          const days = moment(dc.completed_date).diff(moment(dc.sent_date), 'days');
          return sum + days;
        }, 0) / completedWithDates.length
      : 0;

    // By recipient type
    const byType = {
      client_organization: allDataCalls.filter(dc => dc.recipient_type === 'client_organization').length,
      internal_team_member: allDataCalls.filter(dc => dc.recipient_type === 'internal_team_member').length,
      teaming_partner: allDataCalls.filter(dc => dc.recipient_type === 'teaming_partner').length
    };

    return {
      total,
      completed,
      active,
      overdue,
      completionRate,
      avgResponseTime: Math.round(avgResponseTime),
      byType
    };
  }, [allDataCalls]);

  // Monthly trend
  const monthlyTrend = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const month = moment().subtract(i, 'months');
      const monthStart = month.startOf('month');
      const monthEnd = month.endOf('month');
      
      const created = allDataCalls.filter(dc =>
        moment(dc.created_date).isBetween(monthStart, monthEnd, null, '[]')
      ).length;
      
      const completed = allDataCalls.filter(dc =>
        dc.overall_status === 'completed' && 
        dc.completed_date &&
        moment(dc.completed_date).isBetween(monthStart, monthEnd, null, '[]')
      ).length;

      months.push({
        month: month.format('MMM'),
        created,
        completed
      });
    }
    return months;
  }, [allDataCalls]);

  const recipientTypeData = [
    { name: 'Client Orgs', value: metrics.byType.client_organization, color: '#3b82f6' },
    { name: 'Internal', value: metrics.byType.internal_team_member, color: '#8b5cf6' },
    { name: 'Partners', value: metrics.byType.teaming_partner, color: '#f59e0b' }
  ].filter(d => d.value > 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <TrendingUp className="w-7 h-7 text-blue-600" />
        Data Call Analytics
      </h2>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Requests</p>
                <p className="text-3xl font-bold text-slate-900">{metrics.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileQuestion className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Active</p>
                <p className="text-3xl font-bold text-blue-600">{metrics.active}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Completed</p>
                <p className="text-3xl font-bold text-green-600">{metrics.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Avg Response</p>
                <p className="text-3xl font-bold text-purple-600">{metrics.avgResponseTime}</p>
                <p className="text-xs text-slate-500">days</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Completion</p>
                <p className="text-3xl font-bold text-green-600">{metrics.completionRate}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Monthly Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="created" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Created"
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Completed"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>By Recipient Type</CardTitle>
          </CardHeader>
          <CardContent>
            {recipientTypeData.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={recipientTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => 
                      `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    dataKey="value"
                  >
                    {recipientTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}