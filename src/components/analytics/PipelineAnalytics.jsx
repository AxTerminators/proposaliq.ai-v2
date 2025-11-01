import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  AlertTriangle,
  Target,
  Zap,
  BarChart3,
  Download,
  Calendar,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

export default function PipelineAnalytics({ organization, proposals = [] }) {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('lead_time');

  // Fetch metric snapshots
  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
    queryKey: ['pipeline-snapshots', organization?.id, timeRange],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const daysBack = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = moment().subtract(daysBack, 'days').toISOString();
      
      const allSnapshots = await base44.entities.ProposalMetricSnapshot.filter(
        { organization_id: organization.id },
        '-snapshot_date',
        1000
      );

      return allSnapshots.filter(s => moment(s.snapshot_date).isAfter(startDate));
    },
    enabled: !!organization?.id,
    initialData: []
  });

  // Calculate lead time and cycle time
  const leadTimeData = useMemo(() => {
    const proposalMetrics = proposals.map(p => {
      const proposalSnapshots = snapshots
        .filter(s => s.proposal_id === p.id)
        .sort((a, b) => moment(a.snapshot_date).diff(moment(b.snapshot_date)));

      if (proposalSnapshots.length === 0) return null;

      const firstSnapshot = proposalSnapshots[0];
      const lastSnapshot = proposalSnapshots[proposalSnapshots.length - 1];

      const leadTime = moment(lastSnapshot.snapshot_date).diff(moment(firstSnapshot.snapshot_date), 'days');
      
      // Calculate cycle time (time in active stages)
      const activeStages = ['in_progress', 'submitted'];
      const activeSnapshots = proposalSnapshots.filter(s => activeStages.includes(s.status));
      const cycleTime = activeSnapshots.length > 0
        ? moment(activeSnapshots[activeSnapshots.length - 1].snapshot_date).diff(
            moment(activeSnapshots[0].snapshot_date),
            'days'
          )
        : 0;

      return {
        proposalName: p.proposal_name,
        status: p.status,
        leadTime,
        cycleTime,
        createdDate: p.created_date
      };
    }).filter(Boolean);

    // Group by status
    const byStatus = {};
    proposalMetrics.forEach(m => {
      if (!byStatus[m.status]) {
        byStatus[m.status] = { totalLeadTime: 0, totalCycleTime: 0, count: 0 };
      }
      byStatus[m.status].totalLeadTime += m.leadTime;
      byStatus[m.status].totalCycleTime += m.cycleTime;
      byStatus[m.status].count += 1;
    });

    return Object.entries(byStatus).map(([status, data]) => ({
      status: status.replace('_', ' ').toUpperCase(),
      avgLeadTime: data.count > 0 ? Math.round(data.totalLeadTime / data.count) : 0,
      avgCycleTime: data.count > 0 ? Math.round(data.totalCycleTime / data.count) : 0,
      count: data.count
    }));
  }, [proposals, snapshots]);

  // Calculate stage duration metrics
  const stageDurationData = useMemo(() => {
    const stageMetrics = {};

    snapshots.forEach(snapshot => {
      const stage = snapshot.stage || 'unknown';
      if (!stageMetrics[stage]) {
        stageMetrics[stage] = { totalTime: 0, count: 0, proposals: new Set() };
      }
      stageMetrics[stage].totalTime += snapshot.time_in_current_stage_hours || 0;
      stageMetrics[stage].count += 1;
      stageMetrics[stage].proposals.add(snapshot.proposal_id);
    });

    return Object.entries(stageMetrics).map(([stage, data]) => ({
      stage: stage.replace('_', ' ').toUpperCase(),
      avgHours: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      avgDays: data.count > 0 ? Math.round((data.totalTime / data.count) / 24) : 0,
      proposalCount: data.proposals.size
    })).sort((a, b) => b.avgHours - a.avgHours);
  }, [snapshots]);

  // Calculate cumulative flow diagram data
  const cumulativeFlowData = useMemo(() => {
    const dateGroups = {};

    snapshots.forEach(snapshot => {
      const date = moment(snapshot.snapshot_date).format('YYYY-MM-DD');
      if (!dateGroups[date]) {
        dateGroups[date] = {};
      }

      const stage = snapshot.stage || 'unknown';
      dateGroups[date][stage] = (dateGroups[date][stage] || 0) + 1;
    });

    const sortedDates = Object.keys(dateGroups).sort();
    const cumulativeData = {};
    const stages = new Set();

    sortedDates.forEach(date => {
      Object.keys(dateGroups[date]).forEach(stage => stages.add(stage));
    });

    // Build cumulative counts
    const cumulative = {};
    Array.from(stages).forEach(stage => { cumulative[stage] = 0; });

    return sortedDates.map(date => {
      const dataPoint = { date: moment(date).format('MMM D') };
      
      Array.from(stages).forEach(stage => {
        cumulative[stage] += dateGroups[date][stage] || 0;
        dataPoint[stage] = cumulative[stage];
      });

      return dataPoint;
    });
  }, [snapshots]);

  // Bottleneck detection
  const bottlenecks = useMemo(() => {
    const stageBottlenecks = stageDurationData
      .filter(s => s.avgDays > 7) // More than 7 days average
      .map(s => ({
        stage: s.stage,
        avgDays: s.avgDays,
        severity: s.avgDays > 30 ? 'critical' : s.avgDays > 14 ? 'high' : 'medium',
        proposalCount: s.proposalCount,
        recommendation: s.avgDays > 30 
          ? 'Critical bottleneck - immediate attention needed'
          : s.avgDays > 14
          ? 'Significant delay - review process improvements'
          : 'Monitor for trends'
      }));

    return stageBottlenecks;
  }, [stageDurationData]);

  // Velocity and throughput
  const velocityData = useMemo(() => {
    const weeklyData = {};

    proposals.forEach(p => {
      if (!p.created_date) return;
      
      const week = moment(p.created_date).startOf('week').format('YYYY-MM-DD');
      if (!weeklyData[week]) {
        weeklyData[week] = { created: 0, completed: 0 };
      }
      weeklyData[week].created += 1;

      if (['won', 'lost'].includes(p.status) && p.updated_date) {
        const completedWeek = moment(p.updated_date).startOf('week').format('YYYY-MM-DD');
        if (!weeklyData[completedWeek]) {
          weeklyData[completedWeek] = { created: 0, completed: 0 };
        }
        weeklyData[completedWeek].completed += 1;
      }
    });

    return Object.entries(weeklyData)
      .sort(([a], [b]) => moment(a).diff(moment(b)))
      .slice(-12) // Last 12 weeks
      .map(([week, data]) => ({
        week: moment(week).format('MMM D'),
        created: data.created,
        completed: data.completed,
        delta: data.created - data.completed
      }));
  }, [proposals]);

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    const avgLeadTime = leadTimeData.reduce((sum, d) => sum + d.avgLeadTime, 0) / (leadTimeData.length || 1);
    const avgCycleTime = leadTimeData.reduce((sum, d) => sum + d.avgCycleTime, 0) / (leadTimeData.length || 1);
    
    const lastWeekCreated = velocityData.slice(-1)[0]?.created || 0;
    const lastWeekCompleted = velocityData.slice(-1)[0]?.completed || 0;

    const totalBottlenecks = bottlenecks.length;
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical').length;

    return {
      avgLeadTime: Math.round(avgLeadTime),
      avgCycleTime: Math.round(avgCycleTime),
      weeklyThroughput: lastWeekCompleted,
      weeklyIntake: lastWeekCreated,
      totalBottlenecks,
      criticalBottlenecks
    };
  }, [leadTimeData, velocityData, bottlenecks]);

  if (snapshotsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Pipeline Analytics
          </h2>
          <p className="text-slate-600 mt-1">Advanced metrics and insights for your proposal pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-blue-600" />
              <TrendingDown className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{keyMetrics.avgLeadTime}d</div>
            <div className="text-sm text-slate-600 mt-1">Avg Lead Time</div>
            <div className="text-xs text-slate-500 mt-2">Time from start to finish</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{keyMetrics.avgCycleTime}d</div>
            <div className="text-sm text-slate-600 mt-1">Avg Cycle Time</div>
            <div className="text-xs text-slate-500 mt-2">Time in active stages</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8 text-green-600" />
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">{keyMetrics.weeklyThroughput}</div>
            <div className="text-sm text-slate-600 mt-1">Weekly Throughput</div>
            <div className="text-xs text-slate-500 mt-2">Proposals completed last week</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-3xl font-bold text-slate-900">
              {keyMetrics.totalBottlenecks}
              {keyMetrics.criticalBottlenecks > 0 && (
                <Badge className="ml-2 bg-red-100 text-red-700 text-xs">
                  {keyMetrics.criticalBottlenecks} critical
                </Badge>
              )}
            </div>
            <div className="text-sm text-slate-600 mt-1">Bottlenecks Detected</div>
            <div className="text-xs text-slate-500 mt-2">Stages with delays</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="lead-time" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="lead-time">Lead & Cycle Time</TabsTrigger>
          <TabsTrigger value="stage-duration">Stage Duration</TabsTrigger>
          <TabsTrigger value="cumulative-flow">Cumulative Flow</TabsTrigger>
          <TabsTrigger value="velocity">Velocity</TabsTrigger>
        </TabsList>

        <TabsContent value="lead-time">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Lead Time vs Cycle Time by Status</CardTitle>
              <CardDescription>
                Lead time measures total time from start to finish. Cycle time measures time in active work.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={leadTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgLeadTime" fill="#3b82f6" name="Avg Lead Time (days)" />
                  <Bar dataKey="avgCycleTime" fill="#8b5cf6" name="Avg Cycle Time (days)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stage-duration">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Average Time in Each Stage</CardTitle>
              <CardDescription>
                Identify which stages take the longest and may need process improvements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={stageDurationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                  <YAxis type="category" dataKey="stage" width={120} />
                  <Tooltip />
                  <Bar dataKey="avgDays" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>

              {/* Bottlenecks Alert */}
              {bottlenecks.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Detected Bottlenecks
                  </h4>
                  {bottlenecks.map((bottleneck, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-4 rounded-lg border-2",
                        bottleneck.severity === 'critical' && "bg-red-50 border-red-300",
                        bottleneck.severity === 'high' && "bg-amber-50 border-amber-300",
                        bottleneck.severity === 'medium' && "bg-yellow-50 border-yellow-300"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-slate-900">{bottleneck.stage}</div>
                        <Badge
                          className={cn(
                            bottleneck.severity === 'critical' && "bg-red-600 text-white",
                            bottleneck.severity === 'high' && "bg-amber-600 text-white",
                            bottleneck.severity === 'medium' && "bg-yellow-600 text-white"
                          )}
                        >
                          {bottleneck.severity}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-700">
                        Average: <strong>{bottleneck.avgDays} days</strong> • {bottleneck.proposalCount} proposals
                      </div>
                      <div className="text-xs text-slate-600 mt-2 italic">
                        💡 {bottleneck.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cumulative-flow">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Cumulative Flow Diagram</CardTitle>
              <CardDescription>
                Visualize the flow of proposals through your pipeline over time. Growing gaps indicate bottlenecks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={cumulativeFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {Object.keys(cumulativeFlowData[0] || {})
                    .filter(key => key !== 'date')
                    .map((stage, idx) => (
                      <Area
                        key={stage}
                        type="monotone"
                        dataKey={stage}
                        stackId="1"
                        stroke={COLORS[idx % COLORS.length]}
                        fill={COLORS[idx % COLORS.length]}
                        name={stage.replace('_', ' ').toUpperCase()}
                      />
                    ))}
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Weekly Velocity & Throughput</CardTitle>
              <CardDescription>
                Track how many proposals are entering vs completing your pipeline each week.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="created" stroke="#3b82f6" name="Created" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" name="Completed" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-6 grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-900 font-medium mb-1">Weekly Intake</div>
                  <div className="text-2xl font-bold text-blue-600">{keyMetrics.weeklyIntake}</div>
                  <div className="text-xs text-blue-700 mt-1">Proposals started last week</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm text-green-900 font-medium mb-1">Weekly Throughput</div>
                  <div className="text-2xl font-bold text-green-600">{keyMetrics.weeklyThroughput}</div>
                  <div className="text-xs text-green-700 mt-1">Proposals completed last week</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-900 font-medium mb-1">Net Flow</div>
                  <div className={cn(
                    "text-2xl font-bold",
                    keyMetrics.weeklyIntake - keyMetrics.weeklyThroughput > 0 ? "text-amber-600" : "text-green-600"
                  )}>
                    {keyMetrics.weeklyIntake - keyMetrics.weeklyThroughput > 0 ? '+' : ''}
                    {keyMetrics.weeklyIntake - keyMetrics.weeklyThroughput}
                  </div>
                  <div className="text-xs text-slate-700 mt-1">
                    {keyMetrics.weeklyIntake - keyMetrics.weeklyThroughput > 0 
                      ? 'Pipeline growing'
                      : 'Pipeline shrinking'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}