import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Award,
  AlertTriangle,
  CheckCircle2,
  Activity,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import moment from "moment";

export default function ProcessEfficiencyReport({ proposals = [], snapshots = [] }) {
  // Calculate process efficiency metrics
  const efficiencyMetrics = useMemo(() => {
    const wonProposals = proposals.filter(p => p.status === 'won');
    const lostProposals = proposals.filter(p => p.status === 'lost');
    const inProgressProposals = proposals.filter(p => ['draft', 'in_progress', 'evaluating'].includes(p.status));

    // Average time to win
    const wonWithSnapshots = wonProposals.filter(p => {
      const proposalSnapshots = snapshots.filter(s => s.proposal_id === p.id);
      return proposalSnapshots.length > 0;
    });

    const avgTimeToWin = wonWithSnapshots.length > 0
      ? wonWithSnapshots.reduce((sum, p) => {
          const proposalSnapshots = snapshots
            .filter(s => s.proposal_id === p.id)
            .sort((a, b) => moment(a.snapshot_date).diff(moment(b.snapshot_date)));
          
          if (proposalSnapshots.length === 0) return sum;
          
          const lastSnapshot = proposalSnapshots[proposalSnapshots.length - 1];
          return sum + (lastSnapshot.total_time_in_pipeline_hours || 0);
        }, 0) / wonWithSnapshots.length / 24
      : 0;

    // On-time delivery rate
    const completedProposals = proposals.filter(p => ['won', 'lost', 'submitted'].includes(p.status) && p.due_date);
    const onTimeProposals = completedProposals.filter(p => {
      const submittedDate = p.updated_date || p.created_date;
      return moment(submittedDate).isSameOrBefore(moment(p.due_date));
    });
    const onTimeRate = completedProposals.length > 0 
      ? (onTimeProposals.length / completedProposals.length) * 100
      : 0;

    // Win rate
    const decidedProposals = [...wonProposals, ...lostProposals];
    const winRate = decidedProposals.length > 0
      ? (wonProposals.length / decidedProposals.length) * 100
      : 0;

    // Proposal velocity (proposals per week)
    const last30Days = proposals.filter(p => 
      moment(p.created_date).isAfter(moment().subtract(30, 'days'))
    );
    const proposalsPerWeek = last30Days.length / 4.3;

    // WIP (Work in Progress)
    const wip = inProgressProposals.length;

    // Throughput (completed per week)
    const completedLast30Days = proposals.filter(p => 
      ['won', 'lost', 'submitted'].includes(p.status) &&
      moment(p.updated_date).isAfter(moment().subtract(30, 'days'))
    );
    const throughput = completedLast30Days.length / 4.3;

    // Flow efficiency (value-add time / total time)
    // Estimate: in_progress is value-add, other stages are wait time
    const flowEfficiency = snapshots.length > 0
      ? (snapshots.filter(s => s.status === 'in_progress').length / snapshots.length) * 100
      : 0;

    return {
      avgTimeToWin: Math.round(avgTimeToWin),
      onTimeRate: Math.round(onTimeRate),
      winRate: Math.round(winRate),
      proposalsPerWeek: Math.round(proposalsPerWeek * 10) / 10,
      wip,
      throughput: Math.round(throughput * 10) / 10,
      flowEfficiency: Math.round(flowEfficiency)
    };
  }, [proposals, snapshots]);

  // Radar chart data for process health
  const processHealthData = [
    { metric: 'Win Rate', score: efficiencyMetrics.winRate, fullMark: 100 },
    { metric: 'On-Time Rate', score: efficiencyMetrics.onTimeRate, fullMark: 100 },
    { metric: 'Flow Efficiency', score: efficiencyMetrics.flowEfficiency, fullMark: 100 },
    { metric: 'Throughput', score: Math.min(efficiencyMetrics.throughput * 10, 100), fullMark: 100 },
    { metric: 'Velocity', score: Math.min(efficiencyMetrics.proposalsPerWeek * 10, 100), fullMark: 100 }
  ];

  // Stage distribution
  const stageDistribution = useMemo(() => {
    const distribution = {};
    proposals.forEach(p => {
      const stage = p.custom_workflow_stage_id || p.status || 'unknown';
      distribution[stage] = (distribution[stage] || 0) + 1;
    });

    return Object.entries(distribution).map(([stage, count]) => ({
      name: stage.replace('_', ' ').toUpperCase(),
      value: count,
      percentage: (count / proposals.length) * 100
    }));
  }, [proposals]);

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Efficiency Score Card */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-6 h-6 text-blue-600" />
            Process Efficiency Score
          </CardTitle>
          <CardDescription>
            Overall health and efficiency of your proposal pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {[
                { label: 'Win Rate', value: efficiencyMetrics.winRate, suffix: '%', icon: Target },
                { label: 'On-Time Delivery', value: efficiencyMetrics.onTimeRate, suffix: '%', icon: Clock },
                { label: 'Flow Efficiency', value: efficiencyMetrics.flowEfficiency, suffix: '%', icon: Activity },
                { label: 'Weekly Throughput', value: efficiencyMetrics.throughput, suffix: ' proposals', icon: Zap }
              ].map((metric, idx) => {
                const Icon = metric.icon;
                return (
                  <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-slate-200">
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="text-sm font-medium text-slate-600">{metric.label}</div>
                        <div className={cn("text-2xl font-bold", getScoreColor(metric.value))}>
                          {metric.value}{metric.suffix}
                        </div>
                      </div>
                    </div>
                    <Badge className={cn(
                      metric.value >= 80 ? "bg-green-100 text-green-700" :
                      metric.value >= 60 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {getScoreBadge(metric.value)}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-4 text-center">Process Health Radar</h4>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={processHealthData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Pipeline Distribution</CardTitle>
            <CardDescription>Where your proposals are currently positioned</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stageDistribution.map((stage, idx) => (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="font-medium text-slate-700">{stage.name}</span>
                    <span className="text-slate-600">
                      {stage.value} ({stage.percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={stage.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Key Performance Indicators</CardTitle>
            <CardDescription>Critical metrics at a glance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="text-sm text-blue-900 font-medium">Average Time to Win</div>
                  <div className="text-xs text-blue-700 mt-1">From start to contract award</div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {efficiencyMetrics.avgTimeToWin}d
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <div className="text-sm text-purple-900 font-medium">Work in Progress</div>
                  <div className="text-xs text-purple-700 mt-1">Active proposals</div>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {efficiencyMetrics.wip}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="text-sm text-green-900 font-medium">Weekly Velocity</div>
                  <div className="text-xs text-green-700 mt-1">New proposals per week</div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {efficiencyMetrics.proposalsPerWeek}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div>
                  <div className="text-sm text-amber-900 font-medium">Cycle Time Ratio</div>
                  <div className="text-xs text-amber-700 mt-1">Lead time / Cycle time</div>
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {efficiencyMetrics.avgTimeToWin > 0 && efficiencyMetrics.flowEfficiency > 0
                    ? (100 / efficiencyMetrics.flowEfficiency).toFixed(1)
                    : 'N/A'}x
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            AI-Powered Recommendations
          </CardTitle>
          <CardDescription>
            Based on your pipeline analytics, here are suggested improvements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {efficiencyMetrics.onTimeRate < 60 && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-red-900">Low On-Time Delivery Rate</div>
                  <div className="text-sm text-red-800 mt-1">
                    Only {efficiencyMetrics.onTimeRate}% of proposals are completed on time. 
                    Consider implementing WIP limits and better deadline tracking.
                  </div>
                </div>
              </div>
            </div>
          )}

          {efficiencyMetrics.flowEfficiency < 30 && (
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-900">Low Flow Efficiency</div>
                  <div className="text-sm text-amber-800 mt-1">
                    Only {efficiencyMetrics.flowEfficiency}% of time is spent in active work. 
                    Proposals are spending too much time waiting. Review handoff processes.
                  </div>
                </div>
              </div>
            </div>
          )}

          {efficiencyMetrics.wip > 10 && (
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900">High Work in Progress</div>
                  <div className="text-sm text-blue-800 mt-1">
                    You have {efficiencyMetrics.wip} proposals in progress. 
                    Consider limiting WIP to improve focus and completion rate.
                  </div>
                </div>
              </div>
            </div>
          )}

          {efficiencyMetrics.winRate >= 70 && efficiencyMetrics.onTimeRate >= 80 && (
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-green-900">Excellent Performance! 🎉</div>
                  <div className="text-sm text-green-800 mt-1">
                    Your pipeline is operating efficiently with {efficiencyMetrics.winRate}% win rate 
                    and {efficiencyMetrics.onTimeRate}% on-time delivery. Keep up the great work!
                  </div>
                </div>
              </div>
            </div>
          )}

          {proposals.length < 5 && (
            <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-lg">
              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">Limited Data</div>
                  <div className="text-sm text-slate-700 mt-1">
                    You have {proposals.length} proposals. Create more proposals and generate snapshots 
                    to unlock powerful insights and trend analysis.
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Performance Comparison</CardTitle>
          <CardDescription>
            Compare your current metrics against industry benchmarks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[
              { label: 'Win Rate', yours: efficiencyMetrics.winRate, benchmark: 35, unit: '%' },
              { label: 'On-Time Delivery', yours: efficiencyMetrics.onTimeRate, benchmark: 75, unit: '%' },
              { label: 'Avg Time to Win', yours: efficiencyMetrics.avgTimeToWin, benchmark: 60, unit: ' days', reverse: true },
              { label: 'Weekly Throughput', yours: efficiencyMetrics.throughput, benchmark: 2, unit: ' proposals' }
            ].map((metric, idx) => {
              const performanceVsBenchmark = metric.reverse
                ? ((metric.benchmark - metric.yours) / metric.benchmark) * 100
                : ((metric.yours - metric.benchmark) / metric.benchmark) * 100;
              
              const isAboveBenchmark = performanceVsBenchmark > 0;

              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{metric.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">
                        You: <strong>{metric.yours}{metric.unit}</strong>
                      </span>
                      <span className="text-sm text-slate-500">
                        Benchmark: {metric.benchmark}{metric.unit}
                      </span>
                      {isAboveBenchmark ? (
                        <Badge className="bg-green-100 text-green-700">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {Math.abs(performanceVsBenchmark).toFixed(0)}% better
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          {Math.abs(performanceVsBenchmark).toFixed(0)}% below
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Progress 
                        value={Math.min((metric.yours / (metric.reverse ? 100 : 150)) * 100, 100)} 
                        className={cn(
                          "h-2",
                          isAboveBenchmark ? "bg-green-200" : "bg-red-200"
                        )} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Process Health Radar */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Process Health Overview</CardTitle>
          <CardDescription>
            Multi-dimensional view of your pipeline performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={processHealthData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Your Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}