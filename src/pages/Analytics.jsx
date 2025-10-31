
import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
// useQuery is no longer used directly for data fetching in this component
// import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  FileText,
  Award,
  Zap,
  Brain,
  Clock,
  Users,
  Lightbulb,
  BarChart3,
  PieChart as PieChartIcon, // Renamed to avoid conflict with Recharts PieChart
  Calendar,
  Download,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
// Tabs components are no longer used in the new structure
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress"; // New import for progress bar
import {
  LineChart,
  Line,
  BarChart,
  PieChart, // Recharts PieChart
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

// COLORS array is no longer used as specific colors are set for each chart element
// const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export default function Analytics() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30days"); // Renamed from timeRange
  const [proposalsData, setProposalsData] = useState([]); // Stores all fetched proposals
  const [tokenUsageData, setTokenUsageData] = useState([]); // Stores all fetched token usage
  const [timeSeriesData, setTimeSeriesData] = useState([]); // For chart trends

  // Helper function to filter data based on selected date range
  const filterDataByDateRange = useCallback((data, dateField) => {
    if (dateRange === "all") return data;
    const now = new Date();
    let startDate;

    if (dateRange === "7days") {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (dateRange === "30days") {
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    } else if (dateRange === "90days") {
      startDate = new Date(now.setMonth(now.getMonth() - 3));
    } else {
      // Default to 30 days if an unrecognized range is somehow selected
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    return data.filter(item => new Date(item[dateField]) >= startDate);
  }, [dateRange]);

  const loadData = useCallback(async () => {
    if (!organization) return; // Ensure organization is loaded before proceeding

    setLoading(true);
    try {
      // Fetch all data for the current organization
      const [allProposals, allTokenUsage, pastPerf, resources] = await Promise.all([
        base44.entities.Proposal.filter({ organization_id: organization.id }),
        base44.entities.TokenUsage.filter({ organization_id: organization.id }),
        base44.entities.PastPerformance.filter({ organization_id: organization.id }),
        base44.entities.ProposalResource.filter({ organization_id: organization.id })
      ]);

      // Store the raw data for potential re-filtering without re-fetching
      setProposalsData(allProposals);
      setTokenUsageData(allTokenUsage);

      // Apply date range filter for metric calculations and time series
      const filteredProposals = filterDataByDateRange(allProposals, 'created_date');
      const filteredTokenUsage = filterDataByDateRange(allTokenUsage, 'created_date');

      // Calculate key metrics
      const submitted = filteredProposals.filter(p => ['submitted', 'won', 'lost'].includes(p.status));
      const won = filteredProposals.filter(p => p.status === 'won');
      const winRate = submitted.length > 0 ? (won.length / submitted.length) * 100 : 0;

      const totalRevenue = filteredProposals
        .filter(p => p.status === 'won')
        .reduce((sum, p) => sum + (p.contract_value || 0), 0);

      const pipelineValue = filteredProposals
        .filter(p => !['won', 'lost', 'archived'].includes(p.status))
        .reduce((sum, p) => sum + (p.contract_value || 0), 0);

      const totalTokens = filteredTokenUsage.reduce((sum, t) => sum + (t.tokens_used || 0), 0);
      const totalAIActions = filteredTokenUsage.length;
      const avgTokensPerRequest = filteredTokenUsage.length > 0 ? totalTokens / filteredTokenUsage.length : 0;

      setMetrics({
        total_proposals: filteredProposals.length,
        active_proposals: filteredProposals.filter(p => ['draft', 'in_progress'].includes(p.status)).length,
        submitted_proposals: submitted.length,
        won_proposals: won.length,
        lost_proposals: filteredProposals.filter(p => p.status === 'lost').length,
        win_rate: Math.round(winRate),
        total_revenue: totalRevenue,
        pipeline_value: pipelineValue,
        total_tokens: totalTokens,
        total_ai_actions: totalAIActions,
        avg_tokens_per_request: Math.round(avgTokensPerRequest),
        past_performance_count: pastPerf.length,
        resources_count: resources.length
      });

      // Calculate time series data for trends
      const monthlyData = {};
      filteredProposals.forEach(p => {
        const date = new Date(p.created_date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`; // YYYY-MM for consistent sorting
        const monthLabel = date.toLocaleString('en-US', { month: 'short', year: 'numeric' }); // For display

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthLabel,
            sortKey: monthKey,
            total_proposals: 0,
            won_proposals: 0,
            submitted_proposals: 0,
            revenue: 0,
          };
        }
        monthlyData[monthKey].total_proposals++;
        if (['submitted', 'won', 'lost'].includes(p.status)) {
          monthlyData[monthKey].submitted_proposals++;
        }
        if (p.status === 'won') {
          monthlyData[monthKey].won_proposals++;
          monthlyData[monthKey].revenue += (p.contract_value || 0);
        }
      });

      const timeline = Object.values(monthlyData).map(data => ({
        ...data,
        win_rate: data.submitted_proposals > 0 ? (data.won_proposals / data.submitted_proposals) * 100 : 0
      })).sort((a, b) => a.sortKey.localeCompare(b.sortKey)); // Sort by YYYY-MM

      setTimeSeriesData(timeline);

    } catch (error) {
      console.error("Error loading analytics data:", error);
      // Optionally, set an error state to display to the user
    } finally {
      setLoading(false);
    }
  }, [organization, dateRange, filterDataByDateRange]); // Dependencies for useCallback

  // Initial load of user and organization on component mount
  useEffect(() => {
    const loadUserAndOrg = async () => {
      setLoading(true);
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );

        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        } else {
          console.warn("No organization found for the current user. Please create one.");
          setOrganization(null); // Explicitly set null if no org
          setLoading(false); // Stop loading if no organization
        }
      } catch (error) {
        console.error("Error fetching user or organization:", error);
        setLoading(false); // Stop loading on error
      }
    };
    loadUserAndOrg();
  }, []); // Empty dependency array means this runs once on mount

  // Effect to re-load data whenever organization or dateRange changes
  useEffect(() => {
    if (organization) {
      loadData();
    }
  }, [organization, dateRange, loadData]); // Depend on organization, dateRange, and memoized loadData

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Ensure metrics object is not empty before rendering content that relies on it
  if (!organization || Object.keys(metrics).length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center text-center">
        <div className="space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-700">Loading your analytics data...</p>
          {!organization && !loading && (
            <p className="text-red-500">No organization found for your user. Please create an organization to view analytics.</p>
          )}
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics & Insights</h1>
            <p className="text-slate-600">Track performance, win rates, and AI usage</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            {/* Export Report button - functionality not specified in outline */}
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-blue-500" />
                <TrendingUp className="w-5 h-5 text-green-500" /> {/* This icon is just illustrative as no change is defined */}
              </div>
              <p className="text-3xl font-bold text-slate-900">{metrics.total_proposals}</p>
              <p className="text-sm text-slate-600">Total Proposals</p>
              <p className="text-xs text-green-600 mt-1">{metrics.active_proposals} active</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-8 h-8 text-green-500" />
                <TrendingUp className="w-5 h-5 text-green-500" /> {/* This icon is just illustrative as no change is defined */}
              </div>
              <p className="text-3xl font-bold text-slate-900">{metrics.win_rate}%</p>
              <p className="text-sm text-slate-600">Win Rate</p>
              <p className="text-xs text-slate-500 mt-1">
                {metrics.won_proposals} won / {metrics.submitted_proposals} submitted
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-purple-500" />
                <TrendingUp className="w-5 h-5 text-purple-500" /> {/* This icon is just illustrative as no change is defined */}
              </div>
              <p className="text-3xl font-bold text-slate-900">
                ${(metrics.total_revenue / 1000000).toFixed(1)}M
              </p>
              <p className="text-sm text-slate-600">Total Revenue</p>
              <p className="text-xs text-slate-500 mt-1">From won proposals</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 text-indigo-500" />
                <TrendingUp className="w-5 h-5 text-indigo-500" /> {/* This icon is just illustrative as no change is defined */}
              </div>
              <p className="text-3xl font-bold text-slate-900">
                ${(metrics.pipeline_value / 1000000).toFixed(1)}M
              </p>
              <p className="text-sm text-slate-600">Pipeline Value</p>
              <p className="text-xs text-slate-500 mt-1">Active opportunities</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Win Rate Trend */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Win Rate Trend
              </CardTitle>
              <CardDescription>Monthly win rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="win_rate" stroke="#10b981" strokeWidth={2} name="Win Rate %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Trend */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-600" />
                Revenue Trend
              </CardTitle>
              <CardDescription>Monthly revenue from won proposals</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis formatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8b5cf6" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* AI Usage Analytics */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              AI Usage & Efficiency Analysis
            </CardTitle>
            <CardDescription>Track AI features usage and productivity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-blue-900 font-medium">Total Tokens</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {(metrics.total_tokens / 1000).toFixed(0)}k
                    </p>
                  </div>
                </div>
                <p className="text-xs text-blue-800">AI input/output volume</p>
              </div>

              <div className="p-6 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm text-green-900 font-medium">Total AI Actions</p>
                    <p className="text-2xl font-bold text-green-700">
                      {metrics.total_ai_actions}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-green-800">AI tasks completed</p>
              </div>

              <div className="p-6 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-purple-900 font-medium">Avg per Request</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {(metrics.avg_tokens_per_request / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>
                <p className="text-xs text-purple-800">Average tokens per action</p>
              </div>
            </div>

            {/* Feature Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">AI Usage by Feature</h3>
              {['chat', 'proposal_generation', 'evaluation', 'file_extraction'].map((feature) => {
                const featureUsage = filterDataByDateRange(tokenUsageData, 'created_date').filter(t => t.feature_type === feature);
                const count = featureUsage.length;
                const tokens = featureUsage.reduce((sum, t) => sum + (t.tokens_used || 0), 0);
                const totalActions = filterDataByDateRange(tokenUsageData, 'created_date').length;
                const percentage = totalActions > 0 ? (count / totalActions) * 100 : 0;

                return (
                  <div key={feature} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 capitalize">
                          {feature.replace(/_/g, ' ')}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {count} actions
                        </Badge>
                      </div>
                      <span className="text-sm text-slate-600">
                        {(tokens / 1000).toFixed(0)}k tokens
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Additional Metrics */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Proposal Status Distribution */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5 text-blue-600" />
                Proposal Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Active', value: metrics.active_proposals, fill: '#3b82f6' },
                      { name: 'Won', value: metrics.won_proposals, fill: '#10b981' },
                      { name: 'Lost', value: metrics.lost_proposals, fill: '#ef4444' },
                      // Calculate 'Other' by subtracting known statuses from total filtered proposals
                      { name: 'Other', value: filterDataByDateRange(proposalsData, 'created_date').length - metrics.active_proposals - metrics.won_proposals - metrics.lost_proposals, fill: '#94a3b8' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                    <Cell fill="#94a3b8" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Resource Stats */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Resources & Assets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-blue-500" />
                  <span className="text-sm font-medium text-slate-700">Past Performance</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">{metrics.past_performance_count}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-purple-500" />
                  <span className="text-sm font-medium text-slate-700">Resources</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">{metrics.resources_count}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-green-500" />
                  <span className="text-sm font-medium text-slate-700">AI Actions</span>
                </div>
                <span className="text-2xl font-bold text-slate-900">{metrics.total_ai_actions}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
