
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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
  PieChart,
  Calendar,
  Download,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
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

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("90d");
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    const loadOrgId = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading org:", error);
      }
    };
    loadOrgId();
  }, []);

  const { data: proposals } = useQuery({
    queryKey: ['analytics-proposals', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      return base44.entities.Proposal.filter(
        { organization_id: currentOrgId },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!currentOrgId,
  });

  const { data: tokenUsage } = useQuery({
    queryKey: ['analytics-tokens', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      return base44.entities.TokenUsage.filter(
        { organization_id: currentOrgId },
        '-created_date',
        200
      );
    },
    initialData: [],
    enabled: !!currentOrgId,
  });

  const { data: resources } = useQuery({
    queryKey: ['analytics-resources', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      return base44.entities.ProposalResource.filter(
        { organization_id: currentOrgId },
        '-usage_count'
      );
    },
    initialData: [],
    enabled: !!currentOrgId,
  });

  const { data: subscription } = useQuery({
    queryKey: ['analytics-subscription', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return null;
      const subs = await base44.entities.Subscription.filter(
        { organization_id: currentOrgId },
        '-created_date',
        1
      );
      return subs.length > 0 ? subs[0] : null;
    },
    enabled: !!currentOrgId,
  });

  // Calculate Win/Loss Metrics
  const winLossMetrics = {
    totalProposals: proposals.length,
    won: proposals.filter(p => p.status === 'won').length,
    lost: proposals.filter(p => p.status === 'lost').length,
    pending: proposals.filter(p => ['in_progress', 'submitted', 'evaluating', 'watch_list'].includes(p.status)).length,
    winRate: proposals.length > 0 
      ? Math.round((proposals.filter(p => p.status === 'won').length / proposals.filter(p => ['won', 'lost'].includes(p.status)).length) * 100) || 0
      : 0
  };

  // Proposals by Status
  const statusData = [
    { name: 'Evaluating', value: proposals.filter(p => p.status === 'evaluating').length, color: '#8b5cf6' },
    { name: 'Watch List', value: proposals.filter(p => p.status === 'watch_list').length, color: '#f59e0b' },
    { name: 'In Progress', value: proposals.filter(p => p.status === 'in_progress' || p.status === 'draft').length, color: '#3b82f6' },
    { name: 'Submitted', value: proposals.filter(p => p.status === 'submitted').length, color: '#ec4899' },
    { name: 'Won', value: proposals.filter(p => p.status === 'won').length, color: '#10b981' },
    { name: 'Lost', value: proposals.filter(p => p.status === 'lost').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  // Performance by Agency
  const agencyPerformance = proposals.reduce((acc, p) => {
    if (!p.agency_name) return acc;
    if (!acc[p.agency_name]) {
      acc[p.agency_name] = { total: 0, won: 0, lost: 0 };
    }
    acc[p.agency_name].total++;
    if (p.status === 'won') acc[p.agency_name].won++;
    if (p.status === 'lost') acc[p.agency_name].lost++;
    return acc;
  }, {});

  const agencyData = Object.entries(agencyPerformance)
    .map(([name, data]) => ({
      name: name.length > 20 ? name.substring(0, 20) + '...' : name,
      total: data.total,
      won: data.won,
      winRate: data.total > 0 ? Math.round((data.won / data.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Token Usage Over Time
  const tokensByMonth = tokenUsage.reduce((acc, usage) => {
    const month = new Date(usage.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = { month, tokens: 0, cost: 0 };
    }
    acc[month].tokens += usage.tokens_used;
    acc[month].cost += usage.cost_estimate || 0;
    return acc;
  }, {});

  const tokenTimelineData = Object.values(tokensByMonth)
    .sort((a, b) => new Date(a.month) - new Date(b.month))
    .slice(-6);

  // Token Usage by Feature
  const featureUsage = tokenUsage.reduce((acc, usage) => {
    if (!acc[usage.feature_type]) {
      acc[usage.feature_type] = 0;
    }
    acc[usage.feature_type] += usage.tokens_used;
    return acc;
  }, {});

  const featureData = Object.entries(featureUsage)
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: Math.round(value / 1000)
    }))
    .sort((a, b) => b.value - a.value);

  // Content Performance
  const topResources = resources
    .filter(r => r.usage_count > 0)
    .sort((a, b) => b.usage_count - a.usage_count)
    .slice(0, 10);

  const boilerplateStats = {
    total: resources.filter(r => r.resource_type === 'boilerplate_text').length,
    used: resources.filter(r => r.resource_type === 'boilerplate_text' && r.usage_count > 0).length,
    avgUsage: resources.filter(r => r.resource_type === 'boilerplate_text').length > 0
      ? Math.round(resources.filter(r => r.resource_type === 'boilerplate_text').reduce((sum, r) => sum + (r.usage_count || 0), 0) / resources.filter(r => r.resource_type === 'boilerplate_text').length)
      : 0
  };

  // Financial Metrics (would need contract_value field in proposals)
  const financialMetrics = {
    pipelineValue: 0, // Would calculate from proposals with contract values
    wonValue: 0,
    avgDealSize: 0,
    roi: subscription ? Math.round((winLossMetrics.won * 100000 - subscription.monthly_price * 12) / (subscription.monthly_price * 12) * 100) : 0 // Rough estimate
  };

  // Proposal Quality Trends
  const qualityData = proposals
    .filter(p => p.match_score)
    .slice(-10)
    .map(p => ({
      name: p.proposal_name?.substring(0, 15) || 'Unknown',
      score: p.match_score,
      status: p.status
    }));

  // Generate AI Insights
  const generateInsights = async () => {
    setLoadingInsights(true);
    try {
      const prompt = `You are a business intelligence analyst. Analyze this proposal performance data and provide actionable insights.

**PERFORMANCE METRICS:**
- Total Proposals: ${winLossMetrics.totalProposals}
- Win Rate: ${winLossMetrics.winRate}%
- Won: ${winLossMetrics.won}
- Lost: ${winLossMetrics.lost}
- Pending: ${winLossMetrics.pending}

**TOP AGENCIES:**
${agencyData.slice(0, 5).map(a => `- ${a.name}: ${a.total} proposals, ${a.winRate}% win rate`).join('\n')}

**CONTENT LIBRARY:**
- Total Boilerplate: ${boilerplateStats.total}
- Used at least once: ${boilerplateStats.used}
- Average usage: ${boilerplateStats.avgUsage} times

**TOKEN USAGE:**
- Total tokens used: ${tokenUsage.reduce((sum, u) => sum + u.tokens_used, 0).toLocaleString()}
- Total cost: $${tokenUsage.reduce((sum, u) => sum + (u.cost_estimate || 0), 0).toFixed(2)}

**YOUR TASK:**
Provide a JSON object with strategic insights and recommendations:

{
  "key_insights": [
    <string: 3-5 key insights about performance>
  ],
  "strengths": [
    <string: 2-3 things they're doing well>
  ],
  "opportunities": [
    <string: 2-3 opportunities for improvement>
  ],
  "recommended_actions": [
    <string: 3-5 specific, actionable recommendations>
  ],
  "performance_rating": <string: "excellent", "good", "needs_improvement">,
  "priority_focus": <string: what they should focus on most>
}

Be specific, actionable, and data-driven.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            key_insights: { type: "array", items: { type: "string" } },
            strengths: { type: "array", items: { type: "string" } },
            opportunities: { type: "array", items: { type: "string" } },
            recommended_actions: { type: "array", items: { type: "string" } },
            performance_rating: { type: "string" },
            priority_focus: { type: "string" }
          }
        }
      });

      setAiInsights(result);
    } catch (error) {
      console.error("Error generating insights:", error);
    }
    setLoadingInsights(false);
  };

  if (!currentOrgId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics & Insights</h1>
          <p className="text-slate-600">Performance metrics, trends, and AI-powered recommendations</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-green-600" />
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-4xl font-bold text-green-600">{winLossMetrics.winRate}%</p>
            <p className="text-sm text-slate-600 mt-1">Win Rate</p>
            <p className="text-xs text-slate-500 mt-2">
              {winLossMetrics.won} won / {winLossMetrics.won + winLossMetrics.lost} decided
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-4xl font-bold text-blue-600">{winLossMetrics.totalProposals}</p>
            <p className="text-sm text-slate-600 mt-1">Total Proposals</p>
            <p className="text-xs text-slate-500 mt-2">
              {winLossMetrics.pending} in pipeline
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-4xl font-bold text-purple-600">
              {(tokenUsage.reduce((sum, u) => sum + u.tokens_used, 0) / 1000000).toFixed(1)}M
            </p>
            <p className="text-sm text-slate-600 mt-1">Tokens Used</p>
            <p className="text-xs text-slate-500 mt-2">
              ${tokenUsage.reduce((sum, u) => sum + (u.cost_estimate || 0), 0).toFixed(2)} cost
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 text-amber-600" />
            </div>
            <p className="text-4xl font-bold text-amber-600">{boilerplateStats.total}</p>
            <p className="text-sm text-slate-600 mt-1">Content Assets</p>
            <p className="text-xs text-slate-500 mt-2">
              {boilerplateStats.used} actively used
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Win/Loss Funnel */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Proposal Pipeline Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Agencies */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Top Agencies by Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#3b82f6" name="Total Proposals" />
                    <Bar dataKey="won" fill="#10b981" name="Won" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance Summary */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-green-700">{winLossMetrics.won}</p>
                  <p className="text-sm text-green-800">Proposals Won</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-red-700">{winLossMetrics.lost}</p>
                  <p className="text-sm text-red-800">Proposals Lost</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-700">{winLossMetrics.pending}</p>
                  <p className="text-sm text-blue-800">In Pipeline</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="space-y-6">
          {/* Quality Trends */}
          {qualityData.length > 0 && (
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Proposal Quality Scores</CardTitle>
                <CardDescription>AI evaluation scores for recent proposals</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={qualityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="score" stroke="#3b82f6" fill="#93c5fd" name="Quality Score" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Recent Proposals */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Recent Proposal Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {proposals.slice(0, 10).map((proposal) => (
                  <div key={proposal.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{proposal.proposal_name}</p>
                      <p className="text-sm text-slate-600">{proposal.agency_name || 'No agency'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {proposal.match_score && (
                        <Badge variant="outline" className="font-mono">
                          {proposal.match_score}%
                        </Badge>
                      )}
                      <Badge className={
                        proposal.status === 'won' ? 'bg-green-100 text-green-700' :
                        proposal.status === 'lost' ? 'bg-red-100 text-red-700' :
                        proposal.status === 'submitted' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }>
                        {proposal.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Usage Tab */}
        <TabsContent value="ai-usage" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Token Usage Over Time */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Token Usage Trend</CardTitle>
                <CardDescription>AI consumption over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={tokenTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${(value / 1000).toFixed(0)}K tokens`} />
                    <Line type="monotone" dataKey="tokens" stroke="#8b5cf6" strokeWidth={2} name="Tokens Used" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Usage by Feature */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Usage by Feature</CardTitle>
                <CardDescription>Token consumption breakdown (in thousands)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip formatter={(value) => `${value}K tokens`} />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Cost Analysis */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
            <CardHeader>
              <CardTitle className="text-lg">Cost & Efficiency Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <Brain className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-700">
                    {(tokenUsage.reduce((sum, u) => sum + u.tokens_used, 0) / 1000000).toFixed(2)}M
                  </p>
                  <p className="text-sm text-slate-600">Total Tokens</p>
                </div>
                <div className="text-center">
                  <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">
                    ${tokenUsage.reduce((sum, u) => sum + (u.cost_estimate || 0), 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-600">Total Cost</p>
                </div>
                <div className="text-center">
                  <Zap className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-700">
                    {proposals.length > 0 ? Math.round(tokenUsage.reduce((sum, u) => sum + u.tokens_used, 0) / proposals.length / 1000) : 0}K
                  </p>
                  <p className="text-sm text-slate-600">Avg per Proposal</p>
                </div>
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-700">
                    {financialMetrics.roi > 0 ? '+' : ''}{financialMetrics.roi}%
                  </p>
                  <p className="text-sm text-slate-600">Estimated ROI</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          {/* Content Library Stats */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-none shadow-lg">
              <CardContent className="p-6 text-center">
                <FileText className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-slate-900">{boilerplateStats.total}</p>
                <p className="text-sm text-slate-600 mt-1">Total Boilerplate</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-slate-900">{boilerplateStats.used}</p>
                <p className="text-sm text-slate-600 mt-1">Actively Used</p>
                <p className="text-xs text-slate-500 mt-1">
                  {boilerplateStats.total > 0 ? Math.round((boilerplateStats.used / boilerplateStats.total) * 100) : 0}% utilization
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                <p className="text-3xl font-bold text-slate-900">{boilerplateStats.avgUsage}</p>
                <p className="text-sm text-slate-600 mt-1">Avg Times Used</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Content */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Top Performing Content</CardTitle>
              <CardDescription>Most frequently used boilerplate and resources</CardDescription>
            </CardHeader>
            <CardContent>
              {topResources.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>No content usage data yet</p>
                  <p className="text-sm text-slate-400">Start using your content library in proposals</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topResources.map((resource, idx) => (
                    <div key={resource.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{resource.title || resource.file_name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {resource.content_category?.replace(/_/g, ' ')}
                            </Badge>
                            {resource.word_count && (
                              <Badge variant="secondary" className="text-xs">
                                {resource.word_count} words
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{resource.usage_count}</p>
                        <p className="text-xs text-slate-600">times used</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                AI-Powered Business Intelligence
              </CardTitle>
              <CardDescription>
                Strategic insights and recommendations based on your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!aiInsights ? (
                <div className="text-center py-12">
                  <Lightbulb className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Generate Strategic Insights</h3>
                  <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                    Our AI will analyze your proposal performance, content usage, and efficiency metrics to provide personalized recommendations.
                  </p>
                  <Button
                    onClick={generateInsights}
                    disabled={loadingInsights || proposals.length === 0}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    {loadingInsights ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Insights
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Performance Rating */}
                  <Card className={`border-2 ${
                    aiInsights.performance_rating === 'excellent' ? 'border-green-300 bg-green-50' :
                    aiInsights.performance_rating === 'good' ? 'border-blue-300 bg-blue-50' :
                    'border-amber-300 bg-amber-50'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Award className={`w-10 h-10 ${
                          aiInsights.performance_rating === 'excellent' ? 'text-green-600' :
                          aiInsights.performance_rating === 'good' ? 'text-blue-600' :
                          'text-amber-600'
                        }`} />
                        <div>
                          <p className="text-sm text-slate-600">Overall Performance</p>
                          <p className={`text-2xl font-bold capitalize ${
                            aiInsights.performance_rating === 'excellent' ? 'text-green-700' :
                            aiInsights.performance_rating === 'good' ? 'text-blue-700' :
                            'text-amber-700'
                          }`}>
                            {aiInsights.performance_rating.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm ${
                        aiInsights.performance_rating === 'excellent' ? 'text-green-800' :
                        aiInsights.performance_rating === 'good' ? 'text-blue-800' :
                        'text-amber-800'
                      }`}>
                        <strong>Priority Focus:</strong> {aiInsights.priority_focus}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Key Insights */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-blue-600" />
                        Key Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiInsights.key_insights.map((insight, idx) => (
                          <div key={idx} className="p-3 bg-white border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          Your Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {aiInsights.strengths.map((strength, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-green-900">{strength}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Opportunities */}
                    <Card className="border-amber-200 bg-amber-50">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-amber-600" />
                          Growth Opportunities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {aiInsights.opportunities.map((opp, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <TrendingUp className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-amber-900">{opp}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recommended Actions */}
                  <Card className="border-indigo-200 bg-indigo-50">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="w-5 h-5 text-indigo-600" />
                        Recommended Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {aiInsights.recommended_actions.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-indigo-200 rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold">{idx + 1}</span>
                            </div>
                            <p className="text-sm text-indigo-900 flex-1">{action}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Regenerate Button */}
                  <Button
                    onClick={generateInsights}
                    disabled={loadingInsights}
                    variant="outline"
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Regenerate Insights
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
