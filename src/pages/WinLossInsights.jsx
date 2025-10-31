import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  TrendingDown,
  TrendingUp,
  Brain,
  Target,
  Loader2,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Users,
  BarChart3
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
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function WinLossInsights() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("all");
  const [timeRange, setTimeRange] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

        const [allAnalyses, allProposals] = await Promise.all([
          base44.entities.WinLossAnalysis.filter(
            { organization_id: orgs[0].id },
            '-created_date'
          ),
          base44.entities.Proposal.filter({ organization_id: orgs[0].id })
        ]);

        setAnalyses(allAnalyses);
        setProposals(allProposals);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter analyses
  const filteredAnalyses = analyses.filter(analysis => {
    const matchesSearch = searchQuery === "" || 
      proposals.find(p => p.id === analysis.proposal_id)?.proposal_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOutcome = filterOutcome === "all" || analysis.outcome === filterOutcome;
    
    let matchesTime = true;
    if (timeRange !== "all" && analysis.decision_date) {
      const decisionDate = new Date(analysis.decision_date);
      const now = new Date();
      const monthsAgo = (now - decisionDate) / (1000 * 60 * 60 * 24 * 30);
      
      if (timeRange === "6m" && monthsAgo > 6) matchesTime = false;
      if (timeRange === "12m" && monthsAgo > 12) matchesTime = false;
    }
    
    return matchesSearch && matchesOutcome && matchesTime;
  });

  // Calculate metrics
  const wonAnalyses = filteredAnalyses.filter(a => a.outcome === 'won');
  const lostAnalyses = filteredAnalyses.filter(a => a.outcome === 'lost');
  const totalDecisions = filteredAnalyses.length;
  const winRate = totalDecisions > 0 ? (wonAnalyses.length / totalDecisions) * 100 : 0;
  const totalRevenue = wonAnalyses.reduce((sum, a) => sum + (a.contract_value || 0), 0);

  // Calculate average scores
  const avgWonScore = wonAnalyses.length > 0
    ? wonAnalyses.reduce((sum, a) => sum + (a.scoring_breakdown?.total_score || 0), 0) / wonAnalyses.length
    : 0;
  const avgLostScore = lostAnalyses.length > 0
    ? lostAnalyses.reduce((sum, a) => sum + (a.scoring_breakdown?.total_score || 0), 0) / lostAnalyses.length
    : 0;

  // Extract common patterns
  const allStrengths = filteredAnalyses.flatMap(a => a.strengths_identified || []);
  const allWeaknesses = filteredAnalyses.flatMap(a => a.weaknesses_identified || []);
  const allLessons = filteredAnalyses.flatMap(a => a.lessons_learned || []);

  // Count frequency
  const strengthCounts = {};
  allStrengths.forEach(s => {
    const key = s.toLowerCase();
    strengthCounts[key] = (strengthCounts[key] || 0) + 1;
  });

  const weaknessCounts = {};
  allWeaknesses.forEach(w => {
    const key = w.toLowerCase();
    weaknessCounts[key] = (weaknessCounts[key] || 0) + 1;
  });

  // Top patterns
  const topStrengths = Object.entries(strengthCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topWeaknesses = Object.entries(weaknessCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Win/Loss trend over time
  const trendData = {};
  filteredAnalyses.forEach(a => {
    if (a.decision_date) {
      const monthKey = moment(a.decision_date).format('MMM YYYY');
      if (!trendData[monthKey]) {
        trendData[monthKey] = { month: monthKey, won: 0, lost: 0, total: 0 };
      }
      trendData[monthKey].total++;
      if (a.outcome === 'won') trendData[monthKey].won++;
      else trendData[monthKey].lost++;
    }
  });

  const trendChartData = Object.values(trendData).map(d => ({
    ...d,
    win_rate: d.total > 0 ? (d.won / d.total) * 100 : 0
  })).sort((a, b) => moment(a.month, 'MMM YYYY').valueOf() - moment(b.month, 'MMM YYYY').valueOf());

  // Loss reasons breakdown
  const lossReasonCounts = {};
  lostAnalyses.forEach(a => {
    (a.primary_loss_factors || []).forEach(factor => {
      lossReasonCounts[factor] = (lossReasonCounts[factor] || 0) + 1;
    });
  });

  const lossReasonsChart = Object.entries(lossReasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Win/Loss Insights</h1>
            <p className="text-slate-600">Learn from every outcome and improve your win rate</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button onClick={() => navigate(createPageUrl("Pipeline"))}>
              View Pipeline
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search proposals..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterOutcome} onValueChange={setFilterOutcome}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="6m">Last 6 Months</SelectItem>
                  <SelectItem value="12m">Last 12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900">{totalDecisions}</p>
              <p className="text-sm text-slate-600">Total Decisions</p>
              <p className="text-xs text-slate-500 mt-1">{wonAnalyses.length} won, {lostAnalyses.length} lost</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-600">{winRate.toFixed(0)}%</p>
              <p className="text-sm text-slate-600">Win Rate</p>
              <p className="text-xs text-slate-500 mt-1">
                {avgWonScore > 0 ? `Avg score: ${avgWonScore.toFixed(0)}` : 'No score data'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-purple-600">
                ${(totalRevenue / 1000000).toFixed(1)}M
              </p>
              <p className="text-sm text-slate-600">Total Won Value</p>
              <p className="text-xs text-slate-500 mt-1">From {wonAnalyses.length} wins</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Lightbulb className="w-8 h-8 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-amber-600">{allLessons.length}</p>
              <p className="text-sm text-slate-600">Lessons Learned</p>
              <p className="text-xs text-slate-500 mt-1">Actionable insights</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
            <TabsTrigger value="lessons">Lessons Learned</TabsTrigger>
            <TabsTrigger value="list">All Analyses</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Win Rate Trend */}
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Win Rate Trend
                </CardTitle>
                <CardDescription>Track your win rate over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="win_rate" stroke="#10b981" strokeWidth={2} name="Win Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Score Comparison */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle>Score Comparison</CardTitle>
                  <CardDescription>Average scores for wins vs. losses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={[
                      { category: 'Won', score: avgWonScore },
                      { category: 'Lost', score: avgLostScore }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Loss Reasons */}
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Top Loss Reasons
                  </CardTitle>
                  <CardDescription>Most common reasons for losing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lossReasonsChart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 flex-1">{item.reason}</span>
                        <Badge variant="destructive">{item.count}</Badge>
                      </div>
                    ))}
                    {lossReasonsChart.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-8">No loss data available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Patterns Tab */}
          <TabsContent value="patterns" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Strengths */}
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Common Strengths
                  </CardTitle>
                  <CardDescription>What you consistently do well</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topStrengths.map(([strength, count], idx) => (
                      <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-green-900 capitalize">{strength}</span>
                          <Badge className="bg-green-600">{count}x</Badge>
                        </div>
                      </div>
                    ))}
                    {topStrengths.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-8">No patterns identified yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Weaknesses */}
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Common Weaknesses
                  </CardTitle>
                  <CardDescription>Areas for improvement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topWeaknesses.map(([weakness, count], idx) => (
                      <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-red-900 capitalize">{weakness}</span>
                          <Badge variant="destructive">{count}x</Badge>
                        </div>
                      </div>
                    ))}
                    {topWeaknesses.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-8">No patterns identified yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Lessons Learned Tab */}
          <TabsContent value="lessons" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  All Lessons Learned
                </CardTitle>
                <CardDescription>Actionable insights from all proposals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allLessons.map((lesson, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{lesson.category}</Badge>
                            {lesson.actionable && (
                              <Badge className="bg-green-100 text-green-700">Actionable</Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-900">{lesson.lesson}</p>
                          {lesson.action_taken && (
                            <p className="text-xs text-green-600 mt-2">✓ Action taken: {lesson.action_taken}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {allLessons.length === 0 && (
                    <div className="text-center py-12">
                      <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No lessons learned yet. Complete your first win/loss analysis to get started.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Analyses List */}
          <TabsContent value="list" className="space-y-4">
            {filteredAnalyses.map((analysis) => {
              const proposalData = proposals.find(p => p.id === analysis.proposal_id);
              
              return (
                <Card key={analysis.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {proposalData?.proposal_name || 'Unknown Proposal'}
                          </h3>
                          {analysis.outcome === 'won' ? (
                            <Badge className="bg-green-100 text-green-700">
                              <Award className="w-3 h-3 mr-1" />
                              Won
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              Lost
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {moment(analysis.decision_date).format('MMM D, YYYY')}
                          </div>
                          {analysis.contract_value > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              ${(analysis.contract_value / 1000000).toFixed(1)}M
                            </div>
                          )}
                          {analysis.scoring_breakdown?.total_score && (
                            <div className="flex items-center gap-1">
                              <Target className="w-4 h-4" />
                              Score: {analysis.scoring_breakdown.total_score}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {analysis.strengths_identified?.length > 0 && (
                            <Badge className="bg-green-50 text-green-700">
                              {analysis.strengths_identified.length} Strengths
                            </Badge>
                          )}
                          {analysis.weaknesses_identified?.length > 0 && (
                            <Badge className="bg-red-50 text-red-700">
                              {analysis.weaknesses_identified.length} Weaknesses
                            </Badge>
                          )}
                          {analysis.lessons_learned?.length > 0 && (
                            <Badge className="bg-amber-50 text-amber-700">
                              {analysis.lessons_learned.length} Lessons
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(createPageUrl(`WinLossCapture?proposalId=${analysis.proposal_id}`))}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredAnalyses.length === 0 && (
              <Card className="border-none shadow-lg">
                <CardContent className="p-12 text-center">
                  <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No Analyses Yet</h3>
                  <p className="text-slate-600 mb-4">
                    Start capturing win/loss insights to improve your future proposals
                  </p>
                  <Button onClick={() => navigate(createPageUrl("Pipeline"))}>
                    Go to Pipeline
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}