import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye,
  Clock,
  TrendingUp,
  TrendingDown,
  Brain,
  Target,
  Activity,
  Users,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Zap,
  MousePointer,
  Smartphone,
  Monitor,
  Loader2,
  Lightbulb,
  BarChart3
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
import moment from "moment";

export default function ClientInsightsDashboard({ proposal, client }) {
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);

  // Load engagement metrics
  const { data: engagementMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['client-engagement', proposal.id, client.id],
    queryFn: () => base44.entities.ClientEngagementMetric.filter({
      proposal_id: proposal.id,
      client_id: client.id
    }, '-created_date', 500),
    initialData: []
  });

  // Load sections
  const { data: sections } = useQuery({
    queryKey: ['proposal-sections', proposal.id],
    queryFn: () => base44.entities.ProposalSection.filter({ 
      proposal_id: proposal.id 
    }, 'order'),
    initialData: []
  });

  // Load comments/annotations
  const { data: comments } = useQuery({
    queryKey: ['client-comments', proposal.id],
    queryFn: () => base44.entities.ProposalComment.filter({ 
      proposal_id: proposal.id,
      is_from_client: true
    }),
    initialData: []
  });

  const { data: annotations } = useQuery({
    queryKey: ['client-annotations', proposal.id],
    queryFn: () => base44.entities.ProposalAnnotation.filter({ 
      proposal_id: proposal.id,
      client_id: client.id
    }),
    initialData: []
  });

  // Calculate insights
  const calculateInsights = () => {
    if (metricsLoading || engagementMetrics.length === 0) {
      return {
        totalViews: 0,
        totalTimeSpent: 0,
        avgSessionDuration: 0,
        sectionEngagement: [],
        deviceBreakdown: {},
        engagementScore: 0,
        winProbability: 0,
        trends: []
      };
    }

    // Total views
    const totalViews = engagementMetrics.filter(m => m.event_type === 'page_view').length;
    
    // Total time spent (in minutes)
    const totalTimeSpent = engagementMetrics.reduce((sum, m) => sum + (m.time_spent_seconds || 0), 0) / 60;
    
    // Average session duration
    const sessions = [...new Set(engagementMetrics.map(m => m.session_id))];
    const avgSessionDuration = sessions.length > 0 ? totalTimeSpent / sessions.length : 0;

    // Section engagement
    const sectionMetrics = sections.map(section => {
      const sectionEvents = engagementMetrics.filter(m => m.section_id === section.id);
      const views = sectionEvents.filter(m => m.event_type === 'section_view').length;
      const timeSpent = sectionEvents.reduce((sum, m) => sum + (m.time_spent_seconds || 0), 0);
      const avgScrollDepth = sectionEvents.reduce((sum, m) => sum + (m.scroll_depth_percent || 0), 0) / (sectionEvents.length || 1);
      
      return {
        section_name: section.section_name,
        views,
        timeSpent: Math.round(timeSpent / 60), // minutes
        avgScrollDepth: Math.round(avgScrollDepth),
        engagement: views * (timeSpent / 60) * (avgScrollDepth / 100) // weighted score
      };
    }).sort((a, b) => b.engagement - a.engagement);

    // Device breakdown
    const deviceBreakdown = engagementMetrics.reduce((acc, m) => {
      const device = m.device_type || 'unknown';
      acc[device] = (acc[device] || 0) + 1;
      return acc;
    }, {});

    // Engagement score (0-100)
    const maxPossibleScore = sections.length * 10; // 10 points per section
    const actualScore = sectionEngagement.reduce((sum, s) => sum + Math.min(s.engagement, 10), 0);
    const engagementScore = Math.round((actualScore / maxPossibleScore) * 100);

    // Win probability (0-100) - basic heuristic
    let winProbability = 50; // baseline
    
    // Positive signals
    if (totalViews > 5) winProbability += 10;
    if (totalTimeSpent > 30) winProbability += 10;
    if (comments.length > 3) winProbability += 10;
    if (annotations.length > 2) winProbability += 10;
    if (engagementScore > 70) winProbability += 10;
    
    // Negative signals
    if (totalViews < 2) winProbability -= 15;
    if (totalTimeSpent < 10) winProbability -= 15;
    if (engagementScore < 30) winProbability -= 20;
    
    winProbability = Math.max(0, Math.min(100, winProbability));

    // Activity trends (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = moment().subtract(i, 'days').format('MMM D');
      const dayMetrics = engagementMetrics.filter(m => 
        moment(m.created_date).format('MMM D') === date
      );
      last7Days.push({
        date,
        views: dayMetrics.filter(m => m.event_type === 'page_view').length,
        interactions: dayMetrics.filter(m => ['comment_added', 'annotation_created', 'approval_action'].includes(m.event_type)).length
      });
    }

    return {
      totalViews,
      totalTimeSpent: Math.round(totalTimeSpent),
      avgSessionDuration: Math.round(avgSessionDuration),
      sectionEngagement,
      deviceBreakdown,
      engagementScore,
      winProbability,
      trends: last7Days,
      sessions: sessions.length
    };
  };

  const insights = calculateInsights();

  // Generate AI-powered insights
  const generateAIInsights = async () => {
    setGeneratingInsights(true);
    try {
      const prompt = `You are an expert sales analyst. Analyze this client's engagement with a proposal and provide strategic insights.

**CLIENT ENGAGEMENT DATA:**
- Total Views: ${insights.totalViews}
- Total Time Spent: ${insights.totalTimeSpent} minutes
- Average Session Duration: ${insights.avgSessionDuration} minutes
- Engagement Score: ${insights.engagementScore}/100
- Comments/Questions: ${comments.length}
- Annotations: ${annotations.length}
- Approval Actions: ${engagementMetrics.filter(m => m.event_type === 'approval_action').length}

**SECTION ENGAGEMENT:**
${insights.sectionEngagement.slice(0, 5).map(s => 
  `- ${s.section_name}: ${s.views} views, ${s.timeSpent}min, ${s.avgScrollDepth}% scroll depth`
).join('\n')}

**INTERACTION PATTERNS:**
- First viewed: ${proposal.client_last_viewed ? moment(proposal.client_last_viewed).fromNow() : 'Never'}
- Most active on: ${insights.trends.sort((a, b) => b.views - a.views)[0]?.date || 'N/A'}
- Primary device: ${Object.entries(insights.deviceBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown'}

**YOUR TASK:**
Provide a JSON object with actionable insights:

{
  "win_probability": <number 0-100: realistic win probability>,
  "confidence_level": <string: "high", "medium", "low">,
  "key_insights": [
    <string: 3-4 key observations about client behavior>
  ],
  "positive_signals": [
    <string: 2-3 positive indicators>
  ],
  "concerns": [
    <string: 2-3 potential concerns or risks>
  ],
  "recommended_actions": [
    <string: 3-5 specific actions the consultant should take>
  ],
  "hot_sections": [
    <string: which sections are getting most attention and why>
  ],
  "cold_sections": [
    <string: which sections are being ignored>
  ],
  "predicted_questions": [
    <string: 2-3 questions the client is likely to ask>
  ],
  "time_to_decision": <string: estimated timeframe like "3-5 days", "1-2 weeks">,
  "engagement_rating": <string: "excellent", "good", "moderate", "low", "very_low">
}

Be specific, actionable, and data-driven. Focus on what the consultant should DO next.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            win_probability: { type: "number" },
            confidence_level: { type: "string" },
            key_insights: { type: "array", items: { type: "string" } },
            positive_signals: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } },
            recommended_actions: { type: "array", items: { type: "string" } },
            hot_sections: { type: "array", items: { type: "string" } },
            cold_sections: { type: "array", items: { type: "string" } },
            predicted_questions: { type: "array", items: { type: "string" } },
            time_to_decision: { type: "string" },
            engagement_rating: { type: "string" }
          }
        }
      });

      setAiInsights(result);
    } catch (error) {
      console.error("Error generating AI insights:", error);
      alert("Error generating insights. Please try again.");
    } finally {
      setGeneratingInsights(false);
    }
  };

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Client Engagement Insights</h2>
          <p className="text-slate-600">
            {client.contact_name} • {proposal.proposal_name}
          </p>
        </div>
        <Button 
          onClick={generateAIInsights}
          disabled={generatingInsights || insights.totalViews === 0}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          {generatingInsights ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 mr-2" />
              Generate AI Insights
            </>
          )}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-8 h-8 text-blue-500" />
              {insights.totalViews > insights.sessions * 2 && (
                <TrendingUp className="w-5 h-5 text-green-600" />
              )}
            </div>
            <p className="text-3xl font-bold text-slate-900">{insights.totalViews}</p>
            <p className="text-sm text-slate-600">Total Views</p>
            <p className="text-xs text-slate-500 mt-1">{insights.sessions} sessions</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{insights.totalTimeSpent}m</p>
            <p className="text-sm text-slate-600">Time Spent</p>
            <p className="text-xs text-slate-500 mt-1">{insights.avgSessionDuration}m avg/session</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">{insights.engagementScore}</p>
            <p className="text-sm text-slate-600">Engagement Score</p>
            <Progress value={insights.engagementScore} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-amber-500" />
              {insights.winProbability >= 70 ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : insights.winProbability < 40 ? (
                <TrendingDown className="w-5 h-5 text-red-600" />
              ) : null}
            </div>
            <p className="text-3xl font-bold text-amber-600">{insights.winProbability}%</p>
            <p className="text-sm text-slate-600">Win Probability</p>
            <p className="text-xs text-slate-500 mt-1">Based on engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {aiInsights && (
        <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-600" />
              AI-Powered Strategic Insights
            </CardTitle>
            <CardDescription>
              Analysis generated {moment().format('MMM D, YYYY [at] h:mm A')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Win Probability */}
            <div className="p-6 bg-white rounded-lg border-2 border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-slate-600">AI Win Probability</p>
                  <p className="text-4xl font-bold text-purple-600">{aiInsights.win_probability}%</p>
                </div>
                <Badge className={
                  aiInsights.confidence_level === 'high' ? 'bg-green-100 text-green-700' :
                  aiInsights.confidence_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-slate-100 text-slate-700'
                }>
                  {aiInsights.confidence_level} confidence
                </Badge>
              </div>
              <Progress value={aiInsights.win_probability} className="h-3" />
              <div className="flex justify-between mt-2 text-xs text-slate-600">
                <span>Engagement: {aiInsights.engagement_rating}</span>
                <span>Decision ETA: {aiInsights.time_to_decision}</span>
              </div>
            </div>

            {/* Key Insights */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Key Insights
              </h3>
              <div className="space-y-2">
                {aiInsights.key_insights.map((insight, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-slate-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Positive Signals */}
              <div>
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Positive Signals
                </h3>
                <div className="space-y-2">
                  {aiInsights.positive_signals.map((signal, idx) => (
                    <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-green-800">✓ {signal}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Concerns */}
              <div>
                <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Potential Concerns
                </h3>
                <div className="space-y-2">
                  {aiInsights.concerns.map((concern, idx) => (
                    <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm text-red-800">⚠ {concern}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended Actions */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Recommended Actions
              </h3>
              <div className="space-y-2">
                {aiInsights.recommended_actions.map((action, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-200 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-semibold">
                      {idx + 1}
                    </div>
                    <p className="text-sm text-blue-900 flex-1">{action}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section Analysis */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">🔥 Hot Sections</h3>
                <div className="space-y-2">
                  {aiInsights.hot_sections.map((section, idx) => (
                    <div key={idx} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-900">{section}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3">❄️ Cold Sections</h3>
                <div className="space-y-2">
                  {aiInsights.cold_sections.map((section, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-700">{section}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Predicted Questions */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                Predicted Client Questions
              </h3>
              <div className="space-y-2">
                {aiInsights.predicted_questions.map((question, idx) => (
                  <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-900 font-medium">Q: {question}</p>
                    <p className="text-xs text-purple-600 mt-1">Prepare an answer for this likely question</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="sections" className="w-full">
        <TabsList>
          <TabsTrigger value="sections">Section Heatmap</TabsTrigger>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
          <TabsTrigger value="devices">Device Usage</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
        </TabsList>

        {/* Section Heatmap */}
        <TabsContent value="sections">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Section Engagement Heatmap</CardTitle>
              <CardDescription>Which sections are getting the most attention</CardDescription>
            </CardHeader>
            <CardContent>
              {insights.sectionEngagement.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={insights.sectionEngagement}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="section_name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="views" fill="#3b82f6" name="Views" />
                      <Bar dataKey="timeSpent" fill="#8b5cf6" name="Time (min)" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-6 space-y-3">
                    {insights.sectionEngagement.map((section, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-slate-900">{section.section_name}</p>
                          <Badge variant="outline">{section.views} views</Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-slate-600 mb-2">
                          <span>⏱ {section.timeSpent} minutes</span>
                          <span>📊 {section.avgScrollDepth}% scroll depth</span>
                        </div>
                        <Progress value={section.avgScrollDepth} className="h-2" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Eye className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>No section engagement data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Timeline */}
        <TabsContent value="timeline">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>7-Day Activity Timeline</CardTitle>
              <CardDescription>Client activity over the past week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={insights.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} name="Page Views" />
                  <Line type="monotone" dataKey="interactions" stroke="#10b981" strokeWidth={2} name="Interactions" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Device Usage */}
        <TabsContent value="devices">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Device & Platform Analytics</CardTitle>
              <CardDescription>How clients are accessing the proposal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={Object.entries(insights.deviceBreakdown).map(([name, value]) => ({ name, value }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.keys(insights.deviceBreakdown).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  {Object.entries(insights.deviceBreakdown).map(([device, count], idx) => {
                    const Icon = device === 'mobile' ? Smartphone : Monitor;
                    const total = Object.values(insights.deviceBreakdown).reduce((sum, v) => sum + v, 0);
                    const percentage = ((count / total) * 100).toFixed(1);
                    
                    return (
                      <div key={device} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3 mb-2">
                          <Icon className="w-6 h-6" style={{ color: COLORS[idx % COLORS.length] }} />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 capitalize">{device}</p>
                            <p className="text-sm text-slate-600">{count} sessions • {percentage}%</p>
                          </div>
                        </div>
                        <Progress value={parseFloat(percentage)} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interactions */}
        <TabsContent value="interactions">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Client Interactions</CardTitle>
              <CardDescription>Comments, annotations, and actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 text-center">
                  <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-700">{comments.length}</p>
                  <p className="text-sm text-blue-600">Comments</p>
                </div>
                <div className="p-6 bg-purple-50 rounded-lg border border-purple-200 text-center">
                  <MousePointer className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-purple-700">{annotations.length}</p>
                  <p className="text-sm text-purple-600">Annotations</p>
                </div>
                <div className="p-6 bg-green-50 rounded-lg border border-green-200 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-green-700">
                    {engagementMetrics.filter(m => m.event_type === 'approval_action').length}
                  </p>
                  <p className="text-sm text-green-600">Approval Actions</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-slate-900">Recent Comments</h4>
                {comments.slice(0, 5).map((comment) => (
                  <div key={comment.id} className="p-3 bg-slate-50 rounded-lg border">
                    <p className="text-sm text-slate-700">{comment.content}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {moment(comment.created_date).format('MMM D, YYYY [at] h:mm A')}
                    </p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No comments yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}