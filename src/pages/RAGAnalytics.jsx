import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Award, 
  Sparkles, 
  FileText,
  BarChart3,
  Users,
  Calendar,
  Download,
  Star,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { cn } from "@/lib/utils";
import moment from "moment";

/**
 * RAGAnalytics Page
 * 
 * Comprehensive analytics dashboard for RAG (Retrieval-Augmented Generation) system.
 * 
 * Tracks:
 * - Usage metrics (RAG vs non-RAG generations)
 * - Quality ratings over time
 * - Most valuable reference proposals
 * - Win rate correlation
 * - Token efficiency
 * - Section-type performance
 * - User adoption
 */
export default function RAGAnalytics() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [dateRange, setDateRange] = useState('30'); // days

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const orgs = await base44.entities.Organization.filter(
        { created_by: currentUser.email },
        '-created_date',
        1
      );
      if (orgs.length > 0) {
        setOrganization(orgs[0]);
      }
    };
    loadUser();
  }, []);

  // Fetch quality feedback data
  const { data: qualityFeedback = [], isLoading: feedbackLoading } = useQuery({
    queryKey: ['quality-feedback', organization?.id, dateRange],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange));
      
      const feedback = await base44.entities.ContentQualityFeedback.filter(
        { organization_id: organization.id },
        '-created_date',
        1000
      );
      
      return feedback.filter(f => new Date(f.created_date) >= cutoffDate);
    },
    enabled: !!organization?.id,
    staleTime: 60000
  });

  // Fetch proposals for win rate correlation
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals-for-analytics', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date',
        500
      );
    },
    enabled: !!organization?.id,
    staleTime: 60000
  });

  // Calculate metrics
  const metrics = React.useMemo(() => {
    if (qualityFeedback.length === 0) {
      return {
        total_generations: 0,
        rag_generations: 0,
        non_rag_generations: 0,
        avg_rating_rag: 0,
        avg_rating_non_rag: 0,
        total_tokens_used: 0,
        avg_generation_time: 0
      };
    }

    const ragFeedback = qualityFeedback.filter(f => f.used_rag);
    const nonRagFeedback = qualityFeedback.filter(f => !f.used_rag);

    const avgRagRating = ragFeedback.length > 0
      ? ragFeedback.reduce((sum, f) => sum + f.quality_rating, 0) / ragFeedback.length
      : 0;

    const avgNonRagRating = nonRagFeedback.length > 0
      ? nonRagFeedback.reduce((sum, f) => sum + f.quality_rating, 0) / nonRagFeedback.length
      : 0;

    const totalTokens = qualityFeedback.reduce((sum, f) => sum + (f.estimated_tokens_used || 0), 0);
    
    const avgGenTime = qualityFeedback.filter(f => f.generation_time_seconds).length > 0
      ? qualityFeedback.reduce((sum, f) => sum + (f.generation_time_seconds || 0), 0) / 
        qualityFeedback.filter(f => f.generation_time_seconds).length
      : 0;

    return {
      total_generations: qualityFeedback.length,
      rag_generations: ragFeedback.length,
      non_rag_generations: nonRagFeedback.length,
      rag_percentage: qualityFeedback.length > 0 
        ? Math.round((ragFeedback.length / qualityFeedback.length) * 100)
        : 0,
      avg_rating_rag: avgRagRating.toFixed(2),
      avg_rating_non_rag: avgNonRagRating.toFixed(2),
      rating_improvement: ((avgRagRating - avgNonRagRating) / (avgNonRagRating || 1) * 100).toFixed(1),
      total_tokens_used: totalTokens,
      avg_tokens_per_generation: ragFeedback.length > 0
        ? Math.round(totalTokens / ragFeedback.length)
        : 0,
      avg_generation_time: avgGenTime.toFixed(1)
    };
  }, [qualityFeedback]);

  // Top reference proposals by usage and quality
  const topReferences = React.useMemo(() => {
    const refStats = {};

    qualityFeedback.forEach(f => {
      if (f.used_rag && f.reference_proposal_ids) {
        f.reference_proposal_ids.forEach(refId => {
          if (!refStats[refId]) {
            refStats[refId] = {
              proposal_id: refId,
              usage_count: 0,
              total_rating: 0,
              ratings: []
            };
          }
          refStats[refId].usage_count += 1;
          refStats[refId].total_rating += f.quality_rating;
          refStats[refId].ratings.push(f.quality_rating);
        });
      }
    });

    return Object.values(refStats)
      .map(stat => ({
        ...stat,
        avg_rating: (stat.total_rating / stat.usage_count).toFixed(2)
      }))
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10);
  }, [qualityFeedback]);

  // Quality trend over time
  const qualityTrend = React.useMemo(() => {
    const grouped = {};
    
    qualityFeedback.forEach(f => {
      const date = moment(f.created_date).format('MMM DD');
      if (!grouped[date]) {
        grouped[date] = { date, rag: [], non_rag: [] };
      }
      if (f.used_rag) {
        grouped[date].rag.push(f.quality_rating);
      } else {
        grouped[date].non_rag.push(f.quality_rating);
      }
    });

    return Object.values(grouped)
      .map(day => ({
        date: day.date,
        'With RAG': day.rag.length > 0 
          ? (day.rag.reduce((a, b) => a + b, 0) / day.rag.length).toFixed(2)
          : null,
        'Without RAG': day.non_rag.length > 0 
          ? (day.non_rag.reduce((a, b) => a + b, 0) / day.non_rag.length).toFixed(2)
          : null
      }))
      .slice(-14); // Last 14 days
  }, [qualityFeedback]);

  // Section type performance
  const sectionTypeStats = React.useMemo(() => {
    const stats = {};
    
    qualityFeedback.forEach(f => {
      if (!f.section_type) return;
      
      if (!stats[f.section_type]) {
        stats[f.section_type] = {
          section_type: f.section_type,
          total: 0,
          rag_count: 0,
          avg_rating: 0,
          ratings: []
        };
      }
      
      stats[f.section_type].total += 1;
      if (f.used_rag) stats[f.section_type].rag_count += 1;
      stats[f.section_type].ratings.push(f.quality_rating);
    });

    return Object.values(stats)
      .map(stat => ({
        ...stat,
        avg_rating: (stat.ratings.reduce((a, b) => a + b, 0) / stat.ratings.length).toFixed(2),
        rag_percentage: Math.round((stat.rag_count / stat.total) * 100)
      }))
      .sort((a, b) => b.total - a.total);
  }, [qualityFeedback]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Sparkles className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Loading analytics...</p>
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
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              RAG Analytics Dashboard
            </h1>
            <p className="text-slate-600 mt-1">
              Track AI writing assistant performance and reference proposal effectiveness
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
            
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>

        {feedbackLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-blue-600 mb-3 animate-pulse" />
              <p className="text-slate-600">Loading analytics data...</p>
            </div>
          </div>
        ) : qualityFeedback.length === 0 ? (
          <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
            <CardContent className="p-12 text-center">
              <Sparkles className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                No Data Yet
              </h3>
              <p className="text-slate-600 mb-6">
                Start using the AI Writing Assistant to generate analytics data.
                Quality feedback will appear here once you've generated and rated content.
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Go to Proposal Builder
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Sparkles className="w-8 h-8 text-blue-600" />
                    <Badge className="bg-blue-600 text-white">
                      {metrics.rag_percentage}%
                    </Badge>
                  </div>
                  <p className="text-3xl font-bold text-blue-900">{metrics.rag_generations}</p>
                  <p className="text-sm text-blue-700">RAG-Enhanced Generations</p>
                  <p className="text-xs text-blue-600 mt-1">
                    out of {metrics.total_generations} total
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Star className="w-8 h-8 text-green-600" />
                    {parseFloat(metrics.avg_rating_rag) > parseFloat(metrics.avg_rating_non_rag) && (
                      <Badge className="bg-green-600 text-white">
                        +{metrics.rating_improvement}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-green-900">{metrics.avg_rating_rag}</p>
                  <p className="text-sm text-green-700">Avg Rating (RAG)</p>
                  <p className="text-xs text-green-600 mt-1">
                    vs {metrics.avg_rating_non_rag} without RAG
                  </p>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="w-8 h-8 text-purple-600" />
                    <Badge className="bg-purple-600 text-white">Tokens</Badge>
                  </div>
                  <p className="text-3xl font-bold text-purple-900">
                    {(metrics.total_tokens_used / 1000).toFixed(0)}K
                  </p>
                  <p className="text-sm text-purple-700">Total Tokens Used</p>
                  <p className="text-xs text-purple-600 mt-1">
                    ~{metrics.avg_tokens_per_generation} per generation
                  </p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="w-8 h-8 text-amber-600" />
                    <Badge className="bg-amber-600 text-white">Speed</Badge>
                  </div>
                  <p className="text-3xl font-bold text-amber-900">{metrics.avg_generation_time}s</p>
                  <p className="text-sm text-amber-700">Avg Generation Time</p>
                  <p className="text-xs text-amber-600 mt-1">
                    per content generation
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Quality Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Quality Ratings Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {qualityTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={qualityTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="With RAG" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="Without RAG" 
                          stroke="#94a3b8" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ fill: '#94a3b8', r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-12">
                      Not enough data for trend analysis
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Section Type Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    Performance by Section Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sectionTypeStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={sectionTypeStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="section_type" 
                          tick={{ fontSize: 10 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total" fill="#8b5cf6" name="Total Generations" />
                        <Bar dataKey="rag_count" fill="#3b82f6" name="Used RAG" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-12">
                      No section type data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Reference Proposals Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-600" />
                    Most Valuable Reference Proposals
                  </CardTitle>
                  <Badge className="bg-amber-100 text-amber-800">
                    Top {topReferences.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {topReferences.length > 0 ? (
                  <div className="space-y-2">
                    {topReferences.map((ref, idx) => {
                      // Fetch proposal name (would need to enhance this with actual fetch)
                      const proposalName = proposals.find(p => p.id === ref.proposal_id)?.proposal_name || 'Unknown Proposal';
                      const proposalStatus = proposals.find(p => p.id === ref.proposal_id)?.status;
                      
                      return (
                        <div 
                          key={ref.proposal_id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:border-amber-300 transition-all"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-sm">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">{proposalName}</p>
                              <p className="text-xs text-slate-500">
                                Used {ref.usage_count} time{ref.usage_count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {proposalStatus === 'won' && (
                              <Badge className="bg-green-100 text-green-800 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Won
                              </Badge>
                            )}
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="font-bold text-lg text-amber-900">{ref.avg_rating}</span>
                              </div>
                              <p className="text-xs text-slate-500">avg rating</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No reference usage data yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Rating Distribution */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map(rating => {
                      const count = qualityFeedback.filter(f => f.quality_rating === rating).length;
                      const percentage = metrics.total_generations > 0
                        ? Math.round((count / metrics.total_generations) * 100)
                        : 0;

                      return (
                        <div key={rating} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              <span className="text-slate-700">{rating} star{rating !== 1 ? 's' : ''}</span>
                            </div>
                            <span className="text-slate-600">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full",
                                rating >= 4 ? "bg-green-500" :
                                rating === 3 ? "bg-amber-500" :
                                "bg-red-500"
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Section Type Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Section Type Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {sectionTypeStats.length > 0 ? (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {sectionTypeStats.map(stat => (
                        <div 
                          key={stat.section_type}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg text-sm"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 capitalize">
                              {stat.section_type.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-slate-500">
                              {stat.total} generation{stat.total !== 1 ? 's' : ''} • {stat.rag_percentage}% used RAG
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-500" />
                            <span className="font-bold text-amber-900">{stat.avg_rating}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-8">
                      No section data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Key Insights */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Sparkles className="w-5 h-5" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {parseFloat(metrics.avg_rating_rag) > parseFloat(metrics.avg_rating_non_rag) && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900">
                        RAG improves content quality by {metrics.rating_improvement}%
                      </p>
                      <p className="text-sm text-green-800">
                        Content generated with reference proposals scores {metrics.rating_improvement}% higher on average
                      </p>
                    </div>
                  </div>
                )}

                {metrics.rag_percentage >= 70 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900">
                        High RAG adoption: {metrics.rag_percentage}%
                      </p>
                      <p className="text-sm text-blue-800">
                        Your team is effectively leveraging reference proposals for better content
                      </p>
                    </div>
                  </div>
                )}

                {topReferences.length > 0 && parseFloat(topReferences[0].avg_rating) >= 4.5 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <Award className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">
                        Star reference identified
                      </p>
                      <p className="text-sm text-amber-800">
                        {proposals.find(p => p.id === topReferences[0].proposal_id)?.proposal_name || 'Top reference'} 
                        {' '}consistently produces high-quality content ({topReferences[0].avg_rating}/5 rating)
                      </p>
                    </div>
                  </div>
                )}

                {metrics.rag_percentage < 30 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-900">
                        Low RAG adoption
                      </p>
                      <p className="text-sm text-red-800">
                        Only {metrics.rag_percentage}% of generations use reference proposals. 
                        Link more references to improve content quality.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}