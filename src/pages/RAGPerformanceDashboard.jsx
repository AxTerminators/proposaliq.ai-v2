import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Star, 
  FileText, 
  Award,
  BarChart3,
  Target,
  Zap,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function RAGPerformanceDashboard() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: organization } = useQuery({
    queryKey: ['organization', user?.email],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.filter(
        { created_by: user.email },
        '-created_date',
        1
      );
      return orgs[0];
    },
    enabled: !!user
  });

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ['rag-feedback', organization?.id],
    queryFn: async () => {
      return await base44.entities.ContentQualityFeedback.filter(
        { organization_id: organization.id },
        '-created_date',
        500
      );
    },
    enabled: !!organization
  });

  if (!organization || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const totalFeedback = feedback.length;
  const withRAG = feedback.filter(f => f.used_rag).length;
  const withoutRAG = totalFeedback - withRAG;

  const avgRatingWithRAG = withRAG > 0
    ? feedback.filter(f => f.used_rag).reduce((sum, f) => sum + f.quality_rating, 0) / withRAG
    : 0;

  const avgRatingWithoutRAG = withoutRAG > 0
    ? feedback.filter(f => !f.used_rag).reduce((sum, f) => sum + f.quality_rating, 0) / withoutRAG
    : 0;

  const ragImprovement = avgRatingWithRAG > 0 
    ? ((avgRatingWithRAG - avgRatingWithoutRAG) / avgRatingWithoutRAG * 100)
    : 0;

  // Rating distribution
  const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
    rating: `${rating} Star${rating !== 1 ? 's' : ''}`,
    withRAG: feedback.filter(f => f.used_rag && f.quality_rating === rating).length,
    withoutRAG: feedback.filter(f => !f.used_rag && f.quality_rating === rating).length
  }));

  // Section type performance
  const sectionPerformance = {};
  feedback.forEach(f => {
    if (!f.section_type) return;
    if (!sectionPerformance[f.section_type]) {
      sectionPerformance[f.section_type] = { total: 0, sum: 0, count: 0 };
    }
    sectionPerformance[f.section_type].sum += f.quality_rating;
    sectionPerformance[f.section_type].count += 1;
  });

  const sectionData = Object.entries(sectionPerformance).map(([type, data]) => ({
    section: type.replace('_', ' '),
    avgRating: (data.sum / data.count).toFixed(2),
    count: data.count
  })).sort((a, b) => b.avgRating - a.avgRating);

  // Token efficiency
  const avgTokensUsed = feedback.filter(f => f.estimated_tokens_used > 0)
    .reduce((sum, f) => sum + f.estimated_tokens_used, 0) / 
    Math.max(1, feedback.filter(f => f.estimated_tokens_used > 0).length);

  // Top performing references
  const referenceUsage = {};
  feedback.forEach(f => {
    if (!f.reference_proposal_ids || f.reference_proposal_ids.length === 0) return;
    f.reference_proposal_ids.forEach(refId => {
      if (!referenceUsage[refId]) {
        referenceUsage[refId] = { count: 0, totalRating: 0, ratings: [] };
      }
      referenceUsage[refId].count += 1;
      referenceUsage[refId].totalRating += f.quality_rating;
      referenceUsage[refId].ratings.push(f.quality_rating);
    });
  });

  const topReferences = Object.entries(referenceUsage)
    .map(([id, data]) => ({
      id,
      count: data.count,
      avgRating: (data.totalRating / data.count).toFixed(2)
    }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 5);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            RAG Performance Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Quality metrics and continuous learning insights
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
                <FileText className="w-4 h-4" />
                Total Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">{totalFeedback}</p>
              <p className="text-xs text-slate-500 mt-1">
                {withRAG} with RAG, {withoutRAG} without
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                <Star className="w-4 h-4" />
                Avg Rating (RAG)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">
                {avgRatingWithRAG.toFixed(2)}
              </p>
              <p className="text-xs text-green-600 mt-1">out of 5.0</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-slate-600">
                <Star className="w-4 h-4" />
                Avg Rating (No RAG)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-700">
                {avgRatingWithoutRAG.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">baseline</p>
            </CardContent>
          </Card>

          <Card className={ragImprovement > 0 ? "border-purple-200 bg-purple-50/30" : "border-slate-200"}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
                <TrendingUp className="w-4 h-4" />
                RAG Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-700">
                {ragImprovement > 0 ? '+' : ''}{ragImprovement.toFixed(1)}%
              </p>
              <p className="text-xs text-purple-600 mt-1">quality boost</p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Rating Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="withRAG" fill="#10b981" name="With RAG" />
                  <Bar dataKey="withoutRAG" fill="#94a3b8" name="Without RAG" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Section Type Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sectionData.slice(0, 6).map((section, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize font-medium">{section.section}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">{section.avgRating}</span>
                        <Badge variant="outline" className="text-xs">
                          {section.count}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={(parseFloat(section.avgRating) / 5) * 100} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Token Efficiency & Reference Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Token Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {avgTokensUsed.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-600">Average tokens per generation</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-lg font-semibold">
                      {feedback.filter(f => f.estimated_tokens_used < 50000).length}
                    </p>
                    <p className="text-xs text-slate-600">Under 50K tokens</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {feedback.filter(f => f.estimated_tokens_used >= 50000).length}
                    </p>
                    <p className="text-xs text-slate-600">Over 50K tokens</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Top Performing References
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topReferences.length > 0 ? (
                  topReferences.map((ref, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-600">#{idx + 1}</Badge>
                        <span className="text-sm font-mono text-slate-700">
                          {ref.id.substring(0, 8)}...
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">{ref.count} uses</span>
                        <Badge className="bg-green-100 text-green-800">
                          ⭐ {ref.avgRating}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No reference data yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <ThumbsUp className="w-5 h-5" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {avgRatingWithRAG > avgRatingWithoutRAG && (
              <div className="flex items-start gap-3 p-3 bg-white rounded border border-green-200">
                <ThumbsUp className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">RAG Improves Quality</p>
                  <p className="text-sm text-green-700">
                    Content generated with reference proposals scores {ragImprovement.toFixed(1)}% higher on average
                  </p>
                </div>
              </div>
            )}
            {sectionData.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-white rounded border border-green-200">
                <Target className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Best Performing Section</p>
                  <p className="text-sm text-green-700">
                    {sectionData[0].section} averages {sectionData[0].avgRating} stars ({sectionData[0].count} generations)
                  </p>
                </div>
              </div>
            )}
            {avgTokensUsed > 0 && (
              <div className="flex items-start gap-3 p-3 bg-white rounded border border-green-200">
                <Zap className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Token Efficiency</p>
                  <p className="text-sm text-green-700">
                    Average context uses {avgTokensUsed.toLocaleString()} tokens per generation
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}