
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  DollarSign, 
  Loader2, 
  Sparkles, 
  AlertCircle,
  Calendar,
  Target,
  BarChart3,
  TrendingDown
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PredictiveAnalytics({ organization }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [error, setError] = useState(null);

  const { data: proposals = [] } = useQuery({
    queryKey: ['all-proposals-for-prediction', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({
        organization_id: organization.id
      }, '-created_date', 200);
    },
    enabled: !!organization?.id
  });

  const { data: winLossRecords = [] } = useQuery({
    queryKey: ['winloss-for-prediction', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.WinLossAnalysis.filter({
        organization_id: organization.id
      }, '-decision_date');
    },
    enabled: !!organization?.id
  });

  const runPredictiveAnalysis = async () => {
    if (proposals.length < 5) {
      alert("Need at least 5 proposals to generate meaningful predictions. Continue using ProposalIQ!");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Prepare time-series data
      const currentDate = new Date();
      const monthlyData = {};

      // Group proposals by month
      proposals.forEach(p => {
        const date = new Date(p.created_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            proposals_created: 0,
            total_value: 0,
            won_value: 0,
            won_count: 0,
            lost_count: 0,
            in_progress: 0
          };
        }
        
        monthlyData[monthKey].proposals_created++;
        monthlyData[monthKey].total_value += p.contract_value || 0;
        
        if (p.status === 'won') {
          monthlyData[monthKey].won_count++;
          monthlyData[monthKey].won_value += p.contract_value || 0;
        } else if (p.status === 'lost') {
          monthlyData[monthKey].lost_count++;
        } else {
          monthlyData[monthKey].in_progress++;
        }
      });

      const timeSeriesData = Object.values(monthlyData).sort((a, b) => 
        a.month.localeCompare(b.month)
      );

      // Current pipeline analysis
      const activePipeline = proposals.filter(p => 
        !['won', 'lost', 'archived'].includes(p.status)
      );

      const pipelineValue = activePipeline.reduce((sum, p) => sum + (p.contract_value || 0), 0);
      
      // Calculate average win rate
      const totalDecided = proposals.filter(p => ['won', 'lost'].includes(p.status)).length;
      const totalWon = proposals.filter(p => p.status === 'won').length;
      const avgWinRate = totalDecided > 0 ? (totalWon / totalDecided) * 100 : 50;

      // Build AI prompt for predictive analysis
      const prompt = `You are an expert data scientist specializing in business forecasting and predictive analytics. Analyze this proposal pipeline and historical data to generate accurate forecasts.

**HISTORICAL DATA:**
${JSON.stringify(timeSeriesData, null, 2)}

**CURRENT PIPELINE:**
- Active Proposals: ${activePipeline.length}
- Total Pipeline Value: $${pipelineValue.toLocaleString()}
- Average Win Rate: ${avgWinRate.toFixed(1)}%
- Total Historical Proposals: ${proposals.length}
- Total Decided: ${totalDecided} (Won: ${totalWon}, Lost: ${totalDecided - totalWon})

**PROPOSAL BREAKDOWN BY STATUS:**
${Object.entries(
  proposals.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {})
).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

**YOUR TASK - TIME-SERIES FORECASTING:**

Generate predictions for the next 6 months including:

1. **Revenue Forecast**: Expected monthly revenue from won proposals
2. **Win Probability**: Likelihood of winning current pipeline proposals
3. **Pipeline Health**: Expected proposal volume and quality trends
4. **Seasonal Patterns**: Identify any seasonal trends in bidding/winning
5. **Risk Assessment**: Identify risks to achieving forecasted numbers
6. **Confidence Intervals**: Provide high/low estimates for forecasts
7. **Leading Indicators**: What current metrics predict future success?
8. **Recommendations**: Strategic actions to improve forecasted outcomes

Use time-series analysis, trend detection, and statistical methods. Return comprehensive JSON.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            forecast_confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Overall confidence in predictions"
            },
            revenue_forecast: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  month: { type: "string", description: "YYYY-MM format" },
                  forecasted_revenue: { type: "number" },
                  low_estimate: { type: "number" },
                  high_estimate: { type: "number" },
                  confidence: { type: "number", minimum: 0, maximum: 100 }
                }
              },
              description: "6-month revenue forecast"
            },
            pipeline_forecast: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  month: { type: "string" },
                  expected_new_proposals: { type: "number" },
                  expected_wins: { type: "number" },
                  expected_losses: { type: "number" },
                  forecasted_pipeline_value: { type: "number" }
                }
              }
            },
            current_pipeline_predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  proposal_id: { type: "string" },
                  proposal_name: { type: "string" },
                  win_probability: { type: "number", minimum: 0, maximum: 100 },
                  expected_close_date: { type: "string" },
                  revenue_impact: { type: "number" },
                  confidence_level: { type: "string", enum: ["high", "medium", "low"] },
                  key_risk_factors: { type: "array", items: { type: "string" } },
                  recommendation: { type: "string" }
                }
              },
              description: "Individual predictions for active proposals"
            },
            seasonal_patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern_name: { type: "string" },
                  description: { type: "string" },
                  peak_months: { type: "array", items: { type: "string" } },
                  low_months: { type: "array", items: { type: "string" } },
                  impact: { type: "string" }
                }
              }
            },
            trend_analysis: {
              type: "object",
              properties: {
                revenue_trend: { 
                  type: "string", 
                  enum: ["strong_growth", "moderate_growth", "stable", "declining", "volatile"] 
                },
                win_rate_trend: {
                  type: "string",
                  enum: ["improving", "stable", "declining"]
                },
                pipeline_value_trend: {
                  type: "string",
                  enum: ["growing", "stable", "shrinking"]
                },
                proposal_volume_trend: {
                  type: "string",
                  enum: ["increasing", "stable", "decreasing"]
                }
              }
            },
            leading_indicators: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  indicator_name: { type: "string" },
                  current_value: { type: "string" },
                  healthy_range: { type: "string" },
                  status: { type: "string", enum: ["healthy", "warning", "critical"] },
                  impact_on_future: { type: "string" },
                  recommendation: { type: "string" }
                }
              },
              description: "Current metrics that predict future performance"
            },
            risk_assessment: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk_type: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  description: { type: "string" },
                  probability: { type: "number", minimum: 0, maximum: 100 },
                  mitigation: { type: "string" }
                }
              }
            },
            strategic_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  recommendation: { type: "string" },
                  expected_impact: { type: "string" },
                  timeline: { type: "string" },
                  forecast_improvement: { type: "number", description: "% improvement in forecasted revenue" }
                }
              }
            },
            summary: {
              type: "object",
              properties: {
                next_6_months_revenue: { type: "number" },
                expected_wins: { type: "number" },
                expected_losses: { type: "number" },
                pipeline_health: { type: "string", enum: ["excellent", "good", "fair", "poor"] },
                key_message: { type: "string" }
              }
            }
          },
          required: [
            "forecast_confidence",
            "revenue_forecast",
            "pipeline_forecast",
            "trend_analysis",
            "leading_indicators",
            "strategic_recommendations",
            "summary"
          ]
        }
      });

      setPredictions(result);
      alert("✓ Predictive analysis complete!");

    } catch (err) {
      console.error("Error running predictive analysis:", err);
      setError(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatCurrency = (value) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Predictive Analytics</CardTitle>
                <CardDescription>
                  AI-powered forecasting for revenue, win probability, and pipeline health
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={runPredictiveAnalysis}
              disabled={analyzing || proposals.length < 5}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Forecasting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Forecast
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {proposals.length < 5 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Need at least 5 proposals to generate predictions. Current: {proposals.length}. Continue building proposals!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Predictions Display */}
      {predictions && (
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Forecast</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline Forecast</TabsTrigger>
            <TabsTrigger value="indicators">Leading Indicators</TabsTrigger>
            <TabsTrigger value="recommendations">Actions</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-6 text-center">
                  <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-green-600 mb-1">
                    {formatCurrency(predictions.summary.next_6_months_revenue)}
                  </p>
                  <p className="text-sm text-green-900">Forecasted Revenue (6mo)</p>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-6 text-center">
                  <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-600 mb-1">
                    {predictions.summary.expected_wins}
                  </p>
                  <p className="text-sm text-blue-900">Expected Wins</p>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <Badge className={`text-white text-base px-4 py-2 capitalize ${
                    predictions.summary.pipeline_health === 'excellent' ? 'bg-green-600' :
                    predictions.summary.pipeline_health === 'good' ? 'bg-blue-600' :
                    predictions.summary.pipeline_health === 'fair' ? 'bg-yellow-600' :
                    'bg-red-600'
                  }`}>
                    {predictions.summary.pipeline_health}
                  </Badge>
                  <p className="text-sm text-purple-900 mt-2">Pipeline Health</p>
                </CardContent>
              </Card>
            </div>

            {/* Key Message */}
            <Card className="border-none shadow-xl">
              <CardContent className="p-6">
                <p className="text-lg text-slate-700 leading-relaxed">
                  {predictions.summary.key_message}
                </p>
              </CardContent>
            </Card>

            {/* Trend Analysis */}
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Trend Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Revenue Trend</span>
                      {predictions.trend_analysis.revenue_trend.includes('growth') ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : predictions.trend_analysis.revenue_trend === 'declining' ? (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      ) : (
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <Badge className={
                      predictions.trend_analysis.revenue_trend.includes('growth') ? 'bg-green-100 text-green-800' :
                      predictions.trend_analysis.revenue_trend === 'stable' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {predictions.trend_analysis.revenue_trend.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Win Rate Trend</span>
                      {predictions.trend_analysis.win_rate_trend === 'improving' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : predictions.trend_analysis.win_rate_trend === 'declining' ? (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      ) : (
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <Badge className={
                      predictions.trend_analysis.win_rate_trend === 'improving' ? 'bg-green-100 text-green-800' :
                      predictions.trend_analysis.win_rate_trend === 'stable' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {predictions.trend_analysis.win_rate_trend.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Pipeline Value</span>
                      {predictions.trend_analysis.pipeline_value_trend === 'growing' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : predictions.trend_analysis.pipeline_value_trend === 'shrinking' ? (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      ) : (
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <Badge className={
                      predictions.trend_analysis.pipeline_value_trend === 'growing' ? 'bg-green-100 text-green-800' :
                      predictions.trend_analysis.pipeline_value_trend === 'stable' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {predictions.trend_analysis.pipeline_value_trend.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Proposal Volume</span>
                      {predictions.trend_analysis.proposal_volume_trend === 'increasing' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : predictions.trend_analysis.proposal_volume_trend === 'decreasing' ? (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      ) : (
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <Badge className={
                      predictions.trend_analysis.proposal_volume_trend === 'increasing' ? 'bg-green-100 text-green-800' :
                      predictions.trend_analysis.proposal_volume_trend === 'stable' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {predictions.trend_analysis.proposal_volume_trend.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seasonal Patterns */}
            {predictions.seasonal_patterns && predictions.seasonal_patterns.length > 0 && (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Seasonal Patterns Detected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {predictions.seasonal_patterns.map((pattern, idx) => (
                      <div key={idx} className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <h5 className="font-semibold text-indigo-900 mb-2">{pattern.pattern_name}</h5>
                        <p className="text-sm text-slate-700 mb-2">{pattern.description}</p>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="font-medium text-green-900">Peak Months:</span>
                            <p className="text-slate-600">{pattern.peak_months?.join(', ')}</p>
                          </div>
                          <div>
                            <span className="font-medium text-orange-900">Low Months:</span>
                            <p className="text-slate-600">{pattern.low_months?.join(', ')}</p>
                          </div>
                        </div>
                        <p className="text-sm text-indigo-700 mt-2">
                          <strong>Impact:</strong> {pattern.impact}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Revenue Forecast Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>6-Month Revenue Forecast</CardTitle>
                <CardDescription>
                  Expected revenue from proposal wins with confidence intervals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={predictions.revenue_forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="forecasted_revenue" stroke="#3b82f6" strokeWidth={3} name="Forecast" />
                    <Line type="monotone" dataKey="high_estimate" stroke="#10b981" strokeDasharray="5 5" name="High" />
                    <Line type="monotone" dataKey="low_estimate" stroke="#ef4444" strokeDasharray="5 5" name="Low" />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mt-6 space-y-2">
                  {predictions.revenue_forecast?.map((month, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{month.month}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600">
                            {formatCurrency(month.low_estimate)} - {formatCurrency(month.high_estimate)}
                          </span>
                          <span className="text-lg font-bold text-blue-600">
                            {formatCurrency(month.forecasted_revenue)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {month.confidence}% confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pipeline Forecast Tab */}
          <TabsContent value="pipeline" className="space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Pipeline Volume Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={predictions.pipeline_forecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="expected_new_proposals" fill="#3b82f6" name="New Proposals" />
                    <Bar dataKey="expected_wins" fill="#10b981" name="Expected Wins" />
                    <Bar dataKey="expected_losses" fill="#ef4444" name="Expected Losses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Individual Proposal Predictions */}
            {predictions.current_pipeline_predictions && predictions.current_pipeline_predictions.length > 0 && (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle>Current Pipeline Predictions</CardTitle>
                  <CardDescription>Win probability for active proposals</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {predictions.current_pipeline_predictions.map((pred, idx) => (
                      <div key={idx} className="p-4 border-2 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900">{pred.proposal_name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-white ${
                              pred.win_probability >= 70 ? 'bg-green-600' :
                              pred.win_probability >= 50 ? 'bg-blue-600' :
                              pred.win_probability >= 30 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}>
                              {pred.win_probability}% Win Probability
                            </Badge>
                            <Badge className={
                              pred.confidence_level === 'high' ? 'bg-green-100 text-green-800' :
                              pred.confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-orange-100 text-orange-800'
                            }>
                              {pred.confidence_level} confidence
                            </Badge>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 mb-3">
                          <div className="text-sm">
                            <span className="text-slate-600">Expected Close:</span>
                            <span className="font-medium text-slate-900 ml-2">{pred.expected_close_date}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-slate-600">Revenue Impact:</span>
                            <span className="font-medium text-green-600 ml-2">{formatCurrency(pred.revenue_impact)}</span>
                          </div>
                        </div>

                        {pred.key_risk_factors && pred.key_risk_factors.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-semibold text-slate-700 mb-1">Risk Factors:</p>
                            <div className="flex flex-wrap gap-1">
                              {pred.key_risk_factors.map((risk, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {risk}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-sm text-indigo-700">
                          <strong>→</strong> {pred.recommendation}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Leading Indicators Tab */}
          <TabsContent value="indicators" className="space-y-4">
            {predictions.leading_indicators?.map((indicator, idx) => (
              <Card key={idx} className={`border-2 ${
                indicator.status === 'healthy' ? 'border-green-200 bg-green-50' :
                indicator.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{indicator.indicator_name}</h4>
                        <Badge className={`text-white ${
                          indicator.status === 'healthy' ? 'bg-green-600' :
                          indicator.status === 'warning' ? 'bg-yellow-600' :
                          'bg-red-600'
                        }`}>
                          {indicator.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div>
                          <span className="text-slate-600">Current:</span>
                          <span className="font-medium text-slate-900 ml-2">{indicator.current_value}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Healthy Range:</span>
                          <span className="font-medium text-slate-900 ml-2">{indicator.healthy_range}</span>
                        </div>
                      </div>

                      <p className="text-sm text-slate-700 mb-2">
                        <strong>Future Impact:</strong> {indicator.impact_on_future}
                      </p>
                      <p className="text-sm text-indigo-700">
                        <strong>→ Action:</strong> {indicator.recommendation}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Strategic Recommendations</CardTitle>
                <CardDescription>
                  Data-driven actions to improve forecasted outcomes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictions.strategic_recommendations?.map((rec, idx) => (
                    <div key={idx} className="p-4 border-2 rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`text-white ${
                              rec.priority === 'critical' ? 'bg-red-600' :
                              rec.priority === 'high' ? 'bg-orange-600' :
                              rec.priority === 'medium' ? 'bg-yellow-600' :
                              'bg-green-600'
                            }`}>
                              {rec.priority.toUpperCase()}
                            </Badge>
                            {rec.forecast_improvement && (
                              <Badge className="bg-green-100 text-green-800">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                +{rec.forecast_improvement}% Revenue
                              </Badge>
                            )}
                          </div>
                          
                          <p className="font-semibold text-slate-900 mb-2">{rec.recommendation}</p>
                          <p className="text-sm text-slate-600 mb-2">{rec.expected_impact}</p>
                          <p className="text-xs text-slate-500">Timeline: {rec.timeline}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            {predictions.risk_assessment && predictions.risk_assessment.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-900">Forecast Risks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {predictions.risk_assessment.map((risk, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border-2 border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-slate-900">{risk.risk_type}</h5>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-white ${
                              risk.severity === 'critical' ? 'bg-red-600' :
                              risk.severity === 'high' ? 'bg-orange-600' :
                              risk.severity === 'medium' ? 'bg-yellow-600' :
                              'bg-green-600'
                            }`}>
                              {risk.severity}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {risk.probability}% probability
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 mb-2">{risk.description}</p>
                        <p className="text-sm text-green-800">
                          <strong>Mitigation:</strong> {risk.mitigation}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!analyzing && !predictions && proposals.length >= 5 && (
        <Card className="border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Ready for Predictive Analysis
            </h3>
            <p className="text-slate-600 mb-6">
              You have {proposals.length} proposals. Generate AI-powered forecasts for the next 6 months.
            </p>
            <Button
              onClick={runPredictiveAnalysis}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Forecast
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
