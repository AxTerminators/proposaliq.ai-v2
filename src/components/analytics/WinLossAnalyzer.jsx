
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Brain,
  Eye,
  Award
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils"; // Assuming cn utility is available here

export default function WinLossAnalyzer({ proposal, organization }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [patternAnalysis, setPatternAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // Fetch all win/loss records for pattern analysis
  const { data: allWinLossRecords = [] } = useQuery({
    queryKey: ['all-winloss', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.WinLossAnalysis.filter({
        organization_id: organization.id
      }, '-decision_date', 50); // Last 50 for pattern analysis
    },
    enabled: !!organization?.id
  });

  const { data: allProposals = [] } = useQuery({
    queryKey: ['all-proposals-for-patterns', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({
        organization_id: organization.id
      }, '-created_date', 100);
    },
    enabled: !!organization?.id
  });

  const runPatternRecognition = async () => {
    if (allWinLossRecords.length < 3) {
      alert("Need at least 3 win/loss records to identify meaningful patterns. Continue using ProposalIQ and capturing outcomes!");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Prepare comprehensive data for AI analysis
      const wonProposals = allWinLossRecords.filter(r => r.outcome === 'won');
      const lostProposals = allWinLossRecords.filter(r => r.outcome === 'lost');

      // Get detailed proposal data
      const proposalDetails = await Promise.all(
        allWinLossRecords.map(async (record) => {
          const props = await base44.entities.Proposal.filter({ id: record.proposal_id });
          return props.length > 0 ? props[0] : null;
        })
      );

      const enrichedRecords = allWinLossRecords.map((record, idx) => ({
        ...record,
        proposal_details: proposalDetails[idx]
      })).filter(r => r.proposal_details);

      // Build AI prompt for pattern recognition
      const prompt = `You are an expert data scientist specializing in government proposal win/loss analysis. Analyze this historical data to identify patterns, correlations, and predictive factors.

**DATASET OVERVIEW:**
- Total Win/Loss Records: ${allWinLossRecords.length}
- Won: ${wonProposals.length} (${((wonProposals.length / allWinLossRecords.length) * 100).toFixed(1)}%)
- Lost: ${lostProposals.length} (${((lostProposals.length / allWinLossRecords.length) * 100).toFixed(1)}%)

**DETAILED RECORDS:**
${enrichedRecords.map(r => `
**${r.outcome.toUpperCase()}** - ${r.proposal_details?.proposal_name}
- Agency: ${r.proposal_details?.agency_name}
- Type: ${r.proposal_details?.project_type}
- Value: ${r.proposal_details?.contract_value ? '$' + r.proposal_details.contract_value.toLocaleString() : 'Unknown'}
- Win Factors: ${r.primary_win_factors?.join(', ') || 'None'}
- Loss Factors: ${r.primary_loss_factors?.join(', ') || 'None'}
- Technical Score: ${r.scoring_breakdown?.technical_score || 'N/A'}
- Price Analysis: Our Price: ${r.price_analysis?.our_price || 'N/A'}, Winning Price: ${r.price_analysis?.winning_price || 'N/A'}
- Competitor: ${r.competitor_won || 'Unknown'}
`).join('\n')}

**YOUR TASK - COMPREHENSIVE PATTERN RECOGNITION:**

1. **Win Patterns**: What characteristics, strategies, or factors consistently appear in won proposals?
2. **Loss Patterns**: What characteristics, strategies, or factors consistently appear in lost proposals?
3. **Agency-Specific Patterns**: Are there patterns specific to certain agencies?
4. **Pricing Patterns**: What pricing strategies or price points lead to wins vs losses?
5. **Technical Score Correlation**: How do technical scores correlate with outcomes?
6. **Competitor Patterns**: Which competitors are hardest to beat? Why?
7. **Project Type Patterns**: Which types of projects have the highest win rates?
8. **Value Range Patterns**: What contract value ranges have the best win rates?
9. **Predictive Factors**: What are the strongest predictors of winning?
10. **Actionable Insights**: What specific actions would improve future win rates?

Return comprehensive JSON analysis.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_win_rate: { type: "number", minimum: 0, maximum: 100 },
            pattern_confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Confidence in identified patterns based on sample size"
            },
            win_patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern_name: { type: "string" },
                  description: { type: "string" },
                  frequency_in_wins: { type: "number", description: "% of wins with this pattern" },
                  frequency_in_losses: { type: "number", description: "% of losses with this pattern" },
                  correlation_strength: { type: "string", enum: ["strong", "moderate", "weak"] },
                  examples: { type: "array", items: { type: "string" } }
                }
              }
            },
            loss_patterns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pattern_name: { type: "string" },
                  description: { type: "string" },
                  frequency_in_losses: { type: "number" },
                  frequency_in_wins: { type: "number" },
                  correlation_strength: { type: "string", enum: ["strong", "moderate", "weak"] },
                  examples: { type: "array", items: { type: "string" } }
                }
              }
            },
            agency_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  agency_name: { type: "string" },
                  win_rate: { type: "number" },
                  total_bids: { type: "number" },
                  avg_contract_value: { type: "number" },
                  key_success_factors: { type: "array", items: { type: "string" } },
                  challenges: { type: "array", items: { type: "string" } }
                }
              }
            },
            pricing_insights: {
              type: "object",
              properties: {
                optimal_price_range: {
                  type: "object",
                  properties: {
                    min: { type: "number" },
                    max: { type: "number" },
                    win_rate_in_range: { type: "number" }
                  }
                },
                price_sensitivity: { 
                  type: "string",
                  enum: ["very_high", "high", "moderate", "low"]
                },
                pricing_strategy_performance: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      strategy: { type: "string" },
                      win_rate: { type: "number" },
                      sample_size: { type: "number" }
                    }
                  }
                },
                avg_price_differential_on_wins: { 
                  type: "number",
                  description: "Avg % difference from winning price when we win"
                },
                avg_price_differential_on_losses: { 
                  type: "number",
                  description: "Avg % difference from winning price when we lose"
                }
              }
            },
            competitor_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  competitor_name: { type: "string" },
                  times_competed: { type: "number" },
                  their_win_rate: { type: "number" },
                  our_win_rate_against_them: { type: "number" },
                  their_typical_advantages: { type: "array", items: { type: "string" } },
                  how_to_beat_them: { type: "array", items: { type: "string" } }
                }
              }
            },
            predictive_factors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  factor_name: { type: "string" },
                  predictive_power: { 
                    type: "string",
                    enum: ["very_strong", "strong", "moderate", "weak"]
                  },
                  description: { type: "string" },
                  actionable: { type: "boolean" },
                  recommendation: { type: "string" }
                }
              },
              description: "Top 10 predictive factors ranked by strength"
            },
            project_type_performance: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  project_type: { type: "string" },
                  win_rate: { type: "number" },
                  total_bids: { type: "number" },
                  avg_value: { type: "number" },
                  success_factors: { type: "array", items: { type: "string" } }
                }
              }
            },
            value_range_performance: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  range_label: { type: "string" },
                  min_value: { type: "number" },
                  max_value: { type: "number" },
                  win_rate: { type: "number" },
                  total_bids: { type: "number" }
                }
              }
            },
            strategic_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  category: { type: "string" },
                  recommendation: { type: "string" },
                  expected_impact: { type: "string" },
                  implementation_difficulty: { type: "string", enum: ["easy", "moderate", "difficult"] },
                  estimated_win_rate_improvement: { type: "number" }
                }
              },
              description: "Top 10 strategic recommendations"
            },
            red_flags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  red_flag: { type: "string" },
                  frequency_in_losses: { type: "number" },
                  description: { type: "string" },
                  how_to_avoid: { type: "string" }
                }
              }
            },
            green_flags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  green_flag: { type: "string" },
                  frequency_in_wins: { type: "number" },
                  description: { type: "string" },
                  how_to_replicate: { type: "string" }
                }
              }
            }
          },
          required: [
            "overall_win_rate",
            "pattern_confidence",
            "win_patterns",
            "loss_patterns",
            "predictive_factors",
            "strategic_recommendations"
          ]
        }
      });

      setPatternAnalysis(result);
      alert("✓ Pattern analysis complete! Discovered " + result.predictive_factors.length + " predictive factors.");

    } catch (err) {
      console.error("Error analyzing patterns:", err);
      setError(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getCorrelationColor = (strength) => {
    const colors = {
      strong: "text-green-600 bg-green-100",
      moderate: "text-yellow-600 bg-yellow-100",
      weak: "text-orange-600 bg-orange-100"
    };
    return colors[strength] || colors.weak;
  };

  const getPredictivePowerColor = (power) => {
    const colors = {
      very_strong: "bg-green-600 text-white",
      strong: "bg-blue-600 text-white",
      moderate: "bg-yellow-600 text-white",
      weak: "bg-orange-600 text-white"
    };
    return colors[power] || colors.weak;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Win/Loss Pattern Recognition</CardTitle>
                <CardDescription>
                  ML-powered analysis to identify success patterns and predictive factors
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={runPatternRecognition}
              disabled={analyzing || allWinLossRecords.length < 3}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Patterns...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Patterns
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Data Status */}
      {allWinLossRecords.length < 3 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Need at least 3 win/loss records to identify patterns. Current: {allWinLossRecords.length}. 
            Complete more proposals and capture outcomes to unlock pattern recognition.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Pattern Analysis Results */}
      {patternAnalysis && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="win-patterns">Win Patterns</TabsTrigger>
            <TabsTrigger value="loss-patterns">Loss Patterns</TabsTrigger>
            <TabsTrigger value="predictive">Predictive Factors</TabsTrigger>
            <TabsTrigger value="insights">Strategic Insights</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Win Rate Stats */}
            <Card className="border-none shadow-xl">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="inline-block p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-4">
                    <p className="text-7xl font-bold text-indigo-600 mb-2">
                      {patternAnalysis.overall_win_rate}%
                    </p>
                    <p className="text-sm text-slate-600 uppercase tracking-wider">Overall Win Rate</p>
                  </div>
                  <Badge className={cn(
                    "text-white text-base px-4 py-2",
                    patternAnalysis.pattern_confidence === 'high' ? 'bg-green-600' :
                    patternAnalysis.pattern_confidence === 'medium' ? 'bg-yellow-600' :
                    'bg-orange-600'
                  )}>
                    {patternAnalysis.pattern_confidence.toUpperCase()} CONFIDENCE
                  </Badge>
                </div>

                {/* Performance by Category */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Project Type Performance */}
                  {patternAnalysis.project_type_performance && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Performance by Project Type</h4>
                      <div className="space-y-2">
                        {patternAnalysis.project_type_performance.map((type, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-slate-900">{type.project_type}</span>
                              <Badge className={
                                type.win_rate >= 70 ? 'bg-green-100 text-green-800' :
                                type.win_rate >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {type.win_rate}% Win Rate
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600">{type.total_bids} bids • Avg: ${(type.avg_value / 1000).toFixed(0)}K</p>
                            <Progress value={type.win_rate} className="h-1 mt-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Value Range Performance */}
                  {patternAnalysis.value_range_performance && (
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-3">Performance by Contract Value</h4>
                      <div className="space-y-2">
                        {patternAnalysis.value_range_performance.map((range, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-slate-900">{range.range_label}</span>
                              <Badge className={
                                range.win_rate >= 70 ? 'bg-green-100 text-green-800' :
                                range.win_rate >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {range.win_rate}% Win Rate
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600">{range.total_bids} bids</p>
                            <Progress value={range.win_rate} className="h-1 mt-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Red Flags & Green Flags */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-lg text-red-900 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Red Flags (Avoid These)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patternAnalysis.red_flags?.map((flag, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border-2 border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-red-900">{flag.red_flag}</h5>
                          <Badge className="bg-red-600 text-white">
                            {flag.frequency_in_losses}% of losses
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 mb-2">{flag.description}</p>
                        <p className="text-sm text-green-800">
                          <strong>How to avoid:</strong> {flag.how_to_avoid}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Green Flags (Replicate These)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patternAnalysis.green_flags?.map((flag, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border-2 border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-semibold text-green-900">{flag.green_flag}</h5>
                          <Badge className="bg-green-600 text-white">
                            {flag.frequency_in_wins}% of wins
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 mb-2">{flag.description}</p>
                        <p className="text-sm text-blue-800">
                          <strong>How to replicate:</strong> {flag.how_to_replicate}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Win Patterns Tab */}
          <TabsContent value="win-patterns" className="space-y-4">
            {patternAnalysis.win_patterns?.map((pattern, idx) => (
              <Card key={idx} className="border-green-200 bg-green-50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-green-900 text-lg">{pattern.pattern_name}</h3>
                        <Badge className={getCorrelationColor(pattern.correlation_strength)}>
                          {pattern.correlation_strength} correlation
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 mb-3">{pattern.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-slate-600 mb-1">Frequency in Wins</p>
                          <p className="text-2xl font-bold text-green-600">{pattern.frequency_in_wins}%</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-slate-600 mb-1">Frequency in Losses</p>
                          <p className="text-2xl font-bold text-red-600">{pattern.frequency_in_losses}%</p>
                        </div>
                      </div>

                      {pattern.examples && pattern.examples.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-700 mb-1">Examples:</p>
                          <ul className="text-xs text-slate-600 space-y-1">
                            {pattern.examples.map((example, i) => (
                              <li key={i}>• {example}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Loss Patterns Tab */}
          <TabsContent value="loss-patterns" className="space-y-4">
            {patternAnalysis.loss_patterns?.map((pattern, idx) => (
              <Card key={idx} className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h3 className="font-semibold text-red-900 text-lg">{pattern.pattern_name}</h3>
                        <Badge className={getCorrelationColor(pattern.correlation_strength)}>
                          {pattern.correlation_strength} correlation
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 mb-3">{pattern.description}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-slate-600 mb-1">Frequency in Losses</p>
                          <p className="text-2xl font-bold text-red-600">{pattern.frequency_in_losses}%</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-xs text-slate-600 mb-1">Frequency in Wins</p>
                          <p className="text-2xl font-bold text-green-600">{pattern.frequency_in_wins}%</p>
                        </div>
                      </div>

                      {pattern.examples && pattern.examples.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-700 mb-1">Examples:</p>
                          <ul className="text-xs text-slate-600 space-y-1">
                            {pattern.examples.map((example, i) => (
                              <li key={i}>• {example}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Predictive Factors Tab */}
          <TabsContent value="predictive" className="space-y-4">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Top Predictive Factors</CardTitle>
                <CardDescription>
                  Factors with the strongest correlation to winning (ranked by predictive power)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {patternAnalysis.predictive_factors?.map((factor, idx) => (
                    <div key={idx} className="p-4 border-2 rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-slate-900">{factor.factor_name}</h4>
                            <Badge className={getPredictivePowerColor(factor.predictive_power)}>
                              {factor.predictive_power.replace(/_/g, ' ').toUpperCase()}
                            </Badge>
                            {factor.actionable && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <Target className="w-3 h-3 mr-1" />
                                Actionable
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{factor.description}</p>
                          {factor.recommendation && (
                            <p className="text-sm text-indigo-700">
                              <strong>→ Action:</strong> {factor.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pricing Insights */}
            {patternAnalysis.pricing_insights && (
              <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-600" />
                    Pricing Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {patternAnalysis.pricing_insights.optimal_price_range && (
                    <div className="p-4 bg-white rounded-lg">
                      <h5 className="font-semibold text-slate-900 mb-2">Optimal Price Range</h5>
                      <p className="text-3xl font-bold text-green-600 mb-1">
                        ${(patternAnalysis.pricing_insights.optimal_price_range.min / 1000).toFixed(0)}K - 
                        ${(patternAnalysis.pricing_insights.optimal_price_range.max / 1000).toFixed(0)}K
                      </p>
                      <p className="text-sm text-slate-600">
                        {patternAnalysis.pricing_insights.optimal_price_range.win_rate}% win rate in this range
                      </p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg">
                      <h5 className="font-semibold text-slate-900 mb-2">Price Sensitivity</h5>
                      <Badge className="text-base px-3 py-1 capitalize">
                        {patternAnalysis.pricing_insights.price_sensitivity?.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {patternAnalysis.pricing_insights.avg_price_differential_on_wins !== undefined && (
                      <div className="p-4 bg-white rounded-lg">
                        <h5 className="font-semibold text-slate-900 mb-2">Winning Price Differential</h5>
                        <p className="text-2xl font-bold text-green-600">
                          {patternAnalysis.pricing_insights.avg_price_differential_on_wins > 0 ? '+' : ''}
                          {patternAnalysis.pricing_insights.avg_price_differential_on_wins.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-600">vs competitors when we win</p>
                      </div>
                    )}
                  </div>

                  {patternAnalysis.pricing_insights.pricing_strategy_performance && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-2">Strategy Performance</h5>
                      <div className="space-y-2">
                        {patternAnalysis.pricing_insights.pricing_strategy_performance.map((strat, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white rounded">
                            <span className="text-sm text-slate-700">{strat.strategy}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">({strat.sample_size} bids)</span>
                              <Badge className={
                                strat.win_rate >= 60 ? 'bg-green-100 text-green-800' :
                                strat.win_rate >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }>
                                {strat.win_rate}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Strategic Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Strategic Recommendations</CardTitle>
                <CardDescription>
                  Data-driven recommendations to improve your win rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {patternAnalysis.strategic_recommendations?.map((rec, idx) => (
                    <div key={idx} className="p-4 border-2 rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge className={cn(
                              "text-white",
                              rec.priority === 'high' ? 'bg-red-600' :
                              rec.priority === 'medium' ? 'bg-yellow-600' :
                              'bg-green-600'
                            )}>
                              {rec.priority.toUpperCase()} PRIORITY
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {rec.category}
                            </Badge>
                            <Badge className={
                              rec.implementation_difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              rec.implementation_difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {rec.implementation_difficulty} to implement
                            </Badge>
                          </div>
                          
                          <p className="font-semibold text-slate-900 mb-2">{rec.recommendation}</p>
                          <p className="text-sm text-slate-600 mb-2">{rec.expected_impact}</p>
                          
                          {rec.estimated_win_rate_improvement && (
                            <div className="flex items-center gap-2 mt-2">
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-green-700">
                                +{rec.estimated_win_rate_improvement}% projected win rate improvement
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Agency Insights */}
            {patternAnalysis.agency_insights && patternAnalysis.agency_insights.length > 0 && (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle>Agency-Specific Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patternAnalysis.agency_insights.map((agency, idx) => (
                      <div key={idx} className="p-4 border-2 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-slate-900">{agency.agency_name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={
                              agency.win_rate >= 60 ? 'bg-green-100 text-green-800' :
                              agency.win_rate >= 40 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {agency.win_rate}% Win Rate
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {agency.total_bids} bids
                            </Badge>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-semibold text-green-900 mb-1">Success Factors:</p>
                            <ul className="text-xs text-slate-700 space-y-1">
                              {agency.key_success_factors?.map((factor, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                  {factor}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-red-900 mb-1">Challenges:</p>
                            <ul className="text-xs text-slate-700 space-y-1">
                              {agency.challenges?.map((challenge, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <AlertCircle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                                  {challenge}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Competitors Tab */}
          <TabsContent value="competitors" className="space-y-4">
            {patternAnalysis.competitor_insights && patternAnalysis.competitor_insights.length > 0 ? (
              patternAnalysis.competitor_insights.map((comp, idx) => (
                <Card key={idx} className="border-2 hover:shadow-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold text-slate-900 text-lg">{comp.competitor_name}</h3>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={
                          comp.our_win_rate_against_them >= 60 ? 'bg-green-600 text-white' :
                          comp.our_win_rate_against_them >= 40 ? 'bg-yellow-600 text-white' :
                          'bg-red-600 text-white'
                        }>
                          {comp.our_win_rate_against_them}% Our Win Rate
                        </Badge>
                        <span className="text-xs text-slate-500">{comp.times_competed} competitions</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-slate-600 mb-1">Their Win Rate Against Us:</p>
                      <div className="flex items-center gap-3">
                        <Progress value={comp.their_win_rate} className="h-2 flex-1" />
                        <span className="text-lg font-bold text-slate-900">{comp.their_win_rate}%</span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <h5 className="font-semibold text-red-900 mb-2 text-sm">Their Advantages:</h5>
                        <ul className="text-xs text-slate-700 space-y-1">
                          {comp.their_typical_advantages?.map((adv, i) => (
                            <li key={i}>• {adv}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <h5 className="font-semibold text-green-900 mb-2 text-sm">How to Beat Them:</h5>
                        <ul className="text-xs text-slate-700 space-y-1">
                          {comp.how_to_beat_them?.map((strategy, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <Target className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                              {strategy}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Eye className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">
                    No competitor data available. Track competitors in your win/loss records to see insights.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!analyzing && !patternAnalysis && allWinLossRecords.length >= 3 && (
        <Card className="border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Ready for Pattern Analysis
            </h3>
            <p className="text-slate-600 mb-6">
              You have {allWinLossRecords.length} win/loss records. Click "Analyze Patterns" to discover what drives your success.
            </p>
            <Button
              onClick={runPatternRecognition}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
