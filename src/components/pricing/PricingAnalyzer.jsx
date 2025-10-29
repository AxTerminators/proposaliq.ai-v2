import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Brain,
  Award
} from "lucide-react";

export default function PricingAnalyzer({ proposalId, organizationId, proposalData, clins, pricingStrategy, totalCost, totalPrice }) {
  const queryClient = useQueryClient();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  const createStrategyMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.PricingStrategy.create({
        ...data,
        proposal_id: proposalId,
        organization_id: organizationId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-strategy'] });
    }
  });

  const updateStrategyMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.entities.PricingStrategy.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-strategy'] });
    }
  });

  const runPricingAnalysis = async () => {
    if (!proposalId || clins.length === 0) {
      alert("Please add at least one CLIN with labor/ODC data before running analysis");
      return;
    }

    setIsAnalyzing(true);
    try {
      const clinDetails = clins.map(c => ({
        clin_number: c.clin_number,
        clin_title: c.clin_title,
        period: c.period_of_performance,
        labor_cost: c.labor_cost || 0,
        odc_cost: c.odc_cost || 0,
        total_cost: c.total_cost || 0,
        fee_percentage: c.fee_percentage,
        total_price: c.total_price || 0
      }));

      const prompt = `You are an expert government contracting pricing strategist with deep knowledge of federal procurement pricing strategies, competitive analysis, and price-to-win methodologies.

**PROPOSAL DETAILS:**
- Project Type: ${proposalData.project_type}
- Agency: ${proposalData.agency_name}
- Solicitation: ${proposalData.solicitation_number || 'N/A'}
- Project Title: ${proposalData.project_title}
- Proposal Name: ${proposalData.proposal_name}

**CURRENT PRICING:**
- Total Cost: $${totalCost.toLocaleString()}
- Total Price: $${totalPrice.toLocaleString()}
- Implied Fee: $${(totalPrice - totalCost).toLocaleString()} (${totalCost > 0 ? ((totalPrice - totalCost) / totalCost * 100).toFixed(2) : 0}%)

**CLINs BREAKDOWN:**
${clinDetails.map(c => `- ${c.clin_number}: ${c.clin_title} | Cost: $${c.total_cost.toLocaleString()} | Fee: ${c.fee_percentage}% | Price: $${c.total_price.toLocaleString()}`).join('\n')}

**YOUR TASK:**
Conduct comprehensive pricing analysis and provide strategic recommendations.

Return detailed JSON:
{
  "overall_assessment": {
    "pricing_health": "<excellent|good|concerning|risky>",
    "competitiveness_rating": "<highly_competitive|competitive|borderline|non_competitive>",
    "overall_score": <number 0-100>,
    "key_strengths": [<list of pricing strengths>],
    "key_concerns": [<list of pricing concerns>]
  },
  
  "price_to_win_analysis": {
    "recommended_price": <number: optimal price to win>,
    "recommended_fee_percentage": <number: optimal fee %>,
    "price_range": {
      "minimum_viable": <number: lowest price still profitable>,
      "target_competitive": <number: competitive sweet spot>,
      "maximum_defensible": <number: highest justifiable price>
    },
    "confidence_level": "<high|medium|low>",
    "confidence_score": <number 0-100>,
    "rationale": "<detailed explanation of recommended price>",
    "risk_assessment": "<risk analysis of recommended pricing>"
  },
  
  "competitive_analysis": {
    "estimated_competitor_count": <number: likely competitors>,
    "estimated_competitor_pricing": {
      "low_estimate": <number>,
      "mid_estimate": <number>,
      "high_estimate": <number>
    },
    "competitive_positioning": "<premium|competitive|aggressive|lowest_price>",
    "market_context": "<analysis of market conditions>",
    "incumbent_advantage": "<assessment if incumbent exists>"
  },
  
  "fee_analysis": {
    "current_fee_percentage": <current %>,
    "industry_standard_range": {
      "low": <number>,
      "high": <number>
    },
    "recommended_fee": <number>,
    "fee_justification": "<why this fee is appropriate>",
    "fee_risks": [<list of risks with current fee>]
  },
  
  "cost_analysis": {
    "labor_percentage": <% of total cost>,
    "odc_percentage": <% of total cost>,
    "cost_structure_assessment": "<analysis of cost structure>",
    "cost_reduction_opportunities": [
      {
        "area": "<where to reduce>",
        "potential_savings": <dollar amount>,
        "impact_on_win": "<high|medium|low>",
        "recommendation": "<specific action>"
      }
    ],
    "cost_optimization_score": <number 0-100>
  },
  
  "clin_level_analysis": [
    {
      "clin_number": "<clin number>",
      "assessment": "<analysis of this CLIN's pricing>",
      "recommended_adjustments": [<specific recommendations>],
      "risk_level": "<low|medium|high>"
    }
  ],
  
  "pricing_strategy_recommendations": {
    "recommended_approach": "<low_price_technically_acceptable|best_value|competitive|price_to_win|cost_plus|target_price>",
    "rationale": "<why this approach>",
    "alternative_strategies": [
      {
        "strategy": "<alternative approach>",
        "pros": [<advantages>],
        "cons": [<disadvantages>],
        "win_probability": <number 0-100>
      }
    ]
  },
  
  "action_items": [
    {
      "priority": "<critical|high|medium|low>",
      "action": "<specific action to take>",
      "impact": "<expected impact>",
      "timeline": "<when to do this>"
    }
  ],
  
  "win_probability_scenarios": {
    "at_current_price": <number 0-100>,
    "at_recommended_price": <number 0-100>,
    "at_aggressive_price": <number 0-100>,
    "factors_affecting_probability": [<list of factors>]
  },
  
  "red_flags": [
    {
      "flag": "<what's concerning>",
      "severity": "<critical|high|medium|low>",
      "recommendation": "<how to address>"
    }
  ],
  
  "final_recommendations": [
    "<prioritized list of top 5-7 actions to take>"
  ]
}

Be thorough, data-driven, and actionable. This is critical for winning the contract.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "object" },
            price_to_win_analysis: { type: "object" },
            competitive_analysis: { type: "object" },
            fee_analysis: { type: "object" },
            cost_analysis: { type: "object" },
            clin_level_analysis: { type: "array" },
            pricing_strategy_recommendations: { type: "object" },
            action_items: { type: "array" },
            win_probability_scenarios: { type: "object" },
            red_flags: { type: "array" },
            final_recommendations: { type: "array" }
          }
        }
      });

      setAnalysisResults(result);

      // Save/update pricing strategy
      const strategyData = {
        pricing_approach: result.pricing_strategy_recommendations?.recommended_approach || "competitive",
        target_total_price: result.price_to_win_analysis?.recommended_price,
        calculated_total_cost: totalCost,
        calculated_total_price: totalPrice,
        blended_fee_percentage: result.fee_analysis?.recommended_fee,
        estimated_competitor_pricing: result.competitive_analysis?.estimated_competitor_pricing,
        price_to_win_analysis: result.price_to_win_analysis,
        competitive_positioning: result.competitive_analysis?.competitive_positioning,
        ai_recommendations: result.final_recommendations,
        win_probability_at_price: result.win_probability_scenarios?.at_recommended_price
      };

      if (pricingStrategy?.id) {
        await updateStrategyMutation.mutateAsync({ id: pricingStrategy.id, data: strategyData });
      } else {
        await createStrategyMutation.mutateAsync(strategyData);
      }

      alert("✓ Pricing analysis complete!");

    } catch (error) {
      console.error("Error running pricing analysis:", error);
      alert("Error running pricing analysis. Please try again.");
    }
    setIsAnalyzing(false);
  };

  const getHealthColor = (health) => {
    if (health === 'excellent') return 'text-green-600 bg-green-50 border-green-300';
    if (health === 'good') return 'text-blue-600 bg-blue-50 border-blue-300';
    if (health === 'concerning') return 'text-amber-600 bg-amber-50 border-amber-300';
    return 'text-red-600 bg-red-50 border-red-300';
  };

  const getSeverityColor = (severity) => {
    if (severity === 'critical') return 'bg-red-600 text-white';
    if (severity === 'high') return 'bg-orange-600 text-white';
    if (severity === 'medium') return 'bg-amber-600 text-white';
    return 'bg-blue-600 text-white';
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                AI Pricing Analysis & Strategy
              </CardTitle>
              <CardDescription>
                Comprehensive pricing analysis, price-to-win recommendation, and competitive strategy
              </CardDescription>
            </div>
            <Button onClick={runPricingAnalysis} disabled={isAnalyzing || clins.length === 0} size="lg">
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Pricing Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!analysisResults ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready for AI Pricing Analysis</h3>
              <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                Our AI will analyze your pricing structure, competitive positioning, and provide price-to-win recommendations with detailed strategic insights.
              </p>
              {clins.length === 0 && (
                <Alert className="max-w-2xl mx-auto mb-4">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    Please add at least one CLIN with labor allocations or ODCs before running pricing analysis.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Assessment */}
              {analysisResults.overall_assessment && (
                <Card className={`border-2 ${getHealthColor(analysisResults.overall_assessment.pricing_health)}`}>
                  <CardHeader>
                    <CardTitle className="text-lg">Overall Pricing Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-1">Health</p>
                        <Badge className={`text-lg capitalize ${getHealthColor(analysisResults.overall_assessment.pricing_health)}`}>
                          {analysisResults.overall_assessment.pricing_health}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-1">Competitiveness</p>
                        <Badge className="text-lg capitalize" variant="outline">
                          {analysisResults.overall_assessment.competitiveness_rating?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-slate-600 mb-1">Overall Score</p>
                        <p className="text-4xl font-bold text-purple-600">
                          {analysisResults.overall_assessment.overall_score}/100
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      {analysisResults.overall_assessment.key_strengths?.length > 0 && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <p className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            Strengths
                          </p>
                          <ul className="space-y-1">
                            {analysisResults.overall_assessment.key_strengths.map((strength, idx) => (
                              <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                                <span className="text-green-600">•</span>
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysisResults.overall_assessment.key_concerns?.length > 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Concerns
                          </p>
                          <ul className="space-y-1">
                            {analysisResults.overall_assessment.key_concerns.map((concern, idx) => (
                              <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                                <span className="text-amber-600">•</span>
                                <span>{concern}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Price-to-Win Analysis */}
              {analysisResults.price_to_win_analysis && (
                <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-purple-600" />
                      Price-to-Win Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-6 bg-white border-2 border-purple-300 rounded-lg text-center">
                        <p className="text-sm text-slate-600 mb-2">Recommended Price</p>
                        <p className="text-4xl font-bold text-purple-600">
                          ${analysisResults.price_to_win_analysis.recommended_price?.toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                          Fee: {analysisResults.price_to_win_analysis.recommended_fee_percentage}%
                        </p>
                      </div>

                      <div className="p-6 bg-white border rounded-lg">
                        <p className="text-sm text-slate-600 mb-3">Price Range</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Minimum Viable:</span>
                            <span className="font-semibold">${analysisResults.price_to_win_analysis.price_range?.minimum_viable?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Target Competitive:</span>
                            <span className="font-semibold text-purple-600">${analysisResults.price_to_win_analysis.price_range?.target_competitive?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Maximum Defensible:</span>
                            <span className="font-semibold">${analysisResults.price_to_win_analysis.price_range?.maximum_defensible?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <p className="font-semibold text-slate-900">Confidence Level</p>
                        <div className="flex items-center gap-2">
                          <Badge>{analysisResults.price_to_win_analysis.confidence_level}</Badge>
                          <span className="text-2xl font-bold text-purple-600">
                            {analysisResults.price_to_win_analysis.confidence_score}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mb-3">
                        <strong>Rationale:</strong> {analysisResults.price_to_win_analysis.rationale}
                      </p>
                      <p className="text-sm text-slate-700">
                        <strong>Risk Assessment:</strong> {analysisResults.price_to_win_analysis.risk_assessment}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Win Probability Scenarios */}
              {analysisResults.win_probability_scenarios && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-base">Win Probability Scenarios</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-white border rounded-lg text-center">
                        <p className="text-xs text-slate-600 mb-1">At Current Price</p>
                        <p className="text-3xl font-bold text-slate-700">
                          {analysisResults.win_probability_scenarios.at_current_price}%
                        </p>
                      </div>
                      <div className="p-4 bg-white border-2 border-green-300 rounded-lg text-center">
                        <p className="text-xs text-slate-600 mb-1">At Recommended Price</p>
                        <p className="text-3xl font-bold text-green-600">
                          {analysisResults.win_probability_scenarios.at_recommended_price}%
                        </p>
                      </div>
                      <div className="p-4 bg-white border rounded-lg text-center">
                        <p className="text-xs text-slate-600 mb-1">At Aggressive Price</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {analysisResults.win_probability_scenarios.at_aggressive_price}%
                        </p>
                      </div>
                    </div>

                    {analysisResults.win_probability_scenarios.factors_affecting_probability?.length > 0 && (
                      <div className="p-3 bg-white border rounded-lg">
                        <p className="font-semibold text-sm mb-2">Factors Affecting Win Probability:</p>
                        <ul className="space-y-1">
                          {analysisResults.win_probability_scenarios.factors_affecting_probability.map((factor, idx) => (
                            <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                              <span>•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Red Flags */}
              {analysisResults.red_flags && analysisResults.red_flags.length > 0 && (
                <Card className="border-2 border-red-300 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Red Flags & Concerns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResults.red_flags.map((flag, idx) => (
                        <div key={idx} className="p-4 bg-white border-2 border-red-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Badge className={getSeverityColor(flag.severity)}>
                              {flag.severity}
                            </Badge>
                            <div className="flex-1">
                              <p className="font-semibold text-red-900 mb-1">{flag.flag}</p>
                              <p className="text-sm text-slate-700">
                                <strong>Recommendation:</strong> {flag.recommendation}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Items */}
              {analysisResults.action_items && analysisResults.action_items.length > 0 && (
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-base">Priority Action Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResults.action_items
                        .sort((a, b) => {
                          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                          return priorityOrder[a.priority] - priorityOrder[b.priority];
                        })
                        .map((item, idx) => (
                          <div key={idx} className="p-3 bg-white border rounded-lg">
                            <div className="flex items-start gap-3">
                              <Badge className={getSeverityColor(item.priority)}>
                                {item.priority}
                              </Badge>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900 mb-1">{item.action}</p>
                                <p className="text-sm text-slate-600 mb-1">
                                  <strong>Impact:</strong> {item.impact}
                                </p>
                                <p className="text-xs text-slate-500">
                                  <strong>Timeline:</strong> {item.timeline}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Final Recommendations */}
              {analysisResults.final_recommendations && analysisResults.final_recommendations.length > 0 && (
                <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-blue-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="w-5 h-5 text-indigo-600" />
                      Final Strategic Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResults.final_recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-indigo-200 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                            {idx + 1}
                          </div>
                          <p className="text-sm text-indigo-900 flex-1">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Re-run Button */}
              <div className="flex justify-center">
                <Button onClick={runPricingAnalysis} disabled={isAnalyzing} variant="outline" size="lg">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Re-run Analysis
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}