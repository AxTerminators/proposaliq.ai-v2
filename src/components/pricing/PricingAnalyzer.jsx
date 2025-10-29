import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  TrendingUp,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Loader2,
  Brain,
  BarChart3,
  Lightbulb,
  Users,
  Award
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PricingAnalyzer({ 
  proposalId, 
  organizationId, 
  proposalData, 
  clins,
  pricingStrategy,
  totalCost,
  totalPrice
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [competitorAnalysis, setCompetitorAnalysis] = useState(null);
  const [isLoadingCompetitors, setIsLoadingCompetitors] = useState(false);

  useEffect(() => {
    // Load existing analysis if available
    const loadExistingAnalysis = async () => {
      if (pricingStrategy?.price_to_win_analysis) {
        setAnalysisResults({
          pricing_model_recommendation: {
            recommended_model: pricingStrategy.pricing_approach,
            confidence: 85,
            rationale: pricingStrategy.price_to_win_analysis.rationale || ""
          },
          price_to_win: pricingStrategy.price_to_win_analysis
        });
      }
    };
    loadExistingAnalysis();
  }, [pricingStrategy]);

  const runAIPricingAnalysis = async () => {
    if (!proposalId || !organizationId) {
      alert("Please save the proposal first");
      return;
    }

    setIsAnalyzing(true);

    try {
      // Gather comprehensive context
      const [solicitationDocs, pastProposals, teamingPartners, complianceReqs, laborCategories] = await Promise.all([
        base44.entities.SolicitationDocument.filter({
          proposal_id: proposalId,
          organization_id: organizationId
        }),
        base44.entities.Proposal.filter({
          organization_id: organizationId,
          status: { $in: ['won', 'lost'] }
        }).then(props => props.slice(0, 10)),
        base44.entities.TeamingPartner.filter({
          organization_id: organizationId
        }).then(partners => {
          const partnerIds = proposalData.teaming_partner_ids || [];
          return partners.filter(p => partnerIds.includes(p.id));
        }),
        base44.entities.ComplianceRequirement.filter({
          proposal_id: proposalId,
          organization_id: organizationId
        }),
        base44.entities.LaborCategory.filter({
          organization_id: organizationId
        })
      ]);

      // Build context
      const fileUrls = solicitationDocs
        .filter(doc => doc.file_url)
        .map(doc => doc.file_url)
        .slice(0, 5);

      const historicalContext = pastProposals.map(p => ({
        name: p.proposal_name,
        agency: p.agency_name,
        contract_value: p.contract_value,
        status: p.status,
        project_type: p.project_type
      }));

      const teamContext = teamingPartners.map(p => ({
        name: p.partner_name,
        type: p.partner_type,
        capabilities: p.core_capabilities?.slice(0, 3)
      }));

      const prompt = `You are an expert government contract pricing strategist. Analyze this proposal and provide comprehensive pricing recommendations.

**PROPOSAL DETAILS:**
- Proposal: ${proposalData.proposal_name}
- Agency: ${proposalData.agency_name}
- Project: ${proposalData.project_title}
- Type: ${proposalData.project_type}
- Estimated Contract Value: ${proposalData.contract_value ? '$' + proposalData.contract_value.toLocaleString() : 'Unknown'}
- Prime Contractor: ${proposalData.prime_contractor_name}

**CURRENT PRICING:**
- Total Cost: $${totalCost.toLocaleString()}
- Total Price: $${totalPrice.toLocaleString()}
- Current Fee: ${totalPrice > 0 ? (((totalPrice - totalCost) / totalCost) * 100).toFixed(2) : 0}%
- Number of CLINs: ${clins.length}

**TEAMING PARTNERS:**
${teamContext.length > 0 ? teamContext.map(t => `- ${t.name} (${t.type}): ${t.capabilities?.join(', ')}`).join('\n') : 'N/A'}

**HISTORICAL WIN/LOSS DATA:**
${historicalContext.length > 0 ? historicalContext.map(h => `- ${h.name} (${h.agency}): ${h.status} - $${h.contract_value?.toLocaleString() || 'N/A'}`).join('\n') : 'N/A'}

**COMPLIANCE REQUIREMENTS:**
${complianceReqs.slice(0, 5).map(req => `- ${req.requirement_title}`).join('\n')}

**YOUR TASK:**
Provide a comprehensive pricing analysis with the following:

1. **Pricing Model Recommendation**: Analyze the solicitation and recommend the optimal pricing model (FFP, T&M, CPFF, CPAF, Hybrid). Consider risk, agency preference, and project characteristics.

2. **Price-to-Win Analysis**: 
   - Recommend a competitive price
   - Provide target fee percentage
   - Assess win probability at different price points
   - Consider agency's budget constraints

3. **Competitive Positioning**: 
   - Estimate likely competitor price ranges (low, mid, high)
   - Recommend positioning strategy (aggressive, competitive, premium)
   - Identify pricing risks

4. **Fee Structure Recommendations**:
   - Recommend fee percentages for different cost elements
   - Suggest volume discounts or incentives
   - Identify opportunities to reduce cost

5. **Risk Assessment**:
   - Identify pricing risks (too high, too low, compliance issues)
   - Recommend risk mitigation strategies

6. **Actionable Recommendations**:
   - Specific steps to optimize pricing
   - Areas to justify higher costs
   - Cost reduction opportunities

Return structured JSON:
{
  "pricing_model_recommendation": {
    "recommended_model": "FFP|T&M|CPFF|CPAF|Hybrid",
    "confidence": number (0-100),
    "rationale": "string",
    "alternative_models": [{"model": "string", "pros": ["string"], "cons": ["string"]}]
  },
  "price_to_win": {
    "recommended_price": number,
    "target_fee_percentage": number,
    "price_floor": number,
    "price_ceiling": number,
    "win_probability_curve": [
      {"price": number, "win_probability": number}
    ],
    "confidence_level": "high|medium|low",
    "rationale": "string"
  },
  "competitive_positioning": {
    "estimated_competitor_range": {
      "low": number,
      "mid": number,
      "high": number
    },
    "recommended_positioning": "aggressive|competitive|premium",
    "positioning_rationale": "string",
    "likely_competitors": ["string"],
    "competitive_advantages": ["string"]
  },
  "fee_recommendations": {
    "labor_fee": number,
    "odc_fee": number,
    "subcontractor_fee": number,
    "overall_blended_fee": number,
    "volume_discount_opportunities": ["string"],
    "incentive_recommendations": ["string"]
  },
  "risk_assessment": {
    "pricing_risks": [
      {
        "risk": "string",
        "severity": "high|medium|low",
        "impact": "string",
        "mitigation": "string"
      }
    ],
    "compliance_risks": ["string"],
    "overall_risk_level": "high|medium|low"
  },
  "optimization_recommendations": [
    {
      "category": "cost_reduction|value_add|justification|strategy",
      "recommendation": "string",
      "potential_impact": "string",
      "priority": "high|medium|low"
    }
  ],
  "cost_breakdown_suggestions": {
    "labor_allocation": "string (% guidance)",
    "odc_allocation": "string",
    "subcontractor_allocation": "string",
    "contingency": number
  },
  "executive_summary": "string (2-3 sentences)"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            pricing_model_recommendation: { type: "object" },
            price_to_win: { type: "object" },
            competitive_positioning: { type: "object" },
            fee_recommendations: { type: "object" },
            risk_assessment: { type: "object" },
            optimization_recommendations: { type: "array" },
            cost_breakdown_suggestions: { type: "object" },
            executive_summary: { type: "string" }
          }
        }
      });

      setAnalysisResults(result);

      // Save to PricingStrategy entity
      const strategies = await base44.entities.PricingStrategy.filter({
        proposal_id: proposalId
      });

      if (strategies.length > 0) {
        await base44.entities.PricingStrategy.update(strategies[0].id, {
          pricing_approach: result.pricing_model_recommendation.recommended_model,
          price_to_win_analysis: result.price_to_win,
          estimated_competitor_pricing: result.competitive_positioning.estimated_competitor_range,
          ai_recommendations: result.optimization_recommendations.map(r => r.recommendation),
          competitive_positioning: result.competitive_positioning.recommended_positioning
        });
      } else {
        await base44.entities.PricingStrategy.create({
          proposal_id: proposalId,
          organization_id: organizationId,
          pricing_approach: result.pricing_model_recommendation.recommended_model,
          price_to_win_analysis: result.price_to_win,
          estimated_competitor_pricing: result.competitive_positioning.estimated_competitor_range,
          ai_recommendations: result.optimization_recommendations.map(r => r.recommendation),
          competitive_positioning: result.competitive_positioning.recommended_positioning,
          calculated_total_cost: totalCost,
          calculated_total_price: totalPrice
        });
      }

      alert("✓ AI Pricing Analysis Complete!");

    } catch (error) {
      console.error("Error running pricing analysis:", error);
      alert("Error analyzing pricing. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeCompetitors = async () => {
    if (!organizationId) return;

    setIsLoadingCompetitors(true);

    try {
      const competitors = await base44.entities.CompetitorIntel.filter({
        organization_id: organizationId
      });

      if (competitors.length === 0) {
        alert("No competitor data available. Add competitors in Settings to enable competitive analysis.");
        setIsLoadingCompetitors(false);
        return;
      }

      const prompt = `You are a competitive intelligence analyst. Analyze these competitors and provide pricing insights for this proposal.

**PROPOSAL:**
- Agency: ${proposalData.agency_name}
- Project: ${proposalData.project_title}
- Type: ${proposalData.project_type}
- Our Estimated Price: $${totalPrice.toLocaleString()}

**COMPETITOR DATA:**
${competitors.map(c => `
**${c.competitor_name}**
- Type: ${c.competitor_type}
- Typical Pricing: ${c.typical_pricing_strategy}
- Win Rate: ${c.win_rate}%
- Average Contract Value: $${c.average_contract_value?.toLocaleString() || 'Unknown'}
- Strengths: ${c.strengths?.join(', ') || 'N/A'}
- Weaknesses: ${c.weaknesses?.join(', ') || 'N/A'}
- Past Wins: ${c.past_wins?.map(w => `${w.project_name} ($${w.contract_value?.toLocaleString()})`).join(', ') || 'N/A'}
`).join('\n')}

**YOUR TASK:**
Analyze competitor pricing patterns and provide strategic recommendations:

{
  "likely_bidders": [
    {
      "competitor_name": "string",
      "bid_probability": number (0-100),
      "estimated_price_range": {"low": number, "high": number},
      "pricing_strategy": "string",
      "competitive_threat": "high|medium|low",
      "how_to_beat_them": "string"
    }
  ],
  "market_intelligence": {
    "average_winning_price": number,
    "typical_win_margin": number,
    "pricing_trends": "string",
    "agency_preferences": ["string"]
  },
  "strategic_recommendations": [
    {
      "strategy": "string",
      "rationale": "string",
      "risk_level": "high|medium|low"
    }
  ],
  "ghosting_opportunities": [
    {
      "competitor": "string",
      "weakness_to_exploit": "string",
      "how_to_ghost": "string"
    }
  ],
  "pricing_positioning": {
    "recommended_stance": "aggressive|competitive|premium",
    "rationale": "string",
    "key_differentiators_to_emphasize": ["string"]
  }
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            likely_bidders: { type: "array" },
            market_intelligence: { type: "object" },
            strategic_recommendations: { type: "array" },
            ghosting_opportunities: { type: "array" },
            pricing_positioning: { type: "object" }
          }
        }
      });

      setCompetitorAnalysis(result);

    } catch (error) {
      console.error("Error analyzing competitors:", error);
      alert("Error analyzing competitors. Please try again.");
    } finally {
      setIsLoadingCompetitors(false);
    }
  };

  if (!proposalId) {
    return (
      <Alert>
        <AlertTriangle className="w-4 h-4" />
        <AlertDescription>
          Please save the proposal and add CLINs before running pricing analysis.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                AI-Powered Pricing Intelligence
              </CardTitle>
              <CardDescription>
                Get strategic pricing recommendations based on solicitation analysis, historical data, and competitive intelligence
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={analyzeCompetitors}
                disabled={isLoadingCompetitors}
                variant="outline"
                className="border-purple-300"
              >
                {isLoadingCompetitors ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Competitor Analysis
                  </>
                )}
              </Button>
              <Button
                onClick={runAIPricingAnalysis}
                disabled={isAnalyzing}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Run AI Analysis
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {!analysisResults && (
          <CardContent>
            <Alert className="bg-white">
              <Lightbulb className="w-4 h-4 text-purple-600" />
              <AlertDescription>
                <p className="font-semibold text-purple-900 mb-2">AI will analyze:</p>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>✓ Solicitation pricing requirements and structure</li>
                  <li>✓ Your historical win/loss data and pricing patterns</li>
                  <li>✓ Current cost structure and profit margins</li>
                  <li>✓ Competitive landscape and market positioning</li>
                  <li>✓ Risk factors and optimization opportunities</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {isAnalyzing && (
        <Alert className="bg-blue-50 border-blue-200">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <AlertDescription>
            <p className="font-semibold text-blue-900">AI is analyzing your pricing strategy...</p>
            <p className="text-sm text-blue-700 mt-1">
              Reading solicitation, analyzing historical data, calculating competitive positioning...
            </p>
          </AlertDescription>
        </Alert>
      )}

      {analysisResults && (
        <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="model">Pricing Model</TabsTrigger>
            <TabsTrigger value="price-to-win">Price-to-Win</TabsTrigger>
            <TabsTrigger value="competitive">Competitive</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
            <TabsTrigger value="recommendations">Actions</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg">Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-800">{analysisResults.executive_summary}</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold text-purple-600">
                    ${analysisResults.price_to_win.recommended_price?.toLocaleString() || 'N/A'}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Recommended Price</p>
                  <Badge className="mt-2">{analysisResults.price_to_win.confidence_level} confidence</Badge>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-blue-600">
                    {analysisResults.fee_recommendations.overall_blended_fee?.toFixed(1) || 'N/A'}%
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Target Fee %</p>
                  <Badge className="mt-2" variant="outline">
                    {analysisResults.pricing_model_recommendation.recommended_model}
                  </Badge>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="w-8 h-8 text-amber-600" />
                  </div>
                  <p className="text-3xl font-bold text-amber-600 capitalize">
                    {analysisResults.risk_assessment.overall_risk_level}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Risk Level</p>
                  <Badge className="mt-2" variant="secondary">
                    {analysisResults.risk_assessment.pricing_risks?.length || 0} risks identified
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pricing Model Tab */}
          <TabsContent value="model" className="space-y-4">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  Recommended Pricing Model
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Recommended Model</p>
                    <p className="text-2xl font-bold text-indigo-700">
                      {analysisResults.pricing_model_recommendation.recommended_model}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600 mb-1">Confidence</p>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={analysisResults.pricing_model_recommendation.confidence} 
                        className="w-24 h-2"
                      />
                      <span className="font-semibold">{analysisResults.pricing_model_recommendation.confidence}%</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Rationale:</p>
                  <p className="text-sm text-slate-600">
                    {analysisResults.pricing_model_recommendation.rationale}
                  </p>
                </div>

                {analysisResults.pricing_model_recommendation.alternative_models?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Alternative Models</h4>
                    <div className="space-y-3">
                      {analysisResults.pricing_model_recommendation.alternative_models.map((alt, idx) => (
                        <Card key={idx} className="border-slate-200">
                          <CardContent className="p-4">
                            <p className="font-semibold text-slate-900 mb-2">{alt.model}</p>
                            <div className="grid md:grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs font-semibold text-green-700 mb-1">Pros:</p>
                                <ul className="text-xs text-slate-600 space-y-1">
                                  {alt.pros?.map((pro, i) => (
                                    <li key={i}>+ {pro}</li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-red-700 mb-1">Cons:</p>
                                <ul className="text-xs text-slate-600 space-y-1">
                                  {alt.cons?.map((con, i) => (
                                    <li key={i}>- {con}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price-to-Win Tab */}
          <TabsContent value="price-to-win" className="space-y-4">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Price-to-Win Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                    <p className="text-sm text-slate-600 mb-1">Price Floor</p>
                    <p className="text-2xl font-bold text-red-700">
                      ${analysisResults.price_to_win.price_floor?.toLocaleString() || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Minimum viable price</p>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                    <p className="text-sm text-slate-600 mb-1">Recommended Price</p>
                    <p className="text-2xl font-bold text-green-700">
                      ${analysisResults.price_to_win.recommended_price?.toLocaleString() || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Optimal win probability</p>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <p className="text-sm text-slate-600 mb-1">Price Ceiling</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ${analysisResults.price_to_win.price_ceiling?.toLocaleString() || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Maximum justifiable price</p>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-semibold text-purple-900 mb-2">Strategic Rationale:</p>
                  <p className="text-sm text-purple-800">
                    {analysisResults.price_to_win.rationale}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm font-semibold text-slate-700 mb-2">Target Fee Structure:</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-slate-600">Labor Fee</p>
                      <p className="text-lg font-bold text-slate-900">
                        {analysisResults.fee_recommendations.labor_fee?.toFixed(1) || 'N/A'}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">ODC Fee</p>
                      <p className="text-lg font-bold text-slate-900">
                        {analysisResults.fee_recommendations.odc_fee?.toFixed(1) || 'N/A'}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Subcontractor Fee</p>
                      <p className="text-lg font-bold text-slate-900">
                        {analysisResults.fee_recommendations.subcontractor_fee?.toFixed(1) || 'N/A'}%
                      </p>
                    </div>
                  </div>
                </div>

                {analysisResults.price_to_win.win_probability_curve?.length > 0 && (
                  <div className="p-4 bg-white border rounded-lg">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Win Probability by Price</p>
                    <div className="space-y-2">
                      {analysisResults.price_to_win.win_probability_curve.map((point, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-sm font-mono text-slate-600 w-32">
                            ${point.price?.toLocaleString()}
                          </span>
                          <Progress value={point.win_probability} className="flex-1 h-2" />
                          <span className="text-sm font-semibold w-16 text-right">
                            {point.win_probability}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Competitive Tab */}
          <TabsContent value="competitive" className="space-y-4">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Competitive Positioning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-blue-900">Recommended Positioning</p>
                    <Badge className="bg-blue-600 text-white capitalize">
                      {analysisResults.competitive_positioning.recommended_positioning}
                    </Badge>
                  </div>
                  <p className="text-sm text-blue-800">
                    {analysisResults.competitive_positioning.positioning_rationale}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Estimated Competitor Price Range</h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 border rounded-lg text-center">
                      <p className="text-xs text-slate-600 mb-1">Low Bid</p>
                      <p className="text-xl font-bold text-slate-900">
                        ${analysisResults.competitive_positioning.estimated_competitor_range?.low?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 border rounded-lg text-center">
                      <p className="text-xs text-slate-600 mb-1">Mid Range</p>
                      <p className="text-xl font-bold text-slate-900">
                        ${analysisResults.competitive_positioning.estimated_competitor_range?.mid?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 border rounded-lg text-center">
                      <p className="text-xs text-slate-600 mb-1">High Bid</p>
                      <p className="text-xl font-bold text-slate-900">
                        ${analysisResults.competitive_positioning.estimated_competitor_range?.high?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {analysisResults.competitive_positioning.likely_competitors?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Likely Competitors</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysisResults.competitive_positioning.likely_competitors.map((comp, idx) => (
                        <Badge key={idx} variant="secondary">
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResults.competitive_positioning.competitive_advantages?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-green-600" />
                      Your Competitive Advantages
                    </h4>
                    <ul className="space-y-2">
                      {analysisResults.competitive_positioning.competitive_advantages.map((adv, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{adv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="space-y-4">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-600" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-amber-900">Overall Risk Level</p>
                    <Badge className={
                      analysisResults.risk_assessment.overall_risk_level === 'high' ? 'bg-red-100 text-red-700' :
                      analysisResults.risk_assessment.overall_risk_level === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }>
                      {analysisResults.risk_assessment.overall_risk_level?.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {analysisResults.risk_assessment.pricing_risks?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Pricing Risks</h4>
                    <div className="space-y-3">
                      {analysisResults.risk_assessment.pricing_risks.map((risk, idx) => (
                        <Card key={idx} className={`border-2 ${
                          risk.severity === 'high' ? 'border-red-300 bg-red-50' :
                          risk.severity === 'medium' ? 'border-amber-300 bg-amber-50' :
                          'border-slate-300 bg-slate-50'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-semibold text-slate-900">{risk.risk}</p>
                              <Badge variant={
                                risk.severity === 'high' ? 'destructive' :
                                risk.severity === 'medium' ? 'secondary' :
                                'outline'
                              }>
                                {risk.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">
                              <strong>Impact:</strong> {risk.impact}
                            </p>
                            <p className="text-sm text-slate-600">
                              <strong>Mitigation:</strong> {risk.mitigation}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResults.risk_assessment.compliance_risks?.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>
                      <p className="font-semibold mb-1">Compliance Risks:</p>
                      <ul className="text-sm space-y-1">
                        {analysisResults.risk_assessment.compliance_risks.map((risk, idx) => (
                          <li key={idx}>• {risk}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  Optimization Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analysisResults.optimization_recommendations?.length > 0 ? (
                  <div className="space-y-3">
                    {analysisResults.optimization_recommendations.map((rec, idx) => (
                      <Card key={idx} className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">
                                {rec.category?.replace('_', ' ')}
                              </Badge>
                              <Badge className={
                                rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                                rec.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }>
                                {rec.priority} priority
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 mb-1">
                            {rec.recommendation}
                          </p>
                          <p className="text-sm text-slate-600">
                            <strong>Potential Impact:</strong> {rec.potential_impact}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No specific recommendations at this time
                  </p>
                )}
              </CardContent>
            </Card>

            {analysisResults.cost_breakdown_suggestions && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-base">Cost Allocation Guidance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-slate-700 mb-1">Labor Allocation:</p>
                      <p className="text-slate-600">{analysisResults.cost_breakdown_suggestions.labor_allocation}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 mb-1">ODC Allocation:</p>
                      <p className="text-slate-600">{analysisResults.cost_breakdown_suggestions.odc_allocation}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 mb-1">Subcontractor Allocation:</p>
                      <p className="text-slate-600">{analysisResults.cost_breakdown_suggestions.subcontractor_allocation}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 mb-1">Recommended Contingency:</p>
                      <p className="text-slate-600">{analysisResults.cost_breakdown_suggestions.contingency}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Competitor Analysis Results */}
      {competitorAnalysis && (
        <Card className="border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Competitive Intelligence Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {competitorAnalysis.likely_bidders?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">Likely Bidders</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {competitorAnalysis.likely_bidders.map((bidder, idx) => (
                    <Card key={idx} className="border-indigo-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-slate-900">{bidder.competitor_name}</p>
                          <Badge className={
                            bidder.competitive_threat === 'high' ? 'bg-red-100 text-red-700' :
                            bidder.competitive_threat === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }>
                            {bidder.competitive_threat} threat
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-xs text-slate-600">Bid Probability</p>
                            <Progress value={bidder.bid_probability} className="h-2 mt-1" />
                            <p className="text-xs text-right mt-1">{bidder.bid_probability}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-600">Estimated Price</p>
                            <p className="font-semibold">
                              ${bidder.estimated_price_range?.low?.toLocaleString()} - ${bidder.estimated_price_range?.high?.toLocaleString()}
                            </p>
                          </div>
                          <div className="pt-2 border-t">
                            <p className="text-xs font-semibold text-indigo-700 mb-1">How to beat them:</p>
                            <p className="text-xs text-slate-600">{bidder.how_to_beat_them}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {competitorAnalysis.ghosting_opportunities?.length > 0 && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-base">Ghosting Opportunities</CardTitle>
                  <CardDescription>Strategic ways to differentiate against specific competitors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {competitorAnalysis.ghosting_opportunities.map((ghost, idx) => (
                      <div key={idx} className="p-3 bg-white border border-purple-200 rounded-lg">
                        <p className="font-semibold text-purple-900 mb-1">{ghost.competitor}</p>
                        <p className="text-sm text-slate-600 mb-2">
                          <strong>Weakness:</strong> {ghost.weakness_to_exploit}
                        </p>
                        <p className="text-sm text-slate-600">
                          <strong>Strategy:</strong> {ghost.how_to_ghost}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {competitorAnalysis.pricing_positioning && (
              <Alert className="bg-indigo-100 border-indigo-300">
                <Target className="w-4 h-4 text-indigo-600" />
                <AlertDescription>
                  <p className="font-semibold text-indigo-900 mb-1">
                    Recommended Positioning: {competitorAnalysis.pricing_positioning.recommended_stance?.toUpperCase()}
                  </p>
                  <p className="text-sm text-indigo-800 mb-2">
                    {competitorAnalysis.pricing_positioning.rationale}
                  </p>
                  {competitorAnalysis.pricing_positioning.key_differentiators_to_emphasize?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-indigo-900 mb-1">Emphasize these differentiators:</p>
                      <div className="flex flex-wrap gap-1">
                        {competitorAnalysis.pricing_positioning.key_differentiators_to_emphasize.map((diff, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-indigo-200 text-indigo-900">
                            {diff}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}