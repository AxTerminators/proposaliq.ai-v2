
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react"; // New import
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
// Removed: import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Tabs component is no longer used

// New imports for recharts
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line
} from 'recharts';

export default function PricingAnalyzer({ proposal, organization }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [priceToWinAnalysis, setPriceToWinAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // State for fetched data
  const [laborAllocations, setLaborAllocations] = useState([]);
  const [odcItems, setOdcItems] = useState([]);
  const [pricingStrategies, setPricingStrategies] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [winLossRecords, setWinLossRecords] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!proposal?.id || !organization?.id) {
        setIsLoadingData(false);
        return;
      }
      setIsLoadingData(true);
      setError(null);

      try {
        const [
          fetchedLaborAllocations,
          fetchedOdcItems,
          fetchedPricingStrategies,
          fetchedCompetitors,
          pastProposalsFromDb
        ] = await Promise.all([
          base44.entities.LaborAllocation.filter({ proposal_id: proposal.id, organization_id: organization.id }),
          base44.entities.OdcItem.filter({ proposal_id: proposal.id, organization_id: organization.id }),
          base44.entities.PricingStrategy.filter({ proposal_id: proposal.id, organization_id: organization.id }),
          base44.entities.CompetitorIntel.filter({ organization_id: organization.id }),
          base44.entities.Proposal.filter({
            organization_id: organization.id,
            status: { $in: ['won', 'lost'] }
          })
        ]);

        // Transform pastProposalsFromDb into the winLossRecords format expected by the AI prompt
        const transformedWinLossRecords = pastProposalsFromDb.map(p => ({
          outcome: p.status === 'won' ? 'won' : 'lost',
          proposal_details: p,
          // Placeholder for price_analysis. In a real app, this would come from a dedicated entity
          // or be part of the Proposal entity itself for past wins/losses.
          // For now, making some assumptions for demonstration.
          price_analysis: {
            // Assume 'our_price' was slightly less than 'contract_value' for won, or more for lost
            our_price: p.status === 'won' ? (p.contract_value * 0.95) : (p.contract_value * 1.05),
            winning_price: p.contract_value,
            // Price differential in percentage
            price_differential: p.contract_value ? ((p.contract_value - (p.status === 'won' ? (p.contract_value * 0.95) : (p.contract_value * 1.05))) / p.contract_value) * 100 : 0
          }
        }));

        setLaborAllocations(fetchedLaborAllocations);
        setOdcItems(fetchedOdcItems);
        setPricingStrategies(fetchedPricingStrategies);
        setCompetitors(fetchedCompetitors);
        setWinLossRecords(transformedWinLossRecords);

        // Load existing analysis from the first pricing strategy if available
        if (fetchedPricingStrategies.length > 0 && fetchedPricingStrategies[0].price_to_win_analysis) {
          try {
            // price_to_win_analysis is stored as a stringified JSON
            const parsedAnalysis = JSON.parse(fetchedPricingStrategies[0].price_to_win_analysis);
            setPriceToWinAnalysis(parsedAnalysis);
          } catch (parseError) {
            console.error("Error parsing existing price_to_win_analysis:", parseError);
            setPriceToWinAnalysis(null); // Clear invalid data
          }
        } else {
          setPriceToWinAnalysis(null);
        }

      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError(new Error("Failed to load necessary data. Please check console for details."));
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [proposal?.id, organization?.id]); // Re-run when proposal or organization IDs change

  const runPriceToWinAnalysis = async () => {
    if (!proposal?.id || !organization?.id) {
      alert("Proposal and Organization data required to run analysis.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Calculate current pricing
      const totalLaborCost = laborAllocations.reduce((sum, la) => sum + (la.total_cost || 0), 0);
      const totalODC = odcItems.reduce((sum, odc) => sum + (odc.total_cost || 0), 0);
      const totalCost = totalLaborCost + totalODC;

      const currentStrategy = pricingStrategies[0];
      // Use existing blended fee percentage or default to 10%
      const feePercentage = currentStrategy?.blended_fee_percentage || 10;
      const totalPrice = totalCost * (1 + feePercentage / 100);

      // Analyze historical pricing data
      const wonProposals = winLossRecords.filter(r => r.outcome === 'won');
      const lostProposals = winLossRecords.filter(r => r.outcome === 'lost');

      const similarProposals = winLossRecords.filter(r => {
        const p = r.proposal_details;
        if (!p) return false;

        const similarAgency = p.agency_name === proposal.agency_name;
        const similarType = p.project_type === proposal.project_type;
        // Check if contract value is within 30% range of current total price or proposal's target value
        const targetValueForComparison = proposal.contract_value || totalPrice;
        const similarValue = Math.abs((p.contract_value || 0) - targetValueForComparison) < (targetValueForComparison * 0.3);

        return similarAgency || similarType || similarValue;
      });

      // Build comprehensive AI prompt
      const prompt = `You are an expert pricing strategist for government proposals. Analyze historical data and competitive intelligence to recommend an optimal "Price to Win" strategy.

**CURRENT PROPOSAL:**
- Name: ${proposal.proposal_name}
- Agency: ${proposal.agency_name}
- Type: ${proposal.project_type}
- Our Calculated Cost: $${totalCost.toLocaleString()}
- Our Current Price: $${totalPrice.toLocaleString()}
- Fee: ${feePercentage}%
- Target Value: ${proposal.contract_value ? '$' + proposal.contract_value.toLocaleString() : 'Unknown'}

**HISTORICAL WIN/LOSS DATA:**
- Total Historical Bids: ${winLossRecords.length}
- Overall Win Rate: ${winLossRecords.length > 0 ? ((wonProposals.length / winLossRecords.length) * 100).toFixed(1) : 0}%
- Similar Proposals: ${similarProposals.length} found
- Won Similar: ${similarProposals.filter(r => r.outcome === 'won').length}
- Lost Similar: ${similarProposals.filter(r => r.outcome === 'lost').length}

**SIMILAR PROPOSALS PRICING:**
${similarProposals.slice(0, 5).map(r => `
- ${r.outcome.toUpperCase()}: ${r.proposal_details?.proposal_name}
  Our Price: ${r.price_analysis?.our_price ? '$' + r.price_analysis.our_price.toLocaleString() : 'N/A'}
  Winning Price: ${r.price_analysis?.winning_price ? '$' + r.price_analysis.winning_price.toLocaleString() : 'N/A'}
  Differential: ${r.price_analysis?.price_differential ? r.price_analysis.price_differential.toFixed(1) + '%' : 'N/A'}
`).join('\n')}

**COMPETITOR INTELLIGENCE:**
${competitors.slice(0, 3).map(c => `
- ${c.competitor_name}
  Typical Strategy: ${c.typical_pricing_strategy}
  Win Rate: ${c.win_rate || 'Unknown'}%
  Avg Contract: ${c.average_contract_value ? '$' + c.average_contract_value.toLocaleString() : 'Unknown'}
`).join('\n')}

**YOUR TASK - PRICE TO WIN ANALYSIS:**

Analyze all data and provide:

1. **Recommended Price to Win**: Specific dollar amount and fee percentage
2. **Win Probability at Different Price Points**: Model win probability at various prices
3. **Competitive Price Range**: Where competitors likely to bid
4. **Price Elasticity**: How sensitive win probability is to price changes
5. **Risk Analysis**: Risks of pricing too high vs too low
6. **Strategy Recommendation**: Best pricing approach for this opportunity
7. **Confidence Level**: How confident in these recommendations
8. **Alternative Scenarios**: Best case / worst case pricing scenarios

Return comprehensive JSON with specific, actionable pricing intelligence.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_price: {
              type: "number",
              description: "Recommended total price to maximize win probability"
            },
            recommended_fee_percentage: {
              type: "number",
              description: "Recommended fee percentage"
            },
            win_probability_at_recommended_price: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Expected win probability at recommended price"
            },
            confidence_level: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Confidence in this recommendation"
            },
            pricing_strategy: {
              type: "string",
              enum: ["aggressive_to_win", "competitive", "value_based", "premium", "low_price_technically_acceptable"],
              description: "Recommended pricing strategy"
            },
            win_probability_curve: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  price: { type: "number" },
                  win_probability: { type: "number", minimum: 0, maximum: 100 },
                  risk_level: { type: "string", enum: ["low", "medium", "high"] }
                }
              },
              description: "Win probability at different price points"
            },
            competitive_price_range: {
              type: "object",
              properties: {
                low_estimate: { type: "number" },
                mid_estimate: { type: "number" },
                high_estimate: { type: "number" },
                our_position: { type: "string", enum: ["below_range", "in_range", "above_range"] }
              }
            },
            price_positioning_analysis: {
              type: "object",
              properties: {
                vs_low_bidder_estimate: { type: "string" },
                vs_average_bidder: { type: "string" },
                vs_high_bidder: { type: "string" },
                sweet_spot_reasoning: { type: "string" }
              }
            },
            risk_analysis: {
              type: "object",
              properties: {
                pricing_too_high_risks: { type: "array", items: { type: "string" } },
                pricing_too_low_risks: { type: "array", items: { type: "string" } },
                optimal_risk_balance: { type: "string" }
              }
            },
            scenario_analysis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  scenario_name: { type: "string" },
                  price: { type: "number" },
                  fee_percentage: { type: "number" },
                  win_probability: { type: "number" },
                  expected_value: { type: "number" },
                  pros: { type: "array", items: { type: "string" } },
                  cons: { type: "array", items: { type: "string" } }
                }
              },
              description: "3 scenarios: Aggressive, Moderate, Conservative"
            },
            competitive_intelligence: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  competitor: { type: "string" },
                  likely_price_range: { type: "string" },
                  their_strategy: { type: "string" },
                  how_to_position_against: { type: "string" }
                }
              }
            },
            key_insights: {
              type: "array",
              items: { type: "string" },
              description: "Top 5-7 key insights from the analysis"
            },
            final_recommendation: {
              type: "string",
              description: "Clear, specific final recommendation"
            }
          },
          required: [
            "recommended_price",
            "recommended_fee_percentage",
            "win_probability_at_recommended_price",
            "confidence_level",
            "pricing_strategy",
            "competitive_price_range",
            "risk_analysis",
            "scenario_analysis",
            "key_insights",
            "final_recommendation"
          ]
        }
      });

      setPriceToWinAnalysis(result);

      // Update pricing strategy with AI recommendations
      if (currentStrategy) {
        await base44.entities.PricingStrategy.update(currentStrategy.id, {
          price_to_win_analysis: JSON.stringify(result), // Store as stringified JSON
          ai_recommendations: result.key_insights
        });
      } else {
        // If no pricing strategy exists, create one with the analysis results
        await base44.entities.PricingStrategy.create({
          proposal_id: proposal.id,
          organization_id: organization.id,
          pricing_approach: result.pricing_strategy,
          blended_fee_percentage: result.recommended_fee_percentage,
          price_to_win_analysis: JSON.stringify(result),
          ai_recommendations: result.key_insights,
          calculated_total_cost: totalCost,
          calculated_total_price: totalPrice,
          estimated_competitor_pricing: result.competitive_price_range,
          competitive_positioning: result.price_positioning_analysis?.our_position || 'in_range'
        });
      }


      alert("✓ Price-to-Win analysis complete!");

    } catch (err) {
      console.error("Error running price analysis:", err);
      setError(new Error(`Failed to perform AI analysis: ${err.message || "Unknown error"}`));
    } finally {
      setAnalyzing(false);
    }
  };

  if (!proposal?.id || !organization?.id) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>
          Please ensure the proposal and organization data are loaded and valid before running pricing analysis.
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoadingData) {
    return (
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Pricing Analysis & Optimization
          </CardTitle>
          <CardDescription>Loading data for analysis...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-green-600" />
            <span>Fetching historical data, pricing strategies, and competitor intel...</span>
          </div>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Pricing Analysis & Optimization
            </CardTitle>
            <CardDescription>Analyze competitive pricing and optimize for win probability</CardDescription>
          </div>
          <Button
            onClick={runPriceToWinAnalysis}
            disabled={analyzing}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                AI Price-to-Win Analysis
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {error && (
        <Alert variant="destructive" className="mx-6 mb-4">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <CardContent className="space-y-6">
        {/* AI Price-to-Win Results */}
        {priceToWinAnalysis && (
          <div className="space-y-6">
            {/* Recommended Price */}
            <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="text-xl">AI-Recommended Price to Win</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <p className="text-5xl font-bold text-green-600 mb-2">
                    ${priceToWinAnalysis.recommended_price.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Badge className="bg-green-600 text-white text-base px-4 py-2">
                      {priceToWinAnalysis.recommended_fee_percentage}% Fee
                    </Badge>
                    <Badge className="bg-blue-600 text-white text-base px-4 py-2">
                      {priceToWinAnalysis.win_probability_at_recommended_price}% Win Probability
                    </Badge>
                    <Badge className={
                      priceToWinAnalysis.confidence_level === 'high' ? 'bg-green-100 text-green-800' :
                      priceToWinAnalysis.confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-orange-100 text-orange-800'
                    }>
                      {priceToWinAnalysis.confidence_level} confidence
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                  <p className="font-semibold text-slate-900 mb-2">Strategy:</p>
                  <Badge className="text-sm px-3 py-1 capitalize">
                    {priceToWinAnalysis.pricing_strategy.replace(/_/g, ' ')}
                  </Badge>
                  <p className="text-sm text-slate-700 mt-3">{priceToWinAnalysis.final_recommendation}</p>
                </div>
              </CardContent>
            </Card>

            {/* Win Probability Curve */}
            {priceToWinAnalysis.win_probability_curve && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Win Probability vs Price</CardTitle>
                  <CardDescription>How pricing affects your win probability</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={priceToWinAnalysis.win_probability_curve}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="price"
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                      />
                      <YAxis
                        label={{ value: 'Win Probability %', angle: -90, position: 'insideLeft' }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        formatter={(value, name) => {
                          if (name === 'price') return [`$${value.toLocaleString()}`, 'Price'];
                          return [value + '%', 'Win Probability'];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="win_probability"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: '#10b981', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Competitive Price Range */}
            {priceToWinAnalysis.competitive_price_range && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Competitive Price Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Low Estimate</span>
                      <span className="font-bold text-green-600">
                        ${priceToWinAnalysis.competitive_price_range.low_estimate.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>Mid Estimate</span>
                      <span className="font-bold text-blue-600">
                        ${priceToWinAnalysis.competitive_price_range.mid_estimate.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span>High Estimate</span>
                      <span className="font-bold text-orange-600">
                        ${priceToWinAnalysis.competitive_price_range.high_estimate.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {priceToWinAnalysis.competitive_price_range.our_position && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <p className="text-sm font-semibold text-indigo-900 mb-1">Your Position:</p>
                      <Badge className={
                        priceToWinAnalysis.competitive_price_range.our_position === 'below_range' ? 'bg-green-600' :
                        priceToWinAnalysis.competitive_price_range.our_position === 'in_range' ? 'bg-blue-600' :
                        'bg-red-600'
                      } variant="default"> {/* Ensure variant is set */}
                        {priceToWinAnalysis.competitive_price_range.our_position.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Scenario Analysis */}
            {priceToWinAnalysis.scenario_analysis && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Pricing Scenarios</CardTitle>
                  <CardDescription>Compare different pricing approaches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {priceToWinAnalysis.scenario_analysis.map((scenario, idx) => (
                      <Card key={idx} className="border-2">
                        <CardHeader>
                          <CardTitle className="text-base">{scenario.scenario_name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="text-center p-4 bg-slate-50 rounded-lg">
                              <p className="text-2xl font-bold text-indigo-600">
                                ${scenario.price.toLocaleString()}
                              </p>
                              <p className="text-xs text-slate-600">({scenario.fee_percentage}% fee)</p>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Win Probability:</span>
                                <span className="font-bold text-green-600">{scenario.win_probability}%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Expected Value:</span>
                                <span className="font-bold text-blue-600">
                                  ${scenario.expected_value.toLocaleString()}
                                </span>
                              </div>
                            </div>

                            {scenario.pros && scenario.pros.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-green-900 mb-1">Pros:</p>
                                <ul className="text-xs text-slate-700 space-y-1">
                                  {scenario.pros?.map((pro, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                      {pro}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {scenario.cons && scenario.cons.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-red-900 mb-1">Cons:</p>
                                <ul className="text-xs text-slate-700 space-y-1">
                                  {scenario.cons?.map((con, i) => (
                                    <li key={i} className="flex items-start gap-1">
                                      <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5 flex-shrink-0" />
                                      {con}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Risk Analysis */}
            {priceToWinAnalysis.risk_analysis && (
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-red-900">Risks of Pricing Too High</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {priceToWinAnalysis.risk_analysis.pricing_too_high_risks?.map((risk, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-red-900">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-orange-900">Risks of Pricing Too Low</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {priceToWinAnalysis.risk_analysis.pricing_too_low_risks?.map((risk, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <span className="text-orange-900">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Key Insights */}
            {priceToWinAnalysis.key_insights && (
              <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-indigo-600" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {priceToWinAnalysis.key_insights.map((insight, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                          {idx + 1}
                        </div>
                        <span className="text-sm text-slate-700">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Competitive Intelligence */}
            {priceToWinAnalysis.competitive_intelligence && priceToWinAnalysis.competitive_intelligence.length > 0 && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Competitive Intelligence</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {priceToWinAnalysis.competitive_intelligence.map((intel, idx) => (
                      <div key={idx} className="p-4 border-2 rounded-lg">
                        <h4 className="font-semibold text-slate-900 mb-3">{intel.competitor}</h4>
                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-600 font-medium">Likely Price Range:</p>
                            <p className="text-slate-900">{intel.likely_price_range}</p>
                          </div>
                          <div>
                            <p className="text-slate-600 font-medium">Their Strategy:</p>
                            <p className="text-slate-900">{intel.their_strategy}</p>
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-900">
                            <strong>How to position:</strong> {intel.how_to_position_against}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
