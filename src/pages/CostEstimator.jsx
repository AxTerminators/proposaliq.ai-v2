import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Plus, Trash2, Calculator, Sparkles, TrendingUp, AlertTriangle, Target, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function CostEstimator() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [laborCategories, setLaborCategories] = useState([
    { name: "", hours: 0, rate: 0 }
  ]);
  const [odcItems, setOdcItems] = useState([
    { name: "", quantity: 0, cost: 0 }
  ]);
  const [feePercentage, setFeePercentage] = useState(10);
  
  // AI Enhancement States
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [competitorEstimate, setCompetitorEstimate] = useState({ low: 0, mid: 0, high: 0 });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const addLaborCategory = () => {
    setLaborCategories([...laborCategories, { name: "", hours: 0, rate: 0 }]);
  };

  const removeLaborCategory = (index) => {
    setLaborCategories(laborCategories.filter((_, i) => i !== index));
  };

  const updateLaborCategory = (index, field, value) => {
    const updated = [...laborCategories];
    updated[index][field] = value;
    setLaborCategories(updated);
  };

  const addOdcItem = () => {
    setOdcItems([...odcItems, { name: "", quantity: 0, cost: 0 }]);
  };

  const removeOdcItem = (index) => {
    setOdcItems(odcItems.filter((_, i) => i !== index));
  };

  const updateOdcItem = (index, field, value) => {
    const updated = [...odcItems];
    updated[index][field] = value;
    setOdcItems(updated);
  };

  const calculateTotalLabor = () => {
    return laborCategories.reduce((sum, cat) => sum + (cat.hours * cat.rate), 0);
  };

  const calculateTotalOdc = () => {
    return odcItems.reduce((sum, item) => sum + (item.quantity * item.cost), 0);
  };

  const calculateSubtotal = () => {
    return calculateTotalLabor() + calculateTotalOdc();
  };

  const calculateFee = () => {
    return calculateSubtotal() * (feePercentage / 100);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateFee();
  };

  // AI Price Intelligence
  const runAIAnalysis = async () => {
    setAiAnalyzing(true);
    try {
      const totalLabor = calculateTotalLabor();
      const totalOdc = calculateTotalOdc();
      const grandTotal = calculateGrandTotal();

      const prompt = `You are a government contracting pricing strategist. Analyze this cost estimate and provide competitive intelligence.

**COST BREAKDOWN:**
- Total Labor: $${totalLabor.toLocaleString()}
- Total ODC: $${totalOdc.toLocaleString()}
- Fee: ${feePercentage}%
- Grand Total: $${grandTotal.toLocaleString()}

**ANALYSIS REQUIRED:**
1. Competitive positioning (is this low/competitive/high for typical government contracts?)
2. Estimated competitor pricing range (low, mid, high)
3. Win probability at this price (percentage)
4. Risk factors in this pricing
5. Specific recommendations to improve competitiveness
6. Optimal fee percentage for this type of contract
7. Red flags the government evaluator might see

Return as JSON:
{
  "competitive_position": "competitive|aggressive|high",
  "competitor_range": {"low": number, "mid": number, "high": number},
  "win_probability": number (0-100),
  "risk_factors": [string],
  "recommendations": [string],
  "optimal_fee_percentage": number,
  "evaluator_concerns": [string],
  "price_analysis": string,
  "summary": string
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            competitive_position: { type: "string" },
            competitor_range: { 
              type: "object",
              properties: {
                low: { type: "number" },
                mid: { type: "number" },
                high: { type: "number" }
              }
            },
            win_probability: { type: "number" },
            risk_factors: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            optimal_fee_percentage: { type: "number" },
            evaluator_concerns: { type: "array", items: { type: "string" } },
            price_analysis: { type: "string" },
            summary: { type: "string" }
          }
        }
      });

      setAiRecommendations(result);
      setCompetitorEstimate(result.competitor_range);
      setShowAIInsights(true);
    } catch (error) {
      console.error("Error running AI analysis:", error);
      alert("Error analyzing pricing. Please try again.");
    } finally {
      setAiAnalyzing(false);
    }
  };

  if (!organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  const grandTotal = calculateGrandTotal();
  const totalHours = laborCategories.reduce((sum, cat) => sum + cat.hours, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cost Estimator</h1>
          <p className="text-slate-600">Quick cost estimation tool for proposals</p>
        </div>
        <Button
          onClick={runAIAnalysis}
          disabled={aiAnalyzing || grandTotal === 0}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          {aiAnalyzing ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Price Intelligence
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calculator">
            <Calculator className="w-4 h-4 mr-2" />
            Quick Calculator
          </TabsTrigger>
          {showAIInsights && (
            <TabsTrigger value="insights">
              <TrendingUp className="w-4 h-4 mr-2" />
              AI Insights
              <Badge className="ml-2 bg-purple-600">New</Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Labor Categories */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Labor Categories</CardTitle>
                    <Button size="sm" onClick={addLaborCategory}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {laborCategories.map((cat, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        placeholder="Category name"
                        value={cat.name}
                        onChange={(e) => updateLaborCategory(idx, 'name', e.target.value)}
                        className="col-span-5"
                      />
                      <Input
                        type="number"
                        placeholder="Hours"
                        value={cat.hours || ''}
                        onChange={(e) => updateLaborCategory(idx, 'hours', parseFloat(e.target.value) || 0)}
                        className="col-span-3"
                      />
                      <Input
                        type="number"
                        placeholder="Rate"
                        value={cat.rate || ''}
                        onChange={(e) => updateLaborCategory(idx, 'rate', parseFloat(e.target.value) || 0)}
                        className="col-span-3"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLaborCategory(idx)}
                        disabled={laborCategories.length === 1}
                        className="col-span-1"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-900">Total Labor</span>
                      <span className="text-lg font-bold text-slate-900">
                        ${calculateTotalLabor().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>ODC Items</CardTitle>
                    <Button size="sm" onClick={addOdcItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {odcItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        placeholder="Item name"
                        value={item.name}
                        onChange={(e) => updateOdcItem(idx, 'name', e.target.value)}
                        className="col-span-5"
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity || ''}
                        onChange={(e) => updateOdcItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="col-span-3"
                      />
                      <Input
                        type="number"
                        placeholder="Cost"
                        value={item.cost || ''}
                        onChange={(e) => updateOdcItem(idx, 'cost', parseFloat(e.target.value) || 0)}
                        className="col-span-3"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOdcItem(idx)}
                        disabled={odcItems.length === 1}
                        className="col-span-1"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-slate-900">Total ODC</span>
                      <span className="text-lg font-bold text-slate-900">
                        ${calculateTotalOdc().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    Cost Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Labor</span>
                      <span className="font-semibold text-slate-900">
                        ${calculateTotalLabor().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">ODC</span>
                      <span className="font-semibold text-slate-900">
                        ${calculateTotalOdc().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-slate-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-900">Subtotal</span>
                        <span className="font-bold text-slate-900">
                          ${calculateSubtotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-300">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-600">Fee %</span>
                        <Input
                          type="number"
                          value={feePercentage}
                          onChange={(e) => setFeePercentage(parseFloat(e.target.value) || 0)}
                          className="w-20 text-right"
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Fee Amount</span>
                        <span className="font-semibold text-slate-900">
                          ${calculateFee().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t-2 border-slate-300">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-slate-900">Grand Total</span>
                        <span className="text-2xl font-bold text-blue-600">
                          ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">Quick Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Hours</span>
                    <span className="font-medium text-slate-900">
                      {totalHours.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Avg Hourly Rate</span>
                    <span className="font-medium text-slate-900">
                      ${(calculateTotalLabor() / (totalHours || 1)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Labor %</span>
                    <span className="font-medium text-slate-900">
                      {((calculateTotalLabor() / calculateSubtotal()) * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ODC %</span>
                    <span className="font-medium text-slate-900">
                      {((calculateTotalOdc() / calculateSubtotal()) * 100 || 0).toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {grandTotal > 0 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900">
                    Click <strong>"AI Price Intelligence"</strong> above to get competitive analysis and win probability!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </TabsContent>

        {showAIInsights && aiRecommendations && (
          <TabsContent value="insights" className="space-y-6">
            {/* Win Probability Card */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  AI Win Probability Analysis
                </CardTitle>
                <CardDescription>{aiRecommendations.summary}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-white rounded-lg border-2 border-purple-200">
                    <p className="text-sm text-slate-600 mb-1">Win Probability</p>
                    <p className="text-4xl font-bold text-purple-600">{aiRecommendations.win_probability}%</p>
                  </div>
                  <div className="p-4 bg-white rounded-lg border-2 border-blue-200">
                    <p className="text-sm text-slate-600 mb-1">Position</p>
                    <Badge className="text-lg px-3 py-1 capitalize bg-blue-600">
                      {aiRecommendations.competitive_position}
                    </Badge>
                  </div>
                  <div className="p-4 bg-white rounded-lg border-2 border-green-200">
                    <p className="text-sm text-slate-600 mb-1">Optimal Fee</p>
                    <p className="text-4xl font-bold text-green-600">{aiRecommendations.optimal_fee_percentage}%</p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-semibold text-slate-900 mb-2">Price Analysis</h4>
                  <p className="text-sm text-slate-700">{aiRecommendations.price_analysis}</p>
                </div>
              </CardContent>
            </Card>

            {/* Competitor Range */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Estimated Competitor Pricing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Low Bidder</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${competitorEstimate.low.toLocaleString()}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      {((grandTotal / competitorEstimate.low - 1) * 100).toFixed(1)}% above
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700 mb-1">Mid-Range</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${competitorEstimate.mid.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {((grandTotal / competitorEstimate.mid - 1) * 100).toFixed(1)}% differential
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm text-amber-700 mb-1">High Bidder</p>
                    <p className="text-2xl font-bold text-amber-600">
                      ${competitorEstimate.high.toLocaleString()}
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      {((grandTotal / competitorEstimate.high - 1) * 100).toFixed(1)}% below
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base text-green-700">✓ Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {aiRecommendations.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base text-red-700">⚠ Risk Factors</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {aiRecommendations.risk_factors.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Evaluator Concerns */}
            {aiRecommendations.evaluator_concerns && aiRecommendations.evaluator_concerns.length > 0 && (
              <Card className="border-none shadow-lg border-2 border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="text-base text-amber-900 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Potential Evaluator Concerns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {aiRecommendations.evaluator_concerns.map((concern, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-amber-900">
                        <span className="font-bold">{idx + 1}.</span>
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Link to Full Pricing Module */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Need More Advanced Pricing Features?</h3>
              <p className="text-sm text-slate-600">
                Use the full Pricing Module in Phase 6 for: Multi-year CLINs, Burden rates, Subcontractor management, Export to Excel, and more
              </p>
            </div>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Open Pricing Module
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}