
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Plus, Trash2, Calculator, Sparkles, TrendingUp, AlertTriangle, Target, ArrowRight, Save, FolderOpen, TrendingDown, BarChart2, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import PricingIntelligencePanel from "../components/pricing/PricingIntelligencePanel";
import { useNavigate } from "react-router-dom";

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

// Temporary helper function for URL creation as it's used in the outline but not defined in the original file.
// In a real project, this would likely be imported from a central routing utility or global context.
const createPageUrl = (pageName) => {
  // Assuming a simple convention where page names map directly to lowercase paths.
  // For "Pricing", this would return "/pricing".
  return `/${pageName.toLowerCase()}`;
};

export default function CostEstimator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [currentEstimateId, setCurrentEstimateId] = useState(null);
  const [estimateName, setEstimateName] = useState("");
  
  const [laborCategories, setLaborCategories] = useState([
    { name: "", hours: 0, rate: 0, base_rate: 0, fringe_rate: 0, overhead_rate: 0, ga_rate: 0 }
  ]);
  const [odcItems, setOdcItems] = useState([
    { name: "", quantity: 0, cost: 0, category: "other" }
  ]);
  const [feePercentage, setFeePercentage] = useState(10);
  
  // Multi-year settings
  const [enableMultiYear, setEnableMultiYear] = useState(false);
  const [escalationRate, setEscalationRate] = useState(3.0);
  const [numberOfOptionYears, setNumberOfOptionYears] = useState(4);
  
  // Burden rates
  const [defaultFringeRate, setDefaultFringeRate] = useState(35);
  const [defaultOverheadRate, setDefaultOverheadRate] = useState(45);
  const [defaultGARate, setDefaultGARate] = useState(8);
  
  // AI Enhancement States
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [competitorEstimate, setCompetitorEstimate] = useState({ low: 0, mid: 0, high: 0 });
  
  // Industry benchmarks state
  const [industryBenchmarks, setIndustryBenchmarks] = useState(null);

  // Save/Load dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  
  // Sensitivity analysis
  const [sensitivityResults, setSensitivityResults] = useState(null);

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

  // Query for saved estimates
  const { data: savedEstimates = [] } = useQuery({
    queryKey: ['cost-estimates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.CostEstimate.filter(
        { organization_id: organization.id },
        '-created_date',
        20
      );
    },
    enabled: !!organization?.id
  });

  // Query for pricing benchmarks
  const { data: benchmarks = [] } = useQuery({
    queryKey: ['pricing-benchmarks', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.PricingBenchmark.filter(
        { organization_id: organization.id },
        '-last_updated',
        10
      );
    },
    enabled: !!organization?.id
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (currentEstimateId) {
        return base44.entities.CostEstimate.update(currentEstimateId, data);
      } else {
        return base44.entities.CostEstimate.create(data);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cost-estimates'] });
      setCurrentEstimateId(data.id);
      setShowSaveDialog(false);
      alert('✓ Estimate saved successfully!');
    },
    onError: (error) => {
      console.error("Error saving estimate:", error);
      alert("Error saving estimate. Please try again.");
    }
  });

  const addLaborCategory = () => {
    setLaborCategories([...laborCategories, { 
      name: "", 
      hours: 0, 
      rate: 0, 
      base_rate: 0, 
      fringe_rate: defaultFringeRate, 
      overhead_rate: defaultOverheadRate, 
      ga_rate: defaultGARate 
    }]);
  };

  const removeLaborCategory = (index) => {
    setLaborCategories(laborCategories.filter((_, i) => i !== index));
  };

  const updateLaborCategory = (index, field, value) => {
    const updated = [...laborCategories];
    updated[index][field] = value;
    
    // Auto-calculate loaded rate if burden rates are provided
    // Note: The UI for base_rate, fringe_rate etc. is not in the 'calculator' tab
    // This logic would be triggered if a loaded estimate had these values
    // or if the UI was expanded to include inputs for them.
    // For now, the `rate` input directly sets `cat.rate`.
    if (['base_rate', 'fringe_rate', 'overhead_rate', 'ga_rate'].includes(field)) {
      const base = parseFloat(updated[index].base_rate) || 0;
      const fringe = parseFloat(updated[index].fringe_rate) || 0;
      const overhead = parseFloat(updated[index].overhead_rate) || 0;
      const ga = parseFloat(updated[index].ga_rate) || 0;
      
      const fringeAmount = base * (fringe / 100);
      const overheadAmount = (base + fringeAmount) * (overhead / 100);
      const gaAmount = (base + fringeAmount + overheadAmount) * (ga / 100);
      
      updated[index].rate = base + fringeAmount + overheadAmount + gaAmount;
    }
    
    setLaborCategories(updated);
  };

  const addOdcItem = () => {
    setOdcItems([...odcItems, { name: "", quantity: 0, cost: 0, category: "other" }]);
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

  const calculateMultiYearProjection = () => {
    const baseYear = calculateGrandTotal();
    const results = [baseYear];
    
    for (let i = 1; i <= numberOfOptionYears; i++) {
      const escalated = baseYear * Math.pow(1 + escalationRate / 100, i);
      results.push(escalated);
    }
    
    return results;
  };

  // AI Price Intelligence
  const runAIAnalysis = async () => {
    setAiAnalyzing(true);
    try {
      const totalLabor = calculateTotalLabor();
      const totalOdc = calculateTotalOdc();
      const grandTotal = calculateGrandTotal();
      
      // Build historical context from saved estimates
      const historicalContext = savedEstimates
        .filter(e => e.outcome && e.outcome !== 'pending')
        .map(e => `
- Estimate: ${e.estimate_name}
  Price: $${e.grand_total?.toLocaleString() || 'N/A'}
  Outcome: ${e.outcome}
  Win Probability: ${e.win_probability || 'N/A'}%
${e.actual_contract_value ? `  Actual Value: $${e.actual_contract_value.toLocaleString()}` : ''}
        `)
        .join('\n');

      const prompt = `You are a government contracting pricing strategist with access to historical data. Analyze this cost estimate and provide competitive intelligence.

**COST BREAKDOWN:**
- Total Labor: $${totalLabor.toLocaleString()}
- Total ODC: $${totalOdc.toLocaleString()}
- Fee: ${feePercentage}%
- Grand Total: $${grandTotal.toLocaleString()}

${historicalContext ? `
**HISTORICAL ESTIMATES (YOUR ORGANIZATION):**
${historicalContext}

Use this historical data to improve your predictions and recommendations.
` : ''}

${enableMultiYear ? `
**MULTI-YEAR PROJECTION:**
- Escalation Rate: ${escalationRate}%
- Total ${numberOfOptionYears + 1}-year value: $${calculateMultiYearProjection().reduce((a, b) => a + b, 0).toLocaleString()}
` : ''}

**ANALYSIS REQUIRED:**
1. Competitive positioning (low/competitive/high for government contracts)
2. Estimated competitor pricing range (low, mid, high)
3. Win probability at this price (percentage)
4. Risk factors in this pricing
5. Specific recommendations to improve competitiveness
6. Optimal fee percentage for this type of contract
7. Red flags the government evaluator might see
8. Price-to-win recommendation based on historical data
9. Should-cost estimate (what government expects)
10. Sensitivity factors (what changes would most impact win probability)

Return as JSON with all fields.`;

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
            summary: { type: "string" },
            price_to_win_recommendation: { type: "number" },
            should_cost_estimate: { type: "number" },
            sensitivity_factors: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  factor: { type: "string" },
                  impact: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            }
          },
          required: ["competitive_position", "competitor_range", "win_probability", "risk_factors", "recommendations", "optimal_fee_percentage", "evaluator_concerns", "price_analysis", "summary", "price_to_win_recommendation", "should_cost_estimate"] // Ensure required fields
        }
      });

      setAiRecommendations(result);
      setCompetitorEstimate(result.competitor_range);
      
      // Set industry benchmarks for intelligence panel
      setIndustryBenchmarks({
        average: result.should_cost_estimate || grandTotal,
        sampleSize: historicalContext ? savedEstimates.filter(e => e.outcome).length : 0,
        feeRange: {
          min: Math.max(0, result.optimal_fee_percentage - 3),
          average: result.optimal_fee_percentage,
          max: result.optimal_fee_percentage + 3
        }
      });
      
      setShowAIInsights(true);
      
      // Run sensitivity analysis
      runSensitivityAnalysis();
      
    } catch (error) {
      console.error("Error running AI analysis:", error);
      alert("Error analyzing pricing. Please try again.");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const runSensitivityAnalysis = () => {
    const baseTotal = calculateGrandTotal();
    
    const scenarios = [
      {
        name: "Labor +10%",
        calculate: () => {
          const newLabor = calculateTotalLabor() * 1.1;
          return (newLabor + calculateTotalOdc()) * (1 + feePercentage / 100);
        }
      },
      {
        name: "Labor -10%",
        calculate: () => {
          const newLabor = calculateTotalLabor() * 0.9;
          return (newLabor + calculateTotalOdc()) * (1 + feePercentage / 100);
        }
      },
      {
        name: "ODC +20%",
        calculate: () => {
          const newOdc = calculateTotalOdc() * 1.2;
          return (calculateTotalLabor() + newOdc) * (1 + feePercentage / 100);
        }
      },
      {
        name: "Fee +2%",
        calculate: () => {
          return calculateSubtotal() * (1 + (feePercentage + 2) / 100);
        }
      },
      {
        name: "Fee -2%",
        calculate: () => {
          return calculateSubtotal() * (1 + (feePercentage - 2) / 100);
        }
      }
    ];
    
    const results = scenarios.map(scenario => {
      const newTotal = scenario.calculate();
      const delta = newTotal - baseTotal;
      const percentChange = (delta / baseTotal) * 100;
      return {
        name: scenario.name,
        total: newTotal,
        delta: delta,
        percentChange: percentChange
      };
    });
    
    setSensitivityResults(results);
  };

  const handleSaveEstimate = async () => {
    if (!estimateName.trim()) {
      alert('Please enter a name for this estimate');
      return;
    }
    
    const estimateData = {
      organization_id: organization.id,
      estimate_name: estimateName,
      estimate_type: "quick_estimate",
      labor_categories: laborCategories,
      odc_items: odcItems,
      total_labor: calculateTotalLabor(),
      total_odc: calculateTotalOdc(),
      subtotal: calculateSubtotal(),
      fee_percentage: feePercentage,
      fee_amount: calculateFee(),
      grand_total: calculateGrandTotal(),
      multi_year_projection: enableMultiYear ? {
        base_year: multiYearProjection[0] || 0,
        option_year_1: multiYearProjection[1] || 0,
        option_year_2: multiYearProjection[2] || 0,
        option_year_3: multiYearProjection[3] || 0,
        option_year_4: multiYearProjection[4] || 0,
        escalation_rate: escalationRate,
        total_value: multiYearTotal || 0,
        number_of_option_years: numberOfOptionYears
      } : null,
      ai_analysis: aiRecommendations,
      win_probability: aiRecommendations?.win_probability,
      competitor_range: competitorEstimate,
      sensitivity_analysis: sensitivityResults,
      estimate_status: "draft"
    };
    
    saveMutation.mutate(estimateData);
  };

  const handleLoadEstimate = (estimate) => {
    setCurrentEstimateId(estimate.id);
    setEstimateName(estimate.estimate_name);
    setLaborCategories(estimate.labor_categories || [{ name: "", hours: 0, rate: 0, base_rate: 0, fringe_rate: 0, overhead_rate: 0, ga_rate: 0 }]);
    setOdcItems(estimate.odc_items || [{ name: "", quantity: 0, cost: 0, category: "other" }]);
    setFeePercentage(estimate.fee_percentage || 0); // Allow 0 fee
    
    if (estimate.multi_year_projection) {
      setEnableMultiYear(true);
      setEscalationRate(estimate.multi_year_projection.escalation_rate || 0);
      setNumberOfOptionYears(estimate.multi_year_projection.number_of_option_years || 0);
    } else {
      setEnableMultiYear(false);
    }

    if (estimate.ai_analysis) {
      setAiRecommendations(estimate.ai_analysis);
      setCompetitorEstimate(estimate.competitor_range || { low: 0, mid: 0, high: 0 });
      setShowAIInsights(true);

      // Restore industry benchmarks if available in saved AI analysis
      if (estimate.ai_analysis.should_cost_estimate) {
        setIndustryBenchmarks({
          average: estimate.ai_analysis.should_cost_estimate,
          sampleSize: savedEstimates.filter(e => e.outcome).length, // Re-calculate sample size based on current loaded savedEstimates
          feeRange: {
            min: Math.max(0, estimate.ai_analysis.optimal_fee_percentage - 3),
            average: estimate.ai_analysis.optimal_fee_percentage,
            max: estimate.ai_analysis.optimal_fee_percentage + 3
          }
        });
      }
    } else {
      setShowAIInsights(false);
      setAiRecommendations(null);
      setCompetitorEstimate({ low: 0, mid: 0, high: 0 });
      setIndustryBenchmarks(null);
    }
    
    if (estimate.sensitivity_analysis) {
      setSensitivityResults(estimate.sensitivity_analysis);
    } else {
      setSensitivityResults(null);
    }
    
    setShowLoadDialog(false);
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
  const multiYearProjection = enableMultiYear ? calculateMultiYearProjection() : [];
  const multiYearTotal = multiYearProjection.reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Advanced Cost Estimator</h1>
          <p className="text-slate-600">Quick cost estimation with AI-powered competitive intelligence</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowLoadDialog(true)}
            disabled={savedEstimates.length === 0}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Load
            {savedEstimates.length > 0 && (
              <Badge className="ml-2" variant="secondary">{savedEstimates.length}</Badge>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEstimateName(currentEstimateId ? estimateName : ""); // Pre-fill name if existing estimate, else clear
              setShowSaveDialog(true);
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
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
                AI Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calculator">
            <Calculator className="w-4 h-4 mr-2" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <TrendingUp className="w-4 h-4 mr-2" />
            Advanced
          </TabsTrigger>
          {showAIInsights && (
            <TabsTrigger value="insights">
              <Target className="w-4 h-4 mr-2" />
              AI Insights
              <Badge className="ml-2 bg-purple-600">New</Badge>
            </TabsTrigger>
          )}
          {sensitivityResults && (
            <TabsTrigger value="sensitivity">
              <BarChart2 className="w-4 h-4 mr-2" />
              Sensitivity
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
                    
                    {enableMultiYear && (
                      <div className="pt-3 border-t border-slate-300">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-indigo-900">{numberOfOptionYears + 1}-Year Total</span>
                          <span className="text-lg font-bold text-indigo-600">
                            ${multiYearTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    )}
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
                    Click <strong>"AI Analysis"</strong> for competitive intelligence and win probability!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Multi-Year Projection */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Multi-Year Projection</CardTitle>
                <CardDescription>Model base year + option years with escalation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="enable-multi-year">Enable Multi-Year</Label>
                  <input
                    id="enable-multi-year"
                    type="checkbox"
                    checked={enableMultiYear}
                    onChange={(e) => setEnableMultiYear(e.target.checked)}
                    className="h-5 w-5"
                  />
                </div>
                
                {enableMultiYear && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="escalation-rate">Annual Escalation Rate (%)</Label>
                      <Input
                        id="escalation-rate"
                        type="number"
                        value={escalationRate}
                        onChange={(e) => setEscalationRate(parseFloat(e.target.value) || 0)}
                        step="0.1"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="number-of-option-years">Number of Option Years</Label>
                      <Select value={numberOfOptionYears.toString()} onValueChange={(v) => setNumberOfOptionYears(parseInt(v))}>
                        <SelectTrigger id="number-of-option-years">
                          <SelectValue placeholder="Select years" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Base Year Only</SelectItem>
                          <SelectItem value="1">1 Option Year</SelectItem>
                          <SelectItem value="2">2 Option Years</SelectItem>
                          <SelectItem value="3">3 Option Years</SelectItem>
                          <SelectItem value="4">4 Option Years</SelectItem>
                          <SelectItem value="5">5 Option Years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="pt-4 space-y-2">
                      {multiYearProjection.map((amount, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">{idx === 0 ? "Base Year" : `Option Year ${idx}`}</span>
                          <span className="font-semibold">${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t flex justify-between items-center">
                        <span className="font-bold text-slate-900">Total {numberOfOptionYears + 1}-Year Value</span>
                        <span className="text-lg font-bold text-indigo-600">${multiYearTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Burden Rate Calculator */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Burden Rate Settings</CardTitle>
                <CardDescription>Configure default indirect cost rates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fringe-rate">Default Fringe Rate (%)</Label>
                  <Input
                    id="fringe-rate"
                    type="number"
                    value={defaultFringeRate}
                    onChange={(e) => setDefaultFringeRate(parseFloat(e.target.value) || 0)}
                    step="0.1"
                  />
                  <p className="text-xs text-slate-500">Typical range: 25-40%</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="overhead-rate">Default Overhead Rate (%)</Label>
                  <Input
                    id="overhead-rate"
                    type="number"
                    value={defaultOverheadRate}
                    onChange={(e) => setDefaultOverheadRate(parseFloat(e.target.value) || 0)}
                    step="0.1"
                  />
                  <p className="text-xs text-slate-500">Typical range: 35-60%</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ga-rate">Default G&A Rate (%)</Label>
                  <Input
                    id="ga-rate"
                    type="number"
                    value={defaultGARate}
                    onChange={(e) => setDefaultGARate(parseFloat(e.target.value) || 0)}
                    step="0.1"
                  />
                  <p className="text-xs text-slate-500">Typical range: 5-12%</p>
                </div>
                
                <Alert className="bg-amber-50 border-amber-200">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-900">
                    These rates will be auto-applied to new labor categories. You can override per category if you load an estimate with custom rates.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {showAIInsights && aiRecommendations && (
          <TabsContent value="insights" className="space-y-6">
            {/* Pricing Intelligence Panel */}
            <PricingIntelligencePanel
              yourPrice={grandTotal}
              estimatedCompetitorPricing={competitorEstimate}
              industryBenchmarks={industryBenchmarks}
              aiRecommendations={aiRecommendations.recommendations?.map(rec => ({
                recommendation: rec,
                expectedImpact: "Potential to improve win probability"
              }))}
              riskFactors={aiRecommendations.risk_factors?.map(risk => ({
                factor: risk,
                description: risk,
                mitigation: "Address this concern in your proposal narrative"
              }))}
            />

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
                <div className="grid md:grid-cols-4 gap-4 mb-6">
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
                  <div className="p-4 bg-white rounded-lg border-2 border-amber-200">
                    <p className="text-sm text-slate-600 mb-1">Price-to-Win</p>
                    <p className="text-2xl font-bold text-amber-600">
                      ${aiRecommendations.price_to_win_recommendation?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-semibold text-slate-900 mb-2">Price Analysis</h4>
                  <p className="text-sm text-slate-700">{aiRecommendations.price_analysis}</p>
                </div>
              </CardContent>
            </Card>

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

        {sensitivityResults && (
          <TabsContent value="sensitivity" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-600" />
                  Sensitivity Analysis
                </CardTitle>
                <CardDescription>
                  How changes in key variables impact your total price
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sensitivityResults.map((result, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900">{result.name}</span>
                        <span className={`font-bold ${result.delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {result.delta > 0 ? '+' : ''}{result.percentChange.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">New Total:</span>
                        <span className="font-semibold">
                          ${result.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Change:</span>
                        <span className={result.delta > 0 ? 'text-red-600' : 'text-green-600'}>
                          {result.delta > 0 ? '+' : ''}${result.delta.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Alert className="mt-6 bg-indigo-50 border-indigo-200">
                  <Lightbulb className="w-4 h-4 text-indigo-600" />
                  <AlertDescription className="text-sm text-indigo-900">
                    <strong>Key Insight:</strong> Labor costs often have the largest impact on your total price. 
                    Consider optimizing your labor mix to improve competitiveness.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
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
                Use the full Pricing Module in Phase 6 for: Multi-year CLINs, Subcontractor management, Export to Excel, and more
              </p>
            </div>
            <Button 
              onClick={() => navigate(createPageUrl("Pricing"))}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Open Pricing Module
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Cost Estimate</DialogTitle>
            <DialogDescription>
              Save this estimate for future reference and learning
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="estimate-name-input">Estimate Name</Label>
              <Input
                id="estimate-name-input"
                placeholder="e.g., DoD Cloud Migration - Initial Estimate"
                value={estimateName}
                onChange={(e) => setEstimateName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEstimate} disabled={saveMutation.isPending || !estimateName.trim()}>
              {saveMutation.isPending ? 'Saving...' : 'Save Estimate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Load Saved Estimate</DialogTitle>
            <DialogDescription>
              Select a previously saved estimate to load
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {savedEstimates.length === 0 ? (
              <p className="text-center text-slate-500">No saved estimates found for your organization.</p>
            ) : (
              savedEstimates.map((estimate) => (
                <Card 
                  key={estimate.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleLoadEstimate(estimate)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">{estimate.estimate_name}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                          <span>Total: ${estimate.grand_total?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          {estimate.win_probability && (
                            <span>Win Prob: {estimate.win_probability}%</span>
                          )}
                          {estimate.outcome && (
                            <Badge className={estimate.outcome === 'won' ? 'bg-green-600' : estimate.outcome === 'lost' ? 'bg-red-600' : 'bg-slate-600'}>
                              {estimate.outcome}
                            </Badge>
                          )}
                          {estimate.multi_year_projection?.total_value && (
                            <span>{estimate.multi_year_projection.number_of_option_years + 1}-Yr Total: ${estimate.multi_year_projection.total_value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Created {new Date(estimate.created_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
