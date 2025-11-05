import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DollarSign,
  Plus,
  Trash2,
  Calculator,
  Sparkles,
  TrendingUp,
  Save,
  Package,
  Users,
  History,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CLINBuilder from "../pricing/CLINBuilder";
import SubcontractorManager from "../pricing/SubcontractorManager";
import BenchmarkManager from "../pricing/BenchmarkManager";
import HistoricalPricingDashboard from "../pricing/HistoricalPricingDashboard";
import ExcelExporter from "../pricing/ExcelExporter";

export default function Phase7Pricing({ 
  proposalData, 
  setProposalData, 
  proposalId,
  onSaveAndGoToPipeline 
}) {
  const queryClient = useQueryClient();
  const [organization, setOrganization] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("calculator");
  const [currentEstimateId, setCurrentEstimateId] = useState(null);
  
  const [laborCategories, setLaborCategories] = useState([
    { name: "", hours: 0, rate: 0, base_rate: 0, fringe_rate: 35, overhead_rate: 45, ga_rate: 8 }
  ]);
  const [odcItems, setOdcItems] = useState([
    { name: "", quantity: 0, cost: 0, category: "other" }
  ]);
  const [feePercentage, setFeePercentage] = useState(10);
  
  // Multi-year settings
  const [enableMultiYear, setEnableMultiYear] = useState(false);
  const [escalationRate, setEscalationRate] = useState(3.0);
  const [numberOfOptionYears, setNumberOfOptionYears] = useState(4);
  
  // AI Enhancement States
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [competitorEstimate, setCompetitorEstimate] = useState({ low: 0, mid: 0, high: 0 });
  const [industryBenchmarks, setIndustryBenchmarks] = useState(null);
  const [sensitivityResults, setSensitivityResults] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
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
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  // Query for saved estimates linked to this proposal
  const { data: savedEstimates = [] } = useQuery({
    queryKey: ['cost-estimates', proposalId, organization?.id],
    queryFn: async () => {
      if (!proposalId || !organization?.id) return [];
      return base44.entities.CostEstimate.filter(
        { proposal_id: proposalId, organization_id: organization.id },
        '-created_date',
        10
      );
    },
    enabled: !!proposalId && !!organization?.id
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
      alert('✓ Pricing saved successfully!');
    },
    onError: (error) => {
      console.error("Error saving estimate:", error);
      alert("Error saving pricing. Please try again.");
    }
  });

  const addLaborCategory = () => {
    setLaborCategories([...laborCategories, { 
      name: "", 
      hours: 0, 
      rate: 0, 
      base_rate: 0, 
      fringe_rate: 35, 
      overhead_rate: 45, 
      ga_rate: 8 
    }]);
  };

  const removeLaborCategory = (index) => {
    setLaborCategories(laborCategories.filter((_, i) => i !== index));
  };

  const updateLaborCategory = (index, field, value) => {
    const updated = [...laborCategories];
    updated[index][field] = value;
    
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

  const runAIAnalysis = async () => {
    setAiAnalyzing(true);
    try {
      const totalLabor = calculateTotalLabor();
      const totalOdc = calculateTotalOdc();
      const grandTotal = calculateGrandTotal();
      
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

      const prompt = `You are a government contracting pricing strategist. Analyze this cost estimate and provide competitive intelligence.

**COST BREAKDOWN:**
- Total Labor: $${totalLabor.toLocaleString()}
- Total ODC: $${totalOdc.toLocaleString()}
- Fee: ${feePercentage}%
- Grand Total: $${grandTotal.toLocaleString()}

**PROPOSAL CONTEXT:**
- Proposal: ${proposalData.proposal_name}
- Agency: ${proposalData.agency_name || 'N/A'}
- Project: ${proposalData.project_title || 'N/A'}

${historicalContext ? `
**HISTORICAL ESTIMATES:**
${historicalContext}
` : ''}

Return competitive analysis as JSON with: competitive_position, competitor_range (low/mid/high), win_probability, risk_factors, recommendations, optimal_fee_percentage, price_to_win_recommendation, should_cost_estimate.`;

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
            price_to_win_recommendation: { type: "number" },
            should_cost_estimate: { type: "number" }
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

  const handleSaveEstimate = async () => {
    if (!organization?.id || !proposalId) {
      alert('Missing required data');
      return;
    }
    
    const estimateData = {
      organization_id: organization.id,
      proposal_id: proposalId,
      estimate_name: `${proposalData.proposal_name} - Pricing`,
      estimate_type: "detailed_estimate",
      labor_categories: laborCategories,
      odc_items: odcItems,
      total_labor: calculateTotalLabor(),
      total_odc: calculateTotalOdc(),
      subtotal: calculateSubtotal(),
      fee_percentage: feePercentage,
      fee_amount: calculateFee(),
      grand_total: calculateGrandTotal(),
      multi_year_projection: enableMultiYear ? {
        escalation_rate: escalationRate,
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

  if (!organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  const grandTotal = calculateGrandTotal();
  const totalHours = laborCategories.reduce((sum, cat) => sum + cat.hours, 0);
  const multiYearProjection = enableMultiYear ? calculateMultiYearProjection() : [];
  const multiYearTotal = multiYearProjection.reduce((a, b) => a + b, 0);

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Phase 7: Pricing & Cost Build
            </CardTitle>
            <CardDescription>
              Build comprehensive pricing with labor, ODCs, CLINs, and AI-powered competitive intelligence
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveEstimate} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Pricing
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

        {grandTotal > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Price</p>
                <p className="text-3xl font-bold text-green-600">
                  ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {enableMultiYear && (
                  <p className="text-sm text-slate-600 mt-1">
                    {numberOfOptionYears + 1}-Year Total: ${multiYearTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                )}
              </div>
              {aiRecommendations?.win_probability && (
                <div className="text-right">
                  <p className="text-sm text-slate-600 mb-1">AI Win Probability</p>
                  <Badge className={`text-lg px-4 py-2 ${
                    aiRecommendations.win_probability >= 70 ? 'bg-green-600' :
                    aiRecommendations.win_probability >= 50 ? 'bg-yellow-600' :
                    'bg-red-600'
                  } text-white`}>
                    {aiRecommendations.win_probability}%
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="calculator">
              <Calculator className="w-4 h-4 mr-2" />
              Quick Build
            </TabsTrigger>
            <TabsTrigger value="clins">
              <Package className="w-4 h-4 mr-2" />
              CLINs
            </TabsTrigger>
            <TabsTrigger value="subcontractors">
              <Users className="w-4 h-4 mr-2" />
              Subs
            </TabsTrigger>
            {showAIInsights && (
              <TabsTrigger value="insights">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Insights
              </TabsTrigger>
            )}
            <TabsTrigger value="benchmarks">
              <History className="w-4 h-4 mr-2" />
              Benchmarks
            </TabsTrigger>
            <TabsTrigger value="export">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export
            </TabsTrigger>
          </TabsList>

          {/* Quick Calculator Tab */}
          <TabsContent value="calculator" className="space-y-4">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Labor Categories</CardTitle>
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
                          placeholder="Category"
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">ODC Items</CardTitle>
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
                          placeholder="Item"
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
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader>
                    <CardTitle className="text-base">Cost Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Labor</span>
                      <span className="font-semibold">${calculateTotalLabor().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">ODC</span>
                      <span className="font-semibold">${calculateTotalOdc().toLocaleString()}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Fee %</span>
                        <Input
                          type="number"
                          value={feePercentage}
                          onChange={(e) => setFeePercentage(parseFloat(e.target.value) || 0)}
                          className="w-20 text-right h-8"
                        />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Fee Amount</span>
                        <span className="font-semibold">${calculateFee().toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t-2">
                      <div className="flex justify-between">
                        <span className="font-bold">Grand Total</span>
                        <span className="text-xl font-bold text-blue-600">
                          ${grandTotal.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {grandTotal > 0 && !showAIInsights && (
                  <Alert className="bg-purple-50 border-purple-200">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <AlertDescription className="text-sm text-purple-900">
                      Run <strong>AI Analysis</strong> for competitive intelligence!
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </TabsContent>

          {/* CLINs Tab */}
          <TabsContent value="clins">
            <CLINBuilder 
              proposalId={proposalId}
              organizationId={organization?.id}
              proposalData={proposalData}
            />
          </TabsContent>

          {/* Subcontractors Tab */}
          <TabsContent value="subcontractors">
            <SubcontractorManager 
              proposalId={proposalId}
              organization={organization}
            />
          </TabsContent>

          {/* AI Insights Tab */}
          {showAIInsights && aiRecommendations && (
            <TabsContent value="insights">
              <div className="space-y-4">
                <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      AI Competitive Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Position</p>
                        <p className="font-semibold text-lg">{aiRecommendations.competitive_position}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Win Probability</p>
                        <p className="font-bold text-2xl text-green-600">{aiRecommendations.win_probability}%</p>
                      </div>
                    </div>

                    {aiRecommendations.recommendations?.length > 0 && (
                      <div>
                        <p className="font-semibold mb-2">Recommendations:</p>
                        <ul className="space-y-2">
                          {aiRecommendations.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {aiRecommendations.risk_factors?.length > 0 && (
                      <div>
                        <p className="font-semibold mb-2">Risk Factors:</p>
                        <ul className="space-y-2">
                          {aiRecommendations.risk_factors.map((risk, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Benchmarks Tab */}
          <TabsContent value="benchmarks">
            <div className="space-y-6">
              <BenchmarkManager organization={organization} />
              
              {savedEstimates.length > 0 && (
                <HistoricalPricingDashboard 
                  organization={organization}
                  estimates={savedEstimates}
                />
              )}
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-green-600" />
                  Export Pricing
                </CardTitle>
                <CardDescription>
                  Export your pricing data to Excel or PDF for submission
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExcelExporter 
                  proposalId={proposalId}
                  estimateData={{
                    estimate_name: `${proposalData.proposal_name} - Pricing`,
                    labor_categories: laborCategories,
                    odc_items: odcItems,
                    total_labor: calculateTotalLabor(),
                    total_odc: calculateTotalOdc(),
                    subtotal: calculateSubtotal(),
                    fee_percentage: feePercentage,
                    fee_amount: calculateFee(),
                    grand_total: grandTotal,
                    multi_year_projection: enableMultiYear ? multiYearProjection : null,
                    ai_analysis: aiRecommendations
                  }}
                  organization={organization}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save button at bottom */}
        {onSaveAndGoToPipeline && (
          <div className="flex justify-center pt-6 mt-6 border-t">
            <Button
              variant="outline"
              onClick={onSaveAndGoToPipeline}
              className="bg-white hover:bg-slate-50"
            >
              Save and Go to Pipeline
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}