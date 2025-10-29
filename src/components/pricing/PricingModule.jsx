import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Users,
  Package,
  Plane,
  TrendingUp,
  Calculator,
  Sparkles,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Download,
  AlertCircle,
  Target,
  Award,
  BarChart3
} from "lucide-react";
import LaborRateManager from "./LaborRateManager";
import CLINBuilder from "./CLINBuilder";
import PricingAnalyzer from "./PricingAnalyzer";
import PricingSummary from "./PricingSummary";

export default function PricingModule({ proposalId, proposalData, organizationId }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("summary");

  const { data: clins } = useQuery({
    queryKey: ['clins', proposalId],
    queryFn: () => proposalId ? base44.entities.CLIN.filter({ proposal_id: proposalId }, 'clin_number') : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: laborAllocations } = useQuery({
    queryKey: ['labor-allocations', proposalId],
    queryFn: () => proposalId ? base44.entities.LaborAllocation.filter({ proposal_id: proposalId }) : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: odcItems } = useQuery({
    queryKey: ['odc-items', proposalId],
    queryFn: () => proposalId ? base44.entities.ODCItem.filter({ proposal_id: proposalId }) : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: pricingStrategy } = useQuery({
    queryKey: ['pricing-strategy', proposalId],
    queryFn: async () => {
      if (!proposalId) return null;
      const strategies = await base44.entities.PricingStrategy.filter({ proposal_id: proposalId }, '-created_date', 1);
      return strategies.length > 0 ? strategies[0] : null;
    },
    enabled: !!proposalId
  });

  // Calculate totals
  const totalLaborCost = laborAllocations.reduce((sum, alloc) => sum + (alloc.total_cost || 0), 0);
  const totalODCCost = odcItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
  const totalCost = totalLaborCost + totalODCCost;
  const totalPrice = clins.reduce((sum, clin) => sum + (clin.total_price || 0), 0);
  const impliedFee = totalPrice - totalCost;
  const impliedFeePercentage = totalCost > 0 ? ((impliedFee / totalCost) * 100).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-600" />
                Pricing & Cost Module
              </CardTitle>
              <CardDescription>
                Comprehensive pricing, labor rates, CLINs, and cost analysis
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Pricing
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-green-700">
                  ${totalPrice.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600">Total Price</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calculator className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-blue-700">
                  ${totalCost.toLocaleString()}
                </p>
                <p className="text-sm text-slate-600">Total Cost</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-3xl font-bold text-purple-700">
                  {impliedFeePercentage}%
                </p>
                <p className="text-sm text-slate-600">Fee/Profit</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-8 h-8 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-amber-700">
                  {clins.length}
                </p>
                <p className="text-sm text-slate-600">CLINs</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="summary">
                <BarChart3 className="w-4 h-4 mr-2" />
                Summary
              </TabsTrigger>
              <TabsTrigger value="labor">
                <Users className="w-4 h-4 mr-2" />
                Labor Rates
              </TabsTrigger>
              <TabsTrigger value="clins">
                <Package className="w-4 h-4 mr-2" />
                CLINs
              </TabsTrigger>
              <TabsTrigger value="analysis">
                <Target className="w-4 h-4 mr-2" />
                Analysis
              </TabsTrigger>
              <TabsTrigger value="strategy">
                <Award className="w-4 h-4 mr-2" />
                Strategy
              </TabsTrigger>
            </TabsList>

            {/* Summary Tab */}
            <TabsContent value="summary">
              <PricingSummary
                proposalId={proposalId}
                organizationId={organizationId}
                clins={clins}
                laborAllocations={laborAllocations}
                odcItems={odcItems}
                pricingStrategy={pricingStrategy}
                totalCost={totalCost}
                totalPrice={totalPrice}
                totalLaborCost={totalLaborCost}
                totalODCCost={totalODCCost}
              />
            </TabsContent>

            {/* Labor Rates Tab */}
            <TabsContent value="labor">
              <LaborRateManager
                organizationId={organizationId}
                proposalId={proposalId}
              />
            </TabsContent>

            {/* CLINs Tab */}
            <TabsContent value="clins">
              <CLINBuilder
                proposalId={proposalId}
                organizationId={organizationId}
                proposalData={proposalData}
              />
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis">
              <PricingAnalyzer
                proposalId={proposalId}
                organizationId={organizationId}
                proposalData={proposalData}
                clins={clins}
                pricingStrategy={pricingStrategy}
                totalCost={totalCost}
                totalPrice={totalPrice}
              />
            </TabsContent>

            {/* Strategy Tab */}
            <TabsContent value="strategy">
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-lg">Pricing Strategy & Recommendations</CardTitle>
                  <CardDescription>
                    AI-powered pricing analysis and competitive positioning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pricingStrategy ? (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-lg border">
                          <p className="text-sm text-slate-600 mb-1">Pricing Approach</p>
                          <Badge className="text-base capitalize">
                            {pricingStrategy.pricing_approach?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="p-4 bg-white rounded-lg border">
                          <p className="text-sm text-slate-600 mb-1">Competitive Positioning</p>
                          <Badge className="text-base capitalize">
                            {pricingStrategy.competitive_positioning}
                          </Badge>
                        </div>
                      </div>

                      {pricingStrategy.price_to_win_analysis && (
                        <Card className="border-purple-200 bg-purple-50">
                          <CardHeader>
                            <CardTitle className="text-base">Price-to-Win Analysis</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-slate-600 mb-1">Recommended Price</p>
                                <p className="text-2xl font-bold text-purple-700">
                                  ${pricingStrategy.price_to_win_analysis.recommended_price?.toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-600 mb-1">Confidence Level</p>
                                <Badge>{pricingStrategy.price_to_win_analysis.confidence_level}</Badge>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-700 mb-1">Rationale:</p>
                                <p className="text-sm text-slate-600">
                                  {pricingStrategy.price_to_win_analysis.rationale}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {pricingStrategy.ai_recommendations && pricingStrategy.ai_recommendations.length > 0 && (
                        <Card className="border-blue-200">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-blue-600" />
                              AI Recommendations
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {pricingStrategy.ai_recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-600 mb-4">No pricing strategy defined yet</p>
                      <p className="text-sm text-slate-500">
                        Complete CLINs and labor allocations, then run pricing analysis
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}