import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, DollarSign, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function PricingReviewModal({ isOpen, onClose, proposalId }) {
  const [loading, setLoading] = useState(true);
  const [proposalData, setProposalData] = useState(null);
  const [pricingData, setPricingData] = useState(null);

  useEffect(() => {
    if (isOpen && proposalId) {
      loadData();
    }
  }, [isOpen, proposalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      if (proposals.length > 0) {
        setProposalData(proposals[0]);
      }

      // Try to load pricing strategy if it exists
      const pricingStrategies = await base44.entities.PricingStrategy.filter({
        proposal_id: proposalId
      });

      if (pricingStrategies.length > 0) {
        setPricingData(pricingStrategies[0]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePricingHealth = () => {
    if (!pricingData) return 0;
    
    let score = 0;
    if (pricingData.calculated_total_price > 0) score += 40;
    if (pricingData.blended_fee_percentage > 0) score += 20;
    if (pricingData.basis_of_estimate) score += 20;
    if (pricingData.pricing_assumptions?.length > 0) score += 20;
    
    return score;
  };

  const pricingHealth = calculatePricingHealth();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Pricing Review
          </DialogTitle>
          <DialogDescription>
            Review your pricing strategy and competitiveness
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Pricing Health Score */}
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Pricing Completeness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Overall Readiness</span>
                    <span className={`text-2xl font-bold ${
                      pricingHealth >= 80 ? 'text-green-600' :
                      pricingHealth >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {pricingHealth}%
                    </span>
                  </div>
                  <Progress 
                    value={pricingHealth} 
                    className={`h-2 ${
                      pricingHealth >= 80 ? '[&>div]:bg-green-600' :
                      pricingHealth >= 60 ? '[&>div]:bg-yellow-600' :
                      '[&>div]:bg-red-600'
                    }`}
                  />
                  {pricingHealth < 100 && (
                    <p className="text-xs text-slate-600 mt-2">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Complete all pricing elements for submission
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {pricingData ? (
              <>
                {/* Pricing Summary */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-green-600">
                        ${(pricingData.calculated_total_price || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-green-900 mt-1">Total Price</p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-blue-600">
                        {pricingData.blended_fee_percentage?.toFixed(1) || '0'}%
                      </p>
                      <p className="text-xs text-blue-900 mt-1">Fee Percentage</p>
                    </CardContent>
                  </Card>
                  <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="p-4 text-center">
                      <Badge className="text-sm px-3 py-1 bg-purple-600 text-white capitalize">
                        {pricingData.competitive_positioning || 'Not Set'}
                      </Badge>
                      <p className="text-xs text-purple-900 mt-2">Positioning</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Pricing Approach */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base">Pricing Strategy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Approach</span>
                        <Badge variant="outline" className="capitalize">
                          {pricingData.pricing_approach?.replace('_', ' ')}
                        </Badge>
                      </div>
                      {pricingData.target_total_price && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Target Price</span>
                          <span className="text-sm font-semibold text-slate-900">
                            ${pricingData.target_total_price.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {pricingData.win_probability_at_price && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Win Probability</span>
                          <span className="text-sm font-semibold text-green-600">
                            {pricingData.win_probability_at_price}%
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Competitive Analysis */}
                {pricingData.estimated_competitor_pricing && (
                  <Card className="border-none shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-base">Competitive Intelligence</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Est. Competitor Low</span>
                          <span className="text-sm font-semibold text-slate-900">
                            ${(pricingData.estimated_competitor_pricing.low_estimate || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Est. Competitor Mid</span>
                          <span className="text-sm font-semibold text-slate-900">
                            ${(pricingData.estimated_competitor_pricing.mid_estimate || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Est. Competitor High</span>
                          <span className="text-sm font-semibold text-slate-900">
                            ${(pricingData.estimated_competitor_pricing.high_estimate || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Recommendations */}
                {pricingData.ai_recommendations?.length > 0 && (
                  <Card className="border-indigo-200 bg-indigo-50">
                    <CardHeader>
                      <CardTitle className="text-base text-indigo-900">AI Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {pricingData.ai_recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <TrendingUp className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-indigo-900">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Assumptions */}
                {pricingData.pricing_assumptions?.length > 0 && (
                  <Card className="border-none shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-base">Key Assumptions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {pricingData.pricing_assumptions.map((assumption, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-slate-700">{assumption}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto text-amber-600 mb-4" />
                  <h3 className="font-semibold text-amber-900 mb-2">No Pricing Data</h3>
                  <p className="text-sm text-amber-700 mb-4">
                    Pricing has not been developed yet. Navigate to Phase 7 in the Proposal Builder to create your pricing strategy.
                  </p>
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}