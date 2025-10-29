import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Minus, FileText, DollarSign, Target } from "lucide-react";

export default function PriceComparison({ organizationId, currentProposalId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProposals, setSelectedProposals] = useState([currentProposalId]);

  const { data: proposals } = useQuery({
    queryKey: ['comparison-proposals', organizationId],
    queryFn: () => organizationId ? base44.entities.Proposal.filter({ organization_id: organizationId }, '-created_date') : [],
    initialData: [],
    enabled: !!organizationId
  });

  const { data: allClins } = useQuery({
    queryKey: ['comparison-clins', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const clins = await base44.entities.CLIN.filter({ organization_id: organizationId });
      return clins;
    },
    initialData: [],
    enabled: !!organizationId
  });

  const { data: allPricingStrategies } = useQuery({
    queryKey: ['comparison-strategies', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return await base44.entities.PricingStrategy.filter({ organization_id: organizationId });
    },
    initialData: [],
    enabled: !!organizationId
  });

  // Get comparison data
  const comparisonData = selectedProposals
    .map(propId => {
      const proposal = proposals.find(p => p.id === propId);
      if (!proposal) return null;

      const proposalClins = allClins.filter(c => c.proposal_id === propId);
      const totalCost = proposalClins.reduce((sum, c) => sum + (c.total_cost || 0), 0);
      const totalPrice = proposalClins.reduce((sum, c) => sum + (c.total_price || 0), 0);
      const laborCost = proposalClins.reduce((sum, c) => sum + (c.labor_cost || 0), 0);
      const odcCost = proposalClins.reduce((sum, c) => sum + (c.odc_cost || 0), 0);
      const fee = totalPrice - totalCost;
      const feePercentage = totalCost > 0 ? (fee / totalCost * 100) : 0;

      const strategy = allPricingStrategies.find(s => s.proposal_id === propId);

      return {
        id: propId,
        name: proposal.proposal_name,
        agency: proposal.agency_name,
        status: proposal.status,
        totalCost,
        totalPrice,
        laborCost,
        odcCost,
        fee,
        feePercentage,
        clinCount: proposalClins.length,
        winProbability: strategy?.win_probability_at_price || null
      };
    })
    .filter(Boolean);

  // Chart data
  const chartData = comparisonData.map(d => ({
    name: d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name,
    Cost: d.totalCost,
    Price: d.totalPrice,
    Fee: d.fee
  }));

  const costBreakdownData = comparisonData.map(d => ({
    name: d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name,
    Labor: d.laborCost,
    ODC: d.odcCost
  }));

  // Statistics
  const avgPrice = comparisonData.length > 0 
    ? comparisonData.reduce((sum, d) => sum + d.totalPrice, 0) / comparisonData.length 
    : 0;
  const avgFee = comparisonData.length > 0 
    ? comparisonData.reduce((sum, d) => sum + d.feePercentage, 0) / comparisonData.length 
    : 0;
  const lowestPrice = comparisonData.length > 0 
    ? Math.min(...comparisonData.map(d => d.totalPrice)) 
    : 0;
  const highestPrice = comparisonData.length > 0 
    ? Math.max(...comparisonData.map(d => d.totalPrice)) 
    : 0;

  const toggleProposal = (propId) => {
    if (selectedProposals.includes(propId)) {
      if (selectedProposals.length > 1) {
        setSelectedProposals(selectedProposals.filter(id => id !== propId));
      }
    } else {
      setSelectedProposals([...selectedProposals, propId]);
    }
  };

  if (comparisonData.length < 2) {
    return (
      <Card className="border-none shadow-xl">
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Need More Proposals</h3>
          <p className="text-slate-600 mb-6">
            Price comparison requires at least 2 proposals with pricing data
          </p>
          <Button onClick={() => setShowDialog(true)}>
            Select Proposals to Compare
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                Price Comparison Analysis
              </CardTitle>
              <CardDescription>
                Compare pricing across {comparisonData.length} proposals
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => setShowDialog(true)}>
              Change Selection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-600 mb-1">Average Price</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${avgPrice.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-600 mb-1">Lowest Price</p>
                <p className="text-2xl font-bold text-green-600">
                  ${lowestPrice.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-600 mb-1">Highest Price</p>
                <p className="text-2xl font-bold text-red-600">
                  ${highestPrice.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-slate-600 mb-1">Avg Fee</p>
                <p className="text-2xl font-bold text-purple-600">
                  {avgFee.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Price Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Price & Cost Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="Cost" fill="#3b82f6" name="Total Cost" />
                  <Bar dataKey="Price" fill="#10b981" name="Total Price" />
                  <Bar dataKey="Fee" fill="#8b5cf6" name="Fee/Profit" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost Structure Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="Labor" fill="#3b82f6" name="Labor" stackId="a" />
                  <Bar dataKey="ODC" fill="#8b5cf6" name="ODC" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="p-2 font-semibold">Proposal</th>
                      <th className="p-2 font-semibold">Agency</th>
                      <th className="p-2 font-semibold text-right">Cost</th>
                      <th className="p-2 font-semibold text-right">Price</th>
                      <th className="p-2 font-semibold text-right">Fee %</th>
                      <th className="p-2 font-semibold text-right">CLINs</th>
                      <th className="p-2 font-semibold text-right">Win %</th>
                      <th className="p-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((item, idx) => {
                      const isLowest = item.totalPrice === lowestPrice;
                      const isHighest = item.totalPrice === highestPrice;
                      const isAverage = !isLowest && !isHighest;

                      return (
                        <tr key={item.id} className="border-b hover:bg-slate-50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {isLowest && (
                                <Badge className="bg-green-600 text-xs mt-1">
                                  <TrendingDown className="w-3 h-3 mr-1" />
                                  Lowest
                                </Badge>
                              )}
                              {isHighest && (
                                <Badge className="bg-red-600 text-xs mt-1">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  Highest
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-slate-600">{item.agency}</td>
                          <td className="p-2 text-right">${item.totalCost.toLocaleString()}</td>
                          <td className="p-2 text-right font-semibold">${item.totalPrice.toLocaleString()}</td>
                          <td className="p-2 text-right">{item.feePercentage.toFixed(1)}%</td>
                          <td className="p-2 text-right">{item.clinCount}</td>
                          <td className="p-2 text-right">
                            {item.winProbability ? (
                              <Badge variant="outline">{item.winProbability}%</Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-2">
                            <Badge variant="secondary" className="capitalize">
                              {item.status?.replace('_', ' ')}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base">Comparative Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600 mt-0.5" />
                  <p className="text-blue-900">
                    Price spread: <strong>${(highestPrice - lowestPrice).toLocaleString()}</strong> ({((highestPrice - lowestPrice) / lowestPrice * 100).toFixed(1)}% variation)
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="w-4 h-4 text-blue-600 mt-0.5" />
                  <p className="text-blue-900">
                    Average fee percentage: <strong>{avgFee.toFixed(1)}%</strong> across all proposals
                  </p>
                </div>
                {comparisonData.some(d => d.winProbability) && (
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-blue-900">
                      Proposals with AI analysis show win probabilities ranging from {Math.min(...comparisonData.filter(d => d.winProbability).map(d => d.winProbability))}% to {Math.max(...comparisonData.filter(d => d.winProbability).map(d => d.winProbability))}%
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Selection Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Proposals to Compare</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {proposals
              .filter(p => allClins.some(c => c.proposal_id === p.id))
              .map((proposal) => {
                const proposalClins = allClins.filter(c => c.proposal_id === proposal.id);
                const totalPrice = proposalClins.reduce((sum, c) => sum + (c.total_price || 0), 0);
                
                return (
                  <div 
                    key={proposal.id} 
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"
                    onClick={() => toggleProposal(proposal.id)}
                  >
                    <Checkbox 
                      checked={selectedProposals.includes(proposal.id)}
                      onCheckedChange={() => toggleProposal(proposal.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{proposal.proposal_name}</p>
                      <p className="text-sm text-slate-600">{proposal.agency_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {proposalClins.length} CLINs
                        </Badge>
                        <span className="text-sm font-semibold text-green-600">
                          ${totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}