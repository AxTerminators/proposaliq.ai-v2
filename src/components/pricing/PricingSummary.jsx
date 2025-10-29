import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, Users, Package, Plane, Award } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export default function PricingSummary({
  clins,
  laborAllocations,
  odcItems,
  pricingStrategy,
  totalCost,
  totalPrice,
  totalLaborCost,
  totalODCCost
}) {

  // Cost breakdown data
  const costBreakdownData = [
    { name: 'Labor', value: totalLaborCost, color: '#3b82f6' },
    { name: 'ODC', value: totalODCCost, color: '#8b5cf6' }
  ].filter(d => d.value > 0);

  // CLIN breakdown
  const clinBreakdownData = clins.map((clin, idx) => ({
    name: clin.clin_number,
    cost: clin.total_cost || 0,
    price: clin.total_price || 0,
    color: COLORS[idx % COLORS.length]
  }));

  // Labor by category
  const laborByCategory = laborAllocations.reduce((acc, alloc) => {
    if (!acc[alloc.labor_category_name]) {
      acc[alloc.labor_category_name] = 0;
    }
    acc[alloc.labor_category_name] += alloc.total_cost || 0;
    return acc;
  }, {});

  const laborCategoryData = Object.entries(laborByCategory).map(([name, value]) => ({
    name,
    value
  }));

  // ODC by category
  const odcByCategory = odcItems.reduce((acc, item) => {
    const category = item.odc_category || 'other';
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += item.total_cost || 0;
    return acc;
  }, {});

  const odcCategoryData = Object.entries(odcByCategory).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value
  }));

  const impliedFee = totalPrice - totalCost;
  const impliedFeePercentage = totalCost > 0 ? ((impliedFee / totalCost) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Pricing Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Total Price</p>
              <p className="text-4xl font-bold text-green-600">
                ${totalPrice.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Total Cost</p>
              <p className="text-4xl font-bold text-blue-600">
                ${totalCost.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Fee/Profit</p>
              <p className="text-4xl font-bold text-purple-600">
                ${impliedFee.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {impliedFeePercentage.toFixed(2)}% of cost
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">CLINs</p>
              <p className="text-4xl font-bold text-amber-600">
                {clins.length}
              </p>
            </div>
          </div>

          {/* Cost Composition */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-white rounded-lg border">
              <p className="font-semibold mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Labor
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    ${totalLaborCost.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {totalCost > 0 ? ((totalLaborCost / totalCost) * 100).toFixed(1) : 0}% of total cost
                  </p>
                </div>
              </div>
              <Progress 
                value={totalCost > 0 ? (totalLaborCost / totalCost) * 100 : 0} 
                className="h-2 mt-2"
              />
            </div>

            <div className="p-4 bg-white rounded-lg border">
              <p className="font-semibold mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                ODC
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    ${totalODCCost.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {totalCost > 0 ? ((totalODCCost / totalCost) * 100).toFixed(1) : 0}% of total cost
                  </p>
                </div>
              </div>
              <Progress 
                value={totalCost > 0 ? (totalODCCost / totalCost) * 100 : 0} 
                className="h-2 mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Cost Breakdown Pie Chart */}
        {costBreakdownData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* CLINs Comparison */}
        {clinBreakdownData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CLIN Price Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={clinBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="cost" fill="#3b82f6" name="Cost" />
                  <Bar dataKey="price" fill="#10b981" name="Price" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Labor & ODC Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Labor by Category */}
        {laborCategoryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Labor by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {laborCategoryData
                  .sort((a, b) => b.value - a.value)
                  .map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{item.name}</span>
                        <span className="text-sm font-semibold">${item.value.toLocaleString()}</span>
                      </div>
                      <Progress 
                        value={(item.value / totalLaborCost) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ODC by Category */}
        {odcCategoryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                ODC by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {odcCategoryData
                  .sort((a, b) => b.value - a.value)
                  .map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize truncate">{item.name}</span>
                        <span className="text-sm font-semibold">${item.value.toLocaleString()}</span>
                      </div>
                      <Progress 
                        value={(item.value / totalODCCost) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* CLIN Details Table */}
      {clins.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CLIN Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-2 font-semibold">CLIN</th>
                    <th className="p-2 font-semibold">Title</th>
                    <th className="p-2 font-semibold">Period</th>
                    <th className="p-2 font-semibold text-right">Labor</th>
                    <th className="p-2 font-semibold text-right">ODC</th>
                    <th className="p-2 font-semibold text-right">Cost</th>
                    <th className="p-2 font-semibold text-right">Fee (%)</th>
                    <th className="p-2 font-semibold text-right">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {clins.map((clin) => (
                    <tr key={clin.id} className="border-b hover:bg-slate-50">
                      <td className="p-2">
                        <Badge>{clin.clin_number}</Badge>
                      </td>
                      <td className="p-2">{clin.clin_title}</td>
                      <td className="p-2 text-xs text-slate-600">{clin.period_of_performance}</td>
                      <td className="p-2 text-right">${clin.labor_cost?.toLocaleString() || '0'}</td>
                      <td className="p-2 text-right">${clin.odc_cost?.toLocaleString() || '0'}</td>
                      <td className="p-2 text-right font-semibold">${clin.total_cost?.toLocaleString() || '0'}</td>
                      <td className="p-2 text-right text-purple-600">{clin.fee_percentage}%</td>
                      <td className="p-2 text-right font-bold text-green-600">${clin.total_price?.toLocaleString() || '0'}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-slate-100">
                    <td className="p-2" colSpan="3">TOTAL</td>
                    <td className="p-2 text-right">${totalLaborCost.toLocaleString()}</td>
                    <td className="p-2 text-right">${totalODCCost.toLocaleString()}</td>
                    <td className="p-2 text-right">${totalCost.toLocaleString()}</td>
                    <td className="p-2 text-right text-purple-600">{impliedFeePercentage.toFixed(1)}%</td>
                    <td className="p-2 text-right text-green-600">${totalPrice.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pricing Strategy Summary */}
      {pricingStrategy && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Active Pricing Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-slate-600 mb-1">Approach</p>
                <Badge className="capitalize">
                  {pricingStrategy.pricing_approach?.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-xs text-slate-600 mb-1">Positioning</p>
                <Badge className="capitalize">
                  {pricingStrategy.competitive_positioning}
                </Badge>
              </div>
              {pricingStrategy.win_probability_at_price && (
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-xs text-slate-600 mb-1">Win Probability</p>
                  <p className="text-2xl font-bold text-green-600">
                    {pricingStrategy.win_probability_at_price}%
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}