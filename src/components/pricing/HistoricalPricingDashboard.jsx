import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Award, XCircle, BarChart3, PieChartIcon } from "lucide-react";

const COLORS = {
  won: '#10b981',
  lost: '#ef4444',
  pending: '#f59e0b'
};

export default function HistoricalPricingDashboard({ organization }) {
  const [timeRange, setTimeRange] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');

  // Query historical estimates
  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ['historical-estimates', organization?.id, timeRange, outcomeFilter],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const allEstimates = await base44.entities.CostEstimate.filter(
        { organization_id: organization.id },
        '-created_date',
        100
      );

      // Apply filters
      let filtered = allEstimates;

      if (outcomeFilter !== 'all') {
        filtered = filtered.filter(e => e.outcome === outcomeFilter);
      }

      if (timeRange !== 'all') {
        const days = parseInt(timeRange);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        filtered = filtered.filter(e => new Date(e.created_date) >= cutoffDate);
      }

      return filtered;
    },
    enabled: !!organization?.id
  });

  // Calculate metrics
  const metrics = React.useMemo(() => {
    const withOutcome = estimates.filter(e => e.outcome && e.outcome !== 'pending');
    const won = withOutcome.filter(e => e.outcome === 'won');
    const lost = withOutcome.filter(e => e.outcome === 'lost');

    const winRate = withOutcome.length > 0 ? (won.length / withOutcome.length) * 100 : 0;
    
    const avgWonPrice = won.length > 0
      ? won.reduce((sum, e) => sum + (e.grand_total || 0), 0) / won.length
      : 0;

    const avgLostPrice = lost.length > 0
      ? lost.reduce((sum, e) => sum + (e.grand_total || 0), 0) / lost.length
      : 0;

    const avgWinProbability = withOutcome.length > 0
      ? withOutcome.reduce((sum, e) => sum + (e.win_probability || 0), 0) / withOutcome.length
      : 0;

    const totalContractValue = won.reduce((sum, e) => sum + (e.actual_contract_value || e.grand_total || 0), 0);

    return {
      totalEstimates: estimates.length,
      winRate,
      avgWonPrice,
      avgLostPrice,
      avgWinProbability,
      totalContractValue,
      wonCount: won.length,
      lostCount: lost.length,
      pendingCount: estimates.filter(e => e.outcome === 'pending' || !e.outcome).length
    };
  }, [estimates]);

  // Prepare chart data
  const outcomeDistribution = [
    { name: 'Won', value: metrics.wonCount, color: COLORS.won },
    { name: 'Lost', value: metrics.lostCount, color: COLORS.lost },
    { name: 'Pending', value: metrics.pendingCount, color: COLORS.pending }
  ];

  const priceVsOutcome = estimates
    .filter(e => e.grand_total && e.outcome && e.outcome !== 'pending')
    .map(e => ({
      price: e.grand_total,
      winProbability: e.win_probability || 0,
      outcome: e.outcome,
      name: e.estimate_name
    }));

  const trendsOverTime = React.useMemo(() => {
    const estimatesWithDates = estimates
      .filter(e => e.created_date && e.grand_total)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    return estimatesWithDates.map(e => ({
      date: new Date(e.created_date).toLocaleDateString(),
      price: e.grand_total,
      winProb: e.win_probability || 0,
      outcome: e.outcome
    }));
  }, [estimates]);

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (estimates.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600">No historical pricing data yet.</p>
          <p className="text-sm text-slate-500 mt-2">
            Start saving your estimates to build pricing intelligence over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historical Pricing Intelligence</CardTitle>
              <CardDescription>Learn from your pricing history to improve future estimates</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="180">Last 6 Months</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>

              <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outcomes</SelectItem>
                  <SelectItem value="won">Won Only</SelectItem>
                  <SelectItem value="lost">Lost Only</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Win Rate</p>
              <Award className={`w-5 h-5 ${metrics.winRate >= 50 ? 'text-green-600' : 'text-amber-600'}`} />
            </div>
            <p className="text-3xl font-bold text-slate-900">{metrics.winRate.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">
              {metrics.wonCount} wins / {metrics.wonCount + metrics.lostCount} decided
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Avg Win Probability</p>
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{metrics.avgWinProbability.toFixed(0)}%</p>
            <p className="text-xs text-slate-500 mt-1">AI predicted accuracy</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Avg Won Price</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              ${(metrics.avgWonPrice / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-slate-500 mt-1">
              vs ${(metrics.avgLostPrice / 1000).toFixed(0)}K lost
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Total Won Value</p>
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              ${(metrics.totalContractValue / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-slate-500 mt-1">Total contract value</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Outcome Distribution */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Outcome Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={outcomeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {outcomeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Price vs Win Probability */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Price vs Win Probability</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="price" 
                  name="Price"
                  label={{ value: 'Price ($)', position: 'insideBottom', offset: -5 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <YAxis 
                  type="number" 
                  dataKey="winProbability" 
                  name="Win Prob"
                  label={{ value: 'Win Probability (%)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'price') return `$${value.toLocaleString()}`;
                    if (name === 'winProbability') return `${value}%`;
                    return value;
                  }}
                />
                <Scatter 
                  data={priceVsOutcome.filter(d => d.outcome === 'won')} 
                  fill={COLORS.won}
                  name="Won"
                />
                <Scatter 
                  data={priceVsOutcome.filter(d => d.outcome === 'lost')} 
                  fill={COLORS.lost}
                  name="Lost"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pricing Trends Over Time */}
        {trendsOverTime.length > 0 && (
          <Card className="border-none shadow-lg md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Pricing Trends Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'Price') return `$${value.toLocaleString()}`;
                      if (name === 'Win Probability') return `${value}%`;
                      return value;
                    }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="price" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Price"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="winProb" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Win Probability"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Estimates Table */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">Recent Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {estimates.slice(0, 10).map((estimate) => (
              <div key={estimate.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{estimate.estimate_name}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(estimate.created_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      ${estimate.grand_total?.toLocaleString()}
                    </p>
                    {estimate.win_probability && (
                      <p className="text-xs text-slate-600">
                        {estimate.win_probability}% win prob
                      </p>
                    )}
                  </div>
                  <Badge 
                    className={
                      estimate.outcome === 'won' ? 'bg-green-600' :
                      estimate.outcome === 'lost' ? 'bg-red-600' :
                      'bg-slate-600'
                    }
                  >
                    {estimate.outcome || 'Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}