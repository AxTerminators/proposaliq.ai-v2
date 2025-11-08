import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Target,
  Activity,
  Award,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_EMOJIS = {
  RFP: '📄',
  RFI: '📋',
  SBIR: '💡',
  GSA: '🏛️',
  IDIQ: '📑',
  STATE_LOCAL: '🏙️',
  OTHER: '📊'
};

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#6366f1', '#ec4899'];

export default function MultiBoardAnalytics({ proposals, allBoardConfigs, organization }) {
  // Calculate stats by proposal type
  const statsByType = useMemo(() => {
    const types = ['RFP', 'RFI', 'SBIR', 'GSA', 'IDIQ', 'STATE_LOCAL', 'OTHER'];
    
    return types.map(type => {
      const typeProposals = proposals.filter(p => p.proposal_type_category === type);
      const won = typeProposals.filter(p => p.status === 'won').length;
      const lost = typeProposals.filter(p => p.status === 'lost').length;
      const submitted = typeProposals.filter(p => p.status === 'submitted').length;
      const active = typeProposals.filter(p => !['won', 'lost', 'archived', 'submitted'].includes(p.status)).length;
      const totalValue = typeProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
      const wonValue = typeProposals.filter(p => p.status === 'won').reduce((sum, p) => sum + (p.contract_value || 0), 0);
      const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;
      
      return {
        type,
        emoji: TYPE_EMOJIS[type],
        total: typeProposals.length,
        active,
        won,
        lost,
        submitted,
        totalValue,
        wonValue,
        winRate
      };
    }).filter(stat => stat.total > 0);
  }, [proposals]);

  // Overall portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const totalValue = proposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const wonProposals = proposals.filter(p => p.status === 'won');
    const wonValue = wonProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const submittedProposals = proposals.filter(p => ['submitted', 'won', 'lost'].includes(p.status));
    const overallWinRate = submittedProposals.length > 0 
      ? Math.round((wonProposals.length / submittedProposals.length) * 100)
      : 0;
    const activeProposals = proposals.filter(p => !['won', 'lost', 'archived'].includes(p.status)).length;
    
    return {
      totalValue,
      wonValue,
      overallWinRate,
      totalProposals: proposals.length,
      activeProposals,
      wonCount: wonProposals.length,
      submittedCount: submittedProposals.length
    };
  }, [proposals]);

  // Data for pie chart (proposals by type)
  const pieChartData = useMemo(() => {
    return statsByType.map((stat, idx) => ({
      name: stat.type,
      value: stat.total,
      color: COLORS[idx % COLORS.length]
    }));
  }, [statsByType]);

  // Data for value comparison chart
  const valueComparisonData = useMemo(() => {
    return statsByType.map(stat => ({
      name: stat.type,
      totalValue: stat.totalValue / 1000000, // Convert to millions
      wonValue: stat.wonValue / 1000000
    }));
  }, [statsByType]);

  // Data for win rate comparison
  const winRateData = useMemo(() => {
    return statsByType.map(stat => ({
      name: stat.type,
      winRate: stat.winRate
    }));
  }, [statsByType]);

  const formatCurrency = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <Badge variant="outline" className="text-xs">Portfolio</Badge>
            </div>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(portfolioMetrics.totalValue)}</p>
            <p className="text-xs text-blue-700 mt-1">Total Pipeline Value</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-5 h-5 text-green-600" />
              <Badge variant="outline" className="text-xs">Won</Badge>
            </div>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(portfolioMetrics.wonValue)}</p>
            <p className="text-xs text-green-700 mt-1">Total Won Value</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-purple-600" />
              <Badge variant="outline" className="text-xs">Success</Badge>
            </div>
            <p className="text-2xl font-bold text-purple-900">{portfolioMetrics.overallWinRate}%</p>
            <p className="text-xs text-purple-700 mt-1">Overall Win Rate</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-amber-600" />
              <Badge variant="outline" className="text-xs">Active</Badge>
            </div>
            <p className="text-2xl font-bold text-amber-900">{portfolioMetrics.activeProposals}</p>
            <p className="text-xs text-amber-700 mt-1">In Pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Proposal Type</CardTitle>
          <CardDescription>Breakdown across all proposal categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {statsByType.map((stat, idx) => (
            <div key={stat.type} className="p-4 border-2 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">{stat.emoji}</span>
                  {stat.type} Proposals
                </h4>
                <Badge variant="secondary" className="text-sm">{stat.total} total</Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <p className="text-slate-600 mb-1">Active</p>
                  <p className="text-2xl font-bold text-blue-600">{stat.active}</p>
                </div>
                <div>
                  <p className="text-slate-600 mb-1">Won</p>
                  <p className="text-2xl font-bold text-green-600">{stat.won}</p>
                </div>
                <div>
                  <p className="text-slate-600 mb-1">Lost</p>
                  <p className="text-2xl font-bold text-red-600">{stat.lost}</p>
                </div>
                <div>
                  <p className="text-slate-600 mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{stat.winRate}%</p>
                </div>
                <div>
                  <p className="text-slate-600 mb-1">Pipeline Value</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(stat.totalValue)}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>Distribution</span>
                  <span>{stat.total} proposals</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                  {stat.active > 0 && (
                    <div
                      className="bg-blue-500"
                      style={{ width: `${(stat.active / stat.total) * 100}%` }}
                      title={`${stat.active} Active`}
                    />
                  )}
                  {stat.submitted > 0 && (
                    <div
                      className="bg-indigo-500"
                      style={{ width: `${(stat.submitted / stat.total) * 100}%` }}
                      title={`${stat.submitted} Submitted`}
                    />
                  )}
                  {stat.won > 0 && (
                    <div
                      className="bg-green-500"
                      style={{ width: `${(stat.won / stat.total) * 100}%` }}
                      title={`${stat.won} Won`}
                    />
                  )}
                  {stat.lost > 0 && (
                    <div
                      className="bg-red-500"
                      style={{ width: `${(stat.lost / stat.total) * 100}%` }}
                      title={`${stat.lost} Lost`}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Proposals Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposals by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Win Rate Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Win Rate by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={winRateData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="winRate" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Value Comparison */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pipeline & Won Value by Type (Millions)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={valueComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis label={{ value: 'Value ($M)', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `$${value.toFixed(1)}M`} />
                <Legend />
                <Bar dataKey="totalValue" fill="#3b82f6" name="Pipeline Value" />
                <Bar dataKey="wonValue" fill="#10b981" name="Won Value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Board Coverage Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Board Coverage</CardTitle>
          <CardDescription>Which boards are active in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['master', 'rfp', 'rfi', 'sbir', 'gsa', 'idiq', 'state_local'].map(boardType => {
              const boardExists = allBoardConfigs?.some(b => b.board_type === boardType);
              const proposalCount = boardType === 'master' 
                ? proposals.length 
                : proposals.filter(p => p.proposal_type_category === boardType.toUpperCase()).length;
              
              return (
                <div
                  key={boardType}
                  className={cn(
                    "p-4 rounded-lg border-2 text-center transition-all",
                    boardExists ? "bg-green-50 border-green-200" : "bg-slate-50 border-slate-200"
                  )}
                >
                  <div className="text-2xl mb-2">
                    {boardType === 'master' ? '⭐' : TYPE_EMOJIS[boardType.toUpperCase()] || '📊'}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    {boardType === 'master' ? 'Master Board' : `${boardType.toUpperCase()}`}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {boardExists ? (
                      <Badge className="bg-green-600 text-white text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Not Created</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">{proposalCount}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Key Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Best performing type */}
          {statsByType.length > 0 && (() => {
            const bestWinRate = statsByType.reduce((best, current) => 
              current.winRate > best.winRate ? current : best
            , statsByType[0]);
            
            const highestValue = statsByType.reduce((best, current) => 
              current.totalValue > best.totalValue ? current : best
            , statsByType[0]);

            return (
              <>
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Best Win Rate</p>
                    <p className="text-xs text-slate-600">
                      {bestWinRate.emoji} <strong>{bestWinRate.type}</strong> proposals have the highest win rate at <strong>{bestWinRate.winRate}%</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Highest Value Category</p>
                    <p className="text-xs text-slate-600">
                      {highestValue.emoji} <strong>{highestValue.type}</strong> proposals represent <strong>{formatCurrency(highestValue.totalValue)}</strong> in pipeline value
                    </p>
                  </div>
                </div>

                {statsByType.some(s => s.winRate < 30 && (s.won + s.lost) >= 3) && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Improvement Opportunity</p>
                      <p className="text-xs text-amber-700">
                        {statsByType.filter(s => s.winRate < 30 && (s.won + s.lost) >= 3).map(s => 
                          `${s.emoji} ${s.type} (${s.winRate}%)`
                        ).join(', ')} proposals have lower win rates - consider reviewing strategy
                      </p>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Portfolio Summary</p>
              <p className="text-xs text-slate-600">
                Managing <strong>{portfolioMetrics.totalProposals}</strong> total proposals across <strong>{statsByType.length}</strong> categories with <strong>{portfolioMetrics.activeProposals}</strong> currently active
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}