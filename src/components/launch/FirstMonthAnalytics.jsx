import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  Users,
  DollarSign,
  Star,
  BarChart3,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function FirstMonthAnalytics({ user, launchStatus }) {
  const monthlyMetrics = {
    totalUsers: 1247,
    activeUsers: 892,
    retention: {
      day7: 78,
      day14: 65,
      day30: 58
    },
    npsScore: 72,
    featureAdoption: [
      { name: "Proposal Creation", adoption: 94, target: 80 },
      { name: "AI Writing Assistant", adoption: 67, target: 60 },
      { name: "Kanban Board", adoption: 89, target: 75 },
      { name: "Team Collaboration", adoption: 54, target: 50 },
      { name: "Export Features", adoption: 71, target: 65 },
      { name: "Calendar Integration", adoption: 43, target: 40 }
    ],
    revenue: {
      mrr: 12450,
      avgRevenuePerUser: 14.95,
      paidConversions: 156,
      conversionRate: 12.5
    }
  };

  const successCriteria = [
    { 
      metric: "User Acquisition",
      target: "1000+ users",
      actual: `${monthlyMetrics.totalUsers} users`,
      status: "achieved",
      percentage: 124
    },
    {
      metric: "User Retention (Day 30)",
      target: ">50%",
      actual: `${monthlyMetrics.retention.day30}%`,
      status: "achieved",
      percentage: 116
    },
    {
      metric: "NPS Score",
      target: ">60",
      actual: monthlyMetrics.npsScore,
      status: "achieved",
      percentage: 120
    },
    {
      metric: "Core Feature Adoption",
      target: ">70%",
      actual: "83%",
      status: "achieved",
      percentage: 119
    },
    {
      metric: "System Uptime",
      target: ">99.5%",
      actual: "99.87%",
      status: "achieved",
      percentage: 100
    },
    {
      metric: "Response Time p95",
      target: "<200ms",
      actual: "178ms",
      status: "achieved",
      percentage: 112
    }
  ];

  const nextIterationPriorities = [
    { priority: 1, feature: "Advanced Reporting Dashboard", votes: 89, effort: "Medium" },
    { priority: 2, feature: "Mobile App", votes: 76, effort: "High" },
    { priority: 3, feature: "Integrations Marketplace", votes: 64, effort: "High" },
    { priority: 4, feature: "Custom Workflow Builder", votes: 58, effort: "Medium" },
    { priority: 5, feature: "White Label Options", votes: 47, effort: "Low" }
  ];

  return (
    <div className="space-y-4">
      {/* Success Criteria */}
      <Card className="border-2 border-green-500 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle2 className="w-5 h-5" />
            Success Criteria - All Achieved! 🎉
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {successCriteria.map((item, idx) => (
              <div key={idx} className="p-4 bg-white rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-slate-900">{item.metric}</div>
                  <Badge className="bg-green-600 text-white">
                    {item.percentage}% of target
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-600">Target: {item.target}</span>
                  <span className="font-semibold text-slate-900">Actual: {item.actual}</span>
                </div>
                <Progress value={Math.min(item.percentage, 100)} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Growth & Retention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-slate-900">{monthlyMetrics.totalUsers}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  24% above target
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Active Users</p>
                    <p className="text-3xl font-bold text-slate-900">{monthlyMetrics.activeUsers}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-sm text-slate-600">
                  {Math.round((monthlyMetrics.activeUsers / monthlyMetrics.totalUsers) * 100)}% engagement rate
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">Retention Cohort Analysis</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{monthlyMetrics.retention.day7}%</div>
                <div className="text-xs text-slate-600 mt-1">Day 7</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{monthlyMetrics.retention.day14}%</div>
                <div className="text-xs text-slate-600 mt-1">Day 14</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-slate-900">{monthlyMetrics.retention.day30}%</div>
                <div className="text-xs text-slate-600 mt-1">Day 30</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Adoption */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Feature Adoption Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monthlyMetrics.featureAdoption.map((feature, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{feature.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">{feature.adoption}%</span>
                    {feature.adoption >= feature.target ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                </div>
                <Progress value={feature.adoption} className="h-2" />
                <div className="text-xs text-slate-600">
                  Target: {feature.target}% | 
                  {feature.adoption >= feature.target ? 
                    ` +${feature.adoption - feature.target}% above target` : 
                    ` ${feature.target - feature.adoption}% below target`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* NPS Score */}
      <Card className="border-2 border-green-500 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <Star className="w-5 h-5" />
            Net Promoter Score (NPS)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-6xl font-bold text-green-900 mb-2">{monthlyMetrics.npsScore}</div>
            <Badge className="bg-green-600 text-white text-lg px-4 py-1">
              Excellent
            </Badge>
            <p className="text-sm text-green-800 mt-4">
              20% above industry average for SaaS products
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Revenue Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">${monthlyMetrics.revenue.mrr.toLocaleString()}</div>
              <div className="text-xs text-slate-600 mt-1">Monthly Recurring Revenue</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">${monthlyMetrics.revenue.avgRevenuePerUser}</div>
              <div className="text-xs text-slate-600 mt-1">ARPU</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{monthlyMetrics.revenue.paidConversions}</div>
              <div className="text-xs text-slate-600 mt-1">Paid Conversions</div>
            </div>
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{monthlyMetrics.revenue.conversionRate}%</div>
              <div className="text-xs text-slate-600 mt-1">Conversion Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Iteration Planning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Next Iteration Priorities
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Based on user feedback and feature requests
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {nextIterationPriorities.map((item) => (
              <div key={item.priority} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className="bg-blue-600 text-white">#{item.priority}</Badge>
                  <div>
                    <div className="font-medium text-slate-900">{item.feature}</div>
                    <div className="text-xs text-slate-600">{item.votes} user votes</div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    item.effort === 'Low' ? 'border-green-500 text-green-700' :
                    item.effort === 'Medium' ? 'border-amber-500 text-amber-700' :
                    'border-red-500 text-red-700'
                  }
                >
                  {item.effort} effort
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}