import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users,
  FileText,
  DollarSign,
  Activity,
  Download,
  Calendar
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReportsModule() {
  const [timeRange, setTimeRange] = useState("30d");

  const { data: subscriptions } = useQuery({
    queryKey: ['reports-subscriptions'],
    queryFn: () => base44.entities.Subscription.list('-created_date'),
    initialData: []
  });

  const { data: proposals } = useQuery({
    queryKey: ['reports-proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date'),
    initialData: []
  });

  const { data: tokenUsage } = useQuery({
    queryKey: ['reports-token-usage'],
    queryFn: () => base44.entities.TokenUsage.list('-created_date', 200),
    initialData: []
  });

  const { data: users } = useQuery({
    queryKey: ['reports-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    initialData: []
  });

  // Calculate KPIs
  const totalMRR = subscriptions.reduce((sum, sub) => sum + (sub.monthly_price || 0), 0);
  const activeUsers = users.filter(u => u.is_active !== false).length;
  const totalProposals = proposals.length;
  const totalTokensUsed = tokenUsage.reduce((sum, u) => sum + u.tokens_used, 0);

  // Plan distribution
  const planDistribution = subscriptions.reduce((acc, sub) => {
    acc[sub.plan_type] = (acc[sub.plan_type] || 0) + 1;
    return acc;
  }, {});

  // Proposal status distribution
  const proposalsByStatus = proposals.reduce((acc, prop) => {
    acc[prop.status] = (acc[prop.status] || 0) + 1;
    return acc;
  }, {});

  const exportReport = (reportType) => {
    alert(`Exporting ${reportType} report...`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-600">Business intelligence and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Dashboard */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">${totalMRR.toLocaleString()}</p>
            <p className="text-sm text-slate-600">Monthly Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{activeUsers}</p>
            <p className="text-sm text-slate-600">Active Users</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalProposals}</p>
            <p className="text-sm text-slate-600">Total Proposals</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-indigo-600" />
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {(totalTokensUsed / 1000000).toFixed(1)}M
            </p>
            <p className="text-sm text-slate-600">Tokens Used</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="users">User Analytics</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="usage">AI Usage</TabsTrigger>
        </TabsList>

        {/* Revenue Analytics */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>Subscribers by plan type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(planDistribution).map(([plan, count]) => (
                    <div key={plan}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize">{plan}</span>
                        <span className="text-sm font-semibold">{count} subscribers</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(count / subscriptions.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Revenue Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Total MRR</p>
                  <p className="text-2xl font-bold text-green-700">${totalMRR.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Average Revenue per User</p>
                  <p className="text-2xl font-bold text-blue-700">
                    ${subscriptions.length > 0 ? (totalMRR / subscriptions.length).toFixed(2) : 0}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Annual Recurring Revenue (ARR)</p>
                  <p className="text-2xl font-bold text-purple-700">${(totalMRR * 12).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-700">
                    {subscriptions.filter(s => s.status === 'active').length}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Active</p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                  <p className="text-3xl font-bold text-amber-700">
                    {subscriptions.filter(s => s.status === 'suspended').length}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Suspended</p>
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-3xl font-bold text-red-700">
                    {subscriptions.filter(s => s.status === 'cancelled').length}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">Cancelled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Analytics */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Total Users</p>
                <p className="text-4xl font-bold text-slate-900">{users.length}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Active Users</p>
                <p className="text-4xl font-bold text-green-600">{activeUsers}</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Admin Users</p>
                <p className="text-4xl font-bold text-blue-600">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">User growth chart would be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proposals Analytics */}
        <TabsContent value="proposals" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Proposal Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                {Object.entries(proposalsByStatus).map(([status, count]) => (
                  <div key={status} className="p-4 bg-slate-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-slate-900">{count}</p>
                    <p className="text-sm text-slate-600 capitalize mt-1">{status.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-5xl font-bold text-green-600">
                    {proposals.length > 0 
                      ? ((proposalsByStatus.won || 0) / proposals.length * 100).toFixed(1)
                      : 0}%
                  </p>
                  <p className="text-slate-600 mt-2">
                    {proposalsByStatus.won || 0} won out of {proposals.length} total
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Active Proposals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-5xl font-bold text-blue-600">
                    {(proposalsByStatus.in_progress || 0) + (proposalsByStatus.draft || 0)}
                  </p>
                  <p className="text-slate-600 mt-2">Currently being worked on</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Usage Analytics */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Total Tokens Used</p>
                <p className="text-4xl font-bold text-slate-900">
                  {(totalTokensUsed / 1000000).toFixed(2)}M
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Estimated Cost</p>
                <p className="text-4xl font-bold text-green-600">
                  ${tokenUsage.reduce((sum, u) => sum + (u.cost_estimate || 0), 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-2">Avg per Request</p>
                <p className="text-4xl font-bold text-blue-600">
                  {tokenUsage.length > 0 ? (totalTokensUsed / tokenUsage.length / 1000).toFixed(1) : 0}K
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Usage by Feature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(
                  tokenUsage.reduce((acc, usage) => {
                    acc[usage.feature_type] = (acc[usage.feature_type] || 0) + usage.tokens_used;
                    return acc;
                  }, {})
                ).map(([feature, tokens]) => (
                  <div key={feature}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{feature.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-semibold">{(tokens / 1000).toFixed(0)}K tokens</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(tokens / totalTokensUsed) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}