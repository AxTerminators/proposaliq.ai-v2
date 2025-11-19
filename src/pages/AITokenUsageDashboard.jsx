import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  Users, 
  FileText,
  Calendar,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "../components/layout/OrganizationContext";

/**
 * AI Token Usage Dashboard
 * Super-admin and org-admin view for monitoring AI token consumption and costs
 */
export default function AITokenUsageDashboard() {
  const { user, organization, subscription } = useOrganization();

  // Fetch token usage records
  const { data: tokenUsage = [], isLoading } = useQuery({
    queryKey: ['tokenUsage', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.TokenUsage.filter(
        { organization_id: organization.id },
        '-created_date',
        100
      );
    },
    enabled: !!organization?.id,
  });

  // Aggregate statistics
  const stats = React.useMemo(() => {
    const totalTokens = tokenUsage.reduce((sum, u) => sum + (u.tokens_used || 0), 0);
    const totalCost = tokenUsage.reduce((sum, u) => sum + (u.cost_estimate || 0), 0);
    
    const byFeature = tokenUsage.reduce((acc, u) => {
      acc[u.feature_type] = (acc[u.feature_type] || 0) + u.tokens_used;
      return acc;
    }, {});
    
    const byUser = tokenUsage.reduce((acc, u) => {
      acc[u.user_email] = (acc[u.user_email] || 0) + u.tokens_used;
      return acc;
    }, {});
    
    const byLLM = tokenUsage.reduce((acc, u) => {
      acc[u.llm_provider] = (acc[u.llm_provider] || 0) + u.tokens_used;
      return acc;
    }, {});

    return {
      totalTokens,
      totalCost,
      byFeature,
      byUser,
      byLLM,
      averagePerRequest: tokenUsage.length > 0 ? Math.round(totalTokens / tokenUsage.length) : 0,
    };
  }, [tokenUsage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500">Loading token usage data...</div>
      </div>
    );
  }

  const subscriptionPercentage = subscription
    ? ((subscription.token_credits - subscription.token_credits_used) / subscription.token_credits) * 100
    : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">AI Token Usage Analytics</h1>
              <p className="text-slate-600">Monitor AI consumption and optimize usage</p>
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        {subscription && (
          <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Current Billing Period
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Plan</p>
                  <p className="font-bold text-xl capitalize">{subscription.plan_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Token Credits Remaining</p>
                  <p className="font-bold text-xl">
                    {((subscription.token_credits - subscription.token_credits_used) / 1000).toFixed(0)}k / {(subscription.token_credits / 1000).toFixed(0)}k
                  </p>
                </div>
              </div>
              
              <div className="w-full bg-slate-200 rounded-full h-3">
                <div
                  className={cn(
                    "h-3 rounded-full transition-all",
                    subscriptionPercentage > 50 ? 'bg-green-500' :
                    subscriptionPercentage > 20 ? 'bg-amber-500' :
                    'bg-red-500'
                  )}
                  style={{ width: `${subscriptionPercentage}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Billing Period:</span>
                  <div className="font-medium">
                    {new Date(subscription.billing_cycle_start).toLocaleDateString()} - {new Date(subscription.billing_cycle_end).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-600">Preferred LLM:</span>
                  <div className="font-medium capitalize">{subscription.preferred_llm}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Tokens Used</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {(stats.totalTokens / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {tokenUsage.length} requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Estimated Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                ${stats.totalCost.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                This billing period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Per Request</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {stats.averagePerRequest.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                tokens/request
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-slate-900">
                {Object.keys(stats.byUser).length}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Using AI features
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Breakdown */}
        <Tabs defaultValue="features" className="space-y-4">
          <TabsList>
            <TabsTrigger value="features">By Feature</TabsTrigger>
            <TabsTrigger value="users">By User</TabsTrigger>
            <TabsTrigger value="llm">By LLM Provider</TabsTrigger>
            <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Token Usage by Feature</CardTitle>
                <CardDescription>See which features consume the most tokens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.byFeature)
                    .sort(([, a], [, b]) => b - a)
                    .map(([feature, tokens]) => {
                      const percentage = (tokens / stats.totalTokens) * 100;
                      return (
                        <div key={feature}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium capitalize">
                              {feature.replace(/_/g, ' ')}
                            </span>
                            <span className="text-sm text-slate-600">
                              {(tokens / 1000).toFixed(1)}k tokens ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Token Usage by User</CardTitle>
                <CardDescription>Track individual user consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats.byUser)
                    .sort(([, a], [, b]) => b - a)
                    .map(([userEmail, tokens]) => {
                      const percentage = (tokens / stats.totalTokens) * 100;
                      const userRequests = tokenUsage.filter(u => u.user_email === userEmail).length;
                      
                      return (
                        <div key={userEmail}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {userEmail.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium">{userEmail}</span>
                            </div>
                            <span className="text-sm text-slate-600">
                              {(tokens / 1000).toFixed(1)}k ({userRequests} requests)
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="llm">
            <Card>
              <CardHeader>
                <CardTitle>Token Usage by LLM Provider</CardTitle>
                <CardDescription>Compare usage across different AI models</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.byLLM)
                    .sort(([, a], [, b]) => b - a)
                    .map(([llm, tokens]) => {
                      const percentage = (tokens / stats.totalTokens) * 100;
                      return (
                        <div key={llm} className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold capitalize">{llm}</span>
                            <Badge>{percentage.toFixed(1)}%</Badge>
                          </div>
                          <div className="text-2xl font-bold text-slate-900 mb-2">
                            {(tokens / 1000).toFixed(1)}k tokens
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle>Recent AI Activity</CardTitle>
                <CardDescription>Last 20 AI operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tokenUsage.slice(0, 20).map((usage) => (
                    <div
                      key={usage.id}
                      className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="capitalize text-xs">
                            {usage.feature_type?.replace(/_/g, ' ')}
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-700 text-xs capitalize">
                            {usage.llm_provider}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{usage.user_email}</p>
                        {usage.response_preview && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                            {usage.response_preview}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(usage.created_date).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{usage.tokens_used.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">tokens</p>
                        {usage.cost_estimate && (
                          <p className="text-xs text-green-600 font-medium mt-1">
                            ${usage.cost_estimate.toFixed(4)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {tokenUsage.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No AI activity yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}