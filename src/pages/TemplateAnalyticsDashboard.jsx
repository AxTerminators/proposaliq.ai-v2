import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Layers,
  Award,
  ArrowLeft,
  Sparkles,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TemplateAnalyticsDashboard() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch current organization
  const { data: organization } = useQuery({
    queryKey: ['current-organization'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Organization.filter({ 
        id: user.organization_id 
      }).then(orgs => orgs[0]);
    }
  });

  // Fetch all templates
  const { data: allTemplates = [], isLoading } = useQuery({
    queryKey: ['all-workflow-templates', organization?.id],
    queryFn: async () => {
      if (!organization) return [];
      
      // Fetch both system and organization templates
      const [systemTemplates, orgTemplates] = await Promise.all([
        base44.entities.ProposalWorkflowTemplate.filter({
          template_type: 'system',
          is_active: true
        }),
        base44.entities.ProposalWorkflowTemplate.filter({
          organization_id: organization.id,
          template_type: 'organization',
          is_active: true
        })
      ]);

      return [...systemTemplates, ...orgTemplates];
    },
    enabled: !!organization,
    staleTime: 30000
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    const systemTemplates = allTemplates.filter(t => t.template_type === 'system');
    const orgTemplates = allTemplates.filter(t => t.template_type === 'organization');

    // Filter by category if selected
    const filteredTemplates = selectedCategory === 'all' 
      ? allTemplates 
      : allTemplates.filter(t => t.proposal_type_category === selectedCategory);

    // Total usage
    const totalUsage = filteredTemplates.reduce((sum, t) => sum + (t.usage_count || 0), 0);
    
    // Average win rate (only templates with data)
    const templatesWithWinRate = filteredTemplates.filter(t => t.average_win_rate > 0);
    const avgWinRate = templatesWithWinRate.length > 0
      ? templatesWithWinRate.reduce((sum, t) => sum + t.average_win_rate, 0) / templatesWithWinRate.length
      : 0;

    // Top 5 most used templates
    const topUsed = [...filteredTemplates]
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      .slice(0, 5);

    // Top 5 best performing templates (by win rate)
    const topPerforming = [...filteredTemplates]
      .filter(t => t.average_win_rate > 0)
      .sort((a, b) => b.average_win_rate - a.average_win_rate)
      .slice(0, 5);

    // Category breakdown
    const categories = {};
    filteredTemplates.forEach(t => {
      const cat = t.proposal_type_category || 'OTHER';
      if (!categories[cat]) {
        categories[cat] = {
          count: 0,
          usage: 0,
          avgWinRate: 0,
          winRateCount: 0
        };
      }
      categories[cat].count++;
      categories[cat].usage += t.usage_count || 0;
      if (t.average_win_rate > 0) {
        categories[cat].avgWinRate += t.average_win_rate;
        categories[cat].winRateCount++;
      }
    });

    // Calculate average win rates per category
    Object.keys(categories).forEach(cat => {
      if (categories[cat].winRateCount > 0) {
        categories[cat].avgWinRate = categories[cat].avgWinRate / categories[cat].winRateCount;
      }
    });

    // System vs Organization comparison
    const systemStats = {
      count: systemTemplates.length,
      usage: systemTemplates.reduce((sum, t) => sum + (t.usage_count || 0), 0),
      avgWinRate: systemTemplates.filter(t => t.average_win_rate > 0).reduce((sum, t, _, arr) => 
        sum + t.average_win_rate / arr.length, 0) || 0
    };

    const orgStats = {
      count: orgTemplates.length,
      usage: orgTemplates.reduce((sum, t) => sum + (t.usage_count || 0), 0),
      avgWinRate: orgTemplates.filter(t => t.average_win_rate > 0).reduce((sum, t, _, arr) => 
        sum + t.average_win_rate / arr.length, 0) || 0
    };

    return {
      totalTemplates: filteredTemplates.length,
      systemCount: systemTemplates.length,
      orgCount: orgTemplates.length,
      totalUsage,
      avgWinRate,
      topUsed,
      topPerforming,
      categories,
      systemStats,
      orgStats
    };
  }, [allTemplates, selectedCategory]);

  // Get unique categories
  const uniqueCategories = useMemo(() => {
    const cats = new Set(allTemplates.map(t => t.proposal_type_category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [allTemplates]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md border-none shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading Analytics...</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-slate-900">Template Analytics</h1>
            </div>
            <p className="text-slate-600">Performance insights and usage statistics for workflow templates</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate(createPageUrl("TemplateManager"))} variant="outline">
              <Layers className="w-4 h-4 mr-2" />
              Template Manager
            </Button>
            <Button onClick={() => navigate(createPageUrl("BoardManagement"))} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Board Management
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filter by category:</span>
          {uniqueCategories.map(cat => (
            <Button
              key={cat}
              size="sm"
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "whitespace-nowrap",
                selectedCategory === cat && "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </Button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Layers className="w-8 h-8 text-blue-600" />
                <Badge className="bg-blue-600">{analytics.totalTemplates}</Badge>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{analytics.totalTemplates}</h3>
              <p className="text-sm text-slate-600">Total Templates</p>
              <div className="flex gap-2 mt-2 text-xs">
                <Badge variant="outline">{analytics.systemCount} system</Badge>
                <Badge variant="outline">{analytics.orgCount} org</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-purple-600" />
                <Badge className="bg-purple-600">{analytics.totalUsage}</Badge>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{analytics.totalUsage}</h3>
              <p className="text-sm text-slate-600">Total Uses</p>
              <p className="text-xs text-purple-700 mt-2">
                Boards created from templates
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <Badge className="bg-green-600">{analytics.avgWinRate.toFixed(1)}%</Badge>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{analytics.avgWinRate.toFixed(1)}%</h3>
              <p className="text-sm text-slate-600">Avg Win Rate</p>
              <p className="text-xs text-green-700 mt-2">
                Across all templates
              </p>
            </CardContent>
          </Card>

          <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Award className="w-8 h-8 text-amber-600" />
                <Badge className="bg-amber-600">Top 5</Badge>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{analytics.topPerforming.length}</h3>
              <p className="text-sm text-slate-600">High Performers</p>
              <p className="text-xs text-amber-700 mt-2">
                Templates with win rate data
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="comparison">System vs Organization</TabsTrigger>
            <TabsTrigger value="usage">Most Used</TabsTrigger>
            <TabsTrigger value="performance">Best Performing</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
          </TabsList>

          {/* System vs Organization Comparison */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  System vs Organization Templates
                </CardTitle>
                <CardDescription>
                  Compare performance and usage between pre-built system templates and custom organization templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* System Templates */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-slate-900">System Templates</h3>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Total Templates</span>
                        <Badge className="bg-blue-600">{analytics.systemStats.count}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Total Usage</span>
                        <Badge variant="outline">{analytics.systemStats.usage}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Avg Win Rate</span>
                        <Badge className="bg-green-600">{analytics.systemStats.avgWinRate.toFixed(1)}%</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Avg Usage per Template</span>
                        <Badge variant="outline">
                          {analytics.systemStats.count > 0 
                            ? (analytics.systemStats.usage / analytics.systemStats.count).toFixed(1)
                            : 0}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Organization Templates */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Building2 className="w-5 h-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-slate-900">Organization Templates</h3>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Total Templates</span>
                        <Badge className="bg-purple-600">{analytics.orgStats.count}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Total Usage</span>
                        <Badge variant="outline">{analytics.orgStats.usage}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Avg Win Rate</span>
                        <Badge className="bg-green-600">{analytics.orgStats.avgWinRate.toFixed(1)}%</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">Avg Usage per Template</span>
                        <Badge variant="outline">
                          {analytics.orgStats.count > 0 
                            ? (analytics.orgStats.usage / analytics.orgStats.count).toFixed(1)
                            : 0}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insights */}
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                  <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Key Insights
                  </h4>
                  <ul className="space-y-1 text-sm text-slate-700">
                    <li>
                      • System templates have been used <strong>{analytics.systemStats.usage}</strong> times 
                      vs organization templates at <strong>{analytics.orgStats.usage}</strong> times
                    </li>
                    {analytics.systemStats.avgWinRate > analytics.orgStats.avgWinRate ? (
                      <li>
                        • System templates show higher win rates ({analytics.systemStats.avgWinRate.toFixed(1)}%) 
                        compared to organization templates ({analytics.orgStats.avgWinRate.toFixed(1)}%)
                      </li>
                    ) : analytics.orgStats.avgWinRate > 0 ? (
                      <li>
                        • Organization templates show higher win rates ({analytics.orgStats.avgWinRate.toFixed(1)}%) 
                        compared to system templates ({analytics.systemStats.avgWinRate.toFixed(1)}%)
                      </li>
                    ) : null}
                    <li>
                      • Average usage per template: System <strong>{(analytics.systemStats.usage / (analytics.systemStats.count || 1)).toFixed(1)}</strong> vs 
                      Organization <strong>{(analytics.orgStats.usage / (analytics.orgStats.count || 1)).toFixed(1)}</strong>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Most Used Templates */}
          <TabsContent value="usage" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Most Used Templates
                </CardTitle>
                <CardDescription>
                  Top templates by number of times used to create boards
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topUsed.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <XCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No usage data available yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.topUsed.map((template, idx) => (
                      <div key={template.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border hover:border-blue-300 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{template.icon_emoji}</span>
                            <h4 className="font-semibold text-slate-900">{template.template_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {template.template_type === 'system' ? 'System' : 'Organization'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            {template.proposal_type_category} • {template.description?.substring(0, 80)}
                            {template.description?.length > 80 ? '...' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-purple-600">{template.usage_count || 0}</div>
                          <p className="text-xs text-slate-600">uses</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Best Performing Templates */}
          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Best Performing Templates
                </CardTitle>
                <CardDescription>
                  Top templates by average win rate for proposals created with them
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.topPerforming.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <XCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No performance data available yet</p>
                    <p className="text-sm mt-2">Win rates will appear once proposals using these templates are won or lost</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.topPerforming.map((template, idx) => (
                      <div key={template.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border hover:border-green-300 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-lg">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{template.icon_emoji}</span>
                            <h4 className="font-semibold text-slate-900">{template.template_name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {template.template_type === 'system' ? 'System' : 'Organization'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">
                            {template.proposal_type_category} • Used {template.usage_count || 0} times
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">{template.average_win_rate.toFixed(1)}%</div>
                          <p className="text-xs text-slate-600">win rate</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Breakdown */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Category Breakdown
                </CardTitle>
                <CardDescription>
                  Performance metrics grouped by proposal type category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(analytics.categories).length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <XCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No category data available</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(analytics.categories).map(([category, stats]) => (
                      <Card key={category} className="border-2 hover:border-blue-300 transition-colors">
                        <CardContent className="p-4">
                          <h4 className="font-semibold text-slate-900 mb-3">{category}</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">Templates</span>
                              <Badge variant="outline">{stats.count}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">Total Usage</span>
                              <Badge className="bg-purple-600">{stats.usage}</Badge>
                            </div>
                            {stats.winRateCount > 0 && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Avg Win Rate</span>
                                <Badge className="bg-green-600">{stats.avgWinRate.toFixed(1)}%</Badge>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-600">Avg Uses per Template</span>
                              <Badge variant="outline">{(stats.usage / stats.count).toFixed(1)}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}