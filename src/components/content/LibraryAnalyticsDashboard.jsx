import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Star,
  FileText,
  Award,
  Users,
  Handshake,
  BarChart3,
  Target,
  Clock,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LibraryAnalyticsDashboard({ organization, selectedFolderId }) {
  // Fetch all library content for analytics
  const { data: allContent = [], isLoading } = useQuery({
    queryKey: ['library-analytics', organization?.id, selectedFolderId],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      let query = { organization_id: organization.id };
      if (selectedFolderId) {
        query.folder_id = selectedFolderId;
      }

      const [resources, pastPerf, personnel, partners] = await Promise.all([
        base44.entities.ProposalResource.filter(query),
        selectedFolderId 
          ? base44.entities.PastPerformance.filter({ ...query })
          : Promise.resolve([]),
        selectedFolderId
          ? base44.entities.KeyPersonnel.filter({ ...query })
          : Promise.resolve([]),
        selectedFolderId
          ? base44.entities.TeamingPartner.filter({ ...query })
          : Promise.resolve([])
      ]);

      return [
        ...resources.map(r => ({ ...r, _type: 'resource' })),
        ...pastPerf.map(p => ({ ...p, _type: 'past_performance' })),
        ...personnel.map(p => ({ ...p, _type: 'personnel' })),
        ...partners.map(p => ({ ...p, _type: 'partner' }))
      ];
    },
    enabled: !!organization?.id,
  });

  // Calculate analytics
  const analytics = React.useMemo(() => {
    const totalItems = allContent.length;
    const totalWords = allContent.reduce((sum, item) => sum + (item.word_count || 0), 0);
    const totalUsage = allContent.reduce((sum, item) => sum + (item.usage_count || 0), 0);
    const favorites = allContent.filter(item => item.is_favorite).length;
    
    // Most used items
    const mostUsed = [...allContent]
      .filter(item => item.usage_count > 0)
      .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
      .slice(0, 5);
    
    // Recently added
    const recentlyAdded = [...allContent]
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .slice(0, 5);
    
    // Content by type
    const byType = {
      resources: allContent.filter(i => i._type === 'resource').length,
      pastPerformance: allContent.filter(i => i._type === 'past_performance').length,
      personnel: allContent.filter(i => i._type === 'personnel').length,
      partners: allContent.filter(i => i._type === 'partner').length
    };
    
    // Unused items (potential cleanup)
    const unused = allContent.filter(item => !item.usage_count || item.usage_count === 0).length;
    
    // Most popular tags
    const tagCounts = {};
    allContent.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    const popularTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      totalItems,
      totalWords,
      totalUsage,
      favorites,
      mostUsed,
      recentlyAdded,
      byType,
      unused,
      popularTags,
      avgUsagePerItem: totalItems > 0 ? (totalUsage / totalItems).toFixed(1) : 0
    };
  }, [allContent]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
        <p className="text-slate-600">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Library Analytics</h2>
          <p className="text-sm text-slate-600">
            {selectedFolderId ? 'Current folder insights' : 'Entire library overview'}
          </p>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Items</p>
                <p className="text-3xl font-bold text-slate-900">{analytics.totalItems}</p>
              </div>
              <FileText className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Words</p>
                <p className="text-3xl font-bold text-slate-900">
                  {(analytics.totalWords / 1000).toFixed(1)}k
                </p>
              </div>
              <Award className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Uses</p>
                <p className="text-3xl font-bold text-slate-900">{analytics.totalUsage}</p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Avg Usage</p>
                <p className="text-3xl font-bold text-slate-900">{analytics.avgUsagePerItem}</p>
              </div>
              <Target className="w-10 h-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Breakdown */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Content Breakdown</CardTitle>
          <CardDescription>Distribution by content type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-900">{analytics.byType.resources}</p>
              <p className="text-xs text-blue-700">Resources</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Award className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-900">{analytics.byType.pastPerformance}</p>
              <p className="text-xs text-green-700">Past Performance</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-900">{analytics.byType.personnel}</p>
              <p className="text-xs text-purple-700">Personnel</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <Handshake className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
              <p className="text-2xl font-bold text-indigo-900">{analytics.byType.partners}</p>
              <p className="text-xs text-indigo-700">Partners</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Most Used Content */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Most Used Content
            </CardTitle>
            <CardDescription>Top performing library items</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.mostUsed.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                No usage data yet
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.mostUsed.map((item, idx) => {
                  const title = item.title || item.project_name || item.full_name || item.partner_name;
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        idx === 0 ? "bg-amber-100 text-amber-700" :
                        idx === 1 ? "bg-slate-200 text-slate-700" :
                        idx === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {item._type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {item.usage_count} uses
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Tags */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Popular Tags
            </CardTitle>
            <CardDescription>Most frequently used tags</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.popularTags.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">
                No tags added yet
              </p>
            ) : (
              <div className="space-y-2">
                {analytics.popularTags.map(([tag, count]) => (
                  <div key={tag} className="flex items-center justify-between">
                    <Badge variant="outline" className="font-medium">
                      {tag}
                    </Badge>
                    <div className="flex items-center gap-2 flex-1 mx-3">
                      <Progress value={(count / analytics.totalItems) * 100} className="h-2" />
                      <span className="text-xs text-slate-600 whitespace-nowrap">
                        {count} item{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-amber-900 mb-1">Favorites</p>
                <p className="text-3xl font-bold text-amber-700">{analytics.favorites}</p>
                <p className="text-xs text-amber-600 mt-1">
                  {analytics.totalItems > 0 
                    ? `${((analytics.favorites / analytics.totalItems) * 100).toFixed(0)}% of library`
                    : '0% of library'
                  }
                </p>
              </div>
              <Star className="w-10 h-10 text-amber-500 fill-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-blue-900 mb-1">Unused Items</p>
                <p className="text-3xl font-bold text-blue-700">{analytics.unused}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Potential cleanup candidates
                </p>
              </div>
              <Clock className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-green-900 mb-1">Reuse Rate</p>
                <p className="text-3xl font-bold text-green-700">
                  {analytics.totalItems > 0 
                    ? `${(((analytics.totalItems - analytics.unused) / analytics.totalItems) * 100).toFixed(0)}%`
                    : '0%'
                  }
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Content actively reused
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recently Added */}
      {analytics.recentlyAdded.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Recently Added
            </CardTitle>
            <CardDescription>Latest additions to your library</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.recentlyAdded.map(item => {
                const title = item.title || item.project_name || item.full_name || item.partner_name;
                const timeAgo = new Date(item.created_date).toLocaleDateString();
                
                return (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{title}</p>
                      <p className="text-xs text-slate-500">Added {timeAgo}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {item._type.replace('_', ' ')}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}