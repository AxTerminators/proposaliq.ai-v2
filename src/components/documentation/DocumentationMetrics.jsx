import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Eye, Clock } from "lucide-react";

export default function DocumentationMetrics({ guides, videos, faqItems, metrics }) {
  const topViewed = useMemo(() => {
    const allItems = [
      ...guides.map(g => ({ ...g, type: 'guide' })),
      ...videos.map(v => ({ ...v, type: 'video' })),
      ...faqItems.map(f => ({ ...f, type: 'faq' }))
    ];
    
    return allItems
      .filter(item => item.is_published)
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5);
  }, [guides, videos, faqItems]);

  const totalViews = useMemo(() => {
    return [...guides, ...videos, ...faqItems].reduce((sum, item) => sum + (item.view_count || 0), 0);
  }, [guides, videos, faqItems]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documentation Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">User Guides Progress</span>
              <span className="text-sm font-semibold">
                {metrics.publishedGuides} / 6
              </span>
            </div>
            <Progress value={(metrics.publishedGuides / 6) * 100} />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Tutorial Videos Progress</span>
              <span className="text-sm font-semibold">
                {metrics.publishedVideos} / 3
              </span>
            </div>
            <Progress value={(metrics.publishedVideos / 3) * 100} />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">FAQ Items Progress</span>
              <span className="text-sm font-semibold">
                {metrics.publishedFAQ} / 50
              </span>
            </div>
            <Progress value={(metrics.publishedFAQ / 50) * 100} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Most Viewed Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topViewed.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No views yet
              </p>
            ) : (
              topViewed.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex-1 truncate">
                    <span className="text-slate-900">
                      {item.title || item.question}
                    </span>
                    <span className="text-slate-500 ml-2 text-xs capitalize">
                      ({item.type})
                    </span>
                  </div>
                  <span className="text-slate-600 ml-2 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {item.view_count || 0}
                  </span>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Total Views</span>
              <span className="font-semibold text-slate-900">{totalViews}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}