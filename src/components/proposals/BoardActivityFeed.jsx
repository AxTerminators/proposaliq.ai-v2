import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Users,
  Clock,
  TrendingUp,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { usePaginatedInfiniteScroll, useInfiniteScroll } from "../ui/useInfiniteScroll";

const ACTIVITY_ICONS = {
  proposal_created: { icon: Plus, color: 'text-green-600 bg-green-100' },
  status_changed: { icon: ArrowRight, color: 'text-blue-600 bg-blue-100' },
  section_created: { icon: Edit, color: 'text-purple-600 bg-purple-100' },
  section_updated: { icon: Edit, color: 'text-amber-600 bg-amber-100' },
  task_created: { icon: CheckCircle, color: 'text-indigo-600 bg-indigo-100' },
  task_updated: { icon: CheckCircle, color: 'text-cyan-600 bg-cyan-100' },
  comment_added: { icon: Activity, color: 'text-pink-600 bg-pink-100' },
  user_invited: { icon: Users, color: 'text-teal-600 bg-teal-100' },
};

export default function BoardActivityFeed({ organization, boardId, maxItems = 100 }) {
  // **UPDATED: Fetch more items for infinite scroll**
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['board-activity', organization?.id, boardId],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const logs = await base44.entities.ActivityLog.filter(
        { organization_id: organization.id },
        '-created_date',
        maxItems // **INCREASED default from 20 to 100**
      );
      
      return logs;
    },
    enabled: !!organization?.id,
    staleTime: 30000,
    refetchInterval: 60000
  });

  // **NEW: Infinite scroll pagination**
  const {
    visibleItems: visibleActivities,
    hasMore,
    loadMore,
    isLoading: isLoadingMore,
    totalItems,
    visibleCount
  } = usePaginatedInfiniteScroll(activities, 20);

  const {
    containerRef,
    loadingRef
  } = useInfiniteScroll({
    loadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 100
  });

  // Group activities by date
  const groupedActivities = React.useMemo(() => {
    const groups = {};
    
    visibleActivities.forEach(activity => {
      const dateKey = moment(activity.created_date).format('YYYY-MM-DD');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });
    
    return groups;
  }, [visibleActivities]);

  const getTimeAgo = (date) => {
    const now = moment();
    const activityTime = moment(date);
    const diffMinutes = now.diff(activityTime, 'minutes');
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = now.diff(activityTime, 'hours');
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = now.diff(activityTime, 'days');
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return activityTime.format('MMM D');
  };

  const getDateLabel = (dateKey) => {
    const date = moment(dateKey);
    const today = moment().format('YYYY-MM-DD');
    const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
    
    if (dateKey === today) return 'Today';
    if (dateKey === yesterday) return 'Yesterday';
    
    return date.format('MMMM D, YYYY');
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="text-sm text-slate-600 mt-3">Loading activity...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          Recent Activity
          {totalItems > 0 && (
            <Badge variant="outline" className="ml-auto">
              {visibleCount} of {totalItems} events
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600">No recent activity</p>
            <p className="text-xs text-slate-500 mt-1">Activity will appear here as clients engage</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="max-h-[500px] overflow-y-auto"
          >
            <div className="space-y-6 p-6">
              {Object.entries(groupedActivities).map(([dateKey, dateActivities]) => (
                <div key={dateKey}>
                  <div className="sticky top-0 bg-white z-10 pb-2 mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {getDateLabel(dateKey)}
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    {dateActivities.map((activity, idx) => {
                      const activityConfig = ACTIVITY_TYPES[activity.type] || {
                        icon: Activity,
                        color: 'text-slate-600 bg-slate-100'
                      };
                      const Icon = activityConfig.icon;
                      
                      return (
                        <div key={`${dateKey}-${idx}`} className="flex items-start gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            activityConfig.color
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900">
                              <span className="font-semibold">{activity.actor || 'Client'}</span>
                              {' '}
                              <span className="text-slate-600">{activity.description}</span>
                            </p>
                            {activity.details && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {activity.details}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              {getTimeAgo(activity.date)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* **NEW: Infinite Scroll Loading Indicator** */}
              {hasMore && (
                <div ref={loadingRef} className="py-4">
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading more activity...</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      className="w-full border-dashed"
                    >
                      Load More
                    </Button>
                  )}
                </div>
              )}

              {/* **NEW: End Indicator** */}
              {!hasMore && totalItems > 15 && (
                <div className="text-center py-4 text-xs text-slate-400">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    You've reached the end
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}