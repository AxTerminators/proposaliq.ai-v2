import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Users,
  Clock,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

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

export default function BoardActivityFeed({ organization, boardId, maxItems = 20 }) {
  // Fetch recent activity logs
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['board-activity', organization?.id, boardId],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Get recent activity logs for this organization
      const logs = await base44.entities.ActivityLog.filter(
        { organization_id: organization.id },
        '-created_date',
        maxItems
      );
      
      return logs;
    },
    enabled: !!organization?.id,
    staleTime: 30000,
    refetchInterval: 60000 // Auto-refresh every minute
  });

  // Group activities by date
  const groupedActivities = React.useMemo(() => {
    const groups = {};
    
    activities.forEach(activity => {
      const dateKey = moment(activity.created_date).format('YYYY-MM-DD');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });
    
    return groups;
  }, [activities]);

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
          {activities.length > 0 && (
            <Badge variant="outline" className="ml-auto">
              {activities.length} events
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600">No recent activity</p>
            <p className="text-xs text-slate-500 mt-1">Activity will appear here as team members work</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-6 p-6">
              {Object.entries(groupedActivities).map(([dateKey, dateActivities]) => (
                <div key={dateKey}>
                  <div className="sticky top-0 bg-white z-10 pb-2 mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {getDateLabel(dateKey)}
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    {dateActivities.map((activity) => {
                      const activityConfig = ACTIVITY_ICONS[activity.action_type] || {
                        icon: Activity,
                        color: 'text-slate-600 bg-slate-100'
                      };
                      const Icon = activityConfig.icon;
                      
                      return (
                        <div key={activity.id} className="flex items-start gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                            activityConfig.color
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900">
                              <span className="font-semibold">{activity.user_name || activity.user_email}</span>
                              {' '}
                              <span className="text-slate-600">{activity.action_description}</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {getTimeAgo(activity.created_date)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}