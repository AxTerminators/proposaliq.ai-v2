import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Activity,
  FileText,
  MessageSquare,
  CheckSquare,
  Upload,
  UserPlus,
  Clock,
  Edit,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ActivityTimeline({ activityLog = [], proposals = [] }) {
  const getActivityIcon = (actionType) => {
    const iconClass = "w-4 h-4";
    switch (actionType) {
      case 'proposal_created':
        return <FileText className={iconClass} />;
      case 'section_updated':
      case 'section_created':
        return <Edit className={iconClass} />;
      case 'comment_added':
        return <MessageSquare className={iconClass} />;
      case 'task_created':
      case 'task_updated':
        return <CheckSquare className={iconClass} />;
      case 'file_uploaded':
        return <Upload className={iconClass} />;
      case 'user_invited':
        return <UserPlus className={iconClass} />;
      case 'proposal_exported':
        return <Send className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const groupedActivities = activityLog.reduce((acc, activity) => {
    if (!activity || !activity.created_date) return acc;
    
    const date = new Date(activity.created_date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {});

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="px-6 pb-6">
            {Object.entries(groupedActivities).map(([date, activities], groupIdx) => (
              <div key={groupIdx} className="mb-6 last:mb-0">
                <div className="sticky top-0 bg-white py-2 mb-3 border-b">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {date}
                  </h4>
                </div>
                <div className="space-y-4 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {activities.map((activity, idx) => {
                    const proposal = proposals.find(p => p && p.id === activity.proposal_id);
                    const timeAgo = getTimeAgo(activity.created_date);
                    
                    return (
                      <div key={activity.id || idx} className="flex gap-3 relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 relative z-10 shadow-lg">
                          {getActivityIcon(activity.action_type)}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="text-sm text-slate-900 font-medium">
                              {activity.user_name || 'User'}
                            </p>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {timeAgo}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">
                            {activity.action_description || 'Performed an action'}
                          </p>
                          {proposal && (
                            <Badge variant="outline" className="text-xs">
                              {proposal.proposal_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {activityLog.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}