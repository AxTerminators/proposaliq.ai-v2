import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  FileText,
  AlertCircle,
  Calendar,
  Users,
  X,
  Check,
  Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { useNavigate } from "react-router-dom";

const NOTIFICATION_ICONS = {
  'mention': MessageSquare,
  'task_assigned': CheckCircle2,
  'comment_reply': MessageSquare,
  'deadline_reminder': Calendar,
  'status_change': AlertCircle,
  'approval_request': Users,
  'proposal_shared': FileText
};

/**
 * Smart Notification Center
 * Enhanced notification system with categorization and smart actions
 */
export default function SmartNotificationCenter({ user, organization }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications-smart', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Notification.filter(
        { user_email: user.email },
        '-created_date'
      );
    },
    enabled: !!user?.email,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      return base44.entities.Notification.update(notificationId, {
        is_read: true,
        read_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-smart'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.all(
        unread.map(n => 
          base44.entities.Notification.update(n.id, {
            is_read: true,
            read_date: new Date().toISOString()
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-smart'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      return base44.entities.Notification.delete(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-smart'] });
    },
  });

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id);
    }

    // Navigate to action URL
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const filteredNotifications = React.useMemo(() => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter(n => !n.is_read);
    return notifications.filter(n => n.notification_type === filter);
  }, [notifications, filter]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-600 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>

          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="mention">Mentions</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 text-center text-slate-500">
              Loading...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map(notification => {
                const Icon = NOTIFICATION_ICONS[notification.notification_type] || Bell;
                
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-4 cursor-pointer transition-all group relative",
                      notification.is_read ? "bg-white" : "bg-blue-50 hover:bg-blue-100"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        notification.is_read ? "bg-slate-100" : "bg-blue-100"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5",
                          notification.is_read ? "text-slate-600" : "text-blue-600"
                        )} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm mb-1",
                          notification.is_read ? "text-slate-700" : "text-slate-900 font-medium"
                        )}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {moment(notification.created_date).fromNow()}
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotificationMutation.mutate(notification.id);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}