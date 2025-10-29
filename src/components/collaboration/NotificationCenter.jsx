import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bell,
  CheckCircle2,
  MessageSquare,
  CheckSquare,
  UserPlus,
  Clock,
  AlertCircle,
  X,
  Trash2
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "@/utils/notificationHelpers";
import { cn } from "@/lib/utils";

export default function NotificationCenter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: notifications } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, '-created_date', 50),
    initialData: [],
    enabled: !!user?.email,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId) => markNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(user.email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    } else if (notification.related_proposal_id) {
      navigate(createPageUrl(`ProposalBuilder?id=${notification.related_proposal_id}`));
      setIsOpen(false);
    }
  };

  const handleDelete = (e, notificationId) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(notificationId);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  // Group notifications by date
  const groupByDate = (notifs) => {
    const groups = {};
    const now = new Date();
    
    notifs.forEach(notif => {
      const date = new Date(notif.created_date);
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      
      let groupKey;
      if (diffDays === 0) groupKey = "Today";
      else if (diffDays === 1) groupKey = "Yesterday";
      else if (diffDays < 7) groupKey = "This Week";
      else groupKey = "Earlier";
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(notif);
    });
    
    return groups;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'mention':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'task_assigned':
        return <CheckSquare className="w-4 h-4 text-purple-600" />;
      case 'comment_reply':
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      case 'deadline_reminder':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'status_change':
        return <AlertCircle className="w-4 h-4 text-indigo-600" />;
      case 'approval_request':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const NotificationItem = ({ notification, grouped = false }) => {
    const timeAgo = getTimeAgo(notification.created_date);
    
    return (
      <div
        className={cn(
          "p-3 rounded-lg border cursor-pointer transition-all hover:bg-slate-50 group relative",
          notification.is_read ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-300'
        )}
        onClick={() => handleNotificationClick(notification)}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getNotificationIcon(notification.notification_type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={cn(
                "text-sm font-medium",
                notification.is_read ? 'text-slate-700' : 'text-slate-900'
              )}>
                {notification.title}
              </p>
              {!notification.is_read && (
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
              )}
            </div>
            <p className={cn(
              "text-xs mt-1",
              notification.is_read ? 'text-slate-500' : 'text-slate-600'
            )}>
              {notification.message}
            </p>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                {notification.from_user_name && (
                  <span className="text-xs text-slate-500">
                    from {notification.from_user_name}
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  {timeAgo}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-6 px-2"
                onClick={(e) => handleDelete(e, notification.id)}
              >
                <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const NotificationGroup = ({ title, notifications }) => (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
        {title}
      </h4>
      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} grouped />
        ))}
      </div>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative min-w-[44px] min-h-[44px]">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-600 text-white text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b p-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-xs text-slate-600">{unreadCount} unread</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
            <TabsTrigger value="unread" className="rounded-none">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-none">
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[400px]">
              <div className="p-3">
                {unreadNotifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-medium">All caught up!</p>
                    <p className="text-xs text-slate-400 mt-1">No unread notifications</p>
                  </div>
                ) : (
                  Object.entries(groupByDate(unreadNotifications)).map(([group, notifs]) => (
                    <NotificationGroup key={group} title={group} notifications={notifs} />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[400px]">
              <div className="p-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-medium">No notifications yet</p>
                    <p className="text-xs text-slate-400 mt-1">We'll notify you when something happens</p>
                  </div>
                ) : (
                  Object.entries(groupByDate(notifications)).map(([group, notifs]) => (
                    <NotificationGroup key={group} title={group} notifications={notifs} />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}