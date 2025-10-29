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
  AlertCircle
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

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
    mutationFn: (notificationId) => base44.entities.Notification.update(notificationId, {
      is_read: true,
      read_date: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      for (const notification of unreadNotifications) {
        await base44.entities.Notification.update(notification.id, {
          is_read: true,
          read_date: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.related_proposal_id) {
      navigate(createPageUrl(`ProposalBuilder?id=${notification.related_proposal_id}`));
      setIsOpen(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

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

  const NotificationItem = ({ notification }) => (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-slate-50 ${
        notification.is_read ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-300'
      }`}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getNotificationIcon(notification.notification_type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${notification.is_read ? 'text-slate-700' : 'text-slate-900'}`}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></div>
            )}
          </div>
          <p className={`text-xs mt-1 ${notification.is_read ? 'text-slate-500' : 'text-slate-600'}`}>
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {notification.from_user_name && (
              <span className="text-xs text-slate-500">
                from {notification.from_user_name}
              </span>
            )}
            <span className="text-xs text-slate-400">
              {new Date(notification.created_date).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
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
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>

        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
            <TabsTrigger value="unread" className="rounded-none">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-none">
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="m-0">
            <ScrollArea className="h-[400px]">
              <div className="p-3 space-y-2">
                {unreadNotifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">All caught up!</p>
                    <p className="text-xs text-slate-400">No unread notifications</p>
                  </div>
                ) : (
                  unreadNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[400px]">
              <div className="p-3 space-y-2">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
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