import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area"; // This will be replaced by custom infinite scroll
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Check, CheckCheck, Trash2, X, Loader2, CheckCircle2 } from "lucide-react";
import moment from "moment";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils"; // Assuming cn utility is available from shadcn/ui setup
import { usePaginatedInfiniteScroll, useInfiniteScroll } from "@/components/ui/useInfiniteScroll"; // Adjust path if necessary

export default function NotificationCenter({ user }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false); // Renamed isOpen to open

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', user.email],
    queryFn: async () => {
      // Fetch all notifications to allow for client-side sorting and pagination
      return base44.entities.Notification.filter(
        { user_email: user.email },
        '-created_date', // Still order by created_date from the server
        1000 // Fetch a reasonable maximum number, or implement server-side pagination for true infinite scroll
      );
    },
    initialData: [],
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Sort notifications by created_date (descending) for consistent display and pagination
  const sortedNotifications = [...notifications].sort((a, b) =>
    new Date(b.created_date) - new Date(a.created_date)
  );

  // NEW: Infinite scroll for notifications
  const {
    visibleItems: visibleNotifications,
    hasMore,
    loadMore,
    isLoading: isLoadingMore,
    totalItems,
    visibleCount
  } = usePaginatedInfiniteScroll(sortedNotifications, 15); // Page size of 15

  const {
    containerRef,
    loadingRef
  } = useInfiniteScroll({
    loadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 100
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await base44.entities.Notification.update(notificationId, {
        is_read: true,
        read_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      // Batch updates if your API supports it, otherwise iterate
      const updatePromises = unread.map(notification =>
        base44.entities.Notification.update(notification.id, {
          is_read: true,
          read_date: new Date().toISOString()
        })
      );
      await Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await base44.entities.Notification.delete(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
    setOpen(false); // Close popover after clicking a notification
  };

  const handleMarkAllRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Removed getNotificationIcon as Bell icon is now used directly

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative min-h-[44px] min-w-[44px]">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} new</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllAsReadMutation.isPending}
              className="mt-2 text-xs min-h-[44px]"
            >
              Mark all as read
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
            <p className="text-sm text-slate-600">Loading notifications...</p>
          </div>
        ) : sortedNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600">No notifications</p>
            <p className="text-xs text-slate-500 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="max-h-[400px] overflow-y-auto"
          >
            <div className="divide-y">
              {visibleNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-slate-50 transition-colors cursor-pointer min-h-[56px]",
                    !notification.is_read && "bg-blue-50"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <Bell className={cn(
                      "w-4 h-4 mt-1 flex-shrink-0",
                      notification.is_read ? "text-slate-400" : "text-blue-600"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm",
                        notification.is_read ? "text-slate-600" : "text-slate-900 font-semibold"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {moment(notification.created_date).fromNow()}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))}

              {/* NEW: Infinite Scroll Loading */}
              {hasMore && (
                <div ref={loadingRef} className="p-4">
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      className="w-full border-dashed min-h-[44px]"
                    >
                      Load More
                    </Button>
                  )}
                </div>
              )}

              {/* NEW: End Indicator */}
              {!hasMore && totalItems > 15 && ( // Only show if we loaded more than the initial page
                <div className="p-4 text-center text-xs text-slate-400">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    All caught up
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}