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
import { Bell, Check, CheckCheck, X, AlertCircle, FileText, MessageSquare, Upload } from "lucide-react";
import moment from "moment";

export default function ClientNotificationCenter({ client, clientToken }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['client-notifications', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      return base44.entities.ClientNotification.filter(
        { client_id: client.id },
        '-created_date',
        50
      );
    },
    initialData: [],
    enabled: !!client?.id,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await base44.entities.ClientNotification.update(notificationId, {
        is_read: true,
        read_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      for (const notification of unread) {
        await base44.entities.ClientNotification.update(notification.id, {
          is_read: true,
          read_date: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId) => {
      return await base44.entities.ClientNotification.delete(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-notifications'] });
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.action_url) {
      // Add client token to URL
      const url = notification.action_url.includes('?') 
        ? `${notification.action_url}&token=${clientToken}`
        : `${notification.action_url}?token=${clientToken}`;
      window.location.href = url;
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      proposal_shared: <FileText className="w-5 h-5 text-blue-500" />,
      status_change: <AlertCircle className="w-5 h-5 text-purple-500" />,
      new_comment: <MessageSquare className="w-5 h-5 text-green-500" />,
      document_uploaded: <Upload className="w-5 h-5 text-indigo-500" />,
      awaiting_review: <AlertCircle className="w-5 h-5 text-amber-500" />,
      consultant_reply: <MessageSquare className="w-5 h-5 text-blue-500" />,
      proposal_updated: <FileText className="w-5 h-5 text-purple-500" />,
    };
    return icons[type] || <Bell className="w-5 h-5 text-slate-500" />;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-slate-100",
      normal: "",
      high: "bg-amber-50 border-amber-200",
      urgent: "bg-red-50 border-red-200"
    };
    return colors[priority] || "";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
          <h3 className="font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-slate-500">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">We'll notify you of important updates</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors border-l-4 ${
                    !notification.is_read ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'
                  } ${getPriorityColor(notification.priority)}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`text-sm font-semibold ${
                          !notification.is_read ? 'text-slate-900' : 'text-slate-700'
                        }`}>
                          {notification.title}
                        </h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-slate-600 mb-2 line-clamp-2">{notification.message}</p>
                      {notification.from_consultant_name && (
                        <p className="text-xs text-slate-500 mb-2">
                          From: {notification.from_consultant_name}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {moment(notification.created_date).fromNow()}
                        </span>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.id);
                            }}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}