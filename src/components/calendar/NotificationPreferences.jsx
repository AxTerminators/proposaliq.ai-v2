import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Smartphone, Moon, Calendar, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotificationPreferences({ user, organization }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.email, organization?.id],
    queryFn: async () => {
      if (!user?.email || !organization?.id) return null;
      const prefs = await base44.entities.UserNotificationPreference.filter({
        user_email: user.email,
        organization_id: organization.id
      });
      return prefs[0] || null;
    },
    enabled: !!user?.email && !!organization?.id,
  });

  const [formData, setFormData] = useState({
    default_reminders: [15, 1440],
    notification_channels: {
      in_app: true,
      email: true,
      sms: false
    },
    quiet_hours: {
      enabled: false,
      start_time: "22:00",
      end_time: "08:00"
    },
    daily_digest: {
      enabled: false,
      time: "08:00"
    },
    weekly_summary: {
      enabled: false,
      day: "sunday"
    }
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        default_reminders: preferences.default_reminders || [15, 1440],
        notification_channels: preferences.notification_channels || {
          in_app: true,
          email: true,
          sms: false
        },
        quiet_hours: preferences.quiet_hours || {
          enabled: false,
          start_time: "22:00",
          end_time: "08:00"
        },
        daily_digest: preferences.daily_digest || {
          enabled: false,
          time: "08:00"
        },
        weekly_summary: preferences.weekly_summary || {
          enabled: false,
          day: "sunday"
        }
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (preferences) {
        await base44.entities.UserNotificationPreference.update(preferences.id, formData);
      } else {
        await base44.entities.UserNotificationPreference.create({
          ...formData,
          user_email: user.email,
          organization_id: organization.id
        });
      }
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      alert("Notification preferences saved!");
    } catch (error) {
      console.error("Error saving preferences:", error);
      alert("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = (minutes) => {
    const reminders = formData.default_reminders.includes(minutes)
      ? formData.default_reminders.filter(r => r !== minutes)
      : [...formData.default_reminders, minutes].sort((a, b) => a - b);
    setFormData({ ...formData, default_reminders: reminders });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Loading preferences...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Notification Preferences</h3>
        <p className="text-sm text-slate-600">Customize how and when you receive event reminders</p>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Default Reminders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600 mb-4">Set default reminders for all new events</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.default_reminders.includes(5)}
                onChange={() => toggleReminder(5)}
                className="w-4 h-4"
              />
              <span className="text-sm">5 minutes before</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.default_reminders.includes(15)}
                onChange={() => toggleReminder(15)}
                className="w-4 h-4"
              />
              <span className="text-sm">15 minutes before</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.default_reminders.includes(30)}
                onChange={() => toggleReminder(30)}
                className="w-4 h-4"
              />
              <span className="text-sm">30 minutes before</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.default_reminders.includes(60)}
                onChange={() => toggleReminder(60)}
                className="w-4 h-4"
              />
              <span className="text-sm">1 hour before</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.default_reminders.includes(1440)}
                onChange={() => toggleReminder(1440)}
                className="w-4 h-4"
              />
              <span className="text-sm">1 day before</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.default_reminders.includes(10080)}
                onChange={() => toggleReminder(10080)}
                className="w-4 h-4"
              />
              <span className="text-sm">1 week before</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Notification Channels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">In-App Notifications</p>
                <p className="text-xs text-slate-500">Receive notifications in ProposalIQ.ai</p>
              </div>
            </div>
            <Switch
              checked={formData.notification_channels.in_app}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                notification_channels: { ...formData.notification_channels, in_app: checked }
              })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-xs text-slate-500">Receive email reminders</p>
              </div>
            </div>
            <Switch
              checked={formData.notification_channels.email}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                notification_channels: { ...formData.notification_channels, email: checked }
              })}
            />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-xs text-slate-500">Receive text message reminders (coming soon)</p>
              </div>
            </div>
            <Switch disabled checked={formData.notification_channels.sms} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Quiet Hours</p>
              <p className="text-xs text-slate-500">Don't send notifications during these hours</p>
            </div>
            <Switch
              checked={formData.quiet_hours.enabled}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                quiet_hours: { ...formData.quiet_hours, enabled: checked }
              })}
            />
          </div>

          {formData.quiet_hours.enabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium mb-2">Start Time</label>
                <Input
                  type="time"
                  value={formData.quiet_hours.start_time}
                  onChange={(e) => setFormData({
                    ...formData,
                    quiet_hours: { ...formData.quiet_hours, start_time: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Time</label>
                <Input
                  type="time"
                  value={formData.quiet_hours.end_time}
                  onChange={(e) => setFormData({
                    ...formData,
                    quiet_hours: { ...formData.quiet_hours, end_time: e.target.value }
                  })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Digest & Summary Emails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Daily Digest</p>
              <p className="text-xs text-slate-500">Daily email with today's events</p>
            </div>
            <Switch
              checked={formData.daily_digest.enabled}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                daily_digest: { ...formData.daily_digest, enabled: checked }
              })}
            />
          </div>

          {formData.daily_digest.enabled && (
            <div className="pl-8">
              <label className="block text-sm font-medium mb-2">Send at</label>
              <Input
                type="time"
                value={formData.daily_digest.time}
                onChange={(e) => setFormData({
                  ...formData,
                  daily_digest: { ...formData.daily_digest, time: e.target.value }
                })}
                className="w-40"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Weekly Summary</p>
              <p className="text-xs text-slate-500">Weekly overview of upcoming events</p>
            </div>
            <Switch
              checked={formData.weekly_summary.enabled}
              onCheckedChange={(checked) => setFormData({
                ...formData,
                weekly_summary: { ...formData.weekly_summary, enabled: checked }
              })}
            />
          </div>

          {formData.weekly_summary.enabled && (
            <div className="pl-8">
              <label className="block text-sm font-medium mb-2">Send on</label>
              <select
                className="w-40 border rounded-md p-2"
                value={formData.weekly_summary.day}
                onChange={(e) => setFormData({
                  ...formData,
                  weekly_summary: { ...formData.weekly_summary, day: e.target.value }
                })}
              >
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-indigo-600">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}