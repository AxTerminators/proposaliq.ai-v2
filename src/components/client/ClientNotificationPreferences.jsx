import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ClientNotificationPreferences({ client }) {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState(client.email_notifications || {
    enabled: true,
    proposal_shared: true,
    status_changes: true,
    new_comments: true,
    documents_uploaded: true,
    deadline_reminders: true,
    frequency: 'immediate',
    digest_enabled: false,
    digest_time: 'morning',
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00'
  });

  const [hasChanges, setHasChanges] = useState(false);

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences) => {
      return await base44.entities.Client.update(client.id, {
        email_notifications: newPreferences
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setHasChanges(false);
    },
  });

  const handleToggle = (key) => {
    const newPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPreferences);
    setHasChanges(true);
  };

  const handleSelect = (key, value) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setHasChanges(true);
  };

  const handleSave = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  const handleReset = () => {
    setPreferences(client.email_notifications);
    setHasChanges(false);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Customize how and when {client.client_name} receives notifications
            </CardDescription>
          </div>
          {hasChanges && (
            <Badge className="bg-amber-100 text-amber-700">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold text-blue-900">Email Notifications</Label>
              <p className="text-sm text-blue-700 mt-1">
                Master control for all email notifications
              </p>
            </div>
            <Switch
              checked={preferences.enabled}
              onCheckedChange={() => handleToggle('enabled')}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>
        </div>

        {/* Notification Types */}
        {preferences.enabled && (
          <>
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Notification Types</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-slate-600" />
                    <div>
                      <Label className="font-medium">Proposal Shared</Label>
                      <p className="text-xs text-slate-600">When a new proposal is shared with you</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.proposal_shared}
                    onCheckedChange={() => handleToggle('proposal_shared')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-slate-600" />
                    <div>
                      <Label className="font-medium">Status Changes</Label>
                      <p className="text-xs text-slate-600">When proposal status is updated</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.status_changes}
                    onCheckedChange={() => handleToggle('status_changes')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-slate-600" />
                    <div>
                      <Label className="font-medium">New Comments</Label>
                      <p className="text-xs text-slate-600">When someone comments on a proposal</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.new_comments}
                    onCheckedChange={() => handleToggle('new_comments')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-600" />
                    <div>
                      <Label className="font-medium">Documents Uploaded</Label>
                      <p className="text-xs text-slate-600">When new documents are uploaded</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.documents_uploaded}
                    onCheckedChange={() => handleToggle('documents_uploaded')}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-600" />
                    <div>
                      <Label className="font-medium">Deadline Reminders</Label>
                      <p className="text-xs text-slate-600">Reminders about upcoming deadlines</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.deadline_reminders}
                    onCheckedChange={() => handleToggle('deadline_reminders')}
                  />
                </div>
              </div>
            </div>

            {/* Notification Frequency */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Notification Frequency</h3>
              <Select
                value={preferences.frequency}
                onValueChange={(value) => handleSelect('frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate (as they happen)</SelectItem>
                  <SelectItem value="hourly">Hourly Digest</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Daily Digest Settings */}
            {preferences.frequency === 'daily' && (
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-3">Daily Digest Settings</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Enable Daily Digest</Label>
                    <Switch
                      checked={preferences.digest_enabled}
                      onCheckedChange={() => handleToggle('digest_enabled')}
                    />
                  </div>
                  {preferences.digest_enabled && (
                    <div>
                      <Label>Preferred Time</Label>
                      <Select
                        value={preferences.digest_time}
                        onValueChange={(value) => handleSelect('digest_time', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Morning (8:00 AM)</SelectItem>
                          <SelectItem value="midday">Midday (12:00 PM)</SelectItem>
                          <SelectItem value="evening">Evening (6:00 PM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quiet Hours */}
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <h4 className="font-semibold text-indigo-900 mb-3">Quiet Hours</h4>
              <p className="text-sm text-indigo-700 mb-3">
                Don't send notifications during these hours
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Enable Quiet Hours</Label>
                  <Switch
                    checked={preferences.quiet_hours_enabled}
                    onCheckedChange={() => handleToggle('quiet_hours_enabled')}
                  />
                </div>
                {preferences.quiet_hours_enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Start Time</Label>
                      <Select
                        value={preferences.quiet_hours_start}
                        onValueChange={(value) => handleSelect('quiet_hours_start', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0');
                            return (
                              <SelectItem key={hour} value={`${hour}:00`}>
                                {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">End Time</Label>
                      <Select
                        value={preferences.quiet_hours_end}
                        onValueChange={(value) => handleSelect('quiet_hours_end', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, '0');
                            return (
                              <SelectItem key={hour} value={`${hour}:00`}>
                                {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleReset}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updatePreferencesMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updatePreferencesMutation.isPending ? (
                <>Saving...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Save Preferences
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}