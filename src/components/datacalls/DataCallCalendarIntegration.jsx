import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, Plus, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DataCallCalendarIntegration({ 
  dataCall, 
  organization,
  user 
}) {
  const queryClient = useQueryClient();
  const [autoCreateEvents, setAutoCreateEvents] = React.useState(true);
  const [createReminders, setCreateReminders] = React.useState(true);

  const createEventsMutation = useMutation({
    mutationFn: async () => {
      const events = [];

      // Main due date event
      if (dataCall.due_date && autoCreateEvents) {
        const dueEvent = await base44.entities.CalendarEvent.create({
          organization_id: organization.id,
          event_type: 'proposal_deadline',
          title: `Data Call Due: ${dataCall.request_title}`,
          description: `Data call request from ${dataCall.assigned_to_name || dataCall.assigned_to_email}`,
          start_date: new Date(dataCall.due_date).toISOString(),
          end_date: new Date(dataCall.due_date).toISOString(),
          all_day: true,
          priority: dataCall.priority,
          created_by_email: user.email,
          created_by_name: user.full_name,
          color: '#EF4444',
          reminder_minutes: createReminders ? [1440, 10080] : [] // 1 day, 1 week before
        });
        events.push(dueEvent);
      }

      // Reminder events (3 days before, 1 week before)
      if (dataCall.due_date && createReminders) {
        const dueDate = new Date(dataCall.due_date);
        
        // 1 week before
        const oneWeekBefore = new Date(dueDate);
        oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
        
        if (oneWeekBefore > new Date()) {
          await base44.entities.CalendarEvent.create({
            organization_id: organization.id,
            event_type: 'reminder',
            title: `Reminder: Data Call Due in 1 Week`,
            description: dataCall.request_title,
            start_date: oneWeekBefore.toISOString(),
            end_date: oneWeekBefore.toISOString(),
            all_day: true,
            created_by_email: user.email,
            created_by_name: user.full_name,
            color: '#F59E0B'
          });
        }

        // 3 days before
        const threeDaysBefore = new Date(dueDate);
        threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
        
        if (threeDaysBefore > new Date()) {
          await base44.entities.CalendarEvent.create({
            organization_id: organization.id,
            event_type: 'reminder',
            title: `Reminder: Data Call Due in 3 Days`,
            description: dataCall.request_title,
            start_date: threeDaysBefore.toISOString(),
            end_date: threeDaysBefore.toISOString(),
            all_day: true,
            created_by_email: user.email,
            created_by_name: user.full_name,
            color: '#F59E0B'
          });
        }
      }

      return events;
    },
    onSuccess: (events) => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success(`${events.length} calendar event(s) created!`);
    },
    onError: (error) => {
      toast.error('Failed to create events: ' + error.message);
    }
  });

  if (!dataCall?.due_date) {
    return (
      <div className="text-sm text-slate-500">
        <Clock className="w-4 h-4 inline mr-1" />
        No due date set - add a due date to enable calendar integration
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Calendar className="w-4 h-4 mr-2" />
          Add to Calendar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <h4 className="font-semibold">Create Calendar Events</h4>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-create"
                checked={autoCreateEvents}
                onCheckedChange={setAutoCreateEvents}
              />
              <Label htmlFor="auto-create" className="cursor-pointer font-normal">
                Create due date event
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="reminders"
                checked={createReminders}
                onCheckedChange={setCreateReminders}
              />
              <Label htmlFor="reminders" className="cursor-pointer font-normal">
                Create reminder events (1 week & 3 days before)
              </Label>
            </div>
          </div>

          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-3">
              <p className="text-xs text-slate-600">
                📅 Due Date: {new Date(dataCall.due_date).toLocaleDateString()}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {createReminders ? '⏰ 3 events will be created (due date + 2 reminders)' : '⏰ 1 event will be created'}
              </p>
            </CardContent>
          </Card>

          <Button
            onClick={() => createEventsMutation.mutate()}
            disabled={createEventsMutation.isPending || (!autoCreateEvents && !createReminders)}
            className="w-full"
          >
            {createEventsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Events
              </>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}