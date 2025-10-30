import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Copy
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import moment from "moment";

export default function CalendarSync({ proposal, organization, user }) {
  const queryClient = useQueryClient();
  const [showIcsDialog, setShowIcsDialog] = useState(false);
  const [icsUrl, setIcsUrl] = useState("");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);

  const { data: events } = useQuery({
    queryKey: ['calendar-events', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.CalendarEvent.filter(
        { organization_id: organization.id },
        '-start_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const generateIcsFile = (event) => {
    const formatDate = (date) => {
      return moment(date).utc().format('YYYYMMDDTHHmmss') + 'Z';
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ProposalIQ.ai//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event.id}@proposaliq.ai
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.start_date)}
DTEND:${formatDate(event.end_date)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
${event.meeting_link ? `URL:${event.meeting_link}` : ''}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;

    return icsContent;
  };

  const downloadSingleEvent = (event) => {
    const icsContent = generateIcsFile(event);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadAllEvents = () => {
    const allIcsContent = events.map(event => {
      const formatDate = (date) => {
        return moment(date).utc().format('YYYYMMDDTHHmmss') + 'Z';
      };

      return `BEGIN:VEVENT
UID:${event.id}@proposaliq.ai
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.start_date)}
DTEND:${formatDate(event.end_date)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
${event.meeting_link ? `URL:${event.meeting_link}` : ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT`;
    }).join('\n');

    const fullIcs = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ProposalIQ.ai//Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${allIcsContent}
END:VCALENDAR`;

    const blob = new Blob([fullIcs], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ProposalIQ_Calendar.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const generateGoogleCalendarUrl = (event) => {
    const formatDate = (date) => {
      return moment(date).format('YYYYMMDDTHHmmss');
    };

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${formatDate(event.start_date)}/${formatDate(event.end_date)}`,
      details: event.description || '',
      location: event.location || ''
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const generateOutlookUrl = (event) => {
    const formatDate = (date) => {
      return moment(date).toISOString();
    };

    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: event.title,
      startdt: formatDate(event.start_date),
      enddt: formatDate(event.end_date),
      body: event.description || '',
      location: event.location || ''
    });

    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  // Auto-sync proposal deadlines to calendar
  const syncProposalDeadlines = async () => {
    if (!proposal) return;

    const existingEvents = await base44.entities.CalendarEvent.filter({
      proposal_id: proposal.id,
      organization_id: organization.id
    });

    // Create deadline event if it doesn't exist
    if (proposal.due_date && existingEvents.length === 0) {
      await base44.entities.CalendarEvent.create({
        organization_id: organization.id,
        proposal_id: proposal.id,
        event_type: "proposal_deadline",
        title: `Deadline: ${proposal.proposal_name}`,
        description: `Proposal submission deadline for ${proposal.agency_name || 'client'}`,
        start_date: proposal.due_date + 'T23:59:59',
        end_date: proposal.due_date + 'T23:59:59',
        all_day: true,
        priority: "urgent",
        reminder_minutes: [1440, 10080] // 1 day and 1 week before
      });
    }
  };

  const upcomingEvents = events
    .filter(e => moment(e.start_date).isAfter(moment()))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendar Integration
          </CardTitle>
          <CardDescription>
            Sync your proposal deadlines and events to external calendars
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              onClick={downloadAllEvents}
              variant="outline"
              className="w-full"
              disabled={events.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Download All Events (.ics)
            </Button>
            <Button
              onClick={() => setShowIcsDialog(true)}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Calendar Subscription
            </Button>
          </div>

          {/* Auto-sync Setting */}
          {proposal && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900">Auto-sync Deadlines</p>
                    <p className="text-xs text-slate-600">
                      Automatically create calendar events for proposal deadlines
                    </p>
                  </div>
                </div>
                <Switch
                  checked={autoSyncEnabled}
                  onCheckedChange={(checked) => {
                    setAutoSyncEnabled(checked);
                    if (checked) {
                      syncProposalDeadlines();
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Upcoming Events ({upcomingEvents.length})
              </h3>
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-slate-600">
                          {moment(event.start_date).format('MMM D, YYYY [at] h:mm A')}
                        </p>
                        {event.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-xs">Urgent</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadSingleEvent(event)}
                        title="Download .ics file"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(generateGoogleCalendarUrl(event), '_blank')}
                        title="Add to Google Calendar"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold text-slate-900 mb-2 text-sm">How to Use:</h4>
            <ul className="text-xs text-slate-600 space-y-1">
              <li>• <strong>Download .ics:</strong> Import individual events or all events into any calendar app</li>
              <li>• <strong>Google Calendar:</strong> Click the external link icon to add directly</li>
              <li>• <strong>Outlook:</strong> Download .ics and import through Outlook settings</li>
              <li>• <strong>Calendar URL:</strong> Subscribe to auto-update calendar (coming soon)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Subscription Dialog */}
      <Dialog open={showIcsDialog} onOpenChange={setShowIcsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Calendar Subscription URL
            </DialogTitle>
            <DialogDescription>
              Subscribe to this URL in your calendar app for automatic updates
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 mb-1">Coming Soon</p>
                  <p className="text-xs text-amber-800">
                    Calendar subscription URLs with auto-sync are currently in development. 
                    For now, please use the "Download All Events" feature and re-import 
                    periodically to stay updated.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-3">Add to Your Calendar:</h4>
              <div className="grid gap-3">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => downloadAllEvents()}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download .ics file (All Events)
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    const url = `${window.location.origin}/calendar-feed/${organization?.id}`;
                    copyToClipboard(url);
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Subscription URL (Coming Soon)
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Instructions by Platform:</h4>
              
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-xs text-slate-900 mb-2">Google Calendar</p>
                <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Download the .ics file</li>
                  <li>Open Google Calendar → Settings → Import & Export</li>
                  <li>Click "Select file from your computer" and choose the .ics file</li>
                  <li>Select the destination calendar and click Import</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-xs text-slate-900 mb-2">Outlook / Office 365</p>
                <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Download the .ics file</li>
                  <li>Open Outlook → Calendar → Add Calendar</li>
                  <li>Select "Upload from file"</li>
                  <li>Choose the .ics file and import</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-xs text-slate-900 mb-2">Apple Calendar</p>
                <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Download the .ics file</li>
                  <li>Double-click the .ics file</li>
                  <li>Select the calendar to add events to</li>
                  <li>Click "OK" to import</li>
                </ol>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowIcsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}