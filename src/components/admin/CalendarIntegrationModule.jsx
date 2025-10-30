import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Calendar,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  FileText,
  Sparkles,
  ExternalLink,
  Copy
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";

export default function CalendarIntegrationModule({ currentUser }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: events } = useQuery({
    queryKey: ['admin-calendar-events'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_date', 200),
    initialData: []
  });

  const { data: proposals } = useQuery({
    queryKey: ['admin-calendar-proposals'],
    queryFn: () => base44.entities.Proposal.list('-due_date'),
    initialData: []
  });

  const { data: organizations } = useQuery({
    queryKey: ['admin-calendar-orgs'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
    initialData: []
  });

  // Calculate stats
  const totalEvents = events.length;
  const upcomingEvents = events.filter(e => moment(e.start_date).isAfter(moment())).length;
  const pastEvents = events.filter(e => moment(e.start_date).isBefore(moment())).length;
  const todayEvents = events.filter(e => moment(e.start_date).isSame(moment(), 'day')).length;
  const urgentEvents = events.filter(e => 
    e.priority === 'urgent' && moment(e.start_date).isAfter(moment())
  ).length;

  const proposalsWithDeadlines = proposals.filter(p => p.due_date).length;
  const upcomingDeadlines = proposals.filter(p => 
    p.due_date && moment(p.due_date).isAfter(moment())
  ).length;

  const eventsByType = events.reduce((acc, e) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1;
    return acc;
  }, {});

  const eventsByOrg = organizations.map(org => ({
    org: org.organization_name,
    count: events.filter(e => e.organization_id === org.id).length
  })).filter(o => o.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);

  const filteredEvents = events.filter(e =>
    e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const downloadAllEvents = () => {
    const formatDate = (date) => {
      return moment(date).utc().format('YYYYMMDDTHHmmss') + 'Z';
    };

    const allIcsContent = events.map(event => {
      return `BEGIN:VEVENT
UID:${event.id}@proposaliq.ai
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(event.start_date)}
DTEND:${formatDate(event.end_date)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
STATUS:CONFIRMED
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
    link.download = 'ProposalIQ_All_Events.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Calendar Integration</h2>
          <p className="text-slate-600">Manage calendar sync and event exports across all organizations</p>
        </div>
        <Badge className="bg-green-100 text-green-700 px-4 py-2">
          <Sparkles className="w-4 h-4 mr-2" />
          Phase 4 Feature
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalEvents}</p>
            <p className="text-xs text-slate-600">Total Events</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 text-green-500" />
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{upcomingEvents}</p>
            <p className="text-xs text-slate-600">Upcoming</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-6 h-6 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{todayEvents}</p>
            <p className="text-xs text-slate-600">Today</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{urgentEvents}</p>
            <p className="text-xs text-slate-600">Urgent Events</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{upcomingDeadlines}</p>
            <p className="text-xs text-slate-600">Proposal Deadlines</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">All Events</TabsTrigger>
          <TabsTrigger value="organizations">By Organization</TabsTrigger>
          <TabsTrigger value="export">Export Tools</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Events by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(eventsByType).map(([type, count]) => (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="font-semibold">{count} events</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(count / totalEvents) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Upcoming Critical Deadlines</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {proposals
                    .filter(p => p.due_date && moment(p.due_date).isAfter(moment()))
                    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
                    .slice(0, 5)
                    .map(proposal => {
                      const daysUntil = moment(proposal.due_date).diff(moment(), 'days');
                      return (
                        <div 
                          key={proposal.id}
                          className={`p-3 rounded-lg border ${
                            daysUntil <= 3 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                          }`}
                        >
                          <p className="font-medium text-sm">{proposal.proposal_name}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {moment(proposal.due_date).format('MMM D, YYYY')} ({daysUntil} days)
                          </p>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Today's Events</CardTitle>
              </CardHeader>
              <CardContent>
                {todayEvents === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No events scheduled today</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events
                      .filter(e => moment(e.start_date).isSame(moment(), 'day'))
                      .map(event => (
                        <div key={event.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {moment(event.start_date).format('h:mm A')}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* All Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredEvents.slice(0, 20).map(event => (
                  <div key={event.id} className="p-3 border rounded-lg hover:bg-slate-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{event.title}</p>
                          <Badge variant="outline" className="text-xs capitalize">
                            {event.event_type.replace(/_/g, ' ')}
                          </Badge>
                          {event.priority !== 'medium' && (
                            <Badge className={`text-xs ${
                              event.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                              event.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {event.priority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">
                          {moment(event.start_date).format('MMM D, YYYY [at] h:mm A')}
                        </p>
                        {event.location && (
                          <p className="text-xs text-slate-500 mt-1">📍 {event.location}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Organization Tab */}
        <TabsContent value="organizations" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Events by Organization</CardTitle>
              <CardDescription>Top organizations by calendar activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eventsByOrg.map((item, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{item.org}</span>
                      <span className="text-sm font-semibold">{item.count} events</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ 
                          width: `${(item.count / totalEvents) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tools Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Calendar Export Tools</CardTitle>
              <CardDescription>Download and sync calendar data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Button
                  onClick={downloadAllEvents}
                  variant="outline"
                  className="w-full h-20 flex-col"
                >
                  <Download className="w-6 h-6 mb-2" />
                  <span>Download All Events (.ics)</span>
                  <span className="text-xs text-slate-500">Import into any calendar app</span>
                </Button>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Calendar Feed URL</p>
                      <p className="text-xs text-amber-800 mt-1">
                        Live calendar feeds with auto-sync are in development. 
                        Use .ics export for now.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Platform Integration Status</h4>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">Google Calendar</p>
                      <p className="text-xs text-slate-600">Direct add-to-calendar support</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600">Supported</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">Outlook / Office 365</p>
                      <p className="text-xs text-slate-600">.ics import support</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600">Supported</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">Apple Calendar</p>
                      <p className="text-xs text-slate-600">.ics import support</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600">Supported</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="font-medium text-sm">Live Calendar Feed</p>
                      <p className="text-xs text-slate-600">Auto-sync subscription URL</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-3">Export Instructions</h4>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li>• Click "Download All Events" to get a .ics file with all calendar events</li>
                  <li>• Import the file into Google Calendar, Outlook, or Apple Calendar</li>
                  <li>• Events include proposal deadlines, meetings, and team events</li>
                  <li>• Re-export and import periodically to stay updated</li>
                  <li>• Live calendar feeds with auto-sync are coming soon</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}