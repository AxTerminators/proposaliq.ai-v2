import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Search, 
  Clock,
  AlertCircle,
  Building2,
  Users,
  MapPin,
  ExternalLink
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import moment from "moment";

export default function GlobalCalendarModule() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [timeFilter, setTimeFilter] = useState("upcoming");

  const { data: events } = useQuery({
    queryKey: ['admin-all-events'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_date'),
    initialData: []
  });

  const { data: organizations } = useQuery({
    queryKey: ['admin-event-orgs'],
    queryFn: () => base44.entities.Organization.list(),
    initialData: []
  });

  const { data: proposals } = useQuery({
    queryKey: ['admin-event-proposals'],
    queryFn: () => base44.entities.Proposal.list(),
    initialData: []
  });

  const getOrganization = (orgId) => {
    return organizations.find(o => o.id === orgId);
  };

  const getProposal = (proposalId) => {
    return proposals.find(p => p.id === proposalId);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || event.event_type === filterType;
    const matchesPriority = filterPriority === "all" || event.priority === filterPriority;
    
    const eventDate = moment(event.start_date);
    const now = moment();
    
    let matchesTime = true;
    if (timeFilter === "upcoming") {
      matchesTime = eventDate.isAfter(now);
    } else if (timeFilter === "past") {
      matchesTime = eventDate.isBefore(now);
    } else if (timeFilter === "today") {
      matchesTime = eventDate.isSame(now, 'day');
    } else if (timeFilter === "this_week") {
      matchesTime = eventDate.isSame(now, 'week');
    }
    
    return matchesSearch && matchesType && matchesPriority && matchesTime;
  });

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-slate-100 text-slate-700",
      medium: "bg-blue-100 text-blue-700",
      high: "bg-orange-100 text-orange-700",
      urgent: "bg-red-100 text-red-700"
    };
    return colors[priority] || "bg-slate-100 text-slate-700";
  };

  // Stats
  const totalEvents = events.length;
  const upcomingEvents = events.filter(e => moment(e.start_date).isAfter(moment())).length;
  const todayEvents = events.filter(e => moment(e.start_date).isSame(moment(), 'day')).length;
  const urgentEvents = events.filter(e => e.priority === 'urgent' && moment(e.start_date).isAfter(moment())).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Global Calendar Management</h2>
        <p className="text-slate-600">View all calendar events across all organizations</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CalendarIcon className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalEvents}</p>
            <p className="text-sm text-slate-600">Total Events</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">{upcomingEvents}</p>
            <p className="text-sm text-slate-600">Upcoming</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CalendarIcon className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-purple-600">{todayEvents}</p>
            <p className="text-sm text-slate-600">Today</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">{urgentEvents}</p>
            <p className="text-sm text-slate-600">Urgent</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="meeting">Meetings</SelectItem>
                <SelectItem value="proposal_deadline">Deadlines</SelectItem>
                <SelectItem value="review_session">Reviews</SelectItem>
                <SelectItem value="submission">Submissions</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const org = getOrganization(event.organization_id);
              const proposal = event.proposal_id ? getProposal(event.proposal_id) : null;
              const isPast = moment(event.start_date).isBefore(moment());

              return (
                <div 
                  key={event.id} 
                  className={`p-4 border-2 rounded-lg transition-all ${
                    isPast ? 'opacity-60 border-slate-200' : 'hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900 text-lg">
                          {event.title}
                        </h3>
                        <Badge variant="outline" className="capitalize">
                          {event.event_type.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(event.priority)}>
                          {event.priority}
                        </Badge>
                        {isPast && (
                          <Badge variant="outline">Past</Badge>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-sm text-slate-600 mb-2">{event.description}</p>
                      )}

                      <div className="grid md:grid-cols-3 gap-2 text-sm mb-2">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="w-4 h-4" />
                          {moment(event.start_date).format('MMM D, YYYY [at] h:mm A')}
                        </div>
                        {org && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="w-4 h-4" />
                            {org.organization_name}
                          </div>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                          </div>
                        )}
                      </div>

                      {proposal && (
                        <Badge variant="outline" className="mr-2">
                          Proposal: {proposal.proposal_name}
                        </Badge>
                      )}

                      {event.meeting_link && (
                        <a
                          href={event.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Join Meeting
                        </a>
                      )}

                      {event.attendees && event.attendees.length > 0 && (
                        <div className="mt-2 text-xs text-slate-600">
                          <Users className="w-3 h-3 inline mr-1" />
                          {event.attendees.length} Attendee{event.attendees.length > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>

                    <div className="text-right text-sm text-slate-500">
                      {isPast ? (
                        <span>Ended {moment(event.end_date).fromNow()}</span>
                      ) : (
                        <span>{moment(event.start_date).fromNow()}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>No events found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}