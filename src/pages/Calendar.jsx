
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobileContainer, MobileSection } from "../components/ui/mobile-container";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Users,
  FileText,
  CheckSquare,
  Bell,
  Download,
  Filter,
  Video,
  AlertCircle,
  Target,
  Sparkles,
  X // Added for EventDialog attendee removal
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const EVENT_COLORS = {
  proposal_deadline: "bg-red-500",
  task_deadline: "bg-amber-500",
  milestone: "bg-purple-500",
  meeting: "bg-blue-500",
  review_session: "bg-indigo-500",
  submission: "bg-green-500",
  presentation: "bg-pink-500",
  team_event: "bg-cyan-500",
  reminder: "bg-slate-500",
  other: "bg-gray-500"
};

const EVENT_LABELS = {
  proposal_deadline: "Proposal Deadline",
  task_deadline: "Task Deadline",
  milestone: "Milestone",
  meeting: "Meeting",
  review_session: "Review Session",
  submission: "Submission",
  presentation: "Presentation",
  team_event: "Team Event",
  reminder: "Reminder",
  other: "Other"
};

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month"); // month, week, day, agenda
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [filterTypes, setFilterTypes] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  // Get calendar events
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
    enabled: !!organization?.id
  });

  // Get proposals for auto-populating deadlines
  const { data: proposals } = useQuery({
    queryKey: ['calendar-proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-due_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id
  });

  // Get tasks for auto-populating task deadlines
  const { data: tasks } = useQuery({
    queryKey: ['calendar-tasks', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const allTasks = [];
      const fetchedProposals = proposals || []; // Ensure proposals is not null/undefined
      for (const proposal of fetchedProposals) {
        const proposalTasks = await base44.entities.ProposalTask.filter(
          { proposal_id: proposal.id },
          '-due_date'
        );
        allTasks.push(...proposalTasks.map(t => ({ ...t, proposal_name: proposal.proposal_name })));
      }
      return allTasks.filter(t => t.due_date);
    },
    initialData: [],
    enabled: !!organization?.id && (proposals?.length > 0 || false) // Ensure proposals is not null/undefined before checking length
  });

  // Combine events with proposal deadlines and task deadlines
  const allEvents = [
    ...events,
    ...proposals
      .filter(p => p.due_date)
      .map(p => ({
        id: `proposal-${p.id}`,
        title: `Deadline: ${p.proposal_name}`,
        start_date: p.due_date + 'T23:59:59',
        end_date: p.due_date + 'T23:59:59',
        event_type: 'proposal_deadline',
        proposal_id: p.id,
        description: `Proposal submission deadline for ${p.agency_name || 'client'}`,
        priority: 'urgent',
        all_day: true,
        auto_generated: true
      })),
    ...tasks.map(t => ({
      id: `task-${t.id}`,
      title: `Task: ${t.title}`,
      start_date: t.due_date + 'T23:59:59',
      end_date: t.due_date + 'T23:59:59',
      event_type: 'task_deadline',
      task_id: t.id,
      proposal_id: t.proposal_id,
      description: `Task deadline - ${t.proposal_name}`,
      priority: t.priority || 'medium',
      all_day: true,
      auto_generated: true
    }))
  ];

  // Filter events
  const filteredEvents = allEvents.filter(event => {
    if (filterTypes.length === 0) return true;
    return filterTypes.includes(event.event_type);
  });

  // Navigation
  const goToToday = () => setCurrentDate(new Date());
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    else if (view === 'day') newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };
  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
    else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    else if (view === 'day') newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  // Statistics
  const today = new Date();
  const stats = {
    upcoming: filteredEvents.filter(e => new Date(e.start_date) > today).length,
    thisWeek: filteredEvents.filter(e => {
      const eventDate = new Date(e.start_date);
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return eventDate >= today && eventDate <= weekFromNow;
    }).length,
    overdue: filteredEvents.filter(e => {
      const eventDate = new Date(e.start_date);
      return eventDate < today && !e.status?.includes('completed');
    }).length
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowDetailsDialog(true);
  };

  return (
    <MobileContainer>
      <MobileSection
        title="Calendar & Deadlines"
        description="Manage your proposal deadlines, tasks, and team events"
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setSelectedEvent(null);
                setShowEventDialog(true);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 min-h-[44px]"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Event
            </Button>
            <Button variant="outline" className="min-h-[44px]">
              <Download className="w-5 h-5 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      {/* Stats Row */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-600">{stats.upcoming}</p>
                <p className="text-sm text-slate-600 mt-1">Upcoming Events</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-amber-600">{stats.thisWeek}</p>
                <p className="text-sm text-slate-600 mt-1">This Week</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
                <p className="text-sm text-slate-600 mt-1">Overdue</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Controls */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center min-w-[200px]">
                <h2 className="text-xl font-bold">
                  {view === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  {view === 'week' && `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  {view === 'day' && currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h2>
              </div>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="w-5 h-5" />
              </Button>
              <Button variant="outline" onClick={goToToday}>
                Today
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Tabs value={view} onValueChange={setView}>
                <TabsList>
                  <TabsTrigger value="month">Month</TabsTrigger>
                  <TabsTrigger value="week">Week</TabsTrigger>
                  <TabsTrigger value="day">Day</TabsTrigger>
                  <TabsTrigger value="agenda">Agenda</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(EVENT_LABELS).map(([type, label]) => {
              const isActive = filterTypes.includes(type);
              return (
                <Button
                  key={type}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (isActive) {
                      setFilterTypes(filterTypes.filter(t => t !== type));
                    } else {
                      setFilterTypes([...filterTypes, type]);
                    }
                  }}
                  className={cn(
                    "gap-2",
                    isActive && EVENT_COLORS[type]
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full", EVENT_COLORS[type])} />
                  {label}
                </Button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {view === 'month' && <MonthView currentDate={currentDate} events={filteredEvents} onEventClick={handleEventClick} />}
          {view === 'week' && <WeekView currentDate={currentDate} events={filteredEvents} onEventClick={handleEventClick} />}
          {view === 'day' && <DayView currentDate={currentDate} events={filteredEvents} onEventClick={handleEventClick} />}
          {view === 'agenda' && <AgendaView events={filteredEvents} onEventClick={handleEventClick} />}
        </CardContent>
      </Card>

      {/* Event Dialog */}
      {showEventDialog && (
        <EventDialog
          event={selectedEvent}
          organizationId={organization?.id}
          userEmail={user?.email}
          userName={user?.full_name}
          onClose={() => {
            setShowEventDialog(false);
            setSelectedEvent(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            setShowEventDialog(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Event Details Dialog */}
      {showDetailsDialog && selectedEvent && (
        <EventDetailsDialog
          event={selectedEvent}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedEvent(null);
          }}
          onEdit={() => {
            setShowDetailsDialog(false);
            setShowEventDialog(true);
          }}
          onDelete={() => {
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            setShowDetailsDialog(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </MobileContainer>
  );
}

// Month View Component
function MonthView({ currentDate, events, onEventClick }) {
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay();
  const daysInMonth = endOfMonth.getDate();

  const days = [];
  const today = new Date();

  // Previous month days
  for (let i = 0; i < startDay; i++) {
    days.push({ date: null, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ date: i, isCurrentMonth: true });
  }

  // Next month days to fill grid
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({ date: i, isCurrentMonth: false, isNextMonth: true });
  }

  const isToday = (date) => {
    if (!date) return false;
    return date === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };

  const getEventsForDay = (date) => {
    if (!date) return [];
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), date);
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.getDate() === date &&
             eventDate.getMonth() === dayDate.getMonth() &&
             eventDate.getFullYear() === dayDate.getFullYear();
    });
  };

  return (
    <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="bg-slate-50 p-2 text-center text-sm font-semibold text-slate-700">
          {day}
        </div>
      ))}
      {days.map((day, idx) => {
        const dayEvents = getEventsForDay(day.date);
        return (
          <div
            key={idx}
            className={cn(
              "bg-white min-h-[100px] p-2 relative",
              !day.isCurrentMonth && "bg-slate-50 text-slate-400",
              isToday(day.date) && "ring-2 ring-blue-500 ring-inset"
            )}
          >
            {day.date && (
              <>
                <div className={cn(
                  "text-sm font-semibold mb-1",
                  isToday(day.date) && "text-blue-600"
                )}>
                  {day.date}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      onClick={() => onEventClick(event)}
                      className={cn(
                        "text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate text-white",
                        EVENT_COLORS[event.event_type]
                      )}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-slate-500 font-medium">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Week View Component  
function WeekView({ currentDate, events, onEventClick }) {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    weekDays.push(date);
  }

  const getEventsForDay = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekDays.map((date, idx) => {
        const dayEvents = getEventsForDay(date);
        const isToday = date.toDateString() === new Date().toDateString();

        return (
          <Card key={idx} className={cn(
            "border-2",
            isToday && "border-blue-500"
          )}>
            <CardHeader className="p-3 pb-2">
              <div className="text-center">
                <div className="text-xs text-slate-500">{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={cn(
                  "text-lg font-bold",
                  isToday && "text-blue-600"
                )}>
                  {date.getDate()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-2">
                {dayEvents.map((event, i) => (
                  <div
                    key={i}
                    onClick={() => onEventClick(event)}
                    className={cn(
                      "p-2 rounded cursor-pointer hover:opacity-80 text-white",
                      EVENT_COLORS[event.event_type]
                    )}
                  >
                    <div className="text-xs font-semibold truncate">{event.title}</div>
                    <div className="text-[10px] mt-1">
                      {new Date(event.start_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Day View Component
function DayView({ currentDate, events, onEventClick }) {
  const dayEvents = events.filter(event => {
    const eventDate = new Date(event.start_date);
    return eventDate.toDateString() === currentDate.toDateString();
  }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  return (
    <div className="space-y-3">
      {dayEvents.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p>No events scheduled for this day</p>
        </div>
      ) : (
        dayEvents.map((event, idx) => (
          <Card key={idx} className="border-l-4" style={{ borderLeftColor: EVENT_COLORS[event.event_type].replace('bg-', '#') }}>
            <CardContent className="p-4 cursor-pointer hover:bg-slate-50" onClick={() => onEventClick(event)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={EVENT_COLORS[event.event_type]}>
                      {EVENT_LABELS[event.event_type]}
                    </Badge>
                    {event.priority === 'urgent' && (
                      <Badge variant="destructive">Urgent</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {event.all_day ? 'All Day' : new Date(event.start_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </span>
                    )}
                    {event.attendees && event.attendees.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.attendees.length} attendees
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// Agenda View Component
function AgendaView({ events, onEventClick }) {
  const upcomingEvents = events
    .filter(e => new Date(e.start_date) >= new Date())
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 50);

  const groupedEvents = upcomingEvents.reduce((acc, event) => {
    const date = new Date(event.start_date).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([date, dateEvents]) => (
        <div key={date}>
          <h3 className="font-semibold text-lg mb-3 sticky top-0 bg-white py-2 border-b">{date}</h3>
          <div className="space-y-2">
            {dateEvents.map((event, idx) => (
              <Card
                key={idx}
                className="border-l-4 cursor-pointer hover:shadow-md transition-all"
                style={{ borderLeftColor: EVENT_COLORS[event.event_type].replace('bg-', '#') }}
                onClick={() => onEventClick(event)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={EVENT_COLORS[event.event_type]} size="sm">
                          {EVENT_LABELS[event.event_type]}
                        </Badge>
                      </div>
                      <h4 className="font-semibold">{event.title}</h4>
                      <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.all_day ? 'All Day' : new Date(event.start_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {upcomingEvents.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p>No upcoming events</p>
        </div>
      )}
    </div>
  );
}

// Event Dialog Component - FULL IMPLEMENTATION
function EventDialog({ event, organizationId, userEmail, userName, onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(event ? {
    ...event,
    start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
    end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
    reminder_minutes: event.reminder_minutes || []
  } : {
    title: "",
    description: "",
    event_type: "meeting",
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    all_day: false,
    location: "",
    meeting_link: "",
    priority: "medium",
    reminder_minutes: [15, 60],
    notes: ""
  });

  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [attendees, setAttendees] = useState(event?.attendees || []);

  const createEventMutation = useMutation({
    mutationFn: (eventData) => base44.entities.CalendarEvent.create(eventData),
    onSuccess: () => {
      onSuccess();
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: (eventData) => base44.entities.CalendarEvent.update(event.id, eventData),
    onSuccess: () => {
      onSuccess();
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title) {
      alert("Please enter an event title");
      return;
    }

    const eventData = {
      ...formData,
      organization_id: organizationId,
      created_by_email: userEmail,
      created_by_name: userName,
      attendees: attendees,
      status: "scheduled"
    };

    if (event) {
      updateEventMutation.mutate(eventData);
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const addAttendee = () => {
    if (!attendeeEmail || !attendeeEmail.includes('@')) return;
    
    if (attendees.find(a => a.email === attendeeEmail)) {
      alert("Attendee already added");
      return;
    }

    setAttendees([...attendees, {
      email: attendeeEmail,
      name: attendeeEmail.split('@')[0], // Simple name extraction
      rsvp_status: "pending"
    }]);
    setAttendeeEmail("");
  };

  const removeAttendee = (email) => {
    setAttendees(attendees.filter(a => a.email !== email));
  };

  const toggleReminder = (minutes) => {
    const current = formData.reminder_minutes || [];
    setFormData({
      ...formData,
      reminder_minutes: current.includes(minutes)
        ? current.filter(m => m !== minutes)
        : [...current, minutes]
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {event ? 'Edit Event' : 'Create Event'}
          </DialogTitle>
          <DialogDescription>
            {event ? 'Update event details' : 'Add a new event to your calendar'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventType">Event Type</Label>
            <Select
              value={formData.event_type}
              onValueChange={(value) => setFormData({ ...formData, event_type: value })}
            >
              <SelectTrigger id="eventType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_LABELS).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", EVENT_COLORS[type])} />
                      {label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Event title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Event description"
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time</Label>
              <Input
                id="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date & Time</Label>
              <Input
                id="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="all_day"
              checked={formData.all_day}
              onCheckedChange={(checked) => setFormData({ ...formData, all_day: checked })}
            />
            <Label htmlFor="all_day">All-day event</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Physical location or address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting_link">Meeting Link</Label>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-slate-400" />
              <Input
                id="meeting_link"
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="Zoom, Teams, or Google Meet link"
                type="url"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendee_email">Attendees</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <Input
                  id="attendee_email"
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  placeholder="Email address"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addAttendee();
                    }
                  }}
                />
              </div>
              <Button type="button" onClick={addAttendee} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attendees.map((attendee) => (
                  <Badge key={attendee.email} variant="secondary" className="gap-1">
                    {attendee.email}
                    <button
                      type="button"
                      onClick={() => removeAttendee(attendee.email)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reminders</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { minutes: 15, label: "15 minutes before" },
                { minutes: 60, label: "1 hour before" },
                { minutes: 1440, label: "1 day before" },
                { minutes: 10080, label: "1 week before" }
              ].map(({ minutes, label }) => (
                <Button
                  key={minutes}
                  type="button"
                  variant={formData.reminder_minutes?.includes(minutes) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleReminder(minutes)}
                >
                  <Bell className="w-3 h-3 mr-1" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or details"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createEventMutation.isPending || updateEventMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createEventMutation.isPending || updateEventMutation.isPending ? (
                <>Saving...</>
              ) : event ? (
                'Update Event'
              ) : (
                'Create Event'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Event Details Dialog Component - FULL IMPLEMENTATION
function EventDetailsDialog({ event, onClose, onEdit, onDelete }) {
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteEventMutation = useMutation({
    mutationFn: () => base44.entities.CalendarEvent.delete(event.id),
    onSuccess: () => {
      onDelete();
    }
  });

  const handleDelete = () => {
    deleteEventMutation.mutate();
  };

  const copyMeetingLink = () => {
    if (event.meeting_link) {
      navigator.clipboard.writeText(event.meeting_link);
      alert("Meeting link copied to clipboard!");
    }
  };

  const exportToCalendar = () => {
    // Basic iCal export
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${event.title}
DTSTART:${new Date(event.start_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${new Date(event.end_date).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">{event.title}</DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={EVENT_COLORS[event.event_type]}>
                  {EVENT_LABELS[event.event_type]}
                </Badge>
                {event.priority && event.priority !== 'medium' && (
                  <Badge variant={event.priority === 'urgent' || event.priority === 'high' ? 'destructive' : 'secondary'}>
                    {event.priority}
                  </Badge>
                )}
                {event.all_day && (
                  <Badge variant="outline">All Day</Badge>
                )}
                {event.auto_generated && (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                    Auto-generated
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {event.description && (
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-1">Description</h4>
              <p className="text-sm text-slate-600">{event.description}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-1">Start</h4>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                {event.all_day ? (
                  <span>{new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                ) : (
                  <span>{new Date(event.start_date).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-1">End</h4>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                {event.all_day ? (
                  <span>{new Date(event.end_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                ) : (
                  <span>{new Date(event.end_date).toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                )}
              </div>
            </div>
          </div>

          {event.location && (
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-1">Location</h4>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-slate-400" />
                {event.location}
              </div>
            </div>
          )}

          {event.meeting_link && (
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-1">Meeting Link</h4>
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-slate-400" />
                <a 
                  href={event.meeting_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex-1 truncate"
                >
                  {event.meeting_link}
                </a>
                <Button size="sm" variant="outline" onClick={copyMeetingLink}>
                  Copy
                </Button>
              </div>
            </div>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-2">Attendees ({event.attendees.length})</h4>
              <div className="space-y-2">
                {event.attendees.map((attendee, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-sm">{attendee.name || attendee.email}</span>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        attendee.rsvp_status === 'accepted' && "border-green-500 text-green-700",
                        attendee.rsvp_status === 'declined' && "border-red-500 text-red-700",
                        attendee.rsvp_status === 'tentative' && "border-amber-500 text-amber-700"
                      )}
                    >
                      {attendee.rsvp_status || 'pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {event.reminder_minutes && event.reminder_minutes.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-2">Reminders</h4>
              <div className="flex flex-wrap gap-2">
                {event.reminder_minutes.map((minutes) => (
                  <Badge key={minutes} variant="secondary" className="gap-1">
                    <Bell className="w-3 h-3" />
                    {minutes < 60 ? `${minutes} min` :
                     minutes < 1440 ? `${minutes / 60} hr` :
                     `${minutes / 1440} day`} before
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {event.notes && (
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-1">Notes</h4>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">{event.notes}</p>
            </div>
          )}

          {(event.proposal_id || event.task_id) && (
            <div>
              <h4 className="font-semibold text-sm text-slate-700 mb-2">Related Items</h4>
              <div className="flex gap-2">
                {event.proposal_id && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/ProposalBuilder?id=${event.proposal_id}`}>
                      <FileText className="w-4 h-4 mr-2" />
                      View Proposal
                    </a>
                  </Button>
                )}
                {event.task_id && (
                  <Button variant="outline" size="sm">
                    <CheckSquare className="w-4 h-4 mr-2" />
                    View Task
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 flex-1">
            <Button variant="outline" size="sm" onClick={exportToCalendar}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
          
          <div className="flex gap-2">
            {!event.auto_generated && !showDeleteConfirm && (
              <>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                  Delete
                </Button>
                <Button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700">
                  Edit Event
                </Button>
              </>
            )}

            {!event.auto_generated && showDeleteConfirm && (
              <>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={deleteEventMutation.isPending}
                >
                  {deleteEventMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </>
            )}

            {event.auto_generated && (
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
