import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Video, Trash2, ChevronLeft, ChevronRight, LayoutGrid, Columns, Square } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import moment from "moment";
import { cn } from "@/lib/utils";

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function Calendar() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // month, week, day

  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    event_type: "meeting",
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    location: "",
    meeting_link: "",
    all_day: false
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.CalendarEvent.filter(
        { organization_id: organization.id },
        'start_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const createEventMutation = useMutation({
    mutationFn: async (data) => {
      if (editingEvent) {
        return base44.entities.CalendarEvent.update(editingEvent.id, data);
      } else {
        return base44.entities.CalendarEvent.create({
          ...data,
          organization_id: organization.id,
          created_by_email: user.email,
          created_by_name: user.full_name
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setShowEventDialog(false);
      setEditingEvent(null);
      resetForm();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, start_date, end_date }) => {
      return base44.entities.CalendarEvent.update(id, { start_date, end_date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.CalendarEvent.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });

  const resetForm = () => {
    setEventData({
      title: "",
      description: "",
      event_type: "meeting",
      start_date: new Date().toISOString().slice(0, 16),
      end_date: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      location: "",
      meeting_link: "",
      all_day: false
    });
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setEventData({
      ...event,
      start_date: event.start_date ? event.start_date.slice(0, 16) : new Date().toISOString().slice(0, 16),
      end_date: event.end_date ? event.end_date.slice(0, 16) : new Date(Date.now() + 3600000).toISOString().slice(0, 16)
    });
    setShowEventDialog(true);
  };

  const handleSave = () => {
    if (eventData.title.trim()) {
      createEventMutation.mutate(eventData);
    }
  };

  const getEventTypeColor = (type) => {
    const colors = {
      proposal_deadline: "from-red-400 to-red-600",
      task_deadline: "from-orange-400 to-orange-600",
      meeting: "from-blue-400 to-blue-600",
      review_session: "from-purple-400 to-purple-600",
      milestone: "from-green-400 to-green-600",
      other: "from-pink-400 to-pink-600"
    };
    return colors[type] || colors.meeting;
  };

  const getEventTypeBadgeColor = (type) => {
    const colors = {
      proposal_deadline: "bg-red-500 text-white",
      task_deadline: "bg-orange-500 text-white",
      meeting: "bg-blue-500 text-white",
      review_session: "bg-purple-500 text-white",
      milestone: "bg-green-500 text-white",
      other: "bg-pink-500 text-white"
    };
    return colors[type] || colors.meeting;
  };

  // Calendar navigation
  const previousPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(moment(currentDate).subtract(1, 'month').toDate());
    } else if (viewMode === "week") {
      setCurrentDate(moment(currentDate).subtract(1, 'week').toDate());
    } else {
      setCurrentDate(moment(currentDate).subtract(1, 'day').toDate());
    }
  };

  const nextPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(moment(currentDate).add(1, 'month').toDate());
    } else if (viewMode === "week") {
      setCurrentDate(moment(currentDate).add(1, 'week').toDate());
    } else {
      setCurrentDate(moment(currentDate).add(1, 'day').toDate());
    }
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const getTitle = () => {
    if (viewMode === "month") {
      return moment(currentDate).format('MMMM YYYY');
    } else if (viewMode === "week") {
      const start = moment(currentDate).startOf('week');
      const end = moment(currentDate).endOf('week');
      return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
    } else {
      return moment(currentDate).format('dddd, MMMM D, YYYY');
    }
  };

  // Drag and drop handler
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const eventId = result.draggableId;
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const destinationDate = result.destination.droppableId;
    const [year, month, day] = destinationDate.split('-').map(Number);
    
    const eventStart = moment(event.start_date);
    const eventEnd = moment(event.end_date);
    const duration = eventEnd.diff(eventStart);

    const newStart = moment({ year, month: month - 1, day, hour: eventStart.hour(), minute: eventStart.minute() });
    const newEnd = moment(newStart).add(duration);

    updateEventMutation.mutate({
      id: eventId,
      start_date: newStart.toISOString(),
      end_date: newEnd.toISOString()
    });
  };

  // Month View
  const renderMonthView = () => {
    const daysInMonth = moment(currentDate).daysInMonth();
    const firstDay = moment(currentDate).startOf('month').day();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const getEventsForDay = (day) => {
      if (!day) return [];
      const dateStr = moment(currentDate).date(day).format('YYYY-MM-DD');
      return events.filter(event => {
        const eventDate = moment(event.start_date).format('YYYY-MM-DD');
        return eventDate === dateStr;
      });
    };

    const isToday = (day) => {
      if (!day) return false;
      const date = moment(currentDate).date(day);
      return date.isSame(moment(), 'day');
    };

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 border-l border-t">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center font-bold text-slate-700 border-b border-r bg-gradient-to-br from-slate-50 to-slate-100">
              {day}
            </div>
          ))}

          {days.map((day, index) => {
            const dayEvents = day ? getEventsForDay(day) : [];
            const droppableId = day ? moment(currentDate).date(day).format('YYYY-MM-DD') : `empty-${index}`;
            
            return (
              <Droppable key={index} droppableId={droppableId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[140px] border-b border-r p-2 transition-all",
                      !day && "bg-slate-50",
                      isToday(day) && "bg-gradient-to-br from-blue-50 to-indigo-50 ring-2 ring-blue-400 ring-inset",
                      snapshot.isDraggingOver && "bg-blue-100"
                    )}
                    onClick={() => {
                      if (day) {
                        const newDate = moment(currentDate).date(day).toDate();
                        setEventData({
                          ...eventData,
                          start_date: moment(newDate).hour(9).format('YYYY-MM-DDTHH:mm'),
                          end_date: moment(newDate).hour(10).format('YYYY-MM-DDTHH:mm')
                        });
                        setShowEventDialog(true);
                      }
                    }}
                  >
                    {day && (
                      <>
                        <div className={cn(
                          "text-sm font-bold mb-2 flex items-center justify-center w-8 h-8 rounded-full",
                          isToday(day) ? "bg-blue-600 text-white shadow-lg" : "text-slate-700"
                        )}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event, idx) => (
                            <Draggable key={event.id} draggableId={event.id} index={idx}>
                              {(provided, snapshot) => (
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={cn(
                                        "text-xs px-2 py-1.5 rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-all bg-gradient-to-r text-white font-medium",
                                        getEventTypeColor(event.event_type),
                                        snapshot.isDragging && "rotate-3 scale-105 shadow-xl"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    >
                                      <div className="truncate flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {moment(event.start_date).format('h:mm A')} {event.title}
                                      </div>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                                    <div className="space-y-3">
                                      <div>
                                        <h4 className="font-bold text-lg text-slate-900">{event.title}</h4>
                                        <Badge className={cn("mt-1", getEventTypeBadgeColor(event.event_type))}>
                                          {event.event_type.replace(/_/g, ' ')}
                                        </Badge>
                                      </div>
                                      {event.description && (
                                        <p className="text-sm text-slate-600">{event.description}</p>
                                      )}
                                      <div className="space-y-1 text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                          <Clock className="w-4 h-4" />
                                          {moment(event.start_date).format('MMM D, h:mm A')} - {moment(event.end_date).format('h:mm A')}
                                        </div>
                                        {event.location && (
                                          <div className="flex items-center gap-2 text-slate-600">
                                            <MapPin className="w-4 h-4" />
                                            {event.location}
                                          </div>
                                        )}
                                        {event.meeting_link && (
                                          <div className="flex items-center gap-2 text-blue-600">
                                            <Video className="w-4 h-4" />
                                            <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                              Join Meeting
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex gap-2 pt-2 border-t">
                                        <Button size="sm" onClick={() => handleEdit(event)} className="flex-1">
                                          Edit
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => {
                                          if (confirm('Delete this event?')) {
                                            deleteEventMutation.mutate(event.id);
                                          }
                                        }}>
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </Draggable>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-slate-500 px-2 font-medium">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    );
  };

  // Week View
  const renderWeekView = () => {
    const startOfWeek = moment(currentDate).startOf('week');
    const days = Array.from({ length: 7 }, (_, i) => moment(startOfWeek).add(i, 'days'));

    const getEventsForDay = (day) => {
      const dateStr = day.format('YYYY-MM-DD');
      return events.filter(event => {
        const eventDate = moment(event.start_date).format('YYYY-MM-DD');
        return eventDate === dateStr;
      });
    };

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isToday = day.isSame(moment(), 'day');
            const droppableId = day.format('YYYY-MM-DD');

            return (
              <Droppable key={day.format('YYYY-MM-DD')} droppableId={droppableId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "border-2 rounded-xl p-3 min-h-[500px] transition-all",
                      isToday && "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg",
                      !isToday && "border-slate-200 bg-white",
                      snapshot.isDraggingOver && "bg-blue-100 border-blue-400"
                    )}
                  >
                    <div className="text-center mb-3">
                      <div className="text-xs font-semibold text-slate-500 uppercase">
                        {day.format('ddd')}
                      </div>
                      <div className={cn(
                        "text-2xl font-bold mt-1 mx-auto w-10 h-10 flex items-center justify-center rounded-full",
                        isToday && "bg-blue-600 text-white shadow-lg"
                      )}>
                        {day.format('D')}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {dayEvents.map((event, idx) => (
                        <Draggable key={event.id} draggableId={event.id} index={idx}>
                          {(provided, snapshot) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={cn(
                                    "p-3 rounded-lg cursor-pointer shadow-md hover:shadow-xl transition-all bg-gradient-to-r text-white",
                                    getEventTypeColor(event.event_type),
                                    snapshot.isDragging && "rotate-2 scale-105 shadow-2xl"
                                  )}
                                >
                                  <div className="font-bold text-sm mb-1">{event.title}</div>
                                  <div className="text-xs opacity-90 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {moment(event.start_date).format('h:mm A')}
                                  </div>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-3">
                                  <div>
                                    <h4 className="font-bold text-lg text-slate-900">{event.title}</h4>
                                    <Badge className={cn("mt-1", getEventTypeBadgeColor(event.event_type))}>
                                      {event.event_type.replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                  {event.description && (
                                    <p className="text-sm text-slate-600">{event.description}</p>
                                  )}
                                  <div className="space-y-1 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                      <Clock className="w-4 h-4" />
                                      {moment(event.start_date).format('h:mm A')} - {moment(event.end_date).format('h:mm A')}
                                    </div>
                                    {event.location && (
                                      <div className="flex items-center gap-2 text-slate-600">
                                        <MapPin className="w-4 h-4" />
                                        {event.location}
                                      </div>
                                    )}
                                    {event.meeting_link && (
                                      <div className="flex items-center gap-2 text-blue-600">
                                        <Video className="w-4 h-4" />
                                        <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                          Join Meeting
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2 pt-2 border-t">
                                    <Button size="sm" onClick={() => handleEdit(event)} className="flex-1">
                                      Edit
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => {
                                      if (confirm('Delete this event?')) {
                                        deleteEventMutation.mutate(event.id);
                                      }
                                    }}>
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </Draggable>
                      ))}
                    </div>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    );
  };

  // Day View
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = events.filter(event => {
      const eventDate = moment(event.start_date).format('YYYY-MM-DD');
      return eventDate === moment(currentDate).format('YYYY-MM-DD');
    });

    return (
      <div className="border-2 rounded-xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 border-b-2">
          <h3 className="text-2xl font-bold text-slate-900">
            {moment(currentDate).format('dddd, MMMM D, YYYY')}
          </h3>
        </div>
        <div className="grid grid-cols-[100px_1fr]">
          {hours.map((hour) => {
            const hourEvents = dayEvents.filter(event => {
              const eventHour = moment(event.start_date).hour();
              return eventHour === hour;
            });

            return (
              <React.Fragment key={hour}>
                <div className="p-3 text-right text-sm font-semibold text-slate-600 border-b border-r bg-slate-50">
                  {moment().hour(hour).format('h A')}
                </div>
                <div className="p-2 border-b min-h-[80px] hover:bg-slate-50 transition-all">
                  {hourEvents.map((event) => (
                    <Popover key={event.id}>
                      <PopoverTrigger asChild>
                        <div
                          className={cn(
                            "p-3 rounded-lg cursor-pointer mb-2 shadow-md hover:shadow-xl transition-all bg-gradient-to-r text-white",
                            getEventTypeColor(event.event_type)
                          )}
                        >
                          <div className="font-bold text-sm">{event.title}</div>
                          <div className="text-xs opacity-90 mt-1">
                            {moment(event.start_date).format('h:mm A')} - {moment(event.end_date).format('h:mm A')}
                          </div>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-bold text-lg text-slate-900">{event.title}</h4>
                            <Badge className={cn("mt-1", getEventTypeBadgeColor(event.event_type))}>
                              {event.event_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-sm text-slate-600">{event.description}</p>
                          )}
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Clock className="w-4 h-4" />
                              {moment(event.start_date).format('h:mm A')} - {moment(event.end_date).format('h:mm A')}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </div>
                            )}
                            {event.meeting_link && (
                              <div className="flex items-center gap-2 text-blue-600">
                                <Video className="w-4 h-4" />
                                <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                  Join Meeting
                                </a>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 pt-2 border-t">
                            <Button size="sm" onClick={() => handleEdit(event)} className="flex-1">
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => {
                              if (confirm('Delete this event?')) {
                                deleteEventMutation.mutate(event.id);
                              }
                            }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  if (!organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Calendar</h1>
          <p className="text-slate-600">Drag events to reschedule, hover for details</p>
        </div>
        <Button onClick={() => { resetForm(); setShowEventDialog(true); }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
          <Plus className="w-5 h-5 mr-2" />
          Add Event
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : (
        <Card className="border-none shadow-xl">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={previousPeriod} className="shadow-sm">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-2xl font-bold text-slate-900">
                  {getTitle()}
                </h2>
                <Button variant="outline" size="icon" onClick={nextPeriod} className="shadow-sm">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={today} className="shadow-sm">
                  Today
                </Button>
                <div className="flex gap-1 border rounded-lg p-1 bg-white shadow-sm">
                  <Button
                    variant={viewMode === "month" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("month")}
                    className="gap-1"
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">Month</span>
                  </Button>
                  <Button
                    variant={viewMode === "week" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("week")}
                    className="gap-1"
                  >
                    <Columns className="w-4 h-4" />
                    <span className="hidden sm:inline">Week</span>
                  </Button>
                  <Button
                    variant={viewMode === "day" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("day")}
                    className="gap-1"
                  >
                    <Square className="w-4 h-4" />
                    <span className="hidden sm:inline">Day</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {viewMode === "month" && renderMonthView()}
            {viewMode === "week" && renderWeekView()}
            {viewMode === "day" && renderDayView()}
          </CardContent>
        </Card>
      )}

      <Dialog open={showEventDialog} onOpenChange={(open) => { 
        setShowEventDialog(open); 
        if (!open) { 
          setEditingEvent(null); 
          resetForm(); 
        } 
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Event Title *</label>
              <Input
                value={eventData.title}
                onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                placeholder="Event title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <select
                className="w-full border rounded-md p-2"
                value={eventData.event_type}
                onChange={(e) => setEventData({ ...eventData, event_type: e.target.value })}
              >
                <option value="meeting">Meeting</option>
                <option value="proposal_deadline">Proposal Deadline</option>
                <option value="task_deadline">Task Deadline</option>
                <option value="review_session">Review Session</option>
                <option value="milestone">Milestone</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date & Time</label>
                <Input
                  type="datetime-local"
                  value={eventData.start_date}
                  onChange={(e) => setEventData({ ...eventData, start_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">End Date & Time</label>
                <Input
                  type="datetime-local"
                  value={eventData.end_date}
                  onChange={(e) => setEventData({ ...eventData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={eventData.description}
                onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                placeholder="Event description"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <Input
                value={eventData.location}
                onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                placeholder="Physical location or address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Meeting Link</label>
              <Input
                value={eventData.meeting_link}
                onChange={(e) => setEventData({ ...eventData, meeting_link: e.target.value })}
                placeholder="Zoom, Teams, or Meet link"
              />
            </div>

            <div className="flex justify-between items-center pt-4">
              {editingEvent && (
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (confirm('Delete this event?')) {
                      deleteEventMutation.mutate(editingEvent.id);
                      setShowEventDialog(false);
                      setEditingEvent(null);
                      resetForm();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <div className="flex gap-3 ml-auto">
                <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!eventData.title.trim() || createEventMutation.isPending}>
                  {createEventMutation.isPending ? 'Saving...' : (editingEvent ? 'Update Event' : 'Add Event')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}