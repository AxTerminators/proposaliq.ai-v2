import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Users, Video, Trash2, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
      proposal_deadline: "bg-red-500 text-white",
      task_deadline: "bg-orange-500 text-white",
      meeting: "bg-blue-500 text-white",
      review_session: "bg-purple-500 text-white",
      milestone: "bg-green-500 text-white"
    };
    return colors[type] || "bg-blue-500 text-white";
  };

  // Calendar grid helpers
  const getDaysInMonth = (date) => {
    return moment(date).daysInMonth();
  };

  const getFirstDayOfMonth = (date) => {
    return moment(date).startOf('month').day();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Previous month's trailing days
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = moment(currentMonth).date(day).format('YYYY-MM-DD');
    return events.filter(event => {
      const eventDate = moment(event.start_date).format('YYYY-MM-DD');
      return eventDate === dateStr;
    });
  };

  const previousMonth = () => {
    setCurrentMonth(moment(currentMonth).subtract(1, 'month').toDate());
  };

  const nextMonth = () => {
    setCurrentMonth(moment(currentMonth).add(1, 'month').toDate());
  };

  const today = () => {
    setCurrentMonth(new Date());
  };

  const isToday = (day) => {
    if (!day) return false;
    const date = moment(currentMonth).date(day);
    return date.isSame(moment(), 'day');
  };

  if (!organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  const calendarDays = generateCalendarDays();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Calendar</h1>
          <p className="text-slate-600">Manage your events and deadlines</p>
        </div>
        <Button onClick={() => { resetForm(); setShowEventDialog(true); }}>
          <Plus className="w-5 h-5 mr-2" />
          Add Event
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-[600px] w-full" />
      ) : (
        <Card className="border-none shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" onClick={previousMonth}>
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h2 className="text-2xl font-bold text-slate-900">
                  {moment(currentMonth).format('MMMM YYYY')}
                </h2>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
              <Button variant="outline" onClick={today}>
                Today
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-4 text-center font-semibold text-slate-600 border-b bg-slate-50">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                return (
                  <div
                    key={index}
                    className={cn(
                      "min-h-[120px] border-b border-r p-2 hover:bg-slate-50 transition-colors",
                      !day && "bg-slate-50",
                      isToday(day) && "bg-blue-50"
                    )}
                    onClick={() => {
                      if (day) {
                        const newDate = moment(currentMonth).date(day).toDate();
                        setEventData({
                          ...eventData,
                          start_date: moment(newDate).format('YYYY-MM-DDTHH:mm'),
                          end_date: moment(newDate).add(1, 'hour').format('YYYY-MM-DDTHH:mm')
                        });
                        setShowEventDialog(true);
                      }
                    }}
                  >
                    {day && (
                      <>
                        <div className={cn(
                          "text-sm font-medium mb-2",
                          isToday(day) ? "text-blue-600 font-bold" : "text-slate-900"
                        )}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <div
                              key={event.id}
                              className={cn(
                                "text-xs px-2 py-1 rounded cursor-pointer truncate",
                                getEventTypeColor(event.event_type)
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(event);
                              }}
                            >
                              {moment(event.start_date).format('h:mm A')} {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-slate-500 px-2">
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