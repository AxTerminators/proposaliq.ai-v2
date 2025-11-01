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
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Users, Video, Trash2, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import moment from "moment";

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
      proposal_deadline: "bg-red-100 text-red-800 border-red-300",
      task_deadline: "bg-orange-100 text-orange-800 border-orange-300",
      meeting: "bg-blue-100 text-blue-800 border-blue-300",
      review_session: "bg-purple-100 text-purple-800 border-purple-300",
      milestone: "bg-green-100 text-green-800 border-green-300"
    };
    return colors[type] || colors.meeting;
  };

  const upcomingEvents = events
    .filter(e => new Date(e.start_date) >= new Date())
    .slice(0, 10);

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
          <p className="text-slate-600">Manage your events and deadlines</p>
        </div>
        <Button onClick={() => { resetForm(); setShowEventDialog(true); }}>
          <Plus className="w-5 h-5 mr-2" />
          Add Event
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : upcomingEvents.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <CalendarIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Events Scheduled</h3>
            <p className="text-slate-600 mb-6">
              Start adding events to your calendar
            </p>
            <Button onClick={() => { resetForm(); setShowEventDialog(true); }}>
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Upcoming Events</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.map((event) => (
              <Card key={event.id} className={`border-2 ${getEventTypeColor(event.event_type)}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base mb-2">{event.title}</CardTitle>
                      <Badge variant="secondary" className="capitalize text-xs">
                        {event.event_type?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (confirm('Delete this event?')) {
                            deleteEventMutation.mutate(event.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {event.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">{event.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>{moment(event.start_date).format('MMM D, YYYY h:mm A')}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  {event.meeting_link && (
                    <div className="flex items-center gap-2 text-sm">
                      <Video className="w-4 h-4 text-blue-600" />
                      <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Join Meeting
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!eventData.title.trim() || createEventMutation.isPending}>
                {createEventMutation.isPending ? 'Saving...' : (editingEvent ? 'Update Event' : 'Add Event')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}