import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit,
  Eye,
  List,
  Grid3x3,
  Filter,
  Download,
  Users
} from "lucide-react";
import moment from "moment";
import CalendarSync from "../components/calendar/CalendarSync";

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState('all');

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    event_type: "meeting",
    priority: "medium",
    all_day: false,
    location: "",
    meeting_link: ""
  });

  useEffect(() => {
    const loadUserData = async () => {
      const userData = await base44.auth.me();
      setUser(userData);

      const orgs = await base44.entities.Organization.filter({
        id: userData.organization_id
      });
      if (orgs.length > 0) {
        setOrganization(orgs[0]);
      }
    };
    loadUserData();
  }, []);

  const { data: events, isLoading } = useQuery({
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

  const { data: proposals } = useQuery({
    queryKey: ['proposals-deadlines', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const allProposals = await base44.entities.Proposal.filter({
        organization_id: organization.id
      });
      return allProposals.filter(p => p.due_date);
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData) => {
      return await base44.entities.CalendarEvent.create({
        ...eventData,
        organization_id: organization.id,
        created_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setShowEventDialog(false);
      resetForm();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.CalendarEvent.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setShowEventDialog(false);
      setSelectedEvent(null);
      resetForm();
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId) => {
      return await base44.entities.CalendarEvent.delete(eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedEvent) {
      updateEventMutation.mutate({
        id: selectedEvent.id,
        data: eventForm
      });
    } else {
      createEventMutation.mutate(eventForm);
    }
  };

  const handleEdit = (event) => {
    setSelectedEvent(event);
    setEventForm({
      title: event.title || "",
      description: event.description || "",
      start_date: event.start_date || "",
      end_date: event.end_date || "",
      event_type: event.event_type || "meeting",
      priority: event.priority || "medium",
      all_day: event.all_day || false,
      location: event.location || "",
      meeting_link: event.meeting_link || ""
    });
    setShowEventDialog(true);
  };

  const handleDelete = async (event) => {
    if (confirm(`Delete event "${event.title}"?`)) {
      deleteEventMutation.mutate(event.id);
    }
  };

  const resetForm = () => {
    setEventForm({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      event_type: "meeting",
      priority: "medium",
      all_day: false,
      location: "",
      meeting_link: ""
    });
  };

  const filteredEvents = filterType === 'all' 
    ? events 
    : events.filter(e => e.event_type === filterType);

  const upcomingEvents = filteredEvents
    .filter(e => moment(e.start_date).isAfter(moment()))
    .slice(0, 5);

  const todayEvents = filteredEvents.filter(e => 
    moment(e.start_date).isSame(moment(), 'day')
  );

  const urgentEvents = filteredEvents.filter(e => 
    e.priority === 'urgent' && moment(e.start_date).isAfter(moment())
  );

  if (!user || !organization) {
    return (
      <div className="p-6">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8" />
            Calendar & Deadlines
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Manage your proposal deadlines, tasks, and team events
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={() => {
              setSelectedEvent(null);
              resetForm();
              setShowEventDialog(true);
            }}
            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 min-h-[44px]"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Event
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CalendarIcon className="w-8 h-8 text-blue-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{events.length}</p>
                <p className="text-xs text-slate-600">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="w-8 h-8 text-green-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{todayEvents.length}</p>
                <p className="text-xs text-slate-600">Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{urgentEvents.length}</p>
                <p className="text-xs text-slate-600">Urgent</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-8 h-8 text-purple-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{proposals.length}</p>
                <p className="text-xs text-slate-600">Deadlines</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Sync Integration */}
      <CalendarSync 
        proposal={null}
        organization={organization}
        user={user}
      />

      {/* Events List */}
      <Card className="border-none shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle>Upcoming Events</CardTitle>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="meeting">Meetings</SelectItem>
                <SelectItem value="proposal_deadline">Deadlines</SelectItem>
                <SelectItem value="review">Reviews</SelectItem>
                <SelectItem value="submission">Submissions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-2">No upcoming events</p>
              <p className="text-sm mb-4">Create your first event or deadline</p>
              <Button onClick={() => setShowEventDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => {
                const priorityColors = {
                  low: "border-slate-200 bg-slate-50",
                  medium: "border-blue-200 bg-blue-50",
                  high: "border-orange-200 bg-orange-50",
                  urgent: "border-red-200 bg-red-50"
                };

                return (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border-2 ${priorityColors[event.priority]} hover:shadow-md transition-all`}
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1 w-full sm:w-auto">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 text-lg">
                              {event.title}
                            </h3>
                            {event.description && (
                              <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-sm">
                          <Badge variant="outline" className="capitalize">
                            {event.event_type.replace('_', ' ')}
                          </Badge>
                          {event.priority !== 'medium' && (
                            <Badge 
                              className={`capitalize ${
                                event.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                event.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {event.priority}
                            </Badge>
                          )}
                          <span className="text-slate-600 flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {moment(event.start_date).format('MMM D, YYYY [at] h:mm A')}
                          </span>
                        </div>

                        {event.location && (
                          <p className="text-xs text-slate-500 mt-2">📍 {event.location}</p>
                        )}
                        {event.meeting_link && (
                          <a
                            href={event.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                          >
                            🔗 Join Meeting
                          </a>
                        )}
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(event)}
                          className="flex-1 sm:flex-none min-h-[44px]"
                        >
                          <Edit className="w-4 h-4 sm:mr-2" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(event)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proposal Deadlines */}
      {proposals.length > 0 && (
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Proposal Deadlines ({proposals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proposals.slice(0, 5).map((proposal) => {
                const daysUntilDue = moment(proposal.due_date).diff(moment(), 'days');
                const isUrgent = daysUntilDue <= 3;

                return (
                  <div
                    key={proposal.id}
                    className={`p-4 rounded-lg border-2 ${
                      isUrgent ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{proposal.proposal_name}</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          Due: {moment(proposal.due_date).format('MMMM D, YYYY')}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {daysUntilDue} days remaining
                        </p>
                      </div>
                      {isUrgent && (
                        <Badge className="bg-red-600 text-white">Urgent</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
            <DialogDescription>
              {selectedEvent ? 'Update event details' : 'Add a new event or deadline'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event_type">Event Type *</Label>
                <Select
                  value={eventForm.event_type}
                  onValueChange={(value) => setEventForm({ ...eventForm, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="proposal_deadline">Proposal Deadline</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="submission">Submission</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  value={eventForm.priority}
                  onValueChange={(value) => setEventForm({ ...eventForm, priority: value })}
                >
                  <SelectTrigger>
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
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date & Time *</Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={eventForm.start_date}
                  onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="end_date">End Date & Time *</Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={eventForm.end_date}
                  onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={eventForm.location}
                onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                placeholder="Physical location or address"
              />
            </div>

            <div>
              <Label htmlFor="meeting_link">Meeting Link</Label>
              <Input
                id="meeting_link"
                type="url"
                value={eventForm.meeting_link}
                onChange={(e) => setEventForm({ ...eventForm, meeting_link: e.target.value })}
                placeholder="https://zoom.us/..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEventDialog(false);
                  setSelectedEvent(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
              >
                {selectedEvent ? 'Update Event' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}