
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Video, Trash2, ChevronLeft, ChevronRight, LayoutGrid, Columns, Square, Repeat, AlertCircle } from "lucide-react";
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

// Helper function to generate recurring event instances
const generateRecurringInstances = (event, viewStartDate, viewEndDate) => {
  if (!event.recurrence_rule) return [event];
  
  const instances = [];
  let recurrence;
  try {
    recurrence = typeof event.recurrence_rule === 'string' 
      ? JSON.parse(event.recurrence_rule) 
      : event.recurrence_rule;
  } catch (e) {
    console.error("Failed to parse recurrence_rule:", e);
    return [event]; // Return original event if rule is malformed
  }
  
  if (!recurrence || !recurrence.frequency) return [event];
  
  const eventStart = moment(event.start_date);
  const eventEnd = moment(event.end_date);
  const duration = moment.duration(eventEnd.diff(eventStart));
  
  // Start from the original event's start date
  let current = moment(eventStart);
  const finalViewEndDate = moment(viewEndDate);

  // Determine the effective end date for recurrence generation
  let maxRecurrenceEndDate = moment().add(5, 'years'); // Default safety limit
  if (recurrence.end_type === 'date' && recurrence.end_date) {
    maxRecurrenceEndDate = moment.min(maxRecurrenceEndDate, moment(recurrence.end_date).endOf('day'));
  }
  
  let count = 0;
  const maxCountLimit = recurrence.end_type === 'count' ? recurrence.occurrence_count : Infinity;

  while (current.isSameOrBefore(finalViewEndDate) && current.isSameOrBefore(maxRecurrenceEndDate) && count < maxCountLimit) {
    // Only add instance if it falls within the view date range or starts before and ends within/after
    if (current.isSameOrBefore(viewEndDate) && moment(current).add(duration).isSameOrAfter(viewStartDate)) {
      instances.push({
        ...event,
        // Override original ID to make instances unique for React keys/Draggable IDs
        id: `${event.id}-${current.format('YYYY-MM-DDTHH:mm')}`, 
        original_id: event.id, // Keep a reference to the original event
        start_date: current.toISOString(),
        end_date: moment(current).add(duration).toISOString(),
        is_recurring_instance: true
      });
    }
    
    // Move to next occurrence
    const interval = recurrence.interval || 1;
    if (recurrence.frequency === 'daily') {
      current.add(interval, 'days');
    } else if (recurrence.frequency === 'weekly') {
      current.add(interval, 'weeks');
    } else if (recurrence.frequency === 'monthly') {
      current.add(interval, 'months');
    } else if (recurrence.frequency === 'yearly') {
      current.add(interval, 'years');
    } else {
      break; // Unknown frequency, stop recurrence
    }
    
    count++;
    if (count > 500) { // Safety break for excessively long recurrences
        console.warn("Recurrence generation hit 500 instances limit.");
        break;
    }
  }
  
  return instances;
};

export default function Calendar() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // This holds the *original* event object
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // month, week, day
  const [deleteRecurringOption, setDeleteRecurringOption] = useState(null); // Stores original_id for delete confirmation

  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    event_type: "meeting",
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    location: "",
    meeting_link: "",
    all_day: false,
    is_recurring: false,
    recurrence_rule: {
      frequency: "daily",
      interval: 1,
      end_type: "never",
      end_date: "", // YYYY-MM-DD
      occurrence_count: 10
    }
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

  const { data: baseEvents, isLoading } = useQuery({
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

  // Expand recurring events into visible instances for the current view
  const events = React.useMemo(() => {
    if (!baseEvents) return [];
    
    // Determine the date range for the current view, extended slightly for recurring events
    let startDate, endDate;
    if (viewMode === 'month') {
      startDate = moment(currentDate).startOf('month').subtract(moment.duration(2, 'weeks'));
      endDate = moment(currentDate).endOf('month').add(moment.duration(2, 'weeks'));
    } else if (viewMode === 'week') {
      startDate = moment(currentDate).startOf('week').subtract(moment.duration(3, 'days'));
      endDate = moment(currentDate).endOf('week').add(moment.duration(3, 'days'));
    } else { // Day view
      startDate = moment(currentDate).startOf('day').subtract(moment.duration(1, 'day'));
      endDate = moment(currentDate).endOf('day').add(moment.duration(1, 'day'));
    }
    
    const allInstances = [];
    baseEvents.forEach(event => {
      if (event.recurrence_rule) {
        const instances = generateRecurringInstances(event, startDate, endDate);
        allInstances.push(...instances);
      } else {
        // Only include non-recurring events if they fall within the view range
        if (moment(event.start_date).isSameOrBefore(endDate) && moment(event.end_date).isSameOrAfter(startDate)) {
            allInstances.push(event);
        }
      }
    });
    
    // Filter instances to strictly within the current view
    let displayStartDate, displayEndDate;
    if (viewMode === 'month') {
      displayStartDate = moment(currentDate).startOf('month').startOf('week'); // For calendar grid display
      displayEndDate = moment(currentDate).endOf('month').endOf('week');
    } else if (viewMode === 'week') {
      displayStartDate = moment(currentDate).startOf('week');
      displayEndDate = moment(currentDate).endOf('week');
    } else { // Day view
      displayStartDate = moment(currentDate).startOf('day');
      displayEndDate = moment(currentDate).endOf('day');
    }

    return allInstances.filter(event => 
        moment(event.start_date).isSameOrBefore(displayEndDate) && moment(event.end_date).isSameOrAfter(displayStartDate)
    );

  }, [baseEvents, currentDate, viewMode]);

  const createEventMutation = useMutation({
    mutationFn: async (data) => {
      const eventToSave = {
        ...data,
        recurrence_rule: data.is_recurring ? JSON.stringify(data.recurrence_rule) : null
      };
      // Remove is_recurring field as it's not part of the model
      delete eventToSave.is_recurring;

      if (editingEvent && !editingEvent.is_recurring_instance) {
        // When editing an existing event (not an instance)
        return base44.entities.CalendarEvent.update(editingEvent.id, eventToSave);
      } else {
        // When creating a new event or an instance (though instances shouldn't be "created" directly)
        // If editingEvent is an instance, we want to update the original event it refers to.
        // This logic needs to be careful: the current form is set up to edit the *series* if an instance was clicked.
        // So `editingEvent` here would be the *original* event.
        if (editingEvent) { // if editing an original event (or series)
            return base44.entities.CalendarEvent.update(editingEvent.id, eventToSave);
        } else { // if creating new event
            return base44.entities.CalendarEvent.create({
                ...eventToSave,
                organization_id: organization.id,
                created_by_email: user.email,
                created_by_name: user.full_name
            });
        }
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
      setDeleteRecurringOption(null); // Close the delete recurring dialog
      setShowEventDialog(false); // Close the edit dialog if it was open
      setEditingEvent(null);
      resetForm();
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
      all_day: false,
      is_recurring: false,
      recurrence_rule: {
        frequency: "daily",
        interval: 1,
        end_type: "never",
        end_date: moment().format('YYYY-MM-DD'), // Default to today for consistency
        occurrence_count: 10
      }
    });
  };

  const handleEdit = (event) => {
    const originalEventId = event.original_id || event.id;
    const eventToEdit = baseEvents.find(e => e.id === originalEventId) || event; // Find the base event if it's an instance

    if (eventToEdit) {
      setEditingEvent(eventToEdit);
      let recurrence = null;
      if (eventToEdit.recurrence_rule) {
        try {
          recurrence = typeof eventToEdit.recurrence_rule === 'string' 
            ? JSON.parse(eventToEdit.recurrence_rule) 
            : eventToEdit.recurrence_rule;
        } catch (e) {
          console.error("Error parsing recurrence rule during edit:", e);
        }
      }
      
      setEventData({
        ...eventToEdit,
        start_date: moment(eventToEdit.start_date).format('YYYY-MM-DDTHH:mm'),
        end_date: moment(eventToEdit.end_date).format('YYYY-MM-DDTHH:mm'),
        is_recurring: !!recurrence,
        recurrence_rule: recurrence || {
          frequency: "daily",
          interval: 1,
          end_type: "never",
          end_date: moment().format('YYYY-MM-DD'),
          occurrence_count: 10
        }
      });
      setShowEventDialog(true);
    }
  };

  const handleDelete = (event) => {
    const originalEventId = event.original_id || event.id;
    const eventToDelete = baseEvents.find(e => e.id === originalEventId);

    if (eventToDelete && eventToDelete.recurrence_rule) {
      // If it's a recurring event (either original or an instance of one)
      setDeleteRecurringOption(originalEventId); // Trigger the recurring delete dialog
    } else {
      // Non-recurring event
      if (confirm('Delete this event?')) {
        deleteEventMutation.mutate(event.id);
      }
    }
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
      if (start.year() === end.year()) {
        return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
      }
      return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`;
    } else {
      return moment(currentDate).format('dddd, MMMM D, YYYY');
    }
  };

  const getRecurrenceDescription = (recurrence) => {
    if (!recurrence) return null;
    let rule;
    try {
        rule = typeof recurrence === 'string' ? JSON.parse(recurrence) : recurrence;
    } catch (e) {
        return "Invalid recurrence rule";
    }
    
    let desc = `Repeats `;
    const intervalText = rule.interval > 1 ? `every ${rule.interval} ` : '';

    switch (rule.frequency) {
        case 'daily':
            desc += `${intervalText}day${rule.interval > 1 ? 's' : ''}`;
            break;
        case 'weekly':
            desc += `${intervalText}week${rule.interval > 1 ? 's' : ''}`;
            break;
        case 'monthly':
            desc += `${intervalText}month${rule.interval > 1 ? 's' : ''}`;
            break;
        case 'yearly':
            desc += `${intervalText}year${rule.interval > 1 ? 's' : ''}`;
            break;
        default:
            return "Unknown recurrence";
    }
    
    if (rule.end_type === 'date' && rule.end_date) {
      desc += `, until ${moment(rule.end_date).format('MMM D, YYYY')}`;
    } else if (rule.end_type === 'count' && rule.occurrence_count) {
      desc += `, ${rule.occurrence_count} time${rule.occurrence_count > 1 ? 's' : ''}`;
    } else if (rule.end_type === 'never') {
        desc += `, forever`;
    }
    
    return desc;
  };

  // Drag and drop handler
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const eventId = result.draggableId;
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    // Don't allow dragging recurring instances
    if (event.is_recurring_instance) {
      alert("Cannot reschedule recurring event instances by dragging. Please edit the event series directly to modify recurrence.");
      return;
    }

    const destinationDate = result.destination.droppableId; // YYYY-MM-DD
    const eventOriginalStart = moment(event.start_date);
    const eventOriginalEnd = moment(event.end_date);
    const duration = moment.duration(eventOriginalEnd.diff(eventOriginalStart));

    const newStart = moment(destinationDate)
                      .hour(eventOriginalStart.hour())
                      .minute(eventOriginalStart.minute());
    const newEnd = moment(newStart).add(duration);

    updateEventMutation.mutate({
      id: event.original_id || eventId, // Update the original event even if it's an instance that somehow got dragged (should be disabled)
      start_date: newStart.toISOString(),
      end_date: newEnd.toISOString()
    });
  };

  // Month View
  const renderMonthView = () => {
    const startOfMonth = moment(currentDate).startOf('month');
    const endOfMonth = moment(currentDate).endOf('month');
    const startOfWeek = moment(startOfMonth).startOf('week');
    const endOfWeek = moment(endOfMonth).endOf('week');

    const days = [];
    let day = startOfWeek;

    while (day.isSameOrBefore(endOfWeek)) {
      days.push(day.clone());
      day.add(1, 'day');
    }

    const getEventsForDay = (date) => {
      const dateStr = date.format('YYYY-MM-DD');
      return events.filter(event => {
        // Check if event starts or ends on this day or spans across it
        const eventStartMoment = moment(event.start_date);
        const eventEndMoment = moment(event.end_date);
        return (
            eventStartMoment.isSame(date, 'day') ||
            (eventStartMoment.isBefore(date, 'day') && eventEndMoment.isAfter(date, 'day'))
        );
      }).sort((a,b) => moment(a.start_date).unix() - moment(b.start_date).unix()); // Sort by start time
    };

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 border-l border-t">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
            <div key={dayName} className="p-3 text-center font-bold text-slate-700 border-b border-r bg-gradient-to-br from-slate-50 to-slate-100">
              {dayName}
            </div>
          ))}

          {days.map((dayMoment, index) => {
            const dayEvents = getEventsForDay(dayMoment);
            const isToday = dayMoment.isSame(moment(), 'day');
            const isCurrentMonth = dayMoment.isSame(currentDate, 'month');
            const droppableId = dayMoment.format('YYYY-MM-DD');
            
            return (
              <Droppable key={droppableId} droppableId={droppableId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[140px] border-b border-r p-2 transition-all flex flex-col",
                      !isCurrentMonth && "bg-slate-50 text-slate-400",
                      isCurrentMonth && "bg-white",
                      isToday && "bg-gradient-to-br from-blue-50 to-indigo-50 ring-2 ring-blue-400 ring-inset",
                      snapshot.isDraggingOver && "bg-blue-100 ring-2 ring-blue-500"
                    )}
                    onClick={() => {
                        const newDate = dayMoment.toDate();
                        setEventData({
                          ...eventData,
                          start_date: moment(newDate).hour(9).format('YYYY-MM-DDTHH:mm'),
                          end_date: moment(newDate).hour(10).format('YYYY-MM-DDTHH:mm')
                        });
                        setShowEventDialog(true);
                    }}
                  >
                    <div className={cn(
                        "text-sm font-bold mb-2 flex items-center justify-center w-8 h-8 rounded-full ml-auto",
                        isToday ? "bg-blue-600 text-white shadow-lg" : "text-slate-700"
                    )}>
                        {dayMoment.format('D')}
                    </div>
                    <div className="space-y-1 flex-grow">
                          {dayEvents.slice(0, 3).map((event, idx) => (
                            <Draggable key={event.id} draggableId={event.id} index={idx} isDragDisabled={event.is_recurring_instance}>
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
                                        snapshot.isDragging && "rotate-3 scale-105 shadow-xl",
                                        event.is_recurring_instance && "cursor-not-allowed opacity-80"
                                      )}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                      }}
                                    >
                                      <div className="truncate flex items-center gap-1">
                                        {event.is_recurring_instance && <Repeat className="w-3 h-3 flex-shrink-0" />}
                                        <Clock className="w-3 h-3 flex-shrink-0" />
                                        {moment(event.start_date).format('h:mm A')} {event.title}
                                      </div>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                                    <div className="space-y-3">
                                      <div>
                                        <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                          {event.is_recurring_instance && <Repeat className="w-4 h-4 text-blue-600" />}
                                          {event.title}
                                        </h4>
                                        <Badge className={cn("mt-1", getEventTypeBadgeColor(event.event_type))}>
                                          {event.event_type.replace(/_/g, ' ')}
                                        </Badge>
                                      </div>
                                      {event.description && (
                                        <p className="text-sm text-slate-600">{event.description}</p>
                                      )}
                                      {event.is_recurring_instance && (
                                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-start gap-2">
                                          <Repeat className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                          <span>{getRecurrenceDescription(baseEvents.find(e => e.id === event.original_id)?.recurrence_rule)}</span>
                                        </div>
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
                                          Edit {event.is_recurring_instance ? "Series" : "Event"}
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(event)}>
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
        const eventStartMoment = moment(event.start_date);
        const eventEndMoment = moment(event.end_date);
        return (
            eventStartMoment.isSame(day, 'day') ||
            (eventStartMoment.isBefore(day, 'day') && eventEndMoment.isAfter(day, 'day'))
        );
      }).sort((a,b) => moment(a.start_date).unix() - moment(b.start_date).unix()); // Sort by start time
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
                      "border-2 rounded-xl p-3 min-h-[500px] transition-all flex flex-col",
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
                    <div className="space-y-2 flex-grow">
                      {dayEvents.map((event, idx) => (
                        <Draggable key={event.id} draggableId={event.id} index={idx} isDragDisabled={event.is_recurring_instance}>
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
                                    snapshot.isDragging && "rotate-2 scale-105 shadow-2xl",
                                    event.is_recurring_instance && "cursor-not-allowed opacity-80"
                                  )}
                                >
                                  <div className="font-bold text-sm mb-1 flex items-center gap-1">
                                    {event.is_recurring_instance && <Repeat className="w-3 h-3" />}
                                    {event.title}
                                  </div>
                                  <div className="text-xs opacity-90 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {moment(event.start_date).format('h:mm A')}
                                  </div>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-3">
                                  <div>
                                    <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                      {event.is_recurring_instance && <Repeat className="w-4 h-4 text-blue-600" />}
                                      {event.title}
                                    </h4>
                                    <Badge className={cn("mt-1", getEventTypeBadgeColor(event.event_type))}>
                                      {event.event_type.replace(/_/g, ' ')}
                                    </Badge>
                                  </div>
                                  {event.description && (
                                    <p className="text-sm text-slate-600">{event.description}</p>
                                  )}
                                  {event.is_recurring_instance && (
                                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-start gap-2">
                                      <Repeat className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                      <span>{getRecurrenceDescription(baseEvents.find(e => e.id === event.original_id)?.recurrence_rule)}</span>
                                    </div>
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
                                      Edit {event.is_recurring_instance ? "Series" : "Event"}
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(event)}>
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
    }).sort((a,b) => moment(a.start_date).unix() - moment(b.start_date).unix()); // Sort by start time

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
              const eventStartMoment = moment(event.start_date);
              const eventEndMoment = moment(event.end_date);
              const targetHourMoment = moment(currentDate).hour(hour).startOf('hour');
              const nextHourMoment = moment(currentDate).hour(hour + 1).startOf('hour');

              return (
                  (eventStartMoment.isSameOrAfter(targetHourMoment) && eventStartMoment.isBefore(nextHourMoment)) || // Starts in this hour
                  (eventEndMoment.isAfter(targetHourMoment) && eventEndMoment.isSameOrBefore(nextHourMoment)) || // Ends in this hour
                  (eventStartMoment.isBefore(targetHourMoment) && eventEndMoment.isAfter(nextHourMoment)) // Spans across this hour
              );
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
                          <div className="font-bold text-sm flex items-center gap-1">
                            {event.is_recurring_instance && <Repeat className="w-3 h-3" />}
                            {event.title}
                          </div>
                          <div className="text-xs opacity-90 mt-1">
                            {moment(event.start_date).format('h:mm A')} - {moment(event.end_date).format('h:mm A')}
                          </div>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                              {event.is_recurring_instance && <Repeat className="w-4 h-4 text-blue-600" />}
                              {event.title}
                            </h4>
                            <Badge className={cn("mt-1", getEventTypeBadgeColor(event.event_type))}>
                              {event.event_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          {event.description && (
                            <p className="text-sm text-slate-600">{event.description}</p>
                          )}
                          {event.is_recurring_instance && (
                            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-start gap-2">
                              <Repeat className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{getRecurrenceDescription(baseEvents.find(e => e.id === event.original_id)?.recurrence_rule)}</span>
                            </div>
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
                              Edit {event.is_recurring_instance ? "Series" : "Event"}
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(event)}>
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

      {/* Event Dialog */}
      <Dialog open={showEventDialog} onOpenChange={(open) => { 
        setShowEventDialog(open); 
        if (!open) { 
          setEditingEvent(null); 
          resetForm(); 
        } 
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

            {/* Recurring Event Options */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={eventData.is_recurring}
                  onChange={(e) => setEventData({ ...eventData, is_recurring: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_recurring" className="text-sm font-medium flex items-center gap-2">
                  <Repeat className="w-4 h-4" />
                  Recurring Event
                </label>
              </div>

              {eventData.is_recurring && (
                <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Frequency</label>
                      <Select 
                        value={eventData.recurrence_rule.frequency}
                        onValueChange={(value) => setEventData({
                          ...eventData,
                          recurrence_rule: { ...eventData.recurrence_rule, frequency: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Repeat Every</label>
                      <Input
                        type="number"
                        min="1"
                        value={eventData.recurrence_rule.interval}
                        onChange={(e) => setEventData({
                          ...eventData,
                          recurrence_rule: { ...eventData.recurrence_rule, interval: parseInt(e.target.value) || 1 }
                        })}
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Ends</label>
                    <Select 
                      value={eventData.recurrence_rule.end_type}
                      onValueChange={(value) => setEventData({
                        ...eventData,
                        recurrence_rule: { ...eventData.recurrence_rule, end_type: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select end type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">Never</SelectItem>
                        <SelectItem value="date">On Date</SelectItem>
                        <SelectItem value="count">After Occurrences</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {eventData.recurrence_rule.end_type === 'date' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">End Date</label>
                      <Input
                        type="date"
                        value={eventData.recurrence_rule.end_date}
                        onChange={(e) => setEventData({
                          ...eventData,
                          recurrence_rule: { ...eventData.recurrence_rule, end_date: e.target.value }
                        })}
                      />
                    </div>
                  )}

                  {eventData.recurrence_rule.end_type === 'count' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Number of Occurrences</label>
                      <Input
                        type="number"
                        min="1"
                        value={eventData.recurrence_rule.occurrence_count}
                        onChange={(e) => setEventData({
                          ...eventData,
                          recurrence_rule: { ...eventData.recurrence_rule, occurrence_count: parseInt(e.target.value) || 10 }
                        })}
                        placeholder="10"
                      />
                    </div>
                  )}

                  <div className="text-xs text-slate-600 bg-white p-2 rounded">
                    <strong>Preview:</strong> {getRecurrenceDescription(eventData.recurrence_rule)}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-4">
              {editingEvent && (
                <Button 
                  variant="destructive" 
                  onClick={() => handleDelete(editingEvent)} // Use the new handleDelete
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

      {/* Delete Recurring Event Dialog */}
      <Dialog open={!!deleteRecurringOption} onOpenChange={(open) => !open && setDeleteRecurringOption(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Delete Recurring Event
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              This is a recurring event. Do you want to delete only this instance or the entire series?
            </p>
            {/* Future enhancement: add option to delete "this and future occurrences" */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteRecurringOption(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => {
                  deleteEventMutation.mutate(deleteRecurringOption); // deleteRecurringOption holds the original event's ID
                }}
              >
                Delete Entire Series
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
