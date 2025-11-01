
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
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
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  Video,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Columns,
  Square,
  Repeat,
  AlertCircle,
  Filter,
  Search,
  CheckSquare, // For Proposal Task
  FileText,    // For Proposal Deadline
  Users,       // For Client Meeting
  Shield,      // For Review Deadline
  Briefcase,   // For Compliance Due
  X,           // For clear button
  ExternalLink, // For external links
  Settings,    // For sync settings
  List         // For Agenda View - NEW
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";
import { cn } from "@/lib/utils";
import CalendarSync from "../components/calendar/CalendarSync";

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

// Event type configurations
const EVENT_TYPE_CONFIG = {
  calendar_event: {
    label: "Calendar Event",
    icon: CalendarIcon,
    color: "from-blue-400 to-blue-600",
    badgeColor: "bg-blue-500 text-white",
    canDrag: true,
    canEdit: true
  },
  proposal_task: {
    label: "Proposal Task",
    icon: CheckSquare,
    color: "from-orange-400 to-orange-600", // Changed to orange
    badgeColor: "bg-orange-500 text-white", // Changed to orange
    canDrag: true, // Can drag proposal tasks (due date change)
    canEdit: false // Edit from proposal context
  },
  proposal_deadline: {
    label: "Proposal Deadline",
    icon: FileText,
    color: "from-red-400 to-red-600",
    badgeColor: "bg-red-500 text-white",
    canDrag: false,
    canEdit: false
  },
  review_deadline: {
    label: "Review Deadline",
    icon: Shield,
    color: "from-purple-400 to-purple-600",
    badgeColor: "bg-purple-500 text-white",
    canDrag: false,
    canEdit: false
  },
  compliance_due: {
    label: "Compliance Due",
    icon: Briefcase, // Changed from AlertCircle to Briefcase
    color: "from-amber-400 to-amber-600",
    badgeColor: "bg-amber-500 text-white",
    canDrag: false,
    canEdit: false
  },
  client_meeting: {
    label: "Client Meeting",
    icon: Users,
    color: "from-green-400 to-green-600", // Changed to green
    badgeColor: "bg-green-500 text-white", // Changed to green
    canDrag: true, // Can drag client meetings
    canEdit: false // Edit from client meeting context
  }
};

// Helper function to generate recurring event instances
const generateRecurringInstances = (event, viewStartDate, viewEndDate) => {
  if (!event.recurrence_rule) return [event];

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

  const instances = [];
  const eventStart = moment(event.start_date);
  const eventEnd = moment(event.end_date);
  const duration = moment.duration(eventEnd.diff(eventStart));

  // Start generation from the original event's start date
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
        is_recurring_instance: true,
        source_type: 'calendar_event', // Explicitly set source type for instances
        color_category: EVENT_TYPE_CONFIG.calendar_event.color,
        can_drag: false, // Recurring instances cannot be dragged individually, only the series edited
        can_edit: true // Can open edit dialog for the series
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

// Data normalization function
const normalizeEvent = (entity, sourceType, orgId) => {
  const config = EVENT_TYPE_CONFIG[sourceType];
  if (!config) {
    console.warn(`No config found for source type: ${sourceType}`);
    return null;
  }

  switch (sourceType) {
    case 'proposal_task':
      if (!entity.due_date) return null;
      return {
        id: `task-${entity.id}`,
        original_id: entity.id,
        source_type: sourceType,
        title: entity.title,
        description: entity.description,
        start_date: moment(entity.due_date).startOf('day').toISOString(),
        end_date: moment(entity.due_date).endOf('day').toISOString(), // Treat as all-day
        event_type: 'task_deadline', // Use generic internal type if specific not available
        link_url: `/tasks`, // Placeholder, adjust as needed
        color_category: config.color,
        priority: entity.priority,
        assigned_to: entity.assigned_to_email,
        proposal_id: entity.proposal_id,
        can_drag: config.canDrag,
        can_edit: config.canEdit
      };

    case 'proposal_deadline':
      if (!entity.due_date) return null;
      return {
        id: `proposal-${entity.id}`,
        original_id: entity.id,
        source_type: sourceType,
        title: `📋 ${entity.proposal_name} - Deadline`,
        description: `Proposal: ${entity.proposal_name}`,
        start_date: moment(entity.due_date).startOf('day').toISOString(),
        end_date: moment(entity.due_date).endOf('day').toISOString(),
        event_type: 'proposal_deadline',
        link_url: `/proposal-builder?id=${entity.id}`,
        color_category: config.color,
        priority: 'high',
        proposal_id: entity.id,
        can_drag: config.canDrag,
        can_edit: config.canEdit
      };

    case 'review_deadline':
      if (!entity.due_date) return null;
      return {
        id: `review-${entity.id}`,
        original_id: entity.id,
        source_type: sourceType,
        title: `🔍 ${entity.round_name} Review`,
        description: entity.description,
        start_date: moment(entity.due_date).startOf('day').toISOString(),
        end_date: moment(entity.due_date).endOf('day').toISOString(),
        event_type: 'review_session',
        link_url: `/proposal-builder?id=${entity.proposal_id}`,
        color_category: config.color,
        priority: 'high',
        proposal_id: entity.proposal_id,
        can_drag: config.canDrag,
        can_edit: config.canEdit
      };

    case 'compliance_due':
      if (!entity.due_date) return null;
      return {
        id: `compliance-${entity.id}`,
        original_id: entity.id,
        source_type: sourceType,
        title: `⚖️ ${entity.requirement_title}`,
        description: entity.requirement_description,
        start_date: moment(entity.due_date).startOf('day').toISOString(),
        end_date: moment(entity.due_date).endOf('day').toISOString(),
        event_type: 'compliance_due',
        link_url: `/proposal-builder?id=${entity.proposal_id}`, // Changed to proposal_id
        color_category: config.color,
        priority: entity.risk_level, // Assuming 'risk_level' maps to priority
        proposal_id: entity.proposal_id,
        can_drag: config.canDrag,
        can_edit: config.canEdit
      };

    case 'client_meeting':
      if (!entity.scheduled_date) return null;
      const clientMeetingStart = moment(entity.scheduled_date);
      const clientMeetingEnd = moment(entity.scheduled_date).add(entity.duration_minutes || 60, 'minutes');
      return {
        id: `meeting-${entity.id}`,
        original_id: entity.id,
        source_type: sourceType,
        title: `👥 ${entity.meeting_title}`, // Changed to directly use entity.meeting_title
        description: entity.agenda,
        start_date: clientMeetingStart.toISOString(),
        end_date: clientMeetingEnd.toISOString(),
        event_type: 'meeting',
        link_url: `/clients`, // Placeholder, adjust as needed
        color_category: config.color,
        location: entity.location,
        meeting_link: entity.meeting_link,
        can_drag: config.canDrag,
        can_edit: config.canEdit
      };

    case 'calendar_event': // CalendarEvent data model
      return {
        id: entity.id,
        original_id: entity.id,
        source_type: sourceType,
        title: entity.title,
        description: entity.description,
        start_date: entity.start_date,
        end_date: entity.end_date,
        event_type: entity.event_type || 'meeting', // Default to 'meeting'
        location: entity.location,
        meeting_link: entity.meeting_link,
        all_day: entity.all_day,
        recurrence_rule: entity.recurrence_rule,
        color_category: EVENT_TYPE_CONFIG.calendar_event.color,
        can_drag: config.canDrag,
        can_edit: config.canEdit
      };

    default:
      return null;
  }
};


export default function Calendar() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // This holds the *original* event object or the instance if it's external
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month"); // month, week, day, agenda
  const [deleteRecurringOption, setDeleteRecurringOption] = useState(null); // Stores original_id for delete confirmation for CalendarEvent

  // Filtering and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    eventType: "all", // Refers to source_type key in EVENT_TYPE_CONFIG
    assignedUser: "all", // User email
    priority: "all", // high, medium, low
    proposal: "all" // Proposal ID
  });

  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    event_type: "meeting", // This is internal for CalendarEvent type
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
      end_date: "", // Changed from moment().format('YYYY-MM-DD') to ""
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

  // Fetch proposals list separately to get proposalIds for other queries
  const { data: proposalsList = [] } = useQuery({
    queryKey: ['proposals-list', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({ organization_id: organization.id });
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  const proposalIds = React.useMemo(() => proposalsList.map(p => p.id), [proposalsList]);


  // Multi-source data fetching
  const queryResults = useQueries({
    queries: [
      {
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
      },
      {
        queryKey: ['proposal-tasks', organization?.id, proposalIds],
        queryFn: async () => {
          if (!organization?.id || proposalIds.length === 0) return [];
          const tasks = await base44.entities.ProposalTask.filter({
            proposal_id: { $in: proposalIds }, // Filter by proposal_id
            due_date: { $ne: null }
          });
          return tasks;
        },
        initialData: [],
        enabled: !!organization?.id && proposalIds.length > 0, // Enable only if proposalIds exist
      },
      {
        queryKey: ['proposals-deadlines', organization?.id],
        queryFn: async () => {
          if (!organization?.id) return [];
          const proposals = await base44.entities.Proposal.filter({
            organization_id: organization.id,
            due_date: { $ne: null }
          });
          return proposals;
        },
        initialData: [],
        enabled: !!organization?.id,
      },
      {
        queryKey: ['review-deadlines', organization?.id, proposalIds],
        queryFn: async () => {
          if (!organization?.id || proposalIds.length === 0) return [];
          const reviews = await base44.entities.ReviewRound.filter({
            proposal_id: { $in: proposalIds }, // Filter by proposal_id
            due_date: { $ne: null }
          });
          return reviews;
        },
        initialData: [],
        enabled: !!organization?.id && proposalIds.length > 0, // Enable only if proposalIds exist
      },
      {
        queryKey: ['compliance-deadlines', organization?.id, proposalIds],
        queryFn: async () => {
          if (!organization?.id || proposalIds.length === 0) return [];
          const compliances = await base44.entities.ComplianceRequirement.filter({
            proposal_id: { $in: proposalIds }, // Filter by proposal_id
            due_date: { $ne: null }
          });
          return compliances;
        },
        initialData: [],
        enabled: !!organization?.id && proposalIds.length > 0, // Enable only if proposalIds exist
      },
      {
        queryKey: ['client-meetings', organization?.id],
        queryFn: async () => {
          if (!organization?.id) return [];
          const meetings = await base44.entities.ClientMeeting.filter({
            organization_id: organization.id,
            scheduled_date: { $ne: null }
          });
          return meetings;
        },
        initialData: [],
        enabled: !!organization?.id,
      }
    ]
  });

  const isLoadingData = queryResults.some(q => q.isLoading);

  const [baseCalendarEvents, proposalTasks, proposalDeadlines, reviewDeadlines, complianceDeadlines, clientMeetings] = queryResults.map(q => q.data || []);

  // Expand recurring events and normalize all events into a common format
  const allEvents = React.useMemo(() => {
    if (!organization?.id) return [];

    // Determine the date range for the current view, extended slightly for recurring events
    let startDate, endDate;
    if (viewMode === 'month') {
      startDate = moment(currentDate).startOf('month').subtract(moment.duration(2, 'weeks'));
      endDate = moment(currentDate).endOf('month').add(moment.duration(2, 'weeks'));
    } else if (viewMode === 'week') {
      startDate = moment(currentDate).startOf('week').subtract(moment.duration(3, 'days'));
      endDate = moment(currentDate).endOf('week').add(moment.duration(3, 'days'));
    } else if (viewMode === 'day') { // Day view
      startDate = moment(currentDate).startOf('day').subtract(moment.duration(1, 'day'));
      endDate = moment(currentDate).endOf('day').add(moment.duration(1, 'day'));
    } else if (viewMode === 'agenda') { // Agenda view: from today for next X days/weeks
      startDate = moment().startOf('day');
      endDate = moment().add(6, 'months').endOf('day'); // Fetch events for next 6 months for agenda
    } else {
      // Default or fallback
      startDate = moment(currentDate).startOf('day').subtract(moment.duration(1, 'day'));
      endDate = moment(currentDate).endOf('day').add(moment.duration(1, 'day'));
    }

    const normalizedEvents = [];

    // Calendar events (with recurrence support)
    baseCalendarEvents.forEach(event => {
      if (event.recurrence_rule) {
        const instances = generateRecurringInstances(event, startDate, endDate);
        normalizedEvents.push(...instances);
      } else {
        // Only include non-recurring calendar events if they fall within the extended view range
        if (moment(event.start_date).isSameOrBefore(endDate) && moment(event.end_date).isSameOrAfter(startDate)) {
            const normalized = normalizeEvent(event, 'calendar_event', organization.id);
            if (normalized) normalizedEvents.push(normalized);
        }
      }
    });

    // Normalize other entity types
    proposalTasks.forEach(task => {
      const norm = normalizeEvent(task, 'proposal_task', organization.id);
      if (norm) normalizedEvents.push(norm);
    });

    proposalDeadlines.forEach(proposal => {
      const norm = normalizeEvent(proposal, 'proposal_deadline', organization.id);
      if (norm) normalizedEvents.push(norm);
    });

    reviewDeadlines.forEach(review => {
      const norm = normalizeEvent(review, 'review_deadline', organization.id);
      if (norm) normalizedEvents.push(norm);
    });

    complianceDeadlines.forEach(compliance => {
      const norm = normalizeEvent(compliance, 'compliance_due', organization.id);
      if (norm) normalizedEvents.push(norm);
    });

    clientMeetings.forEach(meeting => {
      const norm = normalizeEvent(meeting, 'client_meeting', organization.id);
      if (norm) normalizedEvents.push(norm);
    });

    // Filter instances to strictly within the current *display* view
    let displayStartDate, displayEndDate;
    if (viewMode === 'month') {
      displayStartDate = moment(currentDate).startOf('month').startOf('week'); // For calendar grid display
      displayEndDate = moment(currentDate).endOf('month').endOf('week');
    } else if (viewMode === 'week') {
      displayStartDate = moment(currentDate).startOf('week');
      displayEndDate = moment(currentDate).endOf('week');
    } else if (viewMode === 'day') { // Day view
      displayStartDate = moment(currentDate).startOf('day');
      displayEndDate = moment(currentDate).endOf('day');
    } else if (viewMode === 'agenda') { // Agenda view: from today for display
      displayStartDate = moment().startOf('day');
      displayEndDate = moment().add(6, 'months').endOf('day'); // display up to 6 months
    } else {
        displayStartDate = moment().startOf('day');
        displayEndDate = moment().endOf('day');
    }

    return normalizedEvents.filter(event =>
        moment(event.start_date).isSameOrBefore(displayEndDate) && moment(event.end_date).isSameOrAfter(displayStartDate)
    );

  }, [baseCalendarEvents, proposalTasks, proposalDeadlines, reviewDeadlines, complianceDeadlines, clientMeetings, currentDate, viewMode, organization?.id]);

  // Apply search and filtering
  const filteredEvents = React.useMemo(() => {
    return allEvents.filter(event => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          event.title?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query) ||
          event.assigned_to?.toLowerCase().includes(query) ||
          EVENT_TYPE_CONFIG[event.source_type]?.label.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Event type filter
      if (filters.eventType !== "all" && event.source_type !== filters.eventType) {
        return false;
      }

      // Assigned user filter
      if (filters.assignedUser !== "all" && event.assigned_to !== filters.assignedUser) {
        return false;
      }

      // Priority filter
      if (filters.priority !== "all" && event.priority !== filters.priority) {
        return false;
      }

      // Proposal filter
      if (filters.proposal !== "all" && event.proposal_id !== filters.proposal) {
        return false;
      }

      return true;
    });
  }, [allEvents, searchQuery, filters]);

  // Get unique values for filters
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const users = await base44.entities.User.filter({});
      return users.filter(u =>
        u.client_accesses?.some(access => access.organization_id === organization.id)
      );
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


  const createEventMutation = useMutation({
    mutationFn: async (data) => {
      const eventToSave = {
        ...data,
        recurrence_rule: data.is_recurring ? JSON.stringify(data.recurrence_rule) : null
      };
      // Remove is_recurring field as it's not part of the model
      delete eventToSave.is_recurring;
      // The event_type here is the internal one for CalendarEvent

      if (editingEvent && editingEvent.source_type === 'calendar_event' && !editingEvent.is_recurring_instance) {
        // When editing an existing calendar event (not an instance)
        return base44.entities.CalendarEvent.update(editingEvent.id, eventToSave);
      } else {
        // When creating a new event
        return base44.entities.CalendarEvent.create({
          ...eventToSave,
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
    mutationFn: async ({ id, start_date, end_date, source_type }) => {
      if (source_type === 'calendar_event') {
        return base44.entities.CalendarEvent.update(id, { start_date, end_date });
      } else if (source_type === 'proposal_task') {
        // For tasks, only due_date matters, map start_date to it
        return base44.entities.ProposalTask.update(id, { due_date: start_date });
      } else if (source_type === 'client_meeting') {
        // For client meetings, map start_date to scheduled_date
        // We need the original meeting to derive duration if only scheduled_date is stored
        const originalMeeting = clientMeetings.find(m => m.id === id);
        const originalDuration = originalMeeting ? moment(originalMeeting.end_date).diff(moment(originalMeeting.start_date)) : moment.duration(60, 'minutes');
        const newScheduledDate = start_date;
        const newEndDate = moment(start_date).add(originalDuration).toISOString();

        return base44.entities.ClientMeeting.update(id, {
          scheduled_date: newScheduledDate,
          // If we want to update the end date explicitly in the DB, we need a field for it
          // Otherwise, the duration might implicitly define it.
          // For now, we only pass scheduled_date as it's typically the draggable property.
        });
      }
      // Other types are not draggable
      return Promise.reject(new Error("Event type not draggable or update not implemented."));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(); // Invalidate all queries to refresh all event types
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
      event_type: "meeting", // Default for new calendar events
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
        end_date: "", // Default to empty string
        occurrence_count: 10
      }
    });
  };

  const handleEdit = (event) => {
    if (event.source_type === 'calendar_event') {
      // Find the base event if it's an instance, otherwise use the event itself
      const originalEventId = event.original_id || event.id;
      const eventToEdit = baseCalendarEvents.find(e => e.id === originalEventId) || event; // Ensure we get the original event's data

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
            end_date: "", // Default to empty string
            occurrence_count: 10
          }
        });
        setShowEventDialog(true);
      }
    } else {
      // For other event types, navigate to their source page if link_url exists
      if (event.link_url) {
        window.open(event.link_url, '_blank'); // Open in new tab
      }
    }
  };

  const handleDelete = (event) => {
    if (event.source_type === 'calendar_event' && event.can_edit) {
      const originalEventId = event.original_id || event.id;
      const eventToDelete = baseCalendarEvents.find(e => e.id === originalEventId); // Get the original event

      if (eventToDelete && eventToDelete.recurrence_rule) {
        // If it's a recurring event (either original or an instance of one)
        setDeleteRecurringOption(originalEventId); // Trigger the recurring delete dialog for the original event ID
      } else {
        // Non-recurring calendar event
        if (confirm('Are you sure you want to delete this event?')) {
          deleteEventMutation.mutate(event.id);
        }
      }
    } else {
      // Other event types cannot be deleted from the calendar directly
      alert(`To delete this ${EVENT_TYPE_CONFIG[event.source_type]?.label}, please go to its source page.`);
      if (event.link_url) {
          window.open(event.link_url, '_blank');
      }
    }
  };

  const handleSave = () => {
    if (eventData.title.trim()) {
      createEventMutation.mutate(eventData);
    }
  };

  const getEventTypeColor = (sourceType) => {
    return EVENT_TYPE_CONFIG[sourceType]?.color || EVENT_TYPE_CONFIG.calendar_event.color;
  };

  const getEventTypeBadgeColor = (sourceType) => {
    return EVENT_TYPE_CONFIG[sourceType]?.badgeColor || EVENT_TYPE_CONFIG.calendar_event.badgeColor;
  };

  // Calendar navigation
  const previousPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(moment(currentDate).subtract(1, 'month').toDate());
    } else if (viewMode === "week") {
      setCurrentDate(moment(currentDate).subtract(1, 'week').toDate());
    } else if (viewMode === "day") {
      setCurrentDate(moment(currentDate).subtract(1, 'day').toDate());
    }
    // Agenda view doesn't have previous/next buttons
  };

  const nextPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(moment(currentDate).add(1, 'month').toDate());
    } else if (viewMode === "week") {
      setCurrentDate(moment(currentDate).add(1, 'week').toDate());
    } else if (viewMode === "day") {
      setCurrentDate(moment(currentDate).add(1, 'day').toDate());
    }
    // Agenda view doesn't have previous/next buttons
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
    } else if (viewMode === "day") {
      return moment(currentDate).format('dddd, MMMM D, YYYY');
    } else if (viewMode === "agenda") {
      return "Upcoming Events"; // New title for agenda view
    }
    return ""; // Fallback
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
    const interval = rule.interval || 1;
    const intervalText = interval > 1 ? `every ${interval} ` : '';

    switch (rule.frequency) {
        case 'daily':
            desc += `${intervalText}day${interval > 1 ? 's' : ''}`;
            break;
        case 'weekly':
            desc += `${intervalText}week${interval > 1 ? 's' : ''}`;
            if (rule.byweekday && rule.byweekday.length > 0) {
              const days = rule.byweekday.map(d => moment().day(d).format('ddd')).join(', ');
              desc += ` on ${days}`; // More complex to render for specific days
            }
            break;
        case 'monthly':
            desc += `${intervalText}month${interval > 1 ? 's' : ''}`;
            if (rule.bymonthday) {
                desc += ` on day ${rule.bymonthday}`;
            } else if (rule.byweekday && rule.byweekday.length > 0) {
                // This is an oversimplification, actual rule can be complex (e.g., first Monday)
                const dayOfWeek = moment().day(rule.byweekday[0]).format('dddd');
                desc += ` on a ${dayOfWeek}`;
            }
            break;
        case 'yearly':
            desc += `${intervalText}year${interval > 1 ? 's' : ''}`;
            if (rule.bymonth && rule.bymonthday) {
              const monthName = moment().month(rule.bymonth - 1).format('MMMM');
              desc += ` on ${monthName} ${rule.bymonthday}`;
            }
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
    const event = filteredEvents.find(e => e.id === eventId);
    if (!event) return;

    if (!event.can_drag) {
      alert(`Cannot reschedule ${EVENT_TYPE_CONFIG[event.source_type]?.label || 'this item'}. Please edit it in its original location.`);
      return;
    }

    const destinationDate = result.destination.droppableId; // YYYY-MM-DD (or YYYY-MM-DD-HH for day view)
    const eventOriginalStart = moment(event.start_date);
    const eventOriginalEnd = moment(event.end_date);
    const duration = moment.duration(eventOriginalEnd.diff(eventOriginalStart));

    let newStart;
    if (viewMode === 'day' && destinationDate.includes('-')) {
        const [datePart, hourPart] = destinationDate.split('-');
        newStart = moment(datePart)
                       .hour(parseInt(hourPart, 10))
                       .minute(eventOriginalStart.minute())
                       .second(eventOriginalStart.second())
                       .millisecond(eventOriginalStart.millisecond());
    } else { // Month or Week view, or Day view if droppable is just the day
        newStart = moment(destinationDate)
                      .hour(eventOriginalStart.hour())
                      .minute(eventOriginalStart.minute())
                      .second(eventOriginalStart.second())
                      .millisecond(eventOriginalStart.millisecond());
    }

    const newEnd = moment(newStart).add(duration);

    updateEventMutation.mutate({
      id: event.original_id || eventId, // Always update the original entity ID
      start_date: newStart.toISOString(),
      end_date: newEnd.toISOString(),
      source_type: event.source_type
    });
  };

  // Event Popover Component - Refactored for reusability
  const EventPopover = ({ event, children }) => {
    const Icon = EVENT_TYPE_CONFIG[event.source_type]?.icon || CalendarIcon;

    return (
      <Popover>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
        <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-3">
            <div>
              <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Icon className="w-5 h-5" />
                {event.is_recurring_instance && <Repeat className="w-4 h-4 text-blue-600" />}
                {event.title}
              </h4>
              <Badge className={cn("mt-1", getEventTypeBadgeColor(event.source_type))}>
                {EVENT_TYPE_CONFIG[event.source_type]?.label}
              </Badge>
            </div>
            {event.description && (
              <p className="text-sm text-slate-600">{event.description}</p>
            )}
            {event.is_recurring_instance && event.source_type === 'calendar_event' && (
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-start gap-2">
                <Repeat className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{getRecurrenceDescription(baseCalendarEvents.find(e => e.id === event.original_id)?.recurrence_rule)}</span>
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
              {event.assigned_to && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4" />
                  {teamMembers.find(m => m.email === event.assigned_to)?.full_name || event.assigned_to}
                </div>
              )}
              {event.priority && (
                <div className="flex items-center gap-2">
                  <Badge variant={
                    event.priority === 'urgent' || event.priority === 'critical' ? 'destructive' :
                    event.priority === 'high' ? 'default' : 'secondary'
                  }>
                    {event.priority}
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button size="sm" onClick={() => handleEdit(event)} className="flex-1">
                {event.can_edit ? (event.is_recurring_instance ? "Edit Series" : "Edit Event") : "View"}
                {!event.can_edit && <ExternalLink className="w-3 h-3 ml-2" />}
              </Button>
              {event.can_edit && event.source_type === 'calendar_event' && (
                <Button size="sm" variant="destructive" onClick={() => handleDelete(event)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
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
      // Filtered events should already contain only relevant ones based on view date range
      // Further filter for specific day display
      return filteredEvents.filter(event => {
        const eventStartMoment = moment(event.start_date);
        const eventEndMoment = moment(event.end_date);
        // An event is for a day if it starts on that day, or spans across that day
        return (
            eventStartMoment.isSame(date, 'day') ||
            (eventStartMoment.isBefore(date, 'day') && eventEndMoment.isAfter(date, 'day'))
        );
      }).sort((a,b) => moment(a.start_date).unix() - moment(b.start_date).unix()); // Sort by start time
    };

    return (
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
                        {dayEvents.slice(0, 3).map((event, idx) => {
                          const EventIcon = EVENT_TYPE_CONFIG[event.source_type]?.icon || CalendarIcon;
                          return (
                            <Draggable key={event.id} draggableId={event.id} index={idx} isDragDisabled={!event.can_drag}>
                              {(provided, snapshot) => (
                                <EventPopover event={event}>
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={cn(
                                      "text-xs px-2 py-1.5 rounded-lg cursor-pointer shadow-sm hover:shadow-md transition-all bg-gradient-to-r text-white font-medium",
                                      getEventTypeColor(event.source_type),
                                      snapshot.isDragging && "rotate-3 scale-105 shadow-xl",
                                      !event.can_drag && "cursor-default opacity-80"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    <div className="truncate flex items-center gap-1">
                                      <EventIcon className="w-3 h-3 flex-shrink-0" />
                                      {event.is_recurring_instance && <Repeat className="w-3 h-3 flex-shrink-0" />}
                                      {moment(event.start_date).format('h:mm A')} {event.title}
                                    </div>
                                  </div>
                                </EventPopover>
                              )}
                            </Draggable>
                          );
                        })}
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
    );
  };

  // Week View
  const renderWeekView = () => {
    const startOfWeek = moment(currentDate).startOf('week');
    const days = Array.from({ length: 7 }, (_, i) => moment(startOfWeek).add(i, 'days'));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const getEventsForDayAndHour = (day, hour) => {
      // Filtered events should already contain only relevant ones based on view date range
      return filteredEvents.filter(event => {
        const eventStart = moment(event.start_date);
        const eventEnd = moment(event.end_date);
        const targetHourMoment = moment(day).hour(hour).startOf('hour');
        const nextHourMoment = moment(day).hour(hour + 1).startOf('hour');

        // An event falls into an hour slot if it:
        // 1. Starts within that hour
        // 2. Ends within that hour
        // 3. Spans across that entire hour
        return (
            (eventStart.isSameOrAfter(targetHourMoment) && eventStart.isBefore(nextHourMoment)) ||
            (eventEnd.isAfter(targetHourMoment) && eventEnd.isSameOrBefore(nextHourMoment)) ||
            (eventStart.isBefore(targetHourMoment) && eventEnd.isAfter(nextHourMoment))
        ) && moment(event.start_date).isSame(day, 'day'); // Also ensure it starts on this day for primary display
      }).sort((a,b) => moment(a.start_date).unix() - moment(b.start_date).unix());
    };

    return (
      <div className="border rounded-xl overflow-hidden">
        <div className="grid grid-cols-8 border-b bg-slate-50">
          <div className="p-3 border-r font-bold text-slate-700">Time</div>
          {days.map((day) => (
            <div key={day.format('YYYY-MM-DD')} className={cn(
              "p-3 text-center border-r",
              day.isSame(moment(), 'day') && "bg-blue-50"
            )}>
              <div className="text-xs font-semibold text-slate-500 uppercase">
                {day.format('ddd')}
              </div>
              <div className={cn(
                "text-lg font-bold mt-1",
                day.isSame(moment(), 'day') && "text-blue-600"
              )}>
                {day.format('D')}
              </div>
            </div>
          ))}
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b min-h-[80px]">
              <div className="p-3 text-right text-sm font-semibold text-slate-600 border-r bg-slate-50">
                {moment().hour(hour).format('h A')}
              </div>
              {days.map((day) => {
                const hourEvents = getEventsForDayAndHour(day, hour);
                const droppableId = day.format('YYYY-MM-DD'); // Each day is droppable
                return (
                    <Droppable key={`${droppableId}-${hour}`} droppableId={droppableId}>
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={cn(
                                    "p-2 border-r hover:bg-slate-50 transition-all",
                                    snapshot.isDraggingOver && "bg-blue-100"
                                )}
                            >
                                {hourEvents.map((event, idx) => (
                                    <Draggable key={event.id} draggableId={event.id} index={idx} isDragDisabled={!event.can_drag}>
                                        {(provided, snapshot) => (
                                            <EventPopover event={event}>
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={cn(
                                                        "p-2 rounded-lg cursor-pointer mb-2 shadow-md hover:shadow-xl transition-all bg-gradient-to-r text-white text-xs",
                                                        getEventTypeColor(event.source_type),
                                                        snapshot.isDragging && "rotate-2 scale-105 shadow-2xl",
                                                        !event.can_drag && "cursor-default opacity-90"
                                                    )}
                                                >
                                                    <div className="font-bold flex items-center gap-1 mb-1">
                                                        {EVENT_TYPE_CONFIG[event.source_type]?.icon && <EVENT_TYPE_CONFIG[event.source_type].icon className="w-3 h-3" />}
                                                        {event.is_recurring_instance && <Repeat className="w-3 h-3" />}
                                                        {event.title}
                                                    </div>
                                                    <div className="opacity-90">
                                                        {moment(event.start_date).format('h:mm A')}
                                                    </div>
                                                </div>
                                            </EventPopover>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Day View
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = filteredEvents.filter(event => {
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
        <div className="max-h-[600px] overflow-y-auto">
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

              const droppableId = moment(currentDate).format('YYYY-MM-DD');

              return (
                <React.Fragment key={hour}>
                  <div className="p-3 text-right text-sm font-semibold text-slate-600 border-b border-r bg-slate-50">
                    {moment().hour(hour).format('h A')}
                  </div>
                  <Droppable droppableId={droppableId + '-' + hour}> {/* Make hour slots droppable */}
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                            "p-2 border-b min-h-[80px] hover:bg-slate-50 transition-all",
                            snapshot.isDraggingOver && "bg-blue-100"
                        )}
                      >
                        {hourEvents.map((event, idx) => {
                          const EventIcon = EVENT_TYPE_CONFIG[event.source_type]?.icon || CalendarIcon;
                          return (
                            <Draggable key={event.id} draggableId={event.id} index={idx} isDragDisabled={!event.can_drag}>
                                {(provided, snapshot) => (
                                    <EventPopover event={event}>
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={cn(
                                                "p-3 rounded-lg cursor-pointer mb-2 shadow-md hover:shadow-xl transition-all bg-gradient-to-r text-white",
                                                getEventTypeColor(event.source_type),
                                                snapshot.isDragging && "rotate-2 scale-105 shadow-2xl",
                                                !event.can_drag && "cursor-default opacity-90"
                                            )}
                                        >
                                            <div className="font-bold text-sm flex items-center gap-1">
                                                <EventIcon className="w-3 h-3" />
                                                {event.is_recurring_instance && <Repeat className="w-3 h-3" />}
                                                {event.title}
                                            </div>
                                            <div className="text-xs opacity-90 mt-1">
                                                {moment(event.start_date).format('h:mm A')} - {moment(event.end_date).format('h:mm A')}
                                            </div>
                                        </div>
                                    </EventPopover>
                                )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Agenda View
  const renderAgendaView = () => {
    const sortedEvents = [...filteredEvents]
      .filter(event => moment(event.start_date).isSameOrAfter(moment(), 'day'))
      .sort((a, b) => moment(a.start_date).unix() - moment(b.start_date).unix());

    const groupedEvents = sortedEvents.reduce((acc, event) => {
      const dateKey = moment(event.start_date).format('YYYY-MM-DD');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        {Object.keys(groupedEvents).length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No upcoming events</p>
            <p className="text-sm">Create your first event to get started</p>
          </div>
        )}
        {Object.entries(groupedEvents).map(([dateKey, events]) => {
          const date = moment(dateKey);
          const isToday = date.isSame(moment(), 'day');
          const isTomorrow = date.isSame(moment().add(1, 'day'), 'day');

          return (
            <div key={dateKey}>
              <div className={cn(
                "sticky top-0 bg-white z-10 p-3 border-b-2 mb-3",
                isToday && "bg-blue-50 border-blue-400"
              )}>
                <h3 className="text-lg font-bold text-slate-900">
                  {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : date.format('dddd, MMMM D, YYYY')}
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    ({events.length} event{events.length !== 1 ? 's' : ''})
                  </span>
                </h3>
              </div>

              <div className="space-y-3">
                {events.map((event) => {
                  const Icon = EVENT_TYPE_CONFIG[event.source_type]?.icon || CalendarIcon;
                  return (
                    <Card key={event.id} className="border-none shadow-md hover:shadow-xl transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-r text-white shadow-md",
                              getEventTypeColor(event.source_type)
                            )}>
                              <Icon className="w-6 h-6" />
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                                  {event.is_recurring_instance && <Repeat className="w-4 h-4 text-blue-600" />}
                                  {event.title}
                                </h4>
                                <Badge className={cn("mt-1", getEventTypeBadgeColor(event.source_type))}>
                                  {EVENT_TYPE_CONFIG[event.source_type]?.label}
                                </Badge>
                              </div>
                              {event.priority && (
                                <Badge variant={
                                  event.priority === 'urgent' || event.priority === 'critical' ? 'destructive' :
                                  event.priority === 'high' ? 'default' : 'secondary'
                                }>
                                  {event.priority}
                                </Badge>
                              )}
                            </div>

                            {event.description && (
                              <p className="text-sm text-slate-600 mb-3">{event.description}</p>
                            )}

                            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {moment(event.start_date).format('h:mm A')} - {moment(event.end_date).format('h:mm A')}
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  {event.location}
                                </div>
                              )}
                              {event.meeting_link && (
                                <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                                  <Video className="w-4 h-4" />
                                  Join Meeting
                                </a>
                              )}
                              {event.assigned_to && (
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  {teamMembers.find(m => m.email === event.assigned_to)?.full_name || event.assigned_to}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 mt-3">
                              <Button size="sm" onClick={() => handleEdit(event)}>
                                {event.can_edit ? 'Edit' : 'View'}
                                {!event.can_edit && <ExternalLink className="w-3 h-3 ml-2" />}
                              </Button>
                              {event.can_edit && event.source_type === 'calendar_event' && (
                                <Button size="sm" variant="destructive" onClick={() => handleDelete(event)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
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

  const clearFilters = () => {
    setSearchQuery("");
    setFilters({
      eventType: "all",
      assignedUser: "all",
      priority: "all",
      proposal: "all"
    });
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== "all").length + (searchQuery ? 1 : 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Tabs defaultValue="calendar" className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Master Calendar</h1>
            <p className="text-slate-600">All your events, tasks, deadlines, and meetings in one place</p>
          </div>

          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="calendar">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="sync">
                <Settings className="w-4 h-4 mr-2" />
                Sync Settings
              </TabsTrigger>
            </TabsList>
            <Button onClick={() => { resetForm(); setShowEventDialog(true); }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
              <Plus className="w-5 h-5 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        <TabsContent value="calendar" className="space-y-6">
          {/* Search and Filters */}
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Search events, tasks, meetings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Filter Button */}
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="relative">
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                      {activeFilterCount > 0 && (
                        <Badge className="ml-2 bg-blue-600 text-white">
                          {activeFilterCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-slate-900">Filter Events</h4>
                        {activeFilterCount > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearFilters}>
                            Clear All
                          </Button>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Event Type</label>
                        <Select value={filters.eventType} onValueChange={(value) => setFilters({...filters, eventType: value})}>
                          <SelectTrigger>
                            <SelectValue /> {/* Removed placeholder */}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Assigned To</label>
                        <Select value={filters.assignedUser} onValueChange={(value) => setFilters({...filters, assignedUser: value})}>
                          <SelectTrigger>
                            <SelectValue /> {/* Removed placeholder */}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            {teamMembers.map(member => (
                              <SelectItem key={member.email} value={member.email}>
                                {member.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Priority</label>
                        <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
                          <SelectTrigger>
                            <SelectValue /> {/* Removed placeholder */}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Priorities</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Proposal</label>
                        <Select value={filters.proposal} onValueChange={(value) => setFilters({...filters, proposal: value})}>
                          <SelectTrigger>
                            <SelectValue /> {/* Removed placeholder */}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Proposals</SelectItem>
                            {proposalsList.map(proposal => (
                              <SelectItem key={proposal.id} value={proposal.id}>
                                {proposal.proposal_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Active Filters Display */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Search: {searchQuery}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                    </Badge>
                  )}
                  {filters.eventType !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Type: {EVENT_TYPE_CONFIG[filters.eventType]?.label}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({...filters, eventType: "all"})} />
                    </Badge>
                  )}
                  {filters.assignedUser !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Assigned: {teamMembers.find(m => m.email === filters.assignedUser)?.full_name || filters.assignedUser}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({...filters, assignedUser: "all"})} />
                    </Badge>
                  )}
                  {filters.priority !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Priority: {filters.priority}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({...filters, priority: "all"})} />
                    </Badge>
                  )}
                  {filters.proposal !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Proposal: {proposalsList.find(p => p.id === filters.proposal)?.proposal_name || filters.proposal}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({...filters, proposal: "all"})} />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Summary */}
          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Showing {filteredEvents.length} of {allEvents.length} events</span>
            </div>
          )}

          {/* Calendar Display */}
          {isLoadingData ? (
            <Skeleton className="h-[600px] w-full" />
          ) : (
            <Card className="border-none shadow-xl">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {viewMode !== 'agenda' && (
                      <>
                        <Button variant="outline" size="icon" onClick={previousPeriod} className="shadow-sm">
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <h2 className="text-2xl font-bold text-slate-900">
                          {getTitle()}
                        </h2>
                        <Button variant="outline" size="icon" onClick={nextPeriod} className="shadow-sm">
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                    {viewMode === 'agenda' && (
                      <h2 className="text-2xl font-bold text-slate-900">{getTitle()}</h2>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {viewMode !== 'agenda' && (
                      <Button variant="outline" onClick={today} className="shadow-sm">
                        Today
                      </Button>
                    )}
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
                      <Button // NEW: Agenda View Button
                        variant={viewMode === "agenda" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("agenda")}
                        className="gap-1"
                      >
                        <List className="w-4 h-4" />
                        <span className="hidden sm:inline">Agenda</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <DragDropContext onDragEnd={handleDragEnd}> {/* Moved DragDropContext here to wrap all views */}
                    {viewMode === "month" && renderMonthView()}
                    {viewMode === "week" && renderWeekView()}
                    {viewMode === "day" && renderDayView()}
                    {viewMode === "agenda" && renderAgendaView()}
                </DragDropContext>
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <h4 className="font-semibold text-slate-900 mb-3">Event Types</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(EVENT_TYPE_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div className={cn("w-4 h-4 rounded bg-gradient-to-r", config.color)} />
                      <Icon className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-700">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <CalendarSync organization={organization} />
        </TabsContent>
      </Tabs>

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
              <Select // Kept Shadcn Select as in original code
                value={eventData.event_type}
                onValueChange={(value) => setEventData({ ...eventData, event_type: value })}
              >
                <SelectTrigger>
                  <SelectValue /> {/* Removed placeholder */}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="proposal_deadline">Proposal Deadline</SelectItem>
                  <SelectItem value="task_deadline">Task Deadline</SelectItem>
                  <SelectItem value="review_session">Review Session</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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
                          <SelectValue /> {/* Removed placeholder */}
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
                        <SelectValue /> {/* Removed placeholder */}
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
              {editingEvent && editingEvent.source_type === 'calendar_event' && !editingEvent.is_recurring_instance && (
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(editingEvent)} // Use common handleDelete
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Event
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
              This is a recurring event. Deleting it will remove all future occurrences as well.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteRecurringOption(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteEventMutation.mutate(deleteRecurringOption);
                }}
              >
                Delete All Occurrences
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
