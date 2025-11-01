
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
  CheckSquare,
  FileText,
  Users,
  Shield,
  Briefcase,
  X,
  ExternalLink,
  Settings,
  List,
  Share2,
  Tag,
  Bell,
  Printer // Added Printer icon
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";
import { cn } from "@/lib/utils";
import CalendarSync from "../components/calendar/CalendarSync";
import CustomEventTypeManager from "../components/calendar/CustomEventTypeManager";
import NotificationPreferences from "../components/calendar/NotificationPreferences";
import TeamCalendarView from "../components/calendar/TeamCalendarView";
import CalendarSharing from "../components/calendar/CalendarSharing";
import QuickAddEvent from "../components/calendar/QuickAddEvent";
import AISchedulingAssistant from "../components/calendar/AISchedulingAssistant";
import EventResizeHandle from "../components/calendar/EventResizeHandle";
import ConflictDetector from "../components/calendar/ConflictDetector"; // New Import
import PrintableCalendar from "../components/calendar/PrintableCalendar"; // New Import
import TimeBlockingPanel from "../components/calendar/TimeBlockingPanel"; // New Import

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

// Event type configurations (static, built-in types)
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
    color: "from-orange-400 to-orange-600",
    badgeColor: "bg-orange-500 text-white",
    canDrag: true,
    canEdit: false
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
    icon: Briefcase,
    color: "from-amber-400 to-amber-600",
    badgeColor: "bg-amber-500 text-white",
    canDrag: false,
    canEdit: false
  },
  client_meeting: {
    label: "Client Meeting",
    icon: Users,
    color: "from-green-400 to-green-600",
    badgeColor: "bg-green-500 text-white",
    canDrag: true,
    canEdit: false
  }
};

// Map Lucide icon names to components for dynamic rendering
const iconMap = {
  CalendarIcon: CalendarIcon,
  Plus: Plus,
  Clock: Clock,
  MapPin: MapPin,
  Video: Video,
  Trash2: Trash2,
  ChevronLeft: ChevronLeft,
  ChevronRight: ChevronRight,
  LayoutGrid: LayoutGrid,
  Columns: Columns,
  Square: Square,
  Repeat: Repeat,
  AlertCircle: AlertCircle,
  Filter: Filter,
  Search: Search,
  CheckSquare: CheckSquare,
  FileText: FileText,
  Users: Users,
  Shield: Shield,
  Briefcase: Briefcase,
  X: X,
  ExternalLink: ExternalLink,
  Settings: Settings,
  List: List,
  Share2: Share2,
  Tag: Tag,
  Bell: Bell,
  Printer: Printer // Added to icon map
  // Add other Lucide icons as needed, especially if custom types can specify them
};

// Helper function to generate recurring event instances
const generateRecurringInstances = (event, startDate, endDate) => {
  if (!event.recurrence_rule) return [event];

  let recurrence;
  try {
    recurrence = typeof event.recurrence_rule === 'string'
      ? JSON.parse(event.recurrence_rule)
      : event.recurrence_rule;
  } catch (e) {
    console.error("Error parsing recurrence rule:", e);
    return [event];
  }

  if (!recurrence || !recurrence.frequency) return [event];

  const instances = [];
  const eventStartMoment = moment(event.start_date);
  const eventEndMoment = moment(event.end_date);
  const duration = eventEndMoment.diff(eventStartMoment);

  let current = moment(eventStartMoment);
  const viewStart = moment(startDate);
  const viewEnd = moment(endDate);

  let maxDate;
  if (recurrence.end_type === 'date' && recurrence.end_date) {
    maxDate = moment(recurrence.end_date).endOf('day');
  } else if (recurrence.end_type === 'count' && recurrence.occurrence_count) {
    // For count, we need to generate up to the count.
    // This isn't perfect for displaying in a calendar view that has a specific end,
    // but it ensures we don't infinitely loop.
    maxDate = moment().add(5, 'years'); // Arbitrary large end date if count is used without end_date
  } else {
    maxDate = moment().add(2, 'years'); // Default for 'never'
  }

  let count = 0;
  const maxOccurrences = recurrence.end_type === 'count' ? recurrence.occurrence_count : Infinity;

  while (current.isSameOrBefore(maxDate) && current.isSameOrBefore(viewEnd) && count < maxOccurrences) {
    if (current.isSameOrAfter(viewStart) && current.isSameOrBefore(viewEnd)) {
      instances.push({
        ...event,
        id: `${event.id}-${current.format('YYYY-MM-DD')}`, // Unique ID for this instance
        original_id: event.id, // Reference to the original recurring event
        start_date: current.toISOString(),
        end_date: moment(current).add(duration).toISOString(),
        is_recurring_instance: true
      });
    }

    // Move to the next recurrence
    if (recurrence.frequency === 'daily') {
      current.add(recurrence.interval || 1, 'days');
    } else if (recurrence.frequency === 'weekly') {
      current.add(recurrence.interval || 1, 'weeks');
    } else if (recurrence.frequency === 'monthly') {
      current.add(recurrence.interval || 1, 'months');
    } else if (recurrence.frequency === 'yearly') {
      current.add(recurrence.interval || 1, 'years');
    } else {
      break; // Unknown frequency, stop recurrence
    }

    count++;
  }

  return instances;
};

// Data normalization function
const normalizeEvent = (entity, sourceType, orgId) => {
  // Use the static EVENT_TYPE_CONFIG for normalization to ensure consistency
  // The merged config will be used for display properties like color/icon
  const config = EVENT_TYPE_CONFIG[sourceType];

  switch (sourceType) {
    case 'proposal_task':
      return {
        id: `task-${entity.id}`,
        original_id: entity.id,
        source_type: sourceType,
        title: entity.title,
        description: entity.description,
        start_date: entity.due_date,
        end_date: entity.due_date,
        event_type: 'task_deadline', // Internal event type for CalendarEvent model
        link_url: `/tasks`,
        color_category: config.color,
        priority: entity.priority,
        assigned_to: entity.assigned_to_email,
        proposal_id: entity.proposal_id,
        can_drag: config.canDrag,
        can_edit: config.canEdit
      };

    case 'proposal_deadline':
      return {
        id: `proposal-${entity.id}`,
        original_id: entity.id,
        source_type: sourceType,
        title: `📋 ${entity.proposal_name} - Deadline`,
        description: `Proposal: ${entity.proposal_name}`,
        start_date: entity.due_date,
        end_date: entity.due_date,
        event_type: 'proposal_deadline', // Internal event type
        link_url: `/proposal-builder?id=${entity.id}`,
        color_category: config.color,
        priority: 'high',
        proposal_id: entity.id,
        can_drag: config.canDrag,
        can_edit: config.canEdit
      };

    case 'review_deadline':
      return {
        id: `review-${entity.id}`,
        original_id: entity.id,
        source_type: sourceType,
        title: `🔍 ${entity.round_name} Review`,
        description: entity.description,
        start_date: entity.due_date,
        end_date: entity.due_date,
        event_type: 'review_session', // Internal event type
        link_url: `/proposal-builder?id=${entity.proposal_id}`,
        color_category: config.color,
        priority: 'high',
        proposal_id: entity.proposal_id,
        can_drag: config.canDrag,
        can_edit: config.canEdit
      };

    case 'compliance_due':
      return {
        id: `compliance-${entity.id}`,
        original_id: entity.id,
        source_type: sourceType,
        title: `⚖️ ${entity.requirement_title}`,
        description: entity.requirement_description,
        start_date: entity.due_date,
        end_date: entity.due_date,
        event_type: 'compliance_due', // Internal event type
        link_url: `/proposal-builder?id=${entity.proposal_id}`,
        color_category: config.color,
        priority: entity.risk_level,
        proposal_id: entity.proposal_id,
        can_drag: config.canDrag,
        can_edit: config.canEdit
      };

    case 'client_meeting':
      return {
        id: `meeting-${entity.id}`,
        original_id: entity.id,
        source_type: sourceType,
        title: `👥 ${entity.meeting_title}`,
        description: entity.agenda,
        start_date: entity.scheduled_date,
        end_date: moment(entity.scheduled_date).add(entity.duration_minutes || 60, 'minutes').toISOString(),
        event_type: 'meeting', // Internal event type
        link_url: `/clients`,
        color_category: config.color,
        location: entity.location,
        meeting_link: entity.meeting_link,
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
  const [editingEvent, setEditingEvent] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("month");
  const [deleteRecurringOption, setDeleteRecurringOption] = useState(null);

  // Quick Add state
  const [quickAddSlot, setQuickAddSlot] = useState(null);

  // Conflict detection state
  const [conflicts, setConflicts] = useState([]); // New state

  // Filtering and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    eventType: "all",
    assignedUser: "all",
    priority: "all",
    proposal: "all"
  });

  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    event_type: "meeting", // Default internal event type for new CalendarEvent
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
      end_date: "",
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

  // Multi-source data fetching
  const queries = useQueries({
    queries: [
      {
        queryKey: ['calendar-events', organization?.id],
        queryFn: async () => {
          if (!organization?.id) return [];
          return base44.entities.CalendarEvent.filter({ organization_id: organization.id }, 'start_date');
        },
        enabled: !!organization?.id,
      },
      {
        queryKey: ['proposal-tasks', organization?.id],
        queryFn: async () => {
          if (!organization?.id) return [];
          const proposals = await base44.entities.Proposal.filter({ organization_id: organization.id });
          const proposalIds = proposals.map(p => p.id);
          if (proposalIds.length === 0) return [];
          return base44.entities.ProposalTask.filter({
            proposal_id: { $in: proposalIds },
            due_date: { $ne: null }
          });
        },
        enabled: !!organization?.id,
      },
      {
        queryKey: ['proposal-deadlines', organization?.id],
        queryFn: async () => {
          if (!organization?.id) return [];
          return base44.entities.Proposal.filter({
            organization_id: organization.id,
            due_date: { $ne: null }
          });
        },
        enabled: !!organization?.id,
      },
      {
        queryKey: ['review-deadlines', organization?.id],
        queryFn: async () => {
          if (!organization?.id) return [];
          const proposals = await base44.entities.Proposal.filter({ organization_id: organization.id });
          const proposalIds = proposals.map(p => p.id);
          if (proposalIds.length === 0) return [];
          return base44.entities.ReviewRound.filter({
            proposal_id: { $in: proposalIds },
            due_date: { $ne: null }
          });
        },
        enabled: !!organization?.id,
      },
      {
        queryKey: ['compliance-deadlines', organization?.id],
        queryFn: async () => {
          if (!organization?.id) return [];
          const proposals = await base44.entities.Proposal.filter({ organization_id: organization.id });
          const proposalIds = proposals.map(p => p.id);
          if (proposalIds.length === 0) return [];
          return base44.entities.ComplianceRequirement.filter({
            proposal_id: { $in: proposalIds },
            due_date: { $ne: null }
          });
        },
        enabled: !!organization?.id,
      },
      {
        queryKey: ['client-meetings', organization?.id],
        queryFn: async () => {
          if (!organization?.id) return [];
          return base44.entities.ClientMeeting.filter({
            organization_id: organization.id,
            scheduled_date: { $ne: null }
          });
        },
        enabled: !!organization?.id,
      }
    ]
  });

  // Load custom event types
  const { data: customEventTypes = [] } = useQuery({
    queryKey: ['custom-event-types', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.CustomEventType.filter({
        organization_id: organization.id,
        is_active: true
      });
    },
    enabled: !!organization?.id,
  });

  const isLoading = queries.some(q => q.isLoading);

  // Merge custom event types into EVENT_TYPE_CONFIG dynamically for display
  const mergedEventTypeConfig = React.useMemo(() => {
    const merged = { ...EVENT_TYPE_CONFIG };

    customEventTypes.forEach(customType => {
      const IconComponent = customType.icon_name ? iconMap[customType.icon_name] || CalendarIcon : CalendarIcon;

      // Custom types create 'calendar_event' entries with their type_key as event_type
      // So here, we map the customType.type_key to a display configuration
      // The `source_type` of these events will still be `calendar_event`.
      // The `event_type` property of the `CalendarEvent` will hold the `type_key`.
      // We need to decide how to represent custom types in the merged config.
      // A common approach is to add them as new keys, or extend calendar_event's internal types.
      // For simplicity, let's treat `type_key` as a `source_type` for display purposes,
      // even if the underlying database `source_type` is `calendar_event`.
      // This means we might need to adjust how `source_type` is determined for display.

      // Option 1: Add custom types as new distinct 'source_type' keys for direct lookup
      // This requires events coming from `CalendarEvent` to specify their `type_key` as `source_type` if custom.
      // Current `allEvents` only sets `source_type: 'calendar_event'`.

      // Option 2 (more flexible):
      // Custom event types are just _additional internal types_ for `calendar_event`s.
      // So, `source_type` remains `calendar_event` for them.
      // We'll need a function to get display config that checks `source_type` first, then `event_type` if `source_type` is `calendar_event`.

      // Let's go with Option 1 for now, assuming `source_type` can dynamically be a `type_key`
      // This means that when a CalendarEvent has a custom `event_type`, we map its `source_type` to that `event_type`
      // for display config lookup. This is a hacky simplification for the current setup.
      // A cleaner solution would be to augment CalendarEvent objects with a derived `display_source_type` or similar.

      // For now, I'll update allEvents to consider event.event_type if source_type is calendar_event and it matches a custom type.
      merged[customType.type_key] = {
        label: customType.type_name,
        icon: IconComponent,
        color: customType.color,
        badgeColor: customType.badge_color,
        canDrag: customType.is_draggable,
        canEdit: customType.is_editable,
        isCustom: true // Mark as custom
      };
    });

    return merged;
  }, [customEventTypes]);


  // Normalize and combine all events
  const allEvents = React.useMemo(() => {
    if (!organization?.id) return [];

    const [calendarEvents, proposalTasks, proposalDeadlines, reviewDeadlines, complianceDeadlines, clientMeetings] = queries.map(q => q.data || []);

    // Get date range
    let startDate, endDate;
    if (viewMode === 'month') {
      startDate = moment(currentDate).startOf('month').subtract(7, 'days');
      endDate = moment(currentDate).endOf('month').add(7, 'days');
    } else if (viewMode === 'week') {
      startDate = moment(currentDate).startOf('week').subtract(1, 'day');
      endDate = moment(currentDate).endOf('week').add(1, 'day');
    } else if (viewMode === 'agenda') {
      startDate = moment();
      endDate = moment().add(30, 'days');
    } else { // Day view
      startDate = moment(currentDate).startOf('day');
      endDate = moment(currentDate).endOf('day');
    }

    const normalized = [];

    // Calendar events (with recurrence support)
    calendarEvents.forEach(event => {
      // Determine the effective source_type for display purposes based on custom types
      let effectiveSourceType = 'calendar_event';
      if (event.event_type && mergedEventTypeConfig[event.event_type]?.isCustom) {
        effectiveSourceType = event.event_type;
      }

      if (event.recurrence_rule) {
        const instances = generateRecurringInstances(event, startDate, endDate);
        instances.forEach(instance => {
          normalized.push({
            ...instance,
            source_type: effectiveSourceType, // Use effectiveSourceType for display properties
            color_category: mergedEventTypeConfig[effectiveSourceType]?.color || mergedEventTypeConfig.calendar_event.color,
            can_drag: mergedEventTypeConfig[effectiveSourceType]?.canDrag && !instance.is_recurring_instance,
            can_edit: mergedEventTypeConfig[effectiveSourceType]?.canEdit,
          });
        });
      } else {
        normalized.push({
          ...event,
          source_type: effectiveSourceType, // Use effectiveSourceType for display properties
          color_category: mergedEventTypeConfig[effectiveSourceType]?.color || mergedEventTypeConfig.calendar_event.color,
          can_drag: mergedEventTypeConfig[effectiveSourceType]?.canDrag,
          can_edit: mergedEventTypeConfig[effectiveSourceType]?.canEdit,
        });
      }
    });

    // Normalize other entity types
    // These still use the static EVENT_TYPE_CONFIG for normalization
    // Their display properties will be resolved by mergedEventTypeConfig later
    proposalTasks.forEach(task => {
      const norm = normalizeEvent(task, 'proposal_task', organization.id);
      if (norm) normalized.push(norm);
    });

    proposalDeadlines.forEach(proposal => {
      const norm = normalizeEvent(proposal, 'proposal_deadline', organization.id);
      if (norm) normalized.push(norm);
    });

    reviewDeadlines.forEach(review => {
      const norm = normalizeEvent(review, 'review_deadline', organization.id);
      if (norm) normalized.push(norm);
    });

    complianceDeadlines.forEach(compliance => {
      const norm = normalizeEvent(compliance, 'compliance_due', organization.id);
      if (norm) normalized.push(norm);
    });

    clientMeetings.forEach(meeting => {
      const norm = normalizeEvent(meeting, 'client_meeting', organization.id);
      if (norm) normalized.push(norm);
    });

    return normalized;
  }, [queries, currentDate, viewMode, organization?.id, mergedEventTypeConfig]); // Depend on mergedEventTypeConfig


  // Apply filters and search
  const filteredEvents = React.useMemo(() => {
    return allEvents.filter(event => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          event.title?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Event type filter
      // Filter based on the actual source_type, which might be a custom type key
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
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals-list', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({ organization_id: organization.id });
    },
    enabled: !!organization?.id,
  });

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: async (data) => {
      const eventToSave = {
        ...data,
        recurrence_rule: data.is_recurring ? JSON.stringify(data.recurrence_rule) : null
      };

      if (editingEvent) {
        // When editing, `eventData.id` (which is passed as `data.id` here) should be the ID
        // of the master event, as `eventData` is populated from `originalEvent` in `handleEdit`.
        return base44.entities.CalendarEvent.update(data.id, eventToSave);
      } else {
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
      setQuickAddSlot(null);
      setConflicts([]); // Added to clear conflicts on success
      resetForm();
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, start_date, end_date, source_type, original_id }) => {
      // The `id` here could be the instance ID. Need to use `original_id` for actual event update.
      const eventIdToUpdate = original_id || id;

      if (source_type === 'calendar_event' || mergedEventTypeConfig[source_type]?.isCustom) {
        // If it's a calendar_event or a custom type treated as a calendar_event
        // For recurring instances, we update the original event.
        // For single events, `id` is the original event's ID.
        return base44.entities.CalendarEvent.update(eventIdToUpdate, { start_date, end_date });
      } else if (source_type === 'proposal_task') {
        return base44.entities.ProposalTask.update(eventIdToUpdate, { due_date: start_date });
      } else if (source_type === 'client_meeting') {
        return base44.entities.ClientMeeting.update(eventIdToUpdate, { scheduled_date: start_date });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.CalendarEvent.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setDeleteRecurringOption(null);
    },
  });

  const resetForm = () => {
    setEventData({
      title: "",
      description: "",
      event_type: "meeting", // Reset to default internal type
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
        end_date: "",
        occurrence_count: 10
      }
    });
  };

  const handleEdit = (event) => {
    // Determine the original event ID for recurrence handling
    const originalId = event.original_id || event.id;
    // Find the original event from the fetched calendar events to get its recurrence rule, etc.
    const [allCalendarEvents] = queries.map(q => q.data || []);
    const originalEvent = allCalendarEvents?.find(e => e.id === originalId);

    // Only allow editing if the event configuration permits it
    const config = mergedEventTypeConfig[event.source_type];
    if (!config || !config.canEdit) {
      if (event.link_url) {
        window.open(event.link_url, '_blank'); // Open in new tab for external links
      } else {
        alert(`This ${config?.label || 'event'} cannot be edited here.`);
      }
      return;
    }

    if (config.isCustom || event.source_type === 'calendar_event') {
      const eventToEdit = originalEvent || event; // Use original event data for recurrence details
      const recurrence = eventToEdit.recurrence_rule
        ? (typeof eventToEdit.recurrence_rule === 'string'
          ? JSON.parse(eventToEdit.recurrence_rule)
          : eventToEdit.recurrence_rule)
        : null;

      setEditingEvent(event); // Store the instance that was clicked for deletion logic etc.
      setEventData({
        ...eventToEdit,
        start_date: eventToEdit.start_date ? moment(eventToEdit.start_date).format('YYYY-MM-DDTHH:mm') : new Date().toISOString().slice(0, 16),
        end_date: eventToEdit.end_date ? moment(eventToEdit.end_date).format('YYYY-MM-DDTHH:mm') : new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        is_recurring: !!recurrence,
        recurrence_rule: recurrence || {
          frequency: "daily",
          interval: 1,
          end_type: "never",
          end_date: "",
          occurrence_count: 10
        },
        event_type: eventToEdit.event_type || 'meeting' // Ensure event_type is set for the dialog
      });
      setShowEventDialog(true);
    } else {
      // Navigate to source for non-editable system events
      if (event.link_url) {
        window.open(event.link_url, '_blank');
      }
    }
  };

  const handleDelete = (event) => {
    const config = mergedEventTypeConfig[event.source_type];
    if (!config || !config.canEdit) {
      alert(`This ${config?.label || 'event'} cannot be deleted here.`);
      return;
    }

    if (config.isCustom || event.source_type === 'calendar_event') {
      const isRecurringInstance = event.is_recurring_instance;
      const originalId = event.original_id || event.id;

      if (isRecurringInstance) {
        setDeleteRecurringOption(originalId); // Show dialog for recurring options
      } else if (event.recurrence_rule) {
        setDeleteRecurringOption(event.id); // Show dialog for recurring options
      } else {
        if (confirm('Delete this event?')) {
          deleteEventMutation.mutate(event.id);
        }
      }
    }
  };

  const handleSave = () => {
    if (eventData.title.trim()) {
      // Check for conflicts before saving
      const proposedStart = moment(eventData.start_date);
      const proposedEnd = moment(eventData.end_date);

      const eventConflicts = allEvents.filter(event => {
        // Skip the event being edited from conflict detection if it's the same event
        // We compare against original_id for recurring instances, or id for single events
        const isEditingThisEvent = editingEvent && (
          (event.id === editingEvent.id && !editingEvent.is_recurring_instance) ||
          (event.original_id === editingEvent.original_id && event.source_type === editingEvent.source_type)
        );
        if (isEditingThisEvent) return false;

        const eventStart = moment(event.start_date);
        const eventEnd = moment(event.end_date);

        return proposedStart.isBefore(eventEnd) && proposedEnd.isAfter(eventStart);
      });

      if (eventConflicts.length > 0) {
        setConflicts(eventConflicts);
      } else {
        createEventMutation.mutate(eventData);
      }
    }
  };

  const handleConflictResolution = (resolution) => {
    setEventData({
      ...eventData,
      start_date: resolution.new_start.format('YYYY-MM-DDTHH:mm'),
      end_date: resolution.new_end.format('YYYY-MM-DDTHH:mm')
    });
    setConflicts([]); // Clear conflicts after resolving
    // Optionally, you might trigger the save again here if the resolution is to save with new times
    // For now, it just updates the form fields. User clicks 'Save' again.
  };

  const handleQuickAdd = (quickEventData) => {
    // This function needs to include organization and user data for the mutation
    createEventMutation.mutate({
      ...quickEventData,
      organization_id: organization.id,
      created_by_email: user.email,
      created_by_name: user.full_name
    });
  };

  const getEventTypeColor = (sourceType) => {
    return mergedEventTypeConfig[sourceType]?.color || mergedEventTypeConfig.calendar_event.color;
  };

  const getEventTypeBadgeColor = (sourceType) => {
    return mergedEventTypeConfig[sourceType]?.badgeColor || mergedEventTypeConfig.calendar_event.badgeColor;
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
    } else if (viewMode === "agenda") {
      return "Upcoming Events";
    } else {
      return moment(currentDate).format('dddd, MMMM D, YYYY');
    }
  };

  const getRecurrenceDescription = (recurrence) => {
    if (!recurrence) return null;
    const rule = typeof recurrence === 'string' ? JSON.parse(recurrence) : recurrence;

    let desc = `Repeats ${rule.frequency}`;
    if (rule.interval > 1) {
      desc += ` every ${rule.interval} ${rule.frequency === 'daily' ? 'days' : rule.frequency === 'weekly' ? 'weeks' : rule.frequency === 'monthly' ? 'months' : 'years'}`;
    }

    if (rule.end_type === 'date' && rule.end_date) {
      desc += `, until ${moment(rule.end_date).format('MMM D, YYYY')}`;
    } else if (rule.end_type === 'count') {
      desc += `, ${rule.occurrence_count} times`;
    }

    return desc;
  };

  // Drag and drop handler
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const eventId = result.draggableId;
    const event = filteredEvents.find(e => e.id === eventId);
    if (!event) return;

    // Check if the event's actual source type (not just the derived display source type) can be dragged
    // The `can_drag` property on `event` from `allEvents` already uses mergedEventTypeConfig
    if (!event.can_drag) {
      alert(`Cannot reschedule ${mergedEventTypeConfig[event.source_type]?.label || 'this item'}. Please edit it in its original location.`);
      return;
    }

    const destinationDate = result.destination.droppableId;
    const [year, month, day] = destinationDate.split('-').map(Number);

    const eventStart = moment(event.start_date);
    const eventEnd = moment(event.end_date);
    const duration = eventEnd.diff(eventStart);

    const newStart = moment({ year, month: month - 1, day, hour: eventStart.hour(), minute: eventStart.minute() });
    const newEnd = moment(newStart).add(duration);

    // Pass original_id and source_type to mutation for correct entity update
    updateEventMutation.mutate({
      id: event.original_id || event.id,
      start_date: newStart.toISOString(),
      end_date: newEnd.toISOString(),
      source_type: event.source_type, // Use the effective source_type
      original_id: event.original_id || event.id // Pass original_id for calendar events
    });
  };

  // Event Popover Component
  const EventPopover = ({ event, children }) => {
    const Icon = mergedEventTypeConfig[event.source_type]?.icon || CalendarIcon;

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
                {mergedEventTypeConfig[event.source_type]?.label || 'Event'}
              </Badge>
            </div>
            {event.description && (
              <p className="text-sm text-slate-600">{event.description}</p>
            )}
            {event.is_recurring_instance && (mergedEventTypeConfig[event.source_type]?.isCustom || event.source_type === 'calendar_event') && (
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded flex items-start gap-2">
                <Repeat className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{getRecurrenceDescription(queries[0].data?.find(e => e.id === event.original_id)?.recurrence_rule)}</span>
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
                  {event.assigned_to}
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
                {event.can_edit ? (event.is_recurring_instance ? 'Edit Series' : 'Edit') : 'View'}
                {!event.can_edit && <ExternalLink className="w-3 h-3 ml-2" />}
              </Button>
              {event.can_edit && (mergedEventTypeConfig[event.source_type]?.isCustom || event.source_type === 'calendar_event') && (
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
      return filteredEvents.filter(event => {
        const eventStart = moment(event.start_date).format('YYYY-MM-DD');
        const eventEnd = moment(event.end_date).format('YYYY-MM-DD');
        return eventStart <= dateStr && eventEnd >= dateStr;
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
            const isQuickAddActive = quickAddSlot?.date === droppableId;

            return (
              <Droppable key={index} droppableId={droppableId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[140px] border-b border-r p-2 transition-all relative",
                      !day && "bg-slate-50",
                      isToday(day) && "bg-gradient-to-br from-blue-50 to-indigo-50 ring-2 ring-blue-400 ring-inset",
                      snapshot.isDraggingOver && "bg-blue-100"
                    )}
                    onDoubleClick={() => {
                      if (day) {
                        const dateStr = moment(currentDate).date(day).format('YYYY-MM-DD');
                        setQuickAddSlot({ date: dateStr, time: "09:00" });
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

                        {isQuickAddActive ? (
                          <div className="absolute top-12 left-2 right-2 z-20">
                            <QuickAddEvent
                              initialDate={droppableId}
                              initialTime={quickAddSlot.time}
                              customEventTypes={customEventTypes}
                              onSave={handleQuickAdd}
                              onCancel={() => setQuickAddSlot(null)}
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map((event, idx) => {
                              const Icon = mergedEventTypeConfig[event.source_type]?.icon || CalendarIcon;
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
                                          !event.can_drag && "cursor-default opacity-90"
                                        )}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                        }}
                                      >
                                        <div className="truncate flex items-center gap-1">
                                          <Icon className="w-3 h-3 flex-shrink-0" />
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
                        )}
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

  // Week View with resize and quick add
  const renderWeekView = () => {
    const startOfWeek = moment(currentDate).startOf('week');
    const days = Array.from({ length: 7 }, (_, i) => moment(startOfWeek).add(i, 'days'));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const getEventsForDayAndHour = (day, hour) => {
      return filteredEvents.filter(event => {
        const eventStart = moment(event.start_date);
        const eventEnd = moment(event.end_date);
        const targetHour = moment(day).hour(hour).startOf('hour');
        const nextHour = moment(day).hour(hour + 1).startOf('hour');

        return (
          (eventStart.isBetween(targetHour, nextHour, 'minute', '[)')) ||
          (eventEnd.isBetween(targetHour, nextHour, 'minute', '(]')) ||
          (eventStart.isBefore(targetHour) && eventEnd.isAfter(nextHour))
        );
      });
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
                const dateStr = day.format('YYYY-MM-DD');
                const timeStr = moment().hour(hour).format('HH:mm');
                const isQuickAddActive = quickAddSlot?.date === dateStr && quickAddSlot?.time === timeStr;

                return (
                  <div
                    key={day.format('YYYY-MM-DD')}
                    className="p-2 border-r hover:bg-slate-50 transition-all relative"
                    onDoubleClick={() => {
                      setQuickAddSlot({ date: dateStr, time: timeStr });
                    }}
                  >
                    {isQuickAddActive ? (
                      <div className="absolute inset-0 z-20 p-2">
                        <QuickAddEvent
                          initialDate={dateStr}
                          initialTime={timeStr}
                          customEventTypes={customEventTypes}
                          onSave={handleQuickAdd}
                          onCancel={() => setQuickAddSlot(null)}
                        />
                      </div>
                    ) : (
                      hourEvents.map((event) => {
                        const Icon = mergedEventTypeConfig[event.source_type]?.icon || CalendarIcon;
                        return (
                          <EventPopover key={event.id} event={event}>
                            <div className={cn(
                              "p-2 rounded-lg cursor-pointer mb-2 shadow-md hover:shadow-xl transition-all bg-gradient-to-r text-white text-xs relative",
                              getEventTypeColor(event.source_type)
                            )}>
                              <div className="font-bold flex items-center gap-1 mb-1">
                                <Icon className="w-3 h-3" />
                                {event.is_recurring_instance && <Repeat className="w-3 h-3" />}
                                {event.title}
                              </div>
                              <div className="opacity-90">
                                {moment(event.start_date).format('h:mm A')}
                              </div>
                              <EventResizeHandle
                                event={event}
                                position="bottom"
                                onResize={(resizeData) => updateEventMutation.mutate(resizeData)}
                                disabled={!event.can_edit || event.is_recurring_instance}
                              />
                            </div>
                          </EventPopover>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Day View with resize and quick add
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = filteredEvents.filter(event => {
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
        <div className="max-h-[600px] overflow-y-auto">
          <div className="grid grid-cols-[100px_1fr]">
            {hours.map((hour) => {
              const hourEvents = dayEvents.filter(event => {
                const eventStart = moment(event.start_date);
                const eventEnd = moment(event.end_date);
                const targetHour = moment(currentDate).hour(hour).startOf('hour');
                const nextHour = moment(currentDate).hour(hour + 1).startOf('hour');

                return (
                  (eventStart.isBetween(targetHour, nextHour, 'minute', '[)')) ||
                  (eventEnd.isBetween(targetHour, nextHour, 'minute', '(]')) ||
                  (eventStart.isBefore(targetHour) && eventEnd.isAfter(nextHour))
                );
              });

              const dateStr = moment(currentDate).format('YYYY-MM-DD');
              const timeStr = moment().hour(hour).format('HH:mm');
              const isQuickAddActive = quickAddSlot?.date === dateStr && quickAddSlot?.time === timeStr;

              return (
                <React.Fragment key={hour}>
                  <div className="p-3 text-right text-sm font-semibold text-slate-600 border-b border-r bg-slate-50">
                    {moment().hour(hour).format('h A')}
                  </div>
                  <div
                    className="p-2 border-b min-h-[80px] hover:bg-slate-50 transition-all relative"
                    onDoubleClick={() => {
                      setQuickAddSlot({ date: dateStr, time: timeStr });
                    }}
                  >
                    {isQuickAddActive ? (
                      <div className="absolute inset-0 z-20 p-2">
                        <QuickAddEvent
                          initialDate={dateStr}
                          initialTime={timeStr}
                          customEventTypes={customEventTypes}
                          onSave={handleQuickAdd}
                          onCancel={() => setQuickAddSlot(null)}
                        />
                      </div>
                    ) : (
                      hourEvents.map((event) => {
                        const Icon = mergedEventTypeConfig[event.source_type]?.icon || CalendarIcon;
                        return (
                          <EventPopover key={event.id} event={event}>
                            <div className={cn(
                              "p-3 rounded-lg cursor-pointer mb-2 shadow-md hover:shadow-xl transition-all bg-gradient-to-r text-white relative",
                              getEventTypeColor(event.source_type)
                            )}>
                              <div className="font-bold text-sm flex items-center gap-1 mb-1">
                                <Icon className="w-3 h-3" />
                                {event.is_recurring_instance && <Repeat className="w-3 h-3" />}
                                {event.title}
                              </div>
                              <div className="text-xs opacity-90">
                                {moment(event.start_date).format('h:mm A')} - {moment(event.end_date).format('h:mm A')}
                              </div>
                              <EventResizeHandle
                                event={event}
                                position="bottom"
                                onResize={(resizeData) => updateEventMutation.mutate(resizeData)}
                                disabled={!event.can_edit || event.is_recurring_instance}
                              />
                            </div>
                          </EventPopover>
                        );
                      })
                    )}
                  </div>
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
                  const Icon = mergedEventTypeConfig[event.source_type]?.icon || CalendarIcon;
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
                                  {mergedEventTypeConfig[event.source_type]?.label || 'Event'}
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
                                  {event.assigned_to}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 mt-3">
                              <Button size="sm" onClick={() => handleEdit(event)}>
                                {event.can_edit ? 'Edit' : 'View'}
                                {!event.can_edit && <ExternalLink className="w-3 h-3 ml-2" />}
                              </Button>
                              {event.can_edit && (mergedEventTypeConfig[event.source_type]?.isCustom || event.source_type === 'calendar_event') && (
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

        {Object.keys(groupedEvents).length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium">No upcoming events</p>
            <p className="text-sm">Create your first event to get started</p>
          </div>
        )}
      </div>
    );
  };

  // Update the event dialog to include custom types in the dropdown
  const renderEventTypeOptions = () => {
    // These are the *internal* event_type fields for user-created CalendarEvents
    const systemCalendarEventTypes = [
      { value: "meeting", label: "Meeting" },
      { value: "task_deadline", label: "Task Deadline" },
      { value: "proposal_deadline", label: "Proposal Deadline" },
      { value: "review_session", label: "Review Session" },
      { value: "milestone", label: "Milestone" },
      { value: "other", label: "Other" },
    ];

    return (
      <>
        <optgroup label="System Event Types">
          {systemCalendarEventTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </optgroup>
        {customEventTypes.length > 0 && (
          <optgroup label="Custom Event Types">
            {customEventTypes.map(type => (
              <option key={type.type_key} value={type.type_key}>
                {type.type_name}
              </option>
            ))}
          </optgroup>
        )}
      </>
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

          <div className="flex items-center gap-2 flex-wrap"> {/* Added flex-wrap for responsiveness */}
            <TabsList>
              <TabsTrigger value="calendar">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="team">
                <Users className="w-4 h-4 mr-2" />
                Team View
              </TabsTrigger>
              <TabsTrigger value="sharing">
                <Share2 className="w-4 h-4 mr-2" />
                Sharing
              </TabsTrigger>
              <TabsTrigger value="types">
                <Tag className="w-4 h-4 mr-2" />
                Event Types
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="sync">
                <Settings className="w-4 h-4 mr-2" />
                Sync
              </TabsTrigger>
            </TabsList>

            <TimeBlockingPanel
              organization={organization}
              user={user}
              trigger={
                <Button variant="outline" className="border-purple-200 hover:bg-purple-50">
                  <Clock className="w-4 h-4 mr-2" />
                  Block Time
                </Button>
              }
            />

            <PrintableCalendar
              events={filteredEvents}
              viewMode={viewMode}
              currentDate={currentDate}
              organization={organization}
              trigger={
                <Button variant="outline">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              }
            />

            <AISchedulingAssistant
              organization={organization}
              user={user}
              onEventScheduled={() => {
                queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
              }}
            />

            <Button onClick={() => { resetForm(); setShowEventDialog(true); }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
              <Plus className="w-5 h-5 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        <TabsContent value="calendar" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
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
                        <Select value={filters.eventType} onValueChange={(value) => setFilters({ ...filters, eventType: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {Object.entries(mergedEventTypeConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                {config.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">Assigned To</label>
                        <Select value={filters.assignedUser} onValueChange={(value) => setFilters({ ...filters, assignedUser: value })}>
                          <SelectTrigger>
                            <SelectValue />
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
                        <Select value={filters.priority} onValueChange={(value) => setFilters({ ...filters, priority: value })}>
                          <SelectTrigger>
                            <SelectValue />
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
                        <Select value={filters.proposal} onValueChange={(value) => setFilters({ ...filters, proposal: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Proposals</SelectItem>
                            {proposals.map(proposal => (
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
                      Type: {mergedEventTypeConfig[filters.eventType]?.label || filters.eventType}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, eventType: "all" })} />
                    </Badge>
                  )}
                  {filters.assignedUser !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Assigned: {teamMembers.find(m => m.email === filters.assignedUser)?.full_name}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, assignedUser: "all" })} />
                    </Badge>
                  )}
                  {filters.priority !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Priority: {filters.priority}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, priority: "all" })} />
                    </Badge>
                  )}
                  {filters.proposal !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Proposal: {proposals.find(p => p.id === filters.proposal)?.proposal_name}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters({ ...filters, proposal: "all" })} />
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Showing {filteredEvents.length} of {allEvents.length} events</span>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <strong>💡 Pro Tip:</strong> Double-click any empty cell in Month, Week or Day view to quick-add an event. Drag the bottom edge of events in Week/Day view to resize them!
          </div>

          {isLoading ? (
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
                      <Button
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
                {viewMode === "month" && renderMonthView()}
                {viewMode === "week" && renderWeekView()}
                {viewMode === "day" && renderDayView()}
                {viewMode === "agenda" && renderAgendaView()}
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <h4 className="font-semibold text-slate-900 mb-3">Event Types Legend</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(mergedEventTypeConfig).map(([key, config]) => {
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

        <TabsContent value="team">
          <TeamCalendarView organization={organization} currentUser={user} />
        </TabsContent>

        <TabsContent value="sharing">
          <CalendarSharing organization={organization} user={user} />
        </TabsContent>

        <TabsContent value="types">
          <CustomEventTypeManager organization={organization} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationPreferences user={user} organization={organization} />
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
          setConflicts([]); // Added to clear conflicts when closing dialog
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Add New Event'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {conflicts.length > 0 && (
              <ConflictDetector
                proposedEvent={eventData}
                existingEvents={conflicts}
                onResolve={handleConflictResolution}
                onProceed={() => createEventMutation.mutate(eventData)}
              />
            )}

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
                {renderEventTypeOptions()}
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
                          <SelectValue />
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
                        <SelectValue />
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
              {editingEvent && (mergedEventTypeConfig[editingEvent.source_type]?.canEdit || editingEvent.source_type === 'calendar_event') && !editingEvent.is_recurring_instance && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Delete this event?')) {
                      // For a single event or the master of a recurring series (if not instance), use its ID
                      deleteEventMutation.mutate(editingEvent.original_id || editingEvent.id);
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
                  {createEventMutation.isPending ? 'Saving...' : (conflicts.length > 0 ? 'Save Anyway' : (editingEvent ? 'Update Event' : 'Add Event'))}
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
