import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const EVENT_COLORS = {
  proposal_deadline: 'from-red-400 to-red-600',
  task_deadline: 'from-orange-400 to-orange-600',
  milestone: 'from-purple-400 to-purple-600',
  meeting: 'from-blue-400 to-blue-600',
  review_session: 'from-indigo-400 to-indigo-600',
  submission: 'from-green-400 to-green-600',
};

export default function MobileCalendarView({ organization, user }) {
  const [currentDate, setCurrentDate] = useState(moment());
  const [viewMode, setViewMode] = useState('day'); // 'day' or 'week'
  const [showFilters, setShowFilters] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['mobile-calendar', organization?.id, currentDate.format('YYYY-MM')],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const startOfMonth = currentDate.startOf('month').toISOString();
      const endOfMonth = currentDate.endOf('month').toISOString();
      
      const allEvents = await base44.entities.CalendarEvent.filter({
        organization_id: organization.id
      }, '-start_date');
      
      return allEvents.filter(e => {
        const eventDate = moment(e.start_date);
        return eventDate.isBetween(startOfMonth, endOfMonth, null, '[]');
      });
    },
    enabled: !!organization?.id,
  });

  const eventsForCurrentView = useMemo(() => {
    if (viewMode === 'day') {
      const dayStart = currentDate.clone().startOf('day');
      const dayEnd = currentDate.clone().endOf('day');
      
      return events.filter(e => {
        const eventStart = moment(e.start_date);
        return eventStart.isBetween(dayStart, dayEnd, null, '[]');
      }).sort((a, b) => moment(a.start_date).diff(moment(b.start_date)));
    } else {
      const weekStart = currentDate.clone().startOf('week');
      const weekEnd = currentDate.clone().endOf('week');
      
      return events.filter(e => {
        const eventStart = moment(e.start_date);
        return eventStart.isBetween(weekStart, weekEnd, null, '[]');
      });
    }
  }, [events, currentDate, viewMode]);

  const goToPrevious = () => {
    setCurrentDate(viewMode === 'day' 
      ? currentDate.clone().subtract(1, 'day')
      : currentDate.clone().subtract(1, 'week')
    );
  };

  const goToNext = () => {
    setCurrentDate(viewMode === 'day'
      ? currentDate.clone().add(1, 'day')
      : currentDate.clone().add(1, 'week')
    );
  };

  const goToToday = () => {
    setCurrentDate(moment());
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-slate-600 mt-3">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {viewMode === 'day' 
                ? currentDate.format('MMMM D, YYYY')
                : `Week of ${currentDate.clone().startOf('week').format('MMM D')}`
              }
            </h1>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevious}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="flex-1"
            >
              Today
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNext}
              className="flex-1"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
                className="text-xs h-8"
              >
                Day
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className="text-xs h-8"
              >
                Week
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-2 mt-3">
            <Badge className="bg-blue-600 text-white">
              {eventsForCurrentView.length} events
            </Badge>
            {eventsForCurrentView.filter(e => e.event_type === 'proposal_deadline').length > 0 && (
              <Badge className="bg-red-600 text-white">
                {eventsForCurrentView.filter(e => e.event_type === 'proposal_deadline').length} deadlines
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="p-4 space-y-3">
        {eventsForCurrentView.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No events</h3>
            <p className="text-sm text-slate-600">
              {viewMode === 'day' ? 'Nothing scheduled for today' : 'No events this week'}
            </p>
          </div>
        ) : (
          eventsForCurrentView.map(event => {
            const eventColor = EVENT_COLORS[event.event_type] || 'from-slate-400 to-slate-600';
            const startTime = moment(event.start_date);
            const endTime = event.end_date ? moment(event.end_date) : null;
            
            return (
              <Card key={event.id} className="border-2 border-slate-200 overflow-hidden">
                <div className={cn("h-2 bg-gradient-to-r", eventColor)} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900 flex-1">
                      {event.title}
                    </h3>
                    {event.all_day ? (
                      <Badge variant="outline" className="text-xs">All Day</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {startTime.format('h:mm A')}
                      </Badge>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 text-xs">
                    {!event.all_day && endTime && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {startTime.format('h:mm A')} - {endTime.format('h:mm A')}
                      </Badge>
                    )}
                    
                    {event.location && (
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </Badge>
                    )}

                    <Badge className={cn(
                      "capitalize",
                      event.priority === 'urgent' ? 'bg-red-600' :
                      event.priority === 'high' ? 'bg-orange-600' :
                      'bg-blue-600',
                      "text-white"
                    )}>
                      {event.event_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}