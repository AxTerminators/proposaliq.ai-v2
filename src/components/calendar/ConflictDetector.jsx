import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Clock, Calendar, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function ConflictDetector({ 
  proposedEvent, 
  existingEvents, 
  onResolve,
  showResolutions = true 
}) {
  const conflicts = existingEvents.filter(event => {
    const proposedStart = moment(proposedEvent.start_date);
    const proposedEnd = moment(proposedEvent.end_date);
    const eventStart = moment(event.start_date);
    const eventEnd = moment(event.end_date);

    // Check for overlap
    return (
      proposedStart.isBefore(eventEnd) && proposedEnd.isAfter(eventStart)
    );
  });

  if (conflicts.length === 0) return null;

  const generateResolutions = () => {
    const proposedStart = moment(proposedEvent.start_date);
    const proposedEnd = moment(proposedEvent.end_date);
    const duration = proposedEnd.diff(proposedStart);

    const resolutions = [];

    // Find the earliest conflict end time
    const latestConflictEnd = moment.max(conflicts.map(c => moment(c.end_date)));
    
    // Resolution 1: Schedule after conflicts
    resolutions.push({
      type: "after",
      label: "Schedule After Conflicts",
      new_start: latestConflictEnd.clone().add(15, 'minutes'),
      new_end: latestConflictEnd.clone().add(15, 'minutes').add(duration),
      description: `Start at ${latestConflictEnd.clone().add(15, 'minutes').format('h:mm A')}`
    });

    // Resolution 2: Schedule before conflicts
    const earliestConflictStart = moment.min(conflicts.map(c => moment(c.start_date)));
    const beforeStart = earliestConflictStart.clone().subtract(duration).subtract(15, 'minutes');
    if (beforeStart.isAfter(moment())) {
      resolutions.push({
        type: "before",
        label: "Schedule Before Conflicts",
        new_start: beforeStart,
        new_end: earliestConflictStart.clone().subtract(15, 'minutes'),
        description: `Start at ${beforeStart.format('h:mm A')}`
      });
    }

    // Resolution 3: Next available day at same time
    let nextDay = proposedStart.clone().add(1, 'day');
    let attempts = 0;
    while (attempts < 7) {
      const testStart = nextDay.clone();
      const testEnd = testStart.clone().add(duration);
      
      const hasConflict = existingEvents.some(event => {
        const eventStart = moment(event.start_date);
        const eventEnd = moment(event.end_date);
        return testStart.isBefore(eventEnd) && testEnd.isAfter(eventStart);
      });

      if (!hasConflict) {
        resolutions.push({
          type: "next_day",
          label: "Next Available Day",
          new_start: testStart,
          new_end: testEnd,
          description: `${testStart.format('dddd, MMM D [at] h:mm A')}`
        });
        break;
      }

      nextDay.add(1, 'day');
      attempts++;
    }

    return resolutions;
  };

  const resolutions = showResolutions ? generateResolutions() : [];

  return (
    <Card className="border-2 border-amber-500 bg-amber-50/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-amber-900 mb-1">
              {conflicts.length} Scheduling Conflict{conflicts.length > 1 ? 's' : ''} Detected
            </h4>
            <p className="text-sm text-amber-800">
              This event overlaps with existing items on your calendar
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-amber-900 uppercase">Conflicting Events:</p>
          {conflicts.map((conflict, index) => (
            <div key={index} className="flex items-start gap-2 text-sm bg-white rounded-lg p-2 border border-amber-200">
              <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-slate-900">{conflict.title}</p>
                <p className="text-xs text-slate-600">
                  {moment(conflict.start_date).format('MMM D, h:mm A')} - {moment(conflict.end_date).format('h:mm A')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {showResolutions && resolutions.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-amber-200">
            <p className="text-xs font-semibold text-amber-900 uppercase">Suggested Resolutions:</p>
            <div className="space-y-2">
              {resolutions.map((resolution, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left bg-white hover:bg-amber-50"
                  onClick={() => onResolve(resolution)}
                >
                  <Edit3 className="w-3 h-3 mr-2 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-xs">{resolution.label}</div>
                    <div className="text-xs text-slate-500">{resolution.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}