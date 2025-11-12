import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle2,
  FileText,
  Users,
  Send,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const EVENT_TYPES = {
  'workspace_created': { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
  'user_added': { icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  'resource_shared': { icon: Send, color: 'text-green-600', bg: 'bg-green-50' },
  'proposal_created': { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  'proposal_won': { icon: Award, color: 'text-green-600', bg: 'bg-green-50' },
};

/**
 * Client Engagement Timeline
 * Visual timeline of key events in client relationship
 */
export default function ClientEngagementTimeline({ clientOrganization, events = [] }) {
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Engagement Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No activity recorded yet
          </div>
        ) : (
          <div className="relative space-y-4">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

            {sortedEvents.map((event, idx) => {
              const eventType = EVENT_TYPES[event.type] || EVENT_TYPES['proposal_created'];
              const Icon = eventType.icon;

              return (
                <div key={idx} className="relative flex gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                    eventType.bg
                  )}>
                    <Icon className={cn("w-4 h-4", eventType.color)} />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="bg-white border rounded-lg p-3 shadow-sm">
                      <p className="font-semibold text-slate-900 text-sm">
                        {event.title}
                      </p>
                      {event.description && (
                        <p className="text-sm text-slate-600 mt-1">
                          {event.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        {moment(event.date).format('MMM D, YYYY h:mm A')} • {moment(event.date).fromNow()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}