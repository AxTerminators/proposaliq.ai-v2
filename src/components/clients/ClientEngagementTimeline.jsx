import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CheckCircle2,
  FileText,
  Users,
  Send,
  Award,
  Building2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { usePaginatedInfiniteScroll, useInfiniteScroll } from "../ui/useInfiniteScroll";

const EVENT_TYPES = {
  'workspace_created': { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
  'user_added': { icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  'resource_shared': { icon: Send, color: 'text-green-600', bg: 'bg-green-50' },
  'proposal_created': { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
  'proposal_won': { icon: Award, color: 'text-green-600', bg: 'bg-green-50' },
};

/**
 * Client Engagement Timeline with Infinite Scroll
 * Visual timeline of key events in client relationship
 */
export default function ClientEngagementTimeline({ clientOrganization, events = [] }) {
  const sortedEvents = React.useMemo(() => 
    [...events].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [events]
  );

  // **NEW: Infinite scroll**
  const {
    visibleItems: visibleEvents,
    hasMore,
    loadMore,
    isLoading: isLoadingMore,
    totalItems,
    visibleCount
  } = usePaginatedInfiniteScroll(sortedEvents, 15);

  const {
    containerRef,
    loadingRef
  } = useInfiniteScroll({
    loadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 100
  });

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Engagement Timeline
          {totalItems > 0 && (
            <Badge variant="outline" className="ml-auto text-xs">
              {visibleCount} of {totalItems} events
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sortedEvents.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500">
            No activity recorded yet
          </div>
        ) : (
          <div
            ref={containerRef}
            className="max-h-[600px] overflow-y-auto"
          >
            <div className="relative space-y-4 p-6">
              {/* Timeline line */}
              <div className="absolute left-10 top-0 bottom-0 w-0.5 bg-slate-200" />

              {visibleEvents.map((event, idx) => {
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
                      <div className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
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

              {/* **NEW: Infinite Scroll Loading** */}
              {hasMore && (
                <div ref={loadingRef} className="py-4">
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading more events...</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      className="w-full border-dashed ml-12"
                    >
                      Load More Events
                    </Button>
                  )}
                </div>
              )}

              {/* **NEW: End Indicator** */}
              {!hasMore && totalItems > 15 && (
                <div className="text-center py-3 text-xs text-slate-400 ml-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    That's everything
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}