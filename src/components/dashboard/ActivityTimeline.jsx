import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, MessageSquare, CheckCircle, CheckCircle2, Loader2 } from "lucide-react";
import moment from "moment";
import { usePaginatedInfiniteScroll, useInfiniteScroll } from "../ui/useInfiniteScroll";

export default function ActivityTimeline({ organization, activityLog = [], proposals = [] }) {
  // Defensive check to ensure we have arrays
  const safeActivityLog = Array.isArray(activityLog) ? activityLog : [];
  const safeProposals = Array.isArray(proposals) ? proposals : [];

  // **NEW: Infinite scroll for activity timeline**
  const {
    visibleItems: visibleActivities,
    hasMore,
    loadMore,
    isLoading: isLoadingMore,
    totalItems,
    visibleCount
  } = usePaginatedInfiniteScroll(safeActivityLog, 10);

  const {
    containerRef,
    loadingRef
  } = useInfiniteScroll({
    loadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 100
  });

  const getActivityIcon = (type) => {
    const icons = {
      proposal_created: FileText,
      section_updated: FileText,
      comment_added: MessageSquare,
      status_changed: CheckCircle,
    };
    const Icon = icons[type] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const getProposalName = (proposalId) => {
    const proposal = safeProposals.find(p => p.id === proposalId);
    return proposal?.proposal_name || 'Unknown Proposal';
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Recent Activity
          {totalItems > 0 && (
            <Badge variant="outline" className="ml-auto text-xs">
              {visibleCount} of {totalItems}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {safeActivityLog.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="max-h-96 overflow-y-auto"
          >
            <div className="space-y-4 p-6">
              {visibleActivities.map((activity) => (
                <div key={activity.id} className="flex gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    {getActivityIcon(activity.action_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 font-medium">
                      {activity.action_description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-500">
                        {activity.user_name || activity.user_email}
                      </p>
                      <span className="text-xs text-slate-400">•</span>
                      <p className="text-xs text-slate-500">
                        {moment(activity.created_date).fromNow()}
                      </p>
                    </div>
                    {activity.proposal_id && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        {getProposalName(activity.proposal_id)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {/* **NEW: Infinite Scroll Loading** */}
              {hasMore && (
                <div ref={loadingRef} className="py-4">
                  {isLoadingMore ? (
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading more...</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      className="w-full border-dashed"
                    >
                      Load More
                    </Button>
                  )}
                </div>
              )}

              {/* **NEW: End Indicator** */}
              {!hasMore && totalItems > 10 && (
                <div className="text-center py-3 text-xs text-slate-400">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    All caught up
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