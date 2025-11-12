import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Activity,
  FileText,
  MessageSquare,
  Download,
  Eye,
  Send,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { useInfiniteScroll, usePaginatedInfiniteScroll } from "../ui/useInfiniteScroll";

const ACTIVITY_TYPES = {
  'proposal_viewed': { icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Viewed' },
  'annotation_created': { icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Commented' },
  'feedback_submitted': { icon: Send, color: 'text-green-600', bg: 'bg-green-50', label: 'Feedback' },
  'document_download': { icon: Download, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Downloaded' },
  'approval_action': { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved' },
  'user_added': { icon: User, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'User Added' },
  'portal_access': { icon: Eye, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Portal Access' }
};

/**
 * Client Activity Feed with Infinite Scroll
 * Real-time feed of client interactions and engagement
 */
export default function ClientActivityFeed({ clientOrganization, maxItems = 100 }) {
  // Fetch MORE data than before for infinite scroll
  const { data: portalViews = [], isLoading: loadingViews } = useQuery({
    queryKey: ['client-portal-views', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      
      const activities = [];
      
      if (clientOrganization.custom_branding?.last_portal_access) {
        activities.push({
          type: 'portal_access',
          date: clientOrganization.custom_branding.last_portal_access,
          description: 'Accessed client portal'
        });
      }

      return activities;
    },
    enabled: !!clientOrganization?.id,
  });

  const { data: annotations = [], isLoading: loadingAnnotations } = useQuery({
    queryKey: ['client-annotations-feed', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      return base44.entities.ProposalAnnotation.filter(
        { client_id: clientOrganization.id },
        '-created_date',
        50 // **INCREASED from 10**
      );
    },
    enabled: !!clientOrganization?.id,
  });

  const { data: feedback = [], isLoading: loadingFeedback } = useQuery({
    queryKey: ['client-feedback-feed', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      return base44.entities.Feedback.filter(
        { client_id: clientOrganization.id },
        '-created_date',
        50 // **INCREASED from 10**
      );
    },
    enabled: !!clientOrganization?.id,
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['client-doc-downloads', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      return base44.entities.SolicitationDocument.filter(
        {
          organization_id: clientOrganization.id,
          client_downloaded: true
        },
        '-client_download_date',
        20 // **INCREASED from 5**
      );
    },
    enabled: !!clientOrganization?.id,
  });

  // Combine and sort all activities
  const allActivities = React.useMemo(() => {
    const activities = [];

    portalViews.forEach(view => {
      activities.push({
        type: 'portal_access',
        date: view.date,
        description: view.description,
        actor: 'Client'
      });
    });

    annotations.forEach(ann => {
      activities.push({
        type: 'annotation_created',
        date: ann.created_date,
        description: `Added ${ann.annotation_type} on proposal`,
        actor: ann.author_name,
        details: ann.content?.substring(0, 100) + (ann.content?.length > 100 ? '...' : '')
      });
    });

    feedback.forEach(fb => {
      activities.push({
        type: 'feedback_submitted',
        date: fb.created_date,
        description: fb.title || 'Submitted feedback',
        actor: fb.reporter_name,
        details: fb.description?.substring(0, 100) + (fb.description?.length > 100 ? '...' : '')
      });
    });

    documents.forEach(doc => {
      activities.push({
        type: 'document_download',
        date: doc.client_download_date,
        description: `Downloaded ${doc.file_name}`,
        actor: 'Client'
      });
    });

    return activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [portalViews, annotations, feedback, documents]);

  // **NEW: Infinite scroll with pagination**
  const {
    visibleItems: visibleActivities,
    hasMore,
    loadMore,
    isLoading: isLoadingMore,
    totalItems,
    visibleCount
  } = usePaginatedInfiniteScroll(allActivities, 15);

  const {
    containerRef,
    loadingRef
  } = useInfiniteScroll({
    loadMore,
    hasMore,
    isLoading: isLoadingMore,
    threshold: 150
  });

  const isLoading = loadingViews || loadingAnnotations || loadingFeedback || loadingDocs;

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          Recent Activity
          {totalItems > 0 && (
            <Badge variant="outline" className="ml-auto text-xs">
              {visibleCount} of {totalItems}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {allActivities.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="max-h-[500px] overflow-y-auto"
          >
            <div className="space-y-3 p-6">
              {visibleActivities.map((activity, idx) => {
                const config = ACTIVITY_TYPES[activity.type] || ACTIVITY_TYPES['portal_access'];
                const Icon = config.icon;

                return (
                  <div
                    key={`${activity.type}-${activity.date}-${idx}`}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-all"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      config.bg
                    )}>
                      <Icon className={cn("w-5 h-5", config.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-900 text-sm truncate">
                          {activity.actor || 'Client'}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700">
                        {activity.description}
                      </p>
                      {activity.details && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {activity.details}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {moment(activity.date).fromNow()}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* **NEW: Loading Indicator for Infinite Scroll** */}
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
                      Load More Activities
                    </Button>
                  )}
                </div>
              )}

              {/* End of Feed Indicator */}
              {!hasMore && totalItems > 15 && (
                <div className="text-center py-4 text-xs text-slate-400">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    You've reached the end
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