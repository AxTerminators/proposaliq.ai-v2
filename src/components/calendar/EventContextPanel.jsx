import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  MessageSquare, 
  CheckSquare, 
  Shield, 
  TrendingUp, 
  ExternalLink,
  Users,
  Calendar,
  Sparkles,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function EventContextPanel({ event, organization }) {
  const { data: contextData, isLoading } = useQuery({
    queryKey: ['event-context', event?.id, event?.proposal_id],
    queryFn: async () => {
      if (!event) return null;

      const context = {
        proposal: null,
        sections: [],
        tasks: [],
        compliance: [],
        comments: [],
        winThemes: [],
        pastPerformance: []
      };

      // If event is linked to a proposal
      if (event.proposal_id) {
        // Get proposal
        const proposals = await base44.entities.Proposal.filter({ id: event.proposal_id });
        context.proposal = proposals[0];

        if (context.proposal) {
          // Get proposal sections
          context.sections = await base44.entities.ProposalSection.filter({
            proposal_id: event.proposal_id
          });

          // Get related tasks
          context.tasks = await base44.entities.ProposalTask.filter({
            proposal_id: event.proposal_id,
            status: { $ne: 'completed' }
          }, 'due_date', 5);

          // Get compliance requirements
          context.compliance = await base44.entities.ComplianceRequirement.filter({
            proposal_id: event.proposal_id,
            compliance_status: { $in: ['not_started', 'in_progress', 'needs_review'] }
          }, 'risk_level', 5);

          // Get recent comments
          context.comments = await base44.entities.ProposalComment.filter({
            proposal_id: event.proposal_id,
            is_resolved: false
          }, '-created_date', 5);

          // Get win themes
          context.winThemes = await base44.entities.WinTheme.filter({
            proposal_id: event.proposal_id,
            status: { $in: ['draft', 'reviewed', 'approved'] }
          }, '-priority', 3);
        }
      }

      // Get relevant past performance (if proposal related)
      if (context.proposal && organization?.id) {
        context.pastPerformance = await base44.entities.PastPerformance.filter({
          organization_id: organization.id,
          is_featured: true
        }, '-usage_count', 3);
      }

      return context;
    },
    enabled: !!event && !!organization,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!contextData) return null;

  const hasContext = contextData.proposal || 
    contextData.tasks.length > 0 || 
    contextData.compliance.length > 0 ||
    contextData.comments.length > 0;

  if (!hasContext) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-500">No additional context available for this event</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {contextData.proposal && (
        <Card className="border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Related Proposal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            <div>
              <div className="font-bold text-slate-900">{contextData.proposal.proposal_name}</div>
              <div className="text-xs text-slate-600">{contextData.proposal.agency_name}</div>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="capitalize">
                {contextData.proposal.status?.replace(/_/g, ' ')}
              </Badge>
              {contextData.proposal.current_phase && (
                <Badge variant="outline">
                  Phase {contextData.proposal.current_phase?.replace('phase', '')}
                </Badge>
              )}
            </div>
            {contextData.proposal.due_date && (
              <div className="text-xs text-slate-600">
                Due: {moment(contextData.proposal.due_date).format('MMM D, YYYY')} 
                ({moment(contextData.proposal.due_date).fromNow()})
              </div>
            )}
            <Button size="sm" variant="outline" className="w-full mt-2" asChild>
              <a href={`/proposal-builder?id=${contextData.proposal.id}`} target="_blank">
                <ExternalLink className="w-3 h-3 mr-2" />
                Open Proposal
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {contextData.tasks.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Open Tasks ({contextData.tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {contextData.tasks.map((task) => (
              <div key={task.id} className="flex items-start justify-between gap-2 p-2 bg-white rounded border">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{task.title}</div>
                  <div className="text-xs text-slate-600">
                    Due: {moment(task.due_date).format('MMM D')}
                  </div>
                </div>
                <Badge variant={
                  task.priority === 'urgent' ? 'destructive' :
                  task.priority === 'high' ? 'default' : 'secondary'
                } className="text-xs">
                  {task.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {contextData.compliance.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Compliance Items ({contextData.compliance.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {contextData.compliance.map((req) => (
              <div key={req.id} className="flex items-start justify-between gap-2 p-2 bg-white rounded border">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">{req.requirement_title}</div>
                  <div className="text-xs text-slate-600 capitalize">
                    {req.compliance_status?.replace(/_/g, ' ')}
                  </div>
                </div>
                <Badge variant={
                  req.risk_level === 'critical' ? 'destructive' :
                  req.risk_level === 'high' ? 'default' : 'secondary'
                } className="text-xs">
                  {req.risk_level}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {contextData.comments.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Recent Comments ({contextData.comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {contextData.comments.map((comment) => (
              <div key={comment.id} className="p-2 bg-white rounded border">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-xs font-semibold text-slate-900">{comment.author_name}</div>
                  <div className="text-xs text-slate-500">{moment(comment.created_date).fromNow()}</div>
                </div>
                <div className="text-sm text-slate-700 line-clamp-2">{comment.content}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {contextData.winThemes.length > 0 && (
        <Card className="border-none shadow-md">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Win Themes ({contextData.winThemes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {contextData.winThemes.map((theme) => (
              <div key={theme.id} className="p-2 bg-white rounded border">
                <div className="text-sm font-bold text-slate-900">{theme.theme_title}</div>
                <div className="text-xs text-slate-600 line-clamp-2 mt-1">{theme.theme_statement}</div>
                <Badge variant="outline" className="mt-1 text-xs capitalize">
                  {theme.theme_type?.replace(/_/g, ' ')}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}