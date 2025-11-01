import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Clock, FileText, TrendingDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function LiveProposalProgress({ organization, allEvents }) {
  const { data: proposals = [] } = useQuery({
    queryKey: ['active-proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({
        organization_id: organization.id,
        status: { $in: ['draft', 'in_progress'] }
      });
    },
    enabled: !!organization?.id,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['proposal-sections-progress', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const proposalIds = proposals.map(p => p.id);
      if (proposalIds.length === 0) return [];
      return base44.entities.ProposalSection.filter({
        proposal_id: { $in: proposalIds }
      });
    },
    enabled: !!organization?.id && proposals.length > 0,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['proposal-tasks-progress', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const proposalIds = proposals.map(p => p.id);
      if (proposalIds.length === 0) return [];
      return base44.entities.ProposalTask.filter({
        proposal_id: { $in: proposalIds }
      });
    },
    enabled: !!organization?.id && proposals.length > 0,
  });

  // Analyze each proposal's progress and impact on calendar
  const proposalAnalysis = proposals.map(proposal => {
    const proposalSections = sections.filter(s => s.proposal_id === proposal.id);
    const proposalTasks = tasks.filter(t => t.proposal_id === proposal.id);
    const proposalEvents = allEvents.filter(e => e.proposal_id === proposal.id);

    // Calculate completion
    const completedSections = proposalSections.filter(s => s.status === 'approved').length;
    const sectionCompletion = proposalSections.length > 0 
      ? (completedSections / proposalSections.length * 100) 
      : 0;

    const completedTasks = proposalTasks.filter(t => t.status === 'completed').length;
    const taskCompletion = proposalTasks.length > 0
      ? (completedTasks / proposalTasks.length * 100)
      : 0;

    const overallCompletion = (sectionCompletion + taskCompletion) / 2;

    // Find at-risk events
    const upcomingEvents = proposalEvents.filter(e => 
      moment(e.start_date).isAfter(moment()) &&
      moment(e.start_date).isBefore(moment().add(7, 'days'))
    );

    const atRiskEvents = upcomingEvents.filter(event => {
      // If it's a review meeting and sections aren't ready
      if (event.event_type === 'review_session' && sectionCompletion < 80) {
        return true;
      }
      // If it's a deadline and we're behind schedule
      if (event.source_type === 'proposal_deadline' && overallCompletion < 70) {
        return true;
      }
      return false;
    });

    const daysUntilDue = proposal.due_date 
      ? moment(proposal.due_date).diff(moment(), 'days')
      : null;

    const isOnTrack = daysUntilDue === null ? true : 
      (overallCompletion / 100) >= (1 - (daysUntilDue / moment(proposal.due_date).diff(moment(proposal.created_date), 'days')));

    return {
      proposal,
      completion: overallCompletion,
      sectionCompletion,
      taskCompletion,
      atRiskEvents,
      daysUntilDue,
      isOnTrack,
      hasUpcomingEvents: upcomingEvents.length > 0
    };
  });

  const atRiskProposals = proposalAnalysis.filter(p => 
    p.atRiskEvents.length > 0 || !p.isOnTrack
  );

  if (proposals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Live Proposal Progress & Calendar Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{proposals.length}</div>
              <div className="text-sm text-slate-600">Active Proposals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{atRiskProposals.length}</div>
              <div className="text-sm text-slate-600">At Risk</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {proposalAnalysis.filter(p => p.isOnTrack).length}
              </div>
              <div className="text-sm text-slate-600">On Track</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {proposalAnalysis.map((analysis) => (
          <Card key={analysis.proposal.id} className={cn(
            "border-2 transition-all",
            analysis.atRiskEvents.length > 0 && "border-red-500 bg-red-50/30",
            !analysis.isOnTrack && analysis.atRiskEvents.length === 0 && "border-amber-500 bg-amber-50/30"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{analysis.proposal.proposal_name}</CardTitle>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">
                      {analysis.completion.toFixed(0)}% complete
                    </Badge>
                    {analysis.daysUntilDue !== null && (
                      <Badge variant={analysis.daysUntilDue < 7 ? "destructive" : "outline"}>
                        {analysis.daysUntilDue} days until due
                      </Badge>
                    )}
                    {analysis.isOnTrack ? (
                      <Badge className="bg-green-600">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        On Track
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Behind Schedule
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>Sections</span>
                    <span>{analysis.sectionCompletion.toFixed(0)}%</span>
                  </div>
                  <Progress value={analysis.sectionCompletion} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                    <span>Tasks</span>
                    <span>{analysis.taskCompletion.toFixed(0)}%</span>
                  </div>
                  <Progress value={analysis.taskCompletion} className="h-2" />
                </div>
              </div>

              {analysis.atRiskEvents.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-red-900 text-sm mb-2">
                        {analysis.atRiskEvents.length} Upcoming Event{analysis.atRiskEvents.length > 1 ? 's' : ''} at Risk
                      </div>
                      <div className="space-y-1">
                        {analysis.atRiskEvents.map((event, idx) => (
                          <div key={idx} className="text-xs text-red-800">
                            • {event.title} - {moment(event.start_date).format('MMM D')}
                            {event.event_type === 'review_session' && analysis.sectionCompletion < 80 && (
                              <span className="ml-1 text-red-600">(Content only {analysis.sectionCompletion.toFixed(0)}% ready)</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-red-300">
                        <div className="flex items-center gap-2 text-xs text-red-900">
                          <Zap className="w-3 h-3" />
                          <strong>AI Recommendation:</strong> Consider rescheduling these events or accelerating content development
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}