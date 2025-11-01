import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function SnapshotGenerator({ organization, proposals = [] }) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null);
  const [lastSnapshot, setLastSnapshot] = useState(null);

  const generateSnapshotsMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");

      const snapshots = [];
      const now = new Date().toISOString();

      let completed = 0;
      
      for (const proposal of proposals) {
        // Calculate metrics for this proposal
        const sections = await base44.entities.ProposalSection.filter({
          proposal_id: proposal.id
        });

        const tasks = await base44.entities.ProposalTask.filter({
          proposal_id: proposal.id
        });

        const subtasks = await base44.entities.ProposalSubtask.filter({
          proposal_id: proposal.id
        });

        const dependencies = await base44.entities.ProposalDependency.filter({
          proposal_id: proposal.id
        });

        const teamMembers = proposal.assigned_team_members || [];

        // Get previous snapshot for this proposal to calculate time_in_current_stage
        const previousSnapshots = await base44.entities.ProposalMetricSnapshot.filter(
          { proposal_id: proposal.id, organization_id: organization.id },
          '-snapshot_date',
          1
        );

        const previousSnapshot = previousSnapshots.length > 0 ? previousSnapshots[0] : null;
        
        let timeInCurrentStageHours = 0;
        let totalTimeInPipelineHours = 0;

        if (previousSnapshot) {
          if (previousSnapshot.stage === (proposal.custom_workflow_stage_id || proposal.status)) {
            // Same stage, add to time
            timeInCurrentStageHours = (previousSnapshot.time_in_current_stage_hours || 0) + 1; // +1 hour
          } else {
            // Stage changed, reset
            timeInCurrentStageHours = 1;
          }
          totalTimeInPipelineHours = (previousSnapshot.total_time_in_pipeline_hours || 0) + 1;
        } else {
          // First snapshot
          const createdHoursAgo = moment().diff(moment(proposal.created_date), 'hours');
          timeInCurrentStageHours = createdHoursAgo;
          totalTimeInPipelineHours = createdHoursAgo;
        }

        const completionPercentage = sections.length > 0
          ? (sections.filter(s => s.status === 'approved').length / sections.length) * 100
          : 0;

        const tasksCompleted = tasks.filter(t => t.status === 'completed').length + 
                               subtasks.filter(s => s.status === 'completed').length;
        const tasksTotal = tasks.length + subtasks.length;

        const daysUntilDue = proposal.due_date 
          ? moment(proposal.due_date).diff(moment(), 'days')
          : null;

        const snapshotData = {
          organization_id: organization.id,
          proposal_id: proposal.id,
          snapshot_date: now,
          stage: proposal.custom_workflow_stage_id || proposal.status,
          status: proposal.status,
          time_in_current_stage_hours: timeInCurrentStageHours,
          total_time_in_pipeline_hours: totalTimeInPipelineHours,
          contract_value: proposal.contract_value,
          completion_percentage: Math.round(completionPercentage),
          tasks_completed: tasksCompleted,
          tasks_total: tasksTotal,
          team_members_count: teamMembers.length,
          blocker_count: proposal.is_blocked ? 1 : 0,
          dependency_count: dependencies.filter(d => d.status === 'active').length,
          is_overdue: daysUntilDue !== null && daysUntilDue < 0,
          days_until_due: daysUntilDue,
          snapshot_type: 'manual',
          previous_stage: previousSnapshot?.stage || null,
          stage_transition_time_hours: previousSnapshot && previousSnapshot.stage !== (proposal.custom_workflow_stage_id || proposal.status)
            ? previousSnapshot.time_in_current_stage_hours
            : null
        };

        snapshots.push(snapshotData);
        
        completed += 1;
        setProgress((completed / proposals.length) * 100);
      }

      // Bulk create snapshots
      if (snapshots.length > 0) {
        await base44.entities.ProposalMetricSnapshot.bulkCreate(snapshots);
      }

      return { count: snapshots.length };
    },
    onSuccess: (result) => {
      setStatus('success');
      setLastSnapshot(moment().format('MMM D, YYYY [at] h:mm A'));
      queryClient.invalidateQueries({ queryKey: ['pipeline-snapshots'] });
      setTimeout(() => {
        setStatus(null);
        setProgress(0);
      }, 3000);
    },
    onError: (error) => {
      setStatus('error');
      console.error("Error generating snapshots:", error);
      setTimeout(() => {
        setStatus(null);
        setProgress(0);
      }, 5000);
    }
  });

  const handleGenerate = () => {
    setProgress(0);
    setStatus('generating');
    generateSnapshotsMutation.mutate();
  };

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-indigo-600" />
          Snapshot Generator
        </CardTitle>
        <CardDescription>
          Generate real-time metric snapshots to power analytics. Run this periodically to track trends.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastSnapshot && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-900">
              <Clock className="w-4 h-4 inline mr-1" />
              Last snapshot: <strong>{lastSnapshot}</strong>
            </div>
          </div>
        )}

        {status === 'generating' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Generating snapshots...</span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-slate-500 italic">
              Processing {proposals.length} proposals...
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-semibold text-green-900">Snapshots Generated Successfully!</div>
                <div className="text-sm text-green-700">Analytics data is now up to date.</div>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <div>
                <div className="font-semibold text-red-900">Error Generating Snapshots</div>
                <div className="text-sm text-red-700">Please try again or contact support.</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleGenerate}
            disabled={generateSnapshotsMutation.isPending || proposals.length === 0}
            className="flex-1"
          >
            {generateSnapshotsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Generate Snapshots Now
              </>
            )}
          </Button>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <div className="font-semibold mb-1">Pro Tip: Automated Snapshots</div>
              <div>
                For real-time analytics, set up a scheduled job to generate snapshots daily or hourly. 
                This powers lead time, cycle time, and cumulative flow tracking.
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}