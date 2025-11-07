import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  CheckCircle2,
  Target,
  Zap,
  Activity,
  AlertCircle,
  Calendar,
  BarChart3,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function PredictiveHealthDashboard({ proposal, organization }) {
  const queryClient = useQueryClient();
  const [healthMetrics, setHealthMetrics] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [predictions, setPredictions] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['proposal-tasks', proposal.id],
    queryFn: () => base44.entities.ProposalTask.filter({ proposal_id: proposal.id }),
    initialData: []
  });

  const { data: subtasks = [] } = useQuery({
    queryKey: ['proposal-subtasks', proposal.id],
    queryFn: () => base44.entities.ProposalSubtask.filter({ proposal_id: proposal.id }),
    initialData: []
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['proposal-sections', proposal.id],
    queryFn: () => base44.entities.ProposalSection.filter({ proposal_id: proposal.id }),
    initialData: []
  });

  const { data: complianceReqs = [] } = useQuery({
    queryKey: ['compliance-reqs', proposal.id],
    queryFn: () => base44.entities.ComplianceRequirement.filter({ proposal_id: proposal.id }),
    initialData: []
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['proposal-comments', proposal.id],
    queryFn: () => base44.entities.ProposalComment.filter({ proposal_id: proposal.id }),
    initialData: []
  });

  const { data: similarProposals = [] } = useQuery({
    queryKey: ['similar-proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { 
          organization_id: organization.id,
          status: { $in: ['won', 'lost', 'submitted'] }
        },
        '-created_date',
        50
      );
    },
    enabled: !!organization?.id,
    initialData: []
  });

  const calculatePredictiveHealth = async () => {
    setIsCalculating(true);
    
    try {
      // Calculate basic metrics
      const totalTasks = tasks.length + subtasks.length;
      const completedTasks = [...tasks, ...subtasks].filter(t => t.status === 'completed').length;
      const overdueTasks = [...tasks, ...subtasks].filter(t => 
        t.status !== 'completed' && t.due_date && moment(t.due_date).isBefore(moment())
      ).length;

      const totalSections = sections.length;
      const completedSections = sections.filter(s => s.status === 'approved').length;
      const draftSections = sections.filter(s => s.status === 'draft').length;

      const totalCompliance = complianceReqs.length;
      const metCompliance = complianceReqs.filter(c => c.compliance_status === 'compliant').length;
      const criticalCompliance = complianceReqs.filter(c => 
        c.risk_level === 'critical' && c.compliance_status !== 'compliant'
      ).length;

      const unresolvedComments = comments.filter(c => !c.is_resolved).length;
      
      const daysUntilDue = proposal.due_date ? moment(proposal.due_date).diff(moment(), 'days') : 999;
      const isOverdue = daysUntilDue < 0;

      // Calculate completion velocity
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // AI Predictive Analysis
      const prompt = `You are a proposal risk assessment AI. Analyze this proposal and provide predictive insights.

**PROPOSAL DATA:**
- Name: ${proposal.proposal_name}
- Due Date: ${proposal.due_date} (${daysUntilDue} days remaining)
- Current Phase: ${proposal.current_phase}
- Tasks: ${completedTasks}/${totalTasks} complete
- Sections: ${completedSections}/${totalSections} complete
- Compliance: ${metCompliance}/${totalCompliance} met
- Overdue Tasks: ${overdueTasks}
- Unresolved Comments: ${unresolvedComments}
- Contract Value: $${proposal.contract_value?.toLocaleString() || 'Unknown'}

**HISTORICAL CONTEXT:**
We have ${similarProposals.length} similar completed proposals:
- Won: ${similarProposals.filter(p => p.status === 'won').length}
- Lost: ${similarProposals.filter(p => p.status === 'lost').length}
- Average completion pattern: ${similarProposals.filter(p => p.progress_summary?.completion_percentage).length > 0 
  ? (similarProposals.reduce((sum, p) => sum + (p.progress_summary?.completion_percentage || 0), 0) / similarProposals.length).toFixed(0) 
  : 'Unknown'}%

**PROVIDE PREDICTIONS:**
1. **On-Time Delivery Probability** (0-100%)
2. **Quality Score Prediction** (0-100)
3. **Delay Risk Assessment** (days likely to be delayed, 0 if on track)
4. **Team Velocity Analysis** (hours typically needed to complete similar work)
5. **Critical Risks** (list 3-5 specific risks with severity)
6. **Recommended Actions** (prioritized list of 5-7 actions to take NOW)
7. **Win Probability Impact** (how current health affects win chances)

Return JSON:
{
  "on_time_probability": number,
  "predicted_quality_score": number,
  "predicted_delay_days": number,
  "required_hours_remaining": number,
  "team_velocity_hours_per_day": number,
  "critical_risks": [
    {
      "risk": "string",
      "severity": "critical|high|medium|low",
      "impact": "string",
      "likelihood": number
    }
  ],
  "recommended_actions": [
    {
      "priority": number,
      "action": "string",
      "estimated_hours": number,
      "impact_on_timeline": "string",
      "impact_on_quality": "string"
    }
  ],
  "win_probability_impact": {
    "current_health_impact": number,
    "if_no_action_taken": number,
    "if_actions_completed": number
  },
  "bottlenecks": ["string"],
  "team_capacity_issues": ["string"]
}`;

      const aiAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            on_time_probability: { type: "number" },
            predicted_quality_score: { type: "number" },
            predicted_delay_days: { type: "number" },
            required_hours_remaining: { type: "number" },
            team_velocity_hours_per_day: { type: "number" },
            critical_risks: { type: "array" },
            recommended_actions: { type: "array" },
            win_probability_impact: { type: "object" },
            bottlenecks: { type: "array" },
            team_capacity_issues: { type: "array" }
          }
        }
      });

      // Calculate overall health score
      const healthScore = Math.round(
        (completionRate * 0.25) +
        (aiAnalysis.on_time_probability * 0.25) +
        (aiAnalysis.predicted_quality_score * 0.25) +
        ((metCompliance / Math.max(totalCompliance, 1)) * 100 * 0.25)
      );

      const metrics = {
        overall_health_score: healthScore,
        completion_percentage: completionRate,
        compliance_score: totalCompliance > 0 ? (metCompliance / totalCompliance) * 100 : 100,
        quality_score: aiAnalysis.predicted_quality_score,
        on_time_probability: aiAnalysis.on_time_probability,
        risk_level: healthScore >= 70 ? 'low' : healthScore >= 50 ? 'medium' : healthScore >= 30 ? 'high' : 'critical',
        days_until_deadline: daysUntilDue,
        is_on_track: aiAnalysis.on_time_probability >= 70,
        sections_completed: completedSections,
        sections_total: totalSections,
        compliance_requirements_met: metCompliance,
        compliance_requirements_total: totalCompliance,
        tasks_completed: completedTasks,
        tasks_total: totalTasks,
        tasks_overdue: overdueTasks,
        comments_unresolved: unresolvedComments,
        predicted_delay_days: aiAnalysis.predicted_delay_days,
        required_hours_remaining: aiAnalysis.required_hours_remaining,
        critical_risks: aiAnalysis.critical_risks || []
      };

      setHealthMetrics(metrics);
      setPredictions(aiAnalysis);

      // Save to database
      const existing = await base44.entities.ProposalHealthMetric.filter({
        proposal_id: proposal.id
      });

      const dataToSave = {
        ...metrics,
        proposal_id: proposal.id,
        organization_id: organization.id,
        risks_identified: aiAnalysis.critical_risks,
        recommended_actions: aiAnalysis.recommended_actions,
        calculated_date: new Date().toISOString()
      };

      if (existing.length > 0) {
        await base44.entities.ProposalHealthMetric.update(existing[0].id, dataToSave);
      } else {
        await base44.entities.ProposalHealthMetric.create(dataToSave);
      }

      queryClient.invalidateQueries({ queryKey: ['proposal-health'] });

    } catch (error) {
      console.error("Error calculating health:", error);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (proposal?.id && organization?.id) {
      calculatePredictiveHealth();
    }
  }, [proposal?.id, organization?.id]);

  if (!healthMetrics) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-slate-600">Calculating proposal health...</p>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (level) => {
    const colors = {
      low: 'bg-green-100 text-green-700 border-green-300',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      high: 'bg-orange-100 text-orange-700 border-orange-300',
      critical: 'bg-red-100 text-red-700 border-red-300'
    };
    return colors[level] || colors.medium;
  };

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-600" />
              Proposal Health Score
            </CardTitle>
            <Button
              onClick={calculatePredictiveHealth}
              disabled={isCalculating}
              size="sm"
              variant="outline"
            >
              <RotateCw className={cn("w-4 h-4 mr-2", isCalculating && "animate-spin")} />
              Recalculate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className={cn(
              "w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold border-4",
              healthMetrics.overall_health_score >= 70 ? 'bg-green-50 border-green-500 text-green-700' :
              healthMetrics.overall_health_score >= 50 ? 'bg-yellow-50 border-yellow-500 text-yellow-700' :
              healthMetrics.overall_health_score >= 30 ? 'bg-orange-50 border-orange-500 text-orange-700' :
              'bg-red-50 border-red-500 text-red-700'
            )}>
              {healthMetrics.overall_health_score}
            </div>

            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">On-Time Probability</p>
                  <Progress value={healthMetrics.on_time_probability} className="h-2 mb-1" />
                  <p className="text-sm font-bold">{healthMetrics.on_time_probability}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Quality Score</p>
                  <Progress value={healthMetrics.quality_score} className="h-2 mb-1" />
                  <p className="text-sm font-bold">{healthMetrics.quality_score}/100</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Completion</p>
                  <Progress value={healthMetrics.completion_percentage} className="h-2 mb-1" />
                  <p className="text-sm font-bold">{healthMetrics.completion_percentage.toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">Compliance</p>
                  <Progress value={healthMetrics.compliance_score} className="h-2 mb-1" />
                  <p className="text-sm font-bold">{healthMetrics.compliance_score.toFixed(0)}%</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge className={cn("text-sm px-3 py-1", getRiskColor(healthMetrics.risk_level))}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  {healthMetrics.risk_level.toUpperCase()} RISK
                </Badge>
                {healthMetrics.is_on_track ? (
                  <Badge className="bg-green-500 text-white">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    On Track
                  </Badge>
                ) : (
                  <Badge className="bg-red-500 text-white">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    At Risk
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predictive Alerts */}
      {predictions && (
        <>
          {/* Delay Prediction */}
          {predictions.predicted_delay_days > 0 && (
            <Card className="border-2 border-orange-300 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-orange-900">
                  <Clock className="w-5 h-5" />
                  ⚠️ Delay Prediction Alert
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-white border-2 border-orange-300 rounded-lg">
                  <p className="text-2xl font-bold text-orange-700 mb-1">
                    +{predictions.predicted_delay_days} Days
                  </p>
                  <p className="text-sm text-orange-900">
                    Based on similar proposals, you're likely to exceed the deadline by {predictions.predicted_delay_days} days
                  </p>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <p className="text-orange-900">
                    <strong>Required hours remaining:</strong> {predictions.required_hours_remaining} hours
                    <br />
                    <strong>Team velocity:</strong> {predictions.team_velocity_hours_per_day} hours/day
                    <br />
                    <strong>Needed acceleration:</strong> {(predictions.required_hours_remaining / Math.max(daysUntilDue, 1)).toFixed(1)} hours/day required
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Critical Risks */}
          {predictions.critical_risks && predictions.critical_risks.length > 0 && (
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Risks ({predictions.critical_risks.filter(r => r.severity === 'critical' || r.severity === 'high').length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {predictions.critical_risks
                  .filter(r => r.severity === 'critical' || r.severity === 'high')
                  .map((risk, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg border-2",
                        risk.severity === 'critical' ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-300'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={risk.severity === 'critical' ? 'bg-red-600' : 'bg-orange-600'}>
                            {risk.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {risk.likelihood}% likely
                          </Badge>
                        </div>
                      </div>
                      <p className="font-semibold text-sm mb-1">{risk.risk}</p>
                      <p className="text-xs text-slate-700">{risk.impact}</p>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Recommended Actions */}
          {predictions.recommended_actions && predictions.recommended_actions.length > 0 && (
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  Priority Actions (Next 48 Hours)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {predictions.recommended_actions
                  .sort((a, b) => a.priority - b.priority)
                  .slice(0, 7)
                  .map((action, idx) => (
                    <Card key={idx} className="border-2 border-blue-200 bg-blue-50">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {action.priority}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm mb-1">{action.action}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-600">
                              <span>⏱️ {action.estimated_hours}h</span>
                              <span>📅 {action.impact_on_timeline}</span>
                              <span>⭐ {action.impact_on_quality}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Win Probability Impact */}
          {predictions.win_probability_impact && (
            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Win Probability Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-white rounded-lg border-2 border-purple-200">
                    <p className="text-xs text-slate-600 mb-1">Current Health</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {predictions.win_probability_impact.current_health_impact}%
                    </p>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border-2 border-red-200">
                    <p className="text-xs text-slate-600 mb-1">If No Action</p>
                    <p className="text-2xl font-bold text-red-700">
                      {predictions.win_probability_impact.if_no_action_taken}%
                    </p>
                    <TrendingDown className="w-4 h-4 text-red-600 mx-auto mt-1" />
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg border-2 border-green-200">
                    <p className="text-xs text-slate-600 mb-1">If Actions Done</p>
                    <p className="text-2xl font-bold text-green-700">
                      {predictions.win_probability_impact.if_actions_completed}%
                    </p>
                    <TrendingUp className="w-4 h-4 text-green-600 mx-auto mt-1" />
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="text-sm text-slate-700">
                    <strong className="text-purple-700">Impact:</strong> Taking recommended actions could improve your win probability by{' '}
                    <strong className="text-green-700">
                      +{predictions.win_probability_impact.if_actions_completed - predictions.win_probability_impact.current_health_impact}%
                    </strong>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Capacity */}
          {predictions.team_capacity_issues && predictions.team_capacity_issues.length > 0 && (
            <Card className="border-2 border-amber-300 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                  <Users className="w-5 h-5" />
                  Team Capacity Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {predictions.team_capacity_issues.map((issue, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-white border border-amber-300 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-900">{issue}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}