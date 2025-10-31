import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Users,
  FileText,
  AlertCircle,
  Target,
  Zap,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProposalHealthDashboard({ proposal, organization }) {
  const [healthMetric, setHealthMetric] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (proposal?.id) {
      loadHealthMetric();
    }
  }, [proposal?.id]);

  const loadHealthMetric = async () => {
    try {
      setLoading(true);
      const metrics = await base44.entities.ProposalHealthMetric.filter({
        proposal_id: proposal.id,
        organization_id: organization.id
      }, '-created_date', 1);

      if (metrics.length > 0) {
        setHealthMetric(metrics[0]);
      } else {
        // Calculate initial health metric
        await calculateHealth();
      }
    } catch (error) {
      console.error("Error loading health metric:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHealth = async () => {
    setCalculating(true);
    try {
      // Load all related data
      const [sections, tasks, comments, requirements] = await Promise.all([
        base44.entities.ProposalSection.filter({ proposal_id: proposal.id }),
        base44.entities.ProposalTask.filter({ proposal_id: proposal.id }),
        base44.entities.ProposalComment.filter({ proposal_id: proposal.id }),
        base44.entities.ComplianceRequirement.filter({ proposal_id: proposal.id })
      ]);

      // Calculate metrics
      const sectionsCompleted = sections.filter(s => s.status === 'approved').length;
      const sectionsInProgress = sections.filter(s => s.status === 'reviewed' || s.status === 'ai_generated').length;
      const sectionsNotStarted = sections.filter(s => s.status === 'draft').length;

      const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
      const tasksOverdue = tasks.filter(t => {
        if (t.status === 'completed' || !t.due_date) return false;
        return new Date(t.due_date) < new Date();
      }).length;

      const unresolvedComments = comments.filter(c => !c.is_resolved).length;

      const complianceTotal = requirements.length;
      const complianceMet = requirements.filter(r => r.compliance_status === 'compliant').length;
      const compliancePartial = requirements.filter(r => r.compliance_status === 'in_progress').length;
      const complianceMissing = requirements.filter(r => 
        r.compliance_status === 'not_started' || r.compliance_status === 'non_compliant'
      ).length;

      const totalWordCount = sections.reduce((sum, s) => sum + (s.word_count || 0), 0);

      // Calculate completion percentage
      const completionPercentage = sections.length > 0 
        ? Math.round((sectionsCompleted / sections.length) * 100) 
        : 0;

      // Calculate compliance score
      const complianceScore = complianceTotal > 0
        ? Math.round(((complianceMet + (compliancePartial * 0.5)) / complianceTotal) * 100)
        : 100;

      // Calculate quality score (based on completed sections and resolved comments)
      const qualityScore = Math.round(
        (sectionsCompleted / Math.max(sections.length, 1)) * 50 +
        ((comments.length - unresolvedComments) / Math.max(comments.length, 1)) * 50
      );

      // Calculate team engagement score (tasks completion + recent activity)
      const teamEngagementScore = Math.round(
        (tasksCompleted / Math.max(tasks.length, 1)) * 70 +
        (tasksOverdue === 0 ? 30 : 0)
      );

      // Overall health score (weighted average)
      const overallHealthScore = Math.round(
        completionPercentage * 0.4 +
        complianceScore * 0.3 +
        qualityScore * 0.2 +
        teamEngagementScore * 0.1
      );

      // Calculate days until deadline
      const daysUntilDeadline = proposal.due_date
        ? Math.ceil((new Date(proposal.due_date) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      // Determine risk level
      let riskLevel = 'low';
      if (daysUntilDeadline <= 3 || tasksOverdue > 3 || complianceMissing > 5) {
        riskLevel = 'critical';
      } else if (daysUntilDeadline <= 7 || tasksOverdue > 0 || complianceMissing > 2) {
        riskLevel = 'high';
      } else if (completionPercentage < 50 || complianceScore < 70) {
        riskLevel = 'medium';
      }

      // Identify risks
      const risksIdentified = [];
      if (daysUntilDeadline <= 7) {
        risksIdentified.push({
          risk_type: 'deadline',
          severity: daysUntilDeadline <= 3 ? 'critical' : 'high',
          description: `Only ${daysUntilDeadline} days until deadline`,
          recommendation: 'Prioritize critical sections and assign additional resources'
        });
      }
      if (complianceMissing > 0) {
        risksIdentified.push({
          risk_type: 'compliance',
          severity: complianceMissing > 5 ? 'critical' : 'medium',
          description: `${complianceMissing} compliance requirements not addressed`,
          recommendation: 'Review compliance matrix and address missing requirements immediately'
        });
      }
      if (tasksOverdue > 0) {
        risksIdentified.push({
          risk_type: 'team',
          severity: tasksOverdue > 3 ? 'high' : 'medium',
          description: `${tasksOverdue} tasks are overdue`,
          recommendation: 'Reassign tasks or extend deadlines'
        });
      }
      if (sectionsNotStarted > sections.length / 2) {
        risksIdentified.push({
          risk_type: 'scope',
          severity: 'high',
          description: `${sectionsNotStarted} sections not started`,
          recommendation: 'Create detailed work plan and assign section owners'
        });
      }

      // Recommended actions
      const recommendedActions = [];
      if (sectionsNotStarted > 0) {
        recommendedActions.push({
          priority: 'high',
          action: `Start writing ${sectionsNotStarted} remaining sections`,
          estimated_time_hours: sectionsNotStarted * 3,
          assigned_to: 'Team Lead'
        });
      }
      if (complianceMissing > 0) {
        recommendedActions.push({
          priority: 'urgent',
          action: `Address ${complianceMissing} missing compliance requirements`,
          estimated_time_hours: complianceMissing * 1,
          assigned_to: 'Compliance Manager'
        });
      }
      if (unresolvedComments > 0) {
        recommendedActions.push({
          priority: 'medium',
          action: `Resolve ${unresolvedComments} open comments`,
          estimated_time_hours: unresolvedComments * 0.5,
          assigned_to: 'Section Authors'
        });
      }

      const healthData = {
        proposal_id: proposal.id,
        organization_id: organization.id,
        overall_health_score: overallHealthScore,
        completion_percentage: completionPercentage,
        compliance_score: complianceScore,
        quality_score: qualityScore,
        team_engagement_score: teamEngagementScore,
        risk_level: riskLevel,
        days_until_deadline: daysUntilDeadline,
        is_on_track: riskLevel === 'low' || riskLevel === 'medium',
        sections_completed: sectionsCompleted,
        sections_total: sections.length,
        sections_in_progress: sectionsInProgress,
        sections_not_started: sectionsNotStarted,
        compliance_requirements_total: complianceTotal,
        compliance_requirements_met: complianceMet,
        compliance_requirements_partial: compliancePartial,
        compliance_requirements_missing: complianceMissing,
        total_word_count: totalWordCount,
        comments_unresolved: unresolvedComments,
        tasks_total: tasks.length,
        tasks_completed: tasksCompleted,
        tasks_overdue: tasksOverdue,
        risks_identified: risksIdentified,
        recommended_actions: recommendedActions,
        submission_readiness_percentage: Math.round(
          completionPercentage * 0.5 + complianceScore * 0.5
        ),
        calculated_date: new Date().toISOString()
      };

      const created = await base44.entities.ProposalHealthMetric.create(healthData);
      setHealthMetric(created);
    } catch (error) {
      console.error("Error calculating health:", error);
      alert("Error calculating proposal health. Please try again.");
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!healthMetric) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-12 text-center">
          <Target className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Proposal Health Analysis
          </h3>
          <p className="text-slate-600 mb-6">
            Get instant insights into your proposal's readiness, compliance, and risks.
          </p>
          <Button onClick={calculateHealth} disabled={calculating}>
            {calculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Calculate Health Score
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card className="border-none shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Proposal Health</h2>
              <p className="text-sm text-slate-600">
                Last calculated {new Date(healthMetric.calculated_date).toLocaleString()}
              </p>
            </div>
            <Button variant="outline" onClick={calculateHealth} disabled={calculating}>
              {calculating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Recalculate
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Overall Score */}
            <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
              <div className="relative">
                <svg className="w-48 h-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-slate-200"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - healthMetric.overall_health_score / 100)}`}
                    className={cn(
                      "transition-all duration-1000",
                      getScoreColor(healthMetric.overall_health_score)
                    )}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={cn("text-5xl font-bold", getScoreColor(healthMetric.overall_health_score))}>
                    {healthMetric.overall_health_score}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">Health Score</div>
                </div>
              </div>
              <Badge className={cn("mt-4 px-4 py-1", getRiskColor(healthMetric.risk_level))}>
                {healthMetric.risk_level.toUpperCase()} RISK
              </Badge>
            </div>

            {/* Right: Key Metrics */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-slate-700">Completion</span>
                </div>
                <div className="text-right">
                  <div className={cn("text-2xl font-bold", getScoreColor(healthMetric.completion_percentage))}>
                    {healthMetric.completion_percentage}%
                  </div>
                  <div className="text-xs text-slate-500">
                    {healthMetric.sections_completed}/{healthMetric.sections_total} sections
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-slate-700">Compliance</span>
                </div>
                <div className="text-right">
                  <div className={cn("text-2xl font-bold", getScoreColor(healthMetric.compliance_score))}>
                    {healthMetric.compliance_score}%
                  </div>
                  <div className="text-xs text-slate-500">
                    {healthMetric.compliance_requirements_met}/{healthMetric.compliance_requirements_total} requirements
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-slate-700">Quality</span>
                </div>
                <div className="text-right">
                  <div className={cn("text-2xl font-bold", getScoreColor(healthMetric.quality_score))}>
                    {healthMetric.quality_score}%
                  </div>
                  <div className="text-xs text-slate-500">
                    {healthMetric.comments_unresolved} open issues
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span className="font-medium text-slate-700">Deadline</span>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-2xl font-bold",
                    healthMetric.days_until_deadline <= 3 ? 'text-red-600' :
                    healthMetric.days_until_deadline <= 7 ? 'text-orange-600' :
                    'text-green-600'
                  )}>
                    {healthMetric.days_until_deadline || '?'} days
                  </div>
                  <div className="text-xs text-slate-500">
                    {healthMetric.is_on_track ? 'On track' : 'At risk'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risks */}
      {healthMetric.risks_identified && healthMetric.risks_identified.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              Identified Risks ({healthMetric.risks_identified.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthMetric.risks_identified.map((risk, idx) => (
                <div key={idx} className="p-4 bg-white rounded-lg border border-red-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className={cn(
                      "w-5 h-5 mt-0.5",
                      risk.severity === 'critical' ? 'text-red-600' :
                      risk.severity === 'high' ? 'text-orange-600' :
                      'text-yellow-600'
                    )} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="capitalize">
                          {risk.risk_type.replace(/_/g, ' ')}
                        </Badge>
                        <Badge className={cn(
                          risk.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          risk.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        )}>
                          {risk.severity}
                        </Badge>
                      </div>
                      <p className="font-medium text-slate-900 mb-1">{risk.description}</p>
                      <p className="text-sm text-slate-600">
                        <strong>Recommendation:</strong> {risk.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Actions */}
      {healthMetric.recommended_actions && healthMetric.recommended_actions.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Target className="w-5 h-5" />
              Recommended Actions ({healthMetric.recommended_actions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthMetric.recommended_actions.map((action, idx) => (
                <div key={idx} className="p-4 bg-white rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      action.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      action.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn(
                          action.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                          action.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        )}>
                          {action.priority} priority
                        </Badge>
                        {action.estimated_time_hours && (
                          <span className="text-xs text-slate-500">
                            Est. {action.estimated_time_hours}h
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-slate-900 mb-1">{action.action}</p>
                      {action.assigned_to && (
                        <p className="text-sm text-slate-600">
                          <Users className="w-3 h-3 inline mr-1" />
                          {action.assigned_to}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Readiness */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Submission Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Overall Readiness</span>
                <span className={cn("text-2xl font-bold", getScoreColor(healthMetric.submission_readiness_percentage))}>
                  {healthMetric.submission_readiness_percentage}%
                </span>
              </div>
              <Progress value={healthMetric.submission_readiness_percentage} className="h-3" />
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Sections Status</div>
                <div className="text-lg font-bold text-slate-900">
                  {healthMetric.sections_completed} / {healthMetric.sections_total}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {healthMetric.sections_in_progress} in progress
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Tasks Status</div>
                <div className="text-lg font-bold text-slate-900">
                  {healthMetric.tasks_completed} / {healthMetric.tasks_total}
                </div>
                <div className="text-xs text-red-500 mt-1">
                  {healthMetric.tasks_overdue} overdue
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-600 mb-1">Word Count</div>
                <div className="text-lg font-bold text-slate-900">
                  {healthMetric.total_word_count.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Total words written
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}