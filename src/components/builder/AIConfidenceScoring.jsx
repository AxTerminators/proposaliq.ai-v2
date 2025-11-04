import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  Target,
  Shield,
  FileCheck,
  Users,
  Sparkles
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AIConfidenceScoring({ proposal, onScoreCalculated }) {
  const [calculating, setCalculating] = useState(false);
  const [confidenceData, setConfidenceData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (proposal?.ai_confidence_score) {
      try {
        const parsed = JSON.parse(proposal.ai_confidence_score);
        setConfidenceData(parsed);
      } catch (e) {
        console.error("Error parsing confidence score:", e);
      }
    }
  }, [proposal?.ai_confidence_score]);

  const calculateConfidenceScore = async () => {
    if (!proposal?.id) {
      setError("Proposal ID is required");
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      // Fetch all relevant data for confidence calculation
      const [sections, requirements, tasks, teamMembers, resources, winThemes, competitors] = await Promise.all([
        base44.entities.ProposalSection.filter({ proposal_id: proposal.id }),
        base44.entities.ComplianceRequirement.filter({ proposal_id: proposal.id }),
        base44.entities.ProposalTask.filter({ proposal_id: proposal.id }),
        base44.entities.User.list().then(users => {
          const assignedEmails = proposal.assigned_team_members || [];
          return users.filter(u => assignedEmails.includes(u.email));
        }),
        base44.entities.ProposalResource.filter({ organization_id: proposal.organization_id }),
        base44.entities.WinTheme.filter({ proposal_id: proposal.id }),
        base44.entities.CompetitorIntel.filter({ organization_id: proposal.organization_id })
      ]);

      // Calculate basic metrics
      const sectionsTotal = sections.length;
      const sectionsComplete = sections.filter(s => s.status === 'approved' || s.status === 'reviewed').length;
      const completionPct = sectionsTotal > 0 ? (sectionsComplete / sectionsTotal) * 100 : 0;

      const requirementsTotal = requirements.length;
      const requirementsMet = requirements.filter(r => r.compliance_status === 'compliant').length;
      const compliancePct = requirementsTotal > 0 ? (requirementsMet / requirementsTotal) * 100 : 0;

      const tasksTotal = tasks.length;
      const tasksComplete = tasks.filter(t => t.status === 'completed').length;
      const taskCompletionPct = tasksTotal > 0 ? (tasksComplete / tasksTotal) * 100 : 0;

      const daysUntilDue = proposal.due_date 
        ? Math.floor((new Date(proposal.due_date) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      const totalWordCount = sections.reduce((sum, s) => sum + (s.word_count || 0), 0);

      // Build comprehensive AI prompt
      const prompt = `You are an expert proposal analyst. Calculate a comprehensive WIN CONFIDENCE SCORE for this government proposal.

**PROPOSAL OVERVIEW:**
- Name: ${proposal.proposal_name}
- Agency: ${proposal.agency_name}
- Type: ${proposal.project_type}
- Value: ${proposal.contract_value ? '$' + proposal.contract_value.toLocaleString() : 'Unknown'}
- Due in: ${daysUntilDue !== null ? daysUntilDue + ' days' : 'Unknown'}

**COMPLETION METRICS:**
- Sections: ${sectionsComplete}/${sectionsTotal} complete (${completionPct.toFixed(1)}%)
- Compliance: ${requirementsMet}/${requirementsTotal} requirements met (${compliancePct.toFixed(1)}%)
- Tasks: ${tasksComplete}/${tasksTotal} complete (${taskCompletionPct.toFixed(1)}%)
- Total Word Count: ${totalWordCount.toLocaleString()} words
- Team Size: ${teamMembers.length} members

**QUALITY INDICATORS:**
- Win Themes Developed: ${winThemes.length}
- Approved Win Themes: ${winThemes.filter(w => w.status === 'approved').length}
- Resources Available: ${resources.length}
- Competitors Analyzed: ${competitors.length}
- Strategic Evaluation: ${proposal.evaluation_results ? 'Complete' : 'Not Done'}
- Match Score: ${proposal.match_score || 'Not Calculated'}

**RISK FACTORS:**
- Days Until Due: ${daysUntilDue !== null ? daysUntilDue : 'Unknown'}
- Overdue Tasks: ${tasks.filter(t => t.status !== 'completed' && t.due_date && new Date(t.due_date) < new Date()).length}
- Missing Compliance: ${requirementsTotal - requirementsMet}
- Incomplete Sections: ${sectionsTotal - sectionsComplete}

**YOUR TASK:**
Provide a comprehensive confidence analysis with specific, actionable insights. Calculate scores for:

1. **Overall Confidence Score** (0-100): Master score combining all factors
2. **Win Probability** (0-100%): Likelihood of winning based on current state
3. **Completeness Score** (0-100): How complete the proposal is
4. **Compliance Score** (0-100): Compliance with requirements
5. **Quality Score** (0-100): Content quality, win themes, strategy
6. **Competitive Score** (0-100): Competitive positioning strength
7. **Team Readiness Score** (0-100): Team capacity and engagement

Return detailed JSON with actionable insights.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { 
              type: "number",
              description: "Overall confidence score 0-100"
            },
            win_probability: { 
              type: "number",
              description: "Win probability percentage 0-100"
            },
            confidence_level: { 
              type: "string",
              enum: ["critical", "low", "medium", "high", "excellent"],
              description: "Overall confidence level"
            },
            completeness_score: { type: "number" },
            compliance_score: { type: "number" },
            quality_score: { type: "number" },
            competitive_score: { type: "number" },
            team_readiness_score: { type: "number" },
            key_strengths: { 
              type: "array", 
              items: { type: "string" },
              description: "Top 3-5 strengths"
            },
            critical_concerns: { 
              type: "array", 
              items: { type: "string" },
              description: "Top 3-5 critical concerns"
            },
            recommended_actions: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
                  action: { type: "string" },
                  impact: { type: "string" },
                  estimated_hours: { type: "number" }
                }
              },
              description: "Top 5-7 prioritized actions"
            },
            timeline_assessment: {
              type: "object",
              properties: {
                is_on_track: { type: "boolean" },
                days_buffer: { type: "number" },
                risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                recommendation: { type: "string" }
              }
            },
            competitive_assessment: {
              type: "object",
              properties: {
                positioning: { type: "string", enum: ["weak", "moderate", "strong", "dominant"] },
                differentiators_strength: { type: "string" },
                gaps_identified: { type: "array", items: { type: "string" } }
              }
            }
          },
          required: [
            "overall_score", 
            "win_probability", 
            "confidence_level",
            "completeness_score",
            "compliance_score",
            "quality_score",
            "competitive_score",
            "team_readiness_score",
            "key_strengths",
            "critical_concerns",
            "recommended_actions"
          ]
        }
      });

      // Add calculation metadata
      const enrichedResult = {
        ...result,
        calculated_date: new Date().toISOString(),
        metrics_snapshot: {
          sections_complete: sectionsComplete,
          sections_total: sectionsTotal,
          compliance_met: requirementsMet,
          compliance_total: requirementsTotal,
          tasks_complete: tasksComplete,
          tasks_total: tasksTotal,
          days_until_due: daysUntilDue,
          total_word_count: totalWordCount,
          team_size: teamMembers.length
        }
      };

      setConfidenceData(enrichedResult);

      // Save to proposal
      await base44.entities.Proposal.update(proposal.id, {
        ai_confidence_score: JSON.stringify(enrichedResult),
        ai_score_date: new Date().toISOString()
      });

      if (onScoreCalculated) {
        onScoreCalculated(enrichedResult);
      }

    } catch (err) {
      console.error("Error calculating confidence score:", err);
      setError(err.message || "Failed to calculate confidence score");
    } finally {
      setCalculating(false);
    }
  };

  const getConfidenceLevelColor = (level) => {
    switch (level) {
      case "excellent":
        return "bg-emerald-600 text-white";
      case "high":
        return "bg-green-600 text-white";
      case "medium":
        return "bg-yellow-600 text-white";
      case "low":
        return "bg-orange-600 text-white";
      case "critical":
        return "bg-red-600 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">AI Confidence Score</CardTitle>
                <CardDescription>Comprehensive win probability analysis powered by AI</CardDescription>
              </div>
            </div>
            <Button 
              onClick={calculateConfidenceScore} 
              disabled={calculating}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {calculating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {confidenceData ? 'Recalculate Score' : 'Calculate Score'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {confidenceData && (
        <>
          {/* Overall Score Display */}
          <Card className="border-none shadow-xl">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <div className="inline-block p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-4">
                  <p className="text-7xl font-bold text-indigo-600 mb-2">
                    {confidenceData.overall_score}
                  </p>
                  <p className="text-sm text-slate-600 uppercase tracking-wider">Overall Confidence Score</p>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Badge className={getConfidenceLevelColor(confidenceData.confidence_level)} size="lg">
                    {confidenceData.confidence_level.toUpperCase()} CONFIDENCE
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-800" size="lg">
                    {confidenceData.win_probability}% WIN PROBABILITY
                  </Badge>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid md:grid-cols-3 gap-4 mt-8">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCheck className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-medium text-blue-900">Completeness</p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{confidenceData.completeness_score}</p>
                  <Progress value={confidenceData.completeness_score} className="mt-2 h-2" />
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-medium text-green-900">Compliance</p>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{confidenceData.compliance_score}</p>
                  <Progress value={confidenceData.compliance_score} className="mt-2 h-2" />
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <p className="text-sm font-medium text-purple-900">Quality</p>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">{confidenceData.quality_score}</p>
                  <Progress value={confidenceData.quality_score} className="mt-2 h-2" />
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    <p className="text-sm font-medium text-orange-900">Competitive Position</p>
                  </div>
                  <p className="text-3xl font-bold text-orange-600">{confidenceData.competitive_score}</p>
                  <Progress value={confidenceData.competitive_score} className="mt-2 h-2" />
                </div>

                <div className="p-4 bg-indigo-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    <p className="text-sm font-medium text-indigo-900">Team Readiness</p>
                  </div>
                  <p className="text-3xl font-bold text-indigo-600">{confidenceData.team_readiness_score}</p>
                  <Progress value={confidenceData.team_readiness_score} className="mt-2 h-2" />
                </div>

                {confidenceData.timeline_assessment && (
                  <div className={`p-4 rounded-lg ${
                    confidenceData.timeline_assessment.risk_level === 'low' ? 'bg-green-50' :
                    confidenceData.timeline_assessment.risk_level === 'medium' ? 'bg-yellow-50' :
                    confidenceData.timeline_assessment.risk_level === 'high' ? 'bg-orange-50' :
                    'bg-red-50'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className={`w-5 h-5 ${
                        confidenceData.timeline_assessment.risk_level === 'low' ? 'text-green-600' :
                        confidenceData.timeline_assessment.risk_level === 'medium' ? 'text-yellow-600' :
                        confidenceData.timeline_assessment.risk_level === 'high' ? 'text-orange-600' :
                        'text-red-600'
                      }`} />
                      <p className={`text-sm font-medium ${
                        confidenceData.timeline_assessment.risk_level === 'low' ? 'text-green-900' :
                        confidenceData.timeline_assessment.risk_level === 'medium' ? 'text-yellow-900' :
                        confidenceData.timeline_assessment.risk_level === 'high' ? 'text-orange-900' :
                        'text-red-900'
                      }`}>Timeline Status</p>
                    </div>
                    <p className={`text-2xl font-bold ${
                      confidenceData.timeline_assessment.is_on_track ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {confidenceData.timeline_assessment.is_on_track ? 'On Track' : 'At Risk'}
                    </p>
                    <p className="text-xs mt-1 text-slate-600">
                      {confidenceData.timeline_assessment.days_buffer > 0 
                        ? `${confidenceData.timeline_assessment.days_buffer} days buffer`
                        : `${Math.abs(confidenceData.timeline_assessment.days_buffer)} days behind`
                      }
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Strengths and Concerns */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-green-900">
                  <CheckCircle2 className="w-5 h-5" />
                  Key Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {confidenceData.key_strengths?.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-green-900">
                      <CheckCircle2 className="w-4 h-4 mt-1 flex-shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-900">
                  <AlertTriangle className="w-5 h-5" />
                  Critical Concerns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {confidenceData.critical_concerns?.map((concern, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-red-900">
                      <AlertTriangle className="w-4 h-4 mt-1 flex-shrink-0" />
                      <span className="text-sm">{concern}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recommended Actions */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Recommended Actions</CardTitle>
              <CardDescription>Prioritized steps to improve your win probability</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {confidenceData.recommended_actions?.map((action, idx) => (
                  <div key={idx} className="p-4 border-2 rounded-lg hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 mb-1">{action.action}</p>
                          <p className="text-sm text-slate-600 mb-2">{action.impact}</p>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(action.priority)}>
                              {action.priority.toUpperCase()} PRIORITY
                            </Badge>
                            {action.estimated_hours && (
                              <Badge variant="outline" className="text-xs">
                                ~{action.estimated_hours}h
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metadata Footer */}
          {confidenceData.calculated_date && (
            <p className="text-xs text-center text-slate-500">
              Last calculated: {new Date(confidenceData.calculated_date).toLocaleString()}
            </p>
          )}
        </>
      )}
    </div>
  );
}