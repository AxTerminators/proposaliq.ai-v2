import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Award,
  XCircle,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function WinLossAnalyzer({ proposal, organization }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");

  const runAnalysis = async () => {
    if (!proposal?.id || !organization?.id) return;

    setAnalyzing(true);
    try {
      // Load all related data
      const [sections, requirements, winThemes, competitorIntel, resources] = await Promise.all([
        base44.entities.ProposalSection.filter({ proposal_id: proposal.id }),
        base44.entities.ComplianceRequirement.filter({ proposal_id: proposal.id, organization_id: organization.id }),
        base44.entities.WinTheme.filter({ proposal_id: proposal.id, organization_id: organization.id }),
        base44.entities.CompetitorIntel.filter({ organization_id: organization.id }),
        base44.entities.ProposalResource.filter({ organization_id: organization.id })
      ]);

      // Build context for AI
      const proposalContext = {
        proposal_name: proposal.proposal_name,
        agency: proposal.agency_name,
        project_type: proposal.project_type,
        outcome: proposal.status,
        contract_value: proposal.contract_value,
        due_date: proposal.due_date,
        sections_count: sections.length,
        sections_completed: sections.filter(s => s.status === 'approved').length,
        compliance_total: requirements.length,
        compliance_met: requirements.filter(r => r.compliance_status === 'compliant').length,
        win_themes_count: winThemes.length,
        match_score: proposal.match_score,
        evaluation_results: proposal.evaluation_results
      };

      const isWin = proposal.status === 'won';
      const isLoss = proposal.status === 'lost';

      if (!isWin && !isLoss) {
        alert("This analysis only works for proposals marked as 'won' or 'lost'");
        setAnalyzing(false);
        return;
      }

      const prompt = `You are a government proposal win/loss analysis expert. Conduct a comprehensive ${isWin ? 'WIN' : 'LOSS'} analysis.

**PROPOSAL INFORMATION:**
${JSON.stringify(proposalContext, null, 2)}

**ANALYSIS TYPE:** ${isWin ? 'WIN ANALYSIS' : 'LOSS ANALYSIS'}

${isWin ? `
**YOUR TASK FOR WIN ANALYSIS:**
Analyze what went right and extract replicable success factors.

Provide a JSON response with:
{
  "win_factors": [
    {
      "factor": "string (what contributed to winning)",
      "impact": "high|medium|low",
      "evidence": "string (specific evidence)",
      "replicable": boolean (can this be repeated?)"
    }
  ],
  "competitive_advantages": [
    "string (what gave us the edge over competitors)"
  ],
  "effective_strategies": [
    "string (strategies that worked well)"
  ],
  "team_strengths": [
    "string (team/process strengths demonstrated)"
  ],
  "lessons_learned": [
    {
      "lesson": "string",
      "application": "string (how to apply to future proposals)",
      "priority": "high|medium|low"
    }
  ],
  "reusable_content": [
    "string (content/approaches worth reusing)"
  ],
  "recommended_best_practices": [
    "string (best practices to adopt going forward)"
  ],
  "win_probability_factors": [
    "string (factors that increased win probability)"
  ],
  "overall_assessment": "string (comprehensive summary of why we won)"
}
` : `
**YOUR TASK FOR LOSS ANALYSIS:**
Analyze what went wrong and provide actionable improvements.

Provide a JSON response with:
{
  "loss_factors": [
    {
      "factor": "string (what contributed to losing)",
      "severity": "critical|high|medium|low",
      "evidence": "string (specific evidence)",
      "preventable": boolean (could this have been avoided?)"
    }
  ],
  "competitive_disadvantages": [
    "string (where competitors had the edge)"
  ],
  "missed_opportunities": [
    "string (opportunities we didn't capitalize on)"
  ],
  "process_gaps": [
    "string (gaps in our process or approach)"
  ],
  "lessons_learned": [
    {
      "lesson": "string",
      "corrective_action": "string (how to prevent in future)",
      "priority": "critical|high|medium|low"
    }
  ],
  "improvement_areas": [
    {
      "area": "string (what needs improvement)",
      "recommendation": "string (specific recommendation)",
      "impact": "high|medium|low"
    }
  ],
  "pricing_analysis": "string (if pricing was a factor, analyze)",
  "compliance_analysis": "string (if compliance issues, analyze)",
  "overall_assessment": "string (comprehensive summary of why we lost)"
}
`}

Be specific, honest, and actionable. Focus on insights that can improve future proposals.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: isWin ? {
            win_factors: { type: "array" },
            competitive_advantages: { type: "array", items: { type: "string" } },
            effective_strategies: { type: "array", items: { type: "string" } },
            team_strengths: { type: "array", items: { type: "string" } },
            lessons_learned: { type: "array" },
            reusable_content: { type: "array", items: { type: "string" } },
            recommended_best_practices: { type: "array", items: { type: "string" } },
            win_probability_factors: { type: "array", items: { type: "string" } },
            overall_assessment: { type: "string" }
          } : {
            loss_factors: { type: "array" },
            competitive_disadvantages: { type: "array", items: { type: "string" } },
            missed_opportunities: { type: "array", items: { type: "string" } },
            process_gaps: { type: "array", items: { type: "string" } },
            lessons_learned: { type: "array" },
            improvement_areas: { type: "array" },
            pricing_analysis: { type: "string" },
            compliance_analysis: { type: "string" },
            overall_assessment: { type: "string" }
          }
        }
      });

      setAnalysis({
        ...result,
        analyzed_date: new Date().toISOString(),
        outcome: proposal.status
      });

      // Save analysis to proposal
      await base44.entities.Proposal.update(proposal.id, {
        evaluation_results: JSON.stringify({
          ...JSON.parse(proposal.evaluation_results || '{}'),
          win_loss_analysis: result,
          win_loss_analysis_date: new Date().toISOString()
        })
      });

      alert("✓ Win/Loss analysis complete!");

    } catch (error) {
      console.error("Error running analysis:", error);
      alert("Error running analysis: " + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAdditionalNotes = async () => {
    if (!additionalNotes.trim()) return;

    setSavingNotes(true);
    try {
      const currentEvalResults = JSON.parse(proposal.evaluation_results || '{}');
      await base44.entities.Proposal.update(proposal.id, {
        evaluation_results: JSON.stringify({
          ...currentEvalResults,
          win_loss_notes: additionalNotes,
          win_loss_notes_date: new Date().toISOString()
        })
      });
      alert("✓ Notes saved successfully!");
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Error saving notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const isWin = proposal?.status === 'won';
  const isLoss = proposal?.status === 'lost';

  if (!isWin && !isLoss) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-12 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Not Available Yet
          </h3>
          <p className="text-slate-600">
            Win/Loss analysis is only available after marking the proposal as "Won" or "Lost"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={cn(
        "border-none shadow-xl",
        isWin ? "bg-gradient-to-br from-green-50 to-white" : "bg-gradient-to-br from-red-50 to-white"
      )}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                {isWin ? (
                  <>
                    <Award className="w-6 h-6 text-green-600" />
                    Win Analysis
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-600" />
                    Loss Analysis
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {isWin 
                  ? "Extract lessons and best practices from this win"
                  : "Identify improvement opportunities from this loss"}
              </CardDescription>
            </div>
            <Button onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {analysis ? 'Refresh Analysis' : 'Run Analysis'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {!analysis ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Ready to Analyze
            </h3>
            <p className="text-slate-600 mb-6">
              Run AI-powered {isWin ? 'win' : 'loss'} analysis to extract actionable insights 
              and improve future proposals.
            </p>
            <Button onClick={runAnalysis} disabled={analyzing} size="lg">
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run {isWin ? 'Win' : 'Loss'} Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overall Assessment */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Overall Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {analysis.overall_assessment}
              </p>
            </CardContent>
          </Card>

          <Tabs defaultValue={isWin ? "factors" : "factors"} className="space-y-6">
            <TabsList className={cn(
              "grid w-full",
              isWin ? "grid-cols-4" : "grid-cols-4"
            )}>
              <TabsTrigger value="factors">
                {isWin ? 'Win Factors' : 'Loss Factors'}
              </TabsTrigger>
              <TabsTrigger value="lessons">Lessons Learned</TabsTrigger>
              <TabsTrigger value="competitive">Competitive Analysis</TabsTrigger>
              <TabsTrigger value="actions">Recommended Actions</TabsTrigger>
            </TabsList>

            {/* Win/Loss Factors */}
            <TabsContent value="factors">
              <div className="space-y-4">
                {isWin ? (
                  analysis.win_factors?.map((factor, idx) => (
                    <Card key={idx} className="border-green-200 bg-green-50">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-green-900">{factor.factor}</h3>
                              <Badge className={cn(
                                factor.impact === 'high' ? 'bg-green-600 text-white' :
                                factor.impact === 'medium' ? 'bg-green-100 text-green-700' :
                                'bg-green-50 text-green-600'
                              )}>
                                {factor.impact} impact
                              </Badge>
                              {factor.replicable && (
                                <Badge variant="outline" className="text-green-700">
                                  ✓ Replicable
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-green-800">{factor.evidence}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  analysis.loss_factors?.map((factor, idx) => (
                    <Card key={idx} className="border-red-200 bg-red-50">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-red-900">{factor.factor}</h3>
                              <Badge className={cn(
                                factor.severity === 'critical' ? 'bg-red-600 text-white' :
                                factor.severity === 'high' ? 'bg-red-500 text-white' :
                                factor.severity === 'medium' ? 'bg-red-100 text-red-700' :
                                'bg-red-50 text-red-600'
                              )}>
                                {factor.severity} severity
                              </Badge>
                              {factor.preventable && (
                                <Badge variant="outline" className="text-red-700">
                                  Preventable
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-red-800">{factor.evidence}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Lessons Learned */}
            <TabsContent value="lessons">
              <div className="space-y-4">
                {analysis.lessons_learned?.map((lesson, idx) => (
                  <Card key={idx} className="border-blue-200 bg-blue-50">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-blue-900">{lesson.lesson}</h3>
                            <Badge className={cn(
                              (lesson.priority === 'critical' || lesson.priority === 'high') ? 'bg-blue-600 text-white' :
                              lesson.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                              'bg-blue-50 text-blue-600'
                            )}>
                              {lesson.priority} priority
                            </Badge>
                          </div>
                          <p className="text-sm text-blue-800">
                            {isWin ? lesson.application : lesson.corrective_action}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Competitive Analysis */}
            <TabsContent value="competitive">
              <div className="space-y-4">
                {isWin ? (
                  <>
                    <Card className="border-purple-200 bg-purple-50">
                      <CardHeader>
                        <CardTitle className="text-base text-purple-900">Competitive Advantages</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {analysis.competitive_advantages?.map((adv, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <TrendingUp className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                              <span className="text-sm text-purple-900">{adv}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-indigo-200 bg-indigo-50">
                      <CardHeader>
                        <CardTitle className="text-base text-indigo-900">Team Strengths</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {analysis.team_strengths?.map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-indigo-600 mt-1 flex-shrink-0" />
                              <span className="text-sm text-indigo-900">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    <Card className="border-orange-200 bg-orange-50">
                      <CardHeader>
                        <CardTitle className="text-base text-orange-900">Competitive Disadvantages</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {analysis.competitive_disadvantages?.map((disadv, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <TrendingDown className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
                              <span className="text-sm text-orange-900">{disadv}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardHeader>
                        <CardTitle className="text-base text-yellow-900">Missed Opportunities</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {analysis.missed_opportunities?.map((opp, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                              <span className="text-sm text-yellow-900">{opp}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Recommended Actions */}
            <TabsContent value="actions">
              <div className="space-y-4">
                {isWin ? (
                  <>
                    <Card className="border-teal-200 bg-teal-50">
                      <CardHeader>
                        <CardTitle className="text-base text-teal-900">Best Practices to Adopt</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analysis.recommended_best_practices?.map((practice, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-teal-200">
                              <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                                {idx + 1}
                              </div>
                              <p className="text-sm text-teal-900">{practice}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-cyan-200 bg-cyan-50">
                      <CardHeader>
                        <CardTitle className="text-base text-cyan-900">Reusable Content & Approaches</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {analysis.reusable_content?.map((content, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-cyan-600 mt-1 flex-shrink-0" />
                              <span className="text-sm text-cyan-900">{content}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    <Card className="border-indigo-200 bg-indigo-50">
                      <CardHeader>
                        <CardTitle className="text-base text-indigo-900">Improvement Areas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analysis.improvement_areas?.map((area, idx) => (
                            <div key={idx} className="p-4 bg-white rounded-lg border border-indigo-200">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold text-indigo-900">{area.area}</h4>
                                <Badge className={cn(
                                  area.impact === 'high' ? 'bg-indigo-600 text-white' :
                                  area.impact === 'medium' ? 'bg-indigo-100 text-indigo-700' :
                                  'bg-indigo-50 text-indigo-600'
                                )}>
                                  {area.impact} impact
                                </Badge>
                              </div>
                              <p className="text-sm text-indigo-800">
                                <strong>Recommendation:</strong> {area.recommendation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {analysis.pricing_analysis && (
                      <Card className="border-purple-200 bg-purple-50">
                        <CardHeader>
                          <CardTitle className="text-base text-purple-900">Pricing Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-purple-900">{analysis.pricing_analysis}</p>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Additional Notes */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes & Observations</CardTitle>
              <CardDescription>
                Add your own notes and observations from team debriefs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={6}
                placeholder="What else did the team observe? Any feedback from the client? Additional context?"
              />
              <Button onClick={saveAdditionalNotes} disabled={savingNotes || !additionalNotes.trim()}>
                {savingNotes ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Notes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}