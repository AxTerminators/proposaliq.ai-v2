import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Users,
  Target,
  Sparkles,
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertCircle
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RedTeamReview({ proposal, user, organization, teamMembers, onMarkAsSubmitted, onSaveAndGoToPipeline }) {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [error, setError] = useState(null);
  const [manualFeedback, setManualFeedback] = useState("");

  // Fetch proposal sections and related data
  const { data: sections = [] } = useQuery({
    queryKey: ['proposal-sections', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.ProposalSection.filter({ proposal_id: proposal.id });
    },
    enabled: !!proposal?.id
  });

  const { data: complianceReqs = [] } = useQuery({
    queryKey: ['compliance-requirements', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.ComplianceRequirement.filter({ proposal_id: proposal.id });
    },
    enabled: !!proposal?.id
  });

  const { data: winThemes = [] } = useQuery({
    queryKey: ['win-themes', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.WinTheme.filter({ proposal_id: proposal.id });
    },
    enabled: !!proposal?.id
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['proposal-tasks', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.ProposalTask.filter({ proposal_id: proposal.id });
    },
    enabled: !!proposal?.id
  });

  const runAIRedTeamReview = async () => {
    if (!proposal?.id || !organization?.id) {
      alert("Proposal data is required");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Calculate current metrics
      const totalWordCount = sections.reduce((sum, s) => sum + (s.word_count || 0), 0);
      const sectionsComplete = sections.filter(s => s.status === 'approved' || s.status === 'reviewed').length;
      const completionPct = sections.length > 0 ? (sectionsComplete / sections.length) * 100 : 0;
      
      const requirementsMet = complianceReqs.filter(r => r.compliance_status === 'compliant').length;
      const compliancePct = complianceReqs.length > 0 ? (requirementsMet / complianceReqs.length) * 100 : 0;
      
      const tasksComplete = tasks.filter(t => t.status === 'completed').length;
      const taskCompletionPct = tasks.length > 0 ? (tasksComplete / tasks.length) * 100 : 0;

      const approvedWinThemes = winThemes.filter(wt => wt.status === 'approved').length;

      const daysUntilDue = proposal.due_date 
        ? Math.floor((new Date(proposal.due_date) - new Date()) / (1000 * 60 * 60 * 24))
        : null;

      // Get section content summaries (first 300 chars of each)
      const sectionSummaries = sections
        .filter(s => s.content && s.content.trim())
        .map(s => ({
          name: s.section_name,
          status: s.status,
          word_count: s.word_count,
          preview: s.content.replace(/<[^>]*>/g, '').substring(0, 300)
        }))
        .slice(0, 10); // Limit to prevent token overflow

      // Build comprehensive AI prompt
      const prompt = `You are an expert Red Team Reviewer for government proposals with 20+ years of experience. Conduct a comprehensive, critical review of this proposal as if you were a senior evaluator preparing it for submission.

**PROPOSAL OVERVIEW:**
- Proposal: ${proposal.proposal_name}
- Agency: ${proposal.agency_name}
- Project: ${proposal.project_title}
- Type: ${proposal.project_type}
- Value: ${proposal.contract_value ? '$' + proposal.contract_value.toLocaleString() : 'Unknown'}
- Due Date: ${proposal.due_date || 'Not Set'}
- Days Until Due: ${daysUntilDue !== null ? daysUntilDue : 'Unknown'}

**CURRENT METRICS:**
- Total Word Count: ${totalWordCount.toLocaleString()}
- Sections Completed: ${sectionsComplete}/${sections.length} (${completionPct.toFixed(1)}%)
- Compliance Requirements Met: ${requirementsMet}/${complianceReqs.length} (${compliancePct.toFixed(1)}%)
- Tasks Completed: ${tasksComplete}/${tasks.length} (${taskCompletionPct.toFixed(1)}%)
- Approved Win Themes: ${approvedWinThemes}/${winThemes.length}
- Team Members: ${teamMembers?.length || 0}

**SECTION SUMMARIES (First 10):**
${sectionSummaries.map(s => `
- **${s.name}** (${s.status}, ${s.word_count} words)
  Preview: ${s.preview}...
`).join('\n')}

**RED TEAM EVALUATION CRITERIA:**
Your review should evaluate:
1. **Compliance**: Are ALL requirements addressed? Any gaps?
2. **Technical Approach**: Is it clear, feasible, innovative, and compelling?
3. **Management Plan**: Is it realistic, detailed, and demonstrates capability?
4. **Past Performance**: Is it relevant and compelling?
5. **Writing Quality**: Clarity, persuasiveness, grammar, formatting
6. **Win Themes**: Are they effectively woven throughout?
7. **Competitive Position**: What are our differentiators? Any weaknesses?
8. **Submission Readiness**: Is this ready to submit?
9. **Risk Assessment**: What could cause us to lose?
10. **Evaluator Perspective**: How would a government evaluator score this?

**YOUR TASK:**
Provide a brutally honest, comprehensive Red Team review. Don't hold back - identify every weakness, gap, and risk. This is the final quality check before submission.

Return detailed JSON with actionable, specific feedback.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Overall quality score (0-100)"
            },
            submission_readiness: {
              type: "string",
              enum: ["ready", "minor_revisions_needed", "major_revisions_needed", "not_ready"],
              description: "Readiness for submission"
            },
            readiness_percentage: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Percentage ready for submission"
            },
            category_scores: {
              type: "object",
              properties: {
                compliance: { type: "number", minimum: 0, maximum: 100 },
                technical_quality: { type: "number", minimum: 0, maximum: 100 },
                management_clarity: { type: "number", minimum: 0, maximum: 100 },
                writing_quality: { type: "number", minimum: 0, maximum: 100 },
                competitive_strength: { type: "number", minimum: 0, maximum: 100 },
                win_theme_integration: { type: "number", minimum: 0, maximum: 100 },
                past_performance_relevance: { type: "number", minimum: 0, maximum: 100 },
                pricing_competitiveness: { type: "number", minimum: 0, maximum: 100 }
              }
            },
            critical_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  category: { type: "string" },
                  issue: { type: "string" },
                  impact: { type: "string" },
                  recommendation: { type: "string" },
                  estimated_time_to_fix_hours: { type: "number" }
                }
              },
              description: "Critical issues that MUST be addressed"
            },
            strengths: {
              type: "array",
              items: { type: "string" },
              description: "Top 5-7 strengths of the proposal"
            },
            weaknesses: {
              type: "array",
              items: { type: "string" },
              description: "Top 5-7 weaknesses that need attention"
            },
            compliance_gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  requirement: { type: "string" },
                  gap_description: { type: "string" },
                  where_to_address: { type: "string" },
                  priority: { type: "string", enum: ["urgent", "high", "medium", "low"] }
                }
              },
              description: "Specific compliance gaps identified"
            },
            win_probability_assessment: {
              type: "object",
              properties: {
                estimated_win_probability: { type: "number", minimum: 0, maximum: 100 },
                confidence_level: { type: "string", enum: ["high", "medium", "low"] },
                key_factors_for_win: { type: "array", items: { type: "string" } },
                key_factors_for_loss: { type: "array", items: { type: "string" } }
              }
            },
            section_by_section_feedback: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_name: { type: "string" },
                  score: { type: "number", minimum: 0, maximum: 10 },
                  strengths: { type: "array", items: { type: "string" } },
                  improvements_needed: { type: "array", items: { type: "string" } }
                }
              },
              description: "Section-by-section detailed feedback (top 5 sections)"
            },
            recommended_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string", enum: ["urgent", "high", "medium", "low"] },
                  action: { type: "string" },
                  rationale: { type: "string" },
                  estimated_hours: { type: "number" },
                  assigned_to_role: { type: "string" }
                }
              },
              description: "Prioritized action items (top 10)"
            },
            evaluator_perspective: {
              type: "object",
              properties: {
                likely_score: { type: "number" },
                scoring_rationale: { type: "string" },
                what_evaluators_will_like: { type: "array", items: { type: "string" } },
                what_evaluators_will_question: { type: "array", items: { type: "string" } }
              }
            },
            final_go_no_go_recommendation: {
              type: "object",
              properties: {
                recommendation: { type: "string", enum: ["go", "go_with_revisions", "no_go"] },
                reasoning: { type: "string" },
                conditions_for_go: { type: "array", items: { type: "string" } }
              }
            }
          },
          required: [
            "overall_score",
            "submission_readiness",
            "readiness_percentage",
            "category_scores",
            "critical_issues",
            "strengths",
            "weaknesses",
            "recommended_actions",
            "final_go_no_go_recommendation"
          ]
        }
      });

      // Add metadata
      const enrichedResult = {
        ...result,
        review_date: new Date().toISOString(),
        reviewer_type: "AI Red Team",
        proposal_snapshot: {
          sections_total: sections.length,
          sections_complete: sectionsComplete,
          compliance_percentage: compliancePct,
          total_word_count: totalWordCount,
          days_until_due: daysUntilDue
        }
      };

      setReviewData(enrichedResult);

      // Optionally save to proposal
      if (proposal?.id) {
        await base44.entities.Proposal.update(proposal.id, {
          red_team_review: JSON.stringify(enrichedResult),
          red_team_review_date: new Date().toISOString()
        });
      }

    } catch (err) {
      console.error("Error running Red Team review:", err);
      setError(err);
    } finally {
      setAnalyzing(false);
    }
  };

  // Load existing review if available
  useEffect(() => {
    if (proposal?.red_team_review) {
      try {
        const parsed = JSON.parse(proposal.red_team_review);
        setReviewData(parsed);
      } catch (e) {
        console.error("Error parsing red team review:", e);
      }
    }
  }, [proposal?.red_team_review]);

  const getSeverityColor = (severity) => {
    const colors = {
      critical: "bg-red-100 text-red-800 border-red-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-green-100 text-green-800 border-green-300"
    };
    return colors[severity] || colors.medium;
  };

  const getReadinessColor = (readiness) => {
    const colors = {
      ready: "text-green-600 bg-green-50",
      minor_revisions_needed: "text-yellow-600 bg-yellow-50",
      major_revisions_needed: "text-orange-600 bg-orange-50",
      not_ready: "text-red-600 bg-red-50"
    };
    return colors[readiness] || colors.not_ready;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-red-50 to-orange-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Red Team Review</CardTitle>
                <CardDescription>Comprehensive AI-powered quality assurance and final check</CardDescription>
              </div>
            </div>
            <Button
              onClick={runAIRedTeamReview}
              disabled={analyzing}
              className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run AI Red Team Review
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Review Results */}
      {reviewData && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">Critical Issues</TabsTrigger>
            <TabsTrigger value="sections">By Section</TabsTrigger>
            <TabsTrigger value="actions">Action Items</TabsTrigger>
            <TabsTrigger value="decision">Go/No-Go</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Overall Score */}
            <Card className="border-none shadow-xl">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <div className="inline-block p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl mb-4">
                    <p className="text-7xl font-bold text-indigo-600 mb-2">
                      {reviewData.overall_score}
                    </p>
                    <p className="text-sm text-slate-600 uppercase tracking-wider">Overall Quality Score</p>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <Badge className={getReadinessColor(reviewData.submission_readiness)} size="lg">
                      {reviewData.submission_readiness.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800" size="lg">
                      {reviewData.readiness_percentage}% READY
                    </Badge>
                  </div>
                </div>

                {/* Category Scores */}
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(reviewData.category_scores || {}).map(([category, score]) => (
                    <div key={category} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-900 capitalize">
                          {category.replace(/_/g, ' ')}
                        </p>
                        <p className="text-2xl font-bold text-indigo-600">{score}</p>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-green-900">
                    <ThumbsUp className="w-5 h-5" />
                    Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {reviewData.strengths?.map((strength, idx) => (
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
                    <ThumbsDown className="w-5 h-5" />
                    Weaknesses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {reviewData.weaknesses?.map((weakness, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-red-900">
                        <AlertTriangle className="w-4 h-4 mt-1 flex-shrink-0" />
                        <span className="text-sm">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Win Probability */}
            {reviewData.win_probability_assessment && (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Win Probability Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <p className="text-5xl font-bold text-indigo-600 mb-2">
                      {reviewData.win_probability_assessment.estimated_win_probability}%
                    </p>
                    <Badge className="capitalize">
                      {reviewData.win_probability_assessment.confidence_level} Confidence
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-green-900 mb-3">Key Factors for Win:</h4>
                      <ul className="space-y-2">
                        {reviewData.win_probability_assessment.key_factors_for_win?.map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-red-900 mb-3">Key Factors for Loss:</h4>
                      <ul className="space-y-2">
                        {reviewData.win_probability_assessment.key_factors_for_loss?.map((factor, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Critical Issues Tab */}
          <TabsContent value="issues" className="space-y-4">
            {reviewData.critical_issues?.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-900 mb-2">No Critical Issues Found!</h3>
                  <p className="text-green-700">Your proposal is in excellent shape.</p>
                </CardContent>
              </Card>
            ) : (
              reviewData.critical_issues?.map((issue, idx) => (
                <Card key={idx} className={`border-2 ${getSeverityColor(issue.severity)}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <AlertTriangle className={`w-6 h-6 mt-1 flex-shrink-0 ${
                          issue.severity === 'critical' ? 'text-red-600' : 
                          issue.severity === 'high' ? 'text-orange-600' : 
                          issue.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-slate-900">{issue.issue}</h4>
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">{issue.category}</Badge>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Impact:</span>
                              <p className="text-slate-600 mt-1">{issue.impact}</p>
                            </div>
                            
                            <div>
                              <span className="font-medium text-green-700">Recommendation:</span>
                              <p className="text-slate-700 mt-1">{issue.recommendation}</p>
                            </div>

                            {issue.estimated_time_to_fix_hours && (
                              <Badge variant="outline" className="text-xs">
                                ~{issue.estimated_time_to_fix_hours}h to fix
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {/* Compliance Gaps */}
            {reviewData.compliance_gaps && reviewData.compliance_gaps.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-lg text-red-900">Compliance Gaps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reviewData.compliance_gaps.map((gap, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border-2 border-red-200">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-semibold text-slate-900">{gap.requirement}</p>
                          <Badge className={getSeverityColor(gap.priority)}>
                            {gap.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{gap.gap_description}</p>
                        <p className="text-xs text-slate-500">
                          <span className="font-medium">Address in:</span> {gap.where_to_address}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Section-by-Section Tab */}
          <TabsContent value="sections" className="space-y-4">
            {reviewData.section_by_section_feedback?.map((section, idx) => (
              <Card key={idx} className="border-2 hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900 text-lg">{section.section_name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold text-indigo-600">{section.score}</span>
                      <span className="text-sm text-slate-500">/10</span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-green-900 mb-2">Strengths:</h4>
                      <ul className="space-y-1">
                        {section.strengths?.map((str, i) => (
                          <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 text-green-600 mt-1 flex-shrink-0" />
                            {str}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-orange-900 mb-2">Improvements Needed:</h4>
                      <ul className="space-y-1">
                        {section.improvements_needed?.map((imp, i) => (
                          <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                            <AlertCircle className="w-3 h-3 text-orange-600 mt-1 flex-shrink-0" />
                            {imp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Action Items Tab */}
          <TabsContent value="actions" className="space-y-4">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle>Prioritized Action Items</CardTitle>
                <CardDescription>Recommended actions to improve the proposal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reviewData.recommended_actions?.map((action, idx) => (
                    <div key={idx} className="p-4 border-2 rounded-lg hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900 mb-1">{action.action}</p>
                            <p className="text-sm text-slate-600 mb-2">{action.rationale}</p>
                            <div className="flex items-center gap-2">
                              <Badge className={getSeverityColor(action.priority)}>
                                {action.priority.toUpperCase()} PRIORITY
                              </Badge>
                              {action.estimated_hours && (
                                <Badge variant="outline" className="text-xs">
                                  ~{action.estimated_hours}h
                                </Badge>
                              )}
                              {action.assigned_to_role && (
                                <Badge variant="outline" className="text-xs">
                                  {action.assigned_to_role}
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

            {/* Evaluator Perspective */}
            {reviewData.evaluator_perspective && (
              <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-purple-600" />
                    Government Evaluator Perspective
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <p className="text-sm text-slate-600 mb-2">Likely Evaluation Score:</p>
                    <p className="text-5xl font-bold text-purple-600 mb-2">
                      {reviewData.evaluator_perspective.likely_score}
                    </p>
                    <p className="text-slate-700">{reviewData.evaluator_perspective.scoring_rationale}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-green-900 mb-3">What Evaluators Will Like:</h4>
                      <ul className="space-y-2">
                        {reviewData.evaluator_perspective.what_evaluators_will_like?.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <ThumbsUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-orange-900 mb-3">What Evaluators Will Question:</h4>
                      <ul className="space-y-2">
                        {reviewData.evaluator_perspective.what_evaluators_will_question?.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Go/No-Go Decision Tab */}
          <TabsContent value="decision" className="space-y-6">
            {reviewData.final_go_no_go_recommendation && (
              <Card className={`border-none shadow-xl ${
                reviewData.final_go_no_go_recommendation.recommendation === 'go' ? 'bg-gradient-to-br from-green-50 to-emerald-50' :
                reviewData.final_go_no_go_recommendation.recommendation === 'go_with_revisions' ? 'bg-gradient-to-br from-yellow-50 to-amber-50' :
                'bg-gradient-to-br from-red-50 to-orange-50'
              }`}>
                <CardHeader>
                  <div className="text-center">
                    <h2 className="text-3xl font-bold mb-2">
                      {reviewData.final_go_no_go_recommendation.recommendation === 'go' ? '✅ GO FOR SUBMISSION' :
                       reviewData.final_go_no_go_recommendation.recommendation === 'go_with_revisions' ? '⚠️ GO WITH REVISIONS' :
                       '🛑 NO-GO'}
                    </h2>
                    <p className="text-lg text-slate-700">{reviewData.final_go_no_go_recommendation.reasoning}</p>
                  </div>
                </CardHeader>

                {reviewData.final_go_no_go_recommendation.conditions_for_go && (
                  <CardContent>
                    <h3 className="font-semibold text-slate-900 mb-3">Conditions for GO:</h3>
                    <ul className="space-y-2">
                      {reviewData.final_go_no_go_recommendation.conditions_for_go.map((condition, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-slate-700">{condition}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              {onMarkAsSubmitted && (
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  onClick={onMarkAsSubmitted}
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Mark as Submitted
                </Button>
              )}
              
              {onSaveAndGoToPipeline && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onSaveAndGoToPipeline}
                >
                  Save and Return to Pipeline
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Manual Feedback Section */}
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Additional Team Feedback
          </CardTitle>
          <CardDescription>Add manual feedback from team members</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={manualFeedback}
            onChange={(e) => setManualFeedback(e.target.value)}
            placeholder="Enter any additional feedback from team review sessions..."
            rows={6}
            className="mb-4"
          />
          <Button>
            <FileText className="w-4 h-4 mr-2" />
            Save Feedback
          </Button>
        </CardContent>
      </Card>

      {reviewData?.review_date && (
        <p className="text-xs text-center text-slate-500">
          Last review: {new Date(reviewData.review_date).toLocaleString()}
        </p>
      )}
    </div>
  );
}