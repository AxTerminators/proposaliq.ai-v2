
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Send,
  Loader2,
  Eye,
  MessageCircle,
  Award,
  Target,
  Clock,
  Brain, // Added Brain icon
  TrendingUp,
  Shield,
  Lightbulb, // Added Lightbulb icon
  Users,
  Sparkles, // Added Sparkles icon
  XCircle // Added XCircle icon
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, // Kept for ExportDialog
  DialogContent, // Kept for ExportDialog
  DialogDescription, // Kept for ExportDialog
  DialogHeader, // Kept for ExportDialog
  DialogTitle, // Kept for ExportDialog
  DialogTrigger, // Kept for ExportDialog
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import ExportDialog from "../export/ExportDialog";
import VersionComparison from "./VersionComparison";
import SubmissionReadinessChecker from "./SubmissionReadinessChecker";
import RedTeamReview from "./RedTeamReview";
import moment from "moment";
import AICollaborationAssistant from "../collaboration/AICollaborationAssistant";

export default function Phase7({ proposal, user, organization, teamMembers }) {
  const queryClient = useQueryClient();
  const [showExport, setShowExport] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(null);

  // AI Confidence Scoring state
  const [isScoring, setIsScoring] = useState(false);
  const [aiScore, setAiScore] = useState(null);

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['proposal-sections', proposal.id],
    queryFn: async () => {
      return base44.entities.ProposalSection.filter({ proposal_id: proposal.id });
    },
    initialData: [],
    enabled: !!proposal.id,
  });

  const { data: sectionHistory } = useQuery({
    queryKey: ['section-history', proposal.id],
    queryFn: async () => {
      const allHistory = await base44.entities.ProposalSectionHistory.list();
      const proposalSectionIds = sections.map(s => s.id);
      return allHistory.filter(h => proposalSectionIds.includes(h.section_id));
    },
    enabled: sections.length > 0 && !!proposal.id,
    initialData: [],
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', proposal.id],
    queryFn: async () => {
      return base44.entities.ReviewRound.filter(
        { proposal_id: proposal.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!proposal.id,
  });

  const { data: tasks } = useQuery({
    queryKey: ['proposal-tasks', proposal.id],
    queryFn: async () => {
      return base44.entities.ProposalTask.filter({ proposal_id: proposal.id });
    },
    initialData: [],
    enabled: !!proposal.id,
  });

  const { data: comments } = useQuery({
    queryKey: ['proposal-comments', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.ProposalComment.filter({ proposal_id: proposal.id });
    },
    initialData: [],
    enabled: !!proposal?.id,
  });

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData) => {
      return await base44.entities.ReviewRound.create({
        ...reviewData,
        proposal_id: proposal.id,
        reviewer_email: user.email,
        reviewer_name: user.full_name,
        status: "in_progress"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setReviewNotes("");
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: async (updates) => {
      return await base44.entities.Proposal.update(proposal.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', proposal.id] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  const handleStartReview = (reviewType) => {
    createReviewMutation.mutate({
      review_type: reviewType,
      notes: reviewNotes
    });
  };

  const handleMarkAsSubmitted = async () => {
    await updateProposalMutation.mutateAsync({
      status: "submitted",
      submission_date: new Date().toISOString()
    });
  };

  const getCompletionScore = () => {
    if (sectionsLoading) return 0;
    const filledSections = sections.filter(s => s.content && s.content.trim().length > 0).length;
    const totalSections = sections.length;
    return totalSections > 0 ? Math.round((filledSections / totalSections) * 100) : 0;
  };

  const getQualityScore = () => {
    if (sectionsLoading) return 0;
    const scores = sections.map(s => {
      if (!s.content || s.content.trim().length === 0) return 0;
      const wordCount = s.content.split(/\s+/).length;
      if (wordCount < 100) return 50;
      if (wordCount < 500) return 75;
      return 100;
    });
    const avgScore = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    return Math.round(avgScore);
  };

  const getReadinessStatus = () => {
    const completion = getCompletionScore();
    const quality = getQualityScore();
    const pendingTasks = tasks.filter(t => t.status === "pending").length;
    const hasRedTeamReview = reviews.some(r => r.review_type === "red_team" && r.status === "completed");


    if (completion === 100 && quality >= 80 && pendingTasks === 0 && hasRedTeamReview && proposal.pricing_status === "final") {
      return { status: "ready", label: "Ready to Submit", color: "text-green-600" };
    } else if (completion >= 80 && quality >= 60 && pendingTasks < 3) {
      return { status: "almost", label: "Almost Ready", color: "text-amber-600" };
    } else {
      return { status: "not-ready", label: "Not Ready", color: "text-red-600" };
    }
  };

  // AI Confidence Scoring function
  const runAIScoring = async () => {
    if (!proposal.id || !organization) {
      alert("Please save the proposal first");
      return;
    }

    setIsScoring(true);
    try {
      // Gather comprehensive data
      const [
        solicitationDocs,
        proposalSections,
        pastPerformance,
        competitors,
        winThemes,
        complianceReqs,
        allProposals,
        pricingStrategy
      ] = await Promise.all([
        base44.entities.SolicitationDocument.filter({ proposal_id: proposal.id, organization_id: organization.id }),
        base44.entities.ProposalSection.filter({ proposal_id: proposal.id }),
        base44.entities.PastPerformance.filter({ organization_id: organization.id }),
        base44.entities.CompetitorIntel.filter({ organization_id: organization.id }),
        base44.entities.WinTheme.filter({ proposal_id: proposal.id }),
        base44.entities.ComplianceRequirement.filter({ proposal_id: proposal.id }),
        base44.entities.Proposal.filter({ organization_id: organization.id }),
        base44.entities.PricingStrategy.filter({ proposal_id: proposal.id }).then(r => r.length > 0 ? r[0] : null)
      ]);

      // Calculate historical win rate
      const completedProposals = allProposals.filter(p => ['won', 'lost'].includes(p.status));
      const wonProposals = completedProposals.filter(p => p.status === 'won');
      const historicalWinRate = completedProposals.length > 0
        ? (wonProposals.length / completedProposals.length) * 100
        : 0;

      // Process only solicitation documents (exclude sample proposals)
      const solicitationFileUrls = solicitationDocs
        .filter(doc => doc.file_url && doc.document_type !== 'reference')
        .map(doc => doc.file_url)
        .slice(0, 10);

      const prompt = `You are an elite AI proposal evaluator with expertise in government contracting, bid/no-bid analysis, and predictive win probability modeling.

**YOUR MISSION:** Provide a comprehensive, data-driven confidence score for this proposal's likelihood of winning, identifying specific strengths, weaknesses, risks, and actionable recommendations.

**IMPORTANT CONTEXT:** You are analyzing the WRITTEN PROPOSAL CONTENT, not sample documents. Focus on evaluating the actual proposal sections that have been drafted for submission.

**ORGANIZATION PROFILE:**
- Name: ${organization?.organization_name || 'N/A'}
- NAICS: ${organization?.primary_naics || 'N/A'}
- Certifications: ${organization?.certifications?.join(', ') || 'None'}
- Historical Win Rate: ${historicalWinRate.toFixed(1)}%
- Total Past Proposals: ${completedProposals.length}
- Wins: ${wonProposals.length} | Losses: ${completedProposals.length - wonProposals.length}

**OPPORTUNITY:**
- Proposal: ${proposal.proposal_name}
- Type: ${proposal.project_type}
- Agency: ${proposal.agency_name}
- Solicitation: ${proposal.solicitation_number}
- Due Date: ${proposal.due_date}
- Phase: ${proposal.current_phase}

**WRITTEN PROPOSAL CONTENT:**
- Sections Written: ${proposalSections.length}
- Total Words: ${proposalSections.reduce((sum, s) => sum + (s.word_count || 0), 0)}
- Sections Summary:
${proposalSections.map(s => `  • ${s.section_name} (${s.section_type}): ${s.word_count || 0} words, Status: ${s.status}`).join('\n')}

**PROPOSAL SECTIONS CONTENT (Evaluate this written content):**
${proposalSections.map(s => `
=== ${s.section_name} ===
${s.content || '[Not yet written]'}
`).join('\n\n')}

**STRATEGIC ELEMENTS:**
- Win Themes Defined: ${winThemes.length}
- Compliance Requirements: ${complianceReqs.length} (${complianceReqs.filter(c => c.compliance_status === 'compliant').length} compliant)

**COMPETITIVE LANDSCAPE:**
- Known Competitors: ${competitors.length}
- Past Performance Projects: ${pastPerformance.length}
- Relevant Past Performance: ${pastPerformance.filter(p => p.client_type === 'federal').length}

**PRICING:**
- Pricing Strategy: ${pricingStrategy?.pricing_approach || 'Not defined'}
- Win Probability at Price: ${pricingStrategy?.win_probability_at_price || 'N/A'}

**ANALYZE THE FOLLOWING:**
1. Requirements coverage & compliance based on written content
2. Content quality, persuasiveness, and completeness of the proposal sections
3. Win theme execution throughout the written proposal
4. Competitive positioning based on the written narrative
5. Past performance relevance and how well it's presented
6. Team strength as conveyed in the proposal
7. Pricing competitiveness
8. Risk factors in the current proposal state

Return a comprehensive JSON analysis with:

{
  "confidence_score": <number 0-100: AI confidence in winning based on the WRITTEN PROPOSAL>,
  "score_breakdown": {
    "requirements_alignment": <number 0-100>,
    "content_quality": <number 0-100>,
    "win_theme_execution": <number 0-100>,
    "competitive_strength": <number 0-100>,
    "past_performance_relevance": <number 0-100>,
    "team_capability": <number 0-100>,
    "pricing_competitiveness": <number 0-100>,
    "compliance_completeness": <number 0-100>
  },
  "recommendation": <string: "Strong Go", "Go", "Cautious Go", "No-Go">,
  "win_probability_estimate": <string: "Very High (>70%)", "High (50-70%)", "Medium (30-50%)", "Low (<30%)">,
  "executive_summary": <string: 2-3 sentence assessment of the WRITTEN PROPOSAL>,

  "strengths": [
    {
      "category": <string>,
      "strength": <string: specific strength in the written proposal>,
      "impact": <string: "high", "medium", "low">,
      "leverage_strategy": <string: how to maximize this in final edits>
    }
  ],

  "weaknesses": [
    {
      "category": <string>,
      "weakness": <string: specific weakness in the written proposal>,
      "severity": <string: "critical", "high", "medium", "low">,
      "improvement_action": <string: specific action to fix before submission>
    }
  ],

  "risk_factors": [
    {
      "risk": <string>,
      "probability": <string: "high", "medium", "low">,
      "impact": <string: "critical", "high", "medium", "low">,
      "mitigation": <string>
    }
  ],

  "section_analysis": [
    {
      "section_name": <string>,
      "score": <number 0-100>,
      "status": <string: "strong", "adequate", "weak", "missing">,
      "feedback": <string: specific feedback on the written content>,
      "priority_actions": [<string: what to improve in this section>]
    }
  ],

  "competitive_insights": {
    "our_advantages": [<string: based on written proposal>],
    "competitor_advantages": [<string>],
    "ghosting_opportunities": [<string: how to ghost competitors in final edits>],
    "market_positioning": <string>
  },

  "pricing_assessment": {
    "pricing_risk": <string: "low", "medium", "high">,
    "competitiveness": <string>,
    "recommendations": [<string>]
  },

  "immediate_priorities": [
    {
      "priority": <string>,
      "action": <string: what to do before submission>,
      "deadline": <string>,
      "owner": <string: suggested role>
    }
  ],

  "long_term_recommendations": [<string: for future proposals>],

  "confidence_factors": {
    "factors_increasing_confidence": [<string>],
    "factors_decreasing_confidence": [<string>]
  },

  "comparison_to_past_wins": <string: how this written proposal compares to your successful bids>,
  "learning_from_past_losses": <string: lessons from past losses to apply in final edits>
}

**CRITICAL:** Evaluate the WRITTEN PROPOSAL CONTENT provided above. Be brutally honest about the quality and completeness of what has been written. Provide specific, actionable feedback to improve the proposal before submission.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: solicitationFileUrls.length > 0 ? solicitationFileUrls : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            confidence_score: { type: "number" },
            score_breakdown: { type: "object" },
            recommendation: { type: "string" },
            win_probability_estimate: { type: "string" },
            executive_summary: { type: "string" },
            strengths: { type: "array" },
            weaknesses: { type: "array" },
            risk_factors: { type: "array" },
            section_analysis: { type: "array" },
            competitive_insights: { type: "object" },
            pricing_assessment: { type: "object" },
            immediate_priorities: { type: "array" },
            long_term_recommendations: { type: "array" },
            confidence_factors: { type: "object" },
            comparison_to_past_wins: { type: "string" },
            learning_from_past_losses: { type: "string" }
          }
        }
      });

      // Track token usage
      const currentUser = await base44.auth.me(); // Renamed 'user' to 'currentUser' to avoid conflict with prop
      await base44.entities.TokenUsage.create({
        organization_id: organization.id,
        user_email: currentUser.email,
        feature_type: "evaluation",
        tokens_used: 20000, // Placeholder, ideally this would come from LLM response
        llm_provider: "gemini",
        prompt: prompt?.substring(0, 500),
        response_preview: JSON.stringify(result)?.substring(0, 200),
        cost_estimate: (20000 / 1000000) * 0.5 // Placeholder, actual cost depends on model and tokens
      });

      const subs = await base44.entities.Subscription.filter({ organization_id: organization.id }, '-created_date', 1);
      if (subs.length > 0) {
        await base44.entities.Subscription.update(subs[0].id, {
          token_credits_used: (subs[0].token_credits_used || 0) + 20000 // Placeholder token usage
        });
      }

      setAiScore(result);

      // Save AI score to proposal
      await base44.entities.Proposal.update(proposal.id, {
        ai_confidence_score: JSON.stringify(result),
        ai_score_date: new Date().toISOString()
      });

      console.log("✓ AI Confidence Scoring completed successfully!");

    } catch (error) {
      console.error("Error running AI scoring:", error);
      alert(`Error running AI scoring: ${error.message || 'Please try again.'}`);
    }
    setIsScoring(false);
  };

  // Load existing AI score on mount
  useEffect(() => {
    const loadExistingScore = async () => {
      if (!proposal.id || !proposal.ai_confidence_score) return;
      try {
        setAiScore(JSON.parse(proposal.ai_confidence_score));
      } catch (error) {
        console.error("Error loading AI score from proposal:", error);
        setAiScore(null); // Clear invalid score
      }
    };
    loadExistingScore();
  }, [proposal.id, proposal.ai_confidence_score]); // Dependency on ai_confidence_score to react to external updates

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getSeverityColor = (severity) => {
    if (severity === "critical") return "border-red-300";
    if (severity === "high") return "border-orange-300";
    if (severity === "medium") return "border-amber-300";
    return "border-blue-300";
  };

  const completionScore = getCompletionScore();
  const qualityScore = getQualityScore();
  const readinessStatus = getReadinessStatus();
  const pendingTasksCount = tasks.filter(t => t.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* AI Collaboration Assistant */}
      {proposal && organization && user && (
        <AICollaborationAssistant
          proposal={proposal}
          sections={sections}
          tasks={tasks}
          comments={comments}
          teamMembers={teamMembers}
          user={user}
          organization={organization}
        />
      )}

      {/* Submission Readiness Overview */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Submission Readiness</CardTitle>
              <CardDescription className="mt-2">
                Review your proposal and prepare for submission
              </CardDescription>
            </div>
            <div className={`text-right ${readinessStatus.color}`}>
              <div className="text-3xl font-bold">{completionScore}%</div>
              <div className="text-sm font-semibold">{readinessStatus.label}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Completion</span>
                <span className="font-semibold">{completionScore}%</span>
              </div>
              <Progress value={completionScore} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Quality</span>
                <span className="font-semibold">{qualityScore}%</span>
              </div>
              <Progress value={qualityScore} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Open Tasks</span>
                <span className="font-semibold">{pendingTasksCount}</span>
              </div>
              <Progress
                value={tasks.length > 0 ? ((tasks.length - pendingTasksCount) / tasks.length) * 100 : 100}
                className="h-2"
              />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => setShowExport(true)}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Proposal
            </Button>
            <Button
              onClick={handleMarkAsSubmitted}
              disabled={readinessStatus.status !== "ready" || updateProposalMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateProposalMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Mark as Submitted
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="readiness" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="readiness">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Readiness
          </TabsTrigger>
          <TabsTrigger value="versions">
            <Clock className="w-4 h-4 mr-2" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <MessageCircle className="w-4 h-4 mr-2" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="final">
            <Award className="w-4 h-4 mr-2" />
            Final Check
          </TabsTrigger>
        </TabsList>

        <TabsContent value="readiness" className="space-y-6">
          <SubmissionReadinessChecker
            proposal={proposal}
            sections={sections}
            tasks={tasks}
            completionScore={completionScore}
            qualityScore={qualityScore}
          />
        </TabsContent>

        <TabsContent value="versions" className="space-y-6">
          <VersionComparison
            proposal={proposal}
            sections={sections}
            sectionHistory={sectionHistory}
          />
        </TabsContent>

        {/* Reviews Tab - Now contains both AI Confidence Scoring AND Red Team Review */}
        <TabsContent value="reviews" className="space-y-6">
          {/* AI Confidence Scoring Section */}
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                AI-Powered Confidence Scoring
              </CardTitle>
              <CardDescription>
                Comprehensive proposal analysis using AI to evaluate your written content and predict win probability
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!aiScore && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-10 h-10 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">AI-Powered Win Probability Analysis</h3>
                  <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                    Our advanced AI will analyze your <strong>written proposal content</strong>, requirements alignment, past win/loss patterns,
                    competitive positioning, and pricing strategy to provide a comprehensive confidence score and actionable recommendations.
                  </p>
                  <Button
                    onClick={runAIScoring}
                    disabled={isScoring}
                    size="lg"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    {isScoring ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing Proposal...
                      </>
                    ) : (
                      <>
                        <Brain className="w-5 h-5 mr-2" />
                        Run AI Confidence Scoring
                      </>
                    )}
                  </Button>
                </div>
              )}

              {aiScore && (
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-slate-600">AI Confidence Score</p>
                          <Brain className="w-5 h-5 text-indigo-600" />
                        </div>
                        <p className={`text-5xl font-bold ${getScoreColor(aiScore.confidence_score)}`}>
                          {aiScore.confidence_score}%
                        </p>
                        <Progress value={aiScore.confidence_score} className="mt-3 h-3" />
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-slate-600">Win Probability</p>
                          <Target className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{aiScore.win_probability_estimate}</p>
                        <p className="text-xs text-slate-500 mt-2">Based on written proposal</p>
                      </CardContent>
                    </Card>

                    <Card className={`bg-gradient-to-br ${
                      aiScore.recommendation === 'Strong Go' ? 'from-green-50 to-emerald-50 border-green-200' :
                      aiScore.recommendation === 'Go' ? 'from-blue-50 to-sky-50 border-blue-200' :
                      aiScore.recommendation === 'Cautious Go' ? 'from-amber-50 to-orange-50 border-amber-200' :
                      'from-red-50 to-rose-50 border-red-200'
                    }`}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-slate-600">Recommendation</p>
                          {aiScore.recommendation.includes('Go') && !aiScore.recommendation.includes('No-Go') ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : aiScore.recommendation === 'Cautious Go' ? (
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <p className="text-2xl font-bold">{aiScore.recommendation}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Alert className="bg-white border-blue-200">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-sm">
                      <strong>AI Assessment:</strong> {aiScore.executive_summary}
                    </AlertDescription>
                  </Alert>

                  {/* Score Breakdown and other AI Score sections */}
                  <Tabs defaultValue="breakdown" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="breakdown">Score Breakdown</TabsTrigger>
                      <TabsTrigger value="strengths">Strengths</TabsTrigger>
                      <TabsTrigger value="weaknesses">Weaknesses</TabsTrigger>
                      <TabsTrigger value="risks">Risk Factors</TabsTrigger>
                      <TabsTrigger value="actions">Action Items</TabsTrigger>
                    </TabsList>

                    <TabsContent value="breakdown">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Detailed Score Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {aiScore.score_breakdown && Object.entries(aiScore.score_breakdown).map(([key, value]) => (
                              <div key={key} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                                  <span className={`text-sm font-bold ${getScoreColor(value)}`}>{value}%</span>
                                </div>
                                <Progress value={value} className="h-2" />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {aiScore.section_analysis && aiScore.section_analysis.length > 0 && (
                        <Card className="mt-6">
                          <CardHeader>
                            <CardTitle className="text-base">Section-by-Section Analysis</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {aiScore.section_analysis.map((section, idx) => (
                                <div key={idx} className="p-4 border rounded-lg">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <h4 className="font-semibold text-slate-900">{section.section_name}</h4>
                                      <p className="text-sm text-slate-600 mt-1">{section.feedback}</p>
                                    </div>
                                    <div className="ml-4 flex flex-col items-end gap-2">
                                      <span className={`text-lg font-bold ${getScoreColor(section.score)}`}>{section.score}%</span>
                                      <Badge className={
                                        section.status === 'strong' ? 'bg-green-100 text-green-700' :
                                        section.status === 'adequate' ? 'bg-blue-100 text-blue-700' :
                                        section.status === 'weak' ? 'bg-amber-100 text-amber-700' :
                                        'bg-red-100 text-red-700'
                                      }>
                                        {section.status}
                                      </Badge>
                                    </div>
                                  </div>
                                  {section.priority_actions && section.priority_actions.length > 0 && (
                                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                                      <p className="text-xs font-semibold text-blue-900 mb-1">Priority Actions:</p>
                                      <ul className="text-xs text-blue-800 space-y-1">
                                        {section.priority_actions.map((action, i) => (
                                          <li key={i}>• {action}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="strengths">
                      <Card className="border-green-200 bg-green-50">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            Identified Strengths
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {aiScore.strengths && aiScore.strengths.map((strength, idx) => (
                              <div key={idx} className="p-4 bg-white border border-green-200 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <Badge variant="outline" className="mb-2">{strength.category}</Badge>
                                    <p className="font-semibold text-green-900">{strength.strength}</p>
                                  </div>
                                  <Badge className={
                                    strength.impact === 'high' ? 'bg-green-600 text-white' :
                                    strength.impact === 'medium' ? 'bg-green-500 text-white' :
                                    'bg-green-400 text-white'
                                  }>
                                    {strength.impact} impact
                                  </Badge>
                                </div>
                                <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded">
                                  <p className="text-xs font-semibold text-green-800 mb-1">💡 Leverage Strategy:</p>
                                  <p className="text-sm text-green-900">{strength.leverage_strategy}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="weaknesses">
                      <Card className="border-red-200 bg-red-50">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            Areas for Improvement
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {aiScore.weaknesses && aiScore.weaknesses.map((weakness, idx) => (
                              <div key={idx} className={`p-4 bg-white border-2 rounded-lg ${getSeverityColor(weakness.severity)}`}>
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <Badge variant="outline" className="mb-2">{weakness.category}</Badge>
                                    <p className="font-semibold text-red-900">{weakness.weakness}</p>
                                  </div>
                                  <Badge className={
                                    weakness.severity === 'critical' ? 'bg-red-600 text-white' :
                                    weakness.severity === 'high' ? 'bg-red-500 text-white' :
                                    weakness.severity === 'medium' ? 'bg-amber-500 text-white' :
                                    'bg-blue-500 text-white'
                                  }>
                                    {weakness.severity}
                                  </Badge>
                                </div>
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                  <p className="text-xs font-semibold text-blue-800 mb-1">🔧 Action Required:</p>
                                  <p className="text-sm text-blue-900">{weakness.improvement_action}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="risks">
                      <Card className="border-amber-200 bg-amber-50">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            Risk Assessment
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {aiScore.risk_factors && aiScore.risk_factors.map((risk, idx) => (
                              <div key={idx} className="p-4 bg-white border border-amber-200 rounded-lg">
                                <div className="flex items-start justify-between mb-2">
                                  <p className="font-semibold text-amber-900 flex-1">{risk.risk}</p>
                                  <div className="flex gap-2 ml-4">
                                    <Badge variant="outline" className="text-xs">P: {risk.probability}</Badge>
                                    <Badge className={
                                      risk.impact === 'critical' ? 'bg-red-600 text-white' :
                                      risk.impact === 'high' ? 'bg-orange-600 text-white' :
                                      risk.impact === 'medium' ? 'bg-amber-600 text-white' :
                                      'bg-blue-600 text-white'
                                    }>
                                      I: {risk.impact}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                                  <p className="text-xs font-semibold text-green-800 mb-1">Mitigation Strategy:</p>
                                  <p className="text-sm text-green-900">{risk.mitigation}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="actions">
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-blue-600" />
                            Immediate Priorities Before Submission
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {aiScore.immediate_priorities && aiScore.immediate_priorities.map((item, idx) => (
                              <div key={idx} className="p-4 bg-white border border-blue-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-blue-900 mb-1">{item.priority}</h4>
                                    <p className="text-sm text-slate-700 mb-2">{item.action}</p>
                                    <div className="flex gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        ⏰ {item.deadline}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        👤 {item.owner}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>

                  <div className="flex gap-3 pt-6 border-t">
                    <Button
                      onClick={runAIScoring}
                      disabled={isScoring}
                      variant="outline"
                      className="flex-1"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Re-run AI Scoring
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Red Team Review Section */}
          <RedTeamReview
            proposal={proposal}
            reviews={reviews}
            onStartReview={handleStartReview}
            teamMembers={teamMembers}
            proposalId={proposal.id}
            proposalData={proposal}
            organizationId={organization?.id}
          />
        </TabsContent>

        <TabsContent value="final" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Final Submission Checklist</CardTitle>
              <CardDescription>
                Complete these items before submitting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: "All sections are complete", checked: completionScore === 100 },
                  { label: "Quality score of 80% or higher", checked: qualityScore >= 80 },
                  { label: "All tasks completed", checked: pendingTasksCount === 0 },
                  { label: "Red team review conducted and completed", checked: reviews.some(r => r.review_type === "red_team" && r.status === "completed") },
                  { label: "Compliance check passed (Manual confirmation)", checked: true },
                  { label: "Pricing finalized", checked: proposal.pricing_status === "final" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.checked ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {item.checked ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    )}
                    <span className={item.checked ? 'text-green-900' : 'text-slate-700'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {readinessStatus.status === "ready" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">
                        Your proposal is ready for submission!
                      </h4>
                      <p className="text-sm text-green-700">
                        All checklist items are complete. You can now export and submit your proposal.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      {showExport && (
        <ExportDialog
          open={showExport}
          onOpenChange={setShowExport}
          proposal={proposal}
          sections={sections}
          onExportComplete={() => {
            alert("✓ Export completed successfully!");
            setShowExport(false);
          }}
        />
      )}
    </div>
  );
}
