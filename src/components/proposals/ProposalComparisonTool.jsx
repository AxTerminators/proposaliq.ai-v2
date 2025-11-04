
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  GitCompare,
  Plus,
  X,
  Star,
  Check,
  ArrowRight,
  DollarSign,
  Clock,
  Users,
  Target,
  Award,
  TrendingUp,
  Save,
  Download,
  Brain,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle,
  Zap,
  BarChart3,
  Lightbulb,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export default function ProposalComparisonTool({ client, organization }) {
  const queryClient = useQueryClient();
  const [selectedProposals, setSelectedProposals] = useState([]);
  const [showCriteriaDialog, setShowCriteriaDialog] = useState(false);
  const [comparisonName, setComparisonName] = useState("");
  const [criteria, setCriteria] = useState([
    { name: "Price", weight: 25, scores: {} },
    { name: "Timeline", weight: 20, scores: {} },
    { name: "Quality", weight: 25, scores: {} },
    { name: "Experience", weight: 15, scores: {} },
    { name: "Communication", weight: 15, scores: {} }
  ]);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [winnerProposalId, setWinnerProposalId] = useState(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // Get proposals shared with this client
  const { data: proposals = [] } = useQuery({
    queryKey: ['client-proposals', client.id],
    queryFn: async () => {
      const allProposals = await base44.entities.Proposal.list();
      return allProposals.filter(p => 
        p.shared_with_client_ids?.includes(client.id)
      );
    },
    initialData: []
  });

  // Get existing comparisons
  const { data: comparisons = [] } = useQuery({
    queryKey: ['comparisons', client.id],
    queryFn: () => base44.entities.ProposalComparison.filter({
      client_id: client.id,
      organization_id: organization.id
    }),
    initialData: []
  });

  const saveComparisonMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ProposalComparison.create({
        client_id: client.id,
        organization_id: organization.id,
        comparison_name: data.name,
        proposal_ids: selectedProposals.map(p => p.id),
        comparison_criteria: criteria,
        winner_proposal_id: winnerProposalId,
        decision_notes: decisionNotes,
        comparison_data: {
          proposals: selectedProposals,
          criteria: criteria,
          total_scores: calculateTotalScores(),
          ai_analysis: aiAnalysis
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparisons'] });
      alert("✓ Comparison saved successfully!");
    }
  });

  const runAIComparisonAnalysis = async () => {
    if (selectedProposals.length < 2) {
      alert("Select at least 2 proposals to compare");
      return;
    }

    setAiAnalyzing(true);
    setError(null);

    try {
      // Build comprehensive proposal data for comparison
      const proposalsData = await Promise.all(selectedProposals.map(async (proposal) => {
        // Get proposal sections
        const sections = await base44.entities.ProposalSection.filter({ proposal_id: proposal.id });
        
        // Get tasks
        const tasks = await base44.entities.ProposalTask.filter({ proposal_id: proposal.id });
        
        // Get compliance data
        const compliance = await base44.entities.ComplianceRequirement.filter({ proposal_id: proposal.id });

        return {
          id: proposal.id,
          name: proposal.proposal_name,
          contractor: proposal.prime_contractor_name,
          value: proposal.contract_value,
          due_date: proposal.due_date,
          status: proposal.status,
          created_date: proposal.created_date,
          phase: proposal.current_phase,
          sections_count: sections.length,
          sections_completed: sections.filter(s => s.status === 'approved').length,
          total_word_count: sections.reduce((sum, s) => sum + (s.word_count || 0), 0),
          tasks_total: tasks.length,
          tasks_completed: tasks.filter(t => t.status === 'completed').length,
          compliance_total: compliance.length,
          compliance_met: compliance.filter(c => c.compliance_status === 'compliant').length,
          ai_confidence: proposal.ai_confidence_score ? JSON.parse(proposal.ai_confidence_score).overall_score : null
        };
      }));

      const analysisPrompt = `You are an expert procurement analyst specializing in vendor selection and proposal evaluation. Perform a comprehensive, objective comparison of these ${selectedProposals.length} proposals.

**PROPOSALS BEING COMPARED:**

${proposalsData.map((p, idx) => `
**Proposal ${idx + 1}: ${p.name}**
- Contractor: ${p.contractor}
- Contract Value: $${(p.value / 1000000).toFixed(2)}M
- Due Date: ${p.due_date ? moment(p.due_date).format('MMM D, YYYY') : 'N/A'}
- Status: ${p.status}
- Completeness: ${p.sections_completed}/${p.sections_count} sections completed
- Total Content: ${p.total_word_count.toLocaleString()} words
- Tasks: ${p.tasks_completed}/${p.tasks_total} completed
- Compliance: ${p.compliance_met}/${p.compliance_total} requirements met
- AI Confidence Score: ${p.ai_confidence || 'N/A'}
`).join('\n')}

**CURRENT EVALUATION CRITERIA:**
${criteria.map(c => `- ${c.name} (${c.weight}% weight)`).join('\n')}

**YOUR TASK - COMPREHENSIVE COMPARISON ANALYSIS:**

Provide an objective, data-driven comparison using advanced analysis:

1. **Overall Assessment**: Which proposal is strongest? Why?

2. **Criterion-by-Criterion Analysis**: 
   - Evaluate each proposal on each criterion
   - Provide recommended scores (1-10) with justification
   - Identify clear winners and losers per criterion

3. **Strengths & Weaknesses**: 
   - Unique strengths of each proposal
   - Critical weaknesses or gaps
   - How each proposal differentiates

4. **Value Analysis**:
   - Price competitiveness
   - Value for money assessment
   - ROI potential

5. **Risk Assessment**:
   - Implementation risks
   - Vendor reliability concerns
   - Contractual risks

6. **Winner Prediction**:
   - Which proposal will likely win?
   - Confidence level (0-100%)
   - Key deciding factors

7. **Strategic Recommendations**:
   - What questions to ask each vendor
   - What clarifications are needed
   - Negotiation leverage points

8. **Decision Matrix**:
   - Recommended scoring for objectivity
   - Trade-off analysis
   - Best-fit recommendation

Provide actionable, unbiased intelligence to support the decision.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_winner: {
              type: "object",
              properties: {
                proposal_id: { type: "string" },
                proposal_name: { type: "string" },
                confidence: { type: "number", minimum: 0, maximum: 100 },
                rationale: { type: "string" },
                key_deciding_factors: { type: "array", items: { type: "string" } }
              }
            },
            recommended_scores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  criterion_name: { type: "string" },
                  proposal_scores: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        proposal_id: { type: "string" },
                        proposal_name: { type: "string" },
                        score: { type: "number", minimum: 1, maximum: 10 },
                        justification: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            proposal_assessments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  proposal_id: { type: "string" },
                  proposal_name: { type: "string" },
                  overall_rating: { type: "number", minimum: 0, maximum: 100 },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                  unique_differentiators: { type: "array", items: { type: "string" } },
                  value_assessment: {
                    type: "object",
                    properties: {
                      price_competitiveness: { type: "string", enum: ["excellent", "good", "fair", "poor"] },
                      value_for_money: { type: "number", minimum: 1, maximum: 10 },
                      roi_potential: { type: "string", enum: ["high", "medium", "low"] }
                    }
                  },
                  risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  risk_factors: { type: "array", items: { type: "string" } }
                }
              }
            },
            comparative_insights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  insight_type: { type: "string", enum: ["strength_comparison", "weakness_comparison", "value_comparison", "risk_comparison", "capability_gap", "standout_feature"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  affected_proposals: { type: "array", items: { type: "string" } }
                }
              }
            },
            strategic_questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  for_proposal_id: { type: "string" },
                  question: { type: "string" },
                  purpose: { type: "string" },
                  priority: { type: "string", enum: ["critical", "high", "medium", "low"] }
                }
              }
            },
            negotiation_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  proposal_id: { type: "string" },
                  opportunity: { type: "string" },
                  leverage: { type: "string" },
                  potential_savings: { type: "string" }
                }
              }
            },
            decision_recommendation: {
              type: "object",
              properties: {
                recommended_choice: { type: "string" },
                alternative_choice: { type: "string" },
                when_to_choose_alternative: { type: "string" },
                final_thoughts: { type: "string" }
              }
            },
            ranking: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rank: { type: "number" },
                  proposal_id: { type: "string" },
                  proposal_name: { type: "string" },
                  score: { type: "number" },
                  summary: { type: "string" }
                }
              }
            }
          },
          required: ["overall_winner", "recommended_scores", "proposal_assessments", "comparative_insights", "decision_recommendation", "ranking"]
        }
      });

      setAiAnalysis(result);

      // Auto-populate recommended scores
      result.recommended_scores?.forEach(criterion => {
        const criterionIdx = criteria.findIndex(c => c.name.toLowerCase().includes(criterion.criterion_name.toLowerCase()));
        if (criterionIdx >= 0) {
          const newCriteria = [...criteria];
          criterion.proposal_scores.forEach(ps => {
            newCriteria[criterionIdx].scores[ps.proposal_id] = ps.score;
          });
          setCriteria(newCriteria);
        }
      });

      // Auto-select AI recommended winner
      if (result.overall_winner?.proposal_id) {
        setWinnerProposalId(result.overall_winner.proposal_id);
      }

      alert(`✓ AI comparison analysis complete! Analyzed ${selectedProposals.length} proposals with comprehensive scoring.`);

    } catch (err) {
      console.error("Error running AI comparison:", err);
      setError(err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const toggleProposal = (proposal) => {
    if (selectedProposals.find(p => p.id === proposal.id)) {
      setSelectedProposals(selectedProposals.filter(p => p.id !== proposal.id));
      // Remove scores for this proposal
      const newCriteria = criteria.map(c => ({
        ...c,
        scores: { ...c.scores, [proposal.id]: undefined }
      }));
      setCriteria(newCriteria);
    } else {
      if (selectedProposals.length >= 3) {
        alert("You can compare up to 3 proposals at a time");
        return;
      }
      setSelectedProposals([...selectedProposals, proposal]);
    }
  };

  const updateCriterionScore = (criterionIndex, proposalId, score) => {
    const newCriteria = [...criteria];
    newCriteria[criterionIndex].scores[proposalId] = parseInt(score);
    setCriteria(newCriteria);
  };

  const updateCriterionWeight = (criterionIndex, weight) => {
    const newCriteria = [...criteria];
    newCriteria[criterionIndex].weight = parseInt(weight);
    setCriteria(newCriteria);
  };

  const addCriterion = () => {
    setCriteria([...criteria, { name: "New Criterion", weight: 10, scores: {} }]);
  };

  const removeCriterion = (index) => {
    setCriteria(criteria.filter((_, idx) => idx !== index));
  };

  const calculateTotalScores = () => {
    const scores = {};
    selectedProposals.forEach(proposal => {
      let total = 0;
      criteria.forEach(criterion => {
        const score = criterion.scores[proposal.id] || 0;
        total += (score * criterion.weight) / 100;
      });
      scores[proposal.id] = total;
    });
    return scores;
  };

  const totalScores = calculateTotalScores();
  const maxScore = Math.max(...Object.values(totalScores), 0);
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  const handleSaveComparison = () => {
    if (!comparisonName) {
      alert("Please enter a comparison name");
      return;
    }
    saveComparisonMutation.mutate({ name: comparisonName });
  };

  const exportComparison = () => {
    const data = {
      comparison_name: comparisonName,
      proposals: selectedProposals.map(p => ({
        name: p.proposal_name,
        organization: p.prime_contractor_name,
        contract_value: p.contract_value
      })),
      criteria: criteria,
      scores: totalScores,
      winner: selectedProposals.find(p => p.id === winnerProposalId)?.proposal_name,
      notes: decisionNotes,
      ai_analysis: aiAnalysis,
      date: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${Date.now()}.json`;
    a.click();
  };

  // Prepare chart data
  const radarChartData = criteria.map(criterion => {
    const dataPoint = { criterion: criterion.name };
    selectedProposals.forEach(proposal => {
      dataPoint[proposal.proposal_name] = criterion.scores[proposal.id] || 0;
    });
    return dataPoint;
  });

  const barChartData = selectedProposals.map(proposal => ({
    name: proposal.proposal_name.slice(0, 20), // Truncate name for chart display
    score: totalScores[proposal.id] || 0
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <GitCompare className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">AI-Powered Proposal Comparison</CardTitle>
                <CardDescription>Intelligent analysis with automated scoring and winner prediction</CardDescription>
              </div>
            </div>
            {selectedProposals.length >= 2 && (
              <div className="flex gap-2">
                <Button
                  onClick={runAIComparisonAnalysis}
                  disabled={aiAnalyzing}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {aiAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      AI Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-5 h-5 mr-2" />
                      AI Compare
                    </>
                  )}
                </Button>
                <Button onClick={() => setShowCriteriaDialog(true)} variant="outline">
                  Customize Criteria
                </Button>
                <Button onClick={exportComparison} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button onClick={handleSaveComparison} className="bg-purple-600 hover:bg-purple-700">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {selectedProposals.length < 2 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Select at least 2 proposals to enable AI-powered comparison analysis.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* AI Analysis Results */}
      {aiAnalysis && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="negotiation">Negotiation</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Winner Prediction */}
            <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-green-600" />
                  AI Winner Prediction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-6 bg-white rounded-xl border-2 border-green-300">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {aiAnalysis.overall_winner.proposal_name}
                  </div>
                  <Badge className="bg-green-600 text-white text-base px-4 py-2">
                    {aiAnalysis.overall_winner.confidence}% Confidence
                  </Badge>
                </div>

                <div className="p-4 bg-white rounded-lg border">
                  <p className="text-sm text-slate-700 leading-relaxed">
                    <strong>Rationale:</strong> {aiAnalysis.overall_winner.rationale}
                  </p>
                </div>

                <div>
                  <h5 className="font-semibold text-green-900 mb-2">Key Deciding Factors:</h5>
                  <ul className="space-y-2">
                    {aiAnalysis.overall_winner.key_deciding_factors?.map((factor, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-slate-700">{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Rankings */}
            {aiAnalysis.ranking && (
              <Card className="border-none shadow-xl">
                <CardHeader>
                  <CardTitle>AI-Generated Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aiAnalysis.ranking.map((rank) => (
                      <div key={rank.rank} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg border">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0",
                          rank.rank === 1 && "bg-yellow-400 text-yellow-900",
                          rank.rank === 2 && "bg-slate-300 text-slate-700",
                          rank.rank === 3 && "bg-orange-300 text-orange-900"
                        )}>
                          {rank.rank}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-slate-900 text-lg mb-1">{rank.proposal_name}</h5>
                          <div className="flex items-center gap-2 mb-2">
                            <Progress value={(rank.score / 10) * 100} className="flex-1 h-3" />
                            <span className="font-bold text-purple-600 text-lg">{rank.score.toFixed(1)}</span>
                          </div>
                          <p className="text-sm text-slate-600">{rank.summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Decision Recommendation */}
            {aiAnalysis.decision_recommendation && (
              <Card className="border-2 border-indigo-300 bg-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Strategic Decision Guidance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 bg-white rounded-lg">
                    <p className="text-sm text-slate-700 mb-2">
                      <strong>Recommended Choice:</strong> {aiAnalysis.decision_recommendation.recommended_choice}
                    </p>
                    {aiAnalysis.decision_recommendation.alternative_choice && (
                      <p className="text-sm text-slate-700 mb-2">
                        <strong>Alternative:</strong> {aiAnalysis.decision_recommendation.alternative_choice}
                      </p>
                    )}
                    {aiAnalysis.decision_recommendation.when_to_choose_alternative && (
                      <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                        <strong>When to choose alternative:</strong> {aiAnalysis.decision_recommendation.when_to_choose_alternative}
                      </p>
                    )}
                  </div>
                  <div className="p-4 bg-white rounded-lg border-2 border-indigo-200">
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {aiAnalysis.decision_recommendation.final_thoughts}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments" className="space-y-4">
            {aiAnalysis.proposal_assessments?.map((assessment) => (
              <Card key={assessment.proposal_id} className="border-2 hover:shadow-xl transition-all">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle>{assessment.proposal_name}</CardTitle>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-purple-600">{assessment.overall_rating}</div>
                      <div className="text-xs text-slate-600">Overall Rating</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Value Assessment */}
                  {assessment.value_assessment && (
                    <div className="grid md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                      <div className="text-center">
                        <div className="text-sm text-blue-900 mb-1">Price Competitiveness</div>
                        <Badge className={cn(
                          "text-white capitalize",
                          assessment.value_assessment.price_competitiveness === 'excellent' && 'bg-green-600',
                          assessment.value_assessment.price_competitiveness === 'good' && 'bg-blue-600',
                          assessment.value_assessment.price_competitiveness === 'fair' && 'bg-yellow-600',
                          assessment.value_assessment.price_competitiveness === 'poor' && 'bg-red-600'
                        )}>
                          {assessment.value_assessment.price_competitiveness}
                        </Badge>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-blue-900 mb-1">Value for Money</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {assessment.value_assessment.value_for_money}/10
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-blue-900 mb-1">ROI Potential</div>
                        <Badge className={cn(
                          "text-white capitalize",
                          assessment.value_assessment.roi_potential === 'high' && 'bg-green-600',
                          assessment.value_assessment.roi_potential === 'medium' && 'bg-yellow-600',
                          assessment.value_assessment.roi_potential === 'low' && 'bg-red-600'
                        )}>
                          {assessment.value_assessment.roi_potential}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Strengths & Weaknesses */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h5 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Strengths
                      </h5>
                      <ul className="space-y-1">
                        {assessment.strengths?.map((strength, idx) => (
                          <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                            <span className="text-green-600">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h5 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Weaknesses
                      </h5>
                      <ul className="space-y-1">
                        {assessment.weaknesses?.map((weakness, idx) => (
                          <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                            <span className="text-red-600">•</span>
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Differentiators */}
                  {assessment.unique_differentiators?.length > 0 && (
                    <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <h5 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Unique Differentiators
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {assessment.unique_differentiators.map((diff, idx) => (
                          <Badge key={idx} className="bg-purple-600 text-white">
                            {diff}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Assessment */}
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-amber-900 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Risk Assessment
                      </h5>
                      <Badge className={cn(
                        "text-white capitalize",
                        assessment.risk_level === 'low' && 'bg-green-600',
                        assessment.risk_level === 'medium' && 'bg-yellow-600',
                        assessment.risk_level === 'high' && 'bg-orange-600',
                        assessment.risk_level === 'critical' && 'bg-red-600'
                      )}>
                        {assessment.risk_level} risk
                      </Badge>
                    </div>
                    {assessment.risk_factors?.length > 0 && (
                      <ul className="space-y-1 mt-2">
                        {assessment.risk_factors.map((risk, idx) => (
                          <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                            <span className="text-amber-600">•</span>
                            {risk}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {aiAnalysis.comparative_insights?.map((insight, idx) => (
              <Card key={idx} className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      insight.insight_type.includes('strength') && 'bg-green-100',
                      insight.insight_type.includes('weakness') && 'bg-red-100',
                      insight.insight_type.includes('value') && 'bg-blue-100',
                      insight.insight_type.includes('risk') && 'bg-amber-100',
                      insight.insight_type.includes('gap') && 'bg-purple-100',
                      insight.insight_type.includes('standout') && 'bg-pink-100'
                    )}>
                      <Eye className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-semibold text-slate-900">{insight.title}</h5>
                        <Badge variant="outline" className="text-xs capitalize">
                          {insight.insight_type.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{insight.description}</p>
                      {insight.affected_proposals?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {insight.affected_proposals.map((propId) => {
                            const prop = selectedProposals.find(p => p.id === propId);
                            return prop ? (
                              <Badge key={propId} variant="secondary" className="text-xs">
                                {prop.proposal_name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  Strategic Questions for Vendors
                </CardTitle>
                <CardDescription>AI-generated questions to clarify and differentiate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedProposals.map(proposal => {
                    const questions = aiAnalysis.strategic_questions?.filter(q => q.for_proposal_id === proposal.id);
                    if (!questions || questions.length === 0) return null;

                    return (
                      <div key={proposal.id}>
                        <h5 className="font-semibold text-slate-900 mb-3">{proposal.proposal_name}</h5>
                        <div className="space-y-2">
                          {questions.map((q, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-lg border">
                              <div className="flex items-start gap-2 mb-2">
                                <Badge className={cn(
                                  "text-white capitalize flex-shrink-0",
                                  q.priority === 'critical' && 'bg-red-600',
                                  q.priority === 'high' && 'bg-orange-600',
                                  q.priority === 'medium' && 'bg-yellow-600',
                                  q.priority === 'low' && 'bg-green-600'
                                )}>
                                  {q.priority}
                                </Badge>
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 text-sm">{q.question}</p>
                                  <p className="text-xs text-slate-600 mt-1">Purpose: {q.purpose}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Negotiation Tab */}
          <TabsContent value="negotiation" className="space-y-4">
            {aiAnalysis.negotiation_opportunities?.map((opp, idx) => {
              const proposal = selectedProposals.find(p => p.id === opp.proposal_id);
              return (
                <Card key={idx} className="border-2 border-green-300 bg-green-50">
                  <CardContent className="p-4">
                    <h5 className="font-semibold text-green-900 mb-3">{proposal?.proposal_name}</h5>
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-sm text-slate-700">
                          <strong>Opportunity:</strong> {opp.opportunity}
                        </p>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <p className="text-sm text-slate-700">
                          <strong>Your Leverage:</strong> {opp.leverage}
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg border border-green-300">
                        <p className="text-sm text-green-900">
                          <strong>Potential Savings:</strong> {opp.potential_savings}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      )}

      {/* Comparison Name Input */}
      {selectedProposals.length >= 2 && !aiAnalysis && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <Label>Comparison Name</Label>
            <Input
              value={comparisonName}
              onChange={(e) => setComparisonName(e.target.value)}
              placeholder="e.g., Q4 2024 Vendor Selection"
              className="mt-2"
            />
          </CardContent>
        </Card>
      )}

      {/* Proposal Selection */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Select Proposals to Compare</CardTitle>
          <CardDescription>
            Choose 2-3 proposals • {selectedProposals.length} selected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proposals.map(proposal => {
              const isSelected = selectedProposals.find(p => p.id === proposal.id);
              
              return (
                <Card
                  key={proposal.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isSelected ? "ring-2 ring-purple-500 bg-purple-50" : ""
                  )}
                  onClick={() => toggleProposal(proposal)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-slate-900">{proposal.proposal_name}</h4>
                      {isSelected && (
                        <Check className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{proposal.prime_contractor_name}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {proposal.contract_value && (
                        <Badge variant="outline">
                          ${(proposal.contract_value / 1000).toFixed(0)}K
                        </Badge>
                      )}
                      {proposal.due_date && (
                        <Badge variant="outline">
                          Due: {moment(proposal.due_date).format('MMM D')}
                        </Badge>
                      )}
                      <Badge className="capitalize">{proposal.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {proposals.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <GitCompare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>No proposals available to compare</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Scores from AI */}
      {aiAnalysis?.recommended_scores && selectedProposals.length >= 2 && (
        <Card className="border-2 border-indigo-300 bg-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              AI-Recommended Scoring
            </CardTitle>
            <CardDescription>Objective scores generated by AI analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {aiAnalysis.recommended_scores.map((rec, idx) => (
                <div key={idx} className="p-4 bg-white rounded-lg">
                  <h5 className="font-semibold text-slate-900 mb-3">{rec.criterion_name}</h5>
                  <div className="space-y-2">
                    {rec.proposal_scores.map((ps) => (
                      <div key={ps.proposal_id} className="flex items-start gap-3">
                        <div className="w-16 text-center">
                          <div className="text-xl font-bold text-indigo-600">{ps.score}/10</div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-900 text-sm mb-1">{ps.proposal_name}</div>
                          <p className="text-xs text-slate-600">{ps.justification}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison Matrix */}
      {selectedProposals.length >= 2 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Scoring Matrix</CardTitle>
            <CardDescription>
              Rate each proposal on a scale of 1-10 • Weight totals: {totalWeight}%
              {aiAnalysis && " • Scores auto-populated by AI"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left p-4 font-semibold">Criteria</th>
                    <th className="text-center p-4 font-semibold">Weight</th>
                    {selectedProposals.map(proposal => (
                      <th key={proposal.id} className="text-center p-4 font-semibold">
                        {proposal.proposal_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((criterion, idx) => (
                    <tr key={idx} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-medium">{criterion.name}</td>
                      <td className="p-4 text-center">
                        <Badge variant="outline">{criterion.weight}%</Badge>
                      </td>
                      {selectedProposals.map(proposal => (
                        <td key={proposal.id} className="p-4">
                          <Select
                            value={criterion.scores[proposal.id]?.toString() || ""}
                            onValueChange={(value) => updateCriterionScore(idx, proposal.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Rate" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1,2,3,4,5,6,7,8,9,10].map(score => (
                                <SelectItem key={score} value={score.toString()}>
                                  {score} / 10
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold">
                    <td className="p-4">Total Weighted Score</td>
                    <td className="p-4"></td>
                    {selectedProposals.map(proposal => (
                      <td key={proposal.id} className="p-4 text-center">
                        <div className="text-2xl text-purple-600">
                          {totalScores[proposal.id]?.toFixed(1) || '0.0'}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visual Charts */}
      {selectedProposals.length >= 2 && Object.values(totalScores).some(s => s > 0) && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Radar Chart */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm">Multi-Dimensional Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarChartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 10]} /> {/* Set domain for Y axis */}
                  {selectedProposals.map((proposal, idx) => (
                    <Radar
                      key={proposal.id}
                      name={proposal.proposal_name}
                      dataKey={proposal.proposal_name}
                      stroke={['#8b5cf6', '#3b82f6', '#10b981'][idx]}
                      fill={['#8b5cf6', '#3b82f6', '#10b981'][idx]}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-sm">Overall Score Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Visual Comparison */}
      {selectedProposals.length >= 2 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Visual Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {selectedProposals.map(proposal => {
                const score = totalScores[proposal.id] || 0;
                const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                const isWinner = proposal.id === winnerProposalId;

                return (
                  <div key={proposal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-slate-900">{proposal.proposal_name}</h4>
                        {isWinner && (
                          <Badge className="bg-green-100 text-green-700">
                            <Award className="w-3 h-3 mr-1" />
                            Winner
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-purple-600">
                          {score.toFixed(1)}
                        </span>
                        <Button
                          size="sm"
                          variant={isWinner ? "default" : "outline"}
                          onClick={() => setWinnerProposalId(proposal.id)}
                        >
                          {isWinner ? "Selected" : "Select Winner"}
                        </Button>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-4" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decision Notes */}
      {selectedProposals.length >= 2 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Decision Notes</CardTitle>
            <CardDescription>
              Document your rationale for the final decision
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              rows={5}
              placeholder="Why did you choose this proposal? What were the key deciding factors?"
            />
          </CardContent>
        </Card>
      )}

      {/* Criteria Dialog */}
      <Dialog open={showCriteriaDialog} onOpenChange={setShowCriteriaDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customize Comparison Criteria</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {criteria.map((criterion, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                <Input
                  value={criterion.name}
                  onChange={(e) => {
                    const newCriteria = [...criteria];
                    newCriteria[idx].name = e.target.value;
                    setCriteria(newCriteria);
                  }}
                  placeholder="Criterion name"
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={criterion.weight}
                    onChange={(e) => updateCriterionWeight(idx, e.target.value)}
                    className="w-20"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeCriterion(idx)}
                  disabled={criteria.length <= 1}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button onClick={addCriterion} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Criterion
          </Button>

          {totalWeight !== 100 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ⚠️ Weights should total 100% (currently {totalWeight}%)
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowCriteriaDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
