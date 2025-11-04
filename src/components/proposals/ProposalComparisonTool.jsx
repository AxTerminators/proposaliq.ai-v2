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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Sparkles,
  Loader2,
  Brain,
  Eye,
  Lightbulb,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

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
  const [runningAIAnalysis, setRunningAIAnalysis] = useState(false);
  const [aiComparisonResults, setAiComparisonResults] = useState(null);

  const { data: proposals = [] } = useQuery({
    queryKey: ['client-proposals', client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      const allProposals = await base44.entities.Proposal.list();
      return allProposals.filter(p => 
        p.shared_with_client_ids?.includes(client.id)
      );
    },
    initialData: [],
    enabled: !!client?.id
  });

  const { data: comparisons = [] } = useQuery({
    queryKey: ['comparisons', client?.id],
    queryFn: () => {
      if (!client?.id || !organization?.id) return [];
      return base44.entities.ProposalComparison.filter({
        client_id: client.id,
        organization_id: organization.id
      });
    },
    initialData: [],
    enabled: !!client?.id && !!organization?.id
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
          ai_analysis: aiComparisonResults
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparisons'] });
      alert("Comparison saved successfully!");
    }
  });

  const runAIComparisonAnalysis = async () => {
    if (selectedProposals.length < 2) {
      alert("Select at least 2 proposals to compare");
      return;
    }

    setRunningAIAnalysis(true);

    try {
      const analysisPrompt = `You are an expert procurement analyst. Perform comprehensive comparative analysis of these proposals to predict the likely winner.

PROPOSALS UNDER COMPARISON:
${selectedProposals.map((p, idx) => `
Proposal ${idx + 1}: ${p.proposal_name}
- Vendor: ${p.prime_contractor_name}
- Contract Value: $${((p.contract_value || 0) / 1000000).toFixed(2)}M
- Timeline: Due ${p.due_date ? moment(p.due_date).format('MMM D, YYYY') : 'Not specified'}
- Status: ${p.status}
- Project Type: ${p.project_type}
`).join('\n')}

EVALUATION CRITERIA:
${criteria.map(c => `- ${c.name}: ${c.weight}% weight`).join('\n')}

Provide comprehensive comparative analysis with winner prediction, SWOT, risks, and decision recommendations.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            automated_scores: { type: "object" },
            comparative_analysis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  proposal_name: { type: "string" },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                  opportunities: { type: "array", items: { type: "string" } },
                  threats: { type: "array", items: { type: "string" } },
                  overall_assessment: { type: "string" }
                }
              }
            },
            head_to_head: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  comparison_aspect: { type: "string" },
                  winner: { type: "string" },
                  analysis: { type: "string" }
                }
              }
            },
            winner_prediction: {
              type: "object",
              properties: {
                predicted_winner: { type: "string" },
                confidence: { type: "number" },
                reasoning: { type: "string" },
                key_differentiators: { type: "array", items: { type: "string" } }
              }
            },
            risk_assessment: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  proposal_name: { type: "string" },
                  risk_level: { type: "string" },
                  risks: { type: "array", items: { type: "string" } },
                  mitigations: { type: "array", items: { type: "string" } }
                }
              }
            },
            value_analysis: {
              type: "object",
              properties: {
                best_value: { type: "string" },
                value_reasoning: { type: "string" },
                price_quality_tradeoffs: { type: "array", items: { type: "string" } }
              }
            },
            red_flags: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  proposal_name: { type: "string" },
                  flag_type: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            decision_recommendation: {
              type: "object",
              properties: {
                recommended_choice: { type: "string" },
                rationale: { type: "string" },
                conditions: { type: "array", items: { type: "string" } },
                alternative_if_primary_fails: { type: "string" }
              }
            }
          }
        }
      });

      if (result.automated_scores) {
        const updatedCriteria = criteria.map(criterion => {
          const scores = {};
          selectedProposals.forEach(proposal => {
            const proposalScores = result.automated_scores[proposal.id] || result.automated_scores[proposal.proposal_name];
            if (proposalScores && proposalScores[criterion.name]) {
              scores[proposal.id] = proposalScores[criterion.name];
            }
          });
          return { ...criterion, scores: { ...criterion.scores, ...scores } };
        });
        setCriteria(updatedCriteria);
      }

      if (result.winner_prediction?.predicted_winner) {
        const winner = selectedProposals.find(p => 
          p.proposal_name === result.winner_prediction.predicted_winner ||
          p.id === result.winner_prediction.predicted_winner
        );
        if (winner) {
          setWinnerProposalId(winner.id);
        }
      }

      setAiComparisonResults(result);
      alert("AI comparison analysis complete!");

    } catch (error) {
      console.error("Error running AI analysis:", error);
      alert("Error running AI comparison");
    } finally {
      setRunningAIAnalysis(false);
    }
  };

  const toggleProposal = (proposal) => {
    if (selectedProposals.find(p => p.id === proposal.id)) {
      setSelectedProposals(selectedProposals.filter(p => p.id !== proposal.id));
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
      ai_analysis: aiComparisonResults,
      notes: decisionNotes,
      date: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <GitCompare className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">AI Proposal Comparison</CardTitle>
                <CardDescription>
                  Automated analysis with winner prediction
                </CardDescription>
              </div>
            </div>
            {selectedProposals.length >= 2 && (
              <div className="flex gap-2">
                <Button 
                  onClick={runAIComparisonAnalysis}
                  disabled={runningAIAnalysis}
                  className="bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  {runningAIAnalysis ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      AI Analysis
                    </>
                  )}
                </Button>
                <Button onClick={() => setShowCriteriaDialog(true)} variant="outline">
                  Customize
                </Button>
                <Button onClick={exportComparison} variant="outline">
                  <Download className="w-4 h-4" />
                </Button>
                <Button onClick={handleSaveComparison} className="bg-purple-600">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {selectedProposals.length >= 2 && (
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

      {aiComparisonResults && selectedProposals.length >= 2 && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="swot">SWOT</TabsTrigger>
            <TabsTrigger value="headtohead">Head-to-Head</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
            <TabsTrigger value="recommendation">Decision</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {aiComparisonResults.winner_prediction && (
              <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-6 h-6 text-green-600" />
                    AI Winner Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-white rounded-lg border-2 border-green-200">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {aiComparisonResults.winner_prediction.predicted_winner}
                    </div>
                    <Badge className="bg-green-600 text-white text-base px-4 py-1">
                      {aiComparisonResults.winner_prediction.confidence}% Confidence
                    </Badge>
                  </div>

                  <div className="p-4 bg-white rounded-lg border">
                    <h5 className="font-semibold text-slate-900 mb-2">Reasoning:</h5>
                    <p className="text-sm text-slate-700">{aiComparisonResults.winner_prediction.reasoning}</p>
                  </div>

                  {aiComparisonResults.winner_prediction.key_differentiators?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-2">Key Differentiators:</h5>
                      <div className="space-y-2">
                        {aiComparisonResults.winner_prediction.key_differentiators.map((diff, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-lg border-2 border-green-200 text-sm flex items-start gap-2">
                            <Star className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-700">{diff}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {aiComparisonResults.value_analysis && (
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    Best Value Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <h5 className="font-semibold text-blue-900 mb-2">Best Value:</h5>
                    <p className="text-2xl font-bold text-blue-600 mb-2">
                      {aiComparisonResults.value_analysis.best_value}
                    </p>
                    <p className="text-sm text-blue-800">{aiComparisonResults.value_analysis.value_reasoning}</p>
                  </div>

                  {aiComparisonResults.value_analysis.price_quality_tradeoffs?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-2">Price-Quality Trade-offs:</h5>
                      <ul className="space-y-2">
                        {aiComparisonResults.value_analysis.price_quality_tradeoffs.map((tradeoff, idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                            <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            {tradeoff}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="swot" className="space-y-4">
            {aiComparisonResults.comparative_analysis?.map((analysis, idx) => (
              <Card key={idx} className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>{analysis.proposal_name}</CardTitle>
                  <CardDescription>{analysis.overall_assessment}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h5 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Strengths
                      </h5>
                      <ul className="space-y-1">
                        {analysis.strengths?.map((s, i) => (
                          <li key={i} className="text-sm text-green-800">• {s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <h5 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                        <X className="w-4 h-4" />
                        Weaknesses
                      </h5>
                      <ul className="space-y-1">
                        {analysis.weaknesses?.map((w, i) => (
                          <li key={i} className="text-sm text-red-800">• {w}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h5 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Opportunities
                      </h5>
                      <ul className="space-y-1">
                        {analysis.opportunities?.map((o, i) => (
                          <li key={i} className="text-sm text-blue-800">• {o}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h5 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Threats
                      </h5>
                      <ul className="space-y-1">
                        {analysis.threats?.map((t, i) => (
                          <li key={i} className="text-sm text-amber-800">• {t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="headtohead" className="space-y-3">
            {aiComparisonResults.head_to_head?.map((comparison, idx) => (
              <Card key={idx} className="border-none shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-slate-900">{comparison.comparison_aspect}</h4>
                        <Badge className="bg-purple-600 text-white">
                          Winner: {comparison.winner}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700">{comparison.analysis}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="risks" className="space-y-4">
            {aiComparisonResults.risk_assessment?.map((risk, idx) => (
              <Card key={idx} className={cn(
                "border-2",
                risk.risk_level === 'high' ? 'border-red-500 bg-red-50' :
                risk.risk_level === 'medium' ? 'border-amber-500 bg-amber-50' :
                'border-blue-500 bg-blue-50'
              )}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{risk.proposal_name}</CardTitle>
                    <Badge className={
                      risk.risk_level === 'high' ? 'bg-red-600' :
                      risk.risk_level === 'medium' ? 'bg-amber-600' :
                      'bg-blue-600'
                    } className="text-white capitalize">
                      {risk.risk_level} Risk
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">Identified Risks:</h5>
                    <ul className="space-y-1">
                      {risk.risks?.map((r, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {risk.mitigations?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-2">Mitigations:</h5>
                      <ul className="space-y-1">
                        {risk.mitigations.map((m, i) => (
                          <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {aiComparisonResults.red_flags?.length > 0 && (
              <Card className="border-2 border-red-500 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Red Flags Detected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {aiComparisonResults.red_flags.map((flag, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border-2 border-red-300">
                        <div className="flex items-start gap-3">
                          <Badge className={
                            flag.severity === 'critical' ? 'bg-red-600' :
                            flag.severity === 'serious' ? 'bg-orange-600' :
                            flag.severity === 'moderate' ? 'bg-yellow-600' :
                            'bg-blue-600'
                          } className="text-white capitalize">
                            {flag.severity}
                          </Badge>
                          <div className="flex-1">
                            <div className="font-medium text-red-900 mb-1">
                              {flag.proposal_name} - {flag.flag_type}
                            </div>
                            <p className="text-sm text-slate-700">{flag.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="recommendation" className="space-y-6">
            {aiComparisonResults.decision_recommendation && (
              <Card className="border-2 border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-6 h-6 text-indigo-600" />
                    AI Decision Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 bg-white rounded-lg border-2 border-indigo-200 text-center">
                    <div className="text-sm text-slate-600 mb-2">Recommended Choice</div>
                    <div className="text-3xl font-bold text-indigo-600 mb-3">
                      {aiComparisonResults.decision_recommendation.recommended_choice}
                    </div>
                    <p className="text-sm text-slate-700">
                      {aiComparisonResults.decision_recommendation.rationale}
                    </p>
                  </div>

                  {aiComparisonResults.decision_recommendation.conditions?.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-3">Conditions to Consider:</h5>
                      <div className="space-y-2">
                        {aiComparisonResults.decision_recommendation.conditions.map((condition, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-lg border flex items-start gap-2">
                            <Eye className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-slate-700">{condition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiComparisonResults.decision_recommendation.alternative_if_primary_fails && (
                    <div className="p-4 bg-amber-50 rounded-lg border-2 border-amber-200">
                      <h5 className="font-semibold text-amber-900 mb-2">Backup Option:</h5>
                      <p className="text-sm text-amber-800">
                        {aiComparisonResults.decision_recommendation.alternative_if_primary_fails}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {selectedProposals.length >= 2 && !aiComparisonResults && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Scoring Matrix</CardTitle>
            <CardDescription>
              Rate each proposal on a scale of 1-10 • Weight totals: {totalWeight}%
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

      {selectedProposals.length >= 2 && !aiComparisonResults && (
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
                          {isWinner ? "Selected" : "Select"}
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

      {selectedProposals.length >= 2 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Decision Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              rows={5}
              placeholder="Document your decision rationale..."
            />
          </CardContent>
        </Card>
      )}

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
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Weights should total 100% (currently {totalWeight}%)
              </AlertDescription>
            </Alert>
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