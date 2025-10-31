import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Trophy,
  Shield
} from "lucide-react";
import CompetitorAnalysis from "./CompetitorAnalysis";
import ComplianceMatrixGenerator from "./ComplianceMatrixGenerator";

export default function Phase4({ proposalData, setProposalData, proposalId }) {
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [calculatingScore, setCalculatingScore] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState(null);
  const [currentOrgId, setCurrentOrgId] = React.useState(null);

  React.useEffect(() => {
    const loadOrgId = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading org:", error);
      }
    };
    loadOrgId();
  }, []);

  React.useEffect(() => {
    if (proposalData?.evaluation_results) {
      try {
        const parsed = JSON.parse(proposalData.evaluation_results);
        setEvaluationResults(parsed);
      } catch (error) {
        console.error("Error parsing evaluation results:", error);
      }
    }
    if (proposalData?.ai_confidence_score) {
      try {
        const parsed = JSON.parse(proposalData.ai_confidence_score);
        setConfidenceScore(parsed);
      } catch (error) {
        console.error("Error parsing confidence score:", error);
      }
    }
  }, [proposalData]);

  const runEvaluation = async () => {
    if (!proposalData || !proposalId) return;

    setEvaluating(true);
    try {
      const prompt = `You are a government proposal strategist. Evaluate this opportunity and provide strategic recommendations.

**OPPORTUNITY:**
- Name: ${proposalData.proposal_name}
- Agency: ${proposalData.agency_name}
- Project: ${proposalData.project_title}
- Type: ${proposalData.project_type}
- Due Date: ${proposalData.due_date}
- Value: ${proposalData.contract_value ? '$' + proposalData.contract_value.toLocaleString() : 'Unknown'}

**EVALUATION TASK:**
Provide a strategic evaluation with:

1. **Opportunity Assessment** (0-100 score)
2. **Win Probability** (percentage estimate)
3. **Strategic Fit** (high/medium/low)
4. **Key Strengths** (list 3-5)
5. **Key Risks** (list 3-5)
6. **Competitive Landscape** (analysis)
7. **Go/No-Go Recommendation** (GO, CONDITIONAL, NO-GO)
8. **Action Items** (list 5-7 specific actions)

Return JSON:
{
  "assessment_score": number,
  "win_probability": number,
  "strategic_fit": string,
  "strengths": [string],
  "risks": [string],
  "competitive_landscape": string,
  "recommendation": string,
  "reasoning": string,
  "action_items": [string]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            assessment_score: { type: "number" },
            win_probability: { type: "number" },
            strategic_fit: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
            competitive_landscape: { type: "string" },
            recommendation: { type: "string" },
            reasoning: { type: "string" },
            action_items: { type: "array", items: { type: "string" } }
          }
        }
      });

      setEvaluationResults(result);

      await base44.entities.Proposal.update(proposalId, {
        evaluation_results: JSON.stringify(result),
        evaluation_date: new Date().toISOString(),
        match_score: result.assessment_score
      });

      setProposalData({
        ...proposalData,
        evaluation_results: JSON.stringify(result),
        match_score: result.assessment_score
      });

      alert("✓ Strategic evaluation complete!");
    } catch (error) {
      console.error("Error running evaluation:", error);
      alert("Error running evaluation: " + error.message);
    } finally {
      setEvaluating(false);
    }
  };

  const calculateConfidence = async () => {
    if (!proposalData || !proposalId) return;

    setCalculatingScore(true);
    try {
      const [sections, requirements, resources] = await Promise.all([
        base44.entities.ProposalSection.filter({ proposal_id: proposalId }),
        base44.entities.ComplianceRequirement.filter({ proposal_id: proposalId }),
        base44.entities.ProposalResource.filter({ organization_id: currentOrgId })
      ]);

      const prompt = `You are an AI proposal analyst. Calculate a comprehensive confidence score for winning this proposal.

**PROPOSAL DATA:**
${JSON.stringify({
  name: proposalData.proposal_name,
  agency: proposalData.agency_name,
  sections_total: sections.length,
  sections_complete: sections.filter(s => s.status === 'approved').length,
  compliance_requirements: requirements.length,
  compliance_met: requirements.filter(r => r.compliance_status === 'compliant').length,
  resources_available: resources.length,
  match_score: proposalData.match_score
}, null, 2)}

**TASK:**
Calculate confidence score (0-100) based on:
1. Completeness
2. Compliance
3. Resource availability
4. Strategic fit
5. Competitive position

Return JSON:
{
  "overall_score": number,
  "completeness_score": number,
  "compliance_score": number,
  "quality_score": number,
  "competitive_score": number,
  "confidence_level": "high|medium|low",
  "strengths": [string],
  "concerns": [string],
  "recommendations": [string]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            completeness_score: { type: "number" },
            compliance_score: { type: "number" },
            quality_score: { type: "number" },
            competitive_score: { type: "number" },
            confidence_level: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setConfidenceScore(result);

      await base44.entities.Proposal.update(proposalId, {
        ai_confidence_score: JSON.stringify(result),
        ai_score_date: new Date().toISOString()
      });

      alert("✓ Confidence score calculated!");
    } catch (error) {
      console.error("Error calculating score:", error);
      alert("Error calculating confidence score: " + error.message);
    } finally {
      setCalculatingScore(false);
    }
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Phase 4: Evaluator & Compliance
        </CardTitle>
        <CardDescription>
          AI-powered opportunity evaluation, strategic recommendations, and compliance tracking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="evaluation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="evaluation">Strategic Evaluation</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Matrix</TabsTrigger>
            <TabsTrigger value="competitor">Competitor Analysis</TabsTrigger>
            <TabsTrigger value="confidence">Confidence Score</TabsTrigger>
          </TabsList>

          {/* Strategic Evaluation */}
          <TabsContent value="evaluation" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Strategic Evaluation</CardTitle>
                    <CardDescription>AI-powered opportunity assessment</CardDescription>
                  </div>
                  <Button onClick={runEvaluation} disabled={evaluating}>
                    {evaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {evaluationResults ? 'Re-evaluate' : 'Run Evaluation'}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {evaluationResults && (
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-blue-600">{evaluationResults.assessment_score}</p>
                        <p className="text-xs text-blue-900 mt-1">Assessment Score</p>
                      </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-bold text-green-600">{evaluationResults.win_probability}%</p>
                        <p className="text-xs text-green-900 mt-1">Win Probability</p>
                      </CardContent>
                    </Card>
                    <Card className="border-purple-200 bg-purple-50">
                      <CardContent className="p-4 text-center">
                        <Badge className="text-sm px-3 py-1 bg-purple-600 text-white capitalize">
                          {evaluationResults.strategic_fit}
                        </Badge>
                        <p className="text-xs text-purple-900 mt-2">Strategic Fit</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-none shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-base">Recommendation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge className={
                        evaluationResults.recommendation === 'GO' ? 'bg-green-600 text-white' :
                        evaluationResults.recommendation === 'CONDITIONAL' ? 'bg-yellow-600 text-white' :
                        'bg-red-600 text-white'
                      }>
                        {evaluationResults.recommendation}
                      </Badge>
                      <p className="text-sm text-slate-700 mt-3">{evaluationResults.reasoning}</p>
                    </CardContent>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-base text-green-900">Strengths</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {evaluationResults.strengths?.map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                              <span className="text-sm text-green-900">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-red-200 bg-red-50">
                      <CardHeader>
                        <CardTitle className="text-base text-red-900">Risks</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {evaluationResults.risks?.map((risk, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                              <span className="text-sm text-red-900">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-none shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-base">Action Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {evaluationResults.action_items?.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                              {idx + 1}
                            </div>
                            <span className="text-sm text-slate-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Compliance Matrix */}
          <TabsContent value="compliance">
            <ComplianceMatrixGenerator 
              proposal={{ id: proposalId, ...proposalData }} 
              organization={currentOrgId ? { id: currentOrgId } : null} 
            />
          </TabsContent>

          {/* Competitor Analysis */}
          <TabsContent value="competitor">
            <CompetitorAnalysis 
              proposal={{ id: proposalId, ...proposalData }} 
              organization={currentOrgId ? { id: currentOrgId } : null} 
            />
          </TabsContent>

          {/* Confidence Score */}
          <TabsContent value="confidence" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">AI Confidence Score</CardTitle>
                    <CardDescription>Comprehensive win probability analysis</CardDescription>
                  </div>
                  <Button onClick={calculateConfidence} disabled={calculatingScore}>
                    {calculatingScore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Trophy className="w-4 h-4 mr-2" />
                        {confidenceScore ? 'Recalculate' : 'Calculate Score'}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {confidenceScore && (
                <CardContent className="space-y-6">
                  <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                    <p className="text-6xl font-bold text-blue-600 mb-2">{confidenceScore.overall_score}</p>
                    <Badge className={
                      confidenceScore.confidence_level === 'high' ? 'bg-green-600 text-white' :
                      confidenceScore.confidence_level === 'medium' ? 'bg-yellow-600 text-white' :
                      'bg-red-600 text-white'
                    }>
                      {confidenceScore.confidence_level} confidence
                    </Badge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-600 mb-1">Completeness</p>
                        <p className="text-2xl font-bold">{confidenceScore.completeness_score}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-600 mb-1">Compliance</p>
                        <p className="text-2xl font-bold">{confidenceScore.compliance_score}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-600 mb-1">Quality</p>
                        <p className="text-2xl font-bold">{confidenceScore.quality_score}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-600 mb-1">Competitive Position</p>
                        <p className="text-2xl font-bold">{confidenceScore.competitive_score}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="border-green-200 bg-green-50">
                      <CardHeader>
                        <CardTitle className="text-base text-green-900">Strengths</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {confidenceScore.strengths?.map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                              <span className="text-sm text-green-900">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-amber-200 bg-amber-50">
                      <CardHeader>
                        <CardTitle className="text-base text-amber-900">Concerns</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {confidenceScore.concerns?.map((concern, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 mt-1 flex-shrink-0" />
                              <span className="text-sm text-amber-900">{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-none shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-base">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {confidenceScore.recommendations?.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                              {idx + 1}
                            </div>
                            <span className="text-sm text-slate-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </CardContent>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}