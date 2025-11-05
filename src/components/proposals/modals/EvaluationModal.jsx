import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function EvaluationModal({ isOpen, onClose, proposalId }) {
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [proposalData, setProposalData] = useState(null);
  const [evaluationResults, setEvaluationResults] = useState(null);

  useEffect(() => {
    if (isOpen && proposalId) {
      loadData();
    }
  }, [isOpen, proposalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      if (proposals.length > 0) {
        setProposalData(proposals[0]);
        if (proposals[0].evaluation_results) {
          try {
            setEvaluationResults(JSON.parse(proposals[0].evaluation_results));
          } catch (error) {
            console.error("Error parsing evaluation results:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const runEvaluation = async () => {
    if (!proposalData) return;

    setEvaluating(true);
    try {
      const prompt = `You are a government proposal strategist. Evaluate this opportunity and provide strategic recommendations.

**OPPORTUNITY:**
- Name: ${proposalData.proposal_name}
- Agency: ${proposalData.agency_name || 'Unknown'}
- Project: ${proposalData.project_title || 'Unknown'}
- Type: ${proposalData.project_type || 'Unknown'}
- Due Date: ${proposalData.due_date || 'Unknown'}
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

Return JSON with these fields.`;

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

      alert("✓ Strategic evaluation complete!");
    } catch (error) {
      console.error("Error running evaluation:", error);
      alert("Error running evaluation: " + error.message);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Strategic Evaluation
          </DialogTitle>
          <DialogDescription>
            AI-powered opportunity assessment and go/no-go decision support
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {!evaluationResults ? (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                  <h3 className="font-semibold text-blue-900 mb-2">Ready to Evaluate</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Run AI-powered strategic evaluation to assess win probability and identify key risks.
                  </p>
                  <Button onClick={runEvaluation} disabled={evaluating}>
                    {evaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Run Evaluation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
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
                  <CardContent className="p-4">
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

                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-green-900 mb-3">Strengths</h4>
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
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-red-900 mb-3">Risks</h4>
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
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">Action Items</h4>
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

                <div className="flex justify-center">
                  <Button onClick={runEvaluation} variant="outline" disabled={evaluating}>
                    {evaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Re-evaluating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Re-run Evaluation
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}