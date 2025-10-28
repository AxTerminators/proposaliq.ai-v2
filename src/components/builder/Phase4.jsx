import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Sparkles, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Phase4({ proposalData, setProposalData, proposalId }) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);

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

  const trackTokenUsage = async (tokens, prompt, response) => {
    try {
      const user = await base44.auth.me();
      await base44.entities.TokenUsage.create({
        organization_id: currentOrgId,
        user_email: user.email,
        feature_type: "evaluation",
        tokens_used: tokens,
        llm_provider: "gemini",
        prompt: prompt?.substring(0, 500),
        response_preview: response?.substring(0, 200),
        cost_estimate: (tokens / 1000000) * 0.5
      });

      const subs = await base44.entities.Subscription.filter({ organization_id: currentOrgId }, '-created_date', 1);
      if (subs.length > 0) {
        await base44.entities.Subscription.update(subs[0].id, {
          token_credits_used: (subs[0].token_credits_used || 0) + tokens
        });
      }
    } catch (error) {
      console.error("Error tracking tokens:", error);
    }
  };

  const runEvaluation = async () => {
    if (!proposalId || !currentOrgId) {
      alert("Please save the proposal first");
      return;
    }

    setIsEvaluating(true);
    try {
      // Get solicitation documents
      const solicitationDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: currentOrgId
      });

      // Get reference documents
      const referenceDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: currentOrgId,
        document_type: "reference"
      });

      const prompt = `You are an expert proposal evaluator for government contracts. Evaluate this proposal for completeness and compliance.

**PROPOSAL DETAILS:**
- Name: ${proposalData.proposal_name}
- Type: ${proposalData.project_type}
- Agency: ${proposalData.agency_name}
- Solicitation: ${proposalData.solicitation_number}
- Prime Contractor: ${proposalData.prime_contractor_name}

**UPLOADED SOLICITATION DOCS:** ${solicitationDocs.length} files
**REFERENCE DOCUMENTS:** ${referenceDocs.length} files

**EVALUATION CRITERIA:**
Please evaluate the proposal and provide:

1. **Completeness Score (0-100)**: How complete is the proposal setup?
2. **Critical Issues**: List any critical problems that must be addressed
3. **Warnings**: List important issues that should be addressed
4. **Recommendations**: List suggested improvements
5. **Missing Elements**: What key information is missing?
6. **Strengths**: What aspects are well done?

Return a structured JSON response.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            completeness_score: { type: "number" },
            critical_issues: { type: "array", items: { type: "string" } },
            warnings: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            missing_elements: { type: "array", items: { type: "string" } },
            strengths: { type: "array", items: { type: "string" } },
            overall_assessment: { type: "string" }
          }
        }
      });

      await trackTokenUsage(5000, prompt, JSON.stringify(result));
      setEvaluation(result);

      // Update proposal with evaluation score
      await base44.entities.Proposal.update(proposalId, {
        match_score: result.completeness_score
      });

    } catch (error) {
      console.error("Error running evaluation:", error);
      alert("Error running evaluation. Please try again.");
    }
    setIsEvaluating(false);
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          Phase 4: AI Evaluator
        </CardTitle>
        <CardDescription>
          AI will analyze your proposal for completeness and compliance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!evaluation && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready to Evaluate</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              AI will analyze your proposal setup, review uploaded documents, and provide detailed feedback on completeness and compliance.
            </p>
            <Button 
              onClick={runEvaluation}
              disabled={isEvaluating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run AI Evaluation
                </>
              )}
            </Button>
          </div>
        )}

        {evaluation && (
          <div className="space-y-6">
            {/* Score */}
            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Completeness Score</p>
                    <p className="text-4xl font-bold text-purple-600">{evaluation.completeness_score}%</p>
                  </div>
                  <div className="w-20 h-20 rounded-full border-8 border-purple-200 flex items-center justify-center">
                    <span className="text-2xl">{evaluation.completeness_score >= 80 ? '✓' : '!'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Overall Assessment */}
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-sm">
                {evaluation.overall_assessment}
              </AlertDescription>
            </Alert>

            {/* Critical Issues */}
            {evaluation.critical_issues && evaluation.critical_issues.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-slate-900">Critical Issues</h3>
                  <Badge className="bg-red-100 text-red-700">{evaluation.critical_issues.length}</Badge>
                </div>
                <div className="space-y-2">
                  {evaluation.critical_issues.map((issue, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-900">{issue}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {evaluation.warnings && evaluation.warnings.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-slate-900">Warnings</h3>
                  <Badge className="bg-amber-100 text-amber-700">{evaluation.warnings.length}</Badge>
                </div>
                <div className="space-y-2">
                  {evaluation.warnings.map((warning, idx) => (
                    <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-900">{warning}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Elements */}
            {evaluation.missing_elements && evaluation.missing_elements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Missing Elements</h3>
                </div>
                <div className="space-y-2">
                  {evaluation.missing_elements.map((element, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900">{element}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {evaluation.recommendations && evaluation.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-900">Recommendations</h3>
                </div>
                <div className="space-y-2">
                  {evaluation.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <p className="text-sm text-indigo-900">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {evaluation.strengths && evaluation.strengths.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-slate-900">Strengths</h3>
                </div>
                <div className="space-y-2">
                  {evaluation.strengths.map((strength, idx) => (
                    <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-900">{strength}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button 
              onClick={runEvaluation}
              disabled={isEvaluating}
              variant="outline"
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Re-run Evaluation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}