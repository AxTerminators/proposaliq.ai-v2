
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const EVALUATION_CRITERIA = [
  { name: "Technical Requirement Match", maxPoints: 30, description: "Alignment with technical requirements" },
  { name: "Past Performance Match", maxPoints: 15, description: "Relevant past performance references" },
  { name: "Existing Relationship", maxPoints: 15, description: "Previous work with agency" },
  { name: "Compliance Match", maxPoints: 10, description: "Bonding, certifications, clearances" },
  { name: "Due Date", maxPoints: 5, description: "Time available to prepare" },
  { name: "Qualified Staff/Team", maxPoints: 5, description: "Management team expertise" },
];

export default function Phase3({ proposalData, setProposalData, proposalId }) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [customCriteria, setCustomCriteria] = useState([
    { name: "", points: 5 },
    { name: "", points: 5 },
    { name: "", points: 5 },
    { name: "", points: 5 }
  ]);

  const trackTokenUsage = async (tokensUsed, prompt, response, llm) => {
    try {
      const user = await base44.auth.me();
      const orgs = await base44.entities.Organization.filter({ created_by: user.email }, '-created_date', 1);
      
      if (orgs.length > 0) {
        await base44.entities.TokenUsage.create({
          organization_id: orgs[0].id,
          user_email: user.email,
          feature_type: "evaluation",
          tokens_used: tokensUsed,
          llm_provider: llm,
          prompt: prompt,
          response_preview: response?.substring(0, 200),
          cost_estimate: (tokensUsed / 1000000) * 0.5
        });

        const subs = await base44.entities.Subscription.filter({ organization_id: orgs[0].id }, '-created_date', 1);
        if (subs.length > 0) {
          await base44.entities.Subscription.update(subs[0].id, {
            token_credits_used: (subs[0].token_credits_used || 0) + tokensUsed
          });
        }
      }
    } catch (error) {
      console.error("Error tracking token usage:", error);
    }
  };

  const handleEvaluate = async () => {
    if (!proposalId) {
      alert("Please save the proposal first");
      return;
    }

    setIsEvaluating(true);
    try {
      const orgDetails = await base44.entities.Organization.filter(
        { id: proposalData.prime_contractor_id },
        '-created_date',
        1
      );
      
      const solDocs = await base44.entities.SolicitationDocument.filter(
        { proposal_id: proposalId },
        '-created_date'
      );

      const prompt = `You are an expert proposal evaluator. Analyze the match between this organization and the solicitation opportunity.

Organization: ${proposalData.prime_contractor_name}
Project Type: ${proposalData.project_type}
Agency: ${proposalData.agency_name}
Project Title: ${proposalData.project_title}
Due Date: ${proposalData.due_date}

Based on the information provided, evaluate the match quality and provide scores for:
1. Technical Requirement Match (0-30 points)
2. Past Performance Match (0-15 points)
3. Existing Relationship with Agency (0-15 points)
4. Compliance Match (0-10 points)
5. Due Date/Timeline (0-5 points)
6. Qualified Staff/Team (0-5 points)

Provide detailed reasoning for each score.`;

      const fileUrls = solDocs.map(doc => doc.file_url).filter(Boolean);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            technical_match: { type: "number" },
            technical_reasoning: { type: "string" },
            past_performance: { type: "number" },
            past_performance_reasoning: { type: "string" },
            relationship: { type: "number" },
            relationship_reasoning: { type: "string" },
            compliance: { type: "number" },
            compliance_reasoning: { type: "string" },
            timeline: { type: "number" },
            timeline_reasoning: { type: "string" },
            staff: { type: "number" },
            staff_reasoning: { type: "string" },
            total_score: { type: "number" },
            recommendation: { type: "string" }
          }
        }
      });

      await trackTokenUsage(5000, prompt, JSON.stringify(result), "gemini");

      setEvaluationResult(result);
      
      await base44.entities.Proposal.update(proposalId, {
        match_score: result.total_score
      });
      
      setProposalData({...proposalData, match_score: result.total_score});
    } catch (error) {
      console.error("Error evaluating:", error);
      alert("Error during evaluation. Please try again.");
    }
    setIsEvaluating(false);
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Phase 3: AI Evaluator
        </CardTitle>
        <CardDescription>
          Get an AI-powered match score to qualify this opportunity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900 mb-2">Evaluation Criteria (100 points total)</h3>
          <div className="space-y-2">
            {EVALUATION_CRITERIA.map((criteria, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-purple-700">{criteria.name}</span>
                <span className="font-medium text-purple-900">{criteria.maxPoints} pts</span>
              </div>
            ))}
            <div className="border-t border-purple-200 pt-2 mt-2">
              <p className="text-sm text-purple-600 mb-2">Custom Criteria (4 categories x 5 points each)</p>
              {customCriteria.map((custom, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <Input
                    placeholder={`Custom criterion ${idx + 1}`}
                    value={custom.name}
                    onChange={(e) => {
                      const updated = [...customCriteria];
                      updated[idx].name = e.target.value;
                      setCustomCriteria(updated);
                    }}
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    value={custom.points}
                    className="w-20 text-sm"
                    min="0"
                    max="5"
                    onChange={(e) => {
                      const updated = [...customCriteria];
                      updated[idx].points = parseInt(e.target.value) || 0;
                      setCustomCriteria(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button
          onClick={handleEvaluate}
          disabled={isEvaluating}
          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          size="lg"
        >
          {isEvaluating ? (
            <>
              <Sparkles className="w-5 h-5 mr-2 animate-spin" />
              Evaluating with AI...
            </>
          ) : (
            <>
              <TrendingUp className="w-5 h-5 mr-2" />
              Start AI Evaluation
            </>
          )}
        </Button>

        {evaluationResult && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-slate-900">Match Score</h3>
                <div className="text-5xl font-bold text-green-600">
                  {evaluationResult.total_score}/100
                </div>
              </div>
              <Progress value={evaluationResult.total_score} className="h-3" />
              <p className="text-sm text-slate-600 mt-4">
                {evaluationResult.total_score >= 70 ? (
                  <span className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                    Strong match - Recommended to pursue
                  </span>
                ) : evaluationResult.total_score >= 50 ? (
                  <span className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="w-5 h-5" />
                    Moderate match - Consider carefully
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    Weak match - May not be ideal
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900">Detailed Breakdown</h4>
              
              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Technical Match</span>
                  <span>{evaluationResult.technical_match}/30</span>
                </div>
                <p className="text-sm text-slate-600">{evaluationResult.technical_reasoning}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Past Performance</span>
                  <span>{evaluationResult.past_performance}/15</span>
                </div>
                <p className="text-sm text-slate-600">{evaluationResult.past_performance_reasoning}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Agency Relationship</span>
                  <span>{evaluationResult.relationship}/15</span>
                </div>
                <p className="text-sm text-slate-600">{evaluationResult.relationship_reasoning}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Compliance</span>
                  <span>{evaluationResult.compliance}/10</span>
                </div>
                <p className="text-sm text-slate-600">{evaluationResult.compliance_reasoning}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">AI Recommendation</h4>
              <p className="text-sm text-blue-800">{evaluationResult.recommendation}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
