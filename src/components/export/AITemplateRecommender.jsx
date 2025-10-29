import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Target,
  FileText,
  Brain
} from "lucide-react";

export default function AITemplateRecommender({ proposalData, organizationId, onSelectTemplate }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const analyzeProposal = async () => {
    if (!proposalData) return;

    setIsAnalyzing(true);
    try {
      const prompt = `You are an expert in government proposal formatting and compliance.

**PROPOSAL INFORMATION:**
- Type: ${proposalData.project_type || 'RFP'}
- Agency: ${proposalData.agency_name || 'Government Agency'}
- Solicitation: ${proposalData.solicitation_number || 'N/A'}
- Project Title: ${proposalData.project_title || proposalData.proposal_name}

**YOUR TASK:**
Analyze this proposal and recommend the best export template configuration for maximum compliance and professionalism.

Consider:
1. Agency-specific formatting requirements
2. Document type standards (RFP, RFQ, IFB, etc.)
3. Best practices for federal proposals
4. Readability and professional appearance

Provide recommendations in this JSON format:
{
  "recommended_template": {
    "name": "<suggested template name>",
    "reasoning": "<why this template is best>",
    "confidence": <number 0-100>
  },
  "formatting_recommendations": {
    "font_family": "<Times New Roman|Arial|Calibri>",
    "font_size": <10-14>,
    "line_spacing": <1.0-2.0>,
    "page_size": "<letter|legal|a4>",
    "include_compliance_matrix": <boolean>,
    "section_numbering": "<numeric|alpha|roman|none>"
  },
  "compliance_notes": [
    "<specific compliance requirement 1>",
    "<specific compliance requirement 2>",
    "<specific compliance requirement 3>"
  ],
  "win_probability_boost": <number 0-100>,
  "similar_successful_proposals": [
    "<example 1>",
    "<example 2>"
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommended_template: { type: "object" },
            formatting_recommendations: { type: "object" },
            compliance_notes: { type: "array" },
            win_probability_boost: { type: "number" },
            similar_successful_proposals: { type: "array" }
          }
        }
      });

      setRecommendations(result);

    } catch (error) {
      console.error("Error analyzing proposal:", error);
      alert("Error analyzing proposal. Please try again.");
    }
    setIsAnalyzing(false);
  };

  if (!recommendations) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Template Recommendations
          </CardTitle>
          <CardDescription>
            Get intelligent template suggestions based on your proposal type and agency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={analyzeProposal}
            disabled={isAnalyzing || !proposalData}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Proposal...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Get AI Recommendations
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Recommended Template
            </CardTitle>
            <Badge className="bg-purple-600">
              {recommendations.recommended_template.confidence}% Match
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-white rounded-lg border-2 border-purple-300">
            <h3 className="font-bold text-lg text-purple-900 mb-2">
              {recommendations.recommended_template.name}
            </h3>
            <p className="text-slate-700">
              {recommendations.recommended_template.reasoning}
            </p>
          </div>

          {recommendations.win_probability_boost > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <strong>Win Probability Boost:</strong> Using this template could improve your win probability by up to {recommendations.win_probability_boost}%
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => onSelectTemplate(recommendations.formatting_recommendations)}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Use This Template Configuration
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Formatting Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Font:</span>
              <span className="font-medium">{recommendations.formatting_recommendations.font_family} {recommendations.formatting_recommendations.font_size}pt</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Line Spacing:</span>
              <span className="font-medium">{recommendations.formatting_recommendations.line_spacing}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Page Size:</span>
              <span className="font-medium capitalize">{recommendations.formatting_recommendations.page_size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Numbering:</span>
              <span className="font-medium capitalize">{recommendations.formatting_recommendations.section_numbering}</span>
            </div>
            <div className="flex justify-between col-span-2">
              <span className="text-slate-600">Compliance Matrix:</span>
              <span className="font-medium">
                {recommendations.formatting_recommendations.include_compliance_matrix ? (
                  <CheckCircle2 className="w-4 h-4 inline text-green-600" />
                ) : (
                  'Not Required'
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {recommendations.compliance_notes && recommendations.compliance_notes.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              Compliance Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.compliance_notes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-blue-900">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {recommendations.similar_successful_proposals && recommendations.similar_successful_proposals.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              Similar Successful Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {recommendations.similar_successful_proposals.map((example, idx) => (
                <li key={idx} className="text-sm text-slate-600">
                  • {example}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        onClick={() => setRecommendations(null)}
        className="w-full"
      >
        Get New Recommendations
      </Button>
    </div>
  );
}