import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Sparkles, AlertCircle, CheckCircle2, XCircle, Loader2, TrendingUp, Shield, Lightbulb, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Phase4({ proposalData, setProposalData, proposalId }) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});

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

    // Load existing evaluation if available
    const loadExistingEvaluation = async () => {
      if (!proposalId) return;
      try {
        const proposals = await base44.entities.Proposal.filter({ id: proposalId });
        if (proposals.length > 0 && proposals[0].evaluation_results) {
          setEvaluation(JSON.parse(proposals[0].evaluation_results));
        }
      } catch (error) {
        console.error("Error loading evaluation:", error);
      }
    };
    loadExistingEvaluation();
  }, [proposalId]);

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
      // Get organization details
      const orgs = await base44.entities.Organization.filter({ id: currentOrgId });
      const organization = orgs.length > 0 ? orgs[0] : null;

      // Get solicitation documents
      const solicitationDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: currentOrgId
      });

      // Get teaming partners
      const partners = await base44.entities.TeamingPartner.filter({
        organization_id: currentOrgId
      });

      // Get capability statements and resources
      const resources = await base44.entities.ProposalResource.filter({
        organization_id: currentOrgId
      });

      const fileUrls = solicitationDocs
        .filter(doc => doc.file_url)
        .map(doc => doc.file_url)
        .slice(0, 10); // Limit to 10 files for API constraints

      const prompt = `You are an expert proposal evaluator and capture manager for government contracts. Conduct a comprehensive strategic analysis of this opportunity.

**ORGANIZATION PROFILE:**
- Name: ${organization?.organization_name || 'Not specified'}
- Primary NAICS: ${organization?.primary_naics || 'Not specified'}
- Certifications: ${organization?.certifications?.join(', ') || 'None'}
- UEI: ${organization?.uei || 'Not specified'}
- CAGE: ${organization?.cage_code || 'Not specified'}

**OPPORTUNITY DETAILS:**
- Proposal Name: ${proposalData.proposal_name}
- Type: ${proposalData.project_type}
- Agency: ${proposalData.agency_name}
- Solicitation: ${proposalData.solicitation_number}
- Project Title: ${proposalData.project_title}
- Prime Contractor: ${proposalData.prime_contractor_name}
- Due Date: ${proposalData.due_date || 'Not specified'}

**TEAM COMPOSITION:**
- Teaming Partners: ${partners.length}
- Capability Statements Available: ${resources.length}
- Solicitation Documents Uploaded: ${solicitationDocs.length}

**YOUR TASK:**
Analyze the uploaded solicitation documents thoroughly and provide a comprehensive strategic evaluation. Return a JSON object with the following structure:

{
  "overall_score": <number 0-100>,
  "win_probability": <string: "high", "medium", "low">,
  "go_no_go_recommendation": <string: "go", "cautious_go", "no_go">,
  "executive_summary": <string: 2-3 sentence overall assessment>,
  
  "requirement_analysis": {
    "key_requirements": [
      {
        "requirement": <string>,
        "priority": <string: "critical", "high", "medium", "low">,
        "alignment_score": <number 0-100>,
        "gap_description": <string: what's missing or weak>
      }
    ],
    "evaluation_criteria": [
      {
        "criterion": <string>,
        "weight_percentage": <number>,
        "our_strength": <string: "strong", "moderate", "weak">,
        "notes": <string>
      }
    ]
  },
  
  "competitive_analysis": {
    "our_strengths": [<string: specific advantages>],
    "our_weaknesses": [<string: specific disadvantages>],
    "likely_competitors": [<string: probable competitors>],
    "differentiators": [<string: what makes us unique>],
    "win_themes": [<string: key themes to emphasize in proposal>]
  },
  
  "gap_analysis": {
    "critical_gaps": [
      {
        "gap": <string>,
        "impact": <string: "high", "medium", "low">,
        "mitigation_strategy": <string>
      }
    ],
    "capability_gaps": [<string>],
    "resource_gaps": [<string>],
    "partnership_needs": [<string>]
  },
  
  "compliance_checklist": [
    {
      "requirement": <string: mandatory requirement>,
      "category": <string: "submission", "technical", "administrative", "pricing">,
      "status": <string: "not_started", "at_risk", "addressed">,
      "notes": <string>
    }
  ],
  
  "risk_assessment": {
    "technical_risks": [{"risk": <string>, "severity": <string>, "mitigation": <string>}],
    "schedule_risks": [{"risk": <string>, "severity": <string>, "mitigation": <string>}],
    "cost_risks": [{"risk": <string>, "severity": <string>, "mitigation": <string>}],
    "compliance_risks": [{"risk": <string>, "severity": <string>, "mitigation": <string>}]
  },
  
  "strategic_recommendations": {
    "immediate_actions": [<string: actions to take now>],
    "team_building": [<string: who to add to team>],
    "content_priorities": [<string: what sections need most attention>],
    "pricing_strategy": <string: preliminary pricing guidance>
  },
  
  "key_dates_extracted": [
    {
      "date": <string>,
      "event": <string>,
      "importance": <string: "critical", "important", "informational">
    }
  ]
}

**IMPORTANT:**
- Be specific and actionable in all recommendations
- Base analysis on actual content from solicitation documents
- Identify concrete gaps and provide realistic mitigation strategies
- Consider the organization's size, certifications, and capabilities
- Provide honest assessment - don't sugarcoat weaknesses
- Extract ALL mandatory requirements and deadlines from the solicitation`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            win_probability: { type: "string" },
            go_no_go_recommendation: { type: "string" },
            executive_summary: { type: "string" },
            requirement_analysis: { type: "object" },
            competitive_analysis: { type: "object" },
            gap_analysis: { type: "object" },
            compliance_checklist: { type: "array" },
            risk_assessment: { type: "object" },
            strategic_recommendations: { type: "object" },
            key_dates_extracted: { type: "array" }
          }
        }
      });

      await trackTokenUsage(15000, prompt, JSON.stringify(result));
      setEvaluation(result);

      // Save evaluation to proposal
      await base44.entities.Proposal.update(proposalId, {
        match_score: result.overall_score,
        evaluation_results: JSON.stringify(result),
        evaluation_date: new Date().toISOString()
      });

    } catch (error) {
      console.error("Error running evaluation:", error);
      alert("Error running evaluation. Please try again.");
    }
    setIsEvaluating(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getPriorityColor = (priority) => {
    if (priority === "critical") return "bg-red-100 text-red-700 border-red-300";
    if (priority === "high") return "bg-orange-100 text-orange-700 border-orange-300";
    if (priority === "medium") return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-blue-100 text-blue-700 border-blue-300";
  };

  const getStatusColor = (status) => {
    if (status === "addressed") return "bg-green-100 text-green-700";
    if (status === "at_risk") return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          Phase 4: Strategic AI Evaluator
        </CardTitle>
        <CardDescription>
          Comprehensive AI-powered analysis of opportunity fit, competitive positioning, and win strategy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!evaluation && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready for Strategic Evaluation</h3>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Our AI will conduct a comprehensive capture management analysis including requirement mapping, 
              competitive positioning, gap analysis, compliance checking, and strategic recommendations.
            </p>
            <Button 
              onClick={runEvaluation}
              disabled={isEvaluating}
              size="lg"
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing Opportunity...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Run Strategic Evaluation
                </>
              )}
            </Button>
          </div>
        )}

        {evaluation && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="competitive">Competitive</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Score Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-600">Overall Score</p>
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                    </div>
                    <p className={`text-4xl font-bold ${getScoreColor(evaluation.overall_score)}`}>
                      {evaluation.overall_score}%
                    </p>
                    <Progress value={evaluation.overall_score} className="mt-3" />
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${
                  evaluation.win_probability === 'high' ? 'from-green-50 to-white border-green-200' :
                  evaluation.win_probability === 'medium' ? 'from-amber-50 to-white border-amber-200' :
                  'from-red-50 to-white border-red-200'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-600">Win Probability</p>
                      <Target className="w-5 h-5 text-slate-600" />
                    </div>
                    <p className="text-3xl font-bold capitalize">{evaluation.win_probability}</p>
                    <p className="text-xs text-slate-500 mt-2">Based on capability fit</p>
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${
                  evaluation.go_no_go_recommendation === 'go' ? 'from-green-50 to-white border-green-200' :
                  evaluation.go_no_go_recommendation === 'cautious_go' ? 'from-amber-50 to-white border-amber-200' :
                  'from-red-50 to-white border-red-200'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-slate-600">Recommendation</p>
                      {evaluation.go_no_go_recommendation === 'go' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : evaluation.go_no_go_recommendation === 'cautious_go' ? (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <p className="text-2xl font-bold capitalize">{evaluation.go_no_go_recommendation.replace('_', ' ')}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Executive Summary */}
              <Alert>
                <Sparkles className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  <strong>Executive Summary:</strong> {evaluation.executive_summary}
                </AlertDescription>
              </Alert>

              {/* Win Themes */}
              {evaluation.competitive_analysis?.win_themes && (
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-indigo-600" />
                      Recommended Win Themes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {evaluation.competitive_analysis.win_themes.map((theme, idx) => (
                        <div key={idx} className="p-3 bg-white border border-indigo-200 rounded-lg">
                          <p className="text-sm font-medium text-indigo-900">{theme}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Key Dates */}
              {evaluation.key_dates_extracted && evaluation.key_dates_extracted.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Dates & Deadlines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {evaluation.key_dates_extracted.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-900">{item.event}</p>
                            <p className="text-sm text-slate-600">{item.date}</p>
                          </div>
                          <Badge className={getPriorityColor(item.importance)}>
                            {item.importance}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Requirements Tab */}
            <TabsContent value="requirements" className="space-y-6">
              {/* Key Requirements */}
              {evaluation.requirement_analysis?.key_requirements && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Requirements Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {evaluation.requirement_analysis.key_requirements.map((req, idx) => (
                        <AccordionItem key={idx} value={`req-${idx}`}>
                          <AccordionTrigger>
                            <div className="flex items-center gap-3 flex-1 text-left">
                              <Badge className={getPriorityColor(req.priority)}>
                                {req.priority}
                              </Badge>
                              <span className="font-medium">{req.requirement}</span>
                              <span className={`ml-auto mr-4 ${getScoreColor(req.alignment_score)}`}>
                                {req.alignment_score}%
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                              <div>
                                <p className="text-xs font-semibold text-slate-600 mb-1">Alignment Score</p>
                                <Progress value={req.alignment_score} className="h-2" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-slate-600 mb-1">Gap Analysis</p>
                                <p className="text-sm text-slate-700">{req.gap_description}</p>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              )}

              {/* Evaluation Criteria */}
              {evaluation.requirement_analysis?.evaluation_criteria && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Evaluation Criteria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {evaluation.requirement_analysis.evaluation_criteria.map((criterion, idx) => (
                        <div key={idx} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{criterion.criterion}</p>
                              <p className="text-sm text-slate-600 mt-1">{criterion.notes}</p>
                            </div>
                            <div className="text-right ml-4">
                              <Badge variant={
                                criterion.our_strength === 'strong' ? 'default' :
                                criterion.our_strength === 'moderate' ? 'secondary' :
                                'outline'
                              }>
                                {criterion.our_strength}
                              </Badge>
                              {criterion.weight_percentage && (
                                <p className="text-xs text-slate-500 mt-1">{criterion.weight_percentage}% weight</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Gap Analysis */}
              {evaluation.gap_analysis?.critical_gaps && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      Critical Gaps & Mitigation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {evaluation.gap_analysis.critical_gaps.map((gap, idx) => (
                        <div key={idx} className="p-4 bg-white border border-red-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-semibold text-red-900 flex-1">{gap.gap}</p>
                            <Badge className={
                              gap.impact === 'high' ? 'bg-red-600 text-white' :
                              gap.impact === 'medium' ? 'bg-amber-600 text-white' :
                              'bg-blue-600 text-white'
                            }>
                              {gap.impact} impact
                            </Badge>
                          </div>
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                            <p className="text-xs font-semibold text-green-800 mb-1">Mitigation Strategy:</p>
                            <p className="text-sm text-green-900">{gap.mitigation_strategy}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Competitive Tab */}
            <TabsContent value="competitive" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Strengths */}
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Our Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {evaluation.competitive_analysis?.our_strengths?.map((strength, idx) => (
                        <div key={idx} className="p-3 bg-white border border-green-200 rounded-lg">
                          <p className="text-sm text-green-900">{strength}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Weaknesses */}
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      Our Weaknesses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {evaluation.competitive_analysis?.our_weaknesses?.map((weakness, idx) => (
                        <div key={idx} className="p-3 bg-white border border-red-200 rounded-lg">
                          <p className="text-sm text-red-900">{weakness}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Differentiators */}
              {evaluation.competitive_analysis?.differentiators && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      Key Differentiators
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {evaluation.competitive_analysis.differentiators.map((diff, idx) => (
                        <div key={idx} className="p-3 bg-white border border-blue-200 rounded-lg">
                          <p className="text-sm font-medium text-blue-900">{diff}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Likely Competitors */}
              {evaluation.competitive_analysis?.likely_competitors && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Likely Competitors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {evaluation.competitive_analysis.likely_competitors.map((competitor, idx) => (
                        <Badge key={idx} variant="outline" className="px-3 py-1">
                          {competitor}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="space-y-6">
              {evaluation.compliance_checklist && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      Compliance Checklist
                    </CardTitle>
                    <CardDescription>
                      Track mandatory requirements and submission elements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {evaluation.compliance_checklist.map((item, idx) => (
                        <div key={idx} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="capitalize">
                                  {item.category}
                                </Badge>
                                <Badge className={getStatusColor(item.status)}>
                                  {item.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              <p className="font-medium text-slate-900 mb-1">{item.requirement}</p>
                              {item.notes && (
                                <p className="text-sm text-slate-600">{item.notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Risk Assessment */}
              {evaluation.risk_assessment && (
                <div className="grid md:grid-cols-2 gap-6">
                  {Object.entries(evaluation.risk_assessment).map(([category, risks]) => (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle className="text-base capitalize">
                          {category.replace('_', ' ')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {risks.map((risk, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 border rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-medium text-sm text-slate-900 flex-1">{risk.risk}</p>
                                <Badge variant={
                                  risk.severity === 'high' ? 'destructive' :
                                  risk.severity === 'medium' ? 'secondary' :
                                  'outline'
                                } className="ml-2">
                                  {risk.severity}
                                </Badge>
                              </div>
                              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                <p className="text-xs font-semibold text-blue-800 mb-1">Mitigation:</p>
                                <p className="text-xs text-blue-900">{risk.mitigation}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Strategy Tab */}
            <TabsContent value="strategy" className="space-y-6">
              {/* Immediate Actions */}
              {evaluation.strategic_recommendations?.immediate_actions && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      Immediate Actions Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {evaluation.strategic_recommendations.immediate_actions.map((action, idx) => (
                        <div key={idx} className="p-3 bg-white border border-amber-200 rounded-lg flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold">{idx + 1}</span>
                          </div>
                          <p className="text-sm text-amber-900 flex-1">{action}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Team Building */}
              {evaluation.strategic_recommendations?.team_building && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Team Building Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {evaluation.strategic_recommendations.team_building.map((rec, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border rounded-lg">
                          <p className="text-sm text-slate-900">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Content Priorities */}
              {evaluation.strategic_recommendations?.content_priorities && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Content Development Priorities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {evaluation.strategic_recommendations.content_priorities.map((priority, idx) => (
                        <div key={idx} className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex items-start gap-3">
                          <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-indigo-900">{priority}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Pricing Strategy */}
              {evaluation.strategic_recommendations?.pricing_strategy && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-base">Pricing Strategy Guidance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-green-900">{evaluation.strategic_recommendations.pricing_strategy}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {evaluation && (
          <div className="flex gap-3 pt-6 border-t">
            <Button 
              onClick={runEvaluation}
              disabled={isEvaluating}
              variant="outline"
              className="flex-1"
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