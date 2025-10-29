
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Sparkles, AlertCircle, CheckCircle2, XCircle, Loader2, TrendingUp, Shield, Lightbulb, FileText, ChevronDown, ChevronUp, Users, Award, Brain } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ComplianceChecker from "./ComplianceChecker";
import RedTeamReview from "./RedTeamReview";

export default function Phase4({ proposalData, setProposalData, proposalId }) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  
  // New AI Scoring state
  const [isScoring, setIsScoring] = useState(false);
  const [aiScore, setAiScore] = useState(null);

  // Helper function to process documents - extracts text from office files
  const processDocuments = async (documents) => {
    if (!documents || documents.length === 0) return { fileUrls: [], extractedTexts: [] };
    
    const pdfImageExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const officeExtensions = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt'];
    
    const fileUrls = [];
    const extractedTexts = [];
    
    for (const doc of documents.slice(0, 15)) { // Process up to 15 documents
      if (!doc.file_url || !doc.file_name) continue;
      
      const fileName = doc.file_name.toLowerCase();
      const isPdfOrImage = pdfImageExtensions.some(ext => fileName.endsWith(ext));
      const isOfficeDoc = officeExtensions.some(ext => fileName.endsWith(ext));
      
      if (isPdfOrImage) {
        // PDF and images can be sent directly
        fileUrls.push(doc.file_url);
      } else if (isOfficeDoc) {
        // Extract text from office documents
        try {
          console.log(`Extracting text from: ${doc.file_name}`);
          const extractPrompt = `Extract and return ALL text content from this document. Preserve the structure and formatting as much as possible. Include all sections, headings, tables, and body text.`;
          
          const extractedContent = await base44.integrations.Core.InvokeLLM({
            prompt: extractPrompt,
            file_urls: [doc.file_url]
          });
          
          if (extractedContent) {
            extractedTexts.push({
              fileName: doc.file_name,
              content: typeof extractedContent === 'string' ? extractedContent : JSON.stringify(extractedContent)
            });
            console.log(`✓ Successfully extracted text from: ${doc.file_name}`);
          }
        } catch (error) {
          console.warn(`Could not extract text from ${doc.file_name}:`, error.message);
          // Continue processing other files
        }
      }
    }
    
    return { fileUrls, extractedTexts };
  };

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
        if (proposals.length > 0 && proposals[0].ai_confidence_score) {
          setAiScore(JSON.parse(proposals[0].ai_confidence_score));
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

      // Process documents - extract text from office files, keep PDFs/images as URLs
      console.log("Processing solicitation documents...");
      const { fileUrls, extractedTexts } = await processDocuments(solicitationDocs);
      console.log(`Processed: ${fileUrls.length} PDFs/images, ${extractedTexts.length} office documents`);

      // Build extracted documents context
      let extractedDocsContext = "";
      if (extractedTexts.length > 0) {
        extractedDocsContext = "\n\n**EXTRACTED DOCUMENT CONTENTS:**\n\n";
        extractedTexts.forEach((doc, idx) => {
          extractedDocsContext += `--- Document ${idx + 1}: ${doc.fileName} ---\n${doc.content}\n\n`;
        });
      }

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
- PDFs/Images: ${fileUrls.length}
- Office Documents Processed: ${extractedTexts.length}

${extractedDocsContext}

**YOUR TASK:**
Analyze the uploaded solicitation documents thoroughly (both attached files and extracted text above) and provide a comprehensive strategic evaluation. Return a JSON object with the following structure:

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
- Base analysis on actual content from solicitation documents (both attached files and extracted text above)
- If no documents are available, provide general best practices based on the opportunity information
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

      console.log("✓ Strategic Evaluation completed successfully!");

    } catch (error) {
      console.error("Error running evaluation:", error);
      alert(`Error running evaluation: ${error.message || 'Please try again.'}`);
    }
    setIsEvaluating(false);
  };

  const runAIScoring = async () => {
    if (!proposalId || !currentOrgId) {
      alert("Please save the proposal first");
      return;
    }

    setIsScoring(true);
    try {
      // Gather comprehensive data
      const [
        organization,
        solicitationDocs,
        proposalSections,
        pastPerformance,
        competitors,
        winThemes,
        complianceReqs,
        allProposals,
        pricingStrategy
      ] = await Promise.all([
        base44.entities.Organization.filter({ id: currentOrgId }).then(r => r.length > 0 ? r[0] : null),
        base44.entities.SolicitationDocument.filter({ proposal_id: proposalId, organization_id: currentOrgId }),
        base44.entities.ProposalSection.filter({ proposal_id: proposalId }),
        base44.entities.PastPerformance.filter({ organization_id: currentOrgId }),
        base44.entities.CompetitorIntel.filter({ organization_id: currentOrgId }),
        base44.entities.WinTheme.filter({ proposal_id: proposalId }),
        base44.entities.ComplianceRequirement.filter({ proposal_id: proposalId }),
        base44.entities.Proposal.filter({ organization_id: currentOrgId }),
        base44.entities.PricingStrategy.filter({ proposal_id: proposalId }).then(r => r.length > 0 ? r[0] : null)
      ]);

      // Calculate historical win rate
      const completedProposals = allProposals.filter(p => ['won', 'lost'].includes(p.status));
      const wonProposals = completedProposals.filter(p => p.status === 'won');
      const historicalWinRate = completedProposals.length > 0 
        ? (wonProposals.length / completedProposals.length) * 100 
        : 0;

      // Process documents - extract text from office files
      console.log("Processing documents for AI Scoring...");
      const { fileUrls, extractedTexts } = await processDocuments(solicitationDocs);
      console.log(`Processed: ${fileUrls.length} PDFs/images, ${extractedTexts.length} office documents`);

      // Build extracted documents context
      let extractedDocsContext = "";
      if (extractedTexts.length > 0) {
        extractedDocsContext = "\n\n**EXTRACTED DOCUMENT CONTENTS:**\n\n";
        extractedTexts.forEach((doc, idx) => {
          extractedDocsContext += `--- Document ${idx + 1}: ${doc.fileName} ---\n${doc.content}\n\n`;
        });
      }

      const prompt = `You are an elite AI proposal evaluator with expertise in government contracting, bid/no-bid analysis, and predictive win probability modeling.

**YOUR MISSION:** Provide a comprehensive, data-driven confidence score for this proposal's likelihood of winning, identifying specific strengths, weaknesses, risks, and actionable recommendations.

**ORGANIZATION PROFILE:**
- Name: ${organization?.organization_name || 'N/A'}
- NAICS: ${organization?.primary_naics || 'N/A'}
- Certifications: ${organization?.certifications?.join(', ') || 'None'}
- Historical Win Rate: ${historicalWinRate.toFixed(1)}%
- Total Past Proposals: ${completedProposals.length}
- Wins: ${wonProposals.length} | Losses: ${completedProposals.length - wonProposals.length}

**OPPORTUNITY:**
- Proposal: ${proposalData.proposal_name}
- Type: ${proposalData.project_type}
- Agency: ${proposalData.agency_name}
- Solicitation: ${proposalData.solicitation_number}
- Due Date: ${proposalData.due_date}
- Phase: ${proposalData.current_phase}

**PROPOSAL CONTENT:**
- Sections Written: ${proposalSections.length}
- Total Words: ${proposalSections.reduce((sum, s) => sum + (s.word_count || 0), 0)}
- Win Themes Defined: ${winThemes.length}
- Compliance Requirements: ${complianceReqs.length} (${complianceReqs.filter(c => c.compliance_status === 'compliant').length} compliant)

**COMPETITIVE LANDSCAPE:**
- Known Competitors: ${competitors.length}
- Past Performance Projects: ${pastPerformance.length}
- Relevant Past Performance: ${pastPerformance.filter(p => p.client_type === 'federal').length}

**PRICING:**
- Pricing Strategy: ${pricingStrategy?.pricing_approach || 'Not defined'}
- Win Probability at Price: ${pricingStrategy?.win_probability_at_price || 'N/A'}

**DOCUMENTS AVAILABLE:**
- Total Documents: ${solicitationDocs.length}
- PDFs/Images: ${fileUrls.length}
- Office Documents Processed: ${extractedTexts.length}

${extractedDocsContext}

**ANALYZE THE FOLLOWING:**
1. Requirements coverage & compliance
2. Content quality & persuasiveness
3. Win theme execution
4. Competitive positioning
5. Past performance relevance
6. Team strength
7. Pricing competitiveness
8. Risk factors

Return a comprehensive JSON analysis with:

{
  "confidence_score": <number 0-100: AI confidence in winning>,
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
  "executive_summary": <string: 2-3 sentence assessment>,
  
  "strengths": [
    {
      "category": <string>,
      "strength": <string>,
      "impact": <string: "high", "medium", "low">,
      "leverage_strategy": <string: how to maximize this>
    }
  ],
  
  "weaknesses": [
    {
      "category": <string>,
      "weakness": <string>,
      "severity": <string: "critical", "high", "medium", "low">,
      "improvement_action": <string: specific action to fix>
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
      "feedback": <string>,
      "priority_actions": [<string>]
    }
  ],
  
  "competitive_insights": {
    "our_advantages": [<string>],
    "competitor_advantages": [<string>],
    "ghosting_opportunities": [<string: how to ghost competitors>],
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
      "action": <string>,
      "deadline": <string>,
      "owner": <string: suggested role>
    }
  ],
  
  "long_term_recommendations": [<string>],
  
  "confidence_factors": {
    "factors_increasing_confidence": [<string>],
    "factors_decreasing_confidence": [<string>]
  },
  
  "comparison_to_past_wins": <string: how this compares to your successful bids>,
  "learning_from_past_losses": <string: lessons from past losses to apply here>
}

**CRITICAL:** Be brutally honest. Identify real weaknesses. Provide specific, actionable feedback. Base all analysis on the actual data and documents provided (both attached files and extracted text above).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined,
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

      await trackTokenUsage(20000, prompt, JSON.stringify(result));
      setAiScore(result);

      // Save AI score to proposal
      await base44.entities.Proposal.update(proposalId, {
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

  const getSeverityColor = (severity) => {
    if (severity === "critical") return "bg-red-100 text-red-800 border-red-300";
    if (severity === "high") return "bg-orange-100 text-orange-800 border-orange-300";
    if (severity === "medium") return "bg-amber-100 text-amber-800 border-amber-300";
    return "bg-blue-100 text-blue-800 border-blue-300";
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="ai-score" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai-score">
            <Brain className="w-4 h-4 mr-2" />
            AI Confidence Score
          </TabsTrigger>
          <TabsTrigger value="evaluation">
            <FileText className="w-4 h-4 mr-2" />
            Strategic Evaluation
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="w-4 h-4 mr-2" />
            Compliance Matrix
          </TabsTrigger>
          <TabsTrigger value="review">
            <Users className="w-4 h-4 mr-2" />
            Red Team Review
          </TabsTrigger>
        </TabsList>

        {/* AI Confidence Score Tab */}
        <TabsContent value="ai-score">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                AI-Powered Confidence Scoring
              </CardTitle>
              <CardDescription>
                Comprehensive proposal analysis using AI, past performance data, and competitive intelligence
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
                    Our advanced AI will analyze your proposal content, requirements alignment, past win/loss patterns, 
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
                  {/* Confidence Score Header */}
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
                        <p className="text-xs text-slate-500 mt-2">Based on comprehensive analysis</p>
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
                          {aiScore.recommendation.includes('Go') && !aiScore.recommendation.includes('No') ? (
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

                  {/* Executive Summary */}
                  <Alert>
                    <Sparkles className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      <strong>AI Assessment:</strong> {aiScore.executive_summary}
                    </AlertDescription>
                  </Alert>

                  <Tabs defaultValue="breakdown" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="breakdown">Score Breakdown</TabsTrigger>
                      <TabsTrigger value="strengths">Strengths</TabsTrigger>
                      <TabsTrigger value="weaknesses">Weaknesses</TabsTrigger>
                      <TabsTrigger value="risks">Risk Factors</TabsTrigger>
                      <TabsTrigger value="actions">Action Items</TabsTrigger>
                    </TabsList>

                    {/* Score Breakdown */}
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

                      {/* Section Analysis */}
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

                    {/* Strengths */}
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

                    {/* Weaknesses */}
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

                    {/* Risk Factors */}
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

                    {/* Action Items */}
                    <TabsContent value="actions">
                      <Card className="border-blue-200 bg-blue-50">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Lightbulb className="w-5 h-5 text-blue-600" />
                            Immediate Priorities
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

                      {/* Competitive Insights */}
                      {aiScore.competitive_insights && (
                        <Card className="mt-6 border-purple-200 bg-purple-50">
                          <CardHeader>
                            <CardTitle className="text-base">Competitive Intelligence</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {aiScore.competitive_insights.our_advantages && aiScore.competitive_insights.our_advantages.length > 0 && (
                                <div>
                                  <p className="text-sm font-semibold text-purple-900 mb-2">Our Advantages:</p>
                                  <div className="space-y-1">
                                    {aiScore.competitive_insights.our_advantages.map((adv, i) => (
                                      <p key={i} className="text-sm text-purple-800">✓ {adv}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {aiScore.competitive_insights.ghosting_opportunities?.length > 0 && (
                                <div>
                                  <p className="text-sm font-semibold text-purple-900 mb-2">Ghosting Opportunities:</p>
                                  <div className="space-y-1">
                                    {aiScore.competitive_insights.ghosting_opportunities.map((ghost, i) => (
                                      <p key={i} className="text-sm text-purple-800">👻 {ghost}</p>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* Re-run Button */}
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
        </TabsContent>

        {/* Strategic Evaluation Tab Content */}
        <TabsContent value="evaluation">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Strategic AI Evaluator
              </CardTitle>
              <CardDescription>
                Comprehensive AI-powered analysis of opportunity fit, competitive positioning, and strategic planning
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
                    {evaluation.competitive_analysis?.win_themes && evaluation.competitive_analysis.win_themes.length > 0 && (
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
                    {evaluation.requirement_analysis?.key_requirements && evaluation.requirement_analysis.key_requirements.length > 0 && (
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
                    {evaluation.requirement_analysis?.evaluation_criteria && evaluation.requirement_analysis.evaluation_criteria.length > 0 && (
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
                    {evaluation.gap_analysis?.critical_gaps && evaluation.gap_analysis.critical_gaps.length > 0 && (
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
                      {evaluation.competitive_analysis?.our_strengths && evaluation.competitive_analysis.our_strengths.length > 0 && (
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
                      )}

                      {/* Weaknesses */}
                      {evaluation.competitive_analysis?.our_weaknesses && evaluation.competitive_analysis.our_weaknesses.length > 0 && (
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
                      )}
                    </div>

                    {/* Differentiators */}
                    {evaluation.competitive_analysis?.differentiators && evaluation.competitive_analysis.differentiators.length > 0 && (
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
                    {evaluation.competitive_analysis?.likely_competitors && evaluation.competitive_analysis.likely_competitors.length > 0 && (
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

                  {/* Compliance Tab (Inner) */}
                  <TabsContent value="compliance" className="space-y-6">
                    {evaluation.compliance_checklist && evaluation.compliance_checklist.length > 0 && (
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
                    {evaluation.risk_assessment && Object.keys(evaluation.risk_assessment).some(key => evaluation.risk_assessment[key]?.length > 0) && (
                      <div className="grid md:grid-cols-2 gap-6">
                        {Object.entries(evaluation.risk_assessment).map(([category, risks]) => (
                          risks && risks.length > 0 && (
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
                          )
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Strategy Tab */}
                  <TabsContent value="strategy" className="space-y-6">
                    {/* Immediate Actions */}
                    {evaluation.strategic_recommendations?.immediate_actions && evaluation.strategic_recommendations.immediate_actions.length > 0 && (
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
                    {evaluation.strategic_recommendations?.team_building && evaluation.strategic_recommendations.team_building.length > 0 && (
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
                    {evaluation.strategic_recommendations?.content_priorities && evaluation.strategic_recommendations.content_priorities.length > 0 && (
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
        </TabsContent>

        {/* Full Compliance Checker Tab */}
        <TabsContent value="compliance">
          <ComplianceChecker
            proposalId={proposalId}
            proposalData={proposalData}
            organizationId={currentOrgId}
          />
        </TabsContent>

        {/* Red Team Review Tab */}
        <TabsContent value="review">
          <RedTeamReview
            proposalId={proposalId}
            proposalData={proposalData}
            organizationId={currentOrgId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
