import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  Shield,
  Users,
  DollarSign,
  Award,
  Sparkles,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Brain,
  Zap
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function CompetitorAnalysis({ proposalId, proposalData, organizationId }) {
  const queryClient = useQueryClient();
  const [showAddCompetitor, setShowAddCompetitor] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [competitorName, setCompetitorName] = useState("");

  const { data: competitors } = useQuery({
    queryKey: ['competitors', organizationId],
    queryFn: () => organizationId ? base44.entities.CompetitorIntel.filter({ organization_id: organizationId }, '-last_updated') : [],
    initialData: [],
    enabled: !!organizationId
  });

  const addCompetitorMutation = useMutation({
    mutationFn: async (competitorData) => {
      await base44.entities.CompetitorIntel.create({
        ...competitorData,
        organization_id: organizationId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      setShowAddCompetitor(false);
      setSelectedCompetitor(null);
    }
  });

  const runAIAnalysis = async () => {
    if (!proposalData || competitors.length === 0) {
      alert("Add competitor information first to run AI analysis");
      return;
    }

    setIsAnalyzing(true);
    try {
      const competitorInfo = competitors.map(c => ({
        name: c.competitor_name,
        type: c.competitor_type,
        strengths: c.strengths || [],
        weaknesses: c.weaknesses || [],
        past_wins: c.past_wins || [],
        win_rate: c.win_rate || 0,
        pricing_strategy: c.typical_pricing_strategy
      }));

      const prompt = `You are an expert competitive intelligence analyst for government contracting.

**PROPOSAL DETAILS:**
- Project: ${proposalData.proposal_name}
- Agency: ${proposalData.agency_name}
- Type: ${proposalData.project_type}
- Solicitation: ${proposalData.solicitation_number || 'N/A'}

**KNOWN COMPETITORS:**
${competitorInfo.map((c, idx) => `
${idx + 1}. ${c.name} (${c.type})
   - Strengths: ${c.strengths.join(', ') || 'Unknown'}
   - Weaknesses: ${c.weaknesses.join(', ') || 'Unknown'}
   - Win Rate: ${c.win_rate}%
   - Pricing: ${c.pricing_strategy}
   - Recent Wins: ${c.past_wins.length}
`).join('\n')}

**YOUR TASK:**
Provide comprehensive competitive analysis and strategy recommendations.

Return JSON:
{
  "competitive_landscape": {
    "threat_level": "<low|medium|high|critical>",
    "market_position": "<string: where we stand>",
    "key_battlegrounds": [<string: areas of intense competition>]
  },
  
  "competitor_rankings": [
    {
      "competitor_name": "<string>",
      "threat_score": <number 0-100>,
      "likely_strategy": "<string>",
      "probability_of_bid": <number 0-100>,
      "estimated_price_positioning": "<string>"
    }
  ],
  
  "our_advantages": [
    {
      "advantage": "<string>",
      "why_it_matters": "<string>",
      "how_to_emphasize": "<string>"
    }
  ],
  
  "vulnerabilities": [
    {
      "vulnerability": "<string>",
      "competitor_who_exploits": "<string>",
      "mitigation_strategy": "<string>"
    }
  ],
  
  "ghosting_strategies": [
    {
      "competitor_to_ghost": "<string>",
      "their_weakness": "<string>",
      "our_strength": "<string>",
      "ghosting_message": "<string: subtle way to highlight their weakness>"
    }
  ],
  
  "pricing_strategy_recommendation": {
    "recommended_approach": "<low_bid|competitive|value_based|premium>",
    "reasoning": "<string>",
    "expected_competitor_pricing": "<string>",
    "price_to_win_estimate": "<string>"
  },
  
  "teaming_opportunities": [
    {
      "potential_partner": "<string>",
      "why_team": "<string>",
      "what_they_bring": "<string>"
    }
  ],
  
  "win_probability_analysis": {
    "baseline_probability": <number 0-100>,
    "factors_improving_odds": [<string>],
    "factors_reducing_odds": [<string>],
    "recommended_actions": [<string>]
  },
  
  "intelligence_gaps": [
    "<string: what we need to know>"
  ]
}

Be specific, tactical, and actionable. This analysis will guide our proposal strategy.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            competitive_landscape: { type: "object" },
            competitor_rankings: { type: "array" },
            our_advantages: { type: "array" },
            vulnerabilities: { type: "array" },
            ghosting_strategies: { type: "array" },
            pricing_strategy_recommendation: { type: "object" },
            teaming_opportunities: { type: "array" },
            win_probability_analysis: { type: "object" },
            intelligence_gaps: { type: "array" }
          }
        }
      });

      setAiAnalysis(result);

    } catch (error) {
      console.error("Error running AI analysis:", error);
      alert("Error running competitive analysis. Please try again.");
    }
    setIsAnalyzing(false);
  };

  const quickAddCompetitor = async () => {
    if (!competitorName.trim()) return;

    setIsAnalyzing(true);
    try {
      // Use AI to research the competitor
      const prompt = `Research this government contractor: ${competitorName}

Provide intelligence in JSON format:
{
  "competitor_type": "<prime_contractor|subcontractor|teaming_partner|incumbent>",
  "naics_codes": [<string: NAICS codes>],
  "certifications": [<string: certifications like 8(a), SDVOSB, etc>],
  "strengths": [<string: 3-5 key strengths>],
  "weaknesses": [<string: 3-5 potential weaknesses>],
  "typical_pricing_strategy": "<low_cost|value_based|premium|competitive>",
  "win_rate": <number: estimated win rate 0-100>,
  "preferred_agencies": [<string: agencies they work with>],
  "competitive_intelligence_notes": "<string: 2-3 sentences summary>"
}`;

      const intel = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            competitor_type: { type: "string" },
            naics_codes: { type: "array" },
            certifications: { type: "array" },
            strengths: { type: "array" },
            weaknesses: { type: "array" },
            typical_pricing_strategy: { type: "string" },
            win_rate: { type: "number" },
            preferred_agencies: { type: "array" },
            competitive_intelligence_notes: { type: "string" }
          }
        }
      });

      await addCompetitorMutation.mutateAsync({
        competitor_name: competitorName,
        ...intel,
        last_updated: new Date().toISOString()
      });

      setCompetitorName("");
      alert(`✓ Competitor "${competitorName}" added with AI-researched intelligence!`);

    } catch (error) {
      console.error("Error adding competitor:", error);
      alert("Error researching competitor. Please add manually.");
    }
    setIsAnalyzing(false);
  };

  const getThreatColor = (level) => {
    if (level === 'low') return 'text-green-600 bg-green-50 border-green-200';
    if (level === 'medium') return 'text-amber-600 bg-amber-50 border-amber-200';
    if (level === 'high') return 'text-red-600 bg-red-50 border-red-200';
    return 'text-purple-600 bg-purple-50 border-purple-200';
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                Competitive Intelligence & Analysis
              </CardTitle>
              <CardDescription>
                Track competitors and generate AI-powered competitive strategies
              </CardDescription>
            </div>
            <Button onClick={runAIAnalysis} disabled={isAnalyzing || competitors.length === 0}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Add Competitor */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1">
                  <Input
                    placeholder="Enter competitor name for AI research..."
                    value={competitorName}
                    onChange={(e) => setCompetitorName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && quickAddCompetitor()}
                    disabled={isAnalyzing}
                  />
                </div>
                <Button 
                  onClick={quickAddCompetitor}
                  disabled={!competitorName.trim() || isAnalyzing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  AI Research
                </Button>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                AI will automatically research this competitor using public data sources
              </p>
            </CardContent>
          </Card>

          {/* Competitor List */}
          {competitors.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {competitors.map((competitor) => (
                <Card key={competitor.id} className="border-slate-200 hover:border-blue-300 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{competitor.competitor_name}</CardTitle>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {competitor.competitor_type?.replace('_', ' ')}
                        </Badge>
                      </div>
                      {competitor.win_rate && (
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{competitor.win_rate}%</p>
                          <p className="text-xs text-slate-500">Win Rate</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {competitor.strengths && competitor.strengths.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-green-700 mb-1">Strengths:</p>
                        <div className="flex flex-wrap gap-1">
                          {competitor.strengths.slice(0, 3).map((strength, idx) => (
                            <Badge key={idx} className="text-xs bg-green-100 text-green-700">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {competitor.weaknesses && competitor.weaknesses.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-red-700 mb-1">Weaknesses:</p>
                        <div className="flex flex-wrap gap-1">
                          {competitor.weaknesses.slice(0, 3).map((weakness, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs text-red-700">
                              {weakness}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {competitor.competitive_intelligence_notes && (
                      <p className="text-xs text-slate-600 italic">
                        "{competitor.competitive_intelligence_notes}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                No competitors tracked yet. Add competitors to generate competitive analysis.
              </AlertDescription>
            </Alert>
          )}

          {/* AI Analysis Results */}
          {aiAnalysis && (
            <Tabs defaultValue="landscape" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="landscape">Landscape</TabsTrigger>
                <TabsTrigger value="strategy">Strategy</TabsTrigger>
                <TabsTrigger value="ghosting">Ghosting</TabsTrigger>
                <TabsTrigger value="probability">Win Probability</TabsTrigger>
              </TabsList>

              {/* Competitive Landscape */}
              <TabsContent value="landscape" className="space-y-4">
                <Card className={`border-2 ${getThreatColor(aiAnalysis.competitive_landscape?.threat_level)}`}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Threat Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold mb-1">Threat Level:</p>
                        <Badge className={`${getThreatColor(aiAnalysis.competitive_landscape?.threat_level)} capitalize text-base`}>
                          {aiAnalysis.competitive_landscape?.threat_level}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-semibold mb-1">Market Position:</p>
                        <p className="text-sm">{aiAnalysis.competitive_landscape?.market_position}</p>
                      </div>
                      {aiAnalysis.competitive_landscape?.key_battlegrounds?.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold mb-2">Key Battlegrounds:</p>
                          {aiAnalysis.competitive_landscape.key_battlegrounds.map((bg, idx) => (
                            <Badge key={idx} variant="outline" className="mr-2 mb-2">
                              {bg}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Competitor Rankings */}
                {aiAnalysis.competitor_rankings && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Competitor Threat Rankings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {aiAnalysis.competitor_rankings.map((comp, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{comp.competitor_name}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="destructive">
                                  Threat: {comp.threat_score}%
                                </Badge>
                                <Badge variant="outline">
                                  Bid Probability: {comp.probability_of_bid}%
                                </Badge>
                              </div>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p><strong>Likely Strategy:</strong> {comp.likely_strategy}</p>
                              <p><strong>Price Positioning:</strong> {comp.estimated_price_positioning}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Strategy */}
              <TabsContent value="strategy" className="space-y-4">
                {/* Our Advantages */}
                <Card className="border-green-200 bg-green-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="w-5 h-5 text-green-600" />
                      Our Competitive Advantages
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiAnalysis.our_advantages?.map((adv, idx) => (
                        <div key={idx} className="p-3 bg-white border border-green-200 rounded-lg">
                          <h4 className="font-semibold text-green-900 mb-1">{adv.advantage}</h4>
                          <p className="text-sm text-slate-600 mb-2">{adv.why_it_matters}</p>
                          <p className="text-sm font-medium text-green-700">
                            📝 How to emphasize: {adv.how_to_emphasize}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Vulnerabilities */}
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Our Vulnerabilities & Mitigations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {aiAnalysis.vulnerabilities?.map((vuln, idx) => (
                        <div key={idx} className="p-3 bg-white border border-red-200 rounded-lg">
                          <h4 className="font-semibold text-red-900 mb-1">{vuln.vulnerability}</h4>
                          <p className="text-sm text-slate-600 mb-2">
                            <strong>Exploited by:</strong> {vuln.competitor_who_exploits}
                          </p>
                          <p className="text-sm font-medium text-blue-700">
                            🛡️ Mitigation: {vuln.mitigation_strategy}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing Strategy */}
                {aiAnalysis.pricing_strategy_recommendation && (
                  <Card className="border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-blue-600" />
                        Pricing Strategy Recommendation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Badge className="bg-blue-600 text-white text-base mb-2 capitalize">
                            {aiAnalysis.pricing_strategy_recommendation.recommended_approach?.replace('_', ' ')}
                          </Badge>
                          <p className="text-sm">{aiAnalysis.pricing_strategy_recommendation.reasoning}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm"><strong>Expected Competitor Pricing:</strong> {aiAnalysis.pricing_strategy_recommendation.expected_competitor_pricing}</p>
                          <p className="text-sm mt-1"><strong>Price to Win:</strong> {aiAnalysis.pricing_strategy_recommendation.price_to_win_estimate}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Ghosting Strategies */}
              <TabsContent value="ghosting" className="space-y-4">
                <Alert className="bg-purple-50 border-purple-200">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <AlertDescription className="text-purple-900">
                    <strong>Ghosting:</strong> Subtle messaging that highlights your strengths while indirectly pointing out competitor weaknesses—without naming them directly.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {aiAnalysis.ghosting_strategies?.map((ghost, idx) => (
                    <Card key={idx} className="border-purple-200 hover:border-purple-400 transition-all">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Target: {ghost.competitor_to_ghost}</CardTitle>
                          <Badge variant="outline" className="text-purple-700">
                            Ghosting Strategy #{idx + 1}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs font-semibold text-red-700 mb-1">Their Weakness:</p>
                            <p className="text-sm text-red-900">{ghost.their_weakness}</p>
                          </div>
                          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-xs font-semibold text-green-700 mb-1">Our Strength:</p>
                            <p className="text-sm text-green-900">{ghost.our_strength}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-lg">
                          <p className="text-xs font-semibold text-purple-700 mb-2">💬 Ghosting Message:</p>
                          <p className="text-sm italic text-purple-900">"{ghost.ghosting_message}"</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Win Probability */}
              <TabsContent value="probability" className="space-y-4">
                {aiAnalysis.win_probability_analysis && (
                  <>
                    <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                      <CardHeader>
                        <CardTitle className="text-2xl font-bold flex items-center gap-2">
                          <TrendingUp className="w-6 h-6 text-blue-600" />
                          Win Probability Analysis
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center p-6 bg-white rounded-lg border-2 border-blue-300">
                          <p className="text-sm text-slate-600 mb-2">Baseline Win Probability</p>
                          <p className="text-6xl font-bold text-blue-600">
                            {aiAnalysis.win_probability_analysis.baseline_probability}%
                          </p>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-4">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-4 rounded-full transition-all"
                            style={{ width: `${aiAnalysis.win_probability_analysis.baseline_probability}%` }}
                          />
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <Card className="border-green-200 bg-green-50">
                            <CardHeader>
                              <CardTitle className="text-sm">Improving Our Odds</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {aiAnalysis.win_probability_analysis.factors_improving_odds?.map((factor, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm">
                                    <span className="text-green-600 mt-0.5">✓</span>
                                    <span>{factor}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>

                          <Card className="border-red-200 bg-red-50">
                            <CardHeader>
                              <CardTitle className="text-sm">Reducing Our Odds</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {aiAnalysis.win_probability_analysis.factors_reducing_odds?.map((factor, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm">
                                    <span className="text-red-600 mt-0.5">⚠</span>
                                    <span>{factor}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        </div>

                        <Card className="border-blue-200">
                          <CardHeader>
                            <CardTitle className="text-sm">Recommended Actions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ol className="space-y-2">
                              {aiAnalysis.win_probability_analysis.recommended_actions?.map((action, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-sm">
                                  <Badge className="bg-blue-600 text-white">{idx + 1}</Badge>
                                  <span className="flex-1">{action}</span>
                                </li>
                              ))}
                            </ol>
                          </CardContent>
                        </Card>
                      </CardContent>
                    </Card>

                    {/* Intelligence Gaps */}
                    {aiAnalysis.intelligence_gaps && aiAnalysis.intelligence_gaps.length > 0 && (
                      <Card className="border-amber-200 bg-amber-50">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                            Intelligence Gaps
                          </CardTitle>
                          <CardDescription>
                            Information we need to improve our competitive position
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {aiAnalysis.intelligence_gaps.map((gap, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <span className="text-amber-600">❓</span>
                                <span>{gap}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}