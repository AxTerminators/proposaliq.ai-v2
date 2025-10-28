import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Lightbulb, Sparkles, Target, TrendingUp, Shield, Zap, Loader2, Edit2, Save } from "lucide-react";

export default function Phase5({ proposalData, setProposalData, proposalId }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [strategy, setStrategy] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [editingSection, setEditingSection] = useState(null);

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
        feature_type: "proposal_generation",
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

  const generateStrategy = async () => {
    if (!proposalId || !currentOrgId) {
      alert("Please save the proposal first");
      return;
    }

    setIsGenerating(true);
    try {
      const org = await base44.entities.Organization.filter(
        { id: proposalData.prime_contractor_id || currentOrgId },
        '-created_date',
        1
      );

      const partners = proposalData.teaming_partner_ids ? 
        await base44.entities.TeamingPartner.filter({ 
          id: { $in: proposalData.teaming_partner_ids } 
        }) : [];

      const prompt = `You are an expert proposal strategist. Develop a comprehensive win strategy for this government contract proposal.

**PROPOSAL INFORMATION:**
- Solicitation: ${proposalData.solicitation_number}
- Agency: ${proposalData.agency_name}
- Project: ${proposalData.project_title}
- Type: ${proposalData.project_type}
- Prime Contractor: ${proposalData.prime_contractor_name}
- Teaming Partners: ${partners.map(p => p.partner_name).join(', ') || 'None'}

**ORGANIZATION DETAILS:**
${org.length > 0 ? `
- Name: ${org[0].organization_name}
- Certifications: ${org[0].certifications?.join(', ') || 'None'}
- Primary NAICS: ${org[0].primary_naics || 'Not specified'}
` : ''}

**TASK:**
Develop a detailed win strategy with:

1. **Win Themes** (3-5 key themes that differentiate this proposal)
2. **Competitive Advantages** (unique strengths to emphasize)
3. **Differentiators** (what sets you apart from competitors)
4. **Risk Mitigation** (potential risks and how to address them)
5. **Value Proposition** (core value you bring to the agency)
6. **Technical Strategy** (approach to technical requirements)
7. **Management Strategy** (approach to project management)

Provide specific, actionable strategies tailored to this opportunity.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            win_themes: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } } } },
            competitive_advantages: { type: "array", items: { type: "string" } },
            differentiators: { type: "array", items: { type: "string" } },
            risk_mitigation: { type: "array", items: { type: "object", properties: { risk: { type: "string" }, mitigation: { type: "string" } } } },
            value_proposition: { type: "string" },
            technical_strategy: { type: "string" },
            management_strategy: { type: "string" }
          }
        }
      });

      await trackTokenUsage(6000, prompt, JSON.stringify(result));
      setStrategy(result);

    } catch (error) {
      console.error("Error generating strategy:", error);
      alert("Error generating strategy. Please try again.");
    }
    setIsGenerating(false);
  };

  const saveEdit = (section) => {
    setStrategy({...strategy, [section]: editingSection});
    setEditingSection(null);
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          Phase 5: AI Win Strategy
        </CardTitle>
        <CardDescription>
          AI will suggest winning strategies for your proposal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!strategy && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Generate Win Strategy</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              AI will analyze your organization, the solicitation requirements, and your competitive position to develop a comprehensive win strategy.
            </p>
            <Button 
              onClick={generateStrategy}
              disabled={isGenerating}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Strategy...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Win Strategy
                </>
              )}
            </Button>
          </div>
        )}

        {strategy && (
          <div className="space-y-6">
            {/* Value Proposition */}
            <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600" />
                  Value Proposition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed">{strategy.value_proposition}</p>
              </CardContent>
            </Card>

            {/* Win Themes */}
            {strategy.win_themes && strategy.win_themes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900 text-lg">Win Themes</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {strategy.win_themes.map((theme, idx) => (
                    <Card key={idx} className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">{theme.title}</h4>
                        <p className="text-sm text-blue-800">{theme.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Competitive Advantages */}
            {strategy.competitive_advantages && strategy.competitive_advantages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-slate-900">Competitive Advantages</h3>
                </div>
                <div className="space-y-2">
                  {strategy.competitive_advantages.map((advantage, idx) => (
                    <div key={idx} className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                      <Badge className="bg-green-600 text-white flex-shrink-0">{idx + 1}</Badge>
                      <p className="text-sm text-green-900">{advantage}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Differentiators */}
            {strategy.differentiators && strategy.differentiators.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-slate-900">Key Differentiators</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {strategy.differentiators.map((diff, idx) => (
                    <div key={idx} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <p className="text-sm text-purple-900">{diff}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Mitigation */}
            {strategy.risk_mitigation && strategy.risk_mitigation.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-slate-900">Risk Mitigation</h3>
                </div>
                <div className="space-y-3">
                  {strategy.risk_mitigation.map((item, idx) => (
                    <Card key={idx} className="border-red-200">
                      <CardContent className="p-4">
                        <p className="font-semibold text-red-900 mb-2">⚠️ {item.risk}</p>
                        <p className="text-sm text-slate-700">✓ {item.mitigation}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Strategy */}
            <Card className="border-indigo-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Technical Strategy
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSection(strategy.technical_strategy)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingSection === strategy.technical_strategy ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingSection}
                      onChange={(e) => setEditingSection(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit('technical_strategy')}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSection(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{strategy.technical_strategy}</p>
                )}
              </CardContent>
            </Card>

            {/* Management Strategy */}
            <Card className="border-blue-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Management Strategy
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSection(strategy.management_strategy)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {editingSection === strategy.management_strategy ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingSection}
                      onChange={(e) => setEditingSection(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit('management_strategy')}>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingSection(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{strategy.management_strategy}</p>
                )}
              </CardContent>
            </Card>

            <Button 
              onClick={generateStrategy}
              disabled={isGenerating}
              variant="outline"
              className="w-full"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate Strategy
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}