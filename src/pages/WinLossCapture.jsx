import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingDown, Loader2, Save, ArrowLeft, Plus, X, Brain, Target } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function WinLossCapture() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);

  const [formData, setFormData] = useState({
    outcome: "",
    decision_date: "",
    contract_value: "",
    competitor_won: "",
    primary_win_factors: [],
    primary_loss_factors: [],
    client_feedback: "",
    scoring_breakdown: {
      technical_score: "",
      management_score: "",
      past_performance_score: "",
      price_score: "",
      total_score: "",
      winning_score: ""
    },
    price_analysis: {
      our_price: "",
      winning_price: "",
      price_differential: "",
      price_competitive: null
    },
    strengths_identified: [],
    weaknesses_identified: [],
    lessons_learned: [],
    debrief_notes: "",
    tags: []
  });

  const [currentStrength, setCurrentStrength] = useState("");
  const [currentWeakness, setCurrentWeakness] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const orgs = await base44.entities.Organization.filter(
        { created_by: currentUser.email },
        '-created_date',
        1
      );

      if (orgs.length > 0) {
        setOrganization(orgs[0]);

        const urlParams = new URLSearchParams(window.location.search);
        const proposalId = urlParams.get('proposalId');

        if (proposalId) {
          const proposals = await base44.entities.Proposal.filter({
            id: proposalId,
            organization_id: orgs[0].id
          });

          if (proposals.length > 0) {
            const prop = proposals[0];
            setProposal(prop);
            
            setFormData(prev => ({
              ...prev,
              outcome: prop.status === 'won' ? 'won' : 'lost',
              contract_value: prop.contract_value || "",
              price_analysis: {
                ...prev.price_analysis,
                our_price: prop.contract_value || ""
              }
            }));
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIInsights = async () => {
    if (!proposal) return;

    setAnalyzing(true);
    try {
      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposal.id
      });

      const complianceReqs = await base44.entities.ComplianceRequirement.filter({
        proposal_id: proposal.id
      });

      const winThemes = await base44.entities.WinTheme.filter({
        proposal_id: proposal.id
      });

      const prompt = `Analyze this ${formData.outcome} proposal and provide strategic insights:

**Proposal Details:**
- Name: ${proposal.proposal_name}
- Agency: ${proposal.agency_name}
- Outcome: ${formData.outcome.toUpperCase()}
- Sections: ${sections.length}
- Compliance Requirements: ${complianceReqs.length}
- Win Themes: ${winThemes.length}

**User-Provided Context:**
${formData.client_feedback ? `Client Feedback: ${formData.client_feedback}` : ''}
${formData.scoring_breakdown.total_score ? `Our Score: ${formData.scoring_breakdown.total_score}` : ''}
${formData.scoring_breakdown.winning_score ? `Winning Score: ${formData.scoring_breakdown.winning_score}` : ''}
${formData.competitor_won ? `Competitor Who Won: ${formData.competitor_won}` : ''}

**Please provide:**
1. **Key Patterns**: What patterns do you see that led to this outcome?
2. **Strengths**: What did we do well?
3. **Weaknesses**: What could we improve?
4. **Lessons Learned**: Top 3-5 actionable lessons
5. **Recommendations**: Specific recommendations for future proposals to this agency

Format as JSON:
{
  "key_patterns": ["pattern1", "pattern2"],
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "lessons_learned": [
    {"lesson": "...", "category": "technical", "actionable": true}
  ],
  "recommendations": ["rec1", "rec2"]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: "object",
          properties: {
            key_patterns: { type: "array", items: { type: "string" } },
            strengths: { type: "array", items: { type: "string" } },
            weaknesses: { type: "array", items: { type: "string" } },
            lessons_learned: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  lesson: { type: "string" },
                  category: { type: "string" },
                  actionable: { type: "boolean" }
                }
              }
            },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAiInsights(response);

      setFormData(prev => ({
        ...prev,
        strengths_identified: [...prev.strengths_identified, ...(response.strengths || [])],
        weaknesses_identified: [...prev.weaknesses_identified, ...(response.weaknesses || [])],
        lessons_learned: [...prev.lessons_learned, ...(response.lessons_learned || [])]
      }));

    } catch (error) {
      console.error("Error generating AI insights:", error);
      alert("Error generating insights. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!proposal || !organization) return;

    if (!formData.outcome || !formData.decision_date) {
      alert("Please fill in outcome and decision date");
      return;
    }

    setSaving(true);
    try {
      const analysisData = {
        proposal_id: proposal.id,
        organization_id: organization.id,
        outcome: formData.outcome,
        decision_date: formData.decision_date,
        contract_value: parseFloat(formData.contract_value) || 0,
        competitor_won: formData.competitor_won,
        primary_win_factors: formData.primary_win_factors,
        primary_loss_factors: formData.primary_loss_factors,
        client_feedback: formData.client_feedback,
        scoring_breakdown: {
          technical_score: parseFloat(formData.scoring_breakdown.technical_score) || 0,
          management_score: parseFloat(formData.scoring_breakdown.management_score) || 0,
          past_performance_score: parseFloat(formData.scoring_breakdown.past_performance_score) || 0,
          price_score: parseFloat(formData.scoring_breakdown.price_score) || 0,
          total_score: parseFloat(formData.scoring_breakdown.total_score) || 0,
          winning_score: parseFloat(formData.scoring_breakdown.winning_score) || 0
        },
        price_analysis: {
          our_price: parseFloat(formData.price_analysis.our_price) || 0,
          winning_price: parseFloat(formData.price_analysis.winning_price) || 0,
          price_differential: formData.price_analysis.winning_price && formData.price_analysis.our_price
            ? ((parseFloat(formData.price_analysis.our_price) - parseFloat(formData.price_analysis.winning_price)) / parseFloat(formData.price_analysis.winning_price)) * 100
            : 0,
          price_competitive: formData.price_analysis.price_competitive
        },
        strengths_identified: formData.strengths_identified,
        weaknesses_identified: formData.weaknesses_identified,
        lessons_learned: formData.lessons_learned,
        debrief_notes: formData.debrief_notes,
        tags: formData.tags,
        ai_analysis: aiInsights ? {
          key_patterns_identified: aiInsights.key_patterns || [],
          recommendations_for_future: aiInsights.recommendations || []
        } : {}
      };

      await base44.entities.WinLossAnalysis.create(analysisData);

      await base44.entities.Proposal.update(proposal.id, {
        status: formData.outcome
      });

      alert(`✓ Win/Loss analysis saved successfully!`);
      navigate(createPageUrl("WinLossInsights"));

    } catch (error) {
      console.error("Error saving analysis:", error);
      alert("Error saving analysis. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addItem = (field, value, setterFn) => {
    if (value && value.trim()) {
      setFormData(prev => ({
        ...prev,
        [field]: [...(prev[field] || []), value.trim()]
      }));
      setterFn("");
    }
  };

  const removeItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate(createPageUrl("Pipeline"))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Proposals
            </Button>
            <h1 className="text-3xl font-bold text-slate-900 mt-4">Win/Loss Analysis</h1>
            <p className="text-slate-600 mt-1">
              {proposal?.proposal_name || 'Capture insights and lessons learned'}
            </p>
          </div>
        </div>

        {/* AI Insights Alert */}
        {aiInsights && (
          <Alert className="bg-blue-50 border-blue-200">
            <Brain className="w-4 h-4 text-blue-600" />
            <AlertDescription>
              <p className="font-semibold text-blue-900 mb-2">AI Analysis Complete</p>
              <p className="text-sm text-blue-800">
                The AI has identified {aiInsights.key_patterns?.length || 0} key patterns and generated {aiInsights.recommendations?.length || 0} recommendations.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Information */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Outcome and timing details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Outcome *</Label>
                <Select value={formData.outcome} onValueChange={(value) => setFormData({...formData, outcome: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outcome..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="won">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-green-600" />
                        Won
                      </div>
                    </SelectItem>
                    <SelectItem value="lost">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        Lost
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Decision Date *</Label>
                <Input
                  type="date"
                  value={formData.decision_date}
                  onChange={(e) => setFormData({...formData, decision_date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract Value</Label>
                <Input
                  type="number"
                  placeholder="$1,000,000"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({...formData, contract_value: e.target.value})}
                />
              </div>

              {formData.outcome === 'lost' && (
                <div className="space-y-2">
                  <Label>Competitor Who Won</Label>
                  <Input
                    placeholder="Competitor name"
                    value={formData.competitor_won}
                    onChange={(e) => setFormData({...formData, competitor_won: e.target.value})}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Client Feedback & Scoring */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Client Feedback & Evaluation Scores</CardTitle>
            <CardDescription>What did the evaluators say?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Client/Evaluator Feedback</Label>
              <Textarea
                rows={4}
                placeholder="Enter feedback from debriefing or evaluator comments..."
                value={formData.client_feedback}
                onChange={(e) => setFormData({...formData, client_feedback: e.target.value})}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Technical Score</Label>
                <Input
                  type="number"
                  placeholder="0-100"
                  value={formData.scoring_breakdown.technical_score}
                  onChange={(e) => setFormData({
                    ...formData,
                    scoring_breakdown: {...formData.scoring_breakdown, technical_score: e.target.value}
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Management Score</Label>
                <Input
                  type="number"
                  placeholder="0-100"
                  value={formData.scoring_breakdown.management_score}
                  onChange={(e) => setFormData({
                    ...formData,
                    scoring_breakdown: {...formData.scoring_breakdown, management_score: e.target.value}
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Past Performance Score</Label>
                <Input
                  type="number"
                  placeholder="0-100"
                  value={formData.scoring_breakdown.past_performance_score}
                  onChange={(e) => setFormData({
                    ...formData,
                    scoring_breakdown: {...formData.scoring_breakdown, past_performance_score: e.target.value}
                  })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Price Score</Label>
                <Input
                  type="number"
                  placeholder="0-100"
                  value={formData.scoring_breakdown.price_score}
                  onChange={(e) => setFormData({
                    ...formData,
                    scoring_breakdown: {...formData.scoring_breakdown, price_score: e.target.value}
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Our Total Score</Label>
                <Input
                  type="number"
                  placeholder="0-100"
                  value={formData.scoring_breakdown.total_score}
                  onChange={(e) => setFormData({
                    ...formData,
                    scoring_breakdown: {...formData.scoring_breakdown, total_score: e.target.value}
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>Winning Score</Label>
                <Input
                  type="number"
                  placeholder="0-100"
                  value={formData.scoring_breakdown.winning_score}
                  onChange={(e) => setFormData({
                    ...formData,
                    scoring_breakdown: {...formData.scoring_breakdown, winning_score: e.target.value}
                  })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis Button */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-6 h-6 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-slate-900">AI-Powered Analysis</h3>
                </div>
                <p className="text-sm text-slate-600">
                  Let AI analyze this proposal and generate insights, patterns, and recommendations.
                </p>
              </div>
              <Button
                onClick={handleGenerateAIInsights}
                disabled={analyzing || !proposal}
                className="bg-indigo-600 hover:bg-indigo-700 ml-4"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="w-4 h-4 mr-2" />
                    Generate Insights
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Strengths & Weaknesses */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-green-600" />
                Strengths
              </CardTitle>
              <CardDescription>What did we do well?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a strength..."
                  value={currentStrength}
                  onChange={(e) => setCurrentStrength(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addItem('strengths_identified', currentStrength, setCurrentStrength)}
                />
                <Button onClick={() => addItem('strengths_identified', currentStrength, setCurrentStrength)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {(formData.strengths_identified || []).map((strength, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="text-sm text-green-900">{strength}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeItem('strengths_identified', idx)}>
                      <X className="w-4 h-4 text-green-700" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                Weaknesses
              </CardTitle>
              <CardDescription>What could we improve?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a weakness..."
                  value={currentWeakness}
                  onChange={(e) => setCurrentWeakness(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addItem('weaknesses_identified', currentWeakness, setCurrentWeakness)}
                />
                <Button onClick={() => addItem('weaknesses_identified', currentWeakness, setCurrentWeakness)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {(formData.weaknesses_identified || []).map((weakness, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-sm text-red-900">{weakness}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeItem('weaknesses_identified', idx)}>
                      <X className="w-4 h-4 text-red-700" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lessons Learned */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Lessons Learned</CardTitle>
            <CardDescription>Actionable insights for future proposals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {(formData.lessons_learned || []).map((lesson, idx) => (
                <div key={idx} className="p-4 bg-slate-50 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Badge variant="outline" className="mb-2">{lesson.category}</Badge>
                      <p className="text-sm text-slate-900">{lesson.lesson}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          lessons_learned: (prev.lessons_learned || []).filter((_, i) => i !== idx)
                        }));
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Debrief Notes */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Debrief Notes</CardTitle>
            <CardDescription>Additional notes and context</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={6}
              placeholder="Enter notes from team debrief, additional context, or other observations..."
              value={formData.debrief_notes}
              onChange={(e) => setFormData({...formData, debrief_notes: e.target.value})}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(createPageUrl("Pipeline"))}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Analysis
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}