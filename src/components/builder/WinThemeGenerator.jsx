import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Lightbulb,
  Sparkles,
  Target,
  Award,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Plus,
  Edit,
  Trash2,
  Star,
  Brain,
  Zap
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export default function WinThemeGenerator({ proposalId, proposalData, organizationId }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showThemeDialog, setShowThemeDialog] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(null);

  const { data: winThemes } = useQuery({
    queryKey: ['win-themes', proposalId],
    queryFn: () => proposalId ? base44.entities.WinTheme.filter({ proposal_id: proposalId }, '-priority,-ai_confidence_score') : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: competitors } = useQuery({
    queryKey: ['competitors', organizationId],
    queryFn: () => organizationId ? base44.entities.CompetitorIntel.filter({ organization_id: organizationId }) : [],
    initialData: [],
    enabled: !!organizationId
  });

  const { data: resources } = useQuery({
    queryKey: ['resources', organizationId],
    queryFn: () => organizationId ? base44.entities.ProposalResource.filter({ organization_id: organizationId }) : [],
    initialData: [],
    enabled: !!organizationId
  });

  const createThemeMutation = useMutation({
    mutationFn: async (themeData) => {
      await base44.entities.WinTheme.create({
        ...themeData,
        proposal_id: proposalId,
        organization_id: organizationId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['win-themes'] });
      setShowThemeDialog(false);
      setSelectedTheme(null);
    }
  });

  const updateThemeMutation = useMutation({
    mutationFn: async ({ themeId, updates }) => {
      await base44.entities.WinTheme.update(themeId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['win-themes'] });
      setShowThemeDialog(false);
      setSelectedTheme(null);
    }
  });

  const deleteThemeMutation = useMutation({
    mutationFn: async (themeId) => {
      await base44.entities.WinTheme.delete(themeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['win-themes'] });
    }
  });

  const generateWinThemes = async () => {
    if (!proposalData) return;

    setIsGenerating(true);
    try {
      // Gather context
      const competitorInfo = competitors.map(c => ({
        name: c.competitor_name,
        strengths: c.strengths || [],
        weaknesses: c.weaknesses || []
      }));

      const pastPerformance = resources
        .filter(r => r.content_category === 'past_performance')
        .map(r => r.title);

      const capabilities = resources
        .filter(r => r.content_category === 'company_overview' || r.content_category === 'technical_approach')
        .map(r => r.title);

      const prompt = `You are an expert proposal strategist and win theme developer for government contracting.

**PROPOSAL DETAILS:**
- Project: ${proposalData.proposal_name}
- Agency: ${proposalData.agency_name}
- Type: ${proposalData.project_type}
- Solicitation: ${proposalData.solicitation_number || 'N/A'}

**OUR CAPABILITIES:**
${capabilities.join('\n- ') || '- [No specific capabilities listed]'}

**OUR PAST PERFORMANCE:**
${pastPerformance.join('\n- ') || '- [No past performance data]'}

**KNOWN COMPETITORS:**
${competitorInfo.map(c => `${c.name}: Strengths [${c.strengths.join(', ')}], Weaknesses [${c.weaknesses.join(', ')}]`).join('\n') || '- [No competitor data]'}

**YOUR TASK:**
Generate 3-5 powerful win themes that will differentiate us and resonate with the customer.

Each win theme should:
1. Be specific and compelling
2. Address customer hot buttons
3. Differentiate us from competitors
4. Be supported by proof points
5. Ghost competitor weaknesses (subtly)

Return JSON array of win themes:
[
  {
    "theme_title": "<short catchy title>",
    "theme_statement": "<2-3 sentence compelling statement>",
    "theme_type": "<technical_excellence|cost_effectiveness|past_performance|innovation|risk_mitigation|mission_understanding|team_strength|schedule_certainty|quality_assurance|customer_focus>",
    "elevator_pitch": "<30 second pitch>",
    "customer_hot_buttons": [
      "<customer concern this addresses>"
    ],
    "discriminators": [
      "<what makes this unique to us>"
    ],
    "proof_points": [
      "<quantifiable proof>"
    ],
    "ghosting_competitors": [
      {
        "competitor_name": "<competitor>",
        "how_we_ghost": "<subtle way we highlight their weakness>"
      }
    ],
    "supporting_evidence": [
      {
        "evidence_type": "<past_performance|certification|capability|personnel|partnership|case_study|metric>",
        "description": "<specific evidence>",
        "impact": "<impact/result>"
      }
    ],
    "sections_to_emphasize": [
      "<section name where this theme should be prominent>"
    ],
    "ai_confidence_score": <number 0-100>,
    "priority": "<primary|secondary|supporting>"
  }
]

Make themes SPECIFIC, POWERFUL, and CUSTOMER-FOCUSED. Use real data where available.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            themes: { 
              type: "array",
              items: { type: "object" }
            }
          }
        }
      });

      // Create all generated themes
      const themes = result.themes || result || [];
      for (const theme of themes) {
        await createThemeMutation.mutateAsync({
          ...theme,
          ai_generated: true,
          status: 'draft'
        });
      }

      alert(`✓ Generated ${themes.length} powerful win themes!`);

    } catch (error) {
      console.error("Error generating win themes:", error);
      alert("Error generating win themes. Please try again.");
    }
    setIsGenerating(false);
  };

  const getThemeTypeIcon = (type) => {
    const icons = {
      technical_excellence: Target,
      cost_effectiveness: TrendingUp,
      past_performance: Award,
      innovation: Lightbulb,
      risk_mitigation: CheckCircle2,
      mission_understanding: Brain,
      team_strength: Star,
      schedule_certainty: Zap,
      quality_assurance: CheckCircle2,
      customer_focus: Target
    };
    return icons[type] || Lightbulb;
  };

  const getThemeTypeColor = (type) => {
    const colors = {
      technical_excellence: 'bg-blue-100 text-blue-700 border-blue-300',
      cost_effectiveness: 'bg-green-100 text-green-700 border-green-300',
      past_performance: 'bg-purple-100 text-purple-700 border-purple-300',
      innovation: 'bg-amber-100 text-amber-700 border-amber-300',
      risk_mitigation: 'bg-red-100 text-red-700 border-red-300',
      mission_understanding: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      team_strength: 'bg-pink-100 text-pink-700 border-pink-300',
      schedule_certainty: 'bg-teal-100 text-teal-700 border-teal-300',
      quality_assurance: 'bg-cyan-100 text-cyan-700 border-cyan-300',
      customer_focus: 'bg-orange-100 text-orange-700 border-orange-300'
    };
    return colors[type] || 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const getPriorityColor = (priority) => {
    if (priority === 'primary') return 'bg-red-600 text-white';
    if (priority === 'secondary') return 'bg-blue-600 text-white';
    return 'bg-slate-600 text-white';
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-amber-500" />
                Win Themes & Strategy
              </CardTitle>
              <CardDescription>
                Develop compelling themes that differentiate your proposal
              </CardDescription>
            </div>
            <Button onClick={generateWinThemes} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Win Themes
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {winThemes.length === 0 ? (
            <Alert className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                <strong>Win Themes are your competitive advantage!</strong><br/>
                Click "Generate Win Themes" to have AI create powerful, customer-focused themes based on your capabilities, past performance, and competitor analysis.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Primary Themes */}
              {winThemes.filter(t => t.priority === 'primary').length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    Primary Win Themes
                  </h3>
                  <div className="space-y-3">
                    {winThemes
                      .filter(t => t.priority === 'primary')
                      .map((theme) => (
                        <Card key={theme.id} className="border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <CardTitle className="text-lg">{theme.theme_title}</CardTitle>
                                  <Badge className={getPriorityColor(theme.priority)}>
                                    Primary
                                  </Badge>
                                  {theme.ai_generated && (
                                    <Badge variant="outline" className="text-purple-700 border-purple-300">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      AI
                                    </Badge>
                                  )}
                                  {theme.ai_confidence_score && (
                                    <Badge variant="outline">
                                      {theme.ai_confidence_score}% Confidence
                                    </Badge>
                                  )}
                                </div>
                                <Badge className={`${getThemeTypeColor(theme.theme_type)} mb-2`}>
                                  {React.createElement(getThemeTypeIcon(theme.theme_type), { className: "w-3 h-3 mr-1 inline" })}
                                  {theme.theme_type.replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedTheme(theme);
                                    setShowThemeDialog(true);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('Delete this theme?')) {
                                      deleteThemeMutation.mutate(theme.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="p-4 bg-white rounded-lg border-2 border-amber-200">
                              <p className="font-semibold text-amber-900 mb-2">Theme Statement:</p>
                              <p className="text-slate-700">{theme.theme_statement}</p>
                            </div>

                            {theme.elevator_pitch && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-semibold text-blue-700 mb-1">30-Second Pitch:</p>
                                <p className="text-sm italic text-blue-900">"{theme.elevator_pitch}"</p>
                              </div>
                            )}

                            {theme.customer_hot_buttons && theme.customer_hot_buttons.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">🎯 Customer Hot Buttons:</p>
                                <div className="flex flex-wrap gap-2">
                                  {theme.customer_hot_buttons.map((button, idx) => (
                                    <Badge key={idx} variant="outline" className="text-red-700 border-red-300">
                                      {button}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {theme.discriminators && theme.discriminators.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">💎 Discriminators:</p>
                                <ul className="space-y-1">
                                  {theme.discriminators.map((disc, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                      <span>{disc}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {theme.proof_points && theme.proof_points.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">📊 Proof Points:</p>
                                <div className="space-y-2">
                                  {theme.proof_points.map((proof, idx) => (
                                    <div key={idx} className="p-2 bg-green-50 border border-green-200 rounded text-sm">
                                      {proof}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {theme.ghosting_competitors && theme.ghosting_competitors.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">👻 Ghosting Competitors:</p>
                                <div className="space-y-2">
                                  {theme.ghosting_competitors.map((ghost, idx) => (
                                    <div key={idx} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                      <p className="text-xs font-semibold text-purple-700">{ghost.competitor_name}</p>
                                      <p className="text-sm text-purple-900 italic">"{ghost.how_we_ghost}"</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {theme.sections_to_emphasize && theme.sections_to_emphasize.length > 0 && (
                              <div>
                                <p className="text-sm font-semibold text-slate-700 mb-2">📝 Emphasize in Sections:</p>
                                <div className="flex flex-wrap gap-2">
                                  {theme.sections_to_emphasize.map((section, idx) => (
                                    <Badge key={idx} variant="secondary">
                                      {section}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}

              {/* Secondary & Supporting Themes */}
              {winThemes.filter(t => t.priority !== 'primary').length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">
                    Supporting Win Themes
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {winThemes
                      .filter(t => t.priority !== 'primary')
                      .map((theme) => (
                        <Card key={theme.id} className="border-slate-200">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base mb-2">{theme.theme_title}</CardTitle>
                                <div className="flex items-center gap-2">
                                  <Badge className={getPriorityColor(theme.priority)}>
                                    {theme.priority}
                                  </Badge>
                                  <Badge className={`${getThemeTypeColor(theme.theme_type)} text-xs`}>
                                    {theme.theme_type.replace('_', ' ')}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedTheme(theme);
                                  setShowThemeDialog(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-slate-600 mb-3">{theme.theme_statement}</p>
                            {theme.ai_confidence_score && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-500">Confidence:</span>
                                <Badge variant="outline">{theme.ai_confidence_score}%</Badge>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Theme Dialog */}
      <Dialog open={showThemeDialog} onOpenChange={setShowThemeDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTheme?.id ? 'Edit Win Theme' : 'Create Win Theme'}
            </DialogTitle>
            <DialogDescription>
              Develop a compelling win theme for your proposal
            </DialogDescription>
          </DialogHeader>

          {selectedTheme && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Theme Title *</Label>
                  <Input
                    value={selectedTheme.theme_title}
                    onChange={(e) => setSelectedTheme({...selectedTheme, theme_title: e.target.value})}
                    placeholder="e.g., Proven Cloud Transformation Excellence"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Theme Type</Label>
                  <Select
                    value={selectedTheme.theme_type}
                    onValueChange={(value) => setSelectedTheme({...selectedTheme, theme_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical_excellence">Technical Excellence</SelectItem>
                      <SelectItem value="cost_effectiveness">Cost Effectiveness</SelectItem>
                      <SelectItem value="past_performance">Past Performance</SelectItem>
                      <SelectItem value="innovation">Innovation</SelectItem>
                      <SelectItem value="risk_mitigation">Risk Mitigation</SelectItem>
                      <SelectItem value="mission_understanding">Mission Understanding</SelectItem>
                      <SelectItem value="team_strength">Team Strength</SelectItem>
                      <SelectItem value="schedule_certainty">Schedule Certainty</SelectItem>
                      <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                      <SelectItem value="customer_focus">Customer Focus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Theme Statement *</Label>
                <Textarea
                  value={selectedTheme.theme_statement}
                  onChange={(e) => setSelectedTheme({...selectedTheme, theme_statement: e.target.value})}
                  placeholder="A powerful 2-3 sentence statement that captures the essence of this win theme..."
                  className="h-24"
                />
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={selectedTheme.priority}
                  onValueChange={(value) => setSelectedTheme({...selectedTheme, priority: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary (Main differentiator)</SelectItem>
                    <SelectItem value="secondary">Secondary (Important support)</SelectItem>
                    <SelectItem value="supporting">Supporting (Additional strength)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>30-Second Elevator Pitch</Label>
                <Textarea
                  value={selectedTheme.elevator_pitch}
                  onChange={(e) => setSelectedTheme({...selectedTheme, elevator_pitch: e.target.value})}
                  placeholder="A quick, compelling pitch version of this theme..."
                  className="h-20"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowThemeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTheme.id) {
                  updateThemeMutation.mutate({
                    themeId: selectedTheme.id,
                    updates: selectedTheme
                  });
                } else {
                  createThemeMutation.mutate(selectedTheme);
                }
              }}
            >
              {selectedTheme?.id ? 'Update Theme' : 'Create Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}