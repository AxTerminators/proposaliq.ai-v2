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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Target, Award } from "lucide-react";

export default function WinStrategyModal({ isOpen, onClose, proposalId, onCompletion }) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [proposalData, setProposalData] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [winThemes, setWinThemes] = useState([]);

  useEffect(() => {
    if (isOpen && proposalId) {
      loadData();
    }
  }, [isOpen, proposalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      const orgs = await base44.entities.Organization.filter(
        { created_by: user.email },
        '-created_date',
        1
      );
      
      if (orgs.length > 0) {
        setOrganization(orgs[0]);
      }

      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      if (proposals.length > 0) {
        setProposalData(proposals[0]);
      }

      // Load existing win themes
      if (orgs.length > 0) {
        const themes = await base44.entities.WinTheme.filter({
          proposal_id: proposalId,
          organization_id: orgs[0].id
        });
        setWinThemes(themes);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateWinThemes = async () => {
    if (!proposalData || !organization) return;

    setGenerating(true);
    try {
      const prompt = `Develop strategic win themes for this proposal:

**OPPORTUNITY:**
- Agency: ${proposalData.agency_name || 'Unknown'}
- Project: ${proposalData.project_title || 'Unknown'}
- Type: ${proposalData.project_type || 'Unknown'}
- Prime: ${proposalData.prime_contractor_name || 'Unknown'}
- Value: ${proposalData.contract_value ? '$' + proposalData.contract_value.toLocaleString() : 'Unknown'}

**TASK:**
Generate 3-5 compelling win themes that:
1. Address customer hot buttons
2. Highlight our discriminators vs competitors
3. Tie to evaluation factors
4. Are supported by proof points

For each theme provide:
- Theme title (short, memorable)
- Theme statement (1-2 sentences)
- Theme type (e.g., technical_excellence, cost_effectiveness, past_performance)
- Supporting evidence (2-3 points)
- Discriminators (how we're different)

Return JSON array of themes.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            themes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  theme_title: { type: "string" },
                  theme_statement: { type: "string" },
                  theme_type: { type: "string" },
                  supporting_evidence: { type: "array", items: { type: "string" } },
                  discriminators: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        }
      });

      // **CRITICAL: Create win theme records successfully**
      const createdThemes = [];
      for (const theme of result.themes || []) {
        const created = await base44.entities.WinTheme.create({
          proposal_id: proposalId,
          organization_id: organization.id,
          theme_title: theme.theme_title,
          theme_statement: theme.theme_statement,
          theme_type: theme.theme_type || 'technical_excellence',
          supporting_evidence: theme.supporting_evidence?.map(e => ({
            evidence_type: 'capability',
            description: e,
            impact: 'Demonstrates our ability to deliver'
          })) || [],
          discriminators: theme.discriminators || [],
          ai_generated: true,
          status: 'draft'
        });
        createdThemes.push(created);
      }

      setWinThemes(createdThemes);
      alert("✓ Win themes generated successfully!");
    } catch (error) {
      console.error("Error generating win themes:", error);
      alert("Error generating win themes: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDone = () => {
    // **UPDATED: Only call onCompletion if at least one win theme exists**
    if (winThemes.length > 0) {
      console.log('[WinStrategyModal] ✅ Win themes defined successfully');
      
      if (onCompletion) {
        onCompletion();
      } else {
        onClose();
      }
    } else {
      alert("Please generate at least one win theme before closing.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            Win Strategy & Themes
          </DialogTitle>
          <DialogDescription>
            Develop compelling win themes that differentiate your proposal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {winThemes.length === 0 ? (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-6 text-center">
                  <Target className="w-12 h-12 mx-auto text-amber-600 mb-4" />
                  <h3 className="font-semibold text-amber-900 mb-2">Generate Win Themes</h3>
                  <p className="text-sm text-amber-700 mb-4">
                    Let AI create strategic win themes based on your proposal details and competitive landscape.
                  </p>
                  <Button onClick={generateWinThemes} disabled={generating}>
                    {generating ? (
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
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {winThemes.map((theme, idx) => (
                    <Card key={theme.id} className="border-amber-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold">
                              {idx + 1}
                            </div>
                            <h4 className="font-bold text-amber-900">{theme.theme_title}</h4>
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">
                            {theme.theme_type?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 mb-3 ml-10">{theme.theme_statement}</p>
                        
                        {theme.supporting_evidence?.length > 0 && (
                          <div className="ml-10 mb-3">
                            <p className="text-xs font-semibold text-slate-600 mb-1">Supporting Evidence:</p>
                            <ul className="text-xs text-slate-600 space-y-1">
                              {theme.supporting_evidence.map((evidence, i) => (
                                <li key={i}>• {evidence.description}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {theme.discriminators?.length > 0 && (
                          <div className="ml-10">
                            <p className="text-xs font-semibold text-slate-600 mb-1">Discriminators:</p>
                            <ul className="text-xs text-slate-600 space-y-1">
                              {theme.discriminators.map((disc, i) => (
                                <li key={i}>• {disc}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Button onClick={generateWinThemes} variant="outline" disabled={generating}>
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Regenerate Themes
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleDone} disabled={winThemes.length === 0}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}