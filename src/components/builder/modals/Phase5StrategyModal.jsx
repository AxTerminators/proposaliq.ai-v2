import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, Sparkles, Target, Loader2 } from "lucide-react";
import WinThemeGenerator from "../WinThemeGenerator";

export default function Phase5StrategyModal({ open, onOpenChange, proposal, organization }) {
  const [strategy, setStrategy] = useState({
    tone: "clear",
    readingLevel: "government_plain",
    requestCitations: false,
    aiModel: "gemini",
    temperature: 0.70,
    topP: 0.70,
    maxTokens: 2048,
    winThemes: null
  });

  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false);

  useEffect(() => {
    if (proposal?.strategy_config) {
      try {
        const parsedStrategy = JSON.parse(proposal.strategy_config);
        setStrategy(prev => ({
          ...prev,
          ...parsedStrategy
        }));
      } catch (error) {
        console.error("Error parsing strategy config:", error);
      }
    }
  }, [proposal]);

  const suggestStrategy = async () => {
    setIsLoadingStrategy(true);
    try {
      const prompt = `Develop win themes and strategic recommendations for this proposal:
- Agency: ${proposal.agency_name}
- Project: ${proposal.project_title}
- Type: ${proposal.project_type}
- Prime: ${proposal.prime_contractor_name}

Provide 3-5 win themes with specific strategies tied to evaluation factors.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            win_themes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  theme: { type: "string" },
                  strategy: { type: "string" },
                  evaluation_tie: { type: "string" }
                }
              }
            }
          }
        }
      });

      setStrategy(prev => ({ ...prev, winThemes: result.win_themes }));
    } catch (error) {
      console.error("Error suggesting strategy:", error);
      alert("Error generating strategy. Please try again.");
    }
    setIsLoadingStrategy(false);
  };

  const handleSave = async () => {
    if (!proposal?.id) return;
    
    try {
      await base44.entities.Proposal.update(proposal.id, {
        strategy_config: JSON.stringify(strategy)
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving strategy:", error);
      alert("Error saving strategy.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Win Strategy & Writing Style
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="strategy" className="py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="strategy">
              <Sparkles className="w-4 h-4 mr-2" />
              Strategy
            </TabsTrigger>
            <TabsTrigger value="win-themes">
              <Lightbulb className="w-4 h-4 mr-2" />
              Win Themes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="strategy" className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <AlertDescription>
                <p className="font-semibold text-blue-900 mb-1">🎯 Define Your Proposal Strategy</p>
                <p className="text-sm text-blue-800">
                  Set the tone, reading level, and AI writing preferences for your proposal content.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Overall Writing Style</h3>
              
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select
                    value={strategy.tone}
                    onValueChange={(value) => setStrategy(prev => ({ ...prev, tone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clear">Clear (default)</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="courteous">Courteous</SelectItem>
                      <SelectItem value="confident">Confident</SelectItem>
                      <SelectItem value="persuasive">Persuasive</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="humanized">Humanized</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reading Level</Label>
                  <Select
                    value={strategy.readingLevel}
                    onValueChange={(value) => setStrategy(prev => ({ ...prev, readingLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="government_plain">Government Plain Language</SelectItem>
                      <SelectItem value="flesch_60">Flesch–Kincaid Grade Level ~10 (Flesch 60+)</SelectItem>
                      <SelectItem value="flesch_70">Flesch–Kincaid Grade Level ~8 (Flesch 70+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>AI Model</Label>
                  <Select
                    value={strategy.aiModel}
                    onValueChange={(value) => setStrategy(prev => ({ ...prev, aiModel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini">Google Gemini (Cost-effective)</SelectItem>
                      <SelectItem value="claude">Anthropic Claude (Best writing)</SelectItem>
                      <SelectItem value="chatgpt">OpenAI ChatGPT (Balanced)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={strategy.requestCitations}
                  onCheckedChange={(checked) => setStrategy(prev => ({ ...prev, requestCitations: checked }))}
                />
                <label className="text-sm text-slate-700">
                  Request Citations (Ask model to cite sources if applicable)
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={suggestStrategy}
                disabled={isLoadingStrategy}
                variant="outline"
                className="w-full"
              >
                {isLoadingStrategy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating AI Strategy...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Strategy Recommendations
                  </>
                )}
              </Button>

              {strategy.winThemes && strategy.winThemes.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
                  <h4 className="font-semibold text-amber-900 mb-3">AI-Suggested Win Themes</h4>
                  <div className="space-y-3">
                    {strategy.winThemes.map((theme, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border">
                        <h5 className="font-semibold text-slate-900 mb-1">{theme.theme}</h5>
                        <p className="text-sm text-slate-700 mb-2">{theme.strategy}</p>
                        <p className="text-xs text-slate-500">Ties to: {theme.evaluation_tie}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="win-themes">
            {proposal && organization && (
              <WinThemeGenerator
                proposalId={proposal.id}
                proposalData={proposal}
                organizationId={organization.id}
              />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Strategy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}