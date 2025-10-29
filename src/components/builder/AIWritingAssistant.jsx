import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  CheckCircle2,
  Wand2,
  TrendingUp,
  Lightbulb,
  Zap,
  ChevronRight,
  Copy,
  Loader2,
  FileText,
  MessageSquare
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AIWritingAssistant({ content, onApplySuggestion, sectionName }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [selectedText, setSelectedText] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");

  const stripHtml = (html) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const analyzContent = async () => {
    setLoading(true);
    try {
      const plainText = stripHtml(content).substring(0, 3000);
      
      const prompt = `You are an expert proposal writing coach. Analyze the following content and provide specific, actionable suggestions.

**CONTENT TO ANALYZE:**
${plainText}

**PROVIDE ANALYSIS IN THESE CATEGORIES:**

1. **Grammar & Clarity** - Identify any grammatical errors, unclear phrasing, or confusing sentences
2. **Tone** - Assess if the tone is appropriate for government proposals (professional, persuasive, confident)
3. **Active Voice** - Identify passive voice sentences that should be converted to active voice
4. **Conciseness** - Suggest areas where text can be more concise without losing meaning
5. **Persuasiveness** - Suggest ways to make the content more compelling and persuasive

Return a JSON object with specific suggestions.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            grammar_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  suggestion: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high"] }
                }
              }
            },
            tone_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  observation: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            passive_voice: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  passive_sentence: { type: "string" },
                  active_version: { type: "string" }
                }
              }
            },
            conciseness: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  wordy_phrase: { type: "string" },
                  concise_version: { type: "string" }
                }
              }
            },
            persuasiveness: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            overall_score: {
              type: "object",
              properties: {
                clarity: { type: "number" },
                professionalism: { type: "number" },
                persuasiveness: { type: "number" }
              }
            }
          }
        }
      });

      setSuggestions(result);
    } catch (error) {
      console.error("Error analyzing content:", error);
      alert("Error analyzing content");
    }
    setLoading(false);
  };

  const improveTone = async (targetTone) => {
    setLoading(true);
    try {
      const plainText = stripHtml(content);
      
      const toneDescriptions = {
        persuasive: "highly persuasive and compelling, emphasizing benefits and value propositions",
        technical: "technical and precise, using appropriate technical terminology and detailed explanations",
        executive: "executive-level, concise and strategic, focusing on high-level outcomes and ROI"
      };

      const prompt = `Rewrite the following text to be ${toneDescriptions[targetTone]}. Maintain all key information but adjust the style and tone.

Original text:
${plainText}

Return the improved version in HTML format with proper paragraph tags.`;

      const improved = await base44.integrations.Core.InvokeLLM({ prompt });

      onApplySuggestion(improved);
      alert(`✓ Tone adjusted to ${targetTone}!`);
    } catch (error) {
      console.error("Error improving tone:", error);
      alert("Error adjusting tone");
    }
    setLoading(false);
  };

  const convertToActiveVoice = async () => {
    setLoading(true);
    try {
      const plainText = stripHtml(content);
      
      const prompt = `Convert all passive voice sentences to active voice in the following text. Maintain the meaning and all key information.

Original text:
${plainText}

Return the improved version in HTML format with proper paragraph tags.`;

      const improved = await base44.integrations.Core.InvokeLLM({ prompt });

      onApplySuggestion(improved);
      alert("✓ Converted to active voice!");
    } catch (error) {
      console.error("Error converting:", error);
      alert("Error converting to active voice");
    }
    setLoading(false);
  };

  const expandContent = async () => {
    setLoading(true);
    try {
      const plainText = stripHtml(content);
      
      const prompt = `Expand the following text by adding more detail, examples, and explanations. Make it more comprehensive while maintaining accuracy and professionalism.

Current text:
${plainText}

Return the expanded version in HTML format, aiming for approximately 50% more content.`;

      const expanded = await base44.integrations.Core.InvokeLLM({ prompt });

      onApplySuggestion(expanded);
      alert("✓ Content expanded!");
    } catch (error) {
      console.error("Error expanding:", error);
      alert("Error expanding content");
    }
    setLoading(false);
  };

  const summarizeContent = async () => {
    setLoading(true);
    try {
      const plainText = stripHtml(content);
      
      const prompt = `Summarize the following text to approximately 50% of its current length. Keep the most important points and maintain clarity.

Current text:
${plainText}

Return the summarized version in HTML format.`;

      const summarized = await base44.integrations.Core.InvokeLLM({ prompt });

      onApplySuggestion(summarized);
      alert("✓ Content summarized!");
    } catch (error) {
      console.error("Error summarizing:", error);
      alert("Error summarizing content");
    }
    setLoading(false);
  };

  const customImprovement = async () => {
    if (!customPrompt.trim()) {
      alert("Please enter instructions");
      return;
    }

    setLoading(true);
    try {
      const plainText = stripHtml(content);
      
      const prompt = `${customPrompt}

Current text:
${plainText}

Return the improved version in HTML format with proper paragraph tags.`;

      const improved = await base44.integrations.Core.InvokeLLM({ prompt });

      onApplySuggestion(improved);
      setCustomPrompt("");
      alert("✓ Custom improvement applied!");
    } catch (error) {
      console.error("Error with custom improvement:", error);
      alert("Error applying improvement");
    }
    setLoading(false);
  };

  const wordCount = stripHtml(content).split(/\s+/).filter(w => w.length > 0).length;

  return (
    <Card className="border-none shadow-lg h-full">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Writing Assistant
        </CardTitle>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            {wordCount} words
          </Badge>
          <Badge variant="outline" className="text-xs">
            {sectionName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="suggestions" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="quick">Quick Actions</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-280px)]">
            {/* Suggestions Tab */}
            <TabsContent value="suggestions" className="p-4 space-y-4">
              <Button 
                onClick={analyzeContent} 
                disabled={loading || !content}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze Content
                  </>
                )}
              </Button>

              {suggestions && (
                <div className="space-y-4">
                  {/* Overall Score */}
                  {suggestions.overall_score && (
                    <Card className="bg-gradient-to-br from-green-50 to-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Content Quality</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs">Clarity</span>
                          <Badge className="bg-green-600 text-white">
                            {suggestions.overall_score.clarity}/10
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs">Professionalism</span>
                          <Badge className="bg-blue-600 text-white">
                            {suggestions.overall_score.professionalism}/10
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs">Persuasiveness</span>
                          <Badge className="bg-purple-600 text-white">
                            {suggestions.overall_score.persuasiveness}/10
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Grammar Issues */}
                  {suggestions.grammar_issues && suggestions.grammar_issues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-red-500" />
                        Grammar & Clarity ({suggestions.grammar_issues.length})
                      </h4>
                      {suggestions.grammar_issues.map((item, idx) => (
                        <Alert key={idx} className="border-red-200 bg-red-50">
                          <AlertDescription className="text-xs">
                            <p className="font-semibold text-red-900 mb-1">{item.issue}</p>
                            <p className="text-red-700">{item.suggestion}</p>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {/* Passive Voice */}
                  {suggestions.passive_voice && suggestions.passive_voice.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Passive Voice ({suggestions.passive_voice.length})
                      </h4>
                      {suggestions.passive_voice.map((item, idx) => (
                        <Alert key={idx} className="border-amber-200 bg-amber-50">
                          <AlertDescription className="text-xs">
                            <p className="text-amber-900 mb-1">
                              <strong>Passive:</strong> {item.passive_sentence}
                            </p>
                            <p className="text-green-700">
                              <strong>Active:</strong> {item.active_version}
                            </p>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {/* Persuasiveness */}
                  {suggestions.persuasiveness && suggestions.persuasiveness.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        Persuasiveness Tips ({suggestions.persuasiveness.length})
                      </h4>
                      {suggestions.persuasiveness.map((item, idx) => (
                        <Alert key={idx} className="border-blue-200 bg-blue-50">
                          <AlertDescription className="text-xs">
                            <p className="font-semibold text-blue-900 mb-1">{item.area}</p>
                            <p className="text-blue-700">{item.suggestion}</p>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!suggestions && !loading && (
                <div className="text-center py-8 text-slate-500">
                  <Lightbulb className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">Click "Analyze Content" to get AI suggestions</p>
                </div>
              )}
            </TabsContent>

            {/* Quick Actions Tab */}
            <TabsContent value="quick" className="p-4 space-y-3">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm mb-3">Tone Adjustments</h4>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => improveTone('persuasive')}
                  disabled={loading || !content}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Make More Persuasive
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => improveTone('technical')}
                  disabled={loading || !content}
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Make More Technical
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => improveTone('executive')}
                  disabled={loading || !content}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Executive Summary Style
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <h4 className="font-semibold text-sm mb-3">Quick Improvements</h4>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={convertToActiveVoice}
                  disabled={loading || !content}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Convert to Active Voice
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={expandContent}
                  disabled={loading || !content}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Expand Content (+50%)
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={summarizeContent}
                  disabled={loading || !content}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Summarize (-50%)
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
              </div>

              {loading && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900">
                    Processing your request...
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Custom Tab */}
            <TabsContent value="custom" className="p-4 space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Custom Instructions</h4>
                <p className="text-xs text-slate-600">
                  Tell the AI how you want to improve this section
                </p>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Example: Make this more technical and add specific metrics..."
                  className="min-h-32"
                  disabled={loading}
                />
                <Button
                  onClick={customImprovement}
                  disabled={loading || !content || !customPrompt.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Apply Custom Improvement
                    </>
                  )}
                </Button>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold text-sm mb-2">Example Instructions:</h4>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setCustomPrompt("Add more quantitative results and metrics to make this more data-driven")}
                  >
                    <ChevronRight className="w-3 h-3 mr-2" />
                    Add more metrics and data
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setCustomPrompt("Rewrite this to emphasize cost savings and ROI for the government")}
                  >
                    <ChevronRight className="w-3 h-3 mr-2" />
                    Emphasize cost savings
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setCustomPrompt("Make this sound more confident and emphasize our unique qualifications")}
                  >
                    <ChevronRight className="w-3 h-3 mr-2" />
                    More confident tone
                  </Button>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}