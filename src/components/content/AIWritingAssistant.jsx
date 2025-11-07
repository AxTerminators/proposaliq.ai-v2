import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Target,
  TrendingUp,
  BarChart3,
  Zap,
  BookOpen,
  X,
  ThumbsUp,
  ThumbsDown,
  Copy,
  RotateCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { debounce } from "lodash";

export default function AIWritingAssistant({
  proposal,
  currentSection,
  content,
  onApplySuggestion,
  winThemes = []
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [complianceIssues, setComplianceIssues] = useState([]);
  const [readabilityScore, setReadabilityScore] = useState(null);
  const [themeAlignment, setThemeAlignment] = useState([]);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [activeTab, setActiveTab] = useState("suggestions");

  // Debounced analysis when content changes - INCREASED to 5 seconds to reduce calls
  const debouncedAnalyze = useCallback(
    debounce(async (text) => {
      if (!text || text.length < 100) return;
      await analyzeContent(text);
    }, 5000), // Changed from 2s to 5s
    [currentSection, proposal, winThemes]
  );

  useEffect(() => {
    debouncedAnalyze(content);
  }, [content, debouncedAnalyze]);

  const analyzeContent = async (text) => {
    if (!text || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      // TOKEN SAFETY: Truncate content if too long (max ~3000 words = ~4000 tokens)
      const maxContentLength = 12000; // ~3000 words
      const truncatedContent = text.length > maxContentLength 
        ? text.substring(text.length - maxContentLength) // Take last N chars (most recent writing)
        : text;

      // TOKEN SAFETY: Summarize win themes instead of full objects
      const winThemeSummary = winThemes
        .slice(0, 5) // Max 5 themes
        .map(t => t.theme_title)
        .join(', ');

      // TOKEN SAFETY: Minimal proposal context
      const proposalContext = {
        name: proposal?.proposal_name || 'Unknown',
        agency: proposal?.agency_name || 'Unknown',
        section_type: currentSection?.section_type || 'unknown'
      };

      const prompt = `You are an expert proposal writing assistant. Analyze this content and provide actionable suggestions.

**CONTENT TO ANALYZE:**
${truncatedContent}

**SECTION TYPE:** ${proposalContext.section_type}
**PROPOSAL:** ${proposalContext.name}
**AGENCY:** ${proposalContext.agency}
**WIN THEMES:** ${winThemeSummary || 'None defined'}

**PROVIDE:**
1. **Writing Suggestions** (3-5 specific improvements)
2. **Win Theme Integration** (where and how to weave in win themes)
3. **Readability Analysis** (score 0-100, grade level, improvements needed)
4. **Tone & Style** (government appropriate? areas to strengthen?)

Return JSON with these exact fields:
{
  "suggestions": [
    {
      "type": "improvement|addition|removal|restructure",
      "priority": "high|medium|low",
      "title": "string",
      "description": "string",
      "suggested_text": "string (optional - keep short)",
      "location": "string (where in content)"
    }
  ],
  "win_theme_opportunities": [
    {
      "theme_title": "string",
      "where_to_add": "string",
      "suggested_language": "string (keep concise - max 100 words)",
      "impact": "high|medium|low"
    }
  ],
  "readability": {
    "score": 75,
    "grade_level": "12th grade",
    "avg_sentence_length": 18,
    "passive_voice_percentage": 15,
    "recommendations": ["string"]
  }
}`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: { type: "array" },
            win_theme_opportunities: { type: "array" },
            readability: { type: "object" }
          }
        }
      });

      setSuggestions(analysis.suggestions || []);
      setThemeAlignment(analysis.win_theme_opportunities || []);
      setReadabilityScore(analysis.readability || null);
      // Removed compliance_gaps to reduce token usage - handled separately

    } catch (error) {
      console.error("Error analyzing content:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = (suggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion(suggestion);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500'
    };
    return colors[priority] || colors.medium;
  };

  return (
    <Card className="border-none shadow-lg sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Writing Assistant
          {isAnalyzing && (
            <Badge variant="secondary" className="ml-auto">
              <RotateCw className="w-3 h-3 mr-1 animate-spin" />
              Analyzing...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggestions" className="text-xs">
              <Lightbulb className="w-3 h-3 mr-1" />
              Tips
              {suggestions.length > 0 && (
                <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-blue-500">
                  {suggestions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="themes" className="text-xs">
              <Target className="w-3 h-3 mr-1" />
              Themes
              {themeAlignment.length > 0 && (
                <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-xs bg-purple-500">
                  {themeAlignment.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="readability" className="text-xs">
              <BarChart3 className="w-3 h-3 mr-1" />
              Score
            </TabsTrigger>
          </TabsList>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-3 max-h-96 overflow-y-auto">
            {suggestions.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Write more content to get AI suggestions</p>
              </div>
            ) : (
              suggestions.map((sug, idx) => (
                <Card key={idx} className="border-2">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <Badge className={cn("text-xs", getPriorityBadge(sug.priority))}>
                        {sug.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">
                        {sug.type}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{sug.title}</h4>
                    <p className="text-xs text-slate-600 mb-2">{sug.description}</p>
                    {sug.suggested_text && (
                      <div className="bg-slate-50 p-2 rounded text-xs mb-2 border">
                        <p className="text-slate-700 italic line-clamp-3">"{sug.suggested_text}"</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => applySuggestion(sug)}
                        className="text-xs h-7"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Apply
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Win Themes Tab */}
          <TabsContent value="themes" className="space-y-3 max-h-96 overflow-y-auto">
            {themeAlignment.length === 0 ? (
              <div className="text-center py-6 text-slate-500">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No win theme opportunities detected yet</p>
              </div>
            ) : (
              themeAlignment.map((theme, idx) => (
                <Card key={idx} className="border-2 border-purple-200 bg-purple-50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-purple-600" />
                      <h4 className="font-semibold text-sm">{theme.theme_title}</h4>
                      <Badge className={cn(
                        "ml-auto text-xs",
                        theme.impact === 'high' ? 'bg-purple-600' :
                        theme.impact === 'medium' ? 'bg-purple-400' : 'bg-purple-300'
                      )}>
                        {theme.impact} impact
                      </Badge>
                    </div>
                    <p className="text-xs text-purple-900 mb-2">
                      <strong>Where:</strong> {theme.where_to_add}
                    </p>
                    <div className="bg-white p-2 rounded text-xs border border-purple-200">
                      <p className="text-slate-700 italic line-clamp-3">"{theme.suggested_language}"</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => applySuggestion({ 
                        type: 'addition', 
                        suggested_text: theme.suggested_language,
                        title: `Weave in: ${theme.theme_title}`
                      })}
                      className="mt-2 h-7 text-xs bg-purple-600 hover:bg-purple-700"
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Insert Theme
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Readability Tab */}
          <TabsContent value="readability" className="space-y-4">
            {readabilityScore ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Card className={cn("border-2", getScoreColor(readabilityScore.score))}>
                    <CardContent className="p-3 text-center">
                      <p className="text-3xl font-bold">{readabilityScore.score}</p>
                      <p className="text-xs mt-1">Readability Score</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-slate-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-2xl font-bold text-slate-700">{readabilityScore.grade_level}</p>
                      <p className="text-xs mt-1">Grade Level</p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-2 border-blue-200 bg-blue-50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Avg Sentence Length</span>
                      <span className="font-semibold">{readabilityScore.avg_sentence_length} words</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Passive Voice</span>
                      <span className={cn(
                        "font-semibold",
                        readabilityScore.passive_voice_percentage > 20 ? 'text-red-600' :
                        readabilityScore.passive_voice_percentage > 10 ? 'text-yellow-600' : 'text-green-600'
                      )}>
                        {readabilityScore.passive_voice_percentage}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {readabilityScore.recommendations && readabilityScore.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700">Recommendations:</p>
                    {readabilityScore.recommendations.slice(0, 5).map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs bg-slate-50 p-2 rounded">
                        <CheckCircle2 className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-slate-500">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Write content to see readability analysis</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Stats Bar */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <div className="flex-1 text-center">
            <p className="text-xs text-slate-600">Words</p>
            <p className="text-lg font-bold text-slate-900">
              {content ? content.split(/\s+/).filter(Boolean).length : 0}
            </p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-xs text-slate-600">Suggestions</p>
            <p className="text-lg font-bold text-blue-600">
              {suggestions.length}
            </p>
          </div>
          <div className="flex-1 text-center">
            <p className="text-xs text-slate-600">Themes</p>
            <p className="text-lg font-bold text-purple-600">
              {themeAlignment.filter(t => t.impact === 'high').length}
            </p>
          </div>
        </div>

        <Button
          onClick={() => analyzeContent(content)}
          disabled={isAnalyzing || !content}
          variant="outline"
          className="w-full"
          size="sm"
        >
          <Sparkles className={cn("w-4 h-4 mr-2", isAnalyzing && "animate-spin")} />
          {isAnalyzing ? 'Analyzing...' : 'Re-analyze Content'}
        </Button>
      </CardContent>
    </Card>
  );
}