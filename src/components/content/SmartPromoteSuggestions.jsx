import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  Award,
  FileText,
  ArrowRight,
  Lightbulb,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AI-powered suggestions for what content should be promoted to the library
 * Analyzes proposal sections to identify reusable, high-quality content
 */
export default function SmartPromoteSuggestions({ organization, onPromoteClick }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Fetch won/submitted proposals for analysis
  const { data: qualityProposals = [] } = useQuery({
    queryKey: ['quality-proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({
        organization_id: organization.id,
        status: { $in: ['won', 'submitted'] }
      }, '-created_date', 20);
    },
    enabled: !!organization?.id,
  });

  // Fetch sections from those proposals
  const { data: sections = [] } = useQuery({
    queryKey: ['quality-sections', qualityProposals],
    queryFn: async () => {
      if (qualityProposals.length === 0) return [];
      
      const proposalIds = qualityProposals.map(p => p.id);
      const allSections = await base44.entities.ProposalSection.list('-word_count', 100);
      
      return allSections.filter(s => 
        proposalIds.includes(s.proposal_id) && 
        s.content && 
        s.word_count > 100 &&
        s.status === 'approved'
      );
    },
    enabled: qualityProposals.length > 0,
  });

  // Check what's already in library
  const { data: existingLibraryContent = [] } = useQuery({
    queryKey: ['existing-library-content', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalResource.filter({
        organization_id: organization.id,
        resource_type: 'boilerplate_text'
      });
    },
    enabled: !!organization?.id,
  });

  const analyzeForPromotionCandidates = async () => {
    if (sections.length === 0) {
      alert('No quality sections found. Complete and win more proposals first.');
      return;
    }

    setAnalyzing(true);

    try {
      // Prepare sections for AI analysis
      const sectionsData = sections.slice(0, 20).map(s => {
        const proposal = qualityProposals.find(p => p.id === s.proposal_id);
        return {
          section_id: s.id,
          section_name: s.section_name,
          section_type: s.section_type,
          word_count: s.word_count,
          content_preview: s.content.replace(/<[^>]*>/g, '').substring(0, 300),
          proposal_outcome: proposal?.status,
          proposal_name: proposal?.proposal_name,
          agency: proposal?.agency_name
        };
      });

      const existingContentTitles = existingLibraryContent.map(c => c.title.toLowerCase());

      const prompt = `You are an expert at identifying reusable, high-quality proposal content. Analyze these sections from won/submitted proposals and identify the TOP 5 candidates for promotion to the content library.

**EXISTING LIBRARY CONTENT (avoid duplicates):**
${existingContentTitles.join(', ')}

**SECTIONS TO ANALYZE:**
${JSON.stringify(sectionsData, null, 2)}

**CRITERIA FOR GOOD LIBRARY CONTENT:**
1. Generic enough to reuse across proposals (not too specific to one client/project)
2. High quality writing (clear, professional, persuasive)
3. Substantial content (300+ words preferred)
4. From won proposals (proven effectiveness)
5. Common section types (technical approach, management, past performance, etc.)
6. NOT already in library (check titles above)

**YOUR TASK:**
Identify the top 5 sections that would be most valuable to promote to the library. For each:
- Explain WHY it's a good candidate
- Suggest a library title
- Recommend what tags to add
- Estimate reuse potential (high/medium/low)
- Suggest what modifications would make it more reusable`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            candidates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_id: { type: "string" },
                  reasoning: { type: "string" },
                  suggested_title: { type: "string" },
                  suggested_tags: { type: "array", items: { type: "string" } },
                  reuse_potential: { 
                    type: "string",
                    enum: ["high", "medium", "low"]
                  },
                  suggested_modifications: { type: "string" },
                  value_score: { 
                    type: "number",
                    minimum: 0,
                    maximum: 100
                  }
                }
              }
            }
          }
        }
      });

      // Enrich with full section data
      const enrichedSuggestions = result.candidates.map(candidate => {
        const section = sections.find(s => s.id === candidate.section_id);
        const proposal = qualityProposals.find(p => p.id === section?.proposal_id);
        
        return {
          ...candidate,
          section,
          proposal,
          content: section?.content
        };
      }).filter(s => s.section); // Filter out any that didn't match

      setSuggestions(enrichedSuggestions);

      if (enrichedSuggestions.length === 0) {
        alert('No new promotion candidates found. Your library may already have the best content!');
      }

    } catch (error) {
      console.error('Error analyzing:', error);
      alert('Error analyzing content: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Smart Promote Suggestions</CardTitle>
              <CardDescription>
                AI identifies your best content to add to the library
              </CardDescription>
            </div>
          </div>
          
          <Button
            onClick={analyzeForPromotionCandidates}
            disabled={analyzing || sections.length === 0}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {analyzing ? (
              <>
                <div className="animate-spin mr-2">⏳</div>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Find Candidates
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 text-purple-300" />
            <p className="text-sm text-slate-600">
              Click "Find Candidates" to let AI identify your best content for the library
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion, idx) => (
              <Card key={suggestion.section_id} className="border-2 border-white bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                      suggestion.reuse_potential === 'high' ? "bg-green-100 text-green-700" :
                      suggestion.reuse_potential === 'medium' ? "bg-yellow-100 text-yellow-700" :
                      "bg-orange-100 text-orange-700"
                    )}>
                      {idx + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-semibold text-slate-900">
                          {suggestion.suggested_title}
                        </h4>
                        <Badge className={cn(
                          suggestion.reuse_potential === 'high' ? 'bg-green-100 text-green-700' :
                          suggestion.reuse_potential === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-orange-100 text-orange-700'
                        )}>
                          {suggestion.reuse_potential} potential
                        </Badge>
                        <Badge className="bg-purple-100 text-purple-700">
                          {suggestion.value_score}/100 value
                        </Badge>
                      </div>

                      <p className="text-sm text-slate-700 mb-2">
                        <strong>From:</strong> {suggestion.proposal?.proposal_name}
                      </p>

                      <p className="text-sm text-slate-600 mb-3">
                        {suggestion.reasoning}
                      </p>

                      {suggestion.suggested_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {suggestion.suggested_tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {suggestion.suggested_modifications && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                          <p className="text-xs text-amber-900">
                            <strong>💡 Tip:</strong> {suggestion.suggested_modifications}
                          </p>
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => onPromoteClick && onPromoteClick(suggestion)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Promote This Content
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}