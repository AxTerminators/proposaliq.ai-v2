
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Search,
  TrendingUp,
  Award,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Library // Added Library icon
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { cn } from "@/lib/utils"; // Added cn utility

export default function ProposalReuseIntelligence({ 
  currentProposal, 
  currentSection,
  onContentInsert,
  organization 
}) {
  const queryClient = useQueryClient();
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  // UPDATED: Fetch from Content Library folders in addition to historical sections
  const { data: libraryContent = [] } = useQuery({
    queryKey: ['library-content-reuse', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Fetch boilerplate resources from Content Library
      const resources = await base44.entities.ProposalResource.filter({
        organization_id: organization.id,
        resource_type: 'boilerplate_text'
      }, '-created_date', 50); // Fetch up to 50 latest boilerplate texts
      
      return resources;
    },
    enabled: !!organization?.id,
    staleTime: 180000 // 3 minutes
  });

  // Fetch historical sections for analysis
  const { data: historicalSections = [] } = useQuery({
    queryKey: ['historical-sections', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Get all proposals from this organization
      const proposals = await base44.entities.Proposal.filter({
        organization_id: organization.id
      });
      
      // Get sections from completed/won proposals (better quality content)
      const qualityProposalIds = proposals
        .filter(p => ['won', 'submitted'].includes(p.status))
        .map(p => p.id);
      
      if (qualityProposalIds.length === 0) return [];
      
      // Fetch sections from these proposals
      const allSections = await base44.entities.ProposalSection.list('-created_date', 100);
      
      return allSections.filter(s => 
        qualityProposalIds.includes(s.proposal_id) && 
        s.content && 
        s.content.trim() &&
        s.proposal_id !== currentProposal?.id // Don't suggest from same proposal
      );
    },
    enabled: !!organization?.id,
    staleTime: 300000 // Cache for 5 minutes
  });

  // Fetch existing suggestions for this section
  const { data: existingSuggestions = [] } = useQuery({
    queryKey: ['content-suggestions', currentSection?.id],
    queryFn: async () => {
      if (!currentSection?.id) return [];
      return base44.entities.ContentReuseSuggestion.filter({
        section_id: currentSection.id,
        proposal_id: currentProposal.id
      }, '-relevance_score');
    },
    enabled: !!currentSection?.id && !!currentProposal?.id
  });

  // Mutation for creating suggestions
  const createSuggestionMutation = useMutation({
    mutationFn: async (suggestionData) => {
      return base44.entities.ContentReuseSuggestion.create(suggestionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-suggestions'] });
    }
  });

  // Mutation for updating suggestion status
  const updateSuggestionMutation = useMutation({
    mutationFn: async ({ id, status, feedback }) => {
      return base44.entities.ContentReuseSuggestion.update(id, {
        status,
        user_feedback: feedback,
        was_used: status === 'accepted'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-suggestions'] });
    }
  });

  // UPDATED: Enhanced AI analysis to include library content
  const analyzeAndSuggestContent = async () => {
    if (!currentSection || !currentProposal) {
      alert("Missing section or proposal context");
      return;
    }

    if (historicalSections.length === 0 && libraryContent.length === 0) {
      alert("No content available for analysis. Add content to your Content Library or complete more proposals.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setSuggestions([]);

    try {
      // Get proposal context
      const proposalContext = {
        agency: currentProposal.agency_name,
        project_type: currentProposal.project_type,
        project_title: currentProposal.project_title,
        section_type: currentSection.section_type,
        section_name: currentSection.section_name
      };

      // COMBINE library content and historical sections for analysis
      const combinedContentSources = [];

      // Add library content
      libraryContent.forEach(resource => {
        if (resource.boilerplate_content && resource.boilerplate_content.trim()) {
          combinedContentSources.push({
            source_id: resource.id,
            source_type: 'library',
            title: resource.title,
            content_preview: resource.boilerplate_content.replace(/<[^>]*>/g, '').substring(0, 500),
            content_full: resource.boilerplate_content,
            word_count: resource.word_count,
            tags: resource.tags,
            category: resource.content_category,
            usage_count: resource.usage_count,
            metadata: {
              folder_id: resource.folder_id,
              is_favorite: resource.is_favorite
            }
          });
        }
      });

      // Add historical sections
      const proposalMap = {};
      for (const section of historicalSections) {
        if (!proposalMap[section.proposal_id]) {
          proposalMap[section.proposal_id] = [];
        }
        proposalMap[section.proposal_id].push(section);
      }

      const proposalIds = Object.keys(proposalMap);
      const historicalProposals = await Promise.all(
        proposalIds.map(id => 
          base44.entities.Proposal.filter({ id }).then(p => p[0])
        )
      );

      // Filter to same section type first (most relevant)
      const sameSectionType = historicalSections.filter(s => 
        s.section_type === currentSection.section_type
      ).slice(0, 10); // Limit to top 10 for AI analysis

      sameSectionType.forEach(section => {
        const proposal = historicalProposals.find(p => p?.id === section.proposal_id);
        combinedContentSources.push({
          source_id: section.id,
          source_type: 'historical',
          title: section.section_name,
          content_preview: section.content.replace(/<[^>]*>/g, '').substring(0, 500),
          content_full: section.content,
          word_count: section.word_count,
          section_type: section.section_type,
          metadata: {
            proposal_id: section.proposal_id,
            proposal_name: proposal?.proposal_name || 'Unknown',
            agency: proposal?.agency_name || 'Unknown',
            status: proposal?.status || 'unknown',
            project_type: proposal?.project_type || 'Unknown'
          }
        });
      });

      if (combinedContentSources.length === 0) {
        alert("No content available for analysis");
        setAnalyzing(false);
        return;
      }

      // Use AI to calculate relevance
      const prompt = `You are an expert at analyzing proposal content for reuse potential. Analyze these content sources (from both Content Library and historical proposals) and determine which are most relevant for the current proposal section.

**CURRENT PROPOSAL CONTEXT:**
- Agency: ${proposalContext.agency}
- Project Type: ${proposalContext.project_type}
- Project Title: ${proposalContext.project_title}
- Section Type: ${proposalContext.section_type}
- Section Name: ${proposalContext.section_name}

**CONTENT SOURCES TO ANALYZE:**
${JSON.stringify(combinedContentSources, null, 2)}

**YOUR TASK:**
Analyze each content source and:
1. Calculate relevance score (0-100) based on:
   - Content Library items with matching tags/categories get +20 bonus
   - Agency match (government agencies often have similar requirements)
   - Section type match (exact match = highest relevance)
   - Project type similarity
   - Content topic overlap
   - Quality indicators (word count, usage count, proposal outcome)

2. Identify specific match reasons

3. Suggest modifications needed

4. Determine similarity type

Return the top 8 most relevant suggestions, prioritizing Content Library items when highly relevant.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  source_id: { type: "string" },
                  source_type: { type: "string", enum: ["library", "historical"] }, // Added source_type
                  relevance_score: { 
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    description: "Relevance score 0-100"
                  },
                  match_reasons: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific reasons why this content is relevant"
                  },
                  similarity_type: {
                    type: "string",
                    enum: ["exact_match", "agency_match", "topic_match", "keyword_match", "semantic_match"]
                  },
                  suggested_modifications: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific modifications needed to adapt content"
                  },
                  keyword_overlap: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key terms that overlap between source and target"
                  },
                  confidence_level: {
                    type: "string",
                    enum: ["high", "medium", "low"]
                  },
                  estimated_time_saved_hours: {
                    type: "number",
                    description: "Estimated hours saved by reusing"
                  }
                }
              }
            }
          }
        }
      });

      // Create suggestion records in database
      const enrichedSuggestions = [];
      
      for (const aiSuggestion of result.suggestions) {
        const sourceContent = combinedContentSources.find(s => s.source_id === aiSuggestion.source_id);
        
        if (!sourceContent) continue;

        const suggestionData = {
          organization_id: organization.id,
          proposal_id: currentProposal.id,
          section_id: currentSection.id,
          section_type: currentSection.section_type,
          source_proposal_id: sourceContent.source_type === 'historical' 
            ? sourceContent.metadata.proposal_id 
            : null,
          source_proposal_name: sourceContent.source_type === 'historical'
            ? sourceContent.metadata.proposal_name
            : `[Library] ${sourceContent.title}`, // Prefix for library items
          source_section_id: sourceContent.source_id,
          source_section_name: sourceContent.title, // Use title for both section name and resource name
          suggested_content: sourceContent.content_full,
          relevance_score: aiSuggestion.relevance_score,
          match_reasons: aiSuggestion.match_reasons,
          similarity_type: aiSuggestion.similarity_type,
          suggested_modifications: aiSuggestion.suggested_modifications,
          keyword_overlap: aiSuggestion.keyword_overlap,
          confidence_level: aiSuggestion.confidence_level,
          estimated_time_saved_hours: aiSuggestion.estimated_time_saved_hours,
          source_proposal_outcome: sourceContent.source_type === 'historical'
            ? sourceContent.metadata.status
            : 'library', // Indicate library source
          word_count: sourceContent.word_count,
          content_preview: sourceContent.content_preview,
          // Store source type for display
          _source_type: sourceContent.source_type, // New internal field
          _tags: sourceContent.tags, // New internal field
          _is_favorite: sourceContent.metadata?.is_favorite // New internal field
        };

        const created = await createSuggestionMutation.mutateAsync(suggestionData);
        enrichedSuggestions.push({ ...suggestionData, id: created.id });
      }

      setSuggestions(enrichedSuggestions);
      
      if (enrichedSuggestions.length === 0) {
        alert("No relevant content found. Add more items to your Content Library or complete more proposals.");
      }

    } catch (err) {
      console.error("Error analyzing content:", err);
      setError(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAcceptSuggestion = async (suggestion) => {
    if (onContentInsert) {
      onContentInsert(suggestion.suggested_content);
    }
    
    await updateSuggestionMutation.mutateAsync({
      id: suggestion.id,
      status: 'accepted',
      feedback: 'Content inserted into section'
    });

    alert("✓ Content inserted! Remember to customize it for this specific proposal.");
  };

  const handleRejectSuggestion = async (suggestion) => {
    const feedback = prompt("Why is this suggestion not relevant? (Optional)");
    
    await updateSuggestionMutation.mutateAsync({
      id: suggestion.id,
      status: 'rejected',
      feedback: feedback || 'Not relevant'
    });
  };

  const getRelevanceColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-blue-600 bg-blue-100";
    if (score >= 40) return "text-yellow-600 bg-yellow-100";
    return "text-orange-600 bg-orange-100";
  };

  const getSimilarityIcon = (type) => {
    const icons = {
      exact_match: CheckCircle2,
      agency_match: Award,
      topic_match: FileText,
      keyword_match: Search,
      semantic_match: Sparkles
    };
    return icons[type] || FileText;
  };

  const displaySuggestions = suggestions.length > 0 ? suggestions : existingSuggestions;

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Content Reuse Intelligence</CardTitle>
              <CardDescription>
                AI-powered suggestions from Content Library and historical proposals
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={analyzeAndSuggestContent}
            disabled={analyzing || !currentSection || (historicalSections.length === 0 && libraryContent.length === 0)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Find Reusable Content
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Alerts */}
        {!currentSection && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Select a section in Phase 6 to see content suggestions for that specific section.
            </AlertDescription>
          </Alert>
        )}

        {historicalSections.length === 0 && libraryContent.length === 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              No content available yet. Add items to your Content Library or complete more proposals to build your reusable content repository.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>
              Error analyzing content: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* UPDATED: Statistics to include library content */}
        {(historicalSections.length > 0 || libraryContent.length > 0) && (
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-900 mb-1">Library Items</p>
                    <p className="text-3xl font-bold text-purple-600">{libraryContent.length}</p>
                  </div>
                  <Library className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-900 mb-1">Historical Sections</p>
                    <p className="text-3xl font-bold text-blue-600">{historicalSections.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-900 mb-1">Suggestions Found</p>
                    <p className="text-3xl font-bold text-green-600">{displaySuggestions.length}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Suggestions List */}
        {displaySuggestions.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-slate-900">
              Content Suggestions ({displaySuggestions.length})
            </h3>

            {displaySuggestions.map((suggestion) => {
              const SimilarityIcon = getSimilarityIcon(suggestion.similarity_type);
              const isFromLibrary = suggestion._source_type === 'library';
              
              return (
                <Card key={suggestion.id} className={cn(
                  "border-2 hover:shadow-lg transition-all",
                  isFromLibrary && "border-purple-300 bg-purple-50/30"
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1">
                        <SimilarityIcon className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h4 className="font-semibold text-slate-900">
                              {suggestion.source_section_name}
                            </h4>
                            {isFromLibrary && (
                              <Badge className="bg-purple-100 text-purple-700 gap-1">
                                <Library className="w-3 h-3" />
                                Content Library
                              </Badge>
                            )}
                            <Badge className={getRelevanceColor(suggestion.relevance_score)}>
                              {suggestion.relevance_score}% Match
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {suggestion.similarity_type.replace(/_/g, ' ')}
                            </Badge>
                            {suggestion.confidence_level && (
                              <Badge className={
                                suggestion.confidence_level === 'high' ? 'bg-green-100 text-green-800' :
                                suggestion.confidence_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-orange-100 text-orange-800'
                              }>
                                {suggestion.confidence_level} confidence
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-slate-600 mb-3">
                            From: <span className="font-medium">{suggestion.source_proposal_name}</span>
                            {suggestion.source_proposal_outcome && suggestion.source_proposal_outcome !== 'library' && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {suggestion.source_proposal_outcome}
                              </Badge>
                            )}
                          </p>

                          {/* Tags (for library items) */}
                          {isFromLibrary && suggestion._tags && suggestion._tags.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-slate-700 mb-1">Tags:</p>
                              <div className="flex flex-wrap gap-1">
                                {suggestion._tags.map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Match Reasons */}
                          {suggestion.match_reasons && suggestion.match_reasons.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-slate-700 mb-1">Why this is relevant:</p>
                              <ul className="text-xs text-slate-600 space-y-1">
                                {suggestion.match_reasons.map((reason, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Suggested Modifications */}
                          {suggestion.suggested_modifications && suggestion.suggested_modifications.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-slate-700 mb-1">Recommended modifications:</p>
                              <ul className="text-xs text-slate-600 space-y-1">
                                {suggestion.suggested_modifications.map((mod, idx) => (
                                  <li key={idx} className="flex items-start gap-2">
                                    <span className="text-amber-600">→</span>
                                    <span>{mod}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Keywords */}
                          {suggestion.keyword_overlap && suggestion.keyword_overlap.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {suggestion.keyword_overlap.map((keyword, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Time Savings */}
                          {suggestion.estimated_time_saved_hours && (
                            <p className="text-xs text-green-600 font-medium">
                              ⏱️ Estimated time saved: ~{suggestion.estimated_time_saved_hours} hours
                            </p>
                          )}

                          {/* Relevance Progress Bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                              <span>Relevance Score</span>
                              <span>{suggestion.relevance_score}%</span>
                            </div>
                            <Progress value={suggestion.relevance_score} className="h-2" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Preview */}
                    {suggestion.content_preview && (
                      <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">Content Preview:</p>
                        <p className="text-sm text-slate-700 line-clamp-3">
                          {suggestion.content_preview}...
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => setSelectedSuggestion(
                          selectedSuggestion?.id === suggestion.id ? null : suggestion
                        )}
                        variant="outline"
                      >
                        {selectedSuggestion?.id === suggestion.id ? 'Hide' : 'View'} Full Content
                      </Button>

                      {suggestion.status !== 'accepted' && (
                        <Button
                          size="sm"
                          onClick={() => handleAcceptSuggestion(suggestion)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Use This Content
                        </Button>
                      )}

                      {suggestion.status !== 'rejected' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRejectSuggestion(suggestion)}
                        >
                          <ThumbsDown className="w-3 h-3 mr-1" />
                          Not Relevant
                        </Button>
                      )}

                      {suggestion.status === 'accepted' && (
                        <Badge className="bg-green-100 text-green-800 ml-auto">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Used
                        </Badge>
                      )}
                    </div>

                    {/* Full Content View */}
                    {selectedSuggestion?.id === suggestion.id && (
                      <div className="mt-4 border-t pt-4">
                        <p className="text-sm font-semibold text-slate-900 mb-2">Full Content:</p>
                        <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
                          <div 
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: suggestion.suggested_content }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!analyzing && displaySuggestions.length === 0 && currentSection && (historicalSections.length > 0 || libraryContent.length > 0) && (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Suggestions Yet
            </h3>
            <p className="text-slate-600 mb-6">
              Click "Find Reusable Content" to analyze your content library and historical proposals and discover relevant content for this section.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
