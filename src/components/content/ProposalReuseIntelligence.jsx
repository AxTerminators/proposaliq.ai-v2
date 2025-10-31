import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  Copy,
  Check,
  TrendingUp,
  Eye,
  Loader2,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProposalReuseIntelligence({ 
  proposal, 
  currentSection, 
  organization,
  onInsertContent 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (proposal?.id && currentSection?.id) {
      loadSuggestions();
    }
  }, [proposal?.id, currentSection?.id]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      // Check if we already have suggestions for this section
      const existing = await base44.entities.ContentReuseSuggestion.filter({
        proposal_id: proposal.id,
        section_id: currentSection.id
      });

      if (existing.length > 0) {
        setSuggestions(existing.filter(s => s.status !== 'rejected'));
      } else {
        // Generate new suggestions
        await generateSuggestions();
      }
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    try {
      // Get all past proposals from this organization
      const pastProposals = await base44.entities.Proposal.filter({
        organization_id: organization.id
      });

      // Filter out current proposal
      const otherProposals = pastProposals.filter(p => p.id !== proposal.id);

      if (otherProposals.length === 0) {
        setSuggestions([]);
        return;
      }

      const generatedSuggestions = [];

      // Search for similar sections in past proposals
      for (const pastProposal of otherProposals.slice(0, 10)) { // Limit to 10 for performance
        const pastSections = await base44.entities.ProposalSection.filter({
          proposal_id: pastProposal.id
        });

        // Find sections of the same type or with similar names
        const similarSections = pastSections.filter(s => 
          s.section_type === currentSection.section_type ||
          s.section_name?.toLowerCase().includes(currentSection.section_name?.toLowerCase().substring(0, 10))
        );

        for (const similarSection of similarSections) {
          if (!similarSection.content || similarSection.content.length < 100) continue;

          // Calculate relevance score
          let relevanceScore = 0;
          const matchReasons = [];
          let similarityType = 'topic_match';

          // Same section type
          if (similarSection.section_type === currentSection.section_type) {
            relevanceScore += 40;
            matchReasons.push('Same section type');
            similarityType = 'exact_match';
          }

          // Similar section name
          if (similarSection.section_name?.toLowerCase() === currentSection.section_name?.toLowerCase()) {
            relevanceScore += 30;
            matchReasons.push('Identical section name');
          }

          // Same agency
          if (pastProposal.agency_name === proposal.agency_name) {
            relevanceScore += 20;
            matchReasons.push(`Same agency (${proposal.agency_name})`);
            similarityType = 'agency_match';
          }

          // Similar project type
          if (pastProposal.project_type === proposal.project_type) {
            relevanceScore += 10;
            matchReasons.push('Same project type');
          }

          // Keyword overlap (simple check)
          const currentKeywords = extractKeywords(currentSection.section_name);
          const pastKeywords = extractKeywords(similarSection.content);
          const overlap = currentKeywords.filter(k => pastKeywords.includes(k));
          if (overlap.length > 0) {
            relevanceScore += Math.min(overlap.length * 5, 20);
            matchReasons.push(`${overlap.length} keyword matches`);
          }

          // Only suggest if relevance is above threshold
          if (relevanceScore >= 40 && similarSection.content) {
            const cleanContent = stripHtml(similarSection.content);
            const wordCount = cleanContent.split(/\s+/).length;

            generatedSuggestions.push({
              organization_id: organization.id,
              proposal_id: proposal.id,
              section_id: currentSection.id,
              section_type: currentSection.section_type,
              source_proposal_id: pastProposal.id,
              source_proposal_name: pastProposal.proposal_name,
              source_section_id: similarSection.id,
              source_section_name: similarSection.section_name,
              suggested_content: similarSection.content,
              relevance_score: Math.min(relevanceScore, 100),
              match_reasons: matchReasons,
              similarity_type: similarityType,
              source_proposal_outcome: pastProposal.status,
              content_preview: cleanContent.substring(0, 200) + '...',
              word_count: wordCount,
              keyword_overlap: overlap,
              confidence_level: relevanceScore >= 70 ? 'high' : relevanceScore >= 50 ? 'medium' : 'low',
              estimated_time_saved_hours: Math.round(wordCount / 500), // Assume 500 words per hour
              status: 'suggested'
            });
          }
        }
      }

      // Sort by relevance score
      generatedSuggestions.sort((a, b) => b.relevance_score - a.relevance_score);

      // Take top 5
      const topSuggestions = generatedSuggestions.slice(0, 5);

      // Save to database
      for (const suggestion of topSuggestions) {
        await base44.entities.ContentReuseSuggestion.create(suggestion);
      }

      setSuggestions(topSuggestions);

    } catch (error) {
      console.error("Error generating suggestions:", error);
    }
  };

  const extractKeywords = (text) => {
    if (!text) return [];
    const words = text.toLowerCase()
      .replace(/<[^>]*>/g, '') // Remove HTML
      .split(/\W+/)
      .filter(w => w.length > 4); // Only words longer than 4 chars
    return [...new Set(words)]; // Unique words
  };

  const stripHtml = (html) => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleAccept = async (suggestion) => {
    try {
      await base44.entities.ContentReuseSuggestion.update(suggestion.id, {
        status: 'accepted',
        was_used: true
      });

      if (onInsertContent) {
        onInsertContent(suggestion.suggested_content);
      }

      // Remove from list
      setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
      
      alert("✓ Content inserted successfully!");
    } catch (error) {
      console.error("Error accepting suggestion:", error);
    }
  };

  const handleReject = async (suggestion) => {
    try {
      await base44.entities.ContentReuseSuggestion.update(suggestion.id, {
        status: 'rejected'
      });

      setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
    }
  };

  const handleCopy = async (suggestion) => {
    const cleanContent = stripHtml(suggestion.suggested_content);
    navigator.clipboard.writeText(cleanContent);
    setCopiedId(suggestion.id);
    setTimeout(() => setCopiedId(null), 2000);

    try {
      await base44.entities.ContentReuseSuggestion.update(suggestion.id, {
        status: 'accepted',
        was_used: true
      });
    } catch (error) {
      console.error("Error updating suggestion:", error);
    }
  };

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getOutcomeColor = (outcome) => {
    switch (outcome) {
      case 'won': return 'bg-green-100 text-green-700';
      case 'lost': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Analyzing past proposals for reusable content...</p>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="p-12 text-center">
          <Sparkles className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No Reusable Content Found
          </h3>
          <p className="text-slate-600">
            We couldn't find similar content from past proposals for this section. 
            This might be a new type of section or your first proposal.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Reusable Content Suggestions
          </CardTitle>
          <p className="text-sm text-slate-600">
            Found {suggestions.length} relevant sections from past proposals
          </p>
        </CardHeader>
      </Card>

      {suggestions.map((suggestion) => (
        <Card key={suggestion.id} className="border-none shadow-lg hover:shadow-xl transition-all">
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900">
                      {suggestion.source_section_name}
                    </h3>
                    <Badge className={getConfidenceColor(suggestion.confidence_level)}>
                      {suggestion.confidence_level} confidence
                    </Badge>
                    {suggestion.source_proposal_outcome && (
                      <Badge className={getOutcomeColor(suggestion.source_proposal_outcome)}>
                        {suggestion.source_proposal_outcome === 'won' && '✓ '}
                        {suggestion.source_proposal_outcome}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    From: <strong>{suggestion.source_proposal_name}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {suggestion.relevance_score}%
                  </div>
                  <p className="text-xs text-slate-500">Relevance</p>
                </div>
              </div>

              {/* Progress Bar */}
              <Progress value={suggestion.relevance_score} className="h-2" />

              {/* Match Reasons */}
              <div className="flex flex-wrap gap-2">
                {suggestion.match_reasons?.map((reason, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {reason}
                  </Badge>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>{suggestion.word_count} words</span>
                {suggestion.estimated_time_saved_hours > 0 && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Save ~{suggestion.estimated_time_saved_hours}h
                  </span>
                )}
              </div>

              {/* Preview */}
              <div className="p-4 bg-slate-50 rounded-lg border">
                <p className="text-sm text-slate-700 line-clamp-3">
                  {suggestion.content_preview}
                </p>
              </div>

              {/* Expanded View */}
              {expandedSuggestion === suggestion.id && (
                <div className="p-4 bg-white rounded-lg border max-h-96 overflow-y-auto">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: suggestion.suggested_content }}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => setExpandedSuggestion(
                    expandedSuggestion === suggestion.id ? null : suggestion.id
                  )}
                  variant="outline"
                  size="sm"
                >
                  {expandedSuggestion === suggestion.id ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Hide Full Content
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      View Full Content
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleCopy(suggestion)}
                  variant="outline"
                  size="sm"
                >
                  {copiedId === suggestion.id ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => handleAccept(suggestion)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  Insert into Section
                </Button>

                <Button
                  onClick={() => handleReject(suggestion)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}