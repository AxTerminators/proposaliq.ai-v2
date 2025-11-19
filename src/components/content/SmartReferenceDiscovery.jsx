import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, TrendingUp, Building2, CheckCircle2, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * SmartReferenceDiscovery Component
 * 
 * PHASE 5: Cross-Organization RAG
 * 
 * Automatically discovers relevant reference proposals from across the organization.
 * Uses AI-powered similarity scoring to find the best matches.
 * 
 * Features:
 * - Automatic discovery based on proposal similarity
 * - One-click add to references
 * - Shows relevance scores and reasons
 * - Respects privacy boundaries for consultant firms
 */
export default function SmartReferenceDiscovery({
  proposalId,
  organizationId,
  currentReferences = [],
  onAddReference,
  sectionType = null
}) {
  const [discovering, setDiscovering] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (proposalId && organizationId) {
      discoverSimilarProposals();
    }
  }, [proposalId, organizationId, sectionType]);

  const discoverSimilarProposals = async () => {
    try {
      setDiscovering(true);
      setError(null);

      const result = await base44.functions.invoke('discoverSimilarProposals', {
        current_proposal_id: proposalId,
        organization_id: organizationId,
        max_results: 10,
        min_relevance_score: 40, // Lowered threshold for more results
        section_type: sectionType,
        prioritize_wins: true,
        exclude_proposal_ids: currentReferences
      });

      if (result.data?.status === 'success') {
        const discovered = result.data.discovered_proposals || [];
        
        // Further rank by relevance score with section type bonus
        const rankedSuggestions = discovered.map(prop => ({
          ...prop,
          display_score: prop.relevance_score,
          recommendation_level: 
            prop.relevance_score >= 80 ? 'highly_recommended' :
            prop.relevance_score >= 60 ? 'recommended' :
            prop.relevance_score >= 40 ? 'consider' : 'low'
        }));
        
        setSuggestions(rankedSuggestions);
        
        if (rankedSuggestions.length === 0) {
          toast.info('No similar proposals found', {
            description: 'Try manually selecting references or adjust filters'
          });
        } else {
          const highlyRelevant = rankedSuggestions.filter(s => s.recommendation_level === 'highly_recommended').length;
          toast.success(`Found ${rankedSuggestions.length} similar proposals`, {
            description: highlyRelevant > 0 ? `${highlyRelevant} highly relevant` : 'Review recommendations'
          });
        }
      } else {
        throw new Error(result.data?.error || 'Discovery failed');
      }
    } catch (err) {
      console.error('[SmartReferenceDiscovery] Error:', err);
      setError(err.message);
      toast.error('Failed to discover proposals', {
        description: err.message
      });
    } finally {
      setDiscovering(false);
    }
  };

  const handleAddReference = (proposal) => {
    if (onAddReference) {
      onAddReference(proposal.proposal_id);
      // Remove from suggestions
      setSuggestions(prev => prev.filter(p => p.proposal_id !== proposal.proposal_id));
      toast.success('Reference added', {
        description: proposal.proposal_name
      });
    }
  };

  if (discovering && suggestions.length === 0) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
          <p className="text-sm text-purple-900 font-semibold">Discovering similar proposals...</p>
          <p className="text-xs text-purple-700 mt-1">Analyzing organization knowledge base</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <p className="text-sm text-red-900">Failed to discover proposals: {error}</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={discoverSimilarProposals}
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-purple-900 text-base">
          <Sparkles className="w-5 h-5" />
          Smart Recommendations
          <Badge className="bg-purple-600 text-white ml-auto">
            {suggestions.length} Found
          </Badge>
        </CardTitle>
        <p className="text-xs text-purple-700 mt-1">
          AI-discovered similar proposals from your organization
        </p>
      </CardHeader>
      <CardContent className="space-y-2 max-h-96 overflow-y-auto">
        {suggestions.map((proposal, idx) => (
          <Card 
            key={proposal.proposal_id}
            className="border hover:shadow-md transition-all"
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-slate-900 truncate">
                      {proposal.proposal_name}
                    </p>
                    {proposal.status === 'won' && (
                      <Badge className="bg-green-600 text-white text-xs flex-shrink-0">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Won
                      </Badge>
                    )}
                  </div>

                  {proposal.project_title && (
                    <p className="text-xs text-slate-600 truncate mb-2">
                      {proposal.project_title}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mb-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge 
                            className={`text-xs cursor-help ${
                              proposal.recommendation_level === 'highly_recommended' 
                                ? 'bg-green-100 text-green-800' 
                                : proposal.recommendation_level === 'recommended'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {proposal.display_score}% match
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-1 max-w-xs">
                            <p className="font-semibold">Relevance Score: {proposal.display_score}/100</p>
                            <p className="text-slate-400 text-xs mb-1">
                              {proposal.recommendation_level === 'highly_recommended' && '⭐ Highly Recommended'}
                              {proposal.recommendation_level === 'recommended' && '✓ Recommended'}
                              {proposal.recommendation_level === 'consider' && '→ Consider'}
                            </p>
                            <p className="font-semibold mt-2">Why this is relevant:</p>
                            {proposal.relevance_reasons.map((reason, i) => (
                              <p key={i}>• {reason}</p>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {proposal.agency_name && (
                      <Badge variant="outline" className="text-xs">
                        <Building2 className="w-3 h-3 mr-1" />
                        {proposal.agency_name}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {proposal.relevance_reasons.slice(0, 2).map((reason, i) => (
                      <span key={i} className="text-xs text-slate-500">
                        {i > 0 && '• '}{reason}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleAddReference(proposal)}
                  className="bg-purple-600 hover:bg-purple-700 flex-shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={discoverSimilarProposals}
          className="w-full mt-2"
          disabled={discovering}
        >
          {discovering ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Refresh Suggestions
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}