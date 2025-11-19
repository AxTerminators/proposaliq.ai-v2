import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  Sparkles, 
  Star, 
  TrendingUp, 
  Target,
  Loader2,
  CheckCircle2,
  Award,
  Zap,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Smart Reference Selector
 * AI-powered reference proposal selection with relevance scoring
 */
export default function SmartReferenceSelector({ 
  proposal, 
  selectedReferences = [],
  onSelectionChange,
  maxReferences = 3
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyRecommended, setShowOnlyRecommended] = useState(false);

  // Fetch available reference proposals
  const { data: allProposals = [], isLoading } = useQuery({
    queryKey: ['proposals', proposal?.organization_id],
    queryFn: async () => {
      const proposals = await base44.entities.Proposal.filter({
        organization_id: proposal.organization_id,
        status: { $in: ['won', 'submitted'] }
      });
      return proposals.filter(p => p.id !== proposal.id);
    },
    enabled: !!proposal?.organization_id
  });

  // Get relevance scores
  const { data: scores = {}, isLoading: scoringLoading } = useQuery({
    queryKey: ['reference-scores', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return {};
      
      const response = await base44.functions.invoke('scoreReferenceRelevance', {
        proposalId: proposal.id,
        candidateProposalIds: allProposals.map(p => p.id)
      });
      
      return response.data.scores || {};
    },
    enabled: !!proposal?.id && allProposals.length > 0
  });

  // Get quality feedback for each proposal
  const { data: qualityData = {} } = useQuery({
    queryKey: ['reference-quality', proposal?.organization_id],
    queryFn: async () => {
      const feedback = await base44.entities.ContentQualityFeedback.filter({
        organization_id: proposal.organization_id
      });

      const quality = {};
      feedback.forEach(f => {
        if (!f.reference_proposal_ids) return;
        f.reference_proposal_ids.forEach(refId => {
          if (!quality[refId]) {
            quality[refId] = { ratings: [], avgRating: 0 };
          }
          quality[refId].ratings.push(f.quality_rating);
        });
      });

      Object.keys(quality).forEach(id => {
        const ratings = quality[id].ratings;
        quality[id].avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        quality[id].usageCount = ratings.length;
      });

      return quality;
    },
    enabled: !!proposal?.organization_id
  });

  // Auto-select best references
  const autoSelectMutation = useMutation({
    mutationFn: async () => {
      const scoredProposals = allProposals.map(p => ({
        id: p.id,
        score: scores[p.id]?.overall_score || 0,
        quality: qualityData[p.id]?.avgRating || 0
      }));

      // Sort by combined score and quality
      scoredProposals.sort((a, b) => {
        const scoreA = a.score * 0.7 + a.quality * 0.3;
        const scoreB = b.score * 0.7 + b.quality * 0.3;
        return scoreB - scoreA;
      });

      return scoredProposals.slice(0, maxReferences).map(p => p.id);
    },
    onSuccess: (selectedIds) => {
      onSelectionChange(selectedIds);
      toast.success(`Auto-selected ${selectedIds.length} top references`);
    }
  });

  const handleToggle = (proposalId) => {
    const newSelection = selectedReferences.includes(proposalId)
      ? selectedReferences.filter(id => id !== proposalId)
      : [...selectedReferences, proposalId].slice(0, maxReferences);
    
    onSelectionChange(newSelection);
  };

  // Filter and sort proposals
  const filteredProposals = allProposals
    .filter(p => {
      const matchesSearch = !searchQuery || 
        p.proposal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.agency_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (showOnlyRecommended) {
        const score = scores[p.id]?.overall_score || 0;
        return score >= 60; // Only show high-relevance
      }
      
      return true;
    })
    .sort((a, b) => {
      const scoreA = scores[a.id]?.overall_score || 0;
      const scoreB = scores[b.id]?.overall_score || 0;
      return scoreB - scoreA;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Auto-Select */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Smart Reference Selection
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            {selectedReferences.length} / {maxReferences} selected
          </p>
        </div>
        <Button
          onClick={() => autoSelectMutation.mutate()}
          disabled={autoSelectMutation.isPending || scoringLoading}
          className="bg-gradient-to-r from-purple-600 to-pink-600"
        >
          {autoSelectMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          Auto-Select Best
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Search proposals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showOnlyRecommended ? "default" : "outline"}
          onClick={() => setShowOnlyRecommended(!showOnlyRecommended)}
        >
          <Star className="w-4 h-4 mr-2" />
          Recommended
        </Button>
      </div>

      {/* Proposals List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredProposals.map((refProposal) => {
          const isSelected = selectedReferences.includes(refProposal.id);
          const scoreData = scores[refProposal.id] || {};
          const quality = qualityData[refProposal.id] || {};
          const overallScore = scoreData.overall_score || 0;
          const isHighRelevance = overallScore >= 80;
          const isMediumRelevance = overallScore >= 60 && overallScore < 80;

          return (
            <Card
              key={refProposal.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md border-2",
                isSelected 
                  ? "border-purple-500 bg-purple-50" 
                  : isHighRelevance
                    ? "border-green-200 hover:border-green-300"
                    : isMediumRelevance
                      ? "border-amber-200 hover:border-amber-300"
                      : "border-slate-200 hover:border-slate-300"
              )}
              onClick={() => handleToggle(refProposal.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    disabled={!isSelected && selectedReferences.length >= maxReferences}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-slate-900 truncate">
                        {refProposal.proposal_name}
                      </h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {scoringLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : (
                          <>
                            <Badge className={cn(
                              isHighRelevance && "bg-green-600",
                              isMediumRelevance && "bg-amber-600",
                              !isHighRelevance && !isMediumRelevance && "bg-slate-400"
                            )}>
                              {overallScore}% match
                            </Badge>
                            {quality.avgRating > 0 && (
                              <Badge variant="outline" className="gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                {quality.avgRating.toFixed(1)}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-600 mb-2">
                      {refProposal.agency_name && (
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {refProposal.agency_name}
                        </span>
                      )}
                      {refProposal.status && (
                        <Badge variant="outline" className="text-xs">
                          {refProposal.status}
                        </Badge>
                      )}
                      {quality.usageCount > 0 && (
                        <span className="text-green-600 font-medium">
                          ✓ Used {quality.usageCount}x
                        </span>
                      )}
                    </div>

                    {/* Match Reasons */}
                    {scoreData.match_reasons && scoreData.match_reasons.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {scoreData.match_reasons.slice(0, 3).map((reason, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-blue-50">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredProposals.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <p className="text-slate-500">No matching proposals found</p>
              {showOnlyRecommended && (
                <Button
                  variant="link"
                  onClick={() => setShowOnlyRecommended(false)}
                  className="mt-2"
                >
                  Show all proposals
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selection Limit Warning */}
      {selectedReferences.length >= maxReferences && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
            <span className="text-amber-900">
              Maximum {maxReferences} references selected for optimal token usage
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}