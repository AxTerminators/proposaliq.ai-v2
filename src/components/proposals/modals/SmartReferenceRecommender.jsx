import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Loader2,
  Award,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  Target,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * SmartReferenceRecommender Component
 * 
 * AI-powered reference proposal recommender that suggests which past proposals
 * would be most valuable as RAG context for the current proposal.
 * 
 * Uses intelligent scoring algorithm considering:
 * - Agency match (40 pts)
 * - Project type match (30 pts)
 * - Win status (20 pts)
 * - Similar contract value (10 pts)
 * - Recency (5 pts)
 * - High match score (5 pts)
 * - Has target section (15 pts)
 */
export default function SmartReferenceRecommender({
  currentProposal,
  availableProposals,
  onRecommendationsSelect,
  targetSectionType = null
}) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (currentProposal && availableProposals.length > 0) {
      generateRecommendations();
    }
  }, [currentProposal?.id, availableProposals.length]);

  const generateRecommendations = async () => {
    if (!currentProposal || availableProposals.length === 0) return;

    setLoading(true);
    try {
      // Call scoring function
      const result = await base44.functions.invoke('scoreReferenceRelevance', {
        current_proposal_id: currentProposal.id,
        candidate_proposal_ids: availableProposals.map(p => p.id),
        target_section_type: targetSectionType
      });

      if (result.data?.status === 'success') {
        setRecommendations(result.data.top_recommendations || []);
        console.log('[SmartReferenceRecommender] ✅ Generated recommendations:', result.data.top_recommendations.length);
      } else {
        console.error('[SmartReferenceRecommender] Error:', result.data?.error);
        toast.error('Failed to generate recommendations');
      }
    } catch (error) {
      console.error('[SmartReferenceRecommender] Error:', error);
      toast.error('Failed to generate recommendations: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (proposalId) => {
    setSelectedIds(prev =>
      prev.includes(proposalId)
        ? prev.filter(id => id !== proposalId)
        : [...prev, proposalId]
    );
  };

  const handleSelectAll = () => {
    const allIds = recommendations.map(r => r.proposal_id);
    setSelectedIds(allIds);
    toast.success(`Selected all ${allIds.length} recommended references`);
  };

  const handleApplySelections = () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one reference');
      return;
    }

    if (onRecommendationsSelect) {
      onRecommendationsSelect(selectedIds);
    }

    toast.success(`Added ${selectedIds.length} recommended reference(s)`, {
      description: 'These will enhance AI content quality'
    });
  };

  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case 'highly_recommended':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'recommended':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'consider':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getRecommendationIcon = (score) => {
    if (score >= 80) return <Award className="w-4 h-4 text-green-600" />;
    if (score >= 50) return <Target className="w-4 h-4 text-blue-600" />;
    return <Lightbulb className="w-4 h-4 text-amber-600" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600 mr-3" />
          <p className="text-sm text-purple-900">Analyzing {availableProposals.length} proposals for relevance...</p>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="w-5 h-5" />
            AI Recommendations
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
              disabled={selectedIds.length === recommendations.length}
            >
              Select All
            </Button>
            {selectedIds.length > 0 && (
              <Button
                size="sm"
                onClick={handleApplySelections}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Add {selectedIds.length} Selected
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-purple-700 mt-1">
          Top {recommendations.length} most relevant references for your proposal
          {targetSectionType && ` (filtered to ${targetSectionType.replace('_', ' ')})`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec, idx) => {
          const isSelected = selectedIds.includes(rec.proposal_id);

          return (
            <Card
              key={rec.proposal_id}
              className={cn(
                "border-2 transition-all cursor-pointer hover:shadow-md",
                isSelected 
                  ? "border-purple-400 bg-white shadow-md" 
                  : "border-slate-200 bg-white"
              )}
              onClick={() => handleToggle(rec.proposal_id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(rec.proposal_id)}
                    className="mt-1"
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-1 min-w-0">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                            {idx + 1}
                          </span>
                          <h4 className="font-semibold text-slate-900 truncate">
                            {rec.proposal_name}
                          </h4>
                        </div>
                        {rec.project_title && (
                          <p className="text-sm text-slate-700 ml-8">
                            {rec.project_title}
                          </p>
                        )}
                      </div>
                      
                      {/* Score Badge */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {getRecommendationIcon(rec.score)}
                        <Badge className="bg-purple-600 text-white">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {rec.score} pts
                        </Badge>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 ml-8 mb-2">
                      {rec.agency_name && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{rec.agency_name}</span>
                        </div>
                      )}
                      {rec.contract_value && (
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          <span>${(rec.contract_value / 1000000).toFixed(1)}M</span>
                        </div>
                      )}
                      {rec.status && (
                        <div className="flex items-center gap-1.5">
                          {rec.status === 'won' && <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
                          <span className={cn(
                            rec.status === 'won' && 'text-green-700 font-medium'
                          )}>
                            {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                          </span>
                        </div>
                      )}
                      {rec.project_type && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rec.project_type}</span>
                        </div>
                      )}
                    </div>

                    {/* Reasons for Recommendation */}
                    <div className="ml-8">
                      <Badge className={cn("text-xs mb-2", getRecommendationColor(rec.recommendation))}>
                        {rec.recommendation.replace('_', ' ').toUpperCase()}
                      </Badge>
                      
                      {rec.reasons.length > 0 && (
                        <div className="space-y-0.5">
                          {rec.reasons.map((reason, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-1.5">
                              <div className="w-1 h-1 rounded-full bg-purple-400" />
                              <p className="text-xs text-slate-700">{reason}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Summary Footer */}
        <div className="bg-purple-100 border border-purple-200 rounded-lg p-3 mt-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-purple-900">
              <p className="font-semibold mb-1">Why These Recommendations?</p>
              <p>
                AI analyzed {availableProposals.length} past proposals and scored them based on agency match, 
                project type, win status, contract value, and content relevance
                {targetSectionType && ` for ${targetSectionType.replace('_', ' ')} sections`}.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}