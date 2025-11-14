import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, 
  TrendingUp, 
  Award, 
  Clock,
  Target,
  Loader2,
  CheckCircle,
  Info
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * PHASE 8: Smart Reference Selector
 * Uses adaptive selection based on quality feedback
 */
export default function SmartReferenceSelector({
  isOpen,
  onClose,
  proposalId,
  organizationId,
  sectionType,
  onSelectReferences
}) {
  const [selectedIds, setSelectedIds] = React.useState([]);

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['adaptive-references', organizationId, proposalId, sectionType],
    queryFn: async () => {
      const result = await base44.functions.invoke('getAdaptiveReferences', {
        organization_id: organizationId,
        current_proposal_id: proposalId,
        section_type: sectionType,
        max_references: 10,
        prioritize_winners: true
      });
      return result.data;
    },
    enabled: isOpen && !!organizationId && !!proposalId
  });

  const handleToggle = (proposalId) => {
    setSelectedIds(prev => 
      prev.includes(proposalId)
        ? prev.filter(id => id !== proposalId)
        : [...prev, proposalId]
    );
  };

  const handleSelectAll = () => {
    if (!recommendations?.references) return;
    const topFive = recommendations.references.slice(0, 5).map(r => r.proposal_id);
    setSelectedIds(topFive);
  };

  const handleApply = () => {
    onSelectReferences(selectedIds);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Smart Reference Selection
          </DialogTitle>
          <DialogDescription>
            AI-recommended references based on quality feedback and past performance
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="ml-3 text-slate-600">Analyzing best references...</span>
          </div>
        ) : recommendations?.references?.length > 0 ? (
          <div className="space-y-4">
            {/* Info Banner */}
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-purple-900 text-sm">
                      Intelligent Selection Algorithm
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      References are ranked by quality feedback, win rate, section relevance, and usage success.
                      Selecting {selectedIds.length} of {recommendations.references.length} available.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                Select Top 5
              </Button>
              <span className="text-sm text-slate-600">
                {selectedIds.length} selected
              </span>
            </div>

            {/* Reference List */}
            <div className="space-y-3">
              {recommendations.references.map((ref, idx) => (
                <Card 
                  key={ref.proposal_id}
                  className={`cursor-pointer transition-all ${
                    selectedIds.includes(ref.proposal_id)
                      ? 'border-purple-300 bg-purple-50 ring-2 ring-purple-200'
                      : 'border-slate-200 hover:border-purple-200'
                  }`}
                  onClick={() => handleToggle(ref.proposal_id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex-shrink-0">
                            #{ref.rank}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-slate-900">
                                {ref.proposal_name}
                              </h4>
                              {ref.status === 'won' && (
                                <Badge className="bg-green-100 text-green-800">
                                  <Award className="w-3 h-3 mr-1" />
                                  Won
                                </Badge>
                              )}
                              {selectedIds.includes(ref.proposal_id) && (
                                <Badge className="bg-purple-600 text-white">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Selected
                                </Badge>
                              )}
                            </div>

                            {ref.agency_name && (
                              <p className="text-sm text-slate-600 mb-2">
                                {ref.agency_name}
                              </p>
                            )}

                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                              <span className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {ref.recommendation_reason}
                              </span>
                            </div>

                            <div className="flex items-center gap-4">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-slate-600">Confidence:</span>
                                      <div className="w-24">
                                        <Progress value={ref.confidence_score} className="h-2" />
                                      </div>
                                      <span className="text-xs font-semibold text-purple-600">
                                        {ref.confidence_score}%
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      <p>Quality Feedback: {ref.metadata.quality_feedback_count} uses</p>
                                      <p>Avg Rating: {ref.metadata.avg_quality_rating}⭐</p>
                                      {ref.metadata.section_specific_feedback > 0 && (
                                        <p>Section-specific: {ref.metadata.section_specific_feedback} times</p>
                                      )}
                                      <p>Age: {ref.metadata.months_old} months</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={selectedIds.length === 0}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Selection ({selectedIds.length})
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Award className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No reference recommendations available</p>
            <p className="text-sm text-slate-500 mt-1">
              Generate more content and provide quality feedback to improve recommendations
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}