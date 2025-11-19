import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AI Confidence Indicator
 * Displays confidence score for AI-generated content with visual cues
 */
export default function AIConfidenceIndicator({ section, showDetails = true }) {
  const metadata = section?.ai_generation_metadata || {};
  const confidenceScore = metadata.confidence_score;

  if (!confidenceScore && confidenceScore !== 0) {
    return null;
  }

  // Determine confidence level
  const getConfidenceLevel = (score) => {
    if (score >= 80) return { label: 'High', color: 'bg-green-500', icon: CheckCircle2 };
    if (score >= 60) return { label: 'Medium', color: 'bg-amber-500', icon: TrendingUp };
    return { label: 'Low', color: 'bg-red-500', icon: AlertTriangle };
  };

  const level = getConfidenceLevel(confidenceScore);
  const Icon = level.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={cn("gap-2", level.color, "text-white cursor-help")}>
            <Icon className="w-3 h-3" />
            {showDetails && (
              <>
                {confidenceScore}% Confidence
                {level.label && ` (${level.label})`}
              </>
            )}
            {!showDetails && `${confidenceScore}%`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2 text-sm">
            <p className="font-semibold">AI Confidence Score: {confidenceScore}%</p>
            <p className="text-xs">
              {confidenceScore >= 80 && "High confidence - Good context and sources available"}
              {confidenceScore >= 60 && confidenceScore < 80 && "Medium confidence - Adequate context, may need review"}
              {confidenceScore < 60 && "Low confidence - Limited context, human review recommended"}
            </p>
            {metadata.reference_proposals_count > 0 && (
              <p className="text-xs text-slate-400">
                Based on {metadata.reference_proposals_count} reference proposal{metadata.reference_proposals_count !== 1 ? 's' : ''}
              </p>
            )}
            {metadata.context_truncated && (
              <p className="text-xs text-amber-600">
                ⚠️ Context was truncated to fit limits
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}