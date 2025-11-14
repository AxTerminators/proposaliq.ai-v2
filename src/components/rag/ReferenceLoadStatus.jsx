import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  RefreshCw,
  TrendingUp,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * ReferenceLoadStatus Component
 * 
 * Displays detailed status of reference proposal loading for RAG.
 * Shows which references loaded successfully, which failed, and why.
 * Provides retry functionality for failed references.
 * 
 * Purpose: Surface errors to users so they understand context quality
 */
export default function ReferenceLoadStatus({ 
  metadata,
  onRetryFailed,
  isRetrying = false
}) {
  if (!metadata) return null;

  const {
    total_references = 0,
    references_included = 0,
    references_failed = 0,
    parse_errors = [],
    sources = [],
    estimated_tokens = 0,
    max_tokens = 30000,
    token_utilization_percentage = 0,
    truncated = false,
    section_type_filter = null
  } = metadata;

  const hasErrors = references_failed > 0;
  const allLoaded = references_included === total_references && !hasErrors;

  return (
    <Card className={cn(
      "border-2",
      allLoaded && "border-green-200 bg-green-50",
      hasErrors && "border-amber-200 bg-amber-50"
    )}>
      <CardContent className="p-4 space-y-3">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {allLoaded ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            )}
            <div>
              <p className="font-semibold text-slate-900">
                {allLoaded 
                  ? `✓ All ${references_included} references loaded successfully`
                  : `${references_included} of ${total_references} references loaded`
                }
              </p>
              <p className="text-xs text-slate-600">
                {estimated_tokens.toLocaleString()} tokens (~{Math.round(estimated_tokens * 4 / 1024)}KB)
                {section_type_filter && ` • Filtered to ${section_type_filter.replace('_', ' ')}`}
              </p>
            </div>
          </div>

          {/* Token Utilization Badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  className={cn(
                    token_utilization_percentage > 90 ? "bg-red-100 text-red-700" :
                    token_utilization_percentage > 70 ? "bg-amber-100 text-amber-700" :
                    "bg-green-100 text-green-700"
                  )}
                >
                  {token_utilization_percentage}% capacity
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Using {estimated_tokens.toLocaleString()} of {max_tokens.toLocaleString()} available tokens
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Token Usage Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Token Usage</span>
            <span>{estimated_tokens.toLocaleString()} / {max_tokens.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all",
                token_utilization_percentage > 90 ? "bg-red-500" :
                token_utilization_percentage > 70 ? "bg-amber-500" :
                "bg-green-500"
              )}
              style={{ width: `${Math.min(token_utilization_percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Loaded References List */}
        {sources.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">Loaded References:</p>
            <div className="space-y-1">
              {sources.map((source, idx) => (
                <div 
                  key={source.proposal_id}
                  className="flex items-center justify-between text-xs bg-white rounded-md p-2 border"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-3 h-3 text-green-600 flex-shrink-0" />
                    <span className="text-slate-900 truncate">{source.proposal_name}</span>
                    {source.status === 'won' && (
                      <Badge className="bg-green-100 text-green-700 text-xs">Won</Badge>
                    )}
                  </div>
                  {source.relevance_score !== undefined && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {source.relevance_score}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs space-y-1">
                            <p className="font-semibold">Relevance: {source.relevance_score}/100</p>
                            {source.relevance_reasons?.map((reason, i) => (
                              <p key={i}>• {reason}</p>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parse Errors (if any) */}
        {hasErrors && parse_errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-900">Failed to Load:</p>
              {onRetryFailed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetryFailed}
                  disabled={isRetrying}
                  className="h-7 text-xs"
                >
                  <RefreshCw className={cn("w-3 h-3 mr-1", isRetrying && "animate-spin")} />
                  Retry
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {parse_errors.map((error, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-2 text-xs bg-amber-50 rounded-md p-2 border border-amber-200"
                >
                  <AlertCircle className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-amber-900 font-medium">Reference {idx + 1}</p>
                    <p className="text-amber-700 text-xs">{error.error}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Truncation Warning */}
        {truncated && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-semibold">Context truncated to fit token limit</p>
              <p>Some references were partially excluded. Consider reducing reference count or using section-type filtering.</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {allLoaded && !truncated && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-900">
              All references loaded successfully • {token_utilization_percentage}% token capacity used
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}