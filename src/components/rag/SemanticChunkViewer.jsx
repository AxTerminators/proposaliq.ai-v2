import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, CheckCircle2, Copy, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * SemanticChunkViewer Component
 * 
 * PHASE 7: Displays semantic search results
 * 
 * Shows relevant paragraph-level chunks from past proposals.
 * Each chunk includes context, relevance score, and source proposal info.
 */
export default function SemanticChunkViewer({ 
  chunks = [],
  onCopyChunk,
  onViewFullSection
}) {
  if (chunks.length === 0) {
    return null;
  }

  const handleCopy = (chunk) => {
    navigator.clipboard.writeText(chunk.chunk_text);
    toast.success('Chunk copied to clipboard');
    if (onCopyChunk) onCopyChunk(chunk);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-slate-700">
          Relevant Content ({chunks.length} chunks)
        </p>
        <Badge variant="outline" className="text-xs">
          Paragraph-level precision
        </Badge>
      </div>

      {chunks.map((chunk, idx) => (
        <Card 
          key={chunk.id || idx}
          className="border-l-4 border-l-blue-400 hover:shadow-md transition-all"
        >
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-900 mb-1">
                  {chunk.parent_proposal?.proposal_name || 'Unknown Proposal'}
                </p>
                <p className="text-xs text-slate-600 mb-2">
                  {chunk.chunk_summary}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge className="bg-blue-100 text-blue-800 text-xs cursor-help">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {chunk.relevance_score}% relevant
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">Why this is relevant:</p>
                          {chunk.relevance_reasons?.map((reason, i) => (
                            <p key={i}>• {reason}</p>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {chunk.parent_proposal?.status === 'won' && (
                    <Badge className="bg-green-600 text-white text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Won
                    </Badge>
                  )}

                  {chunk.section_type && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {chunk.section_type.replace('_', ' ')}
                    </Badge>
                  )}

                  <Badge variant="outline" className="text-xs">
                    {chunk.word_count} words
                  </Badge>
                </div>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCopy(chunk)}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                {onViewFullSection && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewFullSection(chunk.section_id)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Chunk Content */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {chunk.chunk_text}
              </p>
            </div>

            {/* Keywords */}
            {chunk.keywords?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {chunk.keywords.slice(0, 5).map((keyword, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}

            {/* Source Info */}
            {chunk.parent_proposal && (
              <div className="text-xs text-slate-500 mt-2 pt-2 border-t">
                Source: {chunk.parent_proposal.proposal_name}
                {chunk.parent_proposal.agency_name && (
                  <> • {chunk.parent_proposal.agency_name}</>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}