import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Eye } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * CitationIndicator Component
 * 
 * PHASE 4: Citation & Attribution System
 * 
 * Parses and displays citation references from AI-generated content.
 * Shows inline badges with tooltips explaining which reference was used.
 * 
 * Citation Format in Content:
 * "Our methodology follows proven approaches. [REF1: Technical Approach]"
 * 
 * This component:
 * - Detects citation patterns: [REF#: Section Name]
 * - Renders visual indicators
 * - Provides click-to-view-source functionality
 * - Helps with transparency and audit trails
 */
export default function CitationIndicator({ 
  content,
  referenceSources = [], // From RAG metadata
  onViewSource
}) {
  if (!content) return null;

  // Parse citations from content
  const citationRegex = /\[REF(\d+):\s*([^\]]+)\]/g;
  const citations = [];
  let match;

  while ((match = citationRegex.exec(content)) !== null) {
    const refNumber = parseInt(match[1]);
    const sectionName = match[2].trim();
    
    // Find the source
    const source = referenceSources.find(s => s.reference_number === refNumber);
    
    citations.push({
      refNumber,
      sectionName,
      fullMatch: match[0],
      source: source || null
    });
  }

  if (citations.length === 0) {
    return null;
  }

  // Get unique citations
  const uniqueCitations = citations.reduce((acc, cit) => {
    const key = `${cit.refNumber}-${cit.sectionName}`;
    if (!acc.find(c => `${c.refNumber}-${c.sectionName}` === key)) {
      acc.push(cit);
    }
    return acc;
  }, []);

  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-2 mb-2">
        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">
            References Used ({uniqueCitations.length})
          </p>
          <p className="text-xs text-blue-700">
            This content draws from the following sources
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {uniqueCitations.map((citation, idx) => (
          <TooltipProvider key={idx}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  className={cn(
                    "cursor-pointer hover:shadow-md transition-all",
                    citation.source 
                      ? "bg-blue-100 text-blue-800 border-blue-300" 
                      : "bg-slate-100 text-slate-600 border-slate-300"
                  )}
                  onClick={() => onViewSource && citation.source && onViewSource(citation.source.proposal_id, citation.sectionName)}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  REF{citation.refNumber}: {citation.sectionName}
                  {onViewSource && citation.source && (
                    <ExternalLink className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {citation.source ? (
                  <div className="text-xs space-y-1">
                    <p className="font-semibold">{citation.source.proposal_name}</p>
                    <p className="text-slate-300">Status: {citation.source.status}</p>
                    {citation.source.agency && (
                      <p className="text-slate-300">Agency: {citation.source.agency}</p>
                    )}
                    <p className="text-blue-300 mt-2">Click to view original</p>
                  </div>
                ) : (
                  <p className="text-xs">Reference information unavailable</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      {onViewSource && (
        <p className="text-xs text-blue-700 mt-2">
          💡 Click any citation to view the original source content
        </p>
      )}
    </div>
  );
}