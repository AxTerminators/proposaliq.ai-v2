import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Copy, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

/**
 * Citation Viewer
 * Generates and displays formal citations for AI-generated content
 */
export default function CitationViewer({ section }) {
  const [citationStyle, setCitationStyle] = useState('inline');
  const [citations, setCitations] = useState(null);

  const generateCitationsMutation = useMutation({
    mutationFn: async () => {
      const referenceIds = section.ai_reference_sources
        ?.filter(s => s.type === 'reference_proposal')
        .map(s => s.proposal_id) || [];

      const result = await base44.functions.invoke('generateCitations', {
        generated_content: section.content,
        reference_proposal_ids: referenceIds,
        section_type: section.section_type,
        semantic_chunk_ids: []
      });

      return result.data;
    },
    onSuccess: (data) => {
      if (data.status === 'success') {
        setCitations(data);
        toast.success('Citations generated', {
          description: `${data.citation_count} references found`
        });
      } else {
        throw new Error(data.error);
      }
    },
    onError: (error) => {
      toast.error('Failed to generate citations', {
        description: error.message
      });
    }
  });

  const handleCopyCitations = () => {
    if (!citations) return;

    const citationText = citationStyle === 'footnotes' || citationStyle === 'endnotes'
      ? citations.citation_footer
      : citations.citations.map(c => `${c.inline_marker} ${c.citation_text}`).join('\n');

    navigator.clipboard.writeText(citationText);
    toast.success('Citations copied to clipboard');
  };

  if (!section?.ai_reference_sources || section.ai_reference_sources.length === 0) {
    return null;
  }

  const hasReferences = section.ai_reference_sources.some(s => s.type === 'reference_proposal');

  if (!hasReferences) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BookOpen className="w-4 h-4" />
          Formal Citations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!citations ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-700">
              Generate formal citations for this AI-generated content to maintain transparency and traceability.
            </p>
            
            <div className="flex items-center gap-2">
              <Select value={citationStyle} onValueChange={setCitationStyle}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inline">Inline Citations [1], [2]</SelectItem>
                  <SelectItem value="footnotes">Footnotes</SelectItem>
                  <SelectItem value="endnotes">Endnotes</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                size="sm"
                onClick={() => generateCitationsMutation.mutate()}
                disabled={generateCitationsMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {generateCitationsMutation.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-3 h-3 mr-1" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-600 text-white">
                {citations.citation_count} Reference{citations.citation_count !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCitations}
                className="text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
            </div>

            {citationStyle === 'inline' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">
                  Insert these markers in your content:
                </p>
                <div className="flex flex-wrap gap-1">
                  {citations.citations.map((citation) => (
                    <Badge 
                      key={citation.citation_number}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-blue-100"
                      onClick={() => {
                        navigator.clipboard.writeText(citation.inline_marker);
                        toast.success('Marker copied');
                      }}
                    >
                      {citation.inline_marker}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded border p-3 max-h-64 overflow-y-auto">
              <div className="space-y-2 text-xs">
                {citations.citations.map((citation) => (
                  <div key={citation.citation_number} className="pb-2 border-b last:border-b-0">
                    <p className="font-semibold text-slate-900">
                      {citation.inline_marker} {citation.citation_text}
                    </p>
                    {citation.relevance_note && (
                      <p className="text-slate-600 mt-1 italic">
                        {citation.relevance_note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {citationStyle !== 'inline' && (
              <div className="bg-slate-50 rounded border p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  {citationStyle === 'footnotes' ? 'Footnote Format:' : 'Endnote Format:'}
                </p>
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {citations.citation_footer}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCitations(null)}
              className="w-full text-xs"
            >
              Regenerate with Different Style
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}