import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { FileText, Database, BookOpen, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AI Sources Viewer
 * Displays transparency information about what sources were used for AI generation
 */
export default function AISourcesViewer({ section }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!section?.ai_reference_sources || section.ai_reference_sources.length === 0) {
    return null;
  }

  const sources = section.ai_reference_sources;
  const metadata = section.ai_generation_metadata || {};
  
  // Group sources by type
  const solicitationSources = sources.filter(s => s.type === 'solicitation');
  const referenceSources = sources.filter(s => s.type === 'reference_proposal');
  const librarySources = sources.filter(s => s.type === 'content_library');

  const getSourceIcon = (type) => {
    switch (type) {
      case 'solicitation': return <FileText className="w-4 h-4" />;
      case 'reference_proposal': return <Database className="w-4 h-4" />;
      case 'content_library': return <BookOpen className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getSourceColor = (type) => {
    switch (type) {
      case 'solicitation': return 'bg-blue-100 text-blue-700';
      case 'reference_proposal': return 'bg-purple-100 text-purple-700';
      case 'content_library': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Info className="w-4 h-4" />
          Show Sources ({sources.length})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>AI Generation Sources</SheetTitle>
          <SheetDescription>
            {section.ai_context_summary || 'Sources used to generate this content'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Generation Metadata */}
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Generation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {metadata.generated_at && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Generated:</span>
                  <span className="font-medium">{new Date(metadata.generated_at).toLocaleString()}</span>
                </div>
              )}
              {metadata.ai_config_name && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Configuration:</span>
                  <span className="font-medium">{metadata.ai_config_name}</span>
                </div>
              )}
              {metadata.llm_provider && (
                <div className="flex justify-between">
                  <span className="text-slate-600">LLM Provider:</span>
                  <span className="font-medium capitalize">{metadata.llm_provider}</span>
                </div>
              )}
              {metadata.estimated_tokens_used && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Tokens Used:</span>
                  <span className="font-medium">~{metadata.estimated_tokens_used.toLocaleString()}</span>
                </div>
              )}
              {metadata.confidence_score && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Confidence Score:</span>
                  <Badge className={cn(
                    metadata.confidence_score >= 80 ? 'bg-green-500' :
                    metadata.confidence_score >= 60 ? 'bg-amber-500' :
                    'bg-red-500'
                  )}>
                    {metadata.confidence_score}%
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Solicitation Sources */}
          {solicitationSources.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Solicitation Documents ({solicitationSources.length})
              </h3>
              <div className="space-y-2">
                {solicitationSources.map((source, idx) => (
                  <Card key={idx} className="border-blue-200">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{source.name}</p>
                          {source.document_type && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {source.document_type.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          Weight: {source.weight}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Reference Proposals */}
          {referenceSources.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-600" />
                Reference Proposals ({referenceSources.length})
              </h3>
              <div className="space-y-2">
                {referenceSources.map((source, idx) => (
                  <Card key={idx} className="border-purple-200">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">Proposal ID: {source.proposal_id?.substring(0, 8)}...</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {source.sections_count} section{source.sections_count !== 1 ? 's' : ''} referenced
                          </p>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          Weight: {source.weight}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Content Library Sources */}
          {librarySources.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                Content Library ({librarySources.length})
              </h3>
              <div className="space-y-2">
                {librarySources.map((source, idx) => (
                  <Card key={idx} className="border-amber-200">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{source.title}</p>
                          {source.category && (
                            <Badge variant="outline" className="mt-1 text-xs capitalize">
                              {source.category.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {source.usage_count > 0 && (
                            <p className="text-xs text-slate-600 mt-1">
                              Used {source.usage_count} time{source.usage_count !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                          Weight: {source.weight}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Context Summary */}
          {metadata.context_truncated && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-900">
                <strong>Context Truncated:</strong> Some sources were truncated to fit token limits.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}