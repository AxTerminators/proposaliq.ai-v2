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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Database, BookOpen, ExternalLink, Info, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";

/**
 * AI Sources Viewer
 * Displays transparency information about what sources were used for AI generation
 */
export default function AISourcesViewer({ section }) {
  const [isOpen, setIsOpen] = useState(false);
  const [previewSource, setPreviewSource] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  if (!section?.ai_reference_sources || section.ai_reference_sources.length === 0) {
    return null;
  }

  const handlePreviewSource = async (source) => {
    if (source.type === 'reference_proposal' && source.full_content_available) {
      setLoadingPreview(true);
      try {
        // Fetch full section content
        const sections = await base44.entities.ProposalSection.filter({
          proposal_id: source.proposal_id,
          section_type: section.section_type
        });
        
        if (sections && sections.length > 0) {
          setPreviewSource({
            ...source,
            full_content: sections[0].content,
            section_name: sections[0].section_name
          });
        } else {
          setPreviewSource({
            ...source,
            full_content: source.excerpt_preview || 'Content not available',
            error: 'Full content not found'
          });
        }
      } catch (error) {
        setPreviewSource({
          ...source,
          full_content: source.excerpt_preview || 'Error loading content',
          error: error.message
        });
      } finally {
        setLoadingPreview(false);
      }
    } else if (source.excerpt_preview) {
      setPreviewSource(source);
    }
  };

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
                  <Card key={idx} className="border-purple-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {source.proposal_name || `Proposal ${source.proposal_id?.substring(0, 8)}...`}
                            </p>
                            {source.relevance_score && (
                              <Badge className="bg-green-100 text-green-700 text-xs mt-1">
                                {source.relevance_score}% match
                              </Badge>
                            )}
                            {source.relevance_reasons && source.relevance_reasons.length > 0 && (
                              <p className="text-xs text-slate-600 mt-1">
                                {source.relevance_reasons[0]}
                              </p>
                            )}
                          </div>
                          <Badge className="bg-purple-100 text-purple-700 text-xs flex-shrink-0">
                            Weight: {source.weight}
                          </Badge>
                        </div>
                        
                        {source.excerpt_preview && (
                          <div className="p-2 bg-slate-50 rounded text-xs text-slate-700 border">
                            {source.excerpt_preview}
                          </div>
                        )}
                        
                        {source.full_content_available && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewSource(source)}
                            className="w-full text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Full Content
                          </Button>
                        )}
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

      {/* Source Preview Dialog */}
      <Dialog open={!!previewSource} onOpenChange={() => setPreviewSource(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {previewSource?.proposal_name || 'Source Content'}
            </DialogTitle>
            <DialogDescription>
              {previewSource?.section_name || 'Referenced content from this proposal'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {loadingPreview ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Loading content...</p>
                </div>
              </div>
            ) : previewSource?.error ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded">
                <p className="text-sm text-amber-900">
                  ⚠️ {previewSource.error}
                </p>
                {previewSource.excerpt_preview && (
                  <div className="mt-3 p-3 bg-white rounded border text-xs">
                    {previewSource.excerpt_preview}
                  </div>
                )}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none p-4">
                <ReactMarkdown>
                  {previewSource?.full_content || previewSource?.excerpt_preview || 'No content available'}
                </ReactMarkdown>
              </div>
            )}
          </div>
          
          {previewSource?.relevance_reasons && previewSource.relevance_reasons.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs font-semibold text-slate-700 mb-1">Why this was used:</p>
              <div className="flex flex-wrap gap-1">
                {previewSource.relevance_reasons.map((reason, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {reason}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}