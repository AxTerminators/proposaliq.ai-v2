import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Upload, Loader2, X, RefreshCw, Copy, Check, FileText, Info, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import ContentQualityRating from "../rag/ContentQualityRating";
import ReferenceLoadStatus from "../rag/ReferenceLoadStatus";
import TokenBudgetVisualizer from "../rag/TokenBudgetVisualizer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * AIWritingAssistant Component - ENHANCED v2.0
 * 
 * ENHANCEMENTS:
 * ✅ Section-type aware RAG
 * ✅ Intelligent token management
 * ✅ Error surfacing and retry
 * ✅ Quality feedback collection
 * ✅ Token usage visualization
 * ✅ Performance tracking
 */
export default function AIWritingAssistant({
  onContentGenerated,
  sectionType = "",
  sectionId = null, // NEW: For quality feedback
  contextData = {},
  existingContent = "",
  proposalId = null
}) {
  const [prompt, setPrompt] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedContent, setGeneratedContent] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [copiedContent, setCopiedContent] = React.useState(false);
  const fileInputRef = React.useRef(null);

  // RAG state - ENHANCED
  const [isLoadingContext, setIsLoadingContext] = React.useState(false);
  const [referenceContext, setReferenceContext] = React.useState(null);
  const [currentProposal, setCurrentProposal] = React.useState(null);
  const [contextLoadError, setContextLoadError] = React.useState(null);

  // Quality feedback state - NEW
  const [showQualityRating, setShowQualityRating] = React.useState(false);
  const [generationStartTime, setGenerationStartTime] = React.useState(null);
  const [generationTime, setGenerationTime] = React.useState(0);

  // LLM provider (would come from subscription/settings in real app)
  const [llmProvider] = React.useState('gemini');

  /**
   * Load proposal and check for reference proposals on mount
   * ENHANCED: Now includes error handling and retry capability
   */
  React.useEffect(() => {
    if (proposalId) {
      loadProposalContext();
    }
  }, [proposalId]);

  /**
   * Load proposal and build RAG context if reference proposals exist
   * ENHANCED: Section-type filtering + better error handling
   */
  const loadProposalContext = async (retryFailedOnly = false) => {
    try {
      setIsLoadingContext(true);
      setContextLoadError(null);
      
      // Fetch the current proposal
      const proposal = await base44.entities.Proposal.get(proposalId);
      setCurrentProposal(proposal);

      // Check if reference proposals are linked
      if (proposal.reference_proposal_ids && proposal.reference_proposal_ids.length > 0) {
        console.log('[AIWritingAssistant] 📚 Found reference proposals:', proposal.reference_proposal_ids);
        
        // NEW: Call buildProposalContext with section-type filtering
        const contextResult = await base44.functions.invoke('buildProposalContext', {
          current_proposal_id: proposalId,
          reference_proposal_ids: proposal.reference_proposal_ids,
          target_section_type: sectionType || null, // ⭐ SECTION-TYPE FILTERING
          llm_provider: llmProvider, // ⭐ INTELLIGENT TOKEN LIMITS
          prioritize_winning: true,
          include_documents: true,
          include_resources: true
        });

        if (contextResult.data?.status === 'success') {
          setReferenceContext(contextResult.data);
          console.log('[AIWritingAssistant] ✅ Context loaded:', contextResult.data.metadata);
          
          // Show appropriate toast based on results
          if (contextResult.data.metadata.references_failed > 0) {
            toast.warning(
              `Loaded ${contextResult.data.metadata.references_included} references, ${contextResult.data.metadata.references_failed} failed`,
              { description: 'Check status panel for details' }
            );
          } else {
            toast.success(
              `✓ Context loaded from ${contextResult.data.metadata.references_included} reference(s)`,
              { description: `${contextResult.data.metadata.estimated_tokens.toLocaleString()} tokens ready` }
            );
          }
        } else {
          setContextLoadError(contextResult.data?.error || 'Failed to load context');
          toast.error('Failed to load reference context');
        }
      } else {
        console.log('[AIWritingAssistant] ℹ️ No reference proposals linked');
      }
    } catch (error) {
      console.error('[AIWritingAssistant] ❌ Error loading context:', error);
      setContextLoadError(error.message);
      toast.error('Failed to load reference context: ' + error.message);
    } finally {
      setIsLoadingContext(false);
    }
  };

  // NEW: Retry failed references
  const handleRetryFailedReferences = () => {
    loadProposalContext(true);
  };

  /**
   * Handle document upload to provide context to AI
   * ENHANCED: Better error handling and user feedback
   */
  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, Word document (DOCX), image, text, or CSV file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);

    try {
      toast.info('Uploading document for context...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      let documentText = '';

      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword') {
        toast.info('Extracting text from Word document...');
        const result = await base44.functions.invoke('parseDocxFile', {
          file_url,
          extract_structured_data: false
        });

        if (result.data?.status === 'success' && result.data.text_content) {
          documentText = result.data.text_content;
        } else {
          console.warn('parseDocxFile failed, falling back to generic LLM analysis.');
          toast.warning('Could not extract text with DOCX parser, trying generic analysis...');
          documentText = await base44.integrations.Core.InvokeLLM({
            prompt: "Extract all text content from this document. Return only the text, no formatting or metadata.",
            file_urls: [file_url]
          });
        }
      } else {
        toast.info('Analyzing document...');
        documentText = await base44.integrations.Core.InvokeLLM({
          prompt: "Extract all text content from this document. Return only the text, no formatting or metadata.",
          file_urls: [file_url]
        });
      }

      if (documentText) {
        const contextPrompt = `\n\n[Context from uploaded document "${file.name}"]:\n${documentText.substring(0, 10000)}`;
        setPrompt(prev => prev + contextPrompt);
        toast.success('Document context added to prompt!');
      } else {
        toast.error('Could not extract text from document');
      }

    } catch (error) {
      console.error('Document upload error:', error);
      toast.error('Failed to process document: ' + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Generate content with RAG
   * ENHANCED: Performance tracking for quality feedback
   */
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt or upload a document');
      return;
    }

    setIsGenerating(true);
    setGenerationStartTime(Date.now()); // Track performance

    try {
      // Build the full prompt with optional RAG context
      let fullPrompt = `You are writing a ${sectionType || 'proposal section'} for a government proposal.

${existingContent ? `Existing content:\n${existingContent}\n\n` : ''}

Context:
${JSON.stringify(contextData, null, 2)}

`;

      // ===== RAG INTEGRATION: Add reference context if available =====
      if (referenceContext?.context?.formatted_prompt_context) {
        fullPrompt += `\n${referenceContext.context.formatted_prompt_context}\n\n`;
        console.log('[AIWritingAssistant] 📖 Using RAG context:', {
          references: referenceContext.metadata.references_included,
          tokens: referenceContext.metadata.estimated_tokens,
          section_filter: referenceContext.metadata.section_type_filter
        });
      }

      fullPrompt += `User Request:
${prompt}

Please generate professional, compelling content that:
1. Addresses the request clearly and comprehensively
2. Uses formal, professional tone appropriate for government proposals
3. Includes specific details and quantifiable results when possible
4. Follows proper formatting with headers, bullet points, and paragraphs
5. Is ready to be inserted into the proposal document
${referenceContext ? '6. When a reference significantly influenced an approach, note it like: [Based on Reference 1\'s methodology]' : ''}

Generate the content now:`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false
      });

      const endTime = Date.now();
      const timeTaken = (endTime - generationStartTime) / 1000;
      setGenerationTime(timeTaken);

      setGeneratedContent(result);
      
      // Store generation metadata for quality feedback
      if (onContentGenerated && typeof onContentGenerated === 'function') {
        const metadata = {
          ai_prompt_used: prompt,
          ai_reference_sources: referenceContext?.metadata?.sources?.map(s => s.proposal_id) || [],
          ai_context_summary: referenceContext 
            ? `Referenced ${referenceContext.metadata.references_included} past proposal(s): ${referenceContext.metadata.sources.map(s => s.proposal_name).join(', ')}`
            : null,
          ai_generation_metadata: {
            estimated_tokens_used: referenceContext?.metadata?.estimated_tokens || 0,
            reference_proposals_count: referenceContext?.metadata?.references_included || 0,
            context_truncated: referenceContext?.metadata?.truncated || false,
            generated_at: new Date().toISOString(),
            section_type_filter: referenceContext?.metadata?.section_type_filter,
            llm_provider: llmProvider,
            generation_time_seconds: timeTaken
          }
        };
        
        window.__lastAIMetadata = metadata;
      }
      
      toast.success('Content generated successfully!', {
        description: `${result.split(/\s+/).length} words in ${timeTaken.toFixed(1)}s`
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate content: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopiedContent(true);
    toast.success('Content copied to clipboard');
    setTimeout(() => setCopiedContent(false), 2000);
  };

  /**
   * Insert content and trigger quality feedback
   * NEW: Show quality rating dialog after insertion
   */
  const handleInsertContent = () => {
    // Pass content and metadata to parent
    if (typeof onContentGenerated === 'function') {
      const metadata = window.__lastAIMetadata || {};
      onContentGenerated(generatedContent, metadata);
    } else {
      onContentGenerated(generatedContent);
    }
    
    toast.success('Content inserted into editor');
    
    // NEW: Show quality rating dialog
    if (proposalId && sectionId) {
      setShowQualityRating(true);
    } else {
      // Clean up if no quality feedback
      setGeneratedContent("");
      setPrompt("");
      delete window.__lastAIMetadata;
    }
  };

  const handleQualityFeedbackComplete = (rating) => {
    console.log('[AIWritingAssistant] Quality rating received:', rating);
    
    // Clean up
    setGeneratedContent("");
    setPrompt("");
    delete window.__lastAIMetadata;
    setShowQualityRating(false);
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
    <>
      <Card className="border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <Sparkles className="w-5 h-5" />
            AI Writing Assistant
            {referenceContext && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-300 ml-2">
                      <FileText className="w-3 h-3 mr-1" />
                      {referenceContext.metadata.references_included} Reference{referenceContext.metadata.references_included !== 1 ? 's' : ''}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1 max-w-xs">
                      <p className="font-semibold">Using reference proposals:</p>
                      {referenceContext.metadata.sources.map((source, idx) => (
                        <p key={idx} className="text-xs">
                          • {source.proposal_name} ({source.status})
                          {source.relevance_score !== undefined && ` - ${source.relevance_score}% relevant`}
                        </p>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {sectionType && (
              <Badge variant="outline" className="ml-auto text-xs">
                {sectionType.replace('_', ' ')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Loading Context Indicator */}
          {isLoadingContext && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Loading reference context...</p>
                {sectionType && (
                  <p className="text-xs text-blue-700">Filtering to {sectionType.replace('_', ' ')} sections</p>
                )}
              </div>
            </div>
          )}

          {/* Context Load Error */}
          {contextLoadError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Failed to load reference context</p>
                <p className="text-xs text-red-700 mt-1">{contextLoadError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadProposalContext()}
                  className="mt-2 h-7 text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Reference Load Status - NEW COMPONENT */}
          {referenceContext && !isLoadingContext && (
            <ReferenceLoadStatus
              metadata={referenceContext.metadata}
              onRetryFailed={referenceContext.metadata.references_failed > 0 ? handleRetryFailedReferences : null}
            />
          )}

          {/* Token Budget Visualizer - NEW COMPONENT */}
          {referenceContext && !isLoadingContext && (
            <TokenBudgetVisualizer
              metadata={referenceContext.metadata}
              compact={false}
            />
          )}

          {/* Upload Context Document */}
          <div>
            <Label>Upload Context Document (Optional)</Label>
            <p className="text-xs text-slate-600 mb-2">
              Upload a document to provide additional context to the AI (e.g., RFP section, reference material)
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              variant="outline"
              className="w-full border-blue-300 hover:bg-blue-50"
              size="sm"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document for Context
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.csv,.docx,.doc,.txt"
              onChange={handleDocumentUpload}
              className="hidden"
            />
            <p className="text-xs text-slate-500 mt-1">
              Supported: PDF, Word (DOCX/DOC), Images, Text, CSV
            </p>
          </div>

          {/* Prompt Input */}
          <div>
            <Label>What would you like me to write?</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="E.g., 'Write a technical approach section focusing on our cloud migration methodology' or 'Expand on our cybersecurity capabilities with specific examples'"
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || isLoadingContext}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Content
                {referenceContext && (
                  <Badge className="ml-2 bg-purple-800 text-white text-xs">
                    +{referenceContext.metadata.references_included} refs
                  </Badge>
                )}
              </>
            )}
          </Button>

          {/* Generated Content Display */}
          {generatedContent && (
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Generated Content</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Regenerate
                  </Button>
                  <Button
                    onClick={handleCopyContent}
                    variant="outline"
                    size="sm"
                  >
                    {copiedContent ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto border">
                <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                  {generatedContent}
                </div>
              </div>

              {/* Content Stats */}
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span>{generatedContent.split(/\s+/).length} words</span>
                {generationTime > 0 && <span>Generated in {generationTime.toFixed(1)}s</span>}
                {referenceContext && (
                  <span className="text-blue-600 font-medium">
                    Using {referenceContext.metadata.references_included} reference(s)
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleInsertContent}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Insert into Editor
                </Button>
                <Button
                  onClick={() => {
                    setGeneratedContent("");
                    setPrompt("");
                    delete window.__lastAIMetadata;
                  }}
                  variant="outline"
                >
                  <X className="w-4 h-4 mr-2" />
                  Discard
                </Button>
              </div>
            </div>
          )}

          {/* Helper Tips - ENHANCED */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-900 mb-1">💡 Tips for better results:</p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Be specific about what you want to write</li>
              <li>Upload reference documents for richer context</li>
              {referenceContext && (
                <li className="font-medium">
                  ✓ Using {referenceContext.metadata.references_included} reference proposal(s)
                  {referenceContext.metadata.section_type_filter && 
                    ` filtered to ${referenceContext.metadata.section_type_filter.replace('_', ' ')}`
                  }
                </li>
              )}
              {!referenceContext && proposalId && (
                <li className="text-amber-700">
                  💡 Link reference proposals in "Gather Resources" to enhance quality
                </li>
              )}
              <li>Mention specific examples or details to include</li>
              <li>Review and edit generated content before inserting</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Quality Rating Dialog - NEW */}
      <ContentQualityRating
        isOpen={showQualityRating}
        onClose={() => setShowQualityRating(false)}
        proposalId={proposalId}
        sectionId={sectionId}
        sectionType={sectionType}
        ragMetadata={{
          used_rag: referenceContext !== null,
          reference_count: referenceContext?.metadata?.references_included || 0,
          reference_ids: referenceContext?.metadata?.sources?.map(s => s.proposal_id) || [],
          estimated_tokens: referenceContext?.metadata?.estimated_tokens || 0,
          llm_provider: llmProvider
        }}
        generatedContent={generatedContent}
        promptUsed={prompt}
        generationTime={generationTime}
        onFeedbackSubmitted={handleQualityFeedbackComplete}
      />
    </>
  );
}