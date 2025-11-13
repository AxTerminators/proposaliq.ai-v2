import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Upload, Loader2, X, RefreshCw, Copy, Check, FileText, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AIWritingAssistant({
  onContentGenerated,
  sectionType = "",
  contextData = {},
  existingContent = "",
  proposalId = null // NEW: Pass proposal ID to enable RAG
}) {
  const [prompt, setPrompt] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedContent, setGeneratedContent] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [copiedContent, setCopiedContent] = React.useState(false);
  const fileInputRef = React.useRef(null);

  // RAG state
  const [isLoadingContext, setIsLoadingContext] = React.useState(false);
  const [referenceContext, setReferenceContext] = React.useState(null);
  const [currentProposal, setCurrentProposal] = React.useState(null);

  /**
   * Load proposal and check for reference proposals on mount
   */
  React.useEffect(() => {
    if (proposalId) {
      loadProposalContext();
    }
  }, [proposalId]);

  /**
   * Load proposal and build RAG context if reference proposals exist
   */
  const loadProposalContext = async () => {
    try {
      setIsLoadingContext(true);
      
      // Fetch the current proposal
      const proposal = await base44.entities.Proposal.get(proposalId);
      setCurrentProposal(proposal);

      // Check if reference proposals are linked
      if (proposal.reference_proposal_ids && proposal.reference_proposal_ids.length > 0) {
        console.log('[AIWritingAssistant] 📚 Found reference proposals:', proposal.reference_proposal_ids);
        
        // Call buildProposalContext to get RAG-ready context
        const contextResult = await base44.functions.invoke('buildProposalContext', {
          current_proposal_id: proposalId,
          reference_proposal_ids: proposal.reference_proposal_ids,
          max_tokens: 8000,
          prioritize_winning: true
        });

        if (contextResult.data?.status === 'success') {
          setReferenceContext(contextResult.data);
          console.log('[AIWritingAssistant] ✅ Context loaded:', contextResult.data.metadata);
          toast.success(`Loaded context from ${contextResult.data.metadata.references_included} reference proposal(s)`);
        } else {
          console.warn('[AIWritingAssistant] ⚠️ Failed to load context:', contextResult.data?.error);
        }
      } else {
        console.log('[AIWritingAssistant] ℹ️ No reference proposals linked');
      }
    } catch (error) {
      console.error('[AIWritingAssistant] ❌ Error loading context:', error);
      toast.error('Failed to load reference context: ' + error.message);
    } finally {
      setIsLoadingContext(false);
    }
  };

  /**
   * Handle document upload to provide context to AI
   * Now supports DOCX files for richer context extraction
   */
  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type - Now includes DOCX
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword', // DOC
      'text/plain' // TXT
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

      // Extract text from document for context
      let documentText = '';

      if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'application/msword') {
        // Use DOCX parser for Word documents
        toast.info('Extracting text from Word document...');
        const result = await base44.functions.invoke('parseDocxFile', {
          file_url,
          extract_structured_data: false
        });

        if (result.data?.status === 'success' && result.data.text_content) {
          documentText = result.data.text_content;
        } else {
          console.warn('parseDocxFile did not return expected content, falling back to generic LLM analysis.');
          toast.warning('Could not extract text with DOCX parser, trying generic analysis...');
          documentText = await base44.integrations.Core.InvokeLLM({
            prompt: "Extract all text content from this document. Return only the text, no formatting or metadata.",
            file_urls: [file_url]
          });
        }
      } else {
        // For other file types, use InvokeLLM with file attachment
        toast.info('Analyzing document...');
        documentText = await base44.integrations.Core.InvokeLLM({
          prompt: "Extract all text content from this document. Return only the text, no formatting or metadata.",
          file_urls: [file_url]
        });
      }

      if (documentText) {
        // Append document context to the prompt
        const contextPrompt = `\n\n[Context from uploaded document "${file.name}":]:\n${documentText.substring(0, 10000)}`; // Limit to 10k chars
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

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt or upload a document');
      return;
    }

    setIsGenerating(true);
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
        console.log('[AIWritingAssistant] 📖 Using RAG context with', referenceContext.metadata.references_included, 'references');
      }

      fullPrompt += `User Request:
${prompt}

Please generate professional, compelling content that:
1. Addresses the request clearly and comprehensively
2. Uses formal, professional tone appropriate for government proposals
3. Includes specific details and quantifiable results when possible
4. Follows proper formatting with headers, bullet points, and paragraphs
5. Is ready to be inserted into the proposal document
${referenceContext ? '6. When appropriate, note which reference approaches or structures influenced the content' : ''}

Generate the content now:`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        add_context_from_internet: false
      });

      setGeneratedContent(result);
      
      // Store generation metadata for audit trail
      if (onContentGenerated && typeof onContentGenerated === 'function') {
        // Pass metadata along with content
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
            generated_at: new Date().toISOString()
          }
        };
        
        // Store metadata for later use when inserting content
        setGeneratedContent(result);
        (window as any).__lastAIMetadata = metadata;
      }
      
      toast.success('Content generated successfully!');
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

  const handleInsertContent = () => {
    // Pass content and metadata to parent
    if (typeof onContentGenerated === 'function') {
      const metadata = (window as any).__lastAIMetadata || {};
      onContentGenerated(generatedContent, metadata);
    } else {
      onContentGenerated(generatedContent);
    }
    
    toast.success('Content inserted into editor');
    setGeneratedContent("");
    setPrompt("");
    
    // Clear metadata
    delete (window as any).__lastAIMetadata;
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  return (
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
                      </p>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Loading Context Indicator */}
        {isLoadingContext && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-sm text-blue-900">Loading reference proposals context...</p>
          </div>
        )}

        {/* Reference Context Info */}
        {referenceContext && !isLoadingContext && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900 mb-1">
                  AI will reference {referenceContext.metadata.references_included} past proposal{referenceContext.metadata.references_included !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-green-800">
                  {referenceContext.metadata.sources.map(s => s.proposal_name).join(', ')}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  ~{referenceContext.metadata.estimated_tokens.toLocaleString()} tokens of context loaded
                  {referenceContext.metadata.truncated && ' (truncated to fit limits)'}
                </p>
              </div>
            </div>
          </div>
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

            <div className="bg-slate-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {generatedContent}
              </div>
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
                  delete (window as any).__lastAIMetadata;
                }}
                variant="outline"
              >
                <X className="w-4 h-4 mr-2" />
                Discard
              </Button>
            </div>
          </div>
        )}

        {/* Helper Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-blue-900 mb-1">💡 Tips for better results:</p>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            <li>Be specific about what you want to write</li>
            <li>Upload reference documents for richer context</li>
            {referenceContext && <li>The AI is using {referenceContext.metadata.references_included} past proposal(s) as reference</li>}
            <li>Mention specific examples or details to include</li>
            <li>Review and edit generated content before inserting</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}