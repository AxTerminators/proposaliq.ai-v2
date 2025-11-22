import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import TokenBudgetMonitor from "./TokenBudgetMonitor";
import QualityCheckModal from "./QualityCheckModal";
import SmartReferenceSelector from "./SmartReferenceSelector";

/**
 * AI Generation Modal
 * Allows users to manually trigger AI content generation with custom parameters
 */
export default function AIGenerationModal({ isOpen, onClose, proposal, onSuccess }) {
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState("executive_summary");
  const [customTone, setCustomTone] = useState("");
  const [customWordCountMin, setCustomWordCountMin] = useState("");
  const [customWordCountMax, setCustomWordCountMax] = useState("");
  const [additionalContext, setAdditionalContext] = useState("");
  const [useCustomSettings, setUseCustomSettings] = useState(false);
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  const [showPreCheck, setShowPreCheck] = useState(false);
  const [preCheckResults, setPreCheckResults] = useState({});
  const [localReferenceIds, setLocalReferenceIds] = useState([]);
  const [showReferenceSelector, setShowReferenceSelector] = useState(false);

  // Fetch AI configuration to show defaults
  const { data: aiConfig } = useQuery({
    queryKey: ['aiConfiguration', proposal?.organization_id],
    queryFn: async () => {
      if (!proposal?.organization_id) return null;
      
      // Try to get org-specific config
      const orgConfigs = await base44.entities.AiConfiguration.filter({
        organization_id: proposal.organization_id,
        is_active: true
      });
      
      if (orgConfigs && orgConfigs.length > 0) {
        return orgConfigs[0];
      }
      
      // Fallback to global default
      const globalConfigs = await base44.entities.AiConfiguration.filter({
        is_global_default: true,
        is_active: true
      });
      
      return globalConfigs?.[0] || null;
    },
    enabled: isOpen && !!proposal?.organization_id,
  });

  // Initialize local reference IDs from proposal
  useEffect(() => {
    if (proposal && isOpen) {
      setLocalReferenceIds(proposal.reference_proposal_ids || []);
    }
  }, [proposal, isOpen]);

  // Fetch supplementary document count for display
  const { data: suppDocsSummary } = useQuery({
    queryKey: ['suppDocs', proposal?.id],
    queryFn: async () => {
      const docs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposal.id,
        rag_ingested: true
      });
      
      const supplementary = docs.filter(d => d.is_supplementary);
      const amendments = supplementary.filter(d => d.supplementary_type === 'amendment');
      const qas = supplementary.filter(d => d.supplementary_type === 'q_a_response');
      
      return {
        total: docs.length,
        supplementary: supplementary.length,
        amendments: amendments.length,
        qas: qas.length,
        base: docs.length - supplementary.length
      };
    },
    enabled: isOpen && !!proposal?.id,
  });

  // Calculate token estimate
  useEffect(() => {
    if (!proposal || !isOpen) return;

    const calculateTokens = async () => {
      try {
        let tokens = 500; // Base prompt
        const refCount = localReferenceIds.length;
        tokens += refCount * 1000;

        const docs = await base44.entities.SolicitationDocument.filter({
          proposal_id: proposal.id
        });
        // Supplementary docs get higher token allocation
        const suppCount = docs.filter(d => d.is_supplementary).length;
        tokens += suppCount * 800 + (docs.length - suppCount) * 400;

        if (additionalContext) {
          tokens += Math.ceil(additionalContext.length / 4);
        }

        setEstimatedTokens(tokens);
      } catch (error) {
        console.error('Error calculating tokens:', error);
      }
    };

    calculateTokens();
  }, [proposal, isOpen, additionalContext, localReferenceIds]);

  const handleInitiateGeneration = async () => {
    const solDocs = await base44.entities.SolicitationDocument.filter({
      proposal_id: proposal.id
    });

    // Update proposal with selected references before generation
    if (localReferenceIds.length !== (proposal.reference_proposal_ids?.length || 0)) {
      await base44.entities.Proposal.update(proposal.id, {
        reference_proposal_ids: localReferenceIds
      });
    }

    const checkResults = {
      hasReferences: localReferenceIds.length > 0,
      hasSolicitation: solDocs.length > 0,
      hasAiConfig: !!aiConfig,
      withinTokenBudget: estimatedTokens <= 8000
    };

    setPreCheckResults(checkResults);
    setShowPreCheck(true);
  };

  // Generate content mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const generationParams = {};
      
      if (useCustomSettings) {
        if (customTone) generationParams.tone = customTone;
        if (customWordCountMin) generationParams.word_count_min = parseInt(customWordCountMin);
        if (customWordCountMax) generationParams.word_count_max = parseInt(customWordCountMax);
        if (additionalContext) generationParams.additionalContext = additionalContext;
      }

      const response = await base44.functions.invoke('aiProposalWriter', {
        proposalId: proposal.id,
        sectionType: selectedSection,
        generationParams,
        userEmail: (await base44.auth.me()).email,
        agentTriggered: false
      });

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposalSections', proposal.id] });
      queryClient.invalidateQueries({ queryKey: ['proposal-modal', proposal.id] });
      
      toast.success(`✅ ${selectedSection.replace(/_/g, ' ')} generated!`, {
        description: `${data.word_count} words | Confidence: ${data.confidence_score || 'N/A'}%`,
        duration: 5000,
      });

      if (data.compliance_issues && data.compliance_issues.length > 0) {
        const highIssues = data.compliance_issues.filter(i => i.severity === 'high');
        if (highIssues.length > 0) {
          toast.warning(`⚠️ ${highIssues.length} compliance issue(s) detected`, {
            description: 'Review the generated content',
            duration: 5000,
          });
        }
      }

      if (onSuccess) {
        onSuccess(data);
      }
      
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to generate content', {
        description: error.message,
        duration: 5000,
      });
    },
  });



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>AI Content Generator</DialogTitle>
              <DialogDescription>
                Generate proposal section using AI with configurable parameters
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Section Selection */}
          <div>
            <Label htmlFor="section-type">Section to Generate *</Label>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger id="section-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="executive_summary">Executive Summary</SelectItem>
                <SelectItem value="technical_approach">Technical Approach</SelectItem>
                <SelectItem value="management_plan">Management Plan</SelectItem>
                <SelectItem value="past_performance">Past Performance</SelectItem>
                <SelectItem value="key_personnel">Key Personnel</SelectItem>
                <SelectItem value="corporate_experience">Corporate Experience</SelectItem>
                <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                <SelectItem value="transition_plan">Transition Plan</SelectItem>
                <SelectItem value="pricing">Pricing Narrative</SelectItem>
                <SelectItem value="custom">Custom Section</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* AI Config Info */}
          {aiConfig && (
            <Alert className="bg-blue-50 border-blue-200">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                Using configuration: <strong>{aiConfig.config_name}</strong> ({aiConfig.llm_provider})
              </AlertDescription>
            </Alert>
          )}

          {/* Supplementary Docs Summary */}
          {suppDocsSummary && suppDocsSummary.total > 0 && (
            <Alert className="bg-purple-50 border-purple-200">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-sm text-purple-900">
                <strong>{suppDocsSummary.total} solicitation documents</strong> will be used:
                {suppDocsSummary.supplementary > 0 && (
                  <span className="ml-2">
                    {suppDocsSummary.amendments > 0 && <Badge className="ml-1 bg-red-100 text-red-700">{suppDocsSummary.amendments} Amendment{suppDocsSummary.amendments > 1 ? 's' : ''}</Badge>}
                    {suppDocsSummary.qas > 0 && <Badge className="ml-1 bg-amber-100 text-amber-700">{suppDocsSummary.qas} Q&A{suppDocsSummary.qas > 1 ? 's' : ''}</Badge>}
                    {suppDocsSummary.supplementary > suppDocsSummary.amendments + suppDocsSummary.qas && (
                      <Badge className="ml-1 bg-purple-100 text-purple-700">
                        {suppDocsSummary.supplementary - suppDocsSummary.amendments - suppDocsSummary.qas} Other
                      </Badge>
                    )}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Custom Settings Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="custom-settings"
              checked={useCustomSettings}
              onChange={(e) => setUseCustomSettings(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="custom-settings" className="cursor-pointer">
              Override default settings for this generation
            </Label>
          </div>

          {/* Custom Settings Panel */}
          {useCustomSettings && (
            <div className="space-y-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-lg">
              <div>
                <Label htmlFor="custom-tone">Tone Override</Label>
                <Select value={customTone} onValueChange={setCustomTone}>
                  <SelectTrigger id="custom-tone">
                    <SelectValue placeholder={`Default: ${aiConfig?.default_tone || 'professional'}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Use Default</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="persuasive">Persuasive</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="word-min">Min Words</Label>
                  <Input
                    id="word-min"
                    type="number"
                    value={customWordCountMin}
                    onChange={(e) => setCustomWordCountMin(e.target.value)}
                    placeholder={aiConfig?.default_word_count_min || "200"}
                  />
                </div>
                <div>
                  <Label htmlFor="word-max">Max Words</Label>
                  <Input
                    id="word-max"
                    type="number"
                    value={customWordCountMax}
                    onChange={(e) => setCustomWordCountMax(e.target.value)}
                    placeholder={aiConfig?.default_word_count_max || "1000"}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="additional-context">Additional Context/Instructions</Label>
                <Textarea
                  id="additional-context"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Add specific instructions or context for the AI..."
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* Default Settings Display */}
          {!useCustomSettings && aiConfig && (
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-2">Default Settings:</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                <div>Tone: <strong>{aiConfig.default_tone}</strong></div>
                <div>Reading Level: <strong>{aiConfig.reading_level}</strong></div>
                <div>Word Range: <strong>{aiConfig.default_word_count_min}-{aiConfig.default_word_count_max}</strong></div>
                <div>LLM: <strong>{aiConfig.llm_provider}</strong></div>
              </div>
            </div>
          )}

          {/* Reference Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Reference Proposals</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReferenceSelector(!showReferenceSelector)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {showReferenceSelector ? 'Hide' : 'Select'} References ({localReferenceIds.length})
              </Button>
            </div>
            
            {showReferenceSelector && (
              <SmartReferenceSelector
                proposal={proposal}
                selectedReferences={localReferenceIds}
                onSelectionChange={setLocalReferenceIds}
                maxReferences={3}
              />
            )}
          </div>

          {/* Token Budget Monitor */}
          <TokenBudgetMonitor
            estimatedTokens={estimatedTokens}
            maxTokens={8000}
            generationParams={{
              reference_count: localReferenceIds.length
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generateMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleInitiateGeneration}
            disabled={generateMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            {generateMutation.isPending ? (
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
        </DialogFooter>
      </DialogContent>

      {/* Pre-Generation Quality Check */}
      <QualityCheckModal
        isOpen={showPreCheck}
        onClose={() => setShowPreCheck(false)}
        onProceed={() => {
          setShowPreCheck(false);
          generateMutation.mutate();
        }}
        mode="pre"
        checkResults={preCheckResults}
      />
    </Dialog>
  );
}