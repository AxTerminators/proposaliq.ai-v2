import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

/**
 * AI Regenerate Modal
 * Allows users to modify parameters and regenerate AI content
 */
export default function AIRegenerateModal({ isOpen, onClose, section, proposal }) {
  const queryClient = useQueryClient();
  const [editedPrompt, setEditedPrompt] = useState(section?.ai_prompt_used || '');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [wordCountMin, setWordCountMin] = useState('');
  const [wordCountMax, setWordCountMax] = useState('');

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      // Build generation params
      const generationParams = {
        additionalContext: additionalInstructions
      };
      
      if (wordCountMin) generationParams.word_count_min = parseInt(wordCountMin);
      if (wordCountMax) generationParams.word_count_max = parseInt(wordCountMax);

      // Call backend to regenerate
      const response = await base44.functions.invoke('aiProposalWriter', {
        proposalId: proposal.id,
        sectionType: section.section_type,
        generationParams,
        userEmail: user.email,
        agentTriggered: false
      });

      return response.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['proposalSections', proposal.id] });
      await queryClient.invalidateQueries({ queryKey: ['sectionHistory', section.id] });
      
      toast.success('Content regenerated successfully!', {
        description: `${data.word_count} words | Confidence: ${data.confidence_score || 'N/A'}%`,
        duration: 5000,
      });

      if (data.compliance_issues && data.compliance_issues.length > 0) {
        const highIssues = data.compliance_issues.filter(i => i.severity === 'high');
        if (highIssues.length > 0) {
          toast.warning(`⚠️ ${highIssues.length} compliance issue(s) detected`, {
            duration: 5000,
          });
        }
      }

      onClose();
    },
    onError: (error) => {
      toast.error('Failed to regenerate content', {
        description: error.message,
        duration: 5000,
      });
    },
  });

  const handleRegenerate = () => {
    regenerateMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>Regenerate with AI</DialogTitle>
              <DialogDescription>
                Modify parameters and regenerate this section
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Original Prompt Display */}
          {section?.ai_prompt_used && (
            <div>
              <Label className="text-xs text-slate-600">Original Prompt Used:</Label>
              <div className="mt-1 p-3 bg-slate-50 rounded border text-xs text-slate-700 max-h-24 overflow-y-auto">
                {section.ai_prompt_used.substring(0, 500)}...
              </div>
            </div>
          )}

          {/* Additional Instructions */}
          <div>
            <Label htmlFor="additional-instructions">
              Additional Instructions
            </Label>
            <Textarea
              id="additional-instructions"
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              placeholder="Add specific guidance for regeneration (e.g., 'Make it more technical', 'Add more examples', 'Focus on cost savings')"
              rows={4}
            />
          </div>

          {/* Word Count Overrides */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="word-min">Min Words (Optional)</Label>
              <Input
                id="word-min"
                type="number"
                value={wordCountMin}
                onChange={(e) => setWordCountMin(e.target.value)}
                placeholder="e.g., 200"
              />
            </div>
            <div>
              <Label htmlFor="word-max">Max Words (Optional)</Label>
              <Input
                id="word-max"
                type="number"
                value={wordCountMax}
                onChange={(e) => setWordCountMax(e.target.value)}
                placeholder="e.g., 1000"
              />
            </div>
          </div>

          {/* Info */}
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
            <p>💡 <strong>Tip:</strong> The previous version will be saved to history before regenerating.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={regenerateMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={regenerateMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-pink-600"
          >
            {regenerateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Regenerate Content
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}