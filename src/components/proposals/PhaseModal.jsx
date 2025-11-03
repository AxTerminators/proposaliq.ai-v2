import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Save, ArrowLeft, ArrowRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Import all phase components
import Phase1 from "../builder/Phase1";
import Phase2 from "../builder/Phase2";
import Phase3 from "../builder/Phase3";
import Phase4 from "../builder/Phase4";
import Phase5 from "../builder/Phase5";
import Phase6 from "../builder/Phase6";
import Phase7 from "../builder/Phase7";

const PHASE_MAP = {
  phase1: { component: Phase1, title: "Prime Contractor & Basic Info" },
  phase2: { component: Phase2, title: "Referenced Documents" },
  phase3: { component: Phase3, title: "Solicitation Details" },
  phase4: { component: Phase4, title: "Strategic Evaluation" },
  phase5: { component: Phase5, title: "Strategy & Outline" },
  phase6: { component: Phase6, title: "Content Generation" },
  phase7: { component: Phase7, title: "Review & Finalize" },
};

export default function PhaseModal({ 
  isOpen, 
  onClose, 
  proposal, 
  phaseId,
  onSave 
}) {
  const queryClient = useQueryClient();
  const [proposalData, setProposalData] = useState(proposal || {});
  const [isSaving, setIsSaving] = useState(false);

  const phaseConfig = PHASE_MAP[phaseId];
  const PhaseComponent = phaseConfig?.component;

  const updateProposalMutation = useMutation({
    mutationFn: async (updates) => {
      return base44.entities.Proposal.update(proposal.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      if (onSave) onSave();
    }
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProposalMutation.mutateAsync(proposalData);
      onClose();
    } catch (error) {
      console.error("Error saving proposal:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!phaseConfig) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{phaseConfig.title}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {PhaseComponent && (
            <PhaseComponent
              proposalData={proposalData}
              setProposalData={setProposalData}
              proposalId={proposal?.id}
              embedded={true}
            />
          )}
        </div>

        <div className="border-t pt-4 flex justify-between flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}