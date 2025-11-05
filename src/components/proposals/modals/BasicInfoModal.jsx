import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export default function BasicInfoModal({ isOpen, onClose, proposalId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [proposalData, setProposalData] = useState({
    proposal_name: "",
    solicitation_number: "",
    project_type: "RFP",
    agency_name: "",
    project_title: "",
  });

  useEffect(() => {
    if (isOpen && proposalId) {
      loadProposal();
    }
  }, [isOpen, proposalId]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      if (proposals.length > 0) {
        setProposalData(proposals[0]);
      }
    } catch (error) {
      console.error("Error loading proposal:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await base44.entities.Proposal.update(proposalId, {
        proposal_name: proposalData.proposal_name,
        solicitation_number: proposalData.solicitation_number,
        project_type: proposalData.project_type,
        agency_name: proposalData.agency_name,
        project_title: proposalData.project_title,
      });
      onClose();
    } catch (error) {
      console.error("Error saving proposal:", error);
      alert("Error saving proposal. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Proposal Basic Information</DialogTitle>
          <DialogDescription>
            Enter the core details about this proposal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="proposal_name">Proposal Name *</Label>
              <Input
                id="proposal_name"
                placeholder="e.g., GSA IT Services Proposal"
                value={proposalData.proposal_name || ""}
                onChange={(e) => setProposalData({ ...proposalData, proposal_name: e.target.value })}
              />
              <p className="text-xs text-slate-500">Internal name for easy identification</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="solicitation_number">Solicitation Number *</Label>
              <Input
                id="solicitation_number"
                placeholder="e.g., 47QSMD24R0001"
                value={proposalData.solicitation_number || ""}
                onChange={(e) => setProposalData({ ...proposalData, solicitation_number: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_type">Project Type</Label>
                <Select
                  value={proposalData.project_type || "RFP"}
                  onValueChange={(value) => setProposalData({ ...proposalData, project_type: value })}
                >
                  <SelectTrigger id="project_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RFP">RFP</SelectItem>
                    <SelectItem value="RFQ">RFQ</SelectItem>
                    <SelectItem value="RFI">RFI</SelectItem>
                    <SelectItem value="IFB">IFB</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agency_name">Agency Name</Label>
                <Input
                  id="agency_name"
                  placeholder="e.g., Department of Defense"
                  value={proposalData.agency_name || ""}
                  onChange={(e) => setProposalData({ ...proposalData, agency_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_title">Project Title</Label>
              <Input
                id="project_title"
                placeholder="e.g., Enterprise IT Modernization Services"
                value={proposalData.project_title || ""}
                onChange={(e) => setProposalData({ ...proposalData, project_title: e.target.value })}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !proposalData.proposal_name}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}