import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import ExportDialog from "../../export/ExportDialog";

export default function Phase8ExportModal({ open, onOpenChange, proposal, organization }) {
  const [sections, setSections] = useState([]);

  const { data: proposalSections } = useQuery({
    queryKey: ['proposal-sections', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return await base44.entities.ProposalSection.filter({
        proposal_id: proposal.id
      }, 'order');
    },
    initialData: [],
    enabled: !!proposal?.id && open,
  });

  useEffect(() => {
    if (proposalSections) {
      setSections(proposalSections);
    }
  }, [proposalSections]);

  const { data: templates = [] } = useQuery({
    queryKey: ['export-templates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ExportTemplate.filter({ 
        organization_id: organization.id 
      }, '-is_default,-created_date');
    },
    enabled: !!organization?.id && open,
  });

  const handleExportComplete = () => {
    // Optionally close the modal or show success message
    onOpenChange(false);
  };

  if (!proposal || !organization) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            Export Proposal
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <ExportDialog
            open={true}
            onOpenChange={() => {}}
            proposal={proposal}
            sections={sections}
            onExportComplete={handleExportComplete}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}