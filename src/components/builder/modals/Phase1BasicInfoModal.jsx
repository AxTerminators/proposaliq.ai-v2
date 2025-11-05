import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase } from "lucide-react";

export default function Phase1BasicInfoModal({ open, onOpenChange, proposal, onSave }) {
  const [formData, setFormData] = React.useState({
    proposal_name: proposal?.proposal_name || "",
    solicitation_number: proposal?.solicitation_number || "",
    project_type: proposal?.project_type || "RFP",
    agency_name: proposal?.agency_name || "",
    project_title: proposal?.project_title || "",
  });

  React.useEffect(() => {
    if (proposal) {
      setFormData({
        proposal_name: proposal.proposal_name || "",
        solicitation_number: proposal.solicitation_number || "",
        project_type: proposal.project_type || "RFP",
        agency_name: proposal.agency_name || "",
        project_title: proposal.project_title || "",
      });
    }
  }, [proposal]);

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            Proposal Basic Information
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="proposal_name">Proposal Name *</Label>
            <Input
              id="proposal_name"
              value={formData.proposal_name}
              onChange={(e) => setFormData({ ...formData, proposal_name: e.target.value })}
              placeholder="e.g., DoD IT Modernization 2024"
            />
            <p className="text-sm text-slate-500">Internal name for easy identification</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="solicitation_number">Solicitation Number *</Label>
            <Input
              id="solicitation_number"
              value={formData.solicitation_number}
              onChange={(e) => setFormData({ ...formData, solicitation_number: e.target.value })}
              placeholder="e.g., 47QSMD24R0001"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_type">Project Type</Label>
              <Select
                value={formData.project_type}
                onValueChange={(value) => setFormData({ ...formData, project_type: value })}
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
                value={formData.agency_name}
                onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                placeholder="e.g., Department of Defense"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_title">Project Title</Label>
            <Input
              id="project_title"
              value={formData.project_title}
              onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
              placeholder="e.g., Enterprise IT Modernization Services"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.proposal_name?.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}