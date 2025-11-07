import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function BasicInfoModal(props = {}) {
  const { isOpen = false, onClose = () => {}, proposalId } = props;
  
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    proposal_name: "",
    solicitation_number: "",
    agency_name: "",
    project_title: "",
    project_type: "RFP",
    due_date: null,
    contract_value: "",
  });

  useEffect(() => {
    if (isOpen && proposalId) {
      loadProposal();
    }
  }, [isOpen, proposalId]);

  const loadProposal = async () => {
    try {
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      if (proposals.length > 0) {
        const proposal = proposals[0];
        setFormData({
          proposal_name: proposal.proposal_name || "",
          solicitation_number: proposal.solicitation_number || "",
          agency_name: proposal.agency_name || "",
          project_title: proposal.project_title || "",
          project_type: proposal.project_type || "RFP",
          due_date: proposal.due_date ? new Date(proposal.due_date) : null,
          contract_value: proposal.contract_value || "",
        });
      }
    } catch (error) {
      console.error("Error loading proposal:", error);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Proposal.update(proposalId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onClose();
    },
  });

  const handleSave = () => {
    const dataToSave = {
      ...formData,
      due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
      contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
    };
    updateMutation.mutate(dataToSave);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enter Basic Information</DialogTitle>
          <DialogDescription>
            Update the basic details for this proposal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Proposal Name *</Label>
            <Input
              value={formData.proposal_name}
              onChange={(e) => setFormData({ ...formData, proposal_name: e.target.value })}
              placeholder="Enter proposal name"
            />
          </div>

          <div>
            <Label>Solicitation Number</Label>
            <Input
              value={formData.solicitation_number}
              onChange={(e) => setFormData({ ...formData, solicitation_number: e.target.value })}
              placeholder="e.g., RFP-2024-001"
            />
          </div>

          <div>
            <Label>Agency Name</Label>
            <Input
              value={formData.agency_name}
              onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
              placeholder="e.g., Department of Defense"
            />
          </div>

          <div>
            <Label>Project Title</Label>
            <Input
              value={formData.project_title}
              onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
              placeholder="Enter project title"
            />
          </div>

          <div>
            <Label>Project Type</Label>
            <Select value={formData.project_type} onValueChange={(value) => setFormData({ ...formData, project_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RFP">RFP - Request for Proposal</SelectItem>
                <SelectItem value="RFQ">RFQ - Request for Quote</SelectItem>
                <SelectItem value="RFI">RFI - Request for Information</SelectItem>
                <SelectItem value="IFB">IFB - Invitation for Bid</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? format(formData.due_date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.due_date}
                  onSelect={(date) => setFormData({ ...formData, due_date: date })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Contract Value ($)</Label>
            <Input
              type="number"
              value={formData.contract_value}
              onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
              placeholder="e.g., 1000000"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending || !formData.proposal_name}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}