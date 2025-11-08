
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const PROPOSAL_TYPES = [
  { value: 'RFP', label: 'RFP - Request for Proposal', icon: '📋' },
  { value: 'RFI', label: 'RFI - Request for Information', icon: '❓' },
  { value: 'SBIR', label: 'SBIR/STTR - Research', icon: '🔬' },
  { value: 'GSA', label: 'GSA Schedule', icon: '🏛️' },
  { value: 'IDIQ', label: 'IDIQ/BPA', icon: '📑' },
  { value: 'STATE_LOCAL', label: 'State/Local', icon: '🏢' },
  { value: 'OTHER', label: 'Other', icon: '📄' },
];

export default function QuickCreateProposal({ isOpen, onClose, organization, preselectedType = null, onSuccess }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    proposal_name: "",
    proposal_type_category: preselectedType || "",
    project_type: "",
    solicitation_number: "",
    agency_name: "",
    project_title: "",
    due_date: null,
    contract_value: "",
  });

  const createProposalMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Proposal.create({
        ...data,
        organization_id: organization.id,
        current_phase: "phase1",
        status: "evaluating",
      });
    },
    onSuccess: (createdProposal) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      
      // Call onSuccess callback with created proposal
      if (onSuccess) {
        onSuccess(createdProposal);
      }
      
      onClose();
      setFormData({
        proposal_name: "",
        proposal_type_category: preselectedType || "",
        project_type: "",
        solicitation_number: "",
        agency_name: "",
        project_title: "",
        due_date: null,
        contract_value: "",
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.proposal_name?.trim()) {
      alert("Please enter a proposal name");
      return;
    }

    if (!formData.proposal_type_category) {
      alert("Please select a proposal type");
      return;
    }

    createProposalMutation.mutate({
      ...formData,
      contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null,
      due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Create New Proposal
          </DialogTitle>
          <DialogDescription>
            Enter basic information to get started
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Proposal Name */}
          <div className="space-y-2">
            <Label htmlFor="proposal_name">
              Proposal Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="proposal_name"
              value={formData.proposal_name}
              onChange={(e) => setFormData({ ...formData, proposal_name: e.target.value })}
              placeholder="e.g., DoD IT Services Proposal"
              required
            />
          </div>

          {/* Proposal Type */}
          <div className="space-y-2">
            <Label htmlFor="proposal_type">
              Proposal Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.proposal_type_category}
              onValueChange={(value) => setFormData({ ...formData, proposal_type_category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select proposal type..." />
              </SelectTrigger>
              <SelectContent>
                {PROPOSAL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{type.icon}</span>
                      {type.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Solicitation Number */}
            <div className="space-y-2">
              <Label htmlFor="solicitation_number">Solicitation Number</Label>
              <Input
                id="solicitation_number"
                value={formData.solicitation_number}
                onChange={(e) => setFormData({ ...formData, solicitation_number: e.target.value })}
                placeholder="e.g., W56HZV-24-R-0001"
              />
            </div>

            {/* Agency */}
            <div className="space-y-2">
              <Label htmlFor="agency_name">Agency</Label>
              <Input
                id="agency_name"
                value={formData.agency_name}
                onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                placeholder="e.g., Department of Defense"
              />
            </div>
          </div>

          {/* Project Title */}
          <div className="space-y-2">
            <Label htmlFor="project_title">Project Title</Label>
            <Input
              id="project_title"
              value={formData.project_title}
              onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
              placeholder="e.g., Enterprise IT Modernization Services"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Due Date */}
            <div className="space-y-2">
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

            {/* Contract Value */}
            <div className="space-y-2">
              <Label htmlFor="contract_value">Estimated Contract Value ($)</Label>
              <Input
                id="contract_value"
                type="number"
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                placeholder="e.g., 1000000"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createProposalMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProposalMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {createProposalMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Proposal
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
