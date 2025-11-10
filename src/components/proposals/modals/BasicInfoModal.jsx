import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Calendar } from "lucide-react";
import { syncProposalToCalendar } from "@/utils/proposalCalendarSync";

const PROJECT_TYPES = [
  { value: 'RFP', label: 'RFP - Request for Proposal' },
  { value: 'RFQ', label: 'RFQ - Request for Quote' },
  { value: 'RFI', label: 'RFI - Request for Information' },
  { value: 'IFB', label: 'IFB - Invitation for Bid' },
  { value: 'Other', label: 'Other' }
];

export default function BasicInfoModal({ isOpen, onClose, proposalId }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [organizationId, setOrganizationId] = useState(null);
  
  const [formData, setFormData] = useState({
    proposal_name: '',
    solicitation_number: '',
    project_type: 'RFP',
    agency_name: '',
    project_title: '',
    due_date: '',
    contract_value: ''
  });

  useEffect(() => {
    const loadProposal = async () => {
      if (!proposalId || !isOpen) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const proposals = await base44.entities.Proposal.filter({ id: proposalId });
        if (proposals.length > 0) {
          const proposal = proposals[0];
          setOrganizationId(proposal.organization_id);
          setFormData({
            proposal_name: proposal.proposal_name || '',
            solicitation_number: proposal.solicitation_number || '',
            project_type: proposal.project_type || 'RFP',
            agency_name: proposal.agency_name || '',
            project_title: proposal.project_title || '',
            due_date: proposal.due_date || '',
            contract_value: proposal.contract_value || ''
          });
        }
      } catch (error) {
        console.error('[BasicInfoModal] Error loading proposal:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProposal();
  }, [proposalId, isOpen]);

  const handleSave = async () => {
    if (!formData.proposal_name.trim()) {
      alert('Please enter a Proposal Name');
      return;
    }

    if (!formData.solicitation_number.trim()) {
      alert('Please enter a Solicitation Number');
      return;
    }

    setIsSaving(true);
    try {
      const updateData = {
        proposal_name: formData.proposal_name,
        solicitation_number: formData.solicitation_number,
        project_type: formData.project_type,
        agency_name: formData.agency_name,
        project_title: formData.project_title,
        due_date: formData.due_date || null,
        contract_value: formData.contract_value ? parseFloat(formData.contract_value) : null
      };

      const updatedProposal = await base44.entities.Proposal.update(proposalId, updateData);

      // 🔄 SYNC TO CALENDAR
      if (organizationId) {
        await syncProposalToCalendar(updatedProposal, organizationId);
      }

      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
      await queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      
      console.log('[BasicInfoModal] ✅ Proposal basic info saved and synced to calendar');
      onClose();
    } catch (error) {
      console.error('[BasicInfoModal] Error saving proposal:', error);
      alert('Failed to save proposal information. Please try again.');
    } finally {
      setIsSaving(false);
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="proposal_name">
                Proposal Name *
              </Label>
              <Input
                id="proposal_name"
                value={formData.proposal_name}
                onChange={(e) => setFormData({...formData, proposal_name: e.target.value})}
                placeholder="Internal name for easy identification"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="solicitation_number">
                Solicitation Number *
              </Label>
              <Input
                id="solicitation_number"
                value={formData.solicitation_number}
                onChange={(e) => setFormData({...formData, solicitation_number: e.target.value})}
                placeholder="e.g., RTT099343s"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project_type">
                  Project Type
                </Label>
                <Select
                  value={formData.project_type}
                  onValueChange={(value) => setFormData({...formData, project_type: value})}
                >
                  <SelectTrigger id="project_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agency_name">
                  Agency Name
                </Label>
                <Input
                  id="agency_name"
                  value={formData.agency_name}
                  onChange={(e) => setFormData({...formData, agency_name: e.target.value})}
                  placeholder="e.g., Department of Defense"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_title">
                Project Title
              </Label>
              <Input
                id="project_title"
                value={formData.project_title}
                onChange={(e) => setFormData({...formData, project_title: e.target.value})}
                placeholder="e.g., IT Support Services for DoD"
              />
            </div>

            {/* NEW: Due Date and Contract Value */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Due Date
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                />
                <p className="text-xs text-slate-500">
                  📅 This will automatically appear on your master calendar
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract_value">
                  Estimated Contract Value
                </Label>
                <Input
                  id="contract_value"
                  type="number"
                  value={formData.contract_value}
                  onChange={(e) => setFormData({...formData, contract_value: e.target.value})}
                  placeholder="e.g., 5000000"
                />
                <p className="text-xs text-slate-500">
                  Enter amount in dollars (e.g., 5000000 for $5M)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !formData.proposal_name.trim() || !formData.solicitation_number.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}