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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Building2, Users, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function TeamFormationModal({ isOpen, onClose, proposalId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState(null);
  const [partners, setPartners] = useState([]);
  const [primeOptions, setPrimeOptions] = useState([]);
  const [proposalData, setProposalData] = useState({
    prime_contractor_id: "",
    prime_contractor_name: "",
    teaming_partner_ids: [],
  });

  useEffect(() => {
    if (isOpen && proposalId) {
      loadData();
    }
  }, [isOpen, proposalId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await base44.auth.me();
      const orgs = await base44.entities.Organization.filter(
        { created_by: user.email },
        '-created_date',
        1
      );
      
      if (orgs.length > 0) {
        const org = orgs[0];
        setOrganization(org);

        const teamingPartners = await base44.entities.TeamingPartner.filter(
          { organization_id: org.id },
          'partner_name'
        );
        setPartners(teamingPartners);

        const options = [
          { id: org.id, name: org.organization_name, type: 'organization' },
          ...teamingPartners.map(p => ({ id: p.id, name: p.partner_name, type: 'partner' }))
        ];
        setPrimeOptions(options);

        const proposals = await base44.entities.Proposal.filter({ id: proposalId });
        if (proposals.length > 0) {
          setProposalData({
            prime_contractor_id: proposals[0].prime_contractor_id || "",
            prime_contractor_name: proposals[0].prime_contractor_name || "",
            teaming_partner_ids: proposals[0].teaming_partner_ids || [],
          });
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrimeChange = (value) => {
    const selected = primeOptions.find(opt => opt.id === value);
    if (selected) {
      setProposalData({
        ...proposalData,
        prime_contractor_id: selected.id,
        prime_contractor_name: selected.name
      });
    }
  };

  const handleTeamingPartnerToggle = (partnerId) => {
    const currentIds = proposalData.teaming_partner_ids || [];
    let updatedIds;

    if (currentIds.includes(partnerId)) {
      updatedIds = currentIds.filter(id => id !== partnerId);
    } else {
      updatedIds = [...currentIds, partnerId];
    }

    setProposalData({
      ...proposalData,
      teaming_partner_ids: updatedIds
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await base44.entities.Proposal.update(proposalId, {
        prime_contractor_id: proposalData.prime_contractor_id,
        prime_contractor_name: proposalData.prime_contractor_name,
        teaming_partner_ids: proposalData.teaming_partner_ids,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team Formation</DialogTitle>
          <DialogDescription>
            Select prime contractor and teaming partners for this proposal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Prime Contractor Selection */}
            <div className="space-y-3">
              <Label htmlFor="prime_contractor">Prime Contractor *</Label>
              <Select
                value={proposalData.prime_contractor_id || ""}
                onValueChange={handlePrimeChange}
              >
                <SelectTrigger id="prime_contractor">
                  <SelectValue placeholder="Select prime contractor" />
                </SelectTrigger>
                <SelectContent>
                  {primeOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>
                      <div className="flex items-center gap-2">
                        {option.type === 'organization' ? (
                          <Building2 className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Users className="w-4 h-4 text-purple-600" />
                        )}
                        <span>{option.name}</span>
                        {option.type === 'organization' && (
                          <Badge variant="secondary" className="ml-2 text-xs">Your Org</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {proposalData.prime_contractor_name && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Prime:</strong> {proposalData.prime_contractor_name}
                  </p>
                </div>
              )}
            </div>

            {/* Teaming Partners Selection */}
            {partners.length > 0 && (
              <div className="space-y-3">
                <Label>Teaming Partners / Subcontractors (Optional)</Label>
                <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                  {partners.map((partner) => (
                    <div key={partner.id} className="flex items-start space-x-3">
                      <Checkbox
                        id={`partner-${partner.id}`}
                        checked={proposalData.teaming_partner_ids?.includes(partner.id)}
                        onCheckedChange={() => handleTeamingPartnerToggle(partner.id)}
                      />
                      <label
                        htmlFor={`partner-${partner.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium text-sm text-slate-900">
                          {partner.partner_name}
                        </div>
                        {partner.partner_type && (
                          <p className="text-xs text-slate-500 capitalize mt-1">
                            {partner.partner_type.replace('_', ' ')}
                          </p>
                        )}
                        {partner.certifications?.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {partner.certifications.slice(0, 3).map((cert, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {cert}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                
                {proposalData.teaming_partner_ids?.length > 0 && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-900">
                      <strong>{proposalData.teaming_partner_ids.length}</strong> teaming partner(s) selected
                    </p>
                  </div>
                )}
              </div>
            )}

            {partners.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed rounded-lg bg-slate-50">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-600 mb-3">No teaming partners added yet</p>
                <Button variant="outline" size="sm" onClick={() => {
                  onClose();
                  window.location.href = "/TeamingPartners";
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Teaming Partners
                </Button>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !proposalData.prime_contractor_id}>
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