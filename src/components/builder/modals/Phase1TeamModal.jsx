import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Building2, X, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function Phase1TeamModal({ open, onOpenChange, proposal, onSave }) {
  const [organization, setOrganization] = React.useState(null);
  const [formData, setFormData] = React.useState({
    prime_contractor_id: proposal?.prime_contractor_id || "",
    prime_contractor_name: proposal?.prime_contractor_name || "",
    teaming_partner_ids: proposal?.teaming_partner_ids || [],
  });

  // Load organization and partners
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading organization:", error);
      }
    };
    loadData();
  }, []);

  const { data: partners = [] } = useQuery({
    queryKey: ['teaming-partners', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.TeamingPartner.filter(
        { organization_id: organization.id },
        'partner_name'
      );
    },
    enabled: !!organization?.id,
  });

  const primeOptions = React.useMemo(() => {
    if (!organization) return [];
    return [
      { id: organization.id, name: organization.organization_name, type: 'organization' },
      ...partners.map(p => ({ id: p.id, name: p.partner_name, type: 'partner' }))
    ];
  }, [organization, partners]);

  const selectedPartners = React.useMemo(() => {
    return partners.filter(p => formData.teaming_partner_ids.includes(p.id));
  }, [partners, formData.teaming_partner_ids]);

  const handlePrimeChange = (value) => {
    const selected = primeOptions.find(opt => opt.id === value);
    if (selected) {
      setFormData({
        ...formData,
        prime_contractor_id: selected.id,
        prime_contractor_name: selected.name
      });
    }
  };

  const handlePartnerToggle = (partnerId) => {
    const currentIds = formData.teaming_partner_ids || [];
    if (currentIds.includes(partnerId)) {
      setFormData({
        ...formData,
        teaming_partner_ids: currentIds.filter(id => id !== partnerId)
      });
    } else {
      setFormData({
        ...formData,
        teaming_partner_ids: [...currentIds, partnerId]
      });
    }
  };

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Team Formation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Prime Contractor Selection */}
          <div className="space-y-2">
            <Label htmlFor="prime_contractor">Prime Contractor *</Label>
            <Select
              value={formData.prime_contractor_id || ""}
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
            <p className="text-sm text-slate-500">
              Who will be the prime contractor on this opportunity?
            </p>
          </div>

          {/* Selected Prime Display */}
          {formData.prime_contractor_name && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-900">
                <strong>Prime:</strong> {formData.prime_contractor_name}
              </p>
            </div>
          )}

          {/* Teaming Partners Selection */}
          <div className="space-y-3">
            <Label>Teaming Partners / Subcontractors (Optional)</Label>
            
            {selectedPartners.length > 0 && (
              <div className="space-y-2 p-4 bg-slate-50 rounded-lg border">
                <p className="text-sm font-medium text-slate-700">Selected Partners:</p>
                {selectedPartners.map(partner => (
                  <div key={partner.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="font-medium text-slate-900">{partner.partner_name}</p>
                        {partner.partner_type && (
                          <p className="text-xs text-slate-500 capitalize">{partner.partner_type.replace('_', ' ')}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePartnerToggle(partner.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Available Partners List */}
            {partners.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Select partners to add:</p>
                {partners.map(partner => (
                  <div key={partner.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`partner-${partner.id}`}
                      checked={formData.teaming_partner_ids?.includes(partner.id)}
                      onCheckedChange={() => handlePartnerToggle(partner.id)}
                    />
                    <label
                      htmlFor={`partner-${partner.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {partner.partner_name}
                      {partner.certifications?.length > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {partner.certifications[0]}
                        </Badge>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            )}

            {partners.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-sm text-slate-600">No teaming partners available.</p>
                <p className="text-xs text-slate-500 mt-1">Add partners from the Teaming Partners page.</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.prime_contractor_id}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}