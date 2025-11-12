import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
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
import { Building2, Users, Loader2, Plus, ExternalLink, Sparkles, Star, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export default function TeamFormationModal({ isOpen, onClose, proposalId }) {
  const navigate = useNavigate();
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

  const handleAddNewPartner = () => {
    // Navigate to AddTeamingPartner with return context
    const url = `${createPageUrl("AddTeamingPartner")}?mode=create&returnTo=proposal&proposalId=${proposalId}`;
    window.location.href = url; // Use full navigation to preserve state
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Users className="w-6 h-6 text-blue-600" />
            Team Formation
          </DialogTitle>
          <DialogDescription>
            Select prime contractor and teaming partners for this proposal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Prime Contractor Selection */}
            <div className="space-y-3">
              <Label htmlFor="prime_contractor" className="text-base font-semibold">
                Prime Contractor *
              </Label>
              <Select
                value={proposalData.prime_contractor_id || ""}
                onValueChange={handlePrimeChange}
              >
                <SelectTrigger id="prime_contractor" className="h-12">
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
                <Card className="bg-blue-50 border-2 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900">Prime Contractor</p>
                        <p className="text-base text-blue-800">{proposalData.prime_contractor_name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Teaming Partners Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Teaming Partners / Subcontractors
                </Label>
                <Button
                  size="sm"
                  onClick={handleAddNewPartner}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Partner
                </Button>
              </div>

              {partners.length > 0 ? (
                <>
                  <div className="border-2 border-slate-200 rounded-lg p-4 space-y-3 max-h-80 overflow-y-auto bg-slate-50">
                    {partners.map((partner) => {
                      const isSelected = proposalData.teaming_partner_ids?.includes(partner.id);
                      const hasAIData = partner.ai_extracted === true;

                      return (
                        <Card
                          key={partner.id}
                          className={cn(
                            "border-2 transition-all cursor-pointer hover:shadow-md",
                            isSelected 
                              ? "border-green-400 bg-green-50" 
                              : "border-slate-200 bg-white hover:border-slate-300"
                          )}
                          onClick={() => handleTeamingPartnerToggle(partner.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`partner-${partner.id}`}
                                checked={isSelected}
                                onCheckedChange={() => handleTeamingPartnerToggle(partner.id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="font-semibold text-slate-900">
                                    {partner.partner_name}
                                  </p>
                                  {hasAIData && (
                                    <Sparkles className="w-4 h-4 text-purple-600" title="AI-Extracted Data" />
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-1 mb-2">
                                  {partner.partner_type && (
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {partner.partner_type.replace('_', ' ')}
                                    </Badge>
                                  )}
                                  {(partner.relationship_status || partner.status) === 'preferred' && (
                                    <Badge className="bg-blue-100 text-blue-700 text-xs">
                                      <Star className="w-3 h-3 mr-1 fill-blue-700" />
                                      Preferred
                                    </Badge>
                                  )}
                                </div>

                                {partner.certifications && partner.certifications.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {partner.certifications.slice(0, 3).map((cert, idx) => (
                                      <Badge key={idx} className="bg-blue-600 text-white text-xs">
                                        {cert}
                                      </Badge>
                                    ))}
                                    {partner.certifications.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{partner.certifications.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {partner.core_capabilities && partner.core_capabilities.length > 0 && (
                                  <p className="text-xs text-slate-600 line-clamp-2">
                                    {partner.core_capabilities.slice(0, 3).join(' • ')}
                                    {partner.core_capabilities.length > 3 && ` • +${partner.core_capabilities.length - 3} more`}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {proposalData.teaming_partner_ids?.length > 0 && (
                    <Card className="bg-green-50 border-2 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-green-600" />
                          <p className="text-sm font-semibold text-green-900">
                            {proposalData.teaming_partner_ids.length} teaming partner(s) selected
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="border-2 border-dashed bg-slate-50">
                  <CardContent className="p-8 text-center">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-700 mb-2">No Teaming Partners Yet</p>
                    <p className="text-xs text-slate-500 mb-4">
                      Add partners to your organization to select them for proposals
                    </p>
                    <Button
                      onClick={handleAddNewPartner}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Partner
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Help Text */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>💡 Tip:</strong> You can add new partners on-the-fly! Click "Add New Partner" to upload a capability statement and use AI to auto-populate the profile.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading || !proposalData.prime_contractor_id}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Team"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}