import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus } from "lucide-react";

export default function Phase1({ proposalData, setProposalData, proposalId }) {
  const [organizations, setOrganizations] = useState([]);
  const [partners, setPartners] = useState([]);
  const [useExisting, setUseExisting] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const orgs = await base44.entities.Organization.filter({ created_by: user.email }, '-created_date');
      const allPartners = await base44.entities.TeamingPartner.list('-created_date');
      setOrganizations(orgs);
      setPartners(allPartners);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleSelectOrg = (orgId) => {
    const org = organizations.find(o => o.id === orgId);
    if (org) {
      setProposalData({
        ...proposalData,
        prime_contractor_id: org.id,
        prime_contractor_name: org.organization_name
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Phase 1: Prime Contractor Details
          </CardTitle>
          <CardDescription>
            Select who will be the prime contractor for this proposal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="proposal_name">Proposal Name *</Label>
            <Input
              id="proposal_name"
              value={proposalData.proposal_name}
              onChange={(e) => setProposalData({...proposalData, proposal_name: e.target.value})}
              placeholder="e.g., DOD IT Services RFP 2024"
            />
          </div>

          <div className="flex gap-4 mb-4">
            <Button
              variant={useExisting ? "default" : "outline"}
              onClick={() => setUseExisting(true)}
            >
              Select Existing Organization
            </Button>
            <Button
              variant={!useExisting ? "default" : "outline"}
              onClick={() => setUseExisting(false)}
            >
              Enter Manually
            </Button>
          </div>

          {useExisting ? (
            <div className="space-y-2">
              <Label>Select Prime Contractor</Label>
              <Select
                value={proposalData.prime_contractor_id}
                onValueChange={handleSelectOrg}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.organization_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {proposalData.prime_contractor_name && (
                <p className="text-sm text-slate-600 mt-2">
                  Selected: <span className="font-medium">{proposalData.prime_contractor_name}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Prime Contractor Name *</Label>
                <Input
                  value={proposalData.prime_contractor_name}
                  onChange={(e) => setProposalData({...proposalData, prime_contractor_name: e.target.value})}
                  placeholder="Enter company name"
                />
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Teaming Partners (Optional)</h3>
            {partners.length > 0 ? (
              <div className="space-y-2">
                {partners.map((partner) => (
                  <div
                    key={partner.id}
                    className="p-3 border rounded-lg flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      const ids = proposalData.teaming_partner_ids || [];
                      if (ids.includes(partner.id)) {
                        setProposalData({
                          ...proposalData,
                          teaming_partner_ids: ids.filter(id => id !== partner.id)
                        });
                      } else {
                        setProposalData({
                          ...proposalData,
                          teaming_partner_ids: [...ids, partner.id]
                        });
                      }
                    }}
                  >
                    <div>
                      <p className="font-medium">{partner.partner_name}</p>
                      <p className="text-sm text-slate-600">{partner.poc_name}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={(proposalData.teaming_partner_ids || []).includes(partner.id)}
                      readOnly
                      className="w-5 h-5"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-4">No teaming partners added yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}