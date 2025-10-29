
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button"; // Button is not used in the new outline but was in original, keeping for safety if future phases use it.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Building2, Users, Sparkles, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Phase1({ proposalData, setProposalData, proposalId }) {
  const [organization, setOrganization] = useState(null);
  const [partners, setPartners] = useState([]); // This state stores teaming partners specific to the user's organization
  const [primeOptions, setPrimeOptions] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        // Fetch the user's main organization. Assuming a user might have one primary organization.
        // The outline specifies `filter({ created_by: user.email }, '-created_date', 1)`
        // which implies getting the most recently created organization by the user, if there are multiple.
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          const org = orgs[0];
          setOrganization(org);

          // Fetch teaming partners associated with this organization
          const teamingPartners = await base44.entities.TeamingPartner.filter(
            { organization_id: org.id },
            'partner_name'
          );
          setPartners(teamingPartners);

          // Create options for the prime contractor dropdown
          const options = [
            { id: org.id, name: org.organization_name, type: 'organization' },
            ...teamingPartners.map(p => ({ id: p.id, name: p.partner_name, type: 'partner' }))
          ];
          setPrimeOptions(options);

          // If prime_contractor_id is not yet set in proposalData, default it to the user's organization
          if (!proposalData.prime_contractor_id && org.id) {
            setProposalData(prev => ({
              ...prev,
              prime_contractor_id: org.id,
              prime_contractor_name: org.organization_name
            }));
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [proposalData.prime_contractor_id, setProposalData]); // Added dependencies to ensure it runs correctly if proposalData changes

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

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-blue-600" />
          Phase 1: Basic Information
        </CardTitle>
        <CardDescription>
          Start by naming your proposal and selecting the prime contractor
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="proposal_name">Proposal Name *</Label>
          <Input
            id="proposal_name"
            value={proposalData.proposal_name || ""}
            onChange={(e) => setProposalData({...proposalData, proposal_name: e.target.value})}
            placeholder="e.g., DoD IT Modernization 2024"
          />
          <p className="text-sm text-slate-500">
            Internal name for easy identification
          </p>
        </div>

        <div className="space-y-2">
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
          <p className="text-sm text-slate-500">
            Who will be the prime contractor on this opportunity?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contract_value">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                Contract Value
              </div>
            </Label>
            <Input
              id="contract_value"
              type="number"
              value={proposalData.contract_value || ""}
              onChange={(e) => setProposalData({...proposalData, contract_value: parseFloat(e.target.value) || 0})}
              placeholder="e.g., 5000000"
            />
            <p className="text-sm text-slate-500">
              Estimated contract value in USD
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract_value_type">Value Type</Label>
            <Select
              value={proposalData.contract_value_type || "estimated"}
              onValueChange={(value) => setProposalData({...proposalData, contract_value_type: value})}
            >
              <SelectTrigger id="contract_value_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="estimated">Estimated</SelectItem>
                <SelectItem value="ceiling">Ceiling</SelectItem>
                <SelectItem value="exact">Exact</SelectItem>
                <SelectItem value="target">Target</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-500">
              Type of value estimate
            </p>
          </div>
        </div>

        {proposalData.contract_value > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-900">Contract Value Summary</span>
            </div>
            <div className="text-sm text-green-800">
              <p>
                <strong>{proposalData.contract_value_type?.charAt(0).toUpperCase() + proposalData.contract_value_type?.slice(1) || 'Estimated'} Value:</strong>{' '}
                ${proposalData.contract_value.toLocaleString()} USD
              </p>
              {proposalData.contract_value >= 1000000 && (
                <p className="mt-1">
                  That's approximately <strong>${(proposalData.contract_value / 1000000).toFixed(2)}M</strong>
                </p>
              )}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">What's Next?</p>
              <p className="text-sm text-blue-700">
                After setting up basic info, you'll add supporting documents, solicitation details, 
                and let AI help evaluate and write your proposal.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
