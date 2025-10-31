
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Building2, Users, Sparkles, DollarSign, Plus, X, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const CERTIFICATIONS = [
  "8(a)", "HUBZone", "SDVOSB", "VOSB", "WOSB", "EDWOSB", "SDB"
];

export default function Phase1({ proposalData, setProposalData, proposalId }) {
  const queryClient = useQueryClient();
  const [organization, setOrganization] = useState(null);
  const [partners, setPartners] = useState([]);
  const [primeOptions, setPrimeOptions] = useState([]);
  const [showAddPartnerDialog, setShowAddPartnerDialog] = useState(false);
  const [addingForPrime, setAddingForPrime] = useState(false);
  const [selectedTeamingPartners, setSelectedTeamingPartners] = useState([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successContext, setSuccessContext] = useState('');
  
  const [newPartnerForm, setNewPartnerForm] = useState({
    partner_name: "",
    partner_type: "teaming_partner",
    address: "",
    poc_name: "",
    poc_phone: "",
    poc_email: "",
    uei: "",
    cage_code: "",
    website_url: "",
    primary_naics: "",
    secondary_naics: [],
    certifications: [],
    core_capabilities: [],
    differentiators: [],
    past_performance_summary: "",
    notes: "",
    status: "active"
  });
  
  const [capabilityStatementFile, setCapabilityStatementFile] = useState(null);
  const [uploadingCapStatement, setUploadingCapStatement] = useState(false);
  const [isExtractingData, setIsExtractingData] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [otherCertification, setOtherCertification] = useState("");
  const [showOtherCertInput, setShowOtherCertInput] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
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

          if (!proposalData.prime_contractor_id && org.id) {
            setProposalData(prev => ({
              ...prev,
              prime_contractor_id: org.id,
              prime_contractor_name: org.organization_name
            }));
          }
          
          if (proposalData.teaming_partner_ids && proposalData.teaming_partner_ids.length > 0) {
            const selectedPartners = teamingPartners.filter(p => 
              proposalData.teaming_partner_ids.includes(p.id)
            );
            setSelectedTeamingPartners(selectedPartners);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [proposalData.prime_contractor_id, proposalData.teaming_partner_ids]);

  const createPartnerMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.TeamingPartner.create({
        ...data,
        organization_id: organization.id
      });
    },
    onSuccess: async (createdPartner) => {
      if (capabilityStatementFile) {
        await uploadCapabilityStatement(createdPartner.id);
      }
      
      const teamingPartners = await base44.entities.TeamingPartner.filter(
        { organization_id: organization.id },
        'partner_name'
      );
      setPartners(teamingPartners);
      
      const options = [
        { id: organization.id, name: organization.organization_name, type: 'organization' },
        ...teamingPartners.map(p => ({ id: p.id, name: p.partner_name, type: 'partner' }))
      ];
      setPrimeOptions(options);
      
      setSuccessContext(addingForPrime ? 'prime' : 'teaming');
      setShowSuccessMessage(true);
      
      setShowAddPartnerDialog(false);
      resetPartnerForm();
      
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    },
  });

  const uploadCapabilityStatement = async (partnerId) => {
    if (!capabilityStatementFile) return;
    
    try {
      setUploadingCapStatement(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ 
        file: capabilityStatementFile 
      });
      
      await base44.entities.ProposalResource.create({
        organization_id: organization.id,
        teaming_partner_id: partnerId,
        is_partner_document: true,
        temporary_storage: false,
        resource_type: "partner_capability",
        file_name: capabilityStatementFile.name,
        file_url: file_url,
        file_size: capabilityStatementFile.size,
        entity_type: "teaming_partner"
      });
      
      setCapabilityStatementFile(null);
    } catch (error) {
      console.error("Error uploading capability statement:", error);
    } finally {
      setUploadingCapStatement(false);
    }
  };

  const handleCapabilityStatementSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setCapabilityStatementFile(file);
    setIsExtractingData(true);
    
    try {
      console.log('=== 🚀 STARTING PDF DOCUMENT PROCESSING ===');
      console.log(`📁 File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
      
      console.log('⬆️ Step 1: Uploading file...');
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;
      console.log('✅ File uploaded successfully:', fileUrl);
      
      console.log('🤖 Step 2: Using AI to extract structured data from PDF...');
      
      const extractionSchema = {
        type: "object",
        properties: {
          partner_name: { type: "string" },
          address: { type: "string" },
          website_url: { type: "string" },
          uei: { type: "string" },
          cage_code: { type: "string" },
          primary_naics: { type: "string" },
          secondary_naics: { type: "array", items: { type: "string" } },
          poc_name: { type: "string" },
          poc_email: { type: "string" },
          poc_phone: { type: "string" },
          certifications: { type: "array", items: { type: "string" } },
          core_capabilities: { type: "array", items: { type: "string" } },
          differentiators: { type: "array", items: { type: "string" } },
          past_performance_summary: { type: "string" }
        }
      };

      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: extractionSchema
      });

      console.log('✅ AI extraction completed');
      console.log('📊 Extraction result:', extractionResult);

      if (extractionResult.status === 'error' || !extractionResult.output) {
        throw new Error(extractionResult.details || 'Failed to extract data from document');
      }

      const aiResult = extractionResult.output || {};
      console.log('📊 Extracted data:', aiResult);
      console.log('📝 Step 3: Populating form fields...');

      const updatedForm = { ...newPartnerForm };
      let fieldsPopulated = [];

      if (aiResult.partner_name?.trim()) {
        updatedForm.partner_name = aiResult.partner_name;
        fieldsPopulated.push("Partner Name");
      }
      if (aiResult.address?.trim()) {
        updatedForm.address = aiResult.address;
        fieldsPopulated.push("Address");
      }
      if (aiResult.website_url?.trim()) {
        updatedForm.website_url = aiResult.website_url;
        fieldsPopulated.push("Website");
      }
      if (aiResult.uei?.trim()) {
        updatedForm.uei = aiResult.uei;
        fieldsPopulated.push("UEI");
      }
      if (aiResult.cage_code?.trim()) {
        updatedForm.cage_code = aiResult.cage_code;
        fieldsPopulated.push("CAGE Code");
      }
      if (aiResult.primary_naics?.trim()) {
        updatedForm.primary_naics = aiResult.primary_naics;
        fieldsPopulated.push("Primary NAICS");
      }
      if (aiResult.secondary_naics?.length > 0) {
        updatedForm.secondary_naics = aiResult.secondary_naics.filter(n => n?.trim());
        if (updatedForm.secondary_naics.length > 0) fieldsPopulated.push("Secondary NAICS");
      }
      if (aiResult.poc_name?.trim()) {
        updatedForm.poc_name = aiResult.poc_name;
        fieldsPopulated.push("POC Name");
      }
      if (aiResult.poc_email?.trim()) {
        updatedForm.poc_email = aiResult.poc_email;
        fieldsPopulated.push("POC Email");
      }
      if (aiResult.poc_phone?.trim()) {
        updatedForm.poc_phone = aiResult.poc_phone;
        fieldsPopulated.push("POC Phone");
      }
      if (aiResult.certifications?.length > 0) {
        const validCerts = aiResult.certifications.filter(c => c?.trim());
        if (validCerts.length > 0) {
          updatedForm.certifications = [...new Set([...(newPartnerForm.certifications || []), ...validCerts])];
          fieldsPopulated.push("Certifications");
        }
      }
      if (aiResult.core_capabilities?.length > 0) {
        const validCaps = aiResult.core_capabilities.filter(c => c?.trim());
        if (validCaps.length > 0) {
          updatedForm.core_capabilities = validCaps;
          fieldsPopulated.push("Core Capabilities");
        }
      }
      if (aiResult.differentiators?.length > 0) {
        const validDiffs = aiResult.differentiators.filter(d => d?.trim());
        if (validDiffs.length > 0) {
          updatedForm.differentiators = validDiffs;
          fieldsPopulated.push("Differentiators");
        }
      }
      if (aiResult.past_performance_summary?.trim()) {
        updatedForm.past_performance_summary = aiResult.past_performance_summary;
        fieldsPopulated.push("Past Performance Summary");
      }

      setNewPartnerForm(updatedForm);

      console.log(`✅ Successfully populated ${fieldsPopulated.length} fields`);
      console.log('=== ✨ PROCESSING COMPLETE ===');

      if (fieldsPopulated.length > 0) {
        alert(`✅ Success! AI extracted ${fieldsPopulated.length} fields from ${file.name}:\n\n${fieldsPopulated.join('\n')}\n\nPlease review and adjust as needed.`);
      } else {
        alert(`⚠️ AI analyzed ${file.name} but couldn't extract structured data.\n\nThe document may not contain the expected information. Please manually enter the details.`);
      }
    } catch (error) {
      console.error('=== ❌ ERROR DURING PDF PROCESSING ===');
      console.error('Error details:', error);
      alert(`❌ Error processing ${file.name}:\n${error.message}\n\nPlease manually enter the information.`);
    } finally {
      setIsExtractingData(false);
    }
  };

  const resetPartnerForm = () => {
    setNewPartnerForm({
      partner_name: "",
      partner_type: "teaming_partner",
      address: "",
      poc_name: "",
      poc_phone: "",
      poc_email: "",
      uei: "",
      cage_code: "",
      website_url: "",
      primary_naics: "",
      secondary_naics: [],
      certifications: [],
      core_capabilities: [],
      differentiators: [],
      past_performance_summary: "",
      notes: "",
      status: "active"
    });
    setCapabilityStatementFile(null);
    setShowOtherCertInput(false);
    setOtherCertification("");
    setNewItem("");
  };

  const handleOpenAddPartner = (forPrime) => {
    setAddingForPrime(forPrime);
    setShowAddPartnerDialog(true);
  };

  const handleSaveNewPartner = () => {
    if (!newPartnerForm.partner_name?.trim()) {
      alert("Please enter a partner name");
      return;
    }
    createPartnerMutation.mutate(newPartnerForm);
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

  const handleAddTeamingPartner = (partnerId) => {
    const partner = partners.find(p => p.id === partnerId);
    if (partner && !selectedTeamingPartners.find(p => p.id === partnerId)) {
      const updatedPartners = [...selectedTeamingPartners, partner];
      setSelectedTeamingPartners(updatedPartners);
      setProposalData({
        ...proposalData,
        teaming_partner_ids: updatedPartners.map(p => p.id)
      });
    }
  };

  const handleRemoveTeamingPartner = (partnerId) => {
    const updatedPartners = selectedTeamingPartners.filter(p => p.id !== partnerId);
    setSelectedTeamingPartners(updatedPartners);
    setProposalData({
      ...proposalData,
      teaming_partner_ids: updatedPartners.map(p => p.id)
    });
  };

  const addArrayItem = (field) => {
    if (newItem.trim()) {
      setNewPartnerForm({
        ...newPartnerForm,
        [field]: [...(newPartnerForm[field] || []), newItem.trim()]
      });
      setNewItem("");
    }
  };

  const removeArrayItem = (field, index) => {
    setNewPartnerForm({
      ...newPartnerForm,
      [field]: newPartnerForm[field].filter((_, i) => i !== index)
    });
  };

  const toggleCertification = (cert) => {
    const certs = newPartnerForm.certifications || [];
    if (certs.includes(cert)) {
      setNewPartnerForm({
        ...newPartnerForm,
        certifications: certs.filter(c => c !== cert)
      });
    } else {
      setNewPartnerForm({
        ...newPartnerForm,
        certifications: [...certs, cert]
      });
    }
  };

  const addOtherCertification = () => {
    if (otherCertification.trim() && !newPartnerForm.certifications?.includes(otherCertification.trim())) {
      setNewPartnerForm({
        ...newPartnerForm,
        certifications: [...(newPartnerForm.certifications || []), otherCertification.trim()]
      });
      setOtherCertification("");
      setShowOtherCertInput(false);
    }
  };

  const availableTeamingPartners = partners.filter(p => 
    !selectedTeamingPartners.find(sp => sp.id === p.id)
  );

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
        {showSuccessMessage && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription>
              <p className="font-semibold text-green-900 mb-1">✓ Company Added Successfully!</p>
              <p className="text-sm text-green-800">
                {successContext === 'prime' 
                  ? 'The new company is now available in the Prime Contractor dropdown. Please select it from the dropdown above.'
                  : 'The new company is now available in the Teaming Partners list. You can now select it to add to this proposal.'}
              </p>
            </AlertDescription>
          </Alert>
        )}

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
          <div className="flex gap-2">
            <Select
              value={proposalData.prime_contractor_id || ""}
              onValueChange={handlePrimeChange}
            >
              <SelectTrigger id="prime_contractor" className="flex-1">
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
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenAddPartner(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Company
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            Who will be the prime contractor on this opportunity?
          </p>
        </div>

        <div className="space-y-3">
          <Label>Teaming Partners / Subcontractors (Optional)</Label>
          
          {selectedTeamingPartners.length > 0 && (
            <div className="space-y-2 p-4 bg-slate-50 rounded-lg border">
              <p className="text-sm font-medium text-slate-700">Selected Partners:</p>
              {selectedTeamingPartners.map(partner => (
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
                    onClick={() => handleRemoveTeamingPartner(partner.id)}
                    className="text-slate-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Select
              value=""
              onValueChange={handleAddTeamingPartner}
              disabled={availableTeamingPartners.length === 0}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={
                  availableTeamingPartners.length === 0 
                    ? "No partners available" 
                    : "Select from existing partners..."
                } />
              </SelectTrigger>
              <SelectContent>
                {availableTeamingPartners.map(partner => (
                  <SelectItem key={partner.id} value={partner.id}>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>{partner.partner_name}</span>
                      {partner.certifications?.length > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {partner.certifications[0]}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenAddPartner(false)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New Company
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            Select existing partners or add new ones to this proposal
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
                After setting up basic info, you'll add supporting documents, solicitation details (including contract value), 
                and let AI help evaluate and write your proposal.
              </p>
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={showAddPartnerDialog} onOpenChange={setShowAddPartnerDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Add New {addingForPrime ? 'Company (Prime Contractor)' : 'Teaming Partner / Subcontractor'}
            </DialogTitle>
            <DialogDescription>
              Enter company details. Upload a PDF capability statement for AI to auto-populate fields.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Upload PDF Capability Statement (Optional)
              </Label>
              
              <Alert className="bg-blue-50 border-blue-200">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <AlertDescription>
                  <p className="font-semibold text-blue-900 mb-1">📄 PDF Files Only</p>
                  <p className="text-sm text-blue-800">
                    Upload a <strong>PDF</strong> so our AI can read and auto-fill company information for you. 
                    Convert Word/Excel files to PDF first for best results.
                  </p>
                </AlertDescription>
              </Alert>
              
              {isExtractingData && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                  <AlertDescription>
                    <p className="font-semibold text-blue-900">AI is reading your PDF...</p>
                    <p className="text-xs text-blue-700 mt-1">Extracting company details, contacts, and capabilities. This may take 15-30 seconds.</p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="border-2 border-dashed rounded-lg p-6 text-center bg-blue-50">
                {capabilityStatementFile ? (
                  <div className="space-y-3">
                    <Briefcase className="w-12 h-12 mx-auto text-blue-600" />
                    <div>
                      <p className="font-semibold text-sm">{capabilityStatementFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {(capabilityStatementFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCapabilityStatementFile(null)}
                      disabled={isExtractingData}
                    >
                      <X className="w-3 h-3 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <Briefcase className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <input
                      type="file"
                      id="cap-upload"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleCapabilityStatementSelect}
                      disabled={isExtractingData}
                    />
                    <Button size="sm" variant="outline" asChild disabled={isExtractingData}>
                      <label htmlFor="cap-upload" className="cursor-pointer">
                        <Plus className="w-3 h-3 mr-2" />
                        Upload PDF Capability Statement
                      </label>
                    </Button>
                    <p className="text-xs text-slate-500 mt-2">PDF format only • AI will auto-fill form fields</p>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={newPartnerForm.partner_name}
                onChange={(e) => setNewPartnerForm({...newPartnerForm, partner_name: e.target.value})}
                placeholder="Company name"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>POC Name</Label>
                <Input
                  value={newPartnerForm.poc_name}
                  onChange={(e) => setNewPartnerForm({...newPartnerForm, poc_name: e.target.value})}
                  placeholder="Contact person"
                />
              </div>
              <div className="space-y-2">
                <Label>POC Email</Label>
                <Input
                  type="email"
                  value={newPartnerForm.poc_email}
                  onChange={(e) => setNewPartnerForm({...newPartnerForm, poc_email: e.target.value})}
                  placeholder="email@company.com"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>UEI</Label>
                <Input
                  value={newPartnerForm.uei}
                  onChange={(e) => setNewPartnerForm({...newPartnerForm, uei: e.target.value})}
                  placeholder="Unique Entity Identifier"
                />
              </div>
              <div className="space-y-2">
                <Label>CAGE Code</Label>
                <Input
                  value={newPartnerForm.cage_code}
                  onChange={(e) => setNewPartnerForm({...newPartnerForm, cage_code: e.target.value})}
                  placeholder="CAGE Code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Small Business Certifications</Label>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-lg">
                {CERTIFICATIONS.map((cert) => (
                  <Badge
                    key={cert}
                    variant={newPartnerForm.certifications?.includes(cert) ? "default" : "outline"}
                    className="cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => toggleCertification(cert)}
                  >
                    {newPartnerForm.certifications?.includes(cert) && (
                      <CheckCircle className="w-3 h-3 mr-1" />
                    )}
                    {cert}
                  </Badge>
                ))}
                
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:scale-105 transition-transform border-dashed border-blue-400 text-blue-600"
                  onClick={() => setShowOtherCertInput(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Other
                </Badge>
              </div>
              
              {showOtherCertInput && (
                <div className="flex gap-2 mt-2">
                  <Input
                    value={otherCertification}
                    onChange={(e) => setOtherCertification(e.target.value)}
                    placeholder="Enter custom certification"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOtherCertification())}
                  />
                  <Button type="button" onClick={addOtherCertification}>
                    Add
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => { setShowOtherCertInput(false); setOtherCertification(""); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Core Capabilities</Label>
              <div className="flex gap-2">
                <Input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Add capability"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('core_capabilities'))}
                />
                <Button type="button" onClick={() => addArrayItem('core_capabilities')}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {newPartnerForm.core_capabilities.map((cap, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {cap}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeArrayItem('core_capabilities', idx)} />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newPartnerForm.notes}
                onChange={(e) => setNewPartnerForm({...newPartnerForm, notes: e.target.value})}
                rows={3}
                placeholder="Internal notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddPartnerDialog(false); resetPartnerForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNewPartner}
              disabled={!newPartnerForm.partner_name || createPartnerMutation.isPending || uploadingCapStatement}
            >
              {(createPartnerMutation.isPending || uploadingCapStatement) ? 'Saving...' : 'Save Company'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
