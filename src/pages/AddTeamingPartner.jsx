
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Building2,
  Users,
  Award,
  Briefcase,
  DollarSign,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Plus // NEW: Added Plus icon
} from "lucide-react";
import { cn } from "@/lib/utils";
import CapabilityStatementUploader from "../components/teamingpartners/CapabilityStatementUploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const CERTIFICATIONS_OPTIONS = [
  "8(a)",
  "HUBZone",
  "WOSB",
  "EDWOSB",
  "SDVOSB",
  "VOSB",
  "SDB",
  "Small Business",
  "Woman-Owned",
  "Veteran-Owned",
  "Service-Disabled Veteran-Owned",
  "Minority-Owned",
  "Disadvantaged Business"
];

const RELATIONSHIP_STATUS_OPTIONS = [
  { value: "potential", label: "Potential Partner", color: "bg-slate-100 text-slate-700" },
  { value: "under_review", label: "Under Review", color: "bg-amber-100 text-amber-700" },
  { value: "active", label: "Active Partner", color: "bg-green-100 text-green-700" },
  { value: "preferred", label: "Preferred Partner", color: "bg-blue-100 text-blue-700" },
  { value: "inactive", label: "Inactive", color: "bg-slate-100 text-slate-500" },
  { value: "do_not_use", label: "Do Not Use", color: "bg-red-100 text-red-700" }
];

export default function AddTeamingPartner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  
  const mode = urlParams.get('mode') || 'create'; // create or edit
  const partnerId = urlParams.get('id');
  const returnTo = urlParams.get('returnTo'); // 'proposal' if coming from proposal card
  const proposalId = urlParams.get('proposalId');
  const returnStage = urlParams.get('stage');

  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [aiExtractedFields, setAiExtractedFields] = useState([]);
  const [showReturnButtons, setShowReturnButtons] = useState(false);
  const [savedPartnerId, setSavedPartnerId] = useState(null);

  const [formData, setFormData] = useState({
    partner_name: "",
    partner_type: "teaming_partner",
    poc_name: "",
    poc_title: "",
    poc_email: "",
    poc_phone: "",
    address: "",
    website_url: "",
    uei: "",
    cage_code: "",
    duns_number: "",
    primary_naics: "",
    secondary_naics: [],
    certifications: [],
    socioeconomic_designations: [],
    core_capabilities: [],
    technologies_used: [],
    differentiators: [],
    past_performance_summary: "",
    key_projects_summary: [],
    target_agencies: [],
    contract_vehicles: [],
    key_personnel_summary: "",
    revenue_range: "",
    employee_count: null,
    years_in_business: null,
    geographic_coverage: [],
    quality_certifications: [],
    security_clearances: [],
    relationship_status: "potential",
    strategic_fit_score: null,
    collaboration_rating: null,
    notes: "",
    capability_statement_url: "",
    ai_extracted: false,
    extraction_date: null,
    extraction_confidence_score: null,
    ai_extracted_fields: [],
    tags: [] // NEW: Initialize tags array
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading user/org:", error);
      }
    };
    loadData();
  }, []);

  // Load existing partner if in edit mode
  const { data: existingPartner, isLoading: isLoadingPartner } = useQuery({
    queryKey: ['teaming-partner', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const partners = await base44.entities.TeamingPartner.filter({ id: partnerId });
      return partners.length > 0 ? partners[0] : null;
    },
    enabled: mode === 'edit' && !!partnerId,
  });

  useEffect(() => {
    if (existingPartner) {
      setFormData(existingPartner);
      setAiExtractedFields(existingPartner.ai_extracted_fields || []);
    }
  }, [existingPartner]);

  const savePartnerMutation = useMutation({
    mutationFn: async (data) => {
      if (mode === 'edit' && partnerId) {
        return base44.entities.TeamingPartner.update(partnerId, data);
      } else {
        return base44.entities.TeamingPartner.create({
          ...data,
          organization_id: organization.id
        });
      }
    },
    onSuccess: (savedPartner) => {
      queryClient.invalidateQueries({ queryKey: ['teaming-partners'] });
      queryClient.invalidateQueries({ queryKey: ['teaming-partner', partnerId] });
      
      toast.success(
        mode === 'edit' 
          ? `✅ ${formData.partner_name} updated successfully!`
          : `✅ ${formData.partner_name} added successfully!`
      );

      setSavedPartnerId(savedPartner.id);

      // If coming from proposal card, show return buttons
      if (returnTo === 'proposal' && proposalId) {
        setShowReturnButtons(true);
      } else {
        // Otherwise, navigate back to TeamingPartners page
        navigate(createPageUrl("TeamingPartners"));
      }
    },
  });

  const handleAIDataExtracted = (extractedData) => {
    console.log('[AddTeamingPartner] AI extraction data received:', extractedData);
    
    setFormData(prev => ({
      ...prev,
      ...extractedData
    }));
    
    setAiExtractedFields(extractedData.ai_extracted_fields || []);
    
    toast.success(
      `✨ AI extracted ${(extractedData.ai_extracted_fields || []).length} fields from capability statement`,
      { duration: 4000 }
    );
  };

  const handleSave = () => {
    // Validate required fields
    if (!formData.partner_name?.trim()) {
      toast.error("Company name is required");
      setActiveTab("basic");
      return;
    }

    savePartnerMutation.mutate(formData);
  };

  const handleReturnToProposal = async (role) => {
    if (!proposalId || !savedPartnerId) return;

    try {
      // Load the proposal
      const proposals = await base44.entities.Proposal.filter({ id: proposalId });
      if (proposals.length === 0) {
        toast.error("Proposal not found");
        return;
      }

      const proposal = proposals[0];

      // Update proposal based on role selection
      if (role === 'prime') {
        await base44.entities.Proposal.update(proposalId, {
          prime_contractor_id: savedPartnerId,
          prime_contractor_name: formData.partner_name
        });
        toast.success(`✅ ${formData.partner_name} set as Prime Contractor!`);
      } else if (role === 'sub') {
        const existingTeamingPartners = proposal.teaming_partner_ids || [];
        if (!existingTeamingPartners.includes(savedPartnerId)) {
          await base44.entities.Proposal.update(proposalId, {
            teaming_partner_ids: [...existingTeamingPartners, savedPartnerId]
          });
          toast.success(`✅ ${formData.partner_name} added as Teaming Partner!`);
        }
      }

      // Navigate back to proposal card
      navigate(`${createPageUrl("Pipeline")}?proposalId=${proposalId}&tab=checklist`);
      
    } catch (error) {
      console.error('[AddTeamingPartner] Error returning to proposal:', error);
      toast.error("Error updating proposal: " + error.message);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateArrayField = (field, value) => {
    // Convert comma-separated string to array
    const arrayValue = value.split(',').map(v => v.trim()).filter(v => v);
    setFormData(prev => ({ ...prev, [field]: arrayValue }));
  };

  const addArrayItem = (field, item) => {
    if (!item?.trim()) return;
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), item.trim()]
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // NEW: Tag management functions
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    addArrayItem('tags', tagInput);
    setTagInput("");
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const isFieldAIExtracted = (fieldName) => {
    return aiExtractedFields.includes(fieldName);
  };

  const AIFieldIndicator = ({ show }) => {
    if (!show) return null;
    return (
      <Badge className="bg-purple-100 text-purple-700 text-xs ml-2">
        <Sparkles className="w-3 h-3 mr-1" />
        AI
      </Badge>
    );
  };

  if (isLoadingPartner) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading partner details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => {
                if (returnTo === 'proposal') {
                  navigate(`${createPageUrl("Pipeline")}?proposalId=${proposalId}&tab=checklist`);
                } else {
                  navigate(createPageUrl("TeamingPartners"));
                }
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {mode === 'edit' ? 'Edit Teaming Partner' : 'Add New Teaming Partner'}
              </h1>
              <p className="text-slate-600 mt-1">
                {mode === 'edit' 
                  ? 'Update company information and details'
                  : 'Add a new teaming partner to your organization'
                }
              </p>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={savePartnerMutation.isPending || !formData.partner_name}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {savePartnerMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Partner
              </>
            )}
          </Button>
        </div>

        {/* Return to Proposal Buttons (shown after save when coming from proposal) */}
        {showReturnButtons && returnTo === 'proposal' && (
          <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-bold text-green-900 text-lg mb-2">
                    ✅ {formData.partner_name} Saved Successfully!
                  </h3>
                  <p className="text-green-800 mb-4">
                    How would you like to add this company to your proposal?
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleReturnToProposal('prime')}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Make Prime Contractor
                    </Button>
                    <Button
                      onClick={() => handleReturnToProposal('sub')}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Make Subcontractor/Partner
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate(`${createPageUrl("Pipeline")}?proposalId=${proposalId}&tab=checklist`)}
                    >
                      Return Without Adding
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Uploader Section (only in create mode or if no extraction done yet) */}
        {mode === 'create' && !formData.ai_extracted && (
          <CapabilityStatementUploader
            onDataExtracted={handleAIDataExtracted}
            disabled={savePartnerMutation.isPending}
          />
        )}

        {formData.ai_extracted && (
          <Card className="border-2 border-purple-300 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <div className="flex-1">
                  <p className="font-semibold text-purple-900">
                    AI-Extracted Data ({formData.extraction_confidence_score}% confidence)
                  </p>
                  <p className="text-sm text-purple-700">
                    {aiExtractedFields.length} fields were automatically populated. 
                    Look for the ✨ icon to identify AI-extracted fields.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Form */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 h-auto">
            <TabsTrigger value="basic" className="flex items-center gap-2 py-3">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Basic Info</span>
            </TabsTrigger>
            <TabsTrigger value="capabilities" className="flex items-center gap-2 py-3">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Capabilities</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2 py-3">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="personnel" className="flex items-center gap-2 py-3">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Personnel</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2 py-3">
              <DollarSign className="w-4 h-4" />
              <span className="hidden sm:inline">Financial</span>
            </TabsTrigger>
            <TabsTrigger value="internal" className="flex items-center gap-2 py-3">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Internal</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Basic Information */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Basic Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      Company Name *
                      <AIFieldIndicator show={isFieldAIExtracted('partner_name')} />
                    </Label>
                    <Input
                      value={formData.partner_name}
                      onChange={(e) => updateField('partner_name', e.target.value)}
                      placeholder="Acme Defense Solutions"
                      className={cn(isFieldAIExtracted('partner_name') && "border-purple-300")}
                    />
                  </div>

                  <div>
                    <Label>Partner Type</Label>
                    <Select value={formData.partner_type} onValueChange={(v) => updateField('partner_type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="prime">Prime Contractor</SelectItem>
                        <SelectItem value="subcontractor">Subcontractor</SelectItem>
                        <SelectItem value="teaming_partner">Teaming Partner</SelectItem>
                        <SelectItem value="consultant">Consultant</SelectItem>
                        <SelectItem value="vendor">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      Address
                      <AIFieldIndicator show={isFieldAIExtracted('address')} />
                    </Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      placeholder="123 Defense Ave, Arlington, VA 22202"
                      className={cn(isFieldAIExtracted('address') && "border-purple-300")}
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-1">
                      Website
                      <AIFieldIndicator show={isFieldAIExtracted('website_url')} />
                    </Label>
                    <Input
                      value={formData.website_url}
                      onChange={(e) => updateField('website_url', e.target.value)}
                      placeholder="https://example.com"
                      className={cn(isFieldAIExtracted('website_url') && "border-purple-300")}
                    />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Point of Contact</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-1">
                        POC Name
                        <AIFieldIndicator show={isFieldAIExtracted('poc_name')} />
                      </Label>
                      <Input
                        value={formData.poc_name}
                        onChange={(e) => updateField('poc_name', e.target.value)}
                        placeholder="John Smith"
                        className={cn(isFieldAIExtracted('poc_name') && "border-purple-300")}
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-1">
                        POC Title
                        <AIFieldIndicator show={isFieldAIExtracted('poc_title')} />
                      </Label>
                      <Input
                        value={formData.poc_title}
                        onChange={(e) => updateField('poc_title', e.target.value)}
                        placeholder="Business Development Manager"
                        className={cn(isFieldAIExtracted('poc_title') && "border-purple-300")}
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-1">
                        POC Email
                        <AIFieldIndicator show={isFieldAIExtracted('poc_email')} />
                      </Label>
                      <Input
                        type="email"
                        value={formData.poc_email}
                        onChange={(e) => updateField('poc_email', e.target.value)}
                        placeholder="john.smith@example.com"
                        className={cn(isFieldAIExtracted('poc_email') && "border-purple-300")}
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-1">
                        POC Phone
                        <AIFieldIndicator show={isFieldAIExtracted('poc_phone')} />
                      </Label>
                      <Input
                        value={formData.poc_phone}
                        onChange={(e) => updateField('poc_phone', e.target.value)}
                        placeholder="(555) 123-4567"
                        className={cn(isFieldAIExtracted('poc_phone') && "border-purple-300")}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-slate-900 mb-3">Government Identifiers</h4>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <Label className="flex items-center gap-1">
                        UEI
                        <AIFieldIndicator show={isFieldAIExtracted('uei')} />
                      </Label>
                      <Input
                        value={formData.uei}
                        onChange={(e) => updateField('uei', e.target.value)}
                        placeholder="ABCD1234EFGH"
                        className={cn(isFieldAIExtracted('uei') && "border-purple-300")}
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-1">
                        CAGE Code
                        <AIFieldIndicator show={isFieldAIExtracted('cage_code')} />
                      </Label>
                      <Input
                        value={formData.cage_code}
                        onChange={(e) => updateField('cage_code', e.target.value)}
                        placeholder="1A2B3"
                        className={cn(isFieldAIExtracted('cage_code') && "border-purple-300")}
                      />
                    </div>

                    <div>
                      <Label className="flex items-center gap-1">
                        DUNS Number
                        <AIFieldIndicator show={isFieldAIExtracted('duns_number')} />
                      </Label>
                      <Input
                        value={formData.duns_number}
                        onChange={(e) => updateField('duns_number', e.target.value)}
                        placeholder="123456789"
                        className={cn(isFieldAIExtracted('duns_number') && "border-purple-300")}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Capabilities & Certifications */}
          <TabsContent value="capabilities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  Core Capabilities & Certifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    NAICS Codes
                    <AIFieldIndicator show={isFieldAIExtracted('primary_naics') || isFieldAIExtracted('secondary_naics')} />
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-600 mb-1">Primary NAICS</Label>
                      <Input
                        value={formData.primary_naics}
                        onChange={(e) => updateField('primary_naics', e.target.value)}
                        placeholder="541330"
                        className={cn(isFieldAIExtracted('primary_naics') && "border-purple-300")}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 mb-1">Secondary NAICS (comma-separated)</Label>
                      <Input
                        value={(formData.secondary_naics || []).join(', ')}
                        onChange={(e) => updateArrayField('secondary_naics', e.target.value)}
                        placeholder="541511, 541512, 541519"
                        className={cn(isFieldAIExtracted('secondary_naics') && "border-purple-300")}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Small Business Certifications
                    <AIFieldIndicator show={isFieldAIExtracted('certifications')} />
                  </Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(formData.certifications || []).map((cert, idx) => (
                      <Badge key={idx} className="bg-blue-600 text-white flex items-center gap-1">
                        {cert}
                        <button
                          onClick={() => removeArrayItem('certifications', idx)}
                          className="ml-1 hover:text-red-200"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CERTIFICATIONS_OPTIONS.map(cert => (
                      <Button
                        key={cert}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!formData.certifications?.includes(cert)) {
                            addArrayItem('certifications', cert);
                          }
                        }}
                        disabled={formData.certifications?.includes(cert)}
                        className={cn(
                          formData.certifications?.includes(cert) && "opacity-50"
                        )}
                      >
                        {cert}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Core Capabilities
                    <AIFieldIndicator show={isFieldAIExtracted('core_capabilities')} />
                  </Label>
                  <Textarea
                    value={(formData.core_capabilities || []).join('\n')}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      core_capabilities: e.target.value.split('\n').filter(v => v.trim())
                    }))}
                    placeholder="Enter each capability on a new line&#10;Software Development&#10;Cybersecurity&#10;Cloud Migration"
                    rows={5}
                    className={cn(isFieldAIExtracted('core_capabilities') && "border-purple-300")}
                  />
                  <p className="text-xs text-slate-500 mt-1">Enter each capability on a new line</p>
                </div>

                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Technologies & Platforms
                    <AIFieldIndicator show={isFieldAIExtracted('technologies_used')} />
                  </Label>
                  <Textarea
                    value={(formData.technologies_used || []).join('\n')}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      technologies_used: e.target.value.split('\n').filter(v => v.trim())
                    }))}
                    placeholder="AWS&#10;Kubernetes&#10;Python"
                    rows={4}
                    className={cn(isFieldAIExtracted('technologies_used') && "border-purple-300")}
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Differentiators
                    <AIFieldIndicator show={isFieldAIExtracted('differentiators')} />
                  </Label>
                  <Textarea
                    value={(formData.differentiators || []).join('\n')}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      differentiators: e.target.value.split('\n').filter(v => v.trim())
                    }))}
                    placeholder="What makes this company unique?&#10;10+ years DoD experience&#10;Proprietary AI platform"
                    rows={4}
                    className={cn(isFieldAIExtracted('differentiators') && "border-purple-300")}
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Target Agencies
                    <AIFieldIndicator show={isFieldAIExtracted('target_agencies')} />
                  </Label>
                  <Input
                    value={(formData.target_agencies || []).join(', ')}
                    onChange={(e) => updateArrayField('target_agencies', e.target.value)}
                    placeholder="DoD, DHS, VA, GSA"
                    className={cn(isFieldAIExtracted('target_agencies') && "border-purple-300")}
                  />
                  <p className="text-xs text-slate-500 mt-1">Comma-separated</p>
                </div>

                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Contract Vehicles
                    <AIFieldIndicator show={isFieldAIExtracted('contract_vehicles')} />
                  </Label>
                  <Input
                    value={(formData.contract_vehicles || []).join(', ')}
                    onChange={(e) => updateArrayField('contract_vehicles', e.target.value)}
                    placeholder="GSA Schedule 70, SEWP V, CIO-SP3"
                    className={cn(isFieldAIExtracted('contract_vehicles') && "border-purple-300")}
                  />
                  <p className="text-xs text-slate-500 mt-1">Comma-separated</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Past Performance */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  Past Performance Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Past Performance Overview
                    <AIFieldIndicator show={isFieldAIExtracted('past_performance_summary')} />
                  </Label>
                  <Textarea
                    value={formData.past_performance_summary}
                    onChange={(e) => updateField('past_performance_summary', e.target.value)}
                    placeholder="Brief overview of their track record, notable achievements, and experience..."
                    rows={6}
                    className={cn(isFieldAIExtracted('past_performance_summary') && "border-purple-300")}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    General summary from capability statement. Add detailed projects to PastPerformance entity separately.
                  </p>
                </div>

                {formData.key_projects_summary && formData.key_projects_summary.length > 0 && (
                  <div>
                    <Label className="mb-2">Key Projects (AI Extracted)</Label>
                    <div className="space-y-3">
                      {formData.key_projects_summary.map((project, idx) => (
                        <Card key={idx} className="border border-purple-200 bg-purple-50">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-semibold text-slate-900">{project.project_name || 'Unnamed Project'}</p>
                                {project.client && (
                                  <p className="text-sm text-slate-600">Client: {project.client}</p>
                                )}
                                {project.description && (
                                  <p className="text-sm text-slate-700 mt-1">{project.description}</p>
                                )}
                                {project.value && (
                                  <Badge className="mt-2 bg-green-100 text-green-700">
                                    {project.value}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const updated = [...formData.key_projects_summary];
                                  updated.splice(idx, 1);
                                  updateField('key_projects_summary', updated);
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Key Personnel */}
          <TabsContent value="personnel" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Key Personnel Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Key Personnel Overview
                    <AIFieldIndicator show={isFieldAIExtracted('key_personnel_summary')} />
                  </Label>
                  <Textarea
                    value={formData.key_personnel_summary}
                    onChange={(e) => updateField('key_personnel_summary', e.target.value)}
                    placeholder="Summary of key personnel, their roles, and expertise..."
                    rows={6}
                    className={cn(isFieldAIExtracted('key_personnel_summary') && "border-purple-300")}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    General overview. Add detailed personnel records to KeyPersonnel entity separately for proposal use.
                  </p>
                </div>

                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Available Security Clearances
                    <AIFieldIndicator show={isFieldAIExtracted('security_clearances')} />
                  </Label>
                  <Input
                    value={(formData.security_clearances || []).join(', ')}
                    onChange={(e) => updateArrayField('security_clearances', e.target.value)}
                    placeholder="Secret, Top Secret, TS/SCI"
                    className={cn(isFieldAIExtracted('security_clearances') && "border-purple-300")}
                  />
                  <p className="text-xs text-slate-500 mt-1">Comma-separated</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Financial & Administrative */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Financial & Administrative Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center gap-1">
                      Revenue Range
                      <AIFieldIndicator show={isFieldAIExtracted('revenue_range')} />
                    </Label>
                    <Input
                      value={formData.revenue_range}
                      onChange={(e) => updateField('revenue_range', e.target.value)}
                      placeholder="$5M-$10M"
                      className={cn(isFieldAIExtracted('revenue_range') && "border-purple-300")}
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-1">
                      Employee Count
                      <AIFieldIndicator show={isFieldAIExtracted('employee_count')} />
                    </Label>
                    <Input
                      type="number"
                      value={formData.employee_count || ''}
                      onChange={(e) => updateField('employee_count', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="50"
                      className={cn(isFieldAIExtracted('employee_count') && "border-purple-300")}
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-1">
                      Years in Business
                      <AIFieldIndicator show={isFieldAIExtracted('years_in_business')} />
                    </Label>
                    <Input
                      type="number"
                      value={formData.years_in_business || ''}
                      onChange={(e) => updateField('years_in_business', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="10"
                      className={cn(isFieldAIExtracted('years_in_business') && "border-purple-300")}
                    />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Socioeconomic Designations
                    <AIFieldIndicator show={isFieldAIExtracted('socioeconomic_designations')} />
                  </Label>
                  <Input
                    value={(formData.socioeconomic_designations || []).join(', ')}
                    onChange={(e) => updateArrayField('socioeconomic_designations', e.target.value)}
                    placeholder="Small Disadvantaged Business, Woman-Owned Small Business"
                    className={cn(isFieldAIExtracted('socioeconomic_designations') && "border-purple-300")}
                  />
                  <p className="text-xs text-slate-500 mt-1">Comma-separated</p>
                </div>

                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Geographic Coverage
                    <AIFieldIndicator show={isFieldAIExtracted('geographic_coverage')} />
                  </Label>
                  <Input
                    value={(formData.geographic_coverage || []).join(', ')}
                    onChange={(e) => updateArrayField('geographic_coverage', e.target.value)}
                    placeholder="Mid-Atlantic, CONUS, Worldwide"
                    className={cn(isFieldAIExtracted('geographic_coverage') && "border-purple-300")}
                  />
                  <p className="text-xs text-slate-500 mt-1">Comma-separated</p>
                </div>

                <div>
                  <Label className="flex items-center gap-1 mb-2">
                    Quality Certifications
                    <AIFieldIndicator show={isFieldAIExtracted('quality_certifications')} />
                  </Label>
                  <Input
                    value={(formData.quality_certifications || []).join(', ')}
                    onChange={(e) => updateArrayField('quality_certifications', e.target.value)}
                    placeholder="ISO 9001, CMMI Level 3, AS9100"
                    className={cn(isFieldAIExtracted('quality_certifications') && "border-purple-300")}
                  />
                  <p className="text-xs text-slate-500 mt-1">Comma-separated</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 6: Internal Assessment */}
          <TabsContent value="internal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Relationship & Internal Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2">Relationship Status</Label>
                  <Select 
                    value={formData.relationship_status} 
                    onValueChange={(v) => updateField('relationship_status', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_STATUS_OPTIONS.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <Badge className={status.color}>{status.label}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-2">Strategic Fit Score (0-10)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.strategic_fit_score || ''}
                      onChange={(e) => updateField('strategic_fit_score', e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="8"
                    />
                    <p className="text-xs text-slate-500 mt-1">How well does this partner align with your strategy?</p>
                  </div>

                  <div>
                    <Label className="mb-2">Collaboration Rating (0-5)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={formData.collaboration_rating || ''}
                      onChange={(e) => updateField('collaboration_rating', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="4.5"
                    />
                    <p className="text-xs text-slate-500 mt-1">Based on past collaboration experience</p>
                  </div>
                </div>

                {/* NEW: Tags Section */}
                <div>
                  <Label className="mb-2">Internal Tags</Label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Add a tag (e.g., 'cybersecurity', 'preferred-vendor', 'east-coast')"
                      className="flex-1"
                    />
                    <Button 
                      type="button"
                      onClick={handleAddTag}
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tag
                    </Button>
                  </div>
                  
                  {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      {formData.tags.map((tag, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="flex items-center gap-1 px-3 py-1.5 text-sm"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeArrayItem('tags', idx)}
                            className="ml-1 hover:text-red-600 transition-colors"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-slate-500 mt-2">
                    Use tags for internal organization and quick filtering (e.g., 'high-priority', 'cybersecurity-expert', 'dmv-area')
                  </p>
                </div>

                <div>
                  <Label className="mb-2">Internal Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Internal notes about this partner, relationship history, strengths, concerns, etc."
                    rows={6}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    These notes are internal only and not visible to the partner
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bottom Action Bar */}
        <Card className="border-2 border-slate-200 sticky bottom-6 shadow-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {formData.ai_extracted && (
                  <Badge className="bg-purple-100 text-purple-700">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI-Assisted
                  </Badge>
                )}
                {!formData.partner_name && (
                  <p className="text-sm text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Company name is required
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (returnTo === 'proposal') {
                      navigate(`${createPageUrl("Pipeline")}?proposalId=${proposalId}&tab=checklist`);
                    } else {
                      navigate(createPageUrl("TeamingPartners"));
                    }
                  }}
                  disabled={savePartnerMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={savePartnerMutation.isPending || !formData.partner_name}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {savePartnerMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {mode === 'edit' ? 'Update Partner' : 'Save Partner'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
