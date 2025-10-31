
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  Search,
  Building2,
  Phone,
  Mail,
  Globe,
  Award,
  TrendingUp,
  FileText,
  Edit,
  Trash2,
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Tag,
  Sparkles,
  MapPin, // Added
  Star, // Added
  Download // Added
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CERTIFICATIONS = [
  "8(a)", "HUBZone", "SDVOSB", "VOSB", "WOSB", "EDWOSB", "SDB"
];

export default function TeamingPartners() {
  const queryClient = useQueryClient();
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [editingPartner, setEditingPartner] = useState(null);

  const [formData, setFormData] = useState({
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
    tags: [],
    core_capabilities: [],
    differentiators: [],
    past_performance_summary: "",
    target_agencies: [],
    notes: "",
    status: "active",
    revenue_range: "",
    employee_count: null,
    years_in_business: null
  });

  const [newItem, setNewItem] = useState("");
  const [newTag, setNewTag] = useState("");
  const [otherCertification, setOtherCertification] = useState("");
  const [showOtherCertInput, setShowOtherCertInput] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingCapStatement, setUploadingCapStatement] = useState(false);
  const [capabilityStatementFile, setCapabilityStatementFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isExtractingData, setIsExtractingData] = useState(false);

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
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: partners, isLoading } = useQuery({
    queryKey: ['teaming-partners', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.TeamingPartner.filter(
        { organization_id: organization.id },
        'partner_name'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const { data: partnerDocuments } = useQuery({
    queryKey: ['partner-documents', selectedPartner?.id],
    queryFn: async () => {
      if (!selectedPartner?.id) return [];
      return base44.entities.ProposalResource.filter(
        { teaming_partner_id: selectedPartner.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!selectedPartner?.id,
  });

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
      
      queryClient.invalidateQueries({ queryKey: ['teaming-partners'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.TeamingPartner.update(id, data);
    },
    onSuccess: async () => {
      if (capabilityStatementFile && editingPartner) {
        await uploadCapabilityStatement(editingPartner.id);
      }
      
      queryClient.invalidateQueries({ queryKey: ['teaming-partners'] });
      setEditingPartner(null);
      resetForm();
    },
  });

  const deletePartnerMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.TeamingPartner.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaming-partners'] });
      setSelectedPartner(null);
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, resourceType, temporaryStorage }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      return base44.entities.ProposalResource.create({
        organization_id: organization.id,
        teaming_partner_id: selectedPartner.id,
        is_partner_document: true,
        temporary_storage: temporaryStorage,
        resource_type: resourceType,
        file_name: file.name,
        file_url: file_url,
        file_size: file.size,
        entity_type: "teaming_partner"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-documents'] });
      setUploadingDoc(false);
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId) => {
      await base44.entities.ProposalResource.delete(docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-documents'] });
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
      queryClient.invalidateQueries({ queryKey: ['partner-documents'] });
    } catch (error) {
      console.error("Error uploading capability statement:", error);
      alert(`Error uploading capability statement: ${error.message}`);
    } finally {
      setUploadingCapStatement(false);
    }
  };

  const handleCapabilityStatementSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    setCapabilityStatementFile(file);
    setIsExtractingData(true);
    setExtractedData(null);
    
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadResult.file_url;
      
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
          past_performance_summary: { type: "string" },
          target_agencies: { type: "array", items: { type: "string" } },
          employee_count: { type: "number" },
          years_in_business: { type: "number" },
          revenue_range: { type: "string" }
        }
      };

      const aiResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: extractionSchema
      });

      if (aiResult.status === 'error') {
        throw new Error(aiResult.details || 'Failed to extract data');
      }

      const extracted = aiResult.output || {};

      const updatedFormData = { ...formData };
      let fieldsPopulated = [];

      if (extracted.partner_name && extracted.partner_name.trim() && !formData.partner_name) {
        updatedFormData.partner_name = extracted.partner_name;
        fieldsPopulated.push("Partner Name");
      }
      if (extracted.address && extracted.address.trim() && !formData.address) {
        updatedFormData.address = extracted.address;
        fieldsPopulated.push("Address");
      }
      if (extracted.website_url && extracted.website_url.trim() && !formData.website_url) {
        updatedFormData.website_url = extracted.website_url;
        fieldsPopulated.push("Website");
      }
      if (extracted.uei && extracted.uei.trim() && !formData.uei) {
        updatedFormData.uei = extracted.uei;
        fieldsPopulated.push("UEI");
      }
      if (extracted.cage_code && extracted.cage_code.trim() && !formData.cage_code) {
        updatedFormData.cage_code = extracted.cage_code;
        fieldsPopulated.push("CAGE Code");
      }
      if (extracted.primary_naics && extracted.primary_naics.trim() && !formData.primary_naics) {
        updatedFormData.primary_naics = extracted.primary_naics;
        fieldsPopulated.push("Primary NAICS");
      }
      if (extracted.secondary_naics && extracted.secondary_naics.length > 0) {
        updatedFormData.secondary_naics = extracted.secondary_naics.filter(n => n && n.trim());
        if (updatedFormData.secondary_naics.length > 0) {
          fieldsPopulated.push("Secondary NAICS");
        }
      }
      if (extracted.poc_name && extracted.poc_name.trim() && !formData.poc_name) {
        updatedFormData.poc_name = extracted.poc_name;
        fieldsPopulated.push("POC Name");
      }
      if (extracted.poc_email && extracted.poc_email.trim() && !formData.poc_email) {
        updatedFormData.poc_email = extracted.poc_email;
        fieldsPopulated.push("POC Email");
      }
      if (extracted.poc_phone && extracted.poc_phone.trim() && !formData.poc_phone) {
        updatedFormData.poc_phone = extracted.poc_phone;
        fieldsPopulated.push("POC Phone");
      }
      if (extracted.certifications && extracted.certifications.length > 0) {
        const validCerts = extracted.certifications.filter(c => c && c.trim());
        if (validCerts.length > 0) {
          updatedFormData.certifications = [...new Set([...(formData.certifications || []), ...validCerts])];
          fieldsPopulated.push(`${validCerts.length} Certifications`);
        }
      }
      if (extracted.core_capabilities && extracted.core_capabilities.length > 0) {
        const validCaps = extracted.core_capabilities.filter(c => c && c.trim());
        if (validCaps.length > 0) {
          updatedFormData.core_capabilities = validCaps;
          fieldsPopulated.push(`${validCaps.length} Core Capabilities`);
        }
      }
      if (extracted.differentiators && extracted.differentiators.length > 0) {
        const validDiffs = extracted.differentiators.filter(d => d && d.trim());
        if (validDiffs.length > 0) {
          updatedFormData.differentiators = validDiffs;
          fieldsPopulated.push(`${validDiffs.length} Differentiators`);
        }
      }
      if (extracted.past_performance_summary && extracted.past_performance_summary.trim() && !formData.past_performance_summary) {
        updatedFormData.past_performance_summary = extracted.past_performance_summary;
        fieldsPopulated.push("Past Performance Summary");
      }
      if (extracted.target_agencies && extracted.target_agencies.length > 0) {
        const validAgencies = extracted.target_agencies.filter(a => a && a.trim());
        if (validAgencies.length > 0) {
          updatedFormData.target_agencies = validAgencies;
          fieldsPopulated.push("Target Agencies");
        }
      }
      if (extracted.employee_count && extracted.employee_count > 0 && !formData.employee_count) {
        updatedFormData.employee_count = extracted.employee_count;
        fieldsPopulated.push("Employee Count");
      }
      if (extracted.years_in_business && extracted.years_in_business > 0 && !formData.years_in_business) {
        updatedFormData.years_in_business = extracted.years_in_business;
        fieldsPopulated.push("Years in Business");
      }
      if (extracted.revenue_range && extracted.revenue_range.trim() && !formData.revenue_range) {
        updatedFormData.revenue_range = extracted.revenue_range;
        fieldsPopulated.push("Revenue Range");
      }
      
      setFormData(updatedFormData);
      setExtractedData({
        fieldsPopulated,
        rawData: extracted
      });

      if (fieldsPopulated.length > 0) {
        alert(`✓ AI extracted and populated ${fieldsPopulated.length} fields from ${file.name}!\n\nFields: ${fieldsPopulated.join(', ')}\n\nPlease review and adjust as needed.`);
      } else {
        alert(`AI analyzed ${file.name} but couldn't find data to auto-populate. The document may not contain extractable information, or all fields are already filled.`);
      }

    } catch (error) {
      console.error('Error during extraction:', error);
      alert(`Error processing ${file.name}: ${error.message}\n\nPlease enter information manually or try a PDF version of the file.`);
    } finally {
      setIsExtractingData(false);
    }
  };

  const resetForm = () => {
    setFormData({
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
      tags: [],
      core_capabilities: [],
      differentiators: [],
      past_performance_summary: "",
      target_agencies: [],
      notes: "",
      status: "active",
      revenue_range: "",
      employee_count: null,
      years_in_business: null
    });
    setCapabilityStatementFile(null);
    setShowOtherCertInput(false);
    setOtherCertification("");
    setNewTag("");
    setExtractedData(null);
    setIsExtractingData(false);
  };

  const handleSavePartner = () => {
    if (editingPartner) {
      updatePartnerMutation.mutate({ id: editingPartner.id, data: formData });
    } else {
      createPartnerMutation.mutate(formData);
    }
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setFormData(partner);
    setShowCreateDialog(true);
  };

  const handleDelete = (partner) => {
    if (confirm(`Delete partner "${partner.partner_name}"?`)) {
      deletePartnerMutation.mutate(partner.id);
    }
  };

  const addArrayItem = (field) => {
    if (newItem.trim()) {
      setFormData({
        ...formData,
        [field]: [...(formData[field] || []), newItem.trim()]
      });
      setNewItem("");
    }
  };

  const removeArrayItem = (field, index) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  const toggleCertification = (cert) => {
    const certs = formData.certifications || [];
    if (certs.includes(cert)) {
      setFormData({
        ...formData,
        certifications: certs.filter(c => c !== cert)
      });
    } else {
      setFormData({
        ...formData,
        certifications: [...certs, cert]
      });
    }
  };

  const addOtherCertification = () => {
    if (otherCertification.trim() && !formData.certifications?.includes(otherCertification.trim())) {
      setFormData({
        ...formData,
        certifications: [...(formData.certifications || []), otherCertification.trim()]
      });
      setOtherCertification("");
      setShowOtherCertInput(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), newTag.trim()]
      });
      setNewTag("");
    }
  };

  const removeTag = (index) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };

  const handleDocumentUpload = async (e, resourceType, temporaryStorage) => {
    const file = e.target.files[0];
    if (file) {
      setUploadingDoc(true);
      await uploadDocumentMutation.mutateAsync({ file, resourceType, temporaryStorage });
    }
  };

  const filteredPartners = partners.filter(p =>
    p.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.poc_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.core_capabilities?.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase())) ||
    p.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "preferred": return "bg-purple-100 text-purple-700";
      case "active": return "bg-green-100 text-green-700";
      case "potential": return "bg-blue-100 text-blue-700";
      case "inactive": return "bg-slate-100 text-slate-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Teaming Partners & Subcontractors
            </h1>
            <p className="text-slate-600">Manage your partner network and collaboration documents</p>
          </div>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Partner
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Partner List */}
          <div className="lg:col-span-1">
            <Card className="border-none shadow-lg">
              <CardHeader className="border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name, capabilities, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  {isLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-slate-600">Loading partners...</p>
                    </div>
                  ) : filteredPartners.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm">No partners found</p>
                    </div>
                  ) : (
                    filteredPartners.map((partner) => (
                      <div
                        key={partner.id}
                        onClick={() => setSelectedPartner(partner)}
                        className={`p-4 border-b cursor-pointer transition-all ${
                          selectedPartner?.id === partner.id
                            ? 'bg-blue-50 border-l-4 border-l-blue-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900">{partner.partner_name}</h4>
                          <Badge className={getStatusColor(partner.status)}>
                            {partner.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{partner.poc_name}</p>
                        <div className="flex flex-wrap gap-1">
                          {partner.tags?.slice(0, 2).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {partner.core_capabilities?.slice(0, 1).map((cap, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cap}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Partner Details */}
          <div className="lg:col-span-2">
            {selectedPartner ? (
              <Card className="border-none shadow-lg">
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{selectedPartner.partner_name}</CardTitle>
                      <div className="flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                        <Badge className={getStatusColor(selectedPartner.status)}>
                          {selectedPartner.status}
                        </Badge>
                        <Badge variant="outline">{selectedPartner.partner_type?.replace('_', ' ')}</Badge>
                        {selectedPartner.tags?.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            <Tag className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEdit(selectedPartner)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(selectedPartner)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                      <TabsTrigger value="documents">Documents</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Contact Information
                          </h4>
                          <div className="space-y-3 text-sm">
                            {selectedPartner.poc_name && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span>{selectedPartner.poc_name}</span>
                              </div>
                            )}
                            {selectedPartner.poc_email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <a href={`mailto:${selectedPartner.poc_email}`} className="text-blue-600 hover:underline">
                                  {selectedPartner.poc_email}
                                </a>
                              </div>
                            )}
                            {selectedPartner.poc_phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" />
                                <span>{selectedPartner.poc_phone}</span>
                              </div>
                            )}
                            {selectedPartner.website_url && (
                              <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-slate-400" />
                                <a href={selectedPartner.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  Website
                                </a>
                              </div>
                            )}
                            {selectedPartner.address && (
                              <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                <span>{selectedPartner.address}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3">Identifiers</h4>
                          <div className="space-y-3 text-sm">
                            {selectedPartner.uei && (
                              <div>
                                <span className="text-slate-600">UEI:</span>
                                <span className="ml-2 font-mono">{selectedPartner.uei}</span>
                              </div>
                            )}
                            {selectedPartner.cage_code && (
                              <div>
                                <span className="text-slate-600">CAGE Code:</span>
                                <span className="ml-2 font-mono">{selectedPartner.cage_code}</span>
                              </div>
                            )}
                            {selectedPartner.primary_naics && (
                              <div>
                                <span className="text-slate-600">Primary NAICS:</span>
                                <span className="ml-2">{selectedPartner.primary_naics}</span>
                              </div>
                            )}
                            {selectedPartner.secondary_naics?.length > 0 && (
                              <div>
                                <span className="text-slate-600">Secondary NAICS:</span>
                                <span className="ml-2">{selectedPartner.secondary_naics.join(', ')}</span>
                              </div>
                            )}
                            {selectedPartner.employee_count && (
                              <div>
                                <span className="text-slate-600">Employees:</span>
                                <span className="ml-2">{selectedPartner.employee_count}</span>
                              </div>
                            )}
                            {selectedPartner.years_in_business && (
                              <div>
                                <span className="text-slate-600">Years in Business:</span>
                                <span className="ml-2">{selectedPartner.years_in_business}</span>
                              </div>
                            )}
                             {selectedPartner.revenue_range && (
                              <div>
                                <span className="text-slate-600">Revenue Range:</span>
                                <span className="ml-2">{selectedPartner.revenue_range}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {selectedPartner.certifications && selectedPartner.certifications.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            Certifications
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedPartner.certifications.map((cert, idx) => (
                              <Badge key={idx} className="bg-green-100 text-green-700">
                                {cert}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedPartner.past_performance_summary && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3">Past Performance Summary</h4>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg">
                            {selectedPartner.past_performance_summary}
                          </p>
                        </div>
                      )}

                      {selectedPartner.notes && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3">Internal Notes</h4>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap bg-amber-50 p-4 rounded-lg border border-amber-200">
                            {selectedPartner.notes}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="capabilities" className="space-y-6">
                      {selectedPartner.core_capabilities && selectedPartner.core_capabilities.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3">Core Capabilities</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedPartner.core_capabilities.map((cap, idx) => (
                              <Badge key={idx} variant="secondary" className="text-sm">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedPartner.differentiators && selectedPartner.differentiators.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Key Differentiators
                          </h4>
                          <ul className="space-y-2">
                            {selectedPartner.differentiators.map((diff, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{diff}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedPartner.target_agencies && selectedPartner.target_agencies.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3">Target Agencies</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedPartner.target_agencies.map((agency, idx) => (
                              <Badge key={idx} variant="outline">
                                {agency}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="documents" className="space-y-4">
                      <Alert className="bg-blue-50 border-blue-200">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <AlertDescription>
                          <p className="font-semibold text-blue-900 mb-1">📄 Upload PDF Files Only</p>
                          <p className="text-sm text-blue-800">
                            Upload <strong>PDF versions</strong> of documents so AI can help analyze them for proposals. 
                            Convert Word/Excel files to PDF first.
                          </p>
                        </AlertDescription>
                      </Alert>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Document Storage Options
                        </h4>
                        <p className="text-sm text-blue-800">
                          You can mark documents as "Temporary Storage" - these will be automatically deleted after the proposal is finalized to protect sensitive information.
                        </p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="border-2 border-dashed rounded-lg p-6 text-center">
                          <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                          <h5 className="font-semibold mb-2">Past Performance</h5>
                          <input
                            type="file"
                            id="pp-upload"
                            className="hidden"
                            accept=".pdf"
                            onChange={(e) => handleDocumentUpload(e, "partner_past_performance", false)}
                            disabled={uploadingDoc}
                          />
                          <Button size="sm" variant="outline" asChild>
                            <label htmlFor="pp-upload" className="cursor-pointer">
                              <Upload className="w-3 h-3 mr-2" />
                              Upload PDF (Permanent)
                            </label>
                          </Button>
                        </div>

                        <div className="border-2 border-dashed border-amber-300 rounded-lg p-6 text-center bg-amber-50">
                          <FileText className="w-12 h-12 mx-auto text-amber-600 mb-3" />
                          <h5 className="font-semibold mb-2">Sensitive Documents</h5>
                          <input
                            type="file"
                            id="temp-upload"
                            className="hidden"
                            accept=".pdf"
                            onChange={(e) => handleDocumentUpload(e, "partner_proposal", true)}
                            disabled={uploadingDoc}
                          />
                          <Button size="sm" variant="outline" className="border-amber-400" asChild>
                            <label htmlFor="temp-upload" className="cursor-pointer">
                              <Upload className="w-3 h-3 mr-2" />
                              Upload PDF (Temporary)
                            </label>
                          </Button>
                          <p className="text-xs text-amber-700 mt-2">Auto-deleted after finalization</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="font-semibold">Uploaded Documents</h5>
                        {partnerDocuments.length === 0 ? (
                          <div className="text-center py-8 text-slate-500">
                            <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p className="text-sm">No documents uploaded yet</p>
                          </div>
                        ) : (
                          partnerDocuments.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3 flex-1">
                                <FileText className="w-6 h-6 text-blue-600" />
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{doc.file_name}</p>
                                  <div className="flex gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {doc.resource_type?.replace(/_/g, ' ')}
                                    </Badge>
                                    {doc.temporary_storage && (
                                      <Badge className="bg-amber-100 text-amber-700 text-xs">
                                        Temporary
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" asChild>
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4" />
                                  </a>
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => deleteDocumentMutation.mutate(doc.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-none shadow-lg h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Select a Partner</h3>
                  <p className="text-sm text-slate-600">
                    Choose a partner from the list to view details and documents
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPartner ? "Edit Partner" : "Add New Partner"}</DialogTitle>
              <DialogDescription>
                Enter the partner's information. Upload a PDF capability statement for AI to auto-fill fields.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Partner Name *</Label>
                  <Input
                    value={formData.partner_name}
                    onChange={(e) => setFormData({...formData, partner_name: e.target.value})}
                    placeholder="Company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Partner Type</Label>
                  <Select value={formData.partner_type} onValueChange={(value) => setFormData({...formData, partner_type: value})}>
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

              {/* Capability Statement Upload - AT TOP WITH AI EXTRACTION */}
              <div className="space-y-2">
                <Label>Upload PDF Capability Statement (Optional - AI Auto-Fill)</Label>
                
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
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <AlertDescription>
                      <p className="font-semibold text-blue-900">AI is reading your PDF...</p>
                      <p className="text-xs text-blue-700 mt-1">Extracting contact info, certifications, capabilities, and more.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {!isExtractingData && extractedData && extractedData.fieldsPopulated.length > 0 && (
                  <Alert className="bg-green-50 border-green-200">
                    <Sparkles className="w-4 h-4 text-green-600" />
                    <AlertDescription>
                      <p className="font-semibold text-green-900 mb-1">✓ AI Auto-Populated {extractedData.fieldsPopulated.length} Fields!</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {extractedData.fieldsPopulated.map((field, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-green-100 text-green-700">
                            {field}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-green-700 mt-2">Please review and adjust the information below as needed.</p>
                    </AlertDescription>
                  </Alert>
                )}

                {!isExtractingData && extractedData && extractedData.fieldsPopulated.length === 0 && (
                  <Alert variant="default" className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription>
                      <p className="font-semibold text-amber-900">AI analysis complete, but no new fields could be populated.</p>
                      <p className="text-xs text-amber-700 mt-1">This might happen if the document is too sparse or all fields were already filled. Please review manually.</p>
                    </AlertDescription>
                  </Alert>
                )}


                <div className="border-2 border-dashed rounded-lg p-6 text-center bg-blue-50">
                  {capabilityStatementFile ? (
                    <div className="space-y-3">
                      <FileText className="w-12 h-12 mx-auto text-blue-600" />
                      <div>
                        <p className="font-semibold text-sm">{capabilityStatementFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {(capabilityStatementFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCapabilityStatementFile(null);
                          setExtractedData(null);
                          setIsExtractingData(false);
                        }}
                        disabled={isExtractingData}
                      >
                        <X className="w-3 h-3 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <>
                      <FileText className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                      <input
                        type="file"
                        id="cap-statement-upload"
                        className="hidden"
                        accept=".pdf"
                        onChange={handleCapabilityStatementSelect}
                        disabled={isExtractingData}
                      />
                      <Button size="sm" variant="outline" asChild disabled={isExtractingData}>
                        <label htmlFor="cap-statement-upload" className="cursor-pointer">
                          <Upload className="w-3 h-3 mr-2" />
                          Upload PDF Capability Statement
                        </label>
                      </Button>
                      <p className="text-xs text-slate-500 mt-2">PDF format only • AI will auto-fill form fields</p>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preferred">Preferred</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="potential">Potential</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Primary NAICS Code</Label>
                <Input
                  value={formData.primary_naics}
                  onChange={(e) => setFormData({...formData, primary_naics: e.target.value})}
                  placeholder="e.g., 541330"
                />
                <p className="text-xs text-slate-500">North American Industry Classification System code</p>
              </div>

              <div className="space-y-2">
                <Label>POC Name</Label>
                <Input
                  value={formData.poc_name}
                  onChange={(e) => setFormData({...formData, poc_name: e.target.value})}
                  placeholder="Contact person"
                />
              </div>

              <div className="space-y-2">
                <Label>POC Email</Label>
                <Input
                  type="email"
                  value={formData.poc_email}
                  onChange={(e) => setFormData({...formData, poc_email: e.target.value})}
                  placeholder="email@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label>POC Phone</Label>
                <Input
                  value={formData.poc_phone}
                  onChange={(e) => setFormData({...formData, poc_phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label>UEI</Label>
                <Input
                  value={formData.uei}
                  onChange={(e) => setFormData({...formData, uei: e.target.value})}
                  placeholder="Unique Entity Identifier"
                />
              </div>

              <div className="space-y-2">
                <Label>CAGE Code</Label>
                <Input
                  value={formData.cage_code}
                  onChange={(e) => setFormData({...formData, cage_code: e.target.value})}
                  placeholder="Commercial and Government Entity Code"
                />
              </div>

              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  value={formData.website_url}
                  onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                  placeholder="https://partner.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Revenue Range</Label>
                <Input
                  value={formData.revenue_range}
                  onChange={(e) => setFormData({...formData, revenue_range: e.target.value})}
                  placeholder="$1M-$5M, $500K, etc."
                />
              </div>

              <div className="space-y-2">
                <Label>Employee Count</Label>
                <Input
                  type="number"
                  value={formData.employee_count || ""}
                  onChange={(e) => setFormData({...formData, employee_count: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="e.g., 50"
                />
              </div>

              <div className="space-y-2">
                <Label>Years in Business</Label>
                <Input
                  type="number"
                  value={formData.years_in_business || ""}
                  onChange={(e) => setFormData({...formData, years_in_business: e.target.value ? parseInt(e.target.value) : null})}
                  placeholder="e.g., 10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Street, City, State, ZIP"
              />
            </div>

            {/* Secondary NAICS Codes */}
            <div className="space-y-2">
              <Label>Secondary NAICS Codes</Label>
              <div className="flex gap-2">
                <Input
                  value={newItem} 
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Add secondary NAICS code"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('secondary_naics'))}
                />
                <Button type="button" onClick={() => addArrayItem('secondary_naics')}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-slate-50 rounded-lg min-h-[40px]">
                {formData.secondary_naics?.length > 0 ? (
                  formData.secondary_naics.map((naics, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {naics}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeArrayItem('secondary_naics', idx)} />
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 flex items-center h-full">
                    No secondary NAICS codes added yet.
                  </p>
                )}
              </div>
            </div>

            {/* Small Business Certifications with "Other" option */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                Small Business Certifications
              </Label>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-lg">
                {CERTIFICATIONS.map((cert) => (
                  <Badge
                    key={cert}
                    variant={formData.certifications?.includes(cert) ? "default" : "outline"}
                    className="cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => toggleCertification(cert)}
                  >
                    {formData.certifications?.includes(cert) && (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
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
                    placeholder="Enter custom certification (e.g., ISO 9001)"
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

              {/* Display custom certifications */}
              {formData.certifications?.filter(cert => !CERTIFICATIONS.includes(cert)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <p className="text-xs text-slate-600 w-full">Custom certifications:</p>
                  {formData.certifications.filter(cert => !CERTIFICATIONS.includes(cert)).map((cert, idx) => (
                    <Badge key={idx} className="bg-blue-100 text-blue-700 gap-1">
                      {cert}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => setFormData({
                          ...formData, 
                          certifications: formData.certifications.filter(c => c !== cert)
                        })} 
                      />
                    </Badge>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-slate-500">Click badges to select/deselect, or add custom certifications</p>
            </div>

            {/* Tagging System */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag (e.g., GA, NC, PMP, CMMC)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" onClick={addTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-slate-50 rounded-lg min-h-[60px]">
                {formData.tags?.length > 0 ? (
                  formData.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      <Tag className="w-3 h-3" />
                      {tag}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(idx)} />
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 flex items-center h-full">
                    No tags added yet. Tags help with search and categorization.
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Add tags for states (GA, NC), certifications (PMP, CMMC), or any custom categorization
              </p>
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
                {formData.core_capabilities.map((cap, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {cap}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeArrayItem('core_capabilities', idx)} />
                  </Badge>
                ))}
              </div>
            </div>

            {/* Differentiators */}
            <div className="space-y-2">
              <Label>Key Differentiators</Label>
              <div className="flex gap-2">
                <Input
                  value={newItem} 
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Add a key differentiator"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('differentiators'))}
                />
                <Button type="button" onClick={() => addArrayItem('differentiators')}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-slate-50 rounded-lg min-h-[40px]">
                {formData.differentiators?.length > 0 ? (
                  formData.differentiators.map((diff, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {diff}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeArrayItem('differentiators', idx)} />
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 flex items-center h-full">
                    No differentiators added yet.
                  </p>
                )}
              </div>
            </div>

            {/* Target Agencies */}
            <div className="space-y-2">
              <Label>Target Agencies</Label>
              <div className="flex gap-2">
                <Input
                  value={newItem} 
                  onChange={(e) => setNewItem(e.target.value)}
                  placeholder="Add target agency (e.g., DoD, VA)"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('target_agencies'))}
                />
                <Button type="button" onClick={() => addArrayItem('target_agencies')}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 p-3 bg-slate-50 rounded-lg min-h-[40px]">
                {formData.target_agencies?.length > 0 ? (
                  formData.target_agencies.map((agency, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {agency}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeArrayItem('target_agencies', idx)} />
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 flex items-center h-full">
                    No target agencies added yet.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Past Performance Summary</Label>
              <Textarea
                value={formData.past_performance_summary}
                onChange={(e) => setFormData({...formData, past_performance_summary: e.target.value})}
                rows={4}
                placeholder="Brief overview of their past performance..."
              />
            </div>

            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                placeholder="Internal notes about this partner..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingPartner(null); resetForm(); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSavePartner}
                disabled={!formData.partner_name || createPartnerMutation.isPending || updatePartnerMutation.isPending || uploadingCapStatement || isExtractingData}
              >
                {(createPartnerMutation.isPending || updatePartnerMutation.isPending || uploadingCapStatement || isExtractingData) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isExtractingData ? "Extracting..." : uploadingCapStatement ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  editingPartner ? "Update Partner" : "Add Partner"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
