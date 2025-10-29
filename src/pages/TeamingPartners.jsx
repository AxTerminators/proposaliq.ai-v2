import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Loader2
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
  const [uploadingDoc, setUploadingDoc] = useState(false);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaming-partners'] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.TeamingPartner.update(id, data);
    },
    onSuccess: () => {
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
    p.core_capabilities?.some(cap => cap.toLowerCase().includes(searchQuery.toLowerCase()))
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
                    placeholder="Search partners..."
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
                          {partner.core_capabilities?.slice(0, 2).map((cap, idx) => (
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
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Badge className={getStatusColor(selectedPartner.status)}>
                          {selectedPartner.status}
                        </Badge>
                        <Badge variant="outline">{selectedPartner.partner_type?.replace('_', ' ')}</Badge>
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
                                <Building2 className="w-4 h-4 text-slate-400 mt-0.5" />
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
                          <p className="text-sm text-slate-700 whitespace-pre-wrap bg-amber-50 border border-amber-200 p-4 rounded-lg">
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
                            onChange={(e) => handleDocumentUpload(e, "partner_past_performance", false)}
                            disabled={uploadingDoc}
                          />
                          <Button size="sm" variant="outline" asChild>
                            <label htmlFor="pp-upload" className="cursor-pointer">
                              <Upload className="w-3 h-3 mr-2" />
                              Upload (Permanent)
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
                            onChange={(e) => handleDocumentUpload(e, "partner_proposal", true)}
                            disabled={uploadingDoc}
                          />
                          <Button size="sm" variant="outline" className="border-amber-400" asChild>
                            <label htmlFor="temp-upload" className="cursor-pointer">
                              <Upload className="w-3 h-3 mr-2" />
                              Upload (Temporary)
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
                                    <Globe className="w-4 h-4" />
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
                Enter the partner's information and capabilities
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
                  />
                </div>

                <div className="space-y-2">
                  <Label>CAGE Code</Label>
                  <Input
                    value={formData.cage_code}
                    onChange={(e) => setFormData({...formData, cage_code: e.target.value})}
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
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingPartner(null); }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSavePartner}
                disabled={!formData.partner_name || createPartnerMutation.isPending || updatePartnerMutation.isPending}
              >
                {(createPartnerMutation.isPending || updatePartnerMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
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