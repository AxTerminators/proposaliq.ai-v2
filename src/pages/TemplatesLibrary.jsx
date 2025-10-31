import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileText,
  Search,
  Plus,
  Star,
  Copy,
  Trash2,
  TrendingUp,
  Building2,
  Briefcase,
  Globe,
  Loader2,
  Eye,
  Download,
  Filter,
  Award,
  CheckCircle2,
  Sparkles,
  BookOpen
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TemplatesLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterAgency, setFilterAgency] = useState("all");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    template_name: "",
    template_type: "general",
    description: "",
    agency_name: "",
    contract_type: "",
    industry: "",
    sections: []
  });

  useEffect(() => {
    const loadOrg = async () => {
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
        console.error("Error loading org:", error);
      }
    };
    loadOrg();
  }, []);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Load both user templates and system templates
      const [userTemplates, systemTemplates] = await Promise.all([
        base44.entities.ProposalTemplate.filter({ organization_id: organization.id }, '-created_date'),
        base44.entities.ProposalTemplate.filter({ is_system_template: true }, '-created_date')
      ]);
      
      return [...systemTemplates, ...userTemplates];
    },
    enabled: !!organization?.id,
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData) => {
      return base44.entities.ProposalTemplate.create({
        ...templateData,
        organization_id: organization.id,
        usage_count: 0,
        is_system_template: false,
        is_public: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setShowCreateDialog(false);
      setNewTemplate({
        template_name: "",
        template_type: "general",
        description: "",
        agency_name: "",
        contract_type: "",
        industry: "",
        sections: []
      });
      alert("Template created successfully!");
    },
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (template) => {
      // Create a new proposal from this template
      const proposal = await base44.entities.Proposal.create({
        organization_id: organization.id,
        proposal_name: `New ${template.template_name}`,
        project_type: template.contract_type || "RFP",
        status: "draft",
        current_phase: "phase1"
      });

      // Create sections from template
      if (template.sections && template.sections.length > 0) {
        for (const section of template.sections) {
          await base44.entities.ProposalSection.create({
            proposal_id: proposal.id,
            section_name: section.section_name,
            section_type: section.section_type || "custom",
            content: section.boilerplate_content || "",
            order: section.order || 0,
            status: "draft"
          });
        }
      }

      // Update usage count
      await base44.entities.ProposalTemplate.update(template.id, {
        usage_count: (template.usage_count || 0) + 1
      });

      return proposal;
    },
    onSuccess: (proposal) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`));
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      await base44.entities.ProposalTemplate.delete(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      alert("Template deleted successfully!");
    },
  });

  const handleCreateTemplate = () => {
    if (!newTemplate.template_name.trim()) {
      alert("Please enter a template name");
      return;
    }

    createTemplateMutation.mutate(newTemplate);
  };

  const handleUseTemplate = (template) => {
    if (confirm(`Create a new proposal using "${template.template_name}"?`)) {
      useTemplateMutation.mutate(template);
    }
  };

  const handleDeleteTemplate = (template) => {
    if (template.is_system_template) {
      alert("System templates cannot be deleted");
      return;
    }

    if (confirm(`Delete template "${template.template_name}"? This cannot be undone.`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.agency_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || template.template_type === filterType;
    const matchesAgency = filterAgency === "all" || template.agency_name === filterAgency;
    const matchesIndustry = filterIndustry === "all" || template.industry === filterIndustry;

    return matchesSearch && matchesType && matchesAgency && matchesIndustry;
  });

  // Get unique values for filters
  const uniqueAgencies = [...new Set(templates.filter(t => t.agency_name).map(t => t.agency_name))];
  const uniqueIndustries = [...new Set(templates.filter(t => t.industry).map(t => t.industry))];

  // Categorize templates
  const systemTemplates = filteredTemplates.filter(t => t.is_system_template);
  const myTemplates = filteredTemplates.filter(t => !t.is_system_template && t.organization_id === organization?.id);
  const publicTemplates = filteredTemplates.filter(t => !t.is_system_template && t.is_public && t.organization_id !== organization?.id);

  const getTemplateIcon = (type) => {
    switch (type) {
      case 'agency_specific': return Building2;
      case 'contract_type': return FileText;
      case 'industry': return Briefcase;
      default: return Globe;
    }
  };

  const TemplateCard = ({ template }) => {
    const Icon = getTemplateIcon(template.template_type);
    
    return (
      <Card className="border-none shadow-lg hover:shadow-xl transition-all group">
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex gap-2">
              {template.is_system_template && (
                <Badge className="bg-amber-100 text-amber-700">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Official
                </Badge>
              )}
              {template.is_public && !template.is_system_template && (
                <Badge variant="outline" className="text-blue-600">
                  <Globe className="w-3 h-3 mr-1" />
                  Community
                </Badge>
              )}
              {template.average_win_rate && (
                <Badge variant="outline" className="text-green-600">
                  <Award className="w-3 h-3 mr-1" />
                  {Math.round(template.average_win_rate)}% Win Rate
                </Badge>
              )}
            </div>
          </div>
          <CardTitle className="text-lg">{template.template_name}</CardTitle>
          <CardDescription className="line-clamp-2">
            {template.description || "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="capitalize">
              {template.template_type.replace(/_/g, ' ')}
            </Badge>
            {template.agency_name && (
              <Badge variant="outline">{template.agency_name}</Badge>
            )}
            {template.contract_type && (
              <Badge variant="outline">{template.contract_type}</Badge>
            )}
            {template.industry && (
              <Badge variant="outline" className="capitalize">
                {template.industry.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-600 mb-4">
            {template.sections?.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {template.sections.length} sections
              </span>
            )}
            {template.usage_count > 0 && (
              <span className="flex items-center gap-1">
                <Copy className="w-4 h-4" />
                {template.usage_count}x used
              </span>
            )}
            {template.estimated_completion_time_hours && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                ~{template.estimated_completion_time_hours}h
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleUseTemplate(template)}
              disabled={useTemplateMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {useTemplateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Use Template
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSelectedTemplate(template);
                setShowPreview(true);
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
            {!template.is_system_template && template.organization_id === organization?.id && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDeleteTemplate(template)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Template Marketplace</h1>
            <p className="text-slate-600">Start faster with pre-built proposal structures</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Sparkles className="w-8 h-8 text-amber-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{systemTemplates.length}</p>
                  <p className="text-xs text-slate-600">Official Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{myTemplates.length}</p>
                  <p className="text-xs text-slate-600">My Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <Globe className="w-8 h-8 text-purple-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{publicTemplates.length}</p>
                  <p className="text-xs text-slate-600">Community Templates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {templates.reduce((sum, t) => sum + (t.usage_count || 0), 0)}
                  </p>
                  <p className="text-xs text-slate-600">Total Uses</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="border-none shadow-lg mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Search templates by name, description, or agency..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="agency_specific">Agency Specific</SelectItem>
                    <SelectItem value="contract_type">Contract Type</SelectItem>
                    <SelectItem value="industry">Industry</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>

                {uniqueAgencies.length > 0 && (
                  <Select value={filterAgency} onValueChange={setFilterAgency}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by agency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agencies</SelectItem>
                      {uniqueAgencies.map(agency => (
                        <SelectItem key={agency} value={agency}>{agency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {uniqueIndustries.length > 0 && (
                  <Select value={filterIndustry} onValueChange={setFilterIndustry}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      {uniqueIndustries.map(industry => (
                        <SelectItem key={industry} value={industry} className="capitalize">
                          {industry.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {(filterType !== "all" || filterAgency !== "all" || filterIndustry !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterType("all");
                      setFilterAgency("all");
                      setFilterIndustry("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Templates Grid with Tabs */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Found</h3>
              <p className="text-slate-600 mb-6">
                {searchQuery ? "Try adjusting your search or filters" : "Create your first template to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">
                All Templates ({filteredTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="official">
                <Sparkles className="w-4 h-4 mr-2" />
                Official ({systemTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="mine">
                <FileText className="w-4 h-4 mr-2" />
                My Templates ({myTemplates.length})
              </TabsTrigger>
              {publicTemplates.length > 0 && (
                <TabsTrigger value="community">
                  <Globe className="w-4 h-4 mr-2" />
                  Community ({publicTemplates.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="official" className="space-y-6">
              {systemTemplates.length === 0 ? (
                <p className="text-center text-slate-500 py-12">No official templates available</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {systemTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="mine" className="space-y-6">
              {myTemplates.length === 0 ? (
                <Card className="border-2 border-dashed">
                  <CardContent className="p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Custom Templates Yet</h3>
                    <p className="text-slate-600 mb-6">
                      Create your own templates for faster proposal creation
                    </p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {myTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              )}
            </TabsContent>

            {publicTemplates.length > 0 && (
              <TabsContent value="community" className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {publicTemplates.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}

        {/* Create Template Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a reusable proposal template with pre-configured sections and settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                  value={newTemplate.template_name}
                  onChange={(e) => setNewTemplate({...newTemplate, template_name: e.target.value})}
                  placeholder="e.g., DoD IT Services RFP Template"
                />
              </div>

              <div className="space-y-2">
                <Label>Template Type *</Label>
                <Select
                  value={newTemplate.template_type}
                  onValueChange={(value) => setNewTemplate({...newTemplate, template_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Template</SelectItem>
                    <SelectItem value="agency_specific">Agency Specific</SelectItem>
                    <SelectItem value="contract_type">Contract Type</SelectItem>
                    <SelectItem value="industry">Industry Specific</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newTemplate.template_type === 'agency_specific' && (
                <div className="space-y-2">
                  <Label>Agency Name</Label>
                  <Input
                    value={newTemplate.agency_name}
                    onChange={(e) => setNewTemplate({...newTemplate, agency_name: e.target.value})}
                    placeholder="e.g., Department of Defense, GSA, DHS"
                  />
                </div>
              )}

              {newTemplate.template_type === 'contract_type' && (
                <div className="space-y-2">
                  <Label>Contract Type</Label>
                  <Select
                    value={newTemplate.contract_type}
                    onValueChange={(value) => setNewTemplate({...newTemplate, contract_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contract type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FFP">Fixed Firm Price (FFP)</SelectItem>
                      <SelectItem value="T&M">Time & Materials (T&M)</SelectItem>
                      <SelectItem value="CPFF">Cost Plus Fixed Fee (CPFF)</SelectItem>
                      <SelectItem value="IDIQ">Indefinite Delivery/Indefinite Quantity (IDIQ)</SelectItem>
                      <SelectItem value="BPA">Blanket Purchase Agreement (BPA)</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newTemplate.template_type === 'industry' && (
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select
                    value={newTemplate.industry}
                    onValueChange={(value) => setNewTemplate({...newTemplate, industry: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IT_services">IT Services</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="construction">Construction</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="research">Research & Development</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  rows={3}
                  placeholder="Describe when to use this template..."
                />
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> After creating the template, you can add pre-configured sections
                  and compliance requirements by editing it from the template details page.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={createTemplateMutation.isPending}
              >
                {createTemplateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Template"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedTemplate?.template_name}</DialogTitle>
              <DialogDescription>
                {selectedTemplate?.description}
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <div className="space-y-6 py-4">
                {/* Template Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-slate-600">Type</Label>
                    <p className="capitalize font-medium">
                      {selectedTemplate.template_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  {selectedTemplate.agency_name && (
                    <div>
                      <Label className="text-sm text-slate-600">Agency</Label>
                      <p className="font-medium">{selectedTemplate.agency_name}</p>
                    </div>
                  )}
                  {selectedTemplate.contract_type && (
                    <div>
                      <Label className="text-sm text-slate-600">Contract Type</Label>
                      <p className="font-medium">{selectedTemplate.contract_type}</p>
                    </div>
                  )}
                  {selectedTemplate.usage_count > 0 && (
                    <div>
                      <Label className="text-sm text-slate-600">Usage</Label>
                      <p className="font-medium">{selectedTemplate.usage_count} times</p>
                    </div>
                  )}
                </div>

                {/* Sections */}
                {selectedTemplate.sections && selectedTemplate.sections.length > 0 && (
                  <div>
                    <Label className="text-lg font-semibold mb-3 block">
                      Template Sections ({selectedTemplate.sections.length})
                    </Label>
                    <div className="space-y-2">
                      {selectedTemplate.sections.map((section, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{section.section_name}</p>
                              {section.guidance && (
                                <p className="text-sm text-slate-600 mt-1">{section.guidance}</p>
                              )}
                            </div>
                            {section.is_required && (
                              <Badge variant="outline" className="text-red-600">Required</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setShowPreview(false);
                handleUseTemplate(selectedTemplate);
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Use This Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}