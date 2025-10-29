import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  FileText,
  Plus,
  Edit,
  Trash2,
  Star,
  Copy,
  Mail,
  History,
  Search,
  Upload,
  Settings as SettingsIcon,
  TrendingUp,
  Calendar,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Archive
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function ExportCenter() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedExports, setSelectedExports] = useState([]);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: templates } = useQuery({
    queryKey: ['export-templates', currentOrgId],
    queryFn: () => currentOrgId ? base44.entities.ExportTemplate.filter({ organization_id: currentOrgId }, '-is_default,-created_date') : [],
    initialData: [],
    enabled: !!currentOrgId
  });

  const { data: exportHistory } = useQuery({
    queryKey: ['export-history', currentOrgId],
    queryFn: () => currentOrgId ? base44.entities.ExportHistory.filter({ organization_id: currentOrgId }, '-created_date') : [],
    initialData: [],
    enabled: !!currentOrgId
  });

  const { data: proposals } = useQuery({
    queryKey: ['proposals', currentOrgId],
    queryFn: () => currentOrgId ? base44.entities.Proposal.filter({ organization_id: currentOrgId }, '-created_date') : [],
    initialData: [],
    enabled: !!currentOrgId
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData) => {
      await base44.entities.ExportTemplate.create({
        ...templateData,
        organization_id: currentOrgId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-templates'] });
      setShowTemplateDialog(false);
      alert("Template created successfully!");
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ templateId, updates }) => {
      await base44.entities.ExportTemplate.update(templateId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-templates'] });
      setShowTemplateDialog(false);
      alert("Template updated successfully!");
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      await base44.entities.ExportTemplate.delete(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-templates'] });
      alert("Template deleted successfully!");
    }
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const newTemplate = { ...template };
      delete newTemplate.id;
      delete newTemplate.created_date;
      delete newTemplate.updated_date;
      delete newTemplate.created_by;
      newTemplate.template_name = `${template.template_name} (Copy)`;
      newTemplate.is_default = false;
      newTemplate.usage_count = 0;
      await base44.entities.ExportTemplate.create(newTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-templates'] });
      alert("Template duplicated successfully!");
    }
  });

  const handleCreateTemplate = () => {
    setSelectedTemplate({
      template_name: "",
      template_type: "standard",
      agency_name: "",
      page_size: "letter",
      font_family: "Times New Roman",
      font_size: 12,
      line_spacing: 1.5,
      margin_top: 1,
      margin_bottom: 1,
      margin_left: 1,
      margin_right: 1,
      include_cover_page: true,
      include_toc: true,
      include_header: true,
      include_footer: true,
      include_compliance_matrix: false,
      header_content: "{proposal_name} - {date}",
      footer_content: "Page {page_number}",
      section_numbering_style: "numeric",
      is_default: false
    });
    setShowTemplateDialog(true);
  };

  const handleEditTemplate = (template) => {
    setSelectedTemplate({...template});
    setShowTemplateDialog(true);
  };

  const handleSendEmail = async () => {
    if (!emailRecipients || selectedExports.length === 0) {
      alert("Please select exports and enter recipients");
      return;
    }

    setIsSendingEmail(true);
    try {
      const recipients = emailRecipients.split(',').map(e => e.trim());
      
      for (const recipient of recipients) {
        await base44.integrations.Core.SendEmail({
          to: recipient,
          subject: `ProposalIQ Export - ${selectedExports.length} document(s)`,
          body: `
            <h2>Proposal Documents</h2>
            <p>${emailMessage || 'Please find the requested proposal documents.'}</p>
            
            <h3>Exported Documents:</h3>
            <ul>
              ${selectedExports.map(exp => `
                <li>
                  <strong>${exp.proposal_name}</strong><br/>
                  Format: ${exp.export_format}<br/>
                  Size: ${(exp.file_size_bytes / 1024).toFixed(1)} KB<br/>
                  Exported: ${new Date(exp.created_date).toLocaleString()}
                </li>
              `).join('')}
            </ul>
            
            <p>Generated by ProposalIQ.ai</p>
          `
        });
      }

      alert(`Emails sent to ${recipients.length} recipient(s)!`);
      setShowEmailDialog(false);
      setEmailRecipients("");
      setEmailMessage("");
      setSelectedExports([]);
    } catch (error) {
      console.error("Error sending emails:", error);
      alert("Error sending emails. Please try again.");
    }
    setIsSendingEmail(false);
  };

  const filteredHistory = exportHistory.filter(exp => 
    exp.proposal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.exported_by_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportStats = {
    totalExports: exportHistory.length,
    totalSize: exportHistory.reduce((sum, exp) => sum + (exp.file_size_bytes || 0), 0),
    mostUsedFormat: exportHistory.length > 0 ? 
      Object.entries(exportHistory.reduce((acc, exp) => {
        acc[exp.export_format] = (acc[exp.export_format] || 0) + 1;
        return acc;
      }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] : 'N/A',
    thisMonth: exportHistory.filter(exp => {
      const date = new Date(exp.created_date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length
  };

  // Pre-configured agency templates
  const agencyTemplates = [
    {
      name: "DoD Standard",
      agency: "Department of Defense",
      description: "Standard DoD proposal format with compliance matrix",
      config: {
        font_family: "Times New Roman",
        font_size: 12,
        line_spacing: 1.5,
        include_compliance_matrix: true,
        section_numbering_style: "numeric"
      }
    },
    {
      name: "NASA Format",
      agency: "NASA",
      description: "NASA proposal requirements with technical sections",
      config: {
        font_family: "Arial",
        font_size: 11,
        line_spacing: 1.15,
        include_compliance_matrix: true,
        section_numbering_style: "numeric"
      }
    },
    {
      name: "GSA Schedule",
      agency: "GSA",
      description: "GSA Schedule format for contract vehicles",
      config: {
        font_family: "Arial",
        font_size: 12,
        line_spacing: 1.0,
        include_compliance_matrix: false,
        section_numbering_style: "alpha"
      }
    },
    {
      name: "DHS Standard",
      agency: "Department of Homeland Security",
      description: "DHS standard proposal format",
      config: {
        font_family: "Times New Roman",
        font_size: 12,
        line_spacing: 2.0,
        include_compliance_matrix: true,
        section_numbering_style: "numeric"
      }
    }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Export Center</h1>
          <p className="text-slate-600">Manage templates, export history, and bulk operations</p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="w-5 h-5 mr-2" />
          New Template
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Exports</p>
                <p className="text-3xl font-bold text-slate-900">{exportStats.totalExports}</p>
              </div>
              <Download className="w-10 h-10 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">This Month</p>
                <p className="text-3xl font-bold text-slate-900">{exportStats.thisMonth}</p>
              </div>
              <Calendar className="w-10 h-10 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Size</p>
                <p className="text-3xl font-bold text-slate-900">
                  {(exportStats.totalSize / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
              <Archive className="w-10 h-10 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Most Used</p>
                <p className="text-lg font-bold text-slate-900 capitalize">
                  {exportStats.mostUsedFormat.replace('_', ' ')}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-amber-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Export History
          </TabsTrigger>
          <TabsTrigger value="agency">
            <Building2 className="w-4 h-4 mr-2" />
            Agency Templates
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Custom Export Templates</CardTitle>
              <CardDescription>
                Create and manage reusable export templates for consistent formatting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {templates.length === 0 ? (
                <div className="text-center py-12">
                  <SettingsIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 mb-4">No templates yet</p>
                  <Button onClick={handleCreateTemplate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Template
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <Card key={template.id} className="border-slate-200 hover:border-blue-300 transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-base">{template.template_name}</CardTitle>
                              {template.is_default && (
                                <Badge className="bg-indigo-100 text-indigo-700">
                                  <Star className="w-3 h-3 mr-1" />
                                  Default
                                </Badge>
                              )}
                            </div>
                            <CardDescription className="capitalize">
                              {template.template_type.replace('_', ' ')}
                              {template.agency_name && ` - ${template.agency_name}`}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Font:</span>
                            <span className="font-medium">{template.font_family} {template.font_size}pt</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Page Size:</span>
                            <span className="font-medium capitalize">{template.page_size}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Usage:</span>
                            <span className="font-medium">{template.usage_count || 0} times</span>
                          </div>
                          
                          <Separator />
                          
                          <div className="flex flex-wrap gap-1">
                            {template.include_cover_page && <Badge variant="outline" className="text-xs">Cover Page</Badge>}
                            {template.include_toc && <Badge variant="outline" className="text-xs">TOC</Badge>}
                            {template.include_header && <Badge variant="outline" className="text-xs">Headers</Badge>}
                            {template.include_footer && <Badge variant="outline" className="text-xs">Footers</Badge>}
                            {template.include_compliance_matrix && <Badge variant="outline" className="text-xs">Compliance</Badge>}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                              className="flex-1"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => duplicateTemplateMutation.mutate(template)}
                              className="flex-1"
                            >
                              <Copy className="w-4 h-4 mr-1" />
                              Duplicate
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Delete this template?')) {
                                  deleteTemplateMutation.mutate(template.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Export History</CardTitle>
                  <CardDescription>View and manage past exports</CardDescription>
                </div>
                {selectedExports.length > 0 && (
                  <Button onClick={() => setShowEmailDialog(true)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email Selected ({selectedExports.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Search exports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredHistory.map((exp) => (
                  <div key={exp.id} className="p-4 border rounded-lg hover:border-blue-300 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedExports.some(e => e.id === exp.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedExports([...selectedExports, exp]);
                            } else {
                              setSelectedExports(selectedExports.filter(e => e.id !== exp.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900 mb-1">{exp.proposal_name}</h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {exp.export_format.replace('_', ' → ').toUpperCase()}
                            </span>
                            <span>{(exp.file_size_bytes / 1024).toFixed(1)} KB</span>
                            <span>{exp.total_pages} pages</span>
                            <span>{exp.total_words?.toLocaleString()} words</span>
                            <span className="text-slate-500">
                              {new Date(exp.created_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">{exp.exported_by_name}</Badge>
                            {exp.template_name && (
                              <Badge variant="secondary">{exp.template_name}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredHistory.length === 0 && (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-600">No exports found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agency Templates Tab */}
        <TabsContent value="agency" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Pre-Configured Agency Templates</CardTitle>
              <CardDescription>
                Quick-start templates optimized for specific government agencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {agencyTemplates.map((template, idx) => (
                  <Card key={idx} className="border-slate-200 hover:border-blue-300 transition-all">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription>{template.agency}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 mb-4">{template.description}</p>
                      
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Font:</span>
                          <span className="font-medium">{template.config.font_family} {template.config.font_size}pt</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Line Spacing:</span>
                          <span className="font-medium">{template.config.line_spacing}x</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Compliance Matrix:</span>
                          <span className="font-medium">
                            {template.config.include_compliance_matrix ? (
                              <CheckCircle2 className="w-4 h-4 inline text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 inline text-slate-400" />
                            )}
                          </span>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => {
                          setSelectedTemplate({
                            template_name: template.name,
                            template_type: "agency_specific",
                            agency_name: template.agency,
                            ...template.config,
                            page_size: "letter",
                            margin_top: 1,
                            margin_bottom: 1,
                            margin_left: 1,
                            margin_right: 1,
                            include_cover_page: true,
                            include_toc: true,
                            include_header: true,
                            include_footer: true,
                            header_content: "{proposal_name} - {date}",
                            footer_content: "Page {page_number}",
                            is_default: false
                          });
                          setShowTemplateDialog(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Use This Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate?.id ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              Configure export template settings
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={selectedTemplate.template_name}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, template_name: e.target.value})}
                    placeholder="e.g., DoD Standard Format"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Template Type</Label>
                  <Select
                    value={selectedTemplate.template_type}
                    onValueChange={(value) => setSelectedTemplate({...selectedTemplate, template_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="agency_specific">Agency Specific</SelectItem>
                      <SelectItem value="rfp">RFP</SelectItem>
                      <SelectItem value="rfq">RFQ</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedTemplate.template_type === 'agency_specific' && (
                <div className="space-y-2">
                  <Label>Agency Name</Label>
                  <Input
                    value={selectedTemplate.agency_name}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, agency_name: e.target.value})}
                    placeholder="e.g., Department of Defense"
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Page Settings</h4>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Page Size</Label>
                    <Select
                      value={selectedTemplate.page_size}
                      onValueChange={(value) => setSelectedTemplate({...selectedTemplate, page_size: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="letter">Letter (8.5" × 11")</SelectItem>
                        <SelectItem value="legal">Legal (8.5" × 14")</SelectItem>
                        <SelectItem value="a4">A4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select
                      value={selectedTemplate.font_family}
                      onValueChange={(value) => setSelectedTemplate({...selectedTemplate, font_family: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Calibri">Calibri</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Font Size (pt)</Label>
                    <Input
                      type="number"
                      value={selectedTemplate.font_size}
                      onChange={(e) => setSelectedTemplate({...selectedTemplate, font_size: parseInt(e.target.value)})}
                      min="8"
                      max="16"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Line Spacing</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={selectedTemplate.line_spacing}
                      onChange={(e) => setSelectedTemplate({...selectedTemplate, line_spacing: parseFloat(e.target.value)})}
                      min="1"
                      max="3"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Top Margin (in)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={selectedTemplate.margin_top}
                      onChange={(e) => setSelectedTemplate({...selectedTemplate, margin_top: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Bottom (in)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={selectedTemplate.margin_bottom}
                      onChange={(e) => setSelectedTemplate({...selectedTemplate, margin_bottom: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Left (in)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={selectedTemplate.margin_left}
                      onChange={(e) => setSelectedTemplate({...selectedTemplate, margin_left: parseFloat(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Right (in)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={selectedTemplate.margin_right}
                      onChange={(e) => setSelectedTemplate({...selectedTemplate, margin_right: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Document Structure</h4>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTemplate.include_cover_page}
                      onCheckedChange={(checked) => setSelectedTemplate({...selectedTemplate, include_cover_page: checked})}
                    />
                    <Label>Include Cover Page</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTemplate.include_toc}
                      onCheckedChange={(checked) => setSelectedTemplate({...selectedTemplate, include_toc: checked})}
                    />
                    <Label>Include Table of Contents</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTemplate.include_header}
                      onCheckedChange={(checked) => setSelectedTemplate({...selectedTemplate, include_header: checked})}
                    />
                    <Label>Include Headers</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTemplate.include_footer}
                      onCheckedChange={(checked) => setSelectedTemplate({...selectedTemplate, include_footer: checked})}
                    />
                    <Label>Include Footers</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTemplate.include_compliance_matrix}
                      onCheckedChange={(checked) => setSelectedTemplate({...selectedTemplate, include_compliance_matrix: checked})}
                    />
                    <Label>Include Compliance Matrix</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTemplate.is_default}
                      onCheckedChange={(checked) => setSelectedTemplate({...selectedTemplate, is_default: checked})}
                    />
                    <Label>Set as Default Template</Label>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">Header & Footer</h4>
                
                <div className="space-y-2">
                  <Label>Header Content</Label>
                  <Input
                    value={selectedTemplate.header_content}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, header_content: e.target.value})}
                    placeholder="Use variables: {proposal_name}, {date}, {agency}"
                  />
                  <p className="text-xs text-slate-500">
                    Available variables: {'{proposal_name}'}, {'{date}'}, {'{agency}'}, {'{solicitation}'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Footer Content</Label>
                  <Input
                    value={selectedTemplate.footer_content}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, footer_content: e.target.value})}
                    placeholder="Use variables: {page_number}, {total_pages}"
                  />
                  <p className="text-xs text-slate-500">
                    Available variables: {'{page_number}'}, {'{total_pages}'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Section Numbering Style</Label>
                  <Select
                    value={selectedTemplate.section_numbering_style}
                    onValueChange={(value) => setSelectedTemplate({...selectedTemplate, section_numbering_style: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="numeric">Numeric (1, 2, 3...)</SelectItem>
                      <SelectItem value="alpha">Alphabetic (A, B, C...)</SelectItem>
                      <SelectItem value="roman">Roman (I, II, III...)</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedTemplate.id) {
                  updateTemplateMutation.mutate({
                    templateId: selectedTemplate.id,
                    updates: selectedTemplate
                  });
                } else {
                  createTemplateMutation.mutate(selectedTemplate);
                }
              }}
            >
              {selectedTemplate?.id ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Exports</DialogTitle>
            <DialogDescription>
              Send selected exports via email
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipients *</Label>
              <Input
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
              />
              <p className="text-xs text-slate-500">Separate multiple emails with commas</p>
            </div>

            <div className="space-y-2">
              <Label>Message (Optional)</Label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Add a personal message..."
                className="h-24"
              />
            </div>

            <Alert>
              <Mail className="w-4 h-4" />
              <AlertDescription>
                Sending {selectedExports.length} export(s) to recipients
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Emails
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}