import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Save,
  X
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function ExportTemplateManager({ organization }) {
  const queryClient = useQueryClient();
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  
  const [templateForm, setTemplateForm] = useState({
    template_name: "",
    description: "",
    format_type: "docx",
    include_cover_page: true,
    include_toc: true,
    cover_page_config: {
      title_field: "proposal_name",
      show_agency: true,
      show_solicitation_number: true,
      show_date: true,
      custom_text: ""
    },
    header_config: {
      enabled: false,
      left_text: "",
      center_text: "",
      right_text: "",
      include_page_numbers: true
    },
    footer_config: {
      enabled: false,
      left_text: "",
      center_text: "",
      right_text: "",
      include_page_numbers: true
    },
    styling: {
      font_family: "Calibri",
      font_size: 11,
      heading_color: "#1e3a8a",
      line_spacing: 1.15
    },
    section_ordering: [],
    watermark_text: "DRAFT",
    watermark_enabled: true
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['exportTemplates', organization?.id],
    queryFn: async () => {
      const temps = await base44.entities.ExportTemplate.filter({
        organization_id: organization.id
      }, '-created_date');
      return temps;
    },
    enabled: !!organization?.id
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData) => {
      return base44.entities.ExportTemplate.create({
        ...templateData,
        organization_id: organization.id,
        created_by: (await base44.auth.me()).email,
        cover_page_config: JSON.stringify(templateData.cover_page_config),
        header_config: JSON.stringify(templateData.header_config),
        footer_config: JSON.stringify(templateData.footer_config),
        styling: JSON.stringify(templateData.styling),
        section_ordering: JSON.stringify(templateData.section_ordering || [])
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportTemplates'] });
      toast.success('Template created successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to create template: ' + error.message);
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, templateData }) => {
      return base44.entities.ExportTemplate.update(id, {
        ...templateData,
        cover_page_config: JSON.stringify(templateData.cover_page_config),
        header_config: JSON.stringify(templateData.header_config),
        footer_config: JSON.stringify(templateData.footer_config),
        styling: JSON.stringify(templateData.styling),
        section_ordering: JSON.stringify(templateData.section_ordering || [])
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportTemplates'] });
      toast.success('Template updated successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to update template: ' + error.message);
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.ExportTemplate.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportTemplates'] });
      toast.success('Template deleted successfully');
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
    }
  });

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const newTemplate = {
        ...template,
        template_name: template.template_name + ' (Copy)',
        id: undefined,
        created_date: undefined,
        updated_date: undefined
      };
      return base44.entities.ExportTemplate.create(newTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportTemplates'] });
      toast.success('Template duplicated successfully');
    }
  });

  const handleOpenDialog = (template = null) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        ...template,
        cover_page_config: typeof template.cover_page_config === 'string' 
          ? JSON.parse(template.cover_page_config) 
          : template.cover_page_config,
        header_config: typeof template.header_config === 'string'
          ? JSON.parse(template.header_config)
          : template.header_config,
        footer_config: typeof template.footer_config === 'string'
          ? JSON.parse(template.footer_config)
          : template.footer_config,
        styling: typeof template.styling === 'string'
          ? JSON.parse(template.styling)
          : template.styling,
        section_ordering: typeof template.section_ordering === 'string'
          ? JSON.parse(template.section_ordering)
          : template.section_ordering
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        template_name: "",
        description: "",
        format_type: "docx",
        include_cover_page: true,
        include_toc: true,
        cover_page_config: {
          title_field: "proposal_name",
          show_agency: true,
          show_solicitation_number: true,
          show_date: true,
          custom_text: ""
        },
        header_config: {
          enabled: false,
          left_text: "",
          center_text: "",
          right_text: "",
          include_page_numbers: true
        },
        footer_config: {
          enabled: false,
          left_text: "",
          center_text: "",
          right_text: "",
          include_page_numbers: true
        },
        styling: {
          font_family: "Calibri",
          font_size: 11,
          heading_color: "#1e3a8a",
          line_spacing: 1.15
        },
        section_ordering: [],
        watermark_text: "DRAFT",
        watermark_enabled: true
      });
    }
    setShowTemplateDialog(true);
  };

  const handleCloseDialog = () => {
    setShowTemplateDialog(false);
    setEditingTemplate(null);
  };

  const handleSaveTemplate = () => {
    if (!templateForm.template_name) {
      toast.error('Please enter a template name');
      return;
    }

    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        templateData: templateForm
      });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const handleDeleteTemplate = (template) => {
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  };

  const handleDuplicateTemplate = (template) => {
    duplicateTemplateMutation.mutate(template);
  };

  const handleExportTemplate = (template) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${template.template_name.replace(/[^a-z0-9]/gi, '_')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Export Templates</h2>
          <p className="text-slate-600">Create and manage custom export templates</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Yet</h3>
            <p className="text-slate-600 mb-6">Create your first export template to customize document generation</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.template_name}</CardTitle>
                    {template.description && (
                      <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                    )}
                  </div>
                  <Badge className="uppercase">
                    {template.format_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={template.include_cover_page} disabled />
                    <span>Cover Page</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={template.include_toc} disabled />
                    <span>Table of Contents</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={template.watermark_enabled} disabled />
                    <span>Watermark Support</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenDialog(template)}
                    className="flex-1"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDuplicateTemplate(template)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportTemplate(template)}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTemplate(template)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Editor Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={templateForm.template_name}
                  onChange={(e) => setTemplateForm({ ...templateForm, template_name: e.target.value })}
                  placeholder="e.g., Standard Federal Proposal"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Describe when to use this template..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Format Type</Label>
                <select
                  value={templateForm.format_type}
                  onChange={(e) => setTemplateForm({ ...templateForm, format_type: e.target.value })}
                  className="w-full border border-slate-200 rounded-md px-3 py-2"
                >
                  <option value="docx">DOCX</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>
            </div>

            {/* Document Structure */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900">Document Structure</h3>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={templateForm.include_cover_page}
                  onCheckedChange={(checked) => 
                    setTemplateForm({ ...templateForm, include_cover_page: checked })
                  }
                />
                <Label>Include Cover Page</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={templateForm.include_toc}
                  onCheckedChange={(checked) => 
                    setTemplateForm({ ...templateForm, include_toc: checked })
                  }
                />
                <Label>Include Table of Contents</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={templateForm.watermark_enabled}
                  onCheckedChange={(checked) => 
                    setTemplateForm({ ...templateForm, watermark_enabled: checked })
                  }
                />
                <Label>Enable Watermark for Drafts</Label>
              </div>

              {templateForm.watermark_enabled && (
                <div className="ml-6">
                  <Label>Watermark Text</Label>
                  <Input
                    value={templateForm.watermark_text}
                    onChange={(e) => setTemplateForm({ ...templateForm, watermark_text: e.target.value })}
                    placeholder="DRAFT"
                  />
                </div>
              )}
            </div>

            {/* Cover Page Config */}
            {templateForm.include_cover_page && (
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                <h3 className="font-semibold text-slate-900">Cover Page Settings</h3>
                
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={templateForm.cover_page_config.show_agency}
                    onCheckedChange={(checked) => 
                      setTemplateForm({
                        ...templateForm,
                        cover_page_config: { ...templateForm.cover_page_config, show_agency: checked }
                      })
                    }
                  />
                  <Label>Show Agency Name</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={templateForm.cover_page_config.show_solicitation_number}
                    onCheckedChange={(checked) => 
                      setTemplateForm({
                        ...templateForm,
                        cover_page_config: { ...templateForm.cover_page_config, show_solicitation_number: checked }
                      })
                    }
                  />
                  <Label>Show Solicitation Number</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={templateForm.cover_page_config.show_date}
                    onCheckedChange={(checked) => 
                      setTemplateForm({
                        ...templateForm,
                        cover_page_config: { ...templateForm.cover_page_config, show_date: checked }
                      })
                    }
                  />
                  <Label>Show Date</Label>
                </div>

                <div>
                  <Label>Custom Text (Optional)</Label>
                  <Textarea
                    value={templateForm.cover_page_config.custom_text}
                    onChange={(e) => 
                      setTemplateForm({
                        ...templateForm,
                        cover_page_config: { ...templateForm.cover_page_config, custom_text: e.target.value }
                      })
                    }
                    placeholder="Additional text for cover page..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Styling */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-900">Styling</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Font Family</Label>
                  <select
                    value={templateForm.styling.font_family}
                    onChange={(e) => 
                      setTemplateForm({
                        ...templateForm,
                        styling: { ...templateForm.styling, font_family: e.target.value }
                      })
                    }
                    className="w-full border border-slate-200 rounded-md px-3 py-2"
                  >
                    <option value="Calibri">Calibri</option>
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                  </select>
                </div>

                <div>
                  <Label>Font Size</Label>
                  <Input
                    type="number"
                    value={templateForm.styling.font_size}
                    onChange={(e) => 
                      setTemplateForm({
                        ...templateForm,
                        styling: { ...templateForm.styling, font_size: parseInt(e.target.value) }
                      })
                    }
                    min={8}
                    max={16}
                  />
                </div>

                <div>
                  <Label>Heading Color</Label>
                  <Input
                    type="color"
                    value={templateForm.styling.heading_color}
                    onChange={(e) => 
                      setTemplateForm({
                        ...templateForm,
                        styling: { ...templateForm.styling, heading_color: e.target.value }
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Line Spacing</Label>
                  <select
                    value={templateForm.styling.line_spacing}
                    onChange={(e) => 
                      setTemplateForm({
                        ...templateForm,
                        styling: { ...templateForm.styling, line_spacing: parseFloat(e.target.value) }
                      })
                    }
                    className="w-full border border-slate-200 rounded-md px-3 py-2"
                  >
                    <option value={1.0}>Single</option>
                    <option value={1.15}>1.15</option>
                    <option value={1.5}>1.5</option>
                    <option value={2.0}>Double</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleCloseDialog}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTemplate}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setTemplateToDelete(null);
        }}
        onConfirm={() => deleteTemplateMutation.mutate(templateToDelete.id)}
        title="Delete Template?"
        variant="danger"
        confirmText="Delete"
        isLoading={deleteTemplateMutation.isPending}
      >
        <p className="text-slate-700">
          Are you sure you want to delete <strong>"{templateToDelete?.template_name}"</strong>?
        </p>
      </ConfirmDialog>
    </div>
  );
}