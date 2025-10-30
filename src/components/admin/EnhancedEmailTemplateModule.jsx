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
  Mail, 
  Plus,
  Edit,
  Trash2,
  Eye,
  Copy,
  CheckCircle2,
  Code,
  Type
} from "lucide-react";
import { hasPermission } from "./PermissionChecker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EnhancedEmailTemplateModule({ currentUser }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const [formData, setFormData] = useState({
    template_name: "",
    template_type: "notification",
    sequence_order: 0,
    delay_days: 0,
    subject: "",
    body: "",
    from_name: "ProposalIQ.ai Team",
    is_active: true,
    tags: []
  });

  const { data: templates } = useQuery({
    queryKey: ['admin-email-templates'],
    queryFn: () => base44.entities.EmailTemplate.list('-created_date'),
    initialData: []
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData) => {
      return await base44.entities.EmailTemplate.create(templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      setShowDialog(false);
      resetForm();
      alert("Template created successfully");
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.EmailTemplate.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      setShowDialog(false);
      setEditingTemplate(null);
      resetForm();
      alert("Template updated successfully");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      return await base44.entities.EmailTemplate.delete(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      alert("Template deleted successfully");
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const newTemplate = {
        ...template,
        template_name: `${template.template_name} (Copy)`,
        is_active: false
      };
      delete newTemplate.id;
      delete newTemplate.created_date;
      delete newTemplate.updated_date;
      return await base44.entities.EmailTemplate.create(newTemplate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-email-templates'] });
      alert("Template duplicated successfully");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTemplate) {
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        data: formData
      });
    } else {
      createTemplateMutation.mutate(formData);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name || "",
      template_type: template.template_type || "notification",
      sequence_order: template.sequence_order || 0,
      delay_days: template.delay_days || 0,
      subject: template.subject || "",
      body: template.body || "",
      from_name: template.from_name || "ProposalIQ.ai Team",
      is_active: template.is_active !== false,
      tags: template.tags || []
    });
    setShowDialog(true);
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setShowPreviewDialog(true);
  };

  const resetForm = () => {
    setFormData({
      template_name: "",
      template_type: "notification",
      sequence_order: 0,
      delay_days: 0,
      subject: "",
      body: "",
      from_name: "ProposalIQ.ai Team",
      is_active: true,
      tags: []
    });
  };

  const canManageTemplates = hasPermission(currentUser, "manage_content");

  const templatesByType = templates.reduce((acc, template) => {
    const type = template.template_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(template);
    return acc;
  }, {});

  const availableVariables = [
    { var: '{{user_name}}', desc: 'User\'s full name' },
    { var: '{{user_email}}', desc: 'User\'s email address' },
    { var: '{{organization_name}}', desc: 'Organization name' },
    { var: '{{proposal_name}}', desc: 'Proposal name' },
    { var: '{{client_name}}', desc: 'Client name' },
    { var: '{{portal_url}}', desc: 'Client portal URL' },
    { var: '{{date}}', desc: 'Current date' },
    { var: '{{due_date}}', desc: 'Proposal due date' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Email Template Management</h2>
          <p className="text-slate-600">Create and manage all email templates</p>
        </div>
        {canManageTemplates && (
          <Button onClick={() => {
            setEditingTemplate(null);
            resetForm();
            setShowDialog(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <p className="text-3xl font-bold text-slate-900">{templates.length}</p>
            <p className="text-sm text-slate-600">Total Templates</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <p className="text-3xl font-bold text-green-600">{templates.filter(t => t.is_active).length}</p>
            <p className="text-sm text-slate-600">Active</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <p className="text-3xl font-bold text-blue-600">{templatesByType.onboarding?.length || 0}</p>
            <p className="text-sm text-slate-600">Onboarding</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <p className="text-3xl font-bold text-purple-600">{templatesByType.notification?.length || 0}</p>
            <p className="text-sm text-slate-600">Notifications</p>
          </CardContent>
        </Card>
      </div>

      {/* Templates by Type */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="notification">Notifications</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {['all', 'onboarding', 'notification', 'marketing', 'system'].map(tabType => (
          <TabsContent key={tabType} value={tabType}>
            <Card className="border-none shadow-lg">
              <CardContent className="p-6 space-y-3">
                {(tabType === 'all' ? templates : templatesByType[tabType] || []).map((template) => (
                  <div key={template.id} className="p-4 border-2 rounded-lg hover:border-blue-300 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">{template.template_name}</h3>
                          <Badge variant="outline" className="capitalize">
                            {template.template_type}
                          </Badge>
                          {template.is_active ? (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                          {template.template_type === 'onboarding' && (
                            <Badge variant="outline">
                              Step {template.sequence_order || 1} • Day {template.delay_days || 0}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 mb-2">
                          <strong>Subject:</strong> {template.subject}
                        </p>

                        <p className="text-xs text-slate-500 line-clamp-2">
                          {template.body?.substring(0, 150)}...
                        </p>

                        {template.tags && template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(template)}
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canManageTemplates && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => duplicateTemplateMutation.mutate(template)}
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(template)}
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Delete template "${template.template_name}"?`)) {
                                  deleteTemplateMutation.mutate(template.id);
                                }
                              }}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {(tabType === 'all' ? templates : templatesByType[tabType] || []).length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Mail className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>No {tabType !== 'all' ? tabType : ''} templates found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Email Template'}</DialogTitle>
            <DialogDescription>
              Configure email template with subject, body, and variables
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs defaultValue="content">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="template_name">Template Name *</Label>
                  <Input
                    id="template_name"
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject Line *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Welcome to ProposalIQ.ai, {{user_name}}!"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="body">Email Body (HTML or Plain Text) *</Label>
                  <Textarea
                    id="body"
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    rows={12}
                    className="font-mono text-sm"
                    placeholder="Hi {{user_name}},&#10;&#10;Welcome to ProposalIQ.ai!..."
                    required
                  />
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="template_type">Template Type *</Label>
                    <Select
                      value={formData.template_type}
                      onValueChange={(value) => setFormData({ ...formData, template_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onboarding">Onboarding</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="from_name">From Name</Label>
                    <Input
                      id="from_name"
                      value={formData.from_name}
                      onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                    />
                  </div>
                </div>

                {formData.template_type === 'onboarding' && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sequence_order">Sequence Order</Label>
                      <Input
                        id="sequence_order"
                        type="number"
                        value={formData.sequence_order}
                        onChange={(e) => setFormData({ ...formData, sequence_order: parseInt(e.target.value) })}
                        min="0"
                      />
                      <p className="text-xs text-slate-500 mt-1">Order in the onboarding sequence (1, 2, 3...)</p>
                    </div>

                    <div>
                      <Label htmlFor="delay_days">Delay (Days)</Label>
                      <Input
                        id="delay_days"
                        type="number"
                        value={formData.delay_days}
                        onChange={(e) => setFormData({ ...formData, delay_days: parseInt(e.target.value) })}
                        min="0"
                      />
                      <p className="text-xs text-slate-500 mt-1">Days after signup to send (0 = immediate)</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_active">Template is Active</Label>
                </div>
              </TabsContent>

              <TabsContent value="variables" className="space-y-4 mt-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Available Variables
                  </h4>
                  <div className="space-y-2">
                    {availableVariables.map(({ var: variable, desc }) => (
                      <div key={variable} className="flex items-center justify-between p-2 bg-white rounded">
                        <div>
                          <code className="text-sm font-mono text-blue-700">{variable}</code>
                          <p className="text-xs text-slate-600">{desc}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(variable);
                            alert("Copied to clipboard!");
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Usage Example:</h4>
                  <pre className="text-xs font-mono bg-white p-3 rounded border overflow-x-auto">
{`Hi {{user_name}},

Welcome to {{organization_name}}!

Your client portal is ready: {{portal_url}}

Best regards,
The Team`}
                  </pre>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview: {previewTemplate?.template_name}</DialogTitle>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">From:</p>
                <p className="font-medium">{previewTemplate.from_name}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Subject:</p>
                <p className="font-medium">{previewTemplate.subject}</p>
              </div>

              <div className="p-6 bg-white border-2 rounded-lg">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewTemplate.body.replace(/\n/g, '<br/>') }}
                />
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                <p className="font-semibold mb-1">Note:</p>
                <p>Variables like {`{{user_name}}`} will be replaced with actual values when sent.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}