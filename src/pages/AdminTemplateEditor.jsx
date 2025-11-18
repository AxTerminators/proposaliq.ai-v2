import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  AlertCircle,
  Check,
  Layers,
  ArrowLeft,
  FileText,
  Clock,
  TrendingUp,
  ArrowRight,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { validateTemplateName } from "@/components/utils/boardNameValidation";
import WorkflowConfigEditor from "@/components/proposals/WorkflowConfigEditor";

// Proposal type categories
const PROPOSAL_CATEGORIES = [
  { value: 'RFP', label: 'RFP - Request for Proposal' },
  { value: 'RFI', label: 'RFI - Request for Information' },
  { value: 'SBIR', label: 'SBIR - Small Business Innovation Research' },
  { value: 'GSA', label: 'GSA - General Services Administration' },
  { value: 'IDIQ', label: 'IDIQ - Indefinite Delivery/Indefinite Quantity' },
  { value: 'STATE_LOCAL', label: 'State & Local Government' },
  { value: 'RFP_15_COLUMN', label: 'RFP - 15-Column Workflow' },
  { value: 'OTHER', label: 'Other' }
];

// Board type removed - all templates are proposal boards that integrate with master board

export default function AdminTemplateEditor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // State management
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showWorkflowEditor, setShowWorkflowEditor] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showConfirmSaveDialog, setShowConfirmSaveDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [templateNameError, setTemplateNameError] = useState("");
  const [isValidatingTemplateName, setIsValidatingTemplateName] = useState(false);
  const [validatedTemplateName, setValidatedTemplateName] = useState("");



  // Load current user
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => base44.auth.me(),
    staleTime: 300000
  });

  // Check if user is super-admin
  const isSuperAdmin = user?.admin_role === 'super_admin';

  // Fetch system templates (both draft and published)
  const { data: allTemplates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['system-templates'],
    queryFn: async () => {
      return base44.entities.ProposalWorkflowTemplate.filter({
        template_type: 'system',
        is_active: true
      });
    },
    enabled: isSuperAdmin,
    staleTime: 30000
  });

  // Separate draft and published templates
  const draftTemplates = allTemplates.filter(t => t.status === 'draft');
  const publishedTemplates = allTemplates.filter(t => t.status === 'published');
  const systemTemplates = publishedTemplates; // Keep for backward compatibility

  // Filter templates by search
  const filteredPublishedTemplates = useMemo(() => {
    if (!searchQuery) return publishedTemplates;
    return publishedTemplates.filter(t =>
      t.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.proposal_type_category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [publishedTemplates, searchQuery]);

  const filteredDraftTemplates = useMemo(() => {
    if (!searchQuery) return draftTemplates;
    return draftTemplates.filter(t =>
      t.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.proposal_type_category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [draftTemplates, searchQuery]);

  // Real-time template name validation
  const handleTemplateNameChange = async (value) => {
    setEditingTemplate(prev => ({ ...prev, template_name: value }));
    setTemplateNameError("");
    setValidatedTemplateName("");

    if (!value.trim()) {
      return;
    }

    setIsValidatingTemplateName(true);

    try {
      const validation = await validateTemplateName(
        value,
        editingTemplate?.id
      );

      if (!validation.isValid) {
        setTemplateNameError(validation.message);
      } else {
        setValidatedTemplateName(validation.finalName);
      }
    } catch (error) {
      console.error('[AdminTemplateEditor] Validation error:', error);
      setTemplateNameError('An unexpected error occurred during validation.');
    } finally {
      setIsValidatingTemplateName(false);
    }
  };

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      // Validate template name if it's being updated
      const originalTemplate = systemTemplates.find(t => t.id === id);
      if (updates.template_name && originalTemplate?.template_name !== updates.template_name) {
        const validation = await validateTemplateName(updates.template_name, id);
        if (!validation.isValid) {
          throw new Error(validation.message);
        }
        updates.template_name = validation.finalName;
      }

      return base44.entities.ProposalWorkflowTemplate.update(id, updates);
    },
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['system-templates'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      setShowEditDialog(false);
      setShowWorkflowEditor(false);
      setShowConfirmSaveDialog(false);
      setEditingTemplate(null);
      setTemplateNameError("");
      setValidatedTemplateName("");
      alert(`✅ System template "${updatedTemplate.template_name}" updated successfully!`);
    },
    onError: (error) => {
      alert(`Error updating template: ${error.message}`);
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      return base44.entities.ProposalWorkflowTemplate.delete(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-templates'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      setShowDeleteDialog(false);
      setDeletingTemplate(null);
      alert('✅ System template deleted successfully!');
    },
    onError: (error) => {
      alert(`Error deleting template: ${error.message}`);
    }
  });

  // Handler functions
  const handleEdit = (template) => {
    setEditingTemplate({
      ...template,
      workflow_config: typeof template.workflow_config === 'string'
        ? JSON.parse(template.workflow_config)
        : template.workflow_config
    });
    setTemplateNameError("");
    setValidatedTemplateName("");
    setShowEditDialog(true);
  };

  const handleEditWorkflow = (template) => {
    setEditingTemplate({
      ...template,
      workflow_config: typeof template.workflow_config === 'string'
        ? JSON.parse(template.workflow_config)
        : template.workflow_config
    });
    setShowWorkflowEditor(true);
  };

  const handleDelete = (template) => {
    setDeletingTemplate(template);
    setShowDeleteDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingTemplate?.template_name?.trim()) {
      alert('Template name cannot be empty.');
      setTemplateNameError('Template name cannot be empty.');
      return;
    }

    if (editingTemplate.proposal_type_category === 'OTHER' && !editingTemplate.proposal_type_other?.trim()) {
      alert('Please specify the other proposal type.');
      return;
    }

    if (templateNameError) {
      alert('Please fix the template name errors before saving.');
      return;
    }

    if (isValidatingTemplateName) {
      alert('Please wait for template name validation to complete.');
      return;
    }

    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      updates: {
        template_name: editingTemplate.template_name,
        description: editingTemplate.description,
        icon_emoji: editingTemplate.icon_emoji,
        estimated_duration_days: editingTemplate.estimated_duration_days,
        proposal_type_category: editingTemplate.proposal_type_category,
        proposal_type_other: editingTemplate.proposal_type_other || ''
      }
    });
  };

  const handleSaveWorkflow = () => {
    // Show confirmation dialog before saving
    setShowConfirmSaveDialog(true);
  };

  const confirmSaveWorkflow = () => {
    if (!editingTemplate?.workflow_config) {
      alert('Workflow configuration is required.');
      return;
    }

    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      updates: {
        workflow_config: JSON.stringify(editingTemplate.workflow_config)
      }
    });
  };

  const confirmDelete = () => {
    if (deletingTemplate) {
      deleteTemplateMutation.mutate(deletingTemplate.id);
    }
  };

  // Duplicate template
  const handleDuplicate = async (template) => {
    try {
      const workflowConfig = typeof template.workflow_config === 'string'
        ? JSON.parse(template.workflow_config)
        : template.workflow_config;

      const duplicatedTemplate = {
        template_name: `${template.template_name} - Copy`,
        description: template.description,
        proposal_type_category: template.proposal_type_category,
        proposal_type_other: template.proposal_type_other || '',
        icon_emoji: template.icon_emoji,
        estimated_duration_days: template.estimated_duration_days,
        workflow_config: JSON.stringify(workflowConfig),
        template_type: 'system',
        status: 'draft',
        is_active: true,
        usage_count: 0
      };

      await base44.entities.ProposalWorkflowTemplate.create(duplicatedTemplate);
      queryClient.invalidateQueries({ queryKey: ['system-templates'] });
      alert(`✅ Template duplicated as draft: "${duplicatedTemplate.template_name}"`);
    } catch (error) {
      alert(`Error duplicating template: ${error.message}`);
    }
  };

  // Publish template (move from draft to published)
  const handlePublish = async (template) => {
    if (!confirm(`Publish "${template.template_name}" to the system-wide library?\n\nThis will make it available to all subscribers.`)) {
      return;
    }

    try {
      await base44.entities.ProposalWorkflowTemplate.update(template.id, {
        status: 'published'
      });
      queryClient.invalidateQueries({ queryKey: ['system-templates'] });
      alert(`✅ Template "${template.template_name}" published successfully!`);
    } catch (error) {
      alert(`Error publishing template: ${error.message}`);
    }
  };

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md border-none shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading...</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Unauthorized access
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl border-2 border-red-200">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Unauthorized Access</h2>
            <p className="text-lg text-slate-600 mb-6">
              This page is only accessible to super administrators.
            </p>
            <Button onClick={() => navigate(createPageUrl("Dashboard"))} className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl font-bold text-slate-900">System Template Editor</h1>
            </div>
            <p className="text-slate-600">Manage pre-built templates available to all subscribers</p>
            <Badge className="mt-2 bg-red-100 text-red-700">Super Admin Only</Badge>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate(createPageUrl("SystemBoardTemplateBuilder"))} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create System Template
            </Button>
            <Button onClick={() => navigate(createPageUrl("AdminPortal"))} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin Portal
            </Button>
          </div>
        </div>

        {/* Warning Banner */}
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900 mb-1">System-Wide Impact</p>
                <p className="text-sm text-amber-800">
                  Changes to system templates will affect all subscribers. These templates serve as the foundation for new boards created across the platform. Please exercise caution when modifying or deleting system templates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="max-w-md">
          <Input
            placeholder="Search system templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11"
          />
        </div>

        {/* Draft Templates Section */}
        {draftTemplates.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Edit className="w-5 h-5 text-amber-600" />
              <h2 className="text-xl font-semibold text-slate-900">Draft Templates</h2>
              <Badge className="bg-amber-100 text-amber-700">{filteredDraftTemplates.length} drafts</Badge>
            </div>

            {isLoadingTemplates ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-600 border-t-transparent mx-auto mb-3"></div>
                  <p className="text-slate-600">Loading drafts...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDraftTemplates.map(template => (
                  <SystemTemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => handleEdit(template)}
                    onEditWorkflow={() => handleEditWorkflow(template)}
                    onDelete={() => handleDelete(template)}
                    onDuplicate={() => handleDuplicate(template)}
                    onPublish={() => handlePublish(template)}
                    isDraft={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Published Templates Grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Published System Templates</h2>
            <Badge className="bg-blue-100 text-blue-700">{filteredPublishedTemplates.length} templates</Badge>
          </div>

          {isLoadingTemplates ? (
            <Card className="border-2 border-dashed">
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-3"></div>
                <p className="text-slate-600">Loading system templates...</p>
              </CardContent>
            </Card>
          ) : filteredPublishedTemplates.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-600 mb-3">No published system templates found</p>
                <Button onClick={handleCreateNew} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First System Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPublishedTemplates.map(template => (
                <SystemTemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleEdit(template)}
                  onEditWorkflow={() => handleEditWorkflow(template)}
                  onDelete={() => handleDelete(template)}
                  onDuplicate={() => handleDuplicate(template)}
                />
              ))}
            </div>
          )}
        </div>
        </div>

        {/* Edit Template Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit System Template</DialogTitle>
            <DialogDescription>
              Update template details (use Workflow button to edit configuration)
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">
                  Template Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit_name"
                  value={editingTemplate.template_name || ''}
                  onChange={(e) => handleTemplateNameChange(e.target.value)}
                  placeholder="e.g., My Custom RFP Workflow"
                  className={cn(
                    templateNameError && "border-red-500 focus-visible:ring-red-500"
                  )}
                />
                {isValidatingTemplateName && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                    Validating name...
                  </p>
                )}
                {templateNameError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {templateNameError}
                  </p>
                )}
                {!templateNameError && validatedTemplateName && !isValidatingTemplateName && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Will be saved as: <strong>"{validatedTemplateName}"</strong>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  value={editingTemplate.description || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                  placeholder="When to use this template..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_category">Proposal Type Category</Label>
                <Select
                  value={editingTemplate.proposal_type_category}
                  onValueChange={(value) => setEditingTemplate({ ...editingTemplate, proposal_type_category: value, proposal_type_other: value === 'OTHER' ? editingTemplate.proposal_type_other : '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSAL_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editingTemplate.proposal_type_category === 'OTHER' && (
                <div className="space-y-2">
                  <Label htmlFor="edit_other">
                    Specify Other Type <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit_other"
                    value={editingTemplate.proposal_type_other || ''}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, proposal_type_other: e.target.value })}
                    placeholder="e.g., Construction Bid, Grant Application"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit_emoji">Icon Emoji</Label>
                  <Input
                    id="edit_emoji"
                    value={editingTemplate.icon_emoji || '📋'}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, icon_emoji: e.target.value })}
                    maxLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_duration">Duration (days)</Label>
                  <Input
                    id="edit_duration"
                    type="number"
                    value={editingTemplate.estimated_duration_days || 30}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, estimated_duration_days: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setTemplateNameError("");
              setValidatedTemplateName("");
              setIsValidatingTemplateName(false);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateTemplateMutation.isPending || !!templateNameError || !editingTemplate?.template_name?.trim() || isValidatingTemplateName}
            >
              {updateTemplateMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow Editor Dialog */}
      <Dialog open={showWorkflowEditor} onOpenChange={setShowWorkflowEditor}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Edit Workflow Configuration
            </DialogTitle>
            <DialogDescription>
              Customize columns and checklist items for this system template
            </DialogDescription>
          </DialogHeader>

          {/* Warning banner inside workflow editor */}
          <Card className="border-2 border-amber-300 bg-amber-50">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  <strong>System-Wide Impact:</strong> Changes to this workflow will affect all new boards created from this template by all subscribers.
                </p>
              </div>
            </CardContent>
          </Card>

          {editingTemplate && (
            <WorkflowConfigEditor
              workflowConfig={editingTemplate.workflow_config}
              onChange={(newConfig) => setEditingTemplate({ ...editingTemplate, workflow_config: newConfig })}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowWorkflowEditor(false);
              setEditingTemplate(null);
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveWorkflow}
              disabled={updateTemplateMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Save Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Workflow Save */}
      <AlertDialog open={showConfirmSaveDialog} onOpenChange={setShowConfirmSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Confirm System-Wide Change
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to modify the workflow configuration for <strong>"{editingTemplate?.template_name}"</strong>, a system template.
              <br /><br />
              <strong>This change will affect:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All new boards created from this template</li>
                <li>All subscribers across the platform</li>
                <li>Existing boards created from this template (if they sync with template changes)</li>
              </ul>
              <br />
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSaveWorkflow}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Yes, Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete System Template?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deletingTemplate?.template_name}"</strong>?
              <br /><br />
              <strong>This action:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Cannot be undone</li>
                <li>Will remove this template from all subscribers</li>
                <li>Will prevent creation of new boards from this template</li>
                <li>Will NOT affect existing boards already created from this template</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete System Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// System Template Card Component
function SystemTemplateCard({ template, onEdit, onEditWorkflow, onDelete, onDuplicate, onPublish, isDraft = false }) {
  const [showPreview, setShowPreview] = useState(false);

  const workflowConfig = useMemo(() => {
    try {
      return typeof template.workflow_config === 'string'
        ? JSON.parse(template.workflow_config)
        : template.workflow_config;
    } catch {
      return { columns: [] };
    }
  }, [template.workflow_config]);

  const columns = workflowConfig?.columns || [];
  const nonTerminalColumns = columns.filter(col => !col.is_terminal);

  return (
    <>
      <Card className="hover:shadow-xl transition-all border-2 hover:border-blue-300">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="text-4xl mb-2">{template.icon_emoji || '📋'}</div>
            <div className="flex flex-col gap-1 items-end">
              <Badge variant="outline" className="text-xs">
                {template.proposal_type_category === 'OTHER' && template.proposal_type_other 
                  ? template.proposal_type_other 
                  : template.proposal_type_category}
              </Badge>
              {isDraft && (
                <Badge className="bg-amber-100 text-amber-700 text-xs">
                  Draft
                </Badge>
              )}
            </div>
          </div>
          <CardTitle className="text-lg">{template.template_name}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600 line-clamp-2">
            {template.description || 'No description provided'}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="gap-1">
              <Layers className="w-3 h-3" />
              {columns.length} columns
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              {template.estimated_duration_days || 30}d
            </Badge>
            {template.usage_count > 0 && (
              <Badge className="bg-blue-100 text-blue-700 gap-1">
                <Check className="w-3 h-3" />
                {template.usage_count} uses
              </Badge>
            )}
            {template.average_win_rate > 0 && (
              <Badge className="bg-green-100 text-green-700 gap-1">
                <TrendingUp className="w-3 h-3" />
                {template.average_win_rate}% win
              </Badge>
            )}
          </div>

          {/* Workflow Preview */}
          <div className="bg-slate-50 rounded-lg p-3 border">
            <p className="text-xs font-semibold text-slate-700 mb-2">Workflow:</p>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {nonTerminalColumns.slice(0, 4).map((col, idx) => (
                <React.Fragment key={col.id}>
                  <div className="text-xs bg-white px-2 py-1 rounded border border-slate-200 whitespace-nowrap">
                    {col.label}
                  </div>
                  {idx < Math.min(nonTerminalColumns.length, 4) - 1 && (
                    <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
              {nonTerminalColumns.length > 4 && (
                <span className="text-xs text-slate-500">+{nonTerminalColumns.length - 4} more</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPreview(true)}
              className="flex-1"
            >
              <FileText className="w-3 h-3 mr-1" />
              Preview
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="flex-1"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={onEditWorkflow}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Layers className="w-3 h-3 mr-1" />
              Workflow
            </Button>
            {onDuplicate && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDuplicate}
                className="flex-1"
                title="Duplicate as draft"
              >
                <Plus className="w-3 h-3 mr-1" />
                Copy
              </Button>
            )}
            {isDraft && onPublish && (
              <Button
                size="sm"
                variant="default"
                onClick={onPublish}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="w-3 h-3 mr-1" />
                Publish
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-3xl">{template.icon_emoji}</span>
              {template.template_name}
            </DialogTitle>
            <DialogDescription>
              {template.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Template Info */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Layers className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900">{columns.length}</p>
                  <p className="text-xs text-slate-600">Total Columns</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900">{template.estimated_duration_days || 30}</p>
                  <p className="text-xs text-slate-600">Est. Days</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Check className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-slate-900">{template.usage_count || 0}</p>
                  <p className="text-xs text-slate-600">Times Used</p>
                </CardContent>
              </Card>
            </div>

            {/* Workflow Visualization */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Workflow Steps</h3>
              <div className="space-y-2">
                {columns.map((col, idx) => (
                  <div key={col.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-700">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-4 h-4 rounded", `bg-gradient-to-r ${col.color}`)} />
                        <span className="font-semibold text-slate-900">{col.label}</span>
                        {col.is_terminal && (
                          <Badge variant="outline" className="text-xs">Terminal</Badge>
                        )}
                        {col.is_locked && (
                          <Badge variant="outline" className="text-xs">Locked</Badge>
                        )}
                      </div>
                      {col.checklist_items?.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          {col.checklist_items.length} checklist item{col.checklist_items.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}