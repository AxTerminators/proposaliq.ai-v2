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
  Sparkles,
  Plus,
  Copy,
  Edit,
  Trash2,
  ArrowRight,
  FileText,
  TrendingUp,
  Layers,
  RefreshCw,
  Building2,
  AlertCircle,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function TemplateManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Load user and organization
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => base44.auth.me(),
    staleTime: 300000
  });

  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['current-organization', user?.email],
    queryFn: async () => {
      if (!user) return null;
      
      let orgId = user.active_client_id;
      if (!orgId && user.client_accesses?.length > 0) {
        orgId = user.client_accesses[0].organization_id;
      }
      if (!orgId) {
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) orgId = orgs[0].id;
      }
      
      if (orgId) {
        const orgs = await base44.entities.Organization.filter({ id: orgId });
        if (orgs.length > 0) return orgs[0];
      }
      
      return null;
    },
    enabled: !!user,
    staleTime: 300000
  });

  // Fetch templates
  const { data: allTemplates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['workflow-templates', organization?.id],
    queryFn: async () => {
      // Get system templates
      const systemTemplates = await base44.entities.ProposalWorkflowTemplate.filter({
        template_type: 'system',
        is_active: true
      });
      
      // Get organization templates
      const orgTemplates = organization?.id 
        ? await base44.entities.ProposalWorkflowTemplate.filter({
            organization_id: organization.id,
            is_active: true
          })
        : [];
      
      return [...systemTemplates, ...orgTemplates];
    },
    enabled: !!organization?.id,
    staleTime: 30000
  });

  // Filter templates by search
  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return allTemplates;
    return allTemplates.filter(t => 
      t.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.proposal_type_category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allTemplates, searchQuery]);

  // Group templates
  const groupedTemplates = useMemo(() => {
    return {
      system: filteredTemplates.filter(t => t.template_type === 'system'),
      organization: filteredTemplates.filter(t => t.template_type === 'organization')
    };
  }, [filteredTemplates]);

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (sourceTemplate) => {
      const workflowConfig = typeof sourceTemplate.workflow_config === 'string'
        ? JSON.parse(sourceTemplate.workflow_config)
        : sourceTemplate.workflow_config;

      return base44.entities.ProposalWorkflowTemplate.create({
        organization_id: organization.id,
        template_name: `${sourceTemplate.template_name} (Copy)`,
        template_type: 'organization',
        proposal_type_category: sourceTemplate.proposal_type_category,
        board_type: sourceTemplate.board_type,
        description: sourceTemplate.description,
        workflow_config: JSON.stringify(workflowConfig),
        icon_emoji: sourceTemplate.icon_emoji,
        estimated_duration_days: sourceTemplate.estimated_duration_days,
        is_active: true,
        usage_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      alert('✅ Template duplicated successfully!');
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }) => {
      return base44.entities.ProposalWorkflowTemplate.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      setShowEditDialog(false);
      setEditingTemplate(null);
      alert('✅ Template updated successfully!');
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId) => {
      return base44.entities.ProposalWorkflowTemplate.delete(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      setShowDeleteDialog(false);
      setDeletingTemplate(null);
      alert('✅ Template deleted successfully!');
    }
  });

  const handleDuplicate = (template) => {
    duplicateTemplateMutation.mutate(template);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowEditDialog(true);
  };

  const handleDelete = (template) => {
    setDeletingTemplate(template);
    setShowDeleteDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingTemplate?.template_name?.trim()) {
      alert('Please enter a template name');
      return;
    }
    
    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      updates: {
        template_name: editingTemplate.template_name,
        description: editingTemplate.description,
        icon_emoji: editingTemplate.icon_emoji,
        estimated_duration_days: editingTemplate.estimated_duration_days
      }
    });
  };

  const confirmDelete = () => {
    if (deletingTemplate) {
      deleteTemplateMutation.mutate(deletingTemplate.id);
    }
  };

  if (isLoadingOrg || isLoadingTemplates) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md border-none shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading templates...</h3>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">No Organization Found</h2>
            <p className="text-lg text-slate-600 mb-6">
              Please set up your organization first.
            </p>
            <Button onClick={() => navigate(createPageUrl("Onboarding"))} className="bg-blue-600 hover:bg-blue-700">
              <Building2 className="w-4 h-4 mr-2" />
              Set Up Organization
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Workflow Templates</h1>
            <p className="text-slate-600">Manage and customize proposal workflow configurations</p>
          </div>
          <Button onClick={() => navigate(createPageUrl("Pipeline"))} variant="outline">
            <ArrowRight className="w-4 h-4 mr-2" />
            Back to Pipeline
          </Button>
        </div>

        {/* Search */}
        <div className="max-w-md">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11"
          />
        </div>

        {/* System Templates */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">System Templates</h2>
            <Badge className="bg-blue-100 text-blue-700">Pre-built</Badge>
          </div>
          
          {groupedTemplates.system.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-600">No system templates found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedTemplates.system.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onDuplicate={() => handleDuplicate(template)}
                  canEdit={false}
                  canDelete={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Organization Templates */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-purple-600" />
            <h2 className="text-xl font-semibold text-slate-900">Your Organization Templates</h2>
            <Badge className="bg-purple-100 text-purple-700">Custom</Badge>
          </div>
          
          {groupedTemplates.organization.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="p-8 text-center">
                <Layers className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-slate-600 mb-3">No custom templates yet</p>
                <p className="text-sm text-slate-500">
                  Duplicate a system template or save a board configuration as a template to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedTemplates.organization.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleEdit(template)}
                  onDuplicate={() => handleDuplicate(template)}
                  onDelete={() => handleDelete(template)}
                  canEdit={true}
                  canDelete={true}
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
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update template details (workflow configuration cannot be edited here)
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_name">Template Name *</Label>
                <Input
                  id="edit_name"
                  value={editingTemplate.template_name || ''}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, template_name: e.target.value })}
                  placeholder="e.g., My Custom RFP Workflow"
                />
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
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateTemplateMutation.isPending}>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Template?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deletingTemplate?.template_name}"</strong>?
              <br /><br />
              This action cannot be undone. Any boards currently using this template will continue to work, but you won't be able to create new boards from this template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Template Card Component
function TemplateCard({ template, onEdit, onDuplicate, onDelete, canEdit, canDelete }) {
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
            <Badge variant="outline" className="text-xs">
              {template.proposal_type_category}
            </Badge>
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
              ⏱️ ~{template.estimated_duration_days || 30}d
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
          <div className="flex gap-2 pt-2 border-t">
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
              onClick={onDuplicate}
              className="flex-1"
            >
              <Copy className="w-3 h-3 mr-1" />
              Duplicate
            </Button>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                className="flex-1"
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDelete}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
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
            <Button onClick={() => {
              setShowPreview(false);
              onDuplicate();
            }}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate This Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}