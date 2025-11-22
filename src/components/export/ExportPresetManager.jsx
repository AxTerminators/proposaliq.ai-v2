import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap,
  Plus,
  Edit,
  Trash2,
  Copy,
  Star,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function ExportPresetManager({ organization }) {
  const queryClient = useQueryClient();
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [presetToDelete, setPresetToDelete] = useState(null);

  const [presetForm, setPresetForm] = useState({
    preset_name: "",
    description: "",
    export_format: "pdf",
    template_id: null,
    include_cover_page: true,
    include_toc: true,
    apply_watermark: true,
    include_all_sections: true,
    section_ids: [],
    auto_filename: true,
    filename_pattern: "{proposal_name}_{date}",
    is_default: false,
    is_favorite: false
  });

  // Fetch presets
  const { data: presets = [], isLoading } = useQuery({
    queryKey: ['exportPresets', organization?.id],
    queryFn: async () => {
      const allPresets = await base44.entities.ExportPreset.filter({
        organization_id: organization.id
      }, '-is_default,-is_favorite,-created_date');
      return allPresets;
    },
    enabled: !!organization?.id
  });

  // Fetch templates for dropdown
  const { data: templates = [] } = useQuery({
    queryKey: ['exportTemplates', organization?.id],
    queryFn: async () => {
      return await base44.entities.ExportTemplate.filter({
        organization_id: organization.id
      }, '-created_date');
    },
    enabled: !!organization?.id
  });

  // Create preset mutation
  const createPresetMutation = useMutation({
    mutationFn: async (presetData) => {
      const user = await base44.auth.me();
      return base44.entities.ExportPreset.create({
        ...presetData,
        organization_id: organization.id,
        created_by: user.email,
        section_ids: JSON.stringify(presetData.section_ids || [])
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportPresets'] });
      toast.success('Export preset created successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to create preset: ' + error.message);
    }
  });

  // Update preset mutation
  const updatePresetMutation = useMutation({
    mutationFn: async ({ id, presetData }) => {
      return base44.entities.ExportPreset.update(id, {
        ...presetData,
        section_ids: JSON.stringify(presetData.section_ids || [])
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportPresets'] });
      toast.success('Preset updated successfully');
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('Failed to update preset: ' + error.message);
    }
  });

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.ExportPreset.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportPresets'] });
      toast.success('Preset deleted successfully');
      setShowDeleteConfirm(false);
      setPresetToDelete(null);
    }
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }) => {
      return base44.entities.ExportPreset.update(id, {
        is_favorite: isFavorite
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportPresets'] });
    }
  });

  // Duplicate preset mutation
  const duplicatePresetMutation = useMutation({
    mutationFn: async (preset) => {
      const user = await base44.auth.me();
      const newPreset = {
        ...preset,
        preset_name: preset.preset_name + ' (Copy)',
        is_default: false,
        created_by: user.email,
        id: undefined,
        created_date: undefined,
        updated_date: undefined
      };
      return base44.entities.ExportPreset.create(newPreset);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exportPresets'] });
      toast.success('Preset duplicated successfully');
    }
  });

  const handleOpenDialog = (preset = null) => {
    if (preset) {
      setEditingPreset(preset);
      setPresetForm({
        ...preset,
        section_ids: typeof preset.section_ids === 'string' 
          ? JSON.parse(preset.section_ids) 
          : preset.section_ids
      });
    } else {
      setEditingPreset(null);
      setPresetForm({
        preset_name: "",
        description: "",
        export_format: "pdf",
        template_id: null,
        include_cover_page: true,
        include_toc: true,
        apply_watermark: true,
        include_all_sections: true,
        section_ids: [],
        auto_filename: true,
        filename_pattern: "{proposal_name}_{date}",
        is_default: false,
        is_favorite: false
      });
    }
    setShowPresetDialog(true);
  };

  const handleCloseDialog = () => {
    setShowPresetDialog(false);
    setEditingPreset(null);
  };

  const handleSavePreset = () => {
    if (!presetForm.preset_name) {
      toast.error('Please enter a preset name');
      return;
    }

    if (editingPreset) {
      updatePresetMutation.mutate({
        id: editingPreset.id,
        presetData: presetForm
      });
    } else {
      createPresetMutation.mutate(presetForm);
    }
  };

  const handleDeletePreset = (preset) => {
    setPresetToDelete(preset);
    setShowDeleteConfirm(true);
  };

  const handleToggleFavorite = (preset) => {
    toggleFavoriteMutation.mutate({
      id: preset.id,
      isFavorite: !preset.is_favorite
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  const favoritePresets = presets.filter(p => p.is_favorite);
  const regularPresets = presets.filter(p => !p.is_favorite);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Export Presets</h2>
          <p className="text-slate-600">Save and reuse your favorite export configurations</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          New Preset
        </Button>
      </div>

      {presets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Zap className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Presets Yet</h3>
            <p className="text-slate-600 mb-6">Create your first export preset for quick one-click exports</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Preset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Favorite Presets */}
          {favoritePresets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                Favorite Presets
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoritePresets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    templates={templates}
                    onEdit={() => handleOpenDialog(preset)}
                    onDelete={() => handleDeletePreset(preset)}
                    onDuplicate={() => duplicatePresetMutation.mutate(preset)}
                    onToggleFavorite={() => handleToggleFavorite(preset)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular Presets */}
          {regularPresets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">All Presets</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {regularPresets.map((preset) => (
                  <PresetCard
                    key={preset.id}
                    preset={preset}
                    templates={templates}
                    onEdit={() => handleOpenDialog(preset)}
                    onDelete={() => handleDeletePreset(preset)}
                    onDuplicate={() => duplicatePresetMutation.mutate(preset)}
                    onToggleFavorite={() => handleToggleFavorite(preset)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preset Editor Dialog */}
      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPreset ? 'Edit Preset' : 'Create New Preset'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label>Preset Name *</Label>
                <Input
                  value={presetForm.preset_name}
                  onChange={(e) => setPresetForm({ ...presetForm, preset_name: e.target.value })}
                  placeholder="e.g., Quick PDF Export"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={presetForm.description}
                  onChange={(e) => setPresetForm({ ...presetForm, description: e.target.value })}
                  placeholder="Describe when to use this preset..."
                  rows={2}
                />
              </div>
            </div>

            {/* Export Settings */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-900">Export Settings</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Format</Label>
                  <Select
                    value={presetForm.export_format}
                    onValueChange={(value) => setPresetForm({ ...presetForm, export_format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="docx">DOCX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Template (Optional)</Label>
                  <Select
                    value={presetForm.template_id || "none"}
                    onValueChange={(value) => setPresetForm({ ...presetForm, template_id: value === "none" ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Default Template</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={presetForm.include_cover_page}
                    onCheckedChange={(checked) => 
                      setPresetForm({ ...presetForm, include_cover_page: checked })
                    }
                  />
                  <Label>Include Cover Page</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={presetForm.include_toc}
                    onCheckedChange={(checked) => 
                      setPresetForm({ ...presetForm, include_toc: checked })
                    }
                  />
                  <Label>Include Table of Contents</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={presetForm.apply_watermark}
                    onCheckedChange={(checked) => 
                      setPresetForm({ ...presetForm, apply_watermark: checked })
                    }
                  />
                  <Label>Apply Watermark to Drafts</Label>
                </div>
              </div>
            </div>

            {/* Filename Pattern */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-900">Filename Settings</h3>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={presetForm.auto_filename}
                  onCheckedChange={(checked) => 
                    setPresetForm({ ...presetForm, auto_filename: checked })
                  }
                />
                <Label>Auto-generate Filename</Label>
              </div>

              {presetForm.auto_filename && (
                <div>
                  <Label>Filename Pattern</Label>
                  <Input
                    value={presetForm.filename_pattern}
                    onChange={(e) => setPresetForm({ ...presetForm, filename_pattern: e.target.value })}
                    placeholder="{proposal_name}_{date}"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Available tokens: {"{proposal_name}"}, {"{date}"}, {"{agency}"}, {"{status}"}
                  </p>
                </div>
              )}
            </div>

            {/* Preset Options */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={presetForm.is_favorite}
                  onCheckedChange={(checked) => 
                    setPresetForm({ ...presetForm, is_favorite: checked })
                  }
                />
                <Label>Mark as Favorite</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={presetForm.is_default}
                  onCheckedChange={(checked) => 
                    setPresetForm({ ...presetForm, is_default: checked })
                  }
                />
                <Label>Set as Default Preset</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePreset}
              disabled={createPresetMutation.isPending || updatePresetMutation.isPending}
            >
              <Settings className="w-4 h-4 mr-2" />
              {editingPreset ? 'Update' : 'Create'} Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setPresetToDelete(null);
        }}
        onConfirm={() => deletePresetMutation.mutate(presetToDelete.id)}
        title="Delete Preset?"
        variant="danger"
        confirmText="Delete"
        isLoading={deletePresetMutation.isPending}
      >
        <p className="text-slate-700">
          Are you sure you want to delete <strong>"{presetToDelete?.preset_name}"</strong>?
        </p>
      </ConfirmDialog>
    </div>
  );
}

// Preset Card Component
function PresetCard({ preset, templates, onEdit, onDelete, onDuplicate, onToggleFavorite }) {
  const template = templates.find(t => t.id === preset.template_id);

  return (
    <Card className="hover:shadow-lg transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{preset.preset_name}</CardTitle>
              {preset.is_default && (
                <Badge variant="outline" className="text-xs">Default</Badge>
              )}
            </div>
            {preset.description && (
              <CardDescription className="mt-1">{preset.description}</CardDescription>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFavorite}
            className="flex-shrink-0"
          >
            <Star className={`w-4 h-4 ${preset.is_favorite ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Badge className="uppercase">{preset.export_format}</Badge>
            {template && (
              <Badge variant="outline">{template.template_name}</Badge>
            )}
          </div>

          <div className="space-y-1 text-xs text-slate-600">
            {preset.include_cover_page && <div>✓ Cover Page</div>}
            {preset.include_toc && <div>✓ Table of Contents</div>}
            {preset.apply_watermark && <div>✓ Draft Watermark</div>}
          </div>

          <div className="flex gap-2 pt-2">
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
              variant="outline"
              onClick={onDuplicate}
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}