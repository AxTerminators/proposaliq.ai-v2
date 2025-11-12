import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Plus, Trash2, GripVertical, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TEMPLATE_CATEGORIES = [
  { value: 'technical', label: 'Technical Documents' },
  { value: 'financial', label: 'Financial Information' },
  { value: 'compliance', label: 'Compliance & Certifications' },
  { value: 'past_performance', label: 'Past Performance' },
  { value: 'personnel', label: 'Personnel & Resumes' },
  { value: 'general', label: 'General Information' }
];

export default function DataCallTemplateEditor({ 
  isOpen, 
  onClose, 
  organization,
  existingTemplate = null 
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(existingTemplate || {
    template_name: "",
    template_description: "",
    template_category: "general",
    request_title_template: "",
    request_description_template: "",
    default_priority: "medium",
    default_due_days: 7,
    checklist_items: [],
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save as a ProposalResource with special type
      const templateData = {
        organization_id: organization.id,
        resource_type: 'template',
        content_category: 'general',
        title: formData.template_name,
        description: formData.template_description,
        boilerplate_content: JSON.stringify({
          template_category: formData.template_category,
          request_title_template: formData.request_title_template,
          request_description_template: formData.request_description_template,
          default_priority: formData.default_priority,
          default_due_days: formData.default_due_days,
          checklist_items: formData.checklist_items
        }),
        tags: [...(formData.tags || []), 'data_call_template', formData.template_category]
      };

      if (existingTemplate?.id) {
        await base44.entities.ProposalResource.update(existingTemplate.id, templateData);
      } else {
        await base44.entities.ProposalResource.create(templateData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-call-templates'] });
      toast.success(existingTemplate ? 'Template updated!' : 'Template created!');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to save template: ' + error.message);
    }
  });

  const addChecklistItem = () => {
    const newId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setFormData({
      ...formData,
      checklist_items: [
        ...formData.checklist_items,
        {
          id: newId,
          item_label: "",
          item_description: "",
          is_required: true
        }
      ]
    });
  };

  const updateChecklistItem = (index, field, value) => {
    const updated = [...formData.checklist_items];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, checklist_items: updated });
  };

  const removeChecklistItem = (index) => {
    setFormData({
      ...formData,
      checklist_items: formData.checklist_items.filter((_, i) => i !== index)
    });
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    if (formData.tags?.includes(tagInput.trim())) return;
    
    setFormData({
      ...formData,
      tags: [...(formData.tags || []), tagInput.trim()]
    });
    setTagInput('');
  };

  const removeTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-purple-600" />
            {existingTemplate ? 'Edit Template' : 'Create Data Call Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Template Metadata */}
          <div className="space-y-4">
            <div>
              <Label>Template Name *</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., Standard Technical Package"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.template_description}
                onChange={(e) => setFormData({ ...formData, template_description: e.target.value })}
                placeholder="What is this template for?"
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={formData.template_category}
                  onValueChange={(value) => setFormData({ ...formData, template_category: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Default Priority</Label>
                <Select
                  value={formData.default_priority}
                  onValueChange={(value) => setFormData({ ...formData, default_priority: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Default Due (Days)</Label>
                <Input
                  type="number"
                  value={formData.default_due_days}
                  onChange={(e) => setFormData({ ...formData, default_due_days: parseInt(e.target.value) || 7 })}
                  className="mt-1"
                  min={1}
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add tags..."
                />
                <Button type="button" onClick={addTag} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.tags?.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {formData.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag)} />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Request Templates */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label>Request Title Template</Label>
              <Input
                value={formData.request_title_template}
                onChange={(e) => setFormData({ ...formData, request_title_template: e.target.value })}
                placeholder="e.g., Technical Documentation for {{proposal_name}}"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use variables: {`{{proposal_name}}`}, {`{{agency_name}}`}, {`{{date}}`}
              </p>
            </div>

            <div>
              <Label>Request Description Template</Label>
              <Textarea
                value={formData.request_description_template}
                onChange={(e) => setFormData({ ...formData, request_description_template: e.target.value })}
                placeholder="Template text with {{variables}}..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base">Template Checklist Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChecklistItem}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {formData.checklist_items.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="p-6 text-center text-slate-500">
                    <p>No checklist items. Add items that will be included when using this template.</p>
                  </CardContent>
                </Card>
              ) : (
                formData.checklist_items.map((item, index) => (
                  <Card key={item.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <GripVertical className="w-5 h-5 text-slate-400 mt-2 cursor-move" />
                        
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <Input
                                value={item.item_label}
                                onChange={(e) => updateChecklistItem(index, 'item_label', e.target.value)}
                                placeholder="Item label"
                                className="font-medium"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeChecklistItem(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <Textarea
                            value={item.item_description || ""}
                            onChange={(e) => updateChecklistItem(index, 'item_description', e.target.value)}
                            placeholder="Description or instructions..."
                            className="text-sm"
                            rows={2}
                          />

                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={item.is_required}
                              onCheckedChange={(checked) => 
                                updateChecklistItem(index, 'is_required', checked)
                              }
                            />
                            <Label className="text-sm">Required</Label>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !formData.template_name.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saveMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {existingTemplate ? 'Update Template' : 'Create Template'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}