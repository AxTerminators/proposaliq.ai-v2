import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Palette, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  { label: "Blue", value: "from-blue-400 to-blue-600", badge: "bg-blue-500 text-white" },
  { label: "Green", value: "from-green-400 to-green-600", badge: "bg-green-500 text-white" },
  { label: "Red", value: "from-red-400 to-red-600", badge: "bg-red-500 text-white" },
  { label: "Purple", value: "from-purple-400 to-purple-600", badge: "bg-purple-500 text-white" },
  { label: "Orange", value: "from-orange-400 to-orange-600", badge: "bg-orange-500 text-white" },
  { label: "Pink", value: "from-pink-400 to-pink-600", badge: "bg-pink-500 text-white" },
  { label: "Teal", value: "from-teal-400 to-teal-600", badge: "bg-teal-500 text-white" },
  { label: "Amber", value: "from-amber-400 to-amber-600", badge: "bg-amber-500 text-white" },
  { label: "Indigo", value: "from-indigo-400 to-indigo-600", badge: "bg-indigo-500 text-white" },
  { label: "Cyan", value: "from-cyan-400 to-cyan-600", badge: "bg-cyan-500 text-white" },
];

export default function CustomEventTypeManager({ organization }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    type_name: "",
    description: "",
    color: "from-blue-400 to-blue-600",
    badge_color: "bg-blue-500 text-white",
    icon_name: "Calendar",
    is_draggable: true,
    is_editable: true,
    default_duration_minutes: 60,
    requires_location: false,
    requires_meeting_link: false,
    default_reminders: [15, 1440]
  });

  const { data: customTypes = [], isLoading } = useQuery({
    queryKey: ['custom-event-types', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.CustomEventType.filter({ organization_id: organization.id }, 'type_name');
    },
    enabled: !!organization?.id,
  });

  const createTypeMutation = useMutation({
    mutationFn: async (data) => {
      const typeKey = data.type_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      
      if (editingType) {
        return base44.entities.CustomEventType.update(editingType.id, data);
      } else {
        return base44.entities.CustomEventType.create({
          ...data,
          type_key: `custom_${typeKey}`,
          organization_id: organization.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-event-types'] });
      setShowDialog(false);
      setEditingType(null);
      resetForm();
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.CustomEventType.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-event-types'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      return base44.entities.CustomEventType.update(id, { is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-event-types'] });
    },
  });

  const resetForm = () => {
    setFormData({
      type_name: "",
      description: "",
      color: "from-blue-400 to-blue-600",
      badge_color: "bg-blue-500 text-white",
      icon_name: "Calendar",
      is_draggable: true,
      is_editable: true,
      default_duration_minutes: 60,
      requires_location: false,
      requires_meeting_link: false,
      default_reminders: [15, 1440]
    });
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      type_name: type.type_name,
      description: type.description || "",
      color: type.color,
      badge_color: type.badge_color,
      icon_name: type.icon_name,
      is_draggable: type.is_draggable,
      is_editable: type.is_editable,
      default_duration_minutes: type.default_duration_minutes,
      requires_location: type.requires_location,
      requires_meeting_link: type.requires_meeting_link,
      default_reminders: type.default_reminders || [15, 1440]
    });
    setShowDialog(true);
  };

  const handleColorSelect = (colorOption) => {
    setFormData({
      ...formData,
      color: colorOption.value,
      badge_color: colorOption.badge
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Custom Event Types</h3>
          <p className="text-sm text-slate-600">Create personalized event categories for your organization</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Event Type
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customTypes.map((type) => (
          <Card key={type.id} className="border-none shadow-md hover:shadow-lg transition-all">
            <CardHeader className={cn("bg-gradient-to-r text-white", type.color)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  {type.type_name}
                </CardTitle>
                <Switch
                  checked={type.is_active}
                  onCheckedChange={(checked) => {
                    toggleActiveMutation.mutate({ id: type.id, is_active: checked });
                  }}
                  className="data-[state=checked]:bg-white/30"
                />
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {type.description && (
                <p className="text-sm text-slate-600">{type.description}</p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <span>Duration:</span>
                  <Badge variant="secondary">{type.default_duration_minutes}m</Badge>
                </div>
                {type.default_reminders?.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span>Reminders:</span>
                    <Badge variant="secondary">{type.default_reminders.length}</Badge>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500">
                Used {type.usage_count || 0} times
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(type)}>
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Delete event type "${type.type_name}"? This won't affect existing events.`)) {
                      deleteTypeMutation.mutate(type.id);
                    }
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customTypes.length === 0 && !isLoading && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center">
            <Tag className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Custom Event Types</h3>
            <p className="text-sm text-slate-600 mb-4">Create custom event types tailored to your organization's needs</p>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Type
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingType(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Event Type' : 'Create Custom Event Type'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Event Type Name *</label>
              <Input
                value={formData.type_name}
                onChange={(e) => setFormData({ ...formData, type_name: e.target.value })}
                placeholder="e.g., Client X Project Review, Internal Training"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="When to use this event type..."
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Color Theme</label>
              <div className="grid grid-cols-5 gap-3">
                {COLOR_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleColorSelect(option)}
                    className={cn(
                      "h-12 rounded-lg bg-gradient-to-r transition-all",
                      option.value,
                      formData.color === option.value && "ring-4 ring-slate-900"
                    )}
                    title={option.label}
                  />
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Selected: {COLOR_OPTIONS.find(c => c.value === formData.color)?.label}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Default Duration (minutes)</label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={formData.default_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, default_duration_minutes: parseInt(e.target.value) || 60 })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Reminders</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.default_reminders.includes(15)}
                      onChange={(e) => {
                        const reminders = e.target.checked 
                          ? [...formData.default_reminders, 15].sort((a, b) => a - b)
                          : formData.default_reminders.filter(r => r !== 15);
                        setFormData({ ...formData, default_reminders: reminders });
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">15 minutes before</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.default_reminders.includes(1440)}
                      onChange={(e) => {
                        const reminders = e.target.checked 
                          ? [...formData.default_reminders, 1440].sort((a, b) => a - b)
                          : formData.default_reminders.filter(r => r !== 1440);
                        setFormData({ ...formData, default_reminders: reminders });
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">1 day before</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-slate-900">Event Behavior</h4>
              
              <div className="flex items-center justify-between">
                <label className="text-sm">Can be rescheduled (drag & drop)</label>
                <Switch
                  checked={formData.is_draggable}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_draggable: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm">Can be edited</label>
                <Switch
                  checked={formData.is_editable}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_editable: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm">Require location</label>
                <Switch
                  checked={formData.requires_location}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_location: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm">Require meeting link</label>
                <Switch
                  checked={formData.requires_meeting_link}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_meeting_link: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createTypeMutation.mutate(formData)}
                disabled={!formData.type_name.trim() || createTypeMutation.isPending}
              >
                {createTypeMutation.isPending ? 'Saving...' : (editingType ? 'Update Type' : 'Create Type')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}