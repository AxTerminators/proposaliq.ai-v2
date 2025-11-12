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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DataCallEditor({ 
  isOpen, 
  onClose, 
  dataCall,
  organization,
  onSave 
}) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    request_title: dataCall?.request_title || "",
    request_description: dataCall?.request_description || "",
    due_date: dataCall?.due_date || "",
    priority: dataCall?.priority || "medium",
    notes: dataCall?.notes || "",
    checklist_items: dataCall?.checklist_items || []
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.DataCallRequest.update(dataCall.id, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-call-detail', dataCall.id] });
      queryClient.invalidateQueries({ queryKey: ['all-data-calls'] });
      toast.success('Data call updated successfully!');
      onSave?.();
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.request_title?.trim()) {
      toast.error('Please enter a request title');
      return;
    }

    if (formData.checklist_items.length === 0) {
      toast.error('Please add at least one checklist item');
      return;
    }

    updateMutation.mutate();
  };

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
          is_required: true,
          status: "pending",
          uploaded_files: []
        }
      ]
    });
  };

  const removeChecklistItem = (index) => {
    setFormData({
      ...formData,
      checklist_items: formData.checklist_items.filter((_, i) => i !== index)
    });
  };

  const updateChecklistItem = (index, field, value) => {
    const updated = [...formData.checklist_items];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, checklist_items: updated });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Edit Data Call Request</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Request Title *</Label>
              <Input
                value={formData.request_title}
                onChange={(e) => setFormData({ ...formData, request_title: e.target.value })}
                placeholder="e.g., Technical Capabilities Package"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.request_description}
                onChange={(e) => setFormData({ ...formData, request_description: e.target.value })}
                placeholder="Provide context for what you need and why..."
                className="mt-1 h-24"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
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
            </div>

            <div>
              <Label>Internal Notes (not visible to recipient)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes about this data call..."
                className="mt-1"
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base">Checklist Items *</Label>
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

            <div className="space-y-3">
              {formData.checklist_items.map((item, index) => (
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
                              placeholder="Item label (e.g., Technical Approach Document)"
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
                          placeholder="Optional description or instructions..."
                          className="text-sm"
                          rows={2}
                        />

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={item.is_required}
                              onCheckedChange={(checked) => 
                                updateChecklistItem(index, 'is_required', checked)
                              }
                            />
                            <Label className="text-sm">Required</Label>
                          </div>

                          {item.uploaded_files?.length > 0 && (
                            <Badge className="bg-blue-100 text-blue-700">
                              {item.uploaded_files.length} file(s) uploaded
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {formData.checklist_items.length === 0 && (
                <Card className="border-dashed border-2">
                  <CardContent className="p-8 text-center">
                    <p className="text-slate-500 mb-3">No checklist items yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addChecklistItem}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Item
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}