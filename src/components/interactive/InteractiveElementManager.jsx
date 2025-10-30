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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Sparkles,
  Video,
  Calculator,
  Box,
  TrendingUp,
  DollarSign,
  Clock,
  Users,
  BarChart3,
  CheckCircle2,
  HelpCircle,
  Plus,
  Edit,
  Trash2,
  Eye
} from "lucide-react";

const ELEMENT_TYPES = [
  { value: "video", label: "Video Embed", icon: Video, color: "red" },
  { value: "roi_calculator", label: "ROI Calculator", icon: Calculator, color: "green" },
  { value: "3d_model", label: "3D Model Viewer", icon: Box, color: "purple" },
  { value: "before_after_slider", label: "Before/After Slider", icon: TrendingUp, color: "blue" },
  { value: "pricing_configurator", label: "Pricing Configurator", icon: DollarSign, color: "amber" },
  { value: "timeline", label: "Interactive Timeline", icon: Clock, color: "indigo" },
  { value: "team_bio_video", label: "Team Bio Video", icon: Users, color: "pink" },
  { value: "interactive_chart", label: "Interactive Chart", icon: BarChart3, color: "cyan" },
  { value: "poll", label: "Poll", icon: CheckCircle2, color: "emerald" },
  { value: "quiz", label: "Quiz", icon: HelpCircle, color: "orange" }
];

export default function InteractiveElementManager({ proposal, sections }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingElement, setEditingElement] = useState(null);

  const [formData, setFormData] = useState({
    element_type: "video",
    element_name: "",
    section_id: "",
    element_config: {}
  });

  // Query elements
  const { data: elements = [] } = useQuery({
    queryKey: ['interactive-elements', proposal.id],
    queryFn: () => base44.entities.InteractiveElement.filter({
      proposal_id: proposal.id
    }),
    initialData: []
  });

  // Create mutation
  const createElementMutation = useMutation({
    mutationFn: (data) => base44.entities.InteractiveElement.create({
      ...data,
      proposal_id: proposal.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactive-elements'] });
      setShowCreateDialog(false);
      resetForm();
    }
  });

  // Update mutation
  const updateElementMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InteractiveElement.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactive-elements'] });
      setEditingElement(null);
      resetForm();
    }
  });

  // Delete mutation
  const deleteElementMutation = useMutation({
    mutationFn: (id) => base44.entities.InteractiveElement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interactive-elements'] });
    }
  });

  const resetForm = () => {
    setFormData({
      element_type: "video",
      element_name: "",
      section_id: "",
      element_config: {}
    });
  };

  const handleCreate = () => {
    if (!formData.element_name) {
      alert("Please enter an element name");
      return;
    }

    createElementMutation.mutate(formData);
  };

  const handleEdit = (element) => {
    setEditingElement(element);
    setFormData({
      element_type: element.element_type,
      element_name: element.element_name,
      section_id: element.section_id,
      element_config: element.element_config || {}
    });
    setShowCreateDialog(true);
  };

  const getElementIcon = (type) => {
    const config = ELEMENT_TYPES.find(t => t.value === type);
    return config ? config.icon : Sparkles;
  };

  const getElementColor = (type) => {
    const config = ELEMENT_TYPES.find(t => t.value === type);
    return config ? config.color : "slate";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Interactive Elements
              </CardTitle>
              <CardDescription>
                Embed videos, calculators, and interactive content in your proposal
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Element
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Elements Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {elements.map(element => {
          const Icon = getElementIcon(element.element_type);
          const color = getElementColor(element.element_type);
          const typeConfig = ELEMENT_TYPES.find(t => t.value === element.element_type);

          return (
            <Card key={element.id} className="border-none shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-${color}-100 flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${color}-600`} />
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(element)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => {
                        if (confirm("Delete this element?")) {
                          deleteElementMutation.mutate(element.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <h3 className="font-semibold text-slate-900 mb-1">{element.element_name}</h3>
                <p className="text-sm text-slate-600 mb-3">{typeConfig?.label}</p>

                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {element.view_count || 0} views
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {element.interaction_count || 0} interactions
                  </div>
                </div>

                {!element.is_active && (
                  <Badge variant="outline" className="mt-3">Inactive</Badge>
                )}
              </CardContent>
            </Card>
          );
        })}

        {elements.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="font-medium mb-2">No interactive elements yet</p>
            <p className="text-sm">Add videos, calculators, or other interactive content</p>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingElement ? "Edit" : "Add"} Interactive Element
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Element Type */}
            <div className="space-y-2">
              <Label>Element Type *</Label>
              <Select 
                value={formData.element_type}
                onValueChange={(value) => setFormData({ ...formData, element_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELEMENT_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Element Name */}
            <div className="space-y-2">
              <Label>Element Name *</Label>
              <Input
                value={formData.element_name}
                onChange={(e) => setFormData({ ...formData, element_name: e.target.value })}
                placeholder="e.g., Product Demo Video"
              />
            </div>

            {/* Section */}
            <div className="space-y-2">
              <Label>Embed in Section (Optional)</Label>
              <Select 
                value={formData.section_id}
                onValueChange={(value) => setFormData({ ...formData, section_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No section (standalone)</SelectItem>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.section_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type-specific configuration */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-3">
              <Label className="text-sm font-semibold">Configuration</Label>
              
              {formData.element_type === 'video' && (
                <div className="space-y-2">
                  <Label className="text-sm">Video URL (YouTube, Vimeo, or direct)</Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={formData.element_config.video_url || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      element_config: { ...formData.element_config, video_url: e.target.value }
                    })}
                  />
                </div>
              )}

              {formData.element_type === 'roi_calculator' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Formula Description</Label>
                    <Textarea
                      placeholder="e.g., Monthly Savings = (Current Cost - Our Cost) * 12"
                      value={formData.element_config.formula_description || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        element_config: { ...formData.element_config, formula_description: e.target.value }
                      })}
                      rows={3}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    💡 Calculator logic will be implemented based on your requirements
                  </p>
                </>
              )}

              {formData.element_type === '3d_model' && (
                <div className="space-y-2">
                  <Label className="text-sm">3D Model URL (.glb, .gltf)</Label>
                  <Input
                    placeholder="https://example.com/model.glb"
                    value={formData.element_config.model_url || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      element_config: { ...formData.element_config, model_url: e.target.value }
                    })}
                  />
                </div>
              )}

              {formData.element_type === 'before_after_slider' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm">Before Image URL</Label>
                    <Input
                      placeholder="https://..."
                      value={formData.element_config.before_image || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        element_config: { ...formData.element_config, before_image: e.target.value }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">After Image URL</Label>
                    <Input
                      placeholder="https://..."
                      value={formData.element_config.after_image || ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        element_config: { ...formData.element_config, after_image: e.target.value }
                      })}
                    />
                  </div>
                </>
              )}

              {formData.element_type === 'pricing_configurator' && (
                <div className="space-y-2">
                  <Label className="text-sm">Configuration JSON</Label>
                  <Textarea
                    placeholder='{"packages": [{"name": "Basic", "price": 1000}]}'
                    value={formData.element_config.pricing_data ? JSON.stringify(formData.element_config.pricing_data, null, 2) : ""}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData({
                          ...formData,
                          element_config: { ...formData.element_config, pricing_data: parsed }
                        });
                      } catch (err) {
                        // Invalid JSON, ignore
                      }
                    }}
                    rows={5}
                    className="font-mono text-xs"
                  />
                </div>
              )}

              {(formData.element_type === 'poll' || formData.element_type === 'quiz') && (
                <div className="space-y-2">
                  <Label className="text-sm">Questions (JSON format)</Label>
                  <Textarea
                    placeholder='[{"question": "What matters most?", "options": ["Price", "Quality"]}]'
                    rows={5}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-slate-500">
                    Format: Array of question objects with options
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              setEditingElement(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              {editingElement ? "Update" : "Create"} Element
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}