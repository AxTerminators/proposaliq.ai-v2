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
  DialogDescription,
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
  FileText,
  Plus,
  Copy,
  Edit,
  Trash2,
  Star,
  Search,
  Zap,
  Clock,
  Mail,
  MessageSquare,
  ThumbsUp,
  AlertCircle,
  Sparkles,
  Tag,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

const TEMPLATE_CATEGORIES = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'comment_response', label: 'Comment Response', icon: MessageSquare },
  { value: 'follow_up', label: 'Follow-up', icon: Clock },
  { value: 'thank_you', label: 'Thank You', icon: ThumbsUp },
  { value: 'status_update', label: 'Status Update', icon: TrendingUp },
  { value: 'request', label: 'Request', icon: AlertCircle },
  { value: 'custom', label: 'Custom', icon: FileText }
];

const VARIABLES = [
  { value: '{{client_name}}', label: 'Client Name', description: 'Full name of client contact' },
  { value: '{{client_organization}}', label: 'Client Organization', description: 'Client company name' },
  { value: '{{proposal_name}}', label: 'Proposal Name', description: 'Name of the proposal' },
  { value: '{{proposal_due_date}}', label: 'Proposal Due Date', description: 'Submission deadline' },
  { value: '{{consultant_name}}', label: 'Your Name', description: 'Consultant full name' },
  { value: '{{organization_name}}', label: 'Your Organization', description: 'Your company name' },
  { value: '{{contract_value}}', label: 'Contract Value', description: 'Proposal value' },
  { value: '{{today_date}}', label: "Today's Date", description: 'Current date' },
  { value: '{{section_name}}', label: 'Section Name', description: 'Specific proposal section' }
];

export default function ResponseTemplatesLibrary({ user, organization, onSelect }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [formData, setFormData] = useState({
    template_name: "",
    category: "email",
    content: "",
    subject_line: "",
    tags: [],
    is_favorite: false
  });

  // Store templates in user's custom data
  const { data: templates = [] } = useQuery({
    queryKey: ['response-templates', user.email],
    queryFn: async () => {
      const userData = await base44.auth.me();
      return userData.response_templates || [];
    },
    initialData: []
  });

  const saveTemplatesMutation = useMutation({
    mutationFn: async (updatedTemplates) => {
      return base44.auth.updateMe({
        response_templates: updatedTemplates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response-templates'] });
      toast.success("Template saved");
    }
  });

  const handleCreateTemplate = () => {
    if (!formData.template_name || !formData.content) {
      toast.error("Please provide template name and content");
      return;
    }

    const newTemplate = {
      id: Date.now().toString(),
      ...formData,
      created_date: new Date().toISOString(),
      usage_count: 0,
      last_used: null
    };

    if (editingTemplate) {
      const updated = templates.map(t => 
        t.id === editingTemplate.id ? { ...newTemplate, id: editingTemplate.id, usage_count: editingTemplate.usage_count } : t
      );
      saveTemplatesMutation.mutate(updated);
    } else {
      saveTemplatesMutation.mutate([...templates, newTemplate]);
    }

    setShowCreateDialog(false);
    resetForm();
  };

  const handleDeleteTemplate = (templateId) => {
    if (confirm("Delete this template?")) {
      const updated = templates.filter(t => t.id !== templateId);
      saveTemplatesMutation.mutate(updated);
    }
  };

  const handleToggleFavorite = (templateId) => {
    const updated = templates.map(t => 
      t.id === templateId ? { ...t, is_favorite: !t.is_favorite } : t
    );
    saveTemplatesMutation.mutate(updated);
  };

  const handleUseTemplate = (template) => {
    // Update usage stats
    const updated = templates.map(t => 
      t.id === template.id ? { 
        ...t, 
        usage_count: (t.usage_count || 0) + 1,
        last_used: new Date().toISOString()
      } : t
    );
    saveTemplatesMutation.mutate(updated);

    // Return template to parent component
    if (onSelect) {
      onSelect(template);
      toast.success("Template loaded");
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(template.content);
      toast.success("Copied to clipboard");
    }
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      category: template.category,
      content: template.content,
      subject_line: template.subject_line || "",
      tags: template.tags || [],
      is_favorite: template.is_favorite || false
    });
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setFormData({
      template_name: "",
      category: "email",
      content: "",
      subject_line: "",
      tags: [],
      is_favorite: false
    });
    setEditingTemplate(null);
  };

  const insertVariable = (variable) => {
    setFormData({
      ...formData,
      content: formData.content + variable
    });
  };

  const renderPreview = (template) => {
    let content = template.content;
    
    // Replace with sample data
    content = content.replace(/{{client_name}}/g, 'John Smith');
    content = content.replace(/{{client_organization}}/g, 'Acme Corporation');
    content = content.replace(/{{proposal_name}}/g, 'Cloud Infrastructure Proposal');
    content = content.replace(/{{proposal_due_date}}/g, moment().add(7, 'days').format('MMMM D, YYYY'));
    content = content.replace(/{{consultant_name}}/g, user.full_name || 'Jane Doe');
    content = content.replace(/{{organization_name}}/g, organization.organization_name || 'ProposalIQ');
    content = content.replace(/{{contract_value}}/g, '$250,000');
    content = content.replace(/{{today_date}}/g, moment().format('MMMM D, YYYY'));
    content = content.replace(/{{section_name}}/g, 'Technical Approach');

    return content;
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const favoriteTemplates = filteredTemplates.filter(t => t.is_favorite);
  const otherTemplates = filteredTemplates.filter(t => !t.is_favorite);

  const stats = {
    total: templates.length,
    favorites: templates.filter(t => t.is_favorite).length,
    mostUsed: templates.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))[0],
    totalUsage: templates.reduce((sum, t) => sum + (t.usage_count || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-purple-600" />
                Response Templates
              </CardTitle>
              <CardDescription>
                Save and reuse common responses - Never write the same thing twice
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-sm text-slate-600">Total Templates</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Star className="w-8 h-8 mx-auto mb-2 text-amber-500 fill-amber-500" />
            <p className="text-3xl font-bold text-slate-900">{stats.favorites}</p>
            <p className="text-sm text-slate-600">Favorites</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-3xl font-bold text-slate-900">{stats.totalUsage}</p>
            <p className="text-sm text-slate-600">Times Used</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-purple-600" />
            <p className="text-3xl font-bold text-slate-900">
              {Math.round(stats.totalUsage * 5)}m
            </p>
            <p className="text-sm text-slate-600">Time Saved</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={categoryFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter("all")}
              >
                All
              </Button>
              {TEMPLATE_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <Button
                    key={cat.value}
                    variant={categoryFilter === cat.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(cat.value)}
                  >
                    <Icon className="w-3 h-3 mr-1" />
                    {cat.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Favorites */}
      {favoriteTemplates.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Favorite Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {favoriteTemplates.map(template => {
                const category = TEMPLATE_CATEGORIES.find(c => c.value === template.category);
                const Icon = category?.icon || FileText;

                return (
                  <Card key={template.id} className="border-2 border-amber-200 hover:shadow-lg transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Icon className="w-4 h-4 text-purple-600" />
                          <h4 className="font-semibold text-slate-900">{template.template_name}</h4>
                        </div>
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                      </div>

                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{template.content}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          <Badge variant="secondary" className="text-xs">{category?.label}</Badge>
                          {template.usage_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {template.usage_count} uses
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handlePreview(template)}>
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button size="sm" onClick={() => handleUseTemplate(template)}>
                            <Copy className="w-3 h-3 mr-1" />
                            Use
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Templates */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>All Templates ({filteredTemplates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-medium mb-2">No templates yet</p>
              <p className="text-sm mb-4">Create your first template to save time</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {otherTemplates.map(template => {
                const category = TEMPLATE_CATEGORIES.find(c => c.value === template.category);
                const Icon = category?.icon || FileText;

                return (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Icon className="w-5 h-5 text-purple-600 mt-1" />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 mb-1">{template.template_name}</h4>
                            <p className="text-sm text-slate-600 mb-2 line-clamp-2">{template.content}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs">{category?.label}</Badge>
                              {template.usage_count > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Used {template.usage_count}x
                                </Badge>
                              )}
                              {template.last_used && (
                                <span className="text-xs text-slate-500">
                                  Last used {moment(template.last_used).fromNow()}
                                </span>
                              )}
                              {template.tags?.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  <Tag className="w-2 h-2 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-3">
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleToggleFavorite(template.id)}
                          >
                            <Star className={cn("w-4 h-4", template.is_favorite && "text-amber-500 fill-amber-500")} />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handlePreview(template)}>
                            <Sparkles className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(template)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => handleUseTemplate(template)}>
                            <Copy className="w-3 h-3 mr-1" />
                            Use
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit" : "Create"} Template</DialogTitle>
            <DialogDescription>
              Save frequently used responses with dynamic variables
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={formData.template_name}
                onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                placeholder="e.g., Follow-up After Proposal View"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
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

            {formData.category === 'email' && (
              <div className="space-y-2">
                <Label>Subject Line (Optional)</Label>
                <Input
                  value={formData.subject_line}
                  onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
                  placeholder="e.g., Following up on {{proposal_name}}"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                placeholder="Hi {{client_name}},&#10;&#10;I wanted to follow up on the {{proposal_name}} proposal..."
              />
            </div>

            <div className="space-y-2">
              <Label>Insert Variables</Label>
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map(variable => (
                  <Button
                    key={variable.value}
                    size="sm"
                    variant="outline"
                    onClick={() => insertVariable(variable.value)}
                    title={variable.description}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {variable.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input
                value={formData.tags?.join(', ') || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                })}
                placeholder="e.g., urgent, follow-up, high-value"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>
              {editingTemplate ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview: {previewTemplate.template_name}</DialogTitle>
              <DialogDescription>
                Variables replaced with sample data
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {previewTemplate.subject_line && (
                <div className="p-3 bg-slate-50 rounded border">
                  <Label className="text-xs text-slate-600 mb-1">Subject:</Label>
                  <p className="font-semibold">{renderPreview({ ...previewTemplate, content: previewTemplate.subject_line })}</p>
                </div>
              )}

              <div className="p-4 bg-white border rounded-lg">
                <Label className="text-xs text-slate-600 mb-2">Content:</Label>
                <p className="text-slate-700 whitespace-pre-wrap">{renderPreview(previewTemplate)}</p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
                Close
              </Button>
              <Button onClick={() => {
                handleUseTemplate(previewTemplate);
                setShowPreviewDialog(false);
              }}>
                <Copy className="w-4 h-4 mr-2" />
                Use Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}