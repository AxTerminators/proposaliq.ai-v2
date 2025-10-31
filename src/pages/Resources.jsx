
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Upload,
  Search,
  Trash2,
  Plus,
  Star,
  Tag,
  X,
  Edit,
  Loader2,
  Download,
  Eye,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import FileUploadDialog from "@/components/ui/FileUploadDialog";

export default function Resources() {
  const queryClient = useQueryClient();
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all"); // This variable is not used in the outline filtering logic
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showBoilerplateDialog, setShowBoilerplateDialog] = useState(false);
  const [editingBoilerplate, setEditingBoilerplate] = useState(null);
  const [boilerplateForm, setBoilerplateForm] = useState({
    title: "",
    content_category: "",
    boilerplate_content: "",
    description: "",
    tags: []
  });
  const [currentTag, setCurrentTag] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading organization:", error);
      }
    };
    loadData();
  }, []);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalResource.filter({
        organization_id: organization.id
      }, '-created_date');
    },
    enabled: !!organization?.id,
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ files, metadata }) => {
      const uploadedResources = [];
      
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        const resource = await base44.entities.ProposalResource.create({
          organization_id: organization.id,
          resource_type: metadata.category || 'other', // From FileUploadDialog, this is the main type (e.g. capability_statement)
          content_category: null, // Files don't typically have a boilerplate content_category
          title: file.name,
          description: metadata.description,
          file_name: file.name,
          file_url: file_url,
          file_size: file.size,
          tags: metadata.tags || [],
          usage_count: 0
        });
        
        uploadedResources.push(resource);
      }
      
      return uploadedResources;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowUploadDialog(false);
    },
  });

  const createBoilerplateMutation = useMutation({
    mutationFn: async (data) => {
      if (editingBoilerplate) {
        return base44.entities.ProposalResource.update(editingBoilerplate.id, data);
      } else {
        return base44.entities.ProposalResource.create({
          ...data,
          organization_id: organization.id,
          resource_type: 'boilerplate_text',
          usage_count: 0
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowBoilerplateDialog(false);
      setEditingBoilerplate(null);
      setBoilerplateForm({
        title: "",
        content_category: "",
        boilerplate_content: "",
        description: "",
        tags: []
      });
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.ProposalResource.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, currentStatus }) => {
      await base44.entities.ProposalResource.update(id, {
        is_favorite: !currentStatus
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const handleFileUpload = async (files, metadata) => {
    if (!organization?.id) {
      alert("Organization not found. Please complete onboarding first.");
      return;
    }

    setUploading(true);
    try {
      await uploadFileMutation.mutateAsync({ files, metadata });
      alert(`✓ Successfully uploaded ${files.length} file(s)`);
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Error uploading files: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateBoilerplate = () => {
    if (!boilerplateForm.title.trim() || !boilerplateForm.boilerplate_content.trim()) {
      alert("Please fill in required fields (Title and Content)");
      return;
    }

    const wordCount = boilerplateForm.boilerplate_content.trim().split(/\s+/).filter(w => w).length;

    createBoilerplateMutation.mutate({
      ...boilerplateForm,
      word_count: wordCount
    });
  };

  const handleEditBoilerplate = (resource) => {
    setEditingBoilerplate(resource);
    setBoilerplateForm({
      title: resource.title || "",
      content_category: resource.content_category || "",
      boilerplate_content: resource.boilerplate_content || "",
      description: resource.description || "",
      tags: resource.tags || []
    });
    setShowBoilerplateDialog(true);
  };

  const handleDeleteResource = (resource) => {
    if (confirm(`Delete "${resource.title || resource.file_name}"? This cannot be undone.`)) {
      deleteResourceMutation.mutate(resource.id);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = currentTag.trim();
    if (trimmedTag && !boilerplateForm.tags.includes(trimmedTag)) {
      setBoilerplateForm(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (index) => {
    setBoilerplateForm(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch =
      resource.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (resource.boilerplate_content && resource.boilerplate_content.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === "all" || resource.resource_type === filterType;
    // The outline for filtering `filterCategory` was present in the state but not in the filter logic.
    // Given it's a `content_category` for boilerplate, I'll add it here.
    const matchesCategory = filterCategory === "all" || resource.content_category === filterCategory;

    return matchesSearch && matchesType && matchesCategory;
  });

  const fileUploadCategoryOptions = [
    { value: "capability_statement", label: "Capability Statement" },
    { value: "marketing_collateral", label: "Marketing Collateral" },
    { value: "past_proposal", label: "Past Proposal" },
    { value: "template", label: "Template" },
    { value: "other", label: "Other" }
  ];

  const resourcesByType = resources.reduce((acc, r) => {
    acc[r.resource_type] = (acc[r.resource_type] || 0) + 1;
    return acc;
  }, {});

  if (!organization) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Resource Library</h1>
            <p className="text-slate-600">Manage boilerplate content, templates, and reusable materials</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowBoilerplateDialog(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Boilerplate
            </Button>
            <Button onClick={() => setShowUploadDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <Card className="border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="text-right">
                  <p className="text-2xl font-bold">{resources.length}</p>
                  <p className="text-xs text-slate-600">Total Resources</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {Object.entries(resourcesByType).slice(0, 4).map(([type, count]) => (
            <Card key={type} className="border-none shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <FileText className="w-8 h-8 text-slate-400" />
                  <div className="text-right">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-slate-600 capitalize">{type.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search & Filter */}
        <Card className="border-none shadow-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search by name, description, content, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="boilerplate_text">Boilerplate</SelectItem>
                  <SelectItem value="template">Templates</SelectItem>
                  <SelectItem value="capability_statement">Capability Statements</SelectItem>
                  <SelectItem value="marketing_collateral">Marketing</SelectItem>
                  <SelectItem value="past_proposal">Past Proposals</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="company_overview">Company Overview</SelectItem>
                  <SelectItem value="past_performance">Past Performance</SelectItem>
                  <SelectItem value="technical_approach">Technical Approach</SelectItem>
                  <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                  <SelectItem value="key_personnel">Key Personnel</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                  <SelectItem value="transition_plan">Transition Plan</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="pricing">Pricing</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-slate-600">Loading resources...</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 mb-2">No resources found</p>
                <p className="text-sm text-slate-500">Upload files or create boilerplate content to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredResources.map((resource) => (
                  <div key={resource.id} className="p-4 border rounded-lg hover:border-blue-300 transition-all hover:shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">{resource.title || resource.file_name}</h3>
                          <Badge variant="outline" className="capitalize">
                            {resource.resource_type.replace(/_/g, ' ')}
                          </Badge>
                          {resource.is_favorite && (
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          )}
                        </div>
                        
                        {resource.description && (
                          <p className="text-sm text-slate-600 mb-2">{resource.description}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-2">
                          {resource.content_category && (
                            <Badge variant="secondary" className="text-xs capitalize">
                              {resource.content_category.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {resource.tags?.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              <Tag className="w-3 h-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          {resource.usage_count > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Used {resource.usage_count}x
                            </Badge>
                          )}
                          {resource.word_count && (
                            <Badge variant="outline" className="text-xs">
                              {resource.word_count} words
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleFavoriteMutation.mutate({ id: resource.id, currentStatus: resource.is_favorite })}
                        >
                          <Star className={resource.is_favorite ? "w-4 h-4 fill-amber-400 text-amber-400" : "w-4 h-4"} />
                        </Button>
                        {resource.file_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        {resource.resource_type === 'boilerplate_text' && (
                          <Button size="sm" variant="ghost" onClick={() => handleEditBoilerplate(resource)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteResource(resource)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Upload Dialog */}
        <FileUploadDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          onUpload={handleFileUpload}
          title="Upload Resource Files"
          description="Upload files and categorize them for easy organization and AI analysis"
          categoryOptions={fileUploadCategoryOptions}
          categoryLabel="Resource Type"
          acceptedFileTypes="*"
          multiple={true}
          showTags={true}
          showDescription={true}
          uploading={uploading}
        />

        {/* Boilerplate Dialog (Create/Edit) */}
        <Dialog open={showBoilerplateDialog} onOpenChange={setShowBoilerplateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBoilerplate ? "Edit Boilerplate" : "Create Boilerplate Content"}</DialogTitle>
              <DialogDescription>
                Create reusable text content that can be referenced in proposals
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={boilerplateForm.title}
                  onChange={(e) => setBoilerplateForm({...boilerplateForm, title: e.target.value})}
                  placeholder="e.g., Company Overview, Quality Assurance Process..."
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={boilerplateForm.content_category}
                  onValueChange={(value) => setBoilerplateForm({...boilerplateForm, content_category: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_overview">Company Overview</SelectItem>
                    <SelectItem value="past_performance">Past Performance</SelectItem>
                    <SelectItem value="technical_approach">Technical Approach</SelectItem>
                    <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                    <SelectItem value="key_personnel">Key Personnel</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="transition_plan">Transition Plan</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="pricing">Pricing</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="Add tags..."
                  />
                  <Button type="button" onClick={handleAddTag} disabled={!currentTag.trim()}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {boilerplateForm.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg border">
                    {boilerplateForm.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="gap-1 pr-1">
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(index)}
                          className="ml-1 hover:bg-slate-300 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Content *</Label>
                <Textarea
                  value={boilerplateForm.boilerplate_content}
                  onChange={(e) => setBoilerplateForm({...boilerplateForm, boilerplate_content: e.target.value})}
                  rows={12}
                  placeholder="Enter your boilerplate content here..."
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500">
                  Word count: {boilerplateForm.boilerplate_content.trim().split(/\s+/).filter(w => w).length}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={boilerplateForm.description}
                  onChange={(e) => setBoilerplateForm({...boilerplateForm, description: e.target.value})}
                  rows={2}
                  placeholder="Brief description of this boilerplate..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowBoilerplateDialog(false);
                setEditingBoilerplate(null);
                setBoilerplateForm({
                  title: "",
                  content_category: "",
                  boilerplate_content: "",
                  description: "",
                  tags: []
                });
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateBoilerplate} disabled={createBoilerplateMutation.isPending}>
                {createBoilerplateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  editingBoilerplate ? "Update Boilerplate" : "Create Boilerplate"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
