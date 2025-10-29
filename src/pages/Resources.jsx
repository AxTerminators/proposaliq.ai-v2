
import React, { useState } from "react";
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
  ExternalLink,
  Trash2,
  Building2,
  Users,
  Plus,
  Star,
  TrendingUp,
  Tag,
  X,
  Edit,
  Sparkles,
  Loader2,
  Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Resources() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [filterTags, setFilterTags] = useState([]);
  const [filterCategory, setFilterCategory] = useState("all");
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);

  // New boilerplate form state
  const [newBoilerplate, setNewBoilerplate] = useState({
    title: "",
    description: "",
    boilerplate_content: "",
    content_category: "general",
    tags: [],
    resource_type: "boilerplate_text"
  });

  const [newTag, setNewTag] = useState("");

  // SECURITY: Load current user's organization for data filtering
  React.useEffect(() => {
    const loadOrgId = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading org:", error);
      }
    };
    loadOrgId();
  }, []);

  // SECURITY FIX: Filter resources by organization_id
  const { data: resources, isLoading } = useQuery({
    queryKey: ['resources', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      return base44.entities.ProposalResource.filter(
        { organization_id: currentOrgId },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!currentOrgId,
  });

  // SECURITY FIX: Filter organizations by current user
  const { data: organizations } = useQuery({
    queryKey: ['organizations', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      return base44.entities.Organization.filter(
        { id: currentOrgId },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!currentOrgId,
  });

  // SECURITY FIX: Filter partners by organization_id
  const { data: partners } = useQuery({
    queryKey: ['partners', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      return base44.entities.TeamingPartner.filter(
        { organization_id: currentOrgId },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!currentOrgId,
  });

  const createBoilerplateMutation = useMutation({
    mutationFn: (data) => base44.entities.ProposalResource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowCreateDialog(false);
      setNewBoilerplate({
        title: "",
        description: "",
        boilerplate_content: "",
        content_category: "general",
        tags: [],
        resource_type: "boilerplate_text"
      });
      alert("✓ Boilerplate created successfully!");
    },
  });

  const updateResourceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProposalResource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowEditDialog(false);
      alert("✓ Resource updated successfully!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProposalResource.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }) => 
      base44.entities.ProposalResource.update(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const suggestTags = async (content, title) => {
    setIsSuggestingTags(true);
    try {
      const prompt = `Analyze this content and suggest 5-8 relevant tags for search and organization.

Title: ${title}
Content: ${content.substring(0, 1000)}

Return a JSON array of tag strings. Tags should be:
- Specific and descriptive
- Include topics, agencies, contract types, technical areas
- Useful for search and filtering

Example: ["DoD", "cybersecurity", "past performance", "cloud services", "CMMC"]`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      if (result.tags) {
        setNewBoilerplate(prev => ({
          ...prev,
          tags: [...new Set([...prev.tags, ...result.tags])]
        }));
      }
    } catch (error) {
      console.error("Error suggesting tags:", error);
    }
    setIsSuggestingTags(false);
  };

  const handleFileUpload = async (files, resourceType, entityType, entityId) => {
    if (!currentOrgId) {
      alert("Organization not found. Please complete onboarding first.");
      return;
    }

    setUploading(true);
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        // SECURITY: Always include organization_id
        await base44.entities.ProposalResource.create({
          organization_id: currentOrgId,
          resource_type: resourceType,
          file_name: file.name,
          file_url: file_url,
          file_size: file.size,
          entity_type: entityType,
          tags: []
        });
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['resources'] });
    setUploading(false);
  };

  const handleCreateBoilerplate = () => {
    if (!newBoilerplate.title || !newBoilerplate.boilerplate_content) {
      alert("Please provide a title and content");
      return;
    }

    const wordCount = newBoilerplate.boilerplate_content
      .replace(/<[^>]*>/g, '')
      .split(/\s+/)
      .filter(w => w.length > 0).length;

    createBoilerplateMutation.mutate({
      ...newBoilerplate,
      organization_id: currentOrgId,
      word_count: wordCount,
      usage_count: 0,
      is_favorite: false
    });
  };

  const handleEditResource = (resource) => {
    setSelectedResource({...resource});
    setShowEditDialog(true);
  };

  const handleUpdateResource = () => {
    if (selectedResource.resource_type === 'boilerplate_text') {
      const wordCount = selectedResource.boilerplate_content
        .replace(/<[^>]*>/g, '')
        .split(/\s+/)
        .filter(w => w.length > 0).length;
      
      updateResourceMutation.mutate({
        id: selectedResource.id,
        data: {
          title: selectedResource.title,
          description: selectedResource.description,
          boilerplate_content: selectedResource.boilerplate_content,
          content_category: selectedResource.content_category,
          tags: selectedResource.tags,
          word_count: wordCount
        }
      });
    } else {
      updateResourceMutation.mutate({
        id: selectedResource.id,
        data: {
          description: selectedResource.description,
          tags: selectedResource.tags
        }
      });
    }
  };

  const addTagToNew = () => {
    if (newTag.trim()) {
      setNewBoilerplate(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const addTagToEdit = () => {
    if (newTag.trim()) {
      setSelectedResource(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const removeTagFromNew = (index) => {
    setNewBoilerplate(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const removeTagFromEdit = (index) => {
    setSelectedResource(prev => ({
      ...prev,
      tags: (prev.tags || []).filter((_, i) => i !== index)
    }));
  };

  // Get all unique tags from resources
  const allTags = [...new Set(resources.flatMap(r => r.tags || []))];

  // Filter resources
  const filteredResources = resources.filter(resource => {
    const matchesSearch = 
      resource.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.boilerplate_content?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTags = filterTags.length === 0 || 
      filterTags.every(tag => resource.tags?.includes(tag));

    const matchesCategory = filterCategory === "all" || 
      resource.content_category === filterCategory;

    return matchesSearch && matchesTags && matchesCategory;
  });

  const orgResources = filteredResources.filter(r => r.entity_type === 'organization' || !r.entity_type);
  const partnerResources = filteredResources.filter(r => r.entity_type === 'teaming_partner');
  const boilerplateResources = filteredResources.filter(r => r.resource_type === 'boilerplate_text');
  const fileResources = filteredResources.filter(r => r.resource_type !== 'boilerplate_text');

  // Calculate statistics
  const favoriteCount = resources.filter(r => r.is_favorite).length;
  const totalUsage = resources.reduce((sum, r) => sum + (r.usage_count || 0), 0);
  const avgWinRate = resources.filter(r => r.win_rate).length > 0
    ? resources.filter(r => r.win_rate).reduce((sum, r) => sum + r.win_rate, 0) / resources.filter(r => r.win_rate).length
    : 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Content Library</h1>
          <p className="text-slate-600">Manage files, boilerplate content, and reusable proposal sections</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" />
          Create Boilerplate
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-4 gap-4">
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

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Star className="w-8 h-8 text-amber-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{favoriteCount}</p>
                <p className="text-xs text-slate-600">Favorites</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{totalUsage}</p>
                <p className="text-xs text-slate-600">Times Used</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Target className="w-8 h-8 text-purple-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{avgWinRate.toFixed(0)}%</p>
                <p className="text-xs text-slate-600">Avg Win Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="space-y-4">
            <CardTitle>Search & Filter</CardTitle>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  placeholder="Search by title, content, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
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

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Filter by Tags:</Label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={filterTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        if (filterTags.includes(tag)) {
                          setFilterTags(filterTags.filter(t => t !== tag));
                        } else {
                          setFilterTags([...filterTags, tag]);
                        }
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue="boilerplate" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="boilerplate">
                <FileText className="w-4 h-4 mr-2" />
                Boilerplate ({boilerplateResources.length})
              </TabsTrigger>
              <TabsTrigger value="files">
                <Upload className="w-4 h-4 mr-2" />
                Files ({fileResources.length})
              </TabsTrigger>
              <TabsTrigger value="favorites">
                <Star className="w-4 h-4 mr-2" />
                Favorites ({favoriteCount})
              </TabsTrigger>
            </TabsList>

            {/* Boilerplate Tab */}
            <TabsContent value="boilerplate" className="space-y-4">
              {boilerplateResources.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="mb-2">No boilerplate content yet</p>
                  <p className="text-sm text-slate-400 mb-4">Create reusable text sections for faster proposal writing</p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Boilerplate
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {boilerplateResources.map((resource) => (
                    <Card key={resource.id} className="hover:shadow-lg transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-slate-900">{resource.title}</h3>
                              <Badge variant="secondary" className="capitalize text-xs">
                                {resource.content_category?.replace(/_/g, ' ')}
                              </Badge>
                              {resource.word_count && (
                                <Badge variant="outline" className="text-xs">
                                  {resource.word_count} words
                                </Badge>
                              )}
                            </div>
                            
                            {resource.description && (
                              <p className="text-sm text-slate-600 mb-2">{resource.description}</p>
                            )}

                            {resource.boilerplate_content && (
                              <div 
                                className="text-sm text-slate-700 line-clamp-3 mb-2 p-2 bg-slate-50 rounded border"
                                dangerouslySetInnerHTML={{ __html: resource.boilerplate_content }}
                              />
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              {resource.tags?.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>

                            {(resource.usage_count > 0 || resource.win_rate) && (
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                {resource.usage_count > 0 && (
                                  <span>Used {resource.usage_count} times</span>
                                )}
                                {resource.win_rate && (
                                  <span className="text-green-600 font-medium">
                                    {resource.win_rate}% win rate
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleFavoriteMutation.mutate({ id: resource.id, isFavorite: resource.is_favorite })}
                            >
                              <Star className={`w-4 h-4 ${resource.is_favorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditResource(resource)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Delete this boilerplate?')) {
                                  deleteMutation.mutate(resource.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-4">
              {organizations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Upload Files</h3>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => handleFileUpload(
                      Array.from(e.target.files),
                      'capability_statement',
                      'organization',
                      organizations[0]?.id
                    )}
                    className="hidden"
                    id="org-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="org-upload">
                    <Button disabled={uploading} asChild>
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? "Uploading..." : "Upload Files"}
                      </span>
                    </Button>
                  </label>
                </div>
              )}

              {fileResources.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>No files uploaded yet</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {fileResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="font-medium text-slate-900">{resource.file_name}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">
                              {resource.resource_type?.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {(resource.file_size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            {resource.tags?.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFavoriteMutation.mutate({ id: resource.id, isFavorite: resource.is_favorite })}
                        >
                          <Star className={`w-4 h-4 ${resource.is_favorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditResource(resource)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Delete this file?')) {
                              deleteMutation.mutate(resource.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Favorites Tab */}
            <TabsContent value="favorites" className="space-y-4">
              {resources.filter(r => r.is_favorite).length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Star className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>No favorites yet</p>
                  <p className="text-sm text-slate-400">Star resources to add them to favorites</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {resources.filter(r => r.is_favorite).map((resource) => (
                    <Card key={resource.id} className="hover:shadow-lg transition-all border-amber-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                              <h3 className="font-semibold text-slate-900">
                                {resource.title || resource.file_name}
                              </h3>
                              {resource.resource_type === 'boilerplate_text' ? (
                                <Badge variant="secondary" className="text-xs">Boilerplate</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">File</Badge>
                              )}
                            </div>
                            
                            {resource.description && (
                              <p className="text-sm text-slate-600">{resource.description}</p>
                            )}

                            {resource.tags && resource.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {resource.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
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
                              onClick={() => handleEditResource(resource)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {resource.file_url && (
                              <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon">
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Boilerplate Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Reusable Boilerplate Content</DialogTitle>
            <DialogDescription>
              Create text snippets that can be quickly inserted into proposals
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newBoilerplate.title}
                onChange={(e) => setNewBoilerplate({...newBoilerplate, title: e.target.value})}
                placeholder="e.g., Company Overview - Cybersecurity"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newBoilerplate.content_category}
                onValueChange={(value) => setNewBoilerplate({...newBoilerplate, content_category: value})}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Description</Label>
              <Input
                value={newBoilerplate.description}
                onChange={(e) => setNewBoilerplate({...newBoilerplate, description: e.target.value})}
                placeholder="Brief description of this content"
              />
            </div>

            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={newBoilerplate.boilerplate_content}
                onChange={(e) => setNewBoilerplate({...newBoilerplate, boilerplate_content: e.target.value})}
                className="min-h-[200px] font-mono text-sm"
                placeholder="Enter your boilerplate text here..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tags</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => suggestTags(newBoilerplate.boilerplate_content, newBoilerplate.title)}
                  disabled={isSuggestingTags || !newBoilerplate.boilerplate_content}
                >
                  {isSuggestingTags ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Suggesting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI Suggest Tags
                    </>
                  )}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag (e.g., DoD, cybersecurity)"
                  onKeyPress={(e) => e.key === 'Enter' && addTagToNew()}
                />
                <Button type="button" onClick={addTagToNew}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {newBoilerplate.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeTagFromNew(idx)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBoilerplate}>
              Create Boilerplate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Resource Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
          </DialogHeader>
          
          {selectedResource && (
            <div className="space-y-4">
              {selectedResource.resource_type === 'boilerplate_text' ? (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={selectedResource.title || ''}
                      onChange={(e) => setSelectedResource({...selectedResource, title: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={selectedResource.content_category}
                      onValueChange={(value) => setSelectedResource({...selectedResource, content_category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    <Label>Content</Label>
                    <Textarea
                      value={selectedResource.boilerplate_content || ''}
                      onChange={(e) => setSelectedResource({...selectedResource, boilerplate_content: e.target.value})}
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                </>
              ) : (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-2">File: {selectedResource.file_name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedResource.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={selectedResource.description || ''}
                  onChange={(e) => setSelectedResource({...selectedResource, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag"
                    onKeyPress={(e) => e.key === 'Enter' && addTagToEdit()}
                  />
                  <Button type="button" onClick={addTagToEdit}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(selectedResource.tags || []).map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => removeTagFromEdit(idx)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateResource}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
