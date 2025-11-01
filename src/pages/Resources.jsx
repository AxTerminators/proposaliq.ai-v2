
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Keep Label as it's used in the new dialog
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText,
  Upload,
  Search,
  Trash2,
  Eye, // Eye is used for resource.file_url in the original code, but not in the new outline. I'll remove it.
  Loader2,
  Download,
  Star,
  StarOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
// FileUploadDialog, format from date-fns are removed based on outline
// Plus, Tag, X, Edit, Filter, Calendar, ArrowUpDown are removed based on outline

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function Resources() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  // filterCategory and sortBy are removed based on the outline
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // New state for handling resource creation/editing within the dialog
  const [newResource, setNewResource] = useState({
    resource_type: "boilerplate_text", // Default to boilerplate
    content_category: "general", // Default category for boilerplate
    title: "",
    description: "",
    boilerplate_content: "",
    tags: []
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['resources', organization?.id, filterType], // filterCategory is removed from queryKey
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = { organization_id: organization.id };

      if (filterType !== "all") {
        query.resource_type = filterType;
      }
      // filterCategory is removed from query logic

      return base44.entities.ProposalResource.filter(query, '-created_date');
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const { data: teamingPartners } = useQuery({
    queryKey: ['teaming-partners', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.TeamingPartner.filter(
        { organization_id: organization.id },
        'partner_name'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ProposalResource.create({
        ...data,
        organization_id: organization.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setNewResource({ // Reset form after successful upload/create
        resource_type: "boilerplate_text",
        content_category: "general",
        title: "",
        description: "",
        boilerplate_content: "",
        tags: []
      });
    },
  });

  // createBoilerplateMutation is removed based on outline

  const deleteResourceMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.ProposalResource.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, is_favorite }) => { // Changed from currentStatus to is_favorite
      await base44.entities.ProposalResource.update(id, {
        is_favorite: !is_favorite // Use !is_favorite
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  // Old handlers like handleFileUpload, handleCreateBoilerplate, handleEditBoilerplate, handleDeleteResource, handleAddTag, handleRemoveTag are removed.

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setNewResource({
        ...newResource,
        title: file.name,
        resource_type: getFileType(file) // Automatically set resource_type based on file type
      });
    }
  };

  const getFileType = (file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    if (['pdf', 'doc', 'docx'].includes(ext)) return 'capability_statement';
    if (['ppt', 'pptx'].includes(ext)) return 'marketing_collateral';
    return 'other';
  };

  const handleUpload = async () => {
    // Determine if it's a file upload or boilerplate text creation
    const isBoilerplate = newResource.resource_type === 'boilerplate_text';

    if (!isBoilerplate && !selectedFile) {
      alert("Please select a file or switch to boilerplate content.");
      return;
    }
    if (isBoilerplate && (!newResource.title.trim() || !newResource.boilerplate_content.trim())) {
      alert("Please fill in title and content for boilerplate text.");
      return;
    }

    setUploading(true);
    try {
      let fileUrl = null;
      let fileSize = null;
      let fileName = null;

      if (!isBoilerplate && selectedFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
        fileUrl = file_url;
        fileSize = selectedFile.size;
        fileName = selectedFile.name;
      }

      await uploadFileMutation.mutateAsync({
        ...newResource,
        file_url: fileUrl,
        file_size: fileSize,
        file_name: fileName,
        word_count: isBoilerplate
          ? newResource.boilerplate_content.trim().split(/\s+/).filter(w => w).length
          : 0,
        // Ensure content_category is null for non-boilerplate files unless explicitly set by FileUploadDialog,
        // though the new dialog structure only sets it for boilerplate.
        content_category: isBoilerplate ? newResource.content_category : null,
      });
      alert(`✓ Successfully added resource: ${newResource.title}`);
    } catch (error) {
      console.error("Error adding resource:", error);
      alert(`Error adding resource: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };


  const filteredResources = resources.filter(r =>
    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // getResourceIcon function for displaying icons in the cards
  const getResourceIcon = (type) => {
    switch (type) {
      case 'boilerplate_text':
        return <FileText className="w-8 h-8 text-indigo-600" />;
      case 'capability_statement':
        return <FileText className="w-8 h-8 text-blue-600" />;
      case 'marketing_collateral':
        return <FileText className="w-8 h-8 text-green-600" />;
      case 'past_proposal':
        return <FileText className="w-8 h-8 text-purple-600" />;
      case 'template':
        return <FileText className="w-8 h-8 text-orange-600" />;
      default:
        return <FileText className="w-8 h-8 text-slate-600" />;
    }
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Resource Library</h1>
            <p className="text-slate-600">Manage your proposal resources and boilerplate content</p>
          </div>
          <Button onClick={() => {
            setShowUploadDialog(true);
            setNewResource({ // Reset form when opening
              resource_type: "boilerplate_text",
              content_category: "general",
              title: "",
              description: "",
              boilerplate_content: "",
              tags: []
            });
            setSelectedFile(null);
          }}>
            <Upload className="w-5 h-5 mr-2" />
            Add Resource
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="grid lg:grid-cols-4 gap-4 mb-6">
          <div className="lg:col-span-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="boilerplate_text">Boilerplate</SelectItem>
                <SelectItem value="capability_statement">Capability Statement</SelectItem>
                <SelectItem value="marketing_collateral">Marketing</SelectItem>
                <SelectItem value="past_proposal">Past Proposal</SelectItem>
                <SelectItem value="template">Template</SelectItem>
              </SelectContent>
            </Select>
            {/* filterCategory Select is removed */}
          </div>
        </div>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading resources...</p>
          </div>
        ) : filteredResources.length === 0 ? (
          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Resources Yet</h3>
              <p className="text-slate-600 mb-6">
                Start building your library by adding capability statements, boilerplate text, and more
              </p>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-5 h-5 mr-2" />
                Add Your First Resource
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <Card key={resource.id} className="border-none shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getResourceIcon(resource.resource_type)}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-clamp-2">{resource.title}</CardTitle>
                        <Badge variant="secondary" className="mt-1 capitalize text-xs">
                          {resource.resource_type?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleFavoriteMutation.mutate({
                        id: resource.id,
                        is_favorite: resource.is_favorite
                      })}
                    >
                      {resource.is_favorite ? (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      ) : (
                        <StarOff className="w-4 h-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                    {resource.description || 'No description provided.'}
                  </p>

                  {resource.tags && resource.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {resource.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    {resource.file_url && (
                      <Button size="sm" variant="outline" asChild className="flex-1">
                        <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete "${resource.title}"? This cannot be undone.`)) {
                          deleteResourceMutation.mutate(resource.id);
                        }
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Resource Dialog (replaces FileUploadDialog and Boilerplate Dialog) */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Resource</DialogTitle>
              <DialogDescription>
                Upload a file or create boilerplate content for reuse
              </DialogDescription>
            </DialogHeader>

            <Tabs
              defaultValue="boilerplate" // Default to boilerplate as per outline's first tab content
              className="w-full"
              onValueChange={(value) => {
                // Reset newResource based on tab selection
                if (value === "file") {
                  setNewResource(prev => ({
                    ...prev,
                    resource_type: "other", // Default file type
                    content_category: null, // Files don't typically have content_category
                  }));
                } else { // boilerplate
                  setNewResource(prev => ({
                    ...prev,
                    resource_type: "boilerplate_text",
                    content_category: "general", // Default boilerplate category
                    file_name: null,
                    file_url: null,
                    file_size: null,
                  }));
                  setSelectedFile(null);
                }
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">Upload File</TabsTrigger>
                <TabsTrigger value="boilerplate">Boilerplate Text</TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 pt-4">
                <div>
                  <Label>File</Label>
                  <Input type="file" onChange={handleFileSelect} />
                  {selectedFile && <p className="text-sm text-slate-500 mt-1">Selected: {selectedFile.name}</p>}
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    placeholder="Resource title"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newResource.description}
                    onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                    placeholder="Brief description"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Type</Label>
                  <Select
                    value={newResource.resource_type || "other"} // Ensure a default is always selected
                    onValueChange={(value) => setNewResource({ ...newResource, resource_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="capability_statement">Capability Statement</SelectItem>
                      <SelectItem value="marketing_collateral">Marketing Collateral</SelectItem>
                      <SelectItem value="past_proposal">Past Proposal</SelectItem>
                      <SelectItem value="template">Template</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="boilerplate" className="space-y-4 pt-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newResource.title}
                    onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                    placeholder="Boilerplate title"
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Select
                    value={newResource.content_category}
                    onValueChange={(value) => setNewResource({ ...newResource, content_category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company_overview">Company Overview</SelectItem>
                      <SelectItem value="past_performance">Past Performance</SelectItem>
                      <SelectItem value="technical_approach">Technical Approach</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={newResource.boilerplate_content}
                    onChange={(e) => setNewResource({ ...newResource, boilerplate_content: e.target.value })}
                    placeholder="Enter your boilerplate text..."
                    rows={8}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Add Resource
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
