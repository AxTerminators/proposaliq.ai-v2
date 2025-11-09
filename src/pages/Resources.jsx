
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  Upload, 
  Search,
  Trash2,
  Eye,
  Filter,
  Download,
  Star,
  StarOff,
  Library
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import UniversalAlert from "../components/ui/UniversalAlert";
import PromoteToLibraryDialog from "../components/proposals/PromoteToLibraryDialog";

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
  const [filterCategory, setFilterCategory] = useState("all");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Universal Alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: "info",
    title: "",
    description: ""
  });

  // Promote to Library states
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [resourceToPromote, setResourceToPromote] = useState(null);
  
  const [newResource, setNewResource] = useState({
    resource_type: "boilerplate_text",
    content_category: "general",
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

  const { data: resources, isLoading } = useQuery({
    queryKey: ['resources', organization?.id, filterType, filterCategory],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      let query = { organization_id: organization.id };
      
      if (filterType !== "all") {
        query.resource_type = filterType;
      }
      
      if (filterCategory !== "all") {
        query.content_category = filterCategory;
      }
      
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
      setNewResource({
        resource_type: "boilerplate_text",
        content_category: "general",
        title: "",
        description: "",
        boilerplate_content: "",
        tags: []
      });
      setAlertConfig({
        type: "success",
        title: "Resource Added",
        description: "Your resource has been successfully uploaded."
      });
      setShowAlert(true);
    },
    onError: () => {
      setAlertConfig({
        type: "error",
        title: "Upload Failed",
        description: "Unable to upload resource. Please try again."
      });
      setShowAlert(true);
    }
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, is_favorite }) => {
      return base44.entities.ProposalResource.update(id, { is_favorite: !is_favorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.ProposalResource.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setAlertConfig({
        type: "success",
        title: "Resource Deleted",
        description: "The resource has been successfully removed."
      });
      setShowAlert(true);
    },
    onError: () => {
      setAlertConfig({
        type: "error",
        title: "Deletion Failed",
        description: "Unable to delete resource. Please try again."
      });
      setShowAlert(true);
    }
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setNewResource({
        ...newResource,
        title: file.name,
        resource_type: getFileType(file)
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
    if (!selectedFile && !newResource.boilerplate_content) {
      setAlertConfig({
        type: "warning",
        title: "File or Content Required",
        description: "Please select a file or enter boilerplate content."
      });
      setShowAlert(true);
      return;
    }

    setUploading(true);
    try {
      let fileUrl = null;
      let fileSize = null;
      let fileName = null;

      if (selectedFile) {
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
        word_count: newResource.boilerplate_content 
          ? newResource.boilerplate_content.split(/\s+/).length 
          : 0
      });
    } catch (error) {
      console.error("Error uploading:", error);
      setAlertConfig({
        type: "error",
        title: "Upload Failed",
        description: "Unable to upload resource. Please try again."
      });
      setShowAlert(true);
    } finally {
      setUploading(false);
    }
  };

  const handlePromoteToLibrary = (resource) => {
    setResourceToPromote(resource);
    setShowPromoteDialog(true);
  };

  const filteredResources = resources.filter(r => 
    r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getResourceIcon = (type) => {
    return <FileText className="w-8 h-8 text-blue-600" />;
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Resource Library</h1>
          <p className="text-slate-600">Manage your proposal resources and boilerplate content</p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="w-5 h-5 mr-2" />
          Add Resource
        </Button>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
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
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
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
                        {resource.resource_type?.replace('_', ' ')}
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
                  {resource.description || 'No description'}
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
                  {resource.boilerplate_content && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePromoteToLibrary(resource)}
                      className="flex-1 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300"
                      title="Organize in Content Library"
                    >
                      <Library className="w-3 h-3 mr-1 text-green-600" />
                      Organize
                    </Button>
                  )}
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
                      if (confirm('Delete this resource?')) {
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

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
            <DialogDescription>
              Upload a file or create boilerplate content for reuse
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="file" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file">Upload File</TabsTrigger>
              <TabsTrigger value="boilerplate">Boilerplate Text</TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">File</label>
                <Input type="file" onChange={handleFileSelect} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  placeholder="Resource title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={newResource.description}
                  onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
                  placeholder="Brief description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <Select 
                  value={newResource.resource_type} 
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

            <TabsContent value="boilerplate" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <Input
                  value={newResource.title}
                  onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                  placeholder="Boilerplate title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
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
                <label className="block text-sm font-medium mb-2">Content</label>
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
              {uploading ? 'Uploading...' : 'Add Resource'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PromoteToLibraryDialog
        isOpen={showPromoteDialog}
        onClose={() => {
          setShowPromoteDialog(false);
          setResourceToPromote(null);
        }}
        sectionContent={resourceToPromote?.boilerplate_content}
        sectionName={resourceToPromote?.title}
        organization={organization}
      />

      <UniversalAlert
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        type={alertConfig.type}
        title={alertConfig.title}
        description={alertConfig.description}
      />
    </div>
  );
}
