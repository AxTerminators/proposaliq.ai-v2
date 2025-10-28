import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Upload, 
  Search,
  ExternalLink,
  Trash2,
  Building2,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Resources() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState(null);

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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProposalResource.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

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
          entity_type: entityType
        });
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['resources'] });
    setUploading(false);
  };

  const filteredResources = resources.filter(resource =>
    resource.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const orgResources = filteredResources.filter(r => r.entity_type === 'organization');
  const partnerResources = filteredResources.filter(r => r.entity_type === 'teaming_partner');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Resource Library</h1>
        <p className="text-slate-600">Manage capability statements, marketing collateral, and proposal documents</p>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <CardTitle>All Resources</CardTitle>
            <div className="relative w-full lg:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="organization" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="organization">
                <Building2 className="w-4 h-4 mr-2" />
                Organization Resources ({orgResources.length})
              </TabsTrigger>
              <TabsTrigger value="partners">
                <Users className="w-4 h-4 mr-2" />
                Partner Resources ({partnerResources.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="organization" className="space-y-4">
              {organizations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Upload Organization Resources</h3>
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

              {orgResources.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>No organization resources yet</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {orgResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="font-medium text-slate-900">{resource.file_name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {resource.resource_type?.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {(resource.file_size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(resource.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="partners" className="space-y-4">
              {partners.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">Upload Partner Resources</h3>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                    onChange={(e) => handleFileUpload(
                      Array.from(e.target.files),
                      'capability_statement',
                      'teaming_partner',
                      partners[0]?.id
                    )}
                    className="hidden"
                    id="partner-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="partner-upload">
                    <Button disabled={uploading} asChild>
                      <span className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? "Uploading..." : "Upload Files"}
                      </span>
                    </Button>
                  </label>
                </div>
              )}

              {partnerResources.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p>No partner resources yet</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {partnerResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-8 h-8 text-purple-500" />
                        <div>
                          <p className="font-medium text-slate-900">{resource.file_name}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {resource.resource_type?.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {(resource.file_size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href={resource.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(resource.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}