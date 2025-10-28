import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hasPermission, logActivity } from "@/utils";
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
  Users,
  Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Resources() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);

  React.useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUserData();
  }, []);

  const { data: orgResources, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['org-resources', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      
      if (user) {
        await logActivity({
          user,
          organizationId: currentOrgId,
          actionType: "view",
          resourceType: "library",
          resourceId: "org_resources",
          resourceName: "Organization Library",
          details: "Viewed organization resource library"
        });
      }
      
      return base44.entities.ProposalResource.filter({
        organization_id: currentOrgId,
        entity_type: "organization"
      });
    },
    initialData: [],
    enabled: !!currentOrgId,
  });

  const { data: teamingPartners, isLoading: isLoadingPartners } = useQuery({
    queryKey: ['teaming-partners', currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) return [];
      return base44.entities.TeamingPartner.filter({
        organization_id: currentOrgId
      });
    },
    initialData: [],
    enabled: !!currentOrgId,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, entityType }) => {
      if (!currentOrgId) {
        throw new Error("Organization not found");
      }

      if (!hasPermission(user, 'can_manage_library')) {
        throw new Error("You don't have permission to upload to the library");
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const resource = await base44.entities.ProposalResource.create({
        organization_id: currentOrgId,
        entity_type: entityType,
        resource_type: "template",
        file_name: file.name,
        file_url: file_url,
        file_size: file.size
      });

      await logActivity({
        user,
        organizationId: currentOrgId,
        actionType: "upload",
        resourceType: "document",
        resourceId: resource.id,
        resourceName: file.name,
        details: `Uploaded ${entityType} document: ${file.name}`
      });

      return resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-resources'] });
      alert("File uploaded successfully!");
    },
    onError: (error) => {
      alert(error.message || "Error uploading file");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (resourceId) => {
      if (!hasPermission(user, 'can_manage_library')) {
        throw new Error("You don't have permission to delete from the library");
      }

      const resources = await base44.entities.ProposalResource.filter({ 
        id: resourceId,
        organization_id: currentOrgId 
      });
      
      if (resources.length === 0) {
        throw new Error("Resource not found or access denied");
      }

      await base44.entities.ProposalResource.delete(resourceId);

      await logActivity({
        user,
        organizationId: currentOrgId,
        actionType: "delete",
        resourceType: "document",
        resourceId: resourceId,
        resourceName: resources[0].file_name,
        details: `Deleted document: ${resources[0].file_name}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-resources'] });
      alert("Resource deleted!");
    },
    onError: (error) => {
      alert(error.message || "Error deleting resource");
    }
  });

  const handleUpload = (e, entityType) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate({ file, entityType });
    }
  };

  const filteredOrgResources = orgResources.filter(r =>
    r.file_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPartners = teamingPartners.filter(p =>
    p.partner_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManageLibrary = user && hasPermission(user, 'can_manage_library');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Resource Library</h1>
          <p className="text-slate-600">Manage organization templates and teaming partners</p>
        </div>
      </div>

      {!canManageLibrary && (
        <Alert className="border-amber-300 bg-amber-50">
          <Lock className="w-4 h-4" />
          <AlertDescription>
            Your role ({user?.user_role || 'viewer'}) does not allow managing the library. You can view resources but cannot upload or delete. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs defaultValue="organization" className="w-full">
        <TabsList>
          <TabsTrigger value="organization">
            <Building2 className="w-4 h-4 mr-2" />
            Organization Library
          </TabsTrigger>
          <TabsTrigger value="partners">
            <Users className="w-4 h-4 mr-2" />
            Teaming Partners
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="mt-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <CardTitle>Organization Documents</CardTitle>
                <div>
                  <input
                    type="file"
                    accept=".pdf,.docx,.xlsx,.pptx"
                    onChange={(e) => handleUpload(e, "organization")}
                    className="hidden"
                    id="org-upload"
                    disabled={!canManageLibrary}
                  />
                  <label htmlFor="org-upload">
                    <Button asChild disabled={!canManageLibrary}>
                      <span className="cursor-pointer">
                        {canManageLibrary ? (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Document
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            No Access
                          </>
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingOrg ? (
                <p className="text-center py-8 text-slate-500">Loading...</p>
              ) : filteredOrgResources.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg mb-2">No documents yet</p>
                  <p className="text-slate-500">Upload templates and reference documents</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredOrgResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        <div>
                          <h3 className="font-semibold text-slate-900">{resource.file_name}</h3>
                          <p className="text-sm text-slate-500">
                            {(resource.file_size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(resource.file_url, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMutation.mutate(resource.id)}
                          disabled={!canManageLibrary}
                        >
                          {canManageLibrary ? (
                            <Trash2 className="w-4 h-4" />
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="partners" className="mt-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b">
              <CardTitle>Teaming Partners</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingPartners ? (
                <p className="text-center py-8 text-slate-500">Loading...</p>
              ) : filteredPartners.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600 text-lg mb-2">No teaming partners yet</p>
                  <p className="text-slate-500">Add partners through the proposal builder</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredPartners.map((partner) => (
                    <div
                      key={partner.id}
                      className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-slate-900">{partner.partner_name}</h3>
                        <Badge>{partner.partner_type || "Partner"}</Badge>
                      </div>
                      {partner.contact_email && (
                        <p className="text-sm text-slate-600">Contact: {partner.contact_email}</p>
                      )}
                      {partner.capabilities && (
                        <p className="text-sm text-slate-500 mt-2">{partner.capabilities}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}