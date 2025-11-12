
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  Building2,
  Plus,
  Search,
  Users,
  ArrowRight,
  Mail,
  Phone,
  Globe,
  TrendingUp,
  Archive,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  Database,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  FileText,
  Library // NEW import for Library icon
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ClientUserManagement from "../components/clients/ClientUserManagement"; // NEW component import
import GlobalResourceLibrary from "../components/clients/GlobalResourceLibrary"; // NEW component import
import { // NEW imports for Tabs
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/**
 * Client Organization Manager
 * NEW page for managing client_organization entities under the new model
 * Replaces the old Client entity management
 */
export default function ClientOrganizationManager() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [consultingFirm, setConsultingFirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null); // NEW state for selected client

  const [formData, setFormData] = useState({
    organization_name: "",
    contact_name: "",
    contact_email: "",
    address: "",
    website_url: "",
    uei: "",
    cage_code: "",
    custom_branding: {
      logo_url: "",
      primary_color: "#3B82F6",
      welcome_message: ""
    }
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Get the user's consulting firm organization
        let firmId = currentUser.active_client_id;
        if (!firmId && currentUser.client_accesses?.length > 0) {
          firmId = currentUser.client_accesses[0].organization_id;
        }
        if (!firmId) {
          const orgs = await base44.entities.Organization.filter(
            { created_by: currentUser.email },
            '-created_date',
            1
          );
          if (orgs.length > 0) firmId = orgs[0].id;
        }

        if (firmId) {
          const orgs = await base44.entities.Organization.filter({ id: firmId });
          if (orgs.length > 0) {
            setConsultingFirm(orgs[0]);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load data");
      }
    };
    loadData();
  }, []);

  // Fetch all client organizations managed by this consulting firm
  const { data: clientOrganizations = [], isLoading } = useQuery({
    queryKey: ['client-organizations', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.Organization.filter(
        {
          organization_type: 'client_organization',
          parent_organization_id: consultingFirm.id
        },
        '-created_date'
      );
    },
    enabled: !!consultingFirm?.id,
  });

  // Fetch relationships for additional metadata
  const { data: relationships = [] } = useQuery({
    queryKey: ['org-relationships', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.OrganizationRelationship.filter({
        consulting_firm_id: consultingFirm.id
      });
    },
    enabled: !!consultingFirm?.id,
  });

  const createClientOrgMutation = useMutation({
    mutationFn: async (data) => {
      if (editingClient) {
        return base44.entities.Organization.update(editingClient.id, data);
      } else {
        // NEW: Use backend function for creation
        const response = await base44.functions.invoke('createClientOrganization', {
          consulting_firm_id: consultingFirm.id,
          organization_name: data.organization_name,
          contact_name: data.contact_name || data.organization_name,
          contact_email: data.contact_email,
          address: data.address || '',
          website_url: data.website_url || '',
          uei: data.uei || '',
          cage_code: data.cage_code || '',
          custom_branding: data.custom_branding,
          primary_consultant_email: user.email,
          consultant_role: 'organization_owner'
        });

        if (!response.data.success) {
          throw new Error(response.data.error || 'Failed to create client organization');
        }

        return response.data.organization;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['client-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['org-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['accessible-organizations'] });
      
      toast.success(
        editingClient 
          ? "Client updated!" 
          : `✅ ${result.organization_name || 'Client'} workspace created with default setup!`
      );
      
      setShowCreateDialog(false);
      setEditingClient(null);
      resetForm();
      // If editing, update the selected client's data
      if (selectedClient && editingClient && selectedClient.id === editingClient.id) {
        setSelectedClient(result);
      }
    },
    onError: (error) => {
      toast.error("Failed to save: " + error.message);
    }
  });

  const archiveClientMutation = useMutation({
    mutationFn: async (clientOrg) => {
      return base44.entities.Organization.update(clientOrg.id, {
        is_archived: !clientOrg.is_archived,
        archived_date: !clientOrg.is_archived ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-organizations'] });
      toast.success("Client status updated!");
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id) => {
      // Delete organization and its relationship
      const rels = await base44.entities.OrganizationRelationship.filter({
        client_organization_id: id
      });
      
      for (const rel of rels) {
        await base44.entities.OrganizationRelationship.delete(rel.id);
      }
      
      return base44.entities.Organization.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['org-relationships'] });
      toast.success("Client organization deleted");
      setShowDeleteConfirm(false);
      setClientToDelete(null);
      if (selectedClient?.id === clientToDelete?.id) {
        setSelectedClient(null); // Deselect if the deleted client was being viewed
      }
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      organization_name: "",
      contact_name: "",
      contact_email: "",
      address: "",
      website_url: "",
      uei: "",
      cage_code: "",
      custom_branding: {
        logo_url: "",
        primary_color: "#3B82F6",
        welcome_message: ""
      }
    });
  };

  const handleEdit = (clientOrg) => {
    setEditingClient(clientOrg);
    setFormData({
      organization_name: clientOrg.organization_name || "",
      contact_name: clientOrg.contact_name || "",
      contact_email: clientOrg.contact_email || "",
      address: clientOrg.address || "",
      website_url: clientOrg.website_url || "",
      uei: clientOrg.uei || "",
      cage_code: clientOrg.cage_code || "",
      custom_branding: clientOrg.custom_branding || {
        logo_url: "",
        primary_color: "#3B82F6",
        welcome_message: ""
      }
    });
    setShowCreateDialog(true);
  };

  const handleDelete = (clientOrg) => {
    setClientToDelete(clientOrg);
    setShowDeleteConfirm(true);
  };

  const handleSave = async () => {
    if (!formData.organization_name?.trim() || !formData.contact_email?.trim()) {
      toast.error("Organization name and contact email are required");
      return;
    }

    setIsCreating(true);
    try {
      await createClientOrgMutation.mutateAsync(formData);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchToClient = async (clientOrg) => {
    try {
      await base44.auth.updateMe({ active_client_id: clientOrg.id });
      toast.success(`Switched to ${clientOrg.organization_name}`);
      window.location.reload();
    } catch (error) {
      toast.error("Failed to switch: " + error.message);
    }
  };

  const filteredClients = clientOrganizations.filter(org => {
    const matchesSearch = !searchQuery ||
      org.organization_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.contact_email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "active" && !org.is_archived) ||
      (filterStatus === "archived" && org.is_archived);

    return matchesSearch && matchesStatus;
  });

  const getRelationship = (clientOrgId) => {
    return relationships.find(r => r.client_organization_id === clientOrgId);
  };

  if (!consultingFirm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  // Check if this is a consulting firm
  const isConsultingFirm = consultingFirm.organization_type === 'consulting_firm' || 
                           consultingFirm.organization_type === 'consultancy' ||
                           (consultingFirm.organization_type === 'demo' && consultingFirm.demo_view_mode === 'consultancy');

  if (!isConsultingFirm) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Feature Not Available
            </h3>
            <p className="text-slate-600">
              Client organization management is only available for consulting firms.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // NEW: If a client is selected, show detailed view
  if (selectedClient) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedClient(null)}
              className="-ml-2"
            >
              ← Back to All Clients
            </Button>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              {selectedClient.organization_name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700">
              Client Workspace
            </Badge>
            {selectedClient.is_archived && (
              <Badge className="bg-slate-100 text-slate-700 text-xs">
                <Archive className="w-3 h-3 mr-1" />
                Archived
              </Badge>
            )}
          </div>
        </div>
        <p className="text-slate-600 mt-1">{selectedClient.contact_email}</p>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              User Access
            </TabsTrigger>
            <TabsTrigger value="resources">
              <Library className="w-4 h-4 mr-2" />
              Push Resources
            </TabsTrigger>
            <TabsTrigger value="details">
              <FileText className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <ClientUserManagement 
              clientOrganization={selectedClient}
              consultingFirm={consultingFirm}
            />
          </TabsContent>

          <TabsContent value="resources">
            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <p className="text-slate-600 mb-4">
                  Push templates, past performance, key personnel, and other resources from your firm's library to this client workspace
                </p>
                <GlobalResourceLibrary consultingFirm={consultingFirm} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Organization Details</CardTitle>
                  <Button 
                    variant="outline"
                    onClick={() => handleEdit(selectedClient)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedClient.contact_name && (
                    <div>
                      <label className="text-sm text-slate-500">Contact Name</label>
                      <p className="font-medium">{selectedClient.contact_name}</p>
                    </div>
                  )}
                  {selectedClient.contact_email && (
                    <div>
                      <label className="text-sm text-slate-500">Email</label>
                      <p className="font-medium">{selectedClient.contact_email}</p>
                    </div>
                  )}
                  {selectedClient.website_url && (
                    <div>
                      <label className="text-sm text-slate-500">Website</label>
                      <a 
                        href={selectedClient.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {selectedClient.website_url}
                      </a>
                    </div>
                  )}
                  {selectedClient.address && (
                    <div>
                      <label className="text-sm text-slate-500">Address</label>
                      <p className="font-medium">{selectedClient.address}</p>
                    </div>
                  )}
                  {selectedClient.uei && (
                    <div>
                      <label className="text-sm text-slate-500">UEI</label>
                      <p className="font-medium font-mono">{selectedClient.uei}</p>
                    </div>
                  )}
                  {selectedClient.cage_code && (
                    <div>
                      <label className="text-sm text-slate-500">CAGE Code</label>
                      <p className="font-medium font-mono">{selectedClient.cage_code}</p>
                    </div>
                  )}
                </div>

                {selectedClient.custom_branding && (
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold text-slate-900 mb-3">Custom Branding</h4>
                    <div className="space-y-3">
                      {selectedClient.custom_branding.logo_url && (
                        <div>
                          <label className="text-sm text-slate-500">Logo URL</label>
                          <p className="text-sm text-slate-700 mt-1">
                            <a 
                              href={selectedClient.custom_branding.logo_url}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {selectedClient.custom_branding.logo_url}
                            </a>
                          </p>
                        </div>
                      )}
                      {selectedClient.custom_branding.primary_color && (
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-8 h-8 rounded border"
                            style={{ backgroundColor: selectedClient.custom_branding.primary_color }}
                          />
                          <span className="text-sm text-slate-600">
                            Brand Color: {selectedClient.custom_branding.primary_color}
                          </span>
                        </div>
                      )}
                      {selectedClient.custom_branding.welcome_message && (
                        <div>
                          <label className="text-sm text-slate-500">Welcome Message</label>
                          <p className="text-sm text-slate-700 mt-1">
                            {selectedClient.custom_branding.welcome_message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Client Organizations
          </h1>
          <p className="text-slate-600">
            Manage dedicated workspaces for each of your clients with complete data isolation
          </p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowCreateDialog(true); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Client Workspace
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search client organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="archived">Archived Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client Organizations Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {clientOrganizations.length === 0 ? "No Client Workspaces Yet" : "No Matching Clients"}
            </h3>
            <p className="text-slate-600 mb-6">
              {clientOrganizations.length === 0
                ? "Create dedicated workspaces for your clients with complete data isolation"
                : "Try adjusting your search or filters"
              }
            </p>
            {clientOrganizations.length === 0 && (
              <Button
                onClick={() => { resetForm(); setShowCreateDialog(true); }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create First Client Workspace
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((clientOrg) => {
            const relationship = getRelationship(clientOrg.id);
            const isArchived = clientOrg.is_archived;

            return (
              <Card
                key={clientOrg.id}
                className={cn(
                  "border-none shadow-lg hover:shadow-xl transition-all cursor-pointer",
                  isArchived && "opacity-75"
                )}
                onClick={() => setSelectedClient(clientOrg)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <CardTitle className="text-lg truncate">
                          {clientOrg.organization_name}
                        </CardTitle>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-blue-100 text-blue-700 text-xs">
                          Client Workspace
                        </Badge>
                        {isArchived && (
                          <Badge className="bg-slate-100 text-slate-700 text-xs">
                            <Archive className="w-3 h-3 mr-1" />
                            Archived
                          </Badge>
                        )}
                        {relationship && (
                          <Badge className={cn(
                            "text-xs",
                            relationship.relationship_status === 'active' ? "bg-green-100 text-green-700" :
                            relationship.relationship_status === 'prospect' ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-700"
                          )}>
                            {relationship.relationship_status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(clientOrg);
                        }}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(clientOrg);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Contact Info */}
                  {clientOrg.contact_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{clientOrg.contact_name}</span>
                    </div>
                  )}
                  {clientOrg.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <a href={`mailto:${clientOrg.contact_email}`} className="text-blue-600 hover:underline truncate">
                        {clientOrg.contact_email}
                      </a>
                    </div>
                  )}
                  {clientOrg.website_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <a href={clientOrg.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                        Visit Website
                      </a>
                    </div>
                  )}

                  {/* Relationship Stats */}
                  {relationship && (
                    <div className="pt-3 border-t">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-blue-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-blue-900">
                            {relationship.total_proposals_created || 0}
                          </div>
                          <div className="text-xs text-blue-700">Proposals</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-green-900">
                            {relationship.total_proposals_won || 0}
                          </div>
                          <div className="text-xs text-green-700">Won</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-2">
                          <div className="text-lg font-bold text-purple-900">
                            {relationship.win_rate ? `${relationship.win_rate}%` : '-%'}
                          </div>
                          <div className="text-xs text-purple-700">Win Rate</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-3 border-t space-y-2">
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwitchToClient(clientOrg);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Open Workspace
                      <ArrowRight className="w-4 h-4 ml-auto" />
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClient(clientOrg);
                        }}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Manage Users
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveClientMutation.mutate(clientOrg);
                        }}
                        disabled={archiveClientMutation.isPending}
                      >
                        <Archive className="w-4 h-4 mr-1" />
                        {isArchived ? "Unarchive" : "Archive"}
                      </Button>
                    </div>
                  </div>

                  {/* Footer */}
                  {relationship?.last_interaction_date && (
                    <div className="pt-2 border-t text-xs text-slate-500">
                      Last activity: {moment(relationship.last_interaction_date).fromNow()}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) {
          setEditingClient(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-6 h-6 text-blue-600" />
              {editingClient ? 'Edit Client Organization' : 'Create Client Workspace'}
            </DialogTitle>
            <DialogDescription>
              {editingClient 
                ? 'Update client organization details'
                : 'Create a new dedicated workspace with complete data isolation for your client'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Basic Information
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Organization Name *</Label>
                  <Input
                    value={formData.organization_name}
                    onChange={(e) => setFormData({...formData, organization_name: e.target.value})}
                    placeholder="Acme Defense Solutions"
                    className={!formData.organization_name && "border-red-300"}
                  />
                </div>

                <div>
                  <Label>Primary Contact Name</Label>
                  <Input
                    value={formData.contact_name}
                    onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <Label>Contact Email *</Label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                    placeholder="john.smith@acmedefense.com"
                    className={!formData.contact_email && "border-red-300"}
                  />
                </div>

                <div>
                  <Label>Website</Label>
                  <Input
                    value={formData.website_url}
                    onChange={(e) => setFormData({...formData, website_url: e.target.value})}
                    placeholder="https://acmedefense.com"
                  />
                </div>

                <div>
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="123 Defense Ave, Arlington, VA"
                  />
                </div>

                <div>
                  <Label>UEI</Label>
                  <Input
                    value={formData.uei}
                    onChange={(e) => setFormData({...formData, uei: e.target.value})}
                    placeholder="Unique Entity Identifier"
                  />
                </div>

                <div>
                  <Label>CAGE Code</Label>
                  <Input
                    value={formData.cage_code}
                    onChange={(e) => setFormData({...formData, cage_code: e.target.value})}
                    placeholder="1A2B3"
                  />
                </div>
              </div>
            </div>

            {/* Custom Branding */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Custom Branding (Optional)
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Logo URL</Label>
                  <Input
                    value={formData.custom_branding?.logo_url || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      custom_branding: {
                        ...formData.custom_branding,
                        logo_url: e.target.value
                      }
                    })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div>
                  <Label>Primary Brand Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.custom_branding?.primary_color || "#3B82F6"}
                      onChange={(e) => setFormData({
                        ...formData,
                        custom_branding: {
                          ...formData.custom_branding,
                          primary_color: e.target.value
                        }
                      })}
                      className="w-20"
                    />
                    <Input
                      value={formData.custom_branding?.primary_color || "#3B82F6"}
                      onChange={(e) => setFormData({
                        ...formData,
                        custom_branding: {
                          ...formData.custom_branding,
                          primary_color: e.target.value
                        }
                      })}
                      placeholder="#3B82F6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Welcome Message</Label>
                  <Textarea
                    value={formData.custom_branding?.welcome_message || ""}
                    onChange={(e) => setFormData({
                      ...formData,
                      custom_branding: {
                        ...formData.custom_branding,
                        welcome_message: e.target.value
                      }
                    })}
                    placeholder="Welcome to your secure proposal workspace..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {!editingClient && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  ℹ️ <strong>Automatic Setup:</strong> This will create a complete workspace with:
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1 ml-4">
                  <li>• Master proposal board with default columns</li>
                  <li>• Content library folder structure</li>
                  <li>• User access for you as organization owner</li>
                  <li>• Relationship tracking for analytics</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !formData.organization_name?.trim() || 
                !formData.contact_email?.trim() ||
                isCreating
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingClient ? 'Updating...' : 'Creating Workspace...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {editingClient ? 'Update Client' : 'Create Client Workspace'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setClientToDelete(null);
        }}
        onConfirm={() => deleteClientMutation.mutate(clientToDelete.id)}
        title="Delete Client Organization?"
        variant="danger"
        confirmText="Yes, Delete Permanently"
        isLoading={deleteClientMutation.isPending}
      >
        <div className="space-y-3">
          <p className="text-slate-700">
            Are you sure you want to permanently delete <strong>"{clientToDelete?.organization_name}"</strong>?
          </p>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900 font-semibold mb-2">
              ⚠️ This action cannot be undone and will delete:
            </p>
            <ul className="text-sm text-red-800 space-y-1 ml-4">
              <li>• All proposals within this client workspace</li>
              <li>• All user access permissions</li>
              <li>• All files and resources</li>
              <li>• All relationship and analytics data</li>
            </ul>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
