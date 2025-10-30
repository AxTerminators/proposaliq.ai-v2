
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Building2,
  Edit,
  Trash2,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Palette,
  XCircle, // Added
  MessageSquare, // Added
  FileText, // Added
  Briefcase // Added for upgrade prompt
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import moment from "moment";
import { useRouter } from 'next/navigation'; // Assuming Next.js router for navigation
import { isConsultantAccount, hasClientPortalAccess } from "@/utils/organizationHelpers";

export default function ClientsPage() { // Renamed from Clients to ClientsPage
  const queryClient = useQueryClient();
  const router = useRouter(); // Initialize router for navigation
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [initialDataLoading, setInitialDataLoading] = useState(true); // New state for initial useEffect data
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [copied, setCopied] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [newClient, setNewClient] = useState({
    client_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    client_organization: "",
    client_title: "",
    address: "",
    industry: "",
    relationship_status: "active",
    portal_access_enabled: true,
    notes: "",
    custom_branding: {
      logo_url: "",
      primary_color: "#2563eb",
      company_name: ""
    }
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setInitialDataLoading(false); // Set to false after user/org data is loaded
      }
    };
    loadInitialData();
  }, []);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Client.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id && !initialDataLoading, // Enable only after organization is loaded
  });

  const { data: proposals } = useQuery({
    queryKey: ['proposals-for-clients', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({ organization_id: organization.id });
    },
    initialData: [],
    enabled: !!organization?.id && !initialDataLoading, // Enable only after organization is loaded
  });

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const subs = await base44.entities.Subscription.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );
      return subs.length > 0 ? subs[0] : null;
    },
    enabled: !!organization?.id && !initialDataLoading, // Enable only after organization is loaded
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData) => {
      // Generate secure access token
      const token = `client_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Token valid for 1 year

      return await base44.entities.Client.create({
        ...clientData,
        organization_id: organization.id,
        access_token: token,
        token_expires_at: expiresAt.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowAddDialog(false);
      setNewClient({
        client_name: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        client_organization: "",
        client_title: "",
        address: "",
        industry: "",
        relationship_status: "active",
        portal_access_enabled: true,
        notes: "",
        custom_branding: {
          logo_url: "",
          primary_color: "#2563eb",
          company_name: ""
        }
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ clientId, updates }) => {
      return await base44.entities.Client.update(clientId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowEditDialog(false);
      setSelectedClient(null);
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId) => {
      await base44.entities.Client.delete(clientId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: async (clientId) => {
      const token = `client_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      return await base44.entities.Client.update(clientId, {
        access_token: token,
        token_expires_at: expiresAt.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const handleLogoUpload = async (file, isEditing = false) => {
    if (!file) return;

    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      if (isEditing && selectedClient) {
        setSelectedClient(prev => ({
          ...prev,
          custom_branding: {
            ...(prev.custom_branding || {}),
            logo_url: file_url
          }
        }));
      } else {
        setNewClient(prev => ({
          ...prev,
          custom_branding: {
            ...(prev.custom_branding || {}),
            logo_url: file_url
          }
        }));
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCreateClient = () => {
    if (!newClient.client_name || !newClient.contact_email) {
      alert("Please fill in required fields");
      return;
    }
    createClientMutation.mutate(newClient);
  };

  const handleUpdateClient = () => {
    if (!selectedClient.client_name || !selectedClient.contact_email) {
      alert("Please fill in required fields");
      return;
    }
    updateClientMutation.mutate({
      clientId: selectedClient.id,
      updates: selectedClient
    });
  };

  const handleEditClient = (client) => {
    setSelectedClient({
      ...client,
      // Ensure custom_branding object exists to prevent errors with nested access
      custom_branding: client.custom_branding || {
        logo_url: "",
        primary_color: "#2563eb",
        company_name: ""
      }
    });
    setShowEditDialog(true);
  };

  const handleDeleteClient = (clientId) => {
    if (confirm("Are you sure you want to delete this client? This cannot be undone.")) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const handleCopyLink = (token) => {
    const link = `${window.location.origin}/ClientPortal?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShowLink = (client) => {
    setSelectedClient(client);
    setShowLinkDialog(true);
  };

  const handleRegenerateToken = (clientId) => {
    if (confirm("Regenerate access link? The old link will stop working.")) {
      regenerateTokenMutation.mutate(clientId);
    }
  };

  const getClientProposals = (clientId) => {
    return proposals.filter(p => p.shared_with_client_ids?.includes(clientId));
  };

  const getClientProposalStats = (clientId) => {
    const clientProps = getClientProposals(clientId);
    return {
      total: clientProps.length,
      awaitingReview: clientProps.filter(p => ['client_review', 'in_progress', 'draft', 'submitted'].includes(p.status)).length,
      accepted: clientProps.filter(p => p.status === 'client_accepted').length,
      rejected: clientProps.filter(p => p.status === 'client_rejected').length,
      submitted: clientProps.filter(p => p.status === 'submitted').length,
      recentActivity: clientProps.length > 0 ? clientProps.sort((a, b) =>
        new Date(b.updated_date) - new Date(a.updated_date)
      )[0] : null
    };
  };

  const filteredClients = clients.filter(client =>
    client.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.client_organization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if user has access to client features
  const hasAccess = organization && subscription && isConsultantAccount(organization) && hasClientPortalAccess(subscription);

  // Show loading skeleton if initial data or subscription is loading
  if (initialDataLoading || isLoadingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  // Show upgrade prompt if user doesn't have access
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-none shadow-xl">
            <CardContent className="p-12 text-center">
              <Users className="w-20 h-20 text-slate-300 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Client Management Requires Consultant Account
              </h2>
              <p className="text-slate-600 mb-6 max-w-lg mx-auto">
                Client management and portal features are exclusively available for Consultant Accounts.
                Upgrade to a Consultant plan to manage multiple clients, share proposals securely,
                and provide your clients with portal access.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => router.push("/pricing?plan=consultant")} // Example navigation
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  View Consultant Plans
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")} // Example navigation
                >
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Client Management</h1>
          <p className="text-slate-600">Manage your clients and their portal access</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="w-5 h-5 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client account with portal access
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Client Name *</Label>
                  <Input
                    value={newClient.client_name}
                    onChange={(e) => setNewClient({...newClient, client_name: e.target.value})}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label>Contact Email *</Label>
                  <Input
                    type="email"
                    value={newClient.contact_email}
                    onChange={(e) => setNewClient({...newClient, contact_email: e.target.value})}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={newClient.contact_name}
                    onChange={(e) => setNewClient({...newClient, contact_name: e.target.value})}
                    placeholder="Primary contact person"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={newClient.contact_phone}
                    onChange={(e) => setNewClient({...newClient, contact_phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label>Organization</Label>
                  <Input
                    value={newClient.client_organization}
                    onChange={(e) => setNewClient({...newClient, client_organization: e.target.value})}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newClient.client_title}
                    onChange={(e) => setNewClient({...newClient, client_title: e.target.value})}
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input
                    value={newClient.industry}
                    onChange={(e) => setNewClient({...newClient, industry: e.target.value})}
                    placeholder="e.g., Technology, Healthcare"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={newClient.relationship_status}
                    onValueChange={(value) => setNewClient({...newClient, relationship_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="former">Former</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={newClient.address}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                  placeholder="Business address"
                />
              </div>

              {/* Portal Branding Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Portal Branding
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Portal Company Name</Label>
                    <Input
                      value={newClient.custom_branding?.company_name || ""}
                      onChange={(e) => setNewClient({
                        ...newClient,
                        custom_branding: {
                          ...(newClient.custom_branding || {}), // Ensure custom_branding exists
                          company_name: e.target.value
                        }
                      })}
                      placeholder="Display name for portal (defaults to organization name)"
                    />
                  </div>

                  <div>
                    <Label>Portal Logo</Label>
                    <div className="flex items-center gap-4 mt-2">
                      {newClient.custom_branding?.logo_url && (
                        <img
                          src={newClient.custom_branding.logo_url}
                          alt="Logo preview"
                          className="h-16 w-16 object-contain border rounded"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e.target.files[0], false)}
                          disabled={uploadingLogo}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {uploadingLogo ? "Uploading..." : "Recommended: PNG or SVG, transparent background"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Primary Brand Color</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="color"
                        value={newClient.custom_branding?.primary_color || "#2563eb"}
                        onChange={(e) => setNewClient({
                          ...newClient,
                          custom_branding: {
                            ...(newClient.custom_branding || {}), // Ensure custom_branding exists
                            primary_color: e.target.value
                          }
                        })}
                        className="h-10 w-20 rounded border cursor-pointer"
                      />
                      <Input
                        value={newClient.custom_branding?.primary_color || "#2563eb"}
                        onChange={(e) => setNewClient({
                          ...newClient,
                          custom_branding: {
                            ...(newClient.custom_branding || {}), // Ensure custom_branding exists
                            primary_color: e.target.value
                          }
                        })}
                        placeholder="#2563eb"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      This color will be used for buttons and accents in their portal
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Internal Notes</Label>
                <Textarea
                  value={newClient.notes}
                  onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                  placeholder="Internal notes about this client..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={newClient.portal_access_enabled}
                  onChange={(e) => setNewClient({...newClient, portal_access_enabled: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label className="cursor-pointer">Enable portal access</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateClient} disabled={createClientMutation.isPending}>
                {createClientMutation.isPending ? 'Creating...' : 'Create Client'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Users className="w-10 h-10 text-blue-500" />
              <div className="text-right">
                <p className="text-3xl font-bold text-slate-900">{clients.length}</p>
                <p className="text-sm text-slate-600">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <div className="text-right">
                <p className="text-3xl font-bold text-green-600">
                  {clients.filter(c => c.relationship_status === 'active').length}
                </p>
                <p className="text-sm text-slate-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Eye className="w-10 h-10 text-purple-500" />
              <div className="text-right">
                <p className="text-3xl font-bold text-purple-600">
                  {clients.filter(c => c.portal_access_enabled).length}
                </p>
                <p className="text-sm text-slate-600">Portal Access</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <AlertCircle className="w-10 h-10 text-amber-500" />
              <div className="text-right">
                <p className="text-3xl font-bold text-amber-600">
                  {clients.filter(c => c.relationship_status === 'prospect').length}
                </p>
                <p className="text-sm text-slate-600">Prospects</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg mb-2">No clients yet</p>
              <p className="text-slate-500 text-sm">Add your first client to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map(client => {
                const clientProposals = getClientProposals(client.id);
                const stats = getClientProposalStats(client.id);

                return (
                  <div
                    key={client.id}
                    className="p-6 border-2 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Client Logo if available */}
                        {client.custom_branding?.logo_url && (
                          <img
                            src={client.custom_branding.logo_url}
                            alt={`${client.client_name} logo`}
                            className="h-12 w-12 object-contain rounded border"
                          />
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-slate-900">
                              {client.client_name}
                            </h3>
                            <Badge className={`capitalize ${
                              client.relationship_status === 'active' ? 'bg-green-100 text-green-700' :
                              client.relationship_status === 'prospect' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {client.relationship_status}
                            </Badge>
                            {client.portal_access_enabled ? (
                              <Badge variant="outline" className="text-green-600">
                                <Eye className="w-3 h-3 mr-1" />
                                Portal Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-500">
                                <EyeOff className="w-3 h-3 mr-1" />
                                Portal Disabled
                              </Badge>
                            )}
                            {client.custom_branding?.logo_url && (
                              <Badge variant="outline" className="text-purple-600">
                                <Palette className="w-3 h-3 mr-1" />
                                Branded
                              </Badge>
                            )}
                          </div>

                          <div className="grid md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Mail className="w-4 h-4" />
                              {client.contact_email}
                            </div>
                            {client.contact_phone && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Phone className="w-4 h-4" />
                                {client.contact_phone}
                              </div>
                            )}
                            {client.client_organization && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Building2 className="w-4 h-4" />
                                {client.client_organization}
                              </div>
                            )}
                          </div>

                          {client.last_portal_access && (
                            <p className="text-xs text-slate-500 mt-2">
                              Last portal access: {moment(client.last_portal_access).fromNow()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowLink(client)}
                          disabled={!client.portal_access_enabled}
                        >
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Get Link
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditClient(client)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteClient(client.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Enhanced Proposal Stats */}
                    {stats.total > 0 && (
                      <div className="border-t pt-4 space-y-3">
                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                            <p className="text-xs text-blue-700">Total Proposals</p>
                          </div>
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <p className="text-2xl font-bold text-amber-600">{stats.awaitingReview}</p>
                            <p className="text-xs text-amber-700">Awaiting Review</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
                            <p className="text-xs text-green-700">Accepted</p>
                          </div>
                          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                            <p className="text-xs text-red-700">Rejected</p>
                          </div>
                        </div>

                        {/* Recent Activity */}
                        {stats.recentActivity && (
                          <div className="p-3 bg-slate-50 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                Most Recent Activity
                              </p>
                              <span className="text-xs text-slate-500">
                                {moment(stats.recentActivity.updated_date).fromNow()}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{stats.recentActivity.proposal_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant={
                                    stats.recentActivity.status === 'client_accepted' ? 'default' :
                                    stats.recentActivity.status === 'client_rejected' ? 'destructive' :
                                    'secondary'
                                  } className="text-xs">
                                    {stats.recentActivity.status === 'client_accepted' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                    {stats.recentActivity.status === 'client_rejected' && <XCircle className="w-3 h-3 mr-1" />}
                                    {['client_review', 'in_progress', 'draft', 'submitted'].includes(stats.recentActivity.status) && <AlertCircle className="w-3 h-3 mr-1" />}
                                    {stats.recentActivity.status.replace(/_/g, ' ')}
                                  </Badge>
                                  {stats.recentActivity.client_feedback_count > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      <MessageSquare className="w-3 h-3 mr-1" />
                                      {stats.recentActivity.client_feedback_count} feedback
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => router.push(`/ProposalBuilder?id=${stats.recentActivity.id}`)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Proposals List */}
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">
                            Shared Proposals ({clientProposals.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {clientProposals.map(prop => (
                              <Badge
                                key={prop.id}
                                variant="secondary"
                                className="text-xs cursor-pointer hover:bg-slate-200"
                                onClick={() => router.push(`/ProposalBuilder?id=${prop.id}`)}
                              >
                                {prop.proposal_name}
                                {prop.status === 'client_accepted' && <CheckCircle2 className="w-3 h-3 ml-1 text-green-600" />}
                                {prop.status === 'client_rejected' && <XCircle className="w-3 h-3 ml-1 text-red-600" />}
                                {['client_review', 'in_progress', 'draft', 'submitted'].includes(prop.status) && <AlertCircle className="w-3 h-3 ml-1 text-amber-600" />}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* No Proposals Yet */}
                    {stats.total === 0 && (
                      <div className="border-t pt-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-dashed text-center">
                          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-600">No proposals shared yet</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Share a proposal with this client from the Proposal Builder
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portal Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Portal Access Link</DialogTitle>
            <DialogDescription>
              Share this secure link with {selectedClient?.client_name} to access their portal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 rounded-lg border">
              <p className="text-sm font-mono break-all text-slate-700">
                {window.location.origin}/ClientPortal?token={selectedClient?.access_token}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleCopyLink(selectedClient?.access_token)}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`/ClientPortal?token=${selectedClient?.access_token}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-600">
                  Token expires: {moment(selectedClient?.token_expires_at).format('MMMM D, YYYY')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleRegenerateToken(selectedClient?.id);
                    setShowLinkDialog(false);
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Security Note:</strong> This link is unique to this client and expires in one year.
                You can regenerate it anytime if needed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowLinkDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client information and portal settings
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4 py-4">
              {/* Basic Information */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Client Name *</Label>
                  <Input
                    value={selectedClient.client_name}
                    onChange={(e) => setSelectedClient({...selectedClient, client_name: e.target.value})}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label>Contact Email *</Label>
                  <Input
                    type="email"
                    value={selectedClient.contact_email}
                    onChange={(e) => setSelectedClient({...selectedClient, contact_email: e.target.value})}
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={selectedClient.contact_name || ""}
                    onChange={(e) => setSelectedClient({...selectedClient, contact_name: e.target.value})}
                    placeholder="Primary contact person"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={selectedClient.contact_phone || ""}
                    onChange={(e) => setSelectedClient({...selectedClient, contact_phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label>Organization</Label>
                  <Input
                    value={selectedClient.client_organization || ""}
                    onChange={(e) => setSelectedClient({...selectedClient, client_organization: e.target.value})}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label>Title</Label>
                  <Input
                    value={selectedClient.client_title || ""}
                    onChange={(e) => setSelectedClient({...selectedClient, client_title: e.target.value})}
                    placeholder="Job title"
                  />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input
                    value={selectedClient.industry || ""}
                    onChange={(e) => setSelectedClient({...selectedClient, industry: e.target.value})}
                    placeholder="e.g., Technology, Healthcare"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={selectedClient.relationship_status}
                    onValueChange={(value) => setSelectedClient({...selectedClient, relationship_status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="former">Former</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={selectedClient.address || ""}
                  onChange={(e) => setSelectedClient({...selectedClient, address: e.target.value})}
                  placeholder="Business address"
                />
              </div>

              {/* Portal Branding Section */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Portal Branding
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label>Portal Company Name</Label>
                    <Input
                      value={selectedClient.custom_branding?.company_name || ""}
                      onChange={(e) => setSelectedClient({
                        ...selectedClient,
                        custom_branding: {
                          ...(selectedClient.custom_branding || {}),
                          company_name: e.target.value
                        }
                      })}
                      placeholder="Display name for portal (defaults to organization name)"
                    />
                  </div>

                  <div>
                    <Label>Portal Logo</Label>
                    <div className="flex items-center gap-4 mt-2">
                      {selectedClient.custom_branding?.logo_url && (
                        <img
                          src={selectedClient.custom_branding.logo_url}
                          alt="Logo preview"
                          className="h-16 w-16 object-contain border rounded"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(e.target.files[0], true)}
                          disabled={uploadingLogo}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          {uploadingLogo ? "Uploading..." : "Recommended: PNG or SVG, transparent background"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Primary Brand Color</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="color"
                        value={selectedClient.custom_branding?.primary_color || "#2563eb"}
                        onChange={(e) => setSelectedClient({
                          ...selectedClient,
                          custom_branding: {
                            ...(selectedClient.custom_branding || {}),
                            primary_color: e.target.value
                          }
                        })}
                        className="h-10 w-20 rounded border cursor-pointer"
                      />
                      <Input
                        value={selectedClient.custom_branding?.primary_color || "#2563eb"}
                        onChange={(e) => setSelectedClient({
                          ...selectedClient,
                          custom_branding: {
                            ...(selectedClient.custom_branding || {}),
                            primary_color: e.target.value
                          }
                        })}
                        placeholder="#2563eb"
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      This color will be used for buttons and accents in their portal
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label>Internal Notes</Label>
                <Textarea
                  value={selectedClient.notes || ""}
                  onChange={(e) => setSelectedClient({...selectedClient, notes: e.target.value})}
                  placeholder="Internal notes about this client..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedClient.portal_access_enabled}
                  onChange={(e) => setSelectedClient({...selectedClient, portal_access_enabled: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label className="cursor-pointer">Enable portal access</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateClient} disabled={updateClientMutation.isPending}>
              {updateClientMutation.isPending ? 'Updating...' : 'Update Client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
