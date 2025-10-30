import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Mail,
  Phone,
  Building2,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  RefreshCw,
  Calendar,
  Palette,
  BarChart3
} from "lucide-react";
import moment from "moment";
import ClientPortalCustomizer from "../components/client/ClientPortalCustomizer";
import ClientEngagementAnalytics from "../components/analytics/ClientEngagementAnalytics";

export default function ClientsPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedClientForLink, setSelectedClientForLink] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [formData, setFormData] = useState({
    client_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    client_organization: "",
    client_title: "",
    address: "",
    industry: "",
    notes: "",
    portal_access_enabled: true
  });

  useEffect(() => {
    const loadUserData = async () => {
      const userData = await base44.auth.me();
      setUser(userData);

      const orgs = await base44.entities.Organization.filter({
        id: userData.organization_id
      });
      if (orgs.length > 0) {
        setOrganization(orgs[0]);
      }
    };
    loadUserData();
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
    enabled: !!organization?.id,
  });

  const createClientMutation = useMutation({
    mutationFn: async (clientData) => {
      const accessToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
      
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setMonth(tokenExpiresAt.getMonth() + 6);

      return await base44.entities.Client.create({
        ...clientData,
        organization_id: organization.id,
        access_token: accessToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        relationship_status: "active"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowDialog(false);
      resetForm();
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Client.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setShowDialog(false);
      setEditingClient(null);
      resetForm();
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId) => {
      return await base44.entities.Client.delete(clientId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: async (clientId) => {
      const newToken = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
      
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setMonth(tokenExpiresAt.getMonth() + 6);

      return await base44.entities.Client.update(clientId, {
        access_token: newToken,
        token_expires_at: tokenExpiresAt.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingClient) {
      updateClientMutation.mutate({
        id: editingClient.id,
        data: formData
      });
    } else {
      createClientMutation.mutate(formData);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      client_name: client.client_name || "",
      contact_name: client.contact_name || "",
      contact_email: client.contact_email || "",
      contact_phone: client.contact_phone || "",
      client_organization: client.client_organization || "",
      client_title: client.client_title || "",
      address: client.address || "",
      industry: client.industry || "",
      notes: client.notes || "",
      portal_access_enabled: client.portal_access_enabled
    });
    setShowDialog(true);
  };

  const handleDelete = async (client) => {
    if (confirm(`Delete client "${client.client_name}"? This cannot be undone.`)) {
      deleteClientMutation.mutate(client.id);
    }
  };

  const resetForm = () => {
    setFormData({
      client_name: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      client_organization: "",
      client_title: "",
      address: "",
      industry: "",
      notes: "",
      portal_access_enabled: true
    });
  };

  const getPortalUrl = (client) => {
    return `${window.location.origin}/ClientPortal?token=${client.access_token}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  const activeClients = clients.filter(c => c.relationship_status === 'active');
  const inactiveClients = clients.filter(c => c.relationship_status === 'inactive');

  if (!user || !organization) {
    return (
      <div className="p-6">
        <Skeleton className="h-32 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 sm:w-8 sm:h-8" />
            Client Management
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Manage your clients and their portal access
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingClient(null);
            resetForm();
            setShowDialog(true);
          }}
          className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 min-h-[44px]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Users className="w-8 h-8 text-purple-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{clients.length}</p>
                <p className="text-xs text-slate-600">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">{activeClients.length}</p>
                <p className="text-xs text-slate-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <XCircle className="w-8 h-8 text-slate-400" />
              <div className="text-right">
                <p className="text-2xl font-bold">{inactiveClients.length}</p>
                <p className="text-xs text-slate-600">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Eye className="w-8 h-8 text-blue-500" />
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {clients.filter(c => c.last_portal_access).length}
                </p>
                <p className="text-xs text-slate-600">Portal Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle>All Clients ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-lg font-medium mb-2">No clients yet</p>
              <p className="text-sm mb-4">Add your first client to get started</p>
              <Button onClick={() => setShowDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Client
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {clients.map((client) => (
                <Card key={client.id} className="border-2 hover:border-purple-300 transition-all">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                      <div className="flex-1 w-full sm:w-auto">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-lg font-semibold">
                              {client.contact_name?.[0]?.toUpperCase() || client.client_name?.[0]?.toUpperCase() || 'C'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-slate-900">
                              {client.contact_name || client.client_name}
                            </h3>
                            {client.client_organization && (
                              <p className="text-sm text-slate-600">{client.client_organization}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              {client.relationship_status === 'active' ? (
                                <Badge className="bg-green-100 text-green-700">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                              {client.portal_access_enabled && (
                                <Badge className="bg-blue-100 text-blue-700">Portal Enabled</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-2 text-sm">
                          {client.contact_email && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Mail className="w-4 h-4" />
                              <span className="truncate">{client.contact_email}</span>
                            </div>
                          )}
                          {client.contact_phone && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Phone className="w-4 h-4" />
                              {client.contact_phone}
                            </div>
                          )}
                          {client.industry && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Building2 className="w-4 h-4" />
                              {client.industry}
                            </div>
                          )}
                          {client.last_portal_access && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="w-4 h-4" />
                              Last active: {moment(client.last_portal_access).fromNow()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowCustomizer(true);
                          }}
                          className="flex-1 sm:flex-none min-h-[44px]"
                        >
                          <Palette className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Customize</span>
                          <span className="sm:hidden">Brand</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClient(client);
                            setShowAnalytics(true);
                          }}
                          className="flex-1 sm:flex-none min-h-[44px]"
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Analytics</span>
                          <span className="sm:hidden">Stats</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedClientForLink(client);
                            setShowLinkDialog(true);
                          }}
                          className="flex-1 sm:flex-none min-h-[44px]"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">Portal Link</span>
                          <span className="sm:hidden">Link</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(client)}
                          className="min-h-[44px]"
                        >
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(client)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Client Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            <DialogDescription>
              {editingClient ? 'Update client information' : 'Add a new client to your organization'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_name">Contact Name *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="contact_email">Contact Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="client_organization">Organization</Label>
                <Input
                  id="client_organization"
                  value={formData.client_organization}
                  onChange={(e) => setFormData({ ...formData, client_organization: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="contact_phone">Phone</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="client_title">Job Title</Label>
                <Input
                  id="client_title"
                  value={formData.client_title}
                  onChange={(e) => setFormData({ ...formData, client_title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Internal notes about this client"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDialog(false);
                  setEditingClient(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createClientMutation.isPending || updateClientMutation.isPending}
              >
                {editingClient ? 'Update Client' : 'Add Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Portal Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Portal Access</DialogTitle>
            <DialogDescription>
              Share this link with {selectedClientForLink?.contact_name} to give them access
            </DialogDescription>
          </DialogHeader>

          {selectedClientForLink && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border">
                <Label className="text-xs text-slate-600 mb-2">Portal URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={getPortalUrl(selectedClientForLink)}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(getPortalUrl(selectedClientForLink))}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  <strong>Expires:</strong> {moment(selectedClientForLink.token_expires_at).format('MMMM D, YYYY')}
                </p>
                <p className="text-sm text-slate-600">
                  <strong>Last Access:</strong>{' '}
                  {selectedClientForLink.last_portal_access
                    ? moment(selectedClientForLink.last_portal_access).fromNow()
                    : 'Never'}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Generate a new access link? The old link will stop working.')) {
                    regenerateTokenMutation.mutate(selectedClientForLink.id);
                  }
                }}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate Link
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowLinkDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customizer Dialog */}
      <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Portal Customization</DialogTitle>
            <DialogDescription>
              Customize the portal experience for {selectedClient?.contact_name || selectedClient?.client_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <ClientPortalCustomizer
              client={selectedClient}
              onUpdate={(updated) => {
                queryClient.invalidateQueries({ queryKey: ['clients'] });
                setShowCustomizer(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Engagement Analytics</DialogTitle>
            <DialogDescription>
              Detailed analytics for {selectedClient?.contact_name || selectedClient?.client_name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedClient && (
            <ClientEngagementAnalytics
              clientId={selectedClient.id}
              organizationId={organization?.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}