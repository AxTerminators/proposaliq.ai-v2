import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  Eye,
  Palette,
  BarChart3,
  Mail,
  Phone,
  Building2,
  Calendar,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Trash2
} from "lucide-react";
import { hasPermission } from "./PermissionChecker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientPortalCustomizer from "../client/ClientPortalCustomizer";
import ClientEngagementAnalytics from "../analytics/ClientEngagementAnalytics";
import moment from "moment";

export default function ClientManagementModule({ currentUser }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailTab, setDetailTab] = useState("overview");

  const { data: clients } = useQuery({
    queryKey: ['admin-all-clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    initialData: []
  });

  const { data: organizations } = useQuery({
    queryKey: ['admin-client-orgs'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
    initialData: []
  });

  const { data: proposals } = useQuery({
    queryKey: ['admin-client-proposals'],
    queryFn: () => base44.entities.Proposal.list('-created_date'),
    initialData: []
  });

  const { data: clientFiles } = useQuery({
    queryKey: ['admin-client-files', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      return base44.entities.ClientUploadedFile.filter({ client_id: selectedClient.id });
    },
    initialData: [],
    enabled: !!selectedClient?.id
  });

  const { data: clientNotifications } = useQuery({
    queryKey: ['admin-client-notifications', selectedClient?.id],
    queryFn: async () => {
      if (!selectedClient?.id) return [];
      return base44.entities.ClientNotification.filter({ client_id: selectedClient.id }, '-created_date', 50);
    },
    initialData: [],
    enabled: !!selectedClient?.id
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
      queryClient.invalidateQueries({ queryKey: ['admin-all-clients'] });
      alert("Access token regenerated successfully");
    },
  });

  const togglePortalAccessMutation = useMutation({
    mutationFn: async ({ clientId, enabled }) => {
      return await base44.entities.Client.update(clientId, {
        portal_access_enabled: enabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-clients'] });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId) => {
      return await base44.entities.Client.delete(clientId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-clients'] });
      setShowDetailDialog(false);
      alert("Client deleted successfully");
    },
  });

  const filteredClients = clients.filter(client =>
    client.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.client_organization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManageClients = hasPermission(currentUser, "manage_users");

  // Stats
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.relationship_status === 'active').length;
  const portalUsers = clients.filter(c => c.last_portal_access).length;
  const avgEngagement = clients.reduce((sum, c) => sum + (c.engagement_score || 0), 0) / (clients.length || 1);

  const getClientProposals = (clientId) => {
    return proposals.filter(p => p.shared_with_client_ids?.includes(clientId));
  };

  const getClientOrg = (orgId) => {
    return organizations.find(o => o.id === orgId);
  };

  const getPortalUrl = (client) => {
    return `${window.location.origin}/ClientPortal?token=${client.access_token}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Global Client Management</h2>
          <p className="text-slate-600">Manage all clients across all organizations</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalClients}</p>
            <p className="text-sm text-slate-600">Total Clients</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">{activeClients}</p>
            <p className="text-sm text-slate-600">Active Clients</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{portalUsers}</p>
            <p className="text-sm text-slate-600">Portal Users</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-8 h-8 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-indigo-600">{avgEngagement.toFixed(0)}%</p>
            <p className="text-sm text-slate-600">Avg Engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search clients by name, email, or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {filteredClients.map((client) => {
              const org = getClientOrg(client.organization_id);
              const clientProposals = getClientProposals(client.id);

              return (
                <div key={client.id} className="p-4 border-2 rounded-lg hover:border-purple-300 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {client.contact_name?.[0]?.toUpperCase() || 'C'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {client.contact_name || client.client_name}
                          </h3>
                          {client.client_organization && (
                            <p className="text-sm text-slate-600">{client.client_organization}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-2 text-sm mb-3">
                        {client.contact_email && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{client.contact_email}</span>
                          </div>
                        )}
                        {org && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Building2 className="w-4 h-4" />
                            {org.organization_name}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-600">
                          <Eye className="w-4 h-4" />
                          {clientProposals.length} Proposals
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {client.relationship_status === 'active' ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {client.portal_access_enabled ? (
                          <Badge className="bg-blue-100 text-blue-700">Portal Enabled</Badge>
                        ) : (
                          <Badge variant="outline">Portal Disabled</Badge>
                        )}
                        {client.last_portal_access && (
                          <Badge variant="outline">
                            Last active: {moment(client.last_portal_access).fromNow()}
                          </Badge>
                        )}
                        {client.engagement_score && (
                          <Badge className="bg-indigo-100 text-indigo-700">
                            {client.engagement_score}% Engaged
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedClient(client);
                        setDetailTab("overview");
                        setShowDetailDialog(true);
                      }}
                      variant="outline"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              );
            })}

            {filteredClients.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>No clients found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                <span className="text-white font-semibold">
                  {selectedClient?.contact_name?.[0]?.toUpperCase() || 'C'}
                </span>
              </div>
              <div>
                <p>{selectedClient?.contact_name || selectedClient?.client_name}</p>
                {selectedClient?.client_organization && (
                  <p className="text-sm text-slate-600 font-normal">{selectedClient.client_organization}</p>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <Tabs value={detailTab} onValueChange={setDetailTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="customization">Branding</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="files">Files ({clientFiles.length})</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="access">Access</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-600">Contact Name</p>
                        <p className="font-medium">{selectedClient.contact_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Email</p>
                        <p className="font-medium">{selectedClient.contact_email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Organization</p>
                        <p className="font-medium">{selectedClient.client_organization || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Phone</p>
                        <p className="font-medium">{selectedClient.contact_phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Industry</p>
                        <p className="font-medium">{selectedClient.industry || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Relationship Status</p>
                        <Badge className={selectedClient.relationship_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                          {selectedClient.relationship_status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Activity & Engagement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-slate-600">Engagement Score</p>
                        <p className="text-2xl font-bold text-indigo-600">{selectedClient.engagement_score || 0}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Proposals Shared</p>
                        <p className="text-2xl font-bold">{selectedClient.total_proposals_shared || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Avg Response Time</p>
                        <p className="text-2xl font-bold">{selectedClient.avg_response_time_hours?.toFixed(1) || 'N/A'} hrs</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Last Portal Access</p>
                      <p className="font-medium">
                        {selectedClient.last_portal_access ? moment(selectedClient.last_portal_access).format('MMMM D, YYYY [at] h:mm A') : 'Never'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Last Engagement</p>
                      <p className="font-medium">
                        {selectedClient.last_engagement_date ? moment(selectedClient.last_engagement_date).fromNow() : 'Never'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Customization Tab */}
              <TabsContent value="customization">
                <ClientPortalCustomizer
                  client={selectedClient}
                  onUpdate={() => {
                    queryClient.invalidateQueries({ queryKey: ['admin-all-clients'] });
                  }}
                />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics">
                <ClientEngagementAnalytics
                  clientId={selectedClient.id}
                  organizationId={selectedClient.organization_id}
                />
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="space-y-3">
                {clientFiles.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Download className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>No files uploaded by this client</p>
                  </div>
                ) : (
                  clientFiles.map(file => (
                    <Card key={file.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{file.file_name}</p>
                            <p className="text-sm text-slate-600">{file.description}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Uploaded: {moment(file.created_date).format('MMM D, YYYY')} • 
                              {(file.file_size / 1024).toFixed(1)} KB
                              {file.viewed_by_consultant && (
                                <span className="ml-2 text-green-600">
                                  <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                  Viewed
                                </span>
                              )}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(file.file_url, '_blank')}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-3">
                {clientNotifications.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Mail className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <p>No notifications sent to this client</p>
                  </div>
                ) : (
                  clientNotifications.map(notif => (
                    <Card key={notif.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{notif.title}</p>
                              <Badge variant="outline" className="capitalize">
                                {notif.notification_type.replace(/_/g, ' ')}
                              </Badge>
                              {notif.is_read ? (
                                <Badge className="bg-green-100 text-green-700">Read</Badge>
                              ) : (
                                <Badge className="bg-blue-100 text-blue-700">Unread</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600">{notif.message}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              Sent: {moment(notif.created_date).format('MMM D, YYYY [at] h:mm A')}
                              {notif.is_read && notif.read_date && (
                                <span className="ml-2">• Read: {moment(notif.read_date).fromNow()}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Access Management Tab */}
              <TabsContent value="access" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Portal Access Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium">Portal Access</p>
                        <p className="text-sm text-slate-600">
                          {selectedClient.portal_access_enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                      {canManageClients && (
                        <Button
                          variant={selectedClient.portal_access_enabled ? "destructive" : "default"}
                          onClick={() => {
                            if (confirm(`${selectedClient.portal_access_enabled ? 'Disable' : 'Enable'} portal access?`)) {
                              togglePortalAccessMutation.mutate({
                                clientId: selectedClient.id,
                                enabled: !selectedClient.portal_access_enabled
                              });
                            }
                          }}
                        >
                          {selectedClient.portal_access_enabled ? 'Disable' : 'Enable'} Access
                        </Button>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="font-medium mb-2">Portal URL</p>
                      <div className="flex gap-2">
                        <Input
                          value={getPortalUrl(selectedClient)}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(getPortalUrl(selectedClient));
                            alert("Copied to clipboard!");
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="font-medium mb-2">Access Token</p>
                      <p className="text-sm text-slate-600 mb-2">
                        Expires: {moment(selectedClient.token_expires_at).format('MMMM D, YYYY')}
                      </p>
                      {canManageClients && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (confirm('Regenerate access token? The old link will stop working.')) {
                              regenerateTokenMutation.mutate(selectedClient.id);
                            }
                          }}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Regenerate Token
                        </Button>
                      )}
                    </div>

                    {canManageClients && (
                      <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
                        <p className="font-medium text-red-900 mb-2">Danger Zone</p>
                        <p className="text-sm text-red-700 mb-3">
                          Permanently delete this client and all associated data. This cannot be undone.
                        </p>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            if (confirm(`Delete client "${selectedClient.contact_name}"? This cannot be undone.`)) {
                              deleteClientMutation.mutate(selectedClient.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Client
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}