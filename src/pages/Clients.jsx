
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit,
  Mail,
  Phone,
  Building2,
  ExternalLink,
  TrendingUp,
  Clock,
  GitCompare,
  BarChart3,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import moment from "moment";
import ProposalComparisonTool from "../components/proposals/ProposalComparisonTool";
import ClientPermissionsManager from "../components/client/ClientPermissionsManager";
import DocumentVersionControl from "../components/client/DocumentVersionControl";
import ClientNotificationPreferences from "../components/client/ClientNotificationPreferences";
import ClientReportingDashboard from "../components/client/ClientReportingDashboard";
import EnhancedClientHealthMonitor from "../components/client/EnhancedClientHealthMonitor";
import ReviewWorkflowBuilder from "../components/client/ReviewWorkflowBuilder";
import { useOrganization } from "../components/layout/OrganizationContext";

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

export default function Clients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organization: contextOrg } = useOrganization();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  const [clientData, setClientData] = useState({
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
    notes: ""
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        if (contextOrg) {
          setOrganization(contextOrg);
        } else {
          const org = await getUserActiveOrganization(currentUser);
          if (org) {
            setOrganization(org);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [contextOrg]);

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

  // FIXED: Safer queries with organization_id filters
  const { data: clientMetrics = {} } = useQuery({
    queryKey: ['client-metrics', organization?.id, clients.map(c => c?.id).filter(Boolean).join(',')],
    queryFn: async () => {
      if (!organization?.id || clients.length === 0) return {};

      try {
        const metrics = {};
        const clientIds = clients.map(c => c?.id).filter(Boolean);
        if (clientIds.length === 0) return {};

        // FIXED: Add organization_id filter to all queries
        const [allProposals, allFeedback, allMeetings, allFiles] = await Promise.all([
          base44.entities.Proposal.filter({ organization_id: organization.id }).catch(() => []),
          base44.entities.Feedback.filter({ client_id: { $in: clientIds } }).catch(() => []),
          base44.entities.ClientMeeting.filter({ client_id: { $in: clientIds } }).catch(() => []),
          base44.entities.ClientUploadedFile.filter({ organization_id: organization.id }).catch(() => [])
        ]);

        clientIds.forEach(clientId => {
          const sharedProposals = (allProposals || []).filter(p =>
            p?.shared_with_client_ids && Array.isArray(p.shared_with_client_ids) && p.shared_with_client_ids.includes(clientId)
          );
          const clientFeedback = (allFeedback || []).filter(f => f?.client_id === clientId);
          const clientMeetings = (allMeetings || []).filter(m => m?.client_id === clientId);
          const clientFiles = (allFiles || []).filter(f => f?.client_id === clientId);

          const unresolvedFeedback = clientFeedback.filter(f =>
            f && !['resolved', 'closed'].includes(f.status)
          );

          const upcomingMeetings = clientMeetings.filter(m =>
            m && m.status === 'scheduled' && new Date(m.scheduled_date) > new Date()
          );

          const unreviewedFiles = clientFiles.filter(f => f && !f.viewed_by_consultant);

          metrics[clientId] = {
            proposalsCount: sharedProposals.length,
            unresolvedFeedbackCount: unresolvedFeedback.length,
            upcomingMeetingsCount: upcomingMeetings.length,
            unreviewedFilesCount: unreviewedFiles.length,
            totalFilesCount: clientFiles.length
          };
        });

        return metrics;
      } catch (error) {
        console.error('Error calculating client metrics:', error);
        return {};
      }
    },
    enabled: !!organization?.id && clients.length > 0,
    staleTime: 30000,
    retry: 1
  });

  const createClientMutation = useMutation({
    mutationFn: async (data) => {
      if (editingClient) {
        return base44.entities.Client.update(editingClient.id, data);
      } else {
        return base44.entities.Client.create({
          ...data,
          organization_id: organization.id
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-metrics'] });
      setShowDialog(false);
      setEditingClient(null);
      resetForm();
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.Client.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-metrics'] });
    },
  });

  const resetForm = () => {
    setClientData({
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
      notes: ""
    });
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setClientData(client);
    setShowDialog(true);
  };

  const handleSave = () => {
    if (clientData.client_name.trim() && clientData.contact_email.trim()) {
      createClientMutation.mutate(clientData);
    }
  };

  const filteredClients = clients.filter(c =>
    c.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status) => {
    const colors = {
      prospect: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      inactive: "bg-slate-100 text-slate-800",
      former: "bg-red-100 text-red-800"
    };
    return colors[status] || colors.active;
  };

  const handleViewPortal = (client, e) => {
    e.stopPropagation();

    if (client.access_token) {
      navigate(createPageUrl(`ClientPortal?token=${client.access_token}`));
    } else {
      alert("❌ This client doesn't have an access token yet. The token is auto-generated when a client is created, but may be missing for older clients. Please edit and re-save this client to generate a token.");
    }
  };

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  const effectiveOrgType = organization.organization_type === 'demo'
    ? organization.demo_view_mode
    : organization.organization_type;

  const isConsultancy = effectiveOrgType === 'consultancy';

  if (!isConsultancy) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Feature Not Available</h3>
            <p className="text-slate-600">
              Client management is only available for consultancy accounts.
            </p>
            {organization.organization_type === 'demo' && (
              <p className="text-sm text-purple-600 mt-2">
                💡 Switch to "Consultant View" using the demo view switcher in the sidebar to access client features.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedClient) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setSelectedClient(null)}>
            ← Back to All Clients
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{selectedClient.client_name}</h1>
            <p className="text-slate-600">{selectedClient.contact_name}</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">
              <TrendingUp className="w-4 h-4 mr-2" />
              Health Score
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart3 className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
            <TabsTrigger value="team">Team & Permissions</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="comparison">
              <GitCompare className="w-4 h-4 mr-2" />
              AI Comparison
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ClientOverview client={selectedClient} onEdit={handleEdit} metrics={clientMetrics[selectedClient.id]} />
          </TabsContent>

          <TabsContent value="health">
            <EnhancedClientHealthMonitor client={selectedClient} organization={organization} />
          </TabsContent>

          <TabsContent value="reports">
            <ClientReportingDashboard client={selectedClient} currentMember={user} />
          </TabsContent>

          <TabsContent value="proposals">
            <ClientProposals client={selectedClient} organization={organization} />
          </TabsContent>

          <TabsContent value="team">
            <ClientTeamPermissions client={selectedClient} />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentVersionControl proposal={null} client={selectedClient} organization={organization} />
          </TabsContent>

          <TabsContent value="workflows">
            <ClientWorkflows client={selectedClient} />
          </TabsContent>

          <TabsContent value="notifications">
            <ClientNotificationPreferences client={selectedClient} />
          </TabsContent>

          <TabsContent value="comparison">
            <ProposalComparisonTool client={selectedClient} organization={organization} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Clients</h1>
          <p className="text-slate-600">Manage your client relationships and portal access</p>
        </div>
        <Button onClick={() => { resetForm(); setShowDialog(true); }}>
          <Plus className="w-5 h-5 mr-2" />
          Add Client
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filteredClients.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Clients Yet</h3>
            <p className="text-slate-600 mb-6">
              Start building your client portfolio
            </p>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const metrics = clientMetrics[client.id] || {};

            return (
              <Card
                key={client.id}
                className="border-none shadow-lg hover:shadow-xl transition-all cursor-pointer"
                onClick={() => setSelectedClient(client)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{client.client_name}</CardTitle>
                      <Badge className={getStatusColor(client.relationship_status)}>
                        {client.relationship_status}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); handleEdit(client); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this client?')) {
                            deleteClientMutation.mutate(client.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.contact_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{client.contact_name}</span>
                    </div>
                  )}
                  {client.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <a href={`mailto:${client.contact_email}`} className="text-blue-600 hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                        {client.contact_email}
                      </a>
                    </div>
                  )}
                  {client.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{client.contact_phone}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-blue-900">
                        {metrics.proposalsCount || 0}
                      </div>
                      <div className="text-xs text-blue-700">Proposals</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-purple-900">
                        {metrics.upcomingMeetingsCount || 0}
                      </div>
                      <div className="text-xs text-purple-700">Meetings</div>
                    </div>
                  </div>

                  {(metrics.unresolvedFeedbackCount > 0 || metrics.unreviewedFilesCount > 0) && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {metrics.unresolvedFeedbackCount > 0 && (
                        <Badge className="bg-orange-100 text-orange-700 text-xs">
                          {metrics.unresolvedFeedbackCount} unresolved feedback
                        </Badge>
                      )}
                      {metrics.unreviewedFilesCount > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                          {metrics.unreviewedFilesCount} new file{metrics.unreviewedFilesCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  )}

                  {client.engagement_score && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-500">Engagement</span>
                        <span className="font-medium text-slate-900">{client.engagement_score}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${client.engagement_score}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {client.last_engagement_date && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      <span>Last active {moment(client.last_engagement_date).fromNow()}</span>
                    </div>
                  )}

                  {client.portal_access_enabled && (
                    <div className="pt-3 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={(e) => handleViewPortal(client, e)}
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        View Portal
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingClient(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
            <DialogDescription>
              Add or update client information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Client Name *</label>
                <Input
                  value={clientData.client_name}
                  onChange={(e) => setClientData({ ...clientData, client_name: e.target.value })}
                  placeholder="Client company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contact Name</label>
                <Input
                  value={clientData.contact_name}
                  onChange={(e) => setClientData({ ...clientData, contact_name: e.target.value })}
                  placeholder="Primary contact"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contact Email *</label>
                <Input
                  type="email"
                  value={clientData.contact_email}
                  onChange={(e) => setClientData({ ...clientData, contact_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contact Phone</label>
                <Input
                  value={clientData.contact_phone}
                  onChange={(e) => setClientData({ ...clientData, contact_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Relationship Status</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={clientData.relationship_status}
                  onChange={(e) => setClientData({ ...clientData, relationship_status: e.target.value })}
                >
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="former">Former</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">Notes</label>
                <Textarea
                  value={clientData.notes}
                  onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
                  placeholder="Internal notes about this client"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!clientData.client_name.trim() || !clientData.contact_email.trim() || createClientMutation.isPending}
              >
                {createClientMutation.isPending ? 'Saving...' : (editingClient ? 'Update Client' : 'Add Client')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientOverview({ client, onEdit, metrics = {} }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Client Information</CardTitle>
            <Button variant="outline" size="sm" onClick={() => onEdit(client)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {client.contact_name && (
              <div>
                <label className="text-sm text-slate-500">Contact Name</label>
                <p className="font-medium">{client.contact_name}</p>
              </div>
            )}
            {client.contact_email && (
              <div>
                <label className="text-sm text-slate-500">Email</label>
                <p className="font-medium">{client.contact_email}</p>
              </div>
            )}
            {client.contact_phone && (
              <div>
                <label className="text-sm text-slate-500">Phone</label>
                <p className="font-medium">{client.contact_phone}</p>
              </div>
            )}
            {client.industry && (
              <div>
                <label className="text-sm text-slate-500">Industry</label>
                <p className="font-medium">{client.industry}</p>
              </div>
            )}
          </div>
          {client.notes && (
            <div>
              <label className="text-sm text-slate-500">Notes</label>
              <p className="text-sm text-slate-700 mt-1">{client.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>Activity Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-900">{metrics.proposalsCount || 0}</div>
              <div className="text-sm text-blue-700">Shared Proposals</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-900">{metrics.upcomingMeetingsCount || 0}</div>
              <div className="text-sm text-purple-700">Upcoming Meetings</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-900">{metrics.totalFilesCount || 0}</div>
              <div className="text-sm text-green-700">Total Files</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-900">{metrics.unresolvedFeedbackCount || 0}</div>
              <div className="text-sm text-orange-700">Open Feedback</div>
            </div>
          </div>

          {metrics.unreviewedFilesCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {metrics.unreviewedFilesCount} new file{metrics.unreviewedFilesCount !== 1 ? 's' : ''} need{metrics.unreviewedFilesCount === 1 ? 's' : ''} review
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientProposals({ client, organization }) {
  const { data: proposals = [] } = useQuery({
    queryKey: ['client-proposals', client.id],
    queryFn: async () => {
      // It's good practice to filter proposals by organization_id if possible
      // Assuming 'base44.entities.Proposal.list()' fetches all and then we filter.
      // If the API supports organization_id filtering directly, that would be more efficient.
      const allProposals = await base44.entities.Proposal.filter({ organization_id: organization.id });
      return allProposals.filter(p =>
        p.shared_with_client_ids && p.shared_with_client_ids.includes(client.id)
      );
    },
    initialData: []
  });

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Shared Proposals</CardTitle>
      </CardHeader>
      <CardContent>
        {proposals.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No proposals shared with this client yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map(proposal => (
              <div key={proposal.id} className="p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                <h4 className="font-semibold text-slate-900">{proposal.proposal_name}</h4>
                <div className="flex items-center gap-3 mt-2 text-sm">
                  <Badge className="capitalize">{proposal.status}</Badge>
                  {proposal.contract_value && (
                    <span className="text-slate-600">
                      ${(proposal.contract_value / 1000).toFixed(0)}K
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClientTeamPermissions({ client }) {
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['client-team-members', client.id],
    queryFn: () => base44.entities.ClientTeamMember.filter({ client_id: client.id }),
    initialData: []
  });

  return (
    <div className="space-y-6">
      <ClientPermissionsManager client={client} teamMembers={teamMembers} proposal={null} />
    </div>
  );
}

function ClientWorkflows({ client }) {
  const { data: proposals = [] } = useQuery({
    queryKey: ['client-workflow-proposals', client.id],
    queryFn: async () => {
      // Same note as above regarding organization_id filtering for proposals
      const allProposals = await base44.entities.Proposal.filter({ organization_id: client.organization_id });
      return allProposals.filter(p =>
        p.shared_with_client_ids?.includes(client.id)
      );
    },
    initialData: []
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['client-workflow-team', client.id],
    queryFn: () => base44.entities.ClientTeamMember.filter({ client_id: client.id }),
    initialData: []
  });

  const [selectedProposal, setSelectedProposal] = useState(null);

  if (proposals.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <p className="text-slate-600">Share a proposal with this client first to create approval workflows</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!selectedProposal ? (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle>Select a Proposal</CardTitle>
            <DialogDescription>
              Choose a proposal to create approval workflows
            </DialogDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proposals.map(proposal => (
                <button
                  key={proposal.id}
                  onClick={() => setSelectedProposal(proposal)}
                  className="w-full p-4 bg-slate-50 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                >
                  <h4 className="font-semibold text-slate-900">{proposal.proposal_name}</h4>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <Badge className="capitalize">{proposal.status}</Badge>
                    {proposal.contract_value && (
                      <span className="text-slate-600">
                        ${(proposal.contract_value / 1000).toFixed(0)}K
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Button variant="outline" onClick={() => setSelectedProposal(null)}>
            ← Back to Proposals
          </Button>
          <ReviewWorkflowBuilder
            proposal={selectedProposal}
            client={client}
            teamMembers={teamMembers}
          />
        </div>
      )}
    </div>
  );
}
