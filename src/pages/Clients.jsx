import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Mail,
  Phone,
  Building2,
  FileText,
  ExternalLink,
  Pencil,
  Trash2,
  Eye,
  Briefcase,
  Link as LinkIcon,
  Copy,
  CheckCircle2
} from "lucide-react";
import { isConsultantAccount, hasClientPortalAccess } from "@/utils/organizationHelpers";

export default function ClientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const [clientData, setClientData] = useState({
    client_name: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    company_address: "",
    industry: "",
    notes: ""
  });

  useEffect(() => {
    const loadData = async () => {
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
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const { data: subscription } = useQuery({
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
    enabled: !!organization?.id,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return await base44.entities.Client.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return await base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const createClientMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create({
      ...data,
      organization_id: organization.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setShowAddDialog(false);
      setClientData({
        client_name: "",
        contact_person: "",
        contact_email: "",
        contact_phone: "",
        company_address: "",
        industry: "",
        notes: ""
      });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setShowAddDialog(false);
      setEditingClient(null);
      setClientData({
        client_name: "",
        contact_person: "",
        contact_email: "",
        contact_phone: "",
        company_address: "",
        industry: "",
        notes: ""
      });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
    },
  });

  const handleSubmit = () => {
    if (!clientData.client_name || !clientData.contact_email) {
      alert("Please fill in required fields (Client Name and Contact Email)");
      return;
    }

    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, data: clientData });
    } else {
      createClientMutation.mutate(clientData);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setClientData({
      client_name: client.client_name,
      contact_person: client.contact_person || "",
      contact_email: client.contact_email,
      contact_phone: client.contact_phone || "",
      company_address: client.company_address || "",
      industry: client.industry || "",
      notes: client.notes || ""
    });
    setShowAddDialog(true);
  };

  const handleDelete = (clientId) => {
    if (confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const copyPortalLink = (clientId) => {
    const portalUrl = `${window.location.origin}${createPageUrl("ClientPortal")}?client=${clientId}`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedId(clientId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredClients = clients.filter(client =>
    client.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getClientProposals = (clientId) => {
    return proposals.filter(p => p.client_id === clientId);
  };

  // Check if user has access to client features
  const hasAccess = organization && subscription && isConsultantAccount(organization) && hasClientPortalAccess(subscription);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">Loading...</p>
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
                  onClick={() => navigate(createPageUrl("PricingConsultant"))}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Briefcase className="w-4 h-4 mr-2" />
                  View Consultant Plans
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Dashboard"))}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
          <p className="text-slate-600">Manage your client relationships and portal access</p>
        </div>
        <Button
          onClick={() => {
            setEditingClient(null);
            setClientData({
              client_name: "",
              contact_person: "",
              contact_email: "",
              contact_phone: "",
              company_address: "",
              industry: "",
              notes: ""
            });
            setShowAddDialog(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{clients.length}</p>
            {subscription && subscription.max_clients > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                of {subscription.max_clients} allowed
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Active Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {proposals.filter(p => p.status !== 'submitted' && p.status !== 'archived').length}
            </p>
            <p className="text-xs text-slate-500 mt-1">Across all clients</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Portal Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{clients.length}</p>
            <p className="text-xs text-slate-500 mt-1">Client portal access</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="Search clients by name, contact, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {searchQuery ? "No clients found" : "No clients yet"}
            </h3>
            <p className="text-slate-600 mb-6">
              {searchQuery 
                ? "Try adjusting your search criteria" 
                : "Add your first client to start managing proposals and sharing via the portal"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Client
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const clientProposals = getClientProposals(client.id);
            const activeProposals = clientProposals.filter(
              p => p.status !== 'submitted' && p.status !== 'archived'
            );

            return (
              <Card key={client.id} className="border-none shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        {client.client_name}
                      </CardTitle>
                      {client.industry && (
                        <Badge variant="secondary" className="mb-2">
                          {client.industry}
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(client)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => navigate(createPageUrl("ClientProposalView") + `?client=${client.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Portal
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyPortalLink(client.id)}>
                          {copiedId === client.id ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Portal Link
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(client.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Client
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {client.contact_person && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="w-4 h-4" />
                      <span>{client.contact_person}</span>
                    </div>
                  )}
                  {client.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${client.contact_email}`} className="hover:text-blue-600">
                        {client.contact_email}
                      </a>
                    </div>
                  )}
                  {client.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4" />
                      <span>{client.contact_phone}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Proposals</span>
                      <Badge variant="outline">
                        {activeProposals.length} active
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(createPageUrl("ClientProposalView") + `?client=${client.id}`)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Client Portal
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Client Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Edit Client" : "Add New Client"}
            </DialogTitle>
            <DialogDescription>
              {editingClient 
                ? "Update client information and contact details" 
                : "Add a new client to manage proposals and provide portal access"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Client Name *</Label>
                <Input
                  id="client_name"
                  value={clientData.client_name}
                  onChange={(e) => setClientData({...clientData, client_name: e.target.value})}
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={clientData.contact_person}
                  onChange={(e) => setClientData({...clientData, contact_person: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={clientData.contact_email}
                  onChange={(e) => setClientData({...clientData, contact_email: e.target.value})}
                  placeholder="john@acme.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  value={clientData.contact_phone}
                  onChange={(e) => setClientData({...clientData, contact_phone: e.target.value})}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={clientData.industry}
                  onChange={(e) => setClientData({...clientData, industry: e.target.value})}
                  placeholder="Technology, Healthcare, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_address">Company Address</Label>
                <Input
                  id="company_address"
                  value={clientData.company_address}
                  onChange={(e) => setClientData({...clientData, company_address: e.target.value})}
                  placeholder="123 Main St, City, ST 12345"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={clientData.notes}
                onChange={(e) => setClientData({...clientData, notes: e.target.value})}
                placeholder="Additional notes about this client..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddDialog(false);
                setEditingClient(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createClientMutation.isPending || updateClientMutation.isPending}
            >
              {editingClient ? "Update Client" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}