import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Palette,
  Eye,
  Users,
  Settings,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Search,
  ExternalLink,
  BarChart3,
  Sparkles
} from "lucide-react";
import { hasPermission } from "./PermissionChecker";
import ClientPortalCustomizer from "../client/ClientPortalCustomizer";
import ClientEngagementAnalytics from "../analytics/ClientEngagementAnalytics";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function ClientPortalAdminModule({ currentUser }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    initialData: []
  });

  const { data: organizations } = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: () => base44.entities.Organization.list('-created_date'),
    initialData: []
  });

  const filteredClients = clients.filter(client =>
    client.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.client_organization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.relationship_status === 'active').length;
  const clientsWithPortal = clients.filter(c => c.portal_access_enabled).length;
  const customizedPortals = clients.filter(c => 
    c.custom_branding?.logo_url || 
    c.custom_branding?.primary_color !== '#2563eb' ||
    c.custom_branding?.welcome_message
  ).length;

  const avgEngagementScore = clients.reduce((sum, c) => sum + (c.engagement_score || 0), 0) / (clients.length || 1);

  const canManageClients = hasPermission(currentUser, "manage_users");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Client Portal Management</h2>
          <p className="text-slate-600">Manage client portals, customization, and engagement</p>
        </div>
        <Badge className="bg-purple-100 text-purple-700 px-4 py-2">
          <Sparkles className="w-4 h-4 mr-2" />
          Phase 4 Feature
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{totalClients}</p>
            <p className="text-xs text-slate-600">Total Clients</p>
            <p className="text-[10px] text-purple-600 mt-1">{activeClients} active</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Eye className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{clientsWithPortal}</p>
            <p className="text-xs text-slate-600">Portal Enabled</p>
            <p className="text-[10px] text-blue-600 mt-1">
              {totalClients > 0 ? Math.round((clientsWithPortal / totalClients) * 100) : 0}% adoption
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Palette className="w-6 h-6 text-pink-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{customizedPortals}</p>
            <p className="text-xs text-slate-600">Customized</p>
            <p className="text-[10px] text-pink-600 mt-1">
              {clientsWithPortal > 0 ? Math.round((customizedPortals / clientsWithPortal) * 100) : 0}% branded
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{Math.round(avgEngagementScore)}</p>
            <p className="text-xs text-slate-600">Avg Engagement</p>
            <p className="text-[10px] text-green-600 mt-1">0-100 score</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {clients.filter(c => c.last_portal_access).length}
            </p>
            <p className="text-xs text-slate-600">Ever Logged In</p>
            <p className="text-[10px] text-amber-600 mt-1">
              {clientsWithPortal > 0 ? Math.round((clients.filter(c => c.last_portal_access).length / clientsWithPortal) * 100) : 0}% activated
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList>
          <TabsTrigger value="clients">All Clients</TabsTrigger>
          <TabsTrigger value="customization">Customization Insights</TabsTrigger>
          <TabsTrigger value="engagement">Engagement Analysis</TabsTrigger>
        </TabsList>

        {/* All Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredClients.map((client) => {
                  const org = organizations.find(o => o.id === client.organization_id);
                  const hasCustomBranding = client.custom_branding?.logo_url || 
                                          client.custom_branding?.primary_color !== '#2563eb' ||
                                          client.custom_branding?.welcome_message;

                  return (
                    <div key={client.id} className="p-4 border rounded-lg hover:border-purple-300 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-slate-900">
                              {client.contact_name || client.client_name}
                            </h3>
                            {client.portal_access_enabled ? (
                              <Badge className="bg-green-100 text-green-700">
                                <Eye className="w-3 h-3 mr-1" />
                                Portal Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Portal Disabled</Badge>
                            )}
                            {hasCustomBranding && (
                              <Badge className="bg-purple-100 text-purple-700">
                                <Palette className="w-3 h-3 mr-1" />
                                Customized
                              </Badge>
                            )}
                          </div>

                          <div className="grid md:grid-cols-3 gap-2 text-sm">
                            <div>
                              <p className="text-xs text-slate-600">Organization</p>
                              <p className="font-medium">{client.client_organization || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600">Consultant</p>
                              <p className="font-medium">{org?.organization_name || 'Unknown'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-600">Engagement Score</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                                    style={{ width: `${client.engagement_score || 0}%` }}
                                  />
                                </div>
                                <span className="font-medium text-xs">{client.engagement_score || 0}%</span>
                              </div>
                            </div>
                          </div>

                          {client.last_portal_access && (
                            <p className="text-xs text-slate-500 mt-2">
                              Last active: {new Date(client.last_portal_access).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        {canManageClients && (
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClient(client);
                                setShowCustomizer(true);
                              }}
                            >
                              <Palette className="w-4 h-4 mr-2" />
                              Customize
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClient(client);
                                setShowAnalytics(true);
                              }}
                            >
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Analytics
                            </Button>
                          </div>
                        )}
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
        </TabsContent>

        {/* Customization Insights */}
        <TabsContent value="customization" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Branding Adoption</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Custom Logos</span>
                    <span className="font-semibold">
                      {clients.filter(c => c.custom_branding?.logo_url).length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ 
                        width: `${clientsWithPortal > 0 ? (clients.filter(c => c.custom_branding?.logo_url).length / clientsWithPortal) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Custom Colors</span>
                    <span className="font-semibold">
                      {clients.filter(c => c.custom_branding?.primary_color && c.custom_branding.primary_color !== '#2563eb').length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ 
                        width: `${clientsWithPortal > 0 ? (clients.filter(c => c.custom_branding?.primary_color && c.custom_branding.primary_color !== '#2563eb').length / clientsWithPortal) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Welcome Messages</span>
                    <span className="font-semibold">
                      {clients.filter(c => c.custom_branding?.welcome_message).length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-pink-600 h-2 rounded-full"
                      style={{ 
                        width: `${clientsWithPortal > 0 ? (clients.filter(c => c.custom_branding?.welcome_message).length / clientsWithPortal) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm">Custom CSS</span>
                    <span className="font-semibold">
                      {clients.filter(c => c.custom_branding?.custom_css).length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ 
                        width: `${clientsWithPortal > 0 ? (clients.filter(c => c.custom_branding?.custom_css).length / clientsWithPortal) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Top Customized Portals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {clients
                    .filter(c => c.custom_branding?.logo_url || c.custom_branding?.primary_color)
                    .slice(0, 5)
                    .map(client => (
                      <div key={client.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        {client.custom_branding?.logo_url && (
                          <img 
                            src={client.custom_branding.logo_url} 
                            alt="Logo"
                            className="w-10 h-10 object-contain rounded"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">{client.contact_name}</p>
                          <p className="text-xs text-slate-600">{client.client_organization}</p>
                        </div>
                        {client.custom_branding?.primary_color && (
                          <div 
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: client.custom_branding.primary_color }}
                          />
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Engagement Analysis */}
        <TabsContent value="engagement" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">High Engagement</CardTitle>
                <CardDescription>Score &gt; 70</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-green-600">
                  {clients.filter(c => (c.engagement_score || 0) > 70).length}
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  {totalClients > 0 ? Math.round((clients.filter(c => (c.engagement_score || 0) > 70).length / totalClients) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Medium Engagement</CardTitle>
                <CardDescription>Score 40-70</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-amber-600">
                  {clients.filter(c => (c.engagement_score || 0) >= 40 && (c.engagement_score || 0) <= 70).length}
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  {totalClients > 0 ? Math.round((clients.filter(c => (c.engagement_score || 0) >= 40 && (c.engagement_score || 0) <= 70).length / totalClients) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Low Engagement</CardTitle>
                <CardDescription>Score &lt; 40</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-red-600">
                  {clients.filter(c => (c.engagement_score || 0) < 40).length}
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  {totalClients > 0 ? Math.round((clients.filter(c => (c.engagement_score || 0) < 40).length / totalClients) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Clients Needing Attention</CardTitle>
              <CardDescription>Low engagement or inactive portals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clients
                  .filter(c => (c.engagement_score || 0) < 40 || !c.last_portal_access)
                  .slice(0, 10)
                  .map(client => (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{client.contact_name || client.client_name}</p>
                        <p className="text-xs text-slate-600">{client.client_organization}</p>
                        {!client.last_portal_access && (
                          <Badge variant="destructive" className="mt-1 text-xs">Never logged in</Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-red-600">{client.engagement_score || 0}%</p>
                        <p className="text-xs text-slate-600">Engagement</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customizer Dialog */}
      <Dialog open={showCustomizer} onOpenChange={setShowCustomizer}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Portal Customization</DialogTitle>
            <DialogDescription>
              Customize portal for {selectedClient?.contact_name || selectedClient?.client_name}
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <ClientPortalCustomizer
              client={selectedClient}
              onUpdate={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-clients'] });
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
              organizationId={selectedClient.organization_id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}