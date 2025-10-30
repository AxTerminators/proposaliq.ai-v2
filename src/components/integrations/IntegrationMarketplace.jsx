import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Zap,
  Check,
  X,
  Clock,
  AlertCircle,
  ExternalLink,
  Search,
  Filter,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

const AVAILABLE_INTEGRATIONS = [
  {
    type: "salesforce",
    name: "Salesforce",
    description: "Sync proposals with Salesforce opportunities and contacts",
    category: "crm",
    icon: "https://cdn.worldvectorlogo.com/logos/salesforce-2.svg",
    features: ["Auto-sync opportunities", "Contact management", "Deal pipeline"],
    setup_complexity: "medium",
    popular: true
  },
  {
    type: "hubspot",
    name: "HubSpot",
    description: "Connect your HubSpot CRM with proposal management",
    category: "crm",
    icon: "https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png",
    features: ["Deal sync", "Contact sync", "Activity tracking"],
    setup_complexity: "easy",
    popular: true
  },
  {
    type: "slack",
    name: "Slack",
    description: "Get proposal notifications in Slack channels",
    category: "communication",
    icon: "https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg",
    features: ["Real-time notifications", "Status updates", "Team alerts"],
    setup_complexity: "easy",
    popular: true
  },
  {
    type: "microsoft_teams",
    name: "Microsoft Teams",
    description: "Collaborate on proposals within Microsoft Teams",
    category: "communication",
    icon: "https://cdn.worldvectorlogo.com/logos/microsoft-teams-1.svg",
    features: ["Channel notifications", "File sharing", "Meeting integration"],
    setup_complexity: "easy",
    popular: false
  },
  {
    type: "google_drive",
    name: "Google Drive",
    description: "Store and manage proposal documents in Google Drive",
    category: "storage",
    icon: "https://cdn.worldvectorlogo.com/logos/google-drive-2020.svg",
    features: ["Auto-backup", "File sync", "Shared folders"],
    setup_complexity: "easy",
    popular: true
  },
  {
    type: "dropbox",
    name: "Dropbox",
    description: "Sync proposal files with Dropbox",
    category: "storage",
    icon: "https://cdn.worldvectorlogo.com/logos/dropbox-1.svg",
    features: ["File sync", "Version control", "Team sharing"],
    setup_complexity: "easy",
    popular: false
  },
  {
    type: "jira",
    name: "Jira",
    description: "Create Jira tickets from proposal tasks",
    category: "project_management",
    icon: "https://cdn.worldvectorlogo.com/logos/jira-1.svg",
    features: ["Task sync", "Issue tracking", "Sprint planning"],
    setup_complexity: "medium",
    popular: false
  },
  {
    type: "asana",
    name: "Asana",
    description: "Manage proposal tasks in Asana",
    category: "project_management",
    icon: "https://cdn.worldvectorlogo.com/logos/asana-logo.svg",
    features: ["Task management", "Timeline view", "Team collaboration"],
    setup_complexity: "easy",
    popular: false
  },
  {
    type: "quickbooks",
    name: "QuickBooks",
    description: "Sync pricing and invoicing with QuickBooks",
    category: "finance",
    icon: "https://cdn.worldvectorlogo.com/logos/quickbooks-1.svg",
    features: ["Invoice generation", "Expense tracking", "Financial reports"],
    setup_complexity: "hard",
    popular: false
  },
  {
    type: "docusign",
    name: "DocuSign",
    description: "Send proposals for e-signature via DocuSign",
    category: "signatures",
    icon: "https://cdn.worldvectorlogo.com/logos/docusign-1.svg",
    features: ["E-signatures", "Document tracking", "Audit trail"],
    setup_complexity: "medium",
    popular: true
  },
  {
    type: "zoom",
    name: "Zoom",
    description: "Schedule and join proposal meetings via Zoom",
    category: "communication",
    icon: "https://cdn.worldvectorlogo.com/logos/zoom-communications-logo.svg",
    features: ["Meeting scheduling", "Video calls", "Recording"],
    setup_complexity: "easy",
    popular: true
  },
  {
    type: "calendly",
    name: "Calendly",
    description: "Let clients schedule meetings with Calendly",
    category: "scheduling",
    icon: "https://assets.calendly.com/assets/frontend/media/logo-square-cd364a3e02ef62c8e53715b9646014c5.png",
    features: ["Auto-scheduling", "Calendar sync", "Reminders"],
    setup_complexity: "easy",
    popular: false
  }
];

const CATEGORIES = [
  { value: "all", label: "All Integrations" },
  { value: "crm", label: "CRM" },
  { value: "communication", label: "Communication" },
  { value: "storage", label: "Storage" },
  { value: "project_management", label: "Project Management" },
  { value: "finance", label: "Finance" },
  { value: "signatures", label: "E-Signatures" },
  { value: "scheduling", label: "Scheduling" }
];

export default function IntegrationMarketplace({ organization }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);

  // Query active connections
  const { data: connections = [] } = useQuery({
    queryKey: ['integrations', organization.id],
    queryFn: () => base44.entities.IntegrationConnection.filter({
      organization_id: organization.id
    }),
    initialData: []
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async (integration) => {
      return base44.entities.IntegrationConnection.create({
        organization_id: organization.id,
        integration_type: integration.type,
        connection_name: integration.name,
        status: 'pending_auth',
        connected_by: (await base44.auth.me()).email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setShowSetupDialog(false);
      alert("✓ Integration setup initiated! Check your email for authentication link.");
    }
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: (connectionId) => base44.entities.IntegrationConnection.delete(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    }
  });

  const handleConnect = (integration) => {
    setSelectedIntegration(integration);
    setShowSetupDialog(true);
  };

  const confirmConnect = () => {
    if (selectedIntegration) {
      connectMutation.mutate(selectedIntegration);
    }
  };

  const isConnected = (integrationType) => {
    return connections.find(c => c.integration_type === integrationType);
  };

  // Filter integrations
  const filteredIntegrations = AVAILABLE_INTEGRATIONS.filter(integration => {
    const matchesSearch = !searchQuery || 
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || integration.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const connectedCount = connections.length;
  const popularIntegrations = AVAILABLE_INTEGRATIONS.filter(i => i.popular);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-blue-600" />
                Integration Marketplace
              </CardTitle>
              <CardDescription>
                Connect your favorite tools and automate your workflow
              </CardDescription>
            </div>
            <Badge className="text-lg px-4 py-2">
              {connectedCount} Active
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <Button
                  key={cat.value}
                  variant={categoryFilter === cat.value ? "default" : "outline"}
                  onClick={() => setCategoryFilter(cat.value)}
                  size="sm"
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Popular Integrations */}
      {categoryFilter === "all" && !searchQuery && (
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">⭐ Popular Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularIntegrations.map(integration => {
                const connection = isConnected(integration.type);
                
                return (
                  <Card key={integration.type} className={cn(
                    "hover:shadow-md transition-all cursor-pointer",
                    connection && "ring-2 ring-green-500"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <img 
                          src={integration.icon} 
                          alt={integration.name}
                          className="w-10 h-10 rounded"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{integration.name}</h4>
                          {connection && (
                            <Badge className="bg-green-100 text-green-700 text-xs mt-1">
                              <Check className="w-3 h-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={connection ? "outline" : "default"}
                        className="w-full"
                        onClick={() => connection ? null : handleConnect(integration)}
                      >
                        {connection ? "Manage" : "Connect"}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Integrations */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>
            {categoryFilter === "all" ? "All Integrations" : CATEGORIES.find(c => c.value === categoryFilter)?.label}
          </CardTitle>
          <CardDescription>
            {filteredIntegrations.length} available integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {filteredIntegrations.map(integration => {
              const connection = isConnected(integration.type);
              
              return (
                <Card key={integration.type} className={cn(
                  "border-2 hover:shadow-lg transition-all",
                  connection && "border-green-500 bg-green-50"
                )}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <img 
                        src={integration.icon} 
                        alt={integration.name}
                        className="w-12 h-12 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-lg font-bold text-slate-900">{integration.name}</h3>
                          {integration.popular && (
                            <Badge variant="outline" className="text-xs">Popular</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{integration.description}</p>

                        {/* Features */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {integration.features.map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>

                        {/* Setup Complexity */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                          <Clock className="w-3 h-3" />
                          <span className="capitalize">{integration.setup_complexity}</span> setup
                        </div>

                        {/* Connection Status */}
                        {connection ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 p-2 bg-green-100 rounded">
                              <Check className="w-4 h-4 text-green-700" />
                              <span className="text-sm text-green-700 font-medium">
                                {connection.status === 'active' ? 'Connected & Active' : 
                                 connection.status === 'error' ? 'Connection Error' :
                                 'Pending Authentication'}
                              </span>
                            </div>
                            {connection.last_sync && (
                              <p className="text-xs text-slate-500">
                                Last synced: {moment(connection.last_sync).fromNow()}
                              </p>
                            )}
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="flex-1">
                                <Settings className="w-4 h-4 mr-2" />
                                Settings
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => {
                                  if (confirm(`Disconnect ${integration.name}?`)) {
                                    disconnectMutation.mutate(connection.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                Disconnect
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button 
                            className="w-full"
                            onClick={() => handleConnect(integration)}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Connect {integration.name}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="font-medium mb-2">No integrations found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              You'll be redirected to authenticate with {selectedIntegration?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedIntegration && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <img 
                  src={selectedIntegration.icon} 
                  alt={selectedIntegration.name}
                  className="w-12 h-12 rounded"
                />
                <div>
                  <h4 className="font-semibold text-slate-900">{selectedIntegration.name}</h4>
                  <p className="text-sm text-slate-600">{selectedIntegration.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-slate-900">What you'll get:</h4>
                <ul className="space-y-1">
                  {selectedIntegration.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                You'll need admin access to your {selectedIntegration.name} account
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmConnect}>
              Continue to {selectedIntegration?.name}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}