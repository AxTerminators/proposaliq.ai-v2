import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, 
  Link as LinkIcon, 
  Copy, 
  CheckCircle2, 
  ExternalLink,
  Eye,
  EyeOff,
  Mail,
  AlertCircle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientSharingPanel({ proposal, organization }) {
  const queryClient = useQueryClient();
  const [copiedClientId, setCopiedClientId] = useState(null);

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Client.filter(
        { organization_id: organization.id, portal_access_enabled: true },
        'client_name'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const updateProposalMutation = useMutation({
    mutationFn: async (updates) => {
      return await base44.entities.Proposal.update(proposal.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', proposal.id] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  const toggleClientViewEnabled = () => {
    updateProposalMutation.mutate({
      client_view_enabled: !proposal.client_view_enabled
    });
  };

  const toggleClientSharing = (clientId) => {
    const currentShared = proposal.shared_with_client_ids || [];
    const newShared = currentShared.includes(clientId)
      ? currentShared.filter(id => id !== clientId)
      : [...currentShared, clientId];
    
    updateProposalMutation.mutate({
      shared_with_client_ids: newShared
    });
  };

  const getClientPortalLink = (client) => {
    return `${window.location.origin}/ClientProposalView?token=${client.access_token}&proposal=${proposal.id}`;
  };

  const handleCopyLink = (client) => {
    const link = getClientPortalLink(client);
    navigator.clipboard.writeText(link);
    setCopiedClientId(client.id);
    setTimeout(() => setCopiedClientId(null), 2000);
  };

  const sharedClients = clients.filter(c => 
    proposal.shared_with_client_ids?.includes(c.id)
  );

  if (clientsLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable/Disable Client Portal Access */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {proposal.client_view_enabled ? (
              <Eye className="w-5 h-5 text-green-600" />
            ) : (
              <EyeOff className="w-5 h-5 text-slate-400" />
            )}
            Client Portal Access
          </CardTitle>
          <CardDescription>
            Control whether clients can view this proposal in their portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
            <div className="flex-1">
              <p className="font-medium text-slate-900 mb-1">
                {proposal.client_view_enabled ? 'Portal Access Enabled' : 'Portal Access Disabled'}
              </p>
              <p className="text-sm text-slate-600">
                {proposal.client_view_enabled 
                  ? 'Clients you share this with can view it in their portal'
                  : 'Enable to allow clients to view this proposal'}
              </p>
            </div>
            <Button
              onClick={toggleClientViewEnabled}
              disabled={updateProposalMutation.isPending}
              variant={proposal.client_view_enabled ? "default" : "outline"}
              className={proposal.client_view_enabled ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {proposal.client_view_enabled ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Enabled
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Disabled
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Select Clients to Share With */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Share with Clients ({sharedClients.length})
          </CardTitle>
          <CardDescription>
            Select which clients can view this proposal
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-2">No clients yet</p>
              <p className="text-sm text-slate-500">Add clients first to share proposals with them</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => window.location.href = '/Clients'}
              >
                Go to Client Management
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {clients.map(client => {
                const isShared = proposal.shared_with_client_ids?.includes(client.id);
                
                return (
                  <div
                    key={client.id}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      isShared 
                        ? 'border-blue-300 bg-blue-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isShared}
                        onCheckedChange={() => toggleClientSharing(client.id)}
                        disabled={!proposal.client_view_enabled || updateProposalMutation.isPending}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-slate-900">{client.client_name}</h4>
                          {isShared && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{client.contact_email}</p>
                        {client.client_organization && (
                          <p className="text-xs text-slate-500 mt-1">{client.client_organization}</p>
                        )}
                      </div>
                      {isShared && proposal.client_view_enabled && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyLink(client)}
                          >
                            {copiedClientId === client.id ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4 mr-1" />
                                Copy Link
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(getClientPortalLink(client), '_blank')}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shared Clients Summary */}
      {sharedClients.length > 0 && proposal.client_view_enabled && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <LinkIcon className="w-5 h-5" />
              Direct Links
            </CardTitle>
            <CardDescription>
              Copy these links to send directly to your clients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sharedClients.map(client => (
              <div
                key={client.id}
                className="p-4 bg-white border border-blue-200 rounded-lg"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <p className="font-medium text-slate-900">{client.client_name}</p>
                    <p className="text-sm text-slate-600">{client.contact_email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleCopyLink(client)}
                    >
                      {copiedClientId === client.id ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const mailtoLink = `mailto:${client.contact_email}?subject=Proposal: ${proposal.proposal_name}&body=Hi ${client.contact_name || client.client_name},%0D%0A%0D%0APlease review our proposal here:%0D%0A${getClientPortalLink(client)}%0D%0A%0D%0ABest regards`;
                        window.location.href = mailtoLink;
                      }}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>
                <Input
                  value={getClientPortalLink(client)}
                  readOnly
                  className="text-xs font-mono bg-slate-50 cursor-pointer"
                  onClick={(e) => e.target.select()}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Warning if Portal Disabled */}
      {!proposal.client_view_enabled && sharedClients.length > 0 && (
        <Card className="border-none shadow-lg border-l-4 border-l-amber-500">
          <CardContent className="p-4 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 mb-1">Portal Access Disabled</p>
                <p className="text-sm text-amber-800">
                  You have selected {sharedClients.length} client(s) to share with, but portal access is currently disabled. 
                  Enable portal access above to allow these clients to view this proposal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}