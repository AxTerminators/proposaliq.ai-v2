import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar, CheckCircle2, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const CALENDAR_PROVIDERS = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Sync events with your Google Calendar",
    icon: "📅",
    color: "from-blue-500 to-blue-600"
  },
  {
    id: "outlook_calendar",
    name: "Outlook Calendar",
    description: "Sync events with Microsoft Outlook",
    icon: "📧",
    color: "from-indigo-500 to-indigo-600"
  },
  {
    id: "apple_calendar",
    name: "Apple Calendar",
    description: "Sync events with iCloud Calendar",
    icon: "🍎",
    color: "from-gray-500 to-gray-600"
  }
];

export default function CalendarSync({ organization }) {
  const queryClient = useQueryClient();
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const { data: connections = [] } = useQuery({
    queryKey: ['calendar-connections', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.IntegrationConnection.filter({
        organization_id: organization.id,
        integration_type: { $in: ['google_calendar', 'outlook_calendar', 'apple_calendar'] }
      });
    },
    enabled: !!organization?.id,
  });

  const connectMutation = useMutation({
    mutationFn: async (provider) => {
      // In production, this would initiate OAuth flow
      // For now, we'll create a placeholder connection
      return base44.entities.IntegrationConnection.create({
        organization_id: organization.id,
        integration_type: provider.id,
        connection_name: provider.name,
        status: "active",
        sync_frequency: "realtime",
        config: {
          sync_direction: "bidirectional",
          auto_sync: true
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
      setShowConnectDialog(false);
      setSelectedProvider(null);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId) => {
      return base44.entities.IntegrationConnection.delete(connectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
    },
  });

  const updateSyncMutation = useMutation({
    mutationFn: async ({ connectionId, enabled }) => {
      return base44.entities.IntegrationConnection.update(connectionId, {
        status: enabled ? "active" : "inactive"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-connections'] });
    },
  });

  const getConnection = (providerId) => {
    return connections.find(c => c.integration_type === providerId);
  };

  const handleConnect = (provider) => {
    setSelectedProvider(provider);
    setShowConnectDialog(true);
  };

  const confirmConnect = () => {
    if (selectedProvider) {
      connectMutation.mutate(selectedProvider);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {CALENDAR_PROVIDERS.map((provider) => {
          const connection = getConnection(provider.id);
          const isConnected = !!connection;

          return (
            <Card key={provider.id} className="border-none shadow-lg hover:shadow-xl transition-all">
              <CardHeader className={cn(
                "bg-gradient-to-r text-white",
                provider.color
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{provider.icon}</span>
                    <div>
                      <CardTitle className="text-white text-lg">{provider.name}</CardTitle>
                      <p className="text-white/90 text-xs mt-1">{provider.description}</p>
                    </div>
                  </div>
                  {isConnected && (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {isConnected ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Status:</span>
                      <Badge variant={connection.status === "active" ? "default" : "secondary"}>
                        {connection.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Auto-sync:</span>
                      <Switch
                        checked={connection.status === "active"}
                        onCheckedChange={(enabled) => {
                          updateSyncMutation.mutate({
                            connectionId: connection.id,
                            enabled
                          });
                        }}
                      />
                    </div>

                    {connection.last_sync && (
                      <div className="text-xs text-slate-500">
                        Last synced: {new Date(connection.last_sync).toLocaleString()}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          // Manual sync trigger
                          alert("Manual sync initiated!");
                        }}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Disconnect ${provider.name}?`)) {
                            disconnectMutation.mutate(connection.id);
                          }
                        }}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleConnect(provider)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect {provider.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connect Dialog */}
      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Connect {selectedProvider?.name}
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>What will be synced:</strong>
                </p>
                <ul className="text-sm text-blue-800 space-y-1 ml-5 list-disc">
                  <li>All calendar events you create in ProposalIQ.ai</li>
                  <li>Task deadlines and proposal due dates</li>
                  <li>Client meetings and review sessions</li>
                </ul>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-900 mb-2">
                      <strong>Note:</strong>
                    </p>
                    <p className="text-sm text-amber-800">
                      You'll be redirected to {selectedProvider?.name} to authorize access. 
                      ProposalIQ.ai will only access your calendar data and will not access 
                      any other information from your account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={confirmConnect}>
                  Continue to {selectedProvider?.name}
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-slate-50 to-blue-50">
        <CardContent className="p-6">
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            How Calendar Sync Works
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Bidirectional Sync:</strong> Changes made in ProposalIQ.ai appear in your external calendar, and vice versa.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Real-time Updates:</strong> Events sync automatically within minutes of creation or modification.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Selective Sync:</strong> Control which types of events sync to external calendars in your settings.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span><strong>Privacy:</strong> Only events you have permission to view will be synced to your personal calendar.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}