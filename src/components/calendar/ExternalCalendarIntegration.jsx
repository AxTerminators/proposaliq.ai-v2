import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Calendar, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink,
  Mail,
  Users,
  Shield,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";

export default function ExternalCalendarIntegration({ organization, user }) {
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState(null);

  const { data: connections = [] } = useQuery({
    queryKey: ['external-calendar-connections', organization?.id, user?.email],
    queryFn: async () => {
      if (!organization?.id || !user?.email) return [];
      return base44.entities.ExternalCalendarConnection.filter({
        organization_id: organization.id,
        user_email: user.email
      });
    },
    enabled: !!organization?.id && !!user?.email,
  });

  const { data: clientConnections = [] } = useQuery({
    queryKey: ['client-calendar-connections', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ExternalCalendarConnection.filter({
        organization_id: organization.id,
        is_client_calendar: true,
        connection_status: 'active'
      });
    },
    enabled: !!organization?.id,
  });

  const createConnectionMutation = useMutation({
    mutationFn: async (connectionType) => {
      // Create pending connection record
      return base44.entities.ExternalCalendarConnection.create({
        organization_id: organization.id,
        user_email: user.email,
        connection_type: connectionType,
        connection_status: 'pending',
        permissions_granted: {
          check_availability: true,
          read_events: false,
          write_events: false
        },
        sync_direction: 'availability_only',
        consent_given_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-calendar-connections'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (connectionId) => {
      return base44.entities.ExternalCalendarConnection.update(connectionId, {
        connection_status: 'revoked'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-calendar-connections'] });
    },
  });

  const handleConnect = async (type) => {
    setConnecting(type);
    try {
      await createConnectionMutation.mutateAsync(type);
      
      // In a real implementation, this would redirect to OAuth flow
      alert(`To complete ${type === 'google_calendar' ? 'Google Calendar' : type === 'outlook_calendar' ? 'Outlook' : 'Apple Calendar'} connection:\n\n1. You'll be redirected to authorize access\n2. Grant "availability checking" permissions\n3. You'll be redirected back to complete setup\n\nNote: This is a demo. In production, this would trigger the actual OAuth flow.`);
      
    } catch (error) {
      console.error("Error connecting calendar:", error);
      alert("Failed to initiate connection");
    } finally {
      setConnecting(null);
    }
  };

  const getConnectionIcon = (type) => {
    switch (type) {
      case 'google_calendar': return '📅';
      case 'outlook_calendar': return '📧';
      case 'apple_calendar': return '🍎';
      default: return '📆';
    }
  };

  const getConnectionName = (type) => {
    switch (type) {
      case 'google_calendar': return 'Google Calendar';
      case 'outlook_calendar': return 'Outlook Calendar';
      case 'apple_calendar': return 'Apple Calendar';
      default: return 'External Calendar';
    }
  };

  const activeConnections = connections.filter(c => c.connection_status === 'active');
  const hasGoogleConnection = activeConnections.some(c => c.connection_type === 'google_calendar');
  const hasOutlookConnection = activeConnections.some(c => c.connection_type === 'outlook_calendar');

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-blue-600" />
            External Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{activeConnections.length}</div>
              <div className="text-sm text-slate-600">Connected</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{clientConnections.length}</div>
              <div className="text-sm text-slate-600">Client Calendars</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {activeConnections.reduce((sum, c) => sum + (c.events_imported || 0), 0)}
              </div>
              <div className="text-sm text-slate-600">Events Synced</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Your Connections */}
      <div>
        <h4 className="font-semibold text-slate-900 mb-3">Your Calendar Connections</h4>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Google Calendar */}
          <Card className={cn(
            "border-2",
            hasGoogleConnection ? "border-green-500 bg-green-50/30" : "border-slate-200"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getConnectionIcon('google_calendar')}</span>
                  <div>
                    <div className="font-semibold text-slate-900">Google Calendar</div>
                    {hasGoogleConnection ? (
                      <Badge className="bg-green-600 mt-1">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1">Not Connected</Badge>
                    )}
                  </div>
                </div>
              </div>

              {hasGoogleConnection ? (
                <div className="space-y-2">
                  {connections.filter(c => c.connection_type === 'google_calendar' && c.connection_status === 'active').map(conn => (
                    <div key={conn.id} className="text-xs text-slate-600">
                      <div>Last sync: {conn.last_sync ? moment(conn.last_sync).fromNow() : 'Never'}</div>
                      <div>Direction: {conn.sync_direction?.replace(/_/g, ' ')}</div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => {
                          if (confirm('Disconnect Google Calendar?')) {
                            disconnectMutation.mutate(conn.id);
                          }
                        }}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleConnect('google_calendar')}
                  disabled={connecting === 'google_calendar'}
                >
                  {connecting === 'google_calendar' ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Outlook Calendar */}
          <Card className={cn(
            "border-2",
            hasOutlookConnection ? "border-green-500 bg-green-50/30" : "border-slate-200"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getConnectionIcon('outlook_calendar')}</span>
                  <div>
                    <div className="font-semibold text-slate-900">Outlook</div>
                    {hasOutlookConnection ? (
                      <Badge className="bg-green-600 mt-1">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1">Not Connected</Badge>
                    )}
                  </div>
                </div>
              </div>

              {hasOutlookConnection ? (
                <div className="space-y-2">
                  {connections.filter(c => c.connection_type === 'outlook_calendar' && c.connection_status === 'active').map(conn => (
                    <div key={conn.id} className="text-xs text-slate-600">
                      <div>Last sync: {conn.last_sync ? moment(conn.last_sync).fromNow() : 'Never'}</div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => {
                          if (confirm('Disconnect Outlook Calendar?')) {
                            disconnectMutation.mutate(conn.id);
                          }
                        }}
                      >
                        Disconnect
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleConnect('outlook_calendar')}
                  disabled={connecting === 'outlook_calendar'}
                >
                  {connecting === 'outlook_calendar' ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect'
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Client Calendars */}
          <Card className="border-2 border-purple-300 bg-purple-50/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="font-semibold text-slate-900">Client Calendars</div>
                  <Badge variant="secondary" className="mt-1">
                    {clientConnections.length} connected
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-slate-600 mb-2">
                Securely check client availability when scheduling meetings
              </div>
              <Button size="sm" variant="outline" className="w-full" disabled>
                <Shield className="w-3 h-3 mr-2" />
                Manage Access
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Privacy & Security Info */}
      <Card className="border-2 border-blue-300 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Privacy First:</strong> External calendar connections are secure and encrypted. 
              By default, we only check availability (free/busy), not event details. 
              You control what information is shared. Client connections require explicit consent and can be revoked anytime.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}