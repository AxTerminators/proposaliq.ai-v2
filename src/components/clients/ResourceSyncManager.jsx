import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Unlink,
  ArrowRightLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";

/**
 * Resource Sync Manager
 * Manages ResourceShare records and sync status between firms and clients
 */
export default function ResourceSyncManager({ clientOrganization, consultingFirm }) {
  const queryClient = useQueryClient();

  // Fetch all resource shares for this client
  const { data: resourceShares = [], isLoading } = useQuery({
    queryKey: ['resource-shares', clientOrganization?.id],
    queryFn: async () => {
      if (!clientOrganization?.id) return [];
      return base44.entities.ResourceShare.filter({
        target_organization_id: clientOrganization.id,
        is_active: true
      }, '-created_date');
    },
    enabled: !!clientOrganization?.id,
  });

  const updateShareMutation = useMutation({
    mutationFn: async ({ shareId, updates }) => {
      return base44.entities.ResourceShare.update(shareId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-shares'] });
      toast.success("Share settings updated");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    }
  });

  const toggleAutoSync = (share) => {
    updateShareMutation.mutate({
      shareId: share.id,
      updates: {
        auto_sync_enabled: !share.auto_sync_enabled
      }
    });
  };

  const deactivateShare = (share) => {
    updateShareMutation.mutate({
      shareId: share.id,
      updates: {
        is_active: false
      }
    });
  };

  const getResourceTypeLabel = (type) => {
    const labels = {
      'proposal_resource': 'Resource',
      'past_performance': 'Past Performance',
      'key_personnel': 'Personnel',
      'teaming_partner': 'Partner'
    };
    return labels[type] || type;
  };

  const getShareTypeColor = (type) => {
    const colors = {
      'copy': 'bg-blue-100 text-blue-700',
      'sync': 'bg-green-100 text-green-700',
      'reference': 'bg-purple-100 text-purple-700'
    };
    return colors[type] || 'bg-slate-100 text-slate-700';
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-purple-600" />
          Shared Resources ({resourceShares.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : resourceShares.length === 0 ? (
          <div className="text-center py-8">
            <LinkIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No resources shared with this client yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resourceShares.map(share => (
              <div
                key={share.id}
                className="p-4 bg-slate-50 rounded-lg border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="text-xs">
                        {getResourceTypeLabel(share.resource_type)}
                      </Badge>
                      <Badge className={cn("text-xs", getShareTypeColor(share.share_type))}>
                        {share.share_type}
                      </Badge>
                      {share.auto_sync_enabled && (
                        <Badge className="text-xs bg-green-100 text-green-700">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Auto-sync
                        </Badge>
                      )}
                      {share.client_modified && (
                        <Badge className="text-xs bg-amber-100 text-amber-700">
                          Modified by client
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-700">
                      Shared by <strong>{share.shared_by_name || share.shared_by_email}</strong>
                    </p>
                    
                    {share.last_synced && (
                      <p className="text-xs text-slate-500 mt-1">
                        Last synced: {moment(share.last_synced).fromNow()}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {share.share_type === 'sync' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAutoSync(share)}
                        disabled={updateShareMutation.isPending}
                      >
                        {share.auto_sync_enabled ? (
                          <>
                            <Unlink className="w-4 h-4 mr-1" />
                            Disable Sync
                          </>
                        ) : (
                          <>
                            <LinkIcon className="w-4 h-4 mr-1" />
                            Enable Sync
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deactivateShare(share)}
                      disabled={updateShareMutation.isPending}
                      title="Remove share"
                    >
                      <Unlink className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}