import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import {
  Library,
  TrendingUp,
  Users,
  Award,
  Handshake,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Resource Usage Analytics
 * Shows how shared resources are being used across client workspaces
 */
export default function ResourceUsageAnalytics({ consultingFirm }) {
  // Fetch all resource shares
  const { data: resourceShares = [], isLoading } = useQuery({
    queryKey: ['all-resource-shares', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      
      // Get all client orgs first
      const clientOrgs = await base44.entities.Organization.filter({
        organization_type: 'client_organization',
        parent_organization_id: consultingFirm.id
      });

      // Fetch shares for all clients
      const allShares = [];
      for (const clientOrg of clientOrgs) {
        const shares = await base44.entities.ResourceShare.filter({
          target_organization_id: clientOrg.id,
          is_active: true
        });
        allShares.push(...shares.map(s => ({
          ...s,
          client_org_name: clientOrg.organization_name
        })));
      }
      return allShares;
    },
    enabled: !!consultingFirm?.id,
  });

  const analytics = React.useMemo(() => {
    // Count by resource type
    const byType = {};
    resourceShares.forEach(share => {
      byType[share.resource_type] = (byType[share.resource_type] || 0) + 1;
    });

    // Count by client
    const byClient = {};
    resourceShares.forEach(share => {
      byClient[share.client_org_name] = (byClient[share.client_org_name] || 0) + 1;
    });

    // Count by share type
    const byShareType = {};
    resourceShares.forEach(share => {
      byShareType[share.share_type] = (byShareType[share.share_type] || 0) + 1;
    });

    return {
      byType: Object.entries(byType).map(([type, count]) => ({
        type: type.replace('_', ' '),
        count
      })),
      byClient: Object.entries(byClient).map(([client, count]) => ({
        client,
        count
      })).sort((a, b) => b.count - a.count),
      byShareType: Object.entries(byShareType).map(([type, count]) => ({
        type,
        count
      })),
      totalShares: resourceShares.length,
      activeSync: resourceShares.filter(s => s.auto_sync_enabled).length,
      clientModified: resourceShares.filter(s => s.client_modified).length
    };
  }, [resourceShares]);

  const RESOURCE_TYPE_ICONS = {
    'proposal_resource': Library,
    'past_performance': Award,
    'key_personnel': Users,
    'teaming_partner': Handshake
  };

  if (isLoading) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <CardContent className="p-6">
            <Library className="w-8 h-8 opacity-80 mb-3" />
            <div className="text-3xl font-bold mb-1">{analytics.totalShares}</div>
            <p className="text-purple-100 text-sm">Total Shared Resources</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-6">
            <TrendingUp className="w-8 h-8 opacity-80 mb-3" />
            <div className="text-3xl font-bold mb-1">{analytics.activeSync}</div>
            <p className="text-blue-100 text-sm">Auto-Sync Enabled</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <Users className="w-8 h-8 opacity-80 mb-3" />
            <div className="text-3xl font-bold mb-1">{analytics.byClient.length}</div>
            <p className="text-amber-100 text-sm">Clients with Resources</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <CheckCircle2 className="w-8 h-8 opacity-80 mb-3" />
            <div className="text-3xl font-bold mb-1">{analytics.clientModified}</div>
            <p className="text-green-100 text-sm">Customized by Clients</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Resource Type Distribution */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Resources by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.byType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="type" stroke="#64748b" style={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-base">Top Resource Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.byClient.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-purple-700">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {item.client}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${(item.count / analytics.totalShares) * 100}%` }}
                        />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {item.count}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}