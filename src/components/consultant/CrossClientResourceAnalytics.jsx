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
import { Package, TrendingUp, Award, Users, Handshake, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const RESOURCE_ICONS = {
  'proposal_resource': FileText,
  'past_performance': Award,
  'key_personnel': Users,
  'teaming_partner': Handshake
};

/**
 * Cross-Client Resource Analytics
 * Shows which resources are most valuable across all clients
 */
export default function CrossClientResourceAnalytics({ consultingFirm }) {
  // Fetch all resource shares
  const { data: allShares = [], isLoading } = useQuery({
    queryKey: ['cross-client-shares', consultingFirm?.id],
    queryFn: async () => {
      if (!consultingFirm?.id) return [];
      return base44.entities.ResourceShare.filter({
        source_organization_id: consultingFirm.id,
        is_active: true
      });
    },
    enabled: !!consultingFirm?.id,
  });

  const analytics = React.useMemo(() => {
    const byType = {};
    const byResource = {};

    allShares.forEach(share => {
      // Count by type
      byType[share.resource_type] = (byType[share.resource_type] || 0) + 1;

      // Count by specific resource
      const key = `${share.resource_type}-${share.source_resource_id}`;
      if (!byResource[key]) {
        byResource[key] = {
          resource_type: share.resource_type,
          resource_id: share.source_resource_id,
          count: 0,
          clients: new Set()
        };
      }
      byResource[key].count += 1;
      byResource[key].clients.add(share.target_organization_id);
    });

    const typeData = Object.entries(byType).map(([type, count]) => ({
      type: type.replace('_', ' '),
      count,
      icon: RESOURCE_ICONS[type]
    }));

    const topResources = Object.values(byResource)
      .map(r => ({
        ...r,
        clientCount: r.clients.size
      }))
      .sort((a, b) => b.clientCount - a.clientCount)
      .slice(0, 5);

    return { typeData, topResources };
  }, [allShares]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Distribution by Type */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Resources Shared Across Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.typeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="type" stroke="#64748b" style={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" style={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" name="Shares" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Shared Resources */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Most Valuable Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topResources.length === 0 ? (
            <p className="text-center py-8 text-slate-500">
              No resources shared yet
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.topResources.map((resource, idx) => {
                const Icon = RESOURCE_ICONS[resource.resource_type] || FileText;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">
                          {resource.resource_type.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-slate-500">
                          Shared with {resource.clientCount} client{resource.clientCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700">
                      {resource.count} share{resource.count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}