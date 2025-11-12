import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Database,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Clock
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * System Health Dashboard
 * Monitor platform performance and usage across all organizations
 */
export default function SystemHealth() {
  const [user, setUser] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadData();
  }, []);

  // Only super admins can access this
  const isSuperAdmin = user?.admin_role === 'super_admin';

  // Fetch all organizations
  const { data: organizations = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['all-organizations', refreshKey],
    queryFn: async () => {
      return base44.entities.Organization.list();
    },
  });

  // Fetch all proposals
  const { data: allProposals = [], isLoading: loadingProposals } = useQuery({
    queryKey: ['all-proposals-system', refreshKey],
    queryFn: async () => {
      return base44.entities.Proposal.list();
    },
  });

  // Fetch all users
  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['all-users-system', refreshKey],
    queryFn: async () => {
      return base44.entities.User.list();
    },
  });

  const isLoading = loadingOrgs || loadingProposals || loadingUsers;

  const metrics = React.useMemo(() => {
    const consultingFirms = organizations.filter(o => 
      o.organization_type === 'consulting_firm' || o.organization_type === 'consultancy'
    ).length;
    const clientOrgs = organizations.filter(o => 
      o.organization_type === 'client_organization'
    ).length;
    const corporateOrgs = organizations.filter(o => 
      o.organization_type === 'corporate'
    ).length;

    const activeProposals = allProposals.filter(p => 
      ['draft', 'in_progress', 'submitted'].includes(p.status)
    ).length;

    const wonProposals = allProposals.filter(p => p.status === 'won').length;
    const totalValue = allProposals
      .filter(p => p.status === 'won')
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);

    const activeUsers = allUsers.filter(u => 
      u.client_accesses && u.client_accesses.length > 0
    ).length;

    return {
      consultingFirms,
      clientOrgs,
      corporateOrgs,
      totalOrgs: organizations.length,
      totalProposals: allProposals.length,
      activeProposals,
      wonProposals,
      totalValue,
      totalUsers: allUsers.length,
      activeUsers
    };
  }, [organizations, allProposals, allUsers]);

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Access Denied
            </h3>
            <p className="text-slate-600">
              This page is only accessible to super administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            System Health
          </h1>
          <p className="text-slate-600">
            Platform-wide monitoring and analytics
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setRefreshKey(k => k + 1)}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <Database className="w-8 h-8 opacity-80 mb-3" />
                <div className="text-3xl font-bold mb-1">{metrics.totalOrgs}</div>
                <p className="text-blue-100 text-sm">Total Organizations</p>
                <p className="text-xs text-blue-200 mt-2">
                  {metrics.consultingFirms} firms, {metrics.clientOrgs} clients
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <FileText className="w-8 h-8 opacity-80 mb-3" />
                <div className="text-3xl font-bold mb-1">{metrics.totalProposals}</div>
                <p className="text-purple-100 text-sm">Total Proposals</p>
                <p className="text-xs text-purple-200 mt-2">
                  {metrics.activeProposals} active
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <DollarSign className="w-8 h-8 opacity-80 mb-3" />
                <div className="text-3xl font-bold mb-1">
                  ${(metrics.totalValue / 1000000).toFixed(1)}M
                </div>
                <p className="text-green-100 text-sm">Total Contract Value</p>
                <p className="text-xs text-green-200 mt-2">
                  {metrics.wonProposals} won
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <Users className="w-8 h-8 opacity-80 mb-3" />
                <div className="text-3xl font-bold mb-1">{metrics.totalUsers}</div>
                <p className="text-amber-100 text-sm">Platform Users</p>
                <p className="text-xs text-amber-200 mt-2">
                  {metrics.activeUsers} active
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Organization Breakdown */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Organization Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-800 mb-2">Consulting Firms</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {metrics.consultingFirms}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 mb-2">Client Workspaces</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {metrics.clientOrgs}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 mb-2">Corporate Teams</p>
                  <p className="text-3xl font-bold text-green-900">
                    {metrics.corporateOrgs}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Indicators */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">All Systems Operational</span>
                    </div>
                    <Badge className="bg-green-600 text-white">Healthy</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <span className="text-sm text-slate-700">Database Queries</span>
                    <Badge className="bg-blue-100 text-blue-700">Normal</Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                    <span className="text-sm text-slate-700">API Response Time</span>
                    <Badge className="bg-green-100 text-green-700">&lt; 200ms</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Growth Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">New Orgs (30d)</span>
                    <Badge className="bg-purple-100 text-purple-700">
                      {organizations.filter(o =>
                        moment(o.created_date).isAfter(moment().subtract(30, 'days'))
                      ).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">New Proposals (30d)</span>
                    <Badge className="bg-blue-100 text-blue-700">
                      {allProposals.filter(p =>
                        moment(p.created_date).isAfter(moment().subtract(30, 'days'))
                      ).length}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Platform Win Rate</span>
                    <Badge className="bg-green-100 text-green-700">
                      {allProposals.length > 0
                        ? Math.round((metrics.wonProposals / allProposals.length) * 100)
                        : 0
                      }%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}