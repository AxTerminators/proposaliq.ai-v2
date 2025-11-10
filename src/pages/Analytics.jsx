
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Target, Award, Calendar, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RevenueChart from "../components/dashboard/RevenueChart";

// Helper function to get user's active organization
async function getUserActiveOrganization(user) {
  if (!user) return null;
  let orgId = null;
  if (user.active_client_id) {
    orgId = user.active_client_id;
  } else if (user.client_accesses && user.client_accesses.length > 0) {
    orgId = user.client_accesses[0].organization_id;
  } else {
    const orgs = await base44.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );
    if (orgs.length > 0) {
      orgId = orgs[0].id;
    }
  }
  if (orgId) {
    const orgs = await base44.entities.Organization.filter({ id: orgId });
    if (orgs.length > 0) {
      return orgs[0];
    }
  }
  return null;
}

export default function Analytics() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showClientBreakdown, setShowClientBreakdown] = useState(false); // NEW

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals-analytics', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  // FIXED: Check demo_view_mode for demo accounts
  const effectiveOrgType = organization?.organization_type === 'demo'
    ? organization?.demo_view_mode
    : organization?.organization_type;
  const isConsultancy = effectiveOrgType === 'consultancy';

  // NEW: Fetch clients for consultant analytics
  const { data: allClients = [] } = useQuery({
    queryKey: ['analytics-clients', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Client.filter({ organization_id: organization.id });
    },
    enabled: !!organization?.id && isConsultancy,
    staleTime: 60000
  });

  // NEW: Calculate client-specific metrics
  const clientMetrics = useMemo(() => {
    if (allClients.length === 0) return [];
    
    return allClients.map(client => {
      const clientProposals = proposals.filter(p => 
        p.shared_with_client_ids?.includes(client.id)
      );
      const wonProposals = clientProposals.filter(p => p.status === 'won');
      const submittedProposals = clientProposals.filter(p => 
        ['submitted', 'won', 'lost'].includes(p.status)
      );
      
      const totalValue = clientProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
      const wonValue = wonProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
      const winRate = submittedProposals.length > 0 
        ? Math.round((wonProposals.length / submittedProposals.length) * 100)
        : 0;
      
      return {
        client,
        proposalsCount: clientProposals.length,
        wonCount: wonProposals.length,
        totalValue,
        wonValue,
        winRate
      };
    }).sort((a, b) => b.totalValue - a.totalValue); // Sort by value
  }, [allClients, proposals]);

  const calculateStats = () => {
    const totalProposals = proposals.length;
    const submittedProposals = proposals.filter(p => 
      ['submitted', 'won', 'lost'].includes(p.status)
    );
    const wonProposals = proposals.filter(p => p.status === 'won');
    const lostProposals = proposals.filter(p => p.status === 'lost');
    
    const totalValue = proposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    const wonValue = wonProposals.reduce((sum, p) => sum + (p.contract_value || 0), 0);
    
    const winRate = submittedProposals.length > 0 
      ? (wonProposals.length / submittedProposals.length) * 100 
      : 0;

    const avgContractValue = totalProposals > 0 ? totalValue / totalProposals : 0;

    return {
      totalProposals,
      submittedProposals: submittedProposals.length,
      wonProposals: wonProposals.length,
      lostProposals: lostProposals.length,
      totalValue,
      wonValue,
      winRate: Math.round(winRate),
      avgContractValue
    };
  };

  const stats = calculateStats();

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Analytics</h1>
          <p className="text-slate-600">Track your performance and metrics</p>
        </div>
        {/* NEW: Client breakdown toggle for consultants */}
        {isConsultancy && allClients.length > 0 && (
          <Button
            variant={showClientBreakdown ? "default" : "outline"}
            onClick={() => setShowClientBreakdown(!showClientBreakdown)}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Client Breakdown
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Proposals
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.totalProposals}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.submittedProposals} submitted
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Win Rate
                </CardTitle>
                <Target className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stats.winRate}%</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.wonProposals} won, {stats.lostProposals} lost
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Value
                </CardTitle>
                <DollarSign className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  ${(stats.totalValue / 1000000).toFixed(1)}M
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Pipeline value
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Won Value
                </CardTitle>
                <Award className="w-4 h-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  ${(stats.wonValue / 1000000).toFixed(1)}M
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Contract value won
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <RevenueChart proposals={proposals} />
            
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Performance by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { status: 'won', label: 'Won', count: stats.wonProposals, color: 'bg-green-500' },
                    { status: 'lost', label: 'Lost', count: stats.lostProposals, color: 'bg-red-500' },
                    { status: 'in_progress', label: 'In Progress', count: proposals.filter(p => p.status === 'in_progress').length, color: 'bg-blue-500' },
                    { status: 'draft', label: 'Draft', count: proposals.filter(p => p.status === 'draft').length, color: 'bg-amber-500' }
                  ].map(item => {
                    const percentage = stats.totalProposals > 0 
                      ? (item.count / stats.totalProposals) * 100 
                      : 0;
                    
                    return (
                      <div key={item.status}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700">{item.label}</span>
                          <span className="text-sm text-slate-600">{item.count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`${item.color} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* NEW: Client Performance Breakdown */}
          {isConsultancy && showClientBreakdown && allClients.length > 0 && (
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  Performance by Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clientMetrics.map(({ client, proposalsCount, wonCount, totalValue, wonValue, winRate }) => (
                    <div key={client.id} className="p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                            {client.client_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900">{client.client_name}</h4>
                            <p className="text-xs text-slate-500">{client.contact_email}</p>
                          </div>
                        </div>
                        <Badge className={
                          client.relationship_status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : // Add hover:bg-green-100 to prevent change on hover
                          client.relationship_status === 'prospect' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                          'bg-slate-100 text-slate-700 hover:bg-slate-100'
                        }>
                          {client.relationship_status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center">
                          <div className="text-xl font-bold text-slate-900">{proposalsCount}</div>
                          <div className="text-xs text-slate-600">Proposals</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-green-700">{wonCount}</div>
                          <div className="text-xs text-slate-600">Won</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-purple-700">
                            ${totalValue >= 1000000 ? `${(totalValue / 1000000).toFixed(1)}M` : `${(totalValue / 1000).toFixed(0)}K`}
                          </div>
                          <div className="text-xs text-slate-600">Total Value</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-blue-700">{winRate}%</div>
                          <div className="text-xs text-slate-600">Win Rate</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
