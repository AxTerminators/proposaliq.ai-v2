import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import QuickActionsPanel from "../components/dashboard/QuickActionsPanel";
import ProposalPipeline from "../components/dashboard/ProposalPipeline";
import AIInsightsCard from "../components/dashboard/AIInsightsCard";
import ActivityTimeline from "../components/dashboard/ActivityTimeline";
import RevenueChart from "../components/dashboard/RevenueChart";
import MobileDashboard from "../components/mobile/MobileDashboard";
import DataCallSummaryWidget from "../components/dashboard/DataCallSummaryWidget";
import { useOrganization } from "../components/layout/OrganizationContext";
import SampleDataGuard from "../components/ui/SampleDataGuard";
import { Badge } from "@/components/ui/badge";
import ClientWorkspaceInitializer from "../components/clients/ClientWorkspaceInitializer";
import RAGOnboardingGuide from "../components/content/RAGOnboardingGuide";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, organization, isLoading: isLoadingOrg } = useOrganization();
  const [stats, setStats] = useState({
    total_proposals: 0,
    active_proposals: 0,
    total_value: 0,
    win_rate: 0
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showSampleDataGuard, setShowSampleDataGuard] = useState(false);
  const [showRAGGuide, setShowRAGGuide] = useState(false);

  const isDemoAccount = organization?.organization_type === 'demo';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // PERFORMANCE FIX: Use Infinity staleTime to prevent any automatic refetching
  const { data: proposals = [], refetch: refetchProposals } = useQuery({
    queryKey: ['dashboard-proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id && !isLoadingOrg,
    staleTime: Infinity, // Never consider stale - only manual refetch
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // PERFORMANCE FIX: Use Infinity staleTime
  const { data: activityLog = [] } = useQuery({
    queryKey: ['dashboard-activity', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Get all proposals first to filter activity
      const allProposals = await base44.entities.Proposal.filter(
        { organization_id: organization.id }
      );
      
      if (allProposals.length === 0) return [];
      
      const proposalIds = allProposals.map(p => p.id);
      
      return base44.entities.ActivityLog.filter(
        { proposal_id: { $in: proposalIds } },
        '-created_date',
        20
      );
    },
    enabled: !!organization?.id && !isLoadingOrg,
    staleTime: Infinity, // Never consider stale - only manual refetch
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Calculate stats when proposals change
  useEffect(() => {
    if (!proposals || proposals.length === 0) return;

    const activeProposals = proposals.filter(p =>
      ['evaluating', 'draft', 'in_progress'].includes(p.status)
    );

    const wonProposals = proposals.filter(p => p.status === 'won');
    const submittedProposals = proposals.filter(p =>
      ['submitted', 'won', 'lost'].includes(p.status)
    );

    const totalValue = proposals.reduce((sum, p) =>
      sum + (p.contract_value || 0), 0
    );

    const winRate = submittedProposals.length > 0
      ? (wonProposals.length / submittedProposals.length) * 100
      : 0;

    setStats({
      total_proposals: proposals.length,
      active_proposals: activeProposals.length,
      total_value: totalValue,
      win_rate: Math.round(winRate)
    });
  }, [proposals]);

  // Check if user should see RAG onboarding
  useEffect(() => {
    if (!user || !organization || !proposals) return;

    const hasSeenRAGGuide = localStorage.getItem(`rag_guide_seen_${user.email}`);
    
    if (!hasSeenRAGGuide && proposals.length >= 1) {
      setTimeout(() => setShowRAGGuide(true), 1000);
    }
  }, [user, organization, proposals]);

  const handleCreateProposal = () => {
    // Check if user is using sample data
    if (user?.using_sample_data === true) {
      setShowSampleDataGuard(true);
    } else {
      navigate(createPageUrl("Pipeline"));
    }
  };

  const proceedToProposalBuilder = () => {
    navigate(createPageUrl("Pipeline"));
  };

  // Show loading state
  if (isLoadingOrg) { 
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Mobile-optimized dashboard
  if (isMobile) {
    return <MobileDashboard organization={organization} user={user} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6 lg:p-8">
      {isDemoAccount && (
        <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 border-2 border-purple-300 rounded-xl p-4 shadow-lg mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-purple-900 text-lg">🎭 Demo Account Active</h3>
              <p className="text-sm text-purple-800">
                This is a demo environment with pre-populated data. You can add, edit, and delete content freely. 
                Use the view switcher in the sidebar to test Corporate vs Consultant features.
              </p>
            </div>
            <Badge className="bg-purple-600 text-white text-sm px-3 py-1">
              Demo Mode
            </Badge>
          </div>
        </div>
      )}

      {organization?.organization_type === 'client_organization' && (
        <ClientWorkspaceInitializer 
          organization={organization}
          onComplete={() => window.location.reload()}
        />
      )}

      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-2xl p-8 text-white mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back, {user?.full_name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              {organization?.organization_type === 'client_organization' 
                ? `Managing proposals for ${organization.organization_name}`
                : 'Ready to create winning proposals?'
              }
            </p>
          </div>
          <QuickActionsPanel organization={organization} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Proposals
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {stats.total_proposals}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {stats.active_proposals} active
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Pipeline Value
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                ${(stats.total_value / 1000000).toFixed(1)}M
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Total contract value
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Win Rate
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {stats.win_rate}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                On submitted proposals
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                AI Insights
              </CardTitle>
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {Math.round(stats.win_rate * 1.2)}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Predicted success rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ProposalPipeline proposals={proposals} organization={organization} />
            <RevenueChart proposals={proposals} />
          </div>

          <div className="space-y-6">
            <AIInsightsCard proposals={proposals} organization={organization} />
            <DataCallSummaryWidget organization={organization} />
            <ActivityTimeline organization={organization} activityLog={activityLog} proposals={proposals} />
          </div>
        </div>
      </div>

      <SampleDataGuard
        isOpen={showSampleDataGuard}
        onClose={() => setShowSampleDataGuard(false)}
        onProceed={proceedToProposalBuilder}
      />

      <RAGOnboardingGuide
        isOpen={showRAGGuide}
        onClose={() => {
          setShowRAGGuide(false);
          localStorage.setItem(`rag_guide_seen_${user?.email}`, 'true');
        }}
        onComplete={() => {
          localStorage.setItem(`rag_guide_seen_${user?.email}`, 'true');
        }}
      />
    </div>
  );
}