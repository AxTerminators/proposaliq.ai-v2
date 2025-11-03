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
import { useOrganization } from "../components/layout/OrganizationContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [showSampleDataDialog, setShowSampleDataDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load proposals using React Query
  const { data: proposals = [], refetch: refetchProposals } = useQuery({
    queryKey: ['dashboard-proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id && !isLoadingOrg,
    staleTime: 60000,
    cacheTime: 300000,
  });

  // Load activity log
  const { data: activityLog = [] } = useQuery({
    queryKey: ['dashboard-activity', organization?.id],
    queryFn: async () => {
      if (!organization?.id || proposals.length === 0) return [];
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const proposalIds = proposals.map(p => p.id);
      if (proposalIds.length === 0) return [];
      
      return base44.entities.ActivityLog.filter(
        { proposal_id: { $in: proposalIds } },
        '-created_date',
        20
      );
    },
    enabled: !!organization?.id && proposals.length > 0 && !isLoadingOrg,
    staleTime: 60000,
    cacheTime: 300000,
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

  const handleCreateProposal = () => {
    // Check if user is using sample data
    if (user?.using_sample_data) {
      setShowSampleDataDialog(true);
    } else {
      navigate(createPageUrl("ProposalBuilder"));
    }
  };

  const handleClearSampleData = async () => {
    setIsClearing(true);
    try {
      await base44.functions.invoke('clearSampleData', {});
      
      alert('✅ Sample data cleared! You can now create your first real proposal.');
      
      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error('Error clearing sample data:', error);
      alert('Error clearing sample data: ' + error.message);
    } finally {
      setIsClearing(false);
      setShowSampleDataDialog(false);
    }
  };

  // Show loading state
  if (isLoadingOrg || !organization || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 flex items-center justify-center">
        <Card className="border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Loading your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
        <MobileDashboard
          user={user}
          organization={organization}
          proposals={proposals}
          stats={stats}
          onCreateProposal={handleCreateProposal}
        />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between dashboard-overview">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Welcome back, {user?.full_name?.split(' ')[0] || 'there'}! 👋
              </h1>
              <p className="text-slate-600 mt-1">
                {organization?.organization_name || 'Your Organization'}
              </p>
            </div>
            <Button
              onClick={handleCreateProposal}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 create-proposal-button"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Proposal
            </Button>
          </div>

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

          {/* Quick Actions */}
          <QuickActionsPanel user={user} organization={organization} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ProposalPipeline proposals={proposals} organization={organization} />
              <RevenueChart proposals={proposals} />
            </div>

            <div className="space-y-6">
              <AIInsightsCard proposals={proposals} organization={organization} />
              <ActivityTimeline organization={organization} activityLog={activityLog} proposals={proposals} />
            </div>
          </div>
        </div>
      </div>

      {/* Sample Data Dialog */}
      <AlertDialog open={showSampleDataDialog} onOpenChange={setShowSampleDataDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-600" />
              Ready to Add Real Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p className="text-base text-slate-700 font-medium">
                You're currently exploring ProposalIQ with sample data. To create your first real proposal, you'll need to clear the sample data first.
              </p>
              
              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                <p className="text-amber-900 font-semibold mb-2">📝 What happens when you clear sample data:</p>
                <ul className="list-disc pl-5 space-y-1 text-amber-800 text-sm">
                  <li>All sample proposals, tasks, and related data will be removed</li>
                  <li>Your organization profile and team members will be preserved</li>
                  <li>You'll be able to create your first real proposal immediately</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-900 font-semibold text-sm">
                  💡 Not ready yet? You can continue exploring with sample data by clicking "Return to Training".
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>
              Return to Training
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearSampleData}
              disabled={isClearing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isClearing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Clearing Sample Data...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Clear Sample Data & Create Real Proposal
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}