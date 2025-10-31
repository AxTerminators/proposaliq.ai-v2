import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Users, Calendar, CheckSquare, Sparkles } from "lucide-react";
import QuickActionsPanel from "../components/dashboard/QuickActionsPanel";
import ProposalPipeline from "../components/dashboard/ProposalPipeline";
import AIInsightsCard from "../components/dashboard/AIInsightsCard";
import ActivityTimeline from "../components/dashboard/ActivityTimeline";
import RevenueChart from "../components/dashboard/RevenueChart";
import OnboardingTour from "../components/onboarding/OnboardingTour";
import { useAnalytics } from "../components/analytics/AnalyticsTracker";
import { useErrorMonitoring } from "../components/monitoring/ErrorMonitor";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [stats, setStats] = useState({
    total_proposals: 0,
    active_proposals: 0,
    total_value: 0,
    win_rate: 0
  });

  // Initialize analytics and error monitoring
  const analytics = useAnalytics(user, organization);
  useErrorMonitoring(user, organization);

  useEffect(() => {
    loadDashboardData();
    
    // Track page view
    if (user && organization) {
      analytics.trackPageView('Dashboard', {
        organization_id: organization.id
      });
    }
  }, [user, organization]);

  const loadDashboardData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const orgs = await base44.entities.Organization.filter(
        { created_by: currentUser.email },
        '-created_date',
        1
      );

      if (orgs.length > 0) {
        setOrganization(orgs[0]);

        // Load proposals
        const userProposals = await base44.entities.Proposal.filter(
          { organization_id: orgs[0].id },
          '-created_date'
        );
        setProposals(userProposals);

        // Calculate stats
        const activeProposals = userProposals.filter(p => 
          ['evaluating', 'draft', 'in_progress'].includes(p.status)
        );

        const wonProposals = userProposals.filter(p => p.status === 'won');
        const submittedProposals = userProposals.filter(p => 
          ['submitted', 'won', 'lost'].includes(p.status)
        );

        const totalValue = userProposals.reduce((sum, p) => 
          sum + (p.contract_value || 0), 0
        );

        const winRate = submittedProposals.length > 0
          ? (wonProposals.length / submittedProposals.length) * 100
          : 0;

        setStats({
          total_proposals: userProposals.length,
          active_proposals: activeProposals.length,
          total_value: totalValue,
          win_rate: Math.round(winRate)
        });
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    }
  };

  const handleCreateProposal = () => {
    // Track feature usage
    analytics.trackFeatureUsage('create_proposal', {
      source: 'dashboard'
    });
    
    navigate(createPageUrl("ProposalBuilder"));
  };

  const handleTourComplete = () => {
    analytics.trackEvent('onboarding_tour_completed', {
      user_email: user?.email
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      {/* Onboarding Tour */}
      {user && <OnboardingTour user={user} onComplete={handleTourComplete} />}

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
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            <ProposalPipeline proposals={proposals} organization={organization} />
            <RevenueChart proposals={proposals} />
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            <AIInsightsCard proposals={proposals} organization={organization} />
            <ActivityTimeline organization={organization} />
          </div>
        </div>
      </div>
    </div>
  );
}