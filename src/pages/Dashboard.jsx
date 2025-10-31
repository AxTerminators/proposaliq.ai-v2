
import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Plus, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Target,
  Zap,
  MessageSquare,
  Edit,
  Search,
  DollarSign,
  Award,
  Activity
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileContainer, MobileGrid, MobileSection } from "../components/ui/mobile-container";
import QuickActionsPanel from "../components/dashboard/QuickActionsPanel";
import ProposalPipeline from "../components/dashboard/ProposalPipeline";
import AIInsightsCard from "../components/dashboard/AIInsightsCard";
import ActivityTimeline from "../components/dashboard/ActivityTimeline";
import RevenueChart from "../components/dashboard/RevenueChart";
import CustomAlertDialog from "../components/ui/CustomAlertDialog";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [organization, setOrganization] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [showComingSoonDialog, setShowComingSoonDialog] = React.useState(false);

  React.useEffect(() => {
    const loadData = async () => {
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
        } else {
          navigate(createPageUrl("Onboarding"));
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  const { data: proposals } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-updated_date'
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const { data: activityLog } = useQuery({
    queryKey: ['activity-log', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const activities = await base44.entities.ActivityLog.list('-created_date', 50);
      return activities.filter(a => {
        const proposal = proposals.find(p => p.id === a.proposal_id);
        return proposal?.organization_id === organization.id;
      });
    },
    initialData: [],
    enabled: !!organization?.id && proposals.length > 0,
  });

  const { data: opportunities } = useQuery({
    queryKey: ['opportunities-count', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.SAMOpportunity.filter(
        { organization_id: organization.id, status: 'new' },
        '-match_score',
        10
      );
    },
    initialData: [],
    enabled: !!organization?.id,
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications-unread', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Notification.filter(
        { user_email: user.email, is_read: false },
        '-created_date',
        5
      );
    },
    initialData: [],
    enabled: !!user?.email,
  });

  // Calculate comprehensive stats
  const stats = React.useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      total: proposals.length,
      active: proposals.filter(p => ['in_progress', 'draft', 'evaluating', 'watch_list'].includes(p.status)).length,
      submitted: proposals.filter(p => p.status === 'submitted').length,
      won: proposals.filter(p => p.status === 'won').length,
      lost: proposals.filter(p => p.status === 'lost').length,
      dueThisWeek: proposals.filter(p => {
        if (!p.due_date) return false;
        const dueDate = new Date(p.due_date);
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return dueDate >= now && dueDate <= weekFromNow;
      }).length,
      recentActivity: proposals.filter(p => {
        const updated = new Date(p.updated_date);
        return updated >= thirtyDaysAgo;
      }).length,
      winRate: proposals.filter(p => ['won', 'lost'].includes(p.status)).length > 0
        ? Math.round((proposals.filter(p => p.status === 'won').length / proposals.filter(p => ['won', 'lost'].includes(p.status)).length) * 100)
        : 0
    };
  }, [proposals]);

  const proposalHealthData = React.useMemo(() => {
    return proposals
      .filter(p => ['in_progress', 'draft', 'evaluating'].includes(p.status))
      .map(p => {
        let health = 50;
        if (p.due_date) health += 15;
        if (p.due_date) {
          const daysUntilDue = Math.floor((new Date(p.due_date) - new Date()) / (1000 * 60 * 60 * 24));
          if (daysUntilDue > 30) health += 20;
          else if (daysUntilDue > 14) health += 10;
          else if (daysUntilDue < 7) health -= 20;
        }
        const phaseNumber = parseInt(p.current_phase?.replace('phase', '') || '1');
        health += Math.min(phaseNumber * 5, 20);
        if (p.match_score) health += Math.floor(p.match_score / 10);
        return {
          id: p.id,
          name: p.proposal_name,
          health: Math.max(0, Math.min(100, health)),
          status: p.status,
          dueDate: p.due_date,
          phase: p.current_phase
        };
      })
      .sort((a, b) => b.health - a.health);
  }, [proposals]);

  // Upcoming Deadlines
  const upcomingDeadlines = React.useMemo(() => {
    return proposals
      .filter(p => p.due_date && ['in_progress', 'draft', 'evaluating', 'watch_list'].includes(p.status))
      .map(p => ({
        ...p,
        daysUntil: Math.floor((new Date(p.due_date) - new Date()) / (1000 * 60 * 60 * 24))
      }))
      .filter(p => p.daysUntil >= 0)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [proposals]);

  const getHealthColor = (health) => {
    if (health >= 80) return "text-green-600 bg-green-50";
    if (health >= 60) return "text-blue-600 bg-blue-50";
    if (health >= 40) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getDeadlineUrgency = (days) => {
    if (days <= 3) return "bg-red-100 text-red-700 border-red-300";
    if (days <= 7) return "bg-amber-100 text-amber-700 border-amber-300";
    if (days <= 14) return "bg-blue-100 text-blue-700 border-blue-300";
    return "bg-slate-100 text-slate-700 border-slate-300";
  };

  if (loading || !organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Skeleton className="h-32 w-32 rounded-xl mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <MobileContainer>
      <MobileSection
        title={
          <span className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            <span className="text-2xl md:text-3xl">Welcome back, {user?.full_name?.split(' ')[0]}!</span>
          </span>
        }
        description={organization.organization_name}
      />

      {/* Key Metrics Cards */}
      <MobileGrid cols="4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate(createPageUrl("Pipeline"))}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Active Proposals
              </span>
              {stats.recentActivity > 0 && (
                <Badge variant="secondary" className="text-xs">{stats.recentActivity} updated</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{stats.active}</p>
            <p className="text-xs text-slate-500 mt-1">of {stats.total} total</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-white hover:shadow-xl transition-all cursor-pointer" onClick={() => navigate(createPageUrl("Calendar"))}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Due This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{stats.dueThisWeek}</p>
            <p className="text-xs text-slate-500 mt-1">Upcoming deadlines</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white hover:shadow-xl transition-all">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.winRate}%</p>
            <p className="text-xs text-slate-500 mt-1">{stats.won} won / {stats.lost} lost</p>
          </CardContent>
        </Card>

        <Card 
          className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white hover:shadow-xl transition-all cursor-pointer" 
          onClick={() => setShowComingSoonDialog(true)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              New Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{opportunities.length}</p>
            <p className="text-xs text-slate-500 mt-1">Coming Soon</p>
          </CardContent>
        </Card>
      </MobileGrid>

      {/* Quick Actions */}
      <QuickActionsPanel />

      {/* Main Dashboard Grid */}
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left Column - 2 units wide */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          {/* AI Insights */}
          <AIInsightsCard proposals={proposals} opportunities={opportunities} />

          {/* Proposal Pipeline */}
          <ProposalPipeline proposals={proposals} />

          {/* Revenue Chart */}
          <RevenueChart proposals={proposals} />

          {/* Proposal Health Dashboard */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Proposal Health
                </span>
                <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("Pipeline"))}>
                  View All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proposalHealthData.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No active proposals to monitor</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {proposalHealthData.slice(0, 5).map((proposal) => (
                    <div
                      key={proposal.id}
                      className="p-4 rounded-lg border hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`))}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{proposal.name}</h4>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs capitalize">
                              {proposal.phase?.replace('_', ' ')}
                            </Badge>
                            {proposal.dueDate && (
                              <Badge variant="secondary" className="text-xs">
                                Due {new Date(proposal.dueDate).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full ${getHealthColor(proposal.health)}`}>
                          <span className="text-sm font-bold">{proposal.health}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={proposal.health} className="flex-1 h-2" />
                        <span className="text-xs text-slate-500">
                          {proposal.health >= 80 ? 'Excellent' :
                           proposal.health >= 60 ? 'Good' :
                           proposal.health >= 40 ? 'Fair' : 'Needs Attention'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - 1 unit wide */}
        <div className="space-y-4 md:space-y-6">
          {/* Activity Timeline */}
          <ActivityTimeline activityLog={activityLog} proposals={proposals} />

          {/* Upcoming Deadlines */}
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-600" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No upcoming deadlines</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingDeadlines.map((proposal) => (
                    <div
                      key={proposal.id}
                      className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${getDeadlineUrgency(proposal.daysUntil)}`}
                      onClick={() => navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`))}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm line-clamp-2">{proposal.proposal_name}</h4>
                        <Clock className="w-4 h-4 flex-shrink-0 ml-2" />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs">{new Date(proposal.due_date).toLocaleDateString()}</p>
                        <Badge variant="secondary" className="text-xs font-bold">
                          {proposal.daysUntil === 0 ? 'Today!' :
                           proposal.daysUntil === 1 ? 'Tomorrow' :
                           `${proposal.daysUntil} days`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Opportunities */}
          {opportunities.length > 0 && (
            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Top Opportunities
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowComingSoonDialog(true)}
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {opportunities.slice(0, 3).map((opp) => (
                    <div
                      key={opp.id}
                      className="p-3 bg-white rounded-lg border border-purple-200 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setShowComingSoonDialog(true)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm line-clamp-2">{opp.title}</h4>
                        <Badge className="bg-green-100 text-green-700 ml-2 flex-shrink-0">
                          {opp.match_score}%
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">{opp.department}</p>
                      {opp.response_deadline && (
                        <p className="text-xs text-slate-500 mt-1">
                          Due: {new Date(opp.response_deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications Preview */}
          {notifications.length > 0 && (
            <Card className="border-none shadow-lg border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    Unread Notifications
                  </span>
                  <Badge variant="secondary">{notifications.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {notifications.slice(0, 3).map((notif) => (
                    <div key={notif.id} className="p-2 bg-blue-50 rounded text-xs">
                      <p className="font-medium text-blue-900">{notif.title}</p>
                      <p className="text-blue-700 mt-1">{notif.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Coming Soon Dialog */}
      <CustomAlertDialog
        isOpen={showComingSoonDialog}
        onClose={() => setShowComingSoonDialog(false)}
        title="Opportunity Finder Coming Soon!"
        description="We're working on direct SAM.gov integration to help you discover the perfect opportunities. Stay tuned for this exciting feature!"
        icon={Sparkles}
      />
    </MobileContainer>
  );
}
