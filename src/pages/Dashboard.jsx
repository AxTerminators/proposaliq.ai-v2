
import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Plus, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [organization, setOrganization] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadUserAndOrg = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        
        if (orgs.length === 0) {
          navigate(createPageUrl("Onboarding"));
        } else {
          setOrganization(orgs[0]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUserAndOrg();
  }, [navigate]);

  // SECURITY FIX: Filter proposals by organization_id to ensure data isolation
  const { data: proposals, isLoading } = useQuery({
    queryKey: ['proposals', organization?.id],
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

  const stats = React.useMemo(() => {
    return {
      total: proposals.length,
      inProgress: proposals.filter(p => p.status === 'in_progress' || p.status === 'draft' || p.status === 'evaluating' || p.status === 'watch_list').length,
      submitted: proposals.filter(p => p.status === 'submitted').length,
      won: proposals.filter(p => p.status === 'won').length,
    };
  }, [proposals]);

  if (loading || !organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Skeleton className="h-32 w-32 rounded-xl mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back!
          </h1>
          <p className="text-slate-600">
            {organization.organization_name} Dashboard
          </p>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl("ProposalBuilder"))}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Proposal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Total Proposals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{stats.inProgress}</p>
            <p className="text-xs text-slate-500 mt-1">Active proposals</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Submitted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{stats.submitted}</p>
            <p className="text-xs text-slate-500 mt-1">Awaiting results</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.won}</p>
            <p className="text-xs text-slate-500 mt-1">Successful bids</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Proposals</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(createPageUrl("Proposals"))}
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : proposals.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-600 mb-4">No proposals yet</p>
                <Button 
                  onClick={() => navigate(createPageUrl("ProposalBuilder"))}
                  variant="outline"
                >
                  Create Your First Proposal
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.slice(0, 5).map((proposal) => (
                  <div
                    key={proposal.id}
                    className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`))}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-slate-900">{proposal.proposal_name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        proposal.status === 'won' ? 'bg-green-100 text-green-700' :
                        proposal.status === 'submitted' ? 'bg-purple-100 text-purple-700' :
                        proposal.status === 'in_progress' || proposal.status === 'draft' || proposal.status === 'evaluating' || proposal.status === 'watch_list' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {proposal.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{proposal.agency_name || 'No agency specified'}</p>
                    {proposal.due_date && (
                      <p className="text-xs text-slate-500 mt-1">
                        Due: {new Date(proposal.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate(createPageUrl("ProposalBuilder"))}
            >
              <Plus className="w-4 h-4 mr-2" />
              Start New Proposal
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate(createPageUrl("Chat"))}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Ask AI Assistant
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate(createPageUrl("Resources"))}
            >
              <FileText className="w-4 h-4 mr-2" />
              Manage Resources
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
