
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, Table, BarChart3, Zap, AlertCircle, RefreshCw, Database, Building2, Trash2, Sparkles } from "lucide-react";
import ProposalsKanban from "@/components/proposals/ProposalsKanban";
import ProposalsList from "@/components/proposals/ProposalsList";
import ProposalsTable from "@/components/proposals/ProposalsTable";
import PipelineAnalytics from "@/components/analytics/PipelineAnalytics";
import SnapshotGenerator from "@/components/analytics/SnapshotGenerator";
import SmartAutomationEngine from "@/components/automation/SmartAutomationEngine";
import AIWorkflowSuggestions from "@/components/automation/AIWorkflowSuggestions";
import AutomationExecutor from "@/components/automation/AutomationExecutor";
import MobileKanbanView from "@/components/mobile/MobileKanbanView";
import { Card, CardContent } from "@/components/ui/card";
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

export default function Pipeline() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("kanban");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
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

  // Load user directly
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const currentUser = await base44.auth.me();
      return currentUser;
    },
    staleTime: 300000,
    retry: 1
  });

  // Load organization directly
  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['current-organization', user?.email],
    queryFn: async () => {
      if (!user) return null;
      
      let orgId = user.active_client_id;
      
      if (!orgId && user.client_accesses?.length > 0) {
        orgId = user.client_accesses[0].organization_id;
      }
      
      if (!orgId) {
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
    },
    enabled: !!user,
    staleTime: 300000,
    retry: 1
  });

  // Fetch proposals
  const { data: proposals = [], isLoading: isLoadingProposals, error: proposalsError, refetch: refetchProposals } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id,
    staleTime: 30000,
    retry: 1,
    initialData: [],
  });

  // Fetch kanban config
  const { data: kanbanConfig, isLoading: isLoadingConfig, refetch: refetchConfig } = useQuery({
    queryKey: ['kanban-config', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );
      return configs.length > 0 ? configs[0] : null;
    },
    enabled: !!organization?.id,
    staleTime: 60000,
    retry: 1,
  });

  // Fetch automation rules
  const { data: automationRules = [], refetch: refetchRules } = useQuery({
    queryKey: ['automation-rules', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalAutomationRule.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id,
    staleTime: 60000,
    retry: 1,
    initialData: [],
  });

  const handleCreateProposal = () => {
    // Check if user is using sample data
    if (user?.using_sample_data) {
      setShowSampleDataDialog(true);
    } else {
      navigate(createPageUrl("ProposalBuilder"));
    }
  };

  const handleGenerateSampleData = async () => {
    if (confirm('Generate sample proposal data for testing?')) {
      try {
        await base44.functions.invoke('generateSampleData', {});
        alert('Sample data generated! Refreshing...');
        refetchProposals();
        refetchConfig();
      } catch (error) {
        console.error('Error generating sample data:', error);
        alert('Error generating sample data: ' + error.message);
      }
    }
  };

  const handleClearAllData = async () => {
    setIsClearing(true);
    try {
      const result = await base44.functions.invoke('clearOrganizationProposals', {
        organization_id: organization.id
      });
      
      alert(`✅ Success! Cleared ${result.data.deletedCount.proposals} proposals and all related data from "${organization.organization_name}".`);
      
      // Refresh the page to show empty state
      window.location.reload();
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing data: ' + error.message);
    } finally {
      setIsClearing(false);
      setShowClearDialog(false);
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

  const handleRetry = () => {
    window.location.reload();
  };

  // Show error state
  if (proposalsError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Unable to Load Pipeline</h2>
            <p className="text-lg text-slate-600 mb-6">
              {proposalsError?.message || "An error occurred"}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleRetry} className="bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state
  if (isLoadingUser || isLoadingOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <LayoutGrid className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Loading Pipeline</h2>
            <p className="text-lg text-slate-600 mb-2">
              Setting up your workspace...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              <span>Please wait</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show "no organization" state
  if (!organization && !isLoadingOrg) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">No Organization Found</h2>
            <p className="text-lg text-slate-600 mb-6">
              You need to set up your organization before accessing the pipeline.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(createPageUrl("Onboarding"))} className="bg-blue-600 hover:bg-blue-700">
                <Building2 className="w-4 h-4 mr-2" />
                Set Up Organization
              </Button>
              <Button variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showDataRecovery = proposals.length === 0 && !isLoadingProposals;

  return (
    <>
      <AutomationExecutor 
        organization={organization} 
        proposals={proposals} 
        automationRules={automationRules}
      />

      {showDataRecovery && (
        <div className="bg-amber-50 border-b border-amber-200 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start gap-4">
              <Database className="w-8 h-8 text-amber-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-amber-900 mb-2">No Proposals Found</h3>
                <p className="text-amber-800 mb-4">
                  You're viewing <strong>"{organization.organization_name}"</strong> but there are no proposals yet.
                </p>
                
                <div className="flex gap-3">
                  <Button onClick={handleCreateProposal} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Proposal
                  </Button>
                  {!user?.using_sample_data && (
                    <Button onClick={handleGenerateSampleData} variant="outline" className="border-amber-300">
                      <Database className="w-4 h-4 mr-2" />
                      Generate Sample Data
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 p-4 lg:p-6 border-b bg-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1 lg:mb-2">Proposal Pipeline</h1>
            <p className="text-sm lg:text-base text-slate-600">Track all your proposals across stages</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:gap-3 w-full lg:w-auto items-center">
            {proposals.length > 0 && (
              <Button
                onClick={() => setShowClearDialog(true)}
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 h-9"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </Button>
            )}
            
            {!isMobile && (
              <>
                <Button
                  variant={showAutomation ? "default" : "outline"}
                  onClick={() => setShowAutomation(!showAutomation)}
                  size="sm"
                  className="h-9"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {showAutomation ? 'Hide' : 'Show'} Automation
                </Button>
                <Button
                  variant={showAnalytics ? "default" : "outline"}
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  size="sm"
                  className="h-9"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {showAnalytics ? 'Hide' : 'Show'} Analytics
                </Button>
              </>
            )}
            
            <div className="hidden lg:flex gap-1 border rounded-lg p-0.5 h-9 items-center">
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("table")}
              >
                <Table className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoadingProposals || isLoadingConfig ? (
          <div className="flex items-center justify-center h-full p-6">
            <Card className="max-w-md border-none shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading your pipeline...</h3>
                <p className="text-sm text-slate-600">
                  {isLoadingConfig ? "Setting up your board..." : "Loading proposals..."}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {!isMobile && showAutomation && (
              <div className="p-6 space-y-6 overflow-y-auto max-h-full">
                <AIWorkflowSuggestions 
                  organization={organization} 
                  proposals={proposals}
                  automationRules={automationRules}
                />
                <SmartAutomationEngine organization={organization} />
              </div>
            )}

            {!isMobile && showAnalytics && (
              <div className="p-6 space-y-6 overflow-y-auto max-h-full">
                <SnapshotGenerator organization={organization} proposals={proposals} />
                <PipelineAnalytics organization={organization} proposals={proposals} />
              </div>
            )}

            {!showAutomation && !showAnalytics && (
              <>
                {isMobile ? (
                  <div className="p-4">
                    <MobileKanbanView proposals={proposals} columns={kanbanConfig?.columns || []} />
                  </div>
                ) : (
                  <>
                    {viewMode === "kanban" && (
                      <ProposalsKanban proposals={proposals} organization={organization} user={user} />
                    )}
                    {viewMode === "list" && (
                      <div className="p-6">
                        <ProposalsList proposals={proposals} organization={organization} />
                      </div>
                    )}
                    {viewMode === "table" && (
                      <div className="p-6">
                        <ProposalsTable proposals={proposals} organization={organization} />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Clear All Data Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-red-600" />
              Clear All Proposals from {organization?.organization_name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4">
              <p className="text-base text-slate-700 font-medium">
                This will permanently delete all <span className="text-red-600 font-bold">{proposals.length} proposals</span> and ALL related data from "{organization?.organization_name}".
              </p>
              
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-red-900 font-bold mb-2">⚠️ This action CANNOT be undone!</p>
                <p className="text-red-800 text-sm">All proposal sections, tasks, comments, documents, analytics, and history will be permanently destroyed.</p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-900 font-semibold text-sm">
                  ✅ Your organization, team members, teaming partners, past performance, and resources will be preserved.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              disabled={isClearing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isClearing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Yes, Clear All {proposals.length} Proposals
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
