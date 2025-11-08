
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, Table, BarChart3, Zap, AlertCircle, RefreshCw, Database, Building2, Activity, X, Layers } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProposalsKanban from "@/components/proposals/ProposalsKanban";
import ProposalsList from "@/components/proposals/ProposalsList";
import ProposalsTable from "@/components/proposals/ProposalsTable";
import PipelineAnalytics from "@/components/analytics/PipelineAnalytics";
import SnapshotGenerator from "@/components/analytics/SnapshotGenerator";
import SmartAutomationEngine from "@/components/automation/SmartAutomationEngine";
import AIWorkflowSuggestions from "@/components/automation/AIWorkflowSuggestions";
import AutomationExecutor from "@/components/automation/AutomationExecutor";
import MobileKanbanView from "@/components/mobile/MobileKanbanView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SampleDataGuard from "@/components/ui/SampleDataGuard";
import PredictiveHealthDashboard from "@/components/proposals/PredictiveHealthDashboard";

export default function Pipeline() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("kanban");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSampleDataGuard, setShowSampleDataGuard] = useState(false);
  const [showHealthDashboard, setShowHealthDashboard] = useState(null);
  const [selectedBoardId, setSelectedBoardId] = useState(null);

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

  // Fetch ALL kanban boards for this organization
  const { data: allBoards = [], isLoading: isLoadingBoards } = useQuery({
    queryKey: ['all-kanban-boards', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      console.log('[Pipeline] Fetching all boards for org:', organization.id);
      const boards = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        'board_name' // Sort by board_type to get master first
      );
      console.log('[Pipeline] Found boards:', boards.length);
      return boards;
    },
    enabled: !!organization?.id,
    staleTime: 60000,
    retry: 1,
  });

  // Auto-select master board or first board on load
  useEffect(() => {
    if (allBoards.length > 0 && !selectedBoardId) {
      const masterBoard = allBoards.find(b => b.is_master_board === true);
      const boardToSelect = masterBoard || allBoards[0];
      console.log('[Pipeline] Auto-selecting board:', boardToSelect.board_name);
      setSelectedBoardId(boardToSelect.id);
    }
  }, [allBoards, selectedBoardId]);

  // Get the selected board config
  const selectedBoard = allBoards.find(b => b.id === selectedBoardId);

  // Fetch proposals with better error handling and retry
  const { data: proposals = [], isLoading: isLoadingProposals, error: proposalsError, refetch: refetchProposals } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        console.log('[Pipeline] No organization ID, skipping proposal fetch');
        return [];
      }
      console.log('[Pipeline] Fetching proposals for org:', organization.id);
      const results = await base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
      console.log('[Pipeline] Fetched proposals:', results.length);
      return results || [];
    },
    enabled: !!organization?.id,
    staleTime: 10000,
    retry: 3,
    retryDelay: 1000,
    initialData: [],
  });

  // Filter proposals based on selected board
  const filteredProposals = useMemo(() => {
    if (!selectedBoard || !proposals) return proposals;
    
    // Master board shows all proposals
    if (selectedBoard.is_master_board) {
      return proposals;
    }
    
    // Type-specific boards filter by proposal_type_category
    if (selectedBoard.applies_to_proposal_types && selectedBoard.applies_to_proposal_types.length > 0) {
      return proposals.filter(p => 
        selectedBoard.applies_to_proposal_types.includes(p.proposal_type_category)
      );
    }
    
    return proposals;
  }, [proposals, selectedBoard]);

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

  // Force refetch when organization changes
  useEffect(() => {
    if (organization?.id) {
      console.log('[Pipeline] Organization changed, refetching data');
      refetchProposals();
      // No refetchConfig() needed here anymore, as allBoards handles board fetching.
    }
  }, [organization?.id, refetchProposals]);

  const handleCreateProposal = () => {
    // Check if user is using sample data
    if (user?.using_sample_data === true) {
      setShowSampleDataGuard(true);
    } else {
      navigate(createPageUrl("ProposalBuilder"));
    }
  };

  const proceedToProposalBuilder = () => {
    navigate(createPageUrl("ProposalBuilder"));
  };

  const handleGenerateSampleData = async () => {
    if (confirm('Generate sample proposal data for testing?')) {
      try {
        await base44.functions.invoke('generateSampleData', {});
        alert('Sample data generated! Refreshing...');
        refetchProposals();
        // No refetchConfig() needed here anymore. allBoards query will be re-evaluated.
      } catch (error) {
        console.error('Error generating sample data:', error);
        alert('Error generating sample data: ' + error.message);
      }
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

  const showDataRecovery = filteredProposals.length === 0 && !isLoadingProposals;
  // Only show "Generate Sample Data" if organization is sample data
  const canGenerateSampleData = organization?.is_sample_data === true;

  return (
    <div className="p-6 space-y-6 flex flex-col h-screen">
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
                  {canGenerateSampleData && (
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
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1 lg:mb-2">Proposal Board</h1>
              <p className="text-sm lg:text-base text-slate-600">Manage your active proposals</p>
            </div>
            
            {/* Board Switcher */}
            {allBoards.length > 1 && (
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-slate-500" />
                <Select value={selectedBoardId || ""} onValueChange={setSelectedBoardId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select board..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allBoards.map(board => (
                      <SelectItem key={board.id} value={board.id}>
                        {board.is_master_board && "⭐ "}
                        {board.board_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 lg:gap-3 w-full lg:w-auto items-center">
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

      {showHealthDashboard && (
        <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-purple-600" />
                Predictive Health Analysis
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHealthDashboard(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PredictiveHealthDashboard
              proposal={showHealthDashboard}
              organization={organization}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex-1 overflow-hidden">
        {isLoadingProposals || isLoadingBoards ? (
          <div className="flex items-center justify-center h-full p-6">
            <Card className="max-w-md border-none shadow-xl">
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Loading your pipeline...</h3>
                <p className="text-sm text-slate-600">
                  {isLoadingBoards ? "Loading boards..." : "Loading proposals..."}
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
                  proposals={filteredProposals}
                  automationRules={automationRules}
                />
                <SmartAutomationEngine organization={organization} />
              </div>
            )}

            {!isMobile && showAnalytics && (
              <div className="p-6 space-y-6 overflow-y-auto max-h-full">
                <SnapshotGenerator organization={organization} proposals={filteredProposals} />
                <PipelineAnalytics organization={organization} proposals={filteredProposals} />
              </div>
            )}

            {!showAutomation && !showAnalytics && (
              <>
                {isMobile ? (
                  <div className="p-4">
                    <MobileKanbanView proposals={filteredProposals} columns={selectedBoard?.columns || []} />
                  </div>
                ) : (
                  <>
                    {viewMode === "kanban" && (
                      <ProposalsKanban 
                        proposals={filteredProposals} 
                        organization={organization} 
                        user={user}
                        kanbanConfig={selectedBoard}
                        onRefresh={() => {
                          refetchProposals();
                        }}
                      />
                    )}
                    {viewMode === "list" && (
                      <div className="p-6">
                        <ProposalsList proposals={filteredProposals} organization={organization} />
                      </div>
                    )}
                    {viewMode === "table" && (
                      <div className="p-6">
                        <ProposalsTable proposals={filteredProposals} organization={organization} />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      <SampleDataGuard
        isOpen={showSampleDataGuard}
        onClose={() => setShowSampleDataGuard(false)}
        onProceed={proceedToProposalBuilder}
      />
    </div>
  );
}
