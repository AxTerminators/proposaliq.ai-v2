import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LayoutGrid, List, Table, BarChart3, Zap, Smartphone, AlertCircle, RefreshCw } from "lucide-react";
import ProposalsKanban from "../components/proposals/ProposalsKanban";
import ProposalsList from "../components/proposals/ProposalsList";
import ProposalsTable from "../components/proposals/ProposalsTable";
import ProposalCardModal from "../components/proposals/ProposalCardModal";
import PipelineAnalytics from "../components/analytics/PipelineAnalytics";
import SnapshotGenerator from "../components/analytics/SnapshotGenerator";
import SmartAutomationEngine from "../components/automation/SmartAutomationEngine";
import AIWorkflowSuggestions from "../components/automation/AIWorkflowSuggestions";
import AutomationExecutor from "../components/automation/AutomationExecutor";
import MobileKanbanView from "../components/mobile/MobileKanbanView";
import { Card, CardContent } from "@/components/ui/card";

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

export default function Pipeline() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [viewMode, setViewMode] = useState("kanban");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAutomation, setShowAutomation] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [loadingError, setLoadingError] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingError(null);
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const org = await getUserActiveOrganization(currentUser);
        if (org) {
          setOrganization(org);
        } else {
          setLoadingError("No organization found. Please complete your onboarding.");
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setLoadingError(error.message || "Failed to load organization data");
      }
    };
    loadData();
  }, []);

  const { data: proposals = [], isLoading, error: proposalsError, refetch } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id,
    initialData: [],
    retry: 3,
    retryDelay: 1000,
  });

  // Fetch automation rules for executor
  const { data: automationRules = [] } = useQuery({
    queryKey: ['automation-rules', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalAutomationRule.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id,
    initialData: []
  });

  // Fetch kanban columns config for mobile view
  const { data: kanbanConfig } = useQuery({
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
    enabled: !!organization?.id
  });

  const handleCreateProposal = () => {
    navigate(createPageUrl("ProposalBuilder"));
  };

  const handleRetry = () => {
    setLoadingError(null);
    refetch();
  };

  // Show loading error
  if (loadingError || proposalsError) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Unable to Load Pipeline</h2>
            <p className="text-lg text-slate-600 mb-6">
              {loadingError || proposalsError?.message || "An error occurred while loading your pipeline"}
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

  if (!organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <LayoutGrid className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Loading Pipeline</h2>
            <p className="text-lg text-slate-600">
              Please wait while we load your organization data...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const columns = kanbanConfig?.columns || [
    { id: 'evaluating', label: 'Evaluating', emoji: '🔍', type: 'default_status', default_status_mapping: 'evaluating' },
    { id: 'watch_list', label: 'Watch List', emoji: '👀', type: 'default_status', default_status_mapping: 'watch_list' },
    { id: 'draft', label: 'Draft', emoji: '📝', type: 'default_status', default_status_mapping: 'draft' },
    { id: 'in_progress', label: 'In Progress', emoji: '⚡', type: 'default_status', default_status_mapping: 'in_progress' },
    { id: 'submitted', label: 'Submitted', emoji: '📤', type: 'default_status', default_status_mapping: 'submitted' },
    { id: 'won', label: 'Won', emoji: '🏆', type: 'default_status', default_status_mapping: 'won' },
    { id: 'lost', label: 'Lost', emoji: '❌', type: 'default_status', default_status_mapping: 'lost' },
    { id: 'archived', label: 'Archived', emoji: '📦', type: 'default_status', default_status_mapping: 'archived' }
  ];

  return (
    <>
      {/* Background Automation Executor */}
      <AutomationExecutor 
        organization={organization} 
        proposals={proposals} 
        automationRules={automationRules}
      />

      {/* Header - Fixed */}
      <div className="flex-shrink-0 p-4 lg:p-6 border-b bg-white">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-1 lg:mb-2">Proposal Pipeline</h1>
            <p className="text-sm lg:text-base text-slate-600">Track all your proposals across stages</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:gap-3 w-full lg:w-auto items-center">
            {!isMobile && (
              <>
                <Button
                  variant={showAutomation ? "default" : "outline"}
                  onClick={() => setShowAutomation(!showAutomation)}
                  size="sm"
                  className="h-9"
                  title={showAutomation ? "Hide automation panel" : "Show automation panel"}
                >
                  <Zap className="w-4 h-4 mr-2" title="Automation" />
                  {showAutomation ? 'Hide' : 'Show'} Automation
                </Button>
                <Button
                  variant={showAnalytics ? "default" : "outline"}
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  size="sm"
                  className="h-9"
                  title={showAnalytics ? "Hide analytics panel" : "Show analytics panel"}
                >
                  <BarChart3 className="w-4 h-4 mr-2" title="Analytics" />
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
                title="Kanban board view"
              >
                <LayoutGrid className="w-4 h-4" title="Kanban view" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("list")}
                title="List view"
              >
                <List className="w-4 h-4" title="List view" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8"
                onClick={() => setViewMode("table")}
                title="Table view"
              >
                <Table className="w-4 h-4" title="Table view" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Flexible */}
      <div className="flex-1 overflow-hidden">
        {/* Desktop: Show Automation/Analytics panels */}
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
            {/* Mobile View */}
            {isMobile ? (
              <div className="p-4">
                <MobileKanbanView proposals={proposals} columns={columns} />
              </div>
            ) : (
              /* Desktop Views */
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
      </div>
    </>
  );
}