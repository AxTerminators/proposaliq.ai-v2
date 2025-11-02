
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LayoutGrid, List, Table, BarChart3, Zap, Smartphone } from "lucide-react";
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

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id,
    initialData: []
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

  if (!organization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-32 w-32 rounded-xl" />
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
          <div className="flex flex-wrap gap-2 lg:gap-3 w-full lg:w-auto">
            {!isMobile && (
              <>
                <Button
                  variant={showAutomation ? "default" : "outline"}
                  onClick={() => setShowAutomation(!showAutomation)}
                  size="sm"
                  title={showAutomation ? "Hide automation panel" : "Show automation panel"}
                >
                  <Zap className="w-4 h-4 mr-2" title="Automation" />
                  {showAutomation ? 'Hide' : 'Show'} Automation
                </Button>
                <Button
                  variant={showAnalytics ? "default" : "outline"}
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  size="sm"
                  title={showAnalytics ? "Hide analytics panel" : "Show analytics panel"}
                >
                  <BarChart3 className="w-4 h-4 mr-2" title="Analytics" />
                  {showAnalytics ? 'Hide' : 'Show'} Analytics
                </Button>
              </>
            )}
            
            <div className="hidden lg:flex gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "kanban" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("kanban")}
                title="Kanban board view"
              >
                <LayoutGrid className="w-4 h-4" title="Kanban view" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                title="List view"
              >
                <List className="w-4 h-4" title="List view" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
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

        {isLoading ? (
          <div className="text-center py-12">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
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
