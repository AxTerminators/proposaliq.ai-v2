import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LayoutGrid, List, Table, BarChart3, Zap } from "lucide-react";
import ProposalsKanban from "../components/proposals/ProposalsKanban";
import ProposalsList from "../components/proposals/ProposalsList";
import ProposalsTable from "../components/proposals/ProposalsTable";
import ProposalCardModal from "../components/proposals/ProposalCardModal";
import PipelineAnalytics from "../components/analytics/PipelineAnalytics";
import SnapshotGenerator from "../components/analytics/SnapshotGenerator";
import SmartAutomationEngine from "../components/automation/SmartAutomationEngine";
import AIWorkflowSuggestions from "../components/automation/AIWorkflowSuggestions";
import AutomationExecutor from "../components/automation/AutomationExecutor";

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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Background Automation Executor */}
      <AutomationExecutor 
        organization={organization} 
        proposals={proposals} 
        automationRules={automationRules}
      />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Proposal Pipeline</h1>
          <p className="text-slate-600">Track all your proposals across stages</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant={showAutomation ? "default" : "outline"}
            onClick={() => setShowAutomation(!showAutomation)}
          >
            <Zap className="w-4 h-4 mr-2" />
            {showAutomation ? 'Hide' : 'Show'} Automation
          </Button>
          <Button
            variant={showAnalytics ? "default" : "outline"}
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            {showAnalytics ? 'Hide' : 'Show'} Analytics
          </Button>
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <Table className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={handleCreateProposal}>
            <Plus className="w-5 h-5 mr-2" />
            New Proposal
          </Button>
        </div>
      </div>

      {showAutomation && (
        <div className="space-y-6">
          <AIWorkflowSuggestions 
            organization={organization} 
            proposals={proposals}
            automationRules={automationRules}
          />
          <SmartAutomationEngine organization={organization} />
        </div>
      )}

      {showAnalytics && (
        <div className="space-y-6">
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
          {viewMode === "kanban" && (
            <ProposalsKanban proposals={proposals} organization={organization} user={user} />
          )}
          {viewMode === "list" && (
            <ProposalsList proposals={proposals} organization={organization} />
          )}
          {viewMode === "table" && (
            <ProposalsTable proposals={proposals} organization={organization} />
          )}
        </>
      )}
    </div>
  );
}