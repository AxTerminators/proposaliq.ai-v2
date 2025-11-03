import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, LayoutGrid, List, Table, BarChart3, Zap, Smartphone, AlertCircle, RefreshCw, Info, Database } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "../components/layout/OrganizationContext";

export default function Pipeline() {
  const navigate = useNavigate();
  const { user, organization, isLoading: isLoadingOrg, error: orgError } = useOrganization();
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
    if (organization) {
      console.log('=== PIPELINE DEBUG ===');
      console.log('Organization:', {
        id: organization.id,
        name: organization.organization_name,
        is_sample: organization.is_sample_data,
        created_by: organization.created_by
      });
    }
  }, [organization]);

  // Only fetch proposals once organization is fully loaded
  const { data: proposals = [], isLoading: isLoadingProposals, error: proposalsError, refetch } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        console.log('❌ No organization ID');
        return [];
      }
      
      console.log('🔍 Fetching proposals for org:', organization.id);
      
      // Wait 3 seconds to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const fetchedProposals = await base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
      
      console.log('✅ Fetched proposals:', {
        count: fetchedProposals.length,
        first_3: fetchedProposals.slice(0, 3).map(p => ({
          id: p.id,
          name: p.proposal_name,
          status: p.status
        }))
      });
      
      return fetchedProposals;
    },
    enabled: !!organization?.id && !isLoadingOrg,
    initialData: [],
    retry: 1,
    retryDelay: 5000,
    staleTime: 120000, // Cache for 2 minutes
    cacheTime: 600000, // Keep in cache for 10 minutes
  });

  // Fetch automation rules - only after proposals are loaded
  const { data: automationRules = [] } = useQuery({
    queryKey: ['automation-rules', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Wait 3 seconds to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return base44.entities.ProposalAutomationRule.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id && !isLoadingOrg && !isLoadingProposals,
    initialData: [],
    retry: 1,
    retryDelay: 5000,
    staleTime: 300000, // Cache for 5 minutes
  });

  // Fetch kanban config - only after proposals are loaded
  const { data: kanbanConfig } = useQuery({
    queryKey: ['kanban-config', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null;
      
      // Wait 3 seconds to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );
      return configs.length > 0 ? configs[0] : null;
    },
    enabled: !!organization?.id && !isLoadingOrg && !isLoadingProposals,
    retry: 1,
    retryDelay: 5000,
    staleTime: 300000,
  });

  const handleCreateProposal = () => {
    navigate(createPageUrl("ProposalBuilder"));
  };

  const handleGenerateSampleData = async () => {
    if (confirm('Generate sample proposal data for testing?')) {
      try {
        await base44.functions.invoke('generateSampleData', {});
        alert('Sample data generated! Refreshing...');
        window.location.reload();
      } catch (error) {
        console.error('Error generating sample data:', error);
        alert('Error generating sample data: ' + error.message);
      }
    }
  };

  const handleRetry = () => {
    refetch();
  };

  // Show loading error
  if (orgError || proposalsError) {
    const error = orgError || proposalsError;
    const isRateLimit = (error?.message || '').toLowerCase().includes('rate limit');
    
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Unable to Load Pipeline</h2>
            <p className="text-lg text-slate-600 mb-6">
              {isRateLimit 
                ? "Rate limit exceeded. Please wait 60 seconds before trying again."
                : error?.message || "An error occurred while loading your pipeline"}
            </p>
            {isRateLimit && (
              <p className="text-sm text-slate-500 mb-6">
                Too many requests. The system is now loading data more slowly to prevent this. Please wait a full minute before clicking retry.
              </p>
            )}
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

  if (isLoadingOrg || !organization || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-2xl border-none shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
              <LayoutGrid className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Loading Pipeline</h2>
            <p className="text-lg text-slate-600 mb-2">
              Please wait while we load your organization data...
            </p>
            <p className="text-sm text-slate-500">
              This may take 10-15 seconds to avoid rate limiting
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
                  You're viewing <strong>"{organization.organization_name}"</strong> but there are no proposals in this organization.
                </p>
                
                <div className="bg-white rounded-lg p-4 mb-4 border border-amber-200">
                  <h4 className="font-semibold text-slate-900 mb-2">Debug Information:</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-600">Organization ID:</span>
                      <p className="font-mono text-xs text-slate-900">{organization.id}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Organization Name:</span>
                      <p className="font-semibold text-slate-900">{organization.organization_name}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Is Sample Data:</span>
                      <p className="font-semibold text-slate-900">{organization.is_sample_data ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <span className="text-slate-600">Created By:</span>
                      <p className="font-mono text-xs text-slate-900">{organization.created_by}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-amber-200 mb-4">
                  <h4 className="font-semibold text-slate-900 mb-2">💡 What happened to my data?</h4>
                  <ul className="text-sm text-slate-700 space-y-2">
                    <li>• If you cleared sample data during onboarding, your test proposals were intentionally deleted</li>
                    <li>• You might be viewing a different organization than before</li>
                    <li>• This could be a new organization that you just created</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleCreateProposal} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Proposal
                  </Button>
                  <Button onClick={handleGenerateSampleData} variant="outline" className="border-amber-300">
                    <Database className="w-4 h-4 mr-2" />
                    Generate Sample Data
                  </Button>
                  <Button onClick={() => window.location.reload()} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Page
                  </Button>
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
                <MobileKanbanView proposals={proposals} columns={columns} />
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
      </div>
    </>
  );
}