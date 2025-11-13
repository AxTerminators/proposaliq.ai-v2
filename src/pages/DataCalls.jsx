
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList,
  Plus,
  Calendar,
  User,
  Building2,
  Handshake,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Mail,
  ExternalLink,
  TrendingUp,
  Users,
  RefreshCw,
  Settings
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import moment from "moment";
import { toast } from "sonner";
import DataCallInitiator from "../components/datacalls/DataCallInitiator";
import DataCallAnalytics from "../components/datacalls/DataCallAnalytics";
import BulkDataCallActions from "../components/datacalls/BulkDataCallActions";
import DataCallDetailView from "../components/datacalls/DataCallDetailView";
import AdvancedDataCallFilters from "../components/datacalls/AdvancedDataCallFilters";
import RecurringDataCallManager from "../components/datacalls/RecurringDataCallManager";
import DataCallTemplateEditor from "../components/datacalls/DataCallTemplateEditor";
import EnhancedDataCallAnalytics from "../components/datacalls/EnhancedDataCallAnalytics";
import DataCallExportDialog from "../components/datacalls/DataCallExportDialog";
import DataCallVersionHistory from "../components/datacalls/DataCallVersionHistory";
import DataCallEmailTemplateManager from "../components/datacalls/DataCallEmailTemplateManager";

export default function DataCallsPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState("active");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedDataCallId, setSelectedDataCallId] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [showBatchExport, setShowBatchExport] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistoryDataCall, setVersionHistoryDataCall] = useState(null);
  const [showEmailTemplates, setShowEmailTemplates] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    recipientTypes: [],
    statuses: [],
    priorities: [],
    dateFrom: null,
    dateTo: null,
    hasOverdue: false
  });
  const [savedViews, setSavedViews] = useState([]);

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
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const { data: allDataCalls = [], isLoading } = useQuery({
    queryKey: ['all-data-calls', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.DataCallRequest.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals-for-datacalls', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter({ organization_id: organization.id });
    },
    enabled: !!organization?.id
  });

  // Apply filters
  const filteredDataCalls = React.useMemo(() => {
    let filtered = [...allDataCalls];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(dc =>
        dc.request_title?.toLowerCase().includes(searchLower) ||
        dc.request_description?.toLowerCase().includes(searchLower) ||
        dc.assigned_to_name?.toLowerCase().includes(searchLower) ||
        dc.assigned_to_email?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.recipientTypes?.length > 0) {
      filtered = filtered.filter(dc => filters.recipientTypes.includes(dc.recipient_type));
    }

    if (filters.statuses?.length > 0) {
      filtered = filtered.filter(dc => filters.statuses.includes(dc.overall_status));
    }

    if (filters.priorities?.length > 0) {
      filtered = filtered.filter(dc => filters.priorities.includes(dc.priority));
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(dc => 
        dc.due_date && new Date(dc.due_date) >= filters.dateFrom
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(dc => 
        dc.due_date && new Date(dc.due_date) <= filters.dateTo
      );
    }

    if (filters.hasOverdue) {
      filtered = filtered.filter(dc =>
        dc.due_date && 
        new Date(dc.due_date) < new Date() &&
        dc.overall_status !== 'completed'
      );
    }

    return filtered;
  }, [allDataCalls, filters]);

  const activeDataCalls = filteredDataCalls.filter(dc => 
    !['completed'].includes(dc.overall_status)
  );

  const overdueDataCalls = filteredDataCalls.filter(dc =>
    dc.due_date && 
    new Date(dc.due_date) < new Date() &&
    dc.overall_status !== 'completed'
  );

  const completedDataCalls = filteredDataCalls.filter(dc => 
    dc.overall_status === 'completed'
  );

  const getProposalName = (proposalId) => {
    if (!proposalId) return null;
    const proposal = proposals.find(p => p.id === proposalId);
    return proposal?.proposal_name;
  };

  const copyPortalLink = (dataCall) => {
    const baseUrl = window.location.origin;
    const portalUrl = `${baseUrl}/PublicDataCallPortal?token=${dataCall.access_token}&id=${dataCall.id}`;
    
    navigator.clipboard.writeText(portalUrl);
    toast.success('Portal link copied to clipboard!');
  };

  const sendReminderEmail = async (dataCall) => {
    try {
      const portalUrl = `${window.location.origin}/PublicDataCallPortal?token=${dataCall.access_token}&id=${dataCall.id}`;
      
      await base44.functions.invoke('sendDataCallReminder', {
        data_call_id: dataCall.id,
        portal_url: portalUrl
      });
      toast.success('Reminder email sent!');
      
      queryClient.invalidateQueries({ queryKey: ['all-data-calls'] });
    } catch (error) {
      toast.error('Failed to send reminder: ' + error.message);
    }
  };

  const getRecipientDisplay = (dataCall) => {
    if (dataCall.recipient_type === 'client_organization') {
      return { icon: Building2, text: `Client: ${dataCall.assigned_to_name || dataCall.assigned_to_email}` };
    } else if (dataCall.recipient_type === 'internal_team_member') {
      return { icon: Users, text: `Internal: ${dataCall.assigned_to_name || dataCall.assigned_to_email}` };
    } else {
      return { icon: Handshake, text: `Partner: ${dataCall.assigned_to_name || dataCall.assigned_to_email}` };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-600';
      case 'in_progress': return 'bg-blue-600';
      case 'partially_completed': return 'bg-amber-600';
      case 'overdue': return 'bg-red-600';
      case 'sent': return 'bg-indigo-600';
      default: return 'bg-slate-600';
    }
  };

  const openDetailView = (dataCall) => {
    setSelectedDataCallId(dataCall.id);
    setShowDetailView(true);
  };

  const openVersionHistory = (dataCall) => {
    setVersionHistoryDataCall(dataCall);
    setShowVersionHistory(true);
  };

  const renderDataCallCard = (dataCall) => {
    const completedItems = dataCall.checklist_items.filter(item => 
      item.status === 'completed' || item.status === 'not_applicable'
    ).length;
    const totalItems = dataCall.checklist_items.length;
    const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    const proposalName = getProposalName(dataCall.proposal_id);
    const recipient = getRecipientDisplay(dataCall);
    const RecipientIcon = recipient.icon;
    const isSelected = selectedIds.includes(dataCall.id);

    return (
      <Card 
        key={dataCall.id} 
        className={`border-2 hover:shadow-lg transition-all cursor-pointer ${
          isSelected ? 'border-blue-500 bg-blue-50' : ''
        }`}
        onClick={(e) => {
          if (!e.target.closest('input') && !e.target.closest('button')) {
            openDetailView(dataCall);
          }
        }}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => {
                  setSelectedIds(prev =>
                    prev.includes(dataCall.id)
                      ? prev.filter(id => id !== dataCall.id)
                      : [...prev, dataCall.id]
                  );
                }}
                className="mt-1"
              />
              <div className="flex-1">
                <CardTitle className="text-lg mb-2">
                  {dataCall.request_title}
                </CardTitle>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={getStatusColor(dataCall.overall_status)}>
                    {dataCall.overall_status}
                  </Badge>
                  <Badge className={`${dataCall.priority === 'urgent' ? 'bg-red-500' : dataCall.priority === 'high' ? 'bg-orange-500' : 'bg-slate-500'}`}>
                    {dataCall.priority}
                  </Badge>
                  <span className="text-sm text-slate-600 flex items-center gap-1">
                    <RecipientIcon className="w-3 h-3" />
                    {recipient.text}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  copyPortalLink(dataCall);
                }}
                title="Copy portal link"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  sendReminderEmail(dataCall);
                }}
                title="Send reminder"
              >
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {dataCall.request_description && (
            <p className="text-sm text-slate-700">{dataCall.request_description}</p>
          )}

          {proposalName && (
            <div className="flex items-center gap-2 text-sm">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <span className="text-slate-600">Proposal:</span>
              <span className="font-semibold text-slate-900">{proposalName}</span>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-3 text-sm">
            {dataCall.due_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-slate-500">Due Date</p>
                  <p className={`font-semibold ${
                    new Date(dataCall.due_date) < new Date() && dataCall.overall_status !== 'completed'
                      ? 'text-red-600'
                      : 'text-slate-900'
                  }`}>
                    {moment(dataCall.due_date).format('MMM D, YYYY')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-slate-500">Last Access</p>
                <p className="font-semibold text-slate-900">
                  {dataCall.last_portal_access
                    ? moment(dataCall.last_portal_access).fromNow()
                    : 'Never'
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <div>
                <p className="text-slate-500">Created By</p>
                <p className="font-semibold text-slate-900 truncate">
                  {dataCall.created_by_name || dataCall.created_by_email}
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                Progress: {completedItems}/{totalItems} items
              </span>
              <span className="text-sm text-slate-600">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {dataCall.checklist_items.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className={`p-2 rounded-lg border text-xs ${
                  item.status === 'completed' ? 'bg-green-50 border-green-200' :
                  item.status === 'not_applicable' ? 'bg-slate-50 border-slate-200' :
                  'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start gap-1.5">
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
                  )}
                  <span className="text-slate-900 truncate">{item.item_label}</span>
                </div>
              </div>
            ))}
            {dataCall.checklist_items.length > 6 && (
              <div className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-center text-slate-600">
                +{dataCall.checklist_items.length - 6} more
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!organization || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-blue-600" />
              Data Call Requests
            </h1>
            <p className="text-slate-600 mt-2">
              Request and manage information from clients, team members, and partners
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEmailTemplates(true)}
            >
              <Mail className="w-5 h-5 mr-2" />
              Email Templates
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Data Call
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Total Requests</p>
                  <p className="text-3xl font-bold text-slate-900">{allDataCalls.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Active</p>
                  <p className="text-3xl font-bold text-blue-600">{activeDataCalls.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Overdue</p>
                  <p className="text-3xl font-bold text-red-600">{overdueDataCalls.length}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-600">{completedDataCalls.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Filters */}
        <AdvancedDataCallFilters
          filters={filters}
          onFiltersChange={setFilters}
          savedViews={savedViews}
          onSaveView={(view) => setSavedViews([...savedViews, { ...view, id: Date.now().toString() }])}
          onLoadView={(view) => setFilters(view.filters)}
          onDeleteView={(id) => setSavedViews(savedViews.filter(v => v.id !== id))}
        />

        {/* Data Call Lists */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="active">
              Active ({activeDataCalls.length})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue ({overdueDataCalls.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedDataCalls.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              All ({filteredDataCalls.length})
            </TabsTrigger>
            <TabsTrigger value="recurring">
              <RefreshCw className="w-4 h-4 mr-2" />
              Recurring
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
              </div>
            ) : activeDataCalls.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    No Active Data Calls
                  </h3>
                  <p className="text-slate-600 mb-4">
                    Create a new data call request to get started
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Data Call
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeDataCalls.map(renderDataCallCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="overdue" className="space-y-4 mt-6">
            {overdueDataCalls.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    All Caught Up!
                  </h3>
                  <p className="text-slate-600">
                    No overdue data calls
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {overdueDataCalls.map(renderDataCallCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-6">
            {completedDataCalls.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-600">
                    No completed data calls yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedDataCalls.map(renderDataCallCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4 mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
              </div>
            ) : filteredDataCalls.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {allDataCalls.length === 0 ? 'No Data Calls Yet' : 'No Matching Data Calls'}
                  </h3>
                  <p className="text-slate-600 mb-4">
                    {allDataCalls.length === 0 
                      ? 'Create your first data call request'
                      : 'Try adjusting your filters'
                    }
                  </p>
                  {allDataCalls.length === 0 && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Data Call
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredDataCalls.map(renderDataCallCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recurring" className="mt-6">
            <RecurringDataCallManager organization={organization} user={user} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <EnhancedDataCallAnalytics organization={organization} />
          </TabsContent>
        </Tabs>
      </div>

      <DataCallInitiator
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        proposal={null}
        organization={organization}
        user={user}
      />

      <BulkDataCallActions
        dataCallsList={selectedTab === 'active' ? activeDataCalls :
                       selectedTab === 'overdue' ? overdueDataCalls :
                       selectedTab === 'completed' ? completedDataCalls :
                       filteredDataCalls}
        organization={organization}
        onExport={() => setShowBatchExport(true)}
      />

      <DataCallDetailView
        dataCallId={selectedDataCallId}
        isOpen={showDetailView}
        onClose={() => {
          setShowDetailView(false);
          setSelectedDataCallId(null);
        }}
        organization={organization}
        proposals={proposals}
      />

      <DataCallTemplateEditor
        isOpen={showTemplateEditor}
        onClose={() => setShowTemplateEditor(false)}
        organization={organization}
      />

      <DataCallExportDialog
        isOpen={showBatchExport}
        onClose={() => setShowBatchBatchExport(false)}
        selectedDataCalls={allDataCalls.filter(dc => selectedIds.includes(dc.id))}
      />

      <DataCallVersionHistory
        dataCall={versionHistoryDataCall}
        isOpen={showVersionHistory}
        onClose={() => {
          setShowVersionHistory(false);
          setVersionHistoryDataCall(null);
        }}
      />

      {/* Email Templates Manager */}
      <Dialog open={showEmailTemplates} onOpenChange={setShowEmailTemplates}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DataCallEmailTemplateManager organization={organization} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
