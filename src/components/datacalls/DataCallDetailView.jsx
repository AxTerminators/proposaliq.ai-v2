import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  ClipboardList,
  Calendar,
  User,
  Building2,
  Handshake,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Mail,
  Edit,
  Download,
  Paperclip,
  Activity,
  Users,
  ExternalLink,
  RefreshCw,
  FileText,
  Shield
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import moment from "moment";
import { toast } from "sonner";
import DataCallEditor from "./DataCallEditor";
import FilePreviewModal from "./FilePreviewModal";
import DataCallStatusWorkflow from "./DataCallStatusWorkflow";
import DataCallDiscussionPanel from "./DataCallDiscussionPanel";
import DataCallChecklistComments from "./DataCallChecklistComments";
import DataCallExportDialog from "./DataCallExportDialog";
import DataCallApprovalWorkflow from "./DataCallApprovalWorkflow";
import DataCallCalendarIntegration from "./DataCallCalendarIntegration";
import DataCallTimePrediction from "./DataCallTimePrediction";
import DataCallAuditTrail from "./DataCallAuditTrail";
import { logDataCallAction, DataCallAuditActions, isSensitiveDataCall } from "./DataCallAuditLogger";

export default function DataCallDetailView({ 
  dataCallId, 
  isOpen, 
  onClose,
  organization,
  proposals = []
}) {
  const queryClient = useQueryClient();
  const [showEditor, setShowEditor] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showApprovalWorkflow, setShowApprovalWorkflow] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: dataCall, isLoading } = useQuery({
    queryKey: ['data-call-detail', dataCallId],
    queryFn: async () => {
      if (!dataCallId) return null;
      const results = await base44.entities.DataCallRequest.filter({ id: dataCallId });
      const dc = results[0] || null;
      
      // Log view action
      if (dc && user) {
        const isSensitive = isSensitiveDataCall(dc);
        await logDataCallAction(
          isSensitive ? DataCallAuditActions.SENSITIVE_DATA_ACCESSED : DataCallAuditActions.VIEWED,
          dc,
          user,
          { ip_address: 'browser' }
        );
      }
      
      return dc;
    },
    enabled: !!dataCallId && isOpen
  });

  const { data: uploadedFiles = [] } = useQuery({
    queryKey: ['data-call-files', dataCallId],
    queryFn: async () => {
      if (!dataCallId) return [];
      return base44.entities.ClientUploadedFile.filter({
        data_call_request_id: dataCallId
      });
    },
    enabled: !!dataCallId && isOpen
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await queryClient.invalidateQueries({ queryKey: ['data-call-detail', dataCallId] });
      await queryClient.invalidateQueries({ queryKey: ['data-call-files', dataCallId] });
      await queryClient.invalidateQueries({ queryKey: ['all-data-calls'] });
    },
    onSuccess: () => {
      toast.success('Data refreshed!');
    }
  });

  const copyPortalLink = async () => {
    if (!dataCall) return;
    const baseUrl = window.location.origin;
    const portalUrl = `${baseUrl}/client-data-call?token=${dataCall.access_token}&id=${dataCall.id}`;
    
    navigator.clipboard.writeText(portalUrl);
    toast.success('Portal link copied to clipboard!');
    
    // Log audit action
    if (user) {
      await logDataCallAction(DataCallAuditActions.PORTAL_LINK_COPIED, dataCall, user);
    }
  };

  const sendReminderEmail = async () => {
    try {
      await base44.functions.invoke('sendDataCallReminder', {
        data_call_id: dataCallId
      });
      toast.success('Reminder email sent!');
      refreshMutation.mutate();
    } catch (error) {
      toast.error('Failed to send reminder: ' + error.message);
    }
  };

  const downloadAllFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast.info('No files to download');
      return;
    }

    toast.info(`Downloading ${uploadedFiles.length} file(s)...`);

    for (const file of uploadedFiles) {
      const link = document.createElement('a');
      link.href = file.file_url;
      link.download = file.file_name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    toast.success('All files downloaded!');
    
    // Log audit action
    if (user && dataCall) {
      await logDataCallAction(
        DataCallAuditActions.FILES_DOWNLOADED,
        dataCall,
        user,
        { files_count: uploadedFiles.length }
      );
    }
  };

  const openFilePreview = (file) => {
    setSelectedFile(file);
    setShowFilePreview(true);
  };

  const getRecipientDisplay = (dataCall) => {
    if (!dataCall) return { icon: User, text: '' };
    
    if (dataCall.recipient_type === 'client_organization') {
      return { icon: Building2, text: `Client: ${dataCall.assigned_to_name || dataCall.assigned_to_email}` };
    } else if (dataCall.recipient_type === 'internal_team_member') {
      return { icon: Users, text: `Internal: ${dataCall.assigned_to_name || dataCall.assigned_to_email}` };
    } else {
      return { icon: Handshake, text: `Partner: ${dataCall.assigned_to_name || dataCall.assigned_to_email}` };
    }
  };

  const getProposalName = (proposalId) => {
    if (!proposalId) return null;
    const proposal = proposals.find(p => p.id === proposalId);
    return proposal?.proposal_name;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-600';
      case 'in_progress': return 'bg-blue-600';
      case 'partially_completed': return 'bg-amber-600';
      case 'overdue': return 'bg-red-600';
      case 'sent': return 'bg-indigo-600';
      case 'draft': return 'bg-slate-600';
      default: return 'bg-slate-600';
    }
  };

  if (!isOpen) return null;

  const recipient = getRecipientDisplay(dataCall);
  const RecipientIcon = recipient.icon;
  const proposalName = getProposalName(dataCall?.proposal_id);

  const completedItems = dataCall?.checklist_items?.filter(item => 
    item.status === 'completed' || item.status === 'not_applicable'
  ).length || 0;
  const totalItems = dataCall?.checklist_items?.length || 0;
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">
                  {dataCall?.request_title || 'Data Call Request'}
                </DialogTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {dataCall && (
                    <>
                      <Badge className={getStatusColor(dataCall.overall_status)}>
                        {dataCall.overall_status}
                      </Badge>
                      <Badge className={`${
                        dataCall.priority === 'urgent' ? 'bg-red-500' : 
                        dataCall.priority === 'high' ? 'bg-orange-500' : 
                        'bg-slate-500'
                      }`}>
                        {dataCall.priority}
                      </Badge>
                      <span className="text-sm text-slate-600 flex items-center gap-1">
                        <RecipientIcon className="w-4 h-4" />
                        {recipient.text}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditor(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportDialog(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Export
                </Button>
                {user?.role === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAuditTrail(true)}
                    className="border-red-300 hover:bg-red-50"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Audit
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : !dataCall ? (
            <div className="py-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-600">Data call not found</p>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              {/* Quick Actions Bar */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPortalLink}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Portal Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={sendReminderEmail}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reminder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAllFiles}
                  disabled={uploadedFiles.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All Files ({uploadedFiles.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportDialog(true)}
                >
                  <FileQuestion className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <a
                  href={`${window.location.origin}/client-data-call?token=${dataCall.access_token}&id=${dataCall.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Portal
                  </Button>
                </a>
              </div>

              {/* Overview Cards */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Due Date</p>
                        <p className={`font-semibold ${
                          dataCall.due_date && new Date(dataCall.due_date) < new Date() && dataCall.overall_status !== 'completed'
                            ? 'text-red-600'
                            : 'text-slate-900'
                        }`}>
                          {dataCall.due_date ? moment(dataCall.due_date).format('MMM D, YYYY') : 'Not set'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Last Access</p>
                        <p className="font-semibold text-slate-900">
                          {dataCall.last_portal_access ? moment(dataCall.last_portal_access).fromNow() : 'Never'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Created By</p>
                        <p className="font-semibold text-slate-900 truncate">
                          {dataCall.created_by_name || dataCall.created_by_email}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Overview & AI Prediction */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Overall Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">
                          {completedItems} of {totalItems} items completed
                        </span>
                        <span className="text-lg font-bold text-blue-600">
                          {Math.round(progressPercentage)}%
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-3" />
                    </div>
                  </CardContent>
                </Card>

                <DataCallTimePrediction
                  dataCall={dataCall}
                  organization={organization}
                />
              </div>

              <Tabs defaultValue="checklist" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="checklist">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Checklist
                  </TabsTrigger>
                  <TabsTrigger value="files">
                    <Paperclip className="w-4 h-4 mr-2" />
                    Files ({uploadedFiles.length})
                  </TabsTrigger>
                  <TabsTrigger value="discussion">
                    Discussion
                  </TabsTrigger>
                  <TabsTrigger value="activity">
                    <Activity className="w-4 h-4 mr-2" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger value="details">
                    <FileQuestion className="w-4 h-4 mr-2" />
                    Details
                  </TabsTrigger>
                </TabsList>

                {/* Checklist Tab */}
                <TabsContent value="checklist" className="space-y-3 mt-4">
                  {dataCall.checklist_items.map((item, index) => {
                    const itemFiles = uploadedFiles.filter(f => f.data_call_item_id === item.id);
                    
                    return (
                      <Card key={item.id} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {item.status === 'completed' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : item.status === 'not_applicable' ? (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                                  <span className="text-xs text-slate-500">N/A</span>
                                </div>
                              ) : (
                                <Clock className="w-5 h-5 text-amber-500" />
                              )}
                            </div>

                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-slate-900">
                                    {index + 1}. {item.item_label}
                                    {item.is_required && (
                                      <Badge className="ml-2 bg-red-100 text-red-700 text-xs">Required</Badge>
                                    )}
                                  </h4>
                                  {item.item_description && (
                                    <p className="text-sm text-slate-600 mt-1">{item.item_description}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {user && (
                                    <DataCallChecklistComments
                                      dataCall={dataCall}
                                      checklistItemId={item.id}
                                      user={user}
                                    />
                                  )}
                                  <Badge className={
                                    item.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    item.status === 'not_applicable' ? 'bg-slate-100 text-slate-700' :
                                    'bg-amber-100 text-amber-700'
                                  }>
                                    {item.status}
                                  </Badge>
                                </div>
                              </div>

                              {item.submitted_notes && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
                                  <p className="text-xs font-semibold text-blue-900 mb-1">Submission Notes:</p>
                                  <p className="text-sm text-blue-800">{item.submitted_notes}</p>
                                </div>
                              )}

                              {itemFiles.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-slate-700 mb-2">
                                    Uploaded Files ({itemFiles.length}):
                                  </p>
                                  <div className="space-y-2">
                                    {itemFiles.map(file => (
                                      <div
                                        key={file.id}
                                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-all cursor-pointer group"
                                        onClick={() => openFilePreview(file)}
                                      >
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <Paperclip className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                          <span className="text-sm text-slate-900 truncate">{file.file_name}</span>
                                          <span className="text-xs text-slate-500">
                                            ({(file.file_size / 1024).toFixed(1)} KB)
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="opacity-0 group-hover:opacity-100"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(file.file_url, '_blank');
                                          }}
                                        >
                                          <Download className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>

                {/* Files Tab */}
                <TabsContent value="files" className="space-y-3 mt-4">
                  {uploadedFiles.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Paperclip className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p className="text-slate-600">No files uploaded yet</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {uploadedFiles.map(file => (
                        <Card
                          key={file.id}
                          className="hover:shadow-lg transition-all cursor-pointer group"
                          onClick={() => openFilePreview(file)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Paperclip className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{file.file_name}</p>
                                <p className="text-xs text-slate-500">
                                  {(file.file_size / 1024).toFixed(1)} KB • {moment(file.created_date).format('MMM D, YYYY')}
                                </p>
                                {file.description && (
                                  <p className="text-sm text-slate-600 mt-1">{file.description}</p>
                                )}
                                <p className="text-xs text-blue-600 mt-1">
                                  Uploaded by: {file.uploaded_by_name || file.uploaded_by_email}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(file.file_url, '_blank');
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Discussion Tab */}
                <TabsContent value="discussion" className="mt-4">
                  {user && <DataCallDiscussionPanel dataCall={dataCall} user={user} />}
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="space-y-3 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Data Call Created</p>
                        <p className="text-xs text-slate-600">
                          {moment(dataCall.created_date).format('MMM D, YYYY [at] h:mm A')}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          By: {dataCall.created_by_name || dataCall.created_by_email}
                        </p>
                      </div>
                    </div>

                    {dataCall.sent_date && (
                      <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Mail className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Notification Sent</p>
                          <p className="text-xs text-slate-600">
                            {moment(dataCall.sent_date).format('MMM D, YYYY [at] h:mm A')}
                          </p>
                        </div>
                      </div>
                    )}

                    {dataCall.last_portal_access && (
                      <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <ExternalLink className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Portal Accessed</p>
                          <p className="text-xs text-slate-600">
                            {moment(dataCall.last_portal_access).format('MMM D, YYYY [at] h:mm A')}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            {dataCall.portal_accessed_count || 0} total visit(s)
                          </p>
                        </div>
                      </div>
                    )}

                    {dataCall.reminder_sent_count > 0 && (
                      <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Mail className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Reminder(s) Sent ({dataCall.reminder_sent_count})
                          </p>
                          {dataCall.last_reminder_sent && (
                            <p className="text-xs text-slate-600">
                              Last: {moment(dataCall.last_reminder_sent).format('MMM D, YYYY [at] h:mm A')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {dataCall.completed_date && (
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-green-900">Completed</p>
                          <p className="text-xs text-green-700">
                            {moment(dataCall.completed_date).format('MMM D, YYYY [at] h:mm A')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-4 mt-4">
                  {dataCall.request_description && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {dataCall.request_description}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {proposalName && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Related Proposal</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-slate-900">{proposalName}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Request Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Request Type</p>
                          <Badge className="capitalize">{dataCall.request_type?.replace('_', ' ')}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Recipient Type</p>
                          <Badge className="capitalize">{dataCall.recipient_type?.replace('_', ' ')}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Created</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {moment(dataCall.created_date).format('MMM D, YYYY')}
                          </p>
                        </div>
                        {dataCall.token_expires_at && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Token Expires</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {moment(dataCall.token_expires_at).format('MMM D, YYYY')}
                            </p>
                          </div>
                        )}
                      </div>

                      {dataCall.notes && (
                        <div className="pt-3 border-t">
                          <p className="text-xs font-semibold text-slate-700 mb-2">Internal Notes</p>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">{dataCall.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Status Workflow */}
                  <DataCallStatusWorkflow
                    dataCall={dataCall}
                    onStatusChange={() => refreshMutation.mutate()}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Editor Dialog */}
      {dataCall && (
        <DataCallEditor
          isOpen={showEditor}
          onClose={() => setShowEditor(false)}
          dataCall={dataCall}
          organization={organization}
          onSave={() => {
            setShowEditor(false);
            refreshMutation.mutate();
          }}
        />
      )}

      {/* File Preview */}
      {selectedFile && (
        <FilePreviewModal
          isOpen={showFilePreview}
          onClose={() => {
            setShowFilePreview(false);
            setSelectedFile(null);
          }}
          file={selectedFile}
        />
      )}

      {/* Export Dialog */}
      {dataCall && (
        <DataCallExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          dataCall={dataCall}
        />
      )}

      {/* Approval Workflow */}
      {dataCall && user && organization && (
        <DataCallApprovalWorkflow
          isOpen={showApprovalWorkflow}
          onClose={() => setShowApprovalWorkflow(false)}
          dataCall={dataCall}
          organization={organization}
          user={user}
          onApprovalComplete={() => refreshMutation.mutate()}
        />
      )}

      {/* Audit Trail */}
      {dataCall && (
        <DataCallAuditTrail
          dataCallId={dataCall.id}
          isOpen={showAuditTrail}
          onClose={() => setShowAuditTrail(false)}
        />
      )}
    </>
  );
}