import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  FileQuestion,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  ExternalLink,
  Mail,
  Copy,
  Calendar,
  User
} from "lucide-react";
import moment from "moment";
import { toast } from "sonner";

export default function DataCallReviewer({ proposal, organization }) {
  const { data: dataCallRequests = [], isLoading } = useQuery({
    queryKey: ['data-call-requests', proposal?.id, organization?.id],
    queryFn: async () => {
      const query = proposal
        ? { proposal_id: proposal.id, organization_id: organization.id }
        : { organization_id: organization.id, request_type: 'general_library' };

      return base44.entities.DataCallRequest.filter(query, '-created_date');
    },
    enabled: !!organization?.id
  });

  const { data: uploadedFiles = [] } = useQuery({
    queryKey: ['client-uploaded-files', proposal?.id],
    queryFn: async () => {
      if (!proposal?.id) return [];
      return base44.entities.ClientUploadedFile.filter({
        proposal_id: proposal.id,
        file_category: 'data_call_response'
      }, '-created_date');
    },
    enabled: !!proposal?.id
  });

  const copyPortalLink = (dataCall) => {
    const baseUrl = window.location.origin;
    const portalUrl = `${baseUrl}/client-data-call?token=${dataCall.access_token}&id=${dataCall.id}`;
    
    navigator.clipboard.writeText(portalUrl);
    toast.success('Portal link copied to clipboard!');
  };

  const sendReminderEmail = async (dataCall) => {
    try {
      await base44.functions.invoke('sendDataCallReminder', {
        data_call_id: dataCall.id
      });
      toast.success('Reminder email sent successfully!');
    } catch (error) {
      toast.error('Failed to send reminder: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-600';
      case 'in_progress': return 'bg-blue-600';
      case 'partially_completed': return 'bg-amber-600';
      case 'overdue': return 'bg-red-600';
      default: return 'bg-slate-600';
    }
  };

  const getRecipientDisplay = (dataCall) => {
    if (dataCall.recipient_type === 'client_organization') {
      return `Client: ${dataCall.assigned_to_name || dataCall.assigned_to_email}`;
    } else if (dataCall.recipient_type === 'internal_team_member') {
      return `Internal: ${dataCall.assigned_to_name || dataCall.assigned_to_email}`;
    } else {
      return `Partner: ${dataCall.assigned_to_name || dataCall.assigned_to_email}`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">Loading data call requests...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileQuestion className="w-7 h-7 text-blue-600" />
            Data Call Requests
          </h2>
          <p className="text-slate-600 mt-1">
            Track and manage information requests
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {dataCallRequests.length} Request{dataCallRequests.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {dataCallRequests.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileQuestion className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Data Calls Yet
            </h3>
            <p className="text-slate-600">
              Data call requests will appear here once created
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dataCallRequests.map((dataCall) => {
            const completedItems = dataCall.checklist_items.filter(item => 
              item.status === 'completed' || item.status === 'not_applicable'
            ).length;
            const totalItems = dataCall.checklist_items.length;
            const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

            return (
              <Card key={dataCall.id} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        {dataCall.request_title}
                      </CardTitle>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className={getStatusColor(dataCall.overall_status)}>
                          {dataCall.overall_status}
                        </Badge>
                        <span className="text-sm text-slate-600">
                          <User className="w-3 h-3 inline mr-1" />
                          {getRecipientDisplay(dataCall)}
                        </span>
                        {dataCall.due_date && (
                          <span className="text-sm text-slate-600">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Due {moment(dataCall.due_date).format('MMM D')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyPortalLink(dataCall)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendReminderEmail(dataCall)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Remind
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {dataCall.request_description && (
                    <p className="text-sm text-slate-700">{dataCall.request_description}</p>
                  )}

                  {/* Progress */}
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

                  {/* Checklist Summary */}
                  <div className="grid md:grid-cols-2 gap-3">
                    {dataCall.checklist_items.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border ${
                          item.status === 'completed' ? 'bg-green-50 border-green-200' :
                          item.status === 'not_applicable' ? 'bg-slate-50 border-slate-200' :
                          'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          ) : item.status === 'not_applicable' ? (
                            <AlertCircle className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {item.item_label}
                            </p>
                            {item.uploaded_files?.length > 0 && (
                              <p className="text-xs text-green-700">
                                {item.uploaded_files.length} file(s) uploaded
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Portal Access Info */}
                  <div className="bg-slate-50 rounded-lg p-4 text-sm">
                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <p className="text-slate-500">Portal Accessed</p>
                        <p className="font-semibold text-slate-900">
                          {dataCall.portal_accessed_count || 0} time{dataCall.portal_accessed_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {dataCall.last_portal_access && (
                        <div>
                          <p className="text-slate-500">Last Access</p>
                          <p className="font-semibold text-slate-900">
                            {moment(dataCall.last_portal_access).fromNow()}
                          </p>
                        </div>
                      )}
                      {dataCall.sent_date && (
                        <div>
                          <p className="text-slate-500">Sent Date</p>
                          <p className="font-semibold text-slate-900">
                            {moment(dataCall.sent_date).format('MMM D, YYYY')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}