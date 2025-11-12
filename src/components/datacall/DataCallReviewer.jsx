import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  Download,
  Send,
  User,
  Building2,
  Handshake,
  Mail,
  Calendar,
  Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import moment from "moment";
import { toast } from "sonner";

export default function DataCallReviewer({ dataCallRequestId, trigger }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: dataCallRequest, isLoading } = useQuery({
    queryKey: ['data-call-request', dataCallRequestId],
    queryFn: async () => {
      const requests = await base44.entities.DataCallRequest.filter({
        id: dataCallRequestId
      });
      return requests[0] || null;
    },
    enabled: !!dataCallRequestId && isOpen,
  });

  const { data: uploadedFiles = [] } = useQuery({
    queryKey: ['data-call-files', dataCallRequestId],
    queryFn: async () => {
      return base44.entities.ClientUploadedFile.filter({
        data_call_request_id: dataCallRequestId
      });
    },
    enabled: !!dataCallRequestId && isOpen,
  });

  const markReviewedMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      
      return base44.entities.DataCallRequest.update(dataCallRequestId, {
        status: 'reviewed',
        reviewed_date: new Date().toISOString(),
        reviewed_by_email: user.email,
        reviewer_notes: reviewNotes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-call-request'] });
      toast.success('Data call marked as reviewed');
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('sendDataCallReminder', {
        data_call_request_id: dataCallRequestId
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to send reminder');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-call-request'] });
      toast.success('Reminder sent successfully!');
    },
    onError: (error) => {
      toast.error('Failed to send reminder: ' + error.message);
    }
  });

  const getRecipientDisplay = () => {
    if (!dataCallRequest) return '';
    
    if (dataCallRequest.recipient_type === 'client_organization') {
      return `${dataCallRequest.assigned_to_name} (Client)`;
    } else if (dataCallRequest.recipient_type === 'internal_team_member') {
      return `${dataCallRequest.assigned_to_name} (Internal)`;
    } else {
      return `${dataCallRequest.assigned_to_name} (Partner)`;
    }
  };

  const getRecipientIcon = () => {
    if (!dataCallRequest) return User;
    
    if (dataCallRequest.recipient_type === 'client_organization') return Building2;
    if (dataCallRequest.recipient_type === 'internal_team_member') return User;
    return Handshake;
  };

  const RecipientIcon = getRecipientIcon();

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {trigger}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Eye className="w-6 h-6 text-blue-600" />
              Review Data Call Submission
            </DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : dataCallRequest ? (
            <div className="space-y-6 py-4">
              {/* Status Overview */}
              <Card className={`border-2 ${
                dataCallRequest.status === 'submitted' || dataCallRequest.status === 'reviewed' 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-blue-300 bg-blue-50'
              }`}>
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Assigned To</p>
                      <div className="flex items-center gap-2">
                        <RecipientIcon className="w-4 h-4 text-slate-600" />
                        <span className="font-semibold">{getRecipientDisplay()}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{dataCallRequest.assigned_to_email}</p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500 mb-1">Due Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-600" />
                        <span className="font-semibold">
                          {dataCallRequest.due_date 
                            ? moment(dataCallRequest.due_date).format('MMM D, YYYY')
                            : 'No deadline'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500 mb-1">Progress</p>
                      <Progress value={dataCallRequest.completion_percentage || 0} className="h-2" />
                      <p className="text-xs text-slate-600 mt-1">
                        {Math.round(dataCallRequest.completion_percentage || 0)}% Complete
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500 mb-1">Status</p>
                      <Badge className={
                        dataCallRequest.status === 'reviewed' ? 'bg-purple-100 text-purple-700' :
                        dataCallRequest.status === 'submitted' ? 'bg-green-100 text-green-700' :
                        dataCallRequest.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }>
                        {dataCallRequest.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {dataCallRequest.first_accessed_date && (
                    <p className="text-xs text-slate-600 mt-4 pt-4 border-t">
                      First accessed: {moment(dataCallRequest.first_accessed_date).format('MMM D, YYYY h:mm A')}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Checklist Items with Files */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Submitted Items</h3>
                {dataCallRequest.checklist_items?.map((item) => {
                  const itemFiles = uploadedFiles.filter(f => f.data_call_item_id === item.id);
                  
                  return (
                    <Card key={item.id} className={item.submitted ? 'border-green-300' : 'border-slate-200'}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {item.submitted ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              ) : (
                                <Clock className="w-5 h-5 text-slate-400" />
                              )}
                              <h4 className="font-semibold">{item.item_name}</h4>
                              {item.is_required && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {itemFiles.length > 0 && (
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {itemFiles.map(file => (
                              <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{file.file_name}</p>
                                    <p className="text-xs text-slate-500">
                                      {(file.file_size / 1024 / 1024).toFixed(2)} MB • 
                                      Uploaded {moment(file.created_date).fromNow()}
                                    </p>
                                  </div>
                                </div>
                                <a
                                  href={file.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => {
                                    if (!file.viewed_by_consultant) {
                                      base44.entities.ClientUploadedFile.update(file.id, {
                                        viewed_by_consultant: true,
                                        viewed_date: new Date().toISOString()
                                      });
                                    }
                                  }}
                                >
                                  <Button size="sm" variant="outline">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </Button>
                                </a>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Review Actions */}
              {dataCallRequest.status === 'submitted' && (
                <Card className="border-2 border-purple-300 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Review Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add internal notes about the submission quality, completeness, next steps..."
                      rows={4}
                    />
                    <Button
                      onClick={() => markReviewedMutation.mutate()}
                      disabled={markReviewedMutation.isPending}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      {markReviewedMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Marking as Reviewed...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Mark as Reviewed
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Send Reminder */}
              {dataCallRequest.status !== 'submitted' && dataCallRequest.status !== 'reviewed' && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">Send Reminder</p>
                        <p className="text-sm text-slate-600">
                          {dataCallRequest.reminder_sent_count || 0} reminder(s) sent
                        </p>
                      </div>
                      <Button
                        onClick={() => sendReminderMutation.mutate()}
                        disabled={sendReminderMutation.isPending}
                        variant="outline"
                      >
                        {sendReminderMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Reminder
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              Data call request not found
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsOpen(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}