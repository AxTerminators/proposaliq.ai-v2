import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { cn } from "@/lib/utils";

export default function DataCallApprovalWorkflow({ 
  dataCall, 
  isOpen, 
  onClose,
  organization,
  user,
  onApprovalComplete
}) {
  const queryClient = useQueryClient();
  const [approvalDecision, setApprovalDecision] = useState('');
  const [approvalComments, setApprovalComments] = useState('');

  // Check if approval workflow exists for this data call
  const { data: workflow } = useQuery({
    queryKey: ['data-call-approval', dataCall?.id],
    queryFn: async () => {
      if (!dataCall?.id) return null;
      
      // Check if there's an approval workflow in notes
      if (!dataCall.notes) return null;
      
      try {
        const notesData = JSON.parse(dataCall.notes);
        return notesData.approval_workflow || null;
      } catch {
        return null;
      }
    },
    enabled: !!dataCall?.id && isOpen
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      // Get all users in the organization
      const users = await base44.entities.User.list();
      return users;
    },
    enabled: !!organization?.id && isOpen
  });

  const createApprovalMutation = useMutation({
    mutationFn: async (approvers) => {
      const approvalWorkflow = {
        approval_workflow: {
          created_date: new Date().toISOString(),
          created_by: user.email,
          approvers: approvers.map(email => ({
            email,
            status: 'pending',
            approved_date: null,
            comments: ''
          })),
          overall_status: 'pending'
        }
      };

      const currentNotes = dataCall.notes ? JSON.parse(dataCall.notes) : {};
      
      await base44.entities.DataCallRequest.update(dataCall.id, {
        notes: JSON.stringify({
          ...currentNotes,
          ...approvalWorkflow
        }),
        overall_status: 'draft' // Keep as draft until approved
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-call-approval', dataCall.id] });
      queryClient.invalidateQueries({ queryKey: ['all-data-calls'] });
      toast.success('Approval workflow created!');
    }
  });

  const submitApprovalMutation = useMutation({
    mutationFn: async ({ decision, comments }) => {
      const currentNotes = JSON.parse(dataCall.notes || '{}');
      const approvalWorkflow = currentNotes.approval_workflow;

      // Update approver's decision
      const updatedApprovers = approvalWorkflow.approvers.map(approver => {
        if (approver.email === user.email) {
          return {
            ...approver,
            status: decision,
            approved_date: new Date().toISOString(),
            comments: comments
          };
        }
        return approver;
      });

      // Check if all approved
      const allApproved = updatedApprovers.every(a => a.status === 'approved');
      const anyRejected = updatedApprovers.some(a => a.status === 'rejected');

      const newOverallStatus = anyRejected ? 'rejected' : allApproved ? 'approved' : 'pending';

      await base44.entities.DataCallRequest.update(dataCall.id, {
        notes: JSON.stringify({
          ...currentNotes,
          approval_workflow: {
            ...approvalWorkflow,
            approvers: updatedApprovers,
            overall_status: newOverallStatus
          }
        })
      });

      // If fully approved, automatically send the data call
      if (allApproved) {
        await base44.functions.invoke('sendDataCallNotification', {
          data_call_id: dataCall.id,
          notification_type: 'initial'
        });

        await base44.entities.DataCallRequest.update(dataCall.id, {
          overall_status: 'sent',
          sent_date: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-call-approval', dataCall.id] });
      queryClient.invalidateQueries({ queryKey: ['all-data-calls'] });
      toast.success('Approval submitted!');
      onApprovalComplete?.();
      onClose();
    }
  });

  const currentUserIsApprover = workflow?.approvers?.some(a => a.email === user?.email);
  const currentUserApproval = workflow?.approvers?.find(a => a.email === user?.email);
  const hasDecided = currentUserApproval?.status !== 'pending';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
            Approval Workflow
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!workflow ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  No approval workflow configured for this data call. Admins can require approval before sending.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Workflow Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Workflow Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={cn(
                    "text-lg px-4 py-1",
                    workflow.overall_status === 'approved' ? 'bg-green-600' :
                    workflow.overall_status === 'rejected' ? 'bg-red-600' :
                    'bg-amber-600'
                  )}>
                    {workflow.overall_status}
                  </Badge>
                </CardContent>
              </Card>

              {/* Approvers List */}
              <div>
                <Label className="text-base mb-3 block">Approvers</Label>
                <div className="space-y-3">
                  {workflow.approvers.map(approver => (
                    <Card key={approver.email} className={cn(
                      "border-2",
                      approver.email === user?.email && "border-blue-400 bg-blue-50"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold">
                              <User className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{approver.email}</p>
                              {approver.approved_date && (
                                <p className="text-xs text-slate-500">
                                  {moment(approver.approved_date).format('MMM D, YYYY h:mm A')}
                                </p>
                              )}
                            </div>
                          </div>

                          <Badge className={cn(
                            approver.status === 'approved' ? 'bg-green-100 text-green-700' :
                            approver.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          )}>
                            {approver.status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {approver.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                            {approver.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                            {approver.status}
                          </Badge>
                        </div>

                        {approver.comments && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                            <p className="text-sm text-slate-700">{approver.comments}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Approval Decision (if current user is approver) */}
              {currentUserIsApprover && !hasDecided && (
                <Card className="border-2 border-blue-400 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="text-base">Your Approval Decision</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={approvalDecision === 'approved' ? 'default' : 'outline'}
                        onClick={() => setApprovalDecision('approved')}
                        className={approvalDecision === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        variant={approvalDecision === 'rejected' ? 'default' : 'outline'}
                        onClick={() => setApprovalDecision('rejected')}
                        className={approvalDecision === 'rejected' ? 'bg-red-600 hover:bg-red-700' : ''}
                      >
                        <ThumbsDown className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>

                    <div>
                      <Label>Comments (optional)</Label>
                      <Textarea
                        value={approvalComments}
                        onChange={(e) => setApprovalComments(e.target.value)}
                        placeholder="Add your feedback or reasoning..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={() => submitApprovalMutation.mutate({
                        decision: approvalDecision,
                        comments: approvalComments
                      })}
                      disabled={!approvalDecision || submitApprovalMutation.isPending}
                      className={cn(
                        "w-full",
                        approvalDecision === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                        approvalDecision === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                        ''
                      )}
                    >
                      {submitApprovalMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit {approvalDecision === 'approved' ? 'Approval' : 'Rejection'}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {hasDecided && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-900">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    You have {currentUserApproval.status} this request on{' '}
                    {moment(currentUserApproval.approved_date).format('MMM D, YYYY')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}