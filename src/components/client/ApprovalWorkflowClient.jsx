import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Users,
  AlertCircle,
  Send
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import moment from "moment";

export default function ApprovalWorkflowClient({ proposal, client, currentMember }) {
  const queryClient = useQueryClient();
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalComments, setApprovalComments] = useState("");
  const [approvalDecision, setApprovalDecision] = useState(null);

  const { data: approvalRequests } = useQuery({
    queryKey: ['client-approval-requests', proposal.id],
    queryFn: () => base44.entities.ClientApprovalRequest.filter({ 
      proposal_id: proposal.id,
      client_id: client.id 
    }, '-created_date'),
    initialData: []
  });

  const submitApprovalMutation = useMutation({
    mutationFn: async ({ requestId, decision, comments }) => {
      const request = approvalRequests.find(r => r.id === requestId);
      
      // Update the specific approver's status
      const updatedApprovers = request.required_approvers.map(approver => {
        if (approver.team_member_id === currentMember.id) {
          return {
            ...approver,
            approval_status: decision,
            approval_date: new Date().toISOString(),
            comments: comments
          };
        }
        return approver;
      });

      // Calculate approval percentage
      const totalApprovers = updatedApprovers.length;
      const approvedCount = updatedApprovers.filter(a => a.approval_status === 'approved').length;
      const rejectedCount = updatedApprovers.filter(a => a.approval_status === 'rejected').length;
      const approvalPercentage = (approvedCount / totalApprovers) * 100;

      // Determine overall status
      let overallStatus = 'in_progress';
      if (request.approval_type === 'all_required') {
        if (rejectedCount > 0) {
          overallStatus = 'rejected';
        } else if (approvedCount === totalApprovers) {
          overallStatus = 'approved';
        }
      } else if (request.approval_type === 'majority') {
        if (approvedCount > totalApprovers / 2) {
          overallStatus = 'approved';
        } else if (rejectedCount > totalApprovers / 2) {
          overallStatus = 'rejected';
        }
      } else if (request.approval_type === 'any_one') {
        if (approvedCount > 0) {
          overallStatus = 'approved';
        } else if (rejectedCount === totalApprovers) {
          overallStatus = 'rejected';
        }
      }

      const completedDate = (overallStatus === 'approved' || overallStatus === 'rejected') 
        ? new Date().toISOString() 
        : null;

      return await base44.entities.ClientApprovalRequest.update(requestId, {
        required_approvers: updatedApprovers,
        approval_percentage: approvalPercentage,
        overall_status: overallStatus,
        completed_date: completedDate
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-approval-requests'] });
      setShowApprovalDialog(false);
      setSelectedRequest(null);
      setApprovalComments("");
      setApprovalDecision(null);
      alert("Your approval decision has been recorded");
    },
  });

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setApprovalDecision('approved');
    setShowApprovalDialog(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setApprovalDecision('rejected');
    setShowApprovalDialog(true);
  };

  const handleSubmitApproval = () => {
    if (!selectedRequest || !approvalDecision) return;
    
    submitApprovalMutation.mutate({
      requestId: selectedRequest.id,
      decision: approvalDecision,
      comments: approvalComments
    });
  };

  const getMyApprovalStatus = (request) => {
    const myApprover = request.required_approvers?.find(a => a.team_member_id === currentMember.id);
    return myApprover?.approval_status || 'pending';
  };

  const canIApprove = (request) => {
    const myStatus = getMyApprovalStatus(request);
    if (myStatus !== 'pending') return false;
    
    if (request.is_sequential) {
      const myIndex = request.required_approvers.findIndex(a => a.team_member_id === currentMember.id);
      return myIndex === request.current_step;
    }
    
    return true;
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { icon: Clock, color: "bg-yellow-100 text-yellow-700", label: "Pending" },
      in_progress: { icon: Clock, color: "bg-blue-100 text-blue-700", label: "In Progress" },
      approved: { icon: CheckCircle2, color: "bg-green-100 text-green-700", label: "Approved" },
      rejected: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Rejected" }
    };
    const config = configs[status] || configs.pending;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getApprovalTypeLabel = (type) => {
    const labels = {
      all_required: "All Required",
      majority: "Majority Vote",
      any_one: "Any One",
      weighted: "Weighted Vote"
    };
    return labels[type] || type;
  };

  if (approvalRequests.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-12 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600">No pending approval requests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {approvalRequests.map((request) => {
        const myStatus = getMyApprovalStatus(request);
        const iCanApprove = canIApprove(request);
        const approvedCount = request.required_approvers.filter(a => a.approval_status === 'approved').length;
        const totalCount = request.required_approvers.length;

        return (
          <Card key={request.id} className="border-none shadow-lg">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle>{request.request_title}</CardTitle>
                    {getStatusBadge(request.overall_status)}
                  </div>
                  {request.request_description && (
                    <CardDescription>{request.request_description}</CardDescription>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-sm">
                    <Badge variant="outline" className="capitalize">
                      {request.request_type.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="outline">
                      {getApprovalTypeLabel(request.approval_type)}
                    </Badge>
                    {request.is_sequential && (
                      <Badge variant="outline">Sequential</Badge>
                    )}
                    {request.due_date && (
                      <Badge variant="outline">
                        Due: {moment(request.due_date).format('MMM D, YYYY')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Approval Progress</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {approvedCount} / {totalCount} Approved
                  </span>
                </div>
                <Progress value={(approvedCount / totalCount) * 100} className="h-2" />
              </div>

              {/* Approvers */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-3">Required Approvers:</p>
                <div className="space-y-2">
                  {request.required_approvers.map((approver, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                            {approver.member_name?.[0]?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">
                            {approver.member_name}
                            {approver.team_member_id === currentMember.id && (
                              <span className="text-blue-600 ml-2">(You)</span>
                            )}
                          </p>
                          {request.is_sequential && (
                            <p className="text-xs text-slate-500">Step {idx + 1}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {approver.approval_status === 'approved' && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {approver.approval_status === 'rejected' && (
                          <Badge className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                        {approver.approval_status === 'pending' && (
                          <Badge className="bg-yellow-100 text-yellow-700">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {approver.approval_date && (
                          <p className="text-xs text-slate-500 mt-1">
                            {moment(approver.approval_date).format('MMM D, h:mm A')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* My Action Required */}
              {myStatus === 'pending' && iCanApprove && (
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900">Your Approval Required</p>
                      <p className="text-sm text-blue-700">Please review and provide your decision</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(request)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(request)}
                      variant="destructive"
                      className="flex-1"
                    >
                      <ThumbsDown className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}

              {/* My Decision (Already Made) */}
              {myStatus !== 'pending' && (
                <div className={`p-4 rounded-lg ${
                  myStatus === 'approved' ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
                }`}>
                  <p className="font-semibold mb-1">
                    Your Decision: {myStatus === 'approved' ? 'Approved ✓' : 'Rejected ✗'}
                  </p>
                  {request.required_approvers.find(a => a.team_member_id === currentMember.id)?.comments && (
                    <p className="text-sm text-slate-700">
                      Comments: {request.required_approvers.find(a => a.team_member_id === currentMember.id).comments}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDecision === 'approved' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest?.request_title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${
              approvalDecision === 'approved' ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <p className="font-semibold mb-2">
                You are about to {approvalDecision === 'approved' ? 'approve' : 'reject'} this request
              </p>
              <p className="text-sm text-slate-600">
                {approvalDecision === 'approved' 
                  ? 'This indicates you agree with the proposal and support moving forward.'
                  : 'This indicates you have concerns and do not support this proposal in its current form.'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Comments {approvalDecision === 'rejected' ? '(Required)' : '(Optional)'}
              </label>
              <Textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                rows={4}
                placeholder={
                  approvalDecision === 'approved'
                    ? 'Add any supporting comments...'
                    : 'Please explain your concerns or reasons for rejection...'
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApprovalDialog(false);
                setApprovalComments("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitApproval}
              disabled={
                submitApprovalMutation.isPending ||
                (approvalDecision === 'rejected' && !approvalComments.trim())
              }
              className={approvalDecision === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={approvalDecision === 'rejected' ? 'destructive' : 'default'}
            >
              <Send className="w-4 h-4 mr-2" />
              {submitApprovalMutation.isPending ? 'Submitting...' : `Confirm ${approvalDecision === 'approved' ? 'Approval' : 'Rejection'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}