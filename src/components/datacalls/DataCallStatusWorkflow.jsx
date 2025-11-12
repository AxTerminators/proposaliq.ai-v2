import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  FileEdit, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Mail
} from "lucide-react";
import { toast } from "sonner";

const STATUS_FLOW = [
  { value: 'draft', label: 'Draft', icon: FileEdit, color: 'bg-slate-600', description: 'Being prepared, not yet sent' },
  { value: 'sent', label: 'Sent', icon: Send, color: 'bg-indigo-600', description: 'Sent to recipient' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'bg-blue-600', description: 'Recipient is working on it' },
  { value: 'partially_completed', label: 'Partially Complete', icon: Clock, color: 'bg-amber-600', description: 'Some items completed' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'bg-green-600', description: 'All items submitted' },
  { value: 'overdue', label: 'Overdue', icon: AlertCircle, color: 'bg-red-600', description: 'Past due date' }
];

export default function DataCallStatusWorkflow({ dataCall, onStatusChange }) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, notes }) => {
      const updateData = { overall_status: status };
      
      if (status === 'sent' && !dataCall.sent_date) {
        updateData.sent_date = new Date().toISOString();
      }
      
      if (status === 'completed' && !dataCall.completed_date) {
        updateData.completed_date = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = (dataCall.notes || '') + `\n\n[${new Date().toISOString()}] Status changed to ${status}: ${notes}`;
      }

      await base44.entities.DataCallRequest.update(dataCall.id, updateData);

      // If changing to 'sent', also send notification email
      if (status === 'sent' && !dataCall.sent_date) {
        try {
          await base44.functions.invoke('sendDataCallNotification', {
            data_call_id: dataCall.id,
            notification_type: 'initial'
          });
        } catch (emailError) {
          console.error('Email notification failed:', emailError);
          toast.warning('Status updated but email notification failed');
        }
      }
    },
    onSuccess: () => {
      toast.success('Status updated successfully!');
      setShowConfirmDialog(false);
      setNewStatus('');
      setStatusNotes('');
      onStatusChange?.();
    },
    onError: (error) => {
      toast.error('Failed to update status: ' + error.message);
    }
  });

  const handleStatusChange = (status) => {
    setNewStatus(status);
    setShowConfirmDialog(true);
  };

  const confirmStatusChange = () => {
    updateStatusMutation.mutate({ status: newStatus, notes: statusNotes });
  };

  const currentStatus = STATUS_FLOW.find(s => s.value === dataCall.overall_status);
  const CurrentIcon = currentStatus?.icon || Clock;

  // Determine allowed next statuses based on current status
  const getAllowedNextStatuses = () => {
    switch (dataCall.overall_status) {
      case 'draft':
        return ['sent'];
      case 'sent':
        return ['in_progress', 'overdue'];
      case 'in_progress':
        return ['partially_completed', 'completed', 'overdue'];
      case 'partially_completed':
        return ['in_progress', 'completed', 'overdue'];
      case 'overdue':
        return ['in_progress', 'completed'];
      case 'completed':
        return ['in_progress']; // Allow reopening
      default:
        return [];
    }
  };

  const allowedStatuses = getAllowedNextStatuses();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-blue-600" />
            Status Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="bg-slate-50 border-2 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 ${currentStatus?.color} rounded-lg flex items-center justify-center`}>
                <CurrentIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Current Status</p>
                <p className="font-bold text-lg text-slate-900">{currentStatus?.label}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600">{currentStatus?.description}</p>
          </div>

          {/* Status Timeline */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Status History:</p>
            <div className="space-y-2">
              {STATUS_FLOW.map((status) => {
                const StatusIcon = status.icon;
                const isCurrentOrPast = 
                  status.value === 'draft' ||
                  (status.value === 'sent' && dataCall.sent_date) ||
                  (status.value === 'completed' && dataCall.completed_date) ||
                  status.value === dataCall.overall_status;

                return (
                  <div
                    key={status.value}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      status.value === dataCall.overall_status
                        ? 'bg-blue-50 border border-blue-300'
                        : isCurrentOrPast
                        ? 'bg-slate-50'
                        : 'opacity-50'
                    }`}
                  >
                    <div className={`w-8 h-8 ${status.color} rounded-full flex items-center justify-center`}>
                      <StatusIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{status.label}</p>
                      {status.value === 'sent' && dataCall.sent_date && (
                        <p className="text-xs text-slate-500">
                          {moment(dataCall.sent_date).format('MMM D, YYYY [at] h:mm A')}
                        </p>
                      )}
                      {status.value === 'completed' && dataCall.completed_date && (
                        <p className="text-xs text-slate-500">
                          {moment(dataCall.completed_date).format('MMM D, YYYY [at] h:mm A')}
                        </p>
                      )}
                    </div>
                    {status.value === dataCall.overall_status && (
                      <Badge className="bg-blue-600">Current</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Change Status Actions */}
          {allowedStatuses.length > 0 && (
            <div className="pt-4 border-t">
              <Label className="text-sm font-semibold mb-3 block">Change Status To:</Label>
              <div className="flex gap-2 flex-wrap">
                {allowedStatuses.map(statusValue => {
                  const statusConfig = STATUS_FLOW.find(s => s.value === statusValue);
                  const StatusIcon = statusConfig?.icon;
                  
                  return (
                    <Button
                      key={statusValue}
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(statusValue)}
                      className="flex items-center gap-2"
                    >
                      <StatusIcon className="w-4 h-4" />
                      {statusConfig?.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Change status from <strong>{currentStatus?.label}</strong> to{' '}
                <strong>{STATUS_FLOW.find(s => s.value === newStatus)?.label}</strong>?
              </p>

              {newStatus === 'sent' && !dataCall.sent_date && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900">
                    <Mail className="w-4 h-4 inline mr-1" />
                    This will send an email notification to the recipient with the portal link.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm">Notes (optional)</Label>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add notes about this status change..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatusMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateStatusMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>Confirm Change</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}