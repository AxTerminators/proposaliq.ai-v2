import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Trash2, CheckCircle2, X, Loader2, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";

export default function BulkDataCallActions({ 
  dataCallsList, 
  organization,
  onExport
}) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(dataCallsList.map(dc => dc.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: selectedIds.length });

    try {
      for (let i = 0; i < selectedIds.length; i++) {
        const dataCallId = selectedIds[i];
        setProgress({ current: i + 1, total: selectedIds.length });

        if (bulkAction === 'send_reminders') {
          await base44.functions.invoke('sendDataCallReminder', {
            data_call_id: dataCallId
          });
        } else if (bulkAction === 'mark_completed') {
          await base44.entities.DataCallRequest.update(dataCallId, {
            overall_status: 'completed',
            completed_date: new Date().toISOString()
          });
        } else if (bulkAction === 'delete') {
          await base44.entities.DataCallRequest.delete(dataCallId);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['all-data-calls'] });
      queryClient.invalidateQueries({ queryKey: ['data-call-requests'] });
      
      toast.success(`✅ Bulk action completed for ${selectedIds.length} data call(s)!`);
      setShowBulkDialog(false);
      setBulkAction('');
      clearSelection();
    } catch (error) {
      toast.error('Bulk action failed: ' + error.message);
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Card className="border-2 border-blue-500 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Badge className="bg-blue-600 text-lg px-3 py-1">
                {selectedIds.length} Selected
              </Badge>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkAction('send_reminders');
                    setShowBulkDialog(true);
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reminders
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkAction('mark_completed');
                    setShowBulkDialog(true);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark Complete
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkAction('delete');
                    setShowBulkDialog(true);
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>

                {onExport && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onExport}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Selected
                  </Button>
                )}
              </div>

              <div className="h-6 w-px bg-slate-300" />

              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Action</DialogTitle>
            <DialogDescription>
              {bulkAction === 'send_reminders' && `Send reminder emails to ${selectedIds.length} data call recipient(s)?`}
              {bulkAction === 'mark_completed' && `Mark ${selectedIds.length} data call(s) as completed?`}
              {bulkAction === 'delete' && (
                <div className="space-y-2 pt-2">
                  <p className="text-red-600 font-semibold">
                    ⚠️ Permanently delete {selectedIds.length} data call(s)?
                  </p>
                  <p className="text-sm">This action cannot be undone.</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {isProcessing && (
            <div className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-700">Processing...</span>
                <span className="text-sm text-slate-700">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDialog(false);
                setBulkAction('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAction}
              disabled={isProcessing}
              className={bulkAction === 'delete' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {bulkAction === 'send_reminders' && <Mail className="w-4 h-4 mr-2" />}
                  {bulkAction === 'mark_completed' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {bulkAction === 'delete' && <Trash2 className="w-4 h-4 mr-2" />}
                  Confirm
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}