import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckSquare,
  Archive,
  Trash2,
  Users,
  Calendar,
  Tag,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

export default function BulkActionsPanel({ 
  selectedProposals = [], 
  onClearSelection,
  organization,
  kanbanConfig
}) {
  const queryClient = useQueryClient();
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ action, value }) => {
      const updates = {};
      
      if (action === 'change_status') {
        updates.status = value;
      } else if (action === 'assign_user') {
        updates.assigned_team_members = [value];
      } else if (action === 'set_due_date') {
        updates.due_date = format(value, 'yyyy-MM-dd');
      } else if (action === 'archive') {
        updates.status = 'archived';
      } else if (action === 'move_to_column') {
        const column = kanbanConfig?.columns?.find(c => c.id === value);
        if (!column) throw new Error('Column not found');
        
        if (column.type === 'custom_stage') {
          updates.custom_workflow_stage_id = column.id;
        } else if (column.type === 'default_status') {
          updates.status = column.default_status_mapping;
          updates.custom_workflow_stage_id = null;
        } else if (column.type === 'locked_phase') {
          updates.current_phase = column.phase_mapping;
          updates.custom_workflow_stage_id = column.id;
        }
      }

      // Update all selected proposals
      await Promise.all(
        selectedProposals.map(proposal =>
          base44.entities.Proposal.update(proposal.id, updates)
        )
      );

      return { count: selectedProposals.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setShowBulkDialog(false);
      setBulkAction('');
      setBulkValue('');
      onClearSelection();
      alert(`✅ ${data.count} proposal${data.count !== 1 ? 's' : ''} updated successfully!`);
    }
  });

  const handleBulkAction = (action) => {
    setBulkAction(action);
    setShowBulkDialog(true);
  };

  const handleConfirmBulkAction = () => {
    if (!bulkAction) return;
    
    if (bulkAction !== 'archive' && bulkAction !== 'delete' && !bulkValue) {
      alert('Please select a value');
      return;
    }

    bulkUpdateMutation.mutate({ action: bulkAction, value: bulkValue });
  };

  const getActionTitle = () => {
    switch (bulkAction) {
      case 'change_status': return 'Change Status';
      case 'assign_user': return 'Assign Team Member';
      case 'set_due_date': return 'Set Due Date';
      case 'move_to_column': return 'Move to Column';
      case 'archive': return 'Archive Proposals';
      default: return 'Bulk Action';
    }
  };

  if (selectedProposals.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Card className="border-2 border-blue-500 shadow-2xl bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-slate-900">
                {selectedProposals.length} proposal{selectedProposals.length !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('move_to_column')}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Move
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('change_status')}
              >
                <Tag className="w-4 h-4 mr-2" />
                Status
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('assign_user')}
              >
                <Users className="w-4 h-4 mr-2" />
                Assign
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('set_due_date')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Due Date
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('archive')}
                className="text-amber-600 hover:text-amber-700"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
            >
              <X className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Action Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{getActionTitle()}</DialogTitle>
            <DialogDescription>
              This will update {selectedProposals.length} proposal{selectedProposals.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {bulkAction === 'change_status' && (
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={bulkValue} onValueChange={setBulkValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="evaluating">Evaluating</SelectItem>
                    <SelectItem value="watch_list">Watch List</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkAction === 'move_to_column' && (
              <div className="space-y-2">
                <Label>Destination Column</Label>
                <Select value={bulkValue} onValueChange={setBulkValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {kanbanConfig?.columns?.map(col => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {bulkAction === 'assign_user' && (
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                />
              </div>
            )}

            {bulkAction === 'set_due_date' && (
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !bulkValue && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {bulkValue ? format(bulkValue, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarPicker
                      mode="single"
                      selected={bulkValue}
                      onSelect={setBulkValue}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {bulkAction === 'archive' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-semibold mb-1">Archive {selectedProposals.length} proposal{selectedProposals.length !== 1 ? 's' : ''}?</p>
                  <p>Archived proposals can be restored later from the Archive column.</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBulkAction}
              disabled={bulkUpdateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {bulkUpdateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Apply to {selectedProposals.length}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}