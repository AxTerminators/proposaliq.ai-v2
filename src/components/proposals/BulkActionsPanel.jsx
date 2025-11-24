import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowRight,
  Trash2,
  UserPlus,
  Tag,
  X,
  CheckCircle,
  Archive
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function BulkActionsPanel({ 
  selectedProposals, 
  onClearSelection, 
  organization,
  kanbanConfig 
}) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedProposals.length === 0) {
    return null;
  }

  const handleBulkMove = async (columnId) => {
    setIsProcessing(true);
    try {
      const targetColumn = kanbanConfig.columns.find(col => col.id === columnId);
      if (!targetColumn) {
        alert("Target column not found");
        return;
      }

      const updates = selectedProposals.map(proposal => ({
        id: proposal.id,
        updates: {
          custom_workflow_stage_id: targetColumn.type === 'custom_stage' ? columnId : null,
          current_phase: targetColumn.type === 'locked_phase' ? targetColumn.phase_mapping : null,
          status: targetColumn.type === 'default_status' 
            ? targetColumn.default_status_mapping 
            : targetColumn.type === 'custom_stage'
              ? (targetColumn.status_mapping?.[0] || 'qualifying')
              : targetColumn.type === 'master_status'
                ? (targetColumn.status_mapping?.[0] || 'qualifying')
                : proposal.status
        }
      }));

      await Promise.all(updates.map(({ id, updates }) => 
        base44.entities.Proposal.update(id, updates)
      ));

      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onClearSelection();
      
      alert(`✓ Moved ${selectedProposals.length} proposals to "${targetColumn.label}"`);
    } catch (error) {
      console.error("Error moving proposals:", error);
      alert("Failed to move proposals. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkArchive = async () => {
    if (!confirm(`Archive ${selectedProposals.length} proposals?`)) return;
    
    setIsProcessing(true);
    try {
      await Promise.all(selectedProposals.map(p => 
        base44.entities.Proposal.update(p.id, { status: 'archived' })
      ));

      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onClearSelection();
      
      alert(`✓ Archived ${selectedProposals.length} proposals`);
    } catch (error) {
      console.error("Error archiving:", error);
      alert("Failed to archive proposals");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`⚠️ Permanently delete ${selectedProposals.length} proposals? This cannot be undone.`)) return;
    
    setIsProcessing(true);
    try {
      await Promise.all(selectedProposals.map(p => 
        base44.entities.Proposal.delete(p.id)
      ));

      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onClearSelection();
      
      alert(`✓ Deleted ${selectedProposals.length} proposals`);
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete proposals");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 lg:left-64">
      <Card className="border-2 border-blue-500 shadow-2xl bg-gradient-to-r from-blue-600 to-indigo-600">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Badge className="bg-white text-blue-600 text-base px-3 py-1">
                {selectedProposals.length} Selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-white hover:bg-white/20"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Move to Column */}
              {kanbanConfig?.columns && (
                <Select onValueChange={handleBulkMove} disabled={isProcessing}>
                  <SelectTrigger className="w-48 bg-white">
                    <SelectValue placeholder="Move to column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {kanbanConfig.columns.map(col => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Archive */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkArchive}
                disabled={isProcessing}
                className="bg-white hover:bg-slate-100"
              >
                <Archive className="w-4 h-4 mr-1" />
                Archive
              </Button>

              {/* Delete */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isProcessing}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}