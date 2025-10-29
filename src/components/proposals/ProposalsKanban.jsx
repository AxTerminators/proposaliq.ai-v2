import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { DragDropContext } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import KanbanColumn from "./KanbanColumn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hasAppPermission } from "../settings/AppRoleChecker";

const DEFAULT_COLUMNS = [
  { id: "draft", display_name: "Draft", order: 0, type: "default_status", default_status_mapping: "draft", is_collapsed: false },
  { id: "in_progress", display_name: "In Progress", order: 1, type: "default_status", default_status_mapping: "in_progress", is_collapsed: false },
  { id: "submitted", display_name: "Submitted", order: 2, type: "default_status", default_status_mapping: "submitted", is_collapsed: false },
  { id: "won", display_name: "Won", order: 3, type: "default_status", default_status_mapping: "won", is_collapsed: false },
  { id: "lost", display_name: "Lost", order: 4, type: "default_status", default_status_mapping: "lost", is_collapsed: false },
  { id: "archived", display_name: "Archived", order: 5, type: "default_status", default_status_mapping: "archived", is_collapsed: false }
];

export default function ProposalsKanban({ proposals, organizationId, userRole }) {
  const queryClient = useQueryClient();
  const [kanbanConfig, setKanbanConfig] = useState(null);
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  const canEdit = hasAppPermission(userRole, 'canManageTeam') || hasAppPermission(userRole, 'canCreateProposal');

  // Fetch Kanban config
  const { data: configs, isLoading: configLoading } = useQuery({
    queryKey: ['kanban-config', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return base44.entities.KanbanConfig.filter({ organization_id: organizationId });
    },
    enabled: !!organizationId,
    initialData: []
  });

  // Initialize or load config
  useEffect(() => {
    const initializeConfig = async () => {
      if (!organizationId) return;

      if (configs.length === 0) {
        // Create default config
        const newConfig = await base44.entities.KanbanConfig.create({
          organization_id: organizationId,
          columns: DEFAULT_COLUMNS
        });
        setKanbanConfig(newConfig);
      } else {
        setKanbanConfig(configs[0]);
      }
    };

    initializeConfig();
  }, [configs, organizationId]);

  const updateConfigMutation = useMutation({
    mutationFn: async (updatedColumns) => {
      await base44.entities.KanbanConfig.update(kanbanConfig.id, {
        columns: updatedColumns
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
    }
  });

  const updateProposalMutation = useMutation({
    mutationFn: async ({ proposalId, updates }) => {
      await base44.entities.Proposal.update(proposalId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination || !canEdit) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId) return;

    const sourceColumn = kanbanConfig.columns.find(col => col.id === source.droppableId);
    const destColumn = kanbanConfig.columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const proposal = proposals.find(p => p.id === draggableId);
    if (!proposal) return;

    // Update proposal status or custom stage
    const updates = {};
    if (destColumn.type === "default_status") {
      updates.status = destColumn.default_status_mapping;
      updates.custom_workflow_stage_id = null;
    } else {
      updates.custom_workflow_stage_id = destColumn.id;
    }

    updateProposalMutation.mutate({ proposalId: proposal.id, updates });
  };

  const handleToggleCollapse = (columnId) => {
    if (!canEdit) return;
    const updatedColumns = kanbanConfig.columns.map(col =>
      col.id === columnId ? { ...col, is_collapsed: !col.is_collapsed } : col
    );
    setKanbanConfig({ ...kanbanConfig, columns: updatedColumns });
    updateConfigMutation.mutate(updatedColumns);
  };

  const handleRenameColumn = (columnId, newName) => {
    if (!canEdit) return;
    const updatedColumns = kanbanConfig.columns.map(col =>
      col.id === columnId ? { ...col, display_name: newName } : col
    );
    setKanbanConfig({ ...kanbanConfig, columns: updatedColumns });
    updateConfigMutation.mutate(updatedColumns);
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim() || !canEdit) return;

    const newColumn = {
      id: `custom_${Date.now()}`,
      display_name: newColumnName.trim(),
      order: kanbanConfig.columns.length,
      type: "custom_stage",
      default_status_mapping: null,
      is_collapsed: false
    };

    const updatedColumns = [...kanbanConfig.columns, newColumn];
    setKanbanConfig({ ...kanbanConfig, columns: updatedColumns });
    updateConfigMutation.mutate(updatedColumns);
    setShowAddColumnDialog(false);
    setNewColumnName("");
  };

  const handleDeleteColumn = async (columnId) => {
    if (!canEdit) return;
    
    const column = kanbanConfig.columns.find(col => col.id === columnId);
    if (!column || column.type === "default_status") return;

    // Check if any proposals are in this column
    const proposalsInColumn = proposals.filter(p => p.custom_workflow_stage_id === columnId);
    
    if (proposalsInColumn.length > 0) {
      if (!confirm(`This column has ${proposalsInColumn.length} proposal(s). They will be moved to Draft. Continue?`)) {
        return;
      }
      
      // Move proposals to draft
      for (const proposal of proposalsInColumn) {
        await updateProposalMutation.mutateAsync({
          proposalId: proposal.id,
          updates: { status: "draft", custom_workflow_stage_id: null }
        });
      }
    }

    const updatedColumns = kanbanConfig.columns.filter(col => col.id !== columnId);
    setKanbanConfig({ ...kanbanConfig, columns: updatedColumns });
    updateConfigMutation.mutate(updatedColumns);
  };

  const getProposalsForColumn = (column) => {
    if (column.type === "default_status") {
      return proposals.filter(p => 
        p.status === column.default_status_mapping && !p.custom_workflow_stage_id
      );
    } else {
      return proposals.filter(p => p.custom_workflow_stage_id === column.id);
    }
  };

  if (configLoading || !kanbanConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const sortedColumns = [...kanbanConfig.columns].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setShowAddColumnDialog(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Column
          </Button>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {sortedColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              proposals={getProposalsForColumn(column)}
              onToggleCollapse={handleToggleCollapse}
              onRenameColumn={handleRenameColumn}
              onDeleteColumn={handleDeleteColumn}
              canEdit={canEdit}
            />
          ))}
        </div>
      </DragDropContext>

      <Dialog open={showAddColumnDialog} onOpenChange={setShowAddColumnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Column Name</Label>
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="e.g., Client Review, Legal Approval"
                onKeyPress={(e) => e.key === 'Enter' && handleAddColumn()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddColumnDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim()}>
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}