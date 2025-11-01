import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { DragDropContext } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Settings, Trash2 } from "lucide-react";
import KanbanColumn from "./KanbanColumn";

const DEFAULT_COLUMNS = [
  { id: 'evaluating', label: 'Evaluating', color: 'bg-blue-500', order: 0, type: 'default_status', default_status_mapping: 'evaluating' },
  { id: 'watch_list', label: 'Watch List', color: 'bg-yellow-500', order: 1, type: 'default_status', default_status_mapping: 'watch_list' },
  { id: 'draft', label: 'Draft', color: 'bg-slate-500', order: 2, type: 'default_status', default_status_mapping: 'draft' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-amber-500', order: 3, type: 'default_status', default_status_mapping: 'in_progress' },
  { id: 'submitted', label: 'Submitted', color: 'bg-purple-500', order: 4, type: 'default_status', default_status_mapping: 'submitted' },
  { id: 'won', label: 'Won', color: 'bg-green-500', order: 5, type: 'default_status', default_status_mapping: 'won' },
  { id: 'lost', label: 'Lost', color: 'bg-red-500', order: 6, type: 'default_status', default_status_mapping: 'lost' },
];

export default function ProposalsKanban({ proposals, organization, onUpdate }) {
  const navigate = useNavigate();
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [collapsedColumns, setCollapsedColumns] = useState([]);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showNewColumnDialog, setShowNewColumnDialog] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [newColumnLabel, setNewColumnLabel] = useState("");

  // Load kanban config
  useEffect(() => {
    if (!organization?.id) return;
    
    const loadConfig = async () => {
      try {
        const configs = await base44.entities.KanbanConfig.filter(
          { organization_id: organization.id },
          '-created_date',
          1
        );
        
        if (configs.length > 0) {
          const config = configs[0];
          setColumns(config.columns || DEFAULT_COLUMNS);
          setCollapsedColumns(config.collapsed_column_ids || []);
        }
      } catch (error) {
        console.error("Error loading kanban config:", error);
      }
    };

    loadConfig();
  }, [organization?.id]);

  // Save config function
  const saveConfig = useCallback(async (newColumns, newCollapsedIds) => {
    if (!organization?.id) return;

    try {
      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id }
      );

      const configData = {
        organization_id: organization.id,
        columns: newColumns,
        collapsed_column_ids: newCollapsedIds
      };

      if (configs.length > 0) {
        await base44.entities.KanbanConfig.update(configs[0].id, configData);
      } else {
        await base44.entities.KanbanConfig.create(configData);
      }
    } catch (error) {
      console.error("Error saving kanban config:", error);
    }
  }, [organization?.id]);

  // Toggle column collapse
  const handleToggleCollapse = useCallback((columnId) => {
    setCollapsedColumns(prev => {
      const newCollapsed = prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId];
      
      saveConfig(columns, newCollapsed);
      return newCollapsed;
    });
  }, [columns, saveConfig]);

  // Handle drag end with optimistic update
  const handleDragEnd = useCallback(async (result) => {
    const { destination, source, draggableId } = result;

    // No destination or same position
    if (!destination || (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )) {
      return;
    }

    const proposalId = draggableId;
    const destColumn = columns.find(c => c.id === destination.droppableId);

    if (!destColumn) return;

    // Optimistic update - update UI immediately
    if (onUpdate) {
      onUpdate();
    }

    try {
      // Determine what to update based on column type
      const updateData = {};
      
      if (destColumn.type === 'default_status') {
        updateData.status = destColumn.default_status_mapping;
        updateData.custom_workflow_stage_id = null;
      } else {
        updateData.custom_workflow_stage_id = destColumn.id;
      }

      // Update in background
      await base44.entities.Proposal.update(proposalId, updateData);
      
      // Trigger refresh
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error updating proposal:", error);
      // Trigger refresh to revert if needed
      if (onUpdate) {
        onUpdate();
      }
    }
  }, [columns, onUpdate]);

  // Handle card click
  const handleCardClick = useCallback((proposal) => {
    navigate(createPageUrl(`ProposalBuilder?id=${proposal.id}`));
  }, [navigate]);

  // Add new column
  const handleAddColumn = useCallback(() => {
    if (!newColumnLabel.trim()) return;

    const newColumn = {
      id: `custom_${Date.now()}`,
      label: newColumnLabel,
      color: 'bg-indigo-500',
      order: columns.length,
      type: 'custom_stage'
    };

    const newColumns = [...columns, newColumn];
    setColumns(newColumns);
    saveConfig(newColumns, collapsedColumns);
    setNewColumnLabel("");
    setShowNewColumnDialog(false);
  }, [newColumnLabel, columns, collapsedColumns, saveConfig]);

  // Edit column
  const handleEditColumn = useCallback((column) => {
    setEditingColumn(column);
    setNewColumnLabel(column.label);
    setShowSettingsDialog(true);
  }, []);

  // Save edited column
  const handleSaveEditedColumn = useCallback(() => {
    if (!editingColumn || !newColumnLabel.trim()) return;

    const newColumns = columns.map(col =>
      col.id === editingColumn.id
        ? { ...col, label: newColumnLabel }
        : col
    );

    setColumns(newColumns);
    saveConfig(newColumns, collapsedColumns);
    setEditingColumn(null);
    setNewColumnLabel("");
    setShowSettingsDialog(false);
  }, [editingColumn, newColumnLabel, columns, collapsedColumns, saveConfig]);

  // Delete column
  const handleDeleteColumn = useCallback((columnId) => {
    if (!confirm("Delete this column? Proposals in this column will move to 'Draft'.")) return;

    const newColumns = columns.filter(col => col.id !== columnId);
    setColumns(newColumns);
    saveConfig(newColumns, collapsedColumns);
    setShowSettingsDialog(false);
  }, [columns, collapsedColumns, saveConfig]);

  // Memoize sorted columns
  const sortedColumns = useMemo(() => {
    return [...columns].sort((a, b) => a.order - b.order);
  }, [columns]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          Kanban Board
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewColumnDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Column
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettingsDialog(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {sortedColumns.map(column => (
            <div key={column.id} className="flex-shrink-0 w-80">
              <KanbanColumn
                column={column}
                proposals={proposals}
                isCollapsed={collapsedColumns.includes(column.id)}
                onToggleCollapse={handleToggleCollapse}
                onEditColumn={handleEditColumn}
                onCardClick={handleCardClick}
              />
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* New Column Dialog */}
      <Dialog open={showNewColumnDialog} onOpenChange={setShowNewColumnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Column Name</Label>
              <Input
                value={newColumnLabel}
                onChange={(e) => setNewColumnLabel(e.target.value)}
                placeholder="e.g., Under Review"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddColumn();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewColumnDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddColumn}>
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingColumn ? 'Edit Column' : 'Manage Columns'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingColumn ? (
              <>
                <div className="space-y-2">
                  <Label>Column Name</Label>
                  <Input
                    value={newColumnLabel}
                    onChange={(e) => setNewColumnLabel(e.target.value)}
                    placeholder="Column name"
                  />
                </div>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteColumn(editingColumn.id)}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Column
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Custom Columns</Label>
                {columns.filter(c => c.type === 'custom_stage').map(col => (
                  <div key={col.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">{col.label}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditColumn(col)}
                    >
                      Edit
                    </Button>
                  </div>
                ))}
                {columns.filter(c => c.type === 'custom_stage').length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No custom columns yet
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {editingColumn ? (
              <>
                <Button variant="outline" onClick={() => {
                  setEditingColumn(null);
                  setNewColumnLabel("");
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditedColumn}>
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowSettingsDialog(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}