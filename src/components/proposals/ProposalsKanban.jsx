import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, Plus, Loader2, RotateCcw, GripVertical, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import KanbanColumn from "./KanbanColumn";
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

const defaultColumns = [
  { id: 'evaluating', label: 'Evaluating', color: 'bg-blue-100', order: 0, type: 'default_status', default_status_mapping: 'evaluating' },
  { id: 'watch_list', label: 'Watch List', color: 'bg-yellow-100', order: 1, type: 'default_status', default_status_mapping: 'watch_list' },
  { id: 'draft', label: 'Draft', color: 'bg-slate-100', order: 2, type: 'default_status', default_status_mapping: 'draft' },
  { id: 'in_progress', label: 'In Review', color: 'bg-purple-100', order: 3, type: 'default_status', default_status_mapping: 'in_progress' },
  { id: 'submitted', label: 'Submitted', color: 'bg-indigo-100', order: 4, type: 'default_status', default_status_mapping: 'submitted' },
  { id: 'won', label: 'Won', color: 'bg-green-100', order: 5, type: 'default_status', default_status_mapping: 'won' },
  { id: 'lost', label: 'Lost', color: 'bg-red-100', order: 6, type: 'default_status', default_status_mapping: 'lost' },
  { id: 'archived', label: 'Archived', color: 'bg-slate-100', order: 7, type: 'default_status', default_status_mapping: 'archived' }
];

export default function ProposalsKanban({ proposals = [], onProposalClick, isLoading, user, organization }) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState(defaultColumns);
  const [columnConfig, setColumnConfig] = useState(defaultColumns);
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("bg-blue-100");
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState([]);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  const [quickAddPosition, setQuickAddPosition] = useState(null);
  const [quickColumnName, setQuickColumnName] = useState("");
  const [quickColumnColor, setQuickColumnColor] = useState("bg-blue-100");
  const [columnSorts, setColumnSorts] = useState({});
  const [showColumnDeleteWarning, setShowColumnDeleteWarning] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState(null);
  const [columnDeleteError, setColumnDeleteError] = useState(null);

  // Load saved config on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (!organization?.id) return;

      try {
        const configs = await base44.entities.KanbanConfig.filter(
          { organization_id: organization.id },
          '-created_date',
          1
        );

        if (configs.length > 0 && configs[0].columns) {
          const savedColumns = configs[0].columns.sort((a, b) => a.order - b.order);
          setColumns(savedColumns);
          setColumnConfig(savedColumns);
          
          if (configs[0].collapsed_column_ids) {
            setCollapsedColumns(configs[0].collapsed_column_ids);
          }
        }
      } catch (error) {
        console.error("Error loading kanban config:", error);
      }
    };

    loadConfig();
  }, [organization?.id]);

  const saveColumnConfigMutation = useMutation({
    mutationFn: async (columnsToSave) => {
      if (!organization?.id) throw new Error("No organization");

      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );

      const configData = {
        organization_id: organization.id,
        columns: columnsToSave.map((col, idx) => ({
          ...col,
          order: idx
        })),
        collapsed_column_ids: collapsedColumns
      };

      if (configs.length > 0) {
        return base44.entities.KanbanConfig.update(configs[0].id, configData);
      } else {
        return base44.entities.KanbanConfig.create(configData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
    }
  });

  const updateProposalMutation = useMutation({
    mutationFn: async ({ proposalId, updates }) => {
      return base44.entities.Proposal.update(proposalId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (proposalId) => {
      return base44.entities.Proposal.delete(proposalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setShowDeleteWarning(false);
      setProposalToDelete(null);
    }
  });

  const resetToDefaultMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");

      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );

      const configData = {
        organization_id: organization.id,
        columns: defaultColumns,
        collapsed_column_ids: []
      };

      if (configs.length > 0) {
        return base44.entities.KanbanConfig.update(configs[0].id, configData);
      } else {
        return base44.entities.KanbanConfig.create(configData);
      }
    },
    onSuccess: () => {
      setColumns(defaultColumns);
      setColumnConfig(defaultColumns);
      setCollapsedColumns([]);
      setColumnSorts({});
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      setShowResetWarning(false);
    }
  });

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (result) => {
    setIsDragging(false);

    if (!result.destination) return;

    const { source, destination, type } = result;

    if (type === 'column') {
      const newColumns = Array.from(columns);
      const [removed] = newColumns.splice(source.index, 1);
      newColumns.splice(destination.index, 0, removed);

      const updatedColumns = newColumns.map((col, idx) => ({
        ...col,
        order: idx
      }));

      setColumns(updatedColumns);
      saveColumnConfigMutation.mutate(updatedColumns);
      return;
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceColumn = columns.find(col => col.id === source.droppableId);
    const destColumn = columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const proposal = proposals.find(p => {
      if (sourceColumn.type === 'default_status') {
        return p.status === sourceColumn.default_status_mapping;
      } else {
        return p.custom_workflow_stage_id === sourceColumn.id;
      }
    });

    if (!proposal) return;

    let updates = {};
    if (destColumn.type === 'default_status') {
      updates = {
        status: destColumn.default_status_mapping,
        custom_workflow_stage_id: null
      };
    } else {
      updates = {
        custom_workflow_stage_id: destColumn.id,
        status: 'in_progress'
      };
    }

    updateProposalMutation.mutate({
      proposalId: proposal.id,
      updates
    });
  };

  const handleProposalClick = (proposal) => {
    if (onProposalClick) {
      onProposalClick(proposal);
    }
  };

  const handleDeleteProposal = (proposal) => {
    setProposalToDelete(proposal);
    setShowDeleteWarning(true);
  };

  const handleAddColumn = () => {
    if (!newColumnLabel.trim()) {
      alert("Please enter a column name");
      return;
    }

    const newColumn = {
      id: `custom_${Date.now()}`,
      label: newColumnLabel,
      color: newColumnColor,
      order: columnConfig.length,
      type: 'custom_stage'
    };

    const updatedColumns = [...columnConfig, newColumn];
    setColumnConfig(updatedColumns);
    setNewColumnLabel("");
    setNewColumnColor("bg-blue-100");
  };

  const handleQuickAddColumn = (position) => {
    setQuickAddPosition(position);
    setQuickColumnName("");
    setQuickColumnColor("bg-blue-100");
    setShowQuickAddDialog(true);
  };

  const handleQuickAddSubmit = () => {
    if (!quickColumnName.trim()) {
      alert("Please enter a column name");
      return;
    }

    const newColumn = {
      id: `custom_${Date.now()}`,
      label: quickColumnName,
      color: quickColumnColor,
      order: quickAddPosition,
      type: 'custom_stage'
    };

    const updatedColumns = [...columnConfig];
    updatedColumns.splice(quickAddPosition, 0, newColumn);
    
    const reorderedColumns = updatedColumns.map((col, idx) => ({
      ...col,
      order: idx
    }));

    setColumnConfig(reorderedColumns);
    setColumns(reorderedColumns);
    saveColumnConfigMutation.mutate(reorderedColumns);
    setShowQuickAddDialog(false);
  };

  const handleToggleCollapse = async (columnId) => {
    const newCollapsed = collapsedColumns.includes(columnId)
      ? collapsedColumns.filter(id => id !== columnId)
      : [...collapsedColumns, columnId];
    
    setCollapsedColumns(newCollapsed);

    if (!organization?.id) return;

    try {
      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );

      const configData = {
        organization_id: organization.id,
        columns: columns,
        collapsed_column_ids: newCollapsed
      };

      if (configs.length > 0) {
        await base44.entities.KanbanConfig.update(configs[0].id, configData);
      } else {
        await base44.entities.KanbanConfig.create(configData);
      }
    } catch (error) {
      console.error("Error saving collapse state:", error);
    }
  };

  const handleSortChange = (columnId, sortType) => {
    setColumnSorts(prev => ({
      ...prev,
      [columnId]: sortType
    }));
  };

  const handleDeleteColumn = async (column) => {
    if (!column || !column.id) {
      alert("Invalid column");
      return;
    }

    if (column.type === 'default_status') {
      alert("Default columns cannot be deleted. You can only customize their labels and colors.");
      return;
    }

    const proposalsInColumn = (proposals || []).filter(p => p?.custom_workflow_stage_id === column.id);

    if (proposalsInColumn.length > 0) {
      setColumnDeleteError({
        columnLabel: column.label,
        count: proposalsInColumn.length
      });
      setColumnToDelete(null);
      setShowColumnDeleteWarning(true);
      return;
    }

    setColumnToDelete(column);
    setColumnDeleteError(null);
    setShowColumnDeleteWarning(true);
  };

  const confirmDeleteColumn = () => {
    if (!columnToDelete) return;

    const newColumns = columns.filter(col => col?.id !== columnToDelete.id);
    setColumns(newColumns);
    setColumnConfig(prev => prev.filter(col => col?.id !== columnToDelete.id));
    
    saveColumnConfigMutation.mutate(newColumns);
    
    setShowColumnDeleteWarning(false);
    setColumnToDelete(null);
    setColumnDeleteError(null);
  };

  const handleSaveColumns = () => {
    setColumns(columnConfig);
    saveColumnConfigMutation.mutate(columnConfig);
    setIsEditingColumns(false);
  };

  const handleResetToDefault = () => {
    setShowResetWarning(true);
  };

  const confirmReset = () => {
    resetToDefaultMutation.mutate();
  };

  const handleColumnChange = (columnId, field, value) => {
    setColumnConfig(prev =>
      prev.map(col =>
        col.id === columnId ? { ...col, [field]: value } : col
      )
    );
  };

  const handleColumnOrderChange = (columnId, newOrderStr) => {
    const newOrder = parseInt(newOrderStr);
    if (isNaN(newOrder) || newOrder < 1 || newOrder > columnConfig.length) return;

    const currentIndex = columnConfig.findIndex(col => col.id === columnId);
    if (currentIndex === -1) return;

    const targetIndex = newOrder - 1;
    if (currentIndex === targetIndex) return;

    const newColumns = Array.from(columnConfig);
    const [removed] = newColumns.splice(currentIndex, 1);
    newColumns.splice(targetIndex, 0, removed);

    const reorderedColumns = newColumns.map((col, idx) => ({
      ...col,
      order: idx
    }));

    setColumnConfig(reorderedColumns);
  };

  const handleConfigDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(columnConfig);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const reorderedColumns = items.map((col, idx) => ({
      ...col,
      order: idx
    }));

    setColumnConfig(reorderedColumns);
  };

  const confirmDelete = () => {
    if (proposalToDelete) {
      deleteProposalMutation.mutate(proposalToDelete.id);
    }
  };

  const groupedProposals = useMemo(() => {
    const grouped = {};
    
    columns.forEach(column => {
      let columnProposals = [];
      
      if (column.type === 'default_status') {
        columnProposals = proposals.filter(p => 
          p?.status === column.default_status_mapping && !p?.custom_workflow_stage_id
        );
      } else {
        columnProposals = proposals.filter(p => 
          p?.custom_workflow_stage_id === column.id
        );
      }

      const sortType = columnSorts[column.id];
      if (sortType) {
        columnProposals = [...columnProposals].sort((a, b) => {
          if (sortType === 'date_newest') {
            return new Date(b.created_date) - new Date(a.created_date);
          } else if (sortType === 'name_asc') {
            return (a.proposal_name || '').localeCompare(b.proposal_name || '');
          } else if (sortType === 'name_desc') {
            return (b.proposal_name || '').localeCompare(a.proposal_name || '');
          }
          return 0;
        });
      }

      grouped[column.id] = columnProposals;
    });

    return grouped;
  }, [proposals, columns, columnSorts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleResetToDefault}
          disabled={resetToDefaultMutation.isPending || isDragging}
        >
          {resetToDefaultMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4 mr-2" />
          )}
          Reset to Default
        </Button>
        <Dialog open={isEditingColumns} onOpenChange={setIsEditingColumns}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isDragging}>
              <Settings2 className="w-4 h-4 mr-2" />
              Customize Columns
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customize Kanban Columns</DialogTitle>
              <DialogDescription>
                Edit column labels and colors, reorder columns by dragging or entering order numbers, or add custom workflow stages.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Existing Columns with Drag and Drop */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Existing Columns (Drag to Reorder)</h3>
                <DragDropContext onDragEnd={handleConfigDragEnd}>
                  <Droppable droppableId="column-config-list">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {columnConfig.map((column, index) => {
                          if (!column || !column.id) return null;
                          
                          return (
                            <Draggable key={column.id} draggableId={column.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex gap-4 items-center p-4 border rounded-lg ${
                                    snapshot.isDragging ? 'bg-blue-50 border-blue-300 shadow-lg' : 'bg-slate-50'
                                  }`}
                                >
                                  <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-5 h-5 text-slate-400" />
                                  </div>
                                  
                                  <div className="w-16">
                                    <Label className="text-xs font-semibold">Order</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max={columnConfig.length}
                                      value={index + 1}
                                      onChange={(e) => handleColumnOrderChange(column.id, e.target.value)}
                                      className="h-8 text-center"
                                    />
                                  </div>

                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Label className="text-xs font-semibold">Label</Label>
                                      {column.type === 'default_status' && (
                                        <span className="text-xs text-slate-500 italic">(Default Column)</span>
                                      )}
                                      {column.type === 'custom_stage' && (
                                        <span className="text-xs text-blue-600 italic">(Custom Stage)</span>
                                      )}
                                    </div>
                                    <Input
                                      value={column.label || ""}
                                      onChange={(e) => handleColumnChange(column.id, 'label', e.target.value)}
                                      placeholder="Column name"
                                    />
                                  </div>
                                  
                                  <div className="w-32 space-y-2">
                                    <Label className="text-xs font-semibold">Color</Label>
                                    <select
                                      value={column.color || "bg-slate-100"}
                                      onChange={(e) => handleColumnChange(column.id, 'color', e.target.value)}
                                      className="w-full px-3 py-2 border rounded-md"
                                    >
                                      <option value="bg-slate-100">Gray</option>
                                      <option value="bg-blue-100">Blue</option>
                                      <option value="bg-purple-100">Purple</option>
                                      <option value="bg-indigo-100">Indigo</option>
                                      <option value="bg-green-100">Green</option>
                                      <option value="bg-yellow-100">Yellow</option>
                                      <option value="bg-red-100">Red</option>
                                      <option value="bg-pink-100">Pink</option>
                                      <option value="bg-amber-100">Amber</option>
                                      <option value="bg-teal-100">Teal</option>
                                    </select>
                                  </div>

                                  <div>
                                    {column.type === 'custom_stage' ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDeleteColumn(column)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    ) : (
                                      <div className="w-10" />
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              {/* Add New Column */}
              <div className="border-t pt-4 mt-6">
                <h3 className="font-semibold text-sm mb-3">Add New Custom Column</h3>
                <div className="flex gap-4 items-end p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                  <div className="flex-1 space-y-2">
                    <Label>Column Name</Label>
                    <Input
                      value={newColumnLabel}
                      onChange={(e) => setNewColumnLabel(e.target.value)}
                      placeholder="e.g., Client Review, Legal Approval..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddColumn();
                        }
                      }}
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <Label>Color</Label>
                    <select
                      value={newColumnColor}
                      onChange={(e) => setNewColumnColor(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="bg-slate-100">Gray</option>
                      <option value="bg-blue-100">Blue</option>
                      <option value="bg-purple-100">Purple</option>
                      <option value="bg-indigo-100">Indigo</option>
                      <option value="bg-green-100">Green</option>
                      <option value="bg-yellow-100">Yellow</option>
                      <option value="bg-red-100">Red</option>
                      <option value="bg-pink-100">Pink</option>
                      <option value="bg-amber-100">Amber</option>
                      <option value="bg-teal-100">Teal</option>
                    </select>
                  </div>
                  <Button onClick={handleAddColumn} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Column
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={handleResetToDefault}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Default
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditingColumns(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveColumns}>
                  {saveColumnConfigMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Reset Warning Dialog */}
      <AlertDialog open={showResetWarning} onOpenChange={setShowResetWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Reset Kanban Board to Default?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="font-medium text-slate-900">This action will reset your Kanban board and you will lose the following customizations:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>All custom column names will revert to original names</li>
                <li>All custom column colors will revert to default colors</li>
                <li>All custom workflow stages will be permanently deleted</li>
                <li>All collapsed columns will be expanded</li>
                <li>Column order will be reset to the default sequence</li>
                <li>All column sorting preferences will be cleared</li>
              </ul>
              <p className="text-amber-700 font-medium pt-2">⚠️ This action cannot be undone. Your proposals and data will remain safe.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmReset}
              className="bg-red-600 hover:bg-red-700"
              disabled={resetToDefaultMutation.isPending}
            >
              {resetToDefaultMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset to Default'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Column Delete Warning Dialog */}
      <AlertDialog open={showColumnDeleteWarning} onOpenChange={setShowColumnDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {columnDeleteError ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Cannot Delete Non-Empty Column
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Delete Custom Column?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              {columnDeleteError ? (
                <>
                  <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                    <p className="text-red-900 font-bold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Column Contains Proposals
                    </p>
                    <p className="text-red-800 mb-3">
                      The column <strong>"{columnDeleteError.columnLabel}"</strong> contains <strong>{columnDeleteError.count} proposal{columnDeleteError.count !== 1 ? 's' : ''}</strong>.
                    </p>
                    <p className="text-red-900 font-semibold">
                      To prevent accidental data loss, you must move all proposals out of this column before it can be deleted.
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-900 text-sm font-medium mb-1">💡 How to proceed:</p>
                    <ol className="text-blue-800 text-sm space-y-1 list-decimal pl-5">
                      <li>Drag all proposals from "{columnDeleteError.columnLabel}" to another column</li>
                      <li>Verify the column is empty</li>
                      <li>Try deleting the column again</li>
                    </ol>
                  </div>
                </>
              ) : columnToDelete ? (
                <>
                  <p className="text-slate-900">
                    You are about to permanently delete the custom column <strong>"{columnToDelete.label}"</strong>.
                  </p>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-900 text-sm">
                      ✓ This column is currently empty, so no proposals will be affected.
                    </p>
                  </div>
                  <p className="text-amber-700 font-medium">
                    ⚠️ This action cannot be undone.
                  </p>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {columnDeleteError ? (
              <AlertDialogAction onClick={() => {
                setShowColumnDeleteWarning(false);
                setColumnDeleteError(null);
              }}>
                Got It!
              </AlertDialogAction>
            ) : (
              <>
                <AlertDialogCancel onClick={() => {
                  setShowColumnDeleteWarning(false);
                  setColumnToDelete(null);
                }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDeleteColumn}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Column
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Proposal Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Permanently Delete Proposal?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p className="font-medium text-slate-900">
                You are about to permanently delete: <span className="font-bold text-red-600">{proposalToDelete?.proposal_name}</span>
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-900 font-semibold mb-2">⚠️ This action cannot be undone!</p>
                <p className="text-red-800 text-sm">All associated data will be irretrievably lost, including:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-red-800 text-sm">
                  <li>All proposal sections and content</li>
                  <li>Comments and discussions</li>
                  <li>Tasks and assignments</li>
                  <li>Uploaded documents and files</li>
                  <li>Evaluation and scoring data</li>
                  <li>Win themes and strategies</li>
                </ul>
              </div>
              <p className="text-amber-700 font-medium">
                💡 Consider moving to "Archived" status instead if you might need this data later.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteProposalMutation.isPending}
            >
              {deleteProposalMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Add Column Dialog */}
      <Dialog open={showQuickAddDialog} onOpenChange={setShowQuickAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
            <DialogDescription>
              Create a new custom column at position {quickAddPosition !== null ? quickAddPosition + 1 : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Column Name</Label>
              <Input
                value={quickColumnName}
                onChange={(e) => setQuickColumnName(e.target.value)}
                placeholder="e.g., Client Review, Legal Approval..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleQuickAddSubmit();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <select
                value={quickColumnColor}
                onChange={(e) => setQuickColumnColor(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="bg-slate-100">Gray</option>
                <option value="bg-blue-100">Blue</option>
                <option value="bg-purple-100">Purple</option>
                <option value="bg-indigo-100">Indigo</option>
                <option value="bg-green-100">Green</option>
                <option value="bg-yellow-100">Yellow</option>
                <option value="bg-red-100">Red</option>
                <option value="bg-pink-100">Pink</option>
                <option value="bg-amber-100">Amber</option>
                <option value="bg-teal-100">Teal</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuickAddSubmit} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Droppable droppableId="all-columns" direction="horizontal" type="column">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex gap-0 overflow-x-auto pb-4"
            >
              {columns.map((column, index) => {
                if (!column || !column.id) return null;

                const isColumnCollapsed = collapsedColumns.includes(column.id);
                return (
                  <React.Fragment key={column.id}>
                    <div className="group relative flex items-start flex-shrink-0">
                      <div className="h-16 w-2 hover:w-8 transition-all duration-200 flex items-center justify-center cursor-pointer" onClick={() => handleQuickAddColumn(index)}>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <Draggable 
                      key={column.id} 
                      draggableId={column.id} 
                      index={index} 
                      type="column"
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "flex-shrink-0 transition-all duration-300",
                            isColumnCollapsed ? 'w-16' : 'w-80',
                            snapshot.isDragging && 'opacity-50'
                          )}
                        >
                          <Droppable droppableId={column.id} type="proposal">
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                              >
                                <KanbanColumn
                                  column={column}
                                  proposals={groupedProposals[column.id] || []}
                                  onProposalClick={handleProposalClick}
                                  onDeleteProposal={handleDeleteProposal}
                                  isDraggingOver={snapshot.isDraggingOver}
                                  isCollapsed={isColumnCollapsed}
                                  onToggleCollapse={handleToggleCollapse}
                                  dragHandleProps={provided.dragHandleProps}
                                  onSortChange={handleSortChange}
                                  currentSort={columnSorts[column.id]}
                                  onDeleteColumn={handleDeleteColumn}
                                />
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  </React.Fragment>
                );
              })}

              <div className="group relative flex items-start flex-shrink-0">
                <div className="h-16 w-2 hover:w-8 transition-all duration-200 flex items-center justify-center cursor-pointer" onClick={() => handleQuickAddColumn(columns.length)}>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-blue-500 hover:bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}