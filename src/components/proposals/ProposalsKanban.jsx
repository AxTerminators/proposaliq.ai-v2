
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Settings2, RotateCcw, AlertTriangle, Trash2, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function ProposalsKanban({ proposals = [], onProposalClick, onDeleteProposal, isLoading, user, organization }) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState([]);
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [columnConfig, setColumnConfig] = useState([]);
  const [collapsedColumns, setCollapsedColumns] = useState([]);
  const [configId, setConfigId] = useState(null);
  const [showResetWarning, setShowResetWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // New column states
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("bg-slate-100");
  const [showColumnDeleteWarning, setShowColumnDeleteWarning] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState(null);
  const [columnDeleteError, setColumnDeleteError] = useState(null);

  // Quick add column states
  const [showQuickAddDialog, setShowQuickAddDialog] = useState(false);
  const [quickAddPosition, setQuickAddPosition] = useState(null);
  const [quickColumnName, setQuickColumnName] = useState("");
  const [quickColumnColor, setQuickColumnColor] = useState("bg-slate-100");

  const defaultColumns = [
    { id: "evaluating", label: "Evaluating", color: "bg-slate-100", order: 0, type: "default_status", default_status_mapping: "evaluating" },
    { id: "watch_list", label: "Watch List", color: "bg-yellow-100", order: 1, type: "default_status", default_status_mapping: "watch_list" },
    { id: "draft", label: "Draft", color: "bg-blue-100", order: 2, type: "default_status", default_status_mapping: "draft" },
    { id: "in_progress", label: "In Review", color: "bg-purple-100", order: 3, type: "default_status", default_status_mapping: "in_progress" },
    { id: "submitted", label: "Submitted", color: "bg-indigo-100", order: 4, type: "default_status", default_status_mapping: "submitted" },
    { id: "won", label: "Won", color: "bg-green-100", order: 5, type: "default_status", default_status_mapping: "won" },
    { id: "lost", label: "Lost", color: "bg-red-100", order: 6, type: "default_status", default_status_mapping: "lost" },
    { id: "archived", label: "Archived", color: "bg-gray-100", order: 7, type: "default_status", default_status_mapping: "archived" },
  ];

  useEffect(() => {
    const loadConfig = async () => {
      if (!organization?.id) return;
      
      try {
        const configs = await base44.entities.KanbanConfig.filter({
          organization_id: organization.id
        });

        if (configs.length > 0) {
          const config = configs[0];
          setConfigId(config.id);
          
          let savedColumns = config.columns || defaultColumns;
          
          // Ensure all columns have required properties
          savedColumns = savedColumns.map((col, idx) => {
            const defaultCol = defaultColumns.find(dc => dc.id === col.id);
            return {
              id: col.id || `col_${idx}`,
              label: col.label || (defaultCol ? defaultCol.label : col.id || `Column ${idx + 1}`),
              color: col.color || (defaultCol ? defaultCol.color : 'bg-slate-100'),
              order: col.order !== undefined ? col.order : (defaultCol ? defaultCol.order : idx),
              type: col.type || (defaultCol ? 'default_status' : 'custom_stage'),
              default_status_mapping: col.default_status_mapping || (defaultCol ? defaultCol.default_status_mapping : null)
            };
          });
          
          const sortedColumns = [...savedColumns].sort((a, b) => (a.order || 0) - (b.order || 0));
          
          setColumns(sortedColumns);
          setColumnConfig(sortedColumns);
          
          if (config.collapsed_column_ids) {
            setCollapsedColumns(config.collapsed_column_ids);
          }
        } else {
          setColumns(defaultColumns);
          setColumnConfig(defaultColumns);
        }
      } catch (error) {
        console.error("Error loading kanban config:", error);
        setColumns(defaultColumns);
        setColumnConfig(defaultColumns);
      }
    };

    loadConfig();
  }, [organization?.id]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ proposalId, newColumnId, oldColumnId }) => {
      if (!proposalId || !newColumnId || !columns || columns.length === 0) {
        throw new Error("Missing required data for status update");
      }

      const newColumn = columns.find(c => c?.id === newColumnId);
      const oldColumn = columns.find(c => c?.id === oldColumnId);

      if (!newColumn) {
        throw new Error("Destination column not found");
      }

      // Prepare update data
      const updateData = {};

      if (newColumn.type === 'default_status') {
        // Moving to a default status column
        updateData.status = newColumn.default_status_mapping;
        updateData.custom_workflow_stage_id = null;
      } else {
        // Moving to a custom column
        updateData.custom_workflow_stage_id = newColumnId;
        updateData.status = 'in_progress'; // Set a reasonable default status
      }

      await base44.entities.Proposal.update(proposalId, updateData);

      const allUsers = await base44.entities.User.list();
      const teamEmails = allUsers
        .filter(u => {
          const accesses = u?.client_accesses || [];
          return accesses.some(a => a?.organization_id === organization?.id);
        })
        .map(u => u.email);

      return { proposalId, newColumnId, oldColumnId, teamEmails };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
    onError: (error) => {
      console.error("Error updating proposal status:", error);
      alert("Error moving proposal. Please try again.");
    },
  });

  const saveColumnConfigMutation = useMutation({
    mutationFn: async (newColumns) => {
      if (!organization?.id) {
        throw new Error("Organization ID is required");
      }

      const configs = await base44.entities.KanbanConfig.filter({
        organization_id: organization.id
      });

      const columnsWithOrder = newColumns.map((col, idx) => ({
        ...col,
        order: idx
      }));

      if (configs.length > 0) {
        await base44.entities.KanbanConfig.update(configs[0].id, {
          columns: columnsWithOrder,
          collapsed_column_ids: collapsedColumns
        });
      } else {
        const created = await base44.entities.KanbanConfig.create({
          organization_id: organization.id,
          columns: columnsWithOrder,
          collapsed_column_ids: collapsedColumns
        });
        setConfigId(created.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
    },
    onError: (error) => {
      console.error("Error saving column config:", error);
      alert("Error saving column configuration. Please try again.");
    }
  });

  const saveCollapsedStateMutation = useMutation({
    mutationFn: async (newCollapsedColumns) => {
      if (!organization?.id) {
        throw new Error("Organization ID is required");
      }

      if (configId) {
        await base44.entities.KanbanConfig.update(configId, {
          collapsed_column_ids: newCollapsedColumns
        });
      } else {
        const created = await base44.entities.KanbanConfig.create({
          organization_id: organization.id,
          columns: columns,
          collapsed_column_ids: newCollapsedColumns
        });
        setConfigId(created.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
    },
  });

  const resetToDefaultMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error("Organization ID is required");
      }

      const configs = await base44.entities.KanbanConfig.filter({
        organization_id: organization.id
      });

      if (configs.length > 0) {
        await base44.entities.KanbanConfig.update(configs[0].id, {
          columns: defaultColumns,
          collapsed_column_ids: []
        });
      } else {
        const created = await base44.entities.KanbanConfig.create({
          organization_id: organization.id,
          columns: defaultColumns,
          collapsed_column_ids: []
        });
        setConfigId(created.id);
      }
    },
    onSuccess: () => {
      setColumns(defaultColumns);
      setColumnConfig(defaultColumns);
      setCollapsedColumns([]);
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      setShowResetWarning(false);
      setIsEditingColumns(false);
    },
  });

  const deleteProposalMutation = useMutation({
    mutationFn: async (proposalId) => {
      await base44.entities.Proposal.delete(proposalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setShowDeleteWarning(false);
      setProposalToDelete(null);
    },
  });

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((result) => {
    setIsDragging(false);
    
    if (!result.destination) return;

    const { source, destination, draggableId, type } = result;

    try {
      // Handle column reordering
      if (type === 'column') {
        const newColumns = Array.from(columns);
        const [movedColumn] = newColumns.splice(source.index, 1);
        newColumns.splice(destination.index, 0, movedColumn);

        // Update order property
        const reorderedColumns = newColumns.map((col, idx) => ({
          ...col,
          order: idx
        }));

        setColumns(reorderedColumns);
        saveColumnConfigMutation.mutate(reorderedColumns);
        return;
      }

      // Handle proposal card moving between columns
      if (source.droppableId === destination.droppableId && source.index === destination.index) {
        return;
      }

      const proposalId = draggableId;
      const newColumnId = destination.droppableId;
      const oldColumnId = source.droppableId;

      if (!proposalId || !newColumnId || !oldColumnId) {
        console.error("Missing drag data", { proposalId, newColumnId, oldColumnId });
        return;
      }

      updateStatusMutation.mutate({ proposalId, newColumnId, oldColumnId });
    } catch (error) {
      console.error("Error in handleDragEnd:", error);
    }
  }, [columns, updateStatusMutation, saveColumnConfigMutation]);

  const handleAddColumn = () => {
    if (!newColumnLabel.trim()) {
      alert("Please enter a column name");
      return;
    }

    // Generate unique ID for custom column
    const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newColumn = {
      id: customId,
      label: newColumnLabel.trim(),
      color: newColumnColor,
      order: columnConfig.length,
      type: 'custom_stage',
      default_status_mapping: null
    };

    setColumnConfig(prev => [...prev, newColumn]);
    setNewColumnLabel("");
    setNewColumnColor("bg-slate-100");
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

    // Check if column has any proposals
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

    // Column is empty, show confirmation
    setColumnToDelete(column);
    setColumnDeleteError(null);
    setShowColumnDeleteWarning(true);
  };

  const confirmDeleteColumn = () => {
    if (!columnToDelete) return;

    // Remove column from config
    setColumnConfig(prev => prev.filter(col => col?.id !== columnToDelete.id));
    setShowColumnDeleteWarning(false);
    setColumnToDelete(null);
    setColumnDeleteError(null);
  };

  const handleSaveColumns = () => {
    const sortedConfig = columnConfig.map((col, idx) => ({
      ...col,
      order: idx
    }));
    
    setColumns(sortedConfig);
    saveColumnConfigMutation.mutate(sortedConfig);
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
        col?.id === columnId ? { ...col, [field]: value } : col
      )
    );
  };

  const handleColumnOrderChange = (columnId, newOrder) => {
    const orderNum = parseInt(newOrder, 10);
    if (isNaN(orderNum) || orderNum < 1 || orderNum > columnConfig.length) return;

    const targetIndex = orderNum - 1;
    const currentIndex = columnConfig.findIndex(col => col.id === columnId);
    
    if (currentIndex === -1 || targetIndex === currentIndex) return;

    const newColumns = Array.from(columnConfig);
    const [movedColumn] = newColumns.splice(currentIndex, 1);
    newColumns.splice(Math.min(targetIndex, newColumns.length), 0, movedColumn);

    setColumnConfig(newColumns);
  };

  const handleConfigDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    if (source.index === destination.index) return;

    const newColumns = Array.from(columnConfig);
    const [movedColumn] = newColumns.splice(source.index, 1);
    newColumns.splice(destination.index, 0, movedColumn);

    setColumnConfig(newColumns);
  };

  const handleToggleCollapse = useCallback((columnId) => {
    if (!columnId || isDragging) return; // Prevent collapse during drag

    const newCollapsedColumns = collapsedColumns.includes(columnId) 
      ? collapsedColumns.filter(id => id !== columnId)
      : [...collapsedColumns, columnId];
    
    setCollapsedColumns(newCollapsedColumns);
    
    saveCollapsedStateMutation.mutate(newCollapsedColumns);
  }, [collapsedColumns, isDragging, saveCollapsedStateMutation]);

  const handleQuickAddColumn = useCallback((position) => {
    setQuickAddPosition(position);
    setQuickColumnName("");
    setQuickColumnColor("bg-slate-100");
    setShowQuickAddDialog(true);
  }, []);

  const handleQuickAddSubmit = () => {
    if (!quickColumnName.trim()) {
      alert("Please enter a column name");
      return;
    }

    const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newColumn = {
      id: customId,
      label: quickColumnName.trim(),
      color: quickColumnColor,
      order: quickAddPosition,
      type: 'custom_stage',
      default_status_mapping: null
    };

    // Insert at the specified position
    const newColumns = [...columns];
    newColumns.splice(quickAddPosition, 0, newColumn);
    
    const reorderedColumns = newColumns.map((col, idx) => ({ ...col, order: idx }));

    setColumns(reorderedColumns);
    saveColumnConfigMutation.mutate(reorderedColumns); // Save the updated configuration
    setShowQuickAddDialog(false);
  };

  const handleDeleteProposal = useCallback((proposal) => {
    setProposalToDelete(proposal);
    setShowDeleteWarning(true);
  }, []);

  const confirmDelete = () => {
    if (proposalToDelete?.id) {
      deleteProposalMutation.mutate(proposalToDelete.id);
    }
  };

  const groupedProposals = useMemo(() => {
    return columns.reduce((acc, column) => {
      if (!column || !column.id) return acc;

      if (column.type === 'default_status') {
        acc[column.id] = (proposals || []).filter(p => p?.status === column.default_status_mapping);
      } else {
        acc[column.id] = (proposals || []).filter(p => p?.custom_workflow_stage_id === column.id);
      }
      return acc;
    }, {});
  }, [columns, proposals]);

  const handleProposalClick = useCallback((proposal) => {
    if (onProposalClick) {
      onProposalClick(proposal);
    }
  }, [onProposalClick]);

  if (isLoading || !organization) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex-shrink-0 w-80">
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
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
                    {/* Column Divider with + button */}
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
                      isDragDisabled={isDragging}
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

              {/* Final divider after last column */}
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
