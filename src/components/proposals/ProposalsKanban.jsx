
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Settings2, RotateCcw, AlertTriangle } from "lucide-react";
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

export default function ProposalsKanban({ proposals, onProposalClick, isLoading, user, organization }) {
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState([]);
  const [isEditingColumns, setIsEditingColumns] = useState(false);
  const [columnConfig, setColumnConfig] = useState([]);
  const [collapsedColumns, setCollapsedColumns] = useState([]);
  const [configId, setConfigId] = useState(null);
  const [showResetWarning, setShowResetWarning] = useState(false);

  const defaultColumns = [
    { id: "evaluating", label: "Evaluating", color: "bg-slate-100", order: 0 },
    { id: "watch_list", label: "Watch List", color: "bg-yellow-100", order: 1 },
    { id: "draft", label: "Draft", color: "bg-blue-100", order: 2 },
    { id: "in_progress", label: "In Review", color: "bg-purple-100", order: 3 },
    { id: "submitted", label: "Submitted", color: "bg-indigo-100", order: 4 },
    { id: "won", label: "Won", color: "bg-green-100", order: 5 },
    { id: "lost", label: "Lost", color: "bg-red-100", order: 6 },
    { id: "archived", label: "Archived", color: "bg-gray-100", order: 7 },
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
          
          // Validate and fix order and label if missing
          savedColumns = savedColumns.map((col, idx) => {
            // Find matching default column
            const defaultCol = defaultColumns.find(dc => dc.id === col.id);
            return {
              ...col,
              label: col.label || (defaultCol ? defaultCol.label : col.id),
              color: col.color || (defaultCol ? defaultCol.color : 'bg-slate-100'),
              order: defaultCol ? defaultCol.order : idx
            };
          });
          
          // Sort columns by order property to ensure correct display
          const sortedColumns = [...savedColumns].sort((a, b) => (a.order || 0) - (b.order || 0));
          
          setColumns(sortedColumns);
          setColumnConfig(sortedColumns);
          
          // Load collapsed state
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
    mutationFn: async ({ proposalId, newStatus, oldStatus }) => {
      await base44.entities.Proposal.update(proposalId, {
        status: newStatus
      });

      // Get team members for notifications
      const allUsers = await base44.entities.User.list();
      const teamEmails = allUsers
        .filter(u => {
          const accesses = u.client_accesses || [];
          return accesses.some(a => a.organization_id === organization.id);
        })
        .map(u => u.email);

      return { proposalId, newStatus, oldStatus, teamEmails };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  const saveColumnConfigMutation = useMutation({
    mutationFn: async (newColumns) => {
      const configs = await base44.entities.KanbanConfig.filter({
        organization_id: organization.id
      });

      // Ensure columns have correct order property
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
  });

  const saveCollapsedStateMutation = useMutation({
    mutationFn: async (newCollapsedColumns) => {
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
      setIsEditingColumns(false); // Close the customization dialog if open
    },
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const proposalId = draggableId;
    const newStatus = destination.droppableId;
    const oldStatus = source.droppableId;

    updateStatusMutation.mutate({ proposalId, newStatus, oldStatus });
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
        col.id === columnId ? { ...col, [field]: value } : col
      )
    );
  };

  const handleToggleCollapse = (columnId) => {
    const newCollapsedColumns = collapsedColumns.includes(columnId) 
      ? collapsedColumns.filter(id => id !== columnId)
      : [...collapsedColumns, columnId];
    
    setCollapsedColumns(newCollapsedColumns);
    
    // Save collapsed state immediately
    saveCollapsedStateMutation.mutate(newCollapsedColumns);
  };

  const groupedProposals = columns.reduce((acc, column) => {
    acc[column.id] = proposals.filter(p => p.status === column.id);
    return acc;
  }, {});

  if (isLoading) {
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
          disabled={resetToDefaultMutation.isPending}
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
            <Button variant="outline" size="sm">
              <Settings2 className="w-4 h-4 mr-2" />
              Customize Columns
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customize Kanban Columns</DialogTitle>
              <DialogDescription>
                Edit column labels and colors to match your workflow. Changes are saved automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {columnConfig.map((column, index) => (
                <div key={column.id} className="flex gap-4 items-center p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={column.label}
                      onChange={(e) => handleColumnChange(column.id, 'label', e.target.value)}
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <Label>Color</Label>
                    <select
                      value={column.color}
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
                    </select>
                  </div>
                  <div className="text-sm text-slate-500">
                    Order: {index + 1}
                  </div>
                </div>
              ))}
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
                <li>All custom column names will revert to original names (e.g., "Evaluating", "Watch List", "Draft", "In Review", etc.)</li>
                <li>All custom column colors will revert to default colors</li>
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

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => {
            const isColumnCollapsed = collapsedColumns.includes(column.id);
            return (
              <Droppable key={column.id} droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 transition-all duration-300 ${
                      isColumnCollapsed ? 'w-16' : 'w-80'
                    }`}
                  >
                    <KanbanColumn
                      column={column}
                      proposals={groupedProposals[column.id] || []}
                      onProposalClick={onProposalClick}
                      isDraggingOver={snapshot.isDraggingOver}
                      isCollapsed={isColumnCollapsed}
                      onToggleCollapse={handleToggleCollapse}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
