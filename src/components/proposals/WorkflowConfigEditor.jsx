import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Save,
  X,
  Edit
} from "lucide-react";
import { cn } from "@/lib/utils";
import ColorPicker from "@/components/ui/ColorPicker";

// Standard master board columns for system templates (when organizationId is null)
// These match the actual master board structure from createMasterBoardConfig
const STANDARD_MASTER_COLUMNS = [
  { id: 'master_qualifying', label: 'Qualifying' },
  { id: 'master_drafting', label: 'Drafting' },
  { id: 'master_reviewing', label: 'Reviewing' },
  { id: 'master_submitted', label: 'Submitted' },
  { id: 'master_won', label: 'Won' },
  { id: 'master_lost', label: 'Lost' },
  { id: 'master_archived', label: 'Archived' }
];

export default function WorkflowConfigEditor({ workflowConfig, onChange, organizationId }) {
  const columns = workflowConfig?.columns || [];
  
  // Auto-expand all columns when component mounts or columns change
  const [expandedColumns, setExpandedColumns] = useState(() => {
    return new Set(columns.map(col => col.id));
  });
  const [editingColumn, setEditingColumn] = useState(null);

  // Fetch Master Board columns
  const { data: masterBoard, isLoading: isLoadingMasterBoard } = useQuery({
    queryKey: ['masterBoard', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const boards = await base44.entities.KanbanConfig.filter({
        organization_id: organizationId,
        is_master_board: true
      });
      console.log('[WorkflowConfigEditor] Master board fetch result:', boards);
      return boards[0] || null;
    },
    enabled: !!organizationId
  });

  // Use standard columns if no organizationId, otherwise use org's master board
  const masterBoardColumns = organizationId 
    ? (masterBoard?.columns || [])
    : STANDARD_MASTER_COLUMNS;
  
  console.log('[WorkflowConfigEditor] organizationId:', organizationId);
  console.log('[WorkflowConfigEditor] Using standard columns:', !organizationId);
  console.log('[WorkflowConfigEditor] masterBoard:', masterBoard);
  console.log('[WorkflowConfigEditor] masterBoardColumns:', masterBoardColumns);

  // Update expanded columns when columns change
  React.useEffect(() => {
    setExpandedColumns(new Set(columns.map(col => col.id)));
  }, [columns.length]);

  const toggleColumn = (columnId) => {
    const newExpanded = new Set(expandedColumns);
    if (newExpanded.has(columnId)) {
      newExpanded.delete(columnId);
    } else {
      newExpanded.add(columnId);
    }
    setExpandedColumns(newExpanded);
  };

  const addColumn = () => {
    const newColumn = {
      id: `col_${Date.now()}`,
      label: "New Column",
      color: "from-slate-400 to-slate-500",
      order: columns.length,
      type: "custom_stage",
      checklist_items: []
    };

    onChange({
      ...workflowConfig,
      columns: [...columns, newColumn]
    });

    setExpandedColumns(new Set([...expandedColumns, newColumn.id]));
  };

  const updateColumn = (columnId, updates) => {
    onChange({
      ...workflowConfig,
      columns: columns.map(col => 
        col.id === columnId ? { ...col, ...updates } : col
      )
    });
  };

  const deleteColumn = (columnId) => {
    if (!confirm('Are you sure you want to delete this column?')) return;

    onChange({
      ...workflowConfig,
      columns: columns.filter(col => col.id !== columnId)
    });
  };

  const addChecklistItem = (columnId) => {
    const column = columns.find(c => c.id === columnId);
    const newItem = {
      id: `item_${Date.now()}`,
      label: "New Checklist Item",
      type: "manual_check",
      required: false,
      order: (column?.checklist_items?.length || 0)
    };

    updateColumn(columnId, {
      checklist_items: [...(column?.checklist_items || []), newItem]
    });
  };

  const updateChecklistItem = (columnId, itemId, updates) => {
    const column = columns.find(c => c.id === columnId);
    updateColumn(columnId, {
      checklist_items: column.checklist_items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    });
  };

  const deleteChecklistItem = (columnId, itemId) => {
    const column = columns.find(c => c.id === columnId);
    updateColumn(columnId, {
      checklist_items: column.checklist_items.filter(item => item.id !== itemId)
    });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    onChange({
      ...workflowConfig,
      columns: items.map((col, idx) => ({ ...col, order: idx }))
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Workflow Configuration</h3>
        <Button onClick={addColumn} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Column
        </Button>
      </div>

      {columns.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-600 mb-3">No columns yet</p>
            <Button onClick={addColumn}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Column
            </Button>
          </CardContent>
        </Card>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="columns">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="space-y-2"
              >
                {columns.map((column, idx) => {
                  const isExpanded = expandedColumns.has(column.id);
                  const isEditing = editingColumn === column.id;

                  return (
                    <Draggable key={column.id} draggableId={column.id} index={idx}>
                      {(provided, snapshot) => (
                        <Card 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "border-2 transition-shadow",
                            snapshot.isDragging && "shadow-lg"
                          )}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              {/* Drag Handle */}
                              <div 
                                {...provided.dragHandleProps}
                                className="cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="w-5 h-5 text-slate-400" />
                              </div>

                    {/* Column Info */}
                    <button
                      onClick={() => toggleColumn(column.id)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                      <div className={cn("w-4 h-4 rounded", `bg-gradient-to-r ${column.color}`)} />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{column.label}</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Badge variant="outline" className="text-xs">{column.type}</Badge>
                          {column.checklist_items?.length > 0 && (
                            <span>{column.checklist_items.length} items</span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingColumn(isEditing ? null : column.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!column.is_locked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteColumn(column.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {(isExpanded || isEditing) && (
                  <CardContent className="space-y-4 border-t pt-4">
                    {isEditing && (
                      <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Column Label</Label>
                            <Input
                              value={column.label}
                              onChange={(e) => updateColumn(column.id, { label: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Column Type</Label>
                            <Select
                              value={column.type}
                              onValueChange={(value) => updateColumn(column.id, { type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="custom_stage">Custom Stage</SelectItem>
                                <SelectItem value="default_status">Default Status</SelectItem>
                                <SelectItem value="locked_phase">Locked Phase</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Map to Master Board Column</Label>
                          <Select
                            value={column.master_board_column_id || ""}
                            onValueChange={(value) => updateColumn(column.id, { master_board_column_id: value || null })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select master board column" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={null}>None</SelectItem>
                              {masterBoardColumns.map((masterCol) => (
                                <SelectItem key={masterCol.id} value={masterCol.id}>
                                  {masterCol.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-slate-500">
                            {!organizationId ? (
                              <span className="text-blue-600">ℹ Using standard master board columns ({masterBoardColumns.length} available)</span>
                            ) : masterBoardColumns.length === 0 ? (
                              <span className="text-amber-600">⚠ No master board found</span>
                            ) : (
                              <>Link this column to a Master Board column ({masterBoardColumns.length} available)</>
                            )}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <ColorPicker
                            value={column.color}
                            onChange={(color) => updateColumn(column.id, { color })}
                            mode="solid"
                            label="Column Color"
                          />
                        </div>
                      </div>
                    )}

                    {/* Checklist Items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-semibold">Checklist Items</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addChecklistItem(column.id)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Item
                        </Button>
                      </div>

                      {(!column.checklist_items || column.checklist_items.length === 0) ? (
                        <p className="text-sm text-slate-500 italic">No checklist items</p>
                      ) : (
                        <div className="space-y-2">
                          {column.checklist_items.map((item) => (
                            <Card key={item.id} className="border">
                              <CardContent className="p-3">
                                <div className="space-y-3">
                                  <div className="flex items-start gap-2">
                                    <Input
                                      value={item.label}
                                      onChange={(e) => updateChecklistItem(column.id, item.id, { label: e.target.value })}
                                      placeholder="Item label"
                                      className="flex-1"
                                    />
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => deleteChecklistItem(column.id, item.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs">Type</Label>
                                      <Select
                                        value={item.type}
                                        onValueChange={(value) => updateChecklistItem(column.id, item.id, { type: value })}
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="manual_check">Manual Check</SelectItem>
                                          <SelectItem value="modal_trigger">Modal Trigger</SelectItem>
                                          <SelectItem value="ai_trigger">AI Trigger</SelectItem>
                                          <SelectItem value="system_check">System Check</SelectItem>
                                          <SelectItem value="navigate">Navigate</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {(item.type === 'modal_trigger' || item.type === 'ai_trigger' || item.type === 'navigate') && (
                                      <div>
                                        <Label className="text-xs">Associated Action</Label>
                                        <Input
                                          value={item.associated_action || ''}
                                          onChange={(e) => updateChecklistItem(column.id, item.id, { associated_action: e.target.value })}
                                          placeholder="e.g., open_modal_basic_info"
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={item.required}
                                      onChange={(e) => updateChecklistItem(column.id, item.id, { required: e.target.checked })}
                                      className="rounded"
                                    />
                                    <Label className="text-xs">Required to proceed</Label>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
                        </Card>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}