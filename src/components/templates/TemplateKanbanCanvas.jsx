import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Trash2, Lock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import ColumnEditor from './ColumnEditor';
import ChecklistEditor from './ChecklistEditor';

export default function TemplateKanbanCanvas({ columns, onColumnsChange, previewMode = false }) {
  const [editingColumn, setEditingColumn] = useState(null);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Handle drag end for column reordering
  const handleDragEnd = (result) => {
    if (!result.destination || previewMode) return;

    const items = Array.from(columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order values
    const updatedColumns = items.map((col, idx) => ({
      ...col,
      order: col.is_terminal ? col.order : idx
    }));

    onColumnsChange(updatedColumns);
  };

  // Add new custom column
  const handleAddColumn = () => {
    const customColumns = columns.filter(col => !col.is_terminal);
    const newColumn = {
      id: `custom_${Date.now()}`,
      label: 'New Stage',
      color: '#3b82f6',
      order: customColumns.length,
      type: 'custom_stage',
      is_locked: false,
      is_terminal: false,
      checklist_items: []
    };

    // Insert before terminal columns
    const terminalColumns = columns.filter(col => col.is_terminal);
    const updatedColumns = [...customColumns, newColumn, ...terminalColumns];
    onColumnsChange(updatedColumns);
  };

  // Update column
  const handleUpdateColumn = (columnId, updates) => {
    const updatedColumns = columns.map(col =>
      col.id === columnId ? { ...col, ...updates } : col
    );
    onColumnsChange(updatedColumns);
    setEditingColumn(null);
  };

  // Delete column
  const handleDeleteColumn = (columnId) => {
    const updatedColumns = columns.filter(col => col.id !== columnId);
    onColumnsChange(updatedColumns);
    setDeleteConfirm(null);
  };

  // Update checklist for column
  const handleUpdateChecklist = (columnId, checklistItems) => {
    const updatedColumns = columns.map(col =>
      col.id === columnId ? { ...col, checklist_items: checklistItems } : col
    );
    onColumnsChange(updatedColumns);
    setEditingChecklist(null);
  };

  // Separate custom and terminal columns
  const customColumns = columns.filter(col => !col.is_terminal);
  const terminalColumns = columns.filter(col => col.is_terminal).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Workflow Columns</h2>
            {!previewMode && (
              <Button onClick={handleAddColumn} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="columns" direction="horizontal" isDropDisabled={previewMode}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex gap-4 overflow-x-auto pb-4"
                >
                  {/* Custom Columns (draggable) */}
                  {customColumns.map((column, index) => (
                    <Draggable
                      key={column.id}
                      draggableId={column.id}
                      index={index}
                      isDragDisabled={previewMode}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex-shrink-0 w-80 ${snapshot.isDragging ? 'opacity-50' : ''}`}
                        >
                          <ColumnCard
                            column={column}
                            onEdit={() => setEditingColumn(column)}
                            onDelete={() => setDeleteConfirm(column)}
                            onEditChecklist={() => setEditingChecklist(column)}
                            previewMode={previewMode}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {/* Terminal Columns (non-draggable) */}
                  {terminalColumns.map((column) => (
                    <div key={column.id} className="flex-shrink-0 w-80">
                      <ColumnCard
                        column={column}
                        onEdit={() => setEditingColumn(column)}
                        onEditChecklist={() => setEditingChecklist(column)}
                        previewMode={previewMode}
                        isTerminal
                      />
                    </div>
                  ))}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {customColumns.length === 0 && !previewMode && (
            <div className="text-center py-12 text-slate-500">
              <p className="mb-4">No custom columns yet. Click "Add Column" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Editor Dialog */}
      {editingColumn && (
        <ColumnEditor
          column={editingColumn}
          onSave={(updates) => handleUpdateColumn(editingColumn.id, updates)}
          onClose={() => setEditingColumn(null)}
        />
      )}

      {/* Checklist Editor Dialog */}
      {editingChecklist && (
        <ChecklistEditor
          column={editingChecklist}
          onSave={(checklistItems) => handleUpdateChecklist(editingChecklist.id, checklistItems)}
          onClose={() => setEditingChecklist(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.label}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteColumn(deleteConfirm.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Column Card Component
function ColumnCard({ column, onEdit, onDelete, onEditChecklist, previewMode, isTerminal }) {
  return (
    <Card
      className="h-full"
      style={{ borderTopColor: column.color, borderTopWidth: '4px' }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 
                className={`font-semibold text-lg truncate ${!previewMode ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
                onClick={!previewMode ? onEdit : undefined}
              >
                {column.label}
              </h3>
              {column.wip_limit > 0 && (
                <Badge variant="outline" className="text-xs">
                  WIP: 0/{column.wip_limit}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {isTerminal && (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="w-3 h-3 mr-1" />
                  Terminal
                </Badge>
              )}
              {column.requires_approval_to_exit && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                  🔒 Approval Required
                </Badge>
              )}
            </div>
          </div>
          {!previewMode && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Settings className="w-4 h-4" />
              </Button>
              {!isTerminal && (
                <Button variant="ghost" size="sm" onClick={onDelete}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Checklist Items</span>
            {!previewMode && (
              <Button variant="ghost" size="sm" onClick={onEditChecklist}>
                Edit
              </Button>
            )}
          </div>
          {column.checklist_items?.length > 0 ? (
            <div className="space-y-1">
              {column.checklist_items.map((item, idx) => (
                <div key={item.id || idx} className="flex items-start gap-2 text-sm">
                  <div className="w-4 h-4 border-2 border-slate-300 rounded mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-700">{item.label}</span>
                    {item.required && (
                      <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">No checklist items</p>
          )}
        </div>

        {previewMode && (
          <div className="pt-3 border-t border-slate-200">
            <div className="h-24 bg-slate-50 rounded border-2 border-dashed border-slate-300 flex items-center justify-center">
              <span className="text-sm text-slate-500">Sample Card</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}