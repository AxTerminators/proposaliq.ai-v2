import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function ChecklistEditor({ column, onSave, onClose }) {
  const [items, setItems] = useState(column.checklist_items || []);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Handle drag end for item reordering
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(items);
    const [movedItem] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, movedItem);

    // Update order property
    const updatedItems = reorderedItems.map((item, idx) => ({
      ...item,
      order: idx
    }));

    setItems(updatedItems);
  };

  // Add new item
  const handleAddItem = () => {
    if (!newItemLabel.trim()) return;

    const newItem = {
      id: `item_${Date.now()}`,
      label: newItemLabel.trim(),
      type: 'manual_check',
      required: false,
      order: items.length
    };

    setItems([...items, newItem]);
    setNewItemLabel('');
  };

  // Toggle required status
  const handleToggleRequired = (itemId) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, required: !item.required } : item
    ));
  };

  // Update item label
  const handleUpdateLabel = (itemId, newLabel) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, label: newLabel } : item
    ));
  };

  // Delete item
  const handleDeleteItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
    setDeleteConfirm(null);
  };

  // Save changes
  const handleSave = () => {
    onSave(items);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Checklist for "{column.label}"</DialogTitle>
            <DialogDescription>
              Add and configure checklist items that will appear on cards in this column
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Add New Item */}
            <div className="flex gap-2">
              <Input
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                placeholder="Enter checklist item label..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddItem();
                  }
                }}
              />
              <Button onClick={handleAddItem} disabled={!newItemLabel.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Checklist Items */}
            {items.length > 0 ? (
              <div className="space-y-2">
                <Label>Checklist Items (drag to reorder)</Label>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="checklist-items">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-2"
                      >
                        {items.map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-3 p-3 bg-white border rounded-lg ${
                                  snapshot.isDragging ? 'shadow-lg' : ''
                                }`}
                              >
                                <div {...provided.dragHandleProps} className="cursor-grab">
                                  <GripVertical className="w-5 h-5 text-slate-400" />
                                </div>

                                <div className="flex-1 space-y-2">
                                  <Input
                                    value={item.label}
                                    onChange={(e) => handleUpdateLabel(item.id, e.target.value)}
                                    placeholder="Item label"
                                  />
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`required-${item.id}`}
                                      checked={item.required}
                                      onCheckedChange={() => handleToggleRequired(item.id)}
                                    />
                                    <label
                                      htmlFor={`required-${item.id}`}
                                      className="text-sm cursor-pointer"
                                    >
                                      Required to exit this column
                                    </label>
                                    {item.required && (
                                      <Badge variant="secondary" className="text-xs">
                                        Gate
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(item)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                <p>No checklist items yet. Add your first item above.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Checklist Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.label}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteItem(deleteConfirm.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}