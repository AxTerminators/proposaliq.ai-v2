import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

/**
 * ChecklistEditor - Dialog for adding/editing checklist items for a column
 * Now supports "Proposal Action" type for navigating to tabs
 */
export default function ChecklistEditor({ column, onSave, onClose }) {
  const [items, setItems] = useState(column.checklist_items || []);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemType, setNewItemType] = useState('manual_check');
  const [newItemRequired, setNewItemRequired] = useState(false);
  
  // Proposal Action specific states
  const [proposalActionType, setProposalActionType] = useState('navigate_to_tab');
  const [targetTab, setTargetTab] = useState('timeline');
  
  // AI Trigger specific states
  const [aiSectionType, setAiSectionType] = useState('executive_summary');

  const handleAddItem = () => {
    if (!newItemLabel.trim()) return;

    let associatedAction = null;

    // Build associated_action based on type
    if (newItemType === 'proposal_action') {
      // Store as JSON string with action details
      associatedAction = JSON.stringify({
        action_type: proposalActionType,
        target_tab: targetTab
      });
    } else if (newItemType === 'ai_trigger') {
      // Store section type for AI generation
      associatedAction = JSON.stringify({
        action: 'generate_section',
        section_type: aiSectionType
      });
    }

    const newItem = {
      id: `item_${Date.now()}`,
      label: newItemLabel.trim(),
      type: newItemType,
      associated_action: associatedAction,
      required: newItemRequired,
      order: items.length
    };

    setItems([...items, newItem]);
    setNewItemLabel('');
    setNewItemType('manual_check');
    setNewItemRequired(false);
    setProposalActionType('navigate_to_tab');
    setTargetTab('timeline');
    setAiSectionType('executive_summary');
  };

  const handleRemoveItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reorderedItems = Array.from(items);
    const [removed] = reorderedItems.splice(result.source.index, 1);
    reorderedItems.splice(result.destination.index, 0, removed);

    // Update order property for each item
    const updatedItems = reorderedItems.map((item, index) => ({
      ...item,
      order: index
    }));

    setItems(updatedItems);
  };

  const handleSave = () => {
    onSave({
      ...column,
      checklist_items: items
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Checklist Items - {column.label}</DialogTitle>
          <DialogDescription>
            Add checklist items that will appear on proposal cards in this column
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Existing Items List */}
          {items.length > 0 && (
            <div className="space-y-2">
              <Label>Current Checklist Items (drag to reorder)</Label>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="checklist-items">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {items.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "flex items-center gap-2 p-3 border rounded-lg bg-slate-50",
                                snapshot.isDragging && "shadow-lg border-blue-500"
                              )}
                            >
                              <div
                                {...provided.dragHandleProps}
                                className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{item.label}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                  <span className="capitalize">{item.type.replace(/_/g, ' ')}</span>
                                  {item.required && (
                                    <span className="text-red-600 font-semibold">• Required</span>
                                  )}
                                  {item.type === 'proposal_action' && item.associated_action && (
                                    <span className="text-blue-600">
                                      → {JSON.parse(item.associated_action).target_tab}
                                    </span>
                                  )}
                                  {item.type === 'ai_trigger' && item.associated_action && (
                                    <span className="text-purple-600">
                                      → Generate {JSON.parse(item.associated_action).section_type?.replace(/_/g, ' ')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
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
          )}

          {/* Add New Item Form */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-semibold">Add New Checklist Item</Label>
            
            <div className="space-y-2">
              <Label htmlFor="item-label">Item Label *</Label>
              <Input
                id="item-label"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                placeholder="e.g., Complete timeline setup"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-type">Item Type *</Label>
              <Select value={newItemType} onValueChange={setNewItemType}>
                <SelectTrigger id="item-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_check">Manual Check</SelectItem>
                  <SelectItem value="modal_trigger">Open Modal</SelectItem>
                  <SelectItem value="ai_trigger">AI Action</SelectItem>
                  <SelectItem value="proposal_action">Proposal Action</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {newItemType === 'manual_check' && 'User manually checks this item'}
                {newItemType === 'modal_trigger' && 'Opens a modal form when clicked'}
                {newItemType === 'ai_trigger' && 'Triggers an AI action'}
                {newItemType === 'proposal_action' && 'Navigate to a tab or create an item in the proposal card'}
              </p>
            </div>

            {/* AI Trigger Configuration */}
            {newItemType === 'ai_trigger' && (
              <div className="space-y-4 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                <Label className="text-sm font-semibold text-purple-900">
                  AI Content Generation Configuration
                </Label>

                <div className="space-y-2">
                  <Label htmlFor="ai-section-type">Section to Generate</Label>
                  <Select value={aiSectionType} onValueChange={setAiSectionType}>
                    <SelectTrigger id="ai-section-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive_summary">Executive Summary</SelectItem>
                      <SelectItem value="technical_approach">Technical Approach</SelectItem>
                      <SelectItem value="management_plan">Management Plan</SelectItem>
                      <SelectItem value="past_performance">Past Performance</SelectItem>
                      <SelectItem value="key_personnel">Key Personnel</SelectItem>
                      <SelectItem value="corporate_experience">Corporate Experience</SelectItem>
                      <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                      <SelectItem value="transition_plan">Transition Plan</SelectItem>
                      <SelectItem value="pricing">Pricing</SelectItem>
                      <SelectItem value="custom">Custom Section</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-purple-700">
                    When clicked, this will trigger AI to generate this section using configured settings
                  </p>
                </div>
              </div>
            )}

            {/* Proposal Action Configuration */}
            {newItemType === 'proposal_action' && (
              <div className="space-y-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <Label className="text-sm font-semibold text-blue-900">
                  Proposal Action Configuration
                </Label>

                <div className="space-y-2">
                  <Label htmlFor="action-type">Action Type</Label>
                  <Select value={proposalActionType} onValueChange={setProposalActionType}>
                    <SelectTrigger id="action-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="navigate_to_tab">Navigate to Tab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {proposalActionType === 'navigate_to_tab' && (
                  <div className="space-y-2">
                    <Label htmlFor="target-tab">Target Tab</Label>
                    <Select value={targetTab} onValueChange={setTargetTab}>
                      <SelectTrigger id="target-tab">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="timeline">Timeline</SelectItem>
                        <SelectItem value="tasks">Tasks</SelectItem>
                        <SelectItem value="data-calls">Data Calls</SelectItem>
                        <SelectItem value="discussions">Discussions</SelectItem>
                        <SelectItem value="files">Files</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-blue-700">
                      When clicked, this will open the proposal card and navigate to the selected tab
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="item-required"
                checked={newItemRequired}
                onCheckedChange={setNewItemRequired}
              />
              <Label htmlFor="item-required" className="cursor-pointer">
                Mark as required (must be completed to move to next stage)
              </Label>
            </div>

            <Button
              onClick={handleAddItem}
              disabled={!newItemLabel.trim()}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Checklist Item
            </Button>
          </div>
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
  );
}