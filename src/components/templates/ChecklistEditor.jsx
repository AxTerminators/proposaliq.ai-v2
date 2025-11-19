import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GripVertical, Trash2, Sparkles, CheckCircle, FileText, HelpCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Modal configuration mapping with descriptions
const MODAL_OPTIONS = [
  { value: 'add_partner', label: 'Add Teaming Partner', description: 'Upload capability statement and extract partner details' },
  { value: 'upload_solicitation', label: 'Upload Solicitation', description: 'Upload RFP, SOW, or other solicitation documents' },
  { value: 'add_past_performance', label: 'Add Past Performance', description: 'Document past performance and project details' },
  { value: 'add_resource', label: 'Upload Resource', description: 'Upload general resources or boilerplate content' },
  { value: 'ai_data_collection', label: 'AI-Enhanced Data Call', description: 'Smart form with AI-powered data extraction' },
  { value: 'open_modal_phase1', label: 'Phase 1: Basic Info (Legacy)', description: 'Legacy proposal builder phase' },
  { value: 'open_modal_phase2', label: 'Phase 2: Team Formation (Legacy)', description: 'Legacy proposal builder phase' },
  { value: 'open_modal_phase3', label: 'Phase 3: Resource Gathering (Legacy)', description: 'Legacy proposal builder phase' },
  { value: 'open_modal_phase4', label: 'Phase 4: Solicitation Upload (Legacy)', description: 'Legacy proposal builder phase' },
  { value: 'open_modal_phase5', label: 'Phase 5: Evaluation (Legacy)', description: 'Legacy proposal builder phase' },
  { value: 'open_modal_phase6', label: 'Phase 6: Win Strategy (Legacy)', description: 'Legacy proposal builder phase' },
  { value: 'open_modal_phase7', label: 'Phase 7: Content Planning (Legacy)', description: 'Legacy proposal builder phase' },
  { value: 'open_modal_pricing', label: 'Pricing Review (Legacy)', description: 'Legacy proposal builder phase' }
];

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
      order: items.length,
      associated_action: null,
      ai_config: null,
      approval_config: null
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

  // Update item type
  const handleUpdateType = (itemId, newType) => {
    setItems(items.map(item =>
      item.id === itemId ? { 
        ...item, 
        type: newType,
        associated_action: newType === 'modal_trigger' ? item.associated_action : null,
        ai_config: newType === 'ai_trigger' ? (item.ai_config || { action: 'generate_content' }) : null,
        approval_config: newType === 'approval_request' ? (item.approval_config || { approver_roles: [] }) : null
      } : item
    ));
  };

  // Update associated action for modal triggers
  const handleUpdateAction = (itemId, action) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, associated_action: action } : item
    ));
  };

  // Update AI config
  const handleUpdateAIConfig = (itemId, config) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, ai_config: { ...item.ai_config, ...config } } : item
    ));
  };

  // Update approval config
  const handleUpdateApprovalConfig = (itemId, roles) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, approval_config: { approver_roles: roles.split(',').map(r => r.trim()).filter(r => r) } } : item
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
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Add Checklist Item</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">Enter a label like "Upload RFP" or "Add Team Member", then configure the action type and behavior below.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newItemLabel}
                  onChange={(e) => setNewItemLabel(e.target.value)}
                  placeholder="e.g., Upload Solicitation Document, Add Teaming Partner..."
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

                                <div className="flex-1 space-y-3">
                                  <Input
                                    value={item.label}
                                    onChange={(e) => handleUpdateLabel(item.id, e.target.value)}
                                    placeholder="Item label"
                                  />
                                  
                                  {/* Item Type Selector */}
                                  <div className="space-y-2">
                                    <Label className="text-xs">Item Type</Label>
                                    <Select 
                                      value={item.type} 
                                      onValueChange={(val) => handleUpdateType(item.id, val)}
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="manual_check">
                                          <div className="flex items-center gap-2">
                                            <CheckCircle className="w-3 h-3" />
                                            Manual Check
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="modal_trigger">
                                          <div className="flex items-center gap-2">
                                            <FileText className="w-3 h-3" />
                                            Open Modal/Popup
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="ai_trigger">
                                          <div className="flex items-center gap-2">
                                            <Sparkles className="w-3 h-3" />
                                            AI Action
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="approval_request">
                                          <div className="flex items-center gap-2">
                                            <CheckCircle className="w-3 h-3" />
                                            Approval Request
                                          </div>
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  {/* Modal Trigger Config */}
                                  {item.type === 'modal_trigger' && (
                                    <div className="space-y-2 pl-4 border-l-2 border-blue-200">
                                      <Label className="text-xs">Modal to Open</Label>
                                      <Select 
                                        value={item.associated_action || ''} 
                                        onValueChange={(val) => handleUpdateAction(item.id, val)}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue placeholder="Select modal..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="add_partner">Add Teaming Partner</SelectItem>
                                          <SelectItem value="upload_solicitation">Upload Solicitation</SelectItem>
                                          <SelectItem value="add_past_performance">Add Past Performance</SelectItem>
                                          <SelectItem value="add_resource">Upload Resource</SelectItem>
                                          <SelectItem value="ai_data_collection">AI-Enhanced Data Call</SelectItem>
                                          <SelectItem value="open_modal_phase1">Phase 1: Basic Info (Legacy)</SelectItem>
                                          <SelectItem value="open_modal_phase2">Phase 2: Team Formation (Legacy)</SelectItem>
                                          <SelectItem value="open_modal_phase3">Phase 3: Resource Gathering (Legacy)</SelectItem>
                                          <SelectItem value="open_modal_phase4">Phase 4: Solicitation Upload (Legacy)</SelectItem>
                                          <SelectItem value="open_modal_phase5">Phase 5: Evaluation (Legacy)</SelectItem>
                                          <SelectItem value="open_modal_phase6">Phase 6: Win Strategy (Legacy)</SelectItem>
                                          <SelectItem value="open_modal_phase7">Phase 7: Content Planning (Legacy)</SelectItem>
                                          <SelectItem value="open_modal_pricing">Pricing Review (Legacy)</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  {/* AI Trigger Config */}
                                  {item.type === 'ai_trigger' && (
                                    <div className="space-y-2 pl-4 border-l-2 border-purple-200">
                                      <Label className="text-xs">AI Action</Label>
                                      <Select 
                                        value={item.ai_config?.action || 'generate_content'} 
                                        onValueChange={(val) => handleUpdateAIConfig(item.id, { action: val })}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="generate_content">Generate Content</SelectItem>
                                          <SelectItem value="analyze_compliance">Analyze Compliance</SelectItem>
                                          <SelectItem value="evaluate_match">Evaluate Match Score</SelectItem>
                                          <SelectItem value="suggest_improvements">Suggest Improvements</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  {/* Approval Request Config */}
                                  {item.type === 'approval_request' && (
                                    <div className="space-y-2 pl-4 border-l-2 border-green-200">
                                      <Label className="text-xs">Approver Roles (comma-separated)</Label>
                                      <Input
                                        className="h-8"
                                        value={item.approval_config?.approver_roles?.join(', ') || ''}
                                        onChange={(e) => handleUpdateApprovalConfig(item.id, e.target.value)}
                                        placeholder="e.g., admin, manager"
                                      />
                                    </div>
                                  )}

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