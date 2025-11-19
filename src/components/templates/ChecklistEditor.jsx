import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GripVertical, Trash2, Sparkles, CheckCircle, FileText, HelpCircle, Wand2, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

// Modal configuration mapping with descriptions
// Phase 1: Updated with new templates
const MODAL_OPTIONS = [
  { value: 'add_partner', label: 'Add Teaming Partner', description: 'Upload capability statement and extract partner details' },
  { value: 'upload_solicitation', label: 'Upload Solicitation', description: 'Upload RFP, SOW, or other solicitation documents' },
  { value: 'add_past_performance', label: 'Add Past Performance', description: 'Document past performance and project details' },
  { value: 'add_resource', label: 'Upload Resource', description: 'Upload general resources or boilerplate content' },
  { value: 'ai_data_collection', label: 'AI-Enhanced Data Call', description: 'Smart form with AI-powered data extraction' },
  { value: 'pricing_sheet', label: 'Pricing Sheet', description: 'Collect pricing data including CLINs, labor rates, and ODCs' },
  { value: 'compliance_matrix', label: 'Compliance Matrix', description: 'Track compliance requirements from solicitation' },
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
  
  // AI Generation state
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiDescription, setAiDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch custom modal configs
  const { data: customModals = [] } = useQuery({
    queryKey: ['modalConfigs'],
    queryFn: () => base44.entities.ModalConfig.list('-updated_date')
  });

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

  // Handle AI checklist generation
  const handleAIGenerate = async () => {
    if (!aiDescription.trim()) {
      toast.error('Please provide a description');
      return;
    }

    setIsGenerating(true);

    try {
      console.log('[ChecklistEditor] 🤖 Generating checklist from AI...');
      
      const { data } = await base44.functions.invoke('generateChecklistFromAI', {
        description: aiDescription
      });

      if (data.success && data.items && data.items.length > 0) {
        // Add generated items to existing items
        setItems([...items, ...data.items]);
        
        toast.success(`✅ Generated ${data.items.length} checklist items!`, {
          description: 'Review and modify the items as needed',
          duration: 4000
        });
        
        setShowAIDialog(false);
        setAiDescription('');
      } else {
        toast.error('Failed to generate checklist items');
      }
    } catch (error) {
      console.error('[ChecklistEditor] Error generating checklist:', error);
      toast.error('AI generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Checklist for "{column.label}"</DialogTitle>
            <DialogDescription>
              Add and configure checklist items that will appear on cards in this column
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* AI Generation Button */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900">AI Checklist Generator</h4>
                  </div>
                  <p className="text-sm text-purple-700">
                    Describe your project or workflow, and AI will generate a tailored checklist with appropriate tasks and actions.
                  </p>
                </div>
                <Button
                  onClick={() => setShowAIDialog(true)}
                  className="bg-purple-600 hover:bg-purple-700 flex-shrink-0"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate with AI
                </Button>
              </div>
            </div>

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
                                    <div className="flex items-center gap-2">
                                      <Label className="text-xs">Item Type</Label>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <p className="text-xs font-semibold mb-1">Choose the action type:</p>
                                            <ul className="text-xs space-y-1">
                                              <li>• <strong>Manual Check:</strong> User manually marks complete</li>
                                              <li>• <strong>Open Modal:</strong> Opens a form or file upload</li>
                                              <li>• <strong>AI Action:</strong> Triggers AI analysis or generation</li>
                                              <li>• <strong>Approval Request:</strong> Requires role-based approval</li>
                                            </ul>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
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
                                    <div className="space-y-2 pl-4 border-l-2 border-blue-200 bg-blue-50 p-3 rounded">
                                      <div className="flex items-center gap-2">
                                        <Label className="text-xs font-semibold">Select Modal to Open</Label>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                              <p className="text-xs">Choose which form or file upload modal opens when users click this checklist item.</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                      <Select 
                                        value={item.associated_action || ''} 
                                        onValueChange={(val) => handleUpdateAction(item.id, val)}
                                      >
                                        <SelectTrigger className="h-9 bg-white">
                                          <SelectValue placeholder="Choose a modal..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-80">
                                          {MODAL_OPTIONS.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                              <div className="flex flex-col py-1">
                                                <span className="font-medium">{option.label}</span>
                                                <span className="text-xs text-slate-500">{option.description}</span>
                                              </div>
                                            </SelectItem>
                                          ))}
                                          {customModals.filter(m => m.is_active).length > 0 && (
                                            <>
                                              <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 border-t mt-1">
                                                Custom Modals
                                              </div>
                                              {customModals.filter(m => m.is_active).map(modal => (
                                                <SelectItem key={`CUSTOM_${modal.id}`} value={`CUSTOM_${modal.id}`}>
                                                  <div className="flex items-center gap-2">
                                                    {modal.icon_emoji && <span>{modal.icon_emoji}</span>}
                                                    <div className="flex flex-col py-1">
                                                      <div className="flex items-center gap-2">
                                                        <span className="font-medium">{modal.name}</span>
                                                        <Badge variant="outline" className="text-xs">Custom</Badge>
                                                      </div>
                                                      {modal.description && (
                                                        <span className="text-xs text-slate-500">{modal.description}</span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </>
                                          )}
                                        </SelectContent>
                                      </Select>
                                      {item.associated_action && (
                                        <p className="text-xs text-slate-600 mt-1">
                                          ✓ {MODAL_OPTIONS.find(o => o.value === item.associated_action)?.description}
                                        </p>
                                      )}
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

      {/* AI Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Generate Checklist with AI
            </DialogTitle>
            <DialogDescription>
              Describe your project or workflow, and AI will create a comprehensive checklist tailored to your needs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ai-description">Project Description</Label>
              <textarea
                id="ai-description"
                value={aiDescription}
                onChange={(e) => setAiDescription(e.target.value)}
                placeholder="e.g., Create a new marketing campaign proposal, Respond to an RFP for IT services, Develop a technical white paper..."
                className="w-full min-h-[120px] p-3 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
                disabled={isGenerating}
              />
              <p className="text-xs text-slate-500">
                Be specific about the type of project and key requirements
              </p>
            </div>

            {/* Examples */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2">Example descriptions:</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• "Respond to a federal RFP for cybersecurity services"</li>
                <li>• "Create a SBIR Phase I proposal for AI research"</li>
                <li>• "Develop a capability statement for GSA Schedule"</li>
                <li>• "Prepare a proposal for state-level infrastructure project"</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAIDialog(false);
                setAiDescription('');
              }}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={!aiDescription.trim() || isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Checklist
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}