import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { 
  Settings, 
  ListChecks, 
  Shield, 
  Gauge, 
  Plus, 
  Trash2, 
  GripVertical,
  Save,
  Palette,
  Lock,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

// Checklist Item Library
const CHECKLIST_ITEM_LIBRARY = [
  { id: 'enter_basics', label: 'Enter Basic Details', type: 'modal_trigger', associated_action: 'open_modal_basic_info', category: 'Setup' },
  { id: 'upload_solicitation', label: 'Upload Solicitation Document', type: 'modal_trigger', associated_action: 'navigate_solicitation_upload', category: 'Setup' },
  { id: 'set_due_date', label: 'Set Due Date', type: 'system_check', associated_action: 'check_due_date', category: 'Setup' },
  { id: 'configure_team', label: 'Configure Team', type: 'modal_trigger', associated_action: 'open_modal_team_formation', category: 'Team' },
  { id: 'identify_prime', label: 'Identify Prime Contractor', type: 'modal_trigger', associated_action: 'open_modal_basic_info', category: 'Team' },
  { id: 'add_partners', label: 'Add Teaming Partners', type: 'modal_trigger', associated_action: 'navigate_team_setup', category: 'Team' },
  { id: 'run_evaluation', label: 'Run AI Evaluation', type: 'ai_trigger', associated_action: 'open_modal_evaluation', category: 'Analysis' },
  { id: 'compliance_check', label: 'Compliance Check', type: 'modal_trigger', associated_action: 'open_modal_compliance', category: 'Analysis' },
  { id: 'competitor_analysis', label: 'Competitor Analysis', type: 'modal_trigger', associated_action: 'open_modal_competitor', category: 'Analysis' },
  { id: 'plan_content', label: 'Plan Content Sections', type: 'modal_trigger', associated_action: 'open_modal_content_planning', category: 'Content' },
  { id: 'write_content', label: 'Write Content', type: 'ai_trigger', associated_action: 'navigate_write_content', category: 'Content' },
  { id: 'company_overview', label: 'Write Company Overview', type: 'ai_trigger', associated_action: 'navigate_write_content', category: 'Content' },
  { id: 'build_pricing', label: 'Build Pricing', type: 'modal_trigger', associated_action: 'navigate_pricing_build', category: 'Pricing' },
  { id: 'pricing_review', label: 'Pricing Review', type: 'manual_check', associated_action: 'open_modal_pricing_review', category: 'Pricing' },
  { id: 'budget_justification', label: 'Budget Justification', type: 'modal_trigger', associated_action: 'navigate_pricing_build', category: 'Pricing' },
  { id: 'final_review', label: 'Final Review', type: 'manual_check', associated_action: 'open_modal_review', category: 'Review' },
  { id: 'technical_review', label: 'Technical Review', type: 'manual_check', associated_action: 'open_modal_review', category: 'Review' },
  { id: 'check_page_limits', label: 'Check Page Limits', type: 'manual_check', associated_action: 'open_modal_compliance', category: 'Review' },
];

const ROLE_OPTIONS = [
  { value: 'organization_owner', label: 'Organization Owner' },
  { value: 'proposal_manager', label: 'Proposal Manager' },
  { value: 'lead_writer', label: 'Lead Writer' },
  { value: 'contributor', label: 'Contributor' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'viewer', label: 'Viewer' }
];

const COLOR_OPTIONS = [
  { value: 'from-slate-400 to-slate-600', label: 'Slate', preview: 'bg-gradient-to-r from-slate-400 to-slate-600' },
  { value: 'from-gray-400 to-gray-600', label: 'Gray', preview: 'bg-gradient-to-r from-gray-400 to-gray-600' },
  { value: 'from-blue-400 to-blue-600', label: 'Blue', preview: 'bg-gradient-to-r from-blue-400 to-blue-600' },
  { value: 'from-cyan-400 to-cyan-600', label: 'Cyan', preview: 'bg-gradient-to-r from-cyan-400 to-cyan-600' },
  { value: 'from-purple-400 to-purple-600', label: 'Purple', preview: 'bg-gradient-to-r from-purple-400 to-purple-600' },
  { value: 'from-indigo-400 to-indigo-600', label: 'Indigo', preview: 'bg-gradient-to-r from-indigo-400 to-indigo-600' },
  { value: 'from-pink-400 to-pink-600', label: 'Pink', preview: 'bg-gradient-to-r from-pink-400 to-pink-600' },
  { value: 'from-green-400 to-green-600', label: 'Green', preview: 'bg-gradient-to-r from-green-400 to-green-600' },
  { value: 'from-amber-400 to-amber-600', label: 'Amber', preview: 'bg-gradient-to-r from-amber-400 to-amber-600' },
  { value: 'from-orange-400 to-orange-600', label: 'Orange', preview: 'bg-gradient-to-r from-orange-400 to-orange-600' },
  { value: 'from-red-400 to-red-600', label: 'Red', preview: 'bg-gradient-to-r from-red-400 to-red-600' },
  { value: 'from-teal-400 to-teal-600', label: 'Teal', preview: 'bg-gradient-to-r from-teal-400 to-teal-600' },
  { value: 'from-emerald-400 to-emerald-600', label: 'Emerald', preview: 'bg-gradient-to-r from-emerald-400 to-emerald-600' },
  { value: 'from-lime-400 to-lime-600', label: 'Lime', preview: 'bg-gradient-to-r from-lime-400 to-lime-600' },
  { value: 'from-violet-400 to-violet-600', label: 'Violet', preview: 'bg-gradient-to-r from-violet-400 to-violet-600' },
];

export default function ColumnDetailEditor({ column, onSave, onClose, isOpen }) {
  const [editedColumn, setEditedColumn] = useState(column);
  const [showChecklistLibrary, setShowChecklistLibrary] = useState(false);
  const [customChecklistItem, setCustomChecklistItem] = useState({
    label: '',
    type: 'manual_check',
    associated_action: '',
    required: true
  });

  useEffect(() => {
    if (column) {
      setEditedColumn({
        ...column,
        checklist_items: column.checklist_items || [],
        wip_limit: column.wip_limit || 0,
        wip_limit_type: column.wip_limit_type || 'soft',
        can_drag_to_here_roles: column.can_drag_to_here_roles || [],
        can_drag_from_here_roles: column.can_drag_from_here_roles || [],
        requires_approval_to_exit: column.requires_approval_to_exit || false,
        approver_roles: column.approver_roles || []
      });
    }
  }, [column]);

  const handleChecklistDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(editedColumn.checklist_items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setEditedColumn({
      ...editedColumn,
      checklist_items: updatedItems
    });
  };

  const addChecklistItemFromLibrary = (libraryItem) => {
    const newItem = {
      id: `${libraryItem.id}_${Date.now()}`,
      label: libraryItem.label,
      type: libraryItem.type,
      associated_action: libraryItem.associated_action,
      required: true,
      order: editedColumn.checklist_items.length
    };

    setEditedColumn({
      ...editedColumn,
      checklist_items: [...editedColumn.checklist_items, newItem]
    });
  };

  const addCustomChecklistItem = () => {
    if (!customChecklistItem.label.trim()) {
      alert("Please enter a label for the checklist item");
      return;
    }

    const newItem = {
      id: `custom_${Date.now()}`,
      label: customChecklistItem.label,
      type: customChecklistItem.type,
      associated_action: customChecklistItem.associated_action,
      required: customChecklistItem.required,
      order: editedColumn.checklist_items.length
    };

    setEditedColumn({
      ...editedColumn,
      checklist_items: [...editedColumn.checklist_items, newItem]
    });

    setCustomChecklistItem({
      label: '',
      type: 'manual_check',
      associated_action: '',
      required: true
    });
  };

  const deleteChecklistItem = (itemId) => {
    setEditedColumn({
      ...editedColumn,
      checklist_items: editedColumn.checklist_items.filter(item => item.id !== itemId)
    });
  };

  const updateChecklistItem = (itemId, updates) => {
    setEditedColumn({
      ...editedColumn,
      checklist_items: editedColumn.checklist_items.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    });
  };

  const toggleRole = (roleArray, role) => {
    const roles = editedColumn[roleArray] || [];
    const newRoles = roles.includes(role)
      ? roles.filter(r => r !== role)
      : [...roles, role];
    
    setEditedColumn({
      ...editedColumn,
      [roleArray]: newRoles
    });
  };

  const toggleApproverRole = (role) => {
    const roles = editedColumn.approver_roles || [];
    const newRoles = roles.includes(role)
      ? roles.filter(r => r !== role)
      : [...roles, role];
    
    setEditedColumn({
      ...editedColumn,
      approver_roles: newRoles
    });
  };

  const groupedLibraryItems = CHECKLIST_ITEM_LIBRARY.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {});

  const getActionTypeIcon = (type) => {
    switch (type) {
      case 'modal_trigger': return '🎯';
      case 'ai_trigger': return '🤖';
      case 'system_check': return '✓';
      case 'manual_check': return '👤';
      default: return '•';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Configure Column: {column?.label}
          </DialogTitle>
          <DialogDescription>
            Customize checklist items, WIP limits, permissions, and approval requirements
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="checklist" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="checklist">
              <ListChecks className="w-4 h-4 mr-2" />
              Checklist
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Shield className="w-4 h-4 mr-2" />
              Permissions
            </TabsTrigger>
            <TabsTrigger value="wip">
              <Gauge className="w-4 h-4 mr-2" />
              WIP Limits
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto mt-4 pr-2" style={{ maxHeight: '55vh' }}>
            <TabsContent value="checklist" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Checklist Items</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChecklistLibrary(!showChecklistLibrary)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add from Library
                </Button>
              </div>

              {showChecklistLibrary && (
                <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-purple-900">Checklist Item Library</h4>
                    <Badge className="bg-purple-100 text-purple-700">Pre-built Items</Badge>
                  </div>

                  {Object.entries(groupedLibraryItems).map(([category, items]) => (
                    <div key={category}>
                      <div className="text-sm font-semibold text-purple-800 mb-2">{category}</div>
                      <div className="space-y-1">
                        {items.map((libraryItem) => (
                          <div
                            key={libraryItem.id}
                            className="flex items-center justify-between p-2 bg-white rounded border hover:border-purple-300 transition-colors"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              <span className="text-lg">{getActionTypeIcon(libraryItem.type)}</span>
                              <div>
                                <div className="text-sm font-medium text-slate-900">{libraryItem.label}</div>
                                <div className="text-xs text-slate-500">{libraryItem.type.replace('_', ' ')}</div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addChecklistItemFromLibrary(libraryItem)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <DragDropContext onDragEnd={handleChecklistDragEnd}>
                <Droppable droppableId="checklist-items">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {editedColumn?.checklist_items?.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={cn(
                                "flex items-center gap-3 p-3 border-2 rounded-lg bg-white transition-all",
                                snapshot.isDragging ? "border-blue-400 shadow-lg" : "border-slate-200"
                              )}
                            >
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                              </div>

                              <div className="flex-1 space-y-2">
                                <Input
                                  value={item.label}
                                  onChange={(e) => updateChecklistItem(item.id, { label: e.target.value })}
                                  placeholder="Item label"
                                  className="text-sm"
                                />
                                
                                <div className="flex items-center gap-2">
                                  <Select
                                    value={item.type}
                                    onValueChange={(value) => updateChecklistItem(item.id, { type: value })}
                                  >
                                    <SelectTrigger className="w-40 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="manual_check">👤 Manual Check</SelectItem>
                                      <SelectItem value="modal_trigger">🎯 Modal Trigger</SelectItem>
                                      <SelectItem value="ai_trigger">🤖 AI Trigger</SelectItem>
                                      <SelectItem value="system_check">✓ System Check</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={item.required}
                                      onCheckedChange={(checked) => updateChecklistItem(item.id, { required: checked })}
                                    />
                                    <Label className="text-xs text-slate-600">Required</Label>
                                  </div>
                                </div>

                                {(item.type === 'modal_trigger' || item.type === 'ai_trigger') && (
                                  <Input
                                    value={item.associated_action || ''}
                                    onChange={(e) => updateChecklistItem(item.id, { associated_action: e.target.value })}
                                    placeholder="Action (e.g., open_modal_basic_info)"
                                    className="text-xs"
                                  />
                                )}
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteChecklistItem(item.id)}
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

              {editedColumn?.checklist_items?.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-lg">
                  <ListChecks className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-600 text-sm">No checklist items yet</p>
                  <p className="text-slate-500 text-xs">Click "Add from Library" to get started</p>
                </div>
              )}

              <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 space-y-3">
                <h4 className="font-semibold text-blue-900">Add Custom Checklist Item</h4>
                
                <div className="space-y-2">
                  <Label>Item Label</Label>
                  <Input
                    value={customChecklistItem.label}
                    onChange={(e) => setCustomChecklistItem({ ...customChecklistItem, label: e.target.value })}
                    placeholder="e.g., Review technical specs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={customChecklistItem.type}
                      onValueChange={(value) => setCustomChecklistItem({ ...customChecklistItem, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual_check">👤 Manual Check</SelectItem>
                        <SelectItem value="modal_trigger">🎯 Modal Trigger</SelectItem>
                        <SelectItem value="ai_trigger">🤖 AI Trigger</SelectItem>
                        <SelectItem value="system_check">✓ System Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Required</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={customChecklistItem.required}
                        onCheckedChange={(checked) => setCustomChecklistItem({ ...customChecklistItem, required: checked })}
                      />
                      <span className="text-sm text-slate-600">
                        {customChecklistItem.required ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {(customChecklistItem.type === 'modal_trigger' || customChecklistItem.type === 'ai_trigger') && (
                  <div className="space-y-2">
                    <Label>Associated Action</Label>
                    <Input
                      value={customChecklistItem.associated_action}
                      onChange={(e) => setCustomChecklistItem({ ...customChecklistItem, associated_action: e.target.value })}
                      placeholder="e.g., open_modal_basic_info"
                    />
                  </div>
                )}

                <Button onClick={addCustomChecklistItem} className="w-full" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Item
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4 mt-0">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 mb-1">Role-Based Access Control (RBAC)</div>
                    <div className="text-sm text-blue-800">
                      Control which user roles can move proposals into or out of this column. 
                      Leave empty to allow all roles.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Who Can Move Proposals INTO This Column</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map(role => (
                    <div
                      key={`to_${role.value}`}
                      onClick={() => toggleRole('can_drag_to_here_roles', role.value)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all",
                        (editedColumn.can_drag_to_here_roles || []).includes(role.value)
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <span className="text-sm font-medium">{role.label}</span>
                      <Switch
                        checked={(editedColumn.can_drag_to_here_roles || []).includes(role.value)}
                        onCheckedChange={() => toggleRole('can_drag_to_here_roles', role.value)}
                      />
                    </div>
                  ))}
                </div>
                {(editedColumn.can_drag_to_here_roles?.length === 0) && (
                  <p className="text-xs text-slate-500 italic">✓ All roles can move proposals into this column</p>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Who Can Move Proposals OUT OF This Column</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map(role => (
                    <div
                      key={`from_${role.value}`}
                      onClick={() => toggleRole('can_drag_from_here_roles', role.value)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all",
                        (editedColumn.can_drag_from_here_roles || []).includes(role.value)
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <span className="text-sm font-medium">{role.label}</span>
                      <Switch
                        checked={(editedColumn.can_drag_from_here_roles || []).includes(role.value)}
                        onCheckedChange={() => toggleRole('can_drag_from_here_roles', role.value)}
                      />
                    </div>
                  ))}
                </div>
                {(editedColumn.can_drag_from_here_roles?.length === 0) && (
                  <p className="text-xs text-slate-500 italic">✓ All roles can move proposals out of this column</p>
                )}
              </div>

              <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-purple-900 mb-1">Require Approval to Exit Column</div>
                    <div className="text-sm text-purple-800">
                      When enabled, moving proposals OUT of this column requires approval from specified roles
                    </div>
                  </div>
                  <Switch
                    checked={editedColumn.requires_approval_to_exit || false}
                    onCheckedChange={(checked) => setEditedColumn({ ...editedColumn, requires_approval_to_exit: checked })}
                  />
                </div>

                {editedColumn.requires_approval_to_exit && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Who Can Approve</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLE_OPTIONS.map(role => (
                        <div
                          key={`approver_${role.value}`}
                          onClick={() => toggleApproverRole(role.value)}
                          className={cn(
                            "flex items-center justify-between p-2 rounded border-2 cursor-pointer transition-all",
                            (editedColumn.approver_roles || []).includes(role.value)
                              ? 'bg-purple-100 border-purple-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          )}
                        >
                          <span className="text-xs font-medium">{role.label}</span>
                          <Switch
                            checked={(editedColumn.approver_roles || []).includes(role.value)}
                            onCheckedChange={() => toggleApproverRole(role.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="wip" className="space-y-4 mt-0">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-900 mb-1">Work-In-Progress (WIP) Limits</div>
                    <div className="text-sm text-blue-800">
                      Set limits to prevent bottlenecks and maintain workflow efficiency. 
                      <strong> Soft limits</strong> show warnings, <strong>hard limits</strong> block moves when exceeded.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>WIP Limit</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editedColumn.wip_limit || 0}
                    onChange={(e) => setEditedColumn({ ...editedColumn, wip_limit: parseInt(e.target.value) || 0 })}
                    placeholder="0 = No limit"
                  />
                  <p className="text-xs text-slate-500">
                    Set to 0 to disable WIP limits for this column
                  </p>
                </div>

                {editedColumn.wip_limit > 0 && (
                  <div className="space-y-3">
                    <Label>Limit Type</Label>
                    <div className="space-y-2">
                      <div
                        onClick={() => setEditedColumn({ ...editedColumn, wip_limit_type: 'soft' })}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                          editedColumn.wip_limit_type === 'soft'
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <Switch
                          checked={editedColumn.wip_limit_type === 'soft'}
                          onCheckedChange={() => setEditedColumn({ ...editedColumn, wip_limit_type: 'soft' })}
                        />
                        <div>
                          <div className="font-semibold text-slate-900">Soft Limit (Warning)</div>
                          <div className="text-sm text-slate-600">
                            Shows a warning when limit is exceeded, but allows the move
                          </div>
                        </div>
                      </div>

                      <div
                        onClick={() => setEditedColumn({ ...editedColumn, wip_limit_type: 'hard' })}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                          editedColumn.wip_limit_type === 'hard'
                            ? 'bg-red-50 border-red-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <Switch
                          checked={editedColumn.wip_limit_type === 'hard'}
                          onCheckedChange={() => setEditedColumn({ ...editedColumn, wip_limit_type: 'hard' })}
                        />
                        <div>
                          <div className="font-semibold text-slate-900">Hard Limit (Enforced)</div>
                          <div className="text-sm text-slate-600">
                            Prevents moving proposals when limit is reached - forces resolution of bottlenecks
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4 mt-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">Column Name</Label>
                  <Input
                    value={editedColumn.label}
                    onChange={(e) => setEditedColumn({ ...editedColumn, label: e.target.value })}
                    placeholder="Column name"
                    disabled={column?.is_locked}
                    className="text-lg font-semibold"
                  />
                  {column?.is_locked && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      System column names cannot be changed
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Column Color</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {COLOR_OPTIONS.map(colorOption => (
                      <div
                        key={colorOption.value}
                        onClick={() => setEditedColumn({ ...editedColumn, color: colorOption.value })}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all",
                          editedColumn.color === colorOption.value
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded", colorOption.preview)} />
                        <span className="text-sm font-medium">{colorOption.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-base font-semibold">Preview</Label>
                  <div className={cn(
                    "p-4 rounded-xl text-white text-center font-semibold text-lg",
                    `bg-gradient-to-r ${editedColumn.color}`
                  )}>
                    {editedColumn.label}
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(editedColumn)}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}