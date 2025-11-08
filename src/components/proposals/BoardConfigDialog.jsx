
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea"; // Added Textarea import
import {
  Settings2,
  Columns,
  Layers,
  Zap,
  Save,
  AlertCircle,
  Trash2,
  GripVertical,
  Plus,
  Lock,
  Info,
  Sparkles,
  RefreshCw,
  Settings,
  ListChecks
} from "lucide-react";
import { cn } from "@/lib/utils";
import ColumnDetailEditor from "./ColumnDetailEditor";

// 14-column template definition
const TEMPLATE_14_COLUMN_FULL = [
  {
    id: 'new',
    label: 'New',
    color: 'from-slate-400 to-slate-600',
    type: 'locked_phase',
    phase_mapping: 'phase1',
    is_locked: true,
    order: 0,
    checklist_items: [
      { id: 'basic_info', label: 'Add Basic Information', type: 'modal_trigger', associated_action: 'open_modal_phase1', required: true, order: 0 },
      { id: 'name_solicitation', label: 'Name & Solicitation #', type: 'system_check', required: true, order: 1 }
    ]
  },
  {
    id: 'evaluate',
    label: 'Evaluate',
    color: 'from-blue-400 to-blue-600',
    type: 'locked_phase',
    phase_mapping: 'phase1',
    is_locked: true,
    order: 1,
    checklist_items: [
      { id: 'identify_prime', label: 'Identify Prime Contractor', type: 'modal_trigger', associated_action: 'open_modal_phase1', required: true, order: 0 },
      { id: 'add_partners', label: 'Add Teaming Partners', type: 'manual_check', required: false, order: 1 }
    ]
  },
  {
    id: 'qualify',
    label: 'Qualify',
    color: 'from-cyan-400 to-cyan-600',
    type: 'locked_phase',
    phase_mapping: 'phase3',
    is_locked: true,
    order: 2,
    checklist_items: [
      { id: 'solicitation_details', label: 'Enter Solicitation Details', type: 'modal_trigger', associated_action: 'open_modal_phase3', required: true, order: 0 },
      { id: 'contract_value', label: 'Add Contract Value', type: 'system_check', required: true, order: 1 },
      { id: 'due_date', label: 'Set Due Date', type: 'system_check', required: true, order: 2 }
    ]
  },
  {
    id: 'gather',
    label: 'Gather',
    color: 'from-teal-400 to-teal-600',
    type: 'locked_phase',
    phase_mapping: 'phase2',
    is_locked: true,
    order: 3,
    checklist_items: [
      { id: 'upload_solicitation', label: 'Upload Solicitation Document', type: 'modal_trigger', associated_action: 'open_modal_phase2', required: true, order: 0 },
      { id: 'reference_docs', label: 'Add Reference Documents', type: 'modal_trigger', associated_action: 'open_modal_phase2', required: false, order: 1 }
    ]
  },
  {
    id: 'analyze',
    label: 'Analyze',
    color: 'from-green-400 to-green-600',
    type: 'locked_phase',
    phase_mapping: 'phase3',
    is_locked: true,
    order: 4,
    checklist_items: [
      { id: 'run_ai_analysis', label: 'Run AI Compliance Analysis', type: 'ai_trigger', associated_action: 'run_ai_analysis_phase3', required: true, order: 0 },
      { id: 'review_requirements', label: 'Review Compliance Requirements', type: 'manual_check', required: true, order: 1 }
    ]
  },
  {
    id: 'strategy',
    label: 'Strategy',
    color: 'from-lime-400 to-lime-600',
    type: 'locked_phase',
    phase_mapping: 'phase4',
    is_locked: true,
    order: 5,
    checklist_items: [
      { id: 'run_evaluation', label: 'Run Strategic Evaluation', type: 'ai_trigger', associated_action: 'run_evaluation_phase4', required: true, order: 0 },
      { id: 'go_no_go', label: 'Make Go/No-Go Decision', type: 'manual_check', required: true, order: 1 },
      { id: 'competitor_analysis', label: 'Complete Competitor Analysis', type: 'modal_trigger', associated_action: 'open_modal_phase4', required: false, order: 2 }
    ]
  },
  {
    id: 'outline',
    label: 'Outline',
    color: 'from-yellow-400 to-yellow-600',
    type: 'locked_phase',
    phase_mapping: 'phase5',
    is_locked: true,
    order: 6,
    checklist_items: [
      { id: 'select_sections', label: 'Select Proposal Sections', type: 'modal_trigger', associated_action: 'open_modal_phase5', required: true, order: 0 },
      { id: 'generate_win_themes', label: 'Generate Win Themes', type: 'ai_trigger', associated_action: 'generate_win_themes_phase5', required: false, order: 1 },
      { id: 'set_strategy', label: 'Set Writing Strategy', type: 'modal_trigger', associated_action: 'open_modal_phase5', required: true, order: 2 }
    ]
  },
  {
    id: 'drafting',
    label: 'Drafting',
    color: 'from-orange-400 to-orange-600',
    type: 'locked_phase',
    phase_mapping: 'phase6',
    is_locked: true,
    order: 7,
    checklist_items: [
      { id: 'start_writing', label: 'Start Content Generation', type: 'modal_trigger', associated_action: 'open_modal_phase6', required: true, order: 0 },
      { id: 'complete_sections', label: 'Complete All Sections', type: 'system_check', required: true, order: 1 }
    ]
  },
  {
    id: 'review',
    label: 'Review',
    color: 'from-amber-400 to-amber-600',
    type: 'locked_phase',
    phase_mapping: 'phase7',
    is_locked: true,
    order: 8,
    checklist_items: [
      { id: 'internal_review', label: 'Complete Internal Review', type: 'manual_check', required: true, order: 0 },
      { id: 'red_team', label: 'Conduct Red Team Review', type: 'modal_trigger', associated_action: 'open_red_team_review', required: false, order: 1 }
    ]
  },
  {
    id: 'final',
    label: 'Final',
    color: 'from-rose-400 to-rose-600',
    type: 'locked_phase',
    phase_mapping: 'phase7',
    is_locked: true,
    order: 9,
    checklist_items: [
      { id: 'readiness_check', label: 'Run Submission Readiness Check', type: 'ai_trigger', associated_action: 'run_readiness_check_phase7', required: true, order: 0 },
      { id: 'final_review', label: 'Final Executive Review', type: 'manual_check', required: true, order: 1 }
    ],
    requires_approval_to_exit: true,
    approver_roles: ['organization_owner', 'proposal_manager']
  },
  {
    id: 'submitted',
    label: 'Submitted',
    color: 'from-indigo-400 to-indigo-600',
    type: 'default_status',
    default_status_mapping: 'submitted',
    is_locked: true,
    order: 10,
    checklist_items: []
  },
  {
    id: 'won',
    label: 'Won',
    color: 'from-green-500 to-emerald-600',
    type: 'default_status',
    default_status_mapping: 'won',
    is_locked: true,
    order: 11,
    checklist_items: []
  },
  {
    id: 'lost',
    label: 'Lost',
    color: 'from-red-400 to-red-600',
    type: 'default_status',
    default_status_mapping: 'lost',
    is_locked: true,
    order: 12,
    checklist_items: []
  },
  {
    id: 'archived',
    label: 'Archive',
    color: 'from-gray-400 to-gray-600',
    type: 'default_status',
    default_status_mapping: 'archived',
    is_locked: true,
    order: 13,
    checklist_items: []
  }
];

const COLOR_OPTIONS = [
  { value: 'from-slate-400 to-slate-600', label: 'Slate', preview: 'bg-gradient-to-r from-slate-400 to-slate-600' },
  { value: 'from-gray-400 to-gray-600', label: 'Gray', preview: 'bg-gradient-to-r from-gray-400 to-gray-600' },
  { value: 'from-amber-400 to-amber-600', label: 'Amber', preview: 'bg-gradient-to-r from-amber-400 to-amber-600' },
  { value: 'from-orange-400 to-orange-600', label: 'Orange', preview: 'bg-gradient-to-r from-orange-400 to-orange-600' },
  { value: 'from-blue-400 to-blue-600', label: 'Blue', preview: 'bg-gradient-to-r from-blue-400 to-blue-600' },
  { value: 'from-cyan-400 to-cyan-600', label: 'Cyan', preview: 'bg-gradient-to-r from-cyan-400 to-cyan-600' },
  { value: 'from-purple-400 to-purple-600', label: 'Purple', preview: 'bg-gradient-to-r from-purple-400 to-purple-600' },
  { value: 'from-indigo-400 to-indigo-600', label: 'Indigo', preview: 'bg-gradient-to-r from-indigo-400 to-indigo-600' },
  { value: 'from-pink-400 to-pink-600', label: 'Pink', preview: 'bg-gradient-to-r from-pink-400 to-pink-600' },
  { value: 'from-rose-400 to-rose-600', label: 'Rose', preview: 'bg-gradient-to-r from-rose-400 to-rose-600' },
  { value: 'from-green-400 to-green-600', label: 'Green', preview: 'bg-gradient-to-r from-green-400 to-green-600' },
  { value: 'from-emerald-400 to-emerald-600', label: 'Emerald', preview: 'bg-gradient-to-r from-emerald-400 to-emerald-600' },
  { value: 'from-teal-400 to-teal-600', label: 'Teal', preview: 'bg-gradient-to-r from-teal-400 to-teal-600' },
  { value: 'from-red-400 to-red-600', label: 'Red', preview: 'bg-gradient-to-r from-red-400 to-red-600' },
  { value: 'from-violet-400 to-violet-600', label: 'Violet', preview: 'bg-gradient-to-r from-violet-400 to-violet-600' },
  { value: 'from-fuchsia-400 to-fuchsia-600', label: 'Fuchsia', preview: 'bg-gradient-to-r from-fuchsia-400 to-fuchsia-600' },
];

export default function BoardConfigDialog({ isOpen, onClose, organization, currentConfig }) {
  const queryClient = useQueryClient();

  const defaultColumns = [
    { id: 'evaluating', label: 'Evaluating', color: 'from-slate-400 to-slate-600', type: 'default_status', default_status_mapping: 'evaluating', order: 0 },
    { id: 'watch_list', label: 'Watch List', color: 'from-amber-400 to-amber-600', type: 'default_status', default_status_mapping: 'watch_list', order: 1 },
    { id: 'draft', label: 'Draft', color: 'from-blue-400 to-blue-600', type: 'default_status', default_status_mapping: 'draft', order: 2 },
    { id: 'in_progress', label: 'In Progress', color: 'from-purple-400 to-purple-600', type: 'default_status', default_status_mapping: 'in_progress', order: 3 },
    { id: 'submitted', label: 'Submitted', color: 'from-indigo-400 to-indigo-600', type: 'default_status', default_status_mapping: 'submitted', order: 4 },
    { id: 'won', label: 'Won', color: 'from-green-400 to-green-600', type: 'default_status', default_status_mapping: 'won', order: 5 },
    { id: 'lost', label: 'Lost', color: 'from-red-400 to-red-600', type: 'default_status', default_status_mapping: 'lost', order: 6 },
    { id: 'archived', label: 'Archived', color: 'from-gray-400 to-gray-600', type: 'default_status', default_status_mapping: 'archived', order: 7 }
  ];

  const [config, setConfig] = useState({
    columns: currentConfig?.columns || defaultColumns,
    swimlane_config: currentConfig?.swimlane_config || {
      enabled: false,
      group_by: 'none',
      custom_field_name: '',
      show_empty_swimlanes: false
    },
    view_settings: currentConfig?.view_settings || {
      default_view: 'kanban',
      show_card_details: ['assignees', 'due_date', 'progress', 'value'],
      compact_mode: false
    }
  });

  const [deleteWarning, setDeleteWarning] = useState(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [showColumnEditor, setShowColumnEditor] = useState(false);
  const [showSaveAsTemplateDialog, setShowSaveAsTemplateDialog] = useState(false);
  const [templateData, setTemplateData] = useState({
    template_name: '',
    description: '',
    icon_emoji: '📋',
    estimated_duration_days: 30
  });

  useEffect(() => {
    if (currentConfig) {
      setConfig({
        columns: currentConfig.columns || defaultColumns,
        swimlane_config: currentConfig.swimlane_config || {
          enabled: false,
          group_by: 'none',
          custom_field_name: '',
          show_empty_swimlanes: false
        },
        view_settings: currentConfig.view_settings || {
          default_view: 'kanban',
          show_card_details: ['assignees', 'due_date', 'progress', 'value'],
          compact_mode: false
        }
      });
    }
  }, [currentConfig]);

  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig) => {
      if (!organization?.id) throw new Error("No organization");

      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );

      const configData = {
        organization_id: organization.id,
        columns: newConfig.columns,
        swimlane_config: newConfig.swimlane_config,
        view_settings: newConfig.view_settings,
        collapsed_column_ids: currentConfig?.collapsed_column_ids || []
      };

      if (configs.length > 0) {
        return base44.entities.KanbanConfig.update(configs[0].id, configData);
      } else {
        return base44.entities.KanbanConfig.create(configData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onClose();
    }
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!organization?.id) throw new Error("No organization");

      const configs = await base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date',
        1
      );

      const newConfigData = {
        organization_id: organization.id,
        columns: TEMPLATE_14_COLUMN_FULL,
        swimlane_config: currentConfig?.swimlane_config || {
          enabled: false,
          group_by: 'none',
          custom_field_name: '',
          show_empty_swimlanes: false
        },
        view_settings: currentConfig?.view_settings || {
          default_view: 'kanban',
          show_card_details: ['assignees', 'due_date', 'progress', 'value'],
          compact_mode: false
        },
        collapsed_column_ids: currentConfig?.collapsed_column_ids || []
      };

      if (configs.length > 0) {
        return base44.entities.KanbanConfig.update(configs[0].id, newConfigData);
      } else {
        return base44.entities.KanbanConfig.create(newConfigData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setShowTemplateDialog(false);
      onClose();
    }
  });

  const saveAsTemplateMutation = useMutation({
    mutationFn: async (templateInfo) => {
      if (!organization?.id) throw new Error("No organization");
      if (!currentConfig) throw new Error("No current configuration to save");

      // Determine board type from current config or default to custom
      const boardType = currentConfig.board_type || 'custom';
      const proposalTypes = currentConfig.applies_to_proposal_types || ['OTHER'];

      const templateToCreate = {
        organization_id: organization.id,
        template_name: templateInfo.template_name,
        template_type: 'organization',
        proposal_type_category: proposalTypes[0] || 'OTHER',
        board_type: boardType,
        description: templateInfo.description,
        workflow_config: JSON.stringify({
          columns: config.columns,
          swimlane_config: config.swimlane_config,
          view_settings: config.view_settings
        }),
        icon_emoji: templateInfo.icon_emoji,
        estimated_duration_days: templateInfo.estimated_duration_days,
        is_active: true,
        usage_count: 0
      };

      return base44.entities.ProposalWorkflowTemplate.create(templateToCreate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      setShowSaveAsTemplateDialog(false);
      setTemplateData({
        template_name: '',
        description: '',
        icon_emoji: '📋',
        estimated_duration_days: 30
      });
      alert('✅ Template saved successfully! You can now find it in the Template Manager.');
    }
  });

  const handleDeleteConfig = () => {
    if (confirm('⚠️ WARNING: This will delete your entire Kanban board configuration and all column settings. Your proposals will NOT be deleted, but their column positions will be reset. \n\nAre you sure you want to continue?')) {
      deleteConfigMutation.mutate();
    }
  };

  const deleteConfigMutation = useMutation({
    mutationFn: async () => {
      if (!currentConfig?.id) throw new Error("No config to delete");
      return base44.entities.KanbanConfig.delete(currentConfig.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onClose();
    }
  });

  const handleSave = () => {
    saveConfigMutation.mutate(config);
  };

  const handleSaveAsTemplate = () => {
    setShowSaveAsTemplateDialog(true);
  };

  const confirmSaveAsTemplate = () => {
    if (!templateData.template_name.trim()) {
      alert('Please enter a template name');
      return;
    }
    saveAsTemplateMutation.mutate(templateData);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(config.columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedColumns = items.map((col, index) => ({
      ...col,
      order: index
    }));

    setConfig({
      ...config,
      columns: updatedColumns
    });
  };

  const handleAddColumn = () => {
    const newColumn = {
      id: `custom_${Date.now()}`,
      label: 'New Column',
      color: 'from-blue-400 to-blue-600',
      type: 'custom_stage',
      order: config.columns.length,
      checklist_items: []
    };
    setConfig({
      ...config,
      columns: [...config.columns, newColumn]
    });
  };

  const handleDeleteColumn = async (columnId) => {
    const column = config.columns.find(col => col.id === columnId);

    if (column.type !== 'custom_stage') {
      return;
    }

    try {
      const proposals = await base44.entities.Proposal.filter(
        { organization_id: organization.id }
      );

      const proposalsInColumn = proposals.filter(p => {
        if (column.type === 'custom_stage') {
          return p.custom_workflow_stage_id === columnId;
        }
        return false;
      });

      if (proposalsInColumn.length > 0) {
        setDeleteWarning({
          columnName: column.label,
          proposalCount: proposalsInColumn.length
        });
        setShowDeleteWarning(true);
        return;
      }

      setConfig({
        ...config,
        columns: config.columns.filter(col => col.id !== columnId)
      });
    } catch (error) {
      console.error("Error checking proposals:", error);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset all columns to default? This will remove any custom columns you created.')) {
      setConfig({
        ...config,
        columns: defaultColumns
      });
    }
  };

  const isLockedColumn = (column) => {
    if (column.is_locked) return true;
    const oldLockedDefaultStatuses = ['evaluating', 'draft', 'in_progress', 'submitted'];
    return column.type === 'default_status' && oldLockedDefaultStatuses.includes(column.default_status_mapping);
  };

  const canDeleteColumn = (column) => {
    return column.type === 'custom_stage';
  };

  const handleSwimlaneToggle = (enabled) => {
    setConfig({
      ...config,
      swimlane_config: {
        ...config.swimlane_config,
        enabled
      }
    });
  };

  const handleGroupByChange = (group_by) => {
    setConfig({
      ...config,
      swimlane_config: {
        ...config.swimlane_config,
        group_by
      }
    });
  };

  const handleCustomFieldChange = (custom_field_name) => {
    setConfig({
      ...config,
      swimlane_config: {
        ...config.swimlane_config,
        custom_field_name
      }
    });
  };

  const handleShowEmptySwimlanes = (show_empty_swimlanes) => {
    setConfig({
      ...config,
      swimlane_config: {
        ...config.swimlane_config,
        show_empty_swimlanes
      }
    });
  };

  const toggleCardDetail = (detail) => {
    const currentDetails = config.view_settings.show_card_details || [];
    const newDetails = currentDetails.includes(detail)
      ? currentDetails.filter(d => d !== detail)
      : [...currentDetails, detail];

    setConfig({
      ...config,
      view_settings: {
        ...config.view_settings,
        show_card_details: newDetails
      }
    });
  };

  const handleCompactModeToggle = (compact_mode) => {
    setConfig({
      ...config,
      view_settings: {
        ...config.view_settings,
        compact_mode
      }
    });
  };

  const handleApplyTemplate = () => {
    setShowTemplateDialog(true);
  };

  const confirmApplyTemplate = () => {
    applyTemplateMutation.mutate();
  };

  const handleEditColumn = (column) => {
    setEditingColumn(column);
    setShowColumnEditor(true);
  };

  const handleSaveColumnDetails = (updatedColumn) => {
    setConfig({
      ...config,
      columns: config.columns.map(col =>
        col.id === updatedColumn.id ? updatedColumn : col
      )
    });
    setShowColumnEditor(false);
    setEditingColumn(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Board Configuration
            </DialogTitle>
            <DialogDescription>
              Configure columns, swimlanes, view settings, and display preferences for your Kanban board.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="columns" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="columns" className="flex items-center gap-2">
                <Columns className="w-4 h-4" />
                Columns
              </TabsTrigger>
              <TabsTrigger value="swimlanes" className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Swimlanes
              </TabsTrigger>
              <TabsTrigger value="view" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                View Settings
              </TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto mt-4 pr-2" style={{ maxHeight: '50vh' }}>
              <TabsContent value="columns" className="space-y-4 mt-0">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg mb-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-purple-900 mb-1">
                          Complete 14-Column Workflow Template
                        </div>
                        <div className="text-sm text-purple-800 mb-3">
                          Switch to our comprehensive workflow aligned with all 7 builder phases: <strong>New → Evaluate → Qualify → Gather → Analyze → Strategy → Outline → Drafting → Review → Final → Submitted → Won → Lost → Archive</strong>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <Badge className="bg-purple-100 text-purple-700 text-xs">Phase Integration</Badge>
                          <Badge className="bg-pink-100 text-pink-700 text-xs">Smart Checklists</Badge>
                          <Badge className="bg-indigo-100 text-indigo-700 text-xs">Approval Gates</Badge>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">RBAC Ready</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleApplyTemplate}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Apply 14-Column Template
                  </Button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Manage Kanban Columns</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetToDefaults}
                    >
                      Reset to Defaults
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddColumn}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Column
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-lg mb-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-amber-900 mb-1">
                        <Lock className="w-4 h-4 inline mr-1" />
                        Locked Columns: Evaluating, Draft, In Progress & Submitted
                      </div>
                      <div className="text-sm text-amber-800">
                        The <strong>Evaluating</strong>, <strong>Draft</strong>, <strong>In Progress</strong>, and <strong>Submitted</strong> columns are required for the Proposal Builder's 7-phase workflow and cannot be repositioned or renamed. These columns are essential for proposals to progress correctly through the builder phases.
                      </div>
                    </div>
                  </div>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="columns">
                    {(provided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-3"
                      >
                        {config.columns.map((column, index) => {
                          const locked = isLockedColumn(column);
                          const canDelete = canDeleteColumn(column);

                          return (
                            <Draggable
                              key={column.id}
                              draggableId={column.id}
                              index={index}
                              isDragDisabled={locked}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={cn(
                                    "flex items-center gap-3 p-3 border-2 rounded-lg transition-all bg-white",
                                    snapshot.isDragging ? "border-blue-400 shadow-lg" : "border-slate-200 hover:border-blue-300",
                                    locked && "bg-amber-50 border-amber-200"
                                  )}
                                >
                                  <div {...provided.dragHandleProps}>
                                    {locked ? (
                                      <Lock className="w-5 h-5 text-amber-600" />
                                    ) : (
                                      <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
                                    )}
                                  </div>

                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("w-6 h-6 rounded flex-shrink-0", `bg-gradient-to-r ${column.color}`)} />
                                      <span className="font-semibold text-slate-900">{column.label}</span>

                                      {column.checklist_items && column.checklist_items.length > 0 && (
                                        <Badge variant="outline" className="text-xs">
                                          <ListChecks className="w-3 h-3 mr-1" />
                                          {column.checklist_items.length} items
                                        </Badge>
                                      )}

                                      {column.type === 'default_status' && (
                                        <Badge variant="secondary" className="text-xs">Default</Badge>
                                      )}
                                      {column.type === 'custom_stage' && (
                                        <Badge variant="outline" className="text-xs">Custom</Badge>
                                      )}
                                      {column.type === 'locked_phase' && (
                                        <Badge className="bg-purple-100 text-purple-800 text-xs">Phase</Badge>
                                      )}
                                      {locked && (
                                        <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                                          <Lock className="w-3 h-3 mr-1" />
                                          Locked
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditColumn(column)}
                                    >
                                      <Settings className="w-4 h-4 mr-1" />
                                      Configure
                                    </Button>

                                    {canDelete && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteColumn(column.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        title="Delete column"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
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

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mt-4">
                  <div className="text-sm text-blue-900">
                    <strong>Tip:</strong> Drag columns to reorder them on your board. Click "Configure" to customize checklists, permissions, and WIP limits.
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="swimlanes" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 mb-1">Enable Swimlanes</div>
                      <div className="text-sm text-slate-600">
                        Group proposals into horizontal rows based on a field (e.g., by client, lead writer, or agency)
                      </div>
                    </div>
                    <Switch
                      checked={config.swimlane_config?.enabled || false}
                      onCheckedChange={handleSwimlaneToggle}
                    />
                  </div>

                  {config.swimlane_config?.enabled && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">Group Proposals By</Label>
                        <Select
                          value={config.swimlane_config?.group_by || 'none'}
                          onValueChange={handleGroupByChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select grouping" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Grouping</SelectItem>
                            <SelectItem value="lead_writer">Lead Writer</SelectItem>
                            <SelectItem value="project_type">Project Type (RFP, RFI, etc.)</SelectItem>
                            <SelectItem value="agency">Agency</SelectItem>
                            <SelectItem value="contract_value_range">Contract Value Range</SelectItem>
                            <SelectItem value="custom_field">Custom Field</SelectItem>
                          </SelectContent>
                        </Select>

                        {config.swimlane_config?.group_by === 'custom_field' && (
                          <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <Label>Custom Field Name</Label>
                            <Input
                              value={config.swimlane_config?.custom_field_name || ''}
                              onChange={(e) => handleCustomFieldChange(e.target.value)}
                              placeholder="e.g., Government POC, Incumbent, Region"
                            />
                            <div className="text-xs text-amber-700 flex items-start gap-2 mt-2">
                              <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>
                                Enter the exact name of a custom field you've defined on proposals.
                                Proposals will be grouped by their values in this field.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-slate-900">Show Empty Swimlanes</div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            Display swimlanes even if they have no proposals (e.g., show all team members)
                          </div>
                        </div>
                        <Switch
                          checked={config.swimlane_config?.show_empty_swimlanes || false}
                          onCheckedChange={handleShowEmptySwimlanes}
                        />
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="view" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Card Details to Display</Label>
                    <div className="space-y-2">
                      {[
                        { key: 'assignees', label: 'Team Member Avatars', desc: 'Show assigned team members' },
                        { key: 'due_date', label: 'Due Date', desc: 'Show deadline and countdown' },
                        { key: 'progress', label: 'Progress Bar', desc: 'Show subtask completion progress' },
                        { key: 'value', label: 'Contract Value', desc: 'Show dollar amount' },
                        { key: 'agency', label: 'Agency Name', desc: 'Show government agency' },
                        { key: 'dependencies', label: 'Dependencies', desc: 'Show dependency count' },
                        { key: 'match_score', label: 'AI Match Score', desc: 'Show AI-calculated match %' }
                      ].map(detail => (
                        <div
                          key={detail.key}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all",
                            (config.view_settings?.show_card_details || []).includes(detail.key)
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          )}
                          onClick={() => toggleCardDetail(detail.key)}
                        >
                          <div>
                            <div className="font-medium text-sm text-slate-900">{detail.label}</div>
                            <div className="text-xs text-slate-600">{detail.desc}</div>
                          </div>
                          <Switch
                            checked={(config.view_settings?.show_card_details || []).includes(detail.key)}
                            onCheckedChange={() => toggleCardDetail(detail.key)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 mb-1">Compact Mode</div>
                      <div className="text-sm text-slate-600">
                        Reduce card spacing and padding to fit more proposals on screen
                      </div>
                    </div>
                    <Switch
                      checked={config.view_settings?.compact_mode || false}
                      onCheckedChange={handleCompactModeToggle}
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="destructive"
              onClick={handleDeleteConfig}
              disabled={deleteConfigMutation.isPending}
              className="mr-auto"
            >
              {deleteConfigMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Configuration
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleSaveAsTemplate}
                disabled={saveAsTemplateMutation.isPending}
              >
                {saveAsTemplateMutation.isPending ? (
                  <>
                    <div className="animate-spin mr-2">⏳</div>
                    Saving Template...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save as Template
                  </>
                )}
              </Button>
              <Button onClick={handleSave} disabled={saveConfigMutation.isPending}>
                {saveConfigMutation.isPending ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Configuration
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showColumnEditor && editingColumn && (
        <ColumnDetailEditor
          column={editingColumn}
          onSave={handleSaveColumnDetails}
          onClose={() => {
            setShowColumnEditor(false);
            setEditingColumn(null);
          }}
          isOpen={showColumnEditor}
        />
      )}

      <AlertDialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Apply 14-Column Workflow Template?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will replace your current column structure with our comprehensive 14-column workflow:
              </p>
              <div className="bg-purple-50 p-3 rounded-lg text-sm">
                <strong className="text-purple-900">New → Evaluate → Qualify → Gather → Analyze → Strategy → Outline → Drafting → Review → Final → Submitted → Won → Lost → Archive</strong>
              </div>
              <div className="space-y-2 text-sm">
                <p className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span><strong>Your proposals will NOT be deleted</strong> - they'll be automatically moved to matching columns</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Includes smart checklists for each phase</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>Fully integrated with the 7-phase Proposal Builder</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-amber-600 mt-0.5">⚠</span>
                  <span><strong>Your custom columns will be removed</strong></span>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyTemplateMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmApplyTemplate}
              disabled={applyTemplateMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {applyTemplateMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Applying...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply Template
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteWarning} onOpenChange={setShowDeleteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Cannot Delete Column
            </AlertDialogTitle>
            <AlertDialogDescription>
              The column <strong>"{deleteWarning?.columnName}"</strong> cannot be deleted because it currently contains <strong>{deleteWarning?.proposalCount}</strong> proposal{deleteWarning?.proposalCount !== 1 ? 's' : ''}.
              <br /><br />
              Please move or delete all proposals from this column before attempting to delete it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDeleteWarning(false)}>
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save as Template Dialog */}
      <Dialog open={showSaveAsTemplateDialog} onOpenChange={setShowSaveAsTemplateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Save as Workflow Template
            </DialogTitle>
            <DialogDescription>
              Create a reusable template from your current board configuration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template_name">Template Name *</Label>
              <Input
                id="template_name"
                value={templateData.template_name}
                onChange={(e) => setTemplateData({ ...templateData, template_name: e.target.value })}
                placeholder="e.g., My Custom RFP Workflow"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={templateData.description}
                onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
                placeholder="Describe when to use this template..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="icon_emoji">Icon Emoji</Label>
                <Input
                  id="icon_emoji"
                  value={templateData.icon_emoji}
                  onChange={(e) => setTemplateData({ ...templateData, icon_emoji: e.target.value })}
                  placeholder="📋"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Est. Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={templateData.estimated_duration_days}
                  onChange={(e) => setTemplateData({ ...templateData, estimated_duration_days: parseInt(e.target.value) || 30 })}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
              <strong>Info:</strong> This will save your current column configuration, checklist items, WIP limits, and permissions as a reusable template.
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSaveAsTemplateDialog(false)}
              disabled={saveAsTemplateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmSaveAsTemplate}
              disabled={saveAsTemplateMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saveAsTemplateMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
