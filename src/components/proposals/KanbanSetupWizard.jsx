import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Rocket, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";

// 14-column structure matching the phases
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

// Simplified 4-column template for basic users
const TEMPLATE_SIMPLE = [
  {
    id: 'evaluating',
    label: 'Evaluating',
    color: 'from-yellow-400 to-amber-600',
    type: 'default_status',
    default_status_mapping: 'evaluating',
    order: 0,
    checklist_items: []
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    color: 'from-blue-400 to-blue-600',
    type: 'default_status',
    default_status_mapping: 'in_progress',
    order: 1,
    checklist_items: []
  },
  {
    id: 'submitted',
    label: 'Submitted',
    color: 'from-purple-400 to-purple-600',
    type: 'default_status',
    default_status_mapping: 'submitted',
    order: 2,
    checklist_items: []
  },
  {
    id: 'won',
    label: 'Won',
    color: 'from-green-500 to-emerald-600',
    type: 'default_status',
    default_status_mapping: 'won',
    order: 3,
    checklist_items: []
  }
];

const TEMPLATES = [
  {
    id: 'simple',
    name: 'Simple Workflow',
    description: 'Basic 4-stage workflow for straightforward proposal tracking',
    icon: Rocket,
    color: 'from-blue-500 to-indigo-600',
    columns: TEMPLATE_SIMPLE,
    features: ['Quick setup', 'Easy to understand', 'Perfect for small teams'],
    recommendedFor: 'Teams new to Kanban or with simple processes'
  },
  {
    id: 'full',
    name: 'Complete Workflow',
    description: '14-stage comprehensive workflow aligned with all 7 builder phases',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
    columns: TEMPLATE_14_COLUMN_FULL,
    features: ['Full phase integration', 'Smart checklists', 'Approval gates', 'RBAC ready'],
    recommendedFor: 'Teams wanting complete control and visibility'
  }
];

export default function KanbanSetupWizard({ isOpen, onClose, organization }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const queryClient = useQueryClient();

  const createConfigMutation = useMutation({
    mutationFn: async (template) => {
      return base44.entities.KanbanConfig.create({
        organization_id: organization.id,
        columns: template.columns,
        collapsed_column_ids: [],
        view_settings: {
          default_view: 'kanban',
          show_card_details: ['assignees', 'due_date', 'progress', 'tasks'],
          compact_mode: false
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      onClose();
    }
  });

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      createConfigMutation.mutate(selectedTemplate);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" />
            Setup Your Kanban Workflow
          </DialogTitle>
          <DialogDescription>
            Choose a workflow template that matches your proposal process. You can customize it later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 my-6">
          {TEMPLATES.map((template) => {
            const Icon = template.icon;
            const isSelected = selectedTemplate?.id === template.id;

            return (
              <Card
                key={template.id}
                className={cn(
                  "cursor-pointer transition-all duration-300 hover:shadow-xl",
                  isSelected
                    ? "ring-4 ring-blue-500 border-blue-500"
                    : "border-slate-200 hover:border-blue-300"
                )}
                onClick={() => handleSelectTemplate(template)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br",
                      template.color
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-8 h-8 text-blue-600" />
                    )}
                  </div>
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                  <CardDescription className="text-sm mt-2">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-700 mb-2">Features:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {template.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-700 mb-2">
                      {template.columns.length} Columns
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.columns.slice(0, 8).map((col) => (
                        <span key={col.id} className="text-xs px-2 py-1 bg-white rounded border text-slate-600">
                          {col.label}
                        </span>
                      ))}
                      {template.columns.length > 8 && (
                        <span className="text-xs px-2 py-1 bg-white rounded border text-slate-600">
                          +{template.columns.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="text-xs text-slate-600">
                      <span className="font-semibold">Best for:</span> {template.recommendedFor}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedTemplate || createConfigMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {createConfigMutation.isPending ? (
              <>
                <div className="animate-spin mr-2">⏳</div>
                Creating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Create Workflow
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}