
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
import { Sparkles, Rocket, Zap, CheckCircle2 } from 'lucide-react';
import { cn } from "@/lib/utils";

// TEMPLATE: 8-Phase Government Proposal Workflow (15 columns)
export const TEMPLATE_8_PHASE_WORKFLOW = [
  // Phase 1 - Split into 2 columns
  {
    id: 'initiate',
    label: 'Initiate',
    color: 'from-slate-700 to-slate-900',
    type: 'locked_phase',
    phase_mapping: 'phase1',
    is_locked: true,
    order: 0,
    checklist_items: [
      { id: 'basic_info', label: 'Enter Basic Information', type: 'modal_trigger', associated_action: 'open_basic_info_modal', required: true, order: 0 },
      { id: 'solicitation_number', label: 'Add Solicitation Number', type: 'manual_check', required: true, order: 1 },
      { id: 'agency_project', label: 'Set Agency & Project Details', type: 'manual_check', required: true, order: 2 }
    ]
  },
  {
    id: 'team',
    label: 'Team',
    color: 'from-blue-500 to-blue-700',
    type: 'locked_phase',
    phase_mapping: 'phase1',
    is_locked: true,
    order: 1,
    checklist_items: [
      { id: 'select_prime', label: 'Select Prime Contractor', type: 'modal_trigger', associated_action: 'open_team_formation_modal', required: true, order: 0 },
      { id: 'add_teaming', label: 'Add Teaming Partners', type: 'modal_trigger', associated_action: 'open_team_formation_modal', required: false, order: 1 }
    ]
  },
  
  // Phase 2 - Resources
  {
    id: 'resources',
    label: 'Resources',
    color: 'from-cyan-500 to-cyan-700',
    type: 'locked_phase',
    phase_mapping: 'phase2',
    is_locked: true,
    order: 2,
    checklist_items: [
      { id: 'link_boilerplate', label: 'Link Boilerplate Content', type: 'modal_trigger', associated_action: 'open_resource_gathering_modal', required: false, order: 0 },
      { id: 'link_past_performance', label: 'Link Past Performance', type: 'modal_trigger', associated_action: 'open_resource_gathering_modal', required: false, order: 1 }
    ]
  },
  
  // Phase 3 - Solicitation
  {
    id: 'solicit',
    label: 'Solicit',
    color: 'from-teal-500 to-teal-700',
    type: 'locked_phase',
    phase_mapping: 'phase3',
    is_locked: true,
    order: 3,
    checklist_items: [
      { id: 'upload_rfp', label: 'Upload RFP/Solicitation', type: 'modal_trigger', associated_action: 'open_solicitation_upload_modal', required: true, order: 0 },
      { id: 'ai_extract', label: 'AI Extract Key Details', type: 'ai_trigger', associated_action: 'run_ai_extraction_phase3', required: false, order: 1 },
      { id: 'confirm_details', label: 'Confirm Due Date & Value', type: 'manual_check', required: true, order: 2 }
    ]
  },
  
  // Phase 4 - Split into 2 columns
  {
    id: 'evaluate',
    label: 'Evaluate',
    color: 'from-green-500 to-green-700',
    type: 'locked_phase',
    phase_mapping: 'phase4',
    is_locked: true,
    order: 4,
    checklist_items: [
      { id: 'run_evaluation', label: 'Run Strategic Evaluation', type: 'modal_trigger', associated_action: 'open_evaluation_modal', required: true, order: 0 },
      { id: 'make_decision', label: 'Make Go/No-Go Decision', type: 'manual_check', required: true, order: 1 },
      { id: 'competitor_intel', label: 'Gather Competitor Intelligence', type: 'manual_check', required: false, order: 2 }
    ]
  },
  
  // Phase 5 - Split into 2 columns
  {
    id: 'strategy',
    label: 'Strategy',
    color: 'from-lime-500 to-lime-700',
    type: 'locked_phase',
    phase_mapping: 'phase5',
    is_locked: true,
    order: 5,
    checklist_items: [
      { id: 'generate_themes', label: 'Generate Win Themes', type: 'modal_trigger', associated_action: 'open_win_strategy_modal', required: true, order: 0 },
      { id: 'refine_themes', label: 'Refine & Approve Themes', type: 'manual_check', required: true, order: 1 }
    ]
  },
  {
    id: 'plan',
    label: 'Plan',
    color: 'from-yellow-500 to-yellow-700',
    type: 'locked_phase',
    phase_mapping: 'phase5',
    is_locked: true,
    order: 6,
    checklist_items: [
      { id: 'select_sections', label: 'Select Proposal Sections', type: 'modal_trigger', associated_action: 'open_section_planning_modal', required: true, order: 0 },
      { id: 'set_strategy', label: 'Set Writing Strategy', type: 'manual_check', required: true, order: 1 }
    ]
  },
  
  // Phase 6 - Drafting
  {
    id: 'draft',
    label: 'Draft',
    color: 'from-orange-500 to-orange-700',
    type: 'locked_phase',
    phase_mapping: 'phase6',
    is_locked: true,
    order: 7,
    checklist_items: [
      { id: 'start_writing', label: 'Start Content Development', type: 'navigate', associated_action: 'navigate_to_content_development', required: true, order: 0 },
      { id: 'ai_generate', label: 'AI Generate Sections', type: 'navigate', associated_action: 'start_ai_writing', required: false, order: 1 },
      { id: 'complete_sections', label: 'Complete All Sections', type: 'system_check', required: true, order: 2 }
    ]
  },
  
  // Phase 7 - Pricing
  {
    id: 'price',
    label: 'Price',
    color: 'from-rose-500 to-rose-700',
    type: 'locked_phase',
    phase_mapping: 'phase7',
    is_locked: true,
    order: 8,
    checklist_items: [
      { id: 'build_pricing', label: 'Build Pricing Model', type: 'navigate', associated_action: 'navigate_to_pricing', required: true, order: 0 },
      { id: 'review_pricing', label: 'Review Pricing Strategy', type: 'modal_trigger', associated_action: 'open_pricing_review_modal', required: false, order: 1 },
      { id: 'finalize_price', label: 'Finalize Pricing', type: 'manual_check', required: true, order: 2 }
    ]
  },
  
  // Phase 8 - Split into 2 columns
  {
    id: 'review',
    label: 'Review',
    color: 'from-pink-500 to-pink-700',
    type: 'locked_phase',
    phase_mapping: 'phase8',
    is_locked: true,
    order: 9,
    checklist_items: [
      { id: 'internal_review', label: 'Complete Internal Review', type: 'navigate', associated_action: 'navigate_to_final_review', required: true, order: 0 },
      { id: 'red_team', label: 'Conduct Red Team Review', type: 'navigate', associated_action: 'conduct_red_team', required: false, order: 1 }
    ]
  },
  {
    id: 'final',
    label: 'Final',
    color: 'from-purple-500 to-purple-700',
    type: 'locked_phase',
    phase_mapping: 'phase8',
    is_locked: true,
    order: 10,
    checklist_items: [
      { id: 'readiness_check', label: 'Run Submission Readiness', type: 'navigate', associated_action: 'run_readiness_check_phase8', required: true, order: 0 },
      { id: 'executive_review', label: 'Final Executive Review', type: 'manual_check', required: true, order: 1 },
      { id: 'export_proposal', label: 'Export Proposal', type: 'navigate', associated_action: 'open_export_modal', required: false, order: 2 }
    ],
    requires_approval_to_exit: true,
    approver_roles: ['organization_owner', 'proposal_manager']
  },
  
  // Outcome columns
  {
    id: 'submitted',
    label: 'Submitted',
    color: 'from-indigo-500 to-indigo-700',
    type: 'default_status',
    default_status_mapping: 'submitted',
    is_locked: true,
    order: 11,
    checklist_items: []
  },
  {
    id: 'won',
    label: 'Won',
    color: 'from-emerald-500 to-emerald-700',
    type: 'default_status',
    default_status_mapping: 'won',
    is_locked: true,
    order: 12,
    checklist_items: []
  },
  {
    id: 'lost',
    label: 'Lost',
    color: 'from-red-500 to-red-700',
    type: 'default_status',
    default_status_mapping: 'lost',
    is_locked: true,
    order: 13,
    checklist_items: []
  },
  {
    id: 'archived',
    label: 'Archive',
    color: 'from-gray-500 to-gray-700',
    type: 'default_status',
    default_status_mapping: 'archived',
    is_locked: true,
    order: 14,
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
    id: '8phase',
    name: '8-Phase Complete Workflow',
    description: '15-column workflow fully integrated with 8-phase proposal builder',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
    columns: TEMPLATE_8_PHASE_WORKFLOW,
    features: ['All 8 phases as columns', 'Smart checklists', 'AI-powered actions', 'Approval gates'],
    recommendedFor: 'Teams wanting complete proposal workflow integration'
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
