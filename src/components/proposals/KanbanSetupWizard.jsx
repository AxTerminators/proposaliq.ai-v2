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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Rocket, 
  CheckCircle2, 
  Settings, 
  Zap,
  Building2,
  Users,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Default workflow templates
const WORKFLOW_TEMPLATES = {
  simple: {
    name: "Simple Workflow",
    description: "Basic 4-stage workflow for getting started quickly",
    icon: Rocket,
    color: "from-blue-500 to-indigo-600",
    columns: [
      {
        id: 'evaluating',
        label: 'Evaluating',
        emoji: '🔍',
        type: 'default_status',
        default_status_mapping: 'evaluating',
        order: 0,
        wip_limit: 0,
        wip_limit_type: 'soft',
        checklist_items: [
          { id: 'review_opportunity', label: 'Review opportunity details', type: 'manual_check', required: true, order: 0 },
          { id: 'initial_assessment', label: 'Complete initial assessment', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'drafting',
        label: 'Drafting',
        emoji: '✍️',
        type: 'default_status',
        default_status_mapping: 'draft',
        order: 1,
        wip_limit: 5,
        wip_limit_type: 'soft',
        checklist_items: [
          { id: 'outline_complete', label: 'Outline approved', type: 'manual_check', required: true, order: 0 },
          { id: 'sections_assigned', label: 'Sections assigned to writers', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'review',
        label: 'Review',
        emoji: '👀',
        type: 'default_status',
        default_status_mapping: 'in_progress',
        order: 2,
        wip_limit: 3,
        wip_limit_type: 'hard',
        checklist_items: [
          { id: 'quality_review', label: 'Quality review completed', type: 'manual_check', required: true, order: 0 },
          { id: 'compliance_check', label: 'Compliance check passed', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'submitted',
        label: 'Submitted',
        emoji: '📤',
        type: 'default_status',
        default_status_mapping: 'submitted',
        order: 3,
        checklist_items: []
      }
    ]
  },
  
  advanced: {
    name: "Advanced Workflow",
    description: "Comprehensive workflow with all 7 builder phases mapped to columns",
    icon: Settings,
    color: "from-purple-500 to-pink-600",
    columns: [
      {
        id: 'qualify',
        label: 'Qualify',
        emoji: '🎯',
        type: 'locked_phase',
        phase_mapping: 'phase1',
        order: 0,
        is_locked: true,
        checklist_items: [
          { id: 'contract_value', label: 'Add contract value', type: 'system_check', required: true, order: 0 },
          { id: 'due_date', label: 'Set due date', type: 'system_check', required: true, order: 1 },
          { id: 'basic_info', label: 'Complete basic information', type: 'modal_trigger', associated_action: 'open_modal_phase1', required: true, order: 2 }
        ]
      },
      {
        id: 'documents',
        label: 'Documents',
        emoji: '📄',
        type: 'locked_phase',
        phase_mapping: 'phase2',
        order: 1,
        is_locked: true,
        checklist_items: [
          { id: 'upload_docs', label: 'Upload solicitation documents', type: 'modal_trigger', associated_action: 'open_modal_phase2', required: true, order: 0 }
        ]
      },
      {
        id: 'analysis',
        label: 'Analysis',
        emoji: '🔬',
        type: 'locked_phase',
        phase_mapping: 'phase3',
        order: 2,
        is_locked: true,
        wip_limit: 5,
        wip_limit_type: 'soft',
        checklist_items: [
          { id: 'ai_analysis', label: 'Run AI compliance analysis', type: 'ai_trigger', associated_action: 'run_ai_analysis_phase3', required: false, order: 0 },
          { id: 'requirements_review', label: 'Review compliance requirements', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'strategy',
        label: 'Strategy',
        emoji: '🎯',
        type: 'locked_phase',
        phase_mapping: 'phase4',
        order: 3,
        is_locked: true,
        checklist_items: [
          { id: 'strategic_eval', label: 'Run strategic evaluation', type: 'ai_trigger', associated_action: 'run_evaluation_phase4', required: false, order: 0 },
          { id: 'win_themes', label: 'Define win themes', type: 'modal_trigger', associated_action: 'open_modal_phase5', required: true, order: 1 }
        ]
      },
      {
        id: 'writing',
        label: 'Writing',
        emoji: '✍️',
        type: 'locked_phase',
        phase_mapping: 'phase6',
        order: 4,
        is_locked: true,
        wip_limit: 3,
        wip_limit_type: 'hard',
        checklist_items: [
          { id: 'sections_drafted', label: 'All sections drafted', type: 'system_check', required: true, order: 0 },
          { id: 'peer_review', label: 'Peer review completed', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'final',
        label: 'Final Review',
        emoji: '✅',
        type: 'locked_phase',
        phase_mapping: 'phase7',
        order: 5,
        is_locked: true,
        requires_approval_to_exit: true,
        approver_roles: ['organization_owner', 'proposal_manager'],
        checklist_items: [
          { id: 'readiness_check', label: 'Run readiness check', type: 'ai_trigger', associated_action: 'run_readiness_check_phase7', required: true, order: 0 },
          { id: 'final_approval', label: 'Get final approval', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'submitted',
        label: 'Submitted',
        emoji: '🚀',
        type: 'default_status',
        default_status_mapping: 'submitted',
        order: 6,
        can_drag_to_here_roles: ['organization_owner', 'proposal_manager'],
        checklist_items: []
      }
    ]
  },
  
  agile: {
    name: "Agile Proposal Development",
    description: "Sprint-based workflow with clear WIP limits and daily standup support",
    icon: Zap,
    color: "from-green-500 to-emerald-600",
    columns: [
      {
        id: 'backlog',
        label: 'Backlog',
        emoji: '📋',
        type: 'default_status',
        default_status_mapping: 'evaluating',
        order: 0,
        checklist_items: [
          { id: 'prioritize', label: 'Prioritize in backlog', type: 'manual_check', required: true, order: 0 }
        ]
      },
      {
        id: 'ready',
        label: 'Ready',
        emoji: '🎯',
        type: 'custom_stage',
        order: 1,
        wip_limit: 5,
        wip_limit_type: 'soft',
        checklist_items: [
          { id: 'requirements_clear', label: 'Requirements clearly defined', type: 'manual_check', required: true, order: 0 },
          { id: 'resources_available', label: 'Resources allocated', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'in_progress',
        label: 'In Progress',
        emoji: '🔨',
        type: 'default_status',
        default_status_mapping: 'in_progress',
        order: 2,
        wip_limit: 3,
        wip_limit_type: 'hard',
        checklist_items: [
          { id: 'daily_updates', label: 'Daily standup updates', type: 'manual_check', required: false, order: 0 }
        ]
      },
      {
        id: 'review',
        label: 'Review',
        emoji: '👀',
        type: 'custom_stage',
        order: 3,
        wip_limit: 2,
        wip_limit_type: 'hard',
        requires_approval_to_exit: true,
        approver_roles: ['organization_owner', 'proposal_manager'],
        checklist_items: [
          { id: 'peer_reviewed', label: 'Peer reviewed', type: 'manual_check', required: true, order: 0 },
          { id: 'qa_passed', label: 'QA checks passed', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'done',
        label: 'Done',
        emoji: '✅',
        type: 'default_status',
        default_status_mapping: 'submitted',
        order: 4,
        checklist_items: []
      }
    ]
  },
  
  consultancy: {
    name: "Consultancy Workflow",
    description: "Client-focused workflow with client review stages and approval gates",
    icon: Building2,
    color: "from-orange-500 to-red-600",
    columns: [
      {
        id: 'intake',
        label: 'Client Intake',
        emoji: '📥',
        type: 'default_status',
        default_status_mapping: 'evaluating',
        order: 0,
        checklist_items: [
          { id: 'client_brief', label: 'Client brief received', type: 'manual_check', required: true, order: 0 },
          { id: 'kickoff_scheduled', label: 'Kickoff meeting scheduled', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'scoping',
        label: 'Scoping',
        emoji: '🎯',
        type: 'custom_stage',
        order: 1,
        wip_limit: 5,
        wip_limit_type: 'soft',
        checklist_items: [
          { id: 'scope_defined', label: 'Scope defined with client', type: 'manual_check', required: true, order: 0 },
          { id: 'timeline_agreed', label: 'Timeline agreed', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'development',
        label: 'Development',
        emoji: '✍️',
        type: 'default_status',
        default_status_mapping: 'draft',
        order: 2,
        wip_limit: 4,
        wip_limit_type: 'hard',
        checklist_items: [
          { id: 'outline_approved', label: 'Outline approved by client', type: 'manual_check', required: true, order: 0 },
          { id: 'content_drafted', label: 'Content drafted', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'client_review',
        label: 'Client Review',
        emoji: '👥',
        type: 'default_status',
        default_status_mapping: 'client_review',
        order: 3,
        requires_approval_to_exit: true,
        approver_roles: ['organization_owner'],
        checklist_items: [
          { id: 'shared_with_client', label: 'Shared with client portal', type: 'manual_check', required: true, order: 0 },
          { id: 'client_feedback', label: 'Client feedback incorporated', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'finalization',
        label: 'Finalization',
        emoji: '🎨',
        type: 'default_status',
        default_status_mapping: 'in_progress',
        order: 4,
        wip_limit: 2,
        wip_limit_type: 'hard',
        checklist_items: [
          { id: 'formatting', label: 'Professional formatting complete', type: 'manual_check', required: true, order: 0 },
          { id: 'compliance', label: 'Compliance verified', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'delivered',
        label: 'Delivered',
        emoji: '🚀',
        type: 'default_status',
        default_status_mapping: 'submitted',
        order: 5,
        checklist_items: []
      }
    ]
  }
};

export default function KanbanSetupWizard({ isOpen, onClose, organization }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState('simple');
  const [isCreating, setIsCreating] = useState(false);

  const createConfigMutation = useMutation({
    mutationFn: async (template) => {
      const templateData = WORKFLOW_TEMPLATES[template];
      return base44.entities.KanbanConfig.create({
        organization_id: organization.id,
        columns: templateData.columns,
        collapsed_column_ids: [],
        swimlane_config: {
          enabled: false,
          group_by: 'none'
        },
        view_settings: {
          default_view: 'kanban',
          show_card_details: ['assignees', 'due_date', 'progress', 'value'],
          compact_mode: false
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
    }
  });

  const handleCreateWorkflow = async () => {
    setIsCreating(true);
    try {
      await createConfigMutation.mutateAsync(selectedTemplate);
      onClose();
    } catch (error) {
      console.error("Error creating workflow:", error);
      alert("Failed to create workflow. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const currentTemplate = WORKFLOW_TEMPLATES[selectedTemplate];
  const TemplateIcon = currentTemplate.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Setup Your Kanban Board</DialogTitle>
              <DialogDescription>
                Choose a workflow template to get started quickly
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
            step === 1 ? "bg-blue-100 text-blue-700 font-medium" : "bg-slate-100 text-slate-500"
          )}>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs",
              step === 1 ? "bg-blue-600 text-white" : "bg-slate-300 text-slate-600"
            )}>
              1
            </div>
            <span className="text-sm">Choose Template</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
            step === 2 ? "bg-blue-100 text-blue-700 font-medium" : "bg-slate-100 text-slate-500"
          )}>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs",
              step === 2 ? "bg-blue-600 text-white" : "bg-slate-300 text-slate-600"
            )}>
              2
            </div>
            <span className="text-sm">Review & Create</span>
          </div>
        </div>

        {/* Step 1: Template Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(WORKFLOW_TEMPLATES).map(([key, template]) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === key;
                  
                  return (
                    <div key={key}>
                      <RadioGroupItem value={key} id={key} className="sr-only" />
                      <Label htmlFor={key} className="cursor-pointer">
                        <Card className={cn(
                          "border-2 transition-all hover:shadow-lg",
                          isSelected ? "border-blue-500 shadow-md" : "border-slate-200"
                        )}>
                          <CardHeader>
                            <div className="flex items-start justify-between mb-2">
                              <div className={cn(
                                "w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center",
                                template.color
                              )}>
                                <Icon className="w-6 h-6 text-white" />
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="w-6 h-6 text-blue-600" />
                              )}
                            </div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription>{template.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">{template.columns.length} columns</Badge>
                              {template.columns.some(c => c.wip_limit > 0) && (
                                <Badge variant="outline">WIP Limits</Badge>
                              )}
                              {template.columns.some(c => c.requires_approval_to_exit) && (
                                <Badge variant="outline">Approval Gates</Badge>
                              )}
                              {template.columns.some(c => c.checklist_items?.some(i => i.type === 'ai_trigger')) && (
                                <Badge variant="outline">AI Actions</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Step 2: Preview & Confirm */}
        {step === 2 && (
          <div className="space-y-6">
            <div className={cn(
              "p-6 rounded-lg bg-gradient-to-br text-white",
              currentTemplate.color
            )}>
              <div className="flex items-center gap-4 mb-4">
                <TemplateIcon className="w-10 h-10" />
                <div>
                  <h3 className="text-2xl font-bold">{currentTemplate.name}</h3>
                  <p className="text-white/90">{currentTemplate.description}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Workflow Preview</h4>
              <div className="flex gap-3 overflow-x-auto pb-4">
                {currentTemplate.columns.map((column, index) => (
                  <Card key={column.id} className="min-w-[250px] border-none shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{column.emoji}</span>
                        {column.wip_limit > 0 && (
                          <Badge variant="outline" className="text-xs">
                            WIP: {column.wip_limit}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-base">{column.label}</CardTitle>
                      {column.type === 'locked_phase' && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs mt-2">
                          Locked Phase
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent>
                      {column.checklist_items && column.checklist_items.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-slate-600 mb-2">Checklist Items:</p>
                          {column.checklist_items.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                              <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No checklist items</p>
                      )}
                      
                      {column.requires_approval_to_exit && (
                        <Badge className="mt-3 text-xs bg-orange-100 text-orange-700">
                          Requires Approval
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">✨ What happens next?</p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>• Your Kanban board will be configured with {currentTemplate.columns.length} columns</li>
                <li>• Smart checklists will guide you through each stage</li>
                <li>• You can customize columns and settings anytime</li>
                <li>• Existing proposals will be organized into the new workflow</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            {step === 1 ? (
              <Button onClick={() => setStep(2)}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleCreateWorkflow} 
                disabled={isCreating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? 'Creating...' : 'Create Workflow'}
                <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}