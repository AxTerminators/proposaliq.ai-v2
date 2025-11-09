
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Zap,
  ArrowRight,
  Layers,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROPOSAL_TYPES = [
  { 
    value: 'RFP_15_COLUMN', 
    label: '15-Column RFP Workflow', 
    icon: '🎯',
    description: 'Advanced 15-column independent workflow with mandatory checklists',
    avgDuration: '60-90 days',
    complexity: 'Advanced',
    featured: true
  },
  { 
    value: 'RFI', 
    label: 'Request for Information (RFI)', 
    icon: '📝',
    description: 'Information gathering with streamlined process',
    avgDuration: '15-30 days',
    complexity: 'Low'
  },
  { 
    value: 'SBIR', 
    label: 'SBIR/STTR', 
    icon: '💡',
    description: 'Research-focused proposals with innovation emphasis',
    avgDuration: '60-120 days',
    complexity: 'Very High'
  },
  { 
    value: 'GSA', 
    label: 'GSA Schedule', 
    icon: '🏛️',
    description: 'GSA Schedule additions or modifications',
    avgDuration: '30-60 days',
    complexity: 'Medium'
  },
  { 
    value: 'IDIQ', 
    label: 'IDIQ/Contract Vehicle', 
    icon: '📑',
    description: 'Indefinite delivery contracts',
    avgDuration: '45-75 days',
    complexity: 'Medium'
  },
  { 
    value: 'STATE_LOCAL', 
    label: 'State/Local Government', 
    icon: '🏙️',
    description: 'Non-federal government proposals',
    avgDuration: '30-60 days',
    complexity: 'Medium'
  },
  { 
    value: 'OTHER', 
    label: 'Other/Custom', 
    icon: '📊',
    description: 'Custom proposal type',
    avgDuration: '30-60 days',
    complexity: 'Variable'
  }
];

export default function QuickCreateProposal({ 
  isOpen, 
  onClose, 
  organization, 
  preselectedType = null,
  onSuccess 
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [proposalType, setProposalType] = useState(preselectedType || '');
  const [proposalData, setProposalData] = useState({
    proposal_name: '',
    solicitation_number: '',
    agency_name: '',
    project_title: '',
    due_date: '',
    contract_value: ''
  });
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setProposalType(preselectedType || '');
      setProposalData({
        proposal_name: '',
        solicitation_number: '',
        agency_name: '',
        project_title: '',
        due_date: '',
        contract_value: ''
      });
      setSelectedTemplate(null);
    }
  }, [isOpen, preselectedType]);

  // Fetch available workflow templates for the selected type
  const { data: availableTemplates = [] } = useQuery({
    queryKey: ['workflow-templates', proposalType],
    queryFn: async () => {
      if (!proposalType) return [];
      
      const templates = await base44.entities.ProposalWorkflowTemplate.filter({
        proposal_type_category: proposalType,
        is_active: true
      }, '-usage_count');
      
      return templates;
    },
    enabled: !!proposalType && step === 2 && proposalType !== 'RFP_15_COLUMN',
  });

  // Check if board exists for this type
  const { data: existingBoard } = useQuery({
    queryKey: ['board-for-type', organization?.id, proposalType],
    queryFn: async () => {
      if (!organization?.id || !proposalType) return null;
      
      // For 15-column board, check by board_type
      if (proposalType === 'RFP_15_COLUMN') {
        const boards = await base44.entities.KanbanConfig.filter({
          organization_id: organization.id,
          board_type: 'rfp_15_column'
        });
        return boards.length > 0 ? boards[0] : null;
      }
      
      // For other types, check by applies_to_proposal_types
      const boards = await base44.entities.KanbanConfig.filter({
        organization_id: organization.id,
        applies_to_proposal_types: [proposalType]
      });
      
      return boards.length > 0 ? boards[0] : null;
    },
    enabled: !!organization?.id && !!proposalType && (step === 2 || proposalType === 'RFP_15_COLUMN'),
  });

  const createProposalMutation = useMutation({
    mutationFn: async (data) => {
      let boardConfig = existingBoard;
      
      // If no board exists and this is a 15-column board, create it via function
      if (!boardConfig && proposalType === 'RFP_15_COLUMN') {
        console.log('[QuickCreate] 🎯 Creating 15-column board...');
        const response = await base44.functions.invoke('create15ColumnRFPBoard', {
          organization_id: organization.id
        });
        
        if (response.data.success && response.data.board_id) {
          console.log('[QuickCreate] ✅ 15-column board created:', response.data.board_id);
          
          // Fetch the newly created board
          const boards = await base44.entities.KanbanConfig.filter({
            id: response.data.board_id
          });
          if (boards.length > 0) {
            boardConfig = boards[0];
            console.log('[QuickCreate] 📋 Board config loaded:', boardConfig.board_name);
          }
        }
      }
      // If no board exists for other types, create one from template
      else if (!boardConfig && selectedTemplate) {
        const workflowConfig = typeof selectedTemplate.workflow_config === 'string'
          ? JSON.parse(selectedTemplate.workflow_config)
          : selectedTemplate.workflow_config;

        boardConfig = await base44.entities.KanbanConfig.create({
          organization_id: organization.id,
          board_type: proposalType.toLowerCase(),
          board_name: `${proposalType} Board`,
          is_master_board: false,
          applies_to_proposal_types: [proposalType],
          simplified_workflow: false,
          columns: workflowConfig.columns || [],
          collapsed_column_ids: [],
          swimlane_config: { enabled: false, group_by: 'none' },
          view_settings: { 
            default_view: 'kanban',
            show_card_details: ['assignees', 'due_date', 'progress', 'value'],
            compact_mode: false
          }
        });
      }

      // CRITICAL FIX: Determine the first non-terminal column to place the proposal
      // Initialize proposalCreateData with common fields and default phase/status
      let proposalCreateData = {
        ...data,
        organization_id: organization.id,
        proposal_type_category: proposalType,
        workflow_template_id: selectedTemplate?.id || null,
        manual_order: 0,
        is_sample_data: false,
        // Default values, will be overridden if a valid first column is found
        current_phase: 'phase1', 
        status: 'evaluating',
        custom_workflow_stage_id: null,
        current_stage_checklist_status: {}, // Initialize empty
        action_required: false,
        action_required_description: null
      };

      if (boardConfig?.columns) {
        // Find the first workflow column (not terminal)
        const firstColumn = boardConfig.columns
          .filter(col => !col.is_terminal)
          .sort((a, b) => (a.order || 0) - (b.order || 0))[0];

        if (firstColumn) {
          console.log('[QuickCreate] 🎯 Placing proposal in first column:', firstColumn.label);

          // Set the proposal to start in the first column based on column type
          if (firstColumn.type === 'custom_stage') {
            proposalCreateData.custom_workflow_stage_id = firstColumn.id;
            proposalCreateData.current_phase = null;
            proposalCreateData.status = 'in_progress';
          } else if (firstColumn.type === 'locked_phase') {
            proposalCreateData.custom_workflow_stage_id = firstColumn.id; // Store column ID
            proposalCreateData.current_phase = firstColumn.phase_mapping;
            proposalCreateData.status = firstColumn.default_status_mapping || 'evaluating';
          } else if (firstColumn.type === 'default_status') {
            proposalCreateData.status = firstColumn.default_status_mapping;
            proposalCreateData.current_phase = null;
            proposalCreateData.custom_workflow_stage_id = null;
          } else if (firstColumn.type === 'master_status') {
            proposalCreateData.status = firstColumn.status_mapping?.[0] || 'evaluating';
            proposalCreateData.current_phase = null;
            proposalCreateData.custom_workflow_stage_id = null;
          }

          // Initialize checklist status for the first column
          proposalCreateData.current_stage_checklist_status = {
            [firstColumn.id]: {}
          };

          // Set action_required flag if first column has required items
          const hasRequiredItems = firstColumn.checklist_items?.some(item => item.required);
          proposalCreateData.action_required = hasRequiredItems;
          proposalCreateData.action_required_description = hasRequiredItems 
            ? `Complete required items in ${firstColumn.label}` 
            : null;
        }
      }

      // Create the proposal with proper column assignment
      const proposal = await base44.entities.Proposal.create(proposalCreateData);
      console.log('[QuickCreate] ✅ Proposal created:', proposal.id, proposal.proposal_name);

      return { proposal, boardConfig };
    },
    onSuccess: async ({ proposal, boardConfig }) => {
      console.log('[QuickCreate] 🎉 Mutation success, invalidating queries...');
      
      // CRITICAL: Invalidate AND refetch boards to ensure Pipeline has the new board
      await queryClient.invalidateQueries({ queryKey: ['all-kanban-boards'] });
      await queryClient.refetchQueries({ queryKey: ['all-kanban-boards'] });
      
      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
      
      onClose(); // Close the creation dialog
      
      if (onSuccess) {
        // For 15-column workflow, signal to open BasicInfoModal first
        if (proposalType === 'RFP_15_COLUMN') {
          console.log('[QuickCreate] 🚀 Calling onSuccess with BasicInfoModal for 15-column workflow');
          // Pass board config back so Pipeline knows which board was created/used
          onSuccess(proposal, 'BasicInfoModal', boardConfig);
        } else {
          // For legacy workflows, navigate to ProposalBuilder
          onSuccess(proposal);
          navigate(createPageUrl("ProposalBuilder") + `?proposal_id=${proposal.id}`);
        }
      }
    }
  });

  const handleTypeSelect = (type) => {
    setProposalType(type);
    
    // For 15-column workflow, skip to immediate creation
    if (type === 'RFP_15_COLUMN') {
      // Create proposal immediately with minimal data
      createProposalMutation.mutate({
        proposal_name: 'New Proposal', // Temporary name, will be updated in BasicInfoModal
      });
    } else {
      // For other types, go to step 2 for details
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setProposalType(preselectedType || '');
    }
  };

  const handleCreate = () => {
    if (!proposalData.proposal_name.trim()) {
      alert('Please enter a proposal name');
      return;
    }

    createProposalMutation.mutate(proposalData);
  };

  const selectedTypeConfig = PROPOSAL_TYPES.find(t => t.value === proposalType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            {step === 1 ? 'Create New Proposal' : 'Proposal Details'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Choose the type of proposal you're creating"
              : `Creating a ${selectedTypeConfig?.label}`
            }
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Proposal Type */}
        {step === 1 && (
          <div className="py-4">
            <div className="grid md:grid-cols-2 gap-4">
              {PROPOSAL_TYPES.map((type) => (
                <Card
                  key={type.value}
                  className={cn(
                    "cursor-pointer transition-all border-2 hover:shadow-lg relative",
                    proposalType === type.value 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-slate-200 hover:border-blue-300",
                    type.featured && "ring-2 ring-amber-400",
                    createProposalMutation.isPending && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => handleTypeSelect(type.value)}
                >
                  {type.featured && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                        ⚡ Featured
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="text-3xl mb-3">{type.icon}</div>
                    <h3 className="font-bold text-slate-900 mb-2">{type.label}</h3>
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {type.description}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="w-3 h-3" />
                        {type.avgDuration}
                      </Badge>
                      <Badge 
                        className={cn(
                          type.complexity === 'Advanced' || type.complexity === 'High' || type.complexity === 'Very High' 
                            ? 'bg-red-100 text-red-700' 
                            : type.complexity === 'Medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        )}
                      >
                        {type.complexity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Show loading overlay when creating 15-column proposal */}
            {createProposalMutation.isPending && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="animate-spin">⏳</div>
                  <span className="text-blue-900 font-medium">Creating proposal...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Enter Proposal Details (for non-15-column workflows) */}
        {step === 2 && (
          <div className="space-y-6 py-4">
            {/* Selected Type Info */}
            {selectedTypeConfig && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{selectedTypeConfig.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{selectedTypeConfig.label}</h3>
                      <p className="text-sm text-slate-600">{selectedTypeConfig.description}</p>
                    </div>
                    <Badge variant="outline">{selectedTypeConfig.avgDuration}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Board Status */}
            {existingBoard ? (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Layers className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900">
                    ✓ Board Ready: "{existingBoard.board_name}"
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Your proposal will be added to this board with {existingBoard.columns?.length || 0} workflow stages
                  </p>
                </div>
              </div>
            ) : selectedTemplate ? (
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">
                    New Board Will Be Created
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Using "{selectedTemplate.template_name}" workflow template
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900">
                    Select a Template
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Choose a workflow template to structure your proposal process
                  </p>
                </div>
              </div>
            )}

            {/* Template Selection */}
            {!existingBoard && proposalType !== 'RFP_15_COLUMN' && availableTemplates.length > 0 && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">Workflow Template</Label>
                <div className="grid md:grid-cols-2 gap-3">
                  {availableTemplates.map(template => {
                    const isSelected = selectedTemplate?.id === template.id;
                    
                    return (
                      <Card
                        key={template.id}
                        className={cn(
                          "cursor-pointer transition-all border-2",
                          isSelected 
                            ? "border-blue-500 bg-blue-50" 
                            : "border-slate-200 hover:border-blue-300"
                        )}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{template.icon_emoji || '📋'}</span>
                              <h4 className="font-semibold text-sm">{template.template_name}</h4>
                            </div>
                            {isSelected && (
                              <Badge className="bg-blue-600 text-white">Selected</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                            {template.description || 'No description'}
                          </p>
                          <div className="flex gap-2 text-xs">
                            {template.usage_count > 0 && (
                              <Badge variant="outline" className="gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {template.usage_count} uses
                              </Badge>
                            )}
                            {template.estimated_duration_days && (
                              <Badge variant="outline">
                                ~{template.estimated_duration_days}d
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Proposal Details Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proposal_name">
                  Proposal Name *
                </Label>
                <Input
                  id="proposal_name"
                  value={proposalData.proposal_name}
                  onChange={(e) => setProposalData({...proposalData, proposal_name: e.target.value})}
                  placeholder="e.g., Cloud Infrastructure Modernization for VA"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="solicitation_number">
                    Solicitation Number
                  </Label>
                  <Input
                    id="solicitation_number"
                    value={proposalData.solicitation_number}
                    onChange={(e) => setProposalData({...proposalData, solicitation_number: e.target.value})}
                    placeholder="e.g., W912DQ-24-R-0001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agency_name">
                    Agency/Organization
                  </Label>
                  <Input
                    id="agency_name"
                    value={proposalData.agency_name}
                    onChange={(e) => setProposalData({...proposalData, agency_name: e.target.value})}
                    placeholder="e.g., Department of Veterans Affairs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_title">
                  Project Title
                </Label>
                <Input
                  id="project_title"
                  value={proposalData.project_title}
                  onChange={(e) => setProposalData({...proposalData, project_title: e.target.value})}
                  placeholder="e.g., Enterprise Cloud Migration Services"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="due_date">
                    Due Date
                  </Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={proposalData.due_date}
                    onChange={(e) => setProposalData({...proposalData, due_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract_value">
                    Estimated Contract Value (USD)
                  </Label>
                  <Input
                    id="contract_value"
                    type="number"
                    value={proposalData.contract_value}
                    onChange={(e) => setProposalData({...proposalData, contract_value: e.target.value})}
                    placeholder="e.g., 500000"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              
              <Button
                onClick={handleCreate}
                disabled={createProposalMutation.isPending || !proposalData.proposal_name.trim() || (!existingBoard && !selectedTemplate && proposalType !== 'RFP_15_COLUMN')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {createProposalMutation.isPending ? (
                  <>
                    <div className="animate-spin mr-2">⏳</div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Proposal
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
