
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
  TrendingUp,
  CheckCircle // Added CheckCircle for selected board indication
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
    value: 'RFP', 
    label: 'Request for Proposal (RFP)', 
    icon: '📄',
    description: 'Comprehensive proposals with 8-phase workflow',
    avgDuration: '45-90 days',
    complexity: 'High'
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
  const [selectedType, setSelectedType] = useState(preselectedType || ''); // Renamed from proposalType
  const [selectedBoardId, setSelectedBoardId] = useState(null); // New state for selected board
  const [proposalData, setProposalData] = useState({
    proposal_name: '',
    solicitation_number: '',
    agency_name: '',
    // project_title removed as per outline
    due_date: '',
    contract_value: ''
  });
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedType(preselectedType || '');
      setSelectedBoardId(null); // Reset selected board
      setProposalData({
        proposal_name: '',
        solicitation_number: '',
        agency_name: '',
        // project_title removed
        due_date: '',
        contract_value: ''
      });
      setSelectedTemplate(null);
    }
  }, [isOpen, preselectedType]);

  // Fetch available boards for the selected type
  const { data: availableBoards = [] } = useQuery({
    queryKey: ['available-boards', organization?.id, selectedType],
    queryFn: async () => {
      if (!organization?.id || !selectedType) return [];
      
      // Get all proposal boards (templates and custom)
      const allBoards = await base44.entities.KanbanConfig.filter({
        organization_id: organization.id,
        board_category: 'proposal_board' // Assuming 'proposal_board' is a valid category
      });
      
      // Filter boards that accept this proposal type
      return allBoards.filter(board => {
        // Template boards (derived from system types, e.g., 'rfp' board_type for 'RFP' selectedType)
        if (board.board_type && board.board_type.toLowerCase() === selectedType.toLowerCase()) {
          return true;
        }
        
        // Custom boards that accept this type or all types
        if (board.board_type === 'custom') { // Assuming 'custom' is a type for user-created boards
          if (!board.applies_to_proposal_types || board.applies_to_proposal_types.length === 0) {
            return true; // Custom board accepts all types if array is empty or null
          }
          return board.applies_to_proposal_types.includes(selectedType);
        }
        
        return false;
      });
    },
    enabled: !!organization?.id && !!selectedType && step === 2, // Enable when on step 2 and type is selected
  });

  // Fetch available workflow templates for the selected type (renamed `availableTemplates` to `workflowTemplates`)
  const { data: workflowTemplates = [] } = useQuery({
    queryKey: ['workflow-templates', selectedType], // Use selectedType
    queryFn: async () => {
      if (!selectedType) return [];
      
      const templates = await base44.entities.ProposalWorkflowTemplate.filter({
        proposal_type_category: selectedType,
        is_active: true
      }, '-usage_count');
      
      return templates;
    },
    enabled: !!selectedType && step === 3, // Enable when on step 3 and type is selected
  });

  // Removed 'existingBoard' query as it's replaced by 'availableBoards' and new flow.

  const createProposalMutation = useMutation({
    mutationFn: async (data) => {
      // Find the selected board or default board (logic moved from old board creation).
      // `boardToUse` is determined here but not explicitly passed to the `Proposal.create`
      // assuming `Proposal` entity schema does not directly have `kanban_config_id`.
      // The system should infer the correct board based on proposal_type_category and workflow_template_id.
      let boardToUse = availableBoards.find(b => b.id === selectedBoardId);
      
      if (!boardToUse && availableBoards.length > 0) {
        // Auto-select template board if exists, or the first available board
        boardToUse = availableBoards.find(b => b.is_template_board) || availableBoards[0];
      }

      // Create the proposal
      const proposal = await base44.entities.Proposal.create({
        ...data,
        organization_id: organization.id,
        proposal_type_category: selectedType, // Use selectedType
        workflow_template_id: data.workflow_template_id || null, // `workflow_template_id` now expected in `data` from `handleCreate`
        current_phase: 'phase1', // Default phase
        status: 'evaluating', // Default status
        manual_order: 0, // Default value, if needed
        is_sample_data: false // Default value, if needed
      });

      return proposal; // Return just the proposal
    },
    onSuccess: (proposal) => { // Destructure proposal directly
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['all-kanban-boards'] }); // Invalidate all boards, in case the new proposal affects counts/views.
      
      if (onSuccess) {
        onSuccess(proposal);
      }
      
      onClose();
      
      // Navigate to proposal builder using 'id' as per outline
      navigate(createPageUrl("ProposalBuilder") + `?id=${proposal.id}`);
    }
  });

  // Function to handle type selection (Step 1)
  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setStep(2); // Move to Step 2: Select Board
  };

  // Function to handle moving to the next step
  const handleNext = () => {
    if (step === 1 && !selectedType) {
      // Validation for Step 1: Proposal Type must be selected
      alert('Please select a proposal type to proceed.');
      return;
    }
    if (step === 2 && availableBoards.length > 0 && !selectedBoardId) {
      // Validation for Step 2: If boards are available, one must be selected
      alert('Please select a board for your proposal or choose "No Specific Board" option if available.');
      return;
    }
    if (step === 3 && workflowTemplates.length > 0 && !selectedTemplate) {
        // Validation for Step 3: If templates are available, one must be selected
        alert('Please select a workflow template to proceed.');
        return;
    }
    setStep(step + 1);
  };

  // Function to handle moving back a step
  const handleBack = () => {
    if (step === 4) {
      setStep(3);
    } else if (step === 3) {
      setStep(2);
      setSelectedTemplate(null); // Clear selected template when going back from step 3
    } else if (step === 2) {
      setStep(1);
      setSelectedBoardId(null); // Clear selected board when going back from step 2
    }
    // No specific action for step 1, as 'Cancel' button handles close
  };

  // Function to handle final creation
  const handleCreate = async () => {
    if (!proposalData.proposal_name.trim()) {
      alert('Please enter a proposal name to create.');
      return;
    }
    // Ensure a template is selected if there are templates to choose from
    if (workflowTemplates.length > 0 && !selectedTemplate) {
      alert('Please select a workflow template to create the proposal.');
      return;
    }

    await createProposalMutation.mutateAsync({
      ...proposalData,
      workflow_template_id: selectedTemplate?.id || null, // Pass selected template ID
    });
  };

  const selectedTypeConfig = PROPOSAL_TYPES.find(t => t.value === selectedType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* DialogContent max-w-3xl as per outline */}
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-600" /> {/* Icon size updated */}
            Create New Proposal
          </DialogTitle>
          <DialogDescription>
            {/* Dialog description updated for 4 steps */}
            Step {step} of 4: {step === 1 ? 'Choose Type' : step === 2 ? 'Select Board' : step === 3 ? 'Choose Template' : 'Enter Details'}
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
                    "cursor-pointer transition-all border-2 hover:shadow-lg",
                    selectedType === type.value 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-slate-200 hover:border-blue-300"
                  )}
                  onClick={() => handleTypeSelect(type.value)}
                >
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
                          type.complexity === 'High' || type.complexity === 'Very High' 
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
          </div>
        )}

        {/* Step 2: Select Board (NEW STEP) */}
        {step === 2 && (
          <div className="space-y-4 py-4">
            {/* Selected Type Info - kept for context for user */}
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

            <div>
              <h3 className="font-semibold text-lg mb-2">Select Board</h3>
              <p className="text-sm text-slate-600 mb-4">
                Choose which board this proposal will appear on.
                If no specific board is selected, the system will use a default.
              </p>
            </div>

            {availableBoards.length === 0 ? (
              <Card className="border-2 border-dashed border-slate-300 bg-gray-50">
                <CardContent className="p-8 text-center">
                  <p className="text-slate-600 mb-4">
                    No custom or template boards found for {selectedTypeConfig?.label || selectedType} proposals.
                  </p>
                  <p className="text-sm text-slate-500">
                    The proposal will be created and visible on a system-default board.
                    You can create a custom board for this type later in board settings.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {availableBoards.map((board) => (
                  <Card
                    key={board.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-lg",
                      selectedBoardId === board.id ? "ring-2 ring-blue-500 bg-blue-50" : "border-slate-200"
                    )}
                    onClick={() => setSelectedBoardId(board.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 mb-1">{board.board_name}</h4>
                          <div className="flex items-center gap-2">
                            {board.is_template_board && (
                              <Badge className="bg-blue-500 text-white text-xs">Template</Badge>
                            )}
                            {board.board_type === 'custom' && (
                              <Badge variant="outline" className="text-xs">Custom Board</Badge>
                            )}
                            <span className="text-xs text-slate-600">
                              {board.columns?.length || 0} stages
                            </span>
                          </div>
                        </div>
                        {selectedBoardId === board.id && (
                          <CheckCircle className="w-5 h-5 text-blue-600" /> {/* Check icon for selected board */}
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Choose Workflow Template (formerly part of Step 2) */}
        {step === 3 && (
            <div className="space-y-4 py-4">
                {/* Selected Type Info - kept for context for user */}
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

                {/* Board Selection Context */}
                {selectedBoardId && availableBoards.find(b => b.id === selectedBoardId) ? (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Layers className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                          <p className="text-sm font-semibold text-blue-900">
                              Selected Board: "{availableBoards.find(b => b.id === selectedBoardId)?.board_name}"
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                              Your proposal will be organized on this board. Now choose a workflow template.
                          </p>
                      </div>
                  </div>
                ) : ( // Fallback if no specific board is selected, or no boards available
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900">
                            No Specific Board Selected
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                            The system will determine the default board for your proposal type. Please choose a workflow template.
                        </p>
                    </div>
                  </div>
                )}
                
                {workflowTemplates.length > 0 && (
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Workflow Template</Label>
                        <div className="grid md:grid-cols-2 gap-3">
                            {workflowTemplates.map(template => { // Use workflowTemplates here
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
                {workflowTemplates.length === 0 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-red-900">
                            No Workflow Templates Found
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                            No active workflow templates are available for this proposal type. The proposal will be created without a specific workflow.
                        </p>
                    </div>
                  </div>
                )}
            </div>
        )}


        {/* Step 4: Enter Proposal Details (formerly part of Step 2) */}
        {step === 4 && (
          <div className="space-y-4 py-4">
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

            {/* Template selected info */}
            {selectedTemplate && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-900">
                    Workflow Template: "{selectedTemplate.template_name}"
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Your proposal will follow this workflow structure.
                  </p>
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

              {/* Removed Project Title as per outline */}

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
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={step === 1 ? onClose : handleBack}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          
          {step < 4 ? (
            <Button 
              onClick={handleNext} 
              disabled={
                (step === 1 && !selectedType) || // Disable next if type not selected on step 1
                (step === 2 && availableBoards.length > 0 && !selectedBoardId) || // Disable if boards available but none selected on step 2
                (step === 3 && workflowTemplates.length > 0 && !selectedTemplate) // Disable if templates available but none selected on step 3
              }
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={createProposalMutation.isPending || !proposalData.proposal_name.trim()} // Disable if creating or proposal name is empty
              className="bg-blue-600 hover:bg-blue-700" // Updated button style
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
