import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Calendar,
  Zap,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PROPOSAL_TYPES = [
  { 
    value: 'RFP', 
    label: 'Request for Proposal (RFP)', 
    icon: '📋',
    description: 'Standard federal RFP workflow',
    avgDuration: '60-90 days',
    complexity: 'High'
  },
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
    value: 'CUSTOM_PROJECT', 
    label: 'Custom Project', 
    icon: '🎨',
    description: 'Custom workflow for unique projects',
    avgDuration: '30-60 days',
    complexity: 'Variable'
  },
  { 
    value: 'OTHER', 
    label: 'Other/General', 
    icon: '📊',
    description: 'General proposal type',
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
  const queryClient = useQueryClient();
  
  const [proposalName, setProposalName] = useState('');
  const [selectedType, setSelectedType] = useState(preselectedType || null);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setProposalName('');
      setSelectedType(preselectedType || null);
    }
  }, [isOpen, preselectedType]);

  const createProposalMutation = useMutation({
    mutationFn: async ({ name, type }) => {
      console.log('[QuickCreate] 🚀 Creating proposal:', { name, type });
      
      // Find or create appropriate board
      let targetBoard = null;
      
      // Check if board exists for this type
      if (type === 'RFP_15_COLUMN') {
        const boards = await base44.entities.KanbanConfig.filter({
          organization_id: organization.id,
          board_type: 'rfp_15_column'
        });
        targetBoard = boards.length > 0 ? boards[0] : null;
        
        // Create 15-column board if it doesn't exist
        if (!targetBoard) {
          const response = await base44.functions.invoke('create15ColumnRFPBoard', {
            organization_id: organization.id
          });
          
          if (response.data.success && response.data.board_id) {
            const boards = await base44.entities.KanbanConfig.filter({
              id: response.data.board_id
            });
            targetBoard = boards[0];
          }
        }
      } else if (type === 'CUSTOM_PROJECT') {
        // For custom projects, use master board or create a simple custom board
        const masterBoards = await base44.entities.KanbanConfig.filter({
          organization_id: organization.id,
          is_master_board: true
        });
        targetBoard = masterBoards[0] || null;
      } else {
        // For other types, look for template_workspace board
        const boards = await base44.entities.KanbanConfig.filter({
          organization_id: organization.id,
          applies_to_proposal_types: [type]
        });
        targetBoard = boards.length > 0 ? boards[0] : null;
      }
      
      // If still no board, use master board as fallback
      if (!targetBoard) {
        const masterBoards = await base44.entities.KanbanConfig.filter({
          organization_id: organization.id,
          is_master_board: true
        });
        targetBoard = masterBoards[0];
      }

      if (!targetBoard) {
        throw new Error('No board configuration available. Please create a board first.');
      }

      // Find first non-terminal column
      const firstColumn = targetBoard.columns
        .filter(col => !col.is_terminal)
        .sort((a, b) => (a.order || 0) - (b.order || 0))[0];

      if (!firstColumn) {
        throw new Error('No workflow columns found in board');
      }

      // Build proposal data
      let proposalCreateData = {
        proposal_name: name,
        organization_id: organization.id,
        proposal_type_category: type,
        manual_order: 0,
        is_sample_data: false,
        current_phase: 'phase1',
        status: 'evaluating',
        custom_workflow_stage_id: null,
        current_stage_checklist_status: {},
        action_required: false,
        action_required_description: null
      };

      // Set column-specific fields based on column type
      if (firstColumn.type === 'custom_stage') {
        proposalCreateData.custom_workflow_stage_id = firstColumn.id;
        proposalCreateData.current_phase = null;
        proposalCreateData.status = 'in_progress';
      } else if (firstColumn.type === 'locked_phase') {
        proposalCreateData.custom_workflow_stage_id = firstColumn.id;
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

      // Initialize checklist status
      proposalCreateData.current_stage_checklist_status = {
        [firstColumn.id]: {}
      };

      // Check if there are required checklist items
      const hasRequiredItems = firstColumn.checklist_items?.some(item => item.required);
      proposalCreateData.action_required = hasRequiredItems;
      proposalCreateData.action_required_description = hasRequiredItems 
        ? `Complete required items in ${firstColumn.label}` 
        : null;

      const proposal = await base44.entities.Proposal.create(proposalCreateData);
      
      console.log('[QuickCreate] ✅ Proposal created:', proposal.id);

      return { proposal, targetBoard };
    },
    onSuccess: async ({ proposal, targetBoard }) => {
      await queryClient.invalidateQueries({ queryKey: ['all-kanban-boards'] });
      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
      
      await queryClient.refetchQueries({ 
        queryKey: ['all-kanban-boards'],
        exact: false
      });
      
      onClose();
      
      if (onSuccess) {
        // For 15-column workflow, signal to open BasicInfoModal
        if (proposal.proposal_type_category === 'RFP_15_COLUMN') {
          onSuccess(proposal, 'BasicInfoModal', targetBoard);
        } else {
          onSuccess(proposal, null, targetBoard);
        }
      }
    },
    onError: (error) => {
      console.error('[QuickCreate] ❌ Creation failed:', error.message);
      alert('Failed to create proposal: ' + error.message);
    }
  });

  const handleCreate = () => {
    if (!proposalName.trim()) {
      alert('Please enter a proposal name');
      return;
    }

    if (!selectedType) {
      alert('Please select a proposal type');
      return;
    }

    createProposalMutation.mutate({
      name: proposalName.trim(),
      type: selectedType
    });
  };

  const selectedTypeConfig = PROPOSAL_TYPES.find(t => t.value === selectedType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Create New Proposal
          </DialogTitle>
          <DialogDescription>
            Quick setup - just enter a name and choose the type
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Proposal Name Input */}
          <div className="space-y-2">
            <Label htmlFor="proposal_name" className="text-base font-semibold">
              Proposal Name *
            </Label>
            <Input
              id="proposal_name"
              value={proposalName}
              onChange={(e) => setProposalName(e.target.value)}
              placeholder="e.g., Cloud Infrastructure Modernization for VA"
              className="text-lg"
              autoFocus
            />
          </div>

          {/* Proposal Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Proposal Type *
            </Label>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROPOSAL_TYPES.map((type) => (
                <Card
                  key={type.value}
                  className={cn(
                    "cursor-pointer transition-all border-2 hover:shadow-lg relative",
                    selectedType === type.value 
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" 
                      : "border-slate-200 hover:border-blue-300",
                    type.featured && "ring-2 ring-amber-400"
                  )}
                  onClick={() => setSelectedType(type.value)}
                >
                  {type.featured && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                        ⚡ Featured
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-3">
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <h3 className="font-bold text-sm text-slate-900 mb-1">{type.label}</h3>
                    <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                      {type.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="w-3 h-3" />
                        {type.avgDuration}
                      </Badge>
                      <Badge 
                        className={cn(
                          type.complexity === 'Advanced' || type.complexity === 'Very High' 
                            ? 'bg-red-100 text-red-700' 
                            : type.complexity === 'High'
                            ? 'bg-orange-100 text-orange-700'
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

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">What happens next?</p>
                <ul className="space-y-1 text-xs">
                  <li>✓ Your proposal will be created and added to the appropriate board</li>
                  <li>✓ You'll be taken to the Pipeline where you can see it</li>
                  <li>✓ You can add more details anytime by opening the proposal card</li>
                  <li>✓ The board will guide you through your workflow automatically</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={createProposalMutation.isPending}>
              Cancel
            </Button>
            
            <Button
              onClick={handleCreate}
              disabled={createProposalMutation.isPending || !proposalName.trim() || !selectedType}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {createProposalMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Create & Go to Pipeline
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}