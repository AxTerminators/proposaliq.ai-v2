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
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Standard proposal sections that will be created as placeholders
const DEFAULT_PROPOSAL_SECTIONS = [
  { id: "executive_summary", name: "Executive Summary", section_type: "executive_summary", order: 0 },
  { id: "technical_approach", name: "Technical Approach", section_type: "technical_approach", order: 1 },
  { id: "management_plan", name: "Management Plan", section_type: "management_plan", order: 2 },
  { id: "past_performance", name: "Past Performance", section_type: "past_performance", order: 3 },
  { id: "key_personnel", name: "Key Personnel", section_type: "key_personnel", order: 4 },
  { id: "corporate_experience", name: "Corporate Experience", section_type: "corporate_experience", order: 5 },
  { id: "quality_assurance", name: "Quality Assurance", section_type: "quality_assurance", order: 6 },
  { id: "transition_plan", name: "Transition Plan", section_type: "transition_plan", order: 7 },
  { id: "pricing", name: "Pricing", section_type: "pricing", order: 8 },
  { id: "other", name: "Other", section_type: "other", order: 9 }
];

const BOARD_TYPE_ICONS = {
  'rfp': '📋',
  'rfi': '📝',
  'sbir': '🔬',
  'gsa': '🏛️',
  'idiq': '📑',
  'state_local': '🏢',
  'custom': '📊',
  'rfp_15_column': '🎯'
};

const COMPLEXITY_MAP = {
  'RFP': 'High',
  'RFP_15_COLUMN': 'Advanced',
  'RFI': 'Low',
  'SBIR': 'Very High',
  'GSA': 'Medium',
  'IDIQ': 'Medium',
  'STATE_LOCAL': 'Medium',
  'CUSTOM_PROJECT': 'Variable',
  'OTHER': 'Variable'
};

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

  // Fetch available templates to determine proposal types
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['workflow-templates-for-proposal-creation'],
    queryFn: async () => {
      const systemTemplates = await base44.entities.ProposalWorkflowTemplate.filter({
        template_type: 'system',
        is_active: true
      }, '-created_date');
      
      const orgTemplates = organization?.id 
        ? await base44.entities.ProposalWorkflowTemplate.filter({
            organization_id: organization.id,
            is_active: true
          }, '-created_date')
        : [];
      
      return [...systemTemplates, ...orgTemplates].filter(t => t != null);
    },
    enabled: isOpen && !!organization?.id,
  });

  // Fetch existing boards to show which types have boards
  const { data: existingBoards = [] } = useQuery({
    queryKey: ['all-kanban-boards', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        'board_name'
      );
    },
    enabled: isOpen && !!organization?.id,
  });

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
      
      // Find appropriate board for this type
      const boards = await base44.entities.KanbanConfig.filter({
        organization_id: organization.id,
      });

      // Try to find board that matches the type
      let targetBoard = boards.find(b => 
        b.board_type === type.toLowerCase() ||
        b.applies_to_proposal_types?.includes(type)
      );

      // Fallback to master board
      if (!targetBoard) {
        targetBoard = boards.find(b => b.is_master_board);
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

      // Auto-generate placeholder sections for this proposal
      console.log('[QuickCreate] 📝 Auto-generating placeholder sections...');
      
      const sectionsToCreate = DEFAULT_PROPOSAL_SECTIONS.map(section => ({
        proposal_id: proposal.id,
        section_name: section.name,
        section_type: section.section_type,
        content: '', // Empty placeholder
        word_count: 0,
        order: section.order,
        status: 'draft'
      }));

      // Bulk create all sections at once
      await base44.entities.ProposalSection.bulkCreate(sectionsToCreate);
      
      console.log('[QuickCreate] ✅ Created', sectionsToCreate.length, 'placeholder sections');

      return { proposal, targetBoard };
    },
    onSuccess: async ({ proposal, targetBoard }) => {
      await queryClient.invalidateQueries({ queryKey: ['all-kanban-boards'] });
      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
      await queryClient.invalidateQueries({ queryKey: ['proposal-sections', proposal.id] });
      
      await queryClient.refetchQueries({ 
        queryKey: ['all-kanban-boards'],
        exact: false
      });
      
      onClose();
      
      if (onSuccess) {
        console.log('[QuickCreate] 📞 Calling onSuccess');
        onSuccess(proposal, null, targetBoard);
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

          {/* Proposal Type Selection - Dynamic from Templates */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Proposal Type *
            </Label>
            
            {isLoadingTemplates ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-slate-600">Loading available types...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Available</h3>
                <p className="text-slate-600">Create a board template first to enable proposal creation</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates.map((template) => {
                  const proposalType = template.proposal_type_category;
                  const boardType = template.board_type;
                  const icon = template.icon_emoji || BOARD_TYPE_ICONS[boardType] || '📋';
                  const complexity = COMPLEXITY_MAP[proposalType] || 'Variable';
                  const estimatedDuration = template.estimated_duration_days 
                    ? `~${template.estimated_duration_days} days` 
                    : '30-60 days';
                  
                  // Check if a board exists for this type
                  const hasBoardForType = existingBoards.some(b => 
                    b.board_type === boardType || 
                    b.applies_to_proposal_types?.includes(proposalType)
                  );
                  
                  return (
                    <Card
                      key={template.id}
                      className={cn(
                        "cursor-pointer transition-all border-2 hover:shadow-lg relative",
                        selectedType === proposalType 
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" 
                          : "border-slate-200 hover:border-blue-300"
                      )}
                      onClick={() => setSelectedType(proposalType)}
                    >
                      {hasBoardForType && (
                        <div className="absolute -top-2 -right-2">
                          <Badge className="bg-green-500 text-white text-xs">
                            ✓ Board Ready
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-3">
                        <div className="text-2xl mb-2">{icon}</div>
                        <h3 className="font-bold text-sm text-slate-900 mb-1">
                          {template.template_name}
                        </h3>
                        <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                          {template.description || 'No description'}
                        </p>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <Badge variant="outline" className="gap-1">
                            <Calendar className="w-3 h-3" />
                            {estimatedDuration}
                          </Badge>
                          <Badge 
                            className={cn(
                              complexity === 'Advanced' || complexity === 'Very High' 
                                ? 'bg-red-100 text-red-700' 
                                : complexity === 'High'
                                ? 'bg-orange-100 text-orange-700'
                                : complexity === 'Medium'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-green-100 text-green-700'
                            )}
                          >
                            {complexity}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">What happens next?</p>
                <ul className="space-y-1 text-xs">
                  <li>✓ Your proposal will be created and added to the appropriate board</li>
                  <li>✓ Standard sections will be auto-generated as placeholders</li>
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