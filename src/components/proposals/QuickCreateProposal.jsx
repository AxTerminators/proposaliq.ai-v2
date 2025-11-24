import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  AlertCircle,
  Check,
  Layers,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { validateBoardName, validateProposalName } from "@/components/utils/boardNameValidation";

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
  onSuccess // Keep this prop
}) {
  const navigate = useNavigate(); // Hook for navigation
  const queryClient = useQueryClient();

  const [proposalName, setProposalName] = useState('');
  const [selectedType, setSelectedType] = useState(preselectedType || null);
  const [isCreating, setIsCreating] = useState(false); // State for overall creation loading
  const [boardName, setBoardName] = useState(""); // State for new board name
  const [boardNameError, setBoardNameError] = useState(""); // State for board name validation error
  const [isValidatingBoardName, setIsValidatingBoardName] = useState(false); // State for board name validation loading
  const [selectedBoardId, setSelectedBoardId] = useState(null); // State for manually selected board (null, board ID, or "create_new")

  // NEW: Proposal name validation state
  const [proposalNameError, setProposalNameError] = useState("");
  const [isValidatingProposalName, setIsValidatingProposalName] = useState(false);

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
        'board_name,board_type,applies_to_proposal_types,is_master_board,columns' // Include columns for later use
      );
    },
    enabled: isOpen && !!organization?.id,
  });

  // Reset when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setProposalName('');
      setSelectedType(preselectedType || null);
      setIsCreating(false);
      setBoardName('');
      setBoardNameError(''); // Renamed from nameError
      setIsValidatingBoardName(false); // Renamed from isValidatingName
      setNeedsNewBoard(false); // Reset this too
      setProposalNameError(''); // NEW: Reset proposal name error
      setIsValidatingProposalName(false); // NEW: Reset proposal name validation state

      // If a preselectedType is given, try to determine if it needs a new board
      if (preselectedType && templates.length > 0 && existingBoards.length > 0) {
        const templateForPreselected = templates.find(t => t.proposal_type_category === preselectedType);
        if (templateForPreselected) {
          const existingBoardFound = existingBoards.some(b =>
            b.board_type === templateForPreselected.board_type ||
            b.applies_to_proposal_types?.includes(preselectedType)
          );
          setNeedsNewBoard(!existingBoardFound);
        }
      }
    }
  }, [isOpen, preselectedType, templates, existingBoards]);

  // Real-time proposal name validation
  const handleProposalNameChange = async (value) => {
    setProposalName(value);
    setProposalNameError("");

    if (!value.trim()) {
      return;
    }

    setIsValidatingProposalName(true);

    try {
      const validation = await validateProposalName(value, organization.id);

      if (!validation.isValid) {
        setProposalNameError(validation.message);
      }
    } catch (error) {
      console.error('[QuickCreateProposal] Proposal name validation error:', error);
      setProposalNameError('Validation service error. Please try again.'); // Generic user-friendly error
    } finally {
      setIsValidatingProposalName(false);
    }
  };

  // Real-time board name validation
  const handleBoardNameChange = async (value) => {
    setBoardName(value);
    setBoardNameError(""); // Renamed from nameError

    if (!value.trim()) {
      return;
    }

    setIsValidatingBoardName(true); // Renamed from isValidatingName

    try {
      const validation = await validateBoardName(value, organization.id);

      if (!validation.isValid) {
        setBoardNameError(validation.message); // Renamed from nameError
      }
    } catch (error) {
      console.error('[QuickCreateProposal] Board name validation error:', error);
      setBoardNameError('Validation service error. Please try again.'); // Generic user-friendly error
    } finally {
      setIsValidatingBoardName(false); // Renamed from isValidatingName
    }
  };

  const handleTypeSelect = (template) => {
    setSelectedType(template.proposal_type_category);
    const matchingBoards = existingBoards.filter(b =>
      b.board_type === template.board_type ||
      b.applies_to_proposal_types?.includes(template.proposal_type_category)
    );
    setNeedsNewBoard(matchingBoards.length === 0);
    setSelectedBoardId(matchingBoards.length === 1 ? matchingBoards[0].id : null); // Auto-select if only one board
    setBoardName('');
    setBoardNameError('');
  };

  const handleCreate = async () => {
    if (!proposalName.trim()) {
      toast.error("Please enter a proposal name");
      return;
    }

    if (proposalNameError) { // NEW: Check proposal name error
      toast.error(proposalNameError);
      return;
    }

    if (!selectedType) {
      toast.error("Please select a proposal type");
      return;
    }

    const selectedTemplate = templates.find(t => t.proposal_type_category === selectedType);
    if (!selectedTemplate) {
      toast.error("Selected proposal type template not found. Please try again.");
      return;
    }

    // Final proposal name validation before creation
    setIsValidatingProposalName(true);
    const proposalValidation = await validateProposalName(proposalName, organization.id);
    setIsValidatingProposalName(false);
    if (!proposalValidation.isValid) {
      toast.error(proposalValidation.message);
      setProposalNameError(proposalValidation.message);
      return;
    }

    // If creating new board, validate board name
    if (needsNewBoard) {
      if (!boardName.trim()) {
        toast.error("Please enter a board name");
        return;
      }

      if (boardNameError) { // Renamed from nameError
        toast.error(boardNameError); // Renamed from nameError
        return;
      }

      // Final validation before creation
      setIsValidatingBoardName(true); // Renamed from isValidatingName
      const boardValidation = await validateBoardName(boardName, organization.id);
      setIsValidatingBoardName(false); // Renamed from isValidatingName
      if (!boardValidation.isValid) {
        toast.error(boardValidation.message);
        setBoardNameError(boardValidation.message); // Renamed from nameError
        return;
      }
    }

    setIsCreating(true);
    let targetBoard = null;

    try {
      console.log('[QuickCreate] 🚀 Creating proposal:', { name: proposalName, type: selectedType, selectedBoardId });

      // Use the board the user explicitly selected
      let existingBoardForType = null;
      
      if (selectedBoardId) {
        // User explicitly selected a board from the dropdown
        existingBoardForType = existingBoards.find(b => b.id === selectedBoardId);
        console.log('[QuickCreate] 🎯 Using user-selected board:', existingBoardForType?.board_name);
      } else {
        // Auto-find a matching board
        existingBoardForType = existingBoards.find(b =>
          b.board_type === selectedTemplate.board_type ||
          b.applies_to_proposal_types?.includes(selectedType)
        );
        console.log('[QuickCreate] 🔍 Auto-found board:', existingBoardForType?.board_name);
      }

      if (needsNewBoard && !existingBoardForType) {
        // Create a new board if needsNewBoard is true and no existing board for this type
        const newBoardData = {
          organization_id: organization.id,
          board_name: boardName.trim(),
          description: `Kanban board for ${selectedTemplate.template_name} proposals.`,
          board_type: selectedTemplate.board_type,
          applies_to_proposal_types: [selectedType],
          is_master_board: false, // Newly created type-specific boards are not master boards by default
          columns: selectedTemplate.workflow_stages || [], // Use template's stages
          created_by: 'system_quick_create',
          created_date: new Date().toISOString(),
          is_active: true,
          default_proposal_type: selectedType
        };
        targetBoard = await base44.entities.KanbanConfig.create(newBoardData);
        toast.success(`New board "${boardName}" created successfully!`);
      } else if (existingBoardForType) {
        // Use the existing board if one is found
        targetBoard = existingBoardForType;
        toast.info(`Using existing board "${targetBoard.board_name}" for this proposal type.`);
      } else {
        // Fallback to master board if no specific board and needsNewBoard was false (or no input given)
        targetBoard = existingBoards.find(b => b.is_master_board);
        if (targetBoard) {
          toast.info(`No specific board found for type ${selectedType}, falling back to master board "${targetBoard.board_name}".`);
        }
      }

      if (!targetBoard) {
        throw new Error('No appropriate board configuration found or created. Please ensure a board exists or specify a new board name.');
      }

      // Find first non-terminal column
      const firstColumn = targetBoard.columns
        .filter(col => !col.is_terminal)
        .sort((a, b) => (a.order || 0) - (b.order || 0))[0];

      if (!firstColumn) {
        throw new Error('No workflow columns found in the selected board. Please configure the board first.');
      }

      // Build proposal data
      let proposalCreateData = {
        proposal_name: proposalName.trim(),
        organization_id: organization.id,
        proposal_type_category: selectedType,
        manual_order: 0,
        is_sample_data: false,
        current_phase: 'phase1', // Default, will be overridden by firstColumn if applicable
        status: 'evaluating', // Default, will be overridden by firstColumn if applicable
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
      toast.success(`Proposal "${proposalName.trim()}" created successfully!`);

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
      toast.success('Default sections for the proposal added.');

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['all-kanban-boards'] });
      await queryClient.invalidateQueries({ queryKey: ['proposals'] });
      await queryClient.invalidateQueries({ queryKey: ['proposal-sections', proposal.id] });

      await queryClient.refetchQueries({
        queryKey: ['all-kanban-boards'],
        exact: false
      });

      onClose();

      console.log('[QuickCreate] ✅ SUCCESS - navigating to board:', targetBoard.board_name, targetBoard.id);
      
      if (onSuccess) {
        console.log('[QuickCreate] 📞 Calling onSuccess with targetBoard:', targetBoard.id);
        onSuccess(proposal, null, targetBoard);
      }
      
      // Navigate to the pipeline with the specific board selected
      console.log('[QuickCreate] 🚀 Navigating to Pipeline with boardId:', targetBoard.id);
      navigate(`/pipeline?boardId=${targetBoard.id}`);

    } catch (error) {
      console.error('[QuickCreate] ❌ Creation failed:', error.message);
      toast.error('Failed to create proposal: ' + error.message);
      // If the error was specifically related to board creation, potentially update boardNameError
      if (needsNewBoard && error.message.includes('board configuration')) {
        setBoardNameError(error.message); // Renamed from nameError
      }
    } finally {
      setIsCreating(false);
    }
  };

  const selectedTemplate = templates.find(t => t.proposal_type_category === selectedType);


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
          {/* Proposal Name Input with Validation */}
          <div className="space-y-2">
            <Label htmlFor="proposal_name" className="text-base font-semibold">
              Proposal Name *
            </Label>
            <Input
              id="proposal_name"
              value={proposalName}
              onChange={(e) => handleProposalNameChange(e.target.value)} // NEW: Use handleProposalNameChange
              placeholder="e.g., Cloud Infrastructure Modernization for VA"
              className={cn(
                "text-lg",
                proposalNameError && "border-red-500 focus-visible:ring-red-500" // NEW: Conditional styling
              )}
              autoFocus
              disabled={isCreating}
            />
            {isValidatingProposalName && ( // NEW: Validation feedback
              <p className="text-xs text-blue-600 flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                Checking availability...
              </p>
            )}
            {proposalNameError && ( // NEW: Error message
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {proposalNameError}
              </p>
            )}
            {!proposalNameError && proposalName.trim().length >= 6 && !isValidatingProposalName && ( // NEW: Success message (min length is 6 for proposals)
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Proposal name is available
              </p>
            )}
            <p className="text-xs text-slate-600">
              Must be 6-60 characters, unique within your organization, and avoid special characters: / \ : * ? " &lt; &gt; | # % &amp;
            </p>
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
                          : "border-slate-200 hover:border-blue-300",
                        isCreating && "pointer-events-none opacity-70"
                      )}
                      onClick={() => handleTypeSelect(template)}
                    >
                      {hasBoardForType ? (
                        <div className="absolute -top-2 -right-2">
                          <Badge className="bg-green-500 text-white text-xs">
                            ✓ Board Ready
                          </Badge>
                        </div>
                      ) : (
                        selectedType === proposalType && ( // Only show if selected and needs new board
                          <div className="absolute -top-2 -right-2">
                            <Badge className="bg-orange-500 text-white text-xs">
                              Needs New Board
                            </Badge>
                          </div>
                        )
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

          {/* Board Selector - if multiple boards exist for this type */}
          {!needsNewBoard && selectedType && (() => {
            const selectedTemplate = templates.find(t => t.proposal_type_category === selectedType);
            const matchingBoards = existingBoards.filter(b =>
              b.board_type === selectedTemplate?.board_type ||
              b.applies_to_proposal_types?.includes(selectedType)
            );
            
            if (matchingBoards.length > 1) {
              return (
                <div className="space-y-2">
                  <Label htmlFor="board-selector" className="text-sm font-semibold">
                    Select Board <span className="text-red-500">*</span>
                  </Label>
                  <Select value={selectedBoardId || ""} onValueChange={setSelectedBoardId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose which board to add this proposal to" />
                    </SelectTrigger>
                    <SelectContent>
                      {matchingBoards.map(board => (
                        <SelectItem key={board.id} value={board.id}>
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            {board.board_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-600">
                    Multiple boards support this proposal type - choose where to create it
                  </p>
                </div>
              );
            }
            return null;
          })()}

          {/* Board Name Input - if creating new board */}
          {needsNewBoard && selectedType && (
            <div className="space-y-2 mt-4">
              <Label htmlFor="new-board-name" className="text-sm font-semibold">
                New Board Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-board-name"
                value={boardName}
                onChange={(e) => handleBoardNameChange(e.target.value)}
                placeholder={`e.g., ${selectedTemplate?.template_name || 'My Board'}`}
                className={cn(
                  boardNameError && "border-red-500 focus-visible:ring-red-500" // Renamed from nameError
                )}
                disabled={isCreating}
              />
              {isValidatingBoardName && ( // Renamed from isValidatingName
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-600 border-t-transparent"></div>
                  Checking availability...
                </p>
              )}
              {boardNameError && ( // Renamed from nameError
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {boardNameError}
                </p>
              )}
              {!boardNameError && boardName.trim().length >= 3 && !isValidatingBoardName && ( // Renamed from nameError, isValidatingName
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Board name is available
                </p>
              )}
              <p className="text-xs text-slate-600">
                This name must be unique across all your boards (case-insensitive)
              </p>
            </div>
          )}

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
            <Button variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>

            <Button
              onClick={handleCreate}
              disabled={
                isCreating ||
                !proposalName.trim() ||
                proposalNameError ||
                isValidatingProposalName ||
                !selectedType ||
                (needsNewBoard && (!boardName.trim() || boardNameError || isValidatingBoardName)) ||
                (!needsNewBoard && (() => {
                  const selectedTemplate = templates.find(t => t.proposal_type_category === selectedType);
                  const matchingBoards = existingBoards.filter(b =>
                    b.board_type === selectedTemplate?.board_type ||
                    b.applies_to_proposal_types?.includes(selectedType)
                  );
                  return matchingBoards.length > 1 && !selectedBoardId;
                })())
              }
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isCreating ? (
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