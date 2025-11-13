
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Layers,
  ArrowRight,
  Check,
  Clock,
  Zap,
  Building2,
  FileText,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const BOARD_TYPE_ICONS = {
  'rfp': '📋',
  'rfi': '📝',
  'sbir': '🔬',
  'gsa': '🏛️',
  'idiq': '📑',
  'state_local': '🏢',
  'custom': '📊',
  'master': '⭐',
  'rfp_15_column': '🎯'
};

export default function QuickBoardCreation({ isOpen, onClose, organization, onBoardCreated }) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [boardName, setBoardName] = useState("");
  const [step, setStep] = useState(1);

  const SPECIAL_BOARDS = [
    {
      id: 'rfp_15_column',
      name: '15-Column RFP Workflow',
      description: 'Complete independent 15-column workflow with mandatory checklists',
      icon_emoji: '🎯', // Changed from 'icon' to 'icon_emoji'
      boardType: 'rfp_15_column',
      functionName: 'create15ColumnRFPBoard',
      features: ['11 workflow stages', 'Mandatory checklists', 'AI-powered actions', 'Independent from builder'],
      recommendedFor: 'Teams wanting maximum control and visibility',
      estimatedDuration: '60-90 days',
      complexity: 'Advanced',
      proposal_type_category: 'RFP'
    }
  ];

  const createSpecialBoardMutation = useMutation({
    mutationFn: async ({ functionName }) => {
      const response = await base44.functions.invoke(functionName, {
        organization_id: organization.id
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create board');
      }
      
      return response.data;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['all-kanban-boards'] });
      
      // Fetch the newly created board
      const boards = await base44.entities.KanbanConfig.filter({
        id: data.board_id
      });
      
      if (boards.length > 0 && onBoardCreated) {
        onBoardCreated(boards[0]);
      }
      
      setSelectedTemplate(null);
      setBoardName("");
      setStep(1);
      onClose();
      
      toast.success(`✅ ${data.message}`);
    },
    onError: (error) => {
      toast.error(`Error creating board: ${error.message}`);
    }
  });

  // Fetch available templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['workflow-templates-quick-create'],
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
      
      return [...systemTemplates, ...orgTemplates].filter(t => t != null); // Added filter
    },
    enabled: isOpen && !!organization?.id,
  });

  // NEW: Fetch existing boards for name validation
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

  // NEW: Validation function for duplicate board names (case-insensitive)
  const validateUniqueBoardName = (name) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { valid: false, error: 'Board name cannot be empty' };
    }

    // Case-insensitive comparison
    const normalizedName = trimmedName.toLowerCase();
    const duplicate = existingBoards.find(board => 
      board.board_name.toLowerCase() === normalizedName
    );

    if (duplicate) {
      return { 
        valid: false, 
        error: `A board named "${duplicate.board_name}" already exists. Please choose a different name.` 
      };
    }

    return { valid: true };
  };

  // Create board mutation (for template-based boards)
  const createBoardMutation = useMutation({
    mutationFn: async ({ template, customBoardName }) => {
      // NEW: Validate board name before creating
      const validation = validateUniqueBoardName(customBoardName);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const workflowConfig = typeof template.workflow_config === 'string'
        ? JSON.parse(template.workflow_config)
        : template.workflow_config;

      const boardType = template.board_type || template.proposal_type_category?.toLowerCase() || 'custom';
      
      const newBoard = await base44.entities.KanbanConfig.create({
        organization_id: organization.id,
        board_type: boardType,
        board_name: customBoardName.trim(), // Use trimmed name
        is_master_board: false,
        applies_to_proposal_types: [template.proposal_type_category],
        simplified_workflow: false,
        columns: workflowConfig.columns || [],
        collapsed_column_ids: [],
        swimlane_config: workflowConfig.swimlane_config || {
          enabled: false,
          group_by: 'none',
          custom_field_name: '',
          show_empty_swimlanes: false
        },
        view_settings: workflowConfig.view_settings || {
          default_view: 'kanban',
          show_card_details: ['assignees', 'due_date', 'progress', 'value'],
          compact_mode: false
        }
      });

      return newBoard;
    },
    onSuccess: (newBoard) => {
      queryClient.invalidateQueries({ queryKey: ['all-kanban-boards'] });
      
      if (onBoardCreated) {
        onBoardCreated(newBoard);
      }
      
      toast.success(`✅ Board "${newBoard.board_name}" created successfully!`);
      setSelectedTemplate(null);
      setBoardName("");
      setStep(1);
      onClose();
    },
    onError: (error) => {
      // NEW: Use toast for better UX
      toast.error(error.message || 'Failed to create board');
    }
  });

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setBoardName(template.template_name || template.name);
    setStep(2);
  };

  const handleCreateBoard = () => {
    if (!selectedTemplate) {
      toast.error("Please select a template");
      return;
    }

    // Check if this is a special board (with function)
    if (selectedTemplate.functionName) {
      createSpecialBoardMutation.mutate({
        functionName: selectedTemplate.functionName
      });
      return;
    }

    // Template-based board creation
    if (!boardName.trim()) {
      toast.error("Please enter a board name");
      return;
    }

    // NEW: Validate before creating
    const validation = validateUniqueBoardName(boardName);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    createBoardMutation.mutate({
      template: selectedTemplate,
      customBoardName: boardName.trim()
    });
  };

  const handleBack = () => {
    setStep(1);
    setSelectedTemplate(null);
  };

  const handleDialogClose = () => {
    setStep(1);
    setSelectedTemplate(null);
    setBoardName("");
    onClose();
  };

  const workflowConfig = selectedTemplate && (() => {
    try {
      if (selectedTemplate.workflow_config) {
        return typeof selectedTemplate.workflow_config === 'string'
          ? JSON.parse(selectedTemplate.workflow_config)
          : selectedTemplate.workflow_config;
      }
      return { columns: [] };
    } catch {
      return { columns: [] };
    }
  })();

  const columns = workflowConfig?.columns || [];
  const nonTerminalColumns = columns.filter(col => !col.is_terminal);

  // Combine special boards with templates - with safety checks
  const allOptions = [
    ...SPECIAL_BOARDS, 
    ...templates.filter(t => t && t.id) // Added filter
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Quick Board Creation
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Choose a workflow template to create a new board" 
              : "Review and create your new board"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            {isLoadingTemplates ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-slate-600">Loading templates...</p>
              </div>
            ) : allOptions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Available</h3>
                <p className="text-slate-600">Create your first template to get started</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allOptions.map(template => {
                  if (!template) return null; // Added null check
                  
                  const isSystem = template.template_type === 'system';
                  const isSpecial = !!template.functionName;
                  const displayIcon = template.icon_emoji || template.icon || BOARD_TYPE_ICONS[template.boardType || template.board_type] || '📋';
                  const displayName = template.name || template.template_name || 'Unnamed Template';
                  const displayDescription = template.description || 'No description';
                  const displayCategory = template.proposal_type_category || 'OTHER';
                  
                  return (
                    <Card
                      key={template.id || `template-${Math.random()}`} // Updated key for safety
                      className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-400"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-3xl">{displayIcon}</div>
                          <div className="flex flex-col gap-1 items-end">
                            {isSpecial && (
                              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                                ⚡ Featured
                              </Badge>
                            )}
                            <Badge variant={isSystem ? "default" : "outline"} className="text-xs">
                              {isSystem ? 'System' : isSpecial ? 'Special' : 'Custom'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {displayCategory}
                            </Badge>
                          </div>
                        </div>
                        
                        <h3 className="font-bold text-slate-900 mb-2">{displayName}</h3>
                        
                        <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                          {displayDescription}
                        </p>
                        
                        {template.features && Array.isArray(template.features) && ( // Added Array.isArray check
                          <div className="mb-3 space-y-1">
                            {template.features.slice(0, 2).map((feature, idx) => (
                              <div key={idx} className="flex items-center gap-1 text-xs text-slate-600">
                                <Check className="w-3 h-3 text-green-600" />
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2 text-xs">
                          {template.complexity && (
                            <Badge variant="outline" className="capitalize">
                              {template.complexity}
                            </Badge>
                          )}
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" />
                            {template.estimatedDuration || (template.estimated_duration_days ? `~${template.estimated_duration_days}d` : '~30d')} {/* Updated fallback */}
                          </Badge>
                          {template.usage_count > 0 && (
                            <Badge className="bg-green-100 text-green-700 gap-1">
                              <Check className="w-3 h-3" />
                              {template.usage_count} uses
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 2 && selectedTemplate && (
          <div className="space-y-6 py-4">
            {/* Selected Template Info */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{selectedTemplate.icon_emoji || selectedTemplate.icon || '📋'}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">{selectedTemplate.name || selectedTemplate.template_name || 'Template'}</h3>
                    <p className="text-sm text-slate-600 mb-2">{selectedTemplate.description || ''}</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline">{selectedTemplate.proposal_type_category || 'OTHER'}</Badge>
                      {selectedTemplate.complexity && (
                        <Badge variant="outline" className="capitalize">{selectedTemplate.complexity}</Badge>
                      )}
                      <Badge variant="outline">
                        {selectedTemplate.estimatedDuration || (selectedTemplate.estimated_duration_days ? `~${selectedTemplate.estimated_duration_days} days` : '~30 days')} {/* Updated fallback */}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NEW: Board Name Input for template-based boards */}
            {!selectedTemplate.functionName && (
              <div className="space-y-2">
                <Label htmlFor="board-name-input" className="text-base font-semibold">Board Name <span className="text-red-500">*</span></Label>
                <Input
                  id="board-name-input"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                  placeholder="Enter a unique name for this board..."
                  className="text-base"
                />
                <div className="flex items-start gap-2 text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p>
                    Choose a unique name that clearly identifies this board. The name is case-insensitive, 
                    so "My RFP Board" and "my rfp board" are considered the same.
                  </p>
                </div>
              </div>
            )}

            {/* Workflow Preview (only if not special board) */}
            {!selectedTemplate.functionName && nonTerminalColumns.length > 0 && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Workflow Preview</Label>
                <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {nonTerminalColumns.slice(0, 6).map((col, idx) => (
                      <React.Fragment key={col.id}>
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <div className={cn("w-3 h-3 rounded", `bg-gradient-to-r ${col.color}`)} />
                          <div className="text-xs font-medium text-slate-700 whitespace-nowrap">
                            {col.label}
                          </div>
                        </div>
                        {idx < Math.min(nonTerminalColumns.length, 6) - 1 && (
                          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                    {nonTerminalColumns.length > 6 && (
                      <span className="text-xs text-slate-500 ml-2">+{nonTerminalColumns.length - 6} more</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Features (for special boards) */}
            {selectedTemplate.features && (
              <div>
                <Label className="text-base font-semibold mb-3 block">Features</Label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTemplate.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-green-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">What happens next?</p>
                  <ul className="space-y-1 text-xs">
                    <li>✓ A new board will be created with this workflow</li>
                    <li>✓ It will show only {selectedTemplate.proposal_type_category} proposals</li>
                    <li>✓ You can customize it anytime via Configure Board</li>
                    <li>✓ You'll be automatically switched to the new board</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          {step === 2 && (
            <Button variant="outline" onClick={handleBack} className="mr-auto">
              Back
            </Button>
          )}
          
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            
            {step === 2 && (
              <Button
                onClick={handleCreateBoard}
                disabled={createBoardMutation.isPending || createSpecialBoardMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {(createBoardMutation.isPending || createSpecialBoardMutation.isPending) ? (
                  <>
                    <div className="animate-spin mr-2">⏳</div>
                    Creating Board...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Create Board
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
