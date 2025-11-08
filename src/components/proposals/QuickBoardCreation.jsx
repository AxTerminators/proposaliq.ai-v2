
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
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

const BOARD_TYPE_ICONS = {
  'rfp': '📋',
  'rfi': '📝', // Changed from '❓' to '📝'
  'sbir': '🔬',
  'gsa': '🏛️',
  'idiq': '📑',
  'state_local': '🏢',
  'custom': '📊',
  'master': '⭐'
};

export default function QuickBoardCreation({ isOpen, onClose, organization, onBoardCreated }) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [boardName, setBoardName] = useState("");
  const [step, setStep] = useState(1);

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
      
      return [...systemTemplates, ...orgTemplates];
    },
    enabled: isOpen && !!organization?.id,
  });

  // Create board mutation
  const createBoardMutation = useMutation({
    mutationFn: async ({ template, customBoardName }) => {
      const workflowConfig = typeof template.workflow_config === 'string'
        ? JSON.parse(template.workflow_config)
        : template.workflow_config;

      const boardType = template.board_type || template.proposal_type_category?.toLowerCase() || 'custom';
      
      const newBoard = await base44.entities.KanbanConfig.create({
        organization_id: organization.id,
        board_type: boardType,
        board_name: customBoardName || template.template_name,
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
      
      // Reset state
      setSelectedTemplate(null);
      setBoardName("");
      setStep(1);
      onClose();
    }
  });

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setBoardName(template.template_name);
    setStep(2);
  };

  const handleCreateBoard = () => {
    if (!selectedTemplate) {
      alert("Please select a template");
      return;
    }

    if (!boardName.trim()) {
      alert("Please enter a board name");
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
    setBoardName("");
  };

  const handleDialogClose = () => {
    setStep(1);
    setSelectedTemplate(null);
    setBoardName("");
    onClose();
  };

  const workflowConfig = selectedTemplate && (() => {
    try {
      return typeof selectedTemplate.workflow_config === 'string'
        ? JSON.parse(selectedTemplate.workflow_config)
        : selectedTemplate.workflow_config;
    } catch {
      return { columns: [] };
    }
  })();

  const columns = workflowConfig?.columns || [];
  const nonTerminalColumns = columns.filter(col => !col.is_terminal);

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
              : "Customize your new board"}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            {isLoadingTemplates ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-slate-600">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Templates Available</h3>
                <p className="text-slate-600">Create your first template to get started</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => {
                  const isSystem = template.template_type === 'system';
                  
                  return (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-400"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-3xl">{template.icon_emoji || BOARD_TYPE_ICONS[template.board_type] || '📋'}</div>
                          <div className="flex flex-col gap-1 items-end">
                            <Badge variant={isSystem ? "default" : "outline"} className="text-xs">
                              {isSystem ? 'System' : 'Custom'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.proposal_type_category}
                            </Badge>
                          </div>
                        </div>
                        
                        <h3 className="font-bold text-slate-900 mb-2">{template.template_name}</h3>
                        
                        <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                          {template.description || 'No description'}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline" className="gap-1">
                            <Layers className="w-3 h-3" />
                            {(() => {
                              try {
                                const config = typeof template.workflow_config === 'string'
                                  ? JSON.parse(template.workflow_config)
                                  : template.workflow_config;
                                return config?.columns?.length || 0;
                              } catch {
                                return 0;
                              }
                            })()} steps
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" />
                            ~{template.estimated_duration_days || 30}d
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
                  <div className="text-4xl">{selectedTemplate.icon_emoji || '📋'}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">{selectedTemplate.template_name}</h3>
                    <p className="text-sm text-slate-600 mb-2">{selectedTemplate.description}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline">{selectedTemplate.proposal_type_category}</Badge>
                      <Badge variant="outline">{nonTerminalColumns.length} workflow steps</Badge>
                      <Badge variant="outline">~{selectedTemplate.estimated_duration_days || 30} days</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Preview */}
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

            {/* Customize Board Name */}
            <div className="space-y-2">
              <Label htmlFor="board_name">Board Name *</Label>
              <Input
                id="board_name"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="e.g., My RFP Workflow Board"
              />
              <p className="text-xs text-slate-500">
                This name will appear in your board switcher
              </p>
            </div>

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
                disabled={createBoardMutation.isPending || !boardName.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {createBoardMutation.isPending ? (
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
