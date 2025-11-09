
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, FileText, Briefcase, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import FolderSelector from "../folders/FolderSelector"; // Added import

const BOARD_CATEGORIES = [
  { value: 'proposal_board', label: 'Proposal Board', icon: FileText, description: 'Manage proposals with workflow stages' },
  { value: 'project_management_board', label: 'Project Management Board', icon: Briefcase, description: 'Manage tasks and projects' },
];

const MASTER_BOARD_STATUSES = [
  { value: 'evaluating', label: 'Evaluating', color: 'bg-slate-100 text-slate-700' },
  { value: 'watch_list', label: 'Watch List', color: 'bg-amber-100 text-amber-700' },
  { value: 'draft', label: 'Draft', color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-purple-100 text-purple-700' },
  { value: 'submitted', label: 'Submitted', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'won', label: 'Won', color: 'bg-green-100 text-green-700' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-100 text-gray-700' },
];

const DEFAULT_COLORS = [
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-green-400 to-green-600',
  'from-amber-400 to-amber-600',
  'from-red-400 to-red-600',
  'from-cyan-400 to-cyan-600',
  'from-pink-400 to-pink-600',
  'from-indigo-400 to-indigo-600',
];

export default function CustomBoardCreationWizard({ isOpen, onClose, organization, onBoardCreated }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [boardName, setBoardName] = useState("");
  const [boardCategory, setBoardCategory] = useState("");
  const [columns, setColumns] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null); // Added state

  const createBoardMutation = useMutation({
    mutationFn: async (boardData) => {
      return base44.entities.KanbanConfig.create(boardData);
    },
    onSuccess: (newBoard) => {
      queryClient.invalidateQueries({ queryKey: ['all-boards'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-config'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] }); // Added query invalidation
      if (onBoardCreated) {
        onBoardCreated(newBoard);
      }
      handleClose();
    },
  });

  // Query for folders to display in summary
  const { data: folders = [] } = useQuery({
    queryKey: ['folders', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const response = await base44.entities.Folder.list({
        organization_id: organization.id,
      });
      return response.items;
    },
    enabled: !!organization?.id,
  });

  const handleClose = () => {
    setStep(1);
    setBoardName("");
    setBoardCategory("");
    setColumns([]);
    setSelectedFolderId(null); // Reset folder selection
    onClose();
  };

  const handleNext = () => {
    if (step === 1 && boardName && boardCategory) {
      // Initialize with terminal columns for proposal boards
      if (boardCategory === 'proposal_board') {
        setColumns([
          {
            id: 'submitted',
            label: 'Submitted',
            color: 'from-indigo-400 to-indigo-600',
            type: 'default_status',
            default_status_mapping: 'submitted',
            master_board_status_mapping: 'submitted',
            is_terminal: true,
            is_locked: true,
            order: 1000,
            checklist_items: []
          },
          {
            id: 'won',
            label: 'Won',
            color: 'from-green-400 to-green-600',
            type: 'default_status',
            default_status_mapping: 'won',
            master_board_status_mapping: 'won',
            is_terminal: true,
            is_locked: true,
            order: 1001,
            checklist_items: []
          },
          {
            id: 'lost',
            label: 'Lost',
            color: 'from-red-400 to-red-600',
            type: 'default_status',
            default_status_mapping: 'lost',
            master_board_status_mapping: 'lost',
            is_terminal: true,
            is_locked: true,
            order: 1002,
            checklist_items: []
          },
          {
            id: 'archived',
            label: 'Archived',
            color: 'from-gray-400 to-gray-600',
            type: 'default_status',
            default_status_mapping: 'archived',
            master_board_status_mapping: 'archived',
            is_terminal: true,
            is_locked: true,
            order: 1003,
            checklist_items: []
          }
        ]);
      }
      setStep(2);
    }
  };

  const handleAddColumn = () => {
    const newColumn = {
      id: `custom_${Date.now()}`,
      label: `Stage ${columns.filter(c => !c.is_terminal).length + 1}`,
      color: DEFAULT_COLORS[columns.filter(c => !c.is_terminal).length % DEFAULT_COLORS.length],
      type: 'custom_stage',
      master_board_status_mapping: boardCategory === 'proposal_board' ? 'in_progress' : null,
      order: columns.filter(c => !c.is_terminal).length,
      checklist_items: [],
      is_locked: false,
      is_terminal: false
    };
    
    // Insert before terminal columns
    const terminalColumns = columns.filter(c => c.is_terminal);
    const nonTerminalColumns = columns.filter(c => !c.is_terminal);
    setColumns([...nonTerminalColumns, newColumn, ...terminalColumns]);
  };

  const handleRemoveColumn = (columnId) => {
    setColumns(columns.filter(c => c.id !== columnId));
  };

  const handleUpdateColumn = (columnId, field, value) => {
    setColumns(columns.map(c => 
      c.id === columnId ? { ...c, [field]: value } : c
    ));
  };

  const handleCreate = async () => {
    if (!boardName || !boardCategory || columns.length === 0) return;

    const boardData = {
      organization_id: organization.id,
      board_name: boardName,
      board_type: 'custom',
      board_category: boardCategory,
      is_master_board: false,
      is_template_board: false,
      is_deletable: true,
      applies_to_proposal_types: boardCategory === 'proposal_board' ? [] : null,
      folder_id: selectedFolderId, // Added folder assignment
      columns: columns.map((col, idx) => ({
        ...col,
        order: idx
      })),
      created_by: organization.created_by
    };

    await createBoardMutation.mutateAsync(boardData);
  };

  const isProposalBoard = boardCategory === 'proposal_board';
  const nonTerminalColumns = columns.filter(c => !c.is_terminal);
  const canProceed = step === 1 ? (boardName && boardCategory) : nonTerminalColumns.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Custom Board</DialogTitle>
          <DialogDescription>
            Step {step} of 3: {step === 1 ? 'Board Details' : step === 2 ? 'Configure Columns' : 'Organization & Summary'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Board Name</Label>
              <Input
                placeholder="e.g., Client Projects, Contract Management"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <Label>Board Category</Label>
              <div className="grid grid-cols-2 gap-4">
                {BOARD_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  return (
                    <Card
                      key={category.value}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-lg",
                        boardCategory === category.value && "ring-2 ring-blue-500 bg-blue-50"
                      )}
                      onClick={() => setBoardCategory(category.value)}
                    >
                      <CardContent className="p-6">
                        <Icon className={cn(
                          "w-10 h-10 mb-3",
                          boardCategory === category.value ? "text-blue-600" : "text-slate-400"
                        )} />
                        <h3 className="font-bold text-lg mb-2">{category.label}</h3>
                        <p className="text-sm text-slate-600">{category.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {boardCategory === 'proposal_board' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900">
                    <strong>Proposal Boards</strong> will automatically include terminal columns 
                    (Submitted, Won, Lost, Archived) and each column will map to the Master Board.
                  </p>
                </div>
              )}
              
              {boardCategory === 'project_management_board' && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-900">
                    <strong>Project Management Boards</strong> won't appear on the Master Board and 
                    can be used for any workflow beyond proposals.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Configure Workflow Columns</h3>
                <p className="text-sm text-slate-600">
                  Define the stages for your {isProposalBoard ? 'proposal' : 'project'} workflow
                </p>
              </div>
              <Button onClick={handleAddColumn} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </Button>
            </div>

            {nonTerminalColumns.length === 0 && (
              <Card className="border-2 border-dashed border-slate-300">
                <CardContent className="p-8 text-center">
                  <p className="text-slate-600 mb-4">No columns yet. Add your first workflow stage!</p>
                  <Button onClick={handleAddColumn} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Column
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {nonTerminalColumns.map((column) => (
                <Card key={column.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <GripVertical className="w-5 h-5 text-slate-400 mt-2 flex-shrink-0" />
                      
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Column Name</Label>
                            <Input
                              value={column.label}
                              onChange={(e) => handleUpdateColumn(column.id, 'label', e.target.value)}
                              placeholder="e.g., In Review"
                            />
                          </div>
                          
                          {isProposalBoard && (
                            <div>
                              <Label className="text-xs">Maps to Master Board as</Label>
                              <Select
                                value={column.master_board_status_mapping}
                                onValueChange={(value) => handleUpdateColumn(column.id, 'master_board_status_mapping', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MASTER_BOARD_STATUSES.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                      <Badge className={status.color}>{status.label}</Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveColumn(column.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {isProposalBoard && columns.filter(c => c.is_terminal).length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Terminal Columns (Auto-added)</h4>
                <div className="grid grid-cols-4 gap-2">
                  {columns.filter(c => c.is_terminal).map((column) => (
                    <Badge key={column.id} className="justify-center py-2" variant="outline">
                      {column.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Organize into Folder (Optional)</Label>
              <FolderSelector
                organization={organization}
                value={selectedFolderId}
                onChange={setSelectedFolderId}
                filterType={boardCategory === 'proposal_board' ? 'proposal_boards' : 'project_boards'}
                placeholder="Select a folder or leave at root level"
                allowNone={true}
              />
              <p className="text-xs text-slate-500">
                Choose a folder to keep your boards organized, or leave at root level
              </p>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Summary</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Board Name:</strong> {boardName}</p>
                <p><strong>Category:</strong> {boardCategory === 'proposal_board' ? 'Proposal Board' : 'Project Management Board'}</p>
                <p><strong>Columns:</strong> {columns.filter(c => !c.is_terminal).length} custom stages + {columns.filter(c => c.is_terminal).length} terminal</p>
                <p><strong>Folder:</strong> {selectedFolderId ? folders.find(f => f.id === selectedFolderId)?.folder_name || 'Unknown' : 'Root level'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={step === 1 ? handleClose : step === 2 ? () => setStep(1) : () => setStep(2)}
          >
            {step === 1 ? (
              'Cancel'
            ) : (
              <>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </>
            )}
          </Button>

          {step < 3 ? (
            <Button onClick={step === 1 ? handleNext : () => setStep(3)} disabled={!canProceed}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleCreate}
              disabled={!canProceed || createBoardMutation.isPending}
            >
              {createBoardMutation.isPending ? 'Creating...' : 'Create Board'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
