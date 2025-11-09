
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Eye,
  Settings,
  Layers,
  AlertCircle,
  CheckCircle,
  Folder as FolderIcon,
  FolderOpen,
  Move
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOrganization } from "../components/layout/OrganizationContext";
import CustomBoardCreationWizard from "../components/proposals/CustomBoardCreationWizard";
import FolderSelector from "../components/folders/FolderSelector";
import { cn } from "@/lib/utils";

const PROPOSAL_TYPES = [
  { value: 'RFP', label: 'RFP - Request for Proposal', emoji: '📄' },
  { value: 'RFI', label: 'RFI - Request for Information', emoji: '📝' },
  { value: 'SBIR', label: 'SBIR - Small Business Innovation Research', emoji: '💡' },
  { value: 'GSA', label: 'GSA Schedule', emoji: '🏛️' },
  { value: 'IDIQ', label: 'IDIQ - Indefinite Delivery/Indefinite Quantity', emoji: '📑' },
  { value: 'STATE_LOCAL', label: 'State/Local Government', emoji: '🏙️' },
  { value: 'OTHER', label: 'Other', emoji: '📊' },
];

export default function BoardManager() {
  const queryClient = useQueryClient();
  const { organization, user } = useOrganization();
  
  // ALL STATE HOOKS FIRST
  const [boardToDelete, setBoardToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categorizingProposal, setCategorizingProposal] = useState(null);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [movingBoard, setMovingBoard] = useState(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  // ALL DATA FETCHING HOOKS
  const { data: boards = [], isLoading } = useQuery({
    queryKey: ['all-boards', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id,
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals-for-boards', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id,
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['folders', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Folder.filter(
        { organization_id: organization.id },
        'order'
      );
    },
    enabled: !!organization?.id,
  });

  // ALL MUTATION HOOKS
  const deleteMutation = useMutation({
    mutationFn: async (boardId) => {
      return base44.entities.KanbanConfig.delete(boardId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-boards'] });
      setShowDeleteConfirm(false);
      setBoardToDelete(null);
    },
  });

  const categorizeMutation = useMutation({
    mutationFn: async ({ proposalId, category }) => {
      return base44.entities.Proposal.update(proposalId, {
        proposal_type_category: category,
        custom_workflow_stage_id: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals-for-boards'] });
      setCategorizingProposal(null);
    },
  });

  const moveBoardMutation = useMutation({
    mutationFn: async ({ boardId, folderId }) => {
      return base44.entities.KanbanConfig.update(boardId, {
        folder_id: folderId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-boards'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setShowMoveDialog(false);
      setMovingBoard(null);
    },
  });

  // COMPUTED VALUES - MUST BE AFTER ALL HOOKS, BEFORE ANY EARLY RETURNS
  const proposalBoards = useMemo(() => {
    return boards.filter(b => 
      b.board_category === 'proposal_board' || 
      b.is_master_board || 
      b.is_template_board ||
      (!b.board_category && b.board_type)
    );
  }, [boards]);

  const projectBoards = useMemo(() => {
    return boards.filter(b => 
      b.board_category === 'project_management_board'
    );
  }, [boards]);

  const boardsByFolder = useMemo(() => {
    const grouped = {
      unorganized: [],
      byFolder: {}
    };

    proposalBoards.forEach(board => {
      if (!board.folder_id) {
        grouped.unorganized.push(board);
      } else {
        if (!grouped.byFolder[board.folder_id]) {
          grouped.byFolder[board.folder_id] = [];
        }
        grouped.byFolder[board.folder_id].push(board);
      }
    });

    return grouped;
  }, [proposalBoards, folders]);

  // HELPER FUNCTIONS
  const canDeleteBoard = () => {
    if (user?.role === 'admin') return true;
    
    const orgAccess = user?.client_accesses?.find(
      access => access.organization_id === organization?.id
    );
    
    return orgAccess?.role === 'organization_owner' || orgAccess?.role === 'manager';
  };

  const getProposalCount = (board) => {
    if (board.is_master_board) {
      return proposals.length;
    }

    if (board.board_category === 'project_management_board') {
      return 0;
    }

    if (board.applies_to_proposal_types && board.applies_to_proposal_types.length > 0) {
      return proposals.filter(p =>
        board.applies_to_proposal_types.includes(p.proposal_type_category)
      ).length;
    }

    return proposals.filter(p => p.custom_workflow_stage_id).length;
  };

  const getLegacyProposals = (board) => {
    return proposals.filter(p => 
      !p.proposal_type_category && 
      p.custom_workflow_stage_id &&
      board.columns?.some(col => col.id === p.custom_workflow_stage_id)
    );
  };

  const isLegacyBoard = (board) => {
    if (board.board_category) return false;
    if (board.is_master_board === true || board.is_master_board === false) return false;
    if (board.board_type && board.board_name) return false;
    return !board.board_type && !board.board_name;
  };

  // EVENT HANDLERS
  const handleDeleteClick = (board) => {
    if (!canDeleteBoard()) {
      alert("Only admins and managers can delete boards.");
      return;
    }

    setBoardToDelete(board);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (boardToDelete) {
      await deleteMutation.mutateAsync(boardToDelete.id);
    }
  };

  const handleCategorizeProposal = async (proposalId, category) => {
    await categorizeMutation.mutateAsync({ proposalId, category });
  };

  const handleBoardCreated = (newBoard) => {
    alert(`✅ Board "${newBoard.board_name}" created successfully!`);
  };

  const handleMoveBoard = (board) => {
    setMovingBoard(board);
    setShowMoveDialog(true);
  };

  const handleConfirmMove = async (folderId) => {
    if (!movingBoard) return;
    await moveBoardMutation.mutateAsync({
      boardId: movingBoard.id,
      folderId: folderId
    });
  };

  const renderBoardCard = (board) => {
    const proposalCount = getProposalCount(board);
    const hasProposals = proposalCount > 0;
    const isLegacy = isLegacyBoard(board);
    const legacyProposals = isLegacy ? getLegacyProposals(board) : [];
    const canDelete = canDeleteBoard() && board.is_deletable !== false;
    const currentFolder = board.folder_id ? folders.find(f => f.id === board.folder_id) : null;

    return (
      <Card key={board.id} className={cn(
        "border-2",
        isLegacy && 'border-amber-300 bg-amber-50/30'
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h3 className="text-xl font-bold text-slate-900">
                  {board.board_name || 'Unnamed Board'}
                </h3>
                {board.is_master_board && (
                  <Badge className="bg-yellow-500 text-white">⭐ Master</Badge>
                )}
                {board.is_template_board && (
                  <Badge className="bg-blue-500 text-white">📋 Template</Badge>
                )}
                {board.board_category === 'proposal_board' && !board.is_master_board && (
                  <Badge className="bg-purple-100 text-purple-700">Proposal Board</Badge>
                )}
                {board.board_type && (
                  <Badge className="bg-blue-100 text-blue-700">
                    {board.board_type.toUpperCase()}
                  </Badge>
                )}
                {isLegacy && (
                  <Badge className="bg-amber-500 text-white">Legacy Board</Badge>
                )}
                {board.is_deletable === false && (
                  <Badge className="bg-slate-500 text-white">Protected</Badge>
                )}
              </div>

              {currentFolder && (
                <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
                  <FolderIcon className="w-4 h-4" />
                  <span>In folder: <strong>{currentFolder.folder_name}</strong></span>
                </div>
              )}

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>{board.columns?.length || 0} columns</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span>{proposalCount} proposal{proposalCount !== 1 ? 's' : ''}</span>
                </div>
                {board.applies_to_proposal_types?.length > 0 && (
                  <div>
                    <span className="font-medium">Shows: </span>
                    {board.applies_to_proposal_types.join(', ')}
                  </div>
                )}
                {board.created_by && (
                  <div className="text-xs text-slate-500">
                    Created by: {board.created_by}
                  </div>
                )}
                <div className="text-xs text-slate-400">
                  Created: {new Date(board.created_date).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMoveBoard(board)}
              >
                <Move className="w-4 h-4 mr-2" />
                Move to Folder
              </Button>
              
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteClick(board)}
                  disabled={deleteMutation.isPending || legacyProposals.length > 0 || board.is_deletable === false}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Board
                </Button>
              )}
              {!canDelete && board.is_deletable !== false && (
                <Badge variant="outline" className="text-xs">
                  Admin/Manager Only
                </Badge>
              )}
            </div>
          </div>

          {isLegacy && legacyProposals.length > 0 && (
            <div className="mt-4 p-4 bg-white border-2 border-amber-300 rounded-lg">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    Legacy Proposals Found
                  </p>
                  <p className="text-xs text-amber-800">
                    These proposals need to be categorized before you can delete this board.
                  </p>
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {legacyProposals.map((proposal) => (
                  <div key={proposal.id} className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 mb-1">{proposal.proposal_name}</p>
                      <p className="text-xs text-slate-600">
                        Currently in: <span className="font-medium">{proposal.custom_workflow_stage_id}</span>
                      </p>
                    </div>
                    <div className="flex-shrink-0 w-48">
                      <Select
                        onValueChange={(value) => handleCategorizeProposal(proposal.id, value)}
                        disabled={categorizeMutation.isPending}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPOSAL_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <span>{type.emoji}</span>
                                <span>{type.value}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLegacy && legacyProposals.length === 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                ✅ This legacy board is empty and safe to delete!
              </div>
            </div>
          )}

          {hasProposals && !isLegacy && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <strong>Warning:</strong> This board has {proposalCount} proposal{proposalCount !== 1 ? 's' : ''}. 
                Deleting the board won't delete the proposals.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // NOW EARLY RETURN CAN HAPPEN - ALL HOOKS DECLARED ABOVE
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Board Manager</h1>
              <p className="text-slate-600">Manage your Kanban board configurations</p>
            </div>
            <Button
              onClick={() => setShowCreateWizard(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Custom Board
            </Button>
          </div>
        </div>

        {proposalBoards.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">Proposal Boards</h2>
              <Badge variant="secondary">{proposalBoards.length}</Badge>
            </div>
            
            {folders
              .filter(f => !f.parent_folder_id)
              .map(folder => {
                const folderBoards = boardsByFolder.byFolder[folder.id] || [];
                if (folderBoards.length === 0) return null;

                return (
                  <div key={folder.id} className="mb-8 pl-4 border-l-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-4">
                      <FolderOpen className="w-5 h-5 text-blue-600" />
                      <h3 className="text-xl font-bold text-slate-900">{folder.folder_name}</h3>
                      <Badge variant="secondary">{folderBoards.length} boards</Badge>
                    </div>
                    <div className="grid gap-4">
                      {folderBoards.map(board => renderBoardCard(board))}
                    </div>
                  </div>
                );
              })}

            {boardsByFolder.unorganized.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-5 h-5 text-slate-600" />
                  <h3 className="text-xl font-bold text-slate-900">Unorganized Boards</h3>
                  <Badge variant="outline">{boardsByFolder.unorganized.length}</Badge>
                </div>
                <div className="grid gap-4">
                  {boardsByFolder.unorganized.map(board => renderBoardCard(board))}
                </div>
              </div>
            )}
          </div>
        )}

        {projectBoards.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <FolderIcon className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-bold text-slate-900">Project Management Boards</h2>
              <Badge variant="secondary">{projectBoards.length}</Badge>
            </div>
            
            <div className="grid gap-4">
              {projectBoards.map((board) => {
                const canDelete = canDeleteBoard() && board.is_deletable !== false;

                return (
                  <Card key={board.id} className="border-2">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <h3 className="text-xl font-bold text-slate-900">
                              {board.board_name || 'Unnamed Board'}
                            </h3>
                            <Badge className="bg-purple-100 text-purple-700">Project Management</Badge>
                            {board.board_type === 'custom' && (
                              <Badge variant="outline">Custom</Badge>
                            )}
                          </div>

                          <div className="space-y-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4" />
                              <span>{board.columns?.length || 0} columns</span>
                            </div>
                            {board.created_by && (
                              <div className="text-xs text-slate-500">
                                Created by: {board.created_by}
                              </div>
                            )}
                            <div className="text-xs text-slate-400">
                              Created: {new Date(board.created_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {canDelete && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(board)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Board
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {boards.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Layers className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No boards found</h3>
              <p className="text-slate-600 mb-4">Create your first custom board to get started</p>
              <Button
                onClick={() => setShowCreateWizard(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Board
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board "{boardToDelete?.board_name}"?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will permanently delete this board configuration.</p>
              {boardToDelete && getProposalCount(boardToDelete) > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-900 font-medium">
                    ⚠️ This board has {getProposalCount(boardToDelete)} proposal(s). The proposals will not be deleted, 
                    but will need to be reassigned to other boards.
                  </p>
                </div>
              )}
              <p className="font-semibold">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Board'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Board to Folder</DialogTitle>
            <DialogDescription>
              Move "{movingBoard?.board_name}" to a folder
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label className="mb-2 block">Select Folder</Label>
            <FolderSelector
              organization={organization}
              value={movingBoard?.folder_id || ''}
              onChange={(folderId) => handleConfirmMove(folderId)}
              allowNone={true}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CustomBoardCreationWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        organization={organization}
        onBoardCreated={handleBoardCreated}
      />
    </div>
  );
}
