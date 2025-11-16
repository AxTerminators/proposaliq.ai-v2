import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Settings,
  Trash2,
  Star,
  Layers,
  Eye,
  AlertCircle,
  CheckCircle2,
  Sparkles
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
import { cn } from "@/lib/utils";
import QuickBoardCreation from "@/components/proposals/QuickBoardCreation";
import BoardConfigDialog from "@/components/proposals/BoardConfigDialog";
import { useOrganization } from "@/components/layout/OrganizationContext";

const BOARD_TYPE_ICONS = {
  'master': '⭐',
  'rfp': '📋',
  'rfi': '📝',
  'sbir': '🔬',
  'gsa': '🏛️',
  'idiq': '📑',
  'state_local': '🏢',
  'rfp_15_column': '🎯',
  'template_workspace': '📂',
  'custom_proposal': '🎨',
  'custom_project': '🛠️',
  'custom': '📊'
};

export default function BoardManagement() {
  const queryClient = useQueryClient();
  const { organization } = useOrganization();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch all boards for organization
  const { data: boards = [], isLoading, refetch } = useQuery({
    queryKey: ['all-kanban-boards', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.KanbanConfig.filter(
        { organization_id: organization.id },
        'board_type'
      );
    },
    enabled: !!organization?.id,
  });

  // Fetch proposals to count per board
  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.Proposal.filter(
        { organization_id: organization.id },
        '-created_date'
      );
    },
    enabled: !!organization?.id,
  });

  // Delete board mutation
  const deleteBoardMutation = useMutation({
    mutationFn: async (boardId) => {
      return base44.entities.KanbanConfig.delete(boardId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['all-kanban-boards'] });
      setShowDeleteDialog(false);
      setDeletingBoard(null);
      alert('✅ Board deleted successfully!');
    },
    onError: (error) => {
      alert(`Error deleting board: ${error.message}`);
    }
  });

  const handleDeleteBoard = (board) => {
    setDeletingBoard(board);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deletingBoard) {
      deleteBoardMutation.mutate(deletingBoard.id);
    }
  };

  const handleEditBoard = (board) => {
    setEditingBoard(board);
    setShowConfigDialog(true);
  };

  const getProposalCount = (board) => {
    if (board.is_master_board) {
      return proposals.length;
    }

    if (board.board_type === 'rfp_15_column') {
      return proposals.filter(p => p.proposal_type_category === 'RFP_15_COLUMN').length;
    }

    if (board.applies_to_proposal_types && board.applies_to_proposal_types.length > 0) {
      return proposals.filter(p => 
        board.applies_to_proposal_types.includes(p.proposal_type_category)
      ).length;
    }

    return 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Loading boards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Board Management</h1>
            <p className="text-slate-600">
              Manage your Kanban boards and workflows
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create New Board
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Boards</p>
                  <p className="text-3xl font-bold text-slate-900">{boards.length}</p>
                </div>
                <Layers className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Active Proposals</p>
                  <p className="text-3xl font-bold text-slate-900">{proposals.length}</p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Workflow Types</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {new Set(boards.map(b => b.board_type)).size}
                  </p>
                </div>
                <Sparkles className="w-10 h-10 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Boards List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Your Boards</h2>
          
          {boards.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-300">
              <CardContent className="p-12 text-center">
                <Layers className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Boards Yet</h3>
                <p className="text-slate-600 mb-6">
                  Create your first board to start organizing proposals
                </p>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Board
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map(board => {
                const proposalCount = getProposalCount(board);
                const icon = BOARD_TYPE_ICONS[board.board_type] || '📊';
                const columnCount = board.columns?.length || 0;

                return (
                  <Card 
                    key={board.id}
                    className={cn(
                      "border-2 transition-all hover:shadow-xl",
                      board.is_master_board && "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{icon}</div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {board.board_name}
                              {board.is_master_board && (
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              )}
                            </CardTitle>
                            <Badge variant="outline" className="mt-1 text-xs capitalize">
                              {board.board_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-600 mb-1">Proposals</p>
                          <p className="text-xl font-bold text-slate-900">{proposalCount}</p>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs text-slate-600 mb-1">Columns</p>
                          <p className="text-xl font-bold text-slate-900">{columnCount}</p>
                        </div>
                      </div>

                      {/* Properties */}
                      <div className="flex flex-wrap gap-2">
                        {board.is_master_board && (
                          <Badge className="bg-amber-100 text-amber-700 text-xs">
                            Master Board
                          </Badge>
                        )}
                        {board.applies_to_proposal_types && board.applies_to_proposal_types.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {board.applies_to_proposal_types.join(', ')}
                          </Badge>
                        )}
                        {board.swimlane_config?.enabled && (
                          <Badge className="bg-purple-100 text-purple-700 text-xs">
                            Swimlanes
                          </Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditBoard(board)}
                          className="flex-1"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                        {!board.is_master_board && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteBoard(board)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Board Dialog */}
      <QuickBoardCreation
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        organization={organization}
        onBoardCreated={async (newBoard) => {
          await refetch();
          alert(`✅ Board "${newBoard.board_name}" created successfully!`);
          setShowCreateDialog(false);
        }}
      />

      {/* Config Dialog */}
      {showConfigDialog && editingBoard && (
        <BoardConfigDialog
          isOpen={showConfigDialog}
          onClose={() => {
            setShowConfigDialog(false);
            setEditingBoard(null);
          }}
          boardConfig={editingBoard}
          organization={organization}
          onSave={async () => {
            await refetch();
            alert('✅ Board configuration saved!');
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Delete Board?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to delete <strong>"{deletingBoard?.board_name}"</strong>?
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-amber-900 text-sm">
                  ⚠️ <strong>Note:</strong> Proposals on this board will NOT be deleted. 
                  They will still appear on your Master Board.
                </p>
              </div>
              
              <p className="text-sm">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBoardMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteBoardMutation.isPending}
            >
              {deleteBoardMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Yes, Delete Board
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}