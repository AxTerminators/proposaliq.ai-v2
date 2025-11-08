import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Eye, Settings, AlertCircle, Layers, Tag } from "lucide-react";
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
import { useOrganization } from "../components/layout/OrganizationContext";

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
  const { organization } = useOrganization();
  const [boardToDelete, setBoardToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categorizingProposal, setCategorizingProposal] = useState(null);

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
        custom_workflow_stage_id: null, // Reset to let it appear on the new board
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals-for-boards'] });
      setCategorizingProposal(null);
    },
  });

  const handleDeleteClick = (board) => {
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

  const getProposalCount = (board) => {
    if (board.is_master_board) {
      return proposals.length;
    }
    if (board.applies_to_proposal_types?.length > 0) {
      return proposals.filter(p =>
        board.applies_to_proposal_types.includes(p.proposal_type_category)
      ).length;
    }
    return 0;
  };

  const getLegacyProposals = (board) => {
    // Find proposals with no category that might be using this unnamed board
    if (board.board_name === 'Unnamed Board' || !board.board_name) {
      return proposals.filter(p => 
        !p.proposal_type_category && 
        p.custom_workflow_stage_id && 
        board.columns?.some(col => col.id === p.custom_workflow_stage_id)
      );
    }
    return [];
  };

  const isLegacyBoard = (board) => {
    return !board.is_master_board && 
           !board.board_type && 
           (board.board_name === 'Unnamed Board' || !board.board_name) &&
           board.columns?.length >= 10;
  };

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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Board Manager</h1>
          <p className="text-slate-600">Manage your Kanban board configurations</p>
        </div>

        <div className="grid gap-4">
          {boards.map((board) => {
            const proposalCount = getProposalCount(board);
            const hasProposals = proposalCount > 0;
            const isLegacy = isLegacyBoard(board);
            const legacyProposals = isLegacy ? getLegacyProposals(board) : [];

            return (
              <Card key={board.id} className={`border-2 ${isLegacy ? 'border-amber-300 bg-amber-50/30' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-slate-900">
                          {board.board_name || 'Unnamed Board'}
                        </h3>
                        {board.is_master_board && (
                          <Badge className="bg-yellow-500 text-white">⭐ Master</Badge>
                        )}
                        {board.board_type && (
                          <Badge className="bg-blue-100 text-blue-700">
                            {board.board_type.toUpperCase()}
                          </Badge>
                        )}
                        {isLegacy && (
                          <Badge className="bg-amber-500 text-white">Legacy Board</Badge>
                        )}
                      </div>

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
                        <div className="text-xs text-slate-400">
                          Created: {new Date(board.created_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-slate-400">
                          ID: {board.id}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteClick(board)}
                        disabled={deleteMutation.isPending || legacyProposals.length > 0}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Board
                      </Button>
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
                            Choose a type for each proposal to move them to the new board system:
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
                      <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
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
                        Deleting the board won't delete the proposals, but they may need to be reassigned to other boards.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {boards.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Layers className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No boards found</h3>
              <p className="text-slate-600">Create a board in the Pipeline view</p>
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
                    but will need to be reassigned to other boards or may not appear on any board until recategorized.
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
    </div>
  );
}