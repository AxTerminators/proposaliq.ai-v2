import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Trash2, Play, Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingState from "@/components/ui/LoadingState";

export default function StatusMigrationManager() {
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState(null);

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: organization, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organization', user?.email],
    queryFn: async () => {
      if (!user) return null;

      // Try active_client_id first
      let orgId = user.active_client_id;

      // Fallback to client_accesses
      if (!orgId && user.client_accesses?.length > 0) {
        orgId = user.client_accesses[0].organization_id;
      }

      // Fallback to created_by filter
      if (!orgId) {
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          orgId = orgs[0].id;
        }
      }

      if (orgId) {
        const orgs = await base44.entities.Organization.filter({ id: orgId });
        if (orgs.length > 0) {
          return orgs[0];
        }
      }

      return null;
    },
    enabled: !!user
  });

  const { data: proposals = [] } = useQuery({
    queryKey: ['proposals', organization?.id],
    queryFn: () => base44.entities.Proposal.filter({ organization_id: organization.id }),
    enabled: !!organization
  });

  const { data: boards = [] } = useQuery({
    queryKey: ['boards', organization?.id],
    queryFn: () => base44.entities.KanbanConfig.filter({ organization_id: organization.id }),
    enabled: !!organization
  });

  const migrateMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('migrateProposalStatuses', {});
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('Migration completed!');
      queryClient.invalidateQueries(['proposals']);
    },
    onError: (error) => {
      toast.error('Migration failed: ' + error.message);
    }
  });

  const deleteBoardMutation = useMutation({
    mutationFn: (boardId) => base44.entities.KanbanConfig.delete(boardId),
    onSuccess: () => {
      toast.success('Old board deleted!');
      queryClient.invalidateQueries(['boards']);
    },
    onError: (error) => {
      toast.error('Delete failed: ' + error.message);
    }
  });

  const activateNewBoardMutation = useMutation({
    mutationFn: async () => {
      // Find the new master board - check multiple conditions
      let newBoard = boards.find(b => 
        b.board_name === 'All Proposals - New Master Board'
      );

      // If not found by name, look for any board with new status mappings
      if (!newBoard) {
        newBoard = boards.find(b => 
          b.columns?.some(col => col.status_mapping?.includes('Qualifying'))
        );
      }

      // If still not found, create it
      if (!newBoard) {
        const response = await base44.functions.invoke('createMasterBoardConfig', {
          organization_id: organization.id
        });
        
        if (!response.data.success) {
          throw new Error('Failed to create new master board');
        }

        // Refetch boards to get the newly created one
        await queryClient.invalidateQueries(['boards']);
        const freshBoards = await base44.entities.KanbanConfig.filter({ organization_id: organization.id });
        newBoard = freshBoards.find(b => 
          b.board_name === 'All Proposals - New Master Board' ||
          b.columns?.some(col => col.status_mapping?.includes('Qualifying'))
        );

        if (!newBoard) {
          throw new Error('Failed to retrieve newly created master board');
        }
      }

      // Find old master boards
      const oldBoards = boards.filter(b => 
        b.is_master_board && 
        b.id !== newBoard.id &&
        !b.columns?.some(col => col.status_mapping?.includes('Qualifying'))
      );

      // Deactivate old master boards
      await Promise.all(
        oldBoards.map(board => 
          base44.entities.KanbanConfig.update(board.id, { is_master_board: false })
        )
      );

      // Activate new master board
      await base44.entities.KanbanConfig.update(newBoard.id, { 
        is_master_board: true,
        board_name: 'All Proposals'
      });

      return { newBoard, deactivatedCount: oldBoards.length };
    },
    onSuccess: (data) => {
      toast.success(`New master board activated! Deactivated ${data.deactivatedCount} old board(s).`);
      queryClient.invalidateQueries(['boards']);
    },
    onError: (error) => {
      toast.error('Activation failed: ' + error.message);
    }
  });

  const runTests = () => {
    const validStatuses = ['Qualifying', 'Planning', 'Drafting', 'Reviewing', 'Submitted', 'Won', 'Lost', 'Archived'];
    const invalidProposals = proposals.filter(p => !validStatuses.includes(p.status));
    
    const statusBreakdown = proposals.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    const masterBoards = boards.filter(b => b.is_master_board);
    const newMasterBoard = masterBoards.find(b => 
      b.columns?.some(col => col.status_mapping?.includes('Qualifying'))
    );

    setTestResults({
      totalProposals: proposals.length,
      invalidProposals: invalidProposals.length,
      invalidList: invalidProposals,
      statusBreakdown,
      totalBoards: boards.length,
      masterBoards: masterBoards.length,
      hasNewMasterBoard: !!newMasterBoard,
      newMasterBoardId: newMasterBoard?.id,
      allPassed: invalidProposals.length === 0 && !!newMasterBoard
    });
  };

  const oldMasterBoards = boards.filter(b => 
    b.is_master_board && !b.columns?.some(col => col.status_mapping?.includes('Qualifying'))
  );

  if (isLoadingUser || isLoadingOrg) {
    return <LoadingState message="Loading migration manager..." />;
  }

  if (!organization) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-amber-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Organization Found</h2>
            <p className="text-slate-600">Please set up your organization first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Status Migration Manager</h1>
        <p className="text-slate-600">Manage the migration from old to new proposal statuses</p>
      </div>

      {/* Phase Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Phases</CardTitle>
          <CardDescription>Track progress through the 5-phase migration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="bg-green-100 text-green-700">✓ Phase 1</Badge>
            <span className="text-sm">Data migration script created</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-100 text-green-700">✓ Phase 2</Badge>
            <span className="text-sm">New master board configuration created</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-100 text-green-700">✓ Phase 3</Badge>
            <span className="text-sm">Proposal entity schema updated</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-green-100 text-green-700">✓ Phase 4</Badge>
            <span className="text-sm">UI and backend logic updated</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-blue-100 text-blue-700">→ Phase 5</Badge>
            <span className="text-sm font-semibold">Final activation and cleanup (in progress)</span>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Run Migration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-blue-600" />
            Step 1: Execute Data Migration
          </CardTitle>
          <CardDescription>Update all proposal statuses to new values</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              This will update all existing proposals from old status values (evaluating, draft, etc.) to new values (Qualifying, Drafting, etc.)
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => migrateMutation.mutate()}
            disabled={migrateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {migrateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Migration
              </>
            )}
          </Button>
          {migrateMutation.isSuccess && migrateMutation.data && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-green-900">✅ Migration Complete!</p>
              <div className="text-sm space-y-1">
                <p>Total Proposals: {migrateMutation.data.summary?.total_proposals}</p>
                <p>Updated: {migrateMutation.data.summary?.updated_count}</p>
                <p>Skipped: {migrateMutation.data.summary?.skipped_count}</p>
              </div>
            </div>
          )}
          {migrateMutation.isError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                Migration failed: {migrateMutation.error?.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Activate New Board */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Step 2: Activate New Master Board
          </CardTitle>
          <CardDescription>Switch to the new master board with updated statuses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show current boards for debugging */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="font-medium text-sm mb-2">Current Boards ({boards.length}):</p>
            <div className="space-y-2 text-xs">
              {boards.map(b => (
                <div key={b.id} className="flex items-center justify-between">
                  <span>{b.board_name}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">{b.board_type}</Badge>
                    {b.is_master_board && <Badge className="bg-blue-100 text-blue-700">Master</Badge>}
                    {b.columns?.some(col => col.status_mapping?.includes('Qualifying')) && 
                      <Badge className="bg-green-100 text-green-700">New Status</Badge>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              This will activate the board with new statuses and deactivate the old master board
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => activateNewBoardMutation.mutate()}
            disabled={activateNewBoardMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {activateNewBoardMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activating...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Activate New Board
              </>
            )}
          </Button>
          {activateNewBoardMutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-semibold text-green-900">✅ New Master Board Activated!</p>
              <p className="text-sm text-green-700 mt-1">
                The new board is now your primary master board.
              </p>
            </div>
          )}
          {activateNewBoardMutation.isError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                {activateNewBoardMutation.error?.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Run Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Step 3: Verify Migration
          </CardTitle>
          <CardDescription>Test that all proposals have valid new statuses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runTests}
            variant="outline"
            className="border-purple-300"
          >
            <Activity className="w-4 h-4 mr-2" />
            Run Verification Tests
          </Button>

          {testResults && (
            <div className={`border-2 rounded-lg p-4 ${testResults.allPassed ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className="flex items-center gap-2 mb-3">
                {testResults.allPassed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
                <span className="font-semibold text-lg">
                  {testResults.allPassed ? 'All Tests Passed ✓' : 'Tests Failed ✗'}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Status Breakdown:</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(testResults.statusBreakdown).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between bg-white px-3 py-2 rounded">
                        <span>{status}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-medium">Boards Status:</p>
                  <p>Total Boards: {testResults.totalBoards}</p>
                  <p>Master Boards: {testResults.masterBoards}</p>
                  <p>New Master Board: {testResults.hasNewMasterBoard ? '✓ Found' : '✗ Not Found'}</p>
                </div>

                {testResults.invalidProposals > 0 && (
                  <div className="bg-red-100 p-3 rounded">
                    <p className="font-medium text-red-900">⚠️ Invalid Proposals Found: {testResults.invalidProposals}</p>
                    <p className="text-xs mt-1">These proposals have old status values and need migration.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 4: Delete Old Board */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Step 4: Delete Old Master Board
          </CardTitle>
          <CardDescription>Remove the old master board configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {oldMasterBoards.length > 0 ? (
            <div className="space-y-3">
              {oldMasterBoards.map(board => (
                <div key={board.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-lg">
                  <div>
                    <p className="font-medium">{board.board_name}</p>
                    <p className="text-sm text-slate-600">
                      Columns: {board.columns?.length || 0} | Created: {new Date(board.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Delete board "${board.board_name}"? This cannot be undone.`)) {
                        deleteBoardMutation.mutate(board.id);
                      }
                    }}
                    disabled={deleteBoardMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-900">✅ No old master boards found - cleanup complete!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Final Status */}
      {testResults?.allPassed && oldMasterBoards.length === 0 && (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardContent className="p-6 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-900 mb-2">Migration Complete! 🎉</h2>
            <p className="text-green-700">
              All proposals have been migrated to the new status system and the old board has been removed.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}