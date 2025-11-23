import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Trash2, Play, Database, Activity } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function StatusMigrationManager() {
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: organization } = useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const orgs = await base44.entities.Organization.filter({ created_by: user.email }, '-created_date', 1);
      return orgs[0];
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
    }
  });

  const deleteBoardMutation = useMutation({
    mutationFn: (boardId) => base44.entities.KanbanConfig.delete(boardId),
    onSuccess: () => {
      toast.success('Old board deleted!');
      queryClient.invalidateQueries(['boards']);
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
            <Badge className="bg-amber-100 text-amber-700">→ Phase 5</Badge>
            <span className="text-sm font-semibold">Final activation and cleanup</span>
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
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will update all existing proposals from old status values (evaluating, draft, etc.) to new values (Qualifying, Drafting, etc.)
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => migrateMutation.mutate()}
            disabled={migrateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {migrateMutation.isPending ? 'Migrating...' : 'Run Migration'}
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
        </CardContent>
      </Card>

      {/* Step 2: Run Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Step 2: Verify Migration
          </CardTitle>
          <CardDescription>Test that all proposals have valid new statuses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runTests}
            variant="outline"
            className="border-purple-300"
          >
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

      {/* Step 3: Delete Old Board */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Step 3: Delete Old Master Board
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