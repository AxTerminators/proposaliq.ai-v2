import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, AlertCircle, TrendingUp, Zap } from "lucide-react";

export default function KanbanTestingGuide() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Kanban Workflow - Testing Guide
          </h1>
          <p className="text-slate-600">
            Comprehensive testing checklist for the new 15-column Kanban workflow system
          </p>
        </div>

        {/* Phase 5.2: Comprehensive Testing */}
        <Card className="mb-6 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              Phase 5.2: Basic Functionality Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Board Initialization</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Navigate to Pipeline - should see upgrade prompt if using old config</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Click "Run Automatic Migration" - should complete successfully</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Verify all 15 columns appear correctly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Verify existing proposals mapped to correct columns</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Checklist Interactions</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Click proposal card - modal opens with checklists</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Click "Enter Basic Information" - BasicInfoModal opens</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Fill form and save - checklist item marks complete</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Click "Start Content Development" - navigates to ContentDevelopment page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Manual check items can be toggled on/off</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">All 8 Modals Test</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span><strong>BasicInfoModal:</strong> Opens, saves data, closes properly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span><strong>TeamFormationModal:</strong> Prime selection works, data persists</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span><strong>ResourceGatheringModal:</strong> Can link resources</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span><strong>SolicitationUploadModal:</strong> File upload works, AI extraction triggers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span><strong>EvaluationModal:</strong> Evaluation form works, Go/No-Go decision saved</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span><strong>WinStrategyModal:</strong> Win themes can be generated and saved</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span><strong>ContentPlanningModal:</strong> Section selection works</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span><strong>PricingReviewModal:</strong> Pricing review interface functional</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Navigation Actions</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>From "Draft" column - navigate to ContentDevelopment page works</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>From "Review" column - navigate to FinalReview page works</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>From "Price" column - navigate to pricing builder works</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Can return to Kanban from each page</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Drag & Drop</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Can drag proposal from "Initiate" to "Team"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Proposal updates to correct phase and status</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Checklist resets for new column</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Manual order persists within column</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Approval Gate</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Dragging from "Final" column triggers approval dialog</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Non-admin users see permission error</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Admin can approve with reason</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Approval recorded on proposal</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Persistence Tests */}
        <Card className="mb-6 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Data Persistence Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Modal Data Persistence</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Enter data in BasicInfoModal, close, reopen - data still there</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Select prime contractor, close modal - selection saved to proposal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Upload file in SolicitationUploadModal - file URL saved</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Checklist Status Persistence</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Complete checklist item, refresh page - still marked complete</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Move to new column, move back - checklist status preserved</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Checklist completion tracked per column in proposal.current_stage_checklist_status</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Phase & Status Updates</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Move to "Resources" - proposal.current_phase updates to "phase2"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Move to "Draft" - proposal.status updates to "draft"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Move to "Price" - proposal.status updates to "in_progress"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Move to "Submitted" - proposal.status updates to "submitted"</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Tests */}
        <Card className="mb-6 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Integration Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Legacy ProposalBuilder Integration</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Can still access ProposalBuilder directly via URL</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Proposals created in Kanban visible in ProposalBuilder</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Changes in ProposalBuilder reflect in Kanban</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">ContentDevelopment Integration</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Navigate to ContentDevelopment from "Draft" column works</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Can create sections, write content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Return to Pipeline - proposal still in correct column</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Automation Rules</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Create automation rule "on column move to Review, create task"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Move proposal to "Review" - task auto-created</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Verify rule execution logged</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edge Cases */}
        <Card className="mb-6 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Edge Case Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Data Edge Cases</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Proposals in custom columns (not in mapping) - remain in place</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Legacy proposals without current_stage_checklist_status - don't crash</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Empty organization - setup wizard appears</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Concurrent Access</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Two users editing same proposal - changes don't conflict</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>One user moves proposal while another has modal open - graceful handling</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Network Failures</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Modal save fails - error message shown, data not lost</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Drag operation fails - card returns to original position</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Migration fails partway - rollback or clear error state</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Migration Verification */}
        <Card className="mb-6 border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              Phase 5.3: Migration Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Pre-Migration Backup</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Export all proposals before migration (Admin Portal → Reports)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Document current KanbanConfig structure</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Migration Execution</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Run migration on test organization first</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Review migration log - check proposals_migrated count matches total</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Check for errors in migration_log.proposals_with_errors</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Verify column_mappings_applied shows expected mappings</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Post-Migration Validation</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>All proposals appear on board</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Proposals in correct columns based on mapping</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Checklist completion status preserved</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>No data loss - compare proposal counts before/after</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" />
                    <span>Custom fields on proposals intact</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Testing Best Practices</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Test on a staging/test organization before production</li>
                  <li>• Use different user roles to test RBAC restrictions</li>
                  <li>• Test on different browsers (Chrome, Firefox, Safari)</li>
                  <li>• Test on mobile devices for responsive design</li>
                  <li>• Document any bugs found with screenshots and steps to reproduce</li>
                  <li>• After all tests pass, mark system as ready for rollout</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}