
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileText,
  Send,
  Loader2,
  Award,
  Shield
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
import ExportDialog from "../export/ExportDialog";
import SubmissionReadinessChecker from "./SubmissionReadinessChecker";
import RedTeamReview from "./RedTeamReview";
import ComplianceMatrixGenerator from "./ComplianceMatrixGenerator";
import WinLossAnalyzer from "../analytics/WinLossAnalyzer";

export default function Phase7({ proposal, user, organization, teamMembers, onMarkAsSubmitted, onSaveAndGoToPipeline }) {
  const [currentTab, setCurrentTab] = useState("submission");
  const [readinessScore, setReadinessScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (proposal?.id) {
      checkReadiness();
    }
  }, [proposal?.id]);

  const checkReadiness = async () => {
    setLoading(true);
    try {
      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposal.id
      });

      const requirements = await base44.entities.ComplianceRequirement.filter({
        proposal_id: proposal.id,
        organization_id: organization.id
      });

      const score = {
        sections_complete: sections.filter(s => s.status === 'approved').length,
        sections_total: sections.length,
        compliance_met: requirements.filter(r => r.compliance_status === 'compliant').length,
        compliance_total: requirements.length,
        overall: 0
      };

      score.overall = Math.round(
        ((score.sections_complete / (score.sections_total || 1)) * 0.6 +
        (score.compliance_met / (score.compliance_total || 1)) * 0.4) * 100
      );

      setReadinessScore(score);
    } catch (error) {
      console.error("Error checking readiness:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProposal = async () => {
    setIsSubmitting(true);
    try {
      // Call the parent's markAsSubmitted function to set status to "submitted"
      if (onMarkAsSubmitted) {
        await onMarkAsSubmitted();
      }
      
      // Optionally log activity
      await base44.entities.ActivityLog.create({
        proposal_id: proposal.id,
        user_email: user.email,
        user_name: user.full_name,
        action_type: "proposal_exported",
        action_description: `${user.full_name} marked proposal as submitted`
      });

      setShowSubmitDialog(false);
      alert("Proposal successfully marked as submitted! Status updated on Kanban board.");
    } catch (error) {
      console.error("Error marking proposal as submitted:", error);
      alert("Error marking proposal as submitted. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadyToSubmit = readinessScore?.overall >= 80;

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-blue-600" />
              Phase 7: Finalize & Submit
            </CardTitle>
            <CardDescription>
              Final checks, compliance review, submission, and post-proposal analysis
            </CardDescription>
          </div>
          
          {/* Explicit Submit Button */}
          {proposal.status !== "submitted" && (
            <Button
              onClick={() => setShowSubmitDialog(true)}
              disabled={!isReadyToSubmit || loading}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Mark as Submitted
            </Button>
          )}

          {proposal.status === "submitted" && (
            <Badge className="bg-green-100 text-green-700 text-base px-4 py-2">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Submitted
            </Badge>
          )}
        </div>

        {/* Readiness Score Display */}
        {readinessScore && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Submission Readiness</span>
              <span className={`text-2xl font-bold ${
                readinessScore.overall >= 80 ? 'text-green-600' :
                readinessScore.overall >= 60 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {readinessScore.overall}%
              </span>
            </div>
            <Progress 
              value={readinessScore.overall} 
              className={`h-2 ${
                readinessScore.overall >= 80 ? '[&>div]:bg-green-600' :
                readinessScore.overall >= 60 ? '[&>div]:bg-yellow-600' :
                '[&>div]:bg-red-600'
              }`}
            />
            {readinessScore.overall < 80 && (
              <p className="text-xs text-slate-600 mt-2">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Complete at least 80% to mark as submitted
              </p>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="submission">Submission Readiness</TabsTrigger>
            <TabsTrigger value="compliance">Compliance Matrix</TabsTrigger>
            <TabsTrigger value="export">Export Proposal</TabsTrigger>
            <TabsTrigger value="review">Final Review</TabsTrigger>
            <TabsTrigger value="winloss">Win/Loss Analysis</TabsTrigger>
          </TabsList>

          {/* Submission Readiness */}
          <TabsContent value="submission">
            <SubmissionReadinessChecker proposal={proposal} organization={organization} />
          </TabsContent>

          {/* Compliance Matrix */}
          <TabsContent value="compliance">
            <ComplianceMatrixGenerator proposal={proposal} organization={organization} />
          </TabsContent>

          {/* Export */}
          <TabsContent value="export">
            <div className="space-y-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-blue-600" />
                    Export Options
                  </CardTitle>
                  <CardDescription>
                    Export your proposal in various formats
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExportDialog proposal={proposal} organization={organization} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Final Review */}
          <TabsContent value="review">
            <RedTeamReview proposal={proposal} organization={organization} />
          </TabsContent>

          {/* Win/Loss Analysis */}
          <TabsContent value="winloss">
            <WinLossAnalyzer proposal={proposal} organization={organization} />
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Add button at bottom */}
      {onSaveAndGoToPipeline && (
        <div className="px-6 pb-6">
          <div className="flex justify-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={onSaveAndGoToPipeline}
              className="bg-white hover:bg-slate-50"
            >
              Save and Go to Pipeline
            </Button>
          </div>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              Mark Proposal as Submitted?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-4">
              <p className="text-slate-700">
                This will mark <strong>{proposal.proposal_name}</strong> as officially submitted and move it to the "Submitted" column on your Kanban board.
              </p>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">
                  ℹ️ This action indicates that the proposal has been finalized and delivered to the client/agency. You can still access and reference it, but it signals completion of the proposal development process.
                </p>
              </div>

              {readinessScore && (
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-700">
                    <strong>Current Readiness:</strong> {readinessScore.overall}%
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {readinessScore.sections_complete}/{readinessScore.sections_total} sections complete • {readinessScore.compliance_met}/{readinessScore.compliance_total} compliance items met
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitProposal}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Marking as Submitted...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Yes, Mark as Submitted
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
