
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // New import
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, // Existing, but used differently
  AlertCircle,  // Existing, but used differently
  FileText,     // Existing, but used differently
  Download,     // Existing, but used differently
  Send,         // Existing, but used differently
  Loader2,      // Existing, but used differently
  Eye,          // Existing, but used differently
  MessageCircle, // New import
  Award,        // Existing, but used differently
  Target,       // New import
  Clock         // New import
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert"; // Re-added alert components, as they are used in the new structure
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // New import
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton"; // New import
import ExportDialog from "../export/ExportDialog";
import VersionComparison from "./VersionComparison"; // New import
import SubmissionReadinessChecker from "./SubmissionReadinessChecker"; // Component imported, but used differently (as a tab content)
import RedTeamReview from "./RedTeamReview"; // New import
import moment from "moment"; // New import

export default function Phase7({ proposal, user, organization, teamMembers }) {
  const queryClient = useQueryClient();
  const [showExport, setShowExport] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedVersion, setSelectedVersion] = useState(null); // This state variable is not used in the provided outline but is part of the new state section, keep for now.

  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['proposal-sections', proposal.id],
    queryFn: async () => {
      return base44.entities.ProposalSection.filter({ proposal_id: proposal.id });
    },
    initialData: [],
    enabled: !!proposal.id,
  });

  const { data: sectionHistory } = useQuery({
    queryKey: ['section-history', proposal.id],
    queryFn: async () => {
      const allHistory = await base44.entities.ProposalSectionHistory.list();
      // Filter history specific to sections within this proposal
      const proposalSectionIds = sections.map(s => s.id);
      return allHistory.filter(h => proposalSectionIds.includes(h.section_id));
    },
    enabled: sections.length > 0 && !!proposal.id,
    initialData: [],
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', proposal.id],
    queryFn: async () => {
      return base44.entities.ReviewRound.filter(
        { proposal_id: proposal.id },
        '-created_date'
      );
    },
    initialData: [],
    enabled: !!proposal.id,
  });

  const { data: tasks } = useQuery({
    queryKey: ['proposal-tasks', proposal.id],
    queryFn: async () => {
      return base44.entities.ProposalTask.filter({ proposal_id: proposal.id });
    },
    initialData: [],
    enabled: !!proposal.id,
  });

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData) => {
      return await base44.entities.ReviewRound.create({
        ...reviewData,
        proposal_id: proposal.id,
        reviewer_email: user.email,
        reviewer_name: user.full_name,
        status: "in_progress"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setReviewNotes("");
    },
  });

  const updateProposalMutation = useMutation({
    mutationFn: async (updates) => {
      return await base44.entities.Proposal.update(proposal.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', proposal.id] }); // Invalidate specific proposal too
      queryClient.invalidateQueries({ queryKey: ['proposals'] }); // Invalidate general proposals list
    },
  });

  const handleStartReview = (reviewType) => {
    createReviewMutation.mutate({
      review_type: reviewType,
      notes: reviewNotes // This notes field seems to be for RedTeamReview component, not directly used here for initial review start
    });
  };

  const handleMarkAsSubmitted = async () => {
    await updateProposalMutation.mutateAsync({
      status: "submitted",
      submission_date: new Date().toISOString()
    });
  };

  const getCompletionScore = () => {
    if (sectionsLoading) return 0;
    const filledSections = sections.filter(s => s.content && s.content.trim().length > 0).length;
    const totalSections = sections.length;
    return totalSections > 0 ? Math.round((filledSections / totalSections) * 100) : 0;
  };

  const getQualityScore = () => {
    if (sectionsLoading) return 0;
    // Basic quality scoring based on section length and completeness
    const scores = sections.map(s => {
      if (!s.content || s.content.trim().length === 0) return 0;
      const wordCount = s.content.split(/\s+/).length;
      if (wordCount < 100) return 50;
      if (wordCount < 500) return 75;
      return 100;
    });
    const avgScore = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
    return Math.round(avgScore);
  };

  const getReadinessStatus = () => {
    const completion = getCompletionScore();
    const quality = getQualityScore();
    const pendingTasks = tasks.filter(t => t.status === "pending").length;
    const hasRedTeamReview = reviews.some(r => r.review_type === "red_team" && r.status === "completed");


    if (completion === 100 && quality >= 80 && pendingTasks === 0 && hasRedTeamReview && proposal.pricing_status === "final") {
      return { status: "ready", label: "Ready to Submit", color: "text-green-600" };
    } else if (completion >= 80 && quality >= 60 && pendingTasks < 3) { // Slightly more lenient for 'almost'
      return { status: "almost", label: "Almost Ready", color: "text-amber-600" }; // Changed from yellow to amber for tailwind consistency
    } else {
      return { status: "not-ready", label: "Not Ready", color: "text-red-600" };
    }
  };

  const completionScore = getCompletionScore();
  const qualityScore = getQualityScore();
  const readinessStatus = getReadinessStatus();
  const pendingTasksCount = tasks.filter(t => t.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Submission Readiness Overview */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-slate-50 to-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Submission Readiness</CardTitle>
              <CardDescription className="mt-2">
                Review your proposal and prepare for submission
              </CardDescription>
            </div>
            <div className={`text-right ${readinessStatus.color}`}>
              <div className="text-3xl font-bold">{completionScore}%</div>
              <div className="text-sm font-semibold">{readinessStatus.label}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Completion</span>
                <span className="font-semibold">{completionScore}%</span>
              </div>
              <Progress value={completionScore} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Quality</span>
                <span className="font-semibold">{qualityScore}%</span>
              </div>
              <Progress value={qualityScore} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Open Tasks</span>
                <span className="font-semibold">{pendingTasksCount}</span>
              </div>
              <Progress
                value={tasks.length > 0 ? ((tasks.length - pendingTasksCount) / tasks.length) * 100 : 100}
                className="h-2"
              />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={() => setShowExport(true)}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Proposal
            </Button>
            <Button
              onClick={handleMarkAsSubmitted}
              disabled={readinessStatus.status !== "ready" || updateProposalMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updateProposalMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Mark as Submitted
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="readiness" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="readiness">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Readiness
          </TabsTrigger>
          <TabsTrigger value="versions">
            <Clock className="w-4 h-4 mr-2" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <MessageCircle className="w-4 h-4 mr-2" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="final">
            <Award className="w-4 h-4 mr-2" />
            Final Check
          </TabsTrigger>
        </TabsList>

        <TabsContent value="readiness" className="space-y-6">
          <SubmissionReadinessChecker
            proposal={proposal}
            sections={sections}
            tasks={tasks}
            completionScore={completionScore}
            qualityScore={qualityScore}
          />
        </TabsContent>

        <TabsContent value="versions" className="space-y-6">
          <VersionComparison
            proposal={proposal}
            sections={sections}
            sectionHistory={sectionHistory}
          />
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <RedTeamReview
            proposal={proposal}
            reviews={reviews}
            onStartReview={handleStartReview}
            teamMembers={teamMembers}
          />
        </TabsContent>

        <TabsContent value="final" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Final Submission Checklist</CardTitle>
              <CardDescription>
                Complete these items before submitting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: "All sections are complete", checked: completionScore === 100 },
                  { label: "Quality score of 80% or higher", checked: qualityScore >= 80 },
                  { label: "All tasks completed", checked: pendingTasksCount === 0 },
                  { label: "Red team review conducted and completed", checked: reviews.some(r => r.review_type === "red_team" && r.status === "completed") },
                  { label: "Compliance check passed (Manual confirmation)", checked: true }, // Placeholder for manual check
                  { label: "Pricing finalized", checked: proposal.pricing_status === "final" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      item.checked ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {item.checked ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    )}
                    <span className={item.checked ? 'text-green-900' : 'text-slate-700'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {readinessStatus.status === "ready" && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">
                        Your proposal is ready for submission!
                      </h4>
                      <p className="text-sm text-green-700">
                        All checklist items are complete. You can now export and submit your proposal.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      {showExport && (
        <ExportDialog
          open={showExport} // Pass open prop
          onOpenChange={setShowExport} // Pass onOpenChange prop to control visibility
          proposal={proposal}
          sections={sections}
          onExportComplete={() => {
            alert("✓ Export completed successfully!");
            setShowExport(false); // Close dialog after export
          }}
        />
      )}
    </div>
  );
}
