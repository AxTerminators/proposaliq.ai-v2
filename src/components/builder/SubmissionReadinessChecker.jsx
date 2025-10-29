import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Users,
  Target,
  Shield,
  Sparkles,
  Download,
  Send,
  Zap,
  TrendingUp,
  Calendar,
  Loader2
} from "lucide-react";

export default function SubmissionReadinessChecker({ proposalData, proposalId }) {
  const [loading, setLoading] = useState(true);
  const [readinessData, setReadinessData] = useState(null);
  const [showFinalChecklist, setShowFinalChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (proposalId) {
      runReadinessCheck();
    }
  }, [proposalId]);

  const runReadinessCheck = async () => {
    setLoading(true);
    try {
      // Gather all data
      const sections = await base44.entities.ProposalSection.filter({ proposal_id: proposalId });
      const documents = await base44.entities.SolicitationDocument.filter({ proposal_id: proposalId });
      const complianceReqs = await base44.entities.ComplianceRequirement.filter({ proposal_id: proposalId });
      const tasks = await base44.entities.ProposalTask.filter({ proposal_id: proposalId });
      const comments = await base44.entities.ProposalComment.filter({ proposal_id: proposalId, is_resolved: false });

      // Run all checks
      const checks = {
        sections: checkSections(sections),
        documents: checkDocuments(documents),
        compliance: checkCompliance(complianceReqs),
        quality: checkQuality(sections),
        metadata: checkMetadata(proposalData),
        collaboration: checkCollaboration(tasks, comments),
        timeline: checkTimeline(proposalData)
      };

      // Calculate overall score
      const scores = Object.values(checks).map(c => c.score);
      const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

      // Determine readiness level
      let readinessLevel = 'not_ready';
      let readinessMessage = 'Significant work required before submission';
      let readinessColor = 'text-red-600 bg-red-50';

      if (overallScore >= 95) {
        readinessLevel = 'ready';
        readinessMessage = 'Excellent! Ready for submission';
        readinessColor = 'text-green-600 bg-green-50';
      } else if (overallScore >= 85) {
        readinessLevel = 'nearly_ready';
        readinessMessage = 'Nearly ready - minor items to address';
        readinessColor = 'text-blue-600 bg-blue-50';
      } else if (overallScore >= 70) {
        readinessLevel = 'needs_work';
        readinessMessage = 'Good progress - some work remaining';
        readinessColor = 'text-amber-600 bg-amber-50';
      }

      // Collect all issues
      const allIssues = [];
      Object.entries(checks).forEach(([category, data]) => {
        data.issues.forEach(issue => {
          allIssues.push({ ...issue, category });
        });
      });

      // Sort by severity
      const sortedIssues = allIssues.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      setReadinessData({
        overallScore,
        readinessLevel,
        readinessMessage,
        readinessColor,
        checks,
        issues: sortedIssues,
        criticalIssues: sortedIssues.filter(i => i.severity === 'critical').length,
        highIssues: sortedIssues.filter(i => i.severity === 'high').length,
        mediumIssues: sortedIssues.filter(i => i.severity === 'medium').length,
        lowIssues: sortedIssues.filter(i => i.severity === 'low').length
      });

    } catch (error) {
      console.error("Error running readiness check:", error);
    }
    setLoading(false);
  };

  const checkSections = (sections) => {
    const issues = [];
    let score = 100;

    if (sections.length === 0) {
      issues.push({
        title: "No sections created",
        description: "No proposal sections have been created yet",
        severity: "critical",
        action: "Go to Phase 6 and create content"
      });
      return { score: 0, issues };
    }

    // Check for empty sections
    const emptySections = sections.filter(s => !s.content || s.content.length < 100);
    if (emptySections.length > 0) {
      score -= emptySections.length * 15;
      issues.push({
        title: `${emptySections.length} section(s) incomplete`,
        description: emptySections.map(s => s.section_name).join(', '),
        severity: emptySections.length > 3 ? "critical" : "high",
        action: "Complete all proposal sections"
      });
    }

    // Check for draft status
    const draftSections = sections.filter(s => s.status === 'draft');
    if (draftSections.length > 0) {
      score -= draftSections.length * 5;
      issues.push({
        title: `${draftSections.length} section(s) still in draft`,
        description: "Sections should be reviewed and approved",
        severity: "medium",
        action: "Review and mark sections as approved"
      });
    }

    // Check word counts
    const totalWords = sections.reduce((sum, s) => sum + (s.word_count || 0), 0);
    if (totalWords < 5000) {
      score -= 20;
      issues.push({
        title: "Low word count",
        description: `Only ${totalWords} words. Most proposals need more detail.`,
        severity: "high",
        action: "Expand sections with more detail and examples"
      });
    }

    return { score: Math.max(0, score), issues };
  };

  const checkDocuments = (documents) => {
    const issues = [];
    let score = 100;

    if (documents.length === 0) {
      score = 50;
      issues.push({
        title: "No documents uploaded",
        description: "Consider uploading supporting documents",
        severity: "medium",
        action: "Upload RFP, SOW, or reference materials"
      });
    }

    const rfpDocs = documents.filter(d => ['rfp', 'rfq', 'sow', 'pws'].includes(d.document_type));
    if (rfpDocs.length === 0) {
      score -= 25;
      issues.push({
        title: "No solicitation documents",
        description: "Missing RFP/RFQ/SOW documents",
        severity: "high",
        action: "Upload the solicitation documents"
      });
    }

    return { score: Math.max(0, score), issues };
  };

  const checkCompliance = (requirements) => {
    const issues = [];
    let score = 100;

    if (requirements.length === 0) {
      score = 80;
      issues.push({
        title: "No compliance requirements tracked",
        description: "Consider creating a compliance matrix",
        severity: "low",
        action: "Add compliance requirements in Phase 4"
      });
      return { score, issues };
    }

    const nonCompliant = requirements.filter(r => 
      ['non_compliant', 'not_started', 'needs_review'].includes(r.compliance_status)
    );

    if (nonCompliant.length > 0) {
      const mandatoryNonCompliant = nonCompliant.filter(r => r.requirement_category === 'mandatory');
      
      if (mandatoryNonCompliant.length > 0) {
        score -= mandatoryNonCompliant.length * 20;
        issues.push({
          title: `${mandatoryNonCompliant.length} mandatory requirement(s) not met`,
          description: "Critical compliance issues detected",
          severity: "critical",
          action: "Address all mandatory requirements immediately"
        });
      }

      if (nonCompliant.length > mandatoryNonCompliant.length) {
        score -= (nonCompliant.length - mandatoryNonCompliant.length) * 5;
        issues.push({
          title: `${nonCompliant.length - mandatoryNonCompliant.length} other requirement(s) pending`,
          description: "Some compliance items need attention",
          severity: "medium",
          action: "Review and address remaining requirements"
        });
      }
    }

    return { score: Math.max(0, score), issues };
  };

  const checkQuality = (sections) => {
    const issues = [];
    let score = 100;

    sections.forEach(section => {
      if (!section.content) return;

      const text = section.content.replace(/<[^>]*>/g, ' ');
      
      // Check for placeholder text
      const placeholders = ['TODO', 'TBD', 'PLACEHOLDER', '[INSERT', 'XXX', 'FIXME'];
      const hasPlaceholders = placeholders.some(p => text.toUpperCase().includes(p));
      if (hasPlaceholders) {
        score -= 10;
        issues.push({
          title: `Placeholder text in ${section.section_name}`,
          description: "Remove TODO/TBD/placeholder text",
          severity: "high",
          action: `Complete ${section.section_name} section`
        });
      }

      // Check for repeated words (common AI mistake)
      const words = text.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        if (words[i] === words[i + 1] && words[i].length > 3) {
          score -= 5;
          issues.push({
            title: `Repeated words in ${section.section_name}`,
            description: `Found repeated word: "${words[i]}"`,
            severity: "low",
            action: "Review and fix repeated text"
          });
          break;
        }
      }

      // Check for very short sentences (might be incomplete)
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const shortSentences = sentences.filter(s => s.trim().split(/\s+/).length < 3);
      if (shortSentences.length > 2) {
        score -= 5;
        issues.push({
          title: `Incomplete sentences in ${section.section_name}`,
          description: "Some sentences appear too short or incomplete",
          severity: "medium",
          action: "Review for incomplete sentences"
        });
      }
    });

    return { score: Math.max(0, score), issues };
  };

  const checkMetadata = (proposal) => {
    const issues = [];
    let score = 100;

    const requiredFields = [
      { field: 'proposal_name', label: 'Proposal Name' },
      { field: 'solicitation_number', label: 'Solicitation Number' },
      { field: 'agency_name', label: 'Agency Name' },
      { field: 'project_title', label: 'Project Title' },
      { field: 'due_date', label: 'Due Date' },
      { field: 'prime_contractor_name', label: 'Prime Contractor' }
    ];

    requiredFields.forEach(({ field, label }) => {
      if (!proposal[field]) {
        score -= 15;
        issues.push({
          title: `Missing ${label}`,
          description: `Required field "${label}" is not filled`,
          severity: "high",
          action: `Add ${label} in Phase 3`
        });
      }
    });

    return { score: Math.max(0, score), issues };
  };

  const checkCollaboration = (tasks, comments) => {
    const issues = [];
    let score = 100;

    const incompleteTasks = tasks.filter(t => t.status !== 'completed');
    if (incompleteTasks.length > 0) {
      score -= Math.min(incompleteTasks.length * 5, 30);
      issues.push({
        title: `${incompleteTasks.length} task(s) incomplete`,
        description: "Outstanding tasks assigned to team members",
        severity: incompleteTasks.length > 5 ? "high" : "medium",
        action: "Complete or reassign pending tasks"
      });
    }

    if (comments.length > 0) {
      score -= Math.min(comments.length * 3, 20);
      issues.push({
        title: `${comments.length} unresolved comment(s)`,
        description: "Team comments need to be addressed",
        severity: comments.length > 5 ? "medium" : "low",
        action: "Review and resolve all comments"
      });
    }

    return { score: Math.max(0, score), issues };
  };

  const checkTimeline = (proposal) => {
    const issues = [];
    let score = 100;

    if (!proposal.due_date) {
      score -= 20;
      issues.push({
        title: "No due date set",
        description: "Due date is required for timeline management",
        severity: "high",
        action: "Set the proposal due date"
      });
      return { score, issues };
    }

    const dueDate = new Date(proposal.due_date);
    const now = new Date();
    const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      score = 0;
      issues.push({
        title: "Deadline has passed",
        description: `Due date was ${Math.abs(daysUntilDue)} days ago`,
        severity: "critical",
        action: "Update due date or submit immediately"
      });
    } else if (daysUntilDue === 0) {
      issues.push({
        title: "Due TODAY",
        description: "Proposal must be submitted today",
        severity: "critical",
        action: "Submit as soon as possible"
      });
    } else if (daysUntilDue <= 2) {
      score -= 10;
      issues.push({
        title: `Only ${daysUntilDue} day(s) remaining`,
        description: "Very little time before deadline",
        severity: "high",
        action: "Prioritize completion and final review"
      });
    } else if (daysUntilDue <= 7) {
      issues.push({
        title: `${daysUntilDue} days until deadline`,
        description: "Week or less until submission",
        severity: "medium",
        action: "Ensure all work is on track"
      });
    }

    return { score: Math.max(0, score), issues };
  };

  const getSeverityBadge = (severity) => {
    const config = {
      critical: { color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
      high: { color: 'bg-orange-100 text-orange-700 border-orange-300', icon: AlertCircle },
      medium: { color: 'bg-amber-100 text-amber-700 border-amber-300', icon: AlertCircle },
      low: { color: 'bg-blue-100 text-blue-700 border-blue-300', icon: AlertCircle }
    };
    const { color, icon: Icon } = config[severity];
    return (
      <Badge className={`${color} border`}>
        <Icon className="w-3 h-3 mr-1" />
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const handleFinalSubmission = async () => {
    // Check all items are checked
    const allChecked = Object.values(checklistItems).every(v => v === true);
    if (!allChecked) {
      alert("Please review and check all items before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      // Update proposal status
      await base44.entities.Proposal.update(proposalId, {
        status: 'submitted'
      });

      // Log activity
      const user = await base44.auth.me();
      await base44.entities.ActivityLog.create({
        proposal_id: proposalId,
        user_email: user.email,
        user_name: user.full_name || user.email,
        action_type: "proposal_exported",
        action_description: `Marked proposal as submitted with ${readinessData.overallScore}% readiness score`
      });

      alert("🎉 Proposal marked as submitted! Good luck!");
      setShowFinalChecklist(false);
      
      // Refresh data
      await runReadinessCheck();
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Error updating proposal status");
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="border-none shadow-xl">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  if (!readinessData) {
    return (
      <Card className="border-none shadow-xl">
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600">Unable to load readiness data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Readiness Score */}
      <Card className={`border-none shadow-xl ${readinessData.readinessColor}`}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="w-7 h-7" />
              Submission Readiness
            </span>
            <Button variant="outline" size="sm" onClick={runReadinessCheck}>
              <Sparkles className="w-4 h-4 mr-2" />
              Re-check
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-6xl font-bold mb-2">{readinessData.overallScore}%</p>
              <p className="text-xl font-semibold">{readinessData.readinessMessage}</p>
            </div>
            <div className="w-32 h-32 rounded-full border-8 flex items-center justify-center"
                 style={{ 
                   borderColor: readinessData.overallScore >= 95 ? '#10b981' :
                               readinessData.overallScore >= 85 ? '#3b82f6' :
                               readinessData.overallScore >= 70 ? '#f59e0b' : '#ef4444'
                 }}>
              {readinessData.overallScore >= 95 ? (
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              ) : readinessData.overallScore >= 85 ? (
                <TrendingUp className="w-16 h-16 text-blue-600" />
              ) : readinessData.overallScore >= 70 ? (
                <Clock className="w-16 h-16 text-amber-600" />
              ) : (
                <XCircle className="w-16 h-16 text-red-600" />
              )}
            </div>
          </div>

          <Progress value={readinessData.overallScore} className="h-4 mb-6" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg border-2 border-red-200">
              <p className="text-3xl font-bold text-red-600">{readinessData.criticalIssues}</p>
              <p className="text-xs text-slate-600 mt-1">Critical Issues</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-orange-200">
              <p className="text-3xl font-bold text-orange-600">{readinessData.highIssues}</p>
              <p className="text-xs text-slate-600 mt-1">High Priority</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-amber-200">
              <p className="text-3xl font-bold text-amber-600">{readinessData.mediumIssues}</p>
              <p className="text-xs text-slate-600 mt-1">Medium Priority</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg border-2 border-blue-200">
              <p className="text-3xl font-bold text-blue-600">{readinessData.lowIssues}</p>
              <p className="text-xs text-slate-600 mt-1">Low Priority</p>
            </div>
          </div>

          {readinessData.overallScore >= 95 && (
            <Button 
              onClick={() => setShowFinalChecklist(true)}
              size="lg"
              className="w-full mt-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-lg py-6"
            >
              <Send className="w-6 h-6 mr-2" />
              Proceed to Final Submission Checklist
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Detailed Checks */}
      <Tabs defaultValue="issues" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="issues">
            Issues ({readinessData.issues.length})
          </TabsTrigger>
          <TabsTrigger value="categories">
            By Category
          </TabsTrigger>
          <TabsTrigger value="scores">
            Score Breakdown
          </TabsTrigger>
        </TabsList>

        {/* Issues Tab */}
        <TabsContent value="issues">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>All Issues & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {readinessData.issues.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-semibold text-green-700">Perfect! No issues found.</p>
                  <p className="text-slate-600 mt-2">Your proposal is ready for submission.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {readinessData.issues.map((issue, idx) => (
                    <Alert key={idx} className={`${
                      issue.severity === 'critical' ? 'bg-red-50 border-red-200' :
                      issue.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                      issue.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getSeverityBadge(issue.severity)}
                            <Badge variant="outline" className="capitalize">{issue.category}</Badge>
                          </div>
                          <h4 className="font-semibold text-slate-900 mb-1">{issue.title}</h4>
                          <p className="text-sm text-slate-700 mb-2">{issue.description}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-blue-600" />
                            <span className="text-blue-700 font-medium">{issue.action}</span>
                          </div>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(readinessData.checks).map(([category, data]) => (
              <Card key={category} className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="capitalize flex items-center gap-2">
                      {category === 'sections' && <FileText className="w-5 h-5" />}
                      {category === 'documents' && <Download className="w-5 h-5" />}
                      {category === 'compliance' && <Shield className="w-5 h-5" />}
                      {category === 'quality' && <Sparkles className="w-5 h-5" />}
                      {category === 'metadata' && <Target className="w-5 h-5" />}
                      {category === 'collaboration' && <Users className="w-5 h-5" />}
                      {category === 'timeline' && <Calendar className="w-5 h-5" />}
                      {category.replace(/_/g, ' ')}
                    </CardTitle>
                    <Badge className={`text-lg ${
                      data.score >= 90 ? 'bg-green-100 text-green-700' :
                      data.score >= 75 ? 'bg-blue-100 text-blue-700' :
                      data.score >= 60 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {data.score}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={data.score} className="h-3 mb-4" />
                  {data.issues.length === 0 ? (
                    <div className="text-center py-6 text-green-600">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                      <p className="font-semibold">All checks passed!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.issues.map((issue, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border">
                          <div className="flex items-start gap-2 mb-1">
                            {getSeverityBadge(issue.severity)}
                            <p className="font-semibold text-sm flex-1">{issue.title}</p>
                          </div>
                          <p className="text-xs text-slate-600">{issue.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Scores Tab */}
        <TabsContent value="scores">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(readinessData.checks)
                  .sort((a, b) => b[1].score - a[1].score)
                  .map(([category, data]) => (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold capitalize">{category.replace(/_/g, ' ')}</span>
                        <span className="text-2xl font-bold">{data.score}%</span>
                      </div>
                      <Progress value={data.score} className="h-4" />
                      <p className="text-xs text-slate-600 mt-1">
                        {data.issues.length} issue(s) detected
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Final Checklist Dialog */}
      <Dialog open={showFinalChecklist} onOpenChange={setShowFinalChecklist}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Send className="w-6 h-6 text-green-600" />
              Final Submission Checklist
            </DialogTitle>
            <DialogDescription>
              Review and confirm all items before final submission
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>Congratulations!</strong> Your proposal has achieved {readinessData.overallScore}% readiness.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Content & Quality
                </h3>
                {[
                  'All sections are complete with substantive content',
                  'Spelling and grammar have been reviewed',
                  'No placeholder text (TODO, TBD, etc.) remains',
                  'Technical accuracy verified',
                  'All citations and references are correct'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Checkbox
                      checked={checklistItems[`content_${idx}`] || false}
                      onCheckedChange={(checked) => 
                        setChecklistItems(prev => ({ ...prev, [`content_${idx}`]: checked }))
                      }
                    />
                    <label className="text-sm flex-1 cursor-pointer">
                      {item}
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Compliance & Requirements
                </h3>
                {[
                  'All mandatory requirements addressed',
                  'Compliance matrix completed and accurate',
                  'Page limits and formatting requirements met',
                  'Required certifications included',
                  'Submission format follows RFP specifications'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Checkbox
                      checked={checklistItems[`compliance_${idx}`] || false}
                      onCheckedChange={(checked) => 
                        setChecklistItems(prev => ({ ...prev, [`compliance_${idx}`]: checked }))
                      }
                    />
                    <label className="text-sm flex-1 cursor-pointer">
                      {item}
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team & Approvals
                </h3>
                {[
                  'All team members have reviewed their sections',
                  'Required approvals obtained',
                  'All comments resolved',
                  'Final review by proposal manager completed',
                  'Executive sign-off received (if required)'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Checkbox
                      checked={checklistItems[`team_${idx}`] || false}
                      onCheckedChange={(checked) => 
                        setChecklistItems(prev => ({ ...prev, [`team_${idx}`]: checked }))
                      }
                    />
                    <label className="text-sm flex-1 cursor-pointer">
                      {item}
                    </label>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Submission Package
                </h3>
                {[
                  'Final export generated and reviewed',
                  'File size within submission limits',
                  'All required attachments included',
                  'Submission portal/method confirmed',
                  'Backup copies saved'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Checkbox
                      checked={checklistItems[`submission_${idx}`] || false}
                      onCheckedChange={(checked) => 
                        setChecklistItems(prev => ({ ...prev, [`submission_${idx}`]: checked }))
                      }
                    />
                    <label className="text-sm flex-1 cursor-pointer">
                      {item}
                    </label>
                  </div>
                ))}
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-sm text-amber-900">
                  <strong>Important:</strong> Once marked as submitted, this proposal will move to "Submitted" status. 
                  This is for tracking purposes only - you still need to submit through the official portal.
                </AlertDescription>
              </Alert>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinalChecklist(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleFinalSubmission}
              disabled={isSubmitting || Object.values(checklistItems).filter(v => v).length < 20}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Submitted
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}