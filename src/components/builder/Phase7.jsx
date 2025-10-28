import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2,
  Download,
  Send,
  FileText,
  Eye,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function Phase7({ proposalData, proposalId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: sections } = useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: () => proposalId ? base44.entities.ProposalSection.filter({ proposal_id: proposalId }, 'order') : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: solicitationDocs } = useQuery({
    queryKey: ['solicitation-docs', proposalId],
    queryFn: () => proposalId ? base44.entities.SolicitationDocument.filter({ proposal_id: proposalId }) : [],
    initialData: [],
    enabled: !!proposalId
  });

  const updateProposalMutation = useMutation({
    mutationFn: (data) => base44.entities.Proposal.update(proposalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const totalWords = sections.reduce((sum, section) => sum + (section.word_count || 0), 0);
  const completedSections = sections.filter(s => s.status === 'approved' || s.status === 'reviewed').length;
  const completionPercentage = sections.length > 0 ? (completedSections / sections.length) * 100 : 0;

  const exportToDocx = async () => {
    setIsExporting(true);
    try {
      const sortedSections = [...sections].sort((a, b) => a.order - b.order);
      
      let docContent = `${proposalData.proposal_name}\n\n`;
      docContent += `Solicitation Number: ${proposalData.solicitation_number}\n`;
      docContent += `Agency: ${proposalData.agency_name}\n`;
      docContent += `Project: ${proposalData.project_title}\n`;
      docContent += `Due Date: ${proposalData.due_date}\n`;
      docContent += `\n${"=".repeat(80)}\n\n`;
      
      docContent += `TABLE OF CONTENTS\n`;
      docContent += `${"-".repeat(80)}\n`;
      sortedSections.forEach((section, idx) => {
        docContent += `${idx + 1}. ${section.section_name}\n`;
      });
      docContent += `\n${"=".repeat(80)}\n\n`;

      sortedSections.forEach((section, idx) => {
        docContent += `\n\n${idx + 1}. ${section.section_name.toUpperCase()}\n`;
        docContent += `${"-".repeat(section.section_name.length + 4)}\n\n`;
        
        const cleanContent = section.content
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
        
        docContent += cleanContent + "\n\n";
        docContent += `[Word Count: ${section.word_count || 0}]\n`;
      });

      docContent += `\n\n${"=".repeat(80)}\n`;
      docContent += `PROPOSAL SUMMARY\n`;
      docContent += `${"-".repeat(80)}\n`;
      docContent += `Total Sections: ${sections.length}\n`;
      docContent += `Total Word Count: ${totalWords.toLocaleString()}\n`;
      docContent += `Completion: ${completionPercentage.toFixed(0)}%\n`;
      docContent += `Generated: ${new Date().toLocaleString()}\n`;

      const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proposalData.proposal_name || 'proposal'}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting:", error);
      alert("Error exporting proposal. Please try again.");
    }
    setIsExporting(false);
  };

  const handleMarkAsSubmitted = async () => {
    if (!window.confirm("Mark this proposal as submitted? This will update the status.")) {
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProposalMutation.mutateAsync({
        status: "submitted"
      });

      const user = await base44.auth.me();
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `Proposal Submitted: ${proposalData.proposal_name}`,
        body: `Your proposal "${proposalData.proposal_name}" has been marked as submitted.\n\nSolicitation: ${proposalData.solicitation_number}\nAgency: ${proposalData.agency_name}\nSubmitted: ${new Date().toLocaleString()}\n\nTotal Sections: ${sections.length}\nTotal Words: ${totalWords.toLocaleString()}`
      });

      alert("Proposal marked as submitted! A confirmation email has been sent.");
      navigate(createPageUrl("Proposals"));
    } catch (error) {
      console.error("Error submitting:", error);
      alert("Error marking proposal as submitted.");
    }
    setIsSubmitting(false);
  };

  if (!proposalId) {
    return (
      <Card className="border-none shadow-xl">
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600">Please complete previous phases first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            Phase 7: Finalize & Export
          </CardTitle>
          <CardDescription>Review your proposal and prepare for submission</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{sections.length}</p>
                <p className="text-xs text-slate-500 mt-1">{completedSections} reviewed/approved</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Word Count</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">{totalWords.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">Across all sections</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{completionPercentage.toFixed(0)}%</p>
                <p className="text-xs text-slate-500 mt-1">Sections reviewed</p>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Completion Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={completionPercentage} className="h-3 mb-2" />
              <p className="text-sm text-slate-600">
                {completedSections} of {sections.length} sections reviewed or approved
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle>Proposal Sections Overview</CardTitle>
          <CardDescription>Review all sections before finalizing</CardDescription>
        </CardHeader>
        <CardContent>
          {sections.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>No sections found. Please complete Phase 6 first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sections.sort((a, b) => a.order - b.order).map((section, idx) => (
                <div key={section.id} className="p-4 border rounded-lg hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold text-slate-900">
                          {idx + 1}. {section.section_name}
                        </span>
                        <Badge variant={
                          section.status === 'approved' ? 'default' :
                          section.status === 'reviewed' ? 'secondary' :
                          'outline'
                        }>
                          {section.status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-slate-600">
                        <span>{section.word_count || 0} words</span>
                        <span>•</span>
                        <span className="capitalize">{section.section_type?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {section.status === 'approved' || section.status === 'reviewed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle>Attachments & Documents</CardTitle>
          <CardDescription>Documents included with this proposal</CardDescription>
        </CardHeader>
        <CardContent>
          {solicitationDocs.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No documents attached</p>
          ) : (
            <div className="space-y-2">
              {solicitationDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-sm text-slate-900">{doc.file_name}</p>
                      <p className="text-xs text-slate-500 capitalize">{doc.document_type?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  {doc.file_url && !doc.file_url.startsWith('proposal:') && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle>Final Review Notes</CardTitle>
          <CardDescription>Add any final comments or notes about this proposal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Enter any final notes, action items, or reminders..."
            rows={4}
          />
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle>Export & Submit</CardTitle>
          <CardDescription>Download your proposal or mark as submitted</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              onClick={exportToDocx}
              disabled={isExporting || sections.length === 0}
              className="h-auto py-4 flex-col items-start bg-white hover:bg-slate-50 text-slate-900 border-2"
              variant="outline"
            >
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-5 h-5" />
                <span className="font-semibold">Export Proposal</span>
              </div>
              <p className="text-xs text-slate-600 text-left">
                Download as formatted text document with table of contents
              </p>
            </Button>

            <Button
              onClick={handleMarkAsSubmitted}
              disabled={isSubmitting || sections.length === 0 || completionPercentage < 100}
              className="h-auto py-4 flex-col items-start bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-5 h-5" />
                <span className="font-semibold">Mark as Submitted</span>
              </div>
              <p className="text-xs text-white/90 text-left">
                Update status and send confirmation email
              </p>
            </Button>
          </div>

          {completionPercentage < 100 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 mb-1">Not all sections reviewed</p>
                  <p className="text-sm text-amber-800">
                    Complete review of all sections before marking as submitted. 
                    Go back to Phase 6 to review and approve sections.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 mb-1">Next Steps</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Review all sections for accuracy and completeness</li>
                  <li>• Export the proposal for final formatting</li>
                  <li>• Have team members review before submission</li>
                  <li>• Mark as submitted once ready for agency</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Proposals"))}
        >
          Back to Proposals
        </Button>
      </div>
    </div>
  );
}