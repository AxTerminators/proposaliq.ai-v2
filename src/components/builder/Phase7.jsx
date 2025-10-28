import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle, 
  Download, 
  FileText, 
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  Award
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Phase7({ proposalData, setProposalData, proposalId }) {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("docx");

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

  const completionStats = {
    totalSections: sections.length,
    completedSections: sections.filter(s => s.content && s.status !== 'draft').length,
    totalWords: sections.reduce((sum, s) => sum + (s.word_count || 0), 0),
    uploadedDocs: solicitationDocs.length
  };

  const completionPercentage = completionStats.totalSections > 0 
    ? Math.round((completionStats.completedSections / completionStats.totalSections) * 100)
    : 0;

  const readyToSubmit = completionPercentage >= 80 && 
                        proposalData.solicitation_number && 
                        proposalData.agency_name &&
                        proposalData.due_date;

  const exportProposal = async () => {
    if (!proposalId) {
      alert("No proposal to export");
      return;
    }

    setIsExporting(true);
    try {
      // Compile all sections
      let fullContent = `
# ${proposalData.proposal_name}

**Solicitation Number:** ${proposalData.solicitation_number || 'N/A'}
**Agency:** ${proposalData.agency_name || 'N/A'}
**Project Title:** ${proposalData.project_title || 'N/A'}
**Prime Contractor:** ${proposalData.prime_contractor_name || 'N/A'}
**Due Date:** ${proposalData.due_date ? new Date(proposalData.due_date).toLocaleDateString() : 'N/A'}

---

`;

      sections.forEach((section, idx) => {
        fullContent += `\n\n## ${section.section_name}\n\n`;
        fullContent += section.content || '[Content not yet generated]';
        fullContent += `\n\n---\n`;
      });

      // Create a blob and download
      const blob = new Blob([fullContent], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proposalData.proposal_name.replace(/\s+/g, '_')}_proposal.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      alert(`✓ Proposal exported as Markdown! You can convert it to ${exportFormat.toUpperCase()} using tools like Pandoc or Microsoft Word.`);

    } catch (error) {
      console.error("Error exporting:", error);
      alert("Error exporting proposal. Please try again.");
    }
    setIsExporting(false);
  };

  const submitProposal = async () => {
    if (!readyToSubmit) {
      alert("Please complete all required sections and information before submitting");
      return;
    }

    const confirmed = confirm(`Are you ready to mark this proposal as submitted?\n\nThis will change the status to "Submitted" and the proposal will be tracked in your dashboard.`);
    
    if (confirmed) {
      try {
        await base44.entities.Proposal.update(proposalId, {
          status: "submitted"
        });
        alert("✓ Proposal marked as submitted!");
        navigate(createPageUrl("Proposals"));
      } catch (error) {
        console.error("Error submitting:", error);
        alert("Error updating proposal status");
      }
    }
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          Phase 7: Finalize & Export
        </CardTitle>
        <CardDescription>
          Review your proposal and export for submission
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Completion Status */}
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-600 mb-1">Proposal Completion</p>
                <p className="text-4xl font-bold text-blue-600">{completionPercentage}%</p>
              </div>
              <div className="w-20 h-20 rounded-full border-8 border-blue-200 flex items-center justify-center">
                {completionPercentage >= 100 ? (
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                ) : (
                  <span className="text-2xl">{completionPercentage}%</span>
                )}
              </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{completionStats.completedSections}</p>
              <p className="text-xs text-slate-600">Sections Complete</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{completionStats.totalSections}</p>
              <p className="text-xs text-slate-600">Total Sections</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{completionStats.totalWords.toLocaleString()}</p>
              <p className="text-xs text-slate-600">Total Words</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 mx-auto text-amber-600 mb-2" />
              <p className="text-2xl font-bold text-slate-900">{completionStats.uploadedDocs}</p>
              <p className="text-xs text-slate-600">Documents</p>
            </CardContent>
          </Card>
        </div>

        {/* Readiness Check */}
        <Card className={readyToSubmit ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {readyToSubmit ? (
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-2 ${readyToSubmit ? 'text-green-900' : 'text-amber-900'}`}>
                  {readyToSubmit ? 'Ready to Submit!' : 'Not Ready Yet'}
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    {completionPercentage >= 80 ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className={completionPercentage >= 80 ? 'text-green-800' : 'text-amber-800'}>
                      {completionPercentage}% sections complete (need 80%+)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {proposalData.solicitation_number ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className={proposalData.solicitation_number ? 'text-green-800' : 'text-amber-800'}>
                      Solicitation number: {proposalData.solicitation_number || 'Missing'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {proposalData.due_date ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className={proposalData.due_date ? 'text-green-800' : 'text-amber-800'}>
                      Due date: {proposalData.due_date ? new Date(proposalData.due_date).toLocaleDateString() : 'Missing'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sections Review */}
        <div>
          <h3 className="font-semibold text-slate-900 mb-3">Section Summary</h3>
          <div className="space-y-2">
            {sections.length === 0 ? (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  No sections created yet. Go back to Phase 6 to create proposal sections.
                </AlertDescription>
              </Alert>
            ) : (
              sections.map((section, idx) => (
                <div key={section.id} className="p-3 border rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {section.content && section.status !== 'draft' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{section.section_name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {section.section_type?.replace(/_/g, ' ')}
                        </Badge>
                        {section.word_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {section.word_count} words
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge className={
                    section.status === 'approved' ? 'bg-green-100 text-green-700' :
                    section.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                    section.status === 'ai_generated' ? 'bg-purple-100 text-purple-700' :
                    'bg-slate-100 text-slate-700'
                  }>
                    {section.status?.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Export Section */}
        <Card className="border-indigo-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              Export Proposal
            </CardTitle>
            <CardDescription>
              Download your proposal for final review and submission
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Export Format</label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="docx">Microsoft Word (.docx)</SelectItem>
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                  <SelectItem value="markdown">Markdown (.md)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Currently exports as Markdown. Use Pandoc or Word to convert to DOCX/PDF.
              </p>
            </div>

            <Button 
              onClick={exportProposal}
              disabled={isExporting || sections.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export Proposal
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Submit Section */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Mark as Submitted
            </CardTitle>
            <CardDescription>
              Once you've submitted the proposal to the agency, update the status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={submitProposal}
              disabled={!readyToSubmit}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Mark as Submitted
            </Button>
            {!readyToSubmit && (
              <p className="text-xs text-amber-600 mt-2 text-center">
                Complete all requirements above to enable submission
              </p>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Proposals"))}
          >
            <Eye className="w-4 h-4 mr-2" />
            View All Proposals
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Dashboard"))}
          >
            Go to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}