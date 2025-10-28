import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Download, 
  FileText, 
  Send,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Award
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Phase7({ proposalData, setProposalData, proposalId }) {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [coverPage, setCoverPage] = useState({
    preparedFor: proposalData.agency_name || "",
    preparedBy: proposalData.prime_contractor_name || "",
    submissionDate: proposalData.due_date || "",
    contactName: "",
    contactEmail: ""
  });
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [exportAsDocx, setExportAsDocx] = useState(true);

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

  React.useEffect(() => {
    const loadContactInfo = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter({ created_by: user.email }, '-created_date', 1);
        if (orgs.length > 0) {
          setCoverPage(prev => ({
            ...prev,
            contactName: orgs[0].contact_name || user.full_name || "",
            contactEmail: orgs[0].contact_email || user.email || ""
          }));
        }
      } catch (error) {
        console.error("Error loading contact info:", error);
      }
    };
    loadContactInfo();
  }, []);

  const completionStats = {
    totalSections: sections.length,
    completedSections: sections.filter(s => s.content && s.status !== 'draft').length,
    totalWords: sections.reduce((sum, s) => sum + (s.word_count || 0), 0),
    uploadedDocs: solicitationDocs.length
  };

  const completionPercentage = completionStats.totalSections > 0 
    ? Math.round((completionStats.completedSections / completionStats.totalSections) * 100)
    : 0;

  const readyToExport = completionPercentage >= 80 && 
                        coverPage.preparedFor && 
                        coverPage.preparedBy &&
                        coverPage.submissionDate;

  const generateDocument = async () => {
    if (!proposalId || !readyToExport) {
      alert("Please complete all required fields and sections");
      return;
    }

    setIsExporting(true);
    try {
      // Build the full document content
      let fullContent = `
# ${proposalData.proposal_name}

---

## COVER PAGE

**Prepared For:**  
${coverPage.preparedFor}

**Prepared By:**  
${coverPage.preparedBy}

**Submission Date:**  
${new Date(coverPage.submissionDate).toLocaleDateString()}

**Contact Information:**  
${coverPage.contactName}  
${coverPage.contactEmail}

---

## PROPOSAL DETAILS

**Solicitation Number:** ${proposalData.solicitation_number || 'N/A'}  
**Agency:** ${proposalData.agency_name || 'N/A'}  
**Project Title:** ${proposalData.project_title || 'N/A'}  
**Prime Contractor:** ${proposalData.prime_contractor_name || 'N/A'}  
**Project Type:** ${proposalData.project_type || 'N/A'}  

---

`;

      // Add all sections
      sections.forEach((section, idx) => {
        fullContent += `\n\n## ${section.section_name}\n\n`;
        
        if (section.content) {
          // Convert HTML to plain text for markdown
          const plainText = section.content
            .replace(/<h3>/g, '\n### ')
            .replace(/<\/h3>/g, '\n')
            .replace(/<p>/g, '\n')
            .replace(/<\/p>/g, '\n')
            .replace(/<strong>/g, '**')
            .replace(/<\/strong>/g, '**')
            .replace(/<ul>/g, '\n')
            .replace(/<\/ul>/g, '\n')
            .replace(/<li>/g, '- ')
            .replace(/<\/li>/g, '\n')
            .replace(/<[^>]*>/g, '');
          
          fullContent += plainText;
        } else {
          fullContent += '[Content not yet generated]';
        }
        fullContent += `\n\n---\n`;
      });

      // Create a blob and download
      const blob = new Blob([fullContent], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proposalData.proposal_name.replace(/\s+/g, '_')}_FINAL.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Save to library if checked
      if (saveToLibrary) {
        await base44.entities.Proposal.update(proposalId, {
          status: "submitted",
          final_document_generated: true
        });
      }

      alert(`✓ Proposal document generated successfully!\n\n${exportAsDocx ? 'Note: Convert the Markdown file to DOCX using Microsoft Word or Pandoc.' : ''}`);

    } catch (error) {
      console.error("Error exporting:", error);
      alert("Error generating document. Please try again.");
    }
    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-blue-600" />
            Finalize & Export
          </CardTitle>
          <CardDescription>
            Review your settings and generate the final proposal document
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

          {/* Cover Page */}
          <Card className="border-indigo-200">
            <CardHeader>
              <CardTitle className="text-lg">Cover Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prepared For (Customer) *</Label>
                  <Input
                    value={coverPage.preparedFor}
                    onChange={(e) => setCoverPage(prev => ({ ...prev, preparedFor: e.target.value }))}
                    placeholder="e.g., U.S. Department of Defense"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Prepared By (Your Organization) *</Label>
                  <Input
                    value={coverPage.preparedBy}
                    onChange={(e) => setCoverPage(prev => ({ ...prev, preparedBy: e.target.value }))}
                    placeholder="e.g., Acme Solutions Inc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Submission Date *</Label>
                <Input
                  type="date"
                  value={coverPage.submissionDate}
                  onChange={(e) => setCoverPage(prev => ({ ...prev, submissionDate: e.target.value }))}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Information - Full Name</Label>
                  <Input
                    value={coverPage.contactName}
                    onChange={(e) => setCoverPage(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={coverPage.contactEmail}
                    onChange={(e) => setCoverPage(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="john.doe@company.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Options */}
          <Card className="border-green-200">
            <CardHeader>
              <CardTitle className="text-lg">Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={saveToLibrary}
                  onCheckedChange={setSaveToLibrary}
                />
                <label className="text-sm text-slate-700">
                  Save to Submitted Proposal Library
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={exportAsDocx}
                  onCheckedChange={setExportAsDocx}
                />
                <label className="text-sm text-slate-700">
                  Export as Word DOCX (Note: Will export as Markdown - convert using Word/Pandoc)
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Readiness Check */}
          <Card className={readyToExport ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {readyToExport ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className={`font-semibold mb-2 ${readyToExport ? 'text-green-900' : 'text-amber-900'}`}>
                    {readyToExport ? 'Ready to Generate!' : 'Not Ready Yet'}
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
                      {coverPage.preparedFor ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      )}
                      <span className={coverPage.preparedFor ? 'text-green-800' : 'text-amber-800'}>
                        Prepared For: {coverPage.preparedFor || 'Missing'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {coverPage.preparedBy ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      )}
                      <span className={coverPage.preparedBy ? 'text-green-800' : 'text-amber-800'}>
                        Prepared By: {coverPage.preparedBy || 'Missing'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {coverPage.submissionDate ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      )}
                      <span className={coverPage.submissionDate ? 'text-green-800' : 'text-amber-800'}>
                        Submission date: {coverPage.submissionDate ? new Date(coverPage.submissionDate).toLocaleDateString() : 'Missing'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={generateDocument}
            disabled={!readyToExport || isExporting}
            size="lg"
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Document...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Generate Document
              </>
            )}
          </Button>

          {!readyToExport && (
            <Alert className="border-amber-300">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                Complete all requirements above to generate the final proposal document.
              </AlertDescription>
            </Alert>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("Proposals"))}
            >
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
    </div>
  );
}