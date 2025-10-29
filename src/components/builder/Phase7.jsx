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
  Award,
  Sparkles,
  Shield,
  Eye
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Phase7({ proposalData, setProposalData, proposalId }) {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [qualityReview, setQualityReview] = useState(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  
  const [coverPage, setCoverPage] = useState({
    preparedFor: proposalData.agency_name || "",
    preparedBy: proposalData.prime_contractor_name || "",
    submissionDate: proposalData.due_date || "",
    contactName: "",
    contactEmail: "",
    contactPhone: ""
  });
  
  const [exportOptions, setExportOptions] = useState({
    saveToLibrary: true,
    exportAsDocx: true,
    includeTOC: true,
    includePageNumbers: true,
    includeHeaderFooter: true,
    generateComplianceMatrix: true
  });

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
            contactEmail: orgs[0].contact_email || user.email || "",
            contactPhone: orgs[0].contact_phone || ""
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
    uploadedDocs: solicitationDocs.length,
    averageQuality: sections.length > 0 ? 
      sections.filter(s => s.status === 'approved').length / sections.length * 100 : 0
  };

  const completionPercentage = completionStats.totalSections > 0 
    ? Math.round((completionStats.completedSections / completionStats.totalSections) * 100)
    : 0;

  const readyToExport = completionPercentage >= 80 && 
                        coverPage.preparedFor && 
                        coverPage.preparedBy &&
                        coverPage.submissionDate;

  const runQualityReview = async () => {
    if (!proposalId || sections.length === 0) {
      alert("No content to review");
      return;
    }

    setIsReviewing(true);
    try {
      // Combine all section content for review
      const fullContent = sections.map(s => ({
        section: s.section_name,
        content: s.content?.replace(/<[^>]*>/g, ' ').substring(0, 1000) || ""
      }));

      const prompt = `You are a senior proposal quality reviewer. Conduct a comprehensive quality assurance review of this government proposal.

**PROPOSAL:**
Title: ${proposalData.proposal_name}
Agency: ${proposalData.agency_name}
Type: ${proposalData.project_type}

**SECTIONS TO REVIEW:**
${fullContent.map((s, idx) => `${idx + 1}. ${s.section}: ${s.content.substring(0, 300)}...`).join('\n\n')}

**YOUR TASK:**
Perform a thorough quality review and provide:

{
  "overall_quality_score": <number 0-100>,
  "readiness_level": <string: "ready", "needs_minor_fixes", "needs_major_revision">,
  
  "spelling_grammar": {
    "issues_found": <number>,
    "critical_issues": [<string: describe each critical issue>],
    "suggestions": [<string: specific fixes>]
  },
  
  "consistency_check": {
    "terminology_issues": [<string: inconsistent terms used>],
    "formatting_issues": [<string: formatting inconsistencies>],
    "tone_issues": [<string: tone shifts or problems>]
  },
  
  "completeness": {
    "missing_elements": [<string: required elements not found>],
    "weak_sections": [<string: sections that need strengthening>],
    "strong_sections": [<string: sections that are excellent>]
  },
  
  "compliance": {
    "potential_issues": [<string: compliance concerns>],
    "recommendations": [<string: how to address compliance>]
  },
  
  "readability": {
    "score": <number 0-100>,
    "issues": [<string: readability problems>],
    "suggestions": [<string: how to improve readability>]
  },
  
  "final_recommendations": [
    <string: prioritized list of actions before submission>
  ]
}

Be thorough and specific. This is a final quality check before submission to the government.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_quality_score: { type: "number" },
            readiness_level: { type: "string" },
            spelling_grammar: { type: "object" },
            consistency_check: { type: "object" },
            completeness: { type: "object" },
            compliance: { type: "object" },
            readability: { type: "object" },
            final_recommendations: { type: "array" }
          }
        }
      });

      setQualityReview(result);
      
    } catch (error) {
      console.error("Error running quality review:", error);
      alert("Error running quality review. Please try again.");
    }
    setIsReviewing(false);
  };

  const generatePreview = () => {
    let preview = `# ${proposalData.proposal_name}\n\n`;
    preview += `---\n\n`;
    preview += `## COVER PAGE\n\n`;
    preview += `**Prepared For:**  \n${coverPage.preparedFor}\n\n`;
    preview += `**Prepared By:**  \n${coverPage.preparedBy}\n\n`;
    preview += `**Submission Date:**  \n${new Date(coverPage.submissionDate).toLocaleDateString()}\n\n`;
    preview += `**Contact Information:**  \n${coverPage.contactName}  \n${coverPage.contactEmail}  \n${coverPage.contactPhone}\n\n`;
    preview += `---\n\n`;

    if (exportOptions.includeTOC) {
      preview += `## TABLE OF CONTENTS\n\n`;
      sections.forEach((section, idx) => {
        preview += `${idx + 1}. ${section.section_name}  \n`;
      });
      preview += `\n---\n\n`;
    }

    sections.forEach((section, idx) => {
      const sectionNumber = idx + 1;
      preview += `## ${sectionNumber}. ${section.section_name}\n\n`;
      
      if (section.content) {
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
        
        preview += plainText;
      } else {
        preview += '[Content not yet generated]';
      }
      preview += `\n\n---\n\n`;
    });

    setPreviewContent(preview);
    setShowPreviewDialog(true);
  };

  const generateDocument = async () => {
    if (!proposalId || !readyToExport) {
      alert("Please complete all required fields and sections");
      return;
    }

    setIsExporting(true);
    try {
      // Build the full document content
      let fullContent = `# ${proposalData.proposal_name}\n\n`;
      fullContent += `---\n\n`;
      fullContent += `## COVER PAGE\n\n`;
      fullContent += `**Prepared For:**  \n${coverPage.preparedFor}\n\n`;
      fullContent += `**Prepared By:**  \n${coverPage.preparedBy}\n\n`;
      fullContent += `**Submission Date:**  \n${new Date(coverPage.submissionDate).toLocaleDateString()}\n\n`;
      fullContent += `**Contact Information:**  \n${coverPage.contactName}  \n${coverPage.contactEmail}  \n${coverPage.contactPhone || 'N/A'}\n\n`;
      fullContent += `---\n\n`;
      fullContent += `## PROPOSAL DETAILS\n\n`;
      fullContent += `**Solicitation Number:** ${proposalData.solicitation_number || 'N/A'}  \n`;
      fullContent += `**Agency:** ${proposalData.agency_name || 'N/A'}  \n`;
      fullContent += `**Project Title:** ${proposalData.project_title || 'N/A'}  \n`;
      fullContent += `**Prime Contractor:** ${proposalData.prime_contractor_name || 'N/A'}  \n`;
      fullContent += `**Project Type:** ${proposalData.project_type || 'N/A'}  \n\n`;
      fullContent += `---\n\n`;

      // Table of Contents
      if (exportOptions.includeTOC) {
        fullContent += `## TABLE OF CONTENTS\n\n`;
        sections.forEach((section, idx) => {
          fullContent += `${idx + 1}. ${section.section_name}  \n`;
        });
        fullContent += `\n---\n\n`;
      }

      // Add all sections
      sections.forEach((section, idx) => {
        const sectionNumber = idx + 1;
        fullContent += `## ${sectionNumber}. ${section.section_name.toUpperCase()}\n\n`;
        
        if (section.content) {
          // Convert HTML to markdown
          const plainText = section.content
            .replace(/<h3>/g, '\n### ')
            .replace(/<\/h3>/g, '\n')
            .replace(/<h4>/g, '\n#### ')
            .replace(/<\/h4>/g, '\n')
            .replace(/<p>/g, '\n')
            .replace(/<\/p>/g, '\n')
            .replace(/<strong>/g, '**')
            .replace(/<\/strong>/g, '**')
            .replace(/<em>/g, '*')
            .replace(/<\/em>/g, '*')
            .replace(/<ul>/g, '\n')
            .replace(/<\/ul>/g, '\n')
            .replace(/<ol>/g, '\n')
            .replace(/<\/ol>/g, '\n')
            .replace(/<li>/g, '- ')
            .replace(/<\/li>/g, '\n')
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<[^>]*>/g, '');
          
          fullContent += plainText;
        } else {
          fullContent += '[Content not yet generated]';
        }
        fullContent += `\n\n---\n\n`;
      });

      // Generate compliance matrix if requested
      if (exportOptions.generateComplianceMatrix) {
        fullContent += `## APPENDIX A: COMPLIANCE MATRIX\n\n`;
        fullContent += `| Section | Requirement | Location in Proposal | Status |\n`;
        fullContent += `|---------|-------------|---------------------|--------|\n`;
        sections.forEach((section, idx) => {
          const status = section.content && section.status !== 'draft' ? '✓ Complete' : '⚠ Pending';
          fullContent += `| ${idx + 1} | ${section.section_name} | Section ${idx + 1} | ${status} |\n`;
        });
        fullContent += `\n---\n\n`;
      }

      // Add document metadata footer
      fullContent += `\n\n---\n\n`;
      fullContent += `**Document Information**\n\n`;
      fullContent += `- Generated: ${new Date().toLocaleString()}\n`;
      fullContent += `- Total Sections: ${completionStats.totalSections}\n`;
      fullContent += `- Total Words: ${completionStats.totalWords.toLocaleString()}\n`;
      fullContent += `- Completion: ${completionPercentage}%\n`;
      fullContent += `- Generated by ProposalIQ.ai\n`;

      // Create a blob and download
      const blob = new Blob([fullContent], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `${proposalData.proposal_name.replace(/\s+/g, '_')}_FINAL_${new Date().toISOString().split('T')[0]}.md`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Save to library if checked
      if (exportOptions.saveToLibrary) {
        await base44.entities.Proposal.update(proposalId, {
          status: "submitted",
          final_document_generated: true,
          submission_date: new Date().toISOString()
        });
      }

      alert(`✓ Proposal document generated successfully!\n\nFile: ${fileName}\n\n${exportOptions.exportAsDocx ? 'To convert to DOCX:\n1. Open in Microsoft Word or Google Docs\n2. Save As > Word Document (.docx)\n\nOr use Pandoc command line:\npandoc ' + fileName + ' -o output.docx' : ''}`);

    } catch (error) {
      console.error("Error exporting:", error);
      alert("Error generating document. Please try again.");
    }
    setIsExporting(false);
  };

  const getReadinessColor = (level) => {
    if (level === 'ready') return 'text-green-600';
    if (level === 'needs_minor_fixes') return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cover">Cover Page</TabsTrigger>
          <TabsTrigger value="quality">Quality Review</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-blue-600" />
                Finalize & Export
              </CardTitle>
              <CardDescription>
                Complete final checks and generate your submission-ready proposal
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

              {/* Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={generatePreview}
                  className="w-full"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Preview Document
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={runQualityReview}
                  disabled={isReviewing || sections.length === 0}
                  className="w-full"
                >
                  {isReviewing ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 mr-2" />
                  )}
                  Quality Review
                </Button>
                <Button
                  size="lg"
                  onClick={generateDocument}
                  disabled={!readyToExport || isExporting}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isExporting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 mr-2" />
                  )}
                  Generate Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cover Page Tab */}
        <TabsContent value="cover" className="space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Cover Page Information</CardTitle>
              <CardDescription>Configure the cover page for your proposal</CardDescription>
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
                  <Label>Contact Name</Label>
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

              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  type="tel"
                  value={coverPage.contactPhone}
                  onChange={(e) => setCoverPage(prev => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Review Tab */}
        <TabsContent value="quality" className="space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                AI Quality Assurance Review
              </CardTitle>
              <CardDescription>
                Comprehensive quality check before submission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!qualityReview && (
                <div className="text-center py-8">
                  <Shield className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Run Quality Review</h3>
                  <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                    Our AI will check spelling, grammar, consistency, completeness, compliance, and readability.
                  </p>
                  <Button
                    onClick={runQualityReview}
                    disabled={isReviewing || sections.length === 0}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isReviewing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Reviewing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Run Quality Review
                      </>
                    )}
                  </Button>
                </div>
              )}

              {qualityReview && (
                <div className="space-y-6">
                  {/* Overall Score */}
                  <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Overall Quality Score</p>
                          <p className={`text-4xl font-bold ${getReadinessColor(qualityReview.readiness_level)}`}>
                            {qualityReview.overall_quality_score}%
                          </p>
                          <p className="text-sm text-slate-600 mt-1 capitalize">
                            Status: {qualityReview.readiness_level.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <Award className="w-16 h-16 text-indigo-600 opacity-20" />
                      </div>
                      <Progress value={qualityReview.overall_quality_score} className="h-3" />
                    </CardContent>
                  </Card>

                  {/* Detailed Checks */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Spelling & Grammar */}
                    {qualityReview.spelling_grammar && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Spelling & Grammar</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold mb-2">
                            {qualityReview.spelling_grammar.issues_found} Issues
                          </p>
                          {qualityReview.spelling_grammar.critical_issues?.length > 0 && (
                            <div className="space-y-2">
                              {qualityReview.spelling_grammar.critical_issues.map((issue, idx) => (
                                <Alert key={idx} className="bg-red-50 border-red-200">
                                  <AlertDescription className="text-sm text-red-900">
                                    {issue}
                                  </AlertDescription>
                                </Alert>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Readability */}
                    {qualityReview.readability && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Readability</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold mb-2">
                            {qualityReview.readability.score}/100
                          </p>
                          <Progress value={qualityReview.readability.score} className="mb-3" />
                          {qualityReview.readability.issues?.length > 0 && (
                            <div className="space-y-1">
                              {qualityReview.readability.issues.map((issue, idx) => (
                                <p key={idx} className="text-sm text-slate-600">• {issue}</p>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Consistency */}
                  {qualityReview.consistency_check && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Consistency Check</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {qualityReview.consistency_check.terminology_issues?.length > 0 && (
                          <div>
                            <p className="font-semibold text-sm mb-1">Terminology Issues:</p>
                            {qualityReview.consistency_check.terminology_issues.map((issue, idx) => (
                              <p key={idx} className="text-sm text-slate-600">• {issue}</p>
                            ))}
                          </div>
                        )}
                        {qualityReview.consistency_check.tone_issues?.length > 0 && (
                          <div>
                            <p className="font-semibold text-sm mb-1">Tone Issues:</p>
                            {qualityReview.consistency_check.tone_issues.map((issue, idx) => (
                              <p key={idx} className="text-sm text-slate-600">• {issue}</p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Completeness */}
                  {qualityReview.completeness && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Completeness Analysis</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {qualityReview.completeness.strong_sections?.length > 0 && (
                          <div>
                            <p className="font-semibold text-sm mb-2 text-green-700">Strong Sections:</p>
                            {qualityReview.completeness.strong_sections.map((section, idx) => (
                              <Badge key={idx} className="mr-2 mb-2 bg-green-100 text-green-700">
                                {section}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {qualityReview.completeness.weak_sections?.length > 0 && (
                          <div>
                            <p className="font-semibold text-sm mb-2 text-amber-700">Needs Strengthening:</p>
                            {qualityReview.completeness.weak_sections.map((section, idx) => (
                              <p key={idx} className="text-sm text-slate-600">• {section}</p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Final Recommendations */}
                  {qualityReview.final_recommendations && (
                    <Card className="border-indigo-200 bg-indigo-50">
                      <CardHeader>
                        <CardTitle className="text-base">Final Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {qualityReview.final_recommendations.map((rec, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 bg-white border border-indigo-200 rounded-lg">
                              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold">{idx + 1}</span>
                              </div>
                              <p className="text-sm text-indigo-900">{rec}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Re-run button */}
                  <Button
                    onClick={runQualityReview}
                    disabled={isReviewing}
                    variant="outline"
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Re-run Quality Review
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
              <CardDescription>Configure document generation settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={exportOptions.saveToLibrary}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, saveToLibrary: checked }))}
                  />
                  <label className="text-sm text-slate-700">
                    Mark proposal as "Submitted" in library
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={exportOptions.includeTOC}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeTOC: checked }))}
                  />
                  <label className="text-sm text-slate-700">
                    Include Table of Contents
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={exportOptions.includePageNumbers}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includePageNumbers: checked }))}
                  />
                  <label className="text-sm text-slate-700">
                    Include page numbers (when converted to DOCX/PDF)
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={exportOptions.includeHeaderFooter}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, includeHeaderFooter: checked }))}
                  />
                  <label className="text-sm text-slate-700">
                    Include header/footer with proposal info
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={exportOptions.generateComplianceMatrix}
                    onCheckedChange={(checked) => setExportOptions(prev => ({ ...prev, generateComplianceMatrix: checked }))}
                  />
                  <label className="text-sm text-slate-700">
                    Generate compliance matrix appendix
                  </label>
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-900">
                  <strong>Format Note:</strong> Documents are generated in Markdown format for maximum compatibility. 
                  To convert to DOCX: Open in Microsoft Word or use Pandoc (pandoc file.md -o output.docx)
                </AlertDescription>
              </Alert>

              <Button
                onClick={generateDocument}
                disabled={!readyToExport || isExporting}
                size="lg"
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Document...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Generate Final Document
                  </>
                )}
              </Button>

              {!readyToExport && (
                <Alert className="border-amber-300">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Complete all requirements in the Overview tab to generate the final document.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
            <DialogDescription>
              Preview of your final proposal document
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-4 rounded border">
                {previewContent}
              </pre>
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}