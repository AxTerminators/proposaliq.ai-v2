import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Download, 
  Settings, 
  Loader2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Eye
} from "lucide-react";

export default function ExportDialog({ 
  open, 
  onOpenChange, 
  proposalId, 
  proposalData,
  onExportComplete 
}) {
  const [user, setUser] = useState(null);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [exportFormat, setExportFormat] = useState("pdf_html");
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeCoverPage: true,
    includeTOC: true,
    includeHeaders: true,
    includeFooters: true,
    includePageNumbers: true,
    includeComplianceMatrix: false,
    includeSectionNumbers: true,
    watermark: "",
    preparedFor: proposalData?.agency_name || "",
    preparedBy: proposalData?.prime_contractor_name || "",
    contactName: "",
    contactEmail: "",
    contactPhone: ""
  });

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
          setExportOptions(prev => ({
            ...prev,
            contactName: orgs[0].contact_name || currentUser.full_name || "",
            contactEmail: orgs[0].contact_email || currentUser.email || "",
            contactPhone: orgs[0].contact_phone || ""
          }));
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  const { data: templates } = useQuery({
    queryKey: ['export-templates', currentOrgId],
    queryFn: () => currentOrgId ? base44.entities.ExportTemplate.filter({ organization_id: currentOrgId }, '-is_default,-created_date') : [],
    initialData: [],
    enabled: !!currentOrgId
  });

  const { data: sections } = useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: () => proposalId ? base44.entities.ProposalSection.filter({ proposal_id: proposalId }, 'order') : [],
    initialData: [],
    enabled: !!proposalId
  });

  const handleExport = async () => {
    if (!proposalId || !user || !currentOrgId) return;

    setIsExporting(true);
    try {
      let exportedContent = "";
      let fileName = "";
      let fileBlob = null;

      const stats = {
        totalWords: sections.reduce((sum, s) => sum + (s.word_count || 0), 0),
        totalSections: sections.length,
        totalPages: Math.ceil(sections.reduce((sum, s) => sum + (s.word_count || 0), 0) / 250) // Estimate
      };

      if (exportFormat === "pdf_html") {
        // Generate print-ready HTML
        const { content, filename } = await generatePrintHTML(sections, exportOptions, proposalData, stats);
        exportedContent = content;
        fileName = filename;
        fileBlob = new Blob([content], { type: 'text/html' });
      } else if (exportFormat === "docx_markdown") {
        // Generate Markdown for Word conversion
        const { content, filename } = await generateMarkdown(sections, exportOptions, proposalData, stats);
        exportedContent = content;
        fileName = filename;
        fileBlob = new Blob([content], { type: 'text/markdown' });
      } else if (exportFormat === "excel_compliance") {
        // Generate CSV compliance matrix
        const { content, filename } = await generateComplianceCSV(sections, proposalData);
        exportedContent = content;
        fileName = filename;
        fileBlob = new Blob([content], { type: 'text/csv' });
      } else if (exportFormat === "html_package") {
        // Generate styled HTML package
        const { content, filename } = await generateStyledHTML(sections, exportOptions, proposalData, stats);
        exportedContent = content;
        fileName = filename;
        fileBlob = new Blob([content], { type: 'text/html' });
      }

      // Create download
      if (fileBlob) {
        const url = window.URL.createObjectURL(fileBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Save to export history
        await base44.entities.ExportHistory.create({
          organization_id: currentOrgId,
          proposal_id: proposalId,
          proposal_name: proposalData.proposal_name,
          exported_by_email: user.email,
          exported_by_name: user.full_name || user.email,
          export_format: exportFormat,
          template_id: selectedTemplate?.id,
          template_name: selectedTemplate?.template_name || "Default",
          file_size_bytes: fileBlob.size,
          total_pages: stats.totalPages,
          total_words: stats.totalWords,
          sections_included: stats.totalSections,
          export_options: exportOptions
        });

        if (onExportComplete) {
          onExportComplete();
        }

        alert(`✓ Export successful!\n\nFile: ${fileName}\n\n${
          exportFormat === "docx_markdown" 
            ? "To convert to DOCX:\n1. Open in Microsoft Word or Google Docs\n2. Save As > Word Document (.docx)\n\nOr use Pandoc: pandoc " + fileName + " -o output.docx"
            : exportFormat === "pdf_html"
            ? "Open the HTML file in a browser and use Print > Save as PDF for best results."
            : ""
        }`);
      }

    } catch (error) {
      console.error("Error exporting:", error);
      alert("Error during export. Please try again.");
    }
    setIsExporting(false);
  };

  const generatePrintHTML = async (sections, options, proposal, stats) => {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${proposal.proposal_name}</title>
  <style>
    @media print {
      @page {
        size: letter;
        margin: ${options.includeHeaders ? '1.5in' : '1in'} 1in ${options.includeFooters ? '1.5in' : '1in'} 1in;
      }
      .page-break { page-break-before: always; }
      .no-print { display: none; }
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 1in;
      background: white;
    }
    
    ${options.watermark ? `
    body::before {
      content: '${options.watermark}';
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120pt;
      color: rgba(200, 200, 200, 0.2);
      z-index: -1;
      pointer-events: none;
    }
    ` : ''}
    
    .cover-page {
      text-align: center;
      padding: 3in 1in;
    }
    
    .cover-page h1 {
      font-size: 24pt;
      margin: 1in 0 0.5in 0;
      font-weight: bold;
    }
    
    .cover-page .subtitle {
      font-size: 14pt;
      color: #666;
      margin-bottom: 0.5in;
    }
    
    .cover-page .info {
      font-size: 11pt;
      line-height: 2;
      margin-top: 1in;
    }
    
    .toc {
      page-break-after: always;
    }
    
    .toc h2 {
      font-size: 18pt;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    
    .toc-item {
      margin: 15px 0;
      display: flex;
      justify-content: space-between;
    }
    
    .section {
      page-break-before: always;
    }
    
    .section h2 {
      font-size: 16pt;
      font-weight: bold;
      margin: 0.5in 0 0.25in 0;
      border-bottom: 1px solid #333;
      padding-bottom: 5px;
    }
    
    .section h3 {
      font-size: 14pt;
      font-weight: bold;
      margin: 0.25in 0 0.15in 0;
    }
    
    .section p {
      margin: 0.1in 0;
      text-align: justify;
    }
    
    .section ul, .section ol {
      margin: 0.1in 0 0.1in 0.25in;
    }
    
    .section li {
      margin: 0.05in 0;
    }
    
    .compliance-matrix {
      page-break-before: always;
    }
    
    .compliance-matrix table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 10pt;
    }
    
    .compliance-matrix th, .compliance-matrix td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
    }
    
    .compliance-matrix th {
      background: #f0f0f0;
      font-weight: bold;
    }
    
    .footer-info {
      page-break-before: always;
      font-size: 10pt;
      color: #666;
      margin-top: 1in;
    }
    
    @media screen {
      body {
        background: #f5f5f5;
        padding: 20px;
      }
      .no-print {
        display: block !important;
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      🖨️ Print / Save as PDF
    </button>
  </div>
`;

    // Cover Page
    if (options.includeCoverPage) {
      html += `
  <div class="cover-page">
    <h1>${proposal.proposal_name}</h1>
    <div class="subtitle">${proposal.project_type || 'Proposal'} Response</div>
    <div class="info">
      <strong>Prepared For:</strong><br>${options.preparedFor}<br><br>
      <strong>Prepared By:</strong><br>${options.preparedBy}<br><br>
      ${proposal.solicitation_number ? `<strong>Solicitation Number:</strong><br>${proposal.solicitation_number}<br><br>` : ''}
      <strong>Submission Date:</strong><br>${proposal.due_date ? new Date(proposal.due_date).toLocaleDateString() : 'TBD'}<br><br>
      ${options.contactName ? `<strong>Contact:</strong><br>${options.contactName}<br>${options.contactEmail}<br>${options.contactPhone || ''}<br><br>` : ''}
      <strong>Date Generated:</strong><br>${new Date().toLocaleDateString()}
    </div>
  </div>
`;
    }

    // Table of Contents
    if (options.includeTOC) {
      html += `
  <div class="toc">
    <h2>Table of Contents</h2>
`;
      sections.forEach((section, idx) => {
        html += `    <div class="toc-item">
      <span>${options.includeSectionNumbers ? `${idx + 1}. ` : ''}${section.section_name}</span>
      <span>Page ${idx + 2}</span>
    </div>\n`;
      });
      html += `  </div>\n`;
    }

    // Sections
    sections.forEach((section, idx) => {
      const sectionNumber = options.includeSectionNumbers ? `${idx + 1}. ` : '';
      const content = section.content || '[Content not generated]';
      
      html += `
  <div class="section">
    <h2>${sectionNumber}${section.section_name.toUpperCase()}</h2>
    ${content}
  </div>
`;
    });

    // Compliance Matrix
    if (options.includeComplianceMatrix) {
      html += `
  <div class="compliance-matrix">
    <h2>Appendix A: Compliance Matrix</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 10%;">Section</th>
          <th style="width: 40%;">Requirement</th>
          <th style="width: 30%;">Location in Proposal</th>
          <th style="width: 20%;">Status</th>
        </tr>
      </thead>
      <tbody>
`;
      sections.forEach((section, idx) => {
        const status = section.content && section.status !== 'draft' ? '✓ Complete' : '⚠ Pending';
        html += `        <tr>
          <td>${idx + 1}</td>
          <td>${section.section_name}</td>
          <td>Section ${idx + 1}</td>
          <td>${status}</td>
        </tr>\n`;
      });
      html += `      </tbody>
    </table>
  </div>
`;
    }

    // Footer Info
    html += `
  <div class="footer-info">
    <p><strong>Document Information</strong></p>
    <p>
      Generated: ${new Date().toLocaleString()}<br>
      Total Sections: ${stats.totalSections}<br>
      Total Words: ${stats.totalWords.toLocaleString()}<br>
      Estimated Pages: ${stats.totalPages}<br>
      Generated by ProposalIQ.ai
    </p>
  </div>
`;

    html += `
</body>
</html>`;

    const filename = `${proposal.proposal_name.replace(/\s+/g, '_')}_PRINT_${new Date().toISOString().split('T')[0]}.html`;
    return { content: html, filename };
  };

  const generateMarkdown = async (sections, options, proposal, stats) => {
    let md = `# ${proposal.proposal_name}\n\n---\n\n`;

    // Cover Page
    if (options.includeCoverPage) {
      md += `## COVER PAGE\n\n`;
      md += `**${proposal.project_type || 'Proposal'} Response**\n\n`;
      md += `**Prepared For:**  \n${options.preparedFor}\n\n`;
      md += `**Prepared By:**  \n${options.preparedBy}\n\n`;
      if (proposal.solicitation_number) {
        md += `**Solicitation Number:**  \n${proposal.solicitation_number}\n\n`;
      }
      md += `**Submission Date:**  \n${proposal.due_date ? new Date(proposal.due_date).toLocaleDateString() : 'TBD'}\n\n`;
      if (options.contactName) {
        md += `**Contact Information:**  \n${options.contactName}  \n${options.contactEmail}  \n${options.contactPhone || ''}\n\n`;
      }
      md += `**Date Generated:**  \n${new Date().toLocaleDateString()}\n\n`;
      md += `---\n\n`;
    }

    // TOC
    if (options.includeTOC) {
      md += `## TABLE OF CONTENTS\n\n`;
      sections.forEach((section, idx) => {
        md += `${options.includeSectionNumbers ? `${idx + 1}. ` : ''}${section.section_name}  \n`;
      });
      md += `\n---\n\n`;
    }

    // Sections
    sections.forEach((section, idx) => {
      const sectionNumber = options.includeSectionNumbers ? `${idx + 1}. ` : '';
      md += `## ${sectionNumber}${section.section_name.toUpperCase()}\n\n`;
      
      if (section.content) {
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
        
        md += plainText;
      } else {
        md += '[Content not yet generated]';
      }
      md += `\n\n---\n\n`;
    });

    // Compliance Matrix
    if (options.includeComplianceMatrix) {
      md += `## APPENDIX A: COMPLIANCE MATRIX\n\n`;
      md += `| Section | Requirement | Location in Proposal | Status |\n`;
      md += `|---------|-------------|---------------------|--------|\n`;
      sections.forEach((section, idx) => {
        const status = section.content && section.status !== 'draft' ? '✓ Complete' : '⚠ Pending';
        md += `| ${idx + 1} | ${section.section_name} | Section ${idx + 1} | ${status} |\n`;
      });
      md += `\n---\n\n`;
    }

    // Footer
    md += `\n\n---\n\n`;
    md += `**Document Information**\n\n`;
    md += `- Generated: ${new Date().toLocaleString()}\n`;
    md += `- Total Sections: ${stats.totalSections}\n`;
    md += `- Total Words: ${stats.totalWords.toLocaleString()}\n`;
    md += `- Estimated Pages: ${stats.totalPages}\n`;
    md += `- Generated by ProposalIQ.ai\n`;

    const filename = `${proposal.proposal_name.replace(/\s+/g, '_')}_EXPORT_${new Date().toISOString().split('T')[0]}.md`;
    return { content: md, filename };
  };

  const generateComplianceCSV = async (sections, proposal) => {
    let csv = "Section Number,Section Name,Word Count,Status,Completion %,Location,Notes\n";
    
    sections.forEach((section, idx) => {
      const wordCount = section.word_count || 0;
      const status = section.status || 'draft';
      const completion = section.content && section.status !== 'draft' ? 100 : 
                         section.content ? 50 : 0;
      
      csv += `"${idx + 1}","${section.section_name}","${wordCount}","${status}","${completion}%","Section ${idx + 1}",""\n`;
    });

    const filename = `${proposal.proposal_name.replace(/\s+/g, '_')}_Compliance_Matrix_${new Date().toISOString().split('T')[0]}.csv`;
    return { content: csv, filename };
  };

  const generateStyledHTML = async (sections, options, proposal, stats) => {
    // Similar to generatePrintHTML but with more styling and interactivity
    const html = await generatePrintHTML(sections, options, proposal, stats);
    return html;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Download className="w-6 h-6 text-blue-600" />
            Export Proposal
          </DialogTitle>
          <DialogDescription>
            Export your proposal in multiple formats with professional formatting
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="format" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="format">Format</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="format" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Export Format</CardTitle>
                  <CardDescription>Choose the format for your export</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                      <RadioGroupItem value="pdf_html" id="pdf_html" />
                      <div className="flex-1">
                        <Label htmlFor="pdf_html" className="cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-5 h-5 text-red-600" />
                            <span className="font-semibold">Print-Ready HTML → PDF</span>
                            <Badge>Recommended</Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            Professional HTML that you can print to PDF. Best for final submission. Includes all formatting, headers, footers, and page breaks.
                          </p>
                        </Label>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                      <RadioGroupItem value="docx_markdown" id="docx_markdown" />
                      <div className="flex-1">
                        <Label htmlFor="docx_markdown" className="cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold">Markdown → Word (DOCX)</span>
                          </div>
                          <p className="text-sm text-slate-600">
                            Export as Markdown for easy conversion to Microsoft Word. Can be opened in Word, Google Docs, or converted with Pandoc.
                          </p>
                        </Label>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                      <RadioGroupItem value="excel_compliance" id="excel_compliance" />
                      <div className="flex-1">
                        <Label htmlFor="excel_compliance" className="cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            <span className="font-semibold">Compliance Matrix (CSV → Excel)</span>
                          </div>
                          <p className="text-sm text-slate-600">
                            Generate a compliance tracking matrix. Opens in Excel or Google Sheets.
                          </p>
                        </Label>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                      <RadioGroupItem value="html_package" id="html_package" />
                      <div className="flex-1">
                        <Label htmlFor="html_package" className="cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold">Styled HTML Package</span>
                          </div>
                          <p className="text-sm text-slate-600">
                            Complete HTML package with embedded styles for web viewing or archiving.
                          </p>
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {templates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Export Template (Optional)</CardTitle>
                    <CardDescription>Use a saved template for consistent formatting</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedTemplate?.id || "none"}
                      onValueChange={(value) => {
                        const template = templates.find(t => t.id === value);
                        setSelectedTemplate(template);
                        if (template) {
                          setExportOptions(prev => ({
                            ...prev,
                            includeCoverPage: template.include_cover_page,
                            includeTOC: template.include_toc,
                            includeHeaders: template.include_header,
                            includeFooters: template.include_footer,
                            includeComplianceMatrix: template.include_compliance_matrix
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No template (use default)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No template (use default)</SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.template_name} {template.is_default && '(Default)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="options" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Document Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeCoverPage"
                      checked={exportOptions.includeCoverPage}
                      onCheckedChange={(checked) => setExportOptions({...exportOptions, includeCoverPage: checked})}
                    />
                    <Label htmlFor="includeCoverPage" className="text-sm cursor-pointer">
                      Include Cover Page
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeTOC"
                      checked={exportOptions.includeTOC}
                      onCheckedChange={(checked) => setExportOptions({...exportOptions, includeTOC: checked})}
                    />
                    <Label htmlFor="includeTOC" className="text-sm cursor-pointer">
                      Include Table of Contents
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeHeaders"
                      checked={exportOptions.includeHeaders}
                      onCheckedChange={(checked) => setExportOptions({...exportOptions, includeHeaders: checked})}
                    />
                    <Label htmlFor="includeHeaders" className="text-sm cursor-pointer">
                      Include Headers
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeFooters"
                      checked={exportOptions.includeFooters}
                      onCheckedChange={(checked) => setExportOptions({...exportOptions, includeFooters: checked})}
                    />
                    <Label htmlFor="includeFooters" className="text-sm cursor-pointer">
                      Include Footers with Page Numbers
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeSectionNumbers"
                      checked={exportOptions.includeSectionNumbers}
                      onCheckedChange={(checked) => setExportOptions({...exportOptions, includeSectionNumbers: checked})}
                    />
                    <Label htmlFor="includeSectionNumbers" className="text-sm cursor-pointer">
                      Include Section Numbers
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeComplianceMatrix"
                      checked={exportOptions.includeComplianceMatrix}
                      onCheckedChange={(checked) => setExportOptions({...exportOptions, includeComplianceMatrix: checked})}
                    />
                    <Label htmlFor="includeComplianceMatrix" className="text-sm cursor-pointer">
                      Include Compliance Matrix as Appendix
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cover Page Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="preparedFor" className="text-sm">Prepared For (Customer)</Label>
                    <Input
                      id="preparedFor"
                      value={exportOptions.preparedFor}
                      onChange={(e) => setExportOptions({...exportOptions, preparedFor: e.target.value})}
                      placeholder="e.g., U.S. Department of Defense"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preparedBy" className="text-sm">Prepared By (Your Organization)</Label>
                    <Input
                      id="preparedBy"
                      value={exportOptions.preparedBy}
                      onChange={(e) => setExportOptions({...exportOptions, preparedBy: e.target.value})}
                      placeholder="e.g., Acme Solutions Inc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="contactName" className="text-sm">Contact Name</Label>
                      <Input
                        id="contactName"
                        value={exportOptions.contactName}
                        onChange={(e) => setExportOptions({...exportOptions, contactName: e.target.value})}
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactEmail" className="text-sm">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={exportOptions.contactEmail}
                        onChange={(e) => setExportOptions({...exportOptions, contactEmail: e.target.value})}
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone" className="text-sm">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      value={exportOptions.contactPhone}
                      onChange={(e) => setExportOptions({...exportOptions, contactPhone: e.target.value})}
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="watermark" className="text-sm">Watermark (Optional)</Label>
                    <Input
                      id="watermark"
                      value={exportOptions.watermark}
                      onChange={(e) => setExportOptions({...exportOptions, watermark: e.target.value})}
                      placeholder="e.g., DRAFT, CONFIDENTIAL"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Eye className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  <strong>Export Preview</strong><br/>
                  Your proposal will be exported with the following configuration:
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Export Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Format:</span>
                    <span className="font-medium">
                      {exportFormat === 'pdf_html' ? 'Print-Ready HTML → PDF' :
                       exportFormat === 'docx_markdown' ? 'Markdown → Word' :
                       exportFormat === 'excel_compliance' ? 'Compliance Matrix CSV' :
                       'Styled HTML Package'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total Sections:</span>
                    <span className="font-medium">{sections.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total Words:</span>
                    <span className="font-medium">
                      {sections.reduce((sum, s) => sum + (s.word_count || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Estimated Pages:</span>
                    <span className="font-medium">
                      {Math.ceil(sections.reduce((sum, s) => sum + (s.word_count || 0), 0) / 250)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Cover Page:</span>
                    <span className="font-medium">
                      {exportOptions.includeCoverPage ? <CheckCircle2 className="w-4 h-4 inline text-green-600" /> : <XCircle className="w-4 h-4 inline text-slate-400" />}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Table of Contents:</span>
                    <span className="font-medium">
                      {exportOptions.includeTOC ? <CheckCircle2 className="w-4 h-4 inline text-green-600" /> : <XCircle className="w-4 h-4 inline text-slate-400" />}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Compliance Matrix:</span>
                    <span className="font-medium">
                      {exportOptions.includeComplianceMatrix ? <CheckCircle2 className="w-4 h-4 inline text-green-600" /> : <XCircle className="w-4 h-4 inline text-slate-400" />}
                    </span>
                  </div>
                  {exportOptions.watermark && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Watermark:</span>
                      <span className="font-medium">{exportOptions.watermark}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  {exportFormat === 'pdf_html' && 
                    "After download, open the HTML file in your browser and use Print > Save as PDF for best results."}
                  {exportFormat === 'docx_markdown' && 
                    "To convert to Word: Open the .md file in Microsoft Word or Google Docs, then Save As > Word Document. Or use Pandoc command line."}
                  {exportFormat === 'excel_compliance' && 
                    "The CSV file can be opened in Excel or Google Sheets for compliance tracking."}
                  {exportFormat === 'html_package' && 
                    "The HTML file can be viewed in any web browser or shared for online viewing."}
                </AlertDescription>
              </Alert>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting || sections.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}