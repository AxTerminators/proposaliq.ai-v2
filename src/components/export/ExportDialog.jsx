
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, 
  FileText, 
  Loader2,
  CheckCircle2,
  Sparkles,
  Info
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ExportDialog({ open, onOpenChange, proposal, sections, onExportComplete }) {
  const queryClient = useQueryClient();
  const [exportFormat, setExportFormat] = useState("pdf_html");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [includeSections, setIncludeSections] = useState(sections.map(s => s.id));

  const { data: templates = [] } = useQuery({
    queryKey: ['export-templates', proposal?.organization_id],
    queryFn: async () => {
      if (!proposal?.organization_id) return [];
      return base44.entities.ExportTemplate.filter({ 
        organization_id: proposal.organization_id 
      }, '-is_default,-created_date');
    },
    enabled: !!proposal?.organization_id && open,
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    enabled: open,
  });

  const createExportHistoryMutation = useMutation({
    mutationFn: async (exportData) => {
      return await base44.entities.ExportHistory.create(exportData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['export-history'] });
    },
  });

  const createProposalResourceMutation = useMutation({
    mutationFn: async (resourceData) => {
      return await base44.entities.ProposalResource.create(resourceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const handleToggleSection = (sectionId) => {
    setIncludeSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleExport = async () => {
    if (includeSections.length === 0) {
      alert("Please select at least one section to export");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate export process (in real implementation, this would generate the actual document)
      const selectedSections = sections.filter(s => includeSections.includes(s.id));
      const totalWords = selectedSections.reduce((sum, s) => {
        if (!s.content) return sum;
        return sum + s.content.split(/\s+/).length;
      }, 0);

      // Simulate progress
      for (let i = 0; i <= 100; i += 10) {
        setExportProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const template = templates.find(t => t.id === selectedTemplate);
      
      // In real implementation, file_url would be the actual generated document URL
      // For now, we'll create a placeholder URL
      const mockFileUrl = `https://storage.example.com/proposals/${proposal.id}_${Date.now()}.pdf`;

      // Create export history record
      const exportHistory = await createExportHistoryMutation.mutateAsync({
        organization_id: proposal.organization_id,
        proposal_id: proposal.id,
        proposal_name: proposal.proposal_name,
        exported_by_email: user?.email || 'unknown',
        exported_by_name: user?.full_name || 'Unknown User',
        export_format: exportFormat,
        template_id: selectedTemplate || null,
        template_name: template?.template_name || 'Default',
        file_size_bytes: totalWords * 50, // Rough estimate
        total_pages: Math.ceil(totalWords / 250), // ~250 words per page
        total_words: totalWords,
        sections_included: includeSections.length,
        export_options: {
          format: exportFormat,
          template: template?.template_name || 'Default',
          sections: includeSections.length
        },
        download_url: mockFileUrl,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

      // Create ProposalResource entry for the generated proposal
      await createProposalResourceMutation.mutateAsync({
        organization_id: proposal.organization_id,
        resource_type: 'past_proposal',
        title: `${proposal.proposal_name} - Exported ${new Date().toLocaleDateString()}`,
        description: `Generated proposal exported on ${new Date().toLocaleString()}. ${proposal.agency_name ? `Agency: ${proposal.agency_name}` : ''}`,
        file_name: `${proposal.proposal_name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${exportFormat.split('_')[0]}`,
        file_url: mockFileUrl,
        file_size: totalWords * 50,
        tags: [
          'generated-proposal',
          exportFormat,
          proposal.agency_name || 'no-agency',
          new Date().getFullYear().toString()
        ].filter(Boolean),
        linked_proposal_ids: [proposal.id],
        usage_count: 0
      });

      setExportProgress(100);
      
      // Update template usage count
      if (selectedTemplate && template) {
        await base44.entities.ExportTemplate.update(selectedTemplate, {
          usage_count: (template.usage_count || 0) + 1
        });
      }

      setTimeout(() => {
        setIsExporting(false);
        onExportComplete();
      }, 500);

    } catch (error) {
      console.error("Export error:", error);
      alert("Error exporting proposal. Please try again.");
      setIsExporting(false);
    }
  };

  const selectedSections = sections.filter(s => includeSections.includes(s.id));
  const totalWords = selectedSections.reduce((sum, s) => {
    if (!s.content) return sum;
    return sum + s.content.split(/\s+/).length;
  }, 0);
  const estimatedPages = Math.ceil(totalWords / 250);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Download className="w-6 h-6 text-blue-600" />
            Export Proposal
          </DialogTitle>
          <DialogDescription>
            Configure export settings and select sections to include
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Export Format</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf_html">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <div>
                      <p className="font-medium">Print-Ready HTML → PDF</p>
                      <p className="text-xs text-slate-500">Best for submission</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="docx_markdown">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <div>
                      <p className="font-medium">Markdown → Word</p>
                      <p className="text-xs text-slate-500">Editable format</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="excel_compliance">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <div>
                      <p className="font-medium">Compliance Matrix CSV</p>
                      <p className="text-xs text-slate-500">Requirements tracking</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="html_package">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <div>
                      <p className="font-medium">Styled HTML Package</p>
                      <p className="text-xs text-slate-500">Interactive web format</p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Export Template (Optional)</Label>
              <Select 
                value={selectedTemplate || "none"} 
                onValueChange={(value) => setSelectedTemplate(value === "none" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Use default formatting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>Default formatting</span>
                    </div>
                  </SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{template.template_name}</span>
                        {template.is_default && (
                          <Badge variant="secondary" className="text-xs">Default</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Section Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Select Sections to Include</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (includeSections.length === sections.length) {
                    setIncludeSections([]);
                  } else {
                    setIncludeSections(sections.map(s => s.id));
                  }
                }}
              >
                {includeSections.length === sections.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <ScrollArea className="h-[250px] border rounded-lg p-4">
              <div className="space-y-2">
                {sections.map((section) => {
                  const wordCount = section.content ? section.content.split(/\s+/).length : 0;
                  
                  return (
                    <div
                      key={section.id}
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Checkbox
                        checked={includeSections.includes(section.id)}
                        onCheckedChange={() => handleToggleSection(section.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{section.section_name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {wordCount} words
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {section.status || 'draft'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Export Summary */}
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-blue-900">Export Summary:</p>
                <p className="text-blue-800">
                  • {includeSections.length} section{includeSections.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-blue-800">
                  • Approximately {totalWords.toLocaleString()} words
                </p>
                <p className="text-blue-800">
                  • Estimated {estimatedPages} page{estimatedPages !== 1 ? 's' : ''}
                </p>
                <p className="text-blue-800 mt-2">
                  ✅ Will be saved to Resource Library as "Past / Generated Proposal"
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Export Progress */}
          {isExporting && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">
                  {exportProgress === 100 ? 'Export complete!' : 'Exporting proposal...'}
                </span>
                <span className="font-semibold">{exportProgress}%</span>
              </div>
              <div className="relative">
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
              {exportProgress === 100 && (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Saved to Export History and Resource Library!</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            {exportProgress === 100 ? 'Close' : 'Cancel'}
          </Button>
          {exportProgress < 100 && (
            <Button
              onClick={handleExport}
              disabled={isExporting || includeSections.length === 0}
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
                  Export Proposal
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
