import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  FileType,
  CheckSquare,
  Loader2,
  Download,
  AlertCircle,
  BookOpen,
  List,
  Droplet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ExportHistoryList from "./ExportHistoryList";

export default function ProposalExportPanel({
  proposal,
  willHaveWatermark,
  user,
  organization,
  onExportComplete
}) {
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [selectedSectionIds, setSelectedSectionIds] = useState([]);
  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch sections for this proposal
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['proposal-sections', proposal.id],
    queryFn: async () => {
      const allSections = await base44.entities.ProposalSection.filter({
        proposal_id: proposal.id
      });
      return allSections.sort((a, b) => (a.order || 0) - (b.order || 0));
    },
    enabled: !!proposal.id
  });

  // Fetch export templates for organization
  const { data: templates = [] } = useQuery({
    queryKey: ['export-templates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ExportTemplate.filter({
        organization_id: organization.id
      });
    },
    enabled: !!organization?.id
  });

  // Initialize all sections as selected when loaded
  React.useEffect(() => {
    if (sections.length > 0 && selectedSectionIds.length === 0) {
      setSelectedSectionIds(sections.map(s => s.id));
    }
  }, [sections, selectedSectionIds.length]);

  const handleToggleSection = (sectionId) => {
    setSelectedSectionIds(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(id => id !== sectionId);
      }
      return [...prev, sectionId];
    });
  };

  const handleSelectAll = () => {
    setSelectedSectionIds(sections.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedSectionIds([]);
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Validate selections
      if (selectedSectionIds.length === 0) {
        toast.error('Please select at least one section to export');
        return;
      }

      // TODO: Replace with actual backend function call
      // Placeholder for Phase 5 integration
      toast.info('Export feature coming soon!', {
        description: 'Backend function will be integrated in Phase 5'
      });

      // Simulated result for now
      const mockResult = {
        file_name: `${proposal.proposal_name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.${selectedFormat}`,
        file_size_bytes: 125000,
        download_url: '#'
      };

      const watermarkText = willHaveWatermark ? ' (DRAFT)' : '';
      toast.success(`✅ ${mockResult.file_name} generated successfully!${watermarkText}`, {
        description: `File size: ${(mockResult.file_size_bytes / 1024).toFixed(1)} KB`,
        duration: 5000
      });

      if (onExportComplete) {
        onExportComplete(mockResult);
      }

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to generate document', {
        description: error.message || 'Please try again'
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (sectionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const emptySections = sections.filter(s => !s.content || s.content.trim().length === 0);
  const hasEmptySections = selectedSectionIds.some(id => 
    emptySections.find(s => s.id === id)
  );

  return (
    <div className="space-y-6">
      {/* Export History */}
      <div>
        <h3 className="text-base font-semibold mb-3">Recent Exports</h3>
        <ExportHistoryList proposal={proposal} />
      </div>

      {/* Divider */}
      <div className="border-t pt-6">
        <h3 className="text-base font-semibold mb-4">Create New Export</h3>
      </div>

      {/* Format Selection */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Export Format</Label>
        <div className="grid grid-cols-2 gap-4">
          {/* PDF Card */}
          <Card
            className={cn(
              "cursor-pointer transition-all border-2 hover:shadow-md",
              selectedFormat === "pdf" ? "border-blue-500 bg-blue-50" : "border-slate-200"
            )}
            onClick={() => setSelectedFormat("pdf")}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  selectedFormat === "pdf" ? "bg-blue-100" : "bg-slate-100"
                )}>
                  <FileType className={cn(
                    "w-5 h-5",
                    selectedFormat === "pdf" ? "text-blue-600" : "text-slate-600"
                  )} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">PDF</h4>
                    {selectedFormat === "pdf" && (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    Professional, non-editable format for submission
                  </p>
                  {willHaveWatermark && selectedFormat === "pdf" && (
                    <Badge className="bg-orange-500 text-xs mt-2">
                      <Droplet className="w-3 h-3 mr-1" />
                      DRAFT watermark
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DOCX Card */}
          <Card
            className={cn(
              "cursor-pointer transition-all border-2 hover:shadow-md",
              selectedFormat === "docx" ? "border-blue-500 bg-blue-50" : "border-slate-200"
            )}
            onClick={() => setSelectedFormat("docx")}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  selectedFormat === "docx" ? "bg-blue-100" : "bg-slate-100"
                )}>
                  <FileText className={cn(
                    "w-5 h-5",
                    selectedFormat === "docx" ? "text-blue-600" : "text-slate-600"
                  )} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900">DOCX</h4>
                    {selectedFormat === "docx" && (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    Editable Word format for collaboration
                  </p>
                  {willHaveWatermark && selectedFormat === "docx" && (
                    <Badge className="bg-orange-500 text-xs mt-2">
                      <Droplet className="w-3 h-3 mr-1" />
                      DRAFT watermark
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="text-base font-semibold">Select Sections to Include</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
            >
              Deselect All
            </Button>
          </div>
        </div>

        {sections.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm text-slate-600">
                No sections found for this proposal.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sections.map((section) => {
                  const isEmpty = !section.content || section.content.trim().length === 0;
                  const isSelected = selectedSectionIds.includes(section.id);

                  return (
                    <div
                      key={section.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-all",
                        isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200",
                        "hover:border-blue-300"
                      )}
                    >
                      <Checkbox
                        id={`section-${section.id}`}
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSection(section.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`section-${section.id}`}
                          className="font-medium text-slate-900 cursor-pointer"
                        >
                          {section.section_name}
                        </Label>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {section.section_type}
                          </Badge>
                          {section.status && (
                            <Badge className={cn(
                              "text-xs",
                              section.status === "approved" ? "bg-green-100 text-green-700" :
                              section.status === "draft" ? "bg-slate-100 text-slate-700" :
                              "bg-blue-100 text-blue-700"
                            )}>
                              {section.status}
                            </Badge>
                          )}
                          {isEmpty && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">
                              Empty
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {hasEmptySections && (
          <div className="mt-2 flex items-start gap-2 text-sm text-orange-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Some selected sections are empty and may appear blank in the export.</p>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div>
        <Label className="text-base font-semibold mb-3 block">Export Options</Label>
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="cover-page"
                checked={includeCoverPage}
                onCheckedChange={setIncludeCoverPage}
              />
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-slate-600" />
                <Label htmlFor="cover-page" className="cursor-pointer">
                  Include cover page with proposal summary
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="toc"
                checked={includeTableOfContents}
                onCheckedChange={setIncludeTableOfContents}
              />
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-slate-600" />
                <Label htmlFor="toc" className="cursor-pointer">
                  Include table of contents
                </Label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="watermark"
                checked={willHaveWatermark}
                disabled={true}
              />
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-orange-500" />
                <Label htmlFor="watermark" className="cursor-not-allowed text-slate-500">
                  Add DRAFT watermark (automatic based on approval status)
                </Label>
              </div>
            </div>

            {templates.length > 0 && (
              <div className="pt-3 border-t">
                <Label htmlFor="template" className="mb-2 block">
                  Template (Optional)
                </Label>
                <Select
                  value={selectedTemplate?.id || "default"}
                  onValueChange={(value) => {
                    if (value === "default") {
                      setSelectedTemplate(null);
                    } else {
                      setSelectedTemplate(templates.find(t => t.id === value));
                    }
                  }}
                >
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (No custom styling)</SelectItem>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.template_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <Button
        onClick={handleExport}
        disabled={selectedSectionIds.length === 0 || isExporting}
        className={cn(
          "w-full h-12 text-base font-semibold",
          willHaveWatermark ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"
        )}
      >
        {isExporting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating Document...
          </>
        ) : (
          <>
            <Download className="w-5 h-5 mr-2" />
            {willHaveWatermark ? "Export with DRAFT Watermark" : "Export Final Version"}
          </>
        )}
      </Button>

      {selectedSectionIds.length === 0 && (
        <p className="text-sm text-center text-slate-500">
          Please select at least one section to export
        </p>
      )}
    </div>
  );
}