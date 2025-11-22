import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Download, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Package,
  Zap
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function BatchExportDialog({ open, onOpenChange, organizationId }) {
  const [selectedProposals, setSelectedProposals] = useState([]);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [zipDownloadUrl, setZipDownloadUrl] = useState(null);
  const [exportResults, setExportResults] = useState(null);

  const { data: proposals } = useQuery({
    queryKey: ['proposals', organizationId],
    queryFn: () => organizationId ? base44.entities.Proposal.filter({ organization_id: organizationId }, '-created_date') : [],
    initialData: [],
    enabled: !!organizationId
  });

  const { data: templates } = useQuery({
    queryKey: ['export-templates', organizationId],
    queryFn: () => organizationId ? base44.entities.ExportTemplate.filter({ organization_id: organizationId }, '-is_default,-created_date') : [],
    initialData: [],
    enabled: !!organizationId
  });

  const eligibleProposals = proposals.filter(p => 
    p.status === 'submitted' || p.status === 'in_progress' || p.status === 'won' || p.status === 'lost'
  );

  const handleBatchExport = async () => {
    if (selectedProposals.length === 0) {
      toast.error("Please select at least one proposal to export");
      return;
    }

    setIsExporting(true);
    setExportComplete(false);
    setExportResults(null);
    setZipDownloadUrl(null);

    try {
      const response = await base44.functions.invoke('batchExportProposals', {
        proposalIds: selectedProposals,
        format: exportFormat,
        templateId: selectedTemplate,
        options: {
          includeCoverPage,
          includeTableOfContents
        }
      });

      if (response.data.success) {
        setExportResults(response.data);
        setZipDownloadUrl(response.data.zip_download_url);
        setExportComplete(true);
        toast.success(`Successfully exported ${response.data.exports_created} proposals!`);
      } else {
        throw new Error('Export failed');
      }

    } catch (error) {
      console.error('Batch export error:', error);
      toast.error('Failed to export proposals: ' + (error.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-purple-600" />
            Batch Export Proposals
          </DialogTitle>
          <DialogDescription>
            Export multiple proposals at once with consistent formatting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="docx">DOCX (Word)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Options */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
            <label className="text-sm font-medium">Export Options</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={includeCoverPage}
                  onCheckedChange={setIncludeCoverPage}
                />
                <span className="text-sm text-slate-700">Include Cover Page</span>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={includeTableOfContents}
                  onCheckedChange={setIncludeTableOfContents}
                />
                <span className="text-sm text-slate-700">Include Table of Contents</span>
              </div>
            </div>
          </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Template (Optional)</label>
              <Select 
                value={selectedTemplate || "none"} 
                onValueChange={(value) => setSelectedTemplate(value === "none" ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No template (use default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template (use default)</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.template_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Proposal Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Select Proposals</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedProposals.length === eligibleProposals.length) {
                    setSelectedProposals([]);
                  } else {
                    setSelectedProposals(eligibleProposals.map(p => p.id));
                  }
                }}
              >
                {selectedProposals.length === eligibleProposals.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg p-4">
              <div className="space-y-2">
                {eligibleProposals.map((proposal) => (
                  <Card key={proposal.id} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedProposals.includes(proposal.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProposals([...selectedProposals, proposal.id]);
                            } else {
                              setSelectedProposals(selectedProposals.filter(id => id !== proposal.id));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{proposal.proposal_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="capitalize">
                              {proposal.status.replace('_', ' ')}
                            </Badge>
                            {proposal.agency_name && (
                              <span className="text-xs text-slate-600">{proposal.agency_name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {eligibleProposals.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No proposals available for export
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Progress */}
          {isExporting && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3 text-blue-600 py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
                <div>
                  <p className="font-semibold">Generating batch export...</p>
                  <p className="text-sm text-slate-600">Processing {selectedProposals.length} proposals</p>
                </div>
              </div>
            </div>
          )}

          {/* Export Complete */}
          {exportComplete && exportResults && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold text-green-900">Batch Export Complete!</p>
                  <p className="text-sm text-green-800">
                    Successfully exported {exportResults.exports_created} of {exportResults.total_proposals} proposals
                  </p>
                  <p className="text-xs text-green-700">
                    ZIP file size: {(exportResults.zip_file_size_bytes / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {zipDownloadUrl && (
                    <Button
                      size="sm"
                      className="mt-3 bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = zipDownloadUrl;
                        link.download = exportResults.zip_file_name;
                        link.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download ZIP File
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              setExportResults(null);
              setSelectedProposals([]);
              setExportComplete(false);
              setZipDownloadUrl(null);
            }}
          >
            {exportComplete ? 'Close' : 'Cancel'}
          </Button>
          {!exportComplete && (
            <Button
              onClick={handleBatchExport}
              disabled={isExporting || selectedProposals.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  Export {selectedProposals.length} Proposal{selectedProposals.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}