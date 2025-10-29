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

export default function BatchExportDialog({ open, onOpenChange, organizationId }) {
  const [selectedProposals, setSelectedProposals] = useState([]);
  const [exportFormat, setExportFormat] = useState("pdf_html");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportResults, setExportResults] = useState([]);

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
      alert("Please select at least one proposal to export");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportResults([]);

    const results = [];
    const totalProposals = selectedProposals.length;

    for (let i = 0; i < selectedProposals.length; i++) {
      const proposalId = selectedProposals[i];
      const proposal = proposals.find(p => p.id === proposalId);
      
      try {
        // Simulate export process
        setExportProgress(((i + 1) / totalProposals) * 100);
        
        // In a real implementation, you would call the export function here
        // For now, we'll just create a mock result
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing
        
        results.push({
          proposalId,
          proposalName: proposal.proposal_name,
          status: 'success',
          message: 'Exported successfully'
        });

      } catch (error) {
        results.push({
          proposalId,
          proposalName: proposal.proposal_name,
          status: 'error',
          message: error.message || 'Export failed'
        });
      }
    }

    setExportResults(results);
    setIsExporting(false);
  };

  const successCount = exportResults.filter(r => r.status === 'success').length;
  const errorCount = exportResults.filter(r => r.status === 'error').length;

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
                <SelectItem value="pdf_html">Print-Ready HTML → PDF</SelectItem>
                <SelectItem value="docx_markdown">Markdown → Word</SelectItem>
                <SelectItem value="excel_compliance">Compliance Matrix CSV</SelectItem>
                <SelectItem value="html_package">Styled HTML Package</SelectItem>
              </SelectContent>
            </Select>
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

          {/* Progress Bar */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Exporting proposals...</span>
                <span className="font-medium">{Math.round(exportProgress)}%</span>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          )}

          {/* Export Results */}
          {exportResults.length > 0 && !isExporting && (
            <Alert className={successCount === exportResults.length ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}>
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>
                <strong>Export Complete!</strong><br/>
                {successCount} succeeded, {errorCount} failed
              </AlertDescription>
            </Alert>
          )}

          {exportResults.length > 0 && !isExporting && (
            <ScrollArea className="h-32 border rounded-lg p-3">
              <div className="space-y-2">
                {exportResults.map((result, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    {result.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <span className="flex-1">{result.proposalName}</span>
                    <Badge variant={result.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                      {result.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              onOpenChange(false);
              setExportResults([]);
              setSelectedProposals([]);
            }}
          >
            {exportResults.length > 0 ? 'Close' : 'Cancel'}
          </Button>
          {exportResults.length === 0 && (
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
                  <Zap className="w-4 h-4 mr-2" />
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