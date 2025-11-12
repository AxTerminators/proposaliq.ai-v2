import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, Table, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { logDataCallAction, logBulkDataCallAction, DataCallAuditActions } from "./DataCallAuditLogger";

export default function DataCallExportDialog({ 
  isOpen, 
  onClose, 
  dataCall,
  selectedDataCalls = [] // For batch export
}) {
  const [exportFormat, setExportFormat] = useState('pdf');
  const [options, setOptions] = useState({
    includeFiles: true,
    includeActivity: true,
    includeComments: true,
    includeMetadata: true
  });

  const isBatchExport = selectedDataCalls.length > 0;
  const itemsToExport = isBatchExport ? selectedDataCalls : (dataCall ? [dataCall] : []);

  const exportMutation = useMutation({
    mutationFn: async () => {
      // Get current user for audit logging
      const user = await base44.auth.me();
      
      if (exportFormat === 'pdf') {
        // Generate PDF
        const response = await base44.functions.invoke('exportDataCallToPDF', {
          data_call_ids: itemsToExport.map(dc => dc.id),
          options: options
        });

        // Download the file
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = isBatchExport 
          ? `data-calls-export-${new Date().toISOString().split('T')[0]}.pdf`
          : `${dataCall.request_title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        // Generate Excel
        const response = await base44.functions.invoke('exportDataCallToExcel', {
          data_call_ids: itemsToExport.map(dc => dc.id),
          options: options
        });

        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = isBatchExport 
          ? `data-calls-export-${new Date().toISOString().split('T')[0]}.xlsx`
          : `${dataCall.request_title.replace(/[^a-z0-9]/gi, '_')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        // Log audit action
        if (isBatchExport) {
          await logBulkDataCallAction(
            exportFormat === 'pdf' ? DataCallAuditActions.BATCH_EXPORTED : DataCallAuditActions.BATCH_EXPORTED,
            selectedDataCalls.map(dc => dc.id),
            user,
            { export_format: exportFormat, options }
          );
        } else if (dataCall) {
          await logDataCallAction(
            exportFormat === 'pdf' ? DataCallAuditActions.EXPORTED_PDF : DataCallAuditActions.EXPORTED_EXCEL,
            dataCall,
            user,
            { options }
          );
        }
      }
    },
    onSuccess: () => {
      toast.success(`${itemsToExport.length} data call(s) exported successfully!`);
      onClose();
    },
    onError: (error) => {
      toast.error('Export failed: ' + error.message);
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            Export Data Call{itemsToExport.length > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isBatchExport && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <CheckCircle2 className="w-4 h-4 inline mr-1" />
                Exporting {selectedDataCalls.length} data calls
              </p>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <Label className="mb-3 block">Export Format</Label>
            <div className="grid grid-cols-2 gap-3">
              <Card
                className={cn(
                  "cursor-pointer border-2 transition-all",
                  exportFormat === 'pdf' 
                    ? "border-blue-600 bg-blue-50" 
                    : "border-slate-200 hover:border-blue-300"
                )}
                onClick={() => setExportFormat('pdf')}
              >
                <CardContent className="p-4 text-center">
                  <FileText className={cn(
                    "w-8 h-8 mx-auto mb-2",
                    exportFormat === 'pdf' ? "text-blue-600" : "text-slate-400"
                  )} />
                  <p className="font-semibold text-sm">PDF Report</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Formatted document
                  </p>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer border-2 transition-all",
                  exportFormat === 'excel' 
                    ? "border-green-600 bg-green-50" 
                    : "border-slate-200 hover:border-green-300"
                )}
                onClick={() => setExportFormat('excel')}
              >
                <CardContent className="p-4 text-center">
                  <Table className={cn(
                    "w-8 h-8 mx-auto mb-2",
                    exportFormat === 'excel' ? "text-green-600" : "text-slate-400"
                  )} />
                  <p className="font-semibold text-sm">Excel Sheet</p>
                  <p className="text-xs text-slate-600 mt-1">
                    Structured data
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Export Options */}
          <div>
            <Label className="mb-3 block">Include in Export</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeFiles"
                  checked={options.includeFiles}
                  onCheckedChange={(checked) => 
                    setOptions({...options, includeFiles: checked})
                  }
                />
                <Label htmlFor="includeFiles" className="cursor-pointer font-normal">
                  Uploaded files list
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeActivity"
                  checked={options.includeActivity}
                  onCheckedChange={(checked) => 
                    setOptions({...options, includeActivity: checked})
                  }
                />
                <Label htmlFor="includeActivity" className="cursor-pointer font-normal">
                  Activity timeline
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeComments"
                  checked={options.includeComments}
                  onCheckedChange={(checked) => 
                    setOptions({...options, includeComments: checked})
                  }
                />
                <Label htmlFor="includeComments" className="cursor-pointer font-normal">
                  Team comments
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeMetadata"
                  checked={options.includeMetadata}
                  onCheckedChange={(checked) => 
                    setOptions({...options, includeMetadata: checked})
                  }
                />
                <Label htmlFor="includeMetadata" className="cursor-pointer font-normal">
                  Metadata (created by, dates, etc.)
                </Label>
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={exportMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className={cn(
                exportFormat === 'pdf' 
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700"
              )}
            >
              {exportMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}