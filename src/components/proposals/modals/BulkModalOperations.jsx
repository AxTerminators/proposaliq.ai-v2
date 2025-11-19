import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';

/**
 * Phase 3.2: Bulk Modal Operations Component
 * 
 * Enables bulk import/export of modal data via CSV/JSON.
 * Useful for populating multiple records quickly or migrating data.
 */
export default function BulkModalOperations({ isOpen, onClose, config }) {
  const [mode, setMode] = useState(null); // 'import' or 'export'
  const [bulkData, setBulkData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const handleExport = useCallback(async () => {
    setIsProcessing(true);
    try {
      // Fetch all records for this modal type
      const records = await base44.entities[config.targetEntity].filter({
        organization_id: config.organizationId,
        proposal_id: config.proposalId
      });

      if (records.length === 0) {
        toast.info('No records to export');
        return;
      }

      // Convert to CSV format
      const fields = config.fields.map(f => f.name);
      const csv = [
        fields.join(','), // Header
        ...records.map(record => 
          fields.map(field => {
            const value = record[field];
            // Handle complex values
            if (typeof value === 'object') return JSON.stringify(value);
            if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
            return value || '';
          }).join(',')
        )
      ].join('\n');

      // Download as file
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.title}_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${records.length} records`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [config]);

  const handleImport = useCallback(async () => {
    if (!bulkData.trim()) {
      toast.error('Please paste CSV or JSON data');
      return;
    }

    setIsProcessing(true);
    setResults(null);

    try {
      let records = [];

      // Try parsing as JSON first
      try {
        const parsed = JSON.parse(bulkData);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // Parse as CSV
        const lines = bulkData.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        records = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const record = {};
          headers.forEach((header, i) => {
            record[header] = values[i];
          });
          return record;
        });
      }

      if (records.length === 0) {
        toast.error('No valid records found');
        setIsProcessing(false);
        return;
      }

      // Validate and import records
      const importResults = {
        total: records.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const record of records) {
        try {
          // Add required metadata
          const enrichedRecord = {
            ...record,
            organization_id: config.organizationId,
            proposal_id: config.proposalId,
            created_via_bulk_import: true
          };

          await base44.entities[config.targetEntity].create(enrichedRecord);
          importResults.successful++;
        } catch (error) {
          importResults.failed++;
          importResults.errors.push({
            record,
            error: error.message
          });
        }
      }

      setResults(importResults);

      if (importResults.successful > 0) {
        toast.success(`Imported ${importResults.successful} of ${importResults.total} records`);
        if (config.onImportComplete) {
          config.onImportComplete();
        }
      } else {
        toast.error('Import failed for all records');
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [bulkData, config]);

  const handleDownloadTemplate = () => {
    const fields = config.fields.map(f => f.name);
    const csv = fields.join(',') + '\n' + fields.map(() => '').join(',');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.title}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Template downloaded');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-slate-600" />
            Bulk Operations
          </DialogTitle>
          <p className="text-sm text-slate-500">
            Import or export data in bulk
          </p>
        </DialogHeader>

        {!mode ? (
          <div className="grid md:grid-cols-2 gap-4 py-4">
            <Card 
              className="border-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
              onClick={() => setMode('import')}
            >
              <CardContent className="p-6 text-center">
                <Upload className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold text-lg mb-2">Import Data</h3>
                <p className="text-sm text-slate-600">
                  Upload CSV or JSON to create multiple records at once
                </p>
              </CardContent>
            </Card>

            <Card 
              className="border-2 cursor-pointer hover:border-green-400 hover:bg-green-50/50 transition-all"
              onClick={() => setMode('export')}
            >
              <CardContent className="p-6 text-center">
                <Download className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <h3 className="font-semibold text-lg mb-2">Export Data</h3>
                <p className="text-sm text-slate-600">
                  Download existing records as CSV for backup or editing
                </p>
              </CardContent>
            </Card>
          </div>
        ) : mode === 'export' ? (
          <div className="py-4 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900">
                Click Export to download all existing records as a CSV file.
              </p>
            </div>

            <Button
              onClick={handleExport}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Export to CSV
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Import Instructions:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Paste CSV data with headers matching field names</li>
                  <li>Or paste JSON array of objects</li>
                  <li>Download template for correct format</li>
                </ul>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>

            <div className="space-y-2">
              <Label>Paste Data (CSV or JSON)</Label>
              <Textarea
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                placeholder="Paste CSV or JSON data here..."
                rows={12}
                className="font-mono text-xs"
              />
            </div>

            {results && (
              <Card className={cn(
                "border-2",
                results.failed === 0 ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {results.failed === 0 ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-green-600 text-white">
                          {results.successful} Successful
                        </Badge>
                        {results.failed > 0 && (
                          <Badge className="bg-red-600 text-white">
                            {results.failed} Failed
                          </Badge>
                        )}
                      </div>
                      
                      {results.errors.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-slate-900">Errors:</p>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {results.errors.slice(0, 5).map((err, idx) => (
                              <div key={idx} className="text-xs text-red-700 bg-white p-2 rounded border">
                                {err.error}
                              </div>
                            ))}
                            {results.errors.length > 5 && (
                              <p className="text-xs text-slate-600">
                                + {results.errors.length - 5} more errors
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handleImport}
              disabled={isProcessing || !bulkData.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          </div>
        )}

        <DialogFooter>
          {mode && (
            <Button variant="outline" onClick={() => setMode(null)}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}