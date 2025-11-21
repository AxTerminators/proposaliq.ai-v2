import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, CheckCircle2, AlertTriangle, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * BulkImportDialog Component
 * 
 * Handles bulk import of past performance records from CSV
 * 
 * Workflow:
 * 1. Upload CSV file
 * 2. Parse and validate
 * 3. Preview records with errors
 * 4. Confirm and import
 * 
 * Props:
 * - isOpen: Dialog open state
 * - onClose: Close callback
 * - organizationId: Organization ID
 * - onImportComplete: Callback with import results
 */
export default function BulkImportDialog({ isOpen, onClose, organizationId, onImportComplete }) {
    const [file, setFile] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [importing, setImporting] = useState(false);
    const [parseResult, setParseResult] = useState(null);
    const [importProgress, setImportProgress] = useState(0);
    const [step, setStep] = useState('upload'); // upload, preview, importing, complete

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.csv')) {
                toast.error('Only CSV files are supported');
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleParse = async () => {
        if (!file) return;

        setParsing(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('organization_id', organizationId);

            const result = await base44.functions.invoke('parseBulkPastPerformance', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setParseResult(result.data);
            setStep('preview');
            
            if (result.data.total_valid === 0) {
                toast.error('No valid records found in file');
            } else {
                toast.success(`Found ${result.data.total_valid} valid records`);
            }
        } catch (error) {
            console.error('Error parsing file:', error);
            toast.error('Failed to parse file: ' + error.message);
        } finally {
            setParsing(false);
        }
    };

    const handleImport = async () => {
        if (!parseResult || parseResult.parsed_records.length === 0) return;

        setImporting(true);
        setStep('importing');
        
        try {
            const records = parseResult.parsed_records;
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (let i = 0; i < records.length; i++) {
                try {
                    const record = await base44.entities.PastPerformanceRecord.create(records[i]);
                    
                    // Trigger RAG ingestion in background
                    base44.functions.invoke('ingestPastPerformanceToRAG', { 
                        record_id: record.id 
                    }).catch(err => console.error('RAG ingestion failed:', err));
                    
                    successCount++;
                } catch (error) {
                    errorCount++;
                    errors.push({
                        title: records[i].title,
                        error: error.message
                    });
                }
                
                setImportProgress(((i + 1) / records.length) * 100);
            }

            setStep('complete');
            
            if (onImportComplete) {
                onImportComplete({ successCount, errorCount, errors });
            }

            toast.success(`Import complete: ${successCount} records created`);
            if (errorCount > 0) {
                toast.error(`${errorCount} records failed to import`);
            }
        } catch (error) {
            console.error('Error importing records:', error);
            toast.error('Import failed: ' + error.message);
            setStep('preview');
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        const template = `title,customer_agency,contract_number,contract_type,contract_value,pop_start_date,pop_end_date,role,project_description,key_accomplishments,work_scope_tags
"Federal IT Support Contract","Department of Defense","FA8732-20-C-0001","FFP",5000000,2020-01-01,2023-12-31,prime,"Provided comprehensive IT support services","Achieved 99.9% uptime, Reduced costs by 15%","IT Support, Federal"
"State Infrastructure Project","State of California DOT","CA-DOT-2019-456","T&M",2500000,2019-06-01,2021-05-31,subcontractor,"Highway infrastructure improvements","Completed 6 months ahead of schedule","Infrastructure, State/Local"`;
        
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'past_performance_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success('Template downloaded');
    };

    const handleReset = () => {
        setFile(null);
        setParseResult(null);
        setImportProgress(0);
        setStep('upload');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Bulk Import Past Performance</DialogTitle>
                    <DialogDescription>
                        Import multiple past performance records from a CSV file
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Upload */}
                {step === 'upload' && (
                    <div className="space-y-6">
                        <Card className="p-6 border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                    <Upload className="w-8 h-8 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
                                    <p className="text-sm text-slate-600 mb-4">
                                        Select a CSV file containing your past performance records
                                    </p>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="bulk-upload"
                                    />
                                    <label htmlFor="bulk-upload">
                                        <Button variant="outline" asChild>
                                            <span>
                                                <FileText className="w-4 h-4 mr-2" />
                                                Choose File
                                            </span>
                                        </Button>
                                    </label>
                                    {file && (
                                        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                                            <p className="text-sm font-medium text-slate-900">
                                                Selected: {file.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        <Alert>
                            <AlertDescription>
                                <div className="space-y-2">
                                    <p className="font-semibold">Required columns:</p>
                                    <ul className="text-sm space-y-1 ml-4 list-disc">
                                        <li>title (or project_title)</li>
                                        <li>customer_agency (or agency)</li>
                                    </ul>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={handleDownloadTemplate}
                                        className="p-0 h-auto"
                                    >
                                        <Download className="w-4 h-4 mr-1" />
                                        Download CSV Template
                                    </Button>
                                </div>
                            </AlertDescription>
                        </Alert>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleParse}
                                disabled={!file || parsing}
                            >
                                {parsing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Parsing...
                                    </>
                                ) : (
                                    'Parse File'
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Preview */}
                {step === 'preview' && parseResult && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="p-4 bg-green-50 border-green-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-900">Valid Records</span>
                                </div>
                                <p className="text-2xl font-bold text-green-900">{parseResult.total_valid}</p>
                            </Card>
                            <Card className="p-4 bg-red-50 border-red-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className="w-4 h-4 text-red-600" />
                                    <span className="text-sm font-medium text-red-900">Invalid Records</span>
                                </div>
                                <p className="text-2xl font-bold text-red-900">{parseResult.total_invalid}</p>
                            </Card>
                            <Card className="p-4 bg-blue-50 border-blue-200">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-900">Total Rows</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-900">{parseResult.total_rows}</p>
                            </Card>
                        </div>

                        {/* Validation Errors */}
                        {parseResult.validation_errors.length > 0 && (
                            <Card className="p-4 border-2 border-amber-200 bg-amber-50">
                                <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    Validation Errors ({parseResult.validation_errors.length})
                                </h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {parseResult.validation_errors.map((err, idx) => (
                                        <div key={idx} className="text-sm bg-white p-3 rounded border border-amber-200">
                                            <p className="font-medium text-slate-900">Row {err.row}: {err.title}</p>
                                            <ul className="mt-1 ml-4 list-disc text-amber-700">
                                                {err.errors.map((e, i) => (
                                                    <li key={i}>{e}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Valid Records Preview */}
                        {parseResult.parsed_records.length > 0 && (
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3">
                                    Valid Records Preview (showing first 5)
                                </h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {parseResult.parsed_records.slice(0, 5).map((record, idx) => (
                                        <Card key={idx} className="p-3 bg-slate-50">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium text-slate-900">{record.title}</p>
                                                    <p className="text-sm text-slate-600">{record.customer_agency}</p>
                                                </div>
                                                {record.contract_value && (
                                                    <Badge variant="secondary">
                                                        ${(record.contract_value / 1000000).toFixed(1)}M
                                                    </Badge>
                                                )}
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t">
                            <Button variant="outline" onClick={handleReset}>
                                Start Over
                            </Button>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={parseResult.total_valid === 0}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    Import {parseResult.total_valid} Records
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Importing */}
                {step === 'importing' && (
                    <div className="space-y-6 py-8">
                        <div className="text-center space-y-4">
                            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto" />
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Importing Records...</h3>
                                <p className="text-sm text-slate-600">
                                    Please wait while we create your records
                                </p>
                            </div>
                            <div className="max-w-md mx-auto">
                                <Progress value={importProgress} className="h-2" />
                                <p className="text-sm text-slate-600 mt-2">
                                    {Math.round(importProgress)}% complete
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Complete */}
                {step === 'complete' && (
                    <div className="space-y-6 py-8">
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
                                <p className="text-sm text-slate-600">
                                    Your past performance records have been imported
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-center gap-3">
                            <Button variant="outline" onClick={handleReset}>
                                Import More
                            </Button>
                            <Button onClick={onClose}>
                                Done
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}