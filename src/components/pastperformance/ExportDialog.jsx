import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { FileText, Download, FileType, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * ExportDialog Component
 * 
 * Allows users to export selected past performance records
 * Supports PDF and Word formats with customization options
 */
export default function ExportDialog({ isOpen, onClose, selectedRecords = [] }) {
    const [exportFormat, setExportFormat] = useState('pdf');
    const [includeNarratives, setIncludeNarratives] = useState(true);
    const [includeCPARSDetails, setIncludeCPARSDetails] = useState(true);
    const [exportStyle, setExportStyle] = useState('detailed'); // detailed | summary
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (selectedRecords.length === 0) {
            toast.error('No records selected for export');
            return;
        }

        setExporting(true);

        try {
            const recordIds = selectedRecords.map(r => r.id);

            if (exportFormat === 'pdf') {
                // Export to PDF
                const response = await base44.functions.invoke('exportPastPerformanceToPDF', {
                    record_ids: recordIds,
                    format: exportStyle,
                    include_narratives: includeNarratives
                });

                // Create blob and download
                const blob = new Blob([response.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `past-performance-${Date.now()}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast.success('PDF exported successfully');
            } else if (exportFormat === 'word') {
                // Export to Word (HTML)
                const response = await base44.functions.invoke('exportPastPerformanceToWord', {
                    record_ids: recordIds,
                    format: exportStyle,
                    include_cpars_details: includeCPARSDetails
                });

                // Download HTML file (can be opened in Word)
                const blob = new Blob([response.data.html], { type: 'text/html' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.data.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                toast.success('Word document exported successfully (open .html in Word to save as .docx)');
            }

            onClose();
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export: ' + error.message);
        } finally {
            setExporting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Export Past Performance Records</DialogTitle>
                    <DialogDescription>
                        Export {selectedRecords.length} selected record{selectedRecords.length !== 1 ? 's' : ''} to PDF or Word format
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Format Selection */}
                    <div>
                        <Label className="mb-3 block">Export Format</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <Card
                                className={cn(
                                    "p-4 cursor-pointer transition-all border-2",
                                    exportFormat === 'pdf' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                                )}
                                onClick={() => setExportFormat('pdf')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">PDF Document</h4>
                                        <p className="text-sm text-slate-600">Professional report format</p>
                                    </div>
                                </div>
                            </Card>

                            <Card
                                className={cn(
                                    "p-4 cursor-pointer transition-all border-2",
                                    exportFormat === 'word' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'
                                )}
                                onClick={() => setExportFormat('word')}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <FileType className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">Word Document</h4>
                                        <p className="text-sm text-slate-600">Editable proposal format</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* Export Style */}
                    <div>
                        <Label className="mb-3 block">Export Style</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant={exportStyle === 'detailed' ? 'default' : 'outline'}
                                onClick={() => setExportStyle('detailed')}
                                className="justify-start h-auto py-3"
                            >
                                <div className="text-left">
                                    <div className="font-semibold">Detailed</div>
                                    <div className="text-xs opacity-80">Full narratives and descriptions</div>
                                </div>
                            </Button>
                            <Button
                                variant={exportStyle === 'summary' ? 'default' : 'outline'}
                                onClick={() => setExportStyle('summary')}
                                className="justify-start h-auto py-3"
                            >
                                <div className="text-left">
                                    <div className="font-semibold">Summary</div>
                                    <div className="text-xs opacity-80">Key facts and metrics only</div>
                                </div>
                            </Button>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        <Label>Export Options</Label>
                        <div className="space-y-3">
                            {exportFormat === 'pdf' && (
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="includeNarratives"
                                        checked={includeNarratives}
                                        onCheckedChange={setIncludeNarratives}
                                    />
                                    <Label htmlFor="includeNarratives" className="cursor-pointer">
                                        Include project narratives and accomplishments
                                    </Label>
                                </div>
                            )}
                            {exportFormat === 'word' && (
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="includeCPARS"
                                        checked={includeCPARSDetails}
                                        onCheckedChange={setIncludeCPARSDetails}
                                    />
                                    <Label htmlFor="includeCPARS" className="cursor-pointer">
                                        Include detailed CPARS ratings table
                                    </Label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selected Records Preview */}
                    <div>
                        <Label className="mb-2 block">Selected Records ({selectedRecords.length})</Label>
                        <div className="max-h-40 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-lg border">
                            {selectedRecords.map((record) => (
                                <div key={record.id} className="flex items-start gap-2">
                                    <Badge variant="secondary" className="mt-0.5">
                                        {record.record_type === 'cpars' ? 'CPARS' : 'General'}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">
                                            {record.title}
                                        </p>
                                        <p className="text-xs text-slate-600 truncate">
                                            {record.customer_agency}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={onClose} disabled={exporting}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleExport}
                            disabled={exporting || selectedRecords.length === 0}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {exporting ? (
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