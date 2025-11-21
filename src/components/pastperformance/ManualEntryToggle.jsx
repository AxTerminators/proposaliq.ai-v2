import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FileUp, Edit3 } from 'lucide-react';

/**
 * ManualEntryToggle Component
 * Simple toggle to switch between AI extraction and manual entry mode
 * 
 * Props:
 * - onToggleToUpload: callback to switch to upload mode
 * - onToggleToManual: callback to switch to manual entry mode
 * - currentMode: 'upload' or 'manual'
 */
export default function ManualEntryToggle({ onToggleToUpload, onToggleToManual, currentMode }) {
    return (
        <Alert className="mb-4">
            <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {currentMode === 'upload' ? (
                        <>
                            <FileUp className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">
                                <strong>AI Auto-fill Mode:</strong> Upload a document to extract data automatically
                            </span>
                        </>
                    ) : (
                        <>
                            <Edit3 className="w-4 h-4 text-slate-600" />
                            <span className="text-sm">
                                <strong>Manual Entry Mode:</strong> Enter all information manually
                            </span>
                        </>
                    )}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={currentMode === 'upload' ? onToggleToManual : onToggleToUpload}
                >
                    {currentMode === 'upload' ? (
                        <>
                            <Edit3 className="w-4 h-4 mr-2" />
                            Switch to Manual
                        </>
                    ) : (
                        <>
                            <FileUp className="w-4 h-4 mr-2" />
                            Switch to Upload
                        </>
                    )}
                </Button>
            </AlertDescription>
        </Alert>
    );
}