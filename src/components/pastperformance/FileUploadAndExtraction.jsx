import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * FileUploadAndExtraction Component
 * Handles document upload, triggers AI parsing via backend function, and displays extraction status
 * 
 * Props:
 * - recordType: 'general_pp' or 'cpars'
 * - onExtractionComplete: callback with extracted data
 * - onManualEntry: callback to skip AI and enter manually
 */
export default function FileUploadAndExtraction({ recordType, onExtractionComplete, onManualEntry }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [error, setError] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Handle file selection
    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // Validate file type
        const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
        const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            setError(`Unsupported file type. Please upload PDF, DOCX, or TXT files.`);
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (selectedFile.size > maxSize) {
            setError('File size exceeds 10MB limit. Please upload a smaller file.');
            return;
        }

        setFile(selectedFile);
        setError(null);
    };

    // Handle file upload and AI extraction
    const handleUploadAndExtract = async () => {
        if (!file) return;

        setUploading(true);
        setExtracting(false);
        setError(null);
        setUploadProgress(0);

        try {
            // Step 1: Upload file to storage
            setUploadProgress(30);
            const uploadResult = await base44.integrations.Core.UploadFile({ file });
            
            if (!uploadResult.file_url) {
                throw new Error('File upload failed - no URL returned');
            }

            setUploadProgress(50);
            setUploading(false);
            setExtracting(true);

            // Step 2: Trigger AI extraction via backend function
            const extractionResult = await base44.functions.invoke('parsePastPerformanceDocument', {
                file_url: uploadResult.file_url,
                record_type: recordType
            });

            setUploadProgress(100);

            // Check if extraction was successful
            if (extractionResult.data?.success === false) {
                throw new Error(extractionResult.data?.error || 'Extraction failed');
            }

            // Pass extracted data to parent component
            if (extractionResult.data?.data) {
                onExtractionComplete(extractionResult.data.data);
            } else {
                throw new Error('No data returned from extraction');
            }

        } catch (err) {
            console.error('Upload/Extraction error:', err);
            setError(err.message || 'Failed to process document. Please try manual entry.');
            setExtracting(false);
            setUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload Document
                </CardTitle>
                <CardDescription>
                    Upload a {recordType === 'cpars' ? 'CPARS evaluation' : 'past performance reference'} document.
                    <span className="font-semibold text-blue-600"> PDF, DOCX (fully supported), and TXT formats accepted.</span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* File Input */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                        type="file"
                        id="pp-file-upload"
                        accept=".pdf,.docx,.doc,.txt"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploading || extracting}
                    />
                    <label
                        htmlFor="pp-file-upload"
                        className={`cursor-pointer ${(uploading || extracting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <FileText className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                        {file ? (
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-slate-900">{file.name}</p>
                                <p className="text-xs text-slate-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm font-medium text-slate-700">
                                    Click to upload or drag and drop
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    PDF, DOCX, or TXT (Max 10MB)
                                </p>
                            </div>
                        )}
                    </label>
                </div>

                {/* Upload Progress */}
                {(uploading || extracting) && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {uploading && 'Uploading document...'}
                            {extracting && 'AI is extracting data from your document...'}
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            This may take 10-30 seconds depending on document size
                        </p>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {error}
                            <Button
                                variant="link"
                                size="sm"
                                onClick={onManualEntry}
                                className="ml-2 h-auto p-0 text-red-600"
                            >
                                Enter data manually instead
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Button
                        onClick={handleUploadAndExtract}
                        disabled={!file || uploading || extracting}
                        className="flex-1"
                    >
                        {(uploading || extracting) ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Upload & Extract Data
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onManualEntry}
                        disabled={uploading || extracting}
                    >
                        Manual Entry
                    </Button>
                </div>

                {/* Info Message */}
                <Alert>
                    <AlertDescription className="text-xs">
                        <strong>AI Auto-fill:</strong> We'll automatically extract key information from your document.
                        You can review and edit all fields before saving.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}