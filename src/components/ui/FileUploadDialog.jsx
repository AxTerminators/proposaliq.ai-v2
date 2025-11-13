import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, FileText, CheckCircle2, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * FileUploadDialog Component
 * 
 * Generic file upload dialog with optional AI extraction capabilities.
 * Used across the application for consistent file upload UX.
 * 
 * Enhanced to support DOCX parsing and data extraction.
 * 
 * @param {boolean} isOpen - Whether dialog is open
 * @param {function} onClose - Close handler
 * @param {function} onUploadComplete - Callback with uploaded file data
 * @param {string} title - Dialog title
 * @param {string} description - Dialog description
 * @param {boolean} allowAIExtraction - Whether to show AI extraction option
 * @param {object} extractionSchema - JSON schema for AI extraction
 * @param {string} acceptedTypes - Accepted file types (default includes DOCX)
 */
export default function FileUploadDialog({
  isOpen,
  onClose,
  onUploadComplete,
  title = "Upload File",
  description = "Upload a document to the system",
  allowAIExtraction = false,
  extractionSchema = null,
  acceptedTypes = ".pdf,.docx,.doc,.png,.jpg,.jpeg,.csv,.xlsx,.xls,.pptx,.txt",
  maxSizeMB = 50
}) {
  const [file, setFile] = React.useState(null);
  const [fileDescription, setFileDescription] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [enableExtraction, setEnableExtraction] = React.useState(allowAIExtraction);
  const fileInputRef = React.useRef(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error(`File too large. Maximum size is ${maxSizeMB}MB`);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Upload file
      toast.info('Uploading file...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      let extractedData = null;

      // Step 2: Extract data if enabled and schema provided
      if (enableExtraction && extractionSchema && 
          (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
           file.type === 'application/msword')) {
        
        toast.info('AI is extracting data from document...');
        
        try {
          const extractionResult = await base44.functions.invoke('parseDocxFile', {
            file_url,
            json_schema: extractionSchema,
            extract_structured_data: true
          });

          if (extractionResult.status === 'success' && extractionResult.structured_data) {
            extractedData = extractionResult.structured_data;
            toast.success('Data extracted successfully!');
          }
        } catch (extractError) {
          console.error('Extraction failed:', extractError);
          toast.warning('File uploaded but data extraction failed');
        }
      } else if (enableExtraction && extractionSchema && 
                 file.type === 'application/pdf') {
        // Use built-in extraction for PDF
        try {
          toast.info('AI is extracting data from PDF...');
          const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
            file_url,
            json_schema: extractionSchema
          });

          if (extractionResult.status === 'success' && extractionResult.output) {
            extractedData = extractionResult.output;
            toast.success('Data extracted successfully!');
          }
        } catch (extractError) {
          console.error('Extraction failed:', extractError);
          toast.warning('File uploaded but data extraction failed');
        }
      }

      // Return upload result
      const uploadResult = {
        file_name: file.name,
        file_url,
        file_size: file.size,
        file_type: file.type,
        description: fileDescription,
        extracted_data: extractedData,
        uploaded_date: new Date().toISOString()
      };

      onUploadComplete(uploadResult);
      toast.success('File uploaded successfully!');
      
      // Reset and close
      setFile(null);
      setFileDescription("");
      onClose();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Selection */}
          <div>
            <Label>Select File</Label>
            <div className="mt-2">
              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
                    "hover:border-blue-400 hover:bg-blue-50"
                  )}
                >
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">
                    Click to select a file
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    PDF, Word (DOCX), Excel, Images, CSV
                  </p>
                  <p className="text-xs text-slate-500">
                    Max {maxSizeMB}MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-600">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Optional Description */}
          <div>
            <Label>Description (Optional)</Label>
            <Textarea
              value={fileDescription}
              onChange={(e) => setFileDescription(e.target.value)}
              placeholder="Add a brief description of this file..."
              rows={2}
            />
          </div>

          {/* AI Extraction Option */}
          {allowAIExtraction && extractionSchema && file && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enable-extraction"
                  checked={enableExtraction}
                  onChange={(e) => setEnableExtraction(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="enable-extraction" className="text-sm font-medium text-purple-900 cursor-pointer">
                  ✨ Extract data with AI
                </label>
              </div>
              <p className="text-xs text-purple-700 mt-1 ml-6">
                AI will automatically extract structured data from your document
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}