import React from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * DragDropFileUpload Component
 * 
 * Handles file uploads with drag-and-drop functionality for Data Call checklist items.
 * Supports multiple file types including PDF, DOCX, images, and more.
 * 
 * Enhanced to support DOCX parsing for automatic data extraction when needed.
 */
export default function DragDropFileUpload({ 
  onFilesUploaded, 
  existingFiles = [],
  allowMultiple = true,
  acceptedTypes = ".pdf,.png,.jpg,.jpeg,.csv,.docx,.doc,.xlsx,.xls,.pptx,.ppt",
  maxSize = 50 * 1024 * 1024, // 50MB default
  showExtraction = false, // Whether to show AI extraction option for DOCX
  extractionSchema = null // Schema for AI extraction
}) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState([]);
  const fileInputRef = React.useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
    // Reset input
    e.target.value = '';
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    // Validate file count
    if (!allowMultiple && files.length > 1) {
      toast.error('Please upload only one file at a time');
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(f => f.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error(`File(s) too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return;
    }

    setIsUploading(true);
    const uploadedFiles = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        setUploadProgress(prev => [...prev, { name: file.name, progress: 0 }]);

        // Upload file
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // Check if this is a DOCX and extraction is enabled
        let extractedData = null;
        if (showExtraction && extractionSchema && 
            (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
             file.type === 'application/msword')) {
          
          toast.info(`Extracting data from ${file.name}...`);
          
          try {
            const extractionResult = await base44.functions.invoke('parseDocxFile', {
              file_url,
              json_schema: extractionSchema,
              extract_structured_data: true
            });

            if (extractionResult.status === 'success' && extractionResult.structured_data) {
              extractedData = extractionResult.structured_data;
              toast.success(`Data extracted from ${file.name}`);
            }
          } catch (extractError) {
            console.error('Extraction failed:', extractError);
            // Continue with upload even if extraction fails
          }
        }

        uploadedFiles.push({
          file_name: file.name,
          file_url,
          file_size: file.size,
          file_type: file.type,
          extracted_data: extractedData,
          uploaded_date: new Date().toISOString()
        });

        setUploadProgress(prev => 
          prev.map(p => p.name === file.name ? { ...p, progress: 100 } : p)
        );
      }

      // Call the callback with uploaded files
      onFilesUploaded(uploadedFiles);
      toast.success(`${files.length} file(s) uploaded successfully`);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
      setUploadProgress([]);
    }
  };

  const removeFile = (fileToRemove) => {
    const updatedFiles = existingFiles.filter(f => f.file_url !== fileToRemove.file_url);
    onFilesUploaded(updatedFiles);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-all",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
        )}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center",
            isDragging ? "bg-blue-100" : "bg-slate-100"
          )}>
            <Upload className={cn(
              "w-8 h-8",
              isDragging ? "text-blue-600" : "text-slate-600"
            )} />
          </div>
          
          <div>
            <p className="text-sm font-medium text-slate-900">
              {isDragging ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              or click to browse
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
            size="sm"
          >
            Choose Files
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            multiple={allowMultiple}
            onChange={handleFileInput}
            className="hidden"
          />

          <p className="text-xs text-slate-500">
            Supported: PDF, Word (DOCX/DOC), Excel, PowerPoint, Images, CSV
          </p>
          <p className="text-xs text-slate-500">
            Max size: {(maxSize / 1024 / 1024).toFixed(0)}MB per file
          </p>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{item.name}</p>
                <div className="w-full bg-blue-200 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Existing Files List */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Uploaded Files:</p>
          {existingFiles.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {file.file_name}
                  </p>
                  {file.file_size && (
                    <p className="text-xs text-slate-600">
                      {(file.file_size / 1024).toFixed(1)} KB
                    </p>
                  )}
                  {file.extracted_data && (
                    <p className="text-xs text-blue-600 mt-1">
                      ✨ AI extracted data available
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View
                </a>
                <button
                  onClick={() => removeFile(file)}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}