import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Upload, 
  X, 
  Loader2, 
  CheckCircle2, 
  FileText, 
  Image as ImageIcon, 
  File,
  Eye,
  Download,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

/**
 * Phase 2.1: Enhanced File Upload Component
 * 
 * Features:
 * - Drag-and-drop file upload
 * - Client-side file preview before upload
 * - Support for multiple file types (images, PDFs, docs)
 * - Progress indication
 * - File validation
 * - Preview modal for uploaded files
 */
export default function EnhancedFileUpload({
  label,
  accept = "*/*",
  maxSizeMB = 50,
  onUploadComplete,
  currentFiles = [],
  multiple = false,
  showPreviewBeforeUpload = true,
  className
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState(currentFiles);
  const [previewFile, setPreviewFile] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);
  const fileInputRef = React.useRef(null);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, [multiple, maxSizeMB, showPreviewBeforeUpload]);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    handleFileSelection(files);
    e.target.value = '';
  }, [multiple, maxSizeMB, showPreviewBeforeUpload]);

  const handleFileSelection = (files) => {
    if (files.length === 0) return;

    // Validate file count
    if (!multiple && files.length > 1) {
      toast.error('Please select only one file');
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(f => f.size > maxSizeMB * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error(`File(s) too large. Maximum size is ${maxSizeMB}MB per file`);
      return;
    }

    // Show preview if enabled
    if (showPreviewBeforeUpload) {
      setPendingFiles(files);
    } else {
      uploadFiles(files);
    }
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    setPendingFiles([]);
    const results = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(((i + 0.5) / files.length) * 100);

        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const uploadResult = await base44.integrations.Core.UploadFile({
          file: fileBytes
        });

        results.push({
          file_url: uploadResult.file_url,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type
        });

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      const newFiles = multiple ? [...uploadedFiles, ...results] : results;
      setUploadedFiles(newFiles);
      
      toast.success(`${results.length} file${results.length > 1 ? 's' : ''} uploaded successfully`);
      
      if (onUploadComplete) {
        onUploadComplete(multiple ? newFiles : results[0]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemove = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    
    if (onUploadComplete) {
      onUploadComplete(multiple ? newFiles : null);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-600" />;
    }
    if (fileType === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-600" />;
    }
    return <File className="w-5 h-5 text-slate-600" />;
  };

  const getPreviewUrl = (file) => {
    if (file instanceof File) {
      return URL.createObjectURL(file);
    }
    return file.file_url;
  };

  const canPreviewFile = (file) => {
    const type = file.type || file.file_type;
    return type?.startsWith('image/') || type === 'application/pdf';
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label && <label className="text-sm font-medium">{label}</label>}

      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer",
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
            isDragging ? "bg-blue-100" : "bg-slate-100"
          )}>
            {uploading ? (
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            ) : (
              <Upload className={cn(
                "w-6 h-6",
                isDragging ? "text-blue-600" : "text-slate-600"
              )} />
            )}
          </div>
          
          <div>
            <p className="text-sm font-medium text-slate-900">
              {uploading ? "Uploading..." : isDragging ? "Drop files here" : "Drag & drop or click to browse"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Max {maxSizeMB}MB per file
            </p>
          </div>

          {uploading && (
            <div className="w-full max-w-xs">
              <div className="bg-blue-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={uploading}
          className="hidden"
        />
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <Card key={index} className="border-2 border-green-300 bg-green-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {getFileIcon(file.file_type || file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {file.file_name || file.name}
                    </p>
                    {file.file_size && (
                      <p className="text-xs text-slate-600">
                        {(file.file_size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canPreviewFile(file) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewFile(file)}
                        className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                    )}
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={file.file_name || file.name}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-slate-600 hover:text-slate-700"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemove(index)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Before Upload Modal */}
      {pendingFiles.length > 0 && (
        <Dialog open={true} onOpenChange={() => setPendingFiles([])}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview Files Before Upload</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium">Ready to upload {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''}</p>
                  <p className="text-xs text-blue-700 mt-1">Review and click Upload to continue</p>
                </div>
              </div>

              {pendingFiles.map((file, index) => {
                const isImage = file.type?.startsWith('image/');
                const isPDF = file.type === 'application/pdf';
                const previewUrl = isImage ? URL.createObjectURL(file) : null;

                return (
                  <Card key={index} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        {getFileIcon(file.type)}
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{file.name}</p>
                          <p className="text-xs text-slate-600">
                            {(file.size / 1024).toFixed(1)} KB • {file.type}
                          </p>
                        </div>
                      </div>

                      {isImage && previewUrl && (
                        <div className="mt-3 border rounded-lg overflow-hidden bg-slate-50">
                          <img
                            src={previewUrl}
                            alt={file.name}
                            className="w-full h-auto max-h-64 object-contain"
                          />
                        </div>
                      )}

                      {isPDF && (
                        <div className="mt-3 p-4 bg-slate-50 border rounded-lg text-center">
                          <FileText className="w-12 h-12 mx-auto mb-2 text-red-600" />
                          <p className="text-sm text-slate-600">PDF preview available after upload</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setPendingFiles([])}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => uploadFiles(pendingFiles)}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {pendingFiles.length} File{pendingFiles.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <Dialog open={true} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    {getFileIcon(previewFile.file_type || previewFile.type)}
                  </div>
                  <div>
                    <DialogTitle className="text-xl mb-2">
                      {previewFile.file_name || previewFile.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {(previewFile.file_size || previewFile.size) 
                          ? ((previewFile.file_size || previewFile.size) / 1024).toFixed(1) + ' KB'
                          : 'Unknown size'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <a
                  href={previewFile.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={previewFile.file_name || previewFile.name}
                >
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </a>
              </div>
            </DialogHeader>

            <div className="py-4">
              {(previewFile.file_type || previewFile.type)?.startsWith('image/') ? (
                <div className="border-2 rounded-lg overflow-hidden bg-slate-50 p-4">
                  <img
                    src={previewFile.file_url}
                    alt={previewFile.file_name || previewFile.name}
                    className="w-full h-auto max-h-[600px] object-contain mx-auto"
                  />
                </div>
              ) : (previewFile.file_type || previewFile.type) === 'application/pdf' ? (
                <div className="w-full h-[600px] border-2 rounded-lg overflow-hidden">
                  <iframe
                    src={previewFile.file_url}
                    className="w-full h-full"
                    title={previewFile.file_name || previewFile.name}
                  />
                </div>
              ) : (
                <div className="p-12 text-center border-2 rounded-lg bg-slate-50">
                  <File className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-slate-600 mb-4">Preview not available for this file type</p>
                  <a
                    href={previewFile.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={previewFile.file_name || previewFile.name}
                  >
                    <Button>
                      <Download className="w-4 h-4 mr-2" />
                      Download to View
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}