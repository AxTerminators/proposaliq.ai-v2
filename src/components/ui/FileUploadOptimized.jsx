import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, Loader2, CheckCircle2, X, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * General File Upload with Size Display
 * For non-image files (PDFs, Word docs, etc.)
 * Shows file info and upload progress
 */
export default function FileUploadOptimized({
  label = "Upload File",
  accept = "*/*",
  maxSizeMB = 50,
  onUploadComplete,
  currentFileUrl,
  currentFileName,
  className,
  multiple = false
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState(
    currentFileUrl ? [{ url: currentFileUrl, name: currentFileName || 'Uploaded file' }] : []
  );
  const fileInputRef = React.useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        toast.error(`${file.name} exceeds ${maxSizeMB}MB limit`);
        continue;
      }

      try {
        setUploadProgress(((i + 0.5) / files.length) * 100);

        // Upload file
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const uploadResult = await base44.integrations.Core.UploadFile({
          file: fileBytes
        });

        results.push({
          url: uploadResult.file_url,
          name: file.name,
          size: file.size,
          type: file.type
        });

        setUploadProgress(((i + 1) / files.length) * 100);
      } catch (error) {
        console.error('File upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (results.length > 0) {
      const newFiles = multiple ? [...uploadedFiles, ...results] : results;
      setUploadedFiles(newFiles);
      
      toast.success(`${results.length} file${results.length > 1 ? 's' : ''} uploaded!`);
      
      if (onUploadComplete) {
        onUploadComplete(multiple ? newFiles : results[0]);
      }
    }

    setUploading(false);
    setTimeout(() => setUploadProgress(0), 1000);
  };

  const handleRemove = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    
    if (onUploadComplete) {
      onUploadComplete(multiple ? newFiles : null);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-blue-600" />;
    }
    return <FileText className="w-5 h-5 text-slate-600" />;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {label && <Label>{label}</Label>}

      {/* Upload Button */}
      <Card className={cn(
        "border-2 border-dashed transition-all cursor-pointer hover:border-blue-400 hover:bg-blue-50",
        uploading && "border-blue-500 bg-blue-50"
      )}>
        <CardContent className="p-6">
          <label className="cursor-pointer flex flex-col items-center justify-center">
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleFileSelect}
              disabled={uploading}
              className="hidden"
            />
            
            {uploading ? (
              <>
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                <p className="text-sm font-medium text-blue-700">
                  Uploading...
                </p>
                <div className="w-full max-w-xs mt-3">
                  <div className="bg-blue-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 text-center mt-1">
                    {Math.round(uploadProgress)}%
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">
                  Click to upload {multiple ? 'files' : 'file'}
                </p>
                <p className="text-xs text-slate-500">
                  Max {maxSizeMB}MB per file
                </p>
              </>
            )}
          </label>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((file, index) => (
            <Card key={index} className="border-2 border-green-300 bg-green-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {getFileIcon(file.name)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">
                      {file.name}
                    </p>
                    {file.size && (
                      <p className="text-xs text-slate-600">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemove(index)}
                    className="h-8 w-8 text-slate-600 hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}