import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  X, 
  File, 
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DragDropFileUpload({ 
  dataCallId,
  checklistItemId,
  onUploadComplete,
  maxFiles = 10,
  maxSizeMB = 50
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const fileId = file.name + '-' + Date.now();
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: Math.min((prev[fileId] || 0) + 10, 90)
        }));
      }, 200);

      try {
        // Upload file
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // Create database record
        const uploadedFile = await base44.entities.ClientUploadedFile.create({
          organization_id: 'temp', // Will be set by recipient
          proposal_id: 'temp',
          consulting_firm_id: 'temp',
          data_call_request_id: dataCallId,
          data_call_item_id: checklistItemId,
          file_name: file.name,
          file_url: file_url,
          file_size: file.size,
          file_type: file.type,
          file_category: 'data_call_response',
          uploaded_by_name: 'User',
          uploaded_by_email: 'user@example.com'
        });

        clearInterval(progressInterval);
        setUploadProgress(prev => ({ ...prev, [fileId]: 100 }));

        return { fileId, uploadedFile };
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: ({ fileId, uploadedFile }) => {
      // Remove from queue after successful upload
      setTimeout(() => {
        setUploadQueue(prev => prev.filter(f => f.id !== fileId));
        setUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[fileId];
          return updated;
        });
      }, 1500);

      onUploadComplete?.(uploadedFile);
    },
    onError: (error, file) => {
      toast.error(`Failed to upload ${file.name}: ${error.message}`);
      setUploadQueue(prev => prev.filter(f => f.name !== file.name));
    }
  });

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
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
    processFiles(files);
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const processFiles = (files) => {
    // Validate files
    const validFiles = files.filter(file => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`${file.name} exceeds ${maxSizeMB}MB limit`);
        return false;
      }
      return true;
    });

    if (uploadQueue.length + validFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Add to queue with IDs
    const filesWithIds = validFiles.map(file => ({
      ...file,
      id: file.name + '-' + Date.now()
    }));

    setUploadQueue(prev => [...prev, ...filesWithIds]);

    // Start uploading
    filesWithIds.forEach(file => {
      uploadMutation.mutate(file);
    });
  };

  const removeFromQueue = (fileId) => {
    setUploadQueue(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const updated = { ...prev };
      delete updated[fileId];
      return updated;
    });
  };

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return ImageIcon;
    if (fileType?.includes('pdf')) return FileText;
    return File;
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer",
          isDragging
            ? "border-blue-500 bg-blue-50 scale-105"
            : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50"
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
        />

        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            or click to browse
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <span>Max {maxFiles} files</span>
            <span>•</span>
            <span>Up to {maxSizeMB}MB each</span>
          </div>
        </div>
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900">
              Uploading {uploadQueue.length} file(s)
            </h4>
            <Badge variant="secondary">
              {uploadQueue.filter(f => uploadProgress[f.id] === 100).length} / {uploadQueue.length} complete
            </Badge>
          </div>

          {uploadQueue.map(file => {
            const progress = uploadProgress[file.id] || 0;
            const isComplete = progress === 100;
            const FileIcon = getFileIcon(file.type);

            return (
              <Card key={file.id} className={cn(
                "border-2",
                isComplete ? "border-green-400 bg-green-50" : "border-blue-400 bg-blue-50"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      isComplete ? "bg-green-100" : "bg-blue-100"
                    )}>
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-slate-900 truncate">{file.name}</p>
                        {!isComplete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeFromQueue(file.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">
                          {isComplete ? 'Complete' : `${progress}%`}
                        </span>
                      </div>

                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}