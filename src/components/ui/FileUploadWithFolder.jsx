import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, FolderOpen } from "lucide-react";
import FolderSelector from "../folders/FolderSelector";
import { toast } from "sonner";

export default function FileUploadWithFolder({ 
  organization, 
  onUploadComplete,
  allowFolderSelection = true,
  filterType = null,
  label = "Upload File",
  accept = "*"
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const fileData = {
        file_name: file.name,
        file_url,
        file_size: file.size,
        file_type: file.type,
        folder_id: selectedFolderId,
        uploaded_date: new Date().toISOString()
      };

      setUploadedFile(fileData);
      
      if (onUploadComplete) {
        onUploadComplete(fileData);
      }

      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error uploading file: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setUploadedFile(null);
    setSelectedFolderId(null);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Input
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading || uploadedFile}
            accept={accept}
          />
          {uploadedFile && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              Change
            </Button>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
          <span>Uploading...</span>
        </div>
      )}

      {uploadedFile && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-900">{uploadedFile.file_name}</p>
            <p className="text-xs text-green-700">
              {(uploadedFile.file_size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
      )}

      {allowFolderSelection && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Organize in Folder (Optional)
          </Label>
          <FolderSelector
            organization={organization}
            value={selectedFolderId}
            onChange={(folderId) => {
              setSelectedFolderId(folderId);
              if (uploadedFile && onUploadComplete) {
                onUploadComplete({ ...uploadedFile, folder_id: folderId });
              }
            }}
            allowNone={true}
            filterType={filterType}
          />
          <p className="text-xs text-slate-500">
            Assign to a folder for better organization and discoverability
          </p>
        </div>
      )}
    </div>
  );
}