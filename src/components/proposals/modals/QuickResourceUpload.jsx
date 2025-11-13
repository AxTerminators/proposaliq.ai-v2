import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, FileText, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * QuickResourceUpload Component
 * 
 * Provides a quick way to upload new resources directly from the Gather Resources modal.
 * Features:
 * - Drag-and-drop file upload
 * - Quick form for title, description, and resource type
 * - Saves to ProposalResource entity
 * - Shows success confirmation
 * - Calls parent refresh callback to update the list
 */
export default function QuickResourceUpload({ isOpen, onClose, organizationId, onSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState("other");
  const [contentCategory, setContentCategory] = useState("general");

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setTitle("");
      setDescription("");
      setResourceType("other");
      setContentCategory("general");
      setUploadSuccess(false);
    }
  }, [isOpen]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    
    // Auto-populate title from filename if empty
    if (!title && selectedFile.name) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    // Validation
    if (!file) {
      alert("Please select a file to upload");
      return;
    }
    if (!title.trim()) {
      alert("Please enter a title for this resource");
      return;
    }

    try {
      setUploading(true);

      // Step 1: Upload the file to Base44 storage
      console.log('[QuickResourceUpload] Uploading file:', file.name);
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      
      if (!uploadResult?.file_url) {
        throw new Error('File upload failed - no URL returned');
      }

      console.log('[QuickResourceUpload] File uploaded successfully:', uploadResult.file_url);

      // Step 2: Create ProposalResource entity
      const resourceData = {
        organization_id: organizationId,
        resource_type: resourceType,
        content_category: contentCategory,
        title: title.trim(),
        description: description.trim(),
        file_name: file.name,
        file_url: uploadResult.file_url,
        file_size: file.size,
        tags: []
      };

      console.log('[QuickResourceUpload] Creating ProposalResource entity...');
      const createdResource = await base44.entities.ProposalResource.create(resourceData);
      
      console.log('[QuickResourceUpload] ✅ Resource created successfully:', createdResource.id);

      // Show success state
      setUploadSuccess(true);

      // Wait a moment to show success, then call onSuccess callback
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(createdResource);
        }
        onClose();
      }, 1500);

    } catch (error) {
      console.error('[QuickResourceUpload] Error:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload New Resource</DialogTitle>
          <DialogDescription>
            Upload a document to your Content Library and make it available for AI reference
          </DialogDescription>
        </DialogHeader>

        {uploadSuccess ? (
          // Success State
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Resource Uploaded Successfully!
            </h3>
            <p className="text-sm text-slate-600">
              {title} has been added to your Content Library
            </p>
          </div>
        ) : (
          // Upload Form
          <div className="space-y-4 py-4">
            {/* File Upload Area */}
            <div>
              <Label>File Upload</Label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "mt-2 border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : file
                      ? "border-green-500 bg-green-50"
                      : "border-slate-300 hover:border-slate-400"
                )}
              >
                {file ? (
                  <div className="space-y-2">
                    <FileText className="w-12 h-12 mx-auto text-green-600" />
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-600">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFile(null)}
                      className="mt-2"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 mx-auto text-slate-400" />
                    <p className="text-slate-700">
                      <span className="font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports DOCX, PDF, XLSX, and other common formats
                    </p>
                    <input
                      type="file"
                      onChange={handleFileInputChange}
                      className="hidden"
                      id="file-upload"
                      accept=".docx,.pdf,.xlsx,.xls,.pptx,.txt,.doc"
                    />
                    <label htmlFor="file-upload">
                      <Button variant="outline" size="sm" asChild className="cursor-pointer">
                        <span>Browse Files</span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a descriptive title"
                className="mt-2"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this resource..."
                className="mt-2 h-20"
              />
            </div>

            {/* Resource Type and Content Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resource-type">Resource Type</Label>
                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger id="resource-type" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="capability_statement">Capability Statement</SelectItem>
                    <SelectItem value="marketing_collateral">Marketing Collateral</SelectItem>
                    <SelectItem value="past_proposal">Past Proposal</SelectItem>
                    <SelectItem value="boilerplate_text">Boilerplate Text</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content-category">Content Category</Label>
                <Select value={contentCategory} onValueChange={setContentCategory}>
                  <SelectTrigger id="content-category" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company_overview">Company Overview</SelectItem>
                    <SelectItem value="past_performance">Past Performance</SelectItem>
                    <SelectItem value="technical_approach">Technical Approach</SelectItem>
                    <SelectItem value="quality_assurance">Quality Assurance</SelectItem>
                    <SelectItem value="key_personnel">Key Personnel</SelectItem>
                    <SelectItem value="management">Management</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="pricing">Pricing</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {!uploadSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file || !title.trim()}>
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Resource
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}