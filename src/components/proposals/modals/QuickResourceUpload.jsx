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
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * QuickResourceUpload Component
 * 
 * A lightweight modal for quickly uploading resources to the Content Library
 * directly from the Resource Gathering Modal. Provides a streamlined UX for
 * users who need to add resources during the proposal workflow.
 * 
 * Features:
 * - Drag-and-drop file upload
 * - Quick form for title, description, resource_type, content_category
 * - File validation (size and type)
 * - Auto-refresh parent modal on success
 * - Clear error messaging
 */

const RESOURCE_TYPES = [
  { value: 'capability_statement', label: 'Capability Statement' },
  { value: 'marketing_collateral', label: 'Marketing Collateral' },
  { value: 'past_proposal', label: 'Past Proposal' },
  { value: 'boilerplate_text', label: 'Boilerplate Text' },
  { value: 'template', label: 'Template' },
  { value: 'other', label: 'Other' },
];

const CONTENT_CATEGORIES = [
  { value: 'company_overview', label: 'Company Overview' },
  { value: 'past_performance', label: 'Past Performance' },
  { value: 'technical_approach', label: 'Technical Approach' },
  { value: 'quality_assurance', label: 'Quality Assurance' },
  { value: 'key_personnel', label: 'Key Personnel' },
  { value: 'management', label: 'Management' },
  { value: 'transition_plan', label: 'Transition Plan' },
  { value: 'security', label: 'Security' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'general', label: 'General' },
];

export default function QuickResourceUpload({ isOpen, onClose, organizationId, onSuccess }) {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'capability_statement',
    content_category: 'general',
  });

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setUploadError('');
      setUploadSuccess(false);
      setUploadProgress('');
      setFormData({
        title: '',
        description: '',
        resource_type: 'capability_statement',
        content_category: 'general',
      });
    }
  }, [isOpen]);

  // File validation
  const validateFile = (file) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/png',
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size must be less than 50MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not supported. Please upload PDF, Word, Excel, text, or image files.' };
    }

    return { valid: true };
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const validation = validateFile(droppedFile);
      if (validation.valid) {
        setFile(droppedFile);
        setUploadError('');
        // Auto-populate title if empty
        if (!formData.title) {
          setFormData(prev => ({ ...prev, title: droppedFile.name }));
        }
      } else {
        setUploadError(validation.error);
      }
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validation = validateFile(selectedFile);
      if (validation.valid) {
        setFile(selectedFile);
        setUploadError('');
        // Auto-populate title if empty
        if (!formData.title) {
          setFormData(prev => ({ ...prev, title: selectedFile.name }));
        }
      } else {
        setUploadError(validation.error);
      }
    }
  };

  // Handle form field changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle upload
  const handleUpload = async () => {
    // Validation
    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }

    if (!formData.title.trim()) {
      setUploadError('Please provide a title for the resource');
      return;
    }

    if (!organizationId) {
      setUploadError('Organization ID is missing. Please try again.');
      return;
    }

    try {
      setUploading(true);
      setUploadError('');
      setUploadProgress('Uploading file...');

      // Step 1: Upload file to storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      setUploadProgress('Creating resource record...');

      // Step 2: Create ProposalResource entity
      const resourceData = {
        organization_id: organizationId,
        resource_type: formData.resource_type,
        content_category: formData.content_category,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        file_name: file.name,
        file_url: file_url,
        file_size: file.size,
        tags: [], // Could be enhanced in the future
      };

      await base44.entities.ProposalResource.create(resourceData);

      setUploadProgress('Success!');
      setUploadSuccess(true);

      // Call onSuccess callback to refresh parent modal
      if (onSuccess) {
        onSuccess();
      }

      // Auto-close after short delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('[QuickResourceUpload] Upload error:', error);
      setUploadError(error.message || 'Failed to upload resource. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Resource</DialogTitle>
          <DialogDescription>
            Quickly add a new resource to your Content Library
          </DialogDescription>
        </DialogHeader>

        {uploadSuccess ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Resource Uploaded!</h3>
            <p className="text-sm text-slate-600">
              Your resource has been added to the Content Library.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* File Upload Area */}
            <div>
              <Label>File *</Label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "mt-2 border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                  dragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400",
                  file && "bg-green-50 border-green-500"
                )}
                onClick={() => document.getElementById('file-upload-input').click()}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                />
                
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-slate-900">{file.name}</p>
                      <p className="text-sm text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                    <p className="text-sm font-medium text-slate-700">
                      Drop file here or click to browse
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports PDF, Word, Excel, text, and image files (max 50MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Title Input */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Company Capability Statement 2024"
                className="mt-2"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of this resource..."
                rows={3}
                className="mt-2"
              />
            </div>

            {/* Resource Type */}
            <div>
              <Label>Resource Type *</Label>
              <Select
                value={formData.resource_type}
                onValueChange={(value) => handleInputChange('resource_type', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content Category */}
            <div>
              <Label>Content Category *</Label>
              <Select
                value={formData.content_category}
                onValueChange={(value) => handleInputChange('content_category', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <p className="text-sm text-blue-900">{uploadProgress}</p>
              </div>
            )}

            {/* Error Message */}
            {uploadError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-900">{uploadError}</p>
              </div>
            )}
          </div>
        )}

        {!uploadSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !file}>
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