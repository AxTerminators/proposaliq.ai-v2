import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * DynamicModal Component
 * 
 * Renders a form dynamically based on a JSON schema configuration.
 * Supports multiple field types including file uploads with automatic RAG ingestion.
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - config: {
 *     title: string,
 *     description?: string,
 *     fields: array of field configs,
 *     onSubmit: function(formData),
 *     proposalId: string (required for file uploads)
 *   }
 */
export default function DynamicModal({ isOpen, onClose, config }) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStates, setUploadStates] = useState({}); // Track file upload progress

  // Initialize form data from field defaults
  useEffect(() => {
    if (!config?.fields) return;
    
    const initialData = {};
    config.fields.forEach(field => {
      if (field.default !== undefined) {
        initialData[field.name] = field.default;
      }
    });
    setFormData(initialData);
  }, [config?.fields]);

  // Handle input change
  const handleChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // Handle file upload with automatic RAG ingestion
  const handleFileUpload = async (fieldName, file, fieldConfig) => {
    if (!file) return;

    if (!config.proposalId) {
      toast.error('Proposal ID is required for file uploads');
      return;
    }

    // Validate file type if specified
    if (fieldConfig.accept) {
      const acceptedTypes = fieldConfig.accept.split(',').map(t => t.trim());
      const fileExt = `.${file.name.split('.').pop()}`;
      if (!acceptedTypes.some(type => fileExt.toLowerCase() === type.toLowerCase())) {
        toast.error(`File type not accepted. Accepted: ${fieldConfig.accept}`);
        return;
      }
    }

    // Validate file size if specified (in MB)
    if (fieldConfig.maxSize && file.size > fieldConfig.maxSize * 1024 * 1024) {
      toast.error(`File size exceeds ${fieldConfig.maxSize}MB limit`);
      return;
    }

    try {
      setUploadStates(prev => ({
        ...prev,
        [fieldName]: { status: 'uploading', progress: 0 }
      }));

      // Step 1: Upload file to Base44
      console.log('[DynamicModal] Uploading file:', file.name);
      const uploadResult = await base44.integrations.Core.UploadFile({ file });

      if (!uploadResult.file_url) {
        throw new Error('Upload failed: no file URL returned');
      }

      setUploadStates(prev => ({
        ...prev,
        [fieldName]: { status: 'processing', progress: 50 }
      }));

      // Step 2: Trigger RAG ingestion if enabled
      if (fieldConfig.ingest_to_rag !== false) {
        console.log('[DynamicModal] Triggering RAG ingestion...');
        
        const ragResult = await base44.functions.invoke('ingestDocumentToRAG', {
          file_url: uploadResult.file_url,
          file_name: file.name,
          file_size: file.size,
          proposal_id: config.proposalId,
          entity_type: fieldConfig.entity_type || 'ProposalResource',
          entity_metadata: {
            resource_type: fieldConfig.resource_type || 'other',
            document_type: fieldConfig.document_type || 'other',
            content_category: fieldConfig.content_category || 'general',
            title: fieldConfig.title_prefix ? `${fieldConfig.title_prefix} - ${file.name}` : file.name,
            description: fieldConfig.description || null,
            folder_id: fieldConfig.folder_id || null,
            tags: fieldConfig.tags || []
          }
        });

        if (ragResult.data?.status === 'success') {
          console.log('[DynamicModal] RAG ingestion complete:', ragResult.data);
          
          // Store both file URL and entity ID in form data
          handleChange(fieldName, {
            file_url: uploadResult.file_url,
            file_name: file.name,
            file_size: file.size,
            entity_id: ragResult.data.entity.id,
            entity_type: ragResult.data.entity.type,
            parsed_text_length: ragResult.data.parsing.text_length,
            rag_ready: ragResult.data.rag_pipeline.ready_for_ai
          });

          setUploadStates(prev => ({
            ...prev,
            [fieldName]: { status: 'success', progress: 100 }
          }));

          toast.success(`${file.name} uploaded and indexed for AI`);
        } else {
          throw new Error(ragResult.data?.error || 'RAG ingestion failed');
        }
      } else {
        // No RAG ingestion, just store file URL
        handleChange(fieldName, {
          file_url: uploadResult.file_url,
          file_name: file.name,
          file_size: file.size
        });

        setUploadStates(prev => ({
          ...prev,
          [fieldName]: { status: 'success', progress: 100 }
        }));

        toast.success(`${file.name} uploaded successfully`);
      }

    } catch (error) {
      console.error('[DynamicModal] File upload error:', error);
      setUploadStates(prev => ({
        ...prev,
        [fieldName]: { status: 'error', progress: 0, error: error.message }
      }));
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    config.fields.forEach(field => {
      // Check required fields
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} is required`;
      }

      // Custom validation rules
      if (field.validation && formData[field.name]) {
        const value = formData[field.name];
        
        // Min/max length for strings
        if (field.validation.minLength && value.length < field.validation.minLength) {
          newErrors[field.name] = `Must be at least ${field.validation.minLength} characters`;
        }
        if (field.validation.maxLength && value.length > field.validation.maxLength) {
          newErrors[field.name] = `Must be at most ${field.validation.maxLength} characters`;
        }

        // Min/max value for numbers
        if (field.validation.min !== undefined && value < field.validation.min) {
          newErrors[field.name] = `Must be at least ${field.validation.min}`;
        }
        if (field.validation.max !== undefined && value > field.validation.max) {
          newErrors[field.name] = `Must be at most ${field.validation.max}`;
        }

        // Pattern matching
        if (field.validation.pattern) {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            newErrors[field.name] = field.validation.patternMessage || 'Invalid format';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      await config.onSubmit(formData);
      toast.success('Saved successfully');
      onClose();
    } catch (error) {
      console.error('[DynamicModal] Submit error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render field based on type
  const renderField = (field) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];
    const uploadState = uploadStates[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-500">{field.description}</p>
            )}
            <Input
              id={field.name}
              type={field.type}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              disabled={field.disabled}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-500">{field.description}</p>
            )}
            <Textarea
              id={field.name}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              rows={field.rows || 4}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-500">{field.description}</p>
            )}
            <Select
              value={value}
              onValueChange={(val) => handleChange(field.name, val)}
              disabled={field.disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={!!value}
              onCheckedChange={(checked) => handleChange(field.name, checked)}
              disabled={field.disabled}
            />
            <Label htmlFor={field.name} className="font-normal">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {error && <p className="text-sm text-red-500 ml-6">{error}</p>}
          </div>
        );

      case 'file_upload':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.description && (
              <p className="text-sm text-slate-500">{field.description}</p>
            )}
            
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <input
                id={field.name}
                type="file"
                accept={field.accept}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(field.name, file, field);
                }}
                className="hidden"
                disabled={field.disabled || uploadState?.status === 'uploading'}
              />
              
              {!uploadState || uploadState.status === 'idle' ? (
                <label htmlFor={field.name} className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-600">
                    Click to upload {field.accept && `(${field.accept})`}
                  </p>
                  {field.maxSize && (
                    <p className="text-xs text-slate-400 mt-1">Max size: {field.maxSize}MB</p>
                  )}
                </label>
              ) : uploadState.status === 'uploading' ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm text-slate-600">Uploading...</p>
                </div>
              ) : uploadState.status === 'processing' ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm text-slate-600">Processing and indexing for AI...</p>
                </div>
              ) : uploadState.status === 'success' ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <p className="text-sm text-slate-600">{formData[field.name]?.file_name}</p>
                  </div>
                  {formData[field.name]?.rag_ready && (
                    <p className="text-xs text-green-600">✓ Indexed for AI</p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleChange(field.name, null);
                      setUploadStates(prev => {
                        const newState = { ...prev };
                        delete newState[field.name];
                        return newState;
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                  <p className="text-sm text-red-600">{uploadState.error}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadStates(prev => {
                        const newState = { ...prev };
                        delete newState[field.name];
                        return newState;
                      });
                    }}
                  >
                    Try Again
                  </Button>
                </div>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (!config) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
          {config.description && (
            <p className="text-sm text-slate-500 mt-2">{config.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {config.fields?.map(field => renderField(field))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}