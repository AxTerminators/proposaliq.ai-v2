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
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, ChevronRight, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useModalTracking } from './useModalTracking';
import { useOrganization } from '../../layout/OrganizationContext';
import { useAutosave } from './useAutosave';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  shouldExecuteOperation,
  resolveEntityId,
  applyAdvancedMappings,
  buildEntityData
} from './phase5Utils';
import { executePhase6Workflows } from './phase6Utils';

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
  const { organization, user } = useOrganization();
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStates, setUploadStates] = useState({}); // Track file upload progress
  const [extractedData, setExtractedData] = useState(null); // Store extracted data from documents
  const [showReviewMode, setShowReviewMode] = useState(false); // Show review before final save
  const [currentStep, setCurrentStep] = useState(0); // For multi-step forms
  const [showDraftDialog, setShowDraftDialog] = useState(false); // Show draft recovery dialog

  // Phase 5: Track modal interactions
  const tracking = useModalTracking(config, isOpen, organization?.id, config?.proposalId, user);

  // Phase 2.3: Autosave functionality
  const modalId = config?.modalId || `${config?.proposalId}_${config?.title?.replace(/\s+/g, '_')}`;
  const autosave = useAutosave(modalId, formData, isOpen);

  // Helper to get context value from proposal/organization/user
  const getContextValue = (source, path) => {
    switch (source) {
      case 'proposal':
        // TODO: Load proposal data if needed
        return undefined;
      case 'organization':
        return organization?.[path];
      case 'user':
        return user?.[path];
      default:
        return undefined;
    }
  };

  // Initialize form data from field defaults, context pre-fill, or load draft
  useEffect(() => {
    if (!config?.fields) return;
    
    // Check if draft exists
    if (autosave.hasDraft()) {
      setShowDraftDialog(true);
    } else {
      // Initialize with defaults and context pre-fill
      const initialData = {};
      config.fields.forEach(field => {
        // Context pre-fill takes precedence over defaults
        if (field.prefillFromContext && field.prefillSource && field.prefillPath) {
          const contextValue = getContextValue(field.prefillSource, field.prefillPath);
          if (contextValue !== undefined) {
            initialData[field.name] = contextValue;
          } else if (field.default !== undefined) {
            initialData[field.name] = field.default;
          }
        } else if (field.default !== undefined) {
          initialData[field.name] = field.default;
        }
      });
      setFormData(initialData);
    }
  }, [config?.fields, autosave]);

  // Handle draft recovery
  const handleLoadDraft = () => {
    const draft = autosave.loadDraft();
    if (draft) {
      setFormData(draft);
      toast.success('Draft restored');
    }
    setShowDraftDialog(false);
  };

  const handleDiscardDraft = () => {
    autosave.clearDraft();
    
    // Initialize with defaults
    const initialData = {};
    config.fields.forEach(field => {
      if (field.default !== undefined) {
        initialData[field.name] = field.default;
      }
    });
    setFormData(initialData);
    setShowDraftDialog(false);
    toast.info('Draft discarded');
  };

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
      console.error('[DynamicModal] Missing proposalId for file upload');
      toast.error('Configuration error: Proposal ID required for file uploads');
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
          },
          extract_data_schema: fieldConfig.extract_data_schema || null
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

          // If data was extracted, pre-populate fields and show review mode
          if (ragResult.data?.parsing?.extracted_data && fieldConfig.extract_data_schema) {
            const extracted = ragResult.data.parsing.extracted_data;
            console.log('[DynamicModal] Pre-populating fields with extracted data:', extracted);
            
            setExtractedData(extracted);
            
            // Auto-populate form fields that match extracted data keys
            const newFormData = { ...formData };
            Object.keys(extracted).forEach(key => {
              if (config.fields.find(f => f.name === key)) {
                newFormData[key] = extracted[key];
              }
            });
            setFormData(newFormData);
            
            setShowReviewMode(true);
            toast.success(`${file.name} uploaded - Review extracted data`);
          } else {
            toast.success(`${file.name} uploaded and indexed for AI`);
          }
          
          // Track upload success
          if (tracking) {
            tracking.trackUploadSuccess(file.name);
          }
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
      const errorMessage = error.message || 'Unknown error occurred';
      setUploadStates(prev => ({
        ...prev,
        [fieldName]: { status: 'error', progress: 0, error: errorMessage }
      }));
      toast.error(`Upload failed: ${errorMessage}`);
      
      // Track upload error
      if (tracking) {
        tracking.trackUploadError(file.name, errorMessage);
      }
    }
  };

  // Check if field should be visible
  const isFieldVisible = (field) => {
    if (!field.showIf) return true;
    
    const { field: dependentField, value: expectedValue, operator = 'equals' } = field.showIf;
    const actualValue = formData[dependentField];
    
    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'notEquals':
        return actualValue !== expectedValue;
      case 'contains':
        return Array.isArray(actualValue) && actualValue.includes(expectedValue);
      case 'greaterThan':
        return actualValue > expectedValue;
      case 'lessThan':
        return actualValue < expectedValue;
      case 'isEmpty':
        return !actualValue || actualValue === '';
      case 'isNotEmpty':
        return actualValue && actualValue !== '';
      default:
        return true;
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    const fieldsToValidate = config.steps 
      ? config.steps[currentStep]?.fields || []
      : config.fields || [];

    fieldsToValidate.forEach(field => {
      if (!isFieldVisible(field)) return;

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

        // Custom validation function
        if (field.validation.custom && typeof field.validation.custom === 'function') {
          const customError = field.validation.custom(value, formData);
          if (customError) newErrors[field.name] = customError;
        }
      }
    });

    setErrors(newErrors);
    
    // Track validation errors
    if (Object.keys(newErrors).length > 0 && tracking) {
      tracking.trackValidationError(newErrors);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before continuing');
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, (config.steps?.length || 1) - 1));
  };

  // Handle back step
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      // Phase 5: Apply advanced field mappings (computed values)
      const processedFormData = applyAdvancedMappings(
        config.fields || [], 
        formData, 
        config.fields || []
      );

      // Execute primary submission
      await config.onSubmit(processedFormData);

      // Phase 5: Execute entity operations with conditional logic
      if (config.entityOperations && config.entityOperations.length > 0) {
        console.log('[DynamicModal] Processing entity operations...');
        
        for (const operation of config.entityOperations) {
          // Check if operation should execute based on conditions
          const shouldExecute = shouldExecuteOperation(
            operation, 
            processedFormData, 
            config.fields || []
          );

          if (!shouldExecute) {
            console.log(`[DynamicModal] Skipping operation on ${operation.entity} - conditions not met`);
            continue;
          }

          console.log(`[DynamicModal] Executing ${operation.type} on ${operation.entity}`);

          // Build entity data from field mappings
          const entityData = buildEntityData(
            processedFormData,
            operation.fieldMappings || [],
            config.fields || []
          );

          // Add organization_id if needed
          if (organization?.id) {
            entityData.organization_id = organization.id;
          }

          // Execute operation
          if (operation.type === 'create') {
            await base44.entities[operation.entity].create(entityData);
            console.log(`[DynamicModal] Created ${operation.entity}:`, entityData);
          } else if (operation.type === 'update') {
            // Resolve entity ID for update
            const entityId = resolveEntityId(
              operation,
              processedFormData,
              { proposal: config.proposal, organization, user },
              config.fields || []
            );

            if (!entityId) {
              console.error(`[DynamicModal] Cannot resolve entity ID for update on ${operation.entity}`);
              toast.error(`Failed to identify ${operation.entity} to update`);
              continue;
            }

            await base44.entities[operation.entity].update(entityId, entityData);
            console.log(`[DynamicModal] Updated ${operation.entity} (${entityId}):`, entityData);
          }
        }
      }
      
      // Phase 6: Execute workflow automations (webhooks, emails, status updates)
      await executePhase6Workflows(
        config,
        processedFormData,
        { proposal: config.proposal, organization, user }
      );

      // Track successful submission with snapshot for version history
      if (tracking) {
        await tracking.trackSubmit(processedFormData);
      }
      
      toast.success(config.successMessage || 'Saved successfully');
      
      // Clear draft on successful save
      autosave.clearDraft();
      
      onClose();
      // Reset state on successful save
      setFormData({});
      setErrors({});
      setCurrentStep(0);
      setExtractedData(null);
      setShowReviewMode(false);
      setUploadStates({});
    } catch (error) {
      console.error('[DynamicModal] Submit error:', error);
      const errorMessage = error.message || 'Failed to save. Please try again.';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render dynamic array field
  const renderArrayField = (field) => {
    const fieldName = field.name;
    const items = formData[fieldName] || [''];
    const error = errors[fieldName];

    const addItem = () => {
      handleChange(fieldName, [...items, '']);
    };

    const removeItem = (index) => {
      const newItems = items.filter((_, i) => i !== index);
      handleChange(fieldName, newItems.length > 0 ? newItems : ['']);
    };

    const updateItem = (index, value) => {
      const newItems = [...items];
      newItems[index] = value;
      handleChange(fieldName, newItems);
    };

    return (
      <div key={fieldName} className="space-y-2">
        <Label>
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {field.helpText && (
          <p className="text-xs text-slate-500">{field.helpText}</p>
        )}
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={field.placeholder || `Item ${index + 1}`}
                className="flex-1"
              />
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeItem(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {field.label}
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    );
  };

  // Render field based on type
  const renderField = (field) => {
    // Check conditional visibility
    if (!isFieldVisible(field)) return null;

    const value = formData[field.name] || '';
    const error = errors[field.name];
    const uploadState = uploadStates[field.name];

    // Array field
    if (field.type === 'array') {
      return renderArrayField(field);
    }

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

  // Determine fields to render
  const fieldsToRender = config.steps 
    ? config.steps[currentStep]?.fields || []
    : config.fields || [];

  const isMultiStep = config.steps && config.steps.length > 1;
  const isLastStep = currentStep === (config.steps?.length || 1) - 1;

  return (
    <>
      {/* Draft Recovery Dialog */}
      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recover Unsaved Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              We found a draft from your previous session. Would you like to continue where you left off?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft}>
              Start Fresh
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleLoadDraft} className="bg-blue-600 hover:bg-blue-700">
              Load Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
          <DialogTitle>
            {config.steps ? config.steps[currentStep].title : config.title}
          </DialogTitle>
          {(config.steps ? config.steps[currentStep].description : config.description) && (
            <p className="text-sm text-slate-500 mt-2">
              {config.steps ? config.steps[currentStep].description : config.description}
            </p>
          )}
          {isMultiStep && (
            <div className="flex items-center gap-2 mt-4">
              {config.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2 flex-1">
                  <div className={cn(
                    "h-2 rounded-full flex-1 transition-colors",
                    index <= currentStep ? "bg-blue-600" : "bg-slate-200"
                  )} />
                  {index < config.steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              ))}
            </div>
          )}
          {showReviewMode && extractedData && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-900">
                ✓ Data extracted from document
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Review and edit the pre-populated fields below before saving
              </p>
            </div>
          )}
          
          {/* Autosave Indicator */}
          {autosave.lastSaved && (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              {autosave.isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Saving draft...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  <span>Draft saved {new Date(autosave.lastSaved).toLocaleTimeString()}</span>
                </>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {fieldsToRender.map(field => renderField(field))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (tracking) tracking.trackCancel();
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {isMultiStep && currentStep > 0 && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              Back
            </Button>
          )}
          {isMultiStep && !isLastStep ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              Next
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : showReviewMode ? (
                'Confirm & Save'
              ) : (
                config.submitLabel || 'Save'
              )}
            </Button>
          )}
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}