import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Phase 5: Modal Tracking Hook
 * 
 * Automatically tracks modal interactions for analytics and audit trails.
 * Usage: Add this hook to your modal component to enable tracking.
 */
export function useModalTracking(config, isOpen, organizationId, proposalId, user) {
  const startTimeRef = useRef(null);
  const interactionIdRef = useRef(null);

  // Track modal open
  useEffect(() => {
    if (!isOpen || !config || !organizationId || !user) return;

    const trackOpen = async () => {
      try {
        startTimeRef.current = Date.now();
        
        const interaction = await base44.entities.ModalInteraction.create({
          organization_id: organizationId,
          proposal_id: proposalId || null,
          user_email: user.email,
          modal_template_id: config.templateId || null,
          modal_title: config.title,
          interaction_type: 'opened',
          total_fields: config.fields?.length || config.steps?.reduce((sum, step) => sum + step.fields.length, 0) || 0,
          current_step: 0
        });

        interactionIdRef.current = interaction.id;
        console.log('[ModalTracking] Modal opened:', interaction.id);
      } catch (error) {
        console.error('[ModalTracking] Failed to track open:', error);
      }
    };

    trackOpen();
  }, [isOpen, config, organizationId, proposalId, user]);

  // Track submission
  const trackSubmit = async (formData) => {
    if (!startTimeRef.current || !interactionIdRef.current) return;

    try {
      const timeToComplete = (Date.now() - startTimeRef.current) / 1000;
      
      // Count filled fields
      const fieldsFilled = Object.keys(formData).filter(key => {
        const value = formData[key];
        return value !== null && value !== undefined && value !== '';
      }).length;

      // Count file uploads
      const fileUploads = Object.values(formData).filter(value => 
        value && typeof value === 'object' && value.file_url
      ).length;

      // Check if AI extraction was used
      const aiExtractionUsed = Object.values(formData).some(value =>
        value && typeof value === 'object' && value.rag_ready
      );

      await base44.entities.ModalInteraction.create({
        organization_id: organizationId,
        proposal_id: proposalId || null,
        user_email: user.email,
        modal_template_id: config.templateId || null,
        modal_title: config.title,
        interaction_type: 'submitted',
        fields_filled: fieldsFilled,
        total_fields: config.fields?.length || config.steps?.reduce((sum, step) => sum + step.fields.length, 0) || 0,
        file_uploads: fileUploads,
        ai_extraction_used: aiExtractionUsed,
        time_to_complete_seconds: timeToComplete,
        form_data_snapshot: JSON.stringify(sanitizeFormData(formData))
      });

      console.log('[ModalTracking] Modal submitted:', {
        fieldsFilled,
        fileUploads,
        aiExtractionUsed,
        timeToComplete
      });
    } catch (error) {
      console.error('[ModalTracking] Failed to track submit:', error);
    }
  };

  // Track cancellation
  const trackCancel = async () => {
    if (!startTimeRef.current || !interactionIdRef.current) return;

    try {
      const timeToComplete = (Date.now() - startTimeRef.current) / 1000;

      await base44.entities.ModalInteraction.create({
        organization_id: organizationId,
        proposal_id: proposalId || null,
        user_email: user.email,
        modal_template_id: config.templateId || null,
        modal_title: config.title,
        interaction_type: 'cancelled',
        time_to_complete_seconds: timeToComplete
      });

      console.log('[ModalTracking] Modal cancelled');
    } catch (error) {
      console.error('[ModalTracking] Failed to track cancel:', error);
    }
  };

  // Track validation errors
  const trackValidationError = async (errors) => {
    if (!interactionIdRef.current) return;

    try {
      await base44.entities.ModalInteraction.create({
        organization_id: organizationId,
        proposal_id: proposalId || null,
        user_email: user.email,
        modal_template_id: config.templateId || null,
        modal_title: config.title,
        interaction_type: 'validation_error',
        validation_errors_count: Object.keys(errors).length,
        error_message: Object.values(errors).join('; ')
      });

      console.log('[ModalTracking] Validation errors:', errors);
    } catch (error) {
      console.error('[ModalTracking] Failed to track validation error:', error);
    }
  };

  // Track file upload success
  const trackUploadSuccess = async (fileName) => {
    if (!interactionIdRef.current) return;

    try {
      await base44.entities.ModalInteraction.create({
        organization_id: organizationId,
        proposal_id: proposalId || null,
        user_email: user.email,
        modal_template_id: config.templateId || null,
        modal_title: config.title,
        interaction_type: 'upload_success',
        file_uploads: 1
      });

      console.log('[ModalTracking] Upload success:', fileName);
    } catch (error) {
      console.error('[ModalTracking] Failed to track upload success:', error);
    }
  };

  // Track file upload error
  const trackUploadError = async (fileName, errorMessage) => {
    if (!interactionIdRef.current) return;

    try {
      await base44.entities.ModalInteraction.create({
        organization_id: organizationId,
        proposal_id: proposalId || null,
        user_email: user.email,
        modal_template_id: config.templateId || null,
        modal_title: config.title,
        interaction_type: 'upload_error',
        error_message: `${fileName}: ${errorMessage}`
      });

      console.log('[ModalTracking] Upload error:', fileName, errorMessage);
    } catch (error) {
      console.error('[ModalTracking] Failed to track upload error:', error);
    }
  };

  return {
    trackSubmit,
    trackCancel,
    trackValidationError,
    trackUploadSuccess,
    trackUploadError
  };
}

// Helper to sanitize form data for storage (remove sensitive info)
function sanitizeFormData(formData) {
  const sanitized = { ...formData };
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'ssn', 'credit_card'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  // Simplify file upload objects
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] && typeof sanitized[key] === 'object' && sanitized[key].file_url) {
      sanitized[key] = {
        file_name: sanitized[key].file_name,
        rag_ready: sanitized[key].rag_ready || false
      };
    }
  });

  return sanitized;
}