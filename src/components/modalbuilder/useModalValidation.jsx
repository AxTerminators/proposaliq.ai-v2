import { useMemo } from 'react';

/**
 * Custom hook to validate modal configuration and provide status
 * Returns validation status for each section and overall health
 */
export function useModalValidation(config) {
  const {
    name = '',
    description = '',
    fields = [],
    steps = [],
    entityOperations = [],
    webhooks = [],
    emailNotifications = [],
    statusUpdates = [],
  } = config;

  const validation = useMemo(() => {
    // Basic Info Validation
    const basicInfo = {
      isValid: Boolean(name && description),
      issues: [],
    };
    if (!name) basicInfo.issues.push('Modal name is required');
    if (!description) basicInfo.issues.push('Modal description is required');

    // Fields Validation
    const fieldsValidation = {
      isValid: fields.length > 0,
      issues: [],
      fieldIssues: {},
    };
    if (fields.length === 0) {
      fieldsValidation.issues.push('At least one field is required');
    }

    fields.forEach((field) => {
      const fieldIssues = [];
      if (!field.label) fieldIssues.push('Field label is required');
      if (field.required && !field.validation?.required) {
        fieldIssues.push('Required field needs validation rule');
      }
      if (field.type === 'select' && (!field.options || field.options.length === 0)) {
        fieldIssues.push('Select field needs options');
      }
      if (field.type === 'array' && !field.arrayConfig?.itemType) {
        fieldIssues.push('Array field needs item type');
      }

      // File upload fields with templates are valid if they have complete default configs
      if (field.type === 'file' && field.templateId) {
        const hasCompleteTemplate = 
          field.ragConfig?.enabled && 
          field.ragConfig?.extraction_enabled &&
          field.ragConfig?.extraction_fields_description;
        
        // Skip validation for file fields with complete templates
        if (hasCompleteTemplate) {
          return;
        }
      }

      if (fieldIssues.length > 0) {
        fieldsValidation.fieldIssues[field.id] = fieldIssues;
        fieldsValidation.isValid = false;
      }
    });

    // Steps Validation (only if steps exist)
    const stepsValidation = {
      isValid: true,
      issues: [],
    };
    if (steps.length > 0) {
      const fieldsWithSteps = fields.filter((f) => f.step);
      const fieldsWithoutSteps = fields.filter((f) => !f.step);

      if (fieldsWithoutSteps.length > 0) {
        stepsValidation.issues.push(
          `${fieldsWithoutSteps.length} field(s) not assigned to any step`
        );
        stepsValidation.isValid = false;
      }

      steps.forEach((step) => {
        const stepFields = fields.filter((f) => f.step === step.id);
        if (stepFields.length === 0) {
          stepsValidation.issues.push(`Step "${step.title}" has no fields`);
          stepsValidation.isValid = false;
        }
      });
    }

    // Entity Operations Validation
    const operationsValidation = {
      isValid: true,
      issues: [],
      operationIssues: {},
    };

    // Check if file upload fields with templates that have default operations exist
    const fileFieldsWithTemplateOps = fields.filter(
      f => f.type === 'file' && 
      f.templateId && 
      f.ragConfig?.default_entity_operations?.length > 0
    );

    entityOperations.forEach((op, idx) => {
      const opIssues = [];
      if (!op.entity) opIssues.push('Entity not selected');
      if (!op.type) opIssues.push('Operation type not selected');

      if (op.type === 'update') {
        if (!op.idResolution?.method) {
          opIssues.push('ID resolution method not configured');
        } else if (op.idResolution.method === 'field' && !op.idResolution.fieldId) {
          opIssues.push('Field for entity ID not selected');
        } else if (op.idResolution.method === 'context' && !op.idResolution.contextPath) {
          opIssues.push('Context path for entity ID not provided');
        }
      }

      if (!op.fieldMapping || Object.keys(op.fieldMapping).length === 0) {
        opIssues.push('No field mappings configured');
      }

      if (opIssues.length > 0) {
        operationsValidation.operationIssues[idx] = opIssues;
        operationsValidation.isValid = false;
      }
    });

    // Valid if either: manual operations configured OR file templates with default operations exist
    if (entityOperations.length === 0 && fileFieldsWithTemplateOps.length === 0) {
      operationsValidation.issues.push('No entity operations configured (data won\'t be saved)');
      operationsValidation.isValid = false;
    }

    // Webhooks Validation (optional, but validate if present)
    const webhooksValidation = {
      isValid: true,
      issues: [],
    };
    webhooks.forEach((webhook, idx) => {
      if (webhook.enabled && !webhook.url) {
        webhooksValidation.issues.push(`Webhook ${idx + 1} has no URL`);
        webhooksValidation.isValid = false;
      }
    });

    // Email Notifications Validation (optional, but validate if present)
    const emailValidation = {
      isValid: true,
      issues: [],
    };
    emailNotifications.forEach((email, idx) => {
      if (email.enabled) {
        if (!email.to) emailValidation.issues.push(`Email ${idx + 1} has no recipient`);
        if (!email.subject) emailValidation.issues.push(`Email ${idx + 1} has no subject`);
        if (!email.body) emailValidation.issues.push(`Email ${idx + 1} has no body`);
        if (!email.to || !email.subject || !email.body) {
          emailValidation.isValid = false;
        }
      }
    });

    // Overall validation
    const criticalSections = [basicInfo, fieldsValidation, operationsValidation];
    const allValid = criticalSections.every((s) => s.isValid);
    const totalIssues = [
      ...basicInfo.issues,
      ...fieldsValidation.issues,
      ...stepsValidation.issues,
      ...operationsValidation.issues,
      ...webhooksValidation.issues,
      ...emailValidation.issues,
    ].length;

    return {
      isValid: allValid,
      criticalIssues: !allValid,
      totalIssues,
      sections: {
        basicInfo,
        fields: fieldsValidation,
        steps: stepsValidation,
        operations: operationsValidation,
        webhooks: webhooksValidation,
        emails: emailValidation,
      },
    };
  }, [
    name,
    description,
    fields,
    steps,
    entityOperations,
    webhooks,
    emailNotifications,
    statusUpdates,
  ]);

  return validation;
}