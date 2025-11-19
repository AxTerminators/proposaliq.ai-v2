import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';

/**
 * Error Handling Component
 * 
 * Phase 4: Validation and error feedback throughout the builder
 */
export function ValidationAlert({ errors }) {
  if (!errors || errors.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-1">
          {errors.map((error, idx) => (
            <div key={idx}>• {error}</div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function SuccessAlert({ message }) {
  if (!message) return null;

  return (
    <Alert className="mb-4 border-green-500 bg-green-50">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        {message}
      </AlertDescription>
    </Alert>
  );
}

export function WarningAlert({ message }) {
  if (!message) return null;

  return (
    <Alert className="mb-4 border-yellow-500 bg-yellow-50">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800">
        {message}
      </AlertDescription>
    </Alert>
  );
}

// Validation helpers
export const validateModalConfig = (config, fields, steps) => {
  const errors = [];

  if (!config.name?.trim()) {
    errors.push('Modal name is required');
  }

  if (fields.length === 0) {
    errors.push('At least one field is required');
  }

  // Validate fields
  fields.forEach((field, idx) => {
    if (!field.label?.trim()) {
      errors.push(`Field ${idx + 1}: Label is required`);
    }

    if (field.type === 'select' && (!field.options || field.options.length === 0)) {
      errors.push(`Field "${field.label}": Dropdown must have at least one option`);
    }

    if (field.mappingType === 'entity' && !field.targetEntity) {
      errors.push(`Field "${field.label}": Target entity is required for entity mapping`);
    }

    if (field.mappingType === 'entity' && !field.targetAttribute) {
      errors.push(`Field "${field.label}": Target attribute is required for entity mapping`);
    }

    if (field.mappingType === 'custom_json' && !field.customJsonPath) {
      errors.push(`Field "${field.label}": JSON path is required for custom mapping`);
    }
  });

  // Validate steps
  if (steps.length > 0) {
    steps.forEach((step, idx) => {
      if (!step.title?.trim()) {
        errors.push(`Step ${idx + 1}: Title is required`);
      }
    });

    // Check if all fields are assigned to steps
    const unassignedFields = fields.filter(f => !f.stepId);
    if (unassignedFields.length > 0) {
      errors.push(`${unassignedFields.length} field(s) not assigned to any step`);
    }
  }

  return errors;
};