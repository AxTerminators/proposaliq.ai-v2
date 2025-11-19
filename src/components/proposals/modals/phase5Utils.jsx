/**
 * Phase 5 Utility Functions
 * 
 * Helpers for evaluating conditional operations, resolving entity IDs,
 * and processing advanced field mappings
 */

/**
 * Evaluate a single condition
 */
export function evaluateCondition(condition, formData, allFields) {
  const field = allFields.find(f => f.id === condition.field);
  if (!field) return false;

  const fieldValue = formData[field.name];
  const compareValue = condition.value;

  switch (condition.operator) {
    case 'equals':
      return fieldValue === compareValue;
    case 'not_equals':
      return fieldValue !== compareValue;
    case 'contains':
      return String(fieldValue).includes(compareValue);
    case 'not_contains':
      return !String(fieldValue).includes(compareValue);
    case 'is_empty':
      return !fieldValue || fieldValue === '';
    case 'is_not_empty':
      return fieldValue && fieldValue !== '';
    case 'greater_than':
      return Number(fieldValue) > Number(compareValue);
    case 'less_than':
      return Number(fieldValue) < Number(compareValue);
    default:
      return false;
  }
}

/**
 * Evaluate conditions for an entity operation
 */
export function shouldExecuteOperation(operation, formData, allFields) {
  if (!operation.conditions || operation.conditions.length === 0) {
    return true; // No conditions, always execute
  }

  const logic = operation.conditionLogic || 'and';
  const results = operation.conditions.map(cond => 
    evaluateCondition(cond, formData, allFields)
  );

  if (logic === 'and') {
    return results.every(r => r === true);
  } else if (logic === 'or') {
    return results.some(r => r === true);
  }

  return false;
}

/**
 * Resolve entity ID for update operations
 */
export function resolveEntityId(operation, formData, context, allFields) {
  const idResolution = operation.idResolution;
  if (!idResolution) return null;

  if (idResolution.method === 'field') {
    // Get ID from form field
    const field = allFields.find(f => f.id === idResolution.fieldId);
    if (!field) return null;
    return formData[field.name];
  } else if (idResolution.method === 'context') {
    // Get ID from context using path
    const path = idResolution.contextPath;
    if (!path) return null;

    const parts = path.split('.');
    let value = context;
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return null;
      }
    }
    return value;
  }

  return null;
}

/**
 * Process nested path to set value in object
 */
export function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
  return obj;
}

/**
 * Compute field value from other fields
 */
export function computeFieldValue(field, formData, allFields) {
  const mapping = field.advancedMapping;
  if (!mapping || !mapping.isComputed) return null;

  const sourceFields = mapping.computedFields || [];
  const sourceValues = sourceFields.map(fieldId => {
    const sourceField = allFields.find(f => f.id === fieldId);
    return sourceField ? formData[sourceField.name] : null;
  }).filter(val => val !== null && val !== undefined);

  const computationType = mapping.computationType || 'concat';

  switch (computationType) {
    case 'concat': {
      const separator = mapping.computationSeparator || ' ';
      return sourceValues.join(separator);
    }
    case 'sum':
      return sourceValues.reduce((sum, val) => sum + Number(val), 0);
    case 'average':
      if (sourceValues.length === 0) return 0;
      return sourceValues.reduce((sum, val) => sum + Number(val), 0) / sourceValues.length;
    case 'custom': {
      // Execute custom expression (simple eval with safety)
      try {
        const expression = mapping.computedExpression;
        if (!expression) return null;

        // Build context for evaluation
        const evalContext = {};
        sourceFields.forEach((fieldId, idx) => {
          evalContext[fieldId] = sourceValues[idx];
        });

        // Simple string replacement for field IDs
        let processedExpression = expression;
        Object.keys(evalContext).forEach(fieldId => {
          const regex = new RegExp(fieldId, 'g');
          processedExpression = processedExpression.replace(
            regex, 
            JSON.stringify(evalContext[fieldId])
          );
        });

        // Evaluate (Note: eval is risky, in production consider a safer parser)
        // For now, we'll do basic string operations only
        return processedExpression;
      } catch (error) {
        console.error('[Phase5Utils] Custom computation error:', error);
        return null;
      }
    }
    default:
      return null;
  }
}

/**
 * Apply advanced field mappings to form data
 */
export function applyAdvancedMappings(fields, formData, allFields) {
  const processedData = { ...formData };

  fields.forEach(field => {
    const mapping = field.advancedMapping;
    if (!mapping) return;

    // Compute value if needed
    if (mapping.isComputed) {
      const computed = computeFieldValue(field, formData, allFields);
      if (computed !== null) {
        processedData[field.name] = computed;
      }
    }
  });

  return processedData;
}

/**
 * Build entity data from form data with field mappings
 */
export function buildEntityData(formData, fieldMappings, allFields) {
  const entityData = {};

  fieldMappings.forEach(mapping => {
    const field = allFields.find(f => f.id === mapping.fieldId);
    if (!field) return;

    const value = formData[field.name];
    if (value === undefined || value === null) return;

    const targetAttr = mapping.targetAttribute;
    if (!targetAttr) return;

    // Check for nested path
    if (field.advancedMapping?.isNested && field.advancedMapping?.nestedPath) {
      setNestedValue(entityData, field.advancedMapping.nestedPath, value);
    } else {
      entityData[targetAttr] = value;
    }
  });

  return entityData;
}