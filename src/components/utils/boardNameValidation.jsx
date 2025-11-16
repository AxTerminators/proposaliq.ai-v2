import { base44 } from "@/api/base44Client";

/**
 * Normalize a name for case-insensitive comparison
 * @param {string} name - The name to normalize
 * @returns {string} - Lowercase, trimmed name
 */
export const normalizeForComparison = (name) => {
  if (!name) return '';
  return name.trim().toLowerCase();
};

/**
 * Check if a KanbanConfig board name is unique within an organization
 * @param {string} boardName - The proposed board name
 * @param {string} organizationId - The organization ID
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isUnique: boolean, existingBoard?: object}>}
 */
export const checkBoardNameUnique = async (boardName, organizationId, excludeId = null) => {
  try {
    if (!boardName || !organizationId) {
      return { isUnique: false, error: 'Board name and organization ID are required' };
    }

    const normalizedProposedName = normalizeForComparison(boardName);

    // Fetch all boards for this organization
    const existingBoards = await base44.entities.KanbanConfig.filter({
      organization_id: organizationId
    });

    // Check for duplicates (case-insensitive)
    const duplicate = existingBoards.find(board => {
      // Exclude the current board if we're updating
      if (excludeId && board.id === excludeId) {
        return false;
      }
      return normalizeForComparison(board.board_name) === normalizedProposedName;
    });

    if (duplicate) {
      return {
        isUnique: false,
        existingBoard: duplicate
      };
    }

    return { isUnique: true };
  } catch (error) {
    console.error('[BoardNameValidation] Error checking board name uniqueness:', error);
    return {
      isUnique: false,
      error: error.message || 'Failed to check board name uniqueness'
    };
  }
};

/**
 * Check if a ProposalWorkflowTemplate name is unique
 * @param {string} templateName - The proposed template name
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isUnique: boolean, existingTemplate?: object}>}
 */
export const checkTemplateNameUnique = async (templateName, excludeId = null) => {
  try {
    if (!templateName) {
      return { isUnique: false, error: 'Template name is required' };
    }

    const normalizedProposedName = normalizeForComparison(templateName);

    // Fetch all templates
    const existingTemplates = await base44.entities.ProposalWorkflowTemplate.list();

    // Check for duplicates (case-insensitive)
    const duplicate = existingTemplates.find(template => {
      // Exclude the current template if we're updating
      if (excludeId && template.id === excludeId) {
        return false;
      }
      return normalizeForComparison(template.template_name) === normalizedProposedName;
    });

    if (duplicate) {
      return {
        isUnique: false,
        existingTemplate: duplicate
      };
    }

    return { isUnique: true };
  } catch (error) {
    console.error('[BoardNameValidation] Error checking template name uniqueness:', error);
    return {
      isUnique: false,
      error: error.message || 'Failed to check template name uniqueness'
    };
  }
};

/**
 * Ensure a template name ends with " Template"
 * @param {string} name - The proposed template name
 * @returns {string} - Name with " Template" suffix
 */
export const enforceTemplateSuffix = (name) => {
  if (!name) return '';
  
  const trimmedName = name.trim();
  const suffix = ' Template';
  
  // Check if it already ends with " Template" (case-insensitive)
  const endsWithTemplate = trimmedName.toLowerCase().endsWith(suffix.toLowerCase());
  
  if (endsWithTemplate) {
    return trimmedName;
  }
  
  return trimmedName + suffix;
};

/**
 * Validate a board name and provide user-friendly feedback
 * @param {string} boardName - The proposed board name
 * @param {string} organizationId - The organization ID
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isValid: boolean, message?: string}>}
 */
export const validateBoardName = async (boardName, organizationId, excludeId = null) => {
  // Check if name is empty
  if (!boardName || boardName.trim().length === 0) {
    return {
      isValid: false,
      message: 'Board name cannot be empty'
    };
  }

  // Check if name is too short
  if (boardName.trim().length < 3) {
    return {
      isValid: false,
      message: 'Board name must be at least 3 characters long'
    };
  }

  // Check if name is too long
  if (boardName.trim().length > 100) {
    return {
      isValid: false,
      message: 'Board name must be less than 100 characters'
    };
  }

  // Check uniqueness
  const uniqueCheck = await checkBoardNameUnique(boardName, organizationId, excludeId);
  
  if (uniqueCheck.error) {
    return {
      isValid: false,
      message: uniqueCheck.error
    };
  }

  if (!uniqueCheck.isUnique) {
    return {
      isValid: false,
      message: `A board named "${boardName}" already exists. Please choose a different name.`
    };
  }

  return { isValid: true };
};

/**
 * Validate a template name and provide user-friendly feedback
 * @param {string} templateName - The proposed template name
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isValid: boolean, message?: string, finalName?: string}>}
 */
export const validateTemplateName = async (templateName, excludeId = null) => {
  // Check if name is empty
  if (!templateName || templateName.trim().length === 0) {
    return {
      isValid: false,
      message: 'Template name cannot be empty'
    };
  }

  // Check if name is too short
  if (templateName.trim().length < 3) {
    return {
      isValid: false,
      message: 'Template name must be at least 3 characters long'
    };
  }

  // Enforce the " Template" suffix
  const finalName = enforceTemplateSuffix(templateName);

  // Check if final name is too long
  if (finalName.length > 100) {
    return {
      isValid: false,
      message: 'Template name is too long (max 100 characters including " Template" suffix)'
    };
  }

  // Check uniqueness
  const uniqueCheck = await checkTemplateNameUnique(finalName, excludeId);
  
  if (uniqueCheck.error) {
    return {
      isValid: false,
      message: uniqueCheck.error
    };
  }

  if (!uniqueCheck.isUnique) {
    return {
      isValid: false,
      message: `A template named "${finalName}" already exists. Please choose a different name.`
    };
  }

  return {
    isValid: true,
    finalName: finalName
  };
};