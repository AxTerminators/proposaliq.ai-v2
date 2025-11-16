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
 * Define forbidden characters for names that could cause issues
 * with file systems, URLs, or databases
 */
export const FORBIDDEN_CHARACTERS = /[/\\:*?"<>|#%&]/;
export const FORBIDDEN_CHARS_LIST = '/\\:*?"<>|#%&';

/**
 * Check if a string contains forbidden characters
 * @param {string} name - The name to check
 * @returns {boolean} - True if contains forbidden characters
 */
export const containsForbiddenCharacters = (name) => {
  if (!name) return false;
  return FORBIDDEN_CHARACTERS.test(name);
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
 * Check if a Proposal name is unique within the appropriate context
 * @param {string} proposalName - The proposed proposal name
 * @param {string} organizationId - The organization ID
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isUnique: boolean, existingProposal?: object}>}
 */
export const checkProposalNameUnique = async (proposalName, organizationId, excludeId = null) => {
  try {
    if (!proposalName || !organizationId) {
      return { isUnique: false, error: 'Proposal name and organization ID are required' };
    }

    const normalizedProposedName = normalizeForComparison(proposalName);

    // Fetch all proposals for this organization
    const existingProposals = await base44.entities.Proposal.filter({
      organization_id: organizationId
    });

    // Check for duplicates (case-insensitive)
    const duplicate = existingProposals.find(proposal => {
      // Exclude the current proposal if we're updating
      if (excludeId && proposal.id === excludeId) {
        return false;
      }
      return normalizeForComparison(proposal.proposal_name) === normalizedProposedName;
    });

    if (duplicate) {
      return {
        isUnique: false,
        existingProposal: duplicate
      };
    }

    return { isUnique: true };
  } catch (error) {
    console.error('[BoardNameValidation] Error checking proposal name uniqueness:', error);
    return {
      isUnique: false,
      error: error.message || 'Failed to check proposal name uniqueness'
    };
  }
};

/**
 * Check if a TeamingPartner name is unique within an organization
 * @param {string} partnerName - The proposed partner name
 * @param {string} organizationId - The organization ID
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isUnique: boolean, existingPartner?: object}>}
 */
export const checkPartnerNameUnique = async (partnerName, organizationId, excludeId = null) => {
  try {
    if (!partnerName || !organizationId) {
      return { isUnique: false, error: 'Partner name and organization ID are required' };
    }

    const normalizedProposedName = normalizeForComparison(partnerName);

    // Fetch all partners for this organization
    const existingPartners = await base44.entities.TeamingPartner.filter({
      organization_id: organizationId
    });

    // Check for duplicates (case-insensitive)
    const duplicate = existingPartners.find(partner => {
      // Exclude the current partner if we're updating
      if (excludeId && partner.id === excludeId) {
        return false;
      }
      return normalizeForComparison(partner.partner_name) === normalizedProposedName;
    });

    if (duplicate) {
      return {
        isUnique: false,
        existingPartner: duplicate
      };
    }

    return { isUnique: true };
  } catch (error) {
    console.error('[BoardNameValidation] Error checking partner name uniqueness:', error);
    return {
      isUnique: false,
      error: error.message || 'Failed to check partner name uniqueness'
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

/**
 * Validate a proposal name and provide user-friendly feedback
 * @param {string} proposalName - The proposed proposal name
 * @param {string} organizationId - The organization ID
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isValid: boolean, message?: string}>}
 */
export const validateProposalName = async (proposalName, organizationId, excludeId = null) => {
  // Check if name is empty
  if (!proposalName || proposalName.trim().length === 0) {
    return {
      isValid: false,
      message: 'Proposal name cannot be empty'
    };
  }

  // Check if name is too short
  if (proposalName.trim().length < 6) {
    return {
      isValid: false,
      message: 'Proposal name must be at least 6 characters long'
    };
  }

  // Check if name is too long
  if (proposalName.trim().length > 60) {
    return {
      isValid: false,
      message: 'Proposal name must be less than 60 characters'
    };
  }

  // Check for forbidden characters
  if (containsForbiddenCharacters(proposalName)) {
    return {
      isValid: false,
      message: `Proposal name contains forbidden characters. Please avoid: ${FORBIDDEN_CHARS_LIST}`
    };
  }

  // Check uniqueness
  const uniqueCheck = await checkProposalNameUnique(proposalName, organizationId, excludeId);
  
  if (uniqueCheck.error) {
    return {
      isValid: false,
      message: uniqueCheck.error
    };
  }

  if (!uniqueCheck.isUnique) {
    return {
      isValid: false,
      message: `A proposal named "${proposalName}" already exists. Please choose a different name.`
    };
  }

  return { isValid: true };
};

/**
 * Validate a teaming partner name and provide user-friendly feedback
 * @param {string} partnerName - The proposed partner name
 * @param {string} organizationId - The organization ID
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isValid: boolean, message?: string}>}
 */
export const validatePartnerName = async (partnerName, organizationId, excludeId = null) => {
  // Check if name is empty
  if (!partnerName || partnerName.trim().length === 0) {
    return {
      isValid: false,
      message: 'Partner name cannot be empty'
    };
  }

  // Check if name is too short
  if (partnerName.trim().length < 3) {
    return {
      isValid: false,
      message: 'Partner name must be at least 3 characters long'
    };
  }

  // Check if name is too long
  if (partnerName.trim().length > 150) {
    return {
      isValid: false,
      message: 'Partner name must be less than 150 characters'
    };
  }

  // Check for forbidden characters
  if (containsForbiddenCharacters(partnerName)) {
    return {
      isValid: false,
      message: `Partner name contains forbidden characters. Please avoid: ${FORBIDDEN_CHARS_LIST}`
    };
  }

  // Check uniqueness
  const uniqueCheck = await checkPartnerNameUnique(partnerName, organizationId, excludeId);
  
  if (uniqueCheck.error) {
    return {
      isValid: false,
      message: uniqueCheck.error
    };
  }

  if (!uniqueCheck.isUnique) {
    return {
      isValid: false,
      message: `A partner named "${partnerName}" already exists in your organization. Please choose a different name.`
    };
  }

  return { isValid: true };
};