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

    const existingBoards = await base44.entities.KanbanConfig.filter({
      organization_id: organizationId
    });

    const duplicate = existingBoards.find(board => {
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

    const existingTemplates = await base44.entities.ProposalWorkflowTemplate.list();

    const duplicate = existingTemplates.find(template => {
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

    const existingProposals = await base44.entities.Proposal.filter({
      organization_id: organizationId
    });

    const duplicate = existingProposals.find(proposal => {
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

    const existingPartners = await base44.entities.TeamingPartner.filter({
      organization_id: organizationId
    });

    const duplicate = existingPartners.find(partner => {
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
 * Check if a ProposalResource title is unique within an organization and folder
 * @param {string} title - The proposed resource title
 * @param {string} organizationId - The organization ID
 * @param {string} folderId - Optional: folder ID for scoped uniqueness
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isUnique: boolean, existingResource?: object}>}
 */
export const checkResourceTitleUnique = async (title, organizationId, folderId = null, excludeId = null) => {
  try {
    if (!title || !organizationId) {
      return { isUnique: false, error: 'Resource title and organization ID are required' };
    }

    const normalizedTitle = normalizeForComparison(title);

    const query = { organization_id: organizationId };
    if (folderId) {
      query.folder_id = folderId;
    }

    const existingResources = await base44.entities.ProposalResource.filter(query);

    const duplicate = existingResources.find(resource => {
      if (excludeId && resource.id === excludeId) {
        return false;
      }
      return normalizeForComparison(resource.title) === normalizedTitle;
    });

    if (duplicate) {
      return {
        isUnique: false,
        existingResource: duplicate
      };
    }

    return { isUnique: true };
  } catch (error) {
    console.error('[BoardNameValidation] Error checking resource title uniqueness:', error);
    return {
      isUnique: false,
      error: error.message || 'Failed to check resource title uniqueness'
    };
  }
};

/**
 * Check if a KeyPersonnel name is unique within an organization
 * @param {string} fullName - The proposed personnel name
 * @param {string} organizationId - The organization ID
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isUnique: boolean, existingPersonnel?: object}>}
 */
export const checkPersonnelNameUnique = async (fullName, organizationId, excludeId = null) => {
  try {
    if (!fullName || !organizationId) {
      return { isUnique: false, error: 'Personnel name and organization ID are required' };
    }

    const normalizedName = normalizeForComparison(fullName);

    const existingPersonnel = await base44.entities.KeyPersonnel.filter({
      organization_id: organizationId
    });

    const duplicate = existingPersonnel.find(person => {
      if (excludeId && person.id === excludeId) {
        return false;
      }
      return normalizeForComparison(person.full_name) === normalizedName;
    });

    if (duplicate) {
      return {
        isUnique: false,
        existingPersonnel: duplicate
      };
    }

    return { isUnique: true };
  } catch (error) {
    console.error('[BoardNameValidation] Error checking personnel name uniqueness:', error);
    return {
      isUnique: false,
      error: error.message || 'Failed to check personnel name uniqueness'
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
  if (!boardName || boardName.trim().length === 0) {
    return {
      isValid: false,
      message: 'Board name cannot be empty'
    };
  }

  if (boardName.trim().length < 3) {
    return {
      isValid: false,
      message: 'Board name must be at least 3 characters long'
    };
  }

  if (boardName.trim().length > 100) {
    return {
      isValid: false,
      message: 'Board name must be less than 100 characters'
    };
  }

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
  if (!templateName || templateName.trim().length === 0) {
    return {
      isValid: false,
      message: 'Template name cannot be empty'
    };
  }

  if (templateName.trim().length < 3) {
    return {
      isValid: false,
      message: 'Template name must be at least 3 characters long'
    };
  }

  const finalName = enforceTemplateSuffix(templateName);

  if (finalName.length > 100) {
    return {
      isValid: false,
      message: 'Template name is too long (max 100 characters including " Template" suffix)'
    };
  }

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
  if (!proposalName || proposalName.trim().length === 0) {
    return {
      isValid: false,
      message: 'Proposal name cannot be empty'
    };
  }

  if (proposalName.trim().length < 6) {
    return {
      isValid: false,
      message: 'Proposal name must be at least 6 characters long'
    };
  }

  if (proposalName.trim().length > 60) {
    return {
      isValid: false,
      message: 'Proposal name must be less than 60 characters'
    };
  }

  if (containsForbiddenCharacters(proposalName)) {
    return {
      isValid: false,
      message: `Proposal name contains forbidden characters. Please avoid: ${FORBIDDEN_CHARS_LIST}`
    };
  }

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
  if (!partnerName || partnerName.trim().length === 0) {
    return {
      isValid: false,
      message: 'Partner name cannot be empty'
    };
  }

  if (partnerName.trim().length < 3) {
    return {
      isValid: false,
      message: 'Partner name must be at least 3 characters long'
    };
  }

  if (partnerName.trim().length > 150) {
    return {
      isValid: false,
      message: 'Partner name must be less than 150 characters'
    };
  }

  if (containsForbiddenCharacters(partnerName)) {
    return {
      isValid: false,
      message: `Partner name contains forbidden characters. Please avoid: ${FORBIDDEN_CHARS_LIST}`
    };
  }

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

/**
 * Validate a resource title and provide user-friendly feedback
 * @param {string} title - The proposed resource title
 * @param {string} organizationId - The organization ID
 * @param {string} folderId - Optional: folder ID for scoped validation
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isValid: boolean, message?: string}>}
 */
export const validateResourceTitle = async (title, organizationId, folderId = null, excludeId = null) => {
  if (!title || title.trim().length === 0) {
    return {
      isValid: false,
      message: 'Resource title cannot be empty'
    };
  }

  if (title.trim().length < 3) {
    return {
      isValid: false,
      message: 'Resource title must be at least 3 characters long'
    };
  }

  if (title.trim().length > 200) {
    return {
      isValid: false,
      message: 'Resource title must be less than 200 characters'
    };
  }

  if (containsForbiddenCharacters(title)) {
    return {
      isValid: false,
      message: `Resource title contains forbidden characters. Please avoid: ${FORBIDDEN_CHARS_LIST}`
    };
  }

  const uniqueCheck = await checkResourceTitleUnique(title, organizationId, folderId, excludeId);
  
  if (uniqueCheck.error) {
    return {
      isValid: false,
      message: uniqueCheck.error
    };
  }

  if (!uniqueCheck.isUnique) {
    return {
      isValid: false,
      message: folderId 
        ? `A resource titled "${title}" already exists in this folder. Please choose a different title.`
        : `A resource titled "${title}" already exists. Please choose a different title.`
    };
  }

  return { isValid: true };
};

/**
 * Validate a key personnel name and provide user-friendly feedback
 * @param {string} fullName - The proposed personnel name
 * @param {string} organizationId - The organization ID
 * @param {string} excludeId - Optional: ID to exclude from check (for updates)
 * @returns {Promise<{isValid: boolean, message?: string}>}
 */
export const validatePersonnelName = async (fullName, organizationId, excludeId = null) => {
  if (!fullName || fullName.trim().length === 0) {
    return {
      isValid: false,
      message: 'Full name cannot be empty'
    };
  }

  if (fullName.trim().length < 2) {
    return {
      isValid: false,
      message: 'Full name must be at least 2 characters long'
    };
  }

  if (fullName.trim().length > 100) {
    return {
      isValid: false,
      message: 'Full name must be less than 100 characters'
    };
  }

  if (containsForbiddenCharacters(fullName)) {
    return {
      isValid: false,
      message: `Full name contains forbidden characters. Please avoid: ${FORBIDDEN_CHARS_LIST}`
    };
  }

  const uniqueCheck = await checkPersonnelNameUnique(fullName, organizationId, excludeId);
  
  if (uniqueCheck.error) {
    return {
      isValid: false,
      message: uniqueCheck.error
    };
  }

  if (!uniqueCheck.isUnique) {
    return {
      isValid: false,
      message: `A person named "${fullName}" already exists in your organization. Please use a different name or edit the existing record.`
    };
  }

  return { isValid: true };
};