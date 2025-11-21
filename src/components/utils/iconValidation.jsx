/**
 * Icon Validation Utilities
 * Ensures icon_emoji fields are never null/undefined/empty
 */

const DEFAULT_ICONS = {
  // Template icons by proposal type
  template: {
    'RFP': '📋',
    'RFI': '📝',
    'SBIR': '🔬',
    'GSA': '🏛️',
    'IDIQ': '📑',
    'STATE_LOCAL': '🏢',
    'RFP_15_COLUMN': '🎯',
    'OTHER': '📊',
    'default': '📋'
  },
  
  // Modal icons by category
  modal: {
    'basic_info': '📋',
    'team_formation': '👥',
    'resource_gathering': '📚',
    'evaluation': '🎯',
    'pricing': '💰',
    'custom': '⚙️',
    'default': '📄'
  }
};

/**
 * Validates and ensures icon_emoji is never null/undefined/empty
 * Returns a valid icon or a default based on context
 */
export function ensureValidIcon(icon, type = 'template', category = null) {
  // If icon is valid, return it
  if (icon && typeof icon === 'string' && icon.trim().length > 0) {
    return icon.trim();
  }
  
  // Otherwise, get appropriate default
  if (type === 'modal' && category) {
    return DEFAULT_ICONS.modal[category] || DEFAULT_ICONS.modal.default;
  }
  
  if (type === 'template' && category) {
    return DEFAULT_ICONS.template[category] || DEFAULT_ICONS.template.default;
  }
  
  return type === 'modal' ? DEFAULT_ICONS.modal.default : DEFAULT_ICONS.template.default;
}

/**
 * Sanitizes template data before save to ensure icon_emoji is valid
 */
export function sanitizeTemplateData(templateData) {
  return {
    ...templateData,
    icon_emoji: ensureValidIcon(
      templateData.icon_emoji,
      'template',
      templateData.proposal_type_category || templateData.board_type
    )
  };
}

/**
 * Sanitizes modal config data before save to ensure icon_emoji is valid
 */
export function sanitizeModalConfigData(modalData) {
  return {
    ...modalData,
    icon_emoji: ensureValidIcon(
      modalData.icon_emoji,
      'modal',
      modalData.category
    )
  };
}