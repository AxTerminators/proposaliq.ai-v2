/**
 * Icon Mapping Utility
 * 
 * Provides fallback icon system using Lucide icons instead of emojis.
 * Use this if emoji-based icons continue to cause issues.
 */

import {
  FileText,      // 📋 General/RFP
  FileEdit,      // 📝 RFI
  Microscope,    // 🔬 SBIR (closest match to microscope emoji)
  Building,      // 🏛️ GSA
  Layers,        // 📑 IDIQ/Stacked documents
  Building2,     // 🏢 State/Local
  Target,        // 🎯 15-Column RFP
  Folder,        // 📂 Template Workspace
  Palette,       // 🎨 Custom Proposal
  Wrench,        // 🛠️ Custom Project
  BarChart3,     // 📊 General/Custom
  Star,          // ⭐ Master Board
} from "lucide-react";

// Map board/template types to Lucide icon components
export const BOARD_TYPE_LUCIDE_ICONS = {
  'master': Star,
  'rfp': FileText,
  'rfi': FileEdit,
  'sbir': Microscope,
  'gsa': Building,
  'idiq': Layers,
  'state_local': Building2,
  'rfp_15_column': Target,
  'template_workspace': Folder,
  'custom_proposal': Palette,
  'custom_project': Wrench,
  'custom': BarChart3
};

/**
 * Get Lucide icon component for a given board/template type
 * @param {string} type - Board or template type
 * @returns {Component} Lucide icon component
 */
export function getLucideIcon(type) {
  return BOARD_TYPE_LUCIDE_ICONS[type] || FileText;
}

/**
 * Render a Lucide icon with consistent styling
 * Usage: <IconDisplay type="rfp" className="w-6 h-6" />
 */
export function IconDisplay({ type, className = "w-6 h-6", color = "text-blue-600" }) {
  const IconComponent = getLucideIcon(type);
  return <IconComponent className={`${className} ${color}`} />;
}

/**
 * Get emoji for board/template type (current system - kept for backwards compatibility)
 */
export const BOARD_TYPE_EMOJIS = {
  'master': '⭐',
  'rfp': '📋',
  'rfi': '📝',
  'sbir': '🔬',
  'gsa': '🏛️',
  'idiq': '📑',
  'state_local': '🏢',
  'rfp_15_column': '🎯',
  'template_workspace': '📂',
  'custom_proposal': '🎨',
  'custom_project': '🛠️',
  'custom': '📊'
};

/**
 * Safely get icon (emoji or fallback) for a template/board
 * This function handles all the null-checking you need
 */
export function getTemplateIcon(template, fallback = '📋') {
  if (!template) return fallback;
  
  // Priority 1: Use template's icon_emoji if available
  if (template.icon_emoji) return template.icon_emoji;
  
  // Priority 2: Use board_type emoji
  if (template.board_type && BOARD_TYPE_EMOJIS[template.board_type]) {
    return BOARD_TYPE_EMOJIS[template.board_type];
  }
  
  // Priority 3: Use proposal_type_category
  const categoryType = template.proposal_type_category?.toLowerCase();
  if (categoryType && BOARD_TYPE_EMOJIS[categoryType]) {
    return BOARD_TYPE_EMOJIS[categoryType];
  }
  
  // Fallback
  return fallback;
}