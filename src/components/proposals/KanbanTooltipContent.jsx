/**
 * Centralized Kanban Tooltip Content
 * 
 * This file contains all tooltip messages for the Kanban board system.
 * Centralizing these helps maintain consistency and makes updates easier.
 */

export const KANBAN_TOOLTIPS = {
  // WIP Limits
  WIP_LIMIT_SOFT: "Work In Progress Limit (Soft): This column can hold up to {limit} proposals. You'll get a warning when exceeding this limit, but can still add more.",
  WIP_LIMIT_HARD: "Work In Progress Limit (Hard): This column is restricted to {limit} proposals maximum. You cannot add more until others are moved out.",
  WIP_LIMIT_NEAR: "WIP Limit Warning: You're approaching the limit for this column ({current}/{limit}). Consider moving proposals to maintain healthy flow.",
  
  // Column Permissions
  DRAG_FROM_RESTRICTED: "Protected Column: Only users with specific roles ({roles}) can move proposals out of this column. This ensures proper workflow authorization.",
  DRAG_TO_RESTRICTED: "Restricted Access: Only users with specific roles ({roles}) can move proposals into this column. Contact your admin if you need access.",
  
  // Approval Gates
  APPROVAL_REQUIRED: "Approval Required: Moving proposals out of this column to terminal states (Submitted, Won, Lost) requires approval from authorized users ({roles}).",
  
  // Column Types
  LOCKED_COLUMN: "System Column: This is a locked system column that maps to a specific workflow phase and cannot be renamed, deleted, or reordered.",
  TERMINAL_COLUMN: "Terminal State: This column represents a final state (Submitted, Won, Lost, Archived) and appears on all boards.",
  CUSTOM_STAGE: "Custom Stage: A user-defined workflow stage that you can fully customize, rename, or delete.",
  MASTER_STATUS_COLUMN: "Master Board Column: Groups multiple proposal statuses together for a unified view across all proposal types.",
  
  // Board Types
  MASTER_BOARD: "Master Board: A unified view showing all proposals regardless of type. Great for getting a high-level overview of your entire pipeline.",
  TYPE_SPECIFIC_BOARD: "Type-Specific Board: This board only shows proposals of type '{type}', allowing focused workflow management for specific solicitation types.",
  
  // Sorting
  SORT_ACTIVE: "Active Sort: This column is currently sorted by {field} ({direction}). Click to change or clear the sort.",
  SORT_OPTION_TITLE: "Sort by Title: Arranges proposals alphabetically by their proposal name.",
  SORT_OPTION_DUE_DATE: "Sort by Due Date: Orders proposals by submission deadline. Proposals without due dates appear at the end.",
  SORT_OPTION_DATE_ADDED: "Sort by Date Added: Shows proposals by when they were created in the system.",
  
  // Filters
  QUICK_FILTERS: "Quick Filters: Narrow down your view by agency, team member, or client. Use Advanced Filters for more complex queries.",
  ADVANCED_FILTERS: "Advanced Filters: Build complex filter logic with multiple conditions, date ranges, and custom fields.",
  
  // Actions
  COLLAPSE_COLUMN: "Collapse Column: Minimize this column to a thin vertical bar to save screen space while keeping it accessible.",
  CONFIGURE_COLUMN: "Configure Column: Customize this column's name, color, checklist items, WIP limits, and access permissions.",
  
  // Cards
  ACTION_REQUIRED: "Action Required: This proposal has incomplete required checklist items that must be completed before progressing.",
  SELECTION_MODE: "Selection Mode: Click the checkbox to select multiple proposals for bulk actions like status updates or assignment changes.",
  
  // Progress & Metrics
  COMPLETION_PERCENTAGE: "Completion Progress: Shows how many subtasks have been completed out of the total ({completed}/{total}).",
  CONTRACT_VALUE: "Contract Value: Estimated or actual contract value. Column total shows sum of all proposals.",
  DAYS_UNTIL_DUE: "Due Date Status: {days} days until submission deadline. Red indicates overdue, yellow indicates urgent (7 days or less).",
  
  // Checklist
  CHECKLIST_ITEM_REQUIRED: "Required Item: This must be completed before moving to the next stage.",
  CHECKLIST_ITEM_OPTIONAL: "Optional Item: Recommended but not required for stage progression.",
  CHECKLIST_SYSTEM_CHECK: "System Check: Automatically validated by the system (e.g., all sections completed, pricing approved).",
  CHECKLIST_MODAL_TRIGGER: "Opens Modal: Click to open a detailed form or workflow step.",
  CHECKLIST_AI_TRIGGER: "AI Action: Triggers an automated AI analysis or generation task.",
};

/**
 * Helper function to replace placeholders in tooltip text
 * 
 * @param {string} tooltipKey - Key from KANBAN_TOOLTIPS
 * @param {object} replacements - Object with placeholder replacements (e.g., {limit: 5, roles: "Admin, Manager"})
 * @returns {string} - Formatted tooltip text
 */
export function getTooltipText(tooltipKey, replacements = {}) {
  let text = KANBAN_TOOLTIPS[tooltipKey] || tooltipKey;
  
  Object.entries(replacements).forEach(([key, value]) => {
    text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  
  return text;
}