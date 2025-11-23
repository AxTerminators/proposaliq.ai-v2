/**
 * Feature Flags System
 * Controls visibility and availability of non-essential features
 * Phase 4: Feature Flags - Deprecate non-essential features
 */

export const FEATURE_FLAGS = {
  // === CORE FEATURES (Always enabled) ===
  PROPOSALS: true,
  KANBAN_BOARDS: true,
  PIPELINE_VIEW: true,
  CONTENT_LIBRARY: true,
  TEAMING_PARTNERS: true,
  BASIC_ANALYTICS: true,
  CALENDAR: true,
  TASKS: true,
  DISCUSSIONS: true,
  
  // === ADVANCED FEATURES (Can be toggled) ===
  GAMIFICATION: false,                    // GamificationDashboard, achievements
  INTERACTIVE_ELEMENTS: false,            // Interactive proposal elements
  ADVANCED_REPORTING: false,              // Custom report builder, advanced analytics
  INTEGRATION_MARKETPLACE: false,         // Third-party integrations
  MOBILE_ADVANCED_FEATURES: false,        // Advanced mobile-specific features
  WORKFLOW_AUTOMATION_ADVANCED: false,    // Smart automation engine, AI workflow suggestions
  CLIENT_PORTAL_ADVANCED: false,          // Advanced client portal features beyond basic
  LIVE_COLLABORATION: false,              // Live cursors, presence indicators
  PREDICTIVE_ANALYTICS: false,            // Predictive health, AI predictions
  PROPOSAL_COMPARISON: false,             // Side-by-side proposal comparison
  CUSTOM_THEMES: false,                   // Custom branding/themes
  API_ACCESS: false,                      // API endpoints for external access
  ADVANCED_PRICING: false,                // Advanced pricing intelligence, benchmarking
  WIN_LOSS_ANALYSIS: false,               // Detailed win/loss tracking and insights
  OPPORTUNITY_FINDER: false,              // SAM.gov opportunity finder
  PAST_PERFORMANCE_ADVANCED: false,       // Advanced past performance features
  COMPETITOR_INTEL: false,                // Competitor intelligence tracking
  COMPLIANCE_CHECKER: false,              // Automated compliance checking
  RED_TEAM_REVIEW: false,                 // Red team review workflow
  VERSION_COMPARISON: false,              // Document version comparison
  EXPORT_TEMPLATES: false,                // Custom export templates
  REAL_TIME_NOTIFICATIONS: true,          // Real-time notification system
  ADVANCED_SEARCH: false,                 // Advanced search with filters
  BULK_OPERATIONS: false,                 // Bulk actions on proposals
  CUSTOM_FIELDS: false,                   // User-defined custom fields
  RESOURCE_BOOKING: false,                // Resource booking and management
  TIME_TRACKING: false,                   // Time tracking for consultants
  
  // === ADMIN FEATURES ===
  ADMIN_IMPERSONATION: false,             // Admin user impersonation
  ADVANCED_AUDIT_LOGS: false,             // Detailed audit logging
  SYSTEM_HEALTH_MONITORING: false,        // Advanced system health monitoring
};

/**
 * Check if a feature is enabled
 */
export const isFeatureEnabled = (featureName) => {
  return FEATURE_FLAGS[featureName] === true;
};

/**
 * Get all enabled features
 */
export const getEnabledFeatures = () => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
};

/**
 * Get all disabled features
 */
export const getDisabledFeatures = () => {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => !enabled)
    .map(([feature]) => feature);
};

/**
 * Feature categories for organization
 */
export const FEATURE_CATEGORIES = {
  CORE: 'Core Features',
  COLLABORATION: 'Collaboration & Communication',
  ANALYTICS: 'Analytics & Reporting',
  AUTOMATION: 'Automation & AI',
  INTEGRATIONS: 'Integrations & API',
  CLIENT_PORTAL: 'Client Portal',
  ADVANCED: 'Advanced Features',
  ADMIN: 'Admin & System'
};

/**
 * Map features to categories
 */
export const FEATURE_TO_CATEGORY = {
  PROPOSALS: 'CORE',
  KANBAN_BOARDS: 'CORE',
  PIPELINE_VIEW: 'CORE',
  CONTENT_LIBRARY: 'CORE',
  TEAMING_PARTNERS: 'CORE',
  BASIC_ANALYTICS: 'ANALYTICS',
  CALENDAR: 'CORE',
  TASKS: 'CORE',
  DISCUSSIONS: 'COLLABORATION',
  
  GAMIFICATION: 'ADVANCED',
  INTERACTIVE_ELEMENTS: 'ADVANCED',
  ADVANCED_REPORTING: 'ANALYTICS',
  INTEGRATION_MARKETPLACE: 'INTEGRATIONS',
  MOBILE_ADVANCED_FEATURES: 'ADVANCED',
  WORKFLOW_AUTOMATION_ADVANCED: 'AUTOMATION',
  CLIENT_PORTAL_ADVANCED: 'CLIENT_PORTAL',
  LIVE_COLLABORATION: 'COLLABORATION',
  PREDICTIVE_ANALYTICS: 'ANALYTICS',
  PROPOSAL_COMPARISON: 'ADVANCED',
  CUSTOM_THEMES: 'ADVANCED',
  API_ACCESS: 'INTEGRATIONS',
  ADVANCED_PRICING: 'ADVANCED',
  WIN_LOSS_ANALYSIS: 'ANALYTICS',
  OPPORTUNITY_FINDER: 'INTEGRATIONS',
  PAST_PERFORMANCE_ADVANCED: 'ADVANCED',
  COMPETITOR_INTEL: 'ADVANCED',
  COMPLIANCE_CHECKER: 'AUTOMATION',
  RED_TEAM_REVIEW: 'ADVANCED',
  VERSION_COMPARISON: 'ADVANCED',
  EXPORT_TEMPLATES: 'ADVANCED',
  REAL_TIME_NOTIFICATIONS: 'COLLABORATION',
  ADVANCED_SEARCH: 'ADVANCED',
  BULK_OPERATIONS: 'ADVANCED',
  CUSTOM_FIELDS: 'ADVANCED',
  RESOURCE_BOOKING: 'ADVANCED',
  TIME_TRACKING: 'ADVANCED',
  
  ADMIN_IMPERSONATION: 'ADMIN',
  ADVANCED_AUDIT_LOGS: 'ADMIN',
  SYSTEM_HEALTH_MONITORING: 'ADMIN',
};

/**
 * Feature descriptions for admin UI
 */
export const FEATURE_DESCRIPTIONS = {
  GAMIFICATION: 'Achievement tracking and gamification for client engagement',
  INTERACTIVE_ELEMENTS: 'Interactive proposal elements (polls, forms, etc.)',
  ADVANCED_REPORTING: 'Custom report builder and advanced analytics dashboards',
  INTEGRATION_MARKETPLACE: 'Third-party integration marketplace',
  MOBILE_ADVANCED_FEATURES: 'Advanced mobile-specific features and gestures',
  WORKFLOW_AUTOMATION_ADVANCED: 'Smart automation engine with AI-powered workflow suggestions',
  CLIENT_PORTAL_ADVANCED: 'Advanced client portal features (annotations, meetings, etc.)',
  LIVE_COLLABORATION: 'Real-time presence indicators and live cursors',
  PREDICTIVE_ANALYTICS: 'AI-powered predictive analytics and health scoring',
  PROPOSAL_COMPARISON: 'Side-by-side proposal comparison tool',
  CUSTOM_THEMES: 'Custom branding and theme customization',
  API_ACCESS: 'REST API access for external integrations',
  ADVANCED_PRICING: 'Pricing intelligence, benchmarking, and historical analysis',
  WIN_LOSS_ANALYSIS: 'Detailed win/loss tracking and insights',
  OPPORTUNITY_FINDER: 'SAM.gov opportunity discovery and tracking',
  PAST_PERFORMANCE_ADVANCED: 'Advanced past performance management features',
  COMPETITOR_INTEL: 'Competitor intelligence tracking and analysis',
  COMPLIANCE_CHECKER: 'Automated compliance matrix and requirement checking',
  RED_TEAM_REVIEW: 'Structured red team review workflow',
  VERSION_COMPARISON: 'Document version comparison and diff viewing',
  EXPORT_TEMPLATES: 'Custom export templates and formats',
  REAL_TIME_NOTIFICATIONS: 'Real-time notification system with WebSocket support',
  ADVANCED_SEARCH: 'Advanced search with complex filters and facets',
  BULK_OPERATIONS: 'Bulk actions on multiple proposals at once',
  CUSTOM_FIELDS: 'User-defined custom fields on proposals',
  RESOURCE_BOOKING: 'Resource booking and capacity management',
  TIME_TRACKING: 'Time tracking for consultant engagements',
  ADMIN_IMPERSONATION: 'Admin ability to impersonate users',
  ADVANCED_AUDIT_LOGS: 'Detailed audit logging and compliance tracking',
  SYSTEM_HEALTH_MONITORING: 'Real-time system health and performance monitoring',
};