/**
 * Checklist Action Registry
 * 
 * Central registry that maps checklist item actions to their handlers.
 * This enables the new Kanban board to trigger modals, pages, or AI actions
 * based on checklist item clicks.
 * 
 * Action Types:
 * - modal: Opens a modal dialog with form/content from Phase components
 * - page: Navigates to a dedicated page (e.g., Writer, Pricing)
 * - ai_action: Triggers an AI integration or analysis
 * - manual_check: User manually checks off (no automated action)
 */

export const CHECKLIST_ACTION_REGISTRY = {
  // ===========================
  // PHASE 1: INITIATE & TEAM
  // ===========================
  
  "open_phase1_basic_info": {
    type: "modal",
    component: "Phase1BasicInfoModal",
    title: "Proposal Basic Information",
    description: "Enter proposal name, solicitation number, and project details",
    width: "max-w-2xl"
  },
  
  "open_phase1_team": {
    type: "modal",
    component: "Phase1TeamModal",
    title: "Team Formation",
    description: "Select prime contractor and teaming partners",
    width: "max-w-3xl"
  },
  
  // ===========================
  // PHASE 2: RESOURCES
  // ===========================
  
  "open_phase2_resources": {
    type: "modal",
    component: "Phase2ResourcesModal",
    title: "Reference Documents & Resources",
    description: "Link boilerplate, past proposals, templates, and past performance",
    width: "max-w-4xl"
  },
  
  // ===========================
  // PHASE 3: SOLICITATION
  // ===========================
  
  "open_phase3_solicitation": {
    type: "modal",
    component: "Phase3SolicitationModal",
    title: "Solicitation Details",
    description: "Upload RFP/RFQ documents and enter key details",
    width: "max-w-3xl"
  },
  
  "run_ai_requirement_extraction": {
    type: "ai_action",
    handler: "extractRequirementsWithAI",
    title: "AI Requirement Extraction",
    description: "Extract requirements, due dates, and key details from solicitation",
    estimatedDuration: "2-3 minutes"
  },
  
  // ===========================
  // PHASE 4: EVALUATE
  // ===========================
  
  "run_ai_evaluation": {
    type: "ai_action",
    handler: "runStrategicEvaluation",
    title: "AI Strategic Evaluation",
    description: "Comprehensive AI analysis of opportunity fit and win potential",
    estimatedDuration: "3-5 minutes"
  },
  
  "run_ai_confidence_scoring": {
    type: "ai_action",
    handler: "calculateConfidenceScore",
    title: "AI Confidence Scoring",
    description: "Calculate detailed confidence score across multiple dimensions",
    estimatedDuration: "2-3 minutes"
  },
  
  "open_phase4_compliance": {
    type: "modal",
    component: "Phase4ComplianceModal",
    title: "Compliance Matrix",
    description: "Review and manage compliance requirements",
    width: "max-w-5xl"
  },
  
  "open_phase4_competitor": {
    type: "modal",
    component: "Phase4CompetitorModal",
    title: "Competitor Analysis",
    description: "Analyze competitors and develop competitive strategy",
    width: "max-w-4xl"
  },
  
  // ===========================
  // PHASE 5: STRATEGY & PLAN
  // ===========================
  
  "run_ai_win_themes": {
    type: "ai_action",
    handler: "generateWinThemes",
    title: "Generate Win Themes",
    description: "AI-generated win themes and discriminators",
    estimatedDuration: "2-4 minutes"
  },
  
  "open_phase5_strategy": {
    type: "modal",
    component: "Phase5StrategyModal",
    title: "Win Strategy & Writing Style",
    description: "Define win themes, tone, and competitive strategy",
    width: "max-w-4xl"
  },
  
  "open_phase5_sections": {
    type: "modal",
    component: "Phase5SectionsModal",
    title: "Section Selection",
    description: "Select and configure proposal sections",
    width: "max-w-3xl"
  },
  
  // ===========================
  // PHASE 6: DRAFT
  // ===========================
  
  "open_phase6_writer": {
    type: "page",
    pageName: "ProposalWriter",
    title: "Proposal Writer",
    description: "AI-powered content generation and editing",
    includeProposalId: true
  },
  
  // ===========================
  // PHASE 7: PRICE
  // ===========================
  
  "open_phase7_pricing": {
    type: "page",
    pageName: "ProposalPricing",
    title: "Pricing & Cost Build",
    description: "Labor categories, CLINs, ODCs, and pricing analysis",
    includeProposalId: true
  },
  
  "run_ai_pricing_analysis": {
    type: "ai_action",
    handler: "analyzePricing",
    title: "AI Pricing Analysis",
    description: "Price-to-win analysis and competitive pricing recommendations",
    estimatedDuration: "2-3 minutes"
  },
  
  // ===========================
  // PHASE 8: REVIEW & FINALIZE
  // ===========================
  
  "open_phase8_review": {
    type: "modal",
    component: "Phase8ReviewModal",
    title: "Internal Review",
    description: "Conduct internal review and address comments",
    width: "max-w-4xl"
  },
  
  "open_phase8_redteam": {
    type: "modal",
    component: "Phase8RedTeamModal",
    title: "Red Team Review",
    description: "Comprehensive red team evaluation",
    width: "max-w-5xl"
  },
  
  "run_submission_readiness": {
    type: "ai_action",
    handler: "checkSubmissionReadiness",
    title: "Submission Readiness Check",
    description: "AI validation of completeness and compliance",
    estimatedDuration: "1-2 minutes"
  },
  
  "open_phase8_export": {
    type: "modal",
    component: "Phase8ExportModal",
    title: "Export & Submission",
    description: "Export proposal and prepare for submission",
    width: "max-w-3xl"
  }
};

/**
 * Get action configuration by action ID
 */
export function getActionConfig(actionId) {
  return CHECKLIST_ACTION_REGISTRY[actionId] || null;
}

/**
 * Check if action is valid
 */
export function isValidAction(actionId) {
  return actionId in CHECKLIST_ACTION_REGISTRY;
}

/**
 * Get all actions of a specific type
 */
export function getActionsByType(type) {
  return Object.entries(CHECKLIST_ACTION_REGISTRY)
    .filter(([_, config]) => config.type === type)
    .map(([id, config]) => ({ id, ...config }));
}

/**
 * Get modal actions
 */
export function getModalActions() {
  return getActionsByType('modal');
}

/**
 * Get page actions
 */
export function getPageActions() {
  return getActionsByType('page');
}

/**
 * Get AI actions
 */
export function getAIActions() {
  return getActionsByType('ai_action');
}