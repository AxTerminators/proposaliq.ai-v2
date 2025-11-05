/**
 * Central registry for all checklist actions across the Kanban board
 * Maps checklist item actions to their handlers
 */

export const CHECKLIST_ACTIONS = {
  // ============================================
  // PHASE 1: INITIATE COLUMN ACTIONS
  // ============================================
  "open_basic_info_modal": {
    type: "modal",
    component: "BasicInfoModal",
    title: "Proposal Basic Information",
    description: "Enter proposal name, solicitation number, and project details"
  },

  // ============================================
  // PHASE 1: TEAM COLUMN ACTIONS
  // ============================================
  "open_team_formation_modal": {
    type: "modal",
    component: "TeamFormationModal",
    title: "Team Formation",
    description: "Select prime contractor and teaming partners"
  },

  // ============================================
  // PHASE 2: RESOURCES COLUMN ACTIONS
  // ============================================
  "open_resource_gathering_modal": {
    type: "modal",
    component: "ResourceGatheringModal",
    title: "Gather Reference Documents",
    description: "Link boilerplate, templates, and past performance"
  },

  // ============================================
  // PHASE 3: SOLICIT COLUMN ACTIONS
  // ============================================
  "open_solicitation_upload_modal": {
    type: "modal",
    component: "SolicitationUploadModal",
    title: "Upload Solicitation",
    description: "Upload RFP/RFQ and extract requirements"
  },
  
  "run_ai_extraction_phase3": {
    type: "ai_action",
    function: "extractSolicitationDetails",
    description: "AI extracts key details from solicitation document"
  },

  // ============================================
  // PHASE 4: EVALUATE COLUMN ACTIONS
  // ============================================
  "open_evaluation_modal": {
    type: "modal",
    component: "EvaluationModal",
    title: "Strategic Evaluation",
    description: "Run AI strategic evaluation and Go/No-Go analysis"
  },

  "run_evaluation_phase4": {
    type: "ai_action",
    function: "runStrategicEvaluation",
    description: "AI evaluates opportunity and provides recommendations"
  },

  "open_compliance_modal": {
    type: "navigate",
    path: "/ProposalBuilder",
    params: ["proposalId"],
    query: { phase: "phase4", tab: "compliance" },
    description: "Generate compliance matrix"
  },

  "open_competitor_analysis_modal": {
    type: "navigate",
    path: "/ProposalBuilder",
    params: ["proposalId"],
    query: { phase: "phase4", tab: "competitor" },
    description: "Analyze competitors"
  },

  // ============================================
  // PHASE 5: STRATEGY COLUMN ACTIONS
  // ============================================
  "open_win_strategy_modal": {
    type: "modal",
    component: "WinStrategyModal",
    title: "Win Strategy",
    description: "Generate win themes and competitive strategy"
  },

  "generate_win_themes_phase5": {
    type: "ai_action",
    function: "generateWinThemes",
    description: "AI generates win themes based on opportunity analysis"
  },

  // ============================================
  // PHASE 5: PLAN COLUMN ACTIONS
  // ============================================
  "open_section_planning_modal": {
    type: "modal",
    component: "ContentPlanningModal",
    title: "Content Planning",
    description: "Select proposal sections and configure writing style"
  },

  // ============================================
  // PHASE 6: DRAFT COLUMN ACTIONS
  // ============================================
  "navigate_to_content_development": {
    type: "navigate",
    path: "/ContentDevelopment",
    params: ["proposalId"],
    description: "Open content development workspace"
  },

  "start_ai_writing": {
    type: "navigate",
    path: "/ContentDevelopment",
    params: ["proposalId"],
    description: "Start AI-powered content generation"
  },

  // ============================================
  // PHASE 7: PRICE COLUMN ACTIONS
  // ============================================
  "navigate_to_pricing": {
    type: "navigate",
    path: "/ProposalBuilder",
    params: ["proposalId"],
    query: { phase: "phase7" },
    description: "Build labor rates, CLINs, and pricing"
  },

  "run_pricing_analysis_phase7": {
    type: "ai_action",
    function: "analyzePricing",
    description: "AI analyzes pricing competitiveness"
  },

  "open_pricing_review_modal": {
    type: "modal",
    component: "PricingReviewModal",
    title: "Pricing Review",
    description: "Review pricing strategy and competitiveness"
  },

  // ============================================
  // PHASE 8: REVIEW COLUMN ACTIONS
  // ============================================
  "navigate_to_final_review": {
    type: "navigate",
    path: "/FinalReview",
    params: ["proposalId"],
    description: "Open final review and submission workspace"
  },

  "conduct_red_team": {
    type: "navigate",
    path: "/FinalReview",
    params: ["proposalId"],
    query: { tab: "review" },
    description: "Conduct Red Team review"
  },

  // ============================================
  // PHASE 8: FINALIZE COLUMN ACTIONS
  // ============================================
  "run_readiness_check_phase8": {
    type: "navigate",
    path: "/FinalReview",
    params: ["proposalId"],
    query: { tab: "submission" },
    description: "Check submission readiness"
  },

  "open_export_modal": {
    type: "navigate",
    path: "/FinalReview",
    params: ["proposalId"],
    query: { tab: "export" },
    description: "Export final proposal"
  },
};

/**
 * Get action configuration by action ID
 */
export function getActionConfig(actionId) {
  return CHECKLIST_ACTIONS[actionId] || null;
}

/**
 * Check if action is an AI action
 */
export function isAIAction(actionId) {
  const config = getActionConfig(actionId);
  return config?.type === "ai_action";
}

/**
 * Check if action opens a modal
 */
export function isModalAction(actionId) {
  const config = getActionConfig(actionId);
  return config?.type === "modal";
}

/**
 * Check if action navigates to a page
 */
export function isNavigateAction(actionId) {
  const config = getActionConfig(actionId);
  return config?.type === "navigate";
}