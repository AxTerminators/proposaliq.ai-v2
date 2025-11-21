import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Import modals
import BasicInfoModal from './modals/BasicInfoModal';
import TeamFormationModal from './modals/TeamFormationModal';
import ResourceGatheringModal from './modals/ResourceGatheringModal';
import ContentPlanningModal from './modals/ContentPlanningModal';
import SolicitationUploadModal from './modals/SolicitationUploadModal';
import EvaluationModal from './modals/EvaluationModal';
import WinStrategyModal from './modals/WinStrategyModal';
import PricingReviewModal from './modals/PricingReviewModal';

export const ACTION_REGISTRY = {
  // ============================================
  // COLUMN 1: INITIATE - Basic Info
  // ============================================
  'open_basic_info_modal': {
    type: 'modal',
    component: BasicInfoModal,
    label: 'Enter Basic Information'
  },
  
  // ============================================
  // COLUMN 2: TEAM - Team Formation
  // ============================================
  'open_team_formation_modal': {
    type: 'modal',
    component: TeamFormationModal,
    label: 'Form Proposal Team'
  },
  
  // ============================================
  // COLUMN 3: RESOURCES - Resource Gathering
  // ============================================
  'open_resource_gathering_modal': {
    type: 'modal',
    component: ResourceGatheringModal,
    label: 'Gather Resources'
  },
  'open_key_personnel_modal': {
    type: 'dynamic_modal',
    modalConfigName: 'Add Key Personnel',
    label: 'Add Key Personnel'
  },
  'open_upload_proposal_template_modal': {
    type: 'dynamic_modal',
    modalConfigName: 'Upload Proposal Template',
    label: 'Upload Proposal Template'
  },
  
  // ============================================
  // COLUMN 4: SOLICITATION - Upload & Analysis
  // ============================================
  'open_solicitation_upload_modal': {
    type: 'modal',
    component: SolicitationUploadModal,
    label: 'Upload & Analyze Solicitation'
  },
  'run_ai_analysis_phase3': {
    type: 'ai',
    label: 'Run AI Analysis'
  },
  'contract_value_present': {
    type: 'system_check',
    label: 'Contract Value Check'
  },
  
  // ============================================
  // COLUMN 5: EVALUATION - Strategic Evaluation
  // ============================================
  'open_evaluation_modal': {
    type: 'modal',
    component: EvaluationModal,
    label: 'Strategic Evaluation'
  },
  'run_evaluation_phase4': {
    type: 'ai',
    label: 'Calculate Confidence Score'
  },
  
  // ============================================
  // COLUMN 6: STRATEGY - Win Strategy
  // ============================================
  'open_win_strategy_modal': {
    type: 'modal',
    component: WinStrategyModal,
    label: 'Develop Win Strategy'
  },
  'navigate_strategy_config': {
    type: 'navigate',
    path: 'ProposalStrategyConfigPage',
    label: 'Set Writing Strategy'
  },
  'generate_win_themes_phase5': {
    type: 'ai',
    label: 'Generate Win Themes'
  },
  
  // ============================================
  // COLUMN 7: PLANNING - Content Planning
  // ============================================
  'open_content_planning_modal': {
    type: 'navigate',
    path: 'ProposalStrategyConfigPage',
    label: 'Plan Content Strategy'
  },
  
  // ============================================
  // COLUMN 8: WRITING - Content Development (Phase 6)
  // ============================================
  'navigate_to_content_dev': {
    type: 'navigate',
    path: 'ContentDevelopment',
    label: 'Write Proposal Content'
  },
  'navigate_ai_writer': {
    type: 'navigate',
    path: 'AIAssistedWriterPage',
    label: 'AI Assisted Writer (Phase 6)'
  },
  'complete_sections': {
    type: 'system_check',
    label: 'Complete All Sections'
  },
  
  // ============================================
  // COLUMN 9: PRICING - Pricing Build
  // ============================================
  'navigate_to_pricing': {
    type: 'navigate',
    path: 'PricingBuilder',
    label: 'Build Pricing & CLINs'
  },
  'open_pricing_review_modal': {
    type: 'modal',
    component: PricingReviewModal,
    label: 'Review Pricing'
  },
  
  // ============================================
  // COLUMN 10: COMPLIANCE - Compliance Check
  // ============================================
  'navigate_to_compliance': {
    type: 'navigate',
    path: 'ProposalBuilder',
    label: 'Compliance Check'
  },
  
  // ============================================
  // COLUMN 11: REVIEW - Red Team Review
  // ============================================
  'navigate_to_review': {
    type: 'navigate',
    path: 'FinalReview',
    label: 'Red Team Review'
  },
  
  // ============================================
  // EXPORT & SUBMISSION
  // ============================================
  'navigate_to_export': {
    type: 'navigate',
    path: 'ExportCenter',
    label: 'Export Proposal'
  }
};

export function getActionConfig(actionKey) {
  return ACTION_REGISTRY[actionKey] || null;
}

export function isNavigateAction(actionKey) {
  const action = ACTION_REGISTRY[actionKey];
  return action?.type === 'navigate';
}

export function isModalAction(actionKey) {
  const action = ACTION_REGISTRY[actionKey];
  return action?.type === 'modal';
}

export function isAIAction(actionKey) {
  const action = ACTION_REGISTRY[actionKey];
  return action?.type === 'ai';
}

export function isTabAction(actionKey) {
  const action = ACTION_REGISTRY[actionKey];
  return action?.type === 'tab';
}