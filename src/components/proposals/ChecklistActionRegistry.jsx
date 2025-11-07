import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Import existing modals
import BasicInfoModal from './modals/BasicInfoModal';
import TeamFormationModal from './modals/TeamFormationModal';
import ResourceGatheringModal from './modals/ResourceGatheringModal';
import SolicitationUploadModal from './modals/SolicitationUploadModal';
import EvaluationModal from './modals/EvaluationModal';
import WinStrategyModal from './modals/WinStrategyModal';
import ContentPlanningModal from './modals/ContentPlanningModal';
import PricingReviewModal from './modals/PricingReviewModal';

export const ACTION_REGISTRY = {
  // Phase 1 - Basic Info (MODAL - keep as modal)
  'enter_basic_info': {
    type: 'modal',
    component: BasicInfoModal,
    label: 'Enter Basic Info',
    status: '✅'
  },
  'select_prime_contractor': {
    type: 'modal',
    component: BasicInfoModal,
    label: 'Select Prime Contractor',
    status: '✅'
  },
  'add_solicitation_number': {
    type: 'modal',
    component: BasicInfoModal,
    label: 'Add Solicitation Number',
    status: '✅'
  },
  'open_basic_info_modal': {
    type: 'modal',
    component: BasicInfoModal,
    label: 'Enter Basic Information',
    status: '✅'
  },
  'open_modal_phase1': {
    type: 'modal',
    component: BasicInfoModal,
    label: 'Open Phase 1',
    status: '✅'
  },
  
  // Phase 2 - Team (MODAL - keep as modal)
  'form_team': {
    type: 'modal',
    component: TeamFormationModal,
    label: 'Form Team',
    status: '✅'
  },
  'add_teaming_partners': {
    type: 'modal',
    component: TeamFormationModal,
    label: 'Add Teaming Partners',
    status: '✅'
  },
  'define_roles': {
    type: 'modal',
    component: TeamFormationModal,
    label: 'Define Roles',
    status: '✅'
  },
  'open_team_formation_modal': {
    type: 'modal',
    component: TeamFormationModal,
    label: 'Form Team',
    status: '✅'
  },
  'open_modal_phase2': {
    type: 'modal',
    component: TeamFormationModal,
    label: 'Open Phase 2',
    status: '✅'
  },
  
  // Phase 2 - Resources (MODAL - keep as modal for quick access)
  'gather_resources': {
    type: 'modal',
    component: ResourceGatheringModal,
    label: 'Gather Resources',
    status: '✅'
  },
  'link_boilerplate': {
    type: 'modal',
    component: ResourceGatheringModal,
    label: 'Link Boilerplate',
    status: '✅'
  },
  'link_past_performance': {
    type: 'modal',
    component: ResourceGatheringModal,
    label: 'Link Past Performance',
    status: '✅'
  },
  'open_resource_gathering_modal': {
    type: 'modal',
    component: ResourceGatheringModal,
    label: 'Gather Resources',
    status: '✅'
  },
  
  // Phase 3 - Solicitation (NAVIGATE to new dedicated page)
  'upload_solicitation': {
    type: 'navigate',
    path: 'proposals/SolicitationUpload',
    label: 'Upload Solicitation',
    status: '✅'
  },
  'extract_requirements': {
    type: 'navigate',
    path: 'proposals/SolicitationUpload',
    label: 'Extract Requirements',
    status: '✅'
  },
  'set_contract_value': {
    type: 'navigate',
    path: 'proposals/SolicitationUpload',
    label: 'Set Contract Value',
    status: '✅'
  },
  'open_solicitation_upload_modal': {
    type: 'navigate',
    path: 'proposals/SolicitationUpload',
    label: 'Upload Solicitation',
    status: '✅'
  },
  'open_modal_phase3': {
    type: 'navigate',
    path: 'proposals/SolicitationUpload',
    label: 'Open Phase 3',
    status: '✅'
  },
  'run_ai_analysis_phase3': {
    type: 'navigate',
    path: 'proposals/SolicitationUpload',
    label: 'AI Analysis',
    status: '✅'
  },
  
  // Phase 4 - Evaluation (NAVIGATE to new dedicated page)
  'run_evaluation': {
    type: 'navigate',
    path: 'proposals/StrategicEvaluation',
    label: 'Run AI Evaluation',
    status: '✅'
  },
  'calculate_confidence_score': {
    type: 'navigate',
    path: 'proposals/StrategicEvaluation',
    label: 'Calculate Confidence',
    status: '✅'
  },
  'open_evaluation_modal': {
    type: 'navigate',
    path: 'proposals/StrategicEvaluation',
    label: 'Run Evaluation',
    status: '✅'
  },
  'open_modal_phase4': {
    type: 'navigate',
    path: 'proposals/StrategicEvaluation',
    label: 'Open Phase 4',
    status: '✅'
  },
  'run_evaluation_phase4': {
    type: 'navigate',
    path: 'proposals/StrategicEvaluation',
    label: 'Run Evaluation',
    status: '✅'
  },
  
  // Phase 4 - Compliance Matrix (NAVIGATE to new dedicated page)
  'view_compliance_matrix': {
    type: 'navigate',
    path: 'proposals/ComplianceMatrix',
    label: 'View Compliance Matrix',
    status: '✅'
  },
  'auto_map_requirements': {
    type: 'navigate',
    path: 'proposals/ComplianceMatrix',
    label: 'Auto-Map Requirements',
    status: '✅'
  },
  
  // Phase 5 - Win Strategy (NAVIGATE to new dedicated page)
  'develop_win_strategy': {
    type: 'navigate',
    path: 'proposals/WinStrategy',
    label: 'Develop Win Strategy',
    status: '✅'
  },
  'generate_win_themes': {
    type: 'navigate',
    path: 'proposals/WinStrategy',
    label: 'Generate Win Themes',
    status: '✅'
  },
  'refine_themes': {
    type: 'navigate',
    path: 'proposals/WinStrategy',
    label: 'Refine Themes',
    status: '✅'
  },
  'open_win_strategy_modal': {
    type: 'navigate',
    path: 'proposals/WinStrategy',
    label: 'Develop Win Strategy',
    status: '✅'
  },
  'open_modal_phase5': {
    type: 'navigate',
    path: 'proposals/WinStrategy',
    label: 'Open Phase 5',
    status: '✅'
  },
  'generate_win_themes_phase5': {
    type: 'navigate',
    path: 'proposals/WinStrategy',
    label: 'Generate Win Themes',
    status: '✅'
  },
  
  // Phase 5 - Content Planning (MODAL - keep as modal for quick setup)
  'plan_content': {
    type: 'modal',
    component: ContentPlanningModal,
    label: 'Plan Content',
    status: '✅'
  },
  'select_sections': {
    type: 'modal',
    component: ContentPlanningModal,
    label: 'Select Sections',
    status: '✅'
  },
  'set_writing_strategy': {
    type: 'modal',
    component: ContentPlanningModal,
    label: 'Set Writing Strategy',
    status: '✅'
  },
  'open_content_planning_modal': {
    type: 'modal',
    component: ContentPlanningModal,
    label: 'Plan Content',
    status: '✅'
  },
  
  // Phase 6 - Content Writing (NAVIGATE to new dedicated page)
  'start_writing': {
    type: 'navigate',
    path: 'proposals/WriteContent',
    label: 'Start Writing',
    status: '✅'
  },
  'write_sections': {
    type: 'navigate',
    path: 'proposals/WriteContent',
    label: 'Write Sections',
    status: '✅'
  },
  'ai_generate_content': {
    type: 'navigate',
    path: 'proposals/WriteContent',
    label: 'AI Generate Content',
    status: '✅'
  },
  
  // Phase 7 - Pricing (NAVIGATE to new dedicated page)
  'build_pricing': {
    type: 'navigate',
    path: 'proposals/PricingBuild',
    label: 'Build Pricing',
    status: '✅'
  },
  'review_pricing': {
    type: 'navigate',
    path: 'proposals/PricingBuild',
    label: 'Review Pricing',
    status: '✅'
  },
  'open_pricing_review_modal': {
    type: 'navigate',
    path: 'proposals/PricingBuild',
    label: 'Review Pricing',
    status: '✅'
  },
  
  // Health Dashboard (NAVIGATE to new dedicated page)
  'view_health': {
    type: 'navigate',
    path: 'proposals/ProposalHealth',
    label: 'View Health Dashboard',
    status: '✅'
  },
  'check_proposal_health': {
    type: 'navigate',
    path: 'proposals/ProposalHealth',
    label: 'Check Proposal Health',
    status: '✅'
  },
  
  // Phase 8 - Finalize (NAVIGATE to legacy builder for now)
  'internal_review': {
    type: 'navigate',
    path: 'ProposalBuilder',
    label: 'Internal Review',
    status: '✅'
  },
  'finalize_proposal': {
    type: 'navigate',
    path: 'ProposalBuilder',
    label: 'Finalize Proposal',
    status: '✅'
  },
  
  // AI System Checks (non-interactive)
  'run_ai_analysis': {
    type: 'ai',
    handler: 'runAIAnalysis',
    label: 'Run AI Analysis',
    status: '✅'
  }
};

export function getActionConfig(actionKey) {
  return ACTION_REGISTRY[actionKey] || null;
}

export function getActionDetails(actionKey) {
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