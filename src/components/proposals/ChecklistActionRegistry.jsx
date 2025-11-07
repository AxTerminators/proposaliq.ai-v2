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
  // Phase 1 - Basic Info (MODAL)
  'enter_basic_info': {
    type: 'navigate',
    path: '/proposals/BasicInfo',
    label: 'Enter Basic Info',
    status: '✅'
  },
  'open_basic_info_modal': {
    type: 'navigate',
    path: '/proposals/BasicInfo',
    label: 'Enter Basic Information',
    status: '✅'
  },
  'open_modal_phase1': {
    type: 'navigate',
    path: '/proposals/BasicInfo',
    label: 'Open Phase 1',
    status: '✅'
  },
  
  // Phase 2 - Team (NAVIGATE)
  'form_team': {
    type: 'navigate',
    path: '/proposals/TeamSetup',
    label: 'Form Team',
    status: '✅'
  },
  'open_team_formation_modal': {
    type: 'navigate',
    path: '/proposals/TeamSetup',
    label: 'Form Team',
    status: '✅'
  },
  'open_modal_phase2': {
    type: 'navigate',
    path: '/proposals/TeamSetup',
    label: 'Open Phase 2',
    status: '✅'
  },
  
  // Phase 2 - Resources (MODAL - keep as modal for now)
  'gather_resources': {
    type: 'modal',
    component: ResourceGatheringModal,
    label: 'Gather Resources',
    status: '✅'
  },
  'open_resource_gathering_modal': {
    type: 'modal',
    component: ResourceGatheringModal,
    label: 'Gather Resources',
    status: '✅'
  },
  
  // Phase 3 - Solicitation (MODAL - keep as modal)
  'upload_solicitation': {
    type: 'modal',
    component: SolicitationUploadModal,
    label: 'Upload Solicitation',
    status: '✅'
  },
  'open_solicitation_upload_modal': {
    type: 'modal',
    component: SolicitationUploadModal,
    label: 'Upload Solicitation',
    status: '✅'
  },
  'open_modal_phase3': {
    type: 'modal',
    component: SolicitationUploadModal,
    label: 'Open Phase 3',
    status: '✅'
  },
  
  // Phase 4 - Evaluation (MODAL - keep as modal)
  'run_evaluation': {
    type: 'modal',
    component: EvaluationModal,
    label: 'Run AI Evaluation',
    status: '✅'
  },
  'open_evaluation_modal': {
    type: 'modal',
    component: EvaluationModal,
    label: 'Run Evaluation',
    status: '✅'
  },
  'open_modal_phase4': {
    type: 'modal',
    component: EvaluationModal,
    label: 'Open Phase 4',
    status: '✅'
  },
  
  // Phase 4 - Compliance Matrix (NAVIGATE - NEW)
  'view_compliance_matrix': {
    type: 'navigate',
    path: '/proposals/ComplianceMatrix',
    label: 'View Compliance Matrix',
    status: '✅'
  },
  
  // Phase 5 - Win Strategy (MODAL - keep as modal)
  'develop_win_strategy': {
    type: 'modal',
    component: WinStrategyModal,
    label: 'Develop Win Strategy',
    status: '✅'
  },
  'open_win_strategy_modal': {
    type: 'modal',
    component: WinStrategyModal,
    label: 'Develop Win Strategy',
    status: '✅'
  },
  'open_modal_phase5': {
    type: 'modal',
    component: WinStrategyModal,
    label: 'Open Phase 5',
    status: '✅'
  },
  
  // Phase 5 - Content Planning (MODAL - keep as modal)
  'plan_content': {
    type: 'modal',
    component: ContentPlanningModal,
    label: 'Plan Content',
    status: '✅'
  },
  'open_content_planning_modal': {
    type: 'modal',
    component: ContentPlanningModal,
    label: 'Plan Content',
    status: '✅'
  },
  
  // Phase 6 - Content Writing (NAVIGATE - NEW)
  'start_writing': {
    type: 'navigate',
    path: '/proposals/WriteContent',
    label: 'Start Writing',
    status: '✅'
  },
  
  // Phase 7 - Pricing (MODAL - keep as modal)
  'review_pricing': {
    type: 'modal',
    component: PricingReviewModal,
    label: 'Review Pricing',
    status: '✅'
  },
  'open_pricing_review_modal': {
    type: 'modal',
    component: PricingReviewModal,
    label: 'Review Pricing',
    status: '✅'
  },
  
  // Phase 8 - Final Review (NAVIGATE)
  'internal_review': {
    type: 'navigate',
    path: '/FinalReview',
    label: 'Internal Review',
    status: '✅'
  },
  
  // Health Dashboard (NAVIGATE - NEW)
  'view_health': {
    type: 'navigate',
    path: '/proposals/ProposalHealth',
    label: 'View Health Dashboard',
    status: '✅'
  },
  
  // AI actions
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