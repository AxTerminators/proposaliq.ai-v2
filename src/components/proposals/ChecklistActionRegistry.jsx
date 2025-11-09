
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Import modals
import BasicInfoModal from './modals/BasicInfoModal';
import TeamFormationModal from './modals/TeamFormationModal';
import ResourceGatheringModal from './modals/ResourceGatheringModal';
import ContentPlanningModal from './modals/ContentPlanningModal';

export const ACTION_REGISTRY = {
  // ============================================
  // COLUMN 1: INITIATE
  // ============================================
  'open_basic_info_modal': {
    type: 'modal',
    component: BasicInfoModal,
    label: 'Enter Basic Information'
  },
  
  // ============================================
  // COLUMN 2: TEAM
  // ============================================
  'open_team_modal': {
    type: 'modal',
    component: TeamFormationModal,
    label: 'Form Team'
  },
  
  // ============================================
  // COLUMN 3: RESOURCES
  // ============================================
  'open_resources_modal': {
    type: 'modal',
    component: ResourceGatheringModal,
    label: 'Gather Resources'
  },
  'navigate_past_performance': {
    type: 'navigate',
    path: 'PastPerformance',
    label: 'Manage Past Performance'
  },
  
  // ============================================
  // COLUMN 4: SOLICITATION
  // ============================================
  'navigate_solicitation_upload': {
    type: 'navigate',
    path: 'ProposalBuilder', // FIXED: Using existing page
    label: 'Upload & Analyze Solicitation'
  },
  
  // ============================================
  // COLUMN 5: EVALUATION
  // ============================================
  'navigate_evaluation': {
    type: 'navigate',
    path: 'ProposalBuilder', // FIXED: Using existing page
    label: 'Strategic Evaluation'
  },
  
  // ============================================
  // COLUMN 6: STRATEGY
  // ============================================
  'navigate_win_strategy': {
    type: 'navigate',
    path: 'ProposalBuilder', // FIXED: Using existing page
    label: 'Develop Win Strategy'
  },
  
  // ============================================
  // COLUMN 7: PLANNING
  // ============================================
  'navigate_content_planning': {
    type: 'navigate',
    path: 'ProposalBuilder', // FIXED: Using existing page
    label: 'Plan Content Outline'
  },
  'open_content_planning_modal': {
    type: 'modal',
    component: ContentPlanningModal,
    label: 'Assign Sections & Deadlines'
  },
  
  // ============================================
  // COLUMN 8: WRITING
  // ============================================
  'navigate_write_content': {
    type: 'navigate',
    path: 'ProposalBuilder', // FIXED: Using existing page instead of non-existent proposals/WriteContent
    label: 'Write Proposal Content'
  },
  'navigate_compliance_check': {
    type: 'navigate',
    path: 'ProposalBuilder', // FIXED: Using existing page
    label: 'Compliance Check'
  },
  
  // ============================================
  // COLUMN 9: PRICING
  // ============================================
  'navigate_pricing_build': {
    type: 'navigate',
    path: 'ProposalBuilder', // FIXED: Using existing page
    label: 'Build Pricing & CLINs'
  },
  
  // ============================================
  // COLUMN 10: REVIEW
  // ============================================
  'navigate_red_team': {
    type: 'navigate',
    path: 'ProposalBuilder', // FIXED: Using existing page
    label: 'Red Team Review'
  },
  
  // ============================================
  // COLUMN 11: FINAL
  // ============================================
  'navigate_export': {
    type: 'navigate',
    path: 'ExportCenter',
    label: 'Export Proposal'
  },
  'navigate_submission_ready': {
    type: 'navigate',
    path: 'ProposalBuilder', // FIXED: Using existing page
    label: 'Submission Checklist'
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
