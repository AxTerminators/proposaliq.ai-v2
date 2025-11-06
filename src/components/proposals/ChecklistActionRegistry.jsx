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

/**
 * CHECKLIST ACTION REGISTRY - Master Blueprint
 * 
 * This registry maps every checklist item across all 15 Kanban columns to their corresponding actions.
 * 
 * ACTION TYPES:
 * - 'modal': Opens a modal for quick data entry/tasks
 * - 'navigate': Navigates to a dedicated page for deep work
 * - 'ai': Triggers an AI action
 * - 'inline': Inline checkbox or simple action
 * 
 * IMPLEMENTATION STATUS:
 * ✅ = Fully implemented and tested
 * 🔶 = Needs to be created/enhanced
 * 📝 = Planning/design phase
 */

export const ACTION_REGISTRY = {
  // ============================================
  // COLUMN 1: INITIATE (Phase 1 - locked_phase)
  // ============================================
  'enter_basic_info': {
    type: 'modal',
    component: BasicInfoModal,
    label: 'Enter Basic Info',
    description: 'Set proposal name, solicitation number, agency, due date',
    status: '✅'
  },
  'select_prime_contractor': {
    type: 'modal',
    component: BasicInfoModal, // Same modal, different focus
    label: 'Select Prime Contractor',
    description: 'Choose your organization or a partner as prime',
    status: '✅'
  },
  'add_solicitation_number': {
    type: 'modal',
    component: BasicInfoModal,
    label: 'Add Solicitation Number',
    description: 'Enter the official solicitation number',
    status: '✅'
  },

  // ============================================
  // COLUMN 2: TEAM (Phase 2 - locked_phase)
  // ============================================
  'form_team': {
    type: 'modal',
    component: TeamFormationModal,
    label: 'Form Team',
    description: 'Select teaming partners and subcontractors',
    status: '✅'
  },
  'add_teaming_partners': {
    type: 'modal',
    component: TeamFormationModal,
    label: 'Add Teaming Partners',
    description: 'Add partners to the team structure',
    status: '✅'
  },
  'define_roles': {
    type: 'modal',
    component: TeamFormationModal,
    label: 'Define Roles',
    description: 'Assign roles to team members',
    status: '✅'
  },

  // ============================================
  // COLUMN 3: RESOURCES (Phase 2 - locked_phase)
  // ============================================
  'gather_resources': {
    type: 'modal',
    component: ResourceGatheringModal,
    label: 'Gather Resources',
    description: 'Link boilerplate content, past performance, and reference materials',
    status: '✅'
  },
  'link_boilerplate': {
    type: 'modal',
    component: ResourceGatheringModal,
    label: 'Link Boilerplate',
    description: 'Connect reusable content to this proposal',
    status: '✅'
  },
  'link_past_performance': {
    type: 'modal',
    component: ResourceGatheringModal,
    label: 'Link Past Performance',
    description: 'Select relevant past performance projects',
    status: '✅'
  },

  // ============================================
  // COLUMN 4: SOLICIT (Phase 3 - locked_phase)
  // ============================================
  'upload_solicitation': {
    type: 'modal',
    component: SolicitationUploadModal,
    label: 'Upload Solicitation',
    description: 'Upload RFP/RFQ documents',
    status: '✅'
  },
  'extract_requirements': {
    type: 'ai',
    handler: 'extractSolicitationRequirements',
    label: 'AI Extract Requirements',
    description: 'AI automatically extracts key requirements from solicitation',
    aiEndpoint: '/api/extract-requirements',
    status: '✅'
  },
  'confirm_details': {
    type: 'inline',
    label: 'Confirm Details',
    description: 'Review and confirm extracted solicitation details',
    status: '✅'
  },
  'set_contract_value': {
    type: 'modal',
    component: SolicitationUploadModal,
    label: 'Set Contract Value',
    description: 'Enter estimated contract value',
    status: '✅'
  },

  // ============================================
  // COLUMN 5: EVALUATE (Phase 4 - locked_phase)
  // ============================================
  'run_evaluation': {
    type: 'modal',
    component: EvaluationModal,
    label: 'Run AI Evaluation',
    description: 'AI strategic evaluation of opportunity',
    status: '✅'
  },
  'go_no_go_decision': {
    type: 'inline',
    label: 'Go/No-Go Decision',
    description: 'Make final bid/no-bid decision',
    status: '✅'
  },
  'competitor_analysis': {
    type: 'navigate',
    path: '/CompetitorIntel',
    label: 'Competitor Analysis',
    description: 'Research and analyze competitors',
    status: '🔶', // Needs dedicated page
    needsImplementation: true
  },
  'calculate_confidence_score': {
    type: 'ai',
    handler: 'calculateConfidenceScore',
    label: 'AI Confidence Score',
    description: 'Calculate comprehensive win probability',
    status: '✅'
  },

  // ============================================
  // COLUMN 6: STRATEGY (Phase 5 - locked_phase)
  // ============================================
  'develop_win_strategy': {
    type: 'modal',
    component: WinStrategyModal,
    label: 'Develop Win Strategy',
    description: 'Create win themes and competitive strategy',
    status: '✅'
  },
  'generate_win_themes': {
    type: 'modal',
    component: WinStrategyModal,
    label: 'Generate Win Themes',
    description: 'AI-powered win theme generation',
    status: '✅'
  },
  'refine_themes': {
    type: 'modal',
    component: WinStrategyModal,
    label: 'Refine Themes',
    description: 'Review and refine win themes',
    status: '✅'
  },

  // ============================================
  // COLUMN 7: PLAN (Phase 5 - locked_phase)
  // ============================================
  'plan_content': {
    type: 'modal',
    component: ContentPlanningModal,
    label: 'Plan Content',
    description: 'Select sections and plan proposal structure',
    status: '✅'
  },
  'select_sections': {
    type: 'modal',
    component: ContentPlanningModal,
    label: 'Select Sections',
    description: 'Choose which sections to include',
    status: '✅'
  },
  'set_writing_strategy': {
    type: 'modal',
    component: ContentPlanningModal,
    label: 'Set Writing Strategy',
    description: 'Define tone, style, and approach',
    status: '✅'
  },

  // ============================================
  // COLUMN 8: DRAFT (Phase 6 - locked_phase)
  // ============================================
  'start_writing': {
    type: 'navigate',
    path: '/ContentDevelopment',
    label: 'Start Writing',
    description: 'Navigate to content development page to write sections',
    status: '✅' // Page already exists
  },
  'generate_sections': {
    type: 'navigate',
    path: '/ContentDevelopment',
    label: 'AI Generate Sections',
    description: 'Use AI to generate proposal content',
    status: '✅'
  },
  'complete_all_sections': {
    type: 'inline',
    label: 'Complete All Sections',
    description: 'System tracks section completion automatically',
    autoTracked: true,
    status: '✅'
  },

  // ============================================
  // COLUMN 9: REVIEW (Phase 6 - locked_phase)
  // ============================================
  'internal_review': {
    type: 'navigate',
    path: '/FinalReview',
    label: 'Internal Review',
    description: 'Conduct internal proposal review',
    status: '✅' // Page exists
  },
  'red_team_review': {
    type: 'navigate',
    path: '/FinalReview',
    label: 'Red Team Review',
    description: 'Formal red team evaluation',
    status: '✅'
  },
  'address_comments': {
    type: 'inline',
    label: 'Address Comments',
    description: 'Resolve all review comments',
    status: '✅'
  },

  // ============================================
  // COLUMN 10: PRICE (Phase 7 - locked_phase)
  // ============================================
  'build_pricing': {
    type: 'navigate',
    path: '/PricingBuilder',
    label: 'Build Pricing',
    description: 'Create detailed pricing breakdown',
    status: '🔶', // Needs dedicated page
    needsImplementation: true
  },
  'review_pricing': {
    type: 'modal',
    component: PricingReviewModal,
    label: 'Review Pricing',
    description: 'Quick pricing review and adjustments',
    status: '✅'
  },
  'finalize_price': {
    type: 'inline',
    label: 'Finalize Price',
    description: 'Lock in final pricing',
    status: '✅'
  },

  // ============================================
  // COLUMN 11: FINAL (Phase 8 - locked_phase)
  // ============================================
  'readiness_check': {
    type: 'navigate',
    path: '/FinalReview',
    label: 'Readiness Check',
    description: 'Comprehensive submission readiness verification',
    status: '✅'
  },
  'executive_review': {
    type: 'inline',
    label: 'Executive Review',
    description: 'Final executive sign-off',
    status: '✅'
  },
  'export_proposal': {
    type: 'modal',
    component: 'ExportDialog', // Special case - handled inline
    label: 'Export Proposal',
    description: 'Export final proposal document',
    status: '✅'
  },
  'mark_submitted': {
    type: 'inline',
    label: 'Mark as Submitted',
    description: 'Mark proposal as officially submitted',
    status: '✅'
  },

  // ============================================
  // COLUMN 12-15: SUBMITTED, WON, LOST, ARCHIVED
  // ============================================
  'capture_win_loss': {
    type: 'navigate',
    path: '/WinLossCapture',
    label: 'Capture Win/Loss',
    description: 'Document lessons learned and feedback',
    status: '✅'
  },
  'debrief': {
    type: 'inline',
    label: 'Conduct Debrief',
    description: 'Hold debrief meeting',
    status: '✅'
  },
  'update_analytics': {
    type: 'inline',
    label: 'Update Analytics',
    description: 'System automatically updates analytics',
    autoTracked: true,
    status: '✅'
  },

  // ============================================
  // LEGACY/FALLBACK ACTIONS
  // ============================================
  'open_modal_phase1': {
    type: 'modal',
    component: BasicInfoModal,
    label: 'Open Phase 1',
    status: '✅'
  },
  'open_modal_phase2': {
    type: 'modal',
    component: TeamFormationModal,
    label: 'Open Phase 2',
    status: '✅'
  },
  'open_modal_phase3': {
    type: 'modal',
    component: SolicitationUploadModal,
    label: 'Open Phase 3',
    status: '✅'
  },
  'open_modal_phase4': {
    type: 'modal',
    component: EvaluationModal,
    label: 'Open Phase 4',
    status: '✅'
  },
  'open_modal_phase5': {
    type: 'modal',
    component: WinStrategyModal,
    label: 'Open Phase 5',
    status: '✅'
  },
  'run_ai_analysis': {
    type: 'ai',
    handler: 'runAIAnalysis',
    label: 'Run AI Analysis',
    status: '✅'
  }
};

/**
 * ChecklistActionRegistry Component
 * Handles routing of checklist item clicks to appropriate actions
 */
export default function ChecklistActionRegistry({ 
  proposal, 
  organization, 
  user, 
  onRefresh 
}) {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = React.useState(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  /**
   * Execute an action from the registry
   */
  const executeAction = async (actionKey, checklistItem) => {
    const action = ACTION_REGISTRY[actionKey];
    
    if (!action) {
      console.warn(`[ActionRegistry] No action found for key: ${actionKey}`);
      return;
    }

    console.log(`[ActionRegistry] Executing action: ${actionKey}`, action);

    switch (action.type) {
      case 'modal':
        setActiveModal({
          component: action.component,
          actionKey,
          checklistItem
        });
        break;

      case 'navigate':
        const url = `${createPageUrl(action.path.replace('/', ''))}?id=${proposal.id}`;
        navigate(url);
        break;

      case 'ai':
        setIsProcessing(true);
        try {
          // AI actions will be handled by the modal or inline handlers
          console.log(`[ActionRegistry] AI action: ${action.handler}`);
          // The actual AI logic is in the modals themselves
        } catch (error) {
          console.error(`[ActionRegistry] AI action failed:`, error);
        } finally {
          setIsProcessing(false);
        }
        break;

      case 'inline':
        // Inline actions are handled by the parent component
        console.log(`[ActionRegistry] Inline action: ${actionKey}`);
        break;

      default:
        console.warn(`[ActionRegistry] Unknown action type: ${action.type}`);
    }
  };

  /**
   * Close active modal
   */
  const closeModal = () => {
    setActiveModal(null);
    if (onRefresh) {
      onRefresh();
    }
  };

  // Render active modal if any
  const renderModal = () => {
    if (!activeModal) return null;

    const ModalComponent = activeModal.component;
    
    return (
      <ModalComponent
        proposal={proposal}
        organization={organization}
        user={user}
        isOpen={true}
        onClose={closeModal}
        onSuccess={() => {
          closeModal();
          if (onRefresh) onRefresh();
        }}
      />
    );
  };

  return (
    <>
      {renderModal()}
      {/* This component primarily manages state, rendering is done by parent */}
    </>
  );
}

/**
 * Helper function to get action details
 */
export function getActionDetails(actionKey) {
  return ACTION_REGISTRY[actionKey] || null;
}

/**
 * Helper function to check if action needs implementation
 */
export function needsImplementation(actionKey) {
  const action = ACTION_REGISTRY[actionKey];
  return action?.needsImplementation === true;
}

/**
 * Helper function to get all actions by type
 */
export function getActionsByType(type) {
  return Object.entries(ACTION_REGISTRY)
    .filter(([_, action]) => action.type === type)
    .map(([key, action]) => ({ key, ...action }));
}

/**
 * Helper function to get implementation status summary
 */
export function getImplementationSummary() {
  const actions = Object.entries(ACTION_REGISTRY);
  const total = actions.length;
  const implemented = actions.filter(([_, a]) => a.status === '✅').length;
  const needsWork = actions.filter(([_, a]) => a.status === '🔶').length;
  const planning = actions.filter(([_, a]) => a.status === '📝').length;

  return {
    total,
    implemented,
    needsWork,
    planning,
    completionPercentage: Math.round((implemented / total) * 100)
  };
}