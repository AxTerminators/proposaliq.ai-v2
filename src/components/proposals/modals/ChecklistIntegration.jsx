import React from 'react';
import DynamicModal from './DynamicModal';
import { MODAL_TEMPLATES } from './ModalTemplateLibrary';

/**
 * Phase 4: Checklist System Integration Helper
 * 
 * This component bridges the gap between the checklist system and DynamicModal.
 * Use this to easily integrate modals into your checklist actions.
 */

/**
 * Map checklist action IDs to modal templates
 * 
 * Usage in ChecklistActionRegistry or column configuration:
 * {
 *   id: 'upload_solicitation',
 *   label: 'Upload Solicitation',
 *   type: 'modal_trigger',
 *   associated_action: 'open_modal_upload_solicitation'
 * }
 */
export const CHECKLIST_MODAL_MAPPING = {
  // Phase 1 modals
  'open_modal_phase1': 'ADD_TEAMING_PARTNER',
  'upload_solicitation': 'UPLOAD_SOLICITATION',
  'add_partner': 'ADD_TEAMING_PARTNER',
  
  // Document uploads
  'upload_rfp': 'UPLOAD_SOLICITATION',
  'upload_sow': 'UPLOAD_SOLICITATION',
  'upload_documents': 'UPLOAD_RESOURCE',
  
  // Content management
  'add_past_performance': 'ADD_PAST_PERFORMANCE',
  'upload_capability': 'ADD_TEAMING_PARTNER',
  'add_resource': 'UPLOAD_RESOURCE',
  
  // AI-powered
  'ai_data_collection': 'AI_DATA_CALL',
  'smart_form': 'AI_DATA_CALL'
};

/**
 * Hook to integrate DynamicModal with checklist system
 * 
 * @example
 * const { openModal, modalProps } = useChecklistModal(proposalId, organizationId);
 * 
 * // In your checklist item click handler:
 * if (item.type === 'modal_trigger') {
 *   openModal(item.associated_action);
 * }
 * 
 * // In your JSX:
 * <DynamicModal {...modalProps} />
 */
export function useChecklistModal(proposalId, organizationId) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentConfig, setCurrentConfig] = React.useState(null);

  const openModal = React.useCallback((actionId) => {
    const templateKey = CHECKLIST_MODAL_MAPPING[actionId];
    
    if (!templateKey) {
      console.warn(`[ChecklistIntegration] No modal template found for action: ${actionId}`);
      return;
    }

    const template = MODAL_TEMPLATES[templateKey];
    if (!template) {
      console.warn(`[ChecklistIntegration] Template not found: ${templateKey}`);
      return;
    }

    const config = template.config(proposalId, organizationId);
    setCurrentConfig(config);
    setIsOpen(true);
  }, [proposalId, organizationId]);

  const closeModal = React.useCallback(() => {
    setIsOpen(false);
    setCurrentConfig(null);
  }, []);

  return {
    openModal,
    closeModal,
    modalProps: {
      isOpen,
      onClose: closeModal,
      config: currentConfig
    }
  };
}

/**
 * Example integration component
 * Shows how to use DynamicModal with checklist system
 */
export default function ChecklistIntegrationExample({ proposal }) {
  const { openModal, modalProps } = useChecklistModal(proposal.id, proposal.organization_id);

  const handleChecklistItemClick = (item) => {
    console.log('[Checklist] Item clicked:', item);

    // Handle different item types
    switch (item.type) {
      case 'modal_trigger':
        // Open the associated modal
        openModal(item.associated_action);
        break;
      
      case 'ai_trigger':
        // Run AI action
        console.log('Running AI action:', item.associated_action);
        break;
      
      case 'manual_check':
        // Mark as complete
        console.log('Marking item as complete');
        break;
      
      default:
        console.log('Unknown item type:', item.type);
    }
  };

  return (
    <div>
      {/* Your checklist UI */}
      <div className="space-y-2">
        {/* Example checklist items */}
        <button
          onClick={() => handleChecklistItemClick({
            id: 'item_1',
            label: 'Upload Solicitation',
            type: 'modal_trigger',
            associated_action: 'upload_solicitation'
          })}
          className="p-3 border rounded hover:bg-slate-50"
        >
          Upload Solicitation
        </button>
        
        <button
          onClick={() => handleChecklistItemClick({
            id: 'item_2',
            label: 'Add Teaming Partner',
            type: 'modal_trigger',
            associated_action: 'add_partner'
          })}
          className="p-3 border rounded hover:bg-slate-50"
        >
          Add Teaming Partner
        </button>
      </div>

      {/* Modal component */}
      <DynamicModal {...modalProps} />
    </div>
  );
}

/**
 * Integration Guide for ChecklistItemRenderer
 * 
 * To integrate DynamicModal into your existing ChecklistItemRenderer:
 * 
 * 1. Import the hook:
 *    import { useChecklistModal } from './ChecklistIntegration';
 * 
 * 2. Use the hook in your component:
 *    const { openModal, modalProps } = useChecklistModal(proposalId, organizationId);
 * 
 * 3. Update your click handler to detect modal triggers:
 *    const handleItemClick = () => {
 *      if (item.type === 'modal_trigger') {
 *        openModal(item.associated_action);
 *        return;
 *      }
 *      // ... existing logic for other types
 *    };
 * 
 * 4. Add the DynamicModal to your JSX:
 *    <DynamicModal {...modalProps} />
 * 
 * 5. Update your checklist configurations to use modal_trigger type:
 *    {
 *      id: 'upload_solicitation',
 *      label: 'Upload Solicitation',
 *      type: 'modal_trigger',
 *      associated_action: 'upload_solicitation',
 *      required: true
 *    }
 */