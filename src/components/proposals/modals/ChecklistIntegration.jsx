import React from 'react';
import DynamicModal from './DynamicModal';
import { MODAL_TEMPLATES } from './ModalTemplateLibrary';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getActionConfig } from '../ChecklistActionRegistry';

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
  'smart_form': 'AI_DATA_CALL',
  
  // Phase 1.2 & 1.3: New templates
  'pricing_sheet': 'PRICING_SHEET',
  'add_pricing': 'PRICING_SHEET',
  'compliance_matrix': 'COMPLIANCE_MATRIX',
  'add_compliance': 'COMPLIANCE_MATRIX'
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
  
  // Fetch custom modal configs
  const { data: customModals = [] } = useQuery({
    queryKey: ['modalConfigs'],
    queryFn: () => base44.entities.ModalConfig.list('-updated_date')
  });

  const openModal = React.useCallback((actionId) => {
    if (!actionId) return;
    
    // Check if it's a custom modal (format: CUSTOM_{id})
    if (typeof actionId === 'string' && actionId.startsWith('CUSTOM_')) {
      const modalId = actionId.replace('CUSTOM_', '');
      const customModal = customModals.find(m => m.id === modalId);
      
      if (!customModal || !customModal.is_active) {
        console.warn(`[ChecklistIntegration] Custom modal not found or inactive: ${modalId}`);
        return;
      }

      try {
        const parsedConfig = JSON.parse(customModal.config_json);
        
        // Build full config for DynamicModal
        const config = {
          title: parsedConfig.title,
          description: parsedConfig.description,
          fields: parsedConfig.fields || [],
          steps: parsedConfig.steps || null,
          proposalId,
          organizationId,
          modalId: customModal.id,
          onSubmit: async (formData) => {
            console.log('[CustomModal] Submitting:', formData);
            
            // Handle entity operations if configured
            if (parsedConfig.entityOperations && parsedConfig.entityOperations.length > 0) {
              for (const op of parsedConfig.entityOperations) {
                if (op.type === 'create' && op.entity) {
                  const entityData = { organization_id: organizationId };
                  
                  // Map form data to entity fields
                  parsedConfig.fields.forEach(field => {
                    if (field.mappingType === 'entity' && field.targetEntity === op.entity) {
                      entityData[field.targetAttribute] = formData[field.name];
                    }
                  });
                  
                  await base44.entities[op.entity].create(entityData);
                }
              }
            } else {
              // Default: save to proposal or entity based on field mappings
              const entitiesToUpdate = {};
              
              parsedConfig.fields.forEach(field => {
                if (field.mappingType === 'entity') {
                  const entity = field.targetEntity || 'Proposal';
                  if (!entitiesToUpdate[entity]) {
                    entitiesToUpdate[entity] = {};
                  }
                  entitiesToUpdate[entity][field.targetAttribute] = formData[field.name];
                }
              });
              
              // Update entities
              for (const [entity, data] of Object.entries(entitiesToUpdate)) {
                if (entity === 'Proposal' && proposalId) {
                  await base44.entities.Proposal.update(proposalId, data);
                }
              }
            }
          }
        };

        setCurrentConfig(config);
        setIsOpen(true);
      } catch (error) {
        console.error('[ChecklistIntegration] Error parsing custom modal config:', error);
      }
      return;
    }

    // Handle built-in modals
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
  }, [proposalId, organizationId, customModals]);

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