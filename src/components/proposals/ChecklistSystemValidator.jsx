import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * System validator that automatically checks and updates system_check type checklist items
 * based on proposal data
 */
export default function ChecklistSystemValidator({ proposal, kanbanConfig, user }) {
  const queryClient = useQueryClient();

  const updateChecklistMutation = useMutation({
    mutationFn: async (updates) => {
      return base44.entities.Proposal.update(proposal.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  useEffect(() => {
    if (!proposal || !kanbanConfig || !user) return;

    // Get current column configuration
    const currentColumn = kanbanConfig.columns?.find(col => {
      if (col.type === 'locked_phase') {
        return col.phase_mapping === proposal.current_phase;
      } else if (col.type === 'custom_stage') {
        return col.id === proposal.custom_workflow_stage_id;
      } else if (col.type === 'default_status') {
        return col.default_status_mapping === proposal.status;
      }
      return false;
    });

    if (!currentColumn) return;

    const checklistItems = currentColumn.checklist_items || [];
    const checklistStatus = proposal.current_stage_checklist_status?.[currentColumn.id] || {};
    
    // Find all system_check items that need validation
    const systemCheckItems = checklistItems.filter(item => item.type === 'system_check');
    
    let hasChanges = false;
    const updatedStatus = { ...proposal.current_stage_checklist_status };
    
    if (!updatedStatus[currentColumn.id]) {
      updatedStatus[currentColumn.id] = {};
    }

    systemCheckItems.forEach(item => {
      const shouldBeComplete = validateSystemCheck(item.id, proposal);
      const currentlyComplete = checklistStatus[item.id]?.completed || false;

      // If status changed, update it
      if (shouldBeComplete !== currentlyComplete) {
        updatedStatus[currentColumn.id][item.id] = {
          completed: shouldBeComplete,
          completed_by: shouldBeComplete ? 'system' : null,
          completed_date: shouldBeComplete ? new Date().toISOString() : null
        };
        hasChanges = true;
      }
    });

    // If there are changes, update the proposal
    if (hasChanges) {
      // Check if there are any required incomplete items
      const hasActionRequired = checklistItems.some(item => {
        const isCompleted = updatedStatus[currentColumn.id]?.[item.id]?.completed;
        return item.required && !isCompleted;
      });

      updateChecklistMutation.mutate({
        current_stage_checklist_status: updatedStatus,
        action_required: hasActionRequired,
        action_required_description: hasActionRequired 
          ? `Complete required items in ${currentColumn.label}` 
          : null
      });
    }
  }, [proposal, kanbanConfig, user]);

  return null; // This is a non-rendering component
}

/**
 * Validates whether a system check should be marked as complete
 */
function validateSystemCheck(itemId, proposal) {
  switch (itemId) {
    // Qualify stage checks
    case 'contract_value':
      return proposal.contract_value && proposal.contract_value > 0;
    
    case 'due_date':
      return !!proposal.due_date;
    
    // Basic info checks
    case 'name_solicitation':
      return !!(proposal.proposal_name && proposal.solicitation_number);
    
    // Drafting stage - check if all sections are complete
    case 'complete_sections':
      // This would require fetching sections, which we can't do here
      // This check should be done at a higher level or via a separate query
      return false; // Placeholder - implement with actual section check
    
    default:
      return false;
  }
}