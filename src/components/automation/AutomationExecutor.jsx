
import React, { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient, useMutation } from "@tanstack/react-query";

/**
 * AutomationExecutor - Monitors proposals and executes automation rules
 * This component runs in the background and triggers rules when conditions are met
 */
export default function AutomationExecutor({ organization, proposals, automationRules }) {
  const queryClient = useQueryClient();
  // Using useRef to track processed items to avoid re-triggering automations for the same state
  // Key: `${rule.id}-${proposal.id}-${proposal.updated_date}`
  const processedRef = useRef(new Set());

  const updateProposalMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.Proposal.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ProposalSubtask.create(data);
    }
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Notification.create(data);
    }
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ProposalComment.create(data);
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.ProposalAutomationRule.update(id, data);
    }
  });

  // Main automation processing effect
  useEffect(() => {
    // Only proceed if organization, proposals, and rules are available
    if (!organization?.id || !proposals?.length || !automationRules?.length) return;

    const processAutomations = async () => {
      // Filter active rules only once
      const activeRules = automationRules.filter(r => r.is_active);

      for (const proposal of proposals) {
        // Filter proposals based on applies_to scope for each rule
        // This is a re-evaluation of relevantProposals from the old structure, now inside the loop for each rule
        for (const rule of activeRules) {
          let relevantProposals = [];
          if (rule.applies_to.scope === 'specific_columns') {
            if (rule.applies_to.column_ids?.includes(proposal.custom_workflow_stage_id)) {
              relevantProposals.push(proposal);
            }
          } else if (rule.applies_to.scope === 'specific_proposal_types') {
            if (rule.applies_to.proposal_types?.includes(proposal.project_type)) {
              relevantProposals.push(proposal);
            }
          } else if (rule.applies_to.scope === 'all_proposals') {
            relevantProposals.push(proposal);
          }
          
          if (relevantProposals.length === 0) continue; // Skip rule if proposal not relevant

          // We only need to process the *single* proposal that was deemed relevant
          const currentProposal = relevantProposals[0]; 

          // Generate unique key for this rule execution to prevent re-processing the same state
          // We use proposal.updated_date as a proxy for state change. If the proposal's updated_date
          // changes, it implies its state might have changed, and automations should be re-evaluated.
          // This prevents infinite loops if an action doesn't change `updated_date` but `processedRef` relies on it.
          // For now, `updated_date` is the best general indicator of state change.
          const executionKey = `${rule.id}-${currentProposal.id}-${currentProposal.updated_date}`;
          
          // Skip if already processed this specific state for this rule and proposal
          if (processedRef.current.has(executionKey)) continue;

          // Check if rule trigger conditions are met for the current proposal
          const shouldTrigger = await evaluateRuleTrigger(rule, currentProposal);
          if (!shouldTrigger) continue;

          // Check if additional conditions (filters) are met
          const conditionsMet = evaluateConditions(rule.conditions, currentProposal);
          if (!conditionsMet) continue;

          // If trigger and conditions are met, execute actions
          await executeActions(rule.actions, currentProposal, rule);

          // Mark as processed after successful execution to prevent re-triggering on same state
          processedRef.current.add(executionKey);

          // Update rule statistics (last triggered date and count)
          await updateRuleMutation.mutateAsync({
            id: rule.id,
            data: {
              last_triggered_date: new Date().toISOString(),
              trigger_count: (rule.trigger_count || 0) + 1
            }
          });
        }
      }
    };

    // Execute on mount and when proposals/rules/organization change
    processAutomations();
  }, [proposals, automationRules, organization]);


  // Evaluate if rule trigger conditions are met for a specific proposal
  const evaluateRuleTrigger = async (rule, proposal) => {
    const trigger = rule.trigger;
    
    switch (trigger.trigger_type) {
      case 'on_status_change':
        // Check if status changed to trigger status
        // This implicitly assumes the 'change' happened to this status
        // More robust would involve tracking previous status, but current framework doesn't provide it easily.
        // For now, it means "is currently this status"
        return trigger.trigger_conditions?.to_status === proposal.status;
      
      case 'on_column_move':
        // Check if proposal moved to specific column
        return trigger.trigger_conditions?.to_column_id === proposal.custom_workflow_stage_id;
      
      case 'on_due_date_approaching': {
        // Check if due date is within X days
        if (!proposal.due_date) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day for accurate day calculation

        const dueDate = new Date(proposal.due_date);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const daysBeforeThreshold = trigger.trigger_conditions?.days_before || 7;
        
        // Trigger if due date is within the threshold (inclusive) and not past due.
        // Also ensure it's not already triggered by checking `processedRef` implicitly via the `executionKey`
        return daysUntilDue <= daysBeforeThreshold && daysUntilDue >= 0;
      }
      
      case 'on_all_subtasks_complete': {
        // Check if all subtasks are complete
        const subtasks = await base44.entities.ProposalSubtask.filter({
          proposal_id: proposal.id,
          organization_id: organization.id
        });
        return subtasks.length > 0 && subtasks.every(s => s.status === 'completed');
      }
      
      case 'on_field_change':
        // Would need to track previous values - skip for now as it requires state history
        return false;
      
      case 'on_time_in_stage': {
        // Check if proposal has been in current stage for X hours
        // This interpretation uses the proposal's last updated_date as the "entry" into the current state.
        // A more precise "time in stage" would require tracking stage entry timestamps.
        if (!proposal.updated_date) return false;
        const hoursInStage = (new Date().getTime() - new Date(proposal.updated_date).getTime()) / (1000 * 60 * 60);
        return hoursInStage >= (trigger.trigger_conditions?.hours || 24);
      }

      case 'on_checklist_complete': {
        // Trigger when all required checklist items are complete for the current stage
        if (!proposal.current_stage_checklist_status || !proposal.current_stage_id) return false;
        
        // Get current column config
        const kanbanConfigs = await base44.entities.KanbanConfig.filter({
          organization_id: organization.id
        });
        
        if (kanbanConfigs.length === 0) return false;
        const config = kanbanConfigs[0];
        
        // Find current column based on proposal's current_stage_id (assuming this points to the column ID)
        const currentColumn = config.columns?.find(col => {
          // This logic assumes `current_stage_id` directly maps to a column ID.
          // If a column can be identified by phase_mapping or default_status_mapping,
          // then additional logic would be needed here to match `current_stage_id` to the correct column.
          // For now, we'll assume `current_stage_id` is the `id` of a custom_stage.
          // A more robust check might look at `proposal.custom_workflow_stage_id` for custom stages
          // or `proposal.status` for default_status stages.
          // Given the prompt, I'll align `current_stage_id` with `col.id` for custom_stage, which is the most likely case.
          return col.id === proposal.custom_workflow_stage_id; 
        });
        
        if (!currentColumn) return false;
        
        // Check if all required items are complete in the proposal's checklist status for this column
        const checklistStatus = proposal.current_stage_checklist_status[currentColumn.id] || {};
        const requiredItems = currentColumn.checklist_items?.filter(item => item.required) || [];
        
        // If there are no required items, it means "all required are complete" is true by default
        if (requiredItems.length === 0) return true;

        return requiredItems.every(item => checklistStatus[item.id]?.completed);
      }
      
      default:
        return false;
    }
  };

  // Evaluate rule conditions (filters) against a proposal
  const evaluateConditions = (conditions, proposal) => {
    if (!conditions || conditions.length === 0) return true; // No conditions means they are met

    let overallResult = true; // For AND logic
    let tempOrResult = false; // For OR logic accumulator

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const fieldValue = getFieldValue(proposal, condition.field);
      const currentConditionResult = evaluateCondition(fieldValue, condition.operator, condition.value);

      if (i === 0 || conditions[i-1].logic === 'AND') {
        // Start a new group or continue an AND group
        overallResult = overallResult && currentConditionResult;
        tempOrResult = currentConditionResult; // Initialize tempOrResult for a new group or if it's the start
      } else if (conditions[i-1].logic === 'OR') {
        // Continue an OR group
        tempOrResult = tempOrResult || currentConditionResult;
        // If the next condition is not an OR, or it's the last condition, merge the OR group result
        if (i + 1 === conditions.length || conditions[i].logic === 'AND') { // Check next condition's logic or if it's the last one
           overallResult = overallResult && tempOrResult;
        }
      }
      
      // If the current condition's logic is OR and it's the last one, apply its tempOrResult
      if (condition.logic === 'OR' && i + 1 === conditions.length) {
         overallResult = overallResult && tempOrResult;
      }
    }
    
    return overallResult;
  };

  // Helper to get field value from proposal, handling nested fields
  const getFieldValue = (proposal, field) => {
    // Handle nested fields like "custom_fields.Government POC"
    if (field && typeof field === 'string' && field.includes('.')) {
      const parts = field.split('.');
      let value = proposal;
      for (const part of parts) {
        if (value === undefined || value === null) return undefined; // Stop if any part is null/undefined
        value = value?.[part];
      }
      return value;
    }
    return proposal?.[field];
  };

  // Helper to evaluate a single condition
  const evaluateCondition = (fieldValue, operator, targetValue) => {
    // Standardize comparison values
    const fValue = typeof fieldValue === 'string' ? fieldValue.toLowerCase() : fieldValue;
    const tValue = typeof targetValue === 'string' ? targetValue.toLowerCase() : targetValue;

    switch (operator) {
      case 'equals':
        return fValue === tValue;
      case 'not_equals':
        return fValue !== tValue;
      case 'greater_than':
        return Number(fValue) > Number(tValue);
      case 'less_than':
        return Number(fValue) < Number(tValue);
      case 'contains':
        return String(fValue).includes(String(tValue));
      case 'is_empty':
        return !fValue || fValue === '';
      case 'is_not_empty':
        return !!fValue && fValue !== '';
      default:
        return false;
    }
  };

  // Execute a list of actions for a given proposal and rule
  const executeActions = async (actions, proposal, rule) => {
    for (const action of actions) {
      try {
        switch (action.action_type) {
          case 'move_to_column':
            await handleMoveToColumn(proposal, action.action_config);
            break;
          
          case 'change_status':
            await updateProposalMutation.mutateAsync({
              id: proposal.id,
              data: { status: action.action_config.status }
            });
            break;
          
          case 'send_notification':
            await handleSendNotification(proposal, action.action_config);
            break;
          
          case 'create_subtask':
            await handleCreateSubtask(proposal, action.action_config);
            break;
          
          case 'assign_user':
            await handleAssignUser(proposal, action.action_config);
            break;
          
          case 'set_field_value':
            await handleSetFieldValue(proposal, action.action_config);
            break;
          
          case 'add_comment':
            await handleAddComment(proposal, action.action_config, rule);
            break;
          
          case 'create_calendar_event': // Old action, ensure compatibility or remove if not needed
            // This action type was in the original file, but not in the outline's `executeActions` switch.
            // Re-adding it to ensure backward compatibility as it's a valid action.
            await handleCreateCalendarEvent(proposal, action.action_config);
            break;
            
          default:
            console.warn(`AutomationExecutor: Unknown action type: ${action.action_type}`);
        }
      } catch (error) {
        console.error(`AutomationExecutor: Error executing action ${action.action_type} for proposal ${proposal.id}:`, error);
      }
    }
  };

  // --- Action Handlers (using mutation hooks) ---

  const handleMoveToColumn = async (proposal, config) => {
    if (!config.column_id) return;
    const updates = {
      custom_workflow_stage_id: config.column_id
    };
    await updateProposalMutation.mutateAsync({ id: proposal.id, data: updates });
  };

  const handleSendNotification = async (proposal, config) => {
    const message = config.message || 'An automation rule was triggered';
    const title = config.title || `Update: ${proposal.proposal_name || 'Proposal'}`;
    const recipientType = config.recipient_type || 'assigned_users'; // Default to assigned_users
    
    let recipients = [];
    
    if (recipientType === 'assigned_users') {
      recipients = proposal.assigned_team_members || [];
    } else if (recipientType === 'lead_writer' && proposal.lead_writer_email) {
      recipients = [proposal.lead_writer_email];
    } else if (recipientType === 'specific_user' && config.user_email) {
      recipients = [config.user_email];
    } else if (recipientType === 'all_team') {
      const users = await base44.entities.User.list();
      recipients = users
        .filter(u => u.client_accesses?.some(a => a.organization_id === organization.id))
        .map(u => u.email);
    } else if (config.recipients && Array.isArray(config.recipients)) {
      // For a simple list of emails provided directly in config.recipients
      recipients = config.recipients;
    }

    for (const recipientEmail of recipients) {
      await createNotificationMutation.mutateAsync({
        user_email: recipientEmail,
        notification_type: 'automation_alert', // Changed to a more generic automation type
        title: title.replace(/{proposal_name}/g, proposal.proposal_name || 'Proposal'),
        message: message.replace(/{proposal_name}/g, proposal.proposal_name || 'Proposal'),
        related_proposal_id: proposal.id,
        action_url: `/proposal-builder?id=${proposal.id}`,
        from_user_email: 'automation@system',
        from_user_name: 'Automation Engine'
      });
    }
  };

  const handleCreateSubtask = async (proposal, config) => {
    if (!config.title) return;
    await createSubtaskMutation.mutateAsync({
      proposal_id: proposal.id,
      organization_id: organization.id,
      title: config.title.replace(/{proposal_name}/g, proposal.proposal_name || 'Proposal'),
      description: config.description?.replace(/{proposal_name}/g, proposal.proposal_name || 'Proposal') || '',
      status: 'not_started',
      priority: config.priority || 'medium'
    });
  };

  const handleAssignUser = async (proposal, config) => {
    if (!config.user_email) return;
    
    const currentAssignees = proposal.assigned_team_members || [];
    if (!currentAssignees.includes(config.user_email)) {
      await updateProposalMutation.mutateAsync({
        id: proposal.id,
        data: {
          assigned_team_members: [...currentAssignees, config.user_email]
        }
      });
    }
  };

  const handleSetFieldValue = async (proposal, config) => {
    if (!config.field || config.value === undefined) return;
    
    const updates = {};
    // Handle custom fields (like "custom_fields.FieldName")
    if (config.field.startsWith('custom_fields.')) {
      const fieldName = config.field.replace('custom_fields.', '');
      updates.custom_fields = {
        ...proposal.custom_fields,
        [fieldName]: config.value
      };
    } else {
      updates[config.field] = config.value;
    }
    await updateProposalMutation.mutateAsync({ id: proposal.id, data: updates });
  };

  const handleAddComment = async (proposal, config, rule) => {
    const commentText = config.comment || `Automation rule "${rule.rule_name}" was triggered.`;
    await createCommentMutation.mutateAsync({
      proposal_id: proposal.id,
      author_email: 'system@proposaliq.ai',
      author_name: 'Automation',
      content: commentText.replace(/{proposal_name}/g, proposal.proposal_name || 'Proposal'),
      comment_type: 'general'
    });
  };

  const handleCreateCalendarEvent = async (proposal, config) => {
    const eventTitle = config.event_title || 'Automated Event';
    const daysOffset = config.days_offset || 0;
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + daysOffset); // Add days offset
      
    await base44.entities.CalendarEvent.create({
      organization_id: organization.id,
      event_type: 'reminder', // Or another type if specified in config
      title: eventTitle.replace(/{proposal_name}/g, proposal.proposal_name || 'Proposal'),
      start_date: eventDate.toISOString(),
      end_date: new Date(eventDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
      proposal_id: proposal.id,
      created_by_email: 'automation@system',
      created_by_name: 'Automation Engine'
    });
  };

  // This component doesn't render anything visually
  return null;
}
