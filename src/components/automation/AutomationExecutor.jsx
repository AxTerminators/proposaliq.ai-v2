import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * AutomationExecutor - Monitors proposals and executes automation rules
 * This component runs in the background and triggers rules when conditions are met
 */
export default function AutomationExecutor({ organization, proposals = [], automationRules = [] }) {
  
  useEffect(() => {
    if (!organization?.id || automationRules.length === 0) return;

    const executeAutomations = async () => {
      const activeRules = automationRules.filter(r => r.is_active);
      
      for (const rule of activeRules) {
        try {
          await evaluateAndExecuteRule(rule, proposals, organization);
        } catch (error) {
          console.error(`Error executing rule ${rule.rule_name}:`, error);
        }
      }
    };

    // Execute on mount and when proposals/rules change
    executeAutomations();
  }, [proposals.length, automationRules.length, organization?.id]);

  // This component doesn't render anything
  return null;
}

/**
 * Evaluate a rule against all proposals and execute actions if triggered
 */
async function evaluateAndExecuteRule(rule, proposals, organization) {
  const { trigger, actions, applies_to } = rule;
  
  // Filter proposals based on applies_to scope
  let relevantProposals = proposals;
  
  if (applies_to.scope === 'specific_columns') {
    relevantProposals = proposals.filter(p => 
      applies_to.column_ids?.includes(p.custom_workflow_stage_id)
    );
  } else if (applies_to.scope === 'specific_proposal_types') {
    relevantProposals = proposals.filter(p => 
      applies_to.proposal_types?.includes(p.project_type)
    );
  }

  // Check each proposal against trigger conditions
  for (const proposal of relevantProposals) {
    const shouldTrigger = await checkTrigger(proposal, trigger, organization);
    
    if (shouldTrigger) {
      // Execute all actions for this proposal
      for (const action of actions) {
        await executeAction(proposal, action, organization);
      }

      // Update trigger count
      await base44.entities.ProposalAutomationRule.update(rule.id, {
        trigger_count: (rule.trigger_count || 0) + 1,
        last_triggered_date: new Date().toISOString()
      });
    }
  }
}

/**
 * Check if a trigger condition is met for a proposal
 */
async function checkTrigger(proposal, trigger, organization) {
  const { trigger_type, trigger_conditions } = trigger;

  // Note: Most triggers need to be checked by comparing current vs previous state
  // For MVP, we'll implement time-based and field-based checks
  
  switch (trigger_type) {
    case 'on_due_date_approaching': {
      if (!proposal.due_date) return false;
      const daysUntilDue = moment(proposal.due_date).diff(moment(), 'days');
      const daysBefore = trigger_conditions?.days_before || 3;
      
      // Only trigger once when we hit the threshold
      const notifications = await base44.entities.Notification.filter({
        related_proposal_id: proposal.id,
        notification_type: 'deadline_reminder'
      });
      
      const recentNotification = notifications.find(n => 
        moment(n.created_date).isAfter(moment().subtract(1, 'day'))
      );
      
      return daysUntilDue === daysBefore && !recentNotification;
    }

    case 'on_time_in_stage': {
      const daysInStage = trigger_conditions?.days_in_stage || 7;
      const snapshots = await base44.entities.ProposalMetricSnapshot.filter(
        { proposal_id: proposal.id, organization_id: organization.id },
        '-snapshot_date',
        1
      );
      
      if (snapshots.length === 0) return false;
      
      const latestSnapshot = snapshots[0];
      const hoursInStage = latestSnapshot.time_in_current_stage_hours || 0;
      const daysInCurrentStage = hoursInStage / 24;
      
      // Trigger if exceeded threshold and hasn't been triggered recently
      return daysInCurrentStage >= daysInStage;
    }

    case 'on_all_subtasks_complete': {
      const subtasks = await base44.entities.ProposalSubtask.filter({
        proposal_id: proposal.id,
        organization_id: organization.id
      });
      
      if (subtasks.length === 0) return false;
      
      const allComplete = subtasks.every(s => s.status === 'completed');
      
      // Check if we've already triggered for this state
      const alreadyMoved = proposal.status === 'submitted' || proposal.status === 'won';
      
      return allComplete && !alreadyMoved;
    }

    default:
      return false;
  }
}

/**
 * Execute an action on a proposal
 */
async function executeAction(proposal, action, organization) {
  const { action_type, action_config } = action;

  switch (action_type) {
    case 'move_to_column': {
      if (!action_config.column_id) return;
      
      await base44.entities.Proposal.update(proposal.id, {
        custom_workflow_stage_id: action_config.column_id
      });
      break;
    }

    case 'change_status': {
      if (!action_config.status) return;
      
      await base44.entities.Proposal.update(proposal.id, {
        status: action_config.status
      });
      break;
    }

    case 'send_notification': {
      const message = action_config.message || 'Automated notification';
      const recipientType = action_config.recipient_type || 'assigned_users';
      
      let recipients = [];
      
      if (recipientType === 'assigned_users') {
        recipients = proposal.assigned_team_members || [];
      } else if (recipientType === 'lead_writer' && proposal.lead_writer_email) {
        recipients = [proposal.lead_writer_email];
      } else if (recipientType === 'specific_user' && action_config.user_email) {
        recipients = [action_config.user_email];
      } else if (recipientType === 'all_team') {
        const users = await base44.entities.User.list();
        recipients = users
          .filter(u => u.client_accesses?.some(a => a.organization_id === organization.id))
          .map(u => u.email);
      }

      for (const recipientEmail of recipients) {
        await base44.entities.Notification.create({
          user_email: recipientEmail,
          notification_type: 'status_change',
          title: '🤖 Automated Action',
          message: message.replace(/{proposal_name}/g, proposal.proposal_name || 'Proposal'),
          related_proposal_id: proposal.id,
          action_url: `/proposal-builder?id=${proposal.id}`,
          from_user_email: 'automation@system',
          from_user_name: 'Automation Engine'
        });
      }
      break;
    }

    case 'assign_user': {
      if (!action_config.user_email) return;
      
      const currentAssignees = proposal.assigned_team_members || [];
      if (!currentAssignees.includes(action_config.user_email)) {
        await base44.entities.Proposal.update(proposal.id, {
          assigned_team_members: [...currentAssignees, action_config.user_email]
        });
      }
      break;
    }

    case 'set_field_value': {
      if (!action_config.field_name || action_config.field_value === undefined) return;
      
      const updates = {};
      
      // Handle custom fields
      if (action_config.field_name.startsWith('custom_fields.')) {
        const fieldName = action_config.field_name.replace('custom_fields.', '');
        updates.custom_fields = {
          ...proposal.custom_fields,
          [fieldName]: action_config.field_value
        };
      } else {
        updates[action_config.field_name] = action_config.field_value;
      }
      
      await base44.entities.Proposal.update(proposal.id, updates);
      break;
    }

    case 'add_comment': {
      const commentText = action_config.comment_text || 'Automated comment';
      
      await base44.entities.ProposalComment.create({
        proposal_id: proposal.id,
        author_email: 'automation@system',
        author_name: 'Automation Engine',
        content: commentText.replace(/{proposal_name}/g, proposal.proposal_name || 'Proposal'),
        comment_type: 'general'
      });
      break;
    }

    case 'create_calendar_event': {
      const eventTitle = action_config.event_title || 'Automated Event';
      const daysOffset = action_config.days_offset || 0;
      const eventDate = moment().add(daysOffset, 'days').toISOString();
      
      await base44.entities.CalendarEvent.create({
        organization_id: organization.id,
        event_type: 'reminder',
        title: eventTitle.replace(/{proposal_name}/g, proposal.proposal_name || 'Proposal'),
        start_date: eventDate,
        end_date: moment(eventDate).add(1, 'hour').toISOString(),
        proposal_id: proposal.id,
        created_by_email: 'automation@system',
        created_by_name: 'Automation Engine'
      });
      break;
    }

    default:
      console.log(`Action type ${action_type} not implemented yet`);
  }
}