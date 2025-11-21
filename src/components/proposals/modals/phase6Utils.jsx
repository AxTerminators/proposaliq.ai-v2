/**
 * Phase 6 Utilities
 * 
 * Handles workflow automation features:
 * - Webhooks
 * - Email notifications
 * - Status updates
 */

import { base44 } from '@/api/base44Client';

/**
 * Replace placeholders in text with form data and context
 */
export function replacePlaceholders(text, formData, context) {
  if (!text) return text;

  let result = text;

  // Replace form field placeholders {{field_name}}
  Object.entries(formData).forEach(([key, value]) => {
    const placeholder = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(placeholder, value || '');
  });

  // Replace context placeholders
  if (context) {
    if (context.user) {
      result = result.replace(/{{user_name}}/g, context.user.full_name || '');
      result = result.replace(/{{user_email}}/g, context.user.email || '');
    }
    if (context.organization) {
      result = result.replace(/{{organization_name}}/g, context.organization.organization_name || '');
    }
    if (context.proposal) {
      result = result.replace(/{{proposal_name}}/g, context.proposal.proposal_name || '');
      result = result.replace(/{{proposal_id}}/g, context.proposal.id || '');
    }
  }

  return result;
}

/**
 * Execute webhooks after form submission
 */
export async function executeWebhooks(webhooks = [], formData, context) {
  if (!webhooks || !Array.isArray(webhooks) || webhooks.length === 0) return;

  const enabledWebhooks = webhooks.filter(w => w.enabled && w.url);

  for (const webhook of enabledWebhooks) {
    try {
      // Build payload
      let payload = {};

      if (webhook.customPayload) {
        // Parse custom payload and replace placeholders
        try {
          let customPayloadStr = webhook.customPayload;
          customPayloadStr = customPayloadStr.replace(/\$FORM_DATA/g, JSON.stringify(formData));
          customPayloadStr = customPayloadStr.replace(/\$CONTEXT/g, JSON.stringify(context));
          payload = JSON.parse(customPayloadStr);
        } catch (error) {
          console.error('Error parsing custom payload:', error);
        }
      } else {
        // Default payload structure
        if (webhook.includeFormData) {
          payload.formData = formData;
        }
        if (webhook.includeContext) {
          payload.context = {
            proposal: context.proposal ? { id: context.proposal.id, name: context.proposal.proposal_name } : null,
            organization: context.organization ? { id: context.organization.id, name: context.organization.organization_name } : null,
            user: context.user ? { email: context.user.email, name: context.user.full_name } : null
          };
        }
        payload.timestamp = new Date().toISOString();
      }

      // Execute webhook
      console.log(`[Phase 6] Executing webhook: ${webhook.url}`, payload);

      const response = await fetch(webhook.url, {
        method: webhook.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        console.error(`Webhook failed: ${webhook.url}`, await response.text());
      } else {
        console.log(`[Phase 6] Webhook successful: ${webhook.url}`);
      }
    } catch (error) {
      console.error(`Error executing webhook ${webhook.url}:`, error);
    }
  }
}

/**
 * Send email notifications after form submission
 */
export async function sendEmailNotifications(notifications = [], formData, context) {
  if (!notifications || !Array.isArray(notifications) || notifications.length === 0) return;

  const enabledNotifications = notifications.filter(n => n.enabled && n.to && n.subject && n.body);

  for (const notification of enabledNotifications) {
    try {
      // Replace placeholders in email fields
      const to = replacePlaceholders(notification.to, formData, context);
      const subject = replacePlaceholders(notification.subject, formData, context);
      let body = replacePlaceholders(notification.body, formData, context);

      // Optionally append form data
      if (notification.includeFormData) {
        body += '\n\n---\nForm Data:\n' + JSON.stringify(formData, null, 2);
      }

      console.log(`[Phase 6] Sending email to: ${to}`, { subject });

      // Send email via Core.SendEmail integration
      await base44.integrations.Core.SendEmail({
        from_name: notification.fromName || 'GovHQ.ai',
        to,
        subject,
        body
      });

      console.log(`[Phase 6] Email sent successfully to: ${to}`);
    } catch (error) {
      console.error(`Error sending email notification:`, error);
    }
  }
}

/**
 * Execute status updates after form submission
 */
export async function executeStatusUpdates(statusUpdates = [], formData, context) {
  if (!statusUpdates || !Array.isArray(statusUpdates) || statusUpdates.length === 0) return;

  const enabledUpdates = statusUpdates.filter(u => u.enabled && u.entity && u.targetField && u.newValue);

  for (const update of enabledUpdates) {
    try {
      // Resolve entity ID
      let entityId = null;

      if (update.idResolution?.method === 'context') {
        // Get from context (e.g., proposal.id)
        const path = update.idResolution.contextPath || '';
        const pathParts = path.split('.');
        let value = context;
        for (const part of pathParts) {
          value = value?.[part];
        }
        entityId = value;
      } else if (update.idResolution?.method === 'field') {
        // Get from form field
        entityId = formData[update.idResolution.fieldId];
      }

      if (!entityId) {
        console.warn(`[Phase 6] Could not resolve entity ID for status update:`, update);
        continue;
      }

      // Replace placeholders in new value
      const newValue = replacePlaceholders(update.newValue, formData, context);

      console.log(`[Phase 6] Updating ${update.entity} ${entityId}: ${update.targetField} = ${newValue}`);

      // Execute update
      await base44.entities[update.entity].update(entityId, {
        [update.targetField]: newValue
      });

      console.log(`[Phase 6] Status update successful`);
    } catch (error) {
      console.error(`Error executing status update:`, error);
    }
  }
}

/**
 * Execute all Phase 6 workflow automations
 */
export async function executePhase6Workflows(modalConfig, formData, context) {
  try {
    const config = typeof modalConfig.config_json === 'string' 
      ? JSON.parse(modalConfig.config_json)
      : modalConfig.config_json || modalConfig;

    console.log('[Phase 6] Executing workflow automations...');

    // Execute webhooks (non-blocking)
    if (config.webhooks) {
      executeWebhooks(config.webhooks, formData, context).catch(err => 
        console.error('Webhook execution error:', err)
      );
    }

    // Send email notifications (non-blocking)
    if (config.emailNotifications) {
      sendEmailNotifications(config.emailNotifications, formData, context).catch(err =>
        console.error('Email notification error:', err)
      );
    }

    // Execute status updates (blocking - important for workflow)
    if (config.statusUpdates) {
      await executeStatusUpdates(config.statusUpdates, formData, context);
    }

    console.log('[Phase 6] Workflow automations complete');
  } catch (error) {
    console.error('[Phase 6] Error executing workflows:', error);
  }
}