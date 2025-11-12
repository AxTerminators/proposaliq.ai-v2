import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Send Client Notification Email
 * Automated email notifications for various client portal events
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      client_id,
      notification_type,
      proposal_id,
      custom_message,
      portal_url
    } = await req.json();

    if (!client_id || !notification_type) {
      return Response.json({
        success: false,
        error: 'client_id and notification_type required'
      }, { status: 400 });
    }

    // Fetch client organization
    const clients = await base44.asServiceRole.entities.Organization.filter({
      id: client_id,
      organization_type: 'client_organization'
    });

    if (clients.length === 0) {
      return Response.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    const client = clients[0];

    // Fetch proposal if provided
    let proposal = null;
    if (proposal_id) {
      const proposals = await base44.asServiceRole.entities.Proposal.filter({
        id: proposal_id
      });
      if (proposals.length > 0) {
        proposal = proposals[0];
      }
    }

    // Build email based on notification type
    let subject = '';
    let body = '';

    switch (notification_type) {
      case 'proposal_shared':
        subject = `New Proposal Shared: ${proposal?.proposal_name || 'Untitled'}`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📄 New Proposal</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; color: #374151;">
                Hello ${client.contact_name || 'there'},
              </p>
              <p style="font-size: 16px; color: #374151; margin: 20px 0;">
                Your consultant has shared a new proposal: <strong>${proposal?.proposal_name}</strong>
              </p>
              ${custom_message ? `
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="color: #1e40af; margin: 0; white-space: pre-wrap;">${custom_message}</p>
                </div>
              ` : ''}
              ${portal_url ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${portal_url}" style="background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                    View Proposal →
                  </a>
                </div>
              ` : ''}
            </div>
          </div>
        `;
        break;

      case 'status_change':
        subject = `Proposal Update: ${proposal?.proposal_name}`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📊 Proposal Updated</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; color: #374151;">
                Hello ${client.contact_name || 'there'},
              </p>
              <p style="font-size: 16px; color: #374151; margin: 20px 0;">
                Status update for <strong>${proposal?.proposal_name}</strong>
              </p>
              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="color: #1e293b; margin: 0;">
                  New Status: <strong style="color: #3b82f6;">${proposal?.status.replace('_', ' ').toUpperCase()}</strong>
                </p>
              </div>
              ${portal_url ? `
                <div style="text-align: center;">
                  <a href="${portal_url}" style="background: #3b82f6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                    View Details →
                  </a>
                </div>
              ` : ''}
            </div>
          </div>
        `;
        break;

      case 'consultant_reply':
        subject = `Response to Your Feedback - ${proposal?.proposal_name}`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">💬 New Response</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
              <p style="font-size: 16px; color: #374151;">
                Your consultant has responded to your feedback.
              </p>
              ${custom_message ? `
                <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                  <p style="color: #166534; margin: 0; white-space: pre-wrap;">${custom_message}</p>
                </div>
              ` : ''}
              ${portal_url ? `
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${portal_url}" style="background: #22c55e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                    View in Portal →
                  </a>
                </div>
              ` : ''}
            </div>
          </div>
        `;
        break;

      default:
        subject = 'Notification from Your Consultant';
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #3b82f6; padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">Notification</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb;">
              <p>${custom_message || 'You have a new notification from your consultant.'}</p>
            </div>
          </div>
        `;
    }

    // Send email
    await base44.integrations.Core.SendEmail({
      to: client.contact_email,
      subject,
      body
    });

    // Create notification record
    await base44.asServiceRole.entities.ClientNotification.create({
      client_id: client.id,
      proposal_id: proposal?.id,
      notification_type,
      title: subject,
      message: custom_message || '',
      from_consultant_email: user.email,
      from_consultant_name: user.full_name,
      priority: 'normal'
    });

    return Response.json({
      success: true,
      message: 'Notification sent successfully'
    });

  } catch (error) {
    console.error('[sendClientNotificationEmail] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});