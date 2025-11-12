import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { nanoid } from 'npm:nanoid@5.0.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      proposal_id,
      organization_id,
      recipient_type,
      recipient_organization_id,
      assigned_to_email,
      assigned_to_name,
      teaming_partner_id,
      request_title,
      request_description,
      due_date,
      priority,
      checklist_items,
      created_by_email,
      created_by_name
    } = payload;

    if (!proposal_id || !organization_id || !recipient_type || !assigned_to_email || !request_title) {
      return Response.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Generate secure access token
    const access_token = nanoid(32);
    const token_expires_at = new Date();
    token_expires_at.setDate(token_expires_at.getDate() + 90); // 90 days expiry

    // Generate portal URL
    const baseUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com';
    const portal_url = `${baseUrl}/data-call?token=${access_token}`;

    // Create data call request
    const dataCallRequest = await base44.asServiceRole.entities.DataCallRequest.create({
      proposal_id,
      organization_id,
      recipient_organization_id: recipient_organization_id || null,
      recipient_type,
      assigned_to_email,
      assigned_to_name,
      teaming_partner_id: teaming_partner_id || null,
      request_title,
      request_description: request_description || '',
      checklist_items: checklist_items.map(item => ({
        ...item,
        submitted: false,
        submitted_file_ids: [],
        submitted_date: null,
        submitted_by_email: null
      })),
      due_date: due_date || null,
      priority: priority || 'medium',
      status: 'sent',
      access_token,
      token_expires_at: token_expires_at.toISOString(),
      portal_url,
      sent_date: new Date().toISOString(),
      created_by_email,
      created_by_name,
      completion_percentage: 0,
      reminder_sent_count: 0
    });

    // Send email notification
    const recipientTypeLabel = 
      recipient_type === 'client_organization' ? 'Client' :
      recipient_type === 'internal_team_member' ? 'Team Member' :
      'Teaming Partner';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: assigned_to_email,
      subject: `Data Request: ${request_title}`,
      body: `
        <h2>You have a new data request</h2>
        <p>Hello ${assigned_to_name},</p>
        <p><strong>${created_by_name}</strong> has requested specific documents and data for the proposal: <strong>${request_title}</strong>.</p>
        
        ${request_description ? `<p>${request_description}</p>` : ''}
        
        <p><strong>Due Date:</strong> ${due_date ? new Date(due_date).toLocaleDateString() : 'No deadline set'}</p>
        <p><strong>Priority:</strong> ${priority.toUpperCase()}</p>
        
        <p><a href="${portal_url}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Access Secure Portal</a></p>
        
        <p style="color: #64748b; font-size: 12px;">This link will expire in 90 days. All uploads are secure and encrypted.</p>
      `
    });

    return Response.json({
      success: true,
      data_call_request: dataCallRequest,
      portal_url,
      message: 'Data call request created and email sent'
    });

  } catch (error) {
    console.error('Error creating data call request:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});