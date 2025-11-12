import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data_call_request_id } = await req.json();

    if (!data_call_request_id) {
      return Response.json({
        success: false,
        error: 'data_call_request_id is required'
      }, { status: 400 });
    }

    // Get data call request
    const requests = await base44.asServiceRole.entities.DataCallRequest.filter({
      id: data_call_request_id
    });

    if (requests.length === 0) {
      return Response.json({
        success: false,
        error: 'Data call request not found'
      }, { status: 404 });
    }

    const dataCallRequest = requests[0];

    // Send reminder email
    const recipientTypeLabel = 
      dataCallRequest.recipient_type === 'client_organization' ? 'Client' :
      dataCallRequest.recipient_type === 'internal_team_member' ? 'Team Member' :
      'Teaming Partner';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: dataCallRequest.assigned_to_email,
      subject: `Reminder: Data Request - ${dataCallRequest.request_title}`,
      body: `
        <h2>Friendly Reminder</h2>
        <p>Hello ${dataCallRequest.assigned_to_name},</p>
        <p>This is a reminder about the pending data request: <strong>${dataCallRequest.request_title}</strong>.</p>
        
        <p><strong>Progress:</strong> ${dataCallRequest.completion_percentage}% Complete</p>
        ${dataCallRequest.due_date ? `<p><strong>Due Date:</strong> ${new Date(dataCallRequest.due_date).toLocaleDateString()}</p>` : ''}
        
        <p><a href="${dataCallRequest.portal_url}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Access Submission Portal</a></p>
        
        <p>If you have any questions, please reach out to ${user.full_name} at ${user.email}.</p>
        
        <p style="color: #64748b; font-size: 12px;">This is an automated reminder from ProposalIQ.ai</p>
      `
    });

    // Update reminder count
    await base44.asServiceRole.entities.DataCallRequest.update(data_call_request_id, {
      reminder_sent_count: (dataCallRequest.reminder_sent_count || 0) + 1,
      last_reminder_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Reminder sent successfully'
    });

  } catch (error) {
    console.error('Error sending reminder:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});