import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const {
      data_call_request_id,
      submitter_notes,
      token
    } = await req.json();

    if (!data_call_request_id || !token) {
      return Response.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Verify token
    const requests = await base44.asServiceRole.entities.DataCallRequest.filter({
      id: data_call_request_id,
      access_token: token
    });

    if (requests.length === 0) {
      return Response.json({
        success: false,
        error: 'Invalid access token'
      }, { status: 403 });
    }

    const dataCallRequest = requests[0];

    // Update status to submitted
    await base44.asServiceRole.entities.DataCallRequest.update(data_call_request_id, {
      status: 'submitted',
      submitted_date: new Date().toISOString(),
      internal_notes: submitter_notes || ''
    });

    // Send notification email to consultant
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: dataCallRequest.created_by_email,
      subject: `Data Call Completed: ${dataCallRequest.request_title}`,
      body: `
        <h2>Data Call Submission Received</h2>
        <p>Hello ${dataCallRequest.created_by_name},</p>
        <p><strong>${dataCallRequest.assigned_to_name}</strong> has completed the data call request: <strong>${dataCallRequest.request_title}</strong>.</p>
        
        <p><strong>Completion:</strong> ${dataCallRequest.completion_percentage}%</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        
        ${submitter_notes ? `<p><strong>Submitter Notes:</strong><br/>${submitter_notes}</p>` : ''}
        
        <p>Please review the submitted documents in your proposal workspace.</p>
      `
    });

    // Create notification
    await base44.asServiceRole.entities.Notification.create({
      user_email: dataCallRequest.created_by_email,
      notification_type: 'approval_request',
      title: 'Data Call Completed',
      message: `${dataCallRequest.assigned_to_name} submitted data for: ${dataCallRequest.request_title}`,
      related_proposal_id: dataCallRequest.proposal_id,
      related_entity_id: dataCallRequest.id,
      related_entity_type: 'data_call',
      is_read: false,
      from_user_email: dataCallRequest.assigned_to_email,
      from_user_name: dataCallRequest.assigned_to_name
    });

    return Response.json({
      success: true,
      message: 'Data call submission completed successfully'
    });

  } catch (error) {
    console.error('Error completing data call submission:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});