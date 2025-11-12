import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data_call_id } = await req.json();

    if (!data_call_id) {
      return Response.json({
        success: false,
        error: 'data_call_id is required'
      }, { status: 400 });
    }

    // Fetch the data call request
    const dataCallRequests = await base44.asServiceRole.entities.DataCallRequest.filter({
      id: data_call_id
    });

    if (dataCallRequests.length === 0) {
      return Response.json({
        success: false,
        error: 'Data call request not found'
      }, { status: 404 });
    }

    const dataCall = dataCallRequests[0];

    // Generate portal URL
    const baseUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com';
    const portalUrl = `${baseUrl}/client-data-call?token=${dataCall.access_token}&id=${dataCall.id}`;

    // Prepare email content
    const completedItems = dataCall.checklist_items.filter(item => 
      item.status === 'completed' || item.status === 'not_applicable'
    ).length;
    const totalItems = dataCall.checklist_items.length;
    const remainingItems = totalItems - completedItems;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 Data Call Reminder</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">
            Hello ${dataCall.assigned_to_name || 'there'},
          </p>
          
          <p style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">
            This is a friendly reminder about the following data call request:
          </p>
          
          <div style="background: #f9fafb; border-left: 4px solid #3B82F6; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
            <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #1f2937;">
              ${dataCall.request_title}
            </h2>
            ${dataCall.request_description ? `
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                ${dataCall.request_description}
              </p>
            ` : ''}
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              <strong>⚠️ Status:</strong> ${remainingItems} of ${totalItems} items remaining
            </p>
            ${dataCall.due_date ? `
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
                <strong>📅 Due Date:</strong> ${new Date(dataCall.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${portalUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
              📂 Access Data Call Portal
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              Need help? Contact ${dataCall.created_by_name || dataCall.created_by_email} for assistance.
            </p>
          </div>
        </div>
      </div>
    `;

    // Send email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: dataCall.assigned_to_email,
      subject: `Reminder: ${dataCall.request_title}`,
      body: emailBody,
      from_name: dataCall.created_by_name || 'ProposalIQ.ai'
    });

    // Update reminder count
    await base44.asServiceRole.entities.DataCallRequest.update(data_call_id, {
      reminder_sent_count: (dataCall.reminder_sent_count || 0) + 1,
      last_reminder_sent: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Reminder email sent successfully'
    });

  } catch (error) {
    console.error('Error sending data call reminder:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});