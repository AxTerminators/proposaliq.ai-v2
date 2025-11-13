import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data_call_id, notification_type = 'initial', custom_template_id } = await req.json();

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

    // Generate portal URL - FIXED: Use correct page name
    const baseUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com';
    const portalUrl = `${baseUrl}/ClientDataCallPortal?token=${dataCall.access_token}&id=${dataCall.id}`;

    // Try to fetch custom email template
    let emailTemplate = null;
    if (custom_template_id) {
      const templates = await base44.asServiceRole.entities.EmailTemplate.filter({
        id: custom_template_id
      });
      emailTemplate = templates[0] || null;
    }

    let subject, emailBody;

    if (emailTemplate) {
      // Use custom template with placeholder replacement
      const completedCount = dataCall.checklist_items.filter(i => i.status === 'completed').length;
      const totalCount = dataCall.checklist_items.length;
      
      const placeholders = {
        '{{data_call_title}}': dataCall.request_title,
        '{{recipient_name}}': dataCall.assigned_to_name || 'there',
        '{{creator_name}}': dataCall.created_by_name || dataCall.created_by_email,
        '{{organization_name}}': 'ProposalIQ.ai',
        '{{due_date}}': dataCall.due_date ? new Date(dataCall.due_date).toLocaleDateString() : 'Not specified',
        '{{portal_link}}': portalUrl,
        '{{checklist_summary}}': dataCall.checklist_items.map((item, i) => `${i+1}. ${item.item_label}`).join('\\n'),
        '{{completed_count}}': completedCount.toString(),
        '{{total_count}}': totalCount.toString(),
        '{{priority}}': dataCall.priority || 'medium'
      };
      
      subject = emailTemplate.subject;
      emailBody = emailTemplate.body;
      
      Object.entries(placeholders).forEach(([key, value]) => {
        subject = subject.replace(new RegExp(key.replace(/[{}]/g, '\\\\$&'), 'g'), value);
        emailBody = emailBody.replace(new RegExp(key.replace(/[{}]/g, '\\\\$&'), 'g'), value);
      });
      
      // Convert to HTML
      emailBody = `<div style="font-family: Arial, sans-serif; white-space: pre-wrap;">${emailBody}</div>`;
    } else if (notification_type === 'initial') {
      subject = `New Data Call Request: ${dataCall.request_title}`;
      emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">📋 New Data Call Request</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #1f2937; margin-bottom: 20px;">
              Hello ${dataCall.assigned_to_name || 'there'},
            </p>
            
            <p style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">
              ${dataCall.created_by_name || dataCall.created_by_email} has requested specific information from you:
            </p>
            
            <div style="background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 20px; margin-bottom: 25px; border-radius: 4px;">
              <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #1f2937;">
                ${dataCall.request_title}
              </h2>
              ${dataCall.request_description ? `
                <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                  ${dataCall.request_description}
                </p>
              ` : ''}
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #4b5563;">
                <strong>📊 Requirements:</strong> ${dataCall.checklist_items.length} item(s) requested
              </p>
              ${dataCall.due_date ? `
                <p style="margin: 0; font-size: 14px; color: #4b5563;">
                  <strong>📅 Due Date:</strong> ${new Date(dataCall.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                🚀 Access Secure Portal
              </a>
            </div>
            
            <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 13px; color: #065f46;">
                <strong>🔒 Secure Access:</strong> This link is unique to you and will expire in 90 days. All uploads are encrypted and secure.
              </p>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
              <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                Questions? Reply to this email or contact ${dataCall.created_by_name || dataCall.created_by_email}.
              </p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Reminder email (already handled in sendDataCallReminder)
      return Response.json({
        success: false,
        error: 'Use sendDataCallReminder function for reminder emails'
      }, { status: 400 });
    }

    // Send email
    console.log('[sendDataCallNotification] 📧 Sending email to:', dataCall.assigned_to_email);
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: dataCall.assigned_to_email,
      subject,
      body: emailBody,
      from_name: dataCall.created_by_name || 'ProposalIQ.ai'
    });

    console.log('[sendDataCallNotification] ✅ Email sent successfully');

    // Update sent status
    await base44.asServiceRole.entities.DataCallRequest.update(data_call_id, {
      overall_status: 'sent',
      sent_date: new Date().toISOString()
    });

    console.log('[sendDataCallNotification] ✅ Data call status updated to sent');

    return Response.json({
      success: true,
      message: 'Data call notification sent successfully',
      portal_url: portalUrl
    });

  } catch (error) {
    console.error('[sendDataCallNotification] ❌ Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});