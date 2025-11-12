import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Automated Data Call Follow-Up Function
 * Runs periodically (via cron or manual trigger) to:
 * 1. Check for overdue data calls
 * 2. Send automated reminders
 * 3. Escalate critical items
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This is a service function, no user auth required
    // Get all data calls that need follow-up
    const allDataCalls = await base44.asServiceRole.entities.DataCallRequest.filter({
      overall_status: { $in: ['sent', 'in_progress', 'partially_completed'] }
    });

    const now = new Date();
    const results = {
      checked: allDataCalls.length,
      reminders_sent: 0,
      escalations: 0,
      errors: []
    };

    for (const dataCall of allDataCalls) {
      try {
        const dueDate = dataCall.due_date ? new Date(dataCall.due_date) : null;
        const lastReminder = dataCall.last_reminder_sent ? new Date(dataCall.last_reminder_sent) : null;
        const daysSinceLastReminder = lastReminder 
          ? Math.floor((now - lastReminder) / (1000 * 60 * 60 * 24))
          : 999;

        // Rule 1: Send reminder if due in 3 days and no reminder in last 7 days
        if (dueDate) {
          const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDue <= 3 && daysUntilDue > 0 && daysSinceLastReminder >= 7) {
            // Send reminder
            await base44.asServiceRole.functions.invoke('sendDataCallReminder', {
              data_call_id: dataCall.id
            });
            results.reminders_sent++;
          }

          // Rule 2: Mark as overdue if past due date
          if (daysUntilDue < 0 && dataCall.overall_status !== 'overdue') {
            await base44.asServiceRole.entities.DataCallRequest.update(dataCall.id, {
              overall_status: 'overdue'
            });
            results.escalations++;

            // Send escalation email to creator
            if (dataCall.created_by_email) {
              const baseUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com';
              
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: dataCall.created_by_email,
                subject: `⚠️ Overdue Data Call: ${dataCall.request_title}`,
                body: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #dc2626; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
                      <h1 style="color: white; margin: 0;">⚠️ Data Call Overdue</h1>
                    </div>
                    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                      <p style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">
                        The following data call request is now overdue:
                      </p>
                      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;">
                        <h3 style="margin: 0 0 5px 0; color: #1f2937;">${dataCall.request_title}</h3>
                        <p style="margin: 0; font-size: 13px; color: #6b7280;">
                          Assigned to: ${dataCall.assigned_to_name || dataCall.assigned_to_email}
                        </p>
                        <p style="margin: 5px 0 0 0; font-size: 13px; color: #991b1b;">
                          <strong>Due Date:</strong> ${new Date(dataCall.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <p style="font-size: 13px; color: #4b5563;">
                        You may want to follow up directly with the recipient.
                      </p>
                      <div style="text-align: center; margin-top: 20px;">
                        <a href="${baseUrl}/data-calls" 
                           style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px;">
                          View Data Call
                        </a>
                      </div>
                    </div>
                  </div>
                `,
                from_name: 'ProposalIQ.ai Automation'
              });
            }
          }
        }

      } catch (error) {
        console.error(`Error processing data call ${dataCall.id}:`, error);
        results.errors.push({
          data_call_id: dataCall.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in automated follow-up:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});