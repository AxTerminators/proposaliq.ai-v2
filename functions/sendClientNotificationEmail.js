import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      clientEmail, 
      clientName,
      notificationType, 
      proposalName, 
      consultantName,
      organizationName,
      actionUrl,
      additionalContext 
    } = await req.json();

    // Email templates based on notification type
    const templates = {
      proposal_shared: {
        subject: `New Proposal Shared: ${proposalName}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Proposal Available</h2>
            <p>Hello ${clientName},</p>
            <p>${consultantName} from ${organizationName} has shared a new proposal with you:</p>
            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">${proposalName}</h3>
              ${additionalContext ? `<p>${additionalContext}</p>` : ''}
            </div>
            <a href="${actionUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Proposal</a>
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link:<br>
              ${actionUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #64748b; font-size: 12px;">
              You're receiving this email because ${organizationName} is managing your proposals through ProposalIQ.ai
            </p>
          </div>
        `
      },
      
      status_change: {
        subject: `Proposal Update: ${proposalName}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Proposal Status Updated</h2>
            <p>Hello ${clientName},</p>
            <p>There's an update on your proposal: <strong>${proposalName}</strong></p>
            ${additionalContext ? `
              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;">${additionalContext}</p>
              </div>
            ` : ''}
            <a href="${actionUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Details</a>
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link:<br>
              ${actionUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #64748b; font-size: 12px;">
              Sent by ${organizationName} via ProposalIQ.ai
            </p>
          </div>
        `
      },
      
      awaiting_review: {
        subject: `Action Required: Review ${proposalName}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">Your Review is Requested</h2>
            <p>Hello ${clientName},</p>
            <p>${consultantName} is requesting your review and feedback on:</p>
            <div style="background-color: #faf5ff; padding: 20px; border-left: 4px solid #7c3aed; border-radius: 4px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1e293b;">${proposalName}</h3>
              ${additionalContext ? `<p>${additionalContext}</p>` : ''}
            </div>
            <a href="${actionUrl}" style="display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Review Now</a>
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link:<br>
              ${actionUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #64748b; font-size: 12px;">
              Sent by ${organizationName} via ProposalIQ.ai
            </p>
          </div>
        `
      },
      
      consultant_reply: {
        subject: `${consultantName} responded to your feedback`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Response to Your Feedback</h2>
            <p>Hello ${clientName},</p>
            <p>${consultantName} has responded to your feedback on <strong>${proposalName}</strong></p>
            ${additionalContext ? `
              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-style: italic;">"${additionalContext}"</p>
              </div>
            ` : ''}
            <a href="${actionUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Response</a>
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link:<br>
              ${actionUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #64748b; font-size: 12px;">
              Sent by ${organizationName} via ProposalIQ.ai
            </p>
          </div>
        `
      },
      
      document_uploaded: {
        subject: `New Document: ${proposalName}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">New Document Shared</h2>
            <p>Hello ${clientName},</p>
            <p>${consultantName} has shared a new document with you for <strong>${proposalName}</strong></p>
            ${additionalContext ? `
              <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;">📄 <strong>${additionalContext}</strong></p>
              </div>
            ` : ''}
            <a href="${actionUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">View Document</a>
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link:<br>
              ${actionUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #64748b; font-size: 12px;">
              Sent by ${organizationName} via ProposalIQ.ai
            </p>
          </div>
        `
      },

      deadline_reminder: {
        subject: `⚠️ Deadline Approaching: ${proposalName}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">⏰ Deadline Reminder</h2>
            <p>Hello ${clientName},</p>
            <p>This is a friendly reminder that the deadline for <strong>${proposalName}</strong> is approaching.</p>
            ${additionalContext ? `
              <div style="background-color: #fffbeb; padding: 20px; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold; color: #92400e;">${additionalContext}</p>
              </div>
            ` : ''}
            <a href="${actionUrl}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Review Proposal</a>
            <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
              If the button doesn't work, copy and paste this link:<br>
              ${actionUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
            <p style="color: #64748b; font-size: 12px;">
              Sent by ${organizationName} via ProposalIQ.ai
            </p>
          </div>
        `
      }
    };

    const template = templates[notificationType] || templates.status_change;

    // Send email using Base44 integration
    await base44.integrations.Core.SendEmail({
      from_name: organizationName || 'ProposalIQ.ai',
      to: clientEmail,
      subject: template.subject,
      body: template.body
    });

    return Response.json({ 
      success: true, 
      message: 'Email notification sent successfully' 
    });

  } catch (error) {
    console.error('Error sending client notification email:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});