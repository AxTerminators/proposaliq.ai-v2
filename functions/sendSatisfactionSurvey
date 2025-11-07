import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // This function should be called when a proposal status changes to client_accepted or won
    const { proposalId } = await req.json();

    if (!proposalId) {
      return Response.json({ error: 'Missing proposalId' }, { status: 400 });
    }

    // Get proposal
    const proposals = await base44.asServiceRole.entities.Proposal.filter({ id: proposalId });
    if (proposals.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const proposal = proposals[0];

    // Check if survey already sent
    if (proposal.satisfaction_survey_sent) {
      return Response.json({ 
        message: 'Survey already sent for this proposal',
        already_sent: true 
      });
    }

    // Get clients this proposal is shared with
    if (!proposal.shared_with_client_ids || proposal.shared_with_client_ids.length === 0) {
      return Response.json({ 
        message: 'No clients to send survey to',
        clients_sent: 0 
      });
    }

    let emailsSent = 0;

    for (const clientId of proposal.shared_with_client_ids) {
      try {
        const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
        if (clients.length === 0) continue;

        const client = clients[0];

        // Generate survey URL
        const surveyUrl = `https://app.proposaliq.ai/ClientSatisfactionSurvey?token=${client.access_token}&proposal=${proposalId}`;

        // Send email
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: "ProposalIQ.ai",
          to: client.contact_email,
          subject: `How was your experience with ${proposal.proposal_name}?`,
          body: `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 28px;">We'd Love Your Feedback!</h1>
    </div>
    
    <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="font-size: 16px; margin-bottom: 20px;">Hi ${client.contact_name},</p>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Thank you for working with us on <strong>${proposal.proposal_name}</strong>!
      </p>
      
      <p style="font-size: 16px; margin-bottom: 30px;">
        We'd love to hear about your experience. Your feedback helps us improve our services and better serve you in the future.
      </p>
      
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%); padding: 25px; border-radius: 10px; margin: 30px 0; text-align: center;">
        <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: bold; color: #1e40af;">
          📊 Take Our Quick 2-Minute Survey
        </p>
        <a href="${surveyUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
          Share Your Feedback →
        </a>
      </div>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #92400e;">
          <strong>⏱️ Quick & Easy:</strong> Just 2 questions plus optional comments. Takes less than 2 minutes!
        </p>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        Your insights are invaluable to us. Thank you for being a valued client!
      </p>
      
      <p style="font-size: 14px; color: #6b7280; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        Best regards,<br>
        <strong>The ProposalIQ.ai Team</strong>
      </p>
      
      <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
        If the button doesn't work, copy and paste this link:<br>
        ${surveyUrl}
      </p>
    </div>
  </div>
</body>
</html>
          `
        });

        emailsSent++;
      } catch (error) {
        console.error(`Error sending survey to client ${clientId}:`, error);
      }
    }

    // Update proposal to mark survey as sent
    await base44.asServiceRole.entities.Proposal.update(proposalId, {
      satisfaction_survey_sent: true,
      satisfaction_survey_sent_date: new Date().toISOString()
    });

    return Response.json({ 
      success: true,
      clients_sent: emailsSent,
      message: `Satisfaction survey sent to ${emailsSent} client(s)`
    });

  } catch (error) {
    console.error('Error sending satisfaction survey:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});