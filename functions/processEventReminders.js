import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import moment from 'npm:moment@2.30.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Use service role for automated system tasks
    const now = moment();
    const fiveMinutesFromNow = moment().add(5, 'minutes');

    // Find all pending reminders that should be sent in the next 5 minutes
    const pendingReminders = await base44.asServiceRole.entities.EventReminder.filter({
      status: 'pending',
      reminder_time: {
        $gte: now.toISOString(),
        $lte: fiveMinutesFromNow.toISOString()
      }
    });

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const reminder of pendingReminders) {
      results.processed++;

      try {
        // Get the event details based on source type
        let event;
        if (reminder.event_source_type === 'calendar_event') {
          const events = await base44.asServiceRole.entities.CalendarEvent.filter({ id: reminder.event_id });
          event = events[0];
        } else if (reminder.event_source_type === 'proposal_task') {
          const tasks = await base44.asServiceRole.entities.ProposalTask.filter({ id: reminder.event_id });
          event = tasks[0];
        } else if (reminder.event_source_type === 'client_meeting') {
          const meetings = await base44.asServiceRole.entities.ClientMeeting.filter({ id: reminder.event_id });
          event = meetings[0];
        }

        if (!event) {
          await base44.asServiceRole.entities.EventReminder.update(reminder.id, {
            status: 'failed'
          });
          results.failed++;
          continue;
        }

        const eventTitle = event.title || event.meeting_title || 'Event';
        const eventTime = moment(event.start_date || event.scheduled_date).format('MMMM D, YYYY [at] h:mm A');

        // Send in-app notification
        if (reminder.notification_channel === 'in_app' || reminder.notification_channel === 'both') {
          const notification = await base44.asServiceRole.entities.Notification.create({
            user_email: reminder.user_email,
            notification_type: 'deadline_reminder',
            title: `Reminder: ${eventTitle}`,
            message: `Your event "${eventTitle}" is coming up on ${eventTime}`,
            action_url: `/calendar`,
            is_read: false
          });

          await base44.asServiceRole.entities.EventReminder.update(reminder.id, {
            notification_id: notification.id
          });
        }

        // Send email notification
        if (reminder.notification_channel === 'email' || reminder.notification_channel === 'both') {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'ProposalIQ.ai Calendar',
            to: reminder.user_email,
            subject: `Reminder: ${eventTitle}`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">📅 Event Reminder</h2>
                <p>This is a reminder for your upcoming event:</p>
                <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1e293b;">${eventTitle}</h3>
                  <p style="color: #64748b; margin: 10px 0;">
                    <strong>When:</strong> ${eventTime}
                  </p>
                  ${event.location ? `<p style="color: #64748b; margin: 10px 0;"><strong>Where:</strong> ${event.location}</p>` : ''}
                  ${event.meeting_link ? `<p style="color: #64748b; margin: 10px 0;"><strong>Meeting Link:</strong> <a href="${event.meeting_link}">${event.meeting_link}</a></p>` : ''}
                  ${event.description ? `<p style="color: #64748b; margin: 10px 0;">${event.description}</p>` : ''}
                </div>
                <a href="${Deno.env.get('APP_URL') || 'https://app.base44.com'}/calendar" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                  View in Calendar
                </a>
              </div>
            `
          });
        }

        // Mark reminder as sent
        await base44.asServiceRole.entities.EventReminder.update(reminder.id, {
          status: 'sent',
          sent_date: now.toISOString()
        });

        results.sent++;

      } catch (error) {
        console.error(`Error processing reminder ${reminder.id}:`, error);
        await base44.asServiceRole.entities.EventReminder.update(reminder.id, {
          status: 'failed'
        });
        results.failed++;
        results.errors.push({
          reminder_id: reminder.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error processing event reminders:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});