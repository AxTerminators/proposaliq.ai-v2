import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Deletes ALL sample data across the entire system.
 * Only callable by super admins.
 * 
 * This removes:
 * - Sample proposals and related data (sections, tasks, comments, etc.)
 * - Sample organizations
 * - Sample teaming partners, key personnel, past performance
 * - Sample clients and all client-related data
 * - Sample resources and discussions
 * - Sample kanban boards
 * 
 * Use with caution - this is a destructive operation!
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CRITICAL: Only super admins can run this
    if (user.admin_role !== 'super_admin') {
      return Response.json({ 
        error: 'Forbidden - Only super admins can delete sample data' 
      }, { status: 403 });
    }

    console.log('[DeleteSampleData] 🗑️ Starting sample data deletion by:', user.email);

    const deletionSummary = {};

    // 1. Delete Sample Proposals and Related Data
    const sampleProposals = await base44.asServiceRole.entities.Proposal.filter({
      is_sample_data: true
    });
    
    for (const proposal of sampleProposals) {
      // Delete proposal sections
      const sections = await base44.asServiceRole.entities.ProposalSection.filter({
        proposal_id: proposal.id
      });
      for (const section of sections) {
        await base44.asServiceRole.entities.ProposalSection.delete(section.id);
      }

      // Delete proposal tasks
      const tasks = await base44.asServiceRole.entities.ProposalTask.filter({
        proposal_id: proposal.id
      });
      for (const task of tasks) {
        await base44.asServiceRole.entities.ProposalTask.delete(task.id);
      }

      // Delete proposal subtasks
      const subtasks = await base44.asServiceRole.entities.ProposalSubtask.filter({
        proposal_id: proposal.id
      });
      for (const subtask of subtasks) {
        await base44.asServiceRole.entities.ProposalSubtask.delete(subtask.id);
      }

      // Delete proposal comments
      const comments = await base44.asServiceRole.entities.ProposalComment.filter({
        proposal_id: proposal.id
      });
      for (const comment of comments) {
        await base44.asServiceRole.entities.ProposalComment.delete(comment.id);
      }

      // Delete proposal annotations
      const annotations = await base44.asServiceRole.entities.ProposalAnnotation.filter({
        proposal_id: proposal.id
      });
      for (const annotation of annotations) {
        await base44.asServiceRole.entities.ProposalAnnotation.delete(annotation.id);
      }

      // Delete the proposal itself
      await base44.asServiceRole.entities.Proposal.delete(proposal.id);
    }
    deletionSummary.proposals = sampleProposals.length;

    // 2. Delete Sample Organizations
    const sampleOrgs = await base44.asServiceRole.entities.Organization.filter({
      is_sample_data: true
    });
    for (const org of sampleOrgs) {
      // Delete associated subscriptions first
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
        organization_id: org.id
      });
      for (const sub of subscriptions) {
        await base44.asServiceRole.entities.Subscription.delete(sub.id);
      }

      await base44.asServiceRole.entities.Organization.delete(org.id);
    }
    deletionSummary.organizations = sampleOrgs.length;

    // 3. Delete Sample Teaming Partners
    const samplePartners = await base44.asServiceRole.entities.TeamingPartner.filter({
      is_sample_data: true
    });
    for (const partner of samplePartners) {
      await base44.asServiceRole.entities.TeamingPartner.delete(partner.id);
    }
    deletionSummary.teaming_partners = samplePartners.length;

    // 4. Delete Sample Key Personnel
    const samplePersonnel = await base44.asServiceRole.entities.KeyPersonnel.filter({
      is_sample_data: true
    });
    for (const person of samplePersonnel) {
      await base44.asServiceRole.entities.KeyPersonnel.delete(person.id);
    }
    deletionSummary.key_personnel = samplePersonnel.length;

    // 5. Delete Sample Past Performance
    const samplePastPerf = await base44.asServiceRole.entities.PastPerformance.filter({
      is_sample_data: true
    });
    for (const project of samplePastPerf) {
      await base44.asServiceRole.entities.PastPerformance.delete(project.id);
    }
    deletionSummary.past_performance = samplePastPerf.length;

    // 6. Delete Sample Resources
    const sampleResources = await base44.asServiceRole.entities.ProposalResource.filter({
      is_sample_data: true
    });
    for (const resource of sampleResources) {
      await base44.asServiceRole.entities.ProposalResource.delete(resource.id);
    }
    deletionSummary.resources = sampleResources.length;

    // 7. Delete Sample Kanban Boards
    const sampleBoards = await base44.asServiceRole.entities.KanbanConfig.filter({
      is_sample_data: true
    });
    for (const board of sampleBoards) {
      await base44.asServiceRole.entities.KanbanConfig.delete(board.id);
    }
    deletionSummary.kanban_boards = sampleBoards.length;

    // 8. Delete Sample Clients
    const sampleClients = await base44.asServiceRole.entities.Client.filter({
      is_sample_data: true
    });
    
    for (const client of sampleClients) {
      // Delete client team members
      const teamMembers = await base44.asServiceRole.entities.ClientTeamMember.filter({
        client_id: client.id
      });
      for (const member of teamMembers) {
        await base44.asServiceRole.entities.ClientTeamMember.delete(member.id);
      }

      // Delete client engagement metrics
      const engagementMetrics = await base44.asServiceRole.entities.ClientEngagementMetric.filter({
        client_id: client.id
      });
      for (const metric of engagementMetrics) {
        await base44.asServiceRole.entities.ClientEngagementMetric.delete(metric.id);
      }

      // Delete client meetings
      const meetings = await base44.asServiceRole.entities.ClientMeeting.filter({
        client_id: client.id
      });
      for (const meeting of meetings) {
        await base44.asServiceRole.entities.ClientMeeting.delete(meeting.id);
      }

      // Delete client uploaded files
      const files = await base44.asServiceRole.entities.ClientUploadedFile.filter({
        client_id: client.id
      });
      for (const file of files) {
        await base44.asServiceRole.entities.ClientUploadedFile.delete(file.id);
      }

      // Delete client notifications
      const notifications = await base44.asServiceRole.entities.ClientNotification.filter({
        client_id: client.id
      });
      for (const notification of notifications) {
        await base44.asServiceRole.entities.ClientNotification.delete(notification.id);
      }

      // Delete the client itself
      await base44.asServiceRole.entities.Client.delete(client.id);
    }
    deletionSummary.clients = sampleClients.length;

    // 9. Delete Sample Discussions
    const sampleDiscussions = await base44.asServiceRole.entities.Discussion.filter({
      is_sample_data: true
    });
    
    for (const discussion of sampleDiscussions) {
      // Delete discussion comments first
      const discussionComments = await base44.asServiceRole.entities.DiscussionComment.filter({
        discussion_id: discussion.id
      });
      for (const comment of discussionComments) {
        await base44.asServiceRole.entities.DiscussionComment.delete(comment.id);
      }

      await base44.asServiceRole.entities.Discussion.delete(discussion.id);
    }
    deletionSummary.discussions = sampleDiscussions.length;

    // 10. Delete Sample Automation Rules
    const sampleRules = await base44.asServiceRole.entities.ProposalAutomationRule.filter({
      is_sample_data: true
    });
    for (const rule of sampleRules) {
      await base44.asServiceRole.entities.ProposalAutomationRule.delete(rule.id);
    }
    deletionSummary.automation_rules = sampleRules.length;

    console.log('[DeleteSampleData] ✅ Sample data deletion complete!', deletionSummary);

    return Response.json({
      success: true,
      message: 'All sample data has been deleted successfully',
      deleted_counts: deletionSummary,
      deleted_by: user.email,
      deleted_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DeleteSampleData] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});