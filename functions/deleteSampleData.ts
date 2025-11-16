import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Deletes sample data for a specific organization OR all sample data (super admin only).
 * 
 * Parameters:
 * - organization_id (optional): Delete sample data for this organization only
 * - If no organization_id: Delete ALL sample data across the system (super admin only)
 * 
 * This removes:
 * - Sample proposals and related data (sections, tasks, comments, etc.)
 * - Sample organizations (only if no org_id specified)
 * - Sample teaming partners, key personnel, past performance
 * - Sample clients and all client-related data
 * - Sample resources and discussions
 * - Sample kanban boards
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body for organization_id
    const body = await req.json();
    const { organization_id } = body;

    // If no organization_id, only super admins can delete ALL sample data
    if (!organization_id && user.admin_role !== 'super_admin') {
      return Response.json({ 
        error: 'Forbidden - Only super admins can delete all sample data. Provide organization_id to delete for specific organization.' 
      }, { status: 403 });
    }

    // If organization_id provided, check user has access to that org
    if (organization_id) {
      const org = await base44.entities.Organization.get(organization_id);
      if (!org) {
        return Response.json({ error: 'Organization not found' }, { status: 404 });
      }
      
      // User must be admin or super admin
      if (user.role !== 'admin' && user.admin_role !== 'super_admin') {
        return Response.json({ 
          error: 'Forbidden - Only admins can delete sample data' 
        }, { status: 403 });
      }
    }

    const scope = organization_id ? `organization ${organization_id}` : 'ALL organizations';
    console.log(`[DeleteSampleData] 🗑️ Starting sample data deletion for ${scope} by:`, user.email);

    const deletionSummary = {};

    // Build filter for queries
    const getFilter = (baseFilter = {}) => {
      const filter = { ...baseFilter, is_sample_data: true };
      if (organization_id) {
        filter.organization_id = organization_id;
      }
      return filter;
    };

    // 1. Delete Sample Proposals and Related Data
    const sampleProposals = await base44.asServiceRole.entities.Proposal.filter(
      getFilter()
    );
    
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

      // Delete activity logs
      const activityLogs = await base44.asServiceRole.entities.ActivityLog.filter({
        proposal_id: proposal.id
      });
      for (const log of activityLogs) {
        await base44.asServiceRole.entities.ActivityLog.delete(log.id);
      }

      // Delete the proposal itself
      await base44.asServiceRole.entities.Proposal.delete(proposal.id);
    }
    deletionSummary.proposals = sampleProposals.length;

    // 2. Delete Sample Organizations (only if no specific org_id)
    if (!organization_id) {
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
    }

    // 3. Delete Sample Teaming Partners
    const samplePartners = await base44.asServiceRole.entities.TeamingPartner.filter(
      getFilter()
    );
    for (const partner of samplePartners) {
      await base44.asServiceRole.entities.TeamingPartner.delete(partner.id);
    }
    deletionSummary.teaming_partners = samplePartners.length;

    // 4. Delete Sample Key Personnel
    const samplePersonnel = await base44.asServiceRole.entities.KeyPersonnel.filter(
      getFilter()
    );
    for (const person of samplePersonnel) {
      await base44.asServiceRole.entities.KeyPersonnel.delete(person.id);
    }
    deletionSummary.key_personnel = samplePersonnel.length;

    // 5. Delete Sample Past Performance
    const samplePastPerf = await base44.asServiceRole.entities.PastPerformance.filter(
      getFilter()
    );
    for (const project of samplePastPerf) {
      await base44.asServiceRole.entities.PastPerformance.delete(project.id);
    }
    deletionSummary.past_performance = samplePastPerf.length;

    // 6. Delete Sample Resources
    const sampleResources = await base44.asServiceRole.entities.ProposalResource.filter(
      getFilter()
    );
    for (const resource of sampleResources) {
      await base44.asServiceRole.entities.ProposalResource.delete(resource.id);
    }
    deletionSummary.resources = sampleResources.length;

    // 7. Delete Sample Kanban Boards
    const sampleBoards = await base44.asServiceRole.entities.KanbanConfig.filter(
      getFilter()
    );
    for (const board of sampleBoards) {
      await base44.asServiceRole.entities.KanbanConfig.delete(board.id);
    }
    deletionSummary.kanban_boards = sampleBoards.length;

    // 8. Delete Sample Clients
    const sampleClients = await base44.asServiceRole.entities.Client.filter(
      getFilter()
    );
    
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
    const sampleDiscussions = await base44.asServiceRole.entities.Discussion.filter(
      getFilter()
    );
    
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
    const sampleRules = await base44.asServiceRole.entities.ProposalAutomationRule.filter(
      getFilter()
    );
    for (const rule of sampleRules) {
      await base44.asServiceRole.entities.ProposalAutomationRule.delete(rule.id);
    }
    deletionSummary.automation_rules = sampleRules.length;

    console.log(`[DeleteSampleData] ✅ Sample data deletion complete for ${scope}!`, deletionSummary);

    return Response.json({
      success: true,
      message: organization_id 
        ? `Sample data deleted for organization ${organization_id}`
        : 'All sample data deleted across all organizations',
      scope: organization_id || 'global',
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