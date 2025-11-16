import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Deletes sample data for a specific organization OR all sample data (super admin only).
 * 
 * Parameters:
 * - organization_id (optional): Delete sample data for this organization only
 * - If no organization_id: Delete ALL sample data across the system (super admin only)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body for organization_id
    let organization_id = null;
    try {
      const body = await req.json();
      organization_id = body.organization_id;
    } catch (e) {
      // No body or invalid JSON, organization_id stays null
    }

    // If no organization_id, only super admins can delete ALL sample data
    if (!organization_id && user.admin_role !== 'super_admin') {
      return Response.json({ 
        error: 'Forbidden - Only super admins can delete all sample data. Provide organization_id to delete for specific organization.' 
      }, { status: 403 });
    }

    // If organization_id provided, check user has access to that org
    if (organization_id) {
      try {
        const orgs = await base44.entities.Organization.filter({ id: organization_id });
        if (orgs.length === 0) {
          return Response.json({ error: 'Organization not found' }, { status: 404 });
        }
      } catch (error) {
        return Response.json({ error: 'Organization not found' }, { status: 404 });
      }
      
      // User must be admin or super admin
      if (user.role !== 'admin' && user.role !== 'manager' && user.admin_role !== 'super_admin') {
        return Response.json({ 
          error: 'Forbidden - Only admins or managers can delete sample data' 
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
      try {
        const sections = await base44.asServiceRole.entities.ProposalSection.filter({
          proposal_id: proposal.id
        });
        for (const section of sections) {
          await base44.asServiceRole.entities.ProposalSection.delete(section.id);
        }
      } catch (e) {
        console.log('Error deleting sections:', e.message);
      }

      // Delete proposal tasks
      try {
        const tasks = await base44.asServiceRole.entities.ProposalTask.filter({
          proposal_id: proposal.id
        });
        for (const task of tasks) {
          await base44.asServiceRole.entities.ProposalTask.delete(task.id);
        }
      } catch (e) {
        console.log('Error deleting tasks:', e.message);
      }

      // Delete proposal subtasks
      try {
        const subtasks = await base44.asServiceRole.entities.ProposalSubtask.filter({
          proposal_id: proposal.id
        });
        for (const subtask of subtasks) {
          await base44.asServiceRole.entities.ProposalSubtask.delete(subtask.id);
        }
      } catch (e) {
        console.log('Error deleting subtasks:', e.message);
      }

      // Delete proposal comments
      try {
        const comments = await base44.asServiceRole.entities.ProposalComment.filter({
          proposal_id: proposal.id
        });
        for (const comment of comments) {
          await base44.asServiceRole.entities.ProposalComment.delete(comment.id);
        }
      } catch (e) {
        console.log('Error deleting comments:', e.message);
      }

      // Delete proposal annotations
      try {
        const annotations = await base44.asServiceRole.entities.ProposalAnnotation.filter({
          proposal_id: proposal.id
        });
        for (const annotation of annotations) {
          await base44.asServiceRole.entities.ProposalAnnotation.delete(annotation.id);
        }
      } catch (e) {
        console.log('Error deleting annotations:', e.message);
      }

      // Delete activity logs
      try {
        const activityLogs = await base44.asServiceRole.entities.ActivityLog.filter({
          proposal_id: proposal.id
        });
        for (const log of activityLogs) {
          await base44.asServiceRole.entities.ActivityLog.delete(log.id);
        }
      } catch (e) {
        console.log('Error deleting activity logs:', e.message);
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
        try {
          const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
            organization_id: org.id
          });
          for (const sub of subscriptions) {
            await base44.asServiceRole.entities.Subscription.delete(sub.id);
          }
        } catch (e) {
          console.log('Error deleting subscriptions:', e.message);
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

    // 8. Delete Sample Discussions
    const sampleDiscussions = await base44.asServiceRole.entities.Discussion.filter(
      getFilter()
    );
    
    for (const discussion of sampleDiscussions) {
      // Delete discussion comments first
      try {
        const discussionComments = await base44.asServiceRole.entities.DiscussionComment.filter({
          discussion_id: discussion.id
        });
        for (const comment of discussionComments) {
          await base44.asServiceRole.entities.DiscussionComment.delete(comment.id);
        }
      } catch (e) {
        console.log('Error deleting discussion comments:', e.message);
      }

      await base44.asServiceRole.entities.Discussion.delete(discussion.id);
    }
    deletionSummary.discussions = sampleDiscussions.length;

    // 9. Delete Sample Automation Rules
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