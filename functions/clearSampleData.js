import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all sample data organizations for this user
    const sampleOrgs = await base44.asServiceRole.entities.Organization.filter({
      created_by: user.email,
      is_sample_data: true
    });

    if (sampleOrgs.length === 0) {
      return Response.json({ 
        message: 'No sample data found to clear',
        success: true
      });
    }

    let deletedCount = {
      organizations: 0,
      proposals: 0,
      sections: 0,
      tasks: 0,
      subtasks: 0,
      clients: 0,
      pastPerformance: 0,
      teamingPartners: 0,
      keyPersonnel: 0,
      resources: 0,
      subscriptions: 0,
      kanbanConfigs: 0,
      automationRules: 0
    };

    // Delete all sample data for each sample organization
    for (const org of sampleOrgs) {
      // Delete proposals and related data (only where is_sample_data = true)
      const proposals = await base44.asServiceRole.entities.Proposal.filter({
        organization_id: org.id,
        is_sample_data: true
      });

      for (const proposal of proposals) {
        // Delete proposal sections (filter by is_sample_data)
        const sections = await base44.asServiceRole.entities.ProposalSection.filter({
          proposal_id: proposal.id,
          is_sample_data: true
        });
        for (const section of sections) {
          await base44.asServiceRole.entities.ProposalSection.delete(section.id);
          deletedCount.sections++;
        }

        // Delete proposal tasks (filter by is_sample_data)
        const tasks = await base44.asServiceRole.entities.ProposalTask.filter({
          proposal_id: proposal.id,
          is_sample_data: true
        });
        for (const task of tasks) {
          await base44.asServiceRole.entities.ProposalTask.delete(task.id);
          deletedCount.tasks++;
        }

        // Delete proposal subtasks (filter by is_sample_data)
        const subtasks = await base44.asServiceRole.entities.ProposalSubtask.filter({
          proposal_id: proposal.id,
          is_sample_data: true
        });
        for (const subtask of subtasks) {
          await base44.asServiceRole.entities.ProposalSubtask.delete(subtask.id);
          deletedCount.subtasks++;
        }

        // Delete proposal (is_sample_data = true)
        await base44.asServiceRole.entities.Proposal.delete(proposal.id);
        deletedCount.proposals++;
      }

      // Delete clients (only sample data)
      const clients = await base44.asServiceRole.entities.Client.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const client of clients) {
        await base44.asServiceRole.entities.Client.delete(client.id);
        deletedCount.clients++;
      }

      // Delete past performance (PastPerformance doesn't have is_sample_data field, so skip if org is sample)
      // Only delete if the organization itself is sample data
      const pastPerf = await base44.asServiceRole.entities.PastPerformance.filter({
        organization_id: org.id
      });
      for (const perf of pastPerf) {
        await base44.asServiceRole.entities.PastPerformance.delete(perf.id);
        deletedCount.pastPerformance++;
      }

      // Delete teaming partners (TeamingPartner doesn't have is_sample_data field)
      const partners = await base44.asServiceRole.entities.TeamingPartner.filter({
        organization_id: org.id
      });
      for (const partner of partners) {
        await base44.asServiceRole.entities.TeamingPartner.delete(partner.id);
        deletedCount.teamingPartners++;
      }

      // Delete key personnel (KeyPersonnel doesn't have is_sample_data field)
      const personnel = await base44.asServiceRole.entities.KeyPersonnel.filter({
        organization_id: org.id
      });
      for (const person of personnel) {
        await base44.asServiceRole.entities.KeyPersonnel.delete(person.id);
        deletedCount.keyPersonnel++;
      }

      // Delete resources (filter by is_sample_data)
      const resources = await base44.asServiceRole.entities.ProposalResource.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const resource of resources) {
        await base44.asServiceRole.entities.ProposalResource.delete(resource.id);
        deletedCount.resources++;
      }

      // Delete kanban configs (filter by is_sample_data)
      const kanbanConfigs = await base44.asServiceRole.entities.KanbanConfig.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const config of kanbanConfigs) {
        await base44.asServiceRole.entities.KanbanConfig.delete(config.id);
        deletedCount.kanbanConfigs++;
      }

      // Delete automation rules (filter by is_sample_data)
      const automationRules = await base44.asServiceRole.entities.ProposalAutomationRule.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const rule of automationRules) {
        await base44.asServiceRole.entities.ProposalAutomationRule.delete(rule.id);
        deletedCount.automationRules++;
      }

      // Delete subscriptions (Subscription doesn't have is_sample_data field)
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
        organization_id: org.id
      });
      for (const sub of subscriptions) {
        await base44.asServiceRole.entities.Subscription.delete(sub.id);
        deletedCount.subscriptions++;
      }

      // Finally, delete the organization itself (is_sample_data = true)
      await base44.asServiceRole.entities.Organization.delete(org.id);
      deletedCount.organizations++;
    }

    // Update user to reflect that sample data has been cleared
    await base44.auth.updateMe({
      using_sample_data: false,
      sample_data_cleared: true
    });

    return Response.json({ 
      success: true,
      message: 'Sample data cleared successfully',
      deletedCount
    });

  } catch (error) {
    console.error('Error clearing sample data:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});