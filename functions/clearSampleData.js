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
      clients: 0,
      pastPerformance: 0,
      teamingPartners: 0,
      keyPersonnel: 0,
      resources: 0,
      subscriptions: 0
    };

    // Delete all sample data for each sample organization
    for (const org of sampleOrgs) {
      // Delete proposals and related data (ONLY sample data)
      const proposals = await base44.asServiceRole.entities.Proposal.filter({
        organization_id: org.id,
        is_sample_data: true
      });

      for (const proposal of proposals) {
        // Delete proposal sections (ONLY sample data)
        const sections = await base44.asServiceRole.entities.ProposalSection.filter({
          proposal_id: proposal.id,
          is_sample_data: true
        });
        for (const section of sections) {
          await base44.asServiceRole.entities.ProposalSection.delete(section.id);
          deletedCount.sections++;
        }

        // Delete proposal tasks (ONLY sample data)
        const tasks = await base44.asServiceRole.entities.ProposalTask.filter({
          proposal_id: proposal.id,
          is_sample_data: true
        });
        for (const task of tasks) {
          await base44.asServiceRole.entities.ProposalTask.delete(task.id);
          deletedCount.tasks++;
        }

        // Delete proposal
        await base44.asServiceRole.entities.Proposal.delete(proposal.id);
        deletedCount.proposals++;
      }

      // Delete clients (ONLY sample data)
      const clients = await base44.asServiceRole.entities.Client.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const client of clients) {
        await base44.asServiceRole.entities.Client.delete(client.id);
        deletedCount.clients++;
      }

      // Delete past performance (ONLY sample data)
      const pastPerf = await base44.asServiceRole.entities.PastPerformance.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const perf of pastPerf) {
        await base44.asServiceRole.entities.PastPerformance.delete(perf.id);
        deletedCount.pastPerformance++;
      }

      // Delete teaming partners (ONLY sample data)
      const partners = await base44.asServiceRole.entities.TeamingPartner.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const partner of partners) {
        await base44.asServiceRole.entities.TeamingPartner.delete(partner.id);
        deletedCount.teamingPartners++;
      }

      // Delete key personnel (ONLY sample data)
      const personnel = await base44.asServiceRole.entities.KeyPersonnel.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const person of personnel) {
        await base44.asServiceRole.entities.KeyPersonnel.delete(person.id);
        deletedCount.keyPersonnel++;
      }

      // Delete resources (ONLY sample data)
      const resources = await base44.asServiceRole.entities.ProposalResource.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const resource of resources) {
        await base44.asServiceRole.entities.ProposalResource.delete(resource.id);
        deletedCount.resources++;
      }

      // Delete subscriptions (for sample org)
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
        organization_id: org.id
      });
      for (const sub of subscriptions) {
        await base44.asServiceRole.entities.Subscription.delete(sub.id);
        deletedCount.subscriptions++;
      }

      // Finally, delete the sample organization itself
      await base44.asServiceRole.entities.Organization.delete(org.id);
      deletedCount.organizations++;
    }

    // Update user flags to indicate sample data has been cleared
    await base44.asServiceRole.auth.updateUser(user.email, {
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