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
      // Delete proposals and related data
      const proposals = await base44.asServiceRole.entities.Proposal.filter({
        organization_id: org.id,
        is_sample_data: true
      });

      for (const proposal of proposals) {
        // Delete proposal sections
        const sections = await base44.asServiceRole.entities.ProposalSection.filter({
          proposal_id: proposal.id
        });
        for (const section of sections) {
          await base44.asServiceRole.entities.ProposalSection.delete(section.id);
          deletedCount.sections++;
        }

        // Delete proposal tasks
        const tasks = await base44.asServiceRole.entities.ProposalTask.filter({
          proposal_id: proposal.id
        });
        for (const task of tasks) {
          await base44.asServiceRole.entities.ProposalTask.delete(task.id);
          deletedCount.tasks++;
        }

        // Delete proposal
        await base44.asServiceRole.entities.Proposal.delete(proposal.id);
        deletedCount.proposals++;
      }

      // Delete clients
      const clients = await base44.asServiceRole.entities.Client.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const client of clients) {
        await base44.asServiceRole.entities.Client.delete(client.id);
        deletedCount.clients++;
      }

      // Delete past performance
      const pastPerf = await base44.asServiceRole.entities.PastPerformance.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const perf of pastPerf) {
        await base44.asServiceRole.entities.PastPerformance.delete(perf.id);
        deletedCount.pastPerformance++;
      }

      // Delete teaming partners
      const partners = await base44.asServiceRole.entities.TeamingPartner.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const partner of partners) {
        await base44.asServiceRole.entities.TeamingPartner.delete(partner.id);
        deletedCount.teamingPartners++;
      }

      // Delete key personnel
      const personnel = await base44.asServiceRole.entities.KeyPersonnel.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const person of personnel) {
        await base44.asServiceRole.entities.KeyPersonnel.delete(person.id);
        deletedCount.keyPersonnel++;
      }

      // Delete resources
      const resources = await base44.asServiceRole.entities.ProposalResource.filter({
        organization_id: org.id,
        is_sample_data: true
      });
      for (const resource of resources) {
        await base44.asServiceRole.entities.ProposalResource.delete(resource.id);
        deletedCount.resources++;
      }

      // Delete subscriptions
      const subscriptions = await base44.asServiceRole.entities.Subscription.filter({
        organization_id: org.id
      });
      for (const sub of subscriptions) {
        await base44.asServiceRole.entities.Subscription.delete(sub.id);
        deletedCount.subscriptions++;
      }

      // Finally, delete the organization itself
      await base44.asServiceRole.entities.Organization.delete(org.id);
      deletedCount.organizations++;
    }

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