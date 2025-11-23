import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Migrate Legacy Client to Organization
 * Migrates a Client entity record to a new client_organization Organization
 * This is for Phase 5 data migration
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { client_id, consulting_firm_id, dry_run = false } = payload;

    if (!client_id || !consulting_firm_id) {
      return Response.json({
        success: false,
        error: 'Missing required fields: client_id, consulting_firm_id'
      }, { status: 400 });
    }

    // Fetch the legacy client
    const clients = await base44.asServiceRole.entities.Client.filter({ id: client_id });
    if (clients.length === 0) {
      return Response.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    const legacyClient = clients[0];

    if (dry_run) {
      return Response.json({
        success: true,
        dry_run: true,
        migration_plan: {
          will_create_organization: true,
          organization_name: legacyClient.client_name,
          contact_email: legacyClient.contact_email,
          will_migrate_proposals: 'Proposals with shared_with_client_ids containing this client',
          will_create_relationship: true,
          will_setup_defaults: 'Master board, folder structure'
        }
      });
    }

    // Step 1: Create client organization
    const clientOrg = await base44.asServiceRole.entities.Organization.create({
      organization_name: legacyClient.client_name,
      contact_name: legacyClient.contact_name || legacyClient.client_name,
      contact_email: legacyClient.contact_email,
      address: legacyClient.address || '',
      organization_type: 'client_organization',
      parent_organization_id: consulting_firm_id,
      custom_branding: legacyClient.custom_branding || {},
      onboarding_completed: false
    });

    // Step 2: Migrate proposals shared with this client
    const sharedProposals = await base44.asServiceRole.entities.Proposal.filter({
      organization_id: consulting_firm_id
    });

    const proposalsToMigrate = sharedProposals.filter(p =>
      p.shared_with_client_ids?.includes(client_id)
    );

    let migratedProposalIds = [];
    
    for (const proposal of proposalsToMigrate) {
      // Create copy in client organization
      const { id: _id, created_date: _cd, updated_date: _ud, created_by: _cb, ...proposalData } = proposal;
      
      const newProposal = await base44.asServiceRole.entities.Proposal.create({
        ...proposalData,
        organization_id: clientOrg.id,
        shared_with_client_ids: [], // Clear since it's now in client's own workspace
        client_view_enabled: false
      });

      migratedProposalIds.push(newProposal.id);

      // Migrate sections
      const sections = await base44.asServiceRole.entities.ProposalSection.filter({
        proposal_id: proposal.id
      });

      for (const section of sections) {
        const { id: _sid, created_date: _scd, updated_date: _sud, created_by: _scb, ...sectionData } = section;
        await base44.asServiceRole.entities.ProposalSection.create({
          ...sectionData,
          proposal_id: newProposal.id
        });
      }
    }

    // Step 3: Create relationship
    await base44.asServiceRole.entities.OrganizationRelationship.create({
      consulting_firm_id,
      consulting_firm_name: (await base44.asServiceRole.entities.Organization.filter({ id: consulting_firm_id }))[0]?.organization_name || 'Firm',
      client_organization_id: clientOrg.id,
      client_organization_name: legacyClient.client_name,
      relationship_status: legacyClient.relationship_status || 'active',
      total_proposals_created: migratedProposalIds.length,
      primary_consultant_email: user.email,
      primary_consultant_name: user.full_name || user.email
    });

    // Step 4: Setup defaults (master board, folders)
    await base44.functions.invoke('createClientOrganization', {
      consulting_firm_id,
      organization_name: clientOrg.organization_name,
      contact_name: clientOrg.contact_name,
      contact_email: clientOrg.contact_email,
      skip_org_creation: true // Organization already created
    });

    return Response.json({
      success: true,
      message: 'Client migrated to organization successfully',
      client_organization_id: clientOrg.id,
      migrated_proposals: migratedProposalIds.length,
      legacy_client_id: client_id
    });

  } catch (error) {
    console.error('[migrateClientToOrganization] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});