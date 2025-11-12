import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      consulting_firm_id,
      organization_data,
      primary_stakeholder,
      project_history = [],
      initial_resources = []
    } = payload;

    if (!consulting_firm_id || !organization_data?.organization_name || !organization_data?.contact_email) {
      return Response.json({
        success: false,
        error: 'Missing required fields: consulting_firm_id, organization_name, contact_email'
      }, { status: 400 });
    }

    // Step 1: Create the client organization
    const newOrganization = await base44.asServiceRole.entities.Organization.create({
      ...organization_data,
      organization_type: 'client_organization',
      parent_organization_id: consulting_firm_id,
      onboarding_completed: true,
      is_archived: false
    });

    // Step 2: Create the organization relationship
    const relationship = await base44.asServiceRole.entities.OrganizationRelationship.create({
      consulting_firm_id,
      client_organization_id: newOrganization.id,
      consulting_firm_name: organization_data._consulting_firm_name || '',
      client_organization_name: newOrganization.organization_name,
      relationship_status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      primary_consultant_email: user.email,
      primary_consultant_name: user.full_name,
      assigned_consultants: [{
        email: user.email,
        name: user.full_name,
        role: 'Primary Consultant'
      }],
      total_proposals_created: 0,
      total_proposals_won: 0,
      engagement_notes: 'Client onboarded via comprehensive wizard'
    });

    // Step 3: Create primary stakeholder as ClientTeamMember
    if (primary_stakeholder && primary_stakeholder.member_name && primary_stakeholder.member_email) {
      await base44.asServiceRole.entities.ClientTeamMember.create({
        organization_id: newOrganization.id,
        ...primary_stakeholder,
        team_role: primary_stakeholder.team_role || 'owner',
        invitation_status: 'accepted',
        invited_by: user.email,
        is_active: true
      });
    }

    // Step 4: Create project history records
    for (const project of project_history) {
      if (project.project_name) {
        await base44.asServiceRole.entities.ClientProjectHistory.create({
          consulting_firm_id,
          client_organization_id: newOrganization.id,
          consultant_poc_email: user.email,
          consultant_poc_name: user.full_name,
          ...project
        });
      }
    }

    // Step 5: Create default Master Board (KanbanConfig)
    const masterBoardResponse = await base44.asServiceRole.functions.invoke('createMasterBoardConfig', {
      organization_id: newOrganization.id
    });

    // Step 6: Create default Content Library folders
    const foldersResponse = await base44.asServiceRole.functions.invoke('createDefaultContentLibraryFolders', {
      organization_id: newOrganization.id
    });

    // Step 7: Share initial resources if provided
    if (initial_resources.length > 0) {
      for (const resource of initial_resources) {
        await base44.asServiceRole.functions.invoke('pushResourceToClient', {
          source_organization_id: consulting_firm_id,
          target_organization_id: newOrganization.id,
          resource_type: resource.resource_type,
          resource_id: resource.resource_id,
          shared_by_email: user.email,
          shared_by_name: user.full_name,
          share_type: 'copy'
        });
      }
    }

    // Step 8: Grant user access to the new client organization
    const currentUser = await base44.asServiceRole.entities.User.filter({ email: user.email });
    if (currentUser.length > 0) {
      const userData = currentUser[0];
      const clientAccesses = userData.client_accesses || [];
      
      clientAccesses.push({
        organization_id: newOrganization.id,
        organization_name: newOrganization.organization_name,
        role: 'organization_owner',
        added_date: new Date().toISOString()
      });

      await base44.asServiceRole.entities.User.update(userData.id, {
        client_accesses: clientAccesses
      });
    }

    return Response.json({
      success: true,
      organization: newOrganization,
      relationship,
      message: `Client organization "${newOrganization.organization_name}" created successfully with complete workspace setup`
    });

  } catch (error) {
    console.error('Error onboarding client organization:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});