import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Create Client Organization
 * Creates a new client_organization with default setup including:
 * - Organization record with parent_organization_id
 * - OrganizationRelationship record
 * - Default KanbanConfig (master board)
 * - Default folder structure
 * - Initial user access for consultant
 */
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
      organization_name,
      contact_name,
      contact_email,
      address,
      website_url,
      uei,
      cage_code,
      custom_branding,
      primary_consultant_email,
      consultant_role = 'organization_owner'
    } = payload;

    if (!consulting_firm_id || !organization_name || !contact_email) {
      return Response.json({
        success: false,
        error: 'Missing required fields: consulting_firm_id, organization_name, contact_email'
      }, { status: 400 });
    }

    // Step 1: Create the client organization
    const clientOrg = await base44.asServiceRole.entities.Organization.create({
      organization_name,
      contact_name: contact_name || organization_name,
      contact_email,
      address: address || '',
      website_url: website_url || '',
      uei: uei || '',
      cage_code: cage_code || '',
      organization_type: 'client_organization',
      parent_organization_id: consulting_firm_id,
      custom_branding: custom_branding || {
        logo_url: '',
        primary_color: '#3B82F6',
        welcome_message: `Welcome to your secure workspace with ${organization_name}!`
      },
      onboarding_completed: false,
      is_sample_data: false
    });

    // Step 2: Create organization relationship
    const consultingFirmOrgs = await base44.asServiceRole.entities.Organization.filter({
      id: consulting_firm_id
    });

    const consultingFirm = consultingFirmOrgs.length > 0 ? consultingFirmOrgs[0] : null;

    await base44.asServiceRole.entities.OrganizationRelationship.create({
      consulting_firm_id,
      consulting_firm_name: consultingFirm?.organization_name || 'Consulting Firm',
      client_organization_id: clientOrg.id,
      client_organization_name: organization_name,
      relationship_status: 'active',
      start_date: new Date().toISOString().split('T')[0],
      primary_consultant_email: primary_consultant_email || user.email,
      primary_consultant_name: user.full_name || primary_consultant_email || user.email,
      assigned_consultants: [{
        email: primary_consultant_email || user.email,
        name: user.full_name || primary_consultant_email || user.email,
        role: 'primary'
      }],
      total_proposals_created: 0,
      total_proposals_won: 0,
      engagement_notes: 'Client workspace created'
    });

    // Step 3: Grant consultant access to client workspace
    const consultantEmail = primary_consultant_email || user.email;
    const consultantUsers = await base44.asServiceRole.entities.User.filter({
      email: consultantEmail
    });

    if (consultantUsers.length > 0) {
      const consultant = consultantUsers[0];
      const currentAccesses = consultant.client_accesses || [];
      
      // Only add if not already present
      if (!currentAccesses.some(acc => acc.organization_id === clientOrg.id)) {
        await base44.asServiceRole.entities.User.update(consultant.id, {
          client_accesses: [
            ...currentAccesses,
            {
              organization_id: clientOrg.id,
              organization_name,
              organization_type: 'client_organization',
              role: consultant_role,
              added_date: new Date().toISOString(),
              added_by: user.email,
              is_favorite: false
            }
          ]
        });
      }
    }

    // Step 4: Create default master board for client organization
    const masterBoard = await base44.asServiceRole.entities.KanbanConfig.create({
      organization_id: clientOrg.id,
      board_type: 'master',
      board_name: 'All Proposals',
      is_master_board: true,
      applies_to_proposal_types: [],
      simplified_workflow: true,
      columns: [
        {
          id: 'lead',
          label: 'Lead',
          color: 'from-slate-400 to-slate-600',
          order: 0,
          type: 'master_status',
          status_mapping: ['evaluating', 'watch_list'],
          is_locked: false,
          is_terminal: false
        },
        {
          id: 'plan',
          label: 'Planning',
          color: 'from-blue-400 to-blue-600',
          order: 1,
          type: 'master_status',
          status_mapping: ['draft'],
          is_locked: false,
          is_terminal: false
        },
        {
          id: 'draft',
          label: 'Drafting',
          color: 'from-purple-400 to-purple-600',
          order: 2,
          type: 'master_status',
          status_mapping: ['in_progress'],
          is_locked: false,
          is_terminal: false
        },
        {
          id: 'review',
          label: 'Review',
          color: 'from-amber-400 to-amber-600',
          order: 3,
          type: 'master_status',
          status_mapping: ['client_review'],
          is_locked: false,
          is_terminal: false
        },
        {
          id: 'hold',
          label: 'Hold',
          color: 'from-orange-400 to-orange-600',
          order: 4,
          type: 'master_status',
          status_mapping: ['on_hold'],
          is_locked: false,
          is_terminal: false
        },
        {
          id: 'submitted',
          label: 'Submitted',
          color: 'from-indigo-400 to-indigo-600',
          order: 5,
          type: 'master_status',
          status_mapping: ['submitted'],
          is_locked: true,
          is_terminal: true
        },
        {
          id: 'won',
          label: 'Won',
          color: 'from-green-400 to-green-600',
          order: 6,
          type: 'master_status',
          status_mapping: ['won', 'client_accepted'],
          is_locked: true,
          is_terminal: true
        },
        {
          id: 'lost',
          label: 'Lost',
          color: 'from-red-400 to-red-600',
          order: 7,
          type: 'master_status',
          status_mapping: ['lost', 'client_rejected'],
          is_locked: true,
          is_terminal: true
        },
        {
          id: 'archived',
          label: 'Archived',
          color: 'from-slate-400 to-slate-600',
          order: 8,
          type: 'master_status',
          status_mapping: ['archived'],
          is_locked: true,
          is_terminal: true
        }
      ]
    });

    // Step 5: Create default folder structure
    const rootFolder = await base44.asServiceRole.entities.Folder.create({
      organization_id: clientOrg.id,
      folder_name: 'Root',
      purpose: 'content_library',
      is_system_folder: true,
      sort_order: 0
    });

    const defaultFolders = [
      { name: 'Past Performance', purpose: 'content_library', icon: '🏆' },
      { name: 'Templates', purpose: 'content_library', icon: '📋' },
      { name: 'Key Personnel', purpose: 'content_library', icon: '👥' },
      { name: 'Teaming Partners', purpose: 'content_library', icon: '🤝' },
      { name: 'Boilerplate Content', purpose: 'content_library', icon: '📄' }
    ];

    for (const folder of defaultFolders) {
      await base44.asServiceRole.entities.Folder.create({
        organization_id: clientOrg.id,
        folder_name: folder.name,
        parent_folder_id: rootFolder.id,
        purpose: folder.purpose,
        icon: folder.icon,
        is_system_folder: true
      });
    }

    return Response.json({
      success: true,
      message: 'Client organization created successfully',
      organization: clientOrg,
      master_board_id: masterBoard.id,
      setup_complete: true
    });

  } catch (error) {
    console.error('[createClientOrganization] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});