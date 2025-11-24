import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Check if master board already exists
    const existing = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id,
      is_master_board: true
    });

    if (existing.length > 0) {
      return Response.json({
        success: true,
        message: 'Master board already exists',
        config_id: existing[0].id,
        was_created: false
      });
    }

    // Create master board configuration with 7 columns
    const masterBoardConfig = {
      organization_id,
      board_type: "master",
      board_name: "All Proposals",
      is_master_board: true,
      applies_to_proposal_types: [], // Empty = all types
      simplified_workflow: true,
      columns: [
        {
          id: "master_qualifying",
          label: "Qualifying",
          color: "from-slate-400 to-slate-600",
          order: 0,
          type: "master_status",
          status_mapping: ["qualifying"],
          is_locked: true,
          is_terminal: false,
          checklist_items: []
        },
        {
          id: "master_planning",
          label: "Planning",
          color: "from-cyan-400 to-cyan-600",
          order: 1,
          type: "master_status",
          status_mapping: ["planning"],
          is_locked: true,
          is_terminal: false,
          checklist_items: []
        },
        {
          id: "master_drafting",
          label: "Drafting",
          color: "from-blue-400 to-blue-600",
          order: 2,
          type: "master_status",
          status_mapping: ["drafting"],
          is_locked: true,
          is_terminal: false,
          checklist_items: []
        },
        {
          id: "master_reviewing",
          label: "Reviewing",
          color: "from-purple-400 to-purple-600",
          order: 3,
          type: "master_status",
          status_mapping: ["reviewing"],
          is_locked: true,
          is_terminal: false,
          checklist_items: []
        },
        {
          id: "master_submitted",
          label: "Submitted",
          color: "from-indigo-400 to-indigo-600",
          order: 4,
          type: "master_status",
          status_mapping: ["submitted"],
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        },
        {
          id: "master_won",
          label: "Won",
          color: "from-green-400 to-green-600",
          order: 5,
          type: "master_status",
          status_mapping: ["won"],
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        },
        {
          id: "master_lost",
          label: "Lost",
          color: "from-red-400 to-red-600",
          order: 6,
          type: "master_status",
          status_mapping: ["lost"],
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        },
        {
          id: "master_archived",
          label: "Archived",
          color: "from-gray-400 to-gray-600",
          order: 7,
          type: "master_status",
          status_mapping: ["archived"],
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        }
      ],
      collapsed_column_ids: [],
      swimlane_config: {
        enabled: false,
        group_by: "none",
        show_empty_swimlanes: false
      },
      view_settings: {
        default_view: "kanban",
        show_card_details: ["assignees", "due_date", "progress", "value"],
        compact_mode: false
      }
    };

    const created = await base44.asServiceRole.entities.KanbanConfig.create(masterBoardConfig);

    return Response.json({
      success: true,
      message: 'Master board created successfully',
      config_id: created.id,
      was_created: true
    });

  } catch (error) {
    console.error('Error creating master board:', error);
    return Response.json({ 
      error: error.message || 'Failed to create master board' 
    }, { status: 500 });
  }
});