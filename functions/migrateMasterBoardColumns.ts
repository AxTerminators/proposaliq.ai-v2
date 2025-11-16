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

    // Find existing master board
    const existingMasterBoards = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id,
      is_master_board: true
    });

    console.log(`[MigrateMasterBoard] Found ${existingMasterBoards.length} existing master boards`);

    // Delete all existing master boards
    for (const board of existingMasterBoards) {
      console.log(`[MigrateMasterBoard] Deleting master board: ${board.id}`);
      await base44.asServiceRole.entities.KanbanConfig.delete(board.id);
    }

    // Create new master board with correct column structure
    const masterBoardConfig = {
      organization_id,
      board_type: "master",
      board_name: "All Proposals",
      is_master_board: true,
      applies_to_proposal_types: [],
      simplified_workflow: true,
      columns: [
        {
          id: "master_qualifying",
          label: "Qualifying",
          color: "from-slate-400 to-slate-600",
          order: 0,
          type: "master_status",
          status_mapping: ["evaluating"],
          is_locked: true,
          is_terminal: false,
          checklist_items: []
        },
        {
          id: "master_drafting",
          label: "Drafting",
          color: "from-blue-400 to-blue-600",
          order: 1,
          type: "master_status",
          status_mapping: ["draft"],
          is_locked: true,
          is_terminal: false,
          checklist_items: []
        },
        {
          id: "master_reviewing",
          label: "Reviewing",
          color: "from-purple-400 to-purple-600",
          order: 2,
          type: "master_status",
          status_mapping: ["in_progress", "client_review"],
          is_locked: true,
          is_terminal: false,
          checklist_items: []
        },
        {
          id: "master_submitted",
          label: "Submitted",
          color: "from-indigo-400 to-indigo-600",
          order: 3,
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
          order: 4,
          type: "master_status",
          status_mapping: ["won", "client_accepted"],
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        },
        {
          id: "master_lost",
          label: "Lost",
          color: "from-red-400 to-red-600",
          order: 5,
          type: "master_status",
          status_mapping: ["lost", "client_rejected"],
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        },
        {
          id: "master_archived",
          label: "Archived",
          color: "from-gray-400 to-gray-600",
          order: 6,
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

    const newBoard = await base44.asServiceRole.entities.KanbanConfig.create(masterBoardConfig);

    console.log(`[MigrateMasterBoard] Created new master board: ${newBoard.id}`);

    return Response.json({
      success: true,
      message: 'Master board migrated successfully',
      deleted_boards: existingMasterBoards.length,
      new_board_id: newBoard.id,
      performed_by: user.email
    });

  } catch (error) {
    console.error('[MigrateMasterBoard] Error:', error);
    return Response.json({ 
      error: error.message || 'Failed to migrate master board' 
    }, { status: 500 });
  }
});