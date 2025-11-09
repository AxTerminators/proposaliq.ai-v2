import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Ensures master board exists for organization on first load
 * Auto-creates if missing with simplified single-word generic columns
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'organization_id required' }, { status: 400 });
    }

    // Check if master board exists for this organization
    const existingMasterBoards = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id: organization_id,
      is_master_board: true
    });

    // If master board exists, return success
    if (existingMasterBoards.length > 0) {
      return Response.json({
        success: true,
        was_created: false,
        board_id: existingMasterBoards[0].id,
        board_name: existingMasterBoards[0].board_name,
        message: 'Master board already exists'
      });
    }

    // Create new master board with single-word generic columns
    console.log(`[Master Board Setup] Creating master board for org ${organization_id}`);

    const masterBoardConfig = {
      organization_id: organization_id,
      board_type: 'master',
      board_name: 'All Proposals',
      is_master_board: true,
      applies_to_proposal_types: [],
      simplified_workflow: true,
      columns: [
        // Generic workflow columns (single-word, catch-all)
        {
          id: 'lead',
          label: 'Lead',
          color: 'from-slate-400 to-slate-600',
          order: 0,
          type: 'master_status',
          status_mapping: ['evaluating'],
          is_terminal: false,
          is_locked: false
        },
        {
          id: 'plan',
          label: 'Plan',
          color: 'from-cyan-400 to-cyan-600',
          order: 1,
          type: 'master_status',
          status_mapping: ['watch_list'],
          is_terminal: false,
          is_locked: false
        },
        {
          id: 'draft',
          label: 'Draft',
          color: 'from-blue-400 to-blue-600',
          order: 2,
          type: 'master_status',
          status_mapping: ['draft'],
          is_terminal: false,
          is_locked: false
        },
        {
          id: 'review',
          label: 'Review',
          color: 'from-purple-400 to-purple-600',
          order: 3,
          type: 'master_status',
          status_mapping: ['in_progress', 'client_review'],
          is_terminal: false,
          is_locked: false
        },
        {
          id: 'hold',
          label: 'Hold',
          color: 'from-amber-400 to-amber-600',
          order: 4,
          type: 'master_status',
          status_mapping: ['on_hold'],
          is_terminal: false,
          is_locked: false
        },
        // Terminal columns (appear on all boards)
        {
          id: 'submitted',
          label: 'Submitted',
          color: 'from-indigo-500 to-indigo-700',
          order: 5,
          type: 'master_status',
          status_mapping: ['submitted'],
          is_terminal: true,
          is_locked: true
        },
        {
          id: 'won',
          label: 'Won',
          color: 'from-green-500 to-green-700',
          order: 6,
          type: 'master_status',
          status_mapping: ['won', 'client_accepted'],
          is_terminal: true,
          is_locked: true
        },
        {
          id: 'lost',
          label: 'Lost',
          color: 'from-red-500 to-red-700',
          order: 7,
          type: 'master_status',
          status_mapping: ['lost', 'client_rejected'],
          is_terminal: true,
          is_locked: true
        },
        {
          id: 'archived',
          label: 'Archived',
          color: 'from-gray-500 to-gray-700',
          order: 8,
          type: 'master_status',
          status_mapping: ['archived'],
          is_terminal: true,
          is_locked: true
        }
      ],
      collapsed_column_ids: [],
      swimlane_config: {
        enabled: false,
        group_by: 'none',
        custom_field_name: '',
        show_empty_swimlanes: false
      },
      view_settings: {
        default_view: 'kanban',
        show_card_details: ['assignees', 'due_date', 'progress', 'value'],
        compact_mode: false
      }
    };

    const createdBoard = await base44.asServiceRole.entities.KanbanConfig.create(masterBoardConfig);

    console.log(`[Master Board Setup] ✅ Master board created with ID: ${createdBoard.id}`);

    return Response.json({
      success: true,
      was_created: true,
      board_id: createdBoard.id,
      board_name: 'All Proposals',
      message: 'Master board created successfully'
    });

  } catch (error) {
    console.error('[Master Board Setup Error]:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});