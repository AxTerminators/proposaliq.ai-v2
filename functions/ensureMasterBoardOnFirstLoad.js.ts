import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Ensures master board exists for organization on first load
 * Auto-creates if missing - this runs when user first accesses Pipeline
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

    // Check if ANY board exists for this organization
    const existingBoards = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id: organization_id
    });

    // If no boards exist at all, create the default master board
    if (existingBoards.length === 0) {
      console.log(`[Auto-Setup] No boards found for org ${organization_id}, creating master board`);

      const masterBoardConfig = {
        organization_id: organization_id,
        board_type: 'master',
        board_name: 'All Proposals',
        is_master_board: true,
        applies_to_proposal_types: [],
        simplified_workflow: true,
        columns: [
          {
            id: 'new',
            label: 'New',
            color: 'from-slate-400 to-slate-600',
            order: 0,
            type: 'master_status',
            status_mapping: ['evaluating'],
            is_terminal: false
          },
          {
            id: 'active',
            label: 'Active',
            color: 'from-blue-400 to-blue-600',
            order: 1,
            type: 'master_status',
            status_mapping: ['draft', 'in_progress'],
            is_terminal: false
          },
          {
            id: 'review',
            label: 'Review',
            color: 'from-purple-400 to-purple-600',
            order: 2,
            type: 'master_status',
            status_mapping: ['client_review'],
            is_terminal: false
          },
          {
            id: 'submitted',
            label: 'Submitted',
            color: 'from-indigo-400 to-indigo-600',
            order: 3,
            type: 'master_status',
            status_mapping: ['submitted'],
            is_terminal: true
          },
          {
            id: 'won',
            label: 'Won',
            color: 'from-green-400 to-green-600',
            order: 4,
            type: 'master_status',
            status_mapping: ['won', 'client_accepted'],
            is_terminal: true
          },
          {
            id: 'lost',
            label: 'Lost',
            color: 'from-red-400 to-red-600',
            order: 5,
            type: 'master_status',
            status_mapping: ['lost', 'client_rejected'],
            is_terminal: true
          },
          {
            id: 'archived',
            label: 'Archived',
            color: 'from-gray-400 to-gray-600',
            order: 6,
            type: 'master_status',
            status_mapping: ['archived'],
            is_terminal: true
          }
        ],
        collapsed_column_ids: [],
        swimlane_config: {
          enabled: false,
          group_by: 'none'
        },
        view_settings: {
          default_view: 'kanban',
          show_card_details: ['assignees', 'due_date', 'progress', 'value'],
          compact_mode: false
        }
      };

      const createdBoard = await base44.asServiceRole.entities.KanbanConfig.create(masterBoardConfig);

      return Response.json({
        success: true,
        was_created: true,
        board_id: createdBoard.id,
        board_name: 'All Proposals',
        message: 'Master board created automatically for new organization'
      });
    }

    // Boards exist, no action needed
    return Response.json({
      success: true,
      was_created: false,
      board_count: existingBoards.length,
      message: 'Boards already exist'
    });

  } catch (error) {
    console.error('[Auto-Setup Error]:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});