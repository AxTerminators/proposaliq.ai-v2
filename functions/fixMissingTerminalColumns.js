import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Fixes boards missing terminal columns (Won, Lost, Archived)
 * Run this to update boards created before terminal columns were added
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

    // Get all boards for this organization
    const boards = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id: organization_id
    });

    const updatedBoards = [];

    for (const board of boards) {
      const columns = board.columns || [];
      
      // Check if terminal columns exist
      const hasSubmitted = columns.some(c => c.id === 'submitted');
      const hasWon = columns.some(c => c.id === 'won');
      const hasLost = columns.some(c => c.id === 'lost');
      const hasArchived = columns.some(c => c.id === 'archived');

      if (hasSubmitted && hasWon && hasLost && hasArchived) {
        console.log(`[Fix] Board ${board.board_name} already has all terminal columns`);
        continue; // Skip - already has all terminals
      }

      console.log(`[Fix] Adding missing terminal columns to ${board.board_name}`);

      // Remove any existing partial terminal columns
      const nonTerminalColumns = columns.filter(c => 
        !['submitted', 'won', 'lost', 'archived'].includes(c.id)
      );

      // Define terminal columns
      const terminalColumns = [
        {
          id: 'submitted',
          label: 'Submitted',
          color: 'from-indigo-500 to-purple-600',
          type: board.is_master_board ? 'master_status' : 'default_status',
          default_status_mapping: 'submitted',
          status_mapping: board.is_master_board ? ['submitted'] : undefined,
          is_terminal: true,
          is_locked: true,
          order: nonTerminalColumns.length,
          checklist_items: []
        },
        {
          id: 'won',
          label: 'Won',
          color: 'from-green-400 to-green-600',
          type: board.is_master_board ? 'master_status' : 'default_status',
          default_status_mapping: 'won',
          status_mapping: board.is_master_board ? ['won', 'client_accepted'] : undefined,
          is_terminal: true,
          is_locked: true,
          order: nonTerminalColumns.length + 1,
          checklist_items: []
        },
        {
          id: 'lost',
          label: 'Lost',
          color: 'from-red-400 to-red-600',
          type: board.is_master_board ? 'master_status' : 'default_status',
          default_status_mapping: 'lost',
          status_mapping: board.is_master_board ? ['lost', 'client_rejected'] : undefined,
          is_terminal: true,
          is_locked: true,
          order: nonTerminalColumns.length + 2,
          checklist_items: []
        },
        {
          id: 'archived',
          label: 'Archived',
          color: 'from-gray-400 to-gray-600',
          type: board.is_master_board ? 'master_status' : 'default_status',
          default_status_mapping: 'archived',
          status_mapping: board.is_master_board ? ['archived'] : undefined,
          is_terminal: true,
          is_locked: true,
          order: nonTerminalColumns.length + 3,
          checklist_items: []
        }
      ];

      // Combine non-terminal + terminal columns
      const updatedColumns = [...nonTerminalColumns, ...terminalColumns];

      // Update board
      await base44.asServiceRole.entities.KanbanConfig.update(board.id, {
        columns: updatedColumns
      });

      updatedBoards.push(board.board_name);
    }

    return Response.json({
      success: true,
      boards_updated: updatedBoards,
      message: updatedBoards.length > 0 
        ? `Added terminal columns to ${updatedBoards.length} board(s): ${updatedBoards.join(', ')}`
        : 'All boards already have terminal columns'
    });

  } catch (error) {
    console.error('[Fix Error]:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});