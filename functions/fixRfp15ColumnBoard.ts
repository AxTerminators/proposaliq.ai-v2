import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Fixes existing RFP 15-Column boards that have wrong columns.
 * Deletes the old board and creates a fresh one with proper columns from the template.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body for organization_id
    const body = await req.json();
    const organization_id = body.organization_id;

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    console.log('[FixRfp15Column] 🔧 Fixing RFP 15-Column boards for org:', organization_id);

    // Find the 15-column template
    const templates = await base44.asServiceRole.entities.ProposalWorkflowTemplate.filter({
      template_type: 'system',
      proposal_type_category: 'RFP_15_COLUMN',
      is_active: true
    });

    if (templates.length === 0) {
      return Response.json({ 
        error: 'No 15-Column RFP template found. Please create it first.' 
      }, { status: 404 });
    }

    const template = templates[0];
    console.log('[FixRfp15Column] Found template:', template.template_name);

    // Find existing RFP 15-column boards
    const existingBoards = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id: organization_id,
      board_type: 'rfp_15_column'
    });

    console.log('[FixRfp15Column] Found', existingBoards.length, 'existing board(s)');

    const results = [];

    for (const board of existingBoards) {
      // Check if board has wrong columns (legacy proposal builder columns)
      const hasLegacyColumns = board.columns?.some(col => 
        col.label === 'Evaluating' || 
        col.label === 'Draft' || 
        col.label === 'In Progress' ||
        col.label === 'Watch List'
      );

      if (!hasLegacyColumns) {
        console.log('[FixRfp15Column] Board', board.board_name, 'already has correct columns');
        results.push({
          board_name: board.board_name,
          action: 'skipped',
          reason: 'Already has correct columns'
        });
        continue;
      }

      console.log('[FixRfp15Column] Deleting old board:', board.board_name);

      // Delete the old board
      await base44.asServiceRole.entities.KanbanConfig.delete(board.id);

      // Parse template workflow config
      const workflowConfig = typeof template.workflow_config === 'string'
        ? JSON.parse(template.workflow_config)
        : template.workflow_config;

      console.log('[FixRfp15Column] Creating new board with', workflowConfig.columns?.length, 'columns');

      // Create new board with correct columns
      const newBoard = await base44.asServiceRole.entities.KanbanConfig.create({
        organization_id: organization_id,
        board_type: 'rfp_15_column',
        board_name: board.board_name, // Keep same name
        is_master_board: false,
        applies_to_proposal_types: ['RFP_15_COLUMN'],
        simplified_workflow: false,
        columns: workflowConfig.columns || [],
        collapsed_column_ids: [],
        swimlane_config: workflowConfig.swimlane_config || {
          enabled: false,
          group_by: 'none',
          custom_field_name: '',
          show_empty_swimlanes: false
        },
        view_settings: workflowConfig.view_settings || {
          default_view: 'kanban',
          show_card_details: ['assignees', 'due_date', 'progress', 'value'],
          compact_mode: false
        }
      });

      results.push({
        board_name: board.board_name,
        action: 'recreated',
        old_id: board.id,
        new_id: newBoard.id,
        column_count: workflowConfig.columns?.length || 0
      });
    }

    console.log('[FixRfp15Column] ✅ Done!');

    return Response.json({
      success: true,
      message: 'Fixed RFP 15-Column boards',
      results: results,
      fixed_by: user.email
    });

  } catch (error) {
    console.error('[FixRfp15Column] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});