import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Creates a type-specific board (RFP, SBIR, GSA, etc.)
 * These boards can have detailed workflows tailored to each proposal type
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id, board_type, board_name } = await req.json();

    if (!organization_id || !board_type) {
      return Response.json({ error: 'organization_id and board_type are required' }, { status: 400 });
    }

    // Check if board already exists
    const existing = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id,
      board_type
    });

    if (existing.length > 0) {
      return Response.json({
        success: true,
        message: 'Board already exists',
        config_id: existing[0].id,
        was_created: false
      });
    }

    // Define board configurations for different types
    const boardConfigs = {
      'rfp': {
        board_name: board_name || 'RFP Board',
        applies_to_proposal_types: ['RFP'],
        columns: [
          { id: 'rfp_initiate', label: 'Initiate', color: 'from-slate-400 to-slate-600', order: 0, type: 'locked_phase', phase_mapping: 'phase1' },
          { id: 'rfp_team', label: 'Team Setup', color: 'from-blue-400 to-blue-600', order: 1, type: 'locked_phase', phase_mapping: 'phase2' },
          { id: 'rfp_resources', label: 'Gather Resources', color: 'from-cyan-400 to-cyan-600', order: 2, type: 'locked_phase', phase_mapping: 'phase3' },
          { id: 'rfp_solicit', label: 'Upload Solicitation', color: 'from-indigo-400 to-indigo-600', order: 3, type: 'locked_phase', phase_mapping: 'phase4' },
          { id: 'rfp_evaluate', label: 'Evaluate', color: 'from-purple-400 to-purple-600', order: 4, type: 'locked_phase', phase_mapping: 'phase5' },
          { id: 'rfp_strategy', label: 'Develop Strategy', color: 'from-pink-400 to-pink-600', order: 5, type: 'locked_phase', phase_mapping: 'phase6' },
          { id: 'rfp_write', label: 'Write Content', color: 'from-orange-400 to-orange-600', order: 6, type: 'locked_phase', phase_mapping: 'phase7' },
          { id: 'rfp_price', label: 'Build Pricing', color: 'from-amber-400 to-amber-600', order: 7, type: 'locked_phase', phase_mapping: 'phase8' },
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 8, type: 'default_status', default_status_mapping: 'submitted', is_terminal: true },
          { id: 'won', label: 'Won', color: 'from-green-500 to-green-700', order: 9, type: 'default_status', default_status_mapping: 'won', is_terminal: true },
          { id: 'lost', label: 'Lost', color: 'from-red-500 to-red-700', order: 10, type: 'default_status', default_status_mapping: 'lost', is_terminal: true },
          { id: 'archived', label: 'Archived', color: 'from-gray-500 to-gray-700', order: 11, type: 'default_status', default_status_mapping: 'archived', is_terminal: true }
        ]
      },
      'rfi': {
        board_name: board_name || 'RFI Board',
        applies_to_proposal_types: ['RFI'],
        columns: [
          { id: 'rfi_new', label: 'New', color: 'from-slate-400 to-slate-600', order: 0, type: 'default_status', default_status_mapping: 'evaluating' },
          { id: 'rfi_gather', label: 'Gather Info', color: 'from-blue-400 to-blue-600', order: 1, type: 'custom_stage' },
          { id: 'rfi_draft', label: 'Draft Response', color: 'from-purple-400 to-purple-600', order: 2, type: 'default_status', default_status_mapping: 'draft' },
          { id: 'rfi_review', label: 'Internal Review', color: 'from-amber-400 to-amber-600', order: 3, type: 'default_status', default_status_mapping: 'in_progress' },
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 4, type: 'default_status', default_status_mapping: 'submitted', is_terminal: true },
          { id: 'archived', label: 'Archived', color: 'from-gray-500 to-gray-700', order: 5, type: 'default_status', default_status_mapping: 'archived', is_terminal: true }
        ]
      },
      'sbir': {
        board_name: board_name || 'SBIR/STTR Board',
        applies_to_proposal_types: ['SBIR'],
        columns: [
          { id: 'sbir_concept', label: 'Concept Development', color: 'from-purple-400 to-purple-600', order: 0, type: 'custom_stage' },
          { id: 'sbir_research', label: 'Research Plan', color: 'from-blue-400 to-blue-600', order: 1, type: 'custom_stage' },
          { id: 'sbir_tech', label: 'Technical Approach', color: 'from-cyan-400 to-cyan-600', order: 2, type: 'custom_stage' },
          { id: 'sbir_commercial', label: 'Commercialization', color: 'from-green-400 to-green-600', order: 3, type: 'custom_stage' },
          { id: 'sbir_budget', label: 'Budget Build', color: 'from-amber-400 to-amber-600', order: 4, type: 'custom_stage' },
          { id: 'sbir_final', label: 'Final Review', color: 'from-orange-400 to-orange-600', order: 5, type: 'custom_stage' },
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 6, type: 'default_status', default_status_mapping: 'submitted', is_terminal: true },
          { id: 'won', label: 'Awarded', color: 'from-green-500 to-green-700', order: 7, type: 'default_status', default_status_mapping: 'won', is_terminal: true },
          { id: 'lost', label: 'Not Selected', color: 'from-red-500 to-red-700', order: 8, type: 'default_status', default_status_mapping: 'lost', is_terminal: true }
        ]
      },
      'gsa': {
        board_name: board_name || 'GSA Schedule Board',
        applies_to_proposal_types: ['GSA'],
        columns: [
          { id: 'gsa_prep', label: 'Preparation', color: 'from-blue-400 to-blue-600', order: 0, type: 'custom_stage' },
          { id: 'gsa_pricing', label: 'Pricing Matrix', color: 'from-green-400 to-green-600', order: 1, type: 'custom_stage' },
          { id: 'gsa_compliance', label: 'Compliance Check', color: 'from-amber-400 to-amber-600', order: 2, type: 'custom_stage' },
          { id: 'gsa_docs', label: 'Documentation', color: 'from-purple-400 to-purple-600', order: 3, type: 'custom_stage' },
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 4, type: 'default_status', default_status_mapping: 'submitted', is_terminal: true },
          { id: 'won', label: 'Approved', color: 'from-green-500 to-green-700', order: 5, type: 'default_status', default_status_mapping: 'won', is_terminal: true },
          { id: 'archived', label: 'Archived', color: 'from-gray-500 to-gray-700', order: 6, type: 'default_status', default_status_mapping: 'archived', is_terminal: true }
        ]
      },
      'idiq': {
        board_name: board_name || 'IDIQ/BPA Board',
        applies_to_proposal_types: ['IDIQ'],
        columns: [
          { id: 'idiq_qualify', label: 'Qualification', color: 'from-slate-400 to-slate-600', order: 0, type: 'custom_stage' },
          { id: 'idiq_capability', label: 'Capability Statement', color: 'from-blue-400 to-blue-600', order: 1, type: 'custom_stage' },
          { id: 'idiq_pricing', label: 'Pricing Strategy', color: 'from-green-400 to-green-600', order: 2, type: 'custom_stage' },
          { id: 'idiq_past_perf', label: 'Past Performance', color: 'from-purple-400 to-purple-600', order: 3, type: 'custom_stage' },
          { id: 'idiq_final', label: 'Final Package', color: 'from-amber-400 to-amber-600', order: 4, type: 'custom_stage' },
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 5, type: 'default_status', default_status_mapping: 'submitted', is_terminal: true },
          { id: 'won', label: 'Awarded', color: 'from-green-500 to-green-700', order: 6, type: 'default_status', default_status_mapping: 'won', is_terminal: true },
          { id: 'archived', label: 'Archived', color: 'from-gray-500 to-gray-700', order: 7, type: 'default_status', default_status_mapping: 'archived', is_terminal: true }
        ]
      },
      'state_local': {
        board_name: board_name || 'State/Local Board',
        applies_to_proposal_types: ['STATE_LOCAL'],
        columns: [
          { id: 'sl_new', label: 'New Opportunity', color: 'from-slate-400 to-slate-600', order: 0, type: 'default_status', default_status_mapping: 'evaluating' },
          { id: 'sl_prep', label: 'Prep & Research', color: 'from-blue-400 to-blue-600', order: 1, type: 'custom_stage' },
          { id: 'sl_draft', label: 'Draft Proposal', color: 'from-purple-400 to-purple-600', order: 2, type: 'default_status', default_status_mapping: 'draft' },
          { id: 'sl_review', label: 'Review', color: 'from-amber-400 to-amber-600', order: 3, type: 'default_status', default_status_mapping: 'in_progress' },
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 4, type: 'default_status', default_status_mapping: 'submitted', is_terminal: true },
          { id: 'won', label: 'Won', color: 'from-green-500 to-green-700', order: 5, type: 'default_status', default_status_mapping: 'won', is_terminal: true },
          { id: 'lost', label: 'Lost', color: 'from-red-500 to-red-700', order: 6, type: 'default_status', default_status_mapping: 'lost', is_terminal: true }
        ]
      }
    };

    const configTemplate = boardConfigs[board_type];
    
    if (!configTemplate) {
      return Response.json({ 
        error: 'Invalid board type. Must be one of: rfp, rfi, sbir, gsa, idiq, state_local' 
      }, { status: 400 });
    }

    // Add checklist_items to all columns
    const columnsWithChecklists = configTemplate.columns.map(col => ({
      ...col,
      checklist_items: [],
      is_locked: col.type === 'locked_phase' || col.is_terminal,
      wip_limit: 0
    }));

    const newBoardConfig = {
      organization_id,
      board_type,
      board_name: configTemplate.board_name,
      is_master_board: false,
      applies_to_proposal_types: configTemplate.applies_to_proposal_types,
      simplified_workflow: false,
      columns: columnsWithChecklists,
      collapsed_column_ids: [],
      swimlane_config: {
        enabled: false,
        group_by: 'none',
        show_empty_swimlanes: false
      },
      view_settings: {
        default_view: 'kanban',
        show_card_details: ['assignees', 'due_date', 'progress', 'value', 'tasks'],
        compact_mode: false
      }
    };

    const created = await base44.asServiceRole.entities.KanbanConfig.create(newBoardConfig);

    return Response.json({
      success: true,
      message: `${configTemplate.board_name} created successfully`,
      config_id: created.id,
      was_created: true,
      board_type
    });

  } catch (error) {
    console.error('Error creating type-specific board:', error);
    return Response.json({ 
      error: error.message || 'Failed to create board' 
    }, { status: 500 });
  }
});