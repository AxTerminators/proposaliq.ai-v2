import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Creates a type-specific board (RFP, SBIR, GSA, etc.) with detailed workflow
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id, board_type } = await req.json();

    if (!organization_id || !board_type) {
      return Response.json({ 
        error: 'organization_id and board_type required' 
      }, { status: 400 });
    }

    // Check if board already exists
    const existingBoards = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id: organization_id,
      board_type: board_type
    });

    if (existingBoards.length > 0) {
      return Response.json({
        success: true,
        was_created: false,
        board_id: existingBoards[0].id,
        message: `${board_type} board already exists`
      });
    }

    // Board configurations by type
    const BOARD_CONFIGS = {
      rfp: {
        board_name: 'RFP Board',
        applies_to_proposal_types: ['RFP'],
        columns: [
          { id: 'initiate', label: 'Initiate', color: 'from-slate-400 to-slate-600', order: 0, type: 'locked_phase', phase_mapping: 'phase1', is_locked: true, checklist_items: [
            { id: 'basic_info', label: 'Enter Basic Information', type: 'modal_trigger', associated_action: 'open_modal_basic_info', required: true, order: 0 }
          ]},
          { id: 'team', label: 'Team Formation', color: 'from-blue-400 to-blue-600', order: 1, type: 'locked_phase', phase_mapping: 'phase2', is_locked: true, checklist_items: [
            { id: 'team_setup', label: 'Configure Team & Partners', type: 'modal_trigger', associated_action: 'open_modal_team_setup', required: true, order: 0 }
          ]},
          { id: 'resources', label: 'Resource Gathering', color: 'from-cyan-400 to-cyan-600', order: 2, type: 'locked_phase', phase_mapping: 'phase3', is_locked: true, checklist_items: [
            { id: 'upload_sol', label: 'Upload Solicitation', type: 'modal_trigger', associated_action: 'open_modal_upload', required: true, order: 0 }
          ]},
          { id: 'evaluate', label: 'Strategic Evaluation', color: 'from-purple-400 to-purple-600', order: 3, type: 'locked_phase', phase_mapping: 'phase4', is_locked: true, checklist_items: [
            { id: 'run_eval', label: 'Run AI Evaluation', type: 'modal_trigger', associated_action: 'open_modal_evaluation', required: true, order: 0 },
            { id: 'compliance', label: 'Review Compliance Matrix', type: 'navigate_trigger', associated_action: 'navigate_compliance', required: false, order: 1 }
          ]},
          { id: 'strategy', label: 'Win Strategy', color: 'from-indigo-400 to-indigo-600', order: 4, type: 'locked_phase', phase_mapping: 'phase5', is_locked: true, checklist_items: [
            { id: 'win_themes', label: 'Develop Win Themes', type: 'modal_trigger', associated_action: 'open_modal_win_strategy', required: true, order: 0 }
          ]},
          { id: 'outline', label: 'Content Planning', color: 'from-violet-400 to-violet-600', order: 5, type: 'locked_phase', phase_mapping: 'phase6', is_locked: true, checklist_items: [
            { id: 'plan_content', label: 'Plan Content Strategy', type: 'modal_trigger', associated_action: 'open_modal_content_plan', required: true, order: 0 }
          ]},
          { id: 'write', label: 'Writing', color: 'from-amber-400 to-amber-600', order: 6, type: 'custom_stage', checklist_items: [
            { id: 'write_sections', label: 'Write Proposal Sections', type: 'navigate_trigger', associated_action: 'navigate_writer', required: true, order: 0 }
          ]},
          { id: 'pricing', label: 'Pricing', color: 'from-green-400 to-green-600', order: 7, type: 'locked_phase', phase_mapping: 'phase7', is_locked: true, checklist_items: [
            { id: 'build_pricing', label: 'Build Cost Estimate', type: 'modal_trigger', associated_action: 'open_modal_pricing', required: true, order: 0 }
          ]},
          { id: 'review', label: 'Internal Review', color: 'from-pink-400 to-pink-600', order: 8, type: 'custom_stage', checklist_items: [
            { id: 'pink_team', label: 'Pink Team Review', type: 'manual_check', required: false, order: 0 },
            { id: 'red_team', label: 'Red Team Review', type: 'manual_check', required: true, order: 1 }
          ]},
          { id: 'finalize', label: 'Finalize', color: 'from-teal-400 to-teal-600', order: 9, type: 'locked_phase', phase_mapping: 'phase8', is_locked: true, checklist_items: [
            { id: 'final_review', label: 'Final Quality Check', type: 'manual_check', required: true, order: 0 }
          ]},
          // Terminal columns
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 10, type: 'default_status', default_status_mapping: 'submitted', is_locked: true, is_terminal: true },
          { id: 'won', label: 'Won', color: 'from-green-500 to-green-700', order: 11, type: 'default_status', default_status_mapping: 'won', is_locked: true, is_terminal: true },
          { id: 'lost', label: 'Lost', color: 'from-red-500 to-red-700', order: 12, type: 'default_status', default_status_mapping: 'lost', is_locked: true, is_terminal: true },
          { id: 'archived', label: 'Archived', color: 'from-gray-500 to-gray-700', order: 13, type: 'default_status', default_status_mapping: 'archived', is_locked: true, is_terminal: true }
        ]
      },
      sbir: {
        board_name: 'SBIR/STTR Board',
        applies_to_proposal_types: ['SBIR'],
        columns: [
          { id: 'concept', label: 'Concept Development', color: 'from-purple-400 to-purple-600', order: 0, type: 'custom_stage', checklist_items: [
            { id: 'innovation', label: 'Define Innovation', type: 'manual_check', required: true, order: 0 },
            { id: 'tech_approach', label: 'Technical Approach', type: 'manual_check', required: true, order: 1 }
          ]},
          { id: 'research', label: 'Research Plan', color: 'from-blue-400 to-blue-600', order: 1, type: 'custom_stage', checklist_items: [
            { id: 'methodology', label: 'Define Methodology', type: 'manual_check', required: true, order: 0 },
            { id: 'milestones', label: 'Set Research Milestones', type: 'manual_check', required: true, order: 1 }
          ]},
          { id: 'team_sbir', label: 'Team Assembly', color: 'from-cyan-400 to-cyan-600', order: 2, type: 'custom_stage', checklist_items: [
            { id: 'pi', label: 'Identify Principal Investigator', type: 'manual_check', required: true, order: 0 }
          ]},
          { id: 'budget_sbir', label: 'Budget Development', color: 'from-green-400 to-green-600', order: 3, type: 'custom_stage', checklist_items: [
            { id: 'cost_est', label: 'Cost Estimation', type: 'modal_trigger', associated_action: 'open_modal_pricing', required: true, order: 0 }
          ]},
          { id: 'write_sbir', label: 'Proposal Writing', color: 'from-amber-400 to-amber-600', order: 4, type: 'custom_stage', checklist_items: [
            { id: 'write', label: 'Write Proposal', type: 'navigate_trigger', associated_action: 'navigate_writer', required: true, order: 0 }
          ]},
          { id: 'review_sbir', label: 'Technical Review', color: 'from-pink-400 to-pink-600', order: 5, type: 'custom_stage', checklist_items: [
            { id: 'tech_review', label: 'Technical Review', type: 'manual_check', required: true, order: 0 }
          ]},
          // Terminal columns
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 6, type: 'default_status', default_status_mapping: 'submitted', is_locked: true, is_terminal: true },
          { id: 'won', label: 'Won', color: 'from-green-500 to-green-700', order: 7, type: 'default_status', default_status_mapping: 'won', is_locked: true, is_terminal: true },
          { id: 'lost', label: 'Lost', color: 'from-red-500 to-red-700', order: 8, type: 'default_status', default_status_mapping: 'lost', is_locked: true, is_terminal: true },
          { id: 'archived', label: 'Archived', color: 'from-gray-500 to-gray-700', order: 9, type: 'default_status', default_status_mapping: 'archived', is_locked: true, is_terminal: true }
        ]
      },
      gsa: {
        board_name: 'GSA Schedule Board',
        applies_to_proposal_types: ['GSA'],
        columns: [
          { id: 'qualify', label: 'Qualification', color: 'from-blue-400 to-blue-600', order: 0, type: 'custom_stage', checklist_items: [
            { id: 'check_sin', label: 'Verify SIN Alignment', type: 'manual_check', required: true, order: 0 }
          ]},
          { id: 'pricing_gsa', label: 'GSA Pricing', color: 'from-green-400 to-green-600', order: 1, type: 'custom_stage', checklist_items: [
            { id: 'gsa_rates', label: 'Develop GSA Rates', type: 'manual_check', required: true, order: 0 }
          ]},
          { id: 'package', label: 'Package Submission', color: 'from-purple-400 to-purple-600', order: 2, type: 'custom_stage', checklist_items: [
            { id: 'assemble', label: 'Assemble Package', type: 'manual_check', required: true, order: 0 }
          ]},
          // Terminal columns
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 3, type: 'default_status', default_status_mapping: 'submitted', is_locked: true, is_terminal: true },
          { id: 'won', label: 'Awarded', color: 'from-green-500 to-green-700', order: 4, type: 'default_status', default_status_mapping: 'won', is_locked: true, is_terminal: true },
          { id: 'lost', label: 'Not Awarded', color: 'from-red-500 to-red-700', order: 5, type: 'default_status', default_status_mapping: 'lost', is_locked: true, is_terminal: true },
          { id: 'archived', label: 'Archived', color: 'from-gray-500 to-gray-700', order: 6, type: 'default_status', default_status_mapping: 'archived', is_locked: true, is_terminal: true }
        ]
      },
      rfi: {
        board_name: 'RFI Board',
        applies_to_proposal_types: ['RFI'],
        columns: [
          { id: 'intake', label: 'Intake & Analysis', color: 'from-blue-400 to-blue-600', order: 0, type: 'custom_stage', checklist_items: [
            { id: 'understand', label: 'Understand Requirements', type: 'manual_check', required: true, order: 0 }
          ]},
          { id: 'draft_rfi', label: 'Draft Response', color: 'from-purple-400 to-purple-600', order: 1, type: 'custom_stage', checklist_items: [
            { id: 'write_response', label: 'Write Response', type: 'navigate_trigger', associated_action: 'navigate_writer', required: true, order: 0 }
          ]},
          { id: 'review_rfi', label: 'Review & Refine', color: 'from-amber-400 to-amber-600', order: 2, type: 'custom_stage', checklist_items: [
            { id: 'review', label: 'Internal Review', type: 'manual_check', required: true, order: 0 }
          ]},
          // Terminal columns
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 3, type: 'default_status', default_status_mapping: 'submitted', is_locked: true, is_terminal: true },
          { id: 'won', label: 'Follow-on RFP', color: 'from-green-500 to-green-700', order: 4, type: 'default_status', default_status_mapping: 'won', is_locked: true, is_terminal: true },
          { id: 'lost', label: 'No Follow-on', color: 'from-red-500 to-red-700', order: 5, type: 'default_status', default_status_mapping: 'lost', is_locked: true, is_terminal: true },
          { id: 'archived', label: 'Archived', color: 'from-gray-500 to-gray-700', order: 6, type: 'default_status', default_status_mapping: 'archived', is_locked: true, is_terminal: true }
        ]
      },
      idiq: {
        board_name: 'IDIQ/BPA Board',
        applies_to_proposal_types: ['IDIQ'],
        columns: [
          { id: 'qualify_idiq', label: 'Qualification', color: 'from-blue-400 to-blue-600', order: 0, type: 'custom_stage', checklist_items: [
            { id: 'check_eligible', label: 'Check Eligibility', type: 'manual_check', required: true, order: 0 }
          ]},
          { id: 'prepare', label: 'Prepare Submission', color: 'from-purple-400 to-purple-600', order: 1, type: 'custom_stage', checklist_items: [
            { id: 'docs', label: 'Gather Required Docs', type: 'manual_check', required: true, order: 0 }
          ]},
          { id: 'pricing_idiq', label: 'Pricing Strategy', color: 'from-green-400 to-green-600', order: 2, type: 'custom_stage', checklist_items: [
            { id: 'rates', label: 'Develop Rate Structure', type: 'modal_trigger', associated_action: 'open_modal_pricing', required: true, order: 0 }
          ]},
          // Terminal columns
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 3, type: 'default_status', default_status_mapping: 'submitted', is_locked: true, is_terminal: true },
          { id: 'won', label: 'Awarded', color: 'from-green-500 to-green-700', order: 4, type: 'default_status', default_status_mapping: 'won', is_locked: true, is_terminal: true },
          { id: 'lost', label: 'Not Awarded', color: 'from-red-500 to-red-700', order: 5, type: 'default_status', default_status_mapping: 'lost', is_locked: true, is_terminal: true },
          { id: 'archived', label: 'Archived', color: 'from-gray-500 to-gray-700', order: 6, type: 'default_status', default_status_mapping: 'archived', is_locked: true, is_terminal: true }
        ]
      },
      state_local: {
        board_name: 'State/Local Board',
        applies_to_proposal_types: ['STATE_LOCAL'],
        columns: [
          { id: 'qualify_state', label: 'Qualification', color: 'from-blue-400 to-blue-600', order: 0, type: 'custom_stage', checklist_items: [
            { id: 'local_reqs', label: 'Review Local Requirements', type: 'manual_check', required: true, order: 0 }
          ]},
          { id: 'develop', label: 'Development', color: 'from-purple-400 to-purple-600', order: 1, type: 'custom_stage', checklist_items: [
            { id: 'develop_response', label: 'Develop Response', type: 'manual_check', required: true, order: 0 }
          ]},
          { id: 'review_state', label: 'Review', color: 'from-amber-400 to-amber-600', order: 2, type: 'custom_stage', checklist_items: [
            { id: 'internal_review', label: 'Internal Review', type: 'manual_check', required: true, order: 0 }
          ]},
          // Terminal columns
          { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', order: 3, type: 'default_status', default_status_mapping: 'submitted', is_locked: true, is_terminal: true },
          { id: 'won', label: 'Won', color: 'from-green-500 to-green-700', order: 4, type: 'default_status', default_status_mapping: 'won', is_locked: true, is_terminal: true },
          { id: 'lost', label: 'Lost', color: 'from-red-500 to-red-700', order: 5, type: 'default_status', default_status_mapping: 'lost', is_locked: true, is_terminal: true },
          { id: 'archived', label: 'Archived', color: 'from-gray-500 to-gray-700', order: 6, type: 'default_status', default_status_mapping: 'archived', is_locked: true, is_terminal: true }
        ]
      }
    };

    const config = BOARD_CONFIGS[board_type.toLowerCase()];
    
    if (!config) {
      return Response.json({ 
        error: `Invalid board_type: ${board_type}. Valid types: rfp, sbir, gsa, rfi, idiq, state_local` 
      }, { status: 400 });
    }

    const boardData = {
      organization_id: organization_id,
      board_type: board_type,
      board_name: config.board_name,
      is_master_board: false,
      applies_to_proposal_types: config.applies_to_proposal_types,
      simplified_workflow: false,
      columns: config.columns,
      collapsed_column_ids: [],
      swimlane_config: {
        enabled: false,
        group_by: 'none'
      },
      view_settings: {
        default_view: 'kanban',
        show_card_details: ['assignees', 'due_date', 'progress', 'value', 'tasks'],
        compact_mode: false
      }
    };

    const createdBoard = await base44.asServiceRole.entities.KanbanConfig.create(boardData);

    return Response.json({
      success: true,
      was_created: true,
      board_id: createdBoard.id,
      board_name: config.board_name,
      board_type: board_type,
      message: `${config.board_name} created successfully`
    });

  } catch (error) {
    console.error('[Create Board Error]:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});