
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({
        success: false,
        message: 'organization_id is required'
      }, { status: 400 });
    }

    // Check for duplicate board names (case-insensitive)
    const boardName = '15-Column RFP Workflow';
    const existingBoards = await base44.entities.KanbanConfig.filter({
      organization_id
    });

    const normalizedNewName = boardName.toLowerCase().trim();
    const duplicate = existingBoards.find(board => 
      board.board_name.toLowerCase().trim() === normalizedNewName
    );

    if (duplicate) {
      return Response.json({
        success: false,
        message: `A board named "${duplicate.board_name}" already exists. Please delete or rename the existing board first.`
      }, { status: 400 });
    }

    const columns = [
      {
        id: 'new',
        label: 'New',
        color: 'from-slate-400 to-slate-600',
        type: 'locked_phase',
        phase_mapping: 'phase1',
        is_locked: true,
        is_template_locked: true,
        order: 0,
        checklist_items: [
          { id: 'basic_info', label: 'Add Basic Information', type: 'modal_trigger', associated_action: 'open_modal_phase1', required: true, order: 0 },
          { id: 'name_solicitation', label: 'Name & Solicitation #', type: 'system_check', required: true, order: 1 }
        ]
      },
      {
        id: 'evaluate',
        label: 'Evaluate',
        color: 'from-blue-400 to-blue-600',
        type: 'locked_phase',
        phase_mapping: 'phase1',
        is_locked: true,
        is_template_locked: true,
        order: 1,
        checklist_items: [
          { id: 'identify_prime', label: 'Identify Prime Contractor', type: 'modal_trigger', associated_action: 'open_modal_phase1', required: true, order: 0 },
          { id: 'add_partners', label: 'Add Teaming Partners', type: 'manual_check', required: false, order: 1 }
        ]
      },
      {
        id: 'qualify',
        label: 'Qualify',
        color: 'from-cyan-400 to-cyan-600',
        type: 'locked_phase',
        phase_mapping: 'phase3',
        is_locked: true,
        is_template_locked: true,
        order: 2,
        checklist_items: [
          { id: 'solicitation_details', label: 'Enter Solicitation Details', type: 'modal_trigger', associated_action: 'open_modal_phase3', required: true, order: 0 },
          { id: 'contract_value', label: 'Add Contract Value', type: 'system_check', required: true, order: 1 },
          { id: 'due_date', label: 'Set Due Date', type: 'system_check', required: true, order: 2 }
        ]
      },
      {
        id: 'gather',
        label: 'Gather',
        color: 'from-teal-400 to-teal-600',
        type: 'locked_phase',
        phase_mapping: 'phase2',
        is_locked: true,
        is_template_locked: true,
        order: 3,
        checklist_items: [
          { id: 'upload_solicitation', label: 'Upload Solicitation Document', type: 'modal_trigger', associated_action: 'open_modal_phase2', required: true, order: 0 },
          { id: 'reference_docs', label: 'Add Reference Documents', type: 'modal_trigger', associated_action: 'open_modal_phase2', required: false, order: 1 }
        ]
      },
      {
        id: 'analyze',
        label: 'Analyze',
        color: 'from-green-400 to-green-600',
        type: 'locked_phase',
        phase_mapping: 'phase3',
        is_locked: true,
        is_template_locked: true,
        order: 4,
        checklist_items: [
          { id: 'run_ai_analysis', label: 'Run AI Compliance Analysis', type: 'ai_trigger', associated_action: 'run_ai_analysis_phase3', required: true, order: 0 },
          { id: 'review_requirements', label: 'Review Compliance Requirements', type: 'manual_check', required: true, order: 1 }
        ]
      },
      {
        id: 'strategy',
        label: 'Strategy',
        color: 'from-lime-400 to-lime-600',
        type: 'locked_phase',
        phase_mapping: 'phase4',
        is_locked: true,
        is_template_locked: true,
        order: 5,
        checklist_items: [
          { id: 'run_evaluation', label: 'Run Strategic Evaluation', type: 'ai_trigger', associated_action: 'run_evaluation_phase4', required: true, order: 0 },
          { id: 'go_no_go', label: 'Make Go/No-Go Decision', type: 'manual_check', required: true, order: 1 },
          { id: 'competitor_analysis', label: 'Complete Competitor Analysis', type: 'modal_trigger', associated_action: 'open_modal_phase4', required: false, order: 2 }
        ]
      },
      {
        id: 'outline',
        label: 'Outline',
        color: 'from-yellow-400 to-yellow-600',
        type: 'locked_phase',
        phase_mapping: 'phase5',
        is_locked: true,
        is_template_locked: true,
        order: 6,
        checklist_items: [
          { id: 'select_sections', label: 'Select Proposal Sections', type: 'modal_trigger', associated_action: 'open_modal_phase5', required: true, order: 0 },
          { id: 'generate_win_themes', label: 'Generate Win Themes', type: 'ai_trigger', associated_action: 'generate_win_themes_phase5', required: false, order: 1 },
          { id: 'set_strategy', label: 'Set Writing Strategy', type: 'modal_trigger', associated_action: 'open_modal_phase5', required: true, order: 2 }
        ]
      },
      {
        id: 'drafting',
        label: 'Drafting',
        color: 'from-orange-400 to-orange-600',
        type: 'locked_phase',
        phase_mapping: 'phase6',
        is_locked: true,
        is_template_locked: true,
        order: 7,
        checklist_items: [
          { id: 'start_writing', label: 'Start Content Generation', type: 'modal_trigger', associated_action: 'open_modal_phase6', required: true, order: 0 },
          { id: 'complete_sections', label: 'Complete All Sections', type: 'system_check', required: true, order: 1 }
        ]
      },
      {
        id: 'review',
        label: 'Review',
        color: 'from-amber-400 to-amber-600',
        type: 'locked_phase',
        phase_mapping: 'phase7',
        is_locked: true,
        is_template_locked: true,
        order: 8,
        checklist_items: [
          { id: 'internal_review', label: 'Complete Internal Review', type: 'manual_check', required: true, order: 0 },
          { id: 'red_team', label: 'Conduct Red Team Review', type: 'modal_trigger', associated_action: 'open_red_team_review', required: false, order: 1 }
        ]
      },
      {
        id: 'final',
        label: 'Final',
        color: 'from-rose-400 to-rose-600',
        type: 'locked_phase',
        phase_mapping: 'phase7',
        is_locked: true,
        is_template_locked: true,
        order: 9,
        checklist_items: [
          { id: 'readiness_check', label: 'Run Submission Readiness Check', type: 'ai_trigger', associated_action: 'run_readiness_check_phase7', required: true, order: 0 },
          { id: 'final_review', label: 'Final Executive Review', type: 'manual_check', required: true, order: 1 }
        ],
        requires_approval_to_exit: true,
        approver_roles: ['organization_owner', 'proposal_manager']
      },
      // Terminal columns
      {
        id: 'submitted',
        label: 'Submitted',
        color: 'from-indigo-400 to-indigo-600',
        type: 'default_status',
        default_status_mapping: 'submitted',
        is_locked: true,
        is_terminal: true,
        order: 10,
        checklist_items: []
      },
      {
        id: 'won',
        label: 'Won',
        color: 'from-green-500 to-emerald-600',
        type: 'default_status',
        default_status_mapping: 'won',
        is_locked: true,
        is_terminal: true,
        order: 11,
        checklist_items: []
      },
      {
        id: 'lost',
        label: 'Lost',
        color: 'from-red-400 to-red-600',
        type: 'default_status',
        default_status_mapping: 'lost',
        is_locked: true,
        is_terminal: true,
        order: 12,
        checklist_items: []
      },
      {
        id: 'archived',
        label: 'Archive',
        color: 'from-gray-400 to-gray-600',
        type: 'default_status',
        default_status_mapping: 'archived',
        is_locked: true,
        is_terminal: true,
        order: 13,
        checklist_items: []
      }
    ];

    const boardConfig = {
      organization_id,
      board_type: 'rfp_15_column',
      board_name: boardName, // Already validated to be unique
      is_master_board: false,
      applies_to_proposal_types: ['RFP_15_COLUMN'],
      simplified_workflow: false,
      columns,
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

    const newBoard = await base44.entities.KanbanConfig.create(boardConfig);

    return Response.json({
      success: true,
      message: '15-Column RFP Workflow board created successfully!',
      board_id: newBoard.id,
      board_name: newBoard.board_name
    });

  } catch (error) {
    console.error('[create15ColumnRFPBoard] Error:', error);
    return Response.json({
      success: false,
      message: error.message || 'Failed to create 15-column board'
    }, { status: 500 });
  }
});
