import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Type-optimized workflow configurations
const BOARD_CONFIGS = {
  rfi: {
    board_name: 'RFI Board',
    applies_to_proposal_types: ['RFI'],
    columns: [
      {
        id: 'initiate_rfi',
        label: 'Initiate',
        color: 'from-blue-400 to-blue-600',
        type: 'custom_stage',
        order: 0,
        checklist_items: [
          { id: 'enter_basics', label: 'Enter RFI Details', type: 'modal_trigger', associated_action: 'open_modal_basic_info', required: true, order: 0 },
          { id: 'upload_rfi', label: 'Upload RFI Document', type: 'modal_trigger', associated_action: 'navigate_solicitation_upload', required: true, order: 1 }
        ]
      },
      {
        id: 'capability_statement',
        label: 'Capability Statement',
        color: 'from-purple-400 to-purple-600',
        type: 'custom_stage',
        order: 1,
        checklist_items: [
          { id: 'company_overview', label: 'Write Company Overview', type: 'ai_trigger', associated_action: 'navigate_write_content', required: true, order: 0 },
          { id: 'capabilities', label: 'List Core Capabilities', type: 'ai_trigger', associated_action: 'navigate_write_content', required: true, order: 1 },
          { id: 'past_perf_brief', label: 'Add Past Performance', type: 'manual_check', associated_action: 'navigate_past_performance', required: true, order: 2 }
        ]
      },
      {
        id: 'review_rfi',
        label: 'Review',
        color: 'from-indigo-400 to-indigo-600',
        type: 'custom_stage',
        order: 2,
        checklist_items: [
          { id: 'check_page_limits', label: 'Check Page Limits', type: 'manual_check', associated_action: 'open_modal_compliance', required: true, order: 0 },
          { id: 'final_review', label: 'Final Review', type: 'manual_check', associated_action: 'open_modal_review', required: true, order: 1 }
        ]
      },
      {
        id: 'submitted',
        label: 'Submitted',
        color: 'from-indigo-500 to-purple-600',
        type: 'default_status',
        default_status_mapping: 'submitted',
        is_terminal: true,
        is_locked: true,
        order: 3,
        checklist_items: []
      },
      {
        id: 'won',
        label: 'Won',
        color: 'from-green-400 to-green-600',
        type: 'default_status',
        default_status_mapping: 'won',
        is_terminal: true,
        is_locked: true,
        order: 4,
        checklist_items: []
      },
      {
        id: 'lost',
        label: 'Lost',
        color: 'from-red-400 to-red-600',
        type: 'default_status',
        default_status_mapping: 'lost',
        is_terminal: true,
        is_locked: true,
        order: 5,
        checklist_items: []
      },
      {
        id: 'archived',
        label: 'Archived',
        color: 'from-gray-400 to-gray-600',
        type: 'default_status',
        default_status_mapping: 'archived',
        is_terminal: true,
        is_locked: true,
        order: 6,
        checklist_items: []
      }
    ]
  },
  sbir: {
    board_name: 'SBIR Board',
    applies_to_proposal_types: ['SBIR'],
    columns: [
      {
        id: 'initiate_sbir',
        label: 'Initiate',
        color: 'from-blue-400 to-blue-600',
        type: 'custom_stage',
        order: 0,
        checklist_items: [
          { id: 'enter_sbir_topic', label: 'Enter SBIR Topic Info', type: 'modal_trigger', associated_action: 'open_modal_basic_info', required: true, order: 0 },
          { id: 'upload_baa', label: 'Upload BAA', type: 'modal_trigger', associated_action: 'navigate_solicitation_upload', required: true, order: 1 }
        ]
      },
      {
        id: 'innovation_plan',
        label: 'Innovation Plan',
        color: 'from-purple-400 to-purple-600',
        type: 'custom_stage',
        order: 1,
        checklist_items: [
          { id: 'technical_approach', label: 'Technical Approach', type: 'ai_trigger', associated_action: 'navigate_write_content', required: true, order: 0 },
          { id: 'state_of_art', label: 'State of the Art', type: 'ai_trigger', associated_action: 'navigate_write_content', required: true, order: 1 },
          { id: 'feasibility', label: 'Feasibility Study', type: 'ai_trigger', associated_action: 'navigate_write_content', required: true, order: 2 }
        ]
      },
      {
        id: 'commercialization',
        label: 'Commercialization',
        color: 'from-pink-400 to-pink-600',
        type: 'custom_stage',
        order: 2,
        checklist_items: [
          { id: 'market_analysis', label: 'Market Analysis', type: 'ai_trigger', associated_action: 'navigate_write_content', required: true, order: 0 },
          { id: 'transition_strategy', label: 'Transition Strategy', type: 'ai_trigger', associated_action: 'navigate_write_content', required: true, order: 1 }
        ]
      },
      {
        id: 'phase1_budget',
        label: 'Phase I Budget',
        color: 'from-green-400 to-green-600',
        type: 'custom_stage',
        order: 3,
        checklist_items: [
          { id: 'budget_justification', label: 'Budget Justification', type: 'modal_trigger', associated_action: 'navigate_pricing_build', required: true, order: 0 }
        ]
      },
      {
        id: 'review_sbir',
        label: 'Review',
        color: 'from-indigo-400 to-indigo-600',
        type: 'custom_stage',
        order: 4,
        checklist_items: [
          { id: 'technical_review', label: 'Technical Review', type: 'manual_check', associated_action: 'open_modal_review', required: true, order: 0 }
        ]
      },
      {
        id: 'submitted',
        label: 'Submitted',
        color: 'from-indigo-500 to-purple-600',
        type: 'default_status',
        default_status_mapping: 'submitted',
        is_terminal: true,
        is_locked: true,
        order: 5,
        checklist_items: []
      },
      {
        id: 'won',
        label: 'Won',
        color: 'from-green-400 to-green-600',
        type: 'default_status',
        default_status_mapping: 'won',
        is_terminal: true,
        is_locked: true,
        order: 6,
        checklist_items: []
      },
      {
        id: 'lost',
        label: 'Lost',
        color: 'from-red-400 to-red-600',
        type: 'default_status',
        default_status_mapping: 'lost',
        is_terminal: true,
        is_locked: true,
        order: 7,
        checklist_items: []
      },
      {
        id: 'archived',
        label: 'Archived',
        color: 'from-gray-400 to-gray-600',
        type: 'default_status',
        default_status_mapping: 'archived',
        is_terminal: true,
        is_locked: true,
        order: 8,
        checklist_items: []
      }
    ]
  },
  gsa: {
    board_name: 'GSA Schedule Board',
    applies_to_proposal_types: ['GSA'],
    columns: [
      {
        id: 'initiate_gsa',
        label: 'Initiate',
        color: 'from-blue-400 to-blue-600',
        type: 'custom_stage',
        order: 0,
        checklist_items: [
          { id: 'select_schedule_sins', label: 'Select Schedule & SINs', type: 'modal_trigger', associated_action: 'open_modal_basic_info', required: true, order: 0 },
          { id: 'upload_gsa_docs', label: 'Upload GSA Requirements', type: 'modal_trigger', associated_action: 'navigate_solicitation_upload', required: true, order: 1 }
        ]
      },
      {
        id: 'pricing_tables',
        label: 'Pricing Tables',
        color: 'from-green-400 to-green-600',
        type: 'custom_stage',
        order: 1,
        checklist_items: [
          { id: 'labor_categories', label: 'Configure Labor Categories', type: 'modal_trigger', associated_action: 'navigate_pricing_build', required: true, order: 0 },
          { id: 'sin_pricing', label: 'Build SIN Pricing Matrix', type: 'modal_trigger', associated_action: 'navigate_pricing_build', required: true, order: 1 }
        ]
      },
      {
        id: 'past_performance_gsa',
        label: 'Past Performance',
        color: 'from-purple-400 to-purple-600',
        type: 'custom_stage',
        order: 2,
        checklist_items: [
          { id: 'contract_refs', label: 'Add Contract References', type: 'manual_check', associated_action: 'navigate_past_performance', required: true, order: 0 },
          { id: 'cpars', label: 'CPARS Documentation', type: 'manual_check', associated_action: 'navigate_write_content', required: true, order: 1 }
        ]
      },
      {
        id: 'technical_capabilities',
        label: 'Technical Capabilities',
        color: 'from-amber-400 to-amber-600',
        type: 'custom_stage',
        order: 3,
        checklist_items: [
          { id: 'service_offerings', label: 'Service Offerings', type: 'ai_trigger', associated_action: 'navigate_write_content', required: true, order: 0 }
        ]
      },
      {
        id: 'review_gsa',
        label: 'Final Review',
        color: 'from-indigo-400 to-indigo-600',
        type: 'custom_stage',
        order: 4,
        checklist_items: [
          { id: 'pricing_review', label: 'Pricing Review', type: 'manual_check', associated_action: 'open_modal_pricing_review', required: true, order: 0 },
          { id: 'compliance_check', label: 'Compliance Check', type: 'manual_check', associated_action: 'open_modal_compliance', required: true, order: 1 }
        ]
      },
      {
        id: 'submitted',
        label: 'Submitted',
        color: 'from-indigo-500 to-purple-600',
        type: 'default_status',
        default_status_mapping: 'submitted',
        is_terminal: true,
        is_locked: true,
        order: 5,
        checklist_items: []
      },
      {
        id: 'won',
        label: 'Awarded',
        color: 'from-green-400 to-green-600',
        type: 'default_status',
        default_status_mapping: 'won',
        is_terminal: true,
        is_locked: true,
        order: 6,
        checklist_items: []
      },
      {
        id: 'lost',
        label: 'Not Selected',
        color: 'from-red-400 to-red-600',
        type: 'default_status',
        default_status_mapping: 'lost',
        is_terminal: true,
        is_locked: true,
        order: 7,
        checklist_items: []
      },
      {
        id: 'archived',
        label: 'Archived',
        color: 'from-gray-400 to-gray-600',
        type: 'default_status',
        default_status_mapping: 'archived',
        is_terminal: true,
        is_locked: true,
        order: 8,
        checklist_items: []
      }
    ]
  },
  idiq: {
    board_name: 'IDIQ Board',
    applies_to_proposal_types: ['IDIQ'],
    columns: [
      {
        id: 'initiate_idiq',
        label: 'Initiate',
        color: 'from-blue-400 to-blue-600',
        type: 'custom_stage',
        order: 0,
        checklist_items: [
          { id: 'task_order_details', label: 'Enter Task Order Details', type: 'modal_trigger', associated_action: 'open_modal_basic_info', required: true, order: 0 },
          { id: 'analyze_to', label: 'Analyze Task Order', type: 'modal_trigger', associated_action: 'navigate_solicitation_upload', required: true, order: 1 }
        ]
      },
      {
        id: 'clin_structure',
        label: 'CLIN Structure',
        color: 'from-green-400 to-green-600',
        type: 'custom_stage',
        order: 1,
        checklist_items: [
          { id: 'build_clins', label: 'Build CLIN Matrix', type: 'modal_trigger', associated_action: 'navigate_pricing_build', required: true, order: 0 }
        ]
      },
      {
        id: 'qualifications',
        label: 'Qualifications',
        color: 'from-purple-400 to-purple-600',
        type: 'custom_stage',
        order: 2,
        checklist_items: [
          { id: 'demonstrate_caps', label: 'Demonstrate Capabilities', type: 'ai_trigger', associated_action: 'navigate_write_content', required: true, order: 0 },
          { id: 'past_task_orders', label: 'Past Task Orders', type: 'manual_check', associated_action: 'navigate_past_performance', required: true, order: 1 }
        ]
      },
      {
        id: 'pricing_idiq',
        label: 'Pricing Strategy',
        color: 'from-amber-400 to-amber-600',
        type: 'custom_stage',
        order: 3,
        checklist_items: [
          { id: 'labor_rate_analysis', label: 'Labor Rate Analysis', type: 'modal_trigger', associated_action: 'navigate_pricing_build', required: true, order: 0 }
        ]
      },
      {
        id: 'review_idiq',
        label: 'Review',
        color: 'from-indigo-400 to-indigo-600',
        type: 'custom_stage',
        order: 4,
        checklist_items: [
          { id: 'technical_review', label: 'Technical Review', type: 'manual_check', associated_action: 'open_modal_review', required: true, order: 0 }
        ]
      },
      {
        id: 'submitted',
        label: 'Submitted',
        color: 'from-indigo-500 to-purple-600',
        type: 'default_status',
        default_status_mapping: 'submitted',
        is_terminal: true,
        is_locked: true,
        order: 5,
        checklist_items: []
      },
      {
        id: 'won',
        label: 'Won',
        color: 'from-green-400 to-green-600',
        type: 'default_status',
        default_status_mapping: 'won',
        is_terminal: true,
        is_locked: true,
        order: 6,
        checklist_items: []
      },
      {
        id: 'lost',
        label: 'Lost',
        color: 'from-red-400 to-red-600',
        type: 'default_status',
        default_status_mapping: 'lost',
        is_terminal: true,
        is_locked: true,
        order: 7,
        checklist_items: []
      },
      {
        id: 'archived',
        label: 'Archived',
        color: 'from-gray-400 to-gray-600',
        type: 'default_status',
        default_status_mapping: 'archived',
        is_terminal: true,
        is_locked: true,
        order: 8,
        checklist_items: []
      }
    ]
  },
  state_local: {
    board_name: 'State/Local Board',
    applies_to_proposal_types: ['STATE_LOCAL'],
    columns: [
      {
        id: 'initiate_state',
        label: 'Initiate',
        color: 'from-blue-400 to-blue-600',
        type: 'custom_stage',
        order: 0,
        checklist_items: [
          { id: 'enter_bid_details', label: 'Enter Bid Details', type: 'modal_trigger', associated_action: 'open_modal_basic_info', required: true, order: 0 },
          { id: 'upload_bid_docs', label: 'Upload Bid Documents', type: 'modal_trigger', associated_action: 'navigate_solicitation_upload', required: true, order: 1 }
        ]
      },
      {
        id: 'dbe_plan',
        label: 'DBE/MBE Plan',
        color: 'from-purple-400 to-purple-600',
        type: 'custom_stage',
        order: 1,
        checklist_items: [
          { id: 'identify_dbe', label: 'Identify DBE Partners', type: 'modal_trigger', associated_action: 'navigate_team_setup', required: true, order: 0 },
          { id: 'subcontracting_plan', label: 'Create Subcontracting Plan', type: 'ai_trigger', associated_action: 'navigate_write_content', required: true, order: 1 }
        ]
      },
      {
        id: 'local_compliance',
        label: 'Local Compliance',
        color: 'from-amber-400 to-amber-600',
        type: 'custom_stage',
        order: 2,
        checklist_items: [
          { id: 'business_license', label: 'Upload Business License', type: 'manual_check', associated_action: 'navigate_solicitation_upload', required: true, order: 0 },
          { id: 'bonding', label: 'Bonding Requirements', type: 'manual_check', associated_action: 'navigate_write_content', required: true, order: 1 },
          { id: 'insurance', label: 'Insurance Certificates', type: 'manual_check', associated_action: 'navigate_solicitation_upload', required: true, order: 2 }
        ]
      },
      {
        id: 'pricing_state',
        label: 'Pricing',
        color: 'from-green-400 to-green-600',
        type: 'custom_stage',
        order: 3,
        checklist_items: [
          { id: 'cost_estimate', label: 'Build Cost Estimate', type: 'modal_trigger', associated_action: 'navigate_pricing_build', required: true, order: 0 }
        ]
      },
      {
        id: 'review_state',
        label: 'Review',
        color: 'from-indigo-400 to-indigo-600',
        type: 'custom_stage',
        order: 4,
        checklist_items: [
          { id: 'compliance_review', label: 'Compliance Review', type: 'manual_check', associated_action: 'open_modal_compliance', required: true, order: 0 }
        ]
      },
      {
        id: 'submitted',
        label: 'Submitted',
        color: 'from-indigo-500 to-purple-600',
        type: 'default_status',
        default_status_mapping: 'submitted',
        is_terminal: true,
        is_locked: true,
        order: 5,
        checklist_items: []
      },
      {
        id: 'won',
        label: 'Won',
        color: 'from-green-400 to-green-600',
        type: 'default_status',
        default_status_mapping: 'won',
        is_terminal: true,
        is_locked: true,
        order: 6,
        checklist_items: []
      },
      {
        id: 'lost',
        label: 'Lost',
        color: 'from-red-400 to-red-600',
        type: 'default_status',
        default_status_mapping: 'lost',
        is_terminal: true,
        is_locked: true,
        order: 7,
        checklist_items: []
      },
      {
        id: 'archived',
        label: 'Archived',
        color: 'from-gray-400 to-gray-600',
        type: 'default_status',
        default_status_mapping: 'archived',
        is_terminal: true,
        is_locked: true,
        order: 8,
        checklist_items: []
      }
    ]
  },
  rfp: {
    board_name: 'RFP Board',
    applies_to_proposal_types: ['RFP'],
    columns: [
      {
        id: 'initiate_rfp',
        label: 'Initiate',
        color: 'from-blue-400 to-blue-600',
        type: 'custom_stage',
        order: 0,
        checklist_items: [
          { id: 'enter_rfp_basics', label: 'Enter RFP Details', type: 'modal_trigger', associated_action: 'open_modal_basic_info', required: true, order: 0 }
        ]
      },
      {
        id: 'team_formation',
        label: 'Team Formation',
        color: 'from-purple-400 to-purple-600',
        type: 'custom_stage',
        order: 1,
        checklist_items: [
          { id: 'configure_team', label: 'Configure Team', type: 'modal_trigger', associated_action: 'open_modal_team_formation', required: true, order: 0 }
        ]
      },
      {
        id: 'resource_gathering',
        label: 'Resource Gathering',
        color: 'from-green-400 to-green-600',
        type: 'custom_stage',
        order: 2,
        checklist_items: [
          { id: 'gather_resources', label: 'Gather Resources', type: 'modal_trigger', associated_action: 'open_modal_resource_gathering', required: true, order: 0 }
        ]
      },
      {
        id: 'solicitation_upload',
        label: 'Solicitation Upload',
        color: 'from-amber-400 to-amber-600',
        type: 'custom_stage',
        order: 3,
        checklist_items: [
          { id: 'upload_solicitation', label: 'Upload Solicitation', type: 'modal_trigger', associated_action: 'open_modal_solicitation_upload', required: true, order: 0 }
        ]
      },
      {
        id: 'evaluation',
        label: 'Evaluation',
        color: 'from-pink-400 to-pink-600',
        type: 'custom_stage',
        order: 4,
        checklist_items: [
          { id: 'run_evaluation', label: 'Run AI Evaluation', type: 'modal_trigger', associated_action: 'open_modal_evaluation', required: true, order: 0 }
        ]
      },
      {
        id: 'win_strategy',
        label: 'Win Strategy',
        color: 'from-indigo-400 to-indigo-600',
        type: 'custom_stage',
        order: 5,
        checklist_items: [
          { id: 'develop_win_themes', label: 'Develop Win Themes', type: 'modal_trigger', associated_action: 'open_modal_win_strategy', required: true, order: 0 }
        ]
      },
      {
        id: 'content_writing',
        label: 'Content Writing',
        color: 'from-cyan-400 to-cyan-600',
        type: 'custom_stage',
        order: 6,
        checklist_items: [
          { id: 'plan_content', label: 'Plan Content', type: 'modal_trigger', associated_action: 'open_modal_content_planning', required: true, order: 0 }
        ]
      },
      {
        id: 'pricing_build',
        label: 'Pricing Build',
        color: 'from-green-500 to-emerald-600',
        type: 'custom_stage',
        order: 7,
        checklist_items: [
          { id: 'build_pricing', label: 'Build Pricing', type: 'modal_trigger', associated_action: 'open_modal_pricing_review', required: true, order: 0 }
        ]
      },
      {
        id: 'final_review',
        label: 'Final Review',
        color: 'from-violet-400 to-violet-600',
        type: 'custom_stage',
        order: 8,
        checklist_items: [
          { id: 'final_review', label: 'Final Review', type: 'manual_check', associated_action: 'open_modal_review', required: true, order: 0 }
        ]
      },
      {
        id: 'submitted',
        label: 'Submitted',
        color: 'from-indigo-500 to-purple-600',
        type: 'default_status',
        default_status_mapping: 'submitted',
        is_terminal: true,
        is_locked: true,
        order: 9,
        checklist_items: []
      },
      {
        id: 'won',
        label: 'Won',
        color: 'from-green-400 to-green-600',
        type: 'default_status',
        default_status_mapping: 'won',
        is_terminal: true,
        is_locked: true,
        order: 10,
        checklist_items: []
      },
      {
        id: 'lost',
        label: 'Lost',
        color: 'from-red-400 to-red-600',
        type: 'default_status',
        default_status_mapping: 'lost',
        is_terminal: true,
        is_locked: true,
        order: 11,
        checklist_items: []
      },
      {
        id: 'archived',
        label: 'Archived',
        color: 'from-gray-400 to-gray-600',
        type: 'default_status',
        default_status_mapping: 'archived',
        is_terminal: true,
        is_locked: true,
        order: 12,
        checklist_items: []
      }
    ]
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id, board_type } = await req.json();

    if (!organization_id || !board_type) {
      return Response.json({ error: 'Missing organization_id or board_type' }, { status: 400 });
    }

    // Check if board already exists
    const existing = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id: organization_id,
      board_type: board_type
    });

    if (existing.length > 0) {
      return Response.json({ 
        success: false,
        message: 'Board already exists',
        board_id: existing[0].id,
        was_created: false
      });
    }

    // Get board configuration
    const config = BOARD_CONFIGS[board_type];
    
    if (!config) {
      return Response.json({ error: 'Invalid board_type' }, { status: 400 });
    }

    // Create the board
    const newBoard = await base44.asServiceRole.entities.KanbanConfig.create({
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
        group_by: 'none',
        show_empty_swimlanes: false
      },
      view_settings: {
        default_view: 'kanban',
        show_card_details: ['assignees', 'due_date', 'progress', 'value'],
        compact_mode: false
      }
    });

    return Response.json({ 
      success: true,
      message: `${config.board_name} created successfully with ${config.columns.length} columns`,
      board_id: newBoard.id,
      was_created: true
    });

  } catch (error) {
    console.error('Error creating board:', error);
    return Response.json({ 
      error: error.message || 'Failed to create board'
    }, { status: 500 });
  }
});