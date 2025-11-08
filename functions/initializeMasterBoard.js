import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Master Board Column Definitions
const MASTER_BOARD_COLUMNS = [
  {
    id: 'master_new',
    label: 'New',
    color: 'from-slate-400 to-slate-600',
    type: 'default_status',
    default_status_mapping: 'evaluating',
    order: 0,
    is_locked: true,
    is_terminal: false,
    checklist_items: [
      {
        id: 'view_details',
        label: 'View Details',
        action: 'open_modal_basic_info',
        type: 'modal_trigger',
        required: false,
        order: 0
      },
      {
        id: 'categorize_type',
        label: 'Set Proposal Type',
        action: 'manual_check',
        type: 'manual_check',
        required: true,
        order: 1
      }
    ]
  },
  {
    id: 'master_active',
    label: 'Active',
    color: 'from-blue-400 to-blue-600',
    type: 'default_status',
    default_status_mapping: 'in_progress',
    order: 1,
    is_locked: false,
    is_terminal: false,
    checklist_items: [
      {
        id: 'check_health',
        label: 'Check Health Score',
        action: 'view_health_dashboard',
        type: 'ai_trigger',
        required: false,
        order: 0
      },
      {
        id: 'review_progress',
        label: 'Review Progress',
        action: 'manual_check',
        type: 'manual_check',
        required: false,
        order: 1
      }
    ]
  },
  {
    id: 'master_review',
    label: 'Review',
    color: 'from-purple-400 to-purple-600',
    type: 'custom_stage',
    order: 2,
    is_locked: false,
    is_terminal: false,
    checklist_items: [
      {
        id: 'final_review',
        label: 'Final Review',
        action: 'navigate_final_review',
        type: 'navigate',
        required: true,
        order: 0
      },
      {
        id: 'compliance_verify',
        label: 'Verify Compliance',
        action: 'navigate_compliance_matrix',
        type: 'navigate',
        required: false,
        order: 1
      }
    ]
  },
  {
    id: 'master_submitted',
    label: 'Submitted',
    color: 'from-indigo-400 to-indigo-600',
    type: 'default_status',
    default_status_mapping: 'submitted',
    order: 3,
    is_locked: true,
    is_terminal: true,
    checklist_items: []
  },
  {
    id: 'master_won',
    label: 'Won',
    color: 'from-green-400 to-green-600',
    type: 'default_status',
    default_status_mapping: 'won',
    order: 4,
    is_locked: true,
    is_terminal: true,
    checklist_items: []
  },
  {
    id: 'master_lost',
    label: 'Lost',
    color: 'from-red-400 to-red-600',
    type: 'default_status',
    default_status_mapping: 'lost',
    order: 5,
    is_locked: true,
    is_terminal: true,
    checklist_items: []
  },
  {
    id: 'master_archived',
    label: 'Archived',
    color: 'from-gray-400 to-gray-600',
    type: 'default_status',
    default_status_mapping: 'archived',
    order: 6,
    is_locked: true,
    is_terminal: true,
    checklist_items: []
  }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Check if master board already exists
    const existingMasterBoards = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id,
      board_type: 'master'
    });

    if (existingMasterBoards.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'Master board already exists',
        config_id: existingMasterBoards[0].id,
        board_type: 'master'
      });
    }

    // Create master board configuration
    const masterBoardConfig = await base44.asServiceRole.entities.KanbanConfig.create({
      organization_id,
      board_type: 'master',
      board_name: 'All Proposals',
      is_master_board: true,
      applies_to_proposal_types: ['RFP', 'RFI', 'SBIR', 'GSA', 'IDIQ', 'STATE_LOCAL', 'OTHER'],
      columns: MASTER_BOARD_COLUMNS,
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
      message: 'Master board created successfully',
      config_id: masterBoardConfig.id,
      board_type: 'master',
      columns_created: MASTER_BOARD_COLUMNS.length
    });

  } catch (error) {
    console.error('Error initializing master board:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});