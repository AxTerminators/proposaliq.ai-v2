import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

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

    // Check if board already exists
    const existing = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id,
      board_type: 'rfp_15_column'
    });

    if (existing.length > 0) {
      return Response.json({
        success: true,
        was_created: false,
        message: '15-Column RFP Board already exists',
        board_id: existing[0].id
      });
    }

    // Create the 15-column independent workflow board
    const newBoard = await base44.asServiceRole.entities.KanbanConfig.create({
      organization_id,
      board_type: 'rfp_15_column',
      board_name: 'RFP Workflow (15-Column)',
      is_master_board: false,
      applies_to_proposal_types: ['RFP'],
      simplified_workflow: false,
      columns: [
        // Column 1: Initiate
        {
          id: 'initiate',
          label: 'Initiate',
          color: 'from-blue-400 to-blue-600',
          order: 0,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          wip_limit: 0,
          wip_limit_type: 'soft',
          checklist_items: [
            {
              id: 'enter_basic_info',
              label: 'Enter Basic Info',
              type: 'modal_trigger',
              associated_action: 'open_basic_info_modal',
              required: true,
              order: 0
            },
            {
              id: 'set_timeline',
              label: 'Set Timeline',
              type: 'modal_trigger',
              associated_action: 'open_basic_info_modal',
              required: true,
              order: 1
            }
          ],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        
        // Column 2: Team
        {
          id: 'team',
          label: 'Team',
          color: 'from-purple-400 to-purple-600',
          order: 1,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          wip_limit: 0,
          wip_limit_type: 'soft',
          checklist_items: [
            {
              id: 'select_prime',
              label: 'Select Prime Contractor',
              type: 'modal_trigger',
              associated_action: 'open_team_modal',
              required: true,
              order: 0
            },
            {
              id: 'add_partners',
              label: 'Add Teaming Partners',
              type: 'modal_trigger',
              associated_action: 'open_team_modal',
              required: false,
              order: 1
            },
            {
              id: 'assign_lead_writer',
              label: 'Assign Lead Writer',
              type: 'modal_trigger',
              associated_action: 'open_team_modal',
              required: true,
              order: 2
            }
          ],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        
        // Column 3: Resources
        {
          id: 'resources',
          label: 'Resources',
          color: 'from-green-400 to-green-600',
          order: 2,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          wip_limit: 0,
          wip_limit_type: 'soft',
          checklist_items: [
            {
              id: 'upload_capability_statement',
              label: 'Upload Capability Statement',
              type: 'modal_trigger',
              associated_action: 'open_resources_modal',
              required: true,
              order: 0
            },
            {
              id: 'link_past_performance',
              label: 'Link Past Performance',
              type: 'modal_trigger',
              associated_action: 'open_resources_modal',
              required: true,
              order: 1
            },
            {
              id: 'gather_boilerplate',
              label: 'Gather Boilerplate Content',
              type: 'modal_trigger',
              associated_action: 'open_resources_modal',
              required: false,
              order: 2
            }
          ],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        
        // Column 4: Solicitation
        {
          id: 'solicitation',
          label: 'Solicitation',
          color: 'from-amber-400 to-amber-600',
          order: 3,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          wip_limit: 0,
          wip_limit_type: 'soft',
          checklist_items: [
            {
              id: 'upload_rfp',
              label: 'Upload RFP Document',
              type: 'navigate',
              associated_action: 'navigate_solicitation_upload',
              required: true,
              order: 0
            },
            {
              id: 'extract_requirements',
              label: 'Extract Requirements (AI)',
              type: 'navigate',
              associated_action: 'navigate_solicitation_upload',
              required: true,
              order: 1
            },
            {
              id: 'identify_page_limits',
              label: 'Identify Page Limits',
              type: 'navigate',
              associated_action: 'navigate_solicitation_upload',
              required: true,
              order: 2
            }
          ],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        
        // Column 5: Evaluation
        {
          id: 'evaluation',
          label: 'Evaluation',
          color: 'from-pink-400 to-pink-600',
          order: 4,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          wip_limit: 0,
          wip_limit_type: 'soft',
          checklist_items: [
            {
              id: 'run_strategic_analysis',
              label: 'Run Strategic Analysis (AI)',
              type: 'navigate',
              associated_action: 'navigate_evaluation',
              required: true,
              order: 0
            },
            {
              id: 'calculate_match_score',
              label: 'Calculate Match Score',
              type: 'navigate',
              associated_action: 'navigate_evaluation',
              required: true,
              order: 1
            },
            {
              id: 'review_evaluation_results',
              label: 'Review Evaluation Results',
              type: 'navigate',
              associated_action: 'navigate_evaluation',
              required: true,
              order: 2
            }
          ],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        
        // Column 6: Strategy
        {
          id: 'strategy',
          label: 'Strategy',
          color: 'from-indigo-400 to-indigo-600',
          order: 5,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          wip_limit: 0,
          wip_limit_type: 'soft',
          checklist_items: [
            {
              id: 'develop_win_themes',
              label: 'Develop Win Themes (AI)',
              type: 'navigate',
              associated_action: 'navigate_win_strategy',
              required: true,
              order: 0
            },
            {
              id: 'competitive_analysis',
              label: 'Competitive Analysis (AI)',
              type: 'navigate',
              associated_action: 'navigate_win_strategy',
              required: true,
              order: 1
            },
            {
              id: 'approve_strategy',
              label: 'Approve Strategy',
              type: 'manual_check',
              associated_action: null,
              required: true,
              order: 2
            }
          ],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        
        // Column 7: Planning
        {
          id: 'planning',
          label: 'Planning',
          color: 'from-cyan-400 to-cyan-600',
          order: 6,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          wip_limit: 0,
          wip_limit_type: 'soft',
          checklist_items: [
            {
              id: 'create_section_outline',
              label: 'Create Section Outline (AI)',
              type: 'navigate',
              associated_action: 'navigate_content_planning',
              required: true,
              order: 0
            },
            {
              id: 'assign_sections_to_writers',
              label: 'Assign Sections to Writers',
              type: 'modal_trigger',
              associated_action: 'open_content_planning_modal',
              required: true,
              order: 1
            },
            {
              id: 'set_section_deadlines',
              label: 'Set Section Deadlines',
              type: 'modal_trigger',
              associated_action: 'open_content_planning_modal',
              required: false,
              order: 2
            }
          ],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        
        // Column 8: Writing
        {
          id: 'writing',
          label: 'Writing',
          color: 'from-violet-400 to-violet-600',
          order: 7,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          wip_limit: 0,
          wip_limit_type: 'soft',
          checklist_items: [
            {
              id: 'draft_all_sections',
              label: 'Draft All Sections',
              type: 'navigate',
              associated_action: 'navigate_write_content',
              required: true,
              order: 0
            },
            {
              id: 'review_compliance',
              label: 'Review Compliance (AI)',
              type: 'navigate',
              associated_action: 'navigate_compliance_check',
              required: true,
              order: 1
            },
            {
              id: 'approve_content',
              label: 'Approve Content',
              type: 'manual_check',
              associated_action: null,
              required: true,
              order: 2
            }
          ],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        
        // Column 9: Pricing
        {
          id: 'pricing',
          label: 'Pricing',
          color: 'from-emerald-400 to-emerald-600',
          order: 8,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          wip_limit: 0,
          wip_limit_type: 'soft',
          checklist_items: [
            {
              id: 'build_labor_rates',
              label: 'Build Labor Rates',
              type: 'navigate',
              associated_action: 'navigate_pricing_build',
              required: true,
              order: 0
            },
            {
              id: 'create_clins',
              label: 'Create CLINs',
              type: 'navigate',
              associated_action: 'navigate_pricing_build',
              required: true,
              order: 1
            },
            {
              id: 'calculate_total_price',
              label: 'Calculate Total Price',
              type: 'system_check',
              associated_action: null,
              required: true,
              order: 2
            }
          ],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        
        // Column 10: Review
        {
          id: 'review',
          label: 'Review',
          color: 'from-rose-400 to-rose-600',
          order: 9,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          wip_limit: 0,
          wip_limit_type: 'soft',
          checklist_items: [
            {
              id: 'red_team_review',
              label: 'Red Team Review',
              type: 'navigate',
              associated_action: 'navigate_red_team',
              required: true,
              order: 0
            },
            {
              id: 'compliance_final_check',
              label: 'Compliance Final Check (AI)',
              type: 'navigate',
              associated_action: 'navigate_compliance_check',
              required: true,
              order: 1
            },
            {
              id: 'final_approval',
              label: 'Final Approval',
              type: 'manual_check',
              associated_action: null,
              required: true,
              order: 2
            }
          ],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        
        // Column 11: Final
        {
          id: 'final',
          label: 'Final',
          color: 'from-slate-400 to-slate-600',
          order: 10,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          wip_limit: 0,
          wip_limit_type: 'soft',
          checklist_items: [
            {
              id: 'export_pdf',
              label: 'Export PDF',
              type: 'navigate',
              associated_action: 'navigate_export',
              required: true,
              order: 0
            },
            {
              id: 'submission_checklist',
              label: 'Submission Checklist',
              type: 'navigate',
              associated_action: 'navigate_submission_ready',
              required: true,
              order: 1
            },
            {
              id: 'final_signoff',
              label: 'Final Sign-off',
              type: 'manual_check',
              associated_action: null,
              required: true,
              order: 2
            }
          ],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: true,
          approver_roles: ['organization_owner', 'proposal_manager']
        },
        
        // Terminal Columns (12-15)
        {
          id: 'submitted',
          label: 'Submitted',
          color: 'from-indigo-500 to-purple-600',
          order: 11,
          type: 'default_status',
          default_status_mapping: 'submitted',
          is_locked: true,
          is_terminal: true,
          wip_limit: 0,
          checklist_items: [],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        {
          id: 'won',
          label: 'Won',
          color: 'from-green-400 to-green-600',
          order: 12,
          type: 'default_status',
          default_status_mapping: 'won',
          is_locked: true,
          is_terminal: true,
          wip_limit: 0,
          checklist_items: [],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        {
          id: 'lost',
          label: 'Lost',
          color: 'from-red-400 to-red-600',
          order: 13,
          type: 'default_status',
          default_status_mapping: 'lost',
          is_locked: true,
          is_terminal: true,
          wip_limit: 0,
          checklist_items: [],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        },
        {
          id: 'archived',
          label: 'Archived',
          color: 'from-gray-400 to-gray-600',
          order: 14,
          type: 'default_status',
          default_status_mapping: 'archived',
          is_locked: true,
          is_terminal: true,
          wip_limit: 0,
          checklist_items: [],
          can_drag_to_here_roles: [],
          can_drag_from_here_roles: [],
          requires_approval_to_exit: false,
          approver_roles: []
        }
      ],
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
    });

    return Response.json({
      success: true,
      was_created: true,
      message: '15-Column RFP Board created successfully!',
      board_id: newBoard.id
    });

  } catch (error) {
    console.error('Error creating 15-column board:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});