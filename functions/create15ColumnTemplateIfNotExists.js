import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check authentication
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if template already exists
    const existing = await base44.asServiceRole.entities.ProposalWorkflowTemplate.filter({
      template_type: 'system',
      proposal_type_category: 'RFP_15_COLUMN'
    });

    if (existing.length > 0) {
      return Response.json({
        success: true,
        message: 'Template already exists',
        template_id: existing[0].id,
        was_created: false
      });
    }

    // Create the 15-column workflow configuration
    const workflowConfig = {
      columns: [
        {
          id: 'col_initiate',
          label: 'Initiate',
          color: 'from-slate-400 to-slate-600',
          order: 0,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          checklist_items: [
            {
              id: 'enter_basic_info',
              label: 'Enter Basic Information',
              type: 'modal_trigger',
              associated_action: 'open_basic_info_modal',
              required: true,
              order: 0
            },
            {
              id: 'select_prime_contractor',
              label: 'Select Prime Contractor',
              type: 'modal_trigger',
              associated_action: 'open_basic_info_modal',
              required: true,
              order: 1
            },
            {
              id: 'add_solicitation_number',
              label: 'Add Solicitation Number',
              type: 'modal_trigger',
              associated_action: 'open_basic_info_modal',
              required: false,
              order: 2
            }
          ]
        },
        {
          id: 'col_team',
          label: 'Team',
          color: 'from-blue-400 to-blue-600',
          order: 1,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          checklist_items: [
            {
              id: 'form_team',
              label: 'Form Proposal Team',
              type: 'modal_trigger',
              associated_action: 'open_team_formation_modal',
              required: true,
              order: 0
            },
            {
              id: 'add_teaming_partners',
              label: 'Add Teaming Partners',
              type: 'modal_trigger',
              associated_action: 'open_team_formation_modal',
              required: false,
              order: 1
            },
            {
              id: 'define_roles',
              label: 'Define Team Roles',
              type: 'modal_trigger',
              associated_action: 'open_team_formation_modal',
              required: false,
              order: 2
            }
          ]
        },
        {
          id: 'col_resources',
          label: 'Resources',
          color: 'from-purple-400 to-purple-600',
          order: 2,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          checklist_items: [
            {
              id: 'gather_resources',
              label: 'Gather Boilerplate Content',
              type: 'modal_trigger',
              associated_action: 'open_resource_gathering_modal',
              required: false,
              order: 0
            },
            {
              id: 'link_boilerplate',
              label: 'Link Capability Statements',
              type: 'modal_trigger',
              associated_action: 'open_resource_gathering_modal',
              required: false,
              order: 1
            },
            {
              id: 'link_past_performance',
              label: 'Link Past Performance',
              type: 'modal_trigger',
              associated_action: 'open_resource_gathering_modal',
              required: false,
              order: 2
            }
          ]
        },
        {
          id: 'col_solicitation',
          label: 'Solicitation',
          color: 'from-teal-400 to-teal-600',
          order: 3,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          checklist_items: [
            {
              id: 'upload_solicitation',
              label: 'Upload Solicitation Documents',
              type: 'modal_trigger',
              associated_action: 'open_solicitation_upload_modal',
              required: true,
              order: 0
            },
            {
              id: 'extract_requirements',
              label: 'Extract Requirements (AI)',
              type: 'ai_trigger',
              associated_action: 'run_ai_analysis_phase3',
              required: false,
              order: 1
            },
            {
              id: 'set_contract_value',
              label: 'Set Contract Value & Due Date',
              type: 'system_check',
              associated_action: 'contract_value_present',
              required: true,
              order: 2
            }
          ]
        },
        {
          id: 'col_evaluation',
          label: 'Evaluation',
          color: 'from-amber-400 to-amber-600',
          order: 4,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          checklist_items: [
            {
              id: 'run_evaluation',
              label: 'Run Strategic Evaluation (AI)',
              type: 'modal_trigger',
              associated_action: 'open_evaluation_modal',
              required: true,
              order: 0
            },
            {
              id: 'calculate_confidence_score',
              label: 'Calculate Confidence Score',
              type: 'ai_trigger',
              associated_action: 'run_evaluation_phase4',
              required: false,
              order: 1
            }
          ]
        },
        {
          id: 'col_strategy',
          label: 'Strategy',
          color: 'from-green-400 to-green-600',
          order: 5,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          checklist_items: [
            {
              id: 'develop_win_strategy',
              label: 'Develop Win Strategy',
              type: 'modal_trigger',
              associated_action: 'open_win_strategy_modal',
              required: true,
              order: 0
            },
            {
              id: 'generate_win_themes',
              label: 'Generate Win Themes (AI)',
              type: 'ai_trigger',
              associated_action: 'generate_win_themes_phase5',
              required: false,
              order: 1
            },
            {
              id: 'refine_themes',
              label: 'Refine Themes Manually',
              type: 'manual_check',
              associated_action: null,
              required: false,
              order: 2
            }
          ]
        },
        {
          id: 'col_planning',
          label: 'Planning',
          color: 'from-indigo-400 to-indigo-600',
          order: 6,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          checklist_items: [
            {
              id: 'plan_content',
              label: 'Plan Content Strategy',
              type: 'modal_trigger',
              associated_action: 'open_content_planning_modal',
              required: true,
              order: 0
            },
            {
              id: 'select_sections',
              label: 'Select Proposal Sections',
              type: 'modal_trigger',
              associated_action: 'open_content_planning_modal',
              required: false,
              order: 1
            },
            {
              id: 'set_writing_strategy',
              label: 'Set Writing Strategy',
              type: 'manual_check',
              associated_action: null,
              required: false,
              order: 2
            }
          ]
        },
        {
          id: 'col_writing',
          label: 'Writing',
          color: 'from-pink-400 to-pink-600',
          order: 7,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          checklist_items: [
            {
              id: 'start_writing_content',
              label: 'Start Writing Content',
              type: 'navigate',
              associated_action: 'navigate_to_content_dev',
              required: true,
              order: 0
            },
            {
              id: 'use_ai_assistant',
              label: 'Use AI Writing Assistant',
              type: 'navigate',
              associated_action: 'navigate_to_content_dev',
              required: false,
              order: 1
            },
            {
              id: 'complete_sections',
              label: 'Complete All Sections',
              type: 'system_check',
              associated_action: 'complete_sections',
              required: true,
              order: 2
            }
          ]
        },
        {
          id: 'col_pricing',
          label: 'Pricing',
          color: 'from-orange-400 to-orange-600',
          order: 8,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          checklist_items: [
            {
              id: 'build_pricing',
              label: 'Build Pricing & Cost',
              type: 'navigate',
              associated_action: 'navigate_to_pricing',
              required: true,
              order: 0
            },
            {
              id: 'review_pricing',
              label: 'Review Pricing Strategy',
              type: 'modal_trigger',
              associated_action: 'open_pricing_review_modal',
              required: false,
              order: 1
            }
          ]
        },
        {
          id: 'col_compliance',
          label: 'Compliance',
          color: 'from-red-400 to-red-600',
          order: 9,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          checklist_items: [
            {
              id: 'check_compliance',
              label: 'Run Compliance Check',
              type: 'navigate',
              associated_action: 'navigate_to_compliance',
              required: true,
              order: 0
            },
            {
              id: 'address_gaps',
              label: 'Address Any Gaps',
              type: 'manual_check',
              associated_action: null,
              required: false,
              order: 1
            }
          ]
        },
        {
          id: 'col_review',
          label: 'Review',
          color: 'from-yellow-400 to-yellow-600',
          order: 10,
          type: 'custom_stage',
          is_locked: false,
          is_terminal: false,
          checklist_items: [
            {
              id: 'conduct_red_team',
              label: 'Conduct Red Team Review',
              type: 'navigate',
              associated_action: 'navigate_to_review',
              required: true,
              order: 0
            },
            {
              id: 'address_feedback',
              label: 'Address Review Feedback',
              type: 'manual_check',
              associated_action: null,
              required: true,
              order: 1
            }
          ]
        },
        {
          id: 'col_submitted',
          label: 'Submitted',
          color: 'from-blue-500 to-blue-700',
          order: 11,
          type: 'custom_stage',
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        },
        {
          id: 'col_won',
          label: 'Won',
          color: 'from-green-500 to-green-700',
          order: 12,
          type: 'custom_stage',
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        },
        {
          id: 'col_lost',
          label: 'Lost',
          color: 'from-red-500 to-red-700',
          order: 13,
          type: 'custom_stage',
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        },
        {
          id: 'col_archived',
          label: 'Archived',
          color: 'from-slate-500 to-slate-700',
          order: 14,
          type: 'custom_stage',
          is_locked: true,
          is_terminal: true,
          checklist_items: []
        }
      ],
      swimlane_config: {
        enabled: false,
        group_by: 'none',
        custom_field_name: '',
        show_empty_swimlanes: false
      },
      view_settings: {
        default_view: 'kanban',
        show_card_details: ['assignees', 'due_date', 'progress', 'value', 'tasks'],
        compact_mode: false
      }
    };

    // Create the template
    const template = await base44.asServiceRole.entities.ProposalWorkflowTemplate.create({
      template_name: '15-Column RFP Workflow',
      template_type: 'system',
      proposal_type_category: 'RFP_15_COLUMN',
      board_type: 'rfp_15_column',
      description: 'Complete independent 15-column workflow with mandatory checklists for RFP proposals. Features 11 workflow stages with granular control and AI-powered actions.',
      workflow_config: JSON.stringify(workflowConfig),
      icon_emoji: '🎯',
      estimated_duration_days: 75,
      usage_count: 0,
      average_win_rate: 0,
      is_active: true
    });

    return Response.json({
      success: true,
      message: '15-Column RFP Workflow template created successfully',
      template_id: template.id,
      was_created: true
    });

  } catch (error) {
    console.error('Error creating template:', error);
    return Response.json({ 
      error: error.message || 'Failed to create template',
      success: false 
    }, { status: 500 });
  }
});