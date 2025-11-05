import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Migration function to update existing KanbanConfigs to use the new 8-phase workflow
 * Also maps existing proposals to the new column structure
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated and is an admin
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the organization
    const orgs = await base44.asServiceRole.entities.Organization.filter(
      { created_by: user.email },
      '-created_date',
      1
    );

    if (orgs.length === 0) {
      return Response.json({ error: 'No organization found' }, { status: 404 });
    }

    const organization = orgs[0];

    // New 8-phase workflow template
    const NEW_TEMPLATE = [
      { id: 'initiate', label: 'Initiate', color: 'from-slate-700 to-slate-900', type: 'locked_phase', phase_mapping: 'phase1', is_locked: true, order: 0, checklist_items: [
        { id: 'basic_info', label: 'Enter Basic Information', type: 'modal_trigger', associated_action: 'open_basic_info_modal', required: true, order: 0 },
        { id: 'solicitation_number', label: 'Add Solicitation Number', type: 'manual_check', required: true, order: 1 },
        { id: 'agency_project', label: 'Set Agency & Project Details', type: 'manual_check', required: true, order: 2 }
      ]},
      { id: 'team', label: 'Team', color: 'from-blue-500 to-blue-700', type: 'locked_phase', phase_mapping: 'phase1', is_locked: true, order: 1, checklist_items: [
        { id: 'select_prime', label: 'Select Prime Contractor', type: 'modal_trigger', associated_action: 'open_team_formation_modal', required: true, order: 0 },
        { id: 'add_teaming', label: 'Add Teaming Partners', type: 'modal_trigger', associated_action: 'open_team_formation_modal', required: false, order: 1 }
      ]},
      { id: 'resources', label: 'Resources', color: 'from-cyan-500 to-cyan-700', type: 'locked_phase', phase_mapping: 'phase2', is_locked: true, order: 2, checklist_items: [
        { id: 'link_boilerplate', label: 'Link Boilerplate Content', type: 'modal_trigger', associated_action: 'open_resource_gathering_modal', required: false, order: 0 },
        { id: 'link_past_performance', label: 'Link Past Performance', type: 'modal_trigger', associated_action: 'open_resource_gathering_modal', required: false, order: 1 }
      ]},
      { id: 'solicit', label: 'Solicit', color: 'from-teal-500 to-teal-700', type: 'locked_phase', phase_mapping: 'phase3', is_locked: true, order: 3, checklist_items: [
        { id: 'upload_rfp', label: 'Upload RFP/Solicitation', type: 'modal_trigger', associated_action: 'open_solicitation_upload_modal', required: true, order: 0 },
        { id: 'ai_extract', label: 'AI Extract Key Details', type: 'ai_trigger', associated_action: 'run_ai_extraction_phase3', required: false, order: 1 },
        { id: 'confirm_details', label: 'Confirm Due Date & Value', type: 'manual_check', required: true, order: 2 }
      ]},
      { id: 'evaluate', label: 'Evaluate', color: 'from-green-500 to-green-700', type: 'locked_phase', phase_mapping: 'phase4', is_locked: true, order: 4, checklist_items: [
        { id: 'run_evaluation', label: 'Run Strategic Evaluation', type: 'modal_trigger', associated_action: 'open_evaluation_modal', required: true, order: 0 },
        { id: 'make_decision', label: 'Make Go/No-Go Decision', type: 'manual_check', required: true, order: 1 },
        { id: 'competitor_intel', label: 'Gather Competitor Intelligence', type: 'manual_check', required: false, order: 2 }
      ]},
      { id: 'strategy', label: 'Strategy', color: 'from-lime-500 to-lime-700', type: 'locked_phase', phase_mapping: 'phase5', is_locked: true, order: 5, checklist_items: [
        { id: 'generate_themes', label: 'Generate Win Themes', type: 'modal_trigger', associated_action: 'open_win_strategy_modal', required: true, order: 0 },
        { id: 'refine_themes', label: 'Refine & Approve Themes', type: 'manual_check', required: true, order: 1 }
      ]},
      { id: 'plan', label: 'Plan', color: 'from-yellow-500 to-yellow-700', type: 'locked_phase', phase_mapping: 'phase5', is_locked: true, order: 6, checklist_items: [
        { id: 'select_sections', label: 'Select Proposal Sections', type: 'modal_trigger', associated_action: 'open_section_planning_modal', required: true, order: 0 },
        { id: 'set_strategy', label: 'Set Writing Strategy', type: 'manual_check', required: true, order: 1 }
      ]},
      { id: 'draft', label: 'Draft', color: 'from-orange-500 to-orange-700', type: 'locked_phase', phase_mapping: 'phase6', is_locked: true, order: 7, checklist_items: [
        { id: 'start_writing', label: 'Start Content Development', type: 'navigate', associated_action: 'navigate_to_content_development', required: true, order: 0 },
        { id: 'ai_generate', label: 'AI Generate Sections', type: 'navigate', associated_action: 'start_ai_writing', required: false, order: 1 },
        { id: 'complete_sections', label: 'Complete All Sections', type: 'system_check', required: true, order: 2 }
      ]},
      { id: 'price', label: 'Price', color: 'from-rose-500 to-rose-700', type: 'locked_phase', phase_mapping: 'phase7', is_locked: true, order: 8, checklist_items: [
        { id: 'build_pricing', label: 'Build Pricing Model', type: 'navigate', associated_action: 'navigate_to_pricing', required: true, order: 0 },
        { id: 'review_pricing', label: 'Review Pricing Strategy', type: 'modal_trigger', associated_action: 'open_pricing_review_modal', required: false, order: 1 },
        { id: 'finalize_price', label: 'Finalize Pricing', type: 'manual_check', required: true, order: 2 }
      ]},
      { id: 'review', label: 'Review', color: 'from-pink-500 to-pink-700', type: 'locked_phase', phase_mapping: 'phase8', is_locked: true, order: 9, checklist_items: [
        { id: 'internal_review', label: 'Complete Internal Review', type: 'navigate', associated_action: 'navigate_to_final_review', required: true, order: 0 },
        { id: 'red_team', label: 'Conduct Red Team Review', type: 'navigate', associated_action: 'conduct_red_team', required: false, order: 1 }
      ]},
      { id: 'final', label: 'Final', color: 'from-purple-500 to-purple-700', type: 'locked_phase', phase_mapping: 'phase8', is_locked: true, order: 10, checklist_items: [
        { id: 'readiness_check', label: 'Run Submission Readiness', type: 'navigate', associated_action: 'run_readiness_check_phase8', required: true, order: 0 },
        { id: 'executive_review', label: 'Final Executive Review', type: 'manual_check', required: true, order: 1 },
        { id: 'export_proposal', label: 'Export Proposal', type: 'navigate', associated_action: 'open_export_modal', required: false, order: 2 }
      ], requires_approval_to_exit: true, approver_roles: ['organization_owner', 'proposal_manager']},
      { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', type: 'default_status', default_status_mapping: 'submitted', is_locked: true, order: 11, checklist_items: [] },
      { id: 'won', label: 'Won', color: 'from-emerald-500 to-emerald-700', type: 'default_status', default_status_mapping: 'won', is_locked: true, order: 12, checklist_items: [] },
      { id: 'lost', label: 'Lost', color: 'from-red-500 to-red-700', type: 'default_status', default_status_mapping: 'lost', is_locked: true, order: 13, checklist_items: [] },
      { id: 'archived', label: 'Archive', color: 'from-gray-500 to-gray-700', type: 'default_status', default_status_mapping: 'archived', is_locked: true, order: 14, checklist_items: [] }
    ];

    // Map old statuses to new column IDs
    const STATUS_TO_COLUMN_MAPPING = {
      'evaluating': 'evaluate',
      'draft': 'draft',
      'in_progress': 'review',
      'submitted': 'submitted',
      'won': 'won',
      'lost': 'lost',
      'archived': 'archived',
      'watch_list': 'evaluate',
      'client_review': 'review',
      'client_accepted': 'won',
      'client_rejected': 'lost'
    };

    // Map old phases to new column IDs
    const PHASE_TO_COLUMN_MAPPING = {
      'phase1': 'initiate',
      'phase2': 'resources',
      'phase3': 'solicit',
      'phase4': 'evaluate',
      'phase5': 'strategy',
      'phase6': 'draft',
      'phase7': 'price',
      'phase8': 'final',
      'completed': 'final'
    };

    const results = {
      kanban_configs_updated: 0,
      proposals_migrated: 0,
      errors: []
    };

    // Step 1: Update or create KanbanConfig for this organization
    try {
      const existingConfigs = await base44.asServiceRole.entities.KanbanConfig.filter({
        organization_id: organization.id
      });

      if (existingConfigs.length > 0) {
        // Update existing config
        const existingConfig = existingConfigs[0];
        await base44.asServiceRole.entities.KanbanConfig.update(existingConfig.id, {
          columns: NEW_TEMPLATE,
          collapsed_column_ids: existingConfig.collapsed_column_ids || [],
          swimlane_config: existingConfig.swimlane_config || { enabled: false, group_by: 'none' },
          view_settings: existingConfig.view_settings || {
            default_view: 'kanban',
            show_card_details: ['assignees', 'due_date', 'progress', 'value'],
            compact_mode: false
          }
        });
        results.kanban_configs_updated++;
      } else {
        // Create new config
        await base44.asServiceRole.entities.KanbanConfig.create({
          organization_id: organization.id,
          columns: NEW_TEMPLATE,
          collapsed_column_ids: [],
          swimlane_config: { enabled: false, group_by: 'none' },
          view_settings: {
            default_view: 'kanban',
            show_card_details: ['assignees', 'due_date', 'progress', 'value'],
            compact_mode: false
          }
        });
        results.kanban_configs_updated++;
      }
    } catch (error) {
      results.errors.push(`Error updating KanbanConfig: ${error.message}`);
    }

    // Step 2: Migrate all proposals to new column structure
    try {
      const proposals = await base44.asServiceRole.entities.Proposal.filter({
        organization_id: organization.id
      });

      for (const proposal of proposals) {
        try {
          // Determine new column based on current status or phase
          let newColumnId = null;
          
          // First try to map by status
          if (proposal.status && STATUS_TO_COLUMN_MAPPING[proposal.status]) {
            newColumnId = STATUS_TO_COLUMN_MAPPING[proposal.status];
          }
          // Then try to map by current_phase
          else if (proposal.current_phase && PHASE_TO_COLUMN_MAPPING[proposal.current_phase]) {
            newColumnId = PHASE_TO_COLUMN_MAPPING[proposal.current_phase];
          }
          // Default to initiate if can't determine
          else {
            newColumnId = 'initiate';
          }

          // Clear custom_workflow_stage_id since we're using the new template
          await base44.asServiceRole.entities.Proposal.update(proposal.id, {
            custom_workflow_stage_id: newColumnId
          });

          results.proposals_migrated++;
        } catch (proposalError) {
          results.errors.push(`Error migrating proposal ${proposal.id}: ${proposalError.message}`);
        }
      }
    } catch (error) {
      results.errors.push(`Error fetching proposals: ${error.message}`);
    }

    return Response.json({
      success: true,
      message: 'Migration completed',
      results
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});