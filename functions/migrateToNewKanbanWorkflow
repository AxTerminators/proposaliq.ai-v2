import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// New 15-column 8-Phase Workflow Template
const TEMPLATE_8_PHASE_WORKFLOW = [
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
  { id: 'submitted', label: 'Submitted', color: 'from-indigo-500 to-indigo-700', type: 'default_status', default_status_mapping: 'submitted', is_locked: true, order: 11, checklist_items: []},
  { id: 'won', label: 'Won', color: 'from-emerald-500 to-emerald-700', type: 'default_status', default_status_mapping: 'won', is_locked: true, order: 12, checklist_items: []},
  { id: 'lost', label: 'Lost', color: 'from-red-500 to-red-700', type: 'default_status', default_status_mapping: 'lost', is_locked: true, order: 13, checklist_items: []},
  { id: 'archived', label: 'Archive', color: 'from-gray-500 to-gray-700', type: 'default_status', default_status_mapping: 'archived', is_locked: true, order: 14, checklist_items: []}
];

// Mapping from old column IDs to new column IDs
const COLUMN_MAPPING = {
  'new': 'initiate',
  'evaluate': 'evaluate',
  'qualify': 'team',
  'gather': 'resources',
  'analyze': 'solicit',
  'strategy': 'strategy',
  'outline': 'plan',
  'drafting': 'draft',
  'pricing': 'price',
  'review': 'review',
  'final': 'final',
  'submitted': 'submitted',
  'won': 'won',
  'lost': 'lost',
  'archived': 'archived'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Only admins can run migration
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Unauthorized. Only admins can run migration.' 
      }, { status: 403 });
    }

    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({ 
        error: 'organization_id is required' 
      }, { status: 400 });
    }

    // Get current KanbanConfig
    const configs = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id
    });

    if (configs.length === 0) {
      return Response.json({ 
        error: 'No KanbanConfig found for this organization',
        organization_id 
      }, { status: 404 });
    }

    const currentConfig = configs[0];
    const currentColumns = currentConfig.columns || [];

    // Check if already using new template (has 'initiate' column)
    const hasNewTemplate = currentColumns.some(col => col.id === 'initiate');
    if (hasNewTemplate) {
      return Response.json({ 
        success: true,
        message: 'Organization already using new 8-phase workflow template',
        already_migrated: true
      });
    }

    // Get all proposals for this organization
    const proposals = await base44.asServiceRole.entities.Proposal.filter({
      organization_id
    });

    const migrationLog = {
      proposals_migrated: 0,
      proposals_with_errors: [],
      column_mappings_applied: {}
    };

    // Migrate each proposal to new column structure
    for (const proposal of proposals) {
      try {
        const updates = {};
        let needsUpdate = false;

        // Map custom_workflow_stage_id to new column IDs
        if (proposal.custom_workflow_stage_id) {
          const oldColumnId = proposal.custom_workflow_stage_id;
          const newColumnId = COLUMN_MAPPING[oldColumnId];
          
          if (newColumnId) {
            updates.custom_workflow_stage_id = newColumnId;
            needsUpdate = true;
            migrationLog.column_mappings_applied[oldColumnId] = (migrationLog.column_mappings_applied[oldColumnId] || 0) + 1;
          } else {
            // Custom column - keep as is, will need manual review
            console.log(`Proposal ${proposal.id} has custom column ${oldColumnId}, keeping as-is`);
          }
        }

        // Migrate checklist status to new column IDs
        if (proposal.current_stage_checklist_status) {
          const oldChecklistStatus = proposal.current_stage_checklist_status;
          const newChecklistStatus = {};

          for (const [oldColId, checklistData] of Object.entries(oldChecklistStatus)) {
            const newColId = COLUMN_MAPPING[oldColId] || oldColId;
            newChecklistStatus[newColId] = checklistData;
          }

          updates.current_stage_checklist_status = newChecklistStatus;
          needsUpdate = true;
        }

        // Update proposal if needed
        if (needsUpdate) {
          await base44.asServiceRole.entities.Proposal.update(proposal.id, updates);
          migrationLog.proposals_migrated++;
        }

      } catch (proposalError) {
        console.error(`Error migrating proposal ${proposal.id}:`, proposalError);
        migrationLog.proposals_with_errors.push({
          proposal_id: proposal.id,
          proposal_name: proposal.proposal_name,
          error: proposalError.message
        });
      }
    }

    // Update KanbanConfig to new template
    await base44.asServiceRole.entities.KanbanConfig.update(currentConfig.id, {
      columns: TEMPLATE_8_PHASE_WORKFLOW,
      collapsed_column_ids: [], // Reset collapsed columns
      view_settings: {
        default_view: 'kanban',
        show_card_details: ['assignees', 'due_date', 'progress', 'tasks'],
        compact_mode: false
      }
    });

    return Response.json({
      success: true,
      message: 'Migration completed successfully',
      migration_log: {
        organization_id,
        config_updated: true,
        total_proposals: proposals.length,
        proposals_migrated: migrationLog.proposals_migrated,
        proposals_with_errors: migrationLog.proposals_with_errors.length,
        error_details: migrationLog.proposals_with_errors,
        column_mappings: migrationLog.column_mappings_applied,
        new_columns_count: TEMPLATE_8_PHASE_WORKFLOW.length,
        migration_timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ 
      error: 'Migration failed', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});