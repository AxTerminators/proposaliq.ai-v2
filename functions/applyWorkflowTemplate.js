import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Applies a workflow template to a proposal and creates/updates board config
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id, template_id, proposal_id } = await req.json();

    if (!organization_id || !template_id) {
      return Response.json({ 
        error: 'Missing required fields: organization_id and template_id' 
      }, { status: 400 });
    }

    // Get template
    const templates = await base44.asServiceRole.entities.ProposalWorkflowTemplate.filter({
      id: template_id
    });

    if (templates.length === 0) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    const template = templates[0];
    
    // Parse workflow config (it's stored as JSON string)
    const workflowConfig = typeof template.workflow_config === 'string' 
      ? JSON.parse(template.workflow_config) 
      : template.workflow_config;

    // Check if board config exists for this type
    const existingBoards = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id: organization_id,
      board_type: template.board_type
    });

    let boardConfig;
    
    if (existingBoards.length === 0) {
      // Create new board config from template
      boardConfig = await base44.asServiceRole.entities.KanbanConfig.create({
        organization_id: organization_id,
        board_type: template.board_type,
        board_name: template.template_name,
        is_master_board: false,
        applies_to_proposal_types: [template.proposal_type_category],
        simplified_workflow: false,
        columns: workflowConfig.columns || [],
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
    } else {
      boardConfig = existingBoards[0];
    }

    // Update proposal with template reference
    if (proposal_id) {
      await base44.asServiceRole.entities.Proposal.update(proposal_id, {
        proposal_type_category: template.proposal_type_category,
        workflow_template_id: template_id
      });
    }

    // Increment template usage counter
    await base44.asServiceRole.entities.ProposalWorkflowTemplate.update(template_id, {
      usage_count: (template.usage_count || 0) + 1
    });

    return Response.json({
      success: true,
      board_config: {
        id: boardConfig.id,
        board_name: boardConfig.board_name,
        board_type: boardConfig.board_type,
        columns_count: boardConfig.columns?.length || 0
      },
      template_applied: template.template_name,
      board_was_created: existingBoards.length === 0
    });

  } catch (error) {
    console.error('Error applying workflow template:', error);
    return Response.json({ 
      error: error.message || 'Failed to apply workflow template'
    }, { status: 500 });
  }
});