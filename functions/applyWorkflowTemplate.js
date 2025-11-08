import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id, template_id, proposal_id, board_type } = await req.json();

    if (!organization_id) {
      return Response.json({ error: 'Missing organization_id' }, { status: 400 });
    }

    let template = null;

    // If template_id provided, fetch that specific template
    if (template_id) {
      const templates = await base44.asServiceRole.entities.ProposalWorkflowTemplate.filter({ 
        id: template_id 
      });
      
      if (templates.length === 0) {
        return Response.json({ error: 'Template not found' }, { status: 404 });
      }
      
      template = templates[0];
    } 
    // If board_type provided, find the system template for that type
    else if (board_type) {
      const templates = await base44.asServiceRole.entities.ProposalWorkflowTemplate.filter({
        board_type: board_type,
        template_type: 'system',
        is_active: true
      });
      
      if (templates.length === 0) {
        return Response.json({ error: 'No system template found for this board type' }, { status: 404 });
      }
      
      template = templates[0];
    } else {
      return Response.json({ error: 'Must provide either template_id or board_type' }, { status: 400 });
    }

    // Parse workflow config
    const workflowConfig = typeof template.workflow_config === 'string' 
      ? JSON.parse(template.workflow_config) 
      : template.workflow_config;

    // Check if board config exists for this type
    const existingBoards = await base44.asServiceRole.entities.KanbanConfig.filter({
      organization_id: organization_id,
      board_type: template.board_type
    });
    
    let boardConfig = null;

    // Create board if doesn't exist
    if (existingBoards.length === 0) {
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
    
    // Update proposal with template info if proposal_id provided
    if (proposal_id) {
      await base44.asServiceRole.entities.Proposal.update(proposal_id, {
        proposal_type_category: template.proposal_type_category,
        workflow_template_id: template.id,
        custom_workflow_stage_id: workflowConfig.columns?.[0]?.id || null
      });
    }
    
    // Increment usage counter
    await base44.asServiceRole.entities.ProposalWorkflowTemplate.update(template.id, {
      usage_count: (template.usage_count || 0) + 1
    });
    
    return Response.json({ 
      success: true,
      board_config: boardConfig,
      template_applied: template.template_name,
      board_was_created: existingBoards.length === 0,
      columns_count: workflowConfig.columns?.length || 0
    });

  } catch (error) {
    console.error('Error applying workflow template:', error);
    return Response.json({ 
      error: error.message || 'Failed to apply template'
    }, { status: 500 });
  }
});