import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * One-time migration to fix all existing records missing icon_emoji
 * Run this once to update all ProposalWorkflowTemplate and ModalConfig records
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if user is admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    let updated = {
      templates: 0,
      modals: 0
    };

    // Fix ProposalWorkflowTemplate records
    const templates = await base44.asServiceRole.entities.ProposalWorkflowTemplate.list();
    for (const template of templates) {
      if (!template.icon_emoji) {
        await base44.asServiceRole.entities.ProposalWorkflowTemplate.update(template.id, {
          icon_emoji: '📋'
        });
        updated.templates++;
      }
    }

    // Fix ModalConfig records
    const modals = await base44.asServiceRole.entities.ModalConfig.list();
    for (const modal of modals) {
      if (!modal.icon_emoji) {
        await base44.asServiceRole.entities.ModalConfig.update(modal.id, {
          icon_emoji: '📋'
        });
        updated.modals++;
      }
    }

    return Response.json({
      success: true,
      message: 'Migration completed successfully',
      updated
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ 
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
});