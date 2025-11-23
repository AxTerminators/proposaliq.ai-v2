import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Migration function to ensure all ProposalWorkflowTemplates have " Template" suffix
 * This is a one-time migration to standardize naming conventions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all templates
    const allTemplates = await base44.asServiceRole.entities.ProposalWorkflowTemplate.list();
    
    console.log('[TemplateSuffixMigration] Found', allTemplates.length, 'total templates');

    const updatesNeeded = [];
    const alreadyCorrect = [];
    const conflicts = [];

    // First pass: identify templates that need updating
    for (const template of allTemplates) {
      const currentName = template.template_name || '';
      const normalizedName = currentName.trim();
      
      // Check if it already ends with " Template" (case-insensitive)
      const endsWithTemplate = normalizedName.toLowerCase().endsWith(' template');
      
      if (endsWithTemplate) {
        alreadyCorrect.push(template.id);
      } else {
        const proposedNewName = normalizedName + ' Template';
        
        // Check if this new name would conflict with existing
        const wouldConflict = allTemplates.some(t => 
          t.id !== template.id && 
          t.template_name.toLowerCase() === proposedNewName.toLowerCase()
        );
        
        if (wouldConflict) {
          conflicts.push({
            id: template.id,
            currentName: normalizedName,
            proposedName: proposedNewName,
            conflictsWith: allTemplates.find(t => 
              t.id !== template.id && 
              t.template_name.toLowerCase() === proposedNewName.toLowerCase()
            ).id
          });
        } else {
          updatesNeeded.push({
            id: template.id,
            currentName: normalizedName,
            newName: proposedNewName
          });
        }
      }
    }

    console.log('[TemplateSuffixMigration] Summary:', {
      total: allTemplates.length,
      alreadyCorrect: alreadyCorrect.length,
      needsUpdate: updatesNeeded.length,
      conflicts: conflicts.length
    });

    // Second pass: apply updates
    const updateResults = [];
    
    for (const update of updatesNeeded) {
      try {
        await base44.asServiceRole.entities.ProposalWorkflowTemplate.update(
          update.id,
          { template_name: update.newName }
        );
        
        updateResults.push({
          success: true,
          id: update.id,
          oldName: update.currentName,
          newName: update.newName
        });
        
        console.log('[TemplateSuffixMigration] ✅ Updated:', update.currentName, '→', update.newName);
      } catch (error) {
        updateResults.push({
          success: false,
          id: update.id,
          oldName: update.currentName,
          error: error.message
        });
        
        console.error('[TemplateSuffixMigration] ❌ Failed to update:', update.currentName, error.message);
      }
    }

    const successCount = updateResults.filter(r => r.success).length;
    const failureCount = updateResults.filter(r => !r.success).length;

    return Response.json({
      success: true,
      summary: {
        total_templates: allTemplates.length,
        already_correct: alreadyCorrect.length,
        updated: successCount,
        failed: failureCount,
        conflicts_detected: conflicts.length
      },
      updates: updateResults,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      message: `Migration complete: ${successCount} templates updated, ${alreadyCorrect.length} already correct, ${conflicts.length} conflicts detected`
    });

  } catch (error) {
    console.error('[TemplateSuffixMigration] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});