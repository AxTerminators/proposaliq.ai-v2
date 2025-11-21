import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Database Validation Function
 * Ensures all ProposalWorkflowTemplate and ModalConfig records have valid icon_emoji values
 * Fixes any null/undefined icon_emoji fields with appropriate defaults
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user - admin only
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Unauthorized - Admin access required' 
      }, { status: 401 });
    }

    const results = {
      success: true,
      templates_fixed: 0,
      modals_fixed: 0,
      templates_deleted: 0,
      modals_deleted: 0,
      details: []
    };

    // Fix ProposalWorkflowTemplate records
    console.log('[ValidateIconEmoji] Checking ProposalWorkflowTemplate records...');
    const allTemplates = await base44.asServiceRole.entities.ProposalWorkflowTemplate.list();
    
    for (const template of allTemplates) {
      // Check if record is completely null or missing critical fields
      if (!template || !template.id) {
        console.log('[ValidateIconEmoji] Found null template record, skipping...');
        continue;
      }

      // Delete corrupted records that are missing essential fields
      if (!template.template_name || !template.workflow_config) {
        console.log(`[ValidateIconEmoji] Deleting corrupted template: ${template.id}`);
        await base44.asServiceRole.entities.ProposalWorkflowTemplate.delete(template.id);
        results.templates_deleted++;
        results.details.push(`Deleted corrupted template: ${template.id}`);
        continue;
      }

      // Fix missing or invalid icon_emoji
      if (!template.icon_emoji || typeof template.icon_emoji !== 'string' || template.icon_emoji.trim() === '') {
        console.log(`[ValidateIconEmoji] Fixing template: ${template.template_name}`);
        
        // Determine appropriate icon based on category or board_type
        let defaultIcon = '📋';
        
        const iconMap = {
          'RFP': '📋',
          'RFI': '📝',
          'SBIR': '🔬',
          'GSA': '🏛️',
          'IDIQ': '📑',
          'STATE_LOCAL': '🏢',
          'RFP_15_COLUMN': '🎯',
          'OTHER': '📊'
        };
        
        if (template.proposal_type_category && iconMap[template.proposal_type_category]) {
          defaultIcon = iconMap[template.proposal_type_category];
        } else if (template.board_type) {
          const boardTypeMap = {
            'rfp': '📋',
            'rfi': '📝',
            'sbir': '🔬',
            'gsa': '🏛️',
            'idiq': '📑',
            'state_local': '🏢',
            'rfp_15_column': '🎯',
            'template_workspace': '📂',
            'custom_proposal': '🎨',
            'custom_project': '🛠️',
            'custom': '📊'
          };
          defaultIcon = boardTypeMap[template.board_type] || '📋';
        }
        
        await base44.asServiceRole.entities.ProposalWorkflowTemplate.update(template.id, {
          icon_emoji: defaultIcon
        });
        
        results.templates_fixed++;
        results.details.push(`Fixed template: ${template.template_name} → ${defaultIcon}`);
      }
    }

    // Fix ModalConfig records
    console.log('[ValidateIconEmoji] Checking ModalConfig records...');
    const allModals = await base44.asServiceRole.entities.ModalConfig.list();
    
    for (const modal of allModals) {
      // Check if record is completely null or missing critical fields
      if (!modal || !modal.id) {
        console.log('[ValidateIconEmoji] Found null modal record, skipping...');
        continue;
      }

      // Delete corrupted records that are missing essential fields
      if (!modal.name || !modal.config_json) {
        console.log(`[ValidateIconEmoji] Deleting corrupted modal: ${modal.id}`);
        await base44.asServiceRole.entities.ModalConfig.delete(modal.id);
        results.modals_deleted++;
        results.details.push(`Deleted corrupted modal: ${modal.id}`);
        continue;
      }

      // Fix missing or invalid icon_emoji
      if (!modal.icon_emoji || typeof modal.icon_emoji !== 'string' || modal.icon_emoji.trim() === '') {
        console.log(`[ValidateIconEmoji] Fixing modal: ${modal.name}`);
        
        // Determine appropriate icon based on category
        let defaultIcon = '📋';
        
        const categoryIconMap = {
          'basic_info': '📋',
          'team_formation': '👥',
          'resource_gathering': '📚',
          'evaluation': '🎯',
          'pricing': '💰',
          'custom': '⚙️'
        };
        
        if (modal.category && categoryIconMap[modal.category]) {
          defaultIcon = categoryIconMap[modal.category];
        }
        
        await base44.asServiceRole.entities.ModalConfig.update(modal.id, {
          icon_emoji: defaultIcon
        });
        
        results.modals_fixed++;
        results.details.push(`Fixed modal: ${modal.name} → ${defaultIcon}`);
      }
    }

    console.log('[ValidateIconEmoji] ✅ Validation complete:', results);

    return Response.json(results);
    
  } catch (error) {
    console.error('[ValidateIconEmoji] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});