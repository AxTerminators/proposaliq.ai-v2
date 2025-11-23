import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SPRINT 6: Migrate AdminData to ProposalResource
 * 
 * Consolidates AdminData records into ProposalResource with organization_id = null
 * for system-wide resources.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = {
      migrated: 0,
      skipped: 0,
      errors: []
    };

    console.log('[Migration] Starting AdminData migration...');
    const adminDataRecords = await base44.asServiceRole.entities.AdminData.list();
    
    for (const data of adminDataRecords) {
      try {
        // Check if already migrated by checking for matching title and type
        const existing = await base44.asServiceRole.entities.ProposalResource.filter({
          title: data.title,
          resource_type: data.data_type,
          organization_id: null
        });

        if (existing.length > 0) {
          results.skipped++;
          continue;
        }

        // Migrate to ProposalResource
        await base44.asServiceRole.entities.ProposalResource.create({
          organization_id: null, // System-wide resource
          folder_id: data.folder_id,
          resource_type: data.data_type,
          title: data.title,
          description: data.category || '',
          boilerplate_content: data.content,
          file_url: data.file_url,
          tags: [],
          entity_type: 'system',
          is_public: data.is_public !== false,
          is_proprietary: data.is_proprietary || false,
          version: data.version
        });

        results.migrated++;
      } catch (error) {
        results.errors.push({
          admin_data_id: data.id,
          title: data.title,
          error: error.message
        });
      }
    }

    console.log('[Migration] Complete:', results);

    return Response.json({
      success: true,
      message: 'AdminData migration completed',
      results
    });

  } catch (error) {
    console.error('[Migration] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});