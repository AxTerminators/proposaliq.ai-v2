import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * SPRINT 6: Migrate ActivityLog and AuditLog to SystemLog
 * 
 * This function consolidates legacy log entities into the new SystemLog entity.
 * Run once during deployment to migrate existing data.
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
      activityLogs: { migrated: 0, skipped: 0, errors: [] },
      auditLogs: { migrated: 0, skipped: 0, errors: [] }
    };

    // Migrate ActivityLog records
    console.log('[Migration] Starting ActivityLog migration...');
    const activityLogs = await base44.asServiceRole.entities.ActivityLog.list();
    
    for (const log of activityLogs) {
      try {
        // Check if already migrated
        const existing = await base44.asServiceRole.entities.SystemLog.filter({
          entity_type: log.proposal_id ? 'proposal' : 'unknown',
          entity_id: log.proposal_id || log.section_id || log.related_entity_id,
          actor_email: log.user_email,
          action_type: log.action_type,
          created_date: log.created_date
        });

        if (existing.length > 0) {
          results.activityLogs.skipped++;
          continue;
        }

        // Migrate to SystemLog
        await base44.asServiceRole.entities.SystemLog.create({
          organization_id: null, // ActivityLog didn't have org_id
          log_type: 'activity',
          entity_type: log.proposal_id ? 'proposal' : (log.section_id ? 'section' : 'unknown'),
          entity_id: log.proposal_id || log.section_id || log.related_entity_id,
          actor_email: log.user_email,
          actor_name: log.user_name,
          actor_role: null,
          action_type: log.action_type,
          action_description: log.action_description,
          metadata: log.metadata || {},
          success: true,
          severity: 'info'
        });

        results.activityLogs.migrated++;
      } catch (error) {
        results.activityLogs.errors.push({
          log_id: log.id,
          error: error.message
        });
      }
    }

    // Migrate AuditLog records
    console.log('[Migration] Starting AuditLog migration...');
    const auditLogs = await base44.asServiceRole.entities.AuditLog.list();
    
    for (const log of auditLogs) {
      try {
        // Check if already migrated
        const existing = await base44.asServiceRole.entities.SystemLog.filter({
          actor_email: log.admin_email,
          action_type: log.action_type,
          created_date: log.created_date
        });

        if (existing.length > 0) {
          results.auditLogs.skipped++;
          continue;
        }

        // Parse details if string
        let details = {};
        try {
          details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details || {};
        } catch (e) {
          // Ignore parse errors
        }

        // Migrate to SystemLog
        await base44.asServiceRole.entities.SystemLog.create({
          organization_id: null,
          log_type: 'audit',
          entity_type: 'system',
          entity_id: log.target_entity,
          actor_email: log.admin_email,
          actor_name: log.admin_role,
          actor_role: log.admin_role,
          action_type: log.action_type,
          action_description: log.action_type.replace(/_/g, ' '),
          metadata: details,
          ip_address: log.ip_address,
          success: log.success !== false,
          severity: log.success === false ? 'error' : 'info'
        });

        results.auditLogs.migrated++;
      } catch (error) {
        results.auditLogs.errors.push({
          log_id: log.id,
          error: error.message
        });
      }
    }

    console.log('[Migration] Complete:', results);

    return Response.json({
      success: true,
      message: 'Migration completed',
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