import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Push Resource to Client Organization
 * Copies a resource from consulting_firm to client_organization
 * Creates a ResourceShare record to track the relationship
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const {
      source_organization_id,
      target_organization_id,
      resource_type,
      source_resource_id,
      share_type = 'copy',
      auto_sync = false
    } = payload;

    if (!source_organization_id || !target_organization_id || !resource_type || !source_resource_id) {
      return Response.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Fetch the source resource
    let sourceResource;
    let targetResource;
    
    switch (resource_type) {
      case 'proposal_resource':
        const resources = await base44.asServiceRole.entities.ProposalResource.filter({
          id: source_resource_id
        });
        if (resources.length === 0) {
          return Response.json({ success: false, error: 'Resource not found' }, { status: 404 });
        }
        sourceResource = resources[0];
        
        // Create copy in target organization
        const { id: _id, created_date: _cd, updated_date: _ud, created_by: _cb, ...resourceData } = sourceResource;
        targetResource = await base44.asServiceRole.entities.ProposalResource.create({
          ...resourceData,
          organization_id: target_organization_id,
          usage_count: 0,
          last_used_date: null
        });
        break;

      case 'past_performance':
        const perfRecords = await base44.asServiceRole.entities.PastPerformance.filter({
          id: source_resource_id
        });
        if (perfRecords.length === 0) {
          return Response.json({ success: false, error: 'Past performance not found' }, { status: 404 });
        }
        sourceResource = perfRecords[0];
        
        const { id: _pid, created_date: _pcd, updated_date: _pud, created_by: _pcb, ...perfData } = sourceResource;
        targetResource = await base44.asServiceRole.entities.PastPerformance.create({
          ...perfData,
          organization_id: target_organization_id,
          usage_count: 0
        });
        break;

      case 'key_personnel':
        const personnel = await base44.asServiceRole.entities.KeyPersonnel.filter({
          id: source_resource_id
        });
        if (personnel.length === 0) {
          return Response.json({ success: false, error: 'Personnel not found' }, { status: 404 });
        }
        sourceResource = personnel[0];
        
        const { id: _kpid, created_date: _kpcd, updated_date: _kpud, created_by: _kpcb, ...kpData } = sourceResource;
        targetResource = await base44.asServiceRole.entities.KeyPersonnel.create({
          ...kpData,
          organization_id: target_organization_id,
          usage_count: 0
        });
        break;

      case 'teaming_partner':
        const partners = await base44.asServiceRole.entities.TeamingPartner.filter({
          id: source_resource_id
        });
        if (partners.length === 0) {
          return Response.json({ success: false, error: 'Partner not found' }, { status: 404 });
        }
        sourceResource = partners[0];
        
        const { id: _tpid, created_date: _tpcd, updated_date: _tpud, created_by: _tpcb, ...tpData } = sourceResource;
        targetResource = await base44.asServiceRole.entities.TeamingPartner.create({
          ...tpData,
          organization_id: target_organization_id,
          total_collaborations: 0
        });
        break;

      default:
        return Response.json({
          success: false,
          error: `Unsupported resource type: ${resource_type}`
        }, { status: 400 });
    }

    // Create ResourceShare tracking record
    await base44.asServiceRole.entities.ResourceShare.create({
      source_organization_id,
      target_organization_id,
      resource_type,
      source_resource_id,
      target_resource_id: targetResource.id,
      share_type,
      auto_sync_enabled: auto_sync,
      shared_by_email: user.email,
      shared_by_name: user.full_name || user.email,
      share_notes: `Shared via Global Resource Library`,
      is_active: true,
      client_modified: false
    });

    return Response.json({
      success: true,
      message: 'Resource pushed to client organization successfully',
      source_resource_id,
      target_resource_id: targetResource.id,
      share_type
    });

  } catch (error) {
    console.error('[pushResourceToClient] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});