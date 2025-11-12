import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Generate Client Portal Access Link
 * Creates a secure token for client access
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_organization_id, expiration_days = 90 } = await req.json();

    if (!client_organization_id) {
      return Response.json({
        success: false,
        error: 'client_organization_id is required'
      }, { status: 400 });
    }

    // Get client organization
    const clientOrgs = await base44.asServiceRole.entities.Organization.filter({
      id: client_organization_id,
      organization_type: 'client_organization'
    });

    if (clientOrgs.length === 0) {
      return Response.json({
        success: false,
        error: 'Client organization not found'
      }, { status: 404 });
    }

    const clientOrg = clientOrgs[0];

    // Verify user has access to manage this client
    const consultingFirms = await base44.asServiceRole.entities.Organization.filter({
      id: clientOrg.parent_organization_id
    });

    if (consultingFirms.length === 0) {
      return Response.json({
        success: false,
        error: 'Parent consulting firm not found'
      }, { status: 404 });
    }

    const consultingFirm = consultingFirms[0];

    // Check if user has access to the consulting firm
    const hasAccess = user.client_accesses?.some(
      acc => acc.organization_id === consultingFirm.id
    ) || user.email === consultingFirm.created_by;

    if (!hasAccess) {
      return Response.json({
        success: false,
        error: 'You do not have permission to generate links for this client'
      }, { status: 403 });
    }

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiration_days);

    // Store token in client organization
    await base44.asServiceRole.entities.Organization.update(clientOrg.id, {
      custom_branding: {
        ...(clientOrg.custom_branding || {}),
        portal_access_token: token,
        token_expires_at: expiresAt.toISOString(),
        token_created_by: user.email,
        token_created_date: new Date().toISOString()
      }
    });

    // Generate portal URL
    const baseUrl = req.headers.get('origin') || 'https://app.base44.com';
    const portalUrl = `${baseUrl}/app/ClientPortalView?token=${token}`;

    return Response.json({
      success: true,
      portal_url: portalUrl,
      token: token,
      expires_at: expiresAt.toISOString(),
      client_organization: clientOrg
    });

  } catch (error) {
    console.error('[generateClientPortalLink] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});