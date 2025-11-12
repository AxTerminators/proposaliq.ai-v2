import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Validate Client Portal Access Token
 * Allows external clients to access proposals without authentication
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({
        success: false,
        error: 'Token is required'
      }, { status: 400 });
    }

    // Find organization with this access token
    const clientOrgs = await base44.asServiceRole.entities.Organization.filter({
      organization_type: 'client_organization'
    });

    // Search for matching token in custom_branding
    const matchingOrg = clientOrgs.find(org => {
      const portalToken = org.custom_branding?.portal_access_token;
      return portalToken === token;
    });

    if (!matchingOrg) {
      return Response.json({
        success: false,
        error: 'Invalid or expired access token'
      }, { status: 401 });
    }

    // Check if token has expired
    if (matchingOrg.custom_branding?.token_expires_at) {
      const expiresAt = new Date(matchingOrg.custom_branding.token_expires_at);
      if (expiresAt < new Date()) {
        return Response.json({
          success: false,
          error: 'Access token has expired. Please request a new link from your consultant.'
        }, { status: 401 });
      }
    }

    // Track access
    try {
      await base44.asServiceRole.entities.Organization.update(matchingOrg.id, {
        custom_branding: {
          ...matchingOrg.custom_branding,
          last_portal_access: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error tracking portal access:', error);
    }

    return Response.json({
      success: true,
      client_organization: matchingOrg,
      consulting_firm_id: matchingOrg.parent_organization_id
    });

  } catch (error) {
    console.error('[validateClientPortalToken] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});