import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { nanoid } from 'npm:nanoid@5.0.4';

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

    // Verify the organization exists and is a client_organization
    const orgs = await base44.asServiceRole.entities.Organization.filter({
      id: client_organization_id
    });

    if (orgs.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'Organization not found' 
      }, { status: 404 });
    }

    const clientOrg = orgs[0];

    // Generate secure access token
    const access_token = nanoid(32);
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + expiration_days);

    // Update organization with new token
    await base44.asServiceRole.entities.Organization.update(client_organization_id, {
      custom_branding: {
        ...clientOrg.custom_branding,
        portal_access_token: access_token,
        portal_token_expires_at: expires_at.toISOString()
      }
    });

    // Generate portal URL
    const baseUrl = Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com';
    const portal_url = `${baseUrl}/client-portal?token=${access_token}&org=${client_organization_id}`;

    return Response.json({
      success: true,
      portal_url,
      access_token,
      expires_at: expires_at.toISOString(),
      organization_name: clientOrg.organization_name
    });

  } catch (error) {
    console.error('Error generating portal link:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});