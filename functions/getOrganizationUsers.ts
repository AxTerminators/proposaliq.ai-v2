import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organization_id } = await req.json();

    if (!organization_id) {
      return Response.json({
        success: false,
        error: 'organization_id is required'
      }, { status: 400 });
    }

    // Get all users with access to this organization
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    const usersWithAccess = allUsers.filter(u => {
      if (!u.client_accesses) return false;
      return u.client_accesses.some(access => access.organization_id === organization_id);
    });

    return Response.json({
      success: true,
      users: usersWithAccess
    });

  } catch (error) {
    console.error('Error getting organization users:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});