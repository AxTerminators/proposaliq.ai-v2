import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token, data_call_id } = await req.json();

    if (!token || !data_call_id) {
      return Response.json({
        success: false,
        error: 'Token and data_call_id are required'
      }, { status: 400 });
    }

    // Fetch the data call request using service role (no auth required)
    const dataCallRequests = await base44.asServiceRole.entities.DataCallRequest.filter({
      id: data_call_id
    });

    if (dataCallRequests.length === 0) {
      return Response.json({
        success: false,
        error: 'Data call request not found'
      }, { status: 404 });
    }

    const dataCall = dataCallRequests[0];

    // Validate token
    if (dataCall.access_token !== token) {
      return Response.json({
        success: false,
        error: 'Invalid access token'
      }, { status: 403 });
    }

    // Check expiration
    if (dataCall.token_expires_at && new Date(dataCall.token_expires_at) < new Date()) {
      return Response.json({
        success: false,
        error: 'Access token has expired'
      }, { status: 403 });
    }

    // Track access
    await base44.asServiceRole.entities.DataCallRequest.update(dataCall.id, {
      portal_accessed_count: (dataCall.portal_accessed_count || 0) + 1,
      last_portal_access: new Date().toISOString()
    });

    return Response.json({
      success: true,
      data_call: dataCall
    });

  } catch (error) {
    console.error('[validateDataCallToken] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});