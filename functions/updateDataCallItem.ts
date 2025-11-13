import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { token, data_call_id, checklist_items } = await req.json();

    if (!token || !data_call_id || !checklist_items) {
      return Response.json({
        success: false,
        error: 'Token, data_call_id, and checklist_items are required'
      }, { status: 400 });
    }

    // Fetch and validate token
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

    // Update the data call request
    const updated = await base44.asServiceRole.entities.DataCallRequest.update(data_call_id, {
      checklist_items
    });

    return Response.json({
      success: true,
      data_call: updated
    });

  } catch (error) {
    console.error('[updateDataCallItem] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});