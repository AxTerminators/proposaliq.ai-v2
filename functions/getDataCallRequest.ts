import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, organization_id } = await req.json();

    if (!token) {
      return Response.json({
        success: false,
        error: 'Access token is required'
      }, { status: 400 });
    }

    // Find data call request by token
    const requests = await base44.asServiceRole.entities.DataCallRequest.filter({
      access_token: token
    });

    if (requests.length === 0) {
      return Response.json({
        success: false,
        error: 'Invalid or expired access token'
      }, { status: 404 });
    }

    const dataCallRequest = requests[0];

    // Check if token is expired
    if (dataCallRequest.token_expires_at && new Date(dataCallRequest.token_expires_at) < new Date()) {
      return Response.json({
        success: false,
        error: 'Access token has expired'
      }, { status: 403 });
    }

    // Update first_accessed_date if this is the first access
    if (!dataCallRequest.first_accessed_date) {
      await base44.asServiceRole.entities.DataCallRequest.update(dataCallRequest.id, {
        first_accessed_date: new Date().toISOString(),
        status: dataCallRequest.status === 'sent' ? 'in_progress' : dataCallRequest.status
      });
      dataCallRequest.first_accessed_date = new Date().toISOString();
      if (dataCallRequest.status === 'sent') {
        dataCallRequest.status = 'in_progress';
      }
    }

    return Response.json({
      success: true,
      data_call_request: dataCallRequest
    });

  } catch (error) {
    console.error('Error getting data call request:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});