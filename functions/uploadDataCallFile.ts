import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const formData = await req.formData();
    const token = formData.get('token');
    const data_call_id = formData.get('data_call_id');
    const item_id = formData.get('item_id');
    const file = formData.get('file');

    if (!token || !data_call_id || !item_id || !file) {
      return Response.json({
        success: false,
        error: 'Token, data_call_id, item_id, and file are required'
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

    // Upload file
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    // Create ClientUploadedFile record
    const uploadedFile = await base44.asServiceRole.entities.ClientUploadedFile.create({
      organization_id: dataCall.client_organization_id || dataCall.organization_id,
      proposal_id: dataCall.proposal_id,
      consulting_firm_id: dataCall.organization_id,
      data_call_request_id: dataCall.id,
      data_call_item_id: item_id,
      file_name: file.name,
      file_url,
      file_size: file.size,
      file_type: file.type,
      file_category: "data_call_response",
      uploaded_by_email: dataCall.assigned_to_email,
      uploaded_by_name: dataCall.assigned_to_name
    });

    // Update checklist item with uploaded file
    const updatedItems = dataCall.checklist_items.map(item => {
      if (item.id === item_id) {
        return {
          ...item,
          uploaded_files: [...(item.uploaded_files || []), uploadedFile.id],
          status: 'completed',
          completed_date: new Date().toISOString(),
          completed_by: dataCall.assigned_to_email
        };
      }
      return item;
    });

    const updated = await base44.asServiceRole.entities.DataCallRequest.update(data_call_id, {
      checklist_items: updatedItems
    });

    return Response.json({
      success: true,
      uploaded_file: uploadedFile,
      data_call: updated
    });

  } catch (error) {
    console.error('[uploadDataCallFile] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});