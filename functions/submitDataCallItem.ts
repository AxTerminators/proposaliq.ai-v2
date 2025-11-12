import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const {
      data_call_request_id,
      item_id,
      file_url,
      file_name,
      file_size,
      submitted_by_email,
      token
    } = await req.json();

    if (!data_call_request_id || !item_id || !file_url || !token) {
      return Response.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Verify token
    const requests = await base44.asServiceRole.entities.DataCallRequest.filter({
      id: data_call_request_id,
      access_token: token
    });

    if (requests.length === 0) {
      return Response.json({
        success: false,
        error: 'Invalid access token'
      }, { status: 403 });
    }

    const dataCallRequest = requests[0];

    // Create uploaded file record
    const uploadedFile = await base44.asServiceRole.entities.ClientUploadedFile.create({
      organization_id: dataCallRequest.recipient_organization_id || dataCallRequest.organization_id,
      proposal_id: dataCallRequest.proposal_id,
      consulting_firm_id: dataCallRequest.organization_id,
      data_call_request_id: dataCallRequest.id,
      data_call_item_id: item_id,
      file_name,
      file_url,
      file_size,
      file_category: 'data_call_response',
      uploaded_by_email: submitted_by_email,
      uploaded_by_name: dataCallRequest.assigned_to_name,
      viewed_by_consultant: false
    });

    // Update checklist item
    const updatedItems = dataCallRequest.checklist_items.map(item => {
      if (item.id === item_id) {
        return {
          ...item,
          submitted: true,
          submitted_file_ids: [...(item.submitted_file_ids || []), uploadedFile.id],
          submitted_date: new Date().toISOString(),
          submitted_by_email
        };
      }
      return item;
    });

    // Calculate completion percentage
    const totalItems = dataCallRequest.checklist_items.length;
    const submittedItems = updatedItems.filter(i => i.submitted).length;
    const completion_percentage = Math.round((submittedItems / totalItems) * 100);

    // Update data call request
    await base44.asServiceRole.entities.DataCallRequest.update(data_call_request_id, {
      checklist_items: updatedItems,
      completion_percentage
    });

    return Response.json({
      success: true,
      uploaded_file: uploadedFile,
      completion_percentage
    });

  } catch (error) {
    console.error('Error submitting data call item:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});