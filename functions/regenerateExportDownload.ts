import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { exportHistoryId } = await req.json();

    if (!exportHistoryId) {
      return Response.json({ 
        error: 'Missing required parameter: exportHistoryId' 
      }, { status: 400 });
    }

    // Fetch export history record
    const exportRecords = await base44.asServiceRole.entities.ExportHistory.filter({
      id: exportHistoryId
    });

    if (!exportRecords || exportRecords.length === 0) {
      return Response.json({ error: 'Export record not found' }, { status: 404 });
    }

    const exportRecord = exportRecords[0];

    // Verify user has access to this organization's data
    if (exportRecord.organization_id !== user.organization_id && user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // Check if file still exists in storage
    if (!exportRecord.file_uri) {
      return Response.json({ 
        error: 'File no longer available in storage',
        details: 'Please generate a new export'
      }, { status: 404 });
    }

    // Generate new signed URL (valid for 7 days)
    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
    const signedUrlResult = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri: exportRecord.file_uri,
      expires_in: expiresIn
    });

    if (!signedUrlResult || !signedUrlResult.signed_url) {
      return Response.json({ 
        error: 'Failed to generate download link'
      }, { status: 500 });
    }

    const newExpiryDate = new Date();
    newExpiryDate.setSeconds(newExpiryDate.getSeconds() + expiresIn);

    // Update export record with new URL and expiry
    await base44.asServiceRole.entities.ExportHistory.update(exportHistoryId, {
      download_url: signedUrlResult.signed_url,
      expires_at: newExpiryDate.toISOString()
    });

    return Response.json({
      success: true,
      download_url: signedUrlResult.signed_url,
      expires_at: newExpiryDate.toISOString(),
      file_name: exportRecord.file_name
    });

  } catch (error) {
    console.error('Regenerate download error:', error);
    return Response.json({ 
      error: 'Failed to regenerate download link',
      details: error.message 
    }, { status: 500 });
  }
});