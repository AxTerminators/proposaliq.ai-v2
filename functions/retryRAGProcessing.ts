/**
 * Retry RAG Processing for a Failed Resource
 * 
 * Input: { resource_id: string }
 * Output: { success: boolean, message: string }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resource_id } = await req.json();

    if (!resource_id) {
      return Response.json({ error: 'resource_id is required' }, { status: 400 });
    }

    // Get the resource
    const resources = await base44.entities.ProposalResource.filter({ id: resource_id });
    
    if (!resources || resources.length === 0) {
      return Response.json({ error: 'Resource not found' }, { status: 404 });
    }

    const resource = resources[0];

    // Reset RAG status flags
    await base44.entities.ProposalResource.update(resource_id, {
      rag_failed: false,
      rag_processing: true,
      rag_ready: false,
    });

    // Call the RAG ingestion function
    const ragResult = await base44.functions.invoke('ingestDocumentToRAG', {
      file_url: resource.file_url,
      entity_type: 'ProposalResource',
      entity_id: resource_id,
      organization_id: resource.organization_id,
    });

    if (ragResult.data?.success) {
      await base44.entities.ProposalResource.update(resource_id, {
        rag_processing: false,
        rag_ready: true,
        rag_failed: false,
      });

      return Response.json({
        success: true,
        message: 'RAG processing restarted successfully'
      });
    } else {
      await base44.entities.ProposalResource.update(resource_id, {
        rag_processing: false,
        rag_ready: false,
        rag_failed: true,
      });

      return Response.json({
        success: false,
        message: ragResult.data?.error || 'RAG processing failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error retrying RAG processing:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});