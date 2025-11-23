import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Unified RAG Ingestion Function
 * Handles ingestion of documents into the RAG system
 * Supports: ProposalResource, SolicitationDocument, PastPerformanceRecord
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_type, entity_id, organization_id } = await req.json();

    if (!entity_type || !entity_id) {
      return Response.json(
        { error: 'entity_type and entity_id are required' },
        { status: 400 }
      );
    }

    // Validate entity_type
    const validEntityTypes = ['ProposalResource', 'SolicitationDocument', 'PastPerformanceRecord'];
    if (!validEntityTypes.includes(entity_type)) {
      return Response.json(
        { error: `Invalid entity_type. Must be one of: ${validEntityTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Fetch the entity
    const entities = await base44.asServiceRole.entities[entity_type].filter({ id: entity_id });
    if (entities.length === 0) {
      return Response.json({ error: `${entity_type} not found` }, { status: 404 });
    }

    const entity = entities[0];

    // Verify organization access
    if (entity.organization_id !== organization_id) {
      return Response.json({ error: 'Organization mismatch' }, { status: 403 });
    }

    // Update status to processing
    await base44.asServiceRole.entities[entity_type].update(entity_id, {
      rag_status: 'processing'
    });

    try {
      // Get file URL based on entity type
      let fileUrl;
      if (entity_type === 'PastPerformanceRecord') {
        fileUrl = entity.document_url || entity.file_url;
      } else {
        fileUrl = entity.file_url;
      }

      if (!fileUrl) {
        throw new Error('No file URL found for this entity');
      }

      // Call Core.InvokeLLM with file for ingestion
      // This simulates RAG ingestion - in production you'd use a vector DB
      const ingestionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Extract and summarize the key information from this document for retrieval purposes. 
                 Entity Type: ${entity_type}
                 Document Title: ${entity.title || entity.file_name || 'Untitled'}`,
        file_urls: [fileUrl]
      });

      // Update entity with completion status
      await base44.asServiceRole.entities[entity_type].update(entity_id, {
        rag_status: 'completed',
        rag_ingested: true,
        rag_ingestion_date: new Date().toISOString(),
        extracted_data: JSON.stringify({
          summary: ingestionResult,
          ingested_at: new Date().toISOString(),
          file_url: fileUrl
        })
      });

      console.log(`[RAG] ✅ Successfully ingested ${entity_type} ${entity_id}`);

      return Response.json({
        success: true,
        message: `${entity_type} successfully ingested into RAG system`,
        entity_id,
        entity_type,
        rag_status: 'completed'
      });

    } catch (ingestionError) {
      console.error(`[RAG] ❌ Ingestion failed for ${entity_type} ${entity_id}:`, ingestionError);
      
      // Update status to failed
      await base44.asServiceRole.entities[entity_type].update(entity_id, {
        rag_status: 'failed',
        extracted_data: JSON.stringify({
          error: ingestionError.message,
          failed_at: new Date().toISOString()
        })
      });

      return Response.json({
        success: false,
        error: ingestionError.message,
        entity_id,
        entity_type,
        rag_status: 'failed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[RAG] ❌ Request error:', error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
});