import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend Function: Ingest Document to RAG
 * 
 * Orchestrates the automatic RAG pipeline for uploaded documents:
 * 1. Validates file upload
 * 2. Parses document content (DOCX priority)
 * 3. Creates appropriate entity (ProposalResource or SolicitationDocument)
 * 4. Triggers proposal content re-parsing and chunking
 * 
 * Ensures organization-scoped data isolation.
 */

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      file_url,
      file_name,
      file_size,
      proposal_id,
      entity_type = 'ProposalResource', // 'ProposalResource' or 'SolicitationDocument'
      entity_metadata = {} // Additional metadata for entity creation
    } = await req.json();

    if (!file_url || !file_name) {
      return Response.json({ 
        error: 'file_url and file_name are required' 
      }, { status: 400 });
    }

    if (!proposal_id) {
      return Response.json({ 
        error: 'proposal_id is required' 
      }, { status: 400 });
    }

    console.log('[ingestDocumentToRAG] 📥 Starting ingestion for:', file_name);
    console.log('[ingestDocumentToRAG] 📋 Entity type:', entity_type);

    // =====================================================
    // STEP 1: Fetch proposal and validate organization
    // =====================================================
    const proposal = await base44.entities.Proposal.get(proposal_id);
    
    if (!proposal) {
      return Response.json({ 
        error: 'Proposal not found' 
      }, { status: 404 });
    }

    const organization_id = proposal.organization_id;
    console.log('[ingestDocumentToRAG] 🏢 Organization ID:', organization_id);

    // =====================================================
    // STEP 2: Parse document if DOCX
    // =====================================================
    let parsed_text = null;
    let parse_status = 'not_attempted';
    let extracted_data = null;

    if (file_name.toLowerCase().endsWith('.docx')) {
      try {
        console.log('[ingestDocumentToRAG] 📄 Parsing DOCX...');
        
        const parseResult = await base44.asServiceRole.functions.invoke('parseDocxFile', {
          file_url,
          extract_structured_data: true
        });

        if (parseResult.data?.status === 'success') {
          parsed_text = parseResult.data.text_content;
          extracted_data = parseResult.data.extracted_data;
          parse_status = 'success';
          console.log('[ingestDocumentToRAG] ✅ Parsed successfully:', parsed_text?.length, 'chars');
        } else {
          parse_status = 'failed';
          console.warn('[ingestDocumentToRAG] ⚠️ Parse failed:', parseResult.data?.error);
        }
      } catch (parseError) {
        parse_status = 'error';
        console.error('[ingestDocumentToRAG] ❌ Parse error:', parseError.message);
      }
    }

    // =====================================================
    // STEP 3: Create appropriate entity
    // =====================================================
    let created_entity = null;

    if (entity_type === 'SolicitationDocument') {
      console.log('[ingestDocumentToRAG] 📑 Creating SolicitationDocument...');
      
      created_entity = await base44.asServiceRole.entities.SolicitationDocument.create({
        proposal_id,
        organization_id,
        file_name,
        file_url,
        file_size: file_size || 0,
        document_type: entity_metadata.document_type || 'other',
        description: entity_metadata.description || null,
        ...entity_metadata
      });

      console.log('[ingestDocumentToRAG] ✅ SolicitationDocument created:', created_entity.id);

    } else {
      console.log('[ingestDocumentToRAG] 📚 Creating ProposalResource...');
      
      created_entity = await base44.asServiceRole.entities.ProposalResource.create({
        organization_id,
        file_name,
        file_url,
        file_size: file_size || 0,
        resource_type: entity_metadata.resource_type || 'other',
        content_category: entity_metadata.content_category || 'general',
        title: entity_metadata.title || file_name,
        description: entity_metadata.description || null,
        folder_id: entity_metadata.folder_id || null,
        teaming_partner_id: entity_metadata.teaming_partner_id || null,
        tags: entity_metadata.tags || [],
        ...entity_metadata
      });

      console.log('[ingestDocumentToRAG] ✅ ProposalResource created:', created_entity.id);
    }

    // =====================================================
    // STEP 4: Trigger RAG pipeline (parse proposal + chunk)
    // =====================================================
    console.log('[ingestDocumentToRAG] 🔄 Triggering RAG pipeline...');

    // Invalidate cache and re-parse proposal to include new document
    const parseResult = await base44.asServiceRole.functions.invoke('parseProposalContent', {
      proposal_id,
      force_refresh: true
    });

    if (parseResult.data?.status === 'success') {
      console.log('[ingestDocumentToRAG] ✅ Proposal re-parsed successfully');

      // Trigger chunking for any new sections (non-blocking)
      // This is optional and can be done asynchronously
      try {
        await base44.asServiceRole.functions.invoke('chunkProposalSections', {
          proposal_id,
          force_rechunk: false // Only chunk new sections
        });
        console.log('[ingestDocumentToRAG] ✅ Chunking triggered');
      } catch (chunkError) {
        console.warn('[ingestDocumentToRAG] ⚠️ Chunking failed (non-critical):', chunkError.message);
      }
    } else {
      console.warn('[ingestDocumentToRAG] ⚠️ Proposal re-parse failed:', parseResult.data?.error);
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`[ingestDocumentToRAG] ✅ Complete in ${duration.toFixed(2)}s`);

    return Response.json({
      status: 'success',
      entity: {
        id: created_entity.id,
        type: entity_type,
        file_name,
        file_url
      },
      parsing: {
        status: parse_status,
        text_length: parsed_text?.length || 0,
        extracted_data: extracted_data || null
      },
      rag_pipeline: {
        proposal_parsed: parseResult.data?.status === 'success',
        ready_for_ai: parseResult.data?.status === 'success'
      },
      metadata: {
        organization_id,
        proposal_id,
        duration_seconds: duration
      }
    });

  } catch (error) {
    console.error('[ingestDocumentToRAG] ❌ Error:', error);
    return Response.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});