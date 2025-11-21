import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Specialized RAG ingestion for supplementary solicitation documents
 * Handles version prioritization, amendment sequencing, and metadata tagging
 * 
 * Input:
 * {
 *   solicitation_doc_id: string,
 *   priority_boost: number (0-100, optional - default calculated from type/version)
 * }
 * 
 * Output:
 * {
 *   success: boolean,
 *   message: string,
 *   rag_metadata: object
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { solicitation_doc_id, priority_boost } = await req.json();

    if (!solicitation_doc_id) {
      return Response.json(
        { error: 'solicitation_doc_id is required' },
        { status: 400 }
      );
    }

    // Fetch the document
    const docs = await base44.entities.SolicitationDocument.filter({ id: solicitation_doc_id });
    if (!docs || docs.length === 0) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    const doc = docs[0];

    // Calculate priority score based on document characteristics
    let calculatedPriority = 50; // Base priority

    // Supplementary documents get higher base priority
    if (doc.is_supplementary) {
      calculatedPriority = 70;

      // Type-specific priorities
      if (doc.supplementary_type === 'amendment') {
        calculatedPriority = 90; // Amendments are critical
      } else if (doc.supplementary_type === 'q_a_response') {
        calculatedPriority = 95; // Q&As are highest priority
      } else if (doc.supplementary_type === 'sow' || doc.supplementary_type === 'pws') {
        calculatedPriority = 85; // SOWs are very important
      } else if (doc.supplementary_type === 'clarification') {
        calculatedPriority = 80;
      }

      // Latest version boost
      if (doc.is_latest_version) {
        calculatedPriority += 5;
      }

      // Amendment number boost (higher amendments = more recent)
      if (doc.amendment_number) {
        const amendmentNum = parseInt(doc.amendment_number);
        if (!isNaN(amendmentNum)) {
          calculatedPriority += Math.min(amendmentNum * 2, 10); // Cap at +10
        }
      }
    } else {
      // Base solicitation documents
      calculatedPriority = 60;
      
      if (doc.document_type === 'rfp' || doc.document_type === 'rfq') {
        calculatedPriority = 75; // Core solicitation docs
      } else if (doc.document_type === 'sow' || doc.document_type === 'pws') {
        calculatedPriority = 70;
      }
    }

    // Apply manual priority boost if provided
    if (priority_boost !== undefined && priority_boost !== null) {
      calculatedPriority = Math.min(100, calculatedPriority + priority_boost);
    }

    // Prepare RAG metadata
    const ragMetadata = {
      entity_type: 'SolicitationDocument',
      entity_id: doc.id,
      organization_id: doc.organization_id,
      proposal_id: doc.proposal_id,
      document_type: doc.document_type,
      is_supplementary: doc.is_supplementary || false,
      supplementary_type: doc.supplementary_type || null,
      parent_document_id: doc.parent_document_id || null,
      amendment_number: doc.amendment_number || null,
      is_latest_version: doc.is_latest_version || true,
      version_date: doc.version_date || doc.created_date,
      priority_score: calculatedPriority,
      file_name: doc.file_name,
      tags: [
        doc.is_supplementary ? 'supplementary_document' : 'base_solicitation',
        doc.document_type,
        doc.supplementary_type || 'primary',
        doc.is_latest_version ? 'latest_version' : 'historical_version',
        `priority_${Math.floor(calculatedPriority / 10) * 10}` // Priority bucket
      ].filter(Boolean)
    };

    // Call the Core InvokeLLM integration to parse and chunk the document
    const fileResponse = await fetch(doc.file_url);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch document file');
    }
    const fileBlob = await fileResponse.blob();

    // Use InvokeLLM to extract text content with context
    const extractionPrompt = `
Extract and structure the content from this ${doc.is_supplementary ? 'supplementary ' : ''}solicitation document.

Document Type: ${doc.supplementary_type || doc.document_type}
${doc.is_supplementary ? `This is ${doc.supplementary_type === 'amendment' ? 'an amendment that supersedes previous information' : doc.supplementary_type === 'q_a_response' ? 'a Q&A response providing clarifications' : 'a supplementary document providing additional information'}.` : ''}

Extract:
1. Key requirements and specifications
2. Changes or clarifications (if amendment/Q&A)
3. Important dates and deadlines
4. Evaluation criteria
5. Submission requirements
6. Technical specifications
7. Statement of Work details

Preserve section numbers and references for traceability.
`;

    // Upload file for LLM processing
    const uploadFormData = new FormData();
    uploadFormData.append('file', fileBlob, doc.file_name);
    
    const uploadResult = await base44.integrations.Core.UploadFile({
      file: fileBlob
    });

    if (!uploadResult?.file_url) {
      throw new Error('Failed to upload file for processing');
    }

    // Extract content using LLM
    const extractionResult = await base44.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      file_urls: [uploadResult.file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          key_requirements: { type: 'array', items: { type: 'string' } },
          changes_and_clarifications: { type: 'array', items: { type: 'string' } },
          important_dates: { type: 'array', items: { type: 'string' } },
          evaluation_criteria: { type: 'array', items: { type: 'string' } },
          submission_requirements: { type: 'array', items: { type: 'string' } },
          technical_specifications: { type: 'array', items: { type: 'string' } },
          statement_of_work: { type: 'string' },
          full_content: { type: 'string' }
        }
      }
    });

    // Update document with RAG status
    await base44.entities.SolicitationDocument.update(doc.id, {
      rag_status: 'completed',
      rag_ingested: true,
      rag_ingestion_date: new Date().toISOString(),
      extracted_data: JSON.stringify({
        ...extractionResult,
        rag_metadata: ragMetadata
      })
    });

    return Response.json({
      success: true,
      message: `Successfully ingested ${doc.is_supplementary ? 'supplementary ' : ''}document with priority score ${calculatedPriority}`,
      rag_metadata: ragMetadata,
      extraction_summary: {
        key_requirements_count: extractionResult.key_requirements?.length || 0,
        changes_count: extractionResult.changes_and_clarifications?.length || 0,
        dates_count: extractionResult.important_dates?.length || 0
      }
    });

  } catch (error) {
    console.error('Error ingesting supplementary document to RAG:', error);
    
    // Update document with failed status
    try {
      const { solicitation_doc_id } = await req.json();
      if (solicitation_doc_id) {
        const base44 = createClientFromRequest(req);
        await base44.entities.SolicitationDocument.update(solicitation_doc_id, {
          rag_status: 'failed',
          rag_ingested: false
        });
      }
    } catch (updateError) {
      console.error('Failed to update document status:', updateError);
    }

    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});