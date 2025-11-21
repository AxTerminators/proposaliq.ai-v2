import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Upload and process a resource file with optional RAG ingestion and data extraction
 * 
 * Handles:
 * 1. File upload to storage
 * 2. AI data extraction (if requested)
 * 3. RAG system ingestion (if requested)
 * 4. Creating ProposalResource entity
 * 
 * Input:
 * {
 *   file: File (binary),
 *   title: string,
 *   description: string,
 *   resource_type: string,
 *   tags: string[],
 *   organization_id: string,
 *   proposal_id: string (optional),
 *   ingest_to_rag: boolean,
 *   extract_key_data: boolean,
 *   extraction_fields_description: string (optional)
 * }
 * 
 * Output:
 * {
 *   success: boolean,
 *   resource_id: string,
 *   file_url: string,
 *   extracted_data: object (if extraction was requested),
 *   rag_status: string
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file');
    const title = formData.get('title');
    const description = formData.get('description');
    const resourceType = formData.get('resource_type');
    const tagsJson = formData.get('tags');
    const organizationId = formData.get('organization_id');
    const proposalId = formData.get('proposal_id');
    const ingestToRag = formData.get('ingest_to_rag') === 'true';
    const extractKeyData = formData.get('extract_key_data') === 'true';
    const extractionFieldsDescription = formData.get('extraction_fields_description');
    
    // Supplementary document fields
    const isSupplementary = formData.get('is_supplementary') === 'true';
    const supplementaryType = formData.get('supplementary_type');
    const parentDocumentId = formData.get('parent_document_id');
    const amendmentNumber = formData.get('amendment_number');
    const versionDate = formData.get('version_date');

    // Validate required fields
    if (!file || !title || !resourceType || !organizationId) {
      return Response.json(
        { error: 'file, title, resource_type, and organization_id are required' },
        { status: 400 }
      );
    }

    const tags = tagsJson ? JSON.parse(tagsJson) : [];

    // Step 1: Upload file to storage
    console.log('Step 1: Uploading file to storage...');
    const uploadResult = await base44.integrations.Core.UploadFile({ file });
    const fileUrl = uploadResult.file_url;
    console.log('File uploaded successfully:', fileUrl);

    let extractedData = null;
    let ragStatus = 'not_requested';

    // Step 2: Extract key data if requested
    if (extractKeyData && extractionFieldsDescription) {
      console.log('Step 2: Extracting key data...');
      try {
        // Build dynamic JSON schema based on resource type and user description
        const extractionSchema = await buildExtractionSchema(
          base44,
          resourceType,
          extractionFieldsDescription
        );

        const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: fileUrl,
          json_schema: extractionSchema
        });

        if (extractionResult.status === 'success') {
          extractedData = extractionResult.output;
          console.log('Data extracted successfully:', extractedData);
        } else {
          console.warn('Data extraction failed:', extractionResult.details);
        }
      } catch (error) {
        console.error('Error during data extraction:', error);
        // Continue despite extraction failure
      }
    }

    // Step 3: Handle version management for amendments
    if (isSupplementary && supplementaryType === 'amendment' && parentDocumentId) {
      console.log('Step 3a: Managing amendment versions...');
      try {
        // Find all existing documents linked to the same parent
        const existingDocs = await base44.asServiceRole.entities.SolicitationDocument.filter({
          parent_document_id: parentDocumentId,
          organization_id: organizationId
        });

        // Mark all existing versions as not latest
        for (const doc of existingDocs) {
          if (doc.is_latest_version) {
            await base44.asServiceRole.entities.SolicitationDocument.update(doc.id, {
              is_latest_version: false
            });
            console.log(`Marked document ${doc.id} as not latest version`);
          }
        }
      } catch (error) {
        console.error('Error managing amendment versions:', error);
        // Continue with creation despite version management error
      }
    }

    // Step 3b: Create SolicitationDocument entity (for supplementary docs) or ProposalResource
    console.log('Step 3b: Creating entity...');
    let createdResource;
    
    if (isSupplementary) {
      // Create as SolicitationDocument
      const solicitationData = {
        proposal_id: proposalId,
        organization_id: organizationId,
        document_type: resourceType === 'client_supplementary_document' ? 'other' : 'reference',
        is_supplementary: true,
        supplementary_type: supplementaryType,
        parent_document_id: parentDocumentId || null,
        amendment_number: amendmentNumber || null,
        is_latest_version: true,
        version_date: versionDate || new Date().toISOString().split('T')[0],
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        description,
        rag_status: ingestToRag ? 'pending' : 'not_requested',
        extracted_data: extractedData ? JSON.stringify(extractedData) : null,
        extraction_date: extractedData ? new Date().toISOString() : null
      };

      createdResource = await base44.asServiceRole.entities.SolicitationDocument.create(solicitationData);
      console.log('SolicitationDocument created:', createdResource.id);
    } else {
      // Create as ProposalResource (original behavior)
      const resourceData = {
        organization_id: organizationId,
        title,
        description,
        resource_type: resourceType,
        tags,
        file_name: file.name,
        file_url: fileUrl,
        file_size: file.size,
        usage_count: 0,
        linked_proposal_ids: proposalId ? [proposalId] : []
      };

      createdResource = await base44.entities.ProposalResource.create(resourceData);
      console.log('ProposalResource created:', createdResource.id);
    }

    // Step 4: Ingest into RAG system if requested
    if (ingestToRag) {
      console.log('Step 4: Ingesting into RAG system...');
      try {
        const entityType = isSupplementary ? 'SolicitationDocument' : 'ProposalResource';
        await base44.functions.invoke('ingestDocumentToRAG', {
          entity_type: entityType,
          entity_id: createdResource.id,
          file_url: fileUrl,
          title: title || file.name,
          description,
          organization_id: organizationId,
          is_supplementary: isSupplementary,
          supplementary_type: supplementaryType,
          version_date: versionDate
        });
        ragStatus = 'processing';
        
        // Update RAG status on the entity
        if (isSupplementary) {
          await base44.asServiceRole.entities.SolicitationDocument.update(createdResource.id, {
            rag_status: 'processing'
          });
        }
        
        console.log('RAG ingestion initiated');
      } catch (error) {
        console.error('Error during RAG ingestion:', error);
        ragStatus = 'failed';
        
        // Update entity with failed status
        if (isSupplementary) {
          await base44.asServiceRole.entities.SolicitationDocument.update(createdResource.id, {
            rag_status: 'failed'
          });
        }
      }
    }

    // Step 5: If this is linked to a proposal, update proposal's linked_resource_ids
    if (proposalId) {
      console.log('Step 5: Linking resource to proposal...');
      try {
        const proposals = await base44.entities.Proposal.filter({ id: proposalId });
        if (proposals && proposals.length > 0) {
          const proposal = proposals[0];
          const linkedResourceIds = proposal.linked_resource_ids || [];
          if (!linkedResourceIds.includes(createdResource.id)) {
            linkedResourceIds.push(createdResource.id);
            await base44.entities.Proposal.update(proposalId, {
              linked_resource_ids: linkedResourceIds
            });
          }
        }
      } catch (error) {
        console.error('Error linking to proposal:', error);
      }
    }

    return Response.json({
      success: true,
      resource_id: createdResource.id,
      entity_type: isSupplementary ? 'SolicitationDocument' : 'ProposalResource',
      file_url: fileUrl,
      extracted_data: extractedData,
      rag_status: ragStatus,
      is_supplementary: isSupplementary,
      supplementary_type: supplementaryType,
      parent_document_id: parentDocumentId,
      message: isSupplementary 
        ? 'Supplementary document uploaded and processed successfully' 
        : 'Resource uploaded and processed successfully'
    });

  } catch (error) {
    console.error('Error in uploadAndProcessResource:', error);
    return Response.json(
      { 
        success: false,
        error: error.message 
      },
      { status: 500 }
    );
  }
});

/**
 * Build a dynamic JSON schema for data extraction based on resource type
 */
async function buildExtractionSchema(base44, resourceType, userDescription) {
  // Define base schemas for common resource types
  const baseSchemas = {
    company_certification: {
      type: 'object',
      properties: {
        certification_name: { type: 'string', description: 'Name of the certification' },
        issuing_body: { type: 'string', description: 'Organization that issued the certification' },
        certification_number: { type: 'string', description: 'Certificate number or ID' },
        issue_date: { type: 'string', description: 'Date when certification was issued' },
        expiration_date: { type: 'string', description: 'Date when certification expires' },
        scope: { type: 'string', description: 'Scope or description of certification' }
      }
    },
    past_performance_supporting_doc: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        contract_number: { type: 'string', description: 'Contract or award number' },
        customer_agency: { type: 'string', description: 'Customer or agency name' },
        contract_value: { type: 'string', description: 'Total contract value' },
        performance_period: { type: 'string', description: 'Start and end dates' },
        key_achievements: { type: 'string', description: 'Major accomplishments' }
      }
    },
    key_personnel_document: {
      type: 'object',
      properties: {
        full_name: { type: 'string', description: 'Full name of the person' },
        current_title: { type: 'string', description: 'Current job title' },
        years_of_experience: { type: 'string', description: 'Total years of experience' },
        education: { type: 'string', description: 'Educational background' },
        certifications: { type: 'array', items: { type: 'string' }, description: 'Professional certifications' },
        key_skills: { type: 'array', items: { type: 'string' }, description: 'Core competencies' }
      }
    }
  };

  // Use base schema if available, otherwise create a generic one
  let schema = baseSchemas[resourceType];

  // If no base schema exists or user provided custom description, use AI to build schema
  if (!schema || (userDescription && userDescription.trim().length > 10)) {
    try {
      const schemaPrompt = `Based on the following description, create a JSON schema for extracting data:
      
Resource Type: ${resourceType}
Extraction Request: ${userDescription}

Return a JSON schema object (type: "object") with appropriate properties. Each property should have:
- type: the JSON type (string, number, boolean, array, object)
- description: what this field represents

Example format:
{
  "type": "object",
  "properties": {
    "field_name": {
      "type": "string",
      "description": "Description of field"
    }
  }
}`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: schemaPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            schema: {
              type: 'object',
              description: 'The generated JSON schema'
            }
          }
        }
      });

      if (aiResponse && aiResponse.schema) {
        schema = aiResponse.schema;
      }
    } catch (error) {
      console.error('Error building schema with AI:', error);
      // Fall back to generic schema
      schema = {
        type: 'object',
        properties: {
          extracted_content: {
            type: 'string',
            description: 'General extracted content'
          }
        }
      };
    }
  }

  return schema;
}