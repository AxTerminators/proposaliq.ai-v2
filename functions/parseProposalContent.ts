import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend Function: Parse Proposal Content
 * 
 * Comprehensive parser that extracts all content from a proposal including:
 * - All ProposalSection text content
 * - Linked SolicitationDocument files (with text extraction from DOCX/PDF)
 * - Linked ProposalResource files (capability statements, boilerplate)
 * - Key proposal metadata (win themes, strategy, evaluation results)
 * - Comments and discussions
 * 
 * This function is designed to create a complete knowledge base from a past proposal
 * that can be used as reference material for AI-driven content generation.
 * 
 * Usage:
 * const result = await base44.functions.invoke('parseProposalContent', {
 *   proposal_id: 'abc123'
 * });
 * 
 * Returns:
 * {
 *   status: 'success',
 *   proposal_data: {
 *     metadata: {...},
 *     sections: [{...}],
 *     documents: [{...}],
 *     resources: [{...}],
 *     comments: [{...}]
 *   },
 *   stats: {
 *     total_text_length: 45000,
 *     sections_count: 12,
 *     documents_count: 5,
 *     resources_count: 3
 *   }
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

    // Parse request
    const { proposal_id } = await req.json();

    if (!proposal_id) {
      return Response.json({ 
        error: 'proposal_id is required' 
      }, { status: 400 });
    }

    console.log('[parseProposalContent] 📖 Starting to parse proposal:', proposal_id);

    // =====================================================
    // STEP 1: Fetch the main proposal entity
    // =====================================================
    console.log('[parseProposalContent] 📋 Fetching proposal entity...');
    const proposal = await base44.entities.Proposal.get(proposal_id);
    
    if (!proposal) {
      return Response.json({ 
        error: 'Proposal not found' 
      }, { status: 404 });
    }

    // Extract key metadata that will be useful for AI context
    const metadata = {
      proposal_id: proposal.id,
      proposal_name: proposal.proposal_name,
      project_title: proposal.project_title,
      agency_name: proposal.agency_name,
      solicitation_number: proposal.solicitation_number,
      status: proposal.status,
      contract_value: proposal.contract_value,
      due_date: proposal.due_date,
      win_themes: proposal.strategy_config ? JSON.parse(proposal.strategy_config) : null,
      evaluation_results: proposal.evaluation_results ? JSON.parse(proposal.evaluation_results) : null,
      ai_confidence_score: proposal.ai_confidence_score ? JSON.parse(proposal.ai_confidence_score) : null,
      created_date: proposal.created_date,
      updated_date: proposal.updated_date
    };

    // =====================================================
    // STEP 2: Fetch all ProposalSection content
    // =====================================================
    console.log('[parseProposalContent] 📝 Fetching proposal sections...');
    const sections = await base44.entities.ProposalSection.filter(
      { proposal_id: proposal_id },
      'order'
    );

    const sectionsData = sections.map(section => ({
      id: section.id,
      section_name: section.section_name,
      section_type: section.section_type,
      content: section.content || '',
      word_count: section.word_count || 0,
      status: section.status,
      order: section.order
    }));

    // =====================================================
    // STEP 3: Fetch and parse SolicitationDocument files
    // =====================================================
    console.log('[parseProposalContent] 📄 Fetching solicitation documents...');
    const solicitationDocs = await base44.entities.SolicitationDocument.filter(
      { proposal_id: proposal_id }
    );

    const documentsData = [];
    
    for (const doc of solicitationDocs) {
      console.log(`[parseProposalContent] 📄 Processing document: ${doc.file_name}`);
      
      const docData = {
        id: doc.id,
        file_name: doc.file_name,
        document_type: doc.document_type,
        description: doc.description,
        file_url: doc.file_url,
        text_content: null,
        parse_status: 'pending'
      };

      // Parse DOCX files
      if (doc.file_name?.toLowerCase().endsWith('.docx') && doc.file_url) {
        try {
          console.log(`[parseProposalContent] 🔍 Parsing DOCX: ${doc.file_name}`);
          const parseResult = await base44.asServiceRole.functions.invoke('parseDocxFile', {
            file_url: doc.file_url,
            extract_structured_data: false
          });

          if (parseResult.data?.status === 'success') {
            docData.text_content = parseResult.data.text_content;
            docData.parse_status = 'success';
            docData.text_length = parseResult.data.text_length;
            console.log(`[parseProposalContent] ✅ Parsed ${docData.text_length} characters from ${doc.file_name}`);
          } else {
            docData.parse_status = 'error';
            docData.parse_error = parseResult.data?.error || 'Unknown parsing error';
            console.warn(`[parseProposalContent] ⚠️ Failed to parse ${doc.file_name}:`, docData.parse_error);
          }
        } catch (error) {
          docData.parse_status = 'error';
          docData.parse_error = error.message;
          console.error(`[parseProposalContent] ❌ Error parsing ${doc.file_name}:`, error);
        }
      } else {
        docData.parse_status = 'skipped';
        docData.parse_note = 'Not a DOCX file or no file URL';
      }

      documentsData.push(docData);
    }

    // =====================================================
    // STEP 4: Fetch linked ProposalResource items
    // =====================================================
    console.log('[parseProposalContent] 📚 Fetching linked proposal resources...');
    
    // Note: In the future, we'll have a proper linking mechanism
    // For now, we'll fetch resources that match the organization
    const resources = await base44.entities.ProposalResource.filter(
      { organization_id: proposal.organization_id },
      '-created_date',
      50 // Limit to most recent 50 resources
    );

    const resourcesData = [];
    
    for (const resource of resources) {
      const resourceData = {
        id: resource.id,
        title: resource.title,
        resource_type: resource.resource_type,
        content_category: resource.content_category,
        description: resource.description,
        boilerplate_content: resource.boilerplate_content,
        file_name: resource.file_name,
        file_url: resource.file_url,
        tags: resource.tags || [],
        text_content: null,
        parse_status: 'pending'
      };

      // If it has boilerplate content, use that
      if (resource.boilerplate_content) {
        resourceData.text_content = resource.boilerplate_content;
        resourceData.parse_status = 'success';
      }
      // Otherwise, try to parse file if it's a DOCX
      else if (resource.file_name?.toLowerCase().endsWith('.docx') && resource.file_url) {
        try {
          console.log(`[parseProposalContent] 🔍 Parsing resource DOCX: ${resource.file_name}`);
          const parseResult = await base44.asServiceRole.functions.invoke('parseDocxFile', {
            file_url: resource.file_url,
            extract_structured_data: false
          });

          if (parseResult.data?.status === 'success') {
            resourceData.text_content = parseResult.data.text_content;
            resourceData.parse_status = 'success';
            resourceData.text_length = parseResult.data.text_length;
          } else {
            resourceData.parse_status = 'error';
            resourceData.parse_error = parseResult.data?.error;
          }
        } catch (error) {
          resourceData.parse_status = 'error';
          resourceData.parse_error = error.message;
        }
      } else {
        resourceData.parse_status = 'skipped';
      }

      resourcesData.push(resourceData);
    }

    // =====================================================
    // STEP 5: Fetch relevant comments/discussions
    // =====================================================
    console.log('[parseProposalContent] 💬 Fetching proposal comments...');
    const comments = await base44.entities.ProposalComment.filter(
      { proposal_id: proposal_id }
    );

    const commentsData = comments.map(comment => ({
      id: comment.id,
      author_name: comment.author_name,
      content: comment.content,
      comment_type: comment.comment_type,
      section_id: comment.section_id,
      created_date: comment.created_date
    }));

    // =====================================================
    // STEP 6: Calculate statistics
    // =====================================================
    let totalTextLength = 0;
    
    // Add section content lengths
    sectionsData.forEach(section => {
      if (section.content) {
        totalTextLength += section.content.length;
      }
    });

    // Add document content lengths
    documentsData.forEach(doc => {
      if (doc.text_content) {
        totalTextLength += doc.text_content.length;
      }
    });

    // Add resource content lengths
    resourcesData.forEach(resource => {
      if (resource.text_content) {
        totalTextLength += resource.text_content.length;
      }
    });

    const stats = {
      total_text_length: totalTextLength,
      sections_count: sectionsData.length,
      documents_count: documentsData.length,
      documents_parsed: documentsData.filter(d => d.parse_status === 'success').length,
      resources_count: resourcesData.length,
      resources_parsed: resourcesData.filter(r => r.parse_status === 'success').length,
      comments_count: commentsData.length
    };

    console.log('[parseProposalContent] ✅ Parsing complete:', stats);

    // =====================================================
    // STEP 7: Return comprehensive data package
    // =====================================================
    return Response.json({
      status: 'success',
      proposal_data: {
        metadata,
        sections: sectionsData,
        documents: documentsData,
        resources: resourcesData,
        comments: commentsData
      },
      stats,
      parsed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[parseProposalContent] ❌ Error:', error);
    return Response.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});