import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Retrieves supplementary document context for AI proposal generation
 * Prioritizes amendments, Q&As, and latest versions
 * Returns structured context with version awareness
 * 
 * Input:
 * {
 *   proposal_id: string,
 *   query: string (optional - semantic search query),
 *   max_documents: number (default: 10)
 * }
 * 
 * Output:
 * {
 *   success: boolean,
 *   documents: array of prioritized documents,
 *   context_summary: string
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposal_id, query, max_documents = 10 } = await req.json();

    if (!proposal_id) {
      return Response.json(
        { error: 'proposal_id is required' },
        { status: 400 }
      );
    }

    // Fetch all solicitation documents for this proposal
    const allDocs = await base44.entities.SolicitationDocument.filter({
      proposal_id,
      rag_ingested: true
    });

    if (!allDocs || allDocs.length === 0) {
      return Response.json({
        success: true,
        documents: [],
        context_summary: 'No solicitation documents have been ingested yet.'
      });
    }

    // Parse and score documents
    const scoredDocs = allDocs.map(doc => {
      let extracted = null;
      try {
        extracted = doc.extracted_data ? JSON.parse(doc.extracted_data) : null;
      } catch (e) {
        console.warn('Failed to parse extracted_data:', e);
      }

      // Calculate priority score
      let priority = 50;

      if (doc.is_supplementary) {
        priority = 70;
        
        if (doc.supplementary_type === 'q_a_response') {
          priority = 95;
        } else if (doc.supplementary_type === 'amendment') {
          priority = 90;
        } else if (doc.supplementary_type === 'sow' || doc.supplementary_type === 'pws') {
          priority = 85;
        } else if (doc.supplementary_type === 'clarification') {
          priority = 80;
        }

        if (doc.is_latest_version) {
          priority += 5;
        }

        if (doc.amendment_number) {
          const num = parseInt(doc.amendment_number);
          if (!isNaN(num)) {
            priority += Math.min(num * 2, 10);
          }
        }
      } else {
        if (doc.document_type === 'rfp' || doc.document_type === 'rfq') {
          priority = 75;
        } else if (doc.document_type === 'sow' || doc.document_type === 'pws') {
          priority = 70;
        }
      }

      // Semantic relevance boost if query provided
      let relevanceScore = 0;
      if (query && extracted?.full_content) {
        const queryLower = query.toLowerCase();
        const contentLower = extracted.full_content.toLowerCase();
        
        // Simple keyword matching (in production, use vector similarity)
        const queryWords = queryLower.split(/\s+/);
        const matches = queryWords.filter(word => 
          word.length > 3 && contentLower.includes(word)
        ).length;
        
        relevanceScore = (matches / queryWords.length) * 20; // Up to +20 points
      }

      return {
        ...doc,
        extracted,
        final_priority: priority + relevanceScore,
        base_priority: priority,
        relevance_score: relevanceScore
      };
    });

    // Sort by priority (highest first)
    scoredDocs.sort((a, b) => b.final_priority - a.final_priority);

    // Take top N documents
    const topDocs = scoredDocs.slice(0, max_documents);

    // Build context summary
    const supplementaryCount = topDocs.filter(d => d.is_supplementary).length;
    const amendmentCount = topDocs.filter(d => d.supplementary_type === 'amendment').length;
    const qaCount = topDocs.filter(d => d.supplementary_type === 'q_a_response').length;

    const contextSummary = `Retrieved ${topDocs.length} documents (${supplementaryCount} supplementary): ${amendmentCount} amendments, ${qaCount} Q&As. Prioritizing latest versions and critical updates.`;

    // Prepare output with structured content
    const outputDocs = topDocs.map(doc => ({
      id: doc.id,
      file_name: doc.file_name,
      document_type: doc.document_type,
      is_supplementary: doc.is_supplementary,
      supplementary_type: doc.supplementary_type,
      amendment_number: doc.amendment_number,
      is_latest_version: doc.is_latest_version,
      version_date: doc.version_date,
      priority_score: doc.final_priority,
      content_summary: {
        key_requirements: doc.extracted?.key_requirements || [],
        changes_and_clarifications: doc.extracted?.changes_and_clarifications || [],
        important_dates: doc.extracted?.important_dates || [],
        evaluation_criteria: doc.extracted?.evaluation_criteria || []
      },
      full_content: doc.extracted?.full_content || ''
    }));

    return Response.json({
      success: true,
      documents: outputDocs,
      context_summary: contextSummary,
      metadata: {
        total_available: allDocs.length,
        returned: topDocs.length,
        supplementary_count: supplementaryCount,
        amendment_count: amendmentCount,
        qa_count: qaCount
      }
    });

  } catch (error) {
    console.error('Error retrieving supplementary context:', error);
    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});