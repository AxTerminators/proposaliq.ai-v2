import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend Function: Search Semantic Chunks
 * 
 * PHASE 7: Semantic Search
 * 
 * Searches proposal chunks using keyword matching and context relevance.
 * Returns the most relevant paragraph-level chunks instead of full sections.
 * 
 * Search Algorithm:
 * 1. Keyword matching (section type, keywords, text content)
 * 2. Relevance scoring (agency match, project type, winning status)
 * 3. Ranking by combined score
 * 
 * Future: Can be enhanced with vector embeddings for true semantic search
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      query_text,
      current_proposal_id,
      section_type = null,
      max_results = 20,
      min_relevance_score = 30,
      only_winning_proposals = false,
      organization_id
    } = await req.json();

    if (!query_text || !current_proposal_id || !organization_id) {
      return Response.json({ 
        error: 'query_text, current_proposal_id, and organization_id are required' 
      }, { status: 400 });
    }

    console.log('[searchSemanticChunks] 🔍 Searching chunks...');
    console.log('[searchSemanticChunks] 📝 Query:', query_text);

    // Extract keywords from query
    const queryWords = query_text
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3); // Minimum 4 chars

    // Fetch current proposal for context
    const currentProposal = await base44.entities.Proposal.get(current_proposal_id);

    // Build search filters
    const searchFilters = {
      proposal_id: { $ne: current_proposal_id } // Exclude current proposal
    };

    if (section_type) {
      searchFilters.section_type = section_type;
    }

    if (only_winning_proposals) {
      searchFilters.parent_proposal_status = 'won';
    }

    // Fetch candidate chunks
    console.log('[searchSemanticChunks] 📊 Fetching chunks...');
    const candidateChunks = await base44.asServiceRole.entities.ProposalSectionChunk.filter(
      searchFilters,
      '-last_chunked_date',
      500 // Get up to 500 candidates
    );

    console.log(`[searchSemanticChunks] 📦 Found ${candidateChunks.length} candidate chunks`);

    if (candidateChunks.length === 0) {
      return Response.json({
        status: 'success',
        results: [],
        message: 'No chunks found'
      });
    }

    // Fetch parent proposals for additional context
    const proposalIds = [...new Set(candidateChunks.map(c => c.proposal_id))];
    const proposals = await Promise.all(
      proposalIds.map(id => base44.entities.Proposal.get(id).catch(() => null))
    );
    const proposalMap = Object.fromEntries(
      proposals.filter(p => p).map(p => [p.id, p])
    );

    // Score each chunk
    const scoredChunks = candidateChunks.map(chunk => {
      let score = 0;
      const reasons = [];
      const parentProposal = proposalMap[chunk.proposal_id];

      // Keyword matching in chunk text (40 points max)
      const chunkTextLower = chunk.chunk_text.toLowerCase();
      const matchingWords = queryWords.filter(word => chunkTextLower.includes(word));
      const keywordScore = Math.min(40, (matchingWords.length / queryWords.length) * 40);
      score += keywordScore;
      if (matchingWords.length > 0) {
        reasons.push(`${matchingWords.length}/${queryWords.length} keywords match`);
      }

      // Keyword matching in chunk keywords (20 points)
      if (chunk.keywords && chunk.keywords.length > 0) {
        const chunkKeywordsLower = chunk.keywords.map(k => k.toLowerCase());
        const keywordOverlap = queryWords.filter(word => 
          chunkKeywordsLower.some(ck => ck.includes(word) || word.includes(ck))
        );
        const keywordMatchScore = Math.min(20, (keywordOverlap.length / queryWords.length) * 20);
        score += keywordMatchScore;
        if (keywordOverlap.length > 0) {
          reasons.push(`${keywordOverlap.length} concept matches`);
        }
      }

      // Parent proposal relevance
      if (parentProposal) {
        // Agency match (15 points)
        if (parentProposal.agency_name && currentProposal.agency_name &&
            parentProposal.agency_name.toLowerCase() === currentProposal.agency_name.toLowerCase()) {
          score += 15;
          reasons.push('Same agency');
        }

        // Project type match (10 points)
        if (parentProposal.project_type && currentProposal.project_type &&
            parentProposal.project_type === currentProposal.project_type) {
          score += 10;
          reasons.push('Same project type');
        }

        // Winning proposal bonus (15 points)
        if (parentProposal.status === 'won') {
          score += 15;
          reasons.push('From winning proposal');
        }
      }

      return {
        ...chunk,
        relevance_score: Math.round(score),
        relevance_reasons: reasons,
        parent_proposal: parentProposal ? {
          proposal_name: parentProposal.proposal_name,
          status: parentProposal.status,
          agency_name: parentProposal.agency_name,
          project_type: parentProposal.project_type
        } : null
      };
    });

    // Filter and sort
    const filteredChunks = scoredChunks
      .filter(c => c.relevance_score >= min_relevance_score)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, max_results);

    console.log(`[searchSemanticChunks] ✅ Returning ${filteredChunks.length} relevant chunks`);

    return Response.json({
      status: 'success',
      results: filteredChunks,
      search_metadata: {
        query: query_text,
        total_candidates: candidateChunks.length,
        results_returned: filteredChunks.length,
        min_score: min_relevance_score,
        filters: {
          section_type,
          only_winning_proposals
        }
      }
    });

  } catch (error) {
    console.error('[searchSemanticChunks] ❌ Error:', error);
    return Response.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
});