import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PHASE 6: Citation Generation for AI Content
 * 
 * Automatically generates citations for AI-generated content that used reference proposals.
 * Returns structured citation data for transparency and compliance.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      generated_content,
      reference_proposal_ids = [],
      section_type,
      semantic_chunk_ids = []
    } = await req.json();

    if (!generated_content) {
      return Response.json({ 
        status: 'error',
        error: 'generated_content is required' 
      }, { status: 400 });
    }

    console.log('[generateCitations] 📝 Generating citations for content with', 
                reference_proposal_ids.length, 'references and', 
                semantic_chunk_ids.length, 'chunks');

    // Fetch reference proposals
    const referenceCitations = [];
    
    if (reference_proposal_ids.length > 0) {
      const proposals = await Promise.allSettled(
        reference_proposal_ids.map(id => base44.entities.Proposal.get(id))
      );

      proposals.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const proposal = result.value;
          referenceCitations.push({
            id: proposal.id,
            type: 'proposal',
            proposal_name: proposal.proposal_name,
            agency_name: proposal.agency_name,
            status: proposal.status,
            solicitation_number: proposal.solicitation_number,
            citation_text: `Reference: ${proposal.proposal_name}${proposal.agency_name ? ` (${proposal.agency_name})` : ''}${proposal.status === 'won' ? ' - Won' : ''}`,
            relevance_note: null
          });
        }
      });
    }

    // Fetch semantic chunks
    const chunkCitations = [];
    
    if (semantic_chunk_ids.length > 0) {
      const chunks = await Promise.allSettled(
        semantic_chunk_ids.map(id => base44.entities.ProposalSectionChunk.get(id))
      );

      chunks.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          const chunk = result.value;
          chunkCitations.push({
            id: chunk.id,
            type: 'chunk',
            proposal_id: chunk.proposal_id,
            section_type: chunk.section_type,
            chunk_summary: chunk.chunk_summary,
            citation_text: `Excerpt from ${chunk.section_type.replace('_', ' ')} section`,
            relevance_note: chunk.chunk_summary
          });
        }
      });
    }

    // Generate formatted citations
    const allCitations = [...referenceCitations, ...chunkCitations];
    
    const formattedCitations = allCitations.map((citation, idx) => ({
      ...citation,
      citation_number: idx + 1,
      inline_marker: `[${idx + 1}]`
    }));

    // Generate citation footer
    const citationFooter = formattedCitations.length > 0 
      ? `\n\n---\n**References:**\n${formattedCitations.map(c => 
          `${c.inline_marker} ${c.citation_text}${c.relevance_note ? ` - ${c.relevance_note}` : ''}`
        ).join('\n')}`
      : '';

    console.log('[generateCitations] ✅ Generated', formattedCitations.length, 'citations');

    return Response.json({
      status: 'success',
      citations: formattedCitations,
      citation_footer: citationFooter,
      citation_count: formattedCitations.length,
      metadata: {
        reference_proposals_count: referenceCitations.length,
        semantic_chunks_count: chunkCitations.length,
        section_type,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[generateCitations] ❌ Error:', error);
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});