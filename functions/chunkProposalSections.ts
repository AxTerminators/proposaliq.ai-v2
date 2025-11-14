import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend Function: Chunk Proposal Sections
 * 
 * PHASE 7: Semantic Search & Chunking
 * 
 * Breaks down proposal sections into semantic chunks (1-3 paragraphs each).
 * Generates summaries and extracts keywords for each chunk.
 * Enables precise paragraph-level retrieval instead of full sections.
 * 
 * Features:
 * - Intelligent paragraph-based chunking
 * - AI-generated summaries for each chunk
 * - Keyword extraction
 * - Maintains context with start/end positions
 * - Caches chunks for reuse
 * 
 * Returns: Array of created chunks with metadata
 */

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      proposal_id,
      section_ids = [], // Specific sections to chunk (empty = all)
      force_rechunk = false // Regenerate existing chunks
    } = await req.json();

    if (!proposal_id) {
      return Response.json({ 
        error: 'proposal_id is required' 
      }, { status: 400 });
    }

    console.log('[chunkProposalSections] 🔪 Chunking proposal:', proposal_id);

    // Fetch proposal
    const proposal = await base44.entities.Proposal.get(proposal_id);
    if (!proposal) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }

    // Fetch sections to chunk
    let sections;
    if (section_ids.length > 0) {
      sections = await Promise.all(
        section_ids.map(id => base44.entities.ProposalSection.get(id))
      );
      sections = sections.filter(s => s !== null);
    } else {
      sections = await base44.entities.ProposalSection.filter({
        proposal_id
      }, 'order');
    }

    console.log(`[chunkProposalSections] 📄 Processing ${sections.length} sections`);

    const allChunks = [];
    let totalChunksCreated = 0;
    let sectionsProcessed = 0;

    for (const section of sections) {
      if (!section.content || section.content.trim().length < 100) {
        console.log(`[chunkProposalSections] ⏭️ Skipping section ${section.id} - too short`);
        continue;
      }

      // Check if already chunked (unless force_rechunk)
      if (!force_rechunk) {
        const existingChunks = await base44.asServiceRole.entities.ProposalSectionChunk.filter({
          section_id: section.id
        }, 'chunk_index', 1);

        if (existingChunks.length > 0) {
          console.log(`[chunkProposalSections] ✓ Section ${section.id} already chunked`);
          allChunks.push(...existingChunks);
          continue;
        }
      } else {
        // Delete existing chunks for this section
        const existingChunks = await base44.asServiceRole.entities.ProposalSectionChunk.filter({
          section_id: section.id
        });
        for (const chunk of existingChunks) {
          await base44.asServiceRole.entities.ProposalSectionChunk.delete(chunk.id);
        }
      }

      console.log(`[chunkProposalSections] 🔪 Chunking section: ${section.section_name}`);

      // Clean HTML and extract plain text
      const plainText = section.content
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Split into paragraphs (by double line breaks or <p> tags)
      const paragraphs = plainText
        .split(/\n\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 50); // Minimum 50 chars

      if (paragraphs.length === 0) {
        console.log(`[chunkProposalSections] ⚠️ No valid paragraphs in section ${section.id}`);
        continue;
      }

      // Group paragraphs into chunks (1-3 paragraphs each)
      const chunks = [];
      let currentChunk = [];
      let currentWordCount = 0;
      const TARGET_CHUNK_WORDS = 200; // Target ~200 words per chunk
      const MAX_CHUNK_WORDS = 400; // Max 400 words

      for (let i = 0; i < paragraphs.length; i++) {
        const para = paragraphs[i];
        const paraWordCount = para.split(/\s+/).length;

        if (currentWordCount + paraWordCount > MAX_CHUNK_WORDS && currentChunk.length > 0) {
          // Save current chunk
          chunks.push(currentChunk.join('\n\n'));
          currentChunk = [para];
          currentWordCount = paraWordCount;
        } else {
          currentChunk.push(para);
          currentWordCount += paraWordCount;

          // If we hit target or it's the last paragraph, save chunk
          if (currentWordCount >= TARGET_CHUNK_WORDS || i === paragraphs.length - 1) {
            chunks.push(currentChunk.join('\n\n'));
            currentChunk = [];
            currentWordCount = 0;
          }
        }
      }

      // Handle any remaining text
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n\n'));
      }

      console.log(`[chunkProposalSections] ✂️ Split into ${chunks.length} chunks`);

      // Generate summaries and keywords using AI (batch)
      const chunkPromises = chunks.map(async (chunkText, index) => {
        try {
          // Use LLM to generate summary and extract keywords
          const prompt = `Analyze this proposal section excerpt and provide:
1. A one-sentence summary (max 20 words)
2. 5-7 key terms/concepts

Excerpt:
${chunkText.substring(0, 500)}...

Return as JSON: {"summary": "...", "keywords": ["...", "..."]}`;

          const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                keywords: { type: "array", items: { type: "string" } }
              }
            }
          });

          const { summary, keywords } = llmResult;

          // Calculate positions
          const startPos = plainText.indexOf(chunkText);
          const endPos = startPos + chunkText.length;

          // Create chunk entity
          const chunkEntity = await base44.asServiceRole.entities.ProposalSectionChunk.create({
            proposal_id,
            section_id: section.id,
            section_type: section.section_type,
            chunk_index: index,
            chunk_text: chunkText,
            chunk_summary: summary || 'Summary unavailable',
            word_count: chunkText.split(/\s+/).length,
            character_count: chunkText.length,
            keywords: keywords || [],
            start_position: Math.max(0, startPos),
            end_position: endPos,
            parent_proposal_status: proposal.status,
            last_chunked_date: new Date().toISOString()
          });

          return chunkEntity;
        } catch (error) {
          console.error(`[chunkProposalSections] ❌ Error chunking index ${index}:`, error);
          return null;
        }
      });

      const sectionChunks = await Promise.all(chunkPromises);
      const validChunks = sectionChunks.filter(c => c !== null);
      
      allChunks.push(...validChunks);
      totalChunksCreated += validChunks.length;
      sectionsProcessed++;

      console.log(`[chunkProposalSections] ✅ Created ${validChunks.length} chunks for section`);
    }

    const duration = (Date.now() - startTime) / 1000;

    console.log(`[chunkProposalSections] ✅ Complete in ${duration.toFixed(2)}s`);
    console.log(`[chunkProposalSections] 📊 Stats: ${sectionsProcessed} sections, ${totalChunksCreated} chunks`);

    return Response.json({
      status: 'success',
      chunks_created: totalChunksCreated,
      sections_processed: sectionsProcessed,
      total_chunks: allChunks.length,
      duration_seconds: duration,
      proposal_id,
      chunks: allChunks.map(c => ({
        id: c.id,
        section_type: c.section_type,
        chunk_index: c.chunk_index,
        summary: c.chunk_summary,
        word_count: c.word_count
      }))
    });

  } catch (error) {
    console.error('[chunkProposalSections] ❌ Error:', error);
    return Response.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});