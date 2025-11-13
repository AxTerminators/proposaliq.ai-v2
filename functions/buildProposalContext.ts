import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend Function: Build Proposal Context for AI (RAG)
 * 
 * This function implements a Retrieval-Augmented Generation (RAG) approach by:
 * 1. Taking a current proposal ID and array of reference proposal IDs
 * 2. Parsing all content from the reference proposals
 * 3. Intelligently ranking and filtering the most relevant content
 * 4. Formatting everything into a structured context ready for LLM consumption
 * 5. Managing token limits through smart truncation and summarization
 * 
 * This enables the AI writer to learn from past successful proposals while
 * generating new content, significantly improving quality and consistency.
 * 
 * Usage:
 * const result = await base44.functions.invoke('buildProposalContext', {
 *   current_proposal_id: 'xyz789',
 *   reference_proposal_ids: ['abc123', 'def456'],
 *   max_tokens: 8000, // optional, defaults to 8000
 *   prioritize_winning: true // optional, defaults to true
 * });
 * 
 * Returns:
 * {
 *   status: 'success',
 *   context: {
 *     current_proposal: {...},
 *     reference_proposals: [{...}],
 *     formatted_prompt_context: '...' // Ready to inject into LLM prompt
 *   },
 *   metadata: {
 *     total_references: 2,
 *     estimated_tokens: 7500,
 *     truncated: false,
 *     sources: [...]
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
    const { 
      current_proposal_id, 
      reference_proposal_ids = [],
      max_tokens = 8000,
      prioritize_winning = true 
    } = await req.json();

    if (!current_proposal_id) {
      return Response.json({ 
        error: 'current_proposal_id is required' 
      }, { status: 400 });
    }

    if (!Array.isArray(reference_proposal_ids) || reference_proposal_ids.length === 0) {
      return Response.json({ 
        error: 'reference_proposal_ids must be a non-empty array' 
      }, { status: 400 });
    }

    console.log('[buildProposalContext] 🏗️ Building context for proposal:', current_proposal_id);
    console.log('[buildProposalContext] 📚 Reference proposals:', reference_proposal_ids);

    // =====================================================
    // STEP 1: Fetch current proposal metadata
    // =====================================================
    console.log('[buildProposalContext] 📋 Fetching current proposal...');
    const currentProposal = await base44.entities.Proposal.get(current_proposal_id);
    
    if (!currentProposal) {
      return Response.json({ 
        error: 'Current proposal not found' 
      }, { status: 404 });
    }

    const currentContext = {
      proposal_name: currentProposal.proposal_name,
      project_title: currentProposal.project_title,
      agency_name: currentProposal.agency_name,
      solicitation_number: currentProposal.solicitation_number,
      project_type: currentProposal.project_type
    };

    // =====================================================
    // STEP 2: Parse all reference proposals
    // =====================================================
    console.log('[buildProposalContext] 🔍 Parsing reference proposals...');
    const referenceData = [];
    
    for (const refProposalId of reference_proposal_ids) {
      try {
        console.log(`[buildProposalContext] 📖 Parsing reference: ${refProposalId}`);
        
        const parseResult = await base44.asServiceRole.functions.invoke('parseProposalContent', {
          proposal_id: refProposalId
        });

        if (parseResult.data?.status === 'success') {
          referenceData.push({
            proposal_id: refProposalId,
            ...parseResult.data.proposal_data,
            stats: parseResult.data.stats
          });
          console.log(`[buildProposalContext] ✅ Parsed ${refProposalId}: ${parseResult.data.stats.total_text_length} chars`);
        } else {
          console.warn(`[buildProposalContext] ⚠️ Failed to parse ${refProposalId}:`, parseResult.data?.error);
        }
      } catch (error) {
        console.error(`[buildProposalContext] ❌ Error parsing ${refProposalId}:`, error);
      }
    }

    if (referenceData.length === 0) {
      return Response.json({
        status: 'error',
        error: 'Failed to parse any reference proposals'
      }, { status: 400 });
    }

    // =====================================================
    // STEP 3: Rank and prioritize content
    // =====================================================
    console.log('[buildProposalContext] 🎯 Ranking and prioritizing content...');
    
    // Sort by priority: Won > Submitted > other statuses
    if (prioritize_winning) {
      referenceData.sort((a, b) => {
        const statusPriority = { 'won': 3, 'submitted': 2, 'lost': 1 };
        const priorityA = statusPriority[a.metadata.status] || 0;
        const priorityB = statusPriority[b.metadata.status] || 0;
        return priorityB - priorityA;
      });
    }

    // =====================================================
    // STEP 4: Build formatted context string for LLM
    // =====================================================
    console.log('[buildProposalContext] 📝 Formatting context for LLM...');
    
    let formattedContext = '';
    let estimatedTokens = 0;
    let truncated = false;
    const includedSources = [];

    // Rough token estimation: ~4 characters per token
    const charsPerToken = 4;
    const maxChars = max_tokens * charsPerToken;

    formattedContext += `# CURRENT PROPOSAL CONTEXT\n\n`;
    formattedContext += `Proposal Name: ${currentContext.proposal_name}\n`;
    formattedContext += `Project Title: ${currentContext.project_title || 'N/A'}\n`;
    formattedContext += `Agency: ${currentContext.agency_name || 'N/A'}\n`;
    formattedContext += `Solicitation: ${currentContext.solicitation_number || 'N/A'}\n`;
    formattedContext += `Type: ${currentContext.project_type || 'N/A'}\n\n`;

    formattedContext += `# REFERENCE MATERIAL FROM PAST PROPOSALS\n\n`;
    formattedContext += `The following content is extracted from ${referenceData.length} successful past proposal(s). `;
    formattedContext += `Use this as inspiration for structure, language, and approach, but ensure all new content is original and tailored to the current proposal.\n\n`;

    // Add content from each reference proposal
    for (let i = 0; i < referenceData.length; i++) {
      const ref = referenceData[i];
      let refContent = '';

      refContent += `## Reference Proposal ${i + 1}: ${ref.metadata.proposal_name}\n\n`;
      refContent += `**Status:** ${ref.metadata.status}\n`;
      refContent += `**Agency:** ${ref.metadata.agency_name || 'N/A'}\n`;
      refContent += `**Contract Value:** $${(ref.metadata.contract_value || 0).toLocaleString()}\n\n`;

      // Add win themes if available
      if (ref.metadata.win_themes) {
        refContent += `**Win Themes:**\n`;
        const themes = Array.isArray(ref.metadata.win_themes) 
          ? ref.metadata.win_themes 
          : (ref.metadata.win_themes.themes || []);
        themes.forEach(theme => {
          refContent += `- ${theme}\n`;
        });
        refContent += `\n`;
      }

      // Add sections content
      if (ref.sections && ref.sections.length > 0) {
        refContent += `### Proposal Sections\n\n`;
        ref.sections.forEach(section => {
          if (section.content && section.content.trim().length > 0) {
            // Truncate very long sections
            const maxSectionLength = 2000;
            const sectionContent = section.content.length > maxSectionLength
              ? section.content.substring(0, maxSectionLength) + '... [truncated]'
              : section.content;
            
            refContent += `#### ${section.section_name}\n${sectionContent}\n\n`;
          }
        });
      }

      // Add key documents excerpts
      if (ref.documents && ref.documents.length > 0) {
        const parsedDocs = ref.documents.filter(d => d.parse_status === 'success' && d.text_content);
        if (parsedDocs.length > 0) {
          refContent += `### Key Documents\n\n`;
          parsedDocs.forEach(doc => {
            // Only include excerpt from documents to save tokens
            const excerpt = doc.text_content.substring(0, 500);
            refContent += `**${doc.file_name}** (${doc.document_type}):\n${excerpt}... [excerpt]\n\n`;
          });
        }
      }

      // Check if adding this reference would exceed token limit
      const newTotalLength = formattedContext.length + refContent.length;
      if (newTotalLength > maxChars) {
        console.log(`[buildProposalContext] ⚠️ Token limit reached, truncating at reference ${i + 1}`);
        truncated = true;
        break;
      }

      formattedContext += refContent;
      includedSources.push({
        proposal_id: ref.proposal_id,
        proposal_name: ref.metadata.proposal_name,
        status: ref.metadata.status,
        agency: ref.metadata.agency_name
      });
    }

    estimatedTokens = Math.ceil(formattedContext.length / charsPerToken);

    // =====================================================
    // STEP 5: Add usage instructions for AI
    // =====================================================
    formattedContext += `\n---\n\n`;
    formattedContext += `**Instructions for AI:** Use the above reference material to inform your writing. `;
    formattedContext += `Draw inspiration from successful structures, persuasive language, and technical approaches. `;
    formattedContext += `However, ensure all generated content is original, specific to the current proposal, and not copied directly. `;
    formattedContext += `When appropriate, note in your output which reference proposal(s) influenced specific approaches.\n`;

    // =====================================================
    // STEP 6: Return comprehensive context package
    // =====================================================
    console.log('[buildProposalContext] ✅ Context built successfully');
    console.log(`[buildProposalContext] 📊 Estimated tokens: ${estimatedTokens} / ${max_tokens}`);

    return Response.json({
      status: 'success',
      context: {
        current_proposal: currentContext,
        reference_proposals: referenceData.map(r => ({
          proposal_id: r.proposal_id,
          proposal_name: r.metadata.proposal_name,
          status: r.metadata.status,
          sections_count: r.sections.length,
          documents_count: r.documents.length
        })),
        formatted_prompt_context: formattedContext
      },
      metadata: {
        total_references: referenceData.length,
        references_included: includedSources.length,
        estimated_tokens: estimatedTokens,
        max_tokens: max_tokens,
        truncated: truncated,
        sources: includedSources
      },
      built_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[buildProposalContext] ❌ Error:', error);
    return Response.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});