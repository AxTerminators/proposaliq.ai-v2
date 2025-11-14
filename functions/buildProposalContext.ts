import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend Function: Build Proposal Context for AI (RAG) - ENHANCED v2.0
 * 
 * ENHANCEMENTS:
 * ✅ Section-type aware filtering for better relevance
 * ✅ Intelligent token management (up to 100K tokens)
 * ✅ Detailed error tracking and reporting
 * ✅ Relevance scoring for each reference
 * ✅ Per-LLM token limits
 * 
 * This function implements a Retrieval-Augmented Generation (RAG) approach by:
 * 1. Taking a current proposal ID and array of reference proposal IDs
 * 2. Parsing all content from the reference proposals
 * 3. Intelligently ranking and filtering the most relevant content BY SECTION TYPE
 * 4. Formatting everything into a structured context ready for LLM consumption
 * 5. Managing token limits through smart truncation and summarization
 * 6. Returning detailed diagnostics for error surfacing
 * 
 * Usage:
 * const result = await base44.functions.invoke('buildProposalContext', {
 *   current_proposal_id: 'xyz789',
 *   reference_proposal_ids: ['abc123', 'def456'],
 *   target_section_type: 'technical_approach', // NEW: Filter to relevant sections
 *   max_tokens: 30000, // NEW: Configurable, defaults based on LLM
 *   llm_provider: 'gemini', // NEW: Auto-set token limits
 *   prioritize_winning: true
 * });
 * 
 * Returns:
 * {
 *   status: 'success',
 *   context: {
 *     current_proposal: {...},
 *     reference_proposals: [{...}],
 *     formatted_prompt_context: '...'
 *   },
 *   metadata: {
 *     total_references: 2,
 *     references_included: 2,
 *     references_failed: 0,
 *     estimated_tokens: 7500,
 *     truncated: false,
 *     sources: [...],
 *     parse_errors: [], // NEW: Detailed error info
 *     relevance_scores: [{proposal_id: 'abc', score: 95, reasons: [...]}] // NEW
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

    // Parse request with enhanced parameters
    const { 
      current_proposal_id, 
      reference_proposal_ids = [],
      target_section_type = null, // NEW: Filter by section type
      max_tokens = null, // Will be set based on LLM
      llm_provider = 'gemini', // NEW: Auto-configure token limits
      prioritize_winning = true,
      include_documents = true, // NEW: Option to exclude documents for speed
      include_resources = true // NEW: Option to exclude resources
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
    console.log('[buildProposalContext] 🎯 Target section type:', target_section_type || 'all');

    // =====================================================
    // STEP 0: Configure token limits based on LLM provider
    // =====================================================
    const LLM_TOKEN_LIMITS = {
      'gemini': 100000,      // Gemini 2.0 Flash supports 1M, use 100K for safety
      'claude': 100000,      // Claude 3.5 supports 200K
      'chatgpt': 50000,      // GPT-4 Turbo supports 128K
      'gpt-4': 50000,
      'default': 30000       // Conservative default
    };

    const effectiveMaxTokens = max_tokens || LLM_TOKEN_LIMITS[llm_provider] || LLM_TOKEN_LIMITS.default;
    console.log(`[buildProposalContext] 🎛️ Token limit: ${effectiveMaxTokens.toLocaleString()} (LLM: ${llm_provider})`);

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
      project_type: currentProposal.project_type,
      contract_value: currentProposal.contract_value,
      status: currentProposal.status
    };

    // =====================================================
    // STEP 2: Parse all reference proposals WITH ERROR TRACKING
    // =====================================================
    console.log('[buildProposalContext] 🔍 Parsing reference proposals...');
    const referenceData = [];
    const parseErrors = []; // NEW: Track parse failures
    
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
          const errorInfo = {
            proposal_id: refProposalId,
            error: parseResult.data?.error || 'Unknown parsing error',
            status: 'parse_failed'
          };
          parseErrors.push(errorInfo);
          console.warn(`[buildProposalContext] ⚠️ Failed to parse ${refProposalId}:`, errorInfo.error);
        }
      } catch (error) {
        const errorInfo = {
          proposal_id: refProposalId,
          error: error.message,
          status: 'request_failed'
        };
        parseErrors.push(errorInfo);
        console.error(`[buildProposalContext] ❌ Error parsing ${refProposalId}:`, error);
      }
    }

    if (referenceData.length === 0) {
      return Response.json({
        status: 'error',
        error: 'Failed to parse any reference proposals',
        parse_errors: parseErrors
      }, { status: 400 });
    }

    console.log(`[buildProposalContext] 📊 Successfully parsed ${referenceData.length} of ${reference_proposal_ids.length} references`);

    // =====================================================
    // STEP 3: Calculate relevance scores for each reference
    // =====================================================
    console.log('[buildProposalContext] 🎯 Calculating relevance scores...');
    
    const scoredReferences = referenceData.map(ref => {
      let score = 0;
      const reasons = [];

      // Agency match (strongest signal - proposal style consistency)
      if (ref.metadata.agency_name === currentContext.agency_name) {
        score += 40;
        reasons.push(`Same agency: ${ref.metadata.agency_name}`);
      }

      // Project type match
      if (ref.metadata.project_type === currentContext.project_type) {
        score += 30;
        reasons.push(`Same type: ${ref.metadata.project_type}`);
      }

      // Won status (learn from winners)
      if (ref.metadata.status === 'won') {
        score += 20;
        reasons.push('Winning proposal');
      } else if (ref.metadata.status === 'submitted') {
        score += 10;
        reasons.push('Submitted proposal');
      }

      // Similar contract value (±50%)
      if (ref.metadata.contract_value && currentContext.contract_value) {
        const valueDiff = Math.abs(ref.metadata.contract_value - currentContext.contract_value);
        const avgValue = (ref.metadata.contract_value + currentContext.contract_value) / 2;
        if (valueDiff / avgValue < 0.5) {
          score += 10;
          reasons.push('Similar contract value');
        }
      }

      // Section type match (NEW: if target_section_type specified)
      if (target_section_type) {
        const hasSimilarSection = ref.sections.some(s => s.section_type === target_section_type);
        if (hasSimilarSection) {
          score += 15;
          reasons.push(`Has ${target_section_type} section`);
        }
      }

      // Content richness (more content = more valuable)
      if (ref.stats.total_text_length > 50000) {
        score += 5;
        reasons.push('Comprehensive content');
      }

      return {
        ...ref,
        relevance_score: score,
        relevance_reasons: reasons
      };
    });

    // Sort by relevance score
    scoredReferences.sort((a, b) => b.relevance_score - a.relevance_score);

    console.log('[buildProposalContext] 📊 Relevance scores calculated:');
    scoredReferences.forEach(ref => {
      console.log(`  - ${ref.metadata.proposal_name}: ${ref.relevance_score} points`);
    });

    // =====================================================
    // STEP 4: Build formatted context string for LLM
    // WITH SECTION-TYPE FILTERING
    // =====================================================
    console.log('[buildProposalContext] 📝 Formatting context for LLM...');
    
    let formattedContext = '';
    let estimatedTokens = 0;
    let truncated = false;
    const includedSources = [];

    // Rough token estimation: ~4 characters per token
    const charsPerToken = 4;
    const maxChars = effectiveMaxTokens * charsPerToken;

    // Add current proposal context header
    formattedContext += `# CURRENT PROPOSAL CONTEXT\n\n`;
    formattedContext += `Proposal Name: ${currentContext.proposal_name}\n`;
    formattedContext += `Project Title: ${currentContext.project_title || 'N/A'}\n`;
    formattedContext += `Agency: ${currentContext.agency_name || 'N/A'}\n`;
    formattedContext += `Solicitation: ${currentContext.solicitation_number || 'N/A'}\n`;
    formattedContext += `Type: ${currentContext.project_type || 'N/A'}\n`;
    if (currentContext.contract_value) {
      formattedContext += `Contract Value: $${currentContext.contract_value.toLocaleString()}\n`;
    }
    if (target_section_type) {
      formattedContext += `Target Section Type: ${target_section_type}\n`;
    }
    formattedContext += `\n`;

    // Add reference material header
    formattedContext += `# REFERENCE MATERIAL FROM PAST PROPOSALS\n\n`;
    formattedContext += `The following content is extracted from ${scoredReferences.length} past proposal(s), ranked by relevance. `;
    formattedContext += `Use this as inspiration for structure, language, and approach, but ensure all new content is original and tailored to the current proposal.\n`;
    if (target_section_type) {
      formattedContext += `**Note:** Content is filtered to show ${target_section_type} sections and related material.\n`;
    }
    formattedContext += `\n`;

    // Add content from each reference proposal (sorted by relevance)
    for (let i = 0; i < scoredReferences.length; i++) {
      const ref = scoredReferences[i];
      let refContent = '';

      refContent += `## Reference Proposal ${i + 1}: ${ref.metadata.proposal_name}\n`;
      refContent += `**Relevance Score:** ${ref.relevance_score}/100 (${ref.relevance_reasons.join(', ')})\n`;
      refContent += `**Status:** ${ref.metadata.status}\n`;
      refContent += `**Agency:** ${ref.metadata.agency_name || 'N/A'}\n`;
      if (ref.metadata.contract_value) {
        refContent += `**Contract Value:** $${ref.metadata.contract_value.toLocaleString()}\n`;
      }
      refContent += `\n`;

      // Add win themes if available
      if (ref.metadata.win_themes) {
        refContent += `**Win Themes:**\n`;
        const themes = Array.isArray(ref.metadata.win_themes) 
          ? ref.metadata.win_themes 
          : (ref.metadata.win_themes.themes || []);
        themes.forEach(theme => {
          const themeText = typeof theme === 'string' ? theme : (theme.theme_title || theme.theme_statement);
          if (themeText) refContent += `- ${themeText}\n`;
        });
        refContent += `\n`;
      }

      // ===== NEW: SECTION-TYPE FILTERING =====
      // Add sections content with intelligent filtering
      if (ref.sections && ref.sections.length > 0) {
        let sectionsToInclude = ref.sections;
        
        // Filter by section type if specified
        if (target_section_type) {
          sectionsToInclude = ref.sections.filter(s => 
            s.section_type === target_section_type || 
            s.section_type === 'custom' || // Always include custom sections
            !s.section_type // Include sections without type as fallback
          );
          
          console.log(`[buildProposalContext] 🎯 Filtered to ${sectionsToInclude.length} sections (type: ${target_section_type})`);
        }

        if (sectionsToInclude.length > 0) {
          refContent += `### Proposal Sections (${sectionsToInclude.length} relevant)\n\n`;
          
          sectionsToInclude.forEach(section => {
            if (section.content && section.content.trim().length > 0) {
              // Smart truncation based on total token budget
              const maxSectionLength = effectiveMaxTokens > 50000 ? 5000 : 2000;
              const sectionContent = section.content.length > maxSectionLength
                ? section.content.substring(0, maxSectionLength) + '... [truncated for brevity]'
                : section.content;
              
              refContent += `#### ${section.section_name} (${section.section_type || 'unknown type'})\n`;
              refContent += `Status: ${section.status || 'unknown'} | Word Count: ${section.word_count || 'N/A'}\n`;
              refContent += `${sectionContent}\n\n`;
            }
          });
        } else if (target_section_type) {
          refContent += `*Note: No ${target_section_type} sections found in this reference*\n\n`;
        }
      }

      // Add key documents excerpts (only if include_documents = true)
      if (include_documents && ref.documents && ref.documents.length > 0) {
        const parsedDocs = ref.documents.filter(d => d.parse_status === 'success' && d.text_content);
        if (parsedDocs.length > 0) {
          refContent += `### Key Documents (${parsedDocs.length})\n\n`;
          parsedDocs.forEach(doc => {
            // Larger excerpts for higher token budgets
            const excerptLength = effectiveMaxTokens > 50000 ? 1000 : 500;
            const excerpt = doc.text_content.substring(0, excerptLength);
            refContent += `**${doc.file_name}** (${doc.document_type}):\n${excerpt}...${doc.text_content.length > excerptLength ? ' [excerpt]' : ''}\n\n`;
          });
        }
      }

      // Add resources (only if include_resources = true)
      if (include_resources && ref.resources && ref.resources.length > 0) {
        const usefulResources = ref.resources.filter(r => 
          r.text_content && 
          r.text_content.trim().length > 100 &&
          (!target_section_type || r.content_category === target_section_type || r.content_category === 'general')
        );
        
        if (usefulResources.length > 0) {
          refContent += `### Resources & Boilerplate (${usefulResources.length})\n\n`;
          usefulResources.slice(0, 5).forEach(resource => { // Limit to top 5 resources
            const maxResourceLength = 1000;
            const resourceContent = resource.text_content.length > maxResourceLength
              ? resource.text_content.substring(0, maxResourceLength) + '... [truncated]'
              : resource.text_content;
            
            refContent += `**${resource.title || resource.file_name}** (${resource.resource_type}):\n${resourceContent}\n\n`;
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
      formattedContext += `---\n\n`; // Separator between references
      
      includedSources.push({
        proposal_id: ref.proposal_id,
        proposal_name: ref.metadata.proposal_name,
        status: ref.metadata.status,
        agency: ref.metadata.agency_name,
        relevance_score: ref.relevance_score,
        relevance_reasons: ref.relevance_reasons
      });
    }

    estimatedTokens = Math.ceil(formattedContext.length / charsPerToken);

    // =====================================================
    // STEP 5: Add usage instructions for AI
    // =====================================================
    formattedContext += `\n# AI WRITING INSTRUCTIONS\n\n`;
    formattedContext += `Use the above reference material to inform your writing. `;
    formattedContext += `Draw inspiration from successful structures, persuasive language, and technical approaches. `;
    formattedContext += `However, ensure all generated content is:\n`;
    formattedContext += `1. **Original** - Not copied directly from references\n`;
    formattedContext += `2. **Specific** - Tailored to the current proposal's unique requirements\n`;
    formattedContext += `3. **Traceable** - When a reference significantly influenced an approach, note it like: [Based on Reference 1's approach]\n`;
    formattedContext += `4. **Professional** - Maintain formal government proposal tone\n`;
    if (target_section_type) {
      formattedContext += `5. **Focused** - This content is specifically for a ${target_section_type.replace('_', ' ')} section\n`;
    }
    formattedContext += `\n`;

    // =====================================================
    // STEP 6: Return comprehensive context package with diagnostics
    // =====================================================
    console.log('[buildProposalContext] ✅ Context built successfully');
    console.log(`[buildProposalContext] 📊 Estimated tokens: ${estimatedTokens.toLocaleString()} / ${effectiveMaxTokens.toLocaleString()}`);
    console.log(`[buildProposalContext] ✅ ${includedSources.length} sources included, ${parseErrors.length} errors`);

    return Response.json({
      status: 'success',
      context: {
        current_proposal: currentContext,
        reference_proposals: referenceData.map(r => ({
          proposal_id: r.proposal_id,
          proposal_name: r.metadata.proposal_name,
          status: r.metadata.status,
          sections_count: r.sections.length,
          documents_count: r.documents.length,
          relevance_score: r.relevance_score
        })),
        formatted_prompt_context: formattedContext
      },
      metadata: {
        total_references: reference_proposal_ids.length,
        references_included: includedSources.length,
        references_failed: parseErrors.length,
        estimated_tokens: estimatedTokens,
        max_tokens: effectiveMaxTokens,
        token_utilization_percentage: Math.round((estimatedTokens / effectiveMaxTokens) * 100),
        truncated: truncated,
        sources: includedSources,
        parse_errors: parseErrors, // NEW: Return parse errors for UI display
        llm_provider: llm_provider,
        section_type_filter: target_section_type,
        settings: {
          include_documents,
          include_resources,
          prioritize_winning
        }
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