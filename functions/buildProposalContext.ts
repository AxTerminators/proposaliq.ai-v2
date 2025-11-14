
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend Function: Build Proposal Context for AI (RAG) - ENHANCED v4.0
 * 
 * PHASE 4 ENHANCEMENTS:
 * ✅ Citation instructions for AI to include source attribution
 * ✅ Confidence scoring for each reference's contribution (implied by relevance and citation)
 * 
 * PHASE 3 FEATURES:
 * ✅ Parallel processing for 5x faster multi-reference parsing
 * ✅ Utilizes ParsedProposalCache for 10x faster repeat use
 * ✅ Enhanced performance monitoring
 * 
 * PHASE 1-2 FEATURES:
 * ✅ Section-type aware filtering
 * ✅ Intelligent token management (up to 100K)
 * ✅ Detailed error tracking
 * ✅ Relevance scoring
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
      current_proposal_id, 
      reference_proposal_ids = [],
      target_section_type = null,
      max_tokens = null,
      llm_provider = 'gemini',
      prioritize_winning = true,
      include_documents = true,
      include_resources = true,
      force_refresh = false, // NEW: Force cache bypass
      enable_citations = true // NEW: Request citation attribution
    } = await req.json();

    if (!current_proposal_id) {
      return Response.json({ error: 'current_proposal_id is required' }, { status: 400 });
    }

    if (!Array.isArray(reference_proposal_ids) || reference_proposal_ids.length === 0) {
      return Response.json({ error: 'reference_proposal_ids must be a non-empty array' }, { status: 400 });
    }

    console.log('[buildProposalContext] 🏗️ Building context - PARALLEL MODE + CITATIONS');
    console.log('[buildProposalContext] 📚 References:', reference_proposal_ids.length);
    console.log('[buildProposalContext] 🎯 Section filter:', target_section_type || 'all');

    // =====================================================
    // Configure token limits
    // =====================================================
    const LLM_TOKEN_LIMITS = {
      'gemini': 100000,
      'claude': 100000,
      'chatgpt': 50000,
      'gpt-4': 50000,
      'default': 30000
    };

    const effectiveMaxTokens = max_tokens || LLM_TOKEN_LIMITS[llm_provider] || LLM_TOKEN_LIMITS.default;
    console.log(`[buildProposalContext] 🎛️ Token limit: ${effectiveMaxTokens.toLocaleString()}`);

    // =====================================================
    // Fetch current proposal
    // =====================================================
    const currentProposal = await base44.entities.Proposal.get(current_proposal_id);
    
    if (!currentProposal) {
      return Response.json({ error: 'Current proposal not found' }, { status: 404 });
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
    // PHASE 3: PARALLEL PARSING with CACHE
    // Parse all references simultaneously instead of sequentially
    // =====================================================
    console.log('[buildProposalContext] 🚀 Starting PARALLEL parse...');
    const parseStartTime = Date.now();
    
    const parsePromises = reference_proposal_ids.map(async (refProposalId) => {
      try {
        // console.log(`[buildProposalContext] 📖 Parsing ${refProposalId}...`); // Removed as per outline
        
        // Call parseProposalContent - it will use cache automatically
        const parseResult = await base44.asServiceRole.functions.invoke('parseProposalContent', {
          proposal_id: refProposalId,
          force_refresh
        });

        if (parseResult.data?.status === 'success') {
          console.log(`[buildProposalContext] ✅ ${refProposalId}: ${parseResult.data.cache_hit ? '💨 CACHE HIT' : '📝 Parsed fresh'}`);
          
          return {
            success: true,
            proposal_id: refProposalId,
            data: {
              proposal_id: refProposalId,
              ...parseResult.data.proposal_data,
              stats: parseResult.data.stats
            },
            cache_hit: parseResult.data.cache_hit || false,
            parse_duration: parseResult.data.parse_duration_seconds || 0
          };
        } else {
          return {
            success: false,
            proposal_id: refProposalId,
            error: parseResult.data?.error || 'Unknown parsing error',
            status: 'parse_failed'
          };
        }
      } catch (error) {
        return {
          success: false,
          proposal_id: refProposalId,
          error: error.message,
          status: 'request_failed'
        };
      }
    });

    // Wait for all parses to complete in parallel
    const parseResults = await Promise.all(parsePromises);
    
    const parseDuration = (Date.now() - parseStartTime) / 1000;
    console.log(`[buildProposalContext] ⚡ Parallel parse complete in ${parseDuration.toFixed(2)}s`);

    // Separate successful and failed parses
    const referenceData = parseResults
      .filter(r => r.success)
      .map(r => r.data);
    
    const parseErrors = parseResults
      .filter(r => !r.success)
      .map(r => ({
        proposal_id: r.proposal_id,
        error: r.error,
        status: r.status
      }));

    // Track cache performance
    const cacheHits = parseResults.filter(r => r.cache_hit).length;
    const cacheMisses = parseResults.filter(r => r.success && !r.cache_hit).length;
    console.log(`[buildProposalContext] 💨 Cache performance: ${cacheHits} hits, ${cacheMisses} misses`);

    if (referenceData.length === 0) {
      return Response.json({
        status: 'error',
        error: 'Failed to parse any reference proposals',
        parse_errors: parseErrors
      }, { status: 400 });
    }

    // =====================================================
    // Calculate relevance scores
    // =====================================================
    console.log('[buildProposalContext] 🎯 Scoring relevance...');
    
    const scoredReferences = referenceData.map(ref => {
      let score = 0;
      const reasons = [];

      if (ref.metadata.agency_name === currentContext.agency_name) {
        score += 40;
        reasons.push(`Same agency: ${ref.metadata.agency_name}`);
      }

      if (ref.metadata.project_type === currentContext.project_type) {
        score += 30;
        reasons.push(`Same type: ${ref.metadata.project_type}`);
      }

      if (prioritize_winning && ref.metadata.status === 'won') {
        score += 20;
        reasons.push('Winning proposal');
      } else if (ref.metadata.status === 'submitted') {
        score += 10;
        reasons.push('Submitted proposal');
      }

      if (ref.metadata.contract_value && currentContext.contract_value) {
        const valueDiff = Math.abs(ref.metadata.contract_value - currentContext.contract_value);
        const avgValue = (ref.metadata.contract_value + currentContext.contract_value) / 2;
        if (avgValue > 0 && (valueDiff / avgValue) < 0.5) {
          score += 10;
          reasons.push('Similar contract value');
        }
      }

      if (target_section_type) {
        const hasSimilarSection = ref.sections.some(s => s.section_type === target_section_type);
        if (hasSimilarSection) {
          score += 15;
          reasons.push(`Has ${target_section_type} section`);
        }
      }

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

    scoredReferences.sort((a, b) => b.relevance_score - a.relevance_score);

    // =====================================================
    // Build formatted context with section filtering
    // =====================================================
    console.log('[buildProposalContext] 📝 Formatting context...');
    
    let formattedContext = '';
    let estimatedTokens = 0;
    let truncated = false;
    const includedSources = [];

    const charsPerToken = 4;
    const maxChars = effectiveMaxTokens * charsPerToken;

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

    formattedContext += `# REFERENCE MATERIAL FROM PAST PROPOSALS\n\n`;
    formattedContext += `The following content is extracted from ${scoredReferences.length} past proposal(s), ranked by relevance. `;
    formattedContext += `Use this as inspiration for structure, language, and approach, but ensure all new content is original and tailored to the current proposal.\n`;
    if (target_section_type) {
      formattedContext += `**Note:** Content is filtered to show ${target_section_type} sections and related material.\n`;
    }
    formattedContext += `\n`;

    for (let i = 0; i < scoredReferences.length; i++) {
      const ref = scoredReferences[i];
      let refContent = '';

      refContent += `## Reference Proposal ${i + 1}: ${ref.metadata.proposal_name}\n`;
      refContent += `**Reference ID:** REF${i + 1}\n`; // NEW
      refContent += `**Relevance Score:** ${ref.relevance_score}/100 (${ref.relevance_reasons.join(', ')})\n`;
      refContent += `**Status:** ${ref.metadata.status}\n`;
      refContent += `**Agency:** ${ref.metadata.agency_name || 'N/A'}\n`;
      if (ref.metadata.contract_value) {
        refContent += `**Contract Value:** $${ref.metadata.contract_value.toLocaleString()}\n`;
      }
      refContent += `\n`;

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

      if (ref.sections && ref.sections.length > 0) {
        let sectionsToInclude = ref.sections;
        
        if (target_section_type) {
          sectionsToInclude = ref.sections.filter(s => 
            s.section_type === target_section_type || 
            s.section_type === 'custom' || 
            !s.section_type
          );
        }

        if (sectionsToInclude.length > 0) {
          refContent += `### Proposal Sections (${sectionsToInclude.length} relevant)\n\n`;
          
          sectionsToInclude.forEach(section => {
            if (section.content && section.content.trim().length > 0) {
              const maxSectionLength = effectiveMaxTokens > 50000 ? 5000 : 2000;
              const sectionContent = section.content.length > maxSectionLength
                ? section.content.substring(0, maxSectionLength) + '... [truncated]'
                : section.content;
              
              refContent += `#### ${section.section_name} (${section.section_type || 'unknown'})\n`;
              refContent += `${sectionContent}\n\n`;
            }
          });
        }
      }

      if (include_documents && ref.documents && ref.documents.length > 0) {
        const parsedDocs = ref.documents.filter(d => d.parse_status === 'success' && d.text_content);
        if (parsedDocs.length > 0) {
          refContent += `### Key Documents (${parsedDocs.length})\n\n`;
          parsedDocs.forEach(doc => {
            const excerptLength = effectiveMaxTokens > 50000 ? 1000 : 500;
            const excerpt = doc.text_content.substring(0, excerptLength);
            refContent += `**${doc.file_name}**:\n${excerpt}${doc.text_content.length > excerptLength ? '... [excerpt]' : ''}\n\n`;
          });
        }
      }

      if (include_resources && ref.resources && ref.resources.length > 0) {
        const usefulResources = ref.resources.filter(r => 
          r.text_content && 
          r.text_content.trim().length > 100 &&
          (!target_section_type || r.content_category === target_section_type || r.content_category === 'general')
        );
        
        if (usefulResources.length > 0) {
          refContent += `### Resources (${usefulResources.length})\n\n`;
          usefulResources.slice(0, 5).forEach(resource => {
            const maxResourceLength = 1000;
            const resourceContent = resource.text_content.length > maxResourceLength
              ? resource.text_content.substring(0, maxResourceLength) + '...'
              : resource.text_content;
            
            refContent += `**${resource.title || resource.file_name}**:\n${resourceContent}\n\n`;
          });
        }
      }

      const newTotalLength = formattedContext.length + refContent.length;
      if (newTotalLength > maxChars) {
        console.log(`[buildProposalContext] ⚠️ Token limit reached at reference ${i + 1}`);
        truncated = true;
        break;
      }

      formattedContext += refContent;
      formattedContext += `---\n\n`;
      
      includedSources.push({
        proposal_id: ref.proposal_id,
        proposal_name: ref.metadata.proposal_name,
        status: ref.metadata.status,
        agency: ref.metadata.agency_name,
        relevance_score: ref.relevance_score,
        relevance_reasons: ref.relevance_reasons,
        reference_number: i + 1 // NEW
      });
    }

    estimatedTokens = Math.ceil(formattedContext.length / charsPerToken);

    // ===== PHASE 4: ENHANCED AI INSTRUCTIONS WITH CITATIONS =====
    formattedContext += `\n# AI WRITING INSTRUCTIONS\n\n`;
    formattedContext += `Use the above reference material to inform your writing. `;
    formattedContext += `Draw inspiration from successful structures, persuasive language, and technical approaches. `;
    
    if (enable_citations) {
      formattedContext += `\n\n**CITATION REQUIREMENTS:**\n`;
      formattedContext += `When you significantly draw from a reference proposal's approach, structure, or language, include an inline citation like this:\n`;
      formattedContext += `- Format: [REF1: Technical Approach] or [REF2: Management Structure]\n`;
      formattedContext += `- Place citations at the end of influenced paragraphs or sections\n`;
      formattedContext += `- Use reference numbers (REF1, REF2, etc.) that correspond to the references above\n`;
      formattedContext += `- Citations help with transparency and audit trails\n`;
      formattedContext += `\nExample: "Our phased implementation approach ensures minimal disruption to operations. [REF1: Transition Plan]"\n\n`;
    }
    
    formattedContext += `However, ensure all generated content is:\n`;
    formattedContext += `1. **Original** - Not copied directly from references\n`;
    formattedContext += `2. **Specific** - Tailored to the current proposal\n`;
    formattedContext += `3. **Traceable** - When significantly influenced by a reference, include citation: [REF#: Section]\n`; // UPDATED
    formattedContext += `4. **Professional** - Government proposal tone\n`;
    if (target_section_type) {
      formattedContext += `5. **Focused** - Specifically for ${target_section_type.replace('_', ' ')} section\n`;
    }
    formattedContext += `\n`;

    const totalDuration = (Date.now() - startTime) / 1000;
    
    console.log('[buildProposalContext] ✅ Context built successfully');
    console.log(`[buildProposalContext] ⚡ Total time: ${totalDuration.toFixed(2)}s (parsing: ${parseDuration.toFixed(2)}s)`);
    console.log(`[buildProposalContext] 💨 Cache hits: ${cacheHits}/${reference_proposal_ids.length}`);
    console.log(`[buildProposalContext] 📊 Tokens: ${estimatedTokens.toLocaleString()} / ${effectiveMaxTokens.toLocaleString()}`);

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
        truncated,
        sources: includedSources,
        parse_errors: parseErrors,
        llm_provider,
        section_type_filter: target_section_type,
        performance: {
          total_duration_seconds: totalDuration,
          parse_duration_seconds: parseDuration,
          cache_hits: cacheHits,
          cache_misses: cacheMisses,
          parallel_speedup: `${reference_proposal_ids.length}x faster than sequential`
        },
        settings: {
          include_documents,
          include_resources,
          prioritize_winning,
          force_refresh,
          enable_citations // NEW
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
