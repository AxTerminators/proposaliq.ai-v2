import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * AI Proposal Writer Backend Service
 * 
 * This function generates proposal content using AI, with configurable settings,
 * context prioritization, and comprehensive audit trails.
 * 
 * Flow:
 * 1. Authenticate user and retrieve proposal context
 * 2. Fetch AI configuration (org-specific or global default)
 * 3. Gather and prioritize context from multiple sources
 * 4. Construct prompt with guardrails applied
 * 5. Invoke LLM for content generation
 * 6. Store generated content with metadata
 * 7. Return results with confidence scoring
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { 
      proposalId, 
      sectionType, 
      generationParams = {}, 
      userEmail,
      agentTriggered = false 
    } = await req.json();

    // Validate required parameters
    if (!proposalId || !sectionType) {
      return Response.json({ 
        error: 'Missing required parameters: proposalId and sectionType are required' 
      }, { status: 400 });
    }

    console.log(`[AI Writer] Starting generation for proposal ${proposalId}, section: ${sectionType}`);

    // ============================================
    // STEP 1: RETRIEVE PROPOSAL CONTEXT
    // ============================================
    const proposal = await base44.asServiceRole.entities.Proposal.filter({ id: proposalId });
    if (!proposal || proposal.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }
    const proposalData = proposal[0];

    // ============================================
    // STEP 2: FETCH AI CONFIGURATION
    // ============================================
    const aiConfig = await getAiConfiguration(base44, proposalData.organization_id);
    if (!aiConfig) {
      return Response.json({ 
        error: 'No AI configuration found. Please set up AI settings first.' 
      }, { status: 500 });
    }

    // Merge generation params with config defaults
    const finalConfig = {
      ...aiConfig,
      tone: generationParams.tone || aiConfig.default_tone,
      word_count_min: generationParams.word_count_min || aiConfig.default_word_count_min,
      word_count_max: generationParams.word_count_max || aiConfig.default_word_count_max,
      reading_level: generationParams.reading_level || aiConfig.reading_level,
    };

    console.log(`[AI Writer] Using AI config: ${aiConfig.config_name}, LLM: ${aiConfig.llm_provider}`);

    // ============================================
    // STEP 3: GATHER CONTEXT FROM MULTIPLE SOURCES
    // ============================================
    const context = await gatherContext(base44, proposalData, finalConfig);
    
    // ============================================
    // STEP 4: CONSTRUCT PROMPT
    // ============================================
    const prompt = constructPrompt(finalConfig, sectionType, proposalData, context, generationParams);
    
    console.log(`[AI Writer] Prompt constructed, length: ${prompt.length} chars`);

    // ============================================
    // STEP 5: INVOKE LLM
    // ============================================
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: prompt,
      add_context_from_internet: false, // We provide our own context
    });

    const generatedContent = llmResponse;
    
    console.log(`[AI Writer] Content generated successfully`);

    // ============================================
    // STEP 6: CALCULATE CONFIDENCE SCORE
    // ============================================
    const confidenceScore = finalConfig.enable_confidence_scoring 
      ? await calculateConfidenceScore(base44, generatedContent, context, proposalData)
      : null;

    // ============================================
    // STEP 7: RUN COMPLIANCE CHECK (if enabled)
    // ============================================
    const complianceIssues = finalConfig.enable_compliance_check
      ? await checkCompliance(generatedContent, context.solicitationContent, finalConfig)
      : [];

    // ============================================
    // STEP 8: STORE GENERATED CONTENT
    // ============================================
    const sectionData = {
      proposal_id: proposalId,
      section_name: sectionType,
      section_type: sectionType,
      content: generatedContent,
      word_count: countWords(generatedContent),
      status: 'ai_generated',
      ai_prompt_used: prompt,
      ai_reference_sources: context.sources,
      ai_context_summary: context.summary,
      ai_generation_metadata: {
        estimated_tokens_used: Math.ceil(prompt.length / 4), // Rough estimate
        reference_proposals_count: context.referenceProposalsCount || 0,
        context_truncated: context.truncated || false,
        generated_at: new Date().toISOString(),
        agent_triggered: agentTriggered,
        user_email: userEmail || user.email,
        ai_config_id: aiConfig.id,
        ai_config_name: aiConfig.config_name,
        confidence_score: confidenceScore,
        compliance_issues: complianceIssues,
        llm_provider: aiConfig.llm_provider,
        temperature: finalConfig.temperature,
      }
    };

    // Check if section already exists
    const existingSections = await base44.asServiceRole.entities.ProposalSection.filter({
      proposal_id: proposalId,
      section_type: sectionType
    });

    let savedSection;
    if (existingSections && existingSections.length > 0) {
      // Update existing section
      savedSection = await base44.asServiceRole.entities.ProposalSection.update(
        existingSections[0].id,
        sectionData
      );
      console.log(`[AI Writer] Updated existing section: ${existingSections[0].id}`);
    } else {
      // Create new section
      savedSection = await base44.asServiceRole.entities.ProposalSection.create(sectionData);
      console.log(`[AI Writer] Created new section: ${savedSection.id}`);
    }

    // ============================================
    // STEP 9: RETURN RESPONSE
    // ============================================
    return Response.json({
      success: true,
      section_id: savedSection.id,
      content: generatedContent,
      word_count: sectionData.word_count,
      confidence_score: confidenceScore,
      compliance_issues: complianceIssues,
      metadata: {
        sources_used: context.sources,
        context_summary: context.summary,
        ai_config_used: aiConfig.config_name,
      }
    });

  } catch (error) {
    console.error('[AI Writer] Error:', error);
    return Response.json({ 
      error: 'Failed to generate content',
      details: error.message 
    }, { status: 500 });
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetch AI Configuration with fallback to global default
 */
async function getAiConfiguration(base44, organizationId) {
  try {
    // First, try to get organization-specific config
    if (organizationId) {
      const orgConfigs = await base44.asServiceRole.entities.AiConfiguration.filter({
        organization_id: organizationId,
        is_active: true
      });
      if (orgConfigs && orgConfigs.length > 0) {
        console.log(`[AI Writer] Using organization-specific config`);
        return orgConfigs[0];
      }
    }

    // Fallback to global default
    const globalConfigs = await base44.asServiceRole.entities.AiConfiguration.filter({
      is_global_default: true,
      is_active: true
    });
    
    if (globalConfigs && globalConfigs.length > 0) {
      console.log(`[AI Writer] Using global default config`);
      return globalConfigs[0];
    }

    // No config found
    console.error('[AI Writer] No AI configuration found');
    return null;
  } catch (error) {
    console.error('[AI Writer] Error fetching AI config:', error);
    return null;
  }
}

/**
 * Gather context from multiple sources with prioritization
 */
async function gatherContext(base44, proposal, config) {
  const context = {
    solicitationContent: '',
    referenceContent: '',
    contentLibraryContent: '',
    sources: [],
    summary: '',
    referenceProposalsCount: 0,
    truncated: false,
  };

  try {
    // Priority 1: Solicitation Documents (highest weight)
    if (config.use_solicitation_parsing) {
      const solicitationDocs = await base44.asServiceRole.entities.SolicitationDocument.filter({
        proposal_id: proposal.id
      });
      
      if (solicitationDocs && solicitationDocs.length > 0) {
        context.solicitationContent = solicitationDocs.map(doc => 
          `Document: ${doc.file_name}\n[Content would be parsed from file_url: ${doc.file_url}]`
        ).join('\n\n');
        
        context.sources.push(...solicitationDocs.map(doc => ({
          type: 'solicitation',
          name: doc.file_name,
          weight: config.context_priority_weights?.solicitation_weight || 1.0
        })));
      }
    }

    // Priority 2: Reference Proposals (RAG)
    if (config.use_rag && proposal.reference_proposal_ids && proposal.reference_proposal_ids.length > 0) {
      const refProposalIds = proposal.reference_proposal_ids.slice(0, 5); // Limit to top 5
      context.referenceProposalsCount = refProposalIds.length;
      
      for (const refId of refProposalIds) {
        const refSections = await base44.asServiceRole.entities.ProposalSection.filter({
          proposal_id: refId
        });
        
        if (refSections && refSections.length > 0) {
          context.referenceContent += refSections.map(s => 
            `[Reference] ${s.section_name}: ${s.content?.substring(0, 500)}...`
          ).join('\n\n');
          
          context.sources.push({
            type: 'reference_proposal',
            proposal_id: refId,
            sections_count: refSections.length,
            weight: config.context_priority_weights?.reference_proposals_weight || 0.8
          });
        }
      }
    }

    // Priority 3: Content Library
    if (config.use_content_library && proposal.organization_id) {
      const contentLibraryItems = await base44.asServiceRole.entities.ProposalResource.filter({
        organization_id: proposal.organization_id,
        resource_type: 'boilerplate_text'
      });
      
      if (contentLibraryItems && contentLibraryItems.length > 0) {
        // Take top 3 most relevant items
        const relevantItems = contentLibraryItems.slice(0, 3);
        context.contentLibraryContent = relevantItems.map(item => 
          `[Boilerplate - ${item.content_category}]: ${item.boilerplate_content?.substring(0, 300)}...`
        ).join('\n\n');
        
        context.sources.push(...relevantItems.map(item => ({
          type: 'content_library',
          title: item.title,
          category: item.content_category,
          weight: config.context_priority_weights?.content_library_weight || 0.6
        })));
      }
    }

    // Generate context summary
    context.summary = `Used ${context.sources.length} sources: ` +
      `${context.sources.filter(s => s.type === 'solicitation').length} solicitation docs, ` +
      `${context.sources.filter(s => s.type === 'reference_proposal').length} reference proposals, ` +
      `${context.sources.filter(s => s.type === 'content_library').length} content library items`;

    return context;
  } catch (error) {
    console.error('[AI Writer] Error gathering context:', error);
    return context;
  }
}

/**
 * Construct the full prompt for LLM
 */
function constructPrompt(config, sectionType, proposal, context, params) {
  let prompt = '';

  // System instructions
  if (config.system_instructions) {
    prompt += `${config.system_instructions}\n\n`;
  }

  // Core prompt template with substitutions
  let corePrompt = config.core_prompt_template || 
    'Generate a {section_type} section with a {tone} tone.';
  
  corePrompt = corePrompt
    .replace(/{section_type}/g, sectionType)
    .replace(/{tone}/g, config.tone)
    .replace(/{reading_level}/g, config.reading_level)
    .replace(/{word_count_min}/g, config.word_count_min)
    .replace(/{word_count_max}/g, config.word_count_max);

  prompt += `${corePrompt}\n\n`;

  // Proposal context
  prompt += `PROPOSAL DETAILS:\n`;
  prompt += `- Title: ${proposal.proposal_name}\n`;
  prompt += `- Agency: ${proposal.agency_name || 'Not specified'}\n`;
  prompt += `- Project Title: ${proposal.project_title || 'Not specified'}\n`;
  prompt += `- Solicitation Number: ${proposal.solicitation_number || 'Not specified'}\n\n`;

  // Solicitation requirements (highest priority)
  if (context.solicitationContent) {
    prompt += `SOLICITATION REQUIREMENTS:\n${context.solicitationContent}\n\n`;
  }

  // Reference content
  if (context.referenceContent) {
    prompt += `REFERENCE EXAMPLES FROM WINNING PROPOSALS:\n${context.referenceContent}\n\n`;
  }

  // Content library
  if (context.contentLibraryContent) {
    prompt += `APPROVED BOILERPLATE CONTENT:\n${context.contentLibraryContent}\n\n`;
  }

  // Apply guardrails
  if (config.guardrails) {
    if (config.guardrails.forbidden_phrases && config.guardrails.forbidden_phrases.length > 0) {
      prompt += `IMPORTANT: Never use these phrases: ${config.guardrails.forbidden_phrases.join(', ')}\n`;
    }
    
    if (config.guardrails.formatting_rules && config.guardrails.formatting_rules.length > 0) {
      prompt += `FORMATTING RULES:\n${config.guardrails.formatting_rules.join('\n')}\n\n`;
    }

    if (config.guardrails.required_disclaimers && config.guardrails.required_disclaimers.length > 0) {
      prompt += `REQUIRED DISCLAIMERS (include these):\n${config.guardrails.required_disclaimers.join('\n')}\n\n`;
    }
  }

  // Additional user context
  if (params.additionalContext) {
    prompt += `ADDITIONAL CONTEXT:\n${params.additionalContext}\n\n`;
  }

  // Citation instructions
  if (config.citation_style !== 'none') {
    prompt += `Use ${config.citation_style} citation style when referencing sources.\n\n`;
  }

  prompt += `Now generate the ${sectionType} section:`;

  return prompt;
}

/**
 * Calculate confidence score for generated content
 */
async function calculateConfidenceScore(base44, content, context, proposal) {
  try {
    // Simple heuristic-based confidence scoring
    let score = 50; // Base score

    // Factor 1: Content length appropriateness
    const wordCount = countWords(content);
    if (wordCount >= 200 && wordCount <= 1500) {
      score += 15;
    } else if (wordCount < 100) {
      score -= 10;
    }

    // Factor 2: Context availability
    if (context.solicitationContent.length > 0) score += 15;
    if (context.referenceContent.length > 0) score += 10;
    if (context.contentLibraryContent.length > 0) score += 5;

    // Factor 3: Number of sources
    if (context.sources.length >= 3) score += 5;

    // Cap between 0-100
    score = Math.max(0, Math.min(100, score));

    return score;
  } catch (error) {
    console.error('[AI Writer] Error calculating confidence score:', error);
    return null;
  }
}

/**
 * Check compliance against solicitation requirements
 */
async function checkCompliance(content, solicitationContent, config) {
  const issues = [];

  try {
    // Check forbidden phrases
    if (config.guardrails?.forbidden_phrases) {
      for (const phrase of config.guardrails.forbidden_phrases) {
        if (content.toLowerCase().includes(phrase.toLowerCase())) {
          issues.push({
            type: 'forbidden_phrase',
            message: `Contains forbidden phrase: "${phrase}"`,
            severity: 'high'
          });
        }
      }
    }

    // Check required disclaimers
    if (config.guardrails?.required_disclaimers) {
      for (const disclaimer of config.guardrails.required_disclaimers) {
        if (!content.includes(disclaimer)) {
          issues.push({
            type: 'missing_disclaimer',
            message: `Missing required disclaimer: "${disclaimer.substring(0, 50)}..."`,
            severity: 'medium'
          });
        }
      }
    }

    // Simple length check
    const wordCount = countWords(content);
    if (wordCount < config.default_word_count_min) {
      issues.push({
        type: 'word_count',
        message: `Content is shorter than minimum (${wordCount} vs ${config.default_word_count_min})`,
        severity: 'low'
      });
    }

    return issues;
  } catch (error) {
    console.error('[AI Writer] Error checking compliance:', error);
    return [];
  }
}

/**
 * Count words in text
 */
function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).length;
}