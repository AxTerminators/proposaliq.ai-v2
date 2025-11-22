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
    const context = await gatherContext(base44, proposalData, finalConfig, sectionType);
    
    // ============================================
    // STEP 4: CONSTRUCT PROMPT
    // ============================================
    const prompt = constructPrompt(finalConfig, sectionType, proposalData, context, generationParams);
    
    console.log(`[AI Writer] Prompt constructed, length: ${prompt.length} chars`);

    // ============================================
    // STEP 5: INVOKE LLM WITH RETRY LOGIC
    // ============================================
    let generatedContent;
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
    while (retryCount < maxRetries) {
      try {
        const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: prompt,
          add_context_from_internet: false, // We provide our own context
        });

        generatedContent = llmResponse;
        console.log(`[AI Writer] Content generated successfully${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
        break; // Success, exit retry loop
        
      } catch (error) {
        retryCount++;
        console.error(`[AI Writer] LLM invocation failed (attempt ${retryCount}/${maxRetries}):`, error.message);
        
        if (retryCount >= maxRetries) {
          // All retries exhausted
          throw new Error(`Failed to generate content after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Check if error is token-related
        const isTokenError = error.message.toLowerCase().includes('token') || 
                            error.message.toLowerCase().includes('limit') ||
                            error.message.toLowerCase().includes('context');
        
        if (isTokenError && retryCount < maxRetries) {
          // Reduce context and retry
          console.log('[AI Writer] Token limit issue detected, reducing context...');
          const reductionFactor = 0.5; // Reduce by 50%
          
          // Truncate reference content
          if (context.referenceContent) {
            const targetLength = Math.floor(context.referenceContent.length * reductionFactor);
            context.referenceContent = context.referenceContent.substring(0, targetLength);
            context.truncated = true;
          }
          
          // Reconstruct prompt with reduced context
          prompt = constructPrompt(finalConfig, sectionType, proposalData, context, generationParams);
          console.log(`[AI Writer] Retry ${retryCount} with reduced context (${prompt.length} chars)`);
        }
        
        // Exponential backoff delay
        const delay = baseDelay * Math.pow(2, retryCount - 1);
        console.log(`[AI Writer] Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

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
      ? await checkCompliance(generatedContent, context, finalConfig)
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
    let versionNumber = 1;
    
    if (existingSections && existingSections.length > 0) {
      const existingSection = existingSections[0];
      
      // Get latest version number from history
      const historyRecords = await base44.asServiceRole.entities.ProposalSectionHistory.filter(
        { proposal_section_id: existingSection.id },
        '-version_number',
        1
      );
      versionNumber = historyRecords.length > 0 ? historyRecords[0].version_number + 1 : 1;
      
      // Save current content to history before updating
      if (existingSection.content) {
        await base44.asServiceRole.entities.ProposalSectionHistory.create({
          proposal_section_id: existingSection.id,
          version_number: versionNumber - 1,
          content: existingSection.content,
          changed_by_user_email: userEmail || 'system',
          changed_by_user_name: userEmail || 'System',
          change_summary: 'Saved before AI regeneration',
          word_count: existingSection.word_count,
          change_type: 'user_edit'
        });
      }
      
      savedSection = await base44.asServiceRole.entities.ProposalSection.update(
        existingSection.id,
        sectionData
      );
      console.log(`[AI Writer] Updated existing section: ${existingSection.id}`);
    } else {
      savedSection = await base44.asServiceRole.entities.ProposalSection.create(sectionData);
      console.log(`[AI Writer] Created new section: ${savedSection.id}`);
    }
    
    // Create history record for this AI generation
    await base44.asServiceRole.entities.ProposalSectionHistory.create({
      proposal_section_id: savedSection.id,
      version_number: versionNumber,
      content: generatedContent,
      changed_by_user_email: userEmail || 'system',
      changed_by_user_name: userEmail || 'AI System',
      change_summary: agentTriggered ? 'AI Agent generated content' : 'AI generated content',
      word_count: sectionData.word_count,
      change_type: existingSections && existingSections.length > 0 ? 'ai_regenerated' : 'ai_generated'
    });

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
 * Enhanced with solicitation parsing, RAG search, and intelligent content selection
 */
async function gatherContext(base44, proposal, config, sectionType) {
  const context = {
    solicitationContent: '',
    solicitationRequirements: [],
    referenceContent: '',
    contentLibraryContent: '',
    sources: [],
    summary: '',
    referenceProposalsCount: 0,
    truncated: false,
    totalTokensEstimate: 0,
  };

  const MAX_CONTEXT_TOKENS = 8000; // Reserve space for prompt and response
  let currentTokens = 0;

  try {
    // ============================================
    // Priority 1: Solicitation Documents (ENHANCED with supplementary doc prioritization)
    // ============================================
    if (config.use_solicitation_parsing) {
      try {
        // Use specialized supplementary context retriever
        const suppResult = await base44.asServiceRole.functions.invoke('retrieveSupplementaryContext', {
          proposal_id: proposal.id,
          query: sectionType,
          max_documents: 10
        });

        if (suppResult.data?.success && suppResult.data.documents?.length > 0) {
          console.log('[AI Writer] Using prioritized supplementary docs:', suppResult.data.context_summary);
          
          const sortedDocs = suppResult.data.documents;
          
          for (const doc of sortedDocs) {
            if (currentTokens >= MAX_CONTEXT_TOKENS) break;
            
            // Prioritize critical changes from amendments/Q&As
            let docContent = '';
            
            if (doc.is_supplementary) {
              // Mark supplementary docs clearly
              const typeLabel = doc.supplementary_type === 'amendment' ? '🔴 AMENDMENT' :
                              doc.supplementary_type === 'q_a_response' ? '⭐ Q&A RESPONSE' :
                              doc.supplementary_type === 'sow' || doc.supplementary_type === 'pws' ? '📋 SOW/PWS' :
                              '📄 SUPPLEMENTARY';
              
              docContent += `\n[${typeLabel}: ${doc.file_name}`;
              if (doc.amendment_number) docContent += ` - Amendment #${doc.amendment_number}`;
              docContent += `]\n`;
              
              // Add changes first (highest priority)
              if (doc.content_summary.changes_and_clarifications?.length > 0) {
                docContent += `CRITICAL CHANGES:\n`;
                doc.content_summary.changes_and_clarifications.slice(0, 5).forEach((change, idx) => {
                  docContent += `${idx + 1}. ${change}\n`;
                });
              }
              
              // Add requirements
              if (doc.content_summary.key_requirements?.length > 0) {
                docContent += `\nKEY REQUIREMENTS:\n`;
                doc.content_summary.key_requirements.slice(0, 3).forEach((req, idx) => {
                  docContent += `${idx + 1}. ${req}\n`;
                });
              }
            } else {
              // Base solicitation document
              docContent += `\n[BASE SOLICITATION: ${doc.file_name}]\n`;
              
              if (doc.content_summary.key_requirements?.length > 0) {
                docContent += `REQUIREMENTS:\n`;
                doc.content_summary.key_requirements.slice(0, 5).forEach((req, idx) => {
                  docContent += `${idx + 1}. ${req}\n`;
                  context.solicitationRequirements.push(req);
                });
              }
            }
            
            const docTokens = Math.ceil(docContent.length / 4);
            if (currentTokens + docTokens < MAX_CONTEXT_TOKENS) {
              context.solicitationContent += docContent;
              currentTokens += docTokens;
              
              context.sources.push({
                type: 'solicitation',
                name: doc.file_name,
                document_type: doc.document_type,
                is_supplementary: doc.is_supplementary,
                supplementary_type: doc.supplementary_type,
                priority_score: doc.priority_score,
                weight: doc.priority_score / 100 // Convert to 0-1 weight
              });
            }
          }
        } else {
          // Fallback to old method if retrieval fails
          console.warn('[AI Writer] Supplementary retrieval failed, using fallback');
          const solicitationDocs = await base44.asServiceRole.entities.SolicitationDocument.filter({
            proposal_id: proposal.id,
            rag_ingested: true
          });
          
          if (solicitationDocs && solicitationDocs.length > 0) {
            for (const doc of solicitationDocs) {
              const parsedContent = await parseSolicitationDocument(base44, doc);
              
              if (parsedContent) {
                const requirements = extractRequirements(parsedContent, sectionType);
                context.solicitationRequirements.push(...requirements);
                
                const relevantExcerpts = extractRelevantExcerpts(parsedContent, sectionType);
                context.solicitationContent += `\n[${doc.file_name}]\n${relevantExcerpts}\n`;
                
                currentTokens += Math.ceil(relevantExcerpts.length / 4);
              }
              
              context.sources.push({
                type: 'solicitation',
                name: doc.file_name,
                document_type: doc.document_type,
                weight: 1.0
              });
            }
          }
        }
      } catch (error) {
        console.error('[AI Writer] Error retrieving supplementary context:', error);
      }
    }

    // ============================================
    // Priority 2: Reference Proposals (RAG with semantic search & relevance scoring)
    // ============================================
    if (config.use_rag && proposal.reference_proposal_ids && proposal.reference_proposal_ids.length > 0) {
      const refProposalIds = proposal.reference_proposal_ids.slice(0, 5);
      context.referenceProposalsCount = refProposalIds.length;
      
      // Score reference proposals for relevance
      try {
        const scoringResult = await base44.asServiceRole.functions.invoke('scoreReferenceRelevance', {
          current_proposal_id: proposalData.id,
          candidate_proposal_ids: refProposalIds,
          target_section_type: sectionType
        });
        
        if (scoringResult.data?.status === 'success') {
          const scoredRefs = scoringResult.data.scores || [];
          
          // Sort by score and prioritize highly relevant ones
          const sortedRefs = scoredRefs
            .filter(r => r.score >= 30) // Minimum relevance threshold
            .sort((a, b) => b.score - a.score);
          
          for (const refScore of sortedRefs) {
            if (currentTokens >= MAX_CONTEXT_TOKENS) break;
            
            // Check cache first
            const cachedContent = await getCachedProposalContent(base44, refScore.proposal_id, sectionType);
            
            if (cachedContent) {
              const excerpt = cachedContent.substring(0, 1500); // Use more from highly relevant refs
              const excerptTokens = Math.ceil(excerpt.length / 4);
              
              if (currentTokens + excerptTokens < MAX_CONTEXT_TOKENS) {
                const winLabel = refScore.status === 'won' ? ' - ⭐ WINNING PROPOSAL' : '';
                const scoreLabel = ` (${refScore.score}% match)`;
                context.referenceContent += `\n[Reference${winLabel}${scoreLabel}]\n${excerpt}...\n\n`;
                currentTokens += excerptTokens;
                
                context.sources.push({
                  type: 'reference_proposal',
                  proposal_id: refScore.proposal_id,
                  proposal_name: refScore.proposal_name,
                  relevance_score: refScore.score,
                  relevance_reasons: refScore.reasons,
                  weight: config.context_priority_weights?.reference_proposals_weight || 0.8,
                  excerpt_preview: excerpt.substring(0, 200) + '...',
                  excerpt_start: 0,
                  excerpt_end: Math.min(1500, excerpt.length),
                  full_content_available: true
                });
              }
            }
          }
        }
      } catch (error) {
        console.warn('[AI Writer] Reference scoring failed, using fallback:', error.message);
        
        // Fallback to basic section retrieval
        for (const refId of refProposalIds) {
          if (currentTokens >= MAX_CONTEXT_TOKENS) break;
          
          const refSections = await base44.asServiceRole.entities.ProposalSection.filter({
            proposal_id: refId,
            section_type: sectionType
          });
          
          if (refSections && refSections.length > 0) {
            const section = refSections[0];
            if (section.content) {
              const excerpt = section.content.substring(0, 1000);
              const excerptTokens = Math.ceil(excerpt.length / 4);
              
              if (currentTokens + excerptTokens < MAX_CONTEXT_TOKENS) {
                context.referenceContent += `\n[Reference: ${section.section_name}]\n${excerpt}...\n\n`;
                currentTokens += excerptTokens;
                
                context.sources.push({
                  type: 'reference_proposal',
                  proposal_id: refId,
                  weight: config.context_priority_weights?.reference_proposals_weight || 0.8
                });
              }
            }
          }
        }
      }
    }

    // ============================================
    // Priority 3: Content Library (filtered by category and section type)
    // ============================================
    if (config.use_content_library && proposal.organization_id && currentTokens < MAX_CONTEXT_TOKENS) {
      // Map section types to content categories
      const categoryMapping = {
        'executive_summary': ['company_overview', 'general'],
        'technical_approach': ['technical_approach', 'general'],
        'management_plan': ['management', 'general'],
        'past_performance': ['past_performance', 'general'],
        'key_personnel': ['key_personnel', 'general'],
        'quality_assurance': ['quality_assurance', 'general'],
      };
      
      const relevantCategories = categoryMapping[sectionType] || ['general'];
      
      const contentLibraryItems = await base44.asServiceRole.entities.ProposalResource.filter({
        organization_id: proposal.organization_id,
        resource_type: 'boilerplate_text'
      });
      
      if (contentLibraryItems && contentLibraryItems.length > 0) {
        // Filter by category and sort by usage
        const relevantItems = contentLibraryItems
          .filter(item => relevantCategories.includes(item.content_category))
          .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
          .slice(0, 3);
        
        for (const item of relevantItems) {
          if (item.boilerplate_content && currentTokens < MAX_CONTEXT_TOKENS) {
            const excerpt = item.boilerplate_content.substring(0, 500);
            const excerptTokens = Math.ceil(excerpt.length / 4);
            
            if (currentTokens + excerptTokens < MAX_CONTEXT_TOKENS) {
              context.contentLibraryContent += `\n[${item.content_category} - ${item.title}]\n${excerpt}...\n\n`;
              currentTokens += excerptTokens;
              
              context.sources.push({
                type: 'content_library',
                title: item.title,
                category: item.content_category,
                usage_count: item.usage_count || 0,
                weight: config.context_priority_weights?.content_library_weight || 0.6
              });
            }
          }
        }
      }
    }

    // Check for truncation
    if (currentTokens >= MAX_CONTEXT_TOKENS) {
      context.truncated = true;
    }
    
    context.totalTokensEstimate = currentTokens;

    // Generate context summary
    const solCount = context.sources.filter(s => s.type === 'solicitation').length;
    const refCount = context.sources.filter(s => s.type === 'reference_proposal').length;
    const libCount = context.sources.filter(s => s.type === 'content_library').length;
    
    context.summary = `Used ${context.sources.length} sources (${solCount} solicitation, ${refCount} reference, ${libCount} library) | `;
    context.summary += `${context.solicitationRequirements.length} requirements identified | `;
    context.summary += `~${currentTokens} tokens`;
    
    if (context.truncated) {
      context.summary += ' (truncated to fit limits)';
    }

    return context;
  } catch (error) {
    console.error('[AI Writer] Error gathering context:', error);
    return context;
  }
}

/**
 * Parse solicitation document content
 * Uses DOCX parser or falls back to basic extraction
 */
async function parseSolicitationDocument(base44, doc) {
  try {
    // Check if we have a DOCX parser function
    if (doc.file_url && doc.file_name.endsWith('.docx')) {
      try {
        const parseResult = await base44.asServiceRole.functions.invoke('parseDocxFile', {
          file_url: doc.file_url
        });
        
        if (parseResult.data && parseResult.data.text) {
          return parseResult.data.text;
        }
      } catch (error) {
        console.warn('[AI Writer] DOCX parsing failed, will use fallback:', error.message);
      }
    }
    
    // Fallback: return null to use metadata only
    return null;
  } catch (error) {
    console.error('[AI Writer] Error parsing solicitation document:', error);
    return null;
  }
}

/**
 * Extract requirements from solicitation text
 */
function extractRequirements(text, sectionType) {
  const requirements = [];
  
  try {
    // Look for common requirement patterns
    const patterns = [
      /shall\s+(.{20,200}?)[\.\n]/gi,
      /must\s+(.{20,200}?)[\.\n]/gi,
      /required\s+to\s+(.{20,200}?)[\.\n]/gi,
      /contractor\s+(?:shall|must|will)\s+(.{20,200}?)[\.\n]/gi,
    ];
    
    for (const pattern of patterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const requirement = match[0].trim();
        if (requirement.length > 30 && requirement.length < 300) {
          requirements.push(requirement);
        }
      }
    }
    
    // Remove duplicates and limit to top 10
    const uniqueReqs = [...new Set(requirements)].slice(0, 10);
    return uniqueReqs;
  } catch (error) {
    console.error('[AI Writer] Error extracting requirements:', error);
    return [];
  }
}

/**
 * Extract relevant excerpts based on section type
 */
function extractRelevantExcerpts(text, sectionType) {
  try {
    // Section-specific keywords
    const keywords = {
      'executive_summary': ['objective', 'scope', 'overview', 'purpose', 'background'],
      'technical_approach': ['technical', 'methodology', 'approach', 'solution', 'implementation'],
      'management_plan': ['management', 'organization', 'staffing', 'oversight', 'coordination'],
      'past_performance': ['experience', 'previous', 'similar', 'contract', 'performance'],
      'key_personnel': ['personnel', 'staff', 'qualifications', 'resume', 'experience'],
    };
    
    const sectionKeywords = keywords[sectionType] || ['requirement', 'specification'];
    
    // Find paragraphs containing keywords
    const paragraphs = text.split('\n\n');
    const relevantParagraphs = [];
    
    for (const para of paragraphs) {
      const lowerPara = para.toLowerCase();
      const hasKeyword = sectionKeywords.some(kw => lowerPara.includes(kw));
      
      if (hasKeyword && para.length > 50 && para.length < 1000) {
        relevantParagraphs.push(para.trim());
        
        // Limit to 5 most relevant paragraphs
        if (relevantParagraphs.length >= 5) break;
      }
    }
    
    return relevantParagraphs.join('\n\n') || text.substring(0, 2000);
  } catch (error) {
    console.error('[AI Writer] Error extracting excerpts:', error);
    return text.substring(0, 2000);
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
  if (context.solicitationRequirements && context.solicitationRequirements.length > 0) {
    prompt += `KEY SOLICITATION REQUIREMENTS TO ADDRESS:\n`;
    context.solicitationRequirements.forEach((req, idx) => {
      prompt += `${idx + 1}. ${req}\n`;
    });
    prompt += `\n`;
  }
  
  if (context.solicitationContent) {
    prompt += `SOLICITATION CONTEXT:\n${context.solicitationContent}\n\n`;
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
 * Enhanced with requirement matching and coverage analysis
 */
async function checkCompliance(content, context, config) {
  const issues = [];

  try {
    // ============================================
    // Check 1: Forbidden Phrases
    // ============================================
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

    // ============================================
    // Check 2: Required Disclaimers
    // ============================================
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

    // ============================================
    // Check 3: Word Count
    // ============================================
    const wordCount = countWords(content);
    if (wordCount < config.default_word_count_min) {
      issues.push({
        type: 'word_count',
        message: `Content is shorter than minimum (${wordCount} vs ${config.default_word_count_min})`,
        severity: 'low'
      });
    } else if (wordCount > config.default_word_count_max) {
      issues.push({
        type: 'word_count',
        message: `Content exceeds maximum (${wordCount} vs ${config.default_word_count_max})`,
        severity: 'low'
      });
    }

    // ============================================
    // Check 4: Requirement Coverage
    // ============================================
    if (context.solicitationRequirements && context.solicitationRequirements.length > 0) {
      const contentLower = content.toLowerCase();
      const uncoveredRequirements = [];
      
      for (const req of context.solicitationRequirements) {
        // Extract key terms from requirement
        const keyTerms = extractKeyTerms(req);
        
        // Check if any key terms appear in content
        const hasMatch = keyTerms.some(term => contentLower.includes(term.toLowerCase()));
        
        if (!hasMatch && req.length < 200) {
          uncoveredRequirements.push(req.substring(0, 100));
        }
      }
      
      if (uncoveredRequirements.length > 0) {
        issues.push({
          type: 'requirement_coverage',
          message: `${uncoveredRequirements.length} solicitation requirement(s) may not be addressed`,
          details: uncoveredRequirements.slice(0, 3),
          severity: 'medium'
        });
      }
    }

    // ============================================
    // Check 5: Formatting Rules
    // ============================================
    if (config.guardrails?.formatting_rules) {
      for (const rule of config.guardrails.formatting_rules) {
        // Simple check for numbered lists if required
        if (rule.toLowerCase().includes('numbered list') && !content.match(/\d+\./)) {
          issues.push({
            type: 'formatting',
            message: `May not comply with formatting rule: "${rule}"`,
            severity: 'low'
          });
        }
        
        // Check for bullet points if required
        if (rule.toLowerCase().includes('bullet') && !content.match(/[•\-\*]/)) {
          issues.push({
            type: 'formatting',
            message: `May not comply with formatting rule: "${rule}"`,
            severity: 'low'
          });
        }
      }
    }

    return issues;
  } catch (error) {
    console.error('[AI Writer] Error checking compliance:', error);
    return [];
  }
}

/**
 * Extract key terms from a requirement for matching
 */
function extractKeyTerms(requirement) {
  try {
    // Remove common words and extract meaningful terms
    const commonWords = ['the', 'shall', 'must', 'will', 'should', 'may', 'can', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    
    const words = requirement
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4 && !commonWords.includes(w));
    
    // Return unique terms, limited to 5 most important
    return [...new Set(words)].slice(0, 5);
  } catch (error) {
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

/**
 * Get cached proposal content for a section
 * Uses ParsedProposalCache for faster retrieval
 */
async function getCachedProposalContent(base44, proposalId, sectionType) {
  try {
    // Check cache first
    const cacheRecords = await base44.asServiceRole.entities.ParsedProposalCache.filter({
      proposal_id: proposalId,
      section_type: sectionType
    }, '-last_accessed', 1);
    
    if (cacheRecords && cacheRecords.length > 0) {
      const cache = cacheRecords[0];
      
      // Update last accessed timestamp
      await base44.asServiceRole.entities.ParsedProposalCache.update(cache.id, {
        last_accessed: new Date().toISOString(),
        access_count: (cache.access_count || 0) + 1
      });
      
      return cache.parsed_content;
    }
    
    // Cache miss - fetch from ProposalSection
    const sections = await base44.asServiceRole.entities.ProposalSection.filter({
      proposal_id: proposalId,
      section_type: sectionType
    });
    
    if (sections && sections.length > 0) {
      const content = sections[0].content;
      
      // Store in cache for future use
      await base44.asServiceRole.entities.ParsedProposalCache.create({
        proposal_id: proposalId,
        section_type: sectionType,
        parsed_content: content,
        last_accessed: new Date().toISOString(),
        access_count: 1,
        cache_metadata: {
          source: 'proposal_section',
          section_id: sections[0].id
        }
      });
      
      return content;
    }
    
    return null;
  } catch (error) {
    console.warn('[AI Writer] Cache lookup failed:', error.message);
    return null;
  }
}