import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend Function: Discover Similar Proposals
 * 
 * PHASE 5: Cross-Organization RAG
 * 
 * Automatically finds relevant reference proposals from the entire organization
 * based on similarity scoring. Enables organization-wide learning from past wins.
 * 
 * Features:
 * - Multi-factor similarity scoring (agency, type, contract value, keywords)
 * - Privacy-aware (respects client boundaries for consultant firms)
 * - Prioritizes winning proposals
 * - Configurable filters and limits
 * 
 * Returns top N most relevant proposals for RAG context.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      current_proposal_id,
      organization_id,
      max_results = 5,
      min_relevance_score = 40,
      section_type = null,
      prioritize_wins = true,
      same_agency_only = false,
      same_type_only = false,
      include_cross_client = false, // For consultant firms
      exclude_proposal_ids = []
    } = await req.json();

    if (!current_proposal_id || !organization_id) {
      return Response.json({ 
        error: 'current_proposal_id and organization_id are required' 
      }, { status: 400 });
    }

    console.log('[discoverSimilarProposals] 🔍 Discovering similar proposals...');
    console.log('[discoverSimilarProposals] 📋 Org:', organization_id);
    console.log('[discoverSimilarProposals] 🎯 Max results:', max_results);

    // Fetch current proposal
    const currentProposal = await base44.entities.Proposal.get(current_proposal_id);
    
    if (!currentProposal) {
      return Response.json({ error: 'Current proposal not found' }, { status: 404 });
    }

    // Check organization type to determine search scope
    const currentOrg = await base44.entities.Organization.get(organization_id);
    const isConsultingFirm = currentOrg.organization_type === 'consulting_firm';
    const isClientOrg = currentOrg.organization_type === 'client_organization';

    // Build search query
    let searchQuery = {
      id: { $ne: current_proposal_id } // Exclude self
    };

    // Filter by organization scope
    if (isClientOrg) {
      // Client org: only search within own org
      searchQuery.organization_id = organization_id;
    } else if (isConsultingFirm && !include_cross_client) {
      // Consulting firm: only search own org unless cross-client enabled
      searchQuery.organization_id = organization_id;
    } else if (isConsultingFirm && include_cross_client) {
      // Consulting firm with cross-client: search own org + child client orgs
      const childOrgs = await base44.asServiceRole.entities.Organization.filter({
        parent_organization_id: organization_id
      });
      const orgIds = [organization_id, ...childOrgs.map(o => o.id)];
      searchQuery.organization_id = { $in: orgIds };
    }

    // Optional filters
    if (same_agency_only && currentProposal.agency_name) {
      searchQuery.agency_name = currentProposal.agency_name;
    }

    if (same_type_only && currentProposal.project_type) {
      searchQuery.project_type = currentProposal.project_type;
    }

    // Exclude specific proposals
    if (exclude_proposal_ids.length > 0) {
      searchQuery.id = { 
        $ne: current_proposal_id,
        $nin: exclude_proposal_ids 
      };
    }

    // Fetch candidate proposals (broader query, we'll score them)
    console.log('[discoverSimilarProposals] 🔎 Fetching candidates...');
    const candidateProposals = await base44.asServiceRole.entities.Proposal.filter(
      searchQuery,
      '-created_date',
      100 // Get up to 100 candidates
    );

    console.log(`[discoverSimilarProposals] 📊 Found ${candidateProposals.length} candidates`);

    if (candidateProposals.length === 0) {
      return Response.json({
        status: 'success',
        discovered_proposals: [],
        message: 'No similar proposals found'
      });
    }

    // Score each candidate
    const scoredProposals = candidateProposals.map(candidate => {
      let score = 0;
      const reasons = [];

      // Agency match (40 points)
      if (candidate.agency_name && currentProposal.agency_name && 
          candidate.agency_name.toLowerCase() === currentProposal.agency_name.toLowerCase()) {
        score += 40;
        reasons.push(`Same agency: ${candidate.agency_name}`);
      }

      // Project type match (30 points)
      if (candidate.project_type && currentProposal.project_type && 
          candidate.project_type === currentProposal.project_type) {
        score += 30;
        reasons.push(`Same type: ${candidate.project_type}`);
      }

      // Status bonus (20 points for won, 10 for submitted)
      if (candidate.status === 'won') {
        score += 20;
        reasons.push('Winning proposal');
      } else if (candidate.status === 'submitted') {
        score += 10;
        reasons.push('Submitted proposal');
      }

      // Contract value similarity (10 points)
      if (candidate.contract_value && currentProposal.contract_value) {
        const valueDiff = Math.abs(candidate.contract_value - currentProposal.contract_value);
        const avgValue = (candidate.contract_value + currentProposal.contract_value) / 2;
        const similarity = 1 - (valueDiff / avgValue);
        if (similarity > 0.5) {
          score += 10;
          reasons.push('Similar contract value');
        }
      }

      // Proposal type category match (15 points)
      if (candidate.proposal_type_category && currentProposal.proposal_type_category &&
          candidate.proposal_type_category === currentProposal.proposal_type_category) {
        score += 15;
        reasons.push(`Same category: ${candidate.proposal_type_category}`);
      }

      // Recency bonus (5 points for proposals in last 2 years)
      const candidateDate = new Date(candidate.created_date);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      if (candidateDate > twoYearsAgo) {
        score += 5;
        reasons.push('Recent proposal');
      }

      // Keyword matching in titles (bonus 5 points)
      if (currentProposal.project_title && candidate.project_title) {
        const currentWords = currentProposal.project_title.toLowerCase().split(/\s+/);
        const candidateWords = candidate.project_title.toLowerCase().split(/\s+/);
        const commonWords = currentWords.filter(word => 
          word.length > 4 && candidateWords.includes(word)
        );
        if (commonWords.length >= 2) {
          score += 5;
          reasons.push(`Shared keywords: ${commonWords.slice(0, 2).join(', ')}`);
        }
      }

      return {
        proposal_id: candidate.id,
        proposal_name: candidate.proposal_name,
        project_title: candidate.project_title,
        agency_name: candidate.agency_name,
        project_type: candidate.project_type,
        status: candidate.status,
        contract_value: candidate.contract_value,
        created_date: candidate.created_date,
        organization_id: candidate.organization_id,
        relevance_score: score,
        relevance_reasons: reasons
      };
    });

    // Filter by minimum score and sort
    const filteredProposals = scoredProposals
      .filter(p => p.relevance_score >= min_relevance_score)
      .sort((a, b) => {
        // Prioritize wins if enabled
        if (prioritize_wins) {
          if (a.status === 'won' && b.status !== 'won') return -1;
          if (b.status === 'won' && a.status !== 'won') return 1;
        }
        // Then sort by score
        return b.relevance_score - a.relevance_score;
      })
      .slice(0, max_results);

    console.log(`[discoverSimilarProposals] ✅ Returning ${filteredProposals.length} similar proposals`);

    return Response.json({
      status: 'success',
      discovered_proposals: filteredProposals,
      search_metadata: {
        total_candidates_evaluated: candidateProposals.length,
        proposals_above_threshold: filteredProposals.length,
        min_relevance_score: min_relevance_score,
        max_results: max_results,
        filters_applied: {
          same_agency_only,
          same_type_only,
          prioritize_wins,
          include_cross_client
        },
        organization_scope: isClientOrg ? 'client_only' : 
                           (include_cross_client ? 'multi_client' : 'single_org')
      }
    });

  } catch (error) {
    console.error('[discoverSimilarProposals] ❌ Error:', error);
    return Response.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
});