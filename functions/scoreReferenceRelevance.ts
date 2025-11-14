import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend Function: Score Reference Relevance
 * 
 * Scores how relevant a candidate reference proposal is to the current proposal.
 * Used for smart reference recommendations in ResourceGatheringModal.
 * 
 * Scoring Algorithm:
 * - Same agency: +40 points (strongest signal for style/approach consistency)
 * - Same project type: +30 points
 * - Won status: +20 points (learn from winners)
 * - Similar contract value (±50%): +10 points
 * - Recent (within 6 months): +5 points
 * - High match score (≥80): +5 points
 * - Has target section type: +15 points (if specified)
 * 
 * Max Score: 125 points
 * 
 * Usage:
 * const result = await base44.functions.invoke('scoreReferenceRelevance', {
 *   current_proposal_id: 'xyz789',
 *   candidate_proposal_ids: ['abc123', 'def456', 'ghi789'],
 *   target_section_type: 'technical_approach' // optional
 * });
 * 
 * Returns:
 * {
 *   status: 'success',
 *   scores: [
 *     {
 *       proposal_id: 'abc123',
 *       proposal_name: 'DoD Cloud Migration',
 *       score: 95,
 *       reasons: ['Same agency: DoD', 'Winning proposal', 'Similar contract value'],
 *       recommendation: 'highly_recommended'
 *     },
 *     ...
 *   ],
 *   top_recommendations: [...] // Top 5 by score
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
      candidate_proposal_ids = [],
      target_section_type = null
    } = await req.json();

    if (!current_proposal_id) {
      return Response.json({ 
        error: 'current_proposal_id is required' 
      }, { status: 400 });
    }

    if (!Array.isArray(candidate_proposal_ids) || candidate_proposal_ids.length === 0) {
      return Response.json({ 
        error: 'candidate_proposal_ids must be a non-empty array' 
      }, { status: 400 });
    }

    console.log('[scoreReferenceRelevance] 🎯 Scoring', candidate_proposal_ids.length, 'candidates');

    // =====================================================
    // STEP 1: Fetch current proposal
    // =====================================================
    const currentProposal = await base44.entities.Proposal.get(current_proposal_id);
    
    if (!currentProposal) {
      return Response.json({ 
        error: 'Current proposal not found' 
      }, { status: 404 });
    }

    // =====================================================
    // STEP 2: Fetch all candidate proposals
    // =====================================================
    const candidateProposals = [];
    
    for (const candidateId of candidate_proposal_ids) {
      try {
        const candidate = await base44.entities.Proposal.get(candidateId);
        if (candidate) {
          candidateProposals.push(candidate);
        }
      } catch (error) {
        console.warn(`[scoreReferenceRelevance] Could not fetch ${candidateId}:`, error.message);
      }
    }

    // =====================================================
    // STEP 3: Fetch sections for section-type matching
    // =====================================================
    const candidateSections = {};
    
    if (target_section_type) {
      for (const candidate of candidateProposals) {
        const sections = await base44.entities.ProposalSection.filter({
          proposal_id: candidate.id
        });
        candidateSections[candidate.id] = sections;
      }
    }

    // =====================================================
    // STEP 4: Score each candidate
    // =====================================================
    const scoredCandidates = candidateProposals.map(candidate => {
      let score = 0;
      const reasons = [];

      // Agency match (40 points) - STRONGEST SIGNAL
      if (candidate.agency_name && 
          currentProposal.agency_name && 
          candidate.agency_name.toLowerCase() === currentProposal.agency_name.toLowerCase()) {
        score += 40;
        reasons.push(`Same agency: ${candidate.agency_name}`);
      }

      // Project type match (30 points)
      if (candidate.project_type && 
          currentProposal.project_type && 
          candidate.project_type === currentProposal.project_type) {
        score += 30;
        reasons.push(`Same type: ${candidate.project_type}`);
      }

      // Won status (20 points) - Learn from winners
      if (candidate.status === 'won') {
        score += 20;
        reasons.push('Winning proposal ✓');
      } else if (candidate.status === 'submitted') {
        score += 10;
        reasons.push('Submitted proposal');
      }

      // Similar contract value (10 points)
      if (candidate.contract_value && currentProposal.contract_value) {
        const valueDiff = Math.abs(candidate.contract_value - currentProposal.contract_value);
        const avgValue = (candidate.contract_value + currentProposal.contract_value) / 2;
        if (avgValue > 0 && (valueDiff / avgValue) < 0.5) {
          score += 10;
          reasons.push(`Similar value: $${(candidate.contract_value / 1000000).toFixed(1)}M`);
        }
      }

      // Recent proposal (5 points)
      if (candidate.created_date) {
        const daysOld = (Date.now() - new Date(candidate.created_date)) / (1000 * 60 * 60 * 24);
        if (daysOld < 180) { // Within 6 months
          score += 5;
          reasons.push('Recent proposal');
        }
      }

      // High match score (5 points)
      if (candidate.match_score && candidate.match_score >= 80) {
        score += 5;
        reasons.push(`High match score: ${candidate.match_score}`);
      }

      // Has target section type (15 points) - NEW
      if (target_section_type && candidateSections[candidate.id]) {
        const hasSectionType = candidateSections[candidate.id].some(
          s => s.section_type === target_section_type
        );
        if (hasSectionType) {
          score += 15;
          reasons.push(`Has ${target_section_type.replace('_', ' ')} section`);
        }
      }

      // Determine recommendation level
      let recommendation = 'not_recommended';
      if (score >= 80) recommendation = 'highly_recommended';
      else if (score >= 50) recommendation = 'recommended';
      else if (score >= 30) recommendation = 'consider';

      return {
        proposal_id: candidate.id,
        proposal_name: candidate.proposal_name,
        agency_name: candidate.agency_name,
        project_type: candidate.project_type,
        status: candidate.status,
        contract_value: candidate.contract_value,
        score,
        reasons,
        recommendation
      };
    });

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Get top 5 recommendations
    const topRecommendations = scoredCandidates.slice(0, 5);

    console.log('[scoreReferenceRelevance] ✅ Scored', scoredCandidates.length, 'candidates');
    console.log('[scoreReferenceRelevance] 🏆 Top score:', scoredCandidates[0]?.score || 0);

    return Response.json({
      status: 'success',
      scores: scoredCandidates,
      top_recommendations: topRecommendations,
      scoring_criteria: {
        max_possible_score: 125,
        highly_recommended_threshold: 80,
        recommended_threshold: 50,
        consider_threshold: 30
      },
      scored_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[scoreReferenceRelevance] ❌ Error:', error);
    return Response.json({
      status: 'error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});