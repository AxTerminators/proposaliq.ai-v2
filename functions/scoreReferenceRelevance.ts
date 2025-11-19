import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Score Reference Relevance
 * Calculates relevance scores for candidate reference proposals
 * Uses multiple factors: agency match, proposal type, win status, recency
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposalId, candidateProposalIds } = await req.json();

    if (!proposalId || !candidateProposalIds || candidateProposalIds.length === 0) {
      return Response.json({ 
        error: 'Missing proposalId or candidateProposalIds' 
      }, { status: 400 });
    }

    // Fetch target proposal
    const targetProposal = await base44.entities.Proposal.filter({ id: proposalId });
    if (!targetProposal || targetProposal.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }
    const target = targetProposal[0];

    // Fetch all candidate proposals
    const candidates = await base44.entities.Proposal.filter({
      id: { $in: candidateProposalIds }
    });

    // Fetch quality feedback for learning
    const feedback = await base44.entities.ContentQualityFeedback.filter({
      organization_id: target.organization_id
    });

    // Build reference quality map
    const refQuality = {};
    feedback.forEach(f => {
      if (!f.reference_proposal_ids) return;
      f.reference_proposal_ids.forEach(refId => {
        if (!refQuality[refId]) {
          refQuality[refId] = { ratings: [], count: 0 };
        }
        refQuality[refId].ratings.push(f.quality_rating);
        refQuality[refId].count += 1;
      });
    });

    // Calculate average quality for each reference
    Object.keys(refQuality).forEach(id => {
      const ratings = refQuality[id].ratings;
      refQuality[id].avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    });

    // Score each candidate
    const scores = {};

    for (const candidate of candidates) {
      let score = 0;
      const matchReasons = [];

      // 1. Agency Match (30 points)
      if (target.agency_name && candidate.agency_name) {
        if (target.agency_name.toLowerCase() === candidate.agency_name.toLowerCase()) {
          score += 30;
          matchReasons.push('Same Agency');
        } else if (target.agency_name.toLowerCase().includes(candidate.agency_name.toLowerCase()) ||
                   candidate.agency_name.toLowerCase().includes(target.agency_name.toLowerCase())) {
          score += 15;
          matchReasons.push('Related Agency');
        }
      }

      // 2. Proposal Type Match (25 points)
      if (target.proposal_type_category && candidate.proposal_type_category) {
        if (target.proposal_type_category === candidate.proposal_type_category) {
          score += 25;
          matchReasons.push('Same Type');
        }
      }

      // 3. Win Status (20 points)
      if (candidate.status === 'won') {
        score += 20;
        matchReasons.push('Won Proposal');
      } else if (candidate.status === 'submitted') {
        score += 10;
        matchReasons.push('Submitted');
      }

      // 4. Recency (15 points) - proposals from last 2 years
      if (candidate.created_date) {
        const age = Date.now() - new Date(candidate.created_date).getTime();
        const ageInYears = age / (1000 * 60 * 60 * 24 * 365);
        
        if (ageInYears < 1) {
          score += 15;
          matchReasons.push('Recent');
        } else if (ageInYears < 2) {
          score += 10;
          matchReasons.push('Last 2 Years');
        } else if (ageInYears < 3) {
          score += 5;
        }
      }

      // 5. Historical Quality Performance (10 points)
      if (refQuality[candidate.id]) {
        const quality = refQuality[candidate.id];
        const qualityScore = (quality.avgRating / 5) * 10;
        score += qualityScore;
        
        if (quality.avgRating >= 4) {
          matchReasons.push(`High Quality (${quality.avgRating.toFixed(1)}★)`);
        }
      }

      // Normalize to 0-100
      const normalizedScore = Math.min(100, score);

      scores[candidate.id] = {
        overall_score: Math.round(normalizedScore),
        match_reasons: matchReasons,
        quality_data: refQuality[candidate.id] || null,
        breakdown: {
          agency_match: score >= 15 ? true : false,
          type_match: target.proposal_type_category === candidate.proposal_type_category,
          win_status: candidate.status,
          age_years: candidate.created_date 
            ? ((Date.now() - new Date(candidate.created_date).getTime()) / (1000 * 60 * 60 * 24 * 365)).toFixed(1)
            : null
        }
      };
    }

    return Response.json({
      success: true,
      scores,
      target_proposal: {
        id: target.id,
        name: target.proposal_name,
        agency: target.agency_name,
        type: target.proposal_type_category
      },
      scored_count: Object.keys(scores).length
    });

  } catch (error) {
    console.error('[Score Reference] Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});