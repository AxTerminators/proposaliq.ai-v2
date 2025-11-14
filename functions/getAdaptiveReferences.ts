import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * PHASE 8: Adaptive Reference Selection
 * 
 * Intelligently selects reference proposals based on:
 * - Historical quality feedback data
 * - Section type performance
 * - Win rate correlation
 * - Token efficiency
 * 
 * Returns ranked reference suggestions with confidence scores.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      organization_id,
      current_proposal_id,
      section_type,
      max_references = 5,
      prioritize_winners = true
    } = await req.json();

    if (!organization_id) {
      return Response.json({ 
        status: 'error',
        error: 'organization_id is required' 
      }, { status: 400 });
    }

    console.log('[getAdaptiveReferences] 🎯 Finding optimal references for', section_type || 'any section');

    // Fetch all proposals in organization
    const allProposals = await base44.entities.Proposal.filter(
      { organization_id },
      '-created_date',
      500
    );

    // Exclude current proposal
    const candidateProposals = allProposals.filter(p => 
      p.id !== current_proposal_id && 
      (p.status === 'won' || p.status === 'submitted' || p.status === 'lost')
    );

    if (candidateProposals.length === 0) {
      return Response.json({
        status: 'success',
        references: [],
        metadata: {
          reason: 'no_candidates',
          message: 'No suitable reference proposals found'
        }
      });
    }

    // Fetch quality feedback for these proposals
    const feedback = await base44.entities.ContentQualityFeedback.filter(
      { organization_id },
      '-created_date',
      1000
    );

    // Calculate performance scores for each proposal
    const proposalScores = candidateProposals.map(proposal => {
      // Base score from status
      let score = proposal.status === 'won' ? 100 : proposal.status === 'submitted' ? 50 : 25;

      // Quality feedback boost
      const proposalFeedback = feedback.filter(f => 
        f.reference_proposal_ids && f.reference_proposal_ids.includes(proposal.id)
      );

      if (proposalFeedback.length > 0) {
        const avgQuality = proposalFeedback.reduce((sum, f) => sum + f.quality_rating, 0) / proposalFeedback.length;
        score += avgQuality * 20; // Up to +100 for perfect ratings
      }

      // Section-specific boost
      if (section_type) {
        const sectionFeedback = proposalFeedback.filter(f => f.section_type === section_type);
        if (sectionFeedback.length > 0) {
          const sectionAvg = sectionFeedback.reduce((sum, f) => sum + f.quality_rating, 0) / sectionFeedback.length;
          score += sectionAvg * 15; // Section-specific bonus
        }
      }

      // Usage frequency boost (proven useful)
      const usageCount = proposalFeedback.length;
      score += Math.min(usageCount * 2, 20); // Up to +20 for frequent use

      // Recency boost
      const createdDate = new Date(proposal.created_date);
      const monthsOld = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      const recencyBonus = Math.max(0, 10 - monthsOld); // Newer is better
      score += recencyBonus;

      return {
        proposal,
        score,
        metadata: {
          quality_feedback_count: proposalFeedback.length,
          avg_quality_rating: proposalFeedback.length > 0 
            ? (proposalFeedback.reduce((sum, f) => sum + f.quality_rating, 0) / proposalFeedback.length).toFixed(2)
            : 0,
          section_specific_feedback: section_type 
            ? proposalFeedback.filter(f => f.section_type === section_type).length
            : 0,
          months_old: monthsOld.toFixed(1)
        }
      };
    });

    // Sort by score and take top references
    const topReferences = proposalScores
      .sort((a, b) => b.score - a.score)
      .slice(0, max_references)
      .map((item, idx) => ({
        proposal_id: item.proposal.id,
        proposal_name: item.proposal.proposal_name,
        status: item.proposal.status,
        agency_name: item.proposal.agency_name,
        confidence_score: Math.min(100, Math.round(item.score)),
        rank: idx + 1,
        recommendation_reason: generateReason(item),
        metadata: item.metadata
      }));

    console.log('[getAdaptiveReferences] ✅ Selected', topReferences.length, 'references');

    return Response.json({
      status: 'success',
      references: topReferences,
      metadata: {
        total_candidates: candidateProposals.length,
        feedback_records_analyzed: feedback.length,
        section_type_filter: section_type,
        selection_criteria: {
          prioritize_winners: prioritize_winners,
          max_references: max_references
        }
      }
    });

  } catch (error) {
    console.error('[getAdaptiveReferences] ❌ Error:', error);
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});

function generateReason(item) {
  const reasons = [];
  
  if (item.proposal.status === 'won') {
    reasons.push('winning proposal');
  }
  
  if (item.metadata.avg_quality_rating >= 4) {
    reasons.push(`high quality (${item.metadata.avg_quality_rating}⭐)`);
  }
  
  if (item.metadata.quality_feedback_count >= 5) {
    reasons.push(`proven track record (${item.metadata.quality_feedback_count} uses)`);
  }
  
  if (item.metadata.section_specific_feedback > 0) {
    reasons.push('section-specific success');
  }
  
  if (parseFloat(item.metadata.months_old) < 6) {
    reasons.push('recent');
  }

  return reasons.length > 0 ? reasons.join(', ') : 'suitable reference';
}