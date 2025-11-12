import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Calculate Client Health Score
 * Automated calculation based on engagement metrics
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_id, organization_id } = await req.json();

    if (!client_id || !organization_id) {
      return Response.json({
        success: false,
        error: 'client_id and organization_id required'
      }, { status: 400 });
    }

    // Fetch client organization
    const clients = await base44.asServiceRole.entities.Organization.filter({
      id: client_id,
      organization_type: 'client_organization'
    });

    if (clients.length === 0) {
      return Response.json({
        success: false,
        error: 'Client not found'
      }, { status: 404 });
    }

    const client = clients[0];

    // Fetch proposals for this client
    const proposals = await base44.asServiceRole.entities.Proposal.filter({
      organization_id: client_id
    });

    // Fetch annotations (engagement indicator)
    const annotations = await base44.asServiceRole.entities.ProposalAnnotation.filter({
      client_id: client_id
    });

    // Fetch feedback
    const feedback = await base44.asServiceRole.entities.Feedback.filter({
      client_id: client_id
    });

    // Fetch engagement metrics
    const engagementMetrics = await base44.asServiceRole.entities.ClientEngagementMetric.filter({
      client_id: client_id
    });

    // Calculate scores
    const now = new Date();
    const lastAccess = client.custom_branding?.last_portal_access 
      ? new Date(client.custom_branding.last_portal_access)
      : null;
    
    const daysSinceLastAccess = lastAccess 
      ? Math.floor((now - lastAccess) / (1000 * 60 * 60 * 24))
      : 999;

    // Engagement Score (0-100)
    let engagementScore = 50;
    if (daysSinceLastAccess <= 7) engagementScore = 100;
    else if (daysSinceLastAccess <= 14) engagementScore = 80;
    else if (daysSinceLastAccess <= 30) engagementScore = 60;
    else if (daysSinceLastAccess <= 60) engagementScore = 40;
    else engagementScore = 20;

    // Activity Score (based on annotations and feedback)
    const totalInteractions = annotations.length + feedback.length + engagementMetrics.length;
    let activityScore = Math.min(100, (totalInteractions / 10) * 100);

    // Response Time Score (based on feedback response time)
    const respondedFeedback = feedback.filter(f => f.consultant_response_date);
    let responseTimeScore = 100;
    if (respondedFeedback.length > 0) {
      const avgResponseHours = respondedFeedback.reduce((sum, f) => {
        const responseTime = new Date(f.consultant_response_date) - new Date(f.created_date);
        return sum + (responseTime / (1000 * 60 * 60));
      }, 0) / respondedFeedback.length;

      if (avgResponseHours <= 24) responseTimeScore = 100;
      else if (avgResponseHours <= 48) responseTimeScore = 80;
      else if (avgResponseHours <= 72) responseTimeScore = 60;
      else responseTimeScore = 40;
    }

    // Satisfaction Score (based on feedback sentiment)
    const positiveFeedback = feedback.filter(f => 
      f.issue_type === 'post_proposal_satisfaction' && f.status === 'resolved'
    ).length;
    const negativeFeedback = feedback.filter(f => 
      f.issue_type === 'bug' || f.priority === 'critical'
    ).length;
    let satisfactionScore = 70;
    if (feedback.length > 0) {
      satisfactionScore = Math.max(0, 70 + (positiveFeedback * 10) - (negativeFeedback * 15));
    }

    // Overall Score (weighted average)
    const overallScore = Math.round(
      (engagementScore * 0.3) +
      (activityScore * 0.25) +
      (responseTimeScore * 0.2) +
      (satisfactionScore * 0.25)
    );

    // Churn Risk Assessment
    let churnRisk = 'low';
    let churnProbability = 0;
    
    if (overallScore < 40) {
      churnRisk = 'critical';
      churnProbability = 80;
    } else if (overallScore < 55) {
      churnRisk = 'high';
      churnProbability = 60;
    } else if (overallScore < 70) {
      churnRisk = 'medium';
      churnProbability = 30;
    } else {
      churnRisk = 'low';
      churnProbability = 10;
    }

    // Trend Analysis
    const recentScores = await base44.asServiceRole.entities.ClientHealthScore.filter(
      { client_id: client_id },
      '-calculated_date',
      3
    );

    let trend = 'stable';
    if (recentScores.length >= 2) {
      const scoreDiff = overallScore - recentScores[1].overall_score;
      if (scoreDiff > 10) trend = 'improving';
      else if (scoreDiff < -10) trend = 'declining';
    }

    // Calculate metrics
    const totalProposals = proposals.length;
    const wonProposals = proposals.filter(p => p.status === 'won').length;
    const winRate = totalProposals > 0 ? Math.round((wonProposals / totalProposals) * 100) : 0;
    const lifetimeValue = proposals
      .filter(p => p.status === 'won')
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);

    // Risk Factors
    const riskFactors = [];
    if (daysSinceLastAccess > 30) riskFactors.push('No recent portal access');
    if (annotations.length === 0 && proposals.length > 0) riskFactors.push('Low engagement with proposals');
    if (negativeFeedback > 2) riskFactors.push('Multiple critical issues reported');
    if (winRate < 30 && totalProposals > 3) riskFactors.push('Low win rate');

    // Recommended Actions
    const recommendedActions = [];
    if (daysSinceLastAccess > 14) recommendedActions.push('Schedule check-in meeting');
    if (annotations.length === 0) recommendedActions.push('Encourage proposal feedback');
    if (negativeFeedback > 0) recommendedActions.push('Address outstanding issues');
    if (activityScore < 50) recommendedActions.push('Share new proposals or resources');

    // Create or update health score
    const existingScores = await base44.asServiceRole.entities.ClientHealthScore.filter({
      client_id: client_id
    });

    const healthData = {
      client_id: client_id,
      organization_id: organization_id,
      overall_score: overallScore,
      engagement_score: Math.round(engagementScore),
      satisfaction_score: Math.round(satisfactionScore),
      activity_score: Math.round(activityScore),
      response_time_score: Math.round(responseTimeScore),
      churn_risk: churnRisk,
      churn_probability: churnProbability,
      trend: trend,
      last_interaction: lastAccess ? lastAccess.toISOString() : null,
      days_since_interaction: daysSinceLastAccess,
      total_proposals: totalProposals,
      proposals_won: wonProposals,
      win_rate: winRate,
      lifetime_value: lifetimeValue,
      risk_factors: riskFactors,
      recommended_actions: recommendedActions,
      calculated_date: new Date().toISOString()
    };

    if (existingScores.length > 0) {
      await base44.asServiceRole.entities.ClientHealthScore.update(existingScores[0].id, healthData);
    } else {
      await base44.asServiceRole.entities.ClientHealthScore.create(healthData);
    }

    return Response.json({
      success: true,
      health_score: healthData
    });

  } catch (error) {
    console.error('[calculateClientHealth] Error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});