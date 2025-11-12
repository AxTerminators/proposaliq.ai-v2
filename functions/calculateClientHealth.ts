import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Calculate Client Health Score
 * Automatically calculates health metrics for client organizations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client_organization_id } = await req.json();

    if (!client_organization_id) {
      return Response.json({ error: 'client_organization_id required' }, { status: 400 });
    }

    // Get client organization
    const clientOrgs = await base44.asServiceRole.entities.Organization.filter({
      id: client_organization_id
    });

    if (clientOrgs.length === 0) {
      return Response.json({ error: 'Client organization not found' }, { status: 404 });
    }

    const clientOrg = clientOrgs[0];

    // Get all proposals for this client
    const proposals = await base44.asServiceRole.entities.Proposal.filter({
      organization_id: client_organization_id
    });

    // Get resource shares
    const resourceShares = await base44.asServiceRole.entities.ResourceShare.filter({
      target_organization_id: client_organization_id,
      is_active: true
    });

    // Get user access records
    const allUsers = await base44.asServiceRole.entities.User.list();
    const clientUsers = allUsers.filter(u =>
      u.client_accesses?.some(acc => acc.organization_id === client_organization_id)
    );

    // Calculate metrics
    const totalProposals = proposals.length;
    const wonProposals = proposals.filter(p => p.status === 'won').length;
    const winRate = totalProposals > 0 ? (wonProposals / totalProposals) * 100 : 0;

    // Engagement score (based on activity)
    const recentActivity = proposals.filter(p =>
      moment(p.updated_date).isAfter(moment().subtract(30, 'days'))
    ).length;
    const engagementScore = Math.min(100, (recentActivity / 5) * 100);

    // Activity score
    const lastActivity = proposals.length > 0
      ? Math.max(...proposals.map(p => new Date(p.updated_date).getTime()))
      : new Date(clientOrg.created_date).getTime();
    const daysSinceActivity = moment().diff(moment(lastActivity), 'days');
    const activityScore = Math.max(0, 100 - (daysSinceActivity * 2));

    // Response time score (placeholder - would need actual response tracking)
    const responseTimeScore = 85;

    // Satisfaction score (placeholder - would need feedback data)
    const satisfactionScore = 80;

    // Overall score (weighted average)
    const overallScore = (
      engagementScore * 0.3 +
      activityScore * 0.3 +
      winRate * 0.2 +
      satisfactionScore * 0.1 +
      responseTimeScore * 0.1
    );

    // Determine trend
    const recentProposals = proposals.filter(p =>
      moment(p.created_date).isAfter(moment().subtract(60, 'days'))
    );
    const olderProposals = proposals.filter(p =>
      moment(p.created_date).isBetween(
        moment().subtract(120, 'days'),
        moment().subtract(60, 'days')
      )
    );
    const trend = recentProposals.length > olderProposals.length ? 'improving' :
                  recentProposals.length < olderProposals.length ? 'declining' : 'stable';

    // Determine churn risk
    let churnRisk = 'low';
    if (daysSinceActivity > 90) churnRisk = 'critical';
    else if (daysSinceActivity > 60) churnRisk = 'high';
    else if (daysSinceActivity > 30) churnRisk = 'medium';

    const churnProbability = Math.min(100, daysSinceActivity * 1.5);

    // Calculate lifetime value
    const lifetimeValue = proposals
      .filter(p => p.status === 'won')
      .reduce((sum, p) => sum + (p.contract_value || 0), 0);

    // Create or update health score
    const existingScores = await base44.asServiceRole.entities.ClientHealthScore.filter({
      client_id: client_organization_id
    });

    const healthData = {
      client_id: client_organization_id,
      organization_id: clientOrg.parent_organization_id,
      overall_score: Math.round(overallScore),
      engagement_score: Math.round(engagementScore),
      satisfaction_score: Math.round(satisfactionScore),
      activity_score: Math.round(activityScore),
      response_time_score: Math.round(responseTimeScore),
      churn_risk: churnRisk,
      churn_probability: Math.round(churnProbability),
      trend,
      last_interaction: new Date(lastActivity).toISOString(),
      days_since_interaction: daysSinceActivity,
      total_proposals: totalProposals,
      proposals_won: wonProposals,
      win_rate: winRate,
      lifetime_value: lifetimeValue,
      calculated_date: new Date().toISOString()
    };

    let healthScore;
    if (existingScores.length > 0) {
      healthScore = await base44.asServiceRole.entities.ClientHealthScore.update(
        existingScores[0].id,
        healthData
      );
    } else {
      healthScore = await base44.asServiceRole.entities.ClientHealthScore.create(healthData);
    }

    return Response.json({
      success: true,
      health_score: healthScore
    });

  } catch (error) {
    console.error('[calculateClientHealth] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});