import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Link resources to a proposal and update usage tracking
 * 
 * Input:
 * {
 *   proposal_id: string,
 *   resources: [
 *     {
 *       id: string,
 *       entityType: "ProposalResource" | "PastPerformanceRecord" | "KeyPersonnel" | "WinTheme",
 *       type: string (resource_type)
 *     }
 *   ]
 * }
 * 
 * Output:
 * {
 *   success: boolean,
 *   linked_count: number,
 *   proposal_updated: boolean
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

    // Parse request body
    const { proposal_id, resources } = await req.json();

    if (!proposal_id || !Array.isArray(resources) || resources.length === 0) {
      return Response.json(
        { error: 'proposal_id and resources array are required' },
        { status: 400 }
      );
    }

    // Fetch the proposal
    const proposals = await base44.entities.Proposal.filter({ id: proposal_id });
    if (!proposals || proposals.length === 0) {
      return Response.json({ error: 'Proposal not found' }, { status: 404 });
    }
    const proposal = proposals[0];

    // Initialize arrays for different resource types if they don't exist
    const linkedResourceIds = proposal.linked_resource_ids || [];
    const linkedPastPerformanceIds = proposal.linked_past_performance_ids || [];
    const linkedPersonnelIds = proposal.linked_personnel_ids || [];
    const linkedWinThemeIds = proposal.linked_win_theme_ids || [];
    const linkedSolicitationDocIds = proposal.linked_solicitation_doc_ids || [];

    let linkedCount = 0;

    // Process each resource
    for (const resource of resources) {
      const { id, entityType, type } = resource;

      if (!id || !entityType) {
        console.warn('Skipping resource without id or entityType:', resource);
        continue;
      }

      // Add to appropriate array based on entity type
      switch (entityType) {
        case 'ProposalResource':
          if (!linkedResourceIds.includes(id)) {
            linkedResourceIds.push(id);
            linkedCount++;

            // Increment usage count for ProposalResource
            try {
              const resourceEntities = await base44.entities.ProposalResource.filter({ id });
              if (resourceEntities && resourceEntities.length > 0) {
                const resourceEntity = resourceEntities[0];
                await base44.entities.ProposalResource.update(id, {
                  usage_count: (resourceEntity.usage_count || 0) + 1,
                  last_used_date: new Date().toISOString(),
                  linked_proposal_ids: [
                    ...(resourceEntity.linked_proposal_ids || []),
                    proposal_id
                  ].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
                });
              }
            } catch (error) {
              console.error('Error updating ProposalResource usage:', error);
            }
          }
          break;

        case 'PastPerformanceRecord':
          if (!linkedPastPerformanceIds.includes(id)) {
            linkedPastPerformanceIds.push(id);
            linkedCount++;

            // Increment usage count for PastPerformanceRecord
            try {
              const ppEntities = await base44.entities.PastPerformanceRecord.filter({ id });
              if (ppEntities && ppEntities.length > 0) {
                const ppEntity = ppEntities[0];
                await base44.entities.PastPerformanceRecord.update(id, {
                  usage_count: (ppEntity.usage_count || 0) + 1,
                  last_used_date: new Date().toISOString(),
                  linked_proposal_ids: [
                    ...(ppEntity.linked_proposal_ids || []),
                    proposal_id
                  ].filter((v, i, a) => a.indexOf(v) === i)
                });
              }
            } catch (error) {
              console.error('Error updating PastPerformanceRecord usage:', error);
            }
          }
          break;

        case 'KeyPersonnel':
          if (!linkedPersonnelIds.includes(id)) {
            linkedPersonnelIds.push(id);
            linkedCount++;
          }
          break;

        case 'WinTheme':
          if (!linkedWinThemeIds.includes(id)) {
            linkedWinThemeIds.push(id);
            linkedCount++;
          }
          break;

        case 'SolicitationDocument':
          if (!linkedSolicitationDocIds.includes(id)) {
            linkedSolicitationDocIds.push(id);
            linkedCount++;

            // Update last used date for SolicitationDocument
            try {
              const solicitationDocs = await base44.entities.SolicitationDocument.filter({ id });
              if (solicitationDocs && solicitationDocs.length > 0) {
                await base44.entities.SolicitationDocument.update(id, {
                  last_used_date: new Date().toISOString()
                });
              }
            } catch (error) {
              console.error('Error updating SolicitationDocument usage:', error);
            }
          }
          break;

        default:
          console.warn('Unknown entityType:', entityType);
      }
    }

    // Update the proposal with all linked resource IDs
    await base44.entities.Proposal.update(proposal_id, {
      linked_resource_ids: linkedResourceIds,
      linked_past_performance_ids: linkedPastPerformanceIds,
      linked_personnel_ids: linkedPersonnelIds,
      linked_win_theme_ids: linkedWinThemeIds,
      linked_solicitation_doc_ids: linkedSolicitationDocIds
    });

    return Response.json({
      success: true,
      linked_count: linkedCount,
      proposal_updated: true,
      summary: {
        resources: linkedResourceIds.length,
        past_performance: linkedPastPerformanceIds.length,
        personnel: linkedPersonnelIds.length,
        win_themes: linkedWinThemeIds.length,
        solicitation_docs: linkedSolicitationDocIds.length
      }
    });

  } catch (error) {
    console.error('Error linking resources:', error);
    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});