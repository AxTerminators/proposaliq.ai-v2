import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Backend Function: Invalidate Proposal Cache
 * 
 * Deletes cached parsed data for a proposal when it's been updated.
 * This ensures RAG context stays fresh and accurate.
 * 
 * Called automatically when:
 * - Sections are added/updated/deleted
 * - Documents are uploaded/removed
 * - Resources are modified
 * - Any content that affects RAG context changes
 * 
 * Usage:
 * await base44.functions.invoke('invalidateProposalCache', {
 *   proposal_id: 'xyz789'
 * });
 * 
 * Returns:
 * {
 *   status: 'success',
 *   invalidated: true,
 *   cache_entries_deleted: 1
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

    const { proposal_id, proposal_ids = [] } = await req.json();

    // Support both single and bulk invalidation
    const idsToInvalidate = proposal_id 
      ? [proposal_id] 
      : proposal_ids;

    if (idsToInvalidate.length === 0) {
      return Response.json({ 
        error: 'proposal_id or proposal_ids is required' 
      }, { status: 400 });
    }

    console.log('[invalidateProposalCache] 🗑️ Invalidating cache for:', idsToInvalidate);

    let deletedCount = 0;

    for (const id of idsToInvalidate) {
      try {
        const cacheEntries = await base44.asServiceRole.entities.ParsedProposalCache.filter(
          { proposal_id: id },
          '-created_date',
          10 // Get all cache entries for this proposal
        );

        for (const entry of cacheEntries) {
          await base44.asServiceRole.entities.ParsedProposalCache.delete(entry.id);
          deletedCount++;
          console.log(`[invalidateProposalCache] ✅ Deleted cache for proposal: ${id}`);
        }
      } catch (error) {
        console.warn(`[invalidateProposalCache] ⚠️ Could not invalidate ${id}:`, error.message);
      }
    }

    console.log(`[invalidateProposalCache] ✅ Invalidated ${deletedCount} cache entries`);

    return Response.json({
      status: 'success',
      invalidated: true,
      cache_entries_deleted: deletedCount,
      proposal_ids: idsToInvalidate
    });

  } catch (error) {
    console.error('[invalidateProposalCache] ❌ Error:', error);
    return Response.json({
      status: 'error',
      error: error.message
    }, { status: 500 });
  }
});