import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Track Past Performance Record Usage
 * 
 * Updates usage metrics when a record is referenced in a proposal
 * Called by: PastPerformanceReferenceSelector, AI Writer, etc.
 * 
 * Input:
 * - record_ids: array of record IDs being used
 * - proposal_id: ID of proposal where records are being used
 * - context: optional context (e.g., "ai_generation", "manual_selection")
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
        const { record_ids, proposal_id, context = 'manual_selection' } = await req.json();

        if (!record_ids || !Array.isArray(record_ids) || record_ids.length === 0) {
            return Response.json({ error: 'record_ids array is required' }, { status: 400 });
        }

        if (!proposal_id) {
            return Response.json({ error: 'proposal_id is required' }, { status: 400 });
        }

        const results = [];
        const errors = [];

        // Update each record
        for (const recordId of record_ids) {
            try {
                // Fetch current record
                const records = await base44.asServiceRole.entities.PastPerformanceRecord.filter({ id: recordId });
                
                if (records.length === 0) {
                    errors.push({ record_id: recordId, error: 'Record not found' });
                    continue;
                }

                const record = records[0];

                // Update usage metrics
                const linkedProposalIds = record.linked_proposal_ids || [];
                if (!linkedProposalIds.includes(proposal_id)) {
                    linkedProposalIds.push(proposal_id);
                }

                await base44.asServiceRole.entities.PastPerformanceRecord.update(recordId, {
                    usage_count: (record.usage_count || 0) + 1,
                    last_used_date: new Date().toISOString(),
                    linked_proposal_ids: linkedProposalIds
                });

                results.push({
                    record_id: recordId,
                    status: 'success',
                    new_usage_count: (record.usage_count || 0) + 1
                });

            } catch (error) {
                console.error(`Error updating record ${recordId}:`, error);
                errors.push({ 
                    record_id: recordId, 
                    error: error.message 
                });
            }
        }

        return Response.json({
            status: 'completed',
            results,
            errors: errors.length > 0 ? errors : null,
            summary: {
                total: record_ids.length,
                success: results.length,
                failed: errors.length
            }
        });

    } catch (error) {
        console.error('Error in trackPastPerformanceUsage:', error);
        return Response.json({ 
            status: 'error',
            error: error.message 
        }, { status: 500 });
    }
});