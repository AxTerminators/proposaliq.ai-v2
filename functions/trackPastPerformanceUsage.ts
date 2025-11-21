import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Track Past Performance Usage
 * 
 * Records when a past performance record is used in proposal content generation
 * Updates usage count, last used date, and links to proposals
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { record_id, proposal_id, context } = await req.json();

        if (!record_id) {
            return Response.json({ error: 'record_id required' }, { status: 400 });
        }

        // Fetch the record
        const records = await base44.entities.PastPerformanceRecord.filter({ id: record_id });
        if (records.length === 0) {
            return Response.json({ error: 'Record not found' }, { status: 404 });
        }

        const record = records[0];

        // Update usage tracking
        const updates = {
            usage_count: (record.usage_count || 0) + 1,
            last_used_date: new Date().toISOString()
        };

        // Add proposal to linked_proposal_ids if not already there
        if (proposal_id) {
            const linkedIds = record.linked_proposal_ids || [];
            if (!linkedIds.includes(proposal_id)) {
                linkedIds.push(proposal_id);
                updates.linked_proposal_ids = linkedIds;
            }
        }

        // Update the record
        await base44.asServiceRole.entities.PastPerformanceRecord.update(record_id, updates);

        return Response.json({
            status: 'success',
            usage_count: updates.usage_count,
            message: 'Usage tracked successfully'
        });

    } catch (error) {
        console.error('Error tracking usage:', error);
        return Response.json({ 
            status: 'error',
            error: error.message 
        }, { status: 500 });
    }
});