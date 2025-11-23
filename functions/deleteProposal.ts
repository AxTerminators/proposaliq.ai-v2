import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { proposal_id } = await req.json();

        if (!proposal_id) {
            return Response.json({ error: 'proposal_id is required' }, { status: 400 });
        }

        // Delete using service role
        const result = await base44.asServiceRole.entities.Proposal.delete(proposal_id);

        return Response.json({ 
            success: true, 
            deleted_count: result 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});