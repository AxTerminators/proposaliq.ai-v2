import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only admins can force delete templates
        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const { template_ids } = await req.json();
        
        if (!template_ids || !Array.isArray(template_ids)) {
            return Response.json({ error: 'template_ids array required' }, { status: 400 });
        }

        // Use service role to force delete
        const results = [];
        for (const templateId of template_ids) {
            try {
                await base44.asServiceRole.entities.ProposalWorkflowTemplate.delete(templateId);
                results.push({ id: templateId, status: 'deleted' });
            } catch (error) {
                results.push({ id: templateId, status: 'error', error: error.message });
            }
        }

        return Response.json({ 
            success: true,
            results,
            deleted_count: results.filter(r => r.status === 'deleted').length
        });
    } catch (error) {
        console.error('[forceDeleteTemplate] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});