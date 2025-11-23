import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { board_id } = await req.json();
        
        if (!board_id) {
            return Response.json({ error: 'board_id is required' }, { status: 400 });
        }

        // Use service role to delete
        await base44.asServiceRole.entities.KanbanConfig.delete(board_id);

        return Response.json({ 
            success: true,
            message: 'Board deleted successfully'
        });
    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});