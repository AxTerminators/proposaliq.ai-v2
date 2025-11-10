import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all clients without access tokens
        const allClients = await base44.asServiceRole.entities.Client.list();
        
        const clientsWithoutTokens = allClients.filter(client => 
            !client.access_token || client.access_token.trim() === ''
        );

        if (clientsWithoutTokens.length === 0) {
            return Response.json({
                success: true,
                message: 'All clients already have access tokens!',
                updated_count: 0
            });
        }

        // Generate and update tokens
        const updates = [];
        for (const client of clientsWithoutTokens) {
            // Generate a secure random token
            const token = crypto.randomUUID() + '-' + Date.now();
            
            // Set expiration to 1 year from now
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);

            await base44.asServiceRole.entities.Client.update(client.id, {
                access_token: token,
                token_expires_at: expiresAt.toISOString()
            });

            updates.push({
                client_name: client.client_name,
                client_id: client.id,
                token_generated: true
            });
        }

        return Response.json({
            success: true,
            message: `Successfully generated tokens for ${updates.length} clients`,
            updated_count: updates.length,
            updated_clients: updates
        });

    } catch (error) {
        console.error('Error generating client tokens:', error);
        return Response.json({ 
            error: error.message,
            success: false 
        }, { status: 500 });
    }
});