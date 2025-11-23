import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Migration Function: Update Proposal Statuses to New Master Board Mapping
 * 
 * Old -> New Status Mapping:
 * - evaluating -> Qualifying
 * - watch_list -> Planning
 * - draft, in_progress -> Drafting
 * - on_hold, client_review -> Reviewing
 * - submitted -> Submitted
 * - won -> Won
 * - lost -> Lost
 * - archived, client_accepted, client_rejected -> Archived
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Verify user is authenticated and is an admin
        const user = await base44.auth.me();
        if (!user || user.role !== 'admin') {
            return Response.json({ 
                error: 'Unauthorized. Admin access required.' 
            }, { status: 401 });
        }

        // Define the status mapping
        const statusMapping = {
            'evaluating': 'Qualifying',
            'watch_list': 'Planning',
            'draft': 'Drafting',
            'in_progress': 'Drafting',
            'on_hold': 'Reviewing',
            'client_review': 'Reviewing',
            'submitted': 'Submitted',
            'won': 'Won',
            'lost': 'Lost',
            'archived': 'Archived',
            'client_accepted': 'Archived',
            'client_rejected': 'Archived'
        };

        // Fetch all proposals using service role for unrestricted access
        const allProposals = await base44.asServiceRole.entities.Proposal.list();

        const migrationSummary = {
            total_proposals: allProposals.length,
            updated_count: 0,
            skipped_count: 0,
            errors: [],
            status_breakdown: {}
        };

        // Process each proposal
        for (const proposal of allProposals) {
            const oldStatus = proposal.status;
            const newStatus = statusMapping[oldStatus];

            // Track status breakdown
            if (!migrationSummary.status_breakdown[oldStatus]) {
                migrationSummary.status_breakdown[oldStatus] = 0;
            }
            migrationSummary.status_breakdown[oldStatus]++;

            // Skip if status is not in mapping (shouldn't happen, but safety check)
            if (!newStatus) {
                migrationSummary.skipped_count++;
                migrationSummary.errors.push({
                    proposal_id: proposal.id,
                    proposal_name: proposal.proposal_name,
                    old_status: oldStatus,
                    reason: 'Status not found in mapping'
                });
                continue;
            }

            // Skip if status is already correct
            if (oldStatus === newStatus) {
                migrationSummary.skipped_count++;
                continue;
            }

            // Update the proposal status
            try {
                await base44.asServiceRole.entities.Proposal.update(proposal.id, {
                    status: newStatus
                });
                migrationSummary.updated_count++;
            } catch (error) {
                migrationSummary.errors.push({
                    proposal_id: proposal.id,
                    proposal_name: proposal.proposal_name,
                    old_status: oldStatus,
                    new_status: newStatus,
                    error: error.message
                });
            }
        }

        return Response.json({
            success: true,
            message: 'Proposal status migration completed',
            summary: migrationSummary,
            executed_by: user.email,
            executed_at: new Date().toISOString()
        });

    } catch (error) {
        return Response.json({ 
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
});