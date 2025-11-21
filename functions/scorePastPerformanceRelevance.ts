import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Score Past Performance Record Relevance
 * 
 * Uses AI to analyze how relevant a past performance record is to a current proposal
 * Considers: agency match, work scope overlap, NAICS codes, keywords, contract type
 * 
 * Input:
 * - record_id: Past performance record ID
 * - proposal_id: Current proposal ID
 * 
 * Output:
 * - relevance_score: 0-100 score
 * - reasoning: Why this score was assigned
 * - key_matches: What matched between record and proposal
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Authenticate user
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { record_id, proposal_id } = await req.json();

        if (!record_id || !proposal_id) {
            return Response.json({ 
                error: 'record_id and proposal_id are required' 
            }, { status: 400 });
        }

        // Fetch record and proposal
        const [records, proposals] = await Promise.all([
            base44.asServiceRole.entities.PastPerformanceRecord.filter({ id: record_id }),
            base44.asServiceRole.entities.Proposal.filter({ id: proposal_id })
        ]);

        if (records.length === 0) {
            return Response.json({ error: 'Record not found' }, { status: 404 });
        }
        if (proposals.length === 0) {
            return Response.json({ error: 'Proposal not found' }, { status: 404 });
        }

        const record = records[0];
        const proposal = proposals[0];

        // Build scoring prompt
        const prompt = `Analyze the relevance of this past performance record to the current proposal opportunity.

PAST PERFORMANCE RECORD:
- Title: ${record.title || 'N/A'}
- Customer/Agency: ${record.customer_agency || 'N/A'}
- Work Scope Tags: ${(record.work_scope_tags || []).join(', ') || 'N/A'}
- NAICS Codes: ${(record.naics_codes || []).join(', ') || 'N/A'}
- Contract Type: ${record.contract_type || 'N/A'}
- Contract Value: ${record.contract_value_display || 'N/A'}
- Role: ${record.role || 'N/A'}
- Description: ${record.project_description || 'N/A'}

CURRENT PROPOSAL:
- Title: ${proposal.project_title || proposal.proposal_name || 'N/A'}
- Agency: ${proposal.agency_name || 'N/A'}
- Project Type: ${proposal.project_type || 'N/A'}
- Description: ${proposal.project_title || 'N/A'}

Provide a relevance score (0-100) and explain your reasoning. Consider:
1. Agency/customer similarity or relationship
2. Work scope and technical alignment
3. NAICS code matches
4. Contract type and size similarity
5. Role alignment (prime vs sub)
6. Recent vs older experience

Return your analysis as a JSON object with:
- relevance_score (number 0-100)
- reasoning (brief explanation)
- key_matches (array of strings describing what matched)
- suggestions (array of strings on how to leverage this record)`;

        // Call LLM for scoring
        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: 'object',
                properties: {
                    relevance_score: { type: 'number' },
                    reasoning: { type: 'string' },
                    key_matches: { 
                        type: 'array', 
                        items: { type: 'string' } 
                    },
                    suggestions: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            }
        });

        // Ensure score is within bounds
        const score = Math.max(0, Math.min(100, aiResponse.relevance_score || 0));

        return Response.json({
            status: 'success',
            record_id,
            proposal_id,
            relevance_score: score,
            reasoning: aiResponse.reasoning || 'No reasoning provided',
            key_matches: aiResponse.key_matches || [],
            suggestions: aiResponse.suggestions || [],
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error scoring relevance:', error);
        return Response.json({ 
            status: 'error',
            error: error.message 
        }, { status: 500 });
    }
});