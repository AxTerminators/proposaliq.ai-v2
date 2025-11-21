import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Score Past Performance Relevance
 * 
 * Uses AI to determine how relevant a past performance record is
 * to a specific proposal or solicitation
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { record_id, proposal_id, solicitation_context } = await req.json();

        if (!record_id) {
            return Response.json({ error: 'record_id required' }, { status: 400 });
        }

        // Fetch the record
        const records = await base44.entities.PastPerformanceRecord.filter({ id: record_id });
        if (records.length === 0) {
            return Response.json({ error: 'Record not found' }, { status: 404 });
        }
        const record = records[0];

        // Fetch proposal if provided
        let proposal = null;
        if (proposal_id) {
            const proposals = await base44.entities.Proposal.filter({ id: proposal_id });
            proposal = proposals[0] || null;
        }

        // Build context for scoring
        const proposalContext = proposal ? `
Project: ${proposal.project_title || 'N/A'}
Agency: ${proposal.agency_name || 'N/A'}
Type: ${proposal.project_type || 'N/A'}
Description: ${proposal.proposal_name || 'N/A'}
        `.trim() : solicitation_context || 'General proposal';

        const recordContext = `
Title: ${record.title}
Agency: ${record.customer_agency}
Contract Type: ${record.contract_type || 'N/A'}
Role: ${record.role || 'N/A'}
Work Scope: ${record.work_scope_tags?.join(', ') || 'N/A'}
Description: ${record.project_description?.substring(0, 300) || 'N/A'}
        `.trim();

        // Use AI to score relevance
        const prompt = `You are evaluating the relevance of a past performance record to a proposal opportunity.

PROPOSAL/SOLICITATION:
${proposalContext}

PAST PERFORMANCE RECORD:
${recordContext}

Analyze the alignment and provide:
1. A relevance score from 0-100 (0 = not relevant, 100 = highly relevant)
2. Top 3-5 specific reasons for the match (brief phrases like "Same agency", "Similar work scope", "Matching contract type")

Consider:
- Agency/customer alignment
- Work scope and service similarity  
- Contract type and size alignment
- Geographic relevance
- Technical capabilities demonstrated

Respond ONLY with a JSON object:
{
  "relevance_score": <number 0-100>,
  "match_reasons": ["reason1", "reason2", "reason3"]
}`;

        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    relevance_score: { type: "number" },
                    match_reasons: { 
                        type: "array",
                        items: { type: "string" }
                    }
                }
            }
        });

        return Response.json({
            status: 'success',
            relevance_score: aiResponse.relevance_score || 0,
            match_reasons: aiResponse.match_reasons || [],
            record_id,
            proposal_id
        });

    } catch (error) {
        console.error('Error scoring relevance:', error);
        return Response.json({ 
            status: 'error',
            error: error.message,
            relevance_score: 0,
            match_reasons: []
        }, { status: 500 });
    }
});