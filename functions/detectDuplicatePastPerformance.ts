import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Detect Duplicate Past Performance Records
 * 
 * Uses fuzzy matching to find potential duplicates based on:
 * - Contract number (exact match = 100% duplicate)
 * - Title similarity
 * - Agency name similarity
 * - Date overlap
 * 
 * Input:
 * - organization_id: Organization ID
 * - title: Project title
 * - contract_number: Contract number (optional)
 * - customer_agency: Agency name
 * - pop_start_date: Start date (optional)
 * - pop_end_date: End date (optional)
 * - exclude_id: Record ID to exclude (when editing)
 * 
 * Output:
 * - duplicates: Array of potential duplicate records with match scores
 * - has_high_confidence_duplicate: Boolean if exact match found
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            organization_id, 
            title, 
            contract_number, 
            customer_agency,
            pop_start_date,
            pop_end_date,
            exclude_id 
        } = await req.json();

        if (!organization_id || !title) {
            return Response.json({ 
                error: 'organization_id and title are required' 
            }, { status: 400 });
        }

        // Fetch all records for this organization
        const allRecords = await base44.asServiceRole.entities.PastPerformanceRecord.filter({
            organization_id
        });

        // Filter out the record being edited
        const records = exclude_id 
            ? allRecords.filter(r => r.id !== exclude_id)
            : allRecords;

        const duplicates = [];

        for (const record of records) {
            let matchScore = 0;
            const reasons = [];

            // Contract number exact match = 100% duplicate
            if (contract_number && record.contract_number) {
                const cleanInput = contract_number.trim().toLowerCase();
                const cleanRecord = record.contract_number.trim().toLowerCase();
                
                if (cleanInput === cleanRecord) {
                    matchScore = 100;
                    reasons.push('Exact contract number match');
                    duplicates.push({
                        record,
                        match_score: matchScore,
                        match_reasons: reasons,
                        confidence: 'high'
                    });
                    continue;
                }
            }

            // Title similarity (case-insensitive word matching)
            if (record.title) {
                const inputWords = title.toLowerCase().split(/\s+/);
                const recordWords = record.title.toLowerCase().split(/\s+/);
                const commonWords = inputWords.filter(w => 
                    w.length > 3 && recordWords.includes(w)
                );
                const titleSimilarity = (commonWords.length / Math.max(inputWords.length, recordWords.length)) * 100;
                
                if (titleSimilarity > 60) {
                    matchScore += titleSimilarity * 0.5; // 50% weight
                    reasons.push(`Title similarity: ${titleSimilarity.toFixed(0)}%`);
                }
            }

            // Agency similarity
            if (customer_agency && record.customer_agency) {
                const inputAgency = customer_agency.toLowerCase();
                const recordAgency = record.customer_agency.toLowerCase();
                
                if (inputAgency === recordAgency) {
                    matchScore += 30; // 30 points for exact agency match
                    reasons.push('Same agency');
                } else if (inputAgency.includes(recordAgency) || recordAgency.includes(inputAgency)) {
                    matchScore += 20; // 20 points for partial match
                    reasons.push('Similar agency');
                }
            }

            // Date overlap
            if (pop_start_date && pop_end_date && record.pop_start_date && record.pop_end_date) {
                const inputStart = new Date(pop_start_date);
                const inputEnd = new Date(pop_end_date);
                const recordStart = new Date(record.pop_start_date);
                const recordEnd = new Date(record.pop_end_date);

                // Check for date overlap
                if (inputStart <= recordEnd && inputEnd >= recordStart) {
                    matchScore += 20; // 20 points for date overlap
                    reasons.push('Overlapping performance periods');
                }
            }

            // Only include if there's some similarity
            if (matchScore > 40) {
                const confidence = matchScore >= 80 ? 'high' : matchScore >= 60 ? 'medium' : 'low';
                duplicates.push({
                    record,
                    match_score: Math.round(matchScore),
                    match_reasons: reasons,
                    confidence
                });
            }
        }

        // Sort by match score
        duplicates.sort((a, b) => b.match_score - a.match_score);

        return Response.json({
            status: 'success',
            duplicates: duplicates.slice(0, 5), // Return top 5 matches
            has_high_confidence_duplicate: duplicates.some(d => d.confidence === 'high'),
            total_found: duplicates.length
        });

    } catch (error) {
        console.error('Error detecting duplicates:', error);
        return Response.json({ 
            status: 'error',
            error: error.message 
        }, { status: 500 });
    }
});