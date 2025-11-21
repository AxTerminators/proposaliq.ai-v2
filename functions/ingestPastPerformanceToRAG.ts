import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Ingest Past Performance Record into RAG System
 * 
 * This function takes a PastPerformanceRecord and ingests its content
 * into the RAG system for semantic search and AI reference.
 * 
 * Input: { record_id: string }
 * Output: { success: boolean, resource_id?: string, error?: string }
 */

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { record_id } = await req.json();

        if (!record_id) {
            return Response.json({ error: 'record_id is required' }, { status: 400 });
        }

        // Fetch the record
        const records = await base44.asServiceRole.entities.PastPerformanceRecord.filter({ id: record_id });
        const record = records[0];

        if (!record) {
            return Response.json({ error: 'Record not found' }, { status: 404 });
        }

        // Build searchable content from record
        const contentParts = [];
        
        // Title and basic info
        if (record.title) contentParts.push(`Project: ${record.title}`);
        if (record.customer_agency) contentParts.push(`Customer: ${record.customer_agency}`);
        if (record.contract_number) contentParts.push(`Contract: ${record.contract_number}`);
        
        // Period of performance
        if (record.pop_start_date && record.pop_end_date) {
            contentParts.push(`Period: ${record.pop_start_date} to ${record.pop_end_date}`);
        }
        
        // Contract details
        if (record.contract_type) contentParts.push(`Contract Type: ${record.contract_type}`);
        if (record.role) contentParts.push(`Role: ${record.role}`);
        if (record.contract_value_display) contentParts.push(`Value: ${record.contract_value_display}`);
        
        // Narratives - the meat of the content
        if (record.project_description) {
            contentParts.push(`\nDescription:\n${record.project_description}`);
        }
        if (record.key_accomplishments) {
            contentParts.push(`\nKey Accomplishments:\n${record.key_accomplishments}`);
        }
        if (record.challenges_solutions) {
            contentParts.push(`\nChallenges & Solutions:\n${record.challenges_solutions}`);
        }
        if (record.client_satisfaction_summary) {
            contentParts.push(`\nClient Satisfaction:\n${record.client_satisfaction_summary}`);
        }
        
        // AI-generated content
        if (record.ai_extracted_key_outcomes) {
            contentParts.push(`\nKey Outcomes:\n${record.ai_extracted_key_outcomes}`);
        }
        if (record.ai_generated_summary) {
            contentParts.push(`\nSummary:\n${record.ai_generated_summary}`);
        }
        
        // CPARS narratives
        if (record.government_narratives) {
            const narratives = typeof record.government_narratives === 'string' 
                ? JSON.parse(record.government_narratives)
                : record.government_narratives;
            
            Object.entries(narratives).forEach(([key, value]) => {
                if (value) contentParts.push(`\n${key.replace(/_/g, ' ').toUpperCase()}:\n${value}`);
            });
        }
        
        const fullContent = contentParts.join('\n\n');

        // Build metadata tags for semantic search
        const tags = [];
        
        // Add agency/customer
        if (record.customer_agency) tags.push(record.customer_agency);
        if (record.sub_agency_bureau) tags.push(record.sub_agency_bureau);
        
        // Add NAICS codes
        if (record.naics_codes && Array.isArray(record.naics_codes)) {
            tags.push(...record.naics_codes);
        }
        
        // Add PSC codes
        if (record.psc_codes && Array.isArray(record.psc_codes)) {
            tags.push(...record.psc_codes);
        }
        
        // Add work scope tags
        if (record.work_scope_tags && Array.isArray(record.work_scope_tags)) {
            tags.push(...record.work_scope_tags);
        }
        
        // Add contract type and role
        if (record.contract_type) tags.push(record.contract_type);
        if (record.role) tags.push(record.role);
        
        // Add record type
        tags.push(record.record_type === 'cpars' ? 'CPARS' : 'Past Performance');
        
        // Add rating if exceptional
        if (record.overall_rating === 'Exceptional' || record.overall_rating === 'Very Good') {
            tags.push('High Performance');
        }

        // Create or update ProposalResource for RAG
        const existingResources = await base44.asServiceRole.entities.ProposalResource.filter({
            organization_id: record.organization_id,
            resource_type: 'past_performance'
        });

        // Check if resource already exists for this record
        const existingResource = existingResources.find(r => 
            r.title === record.title && r.description === `Past Performance Record: ${record.id}`
        );

        let resourceId;

        if (existingResource) {
            // Update existing resource
            await base44.asServiceRole.entities.ProposalResource.update(existingResource.id, {
                boilerplate_content: fullContent,
                tags: tags,
                word_count: fullContent.split(/\s+/).length,
                last_used_date: new Date().toISOString()
            });
            resourceId = existingResource.id;
        } else {
            // Create new resource
            const newResource = await base44.asServiceRole.entities.ProposalResource.create({
                organization_id: record.organization_id,
                resource_type: 'past_performance',
                content_category: 'past_performance',
                title: record.title,
                description: `Past Performance Record: ${record.id}`,
                boilerplate_content: fullContent,
                tags: tags,
                word_count: fullContent.split(/\s+/).length
            });
            resourceId = newResource.id;
        }

        return Response.json({
            success: true,
            resource_id: resourceId,
            tags_added: tags.length,
            content_length: fullContent.length
        });

    } catch (error) {
        console.error('Error ingesting past performance to RAG:', error);
        return Response.json({ 
            success: false,
            error: error.message 
        }, { status: 500 });
    }
});