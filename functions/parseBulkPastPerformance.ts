import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Parse Bulk Past Performance Import
 * 
 * Accepts CSV or Excel file with past performance records
 * Validates and transforms data for bulk creation
 * 
 * Expected columns (flexible, case-insensitive):
 * - title / project_title (required)
 * - customer_agency / agency (required)
 * - contract_number
 * - contract_type
 * - contract_value
 * - pop_start_date / start_date
 * - pop_end_date / end_date
 * - role (prime/subcontractor/teaming_partner)
 * - project_description / description
 * - key_accomplishments / accomplishments
 * - work_scope_tags (comma-separated)
 * - naics_codes (comma-separated)
 * 
 * Returns:
 * - parsed_records: Array of validated records ready for import
 * - validation_errors: Array of errors with row numbers
 * - total_valid: Count of valid records
 * - total_invalid: Count of invalid records
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file');
        const organizationId = formData.get('organization_id');

        if (!file) {
            return Response.json({ error: 'File is required' }, { status: 400 });
        }
        if (!organizationId) {
            return Response.json({ error: 'organization_id is required' }, { status: 400 });
        }

        // Read file content
        const fileContent = await file.text();
        const fileName = file.name.toLowerCase();

        let rows = [];

        // Parse CSV
        if (fileName.endsWith('.csv')) {
            const lines = fileContent.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                return Response.json({ error: 'CSV file must have headers and at least one data row' }, { status: 400 });
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                headers.forEach((header, idx) => {
                    row[header] = values[idx] || '';
                });
                row._row_number = i + 1;
                rows.push(row);
            }
        } else {
            return Response.json({ 
                error: 'Only CSV files are supported. Excel support coming soon.' 
            }, { status: 400 });
        }

        // Column mapping (flexible names)
        const columnMap = {
            title: ['title', 'project_title', 'project name', 'name'],
            customer_agency: ['customer_agency', 'agency', 'customer', 'client'],
            contract_number: ['contract_number', 'contract #', 'contract no', 'contract'],
            contract_type: ['contract_type', 'type'],
            contract_value: ['contract_value', 'value', 'amount'],
            pop_start_date: ['pop_start_date', 'start_date', 'start', 'begin_date'],
            pop_end_date: ['pop_end_date', 'end_date', 'end', 'completion_date'],
            role: ['role', 'contractor_role'],
            project_description: ['project_description', 'description', 'scope'],
            key_accomplishments: ['key_accomplishments', 'accomplishments', 'outcomes'],
            work_scope_tags: ['work_scope_tags', 'tags', 'keywords'],
            naics_codes: ['naics_codes', 'naics']
        };

        const parsedRecords = [];
        const validationErrors = [];

        for (const row of rows) {
            const record = {
                organization_id: organizationId,
                record_type: 'general_pp'
            };
            const errors = [];

            // Map columns
            for (const [field, possibleNames] of Object.entries(columnMap)) {
                for (const name of possibleNames) {
                    if (row[name] !== undefined && row[name] !== '') {
                        let value = row[name];
                        
                        // Transform arrays (comma-separated)
                        if (['work_scope_tags', 'naics_codes'].includes(field)) {
                            value = value.split(',').map(v => v.trim()).filter(v => v);
                        }
                        
                        // Parse numbers
                        if (field === 'contract_value') {
                            value = parseFloat(value.replace(/[^0-9.]/g, '')) || null;
                        }
                        
                        record[field] = value;
                        break;
                    }
                }
            }

            // Validate required fields
            if (!record.title) {
                errors.push('Missing required field: title');
            }
            if (!record.customer_agency) {
                errors.push('Missing required field: customer_agency');
            }

            // Validate dates
            if (record.pop_start_date && !isValidDate(record.pop_start_date)) {
                errors.push('Invalid start date format');
            }
            if (record.pop_end_date && !isValidDate(record.pop_end_date)) {
                errors.push('Invalid end date format');
            }

            // Validate role
            if (record.role && !['prime', 'subcontractor', 'teaming_partner'].includes(record.role.toLowerCase())) {
                errors.push('Invalid role. Must be: prime, subcontractor, or teaming_partner');
            }

            if (errors.length > 0) {
                validationErrors.push({
                    row: row._row_number,
                    title: record.title || 'N/A',
                    errors
                });
            } else {
                parsedRecords.push(record);
            }
        }

        return Response.json({
            status: 'success',
            parsed_records: parsedRecords,
            validation_errors: validationErrors,
            total_valid: parsedRecords.length,
            total_invalid: validationErrors.length,
            total_rows: rows.length
        });

    } catch (error) {
        console.error('Error parsing bulk import:', error);
        return Response.json({ 
            status: 'error',
            error: error.message 
        }, { status: 500 });
    }
});

function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}