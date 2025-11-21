import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * Export Past Performance Records to Word Document
 * 
 * Generates formatted Word documents for proposal-ready content
 * Returns HTML that can be converted to .docx
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { record_ids, format = 'proposal', include_cpars_details = true } = await req.json();

        if (!record_ids || record_ids.length === 0) {
            return Response.json({ error: 'record_ids required' }, { status: 400 });
        }

        // Fetch records
        const records = await Promise.all(
            record_ids.map(id => base44.entities.PastPerformanceRecord.list({ id }))
        );
        const validRecords = records.flat().filter(r => r);

        if (validRecords.length === 0) {
            return Response.json({ error: 'No valid records found' }, { status: 404 });
        }

        // Generate HTML content
        let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Past Performance References</title>
    <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.6; margin: 40px; }
        h1 { color: #1a365d; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1e40af; margin-top: 30px; }
        h3 { color: #334155; margin-top: 20px; }
        .record { margin-bottom: 40px; page-break-after: always; }
        .metadata { background: #f1f5f9; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0; }
        .metadata-item { margin: 5px 0; }
        .label { font-weight: bold; color: #475569; }
        .rating-table { border-collapse: collapse; width: 100%; margin: 15px 0; }
        .rating-table th, .rating-table td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        .rating-table th { background: #e2e8f0; font-weight: bold; }
        .accomplishments { margin: 20px 0; }
        .accomplishments ul { margin: 10px 0; padding-left: 25px; }
    </style>
</head>
<body>
    <h1>Past Performance References</h1>
    <p><em>Generated: ${new Date().toLocaleDateString()}</em></p>
`;

        // Process each record
        validRecords.forEach((record, index) => {
            html += `<div class="record">`;
            html += `<h2>${index + 1}. ${record.title || 'Untitled Project'}</h2>`;

            // Metadata Box
            html += `<div class="metadata">`;
            if (record.customer_agency) {
                html += `<div class="metadata-item"><span class="label">Customer/Agency:</span> ${record.customer_agency}</div>`;
            }
            if (record.contract_number) {
                html += `<div class="metadata-item"><span class="label">Contract Number:</span> ${record.contract_number}</div>`;
            }
            if (record.contract_type) {
                html += `<div class="metadata-item"><span class="label">Contract Type:</span> ${record.contract_type}</div>`;
            }
            if (record.role) {
                html += `<div class="metadata-item"><span class="label">Role:</span> ${record.role}</div>`;
            }
            if (record.pop_start_date && record.pop_end_date) {
                html += `<div class="metadata-item"><span class="label">Period of Performance:</span> ${new Date(record.pop_start_date).toLocaleDateString()} - ${new Date(record.pop_end_date).toLocaleDateString()}</div>`;
            }
            if (record.contract_value) {
                const formatter = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0
                });
                html += `<div class="metadata-item"><span class="label">Contract Value:</span> ${formatter.format(record.contract_value)}</div>`;
            }
            if (record.place_of_performance) {
                html += `<div class="metadata-item"><span class="label">Place of Performance:</span> ${record.place_of_performance}</div>`;
            }
            html += `</div>`;

            // CPARS Ratings
            if (record.record_type === 'cpars' && include_cpars_details && record.overall_rating) {
                html += `<h3>CPARS Performance Ratings</h3>`;
                html += `<table class="rating-table">`;
                html += `<tr><th>Performance Factor</th><th>Rating</th></tr>`;
                html += `<tr><td><strong>Overall Rating</strong></td><td><strong>${record.overall_rating}</strong></td></tr>`;
                
                if (record.performance_ratings) {
                    Object.entries(record.performance_ratings).forEach(([key, value]) => {
                        if (value && value !== 'Not Applicable') {
                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            html += `<tr><td>${label}</td><td>${value}</td></tr>`;
                        }
                    });
                }
                html += `</table>`;
            }

            // Project Description
            if (record.project_description) {
                html += `<h3>Project Description</h3>`;
                html += `<p>${record.project_description.replace(/\n/g, '<br>')}</p>`;
            }

            // Key Accomplishments
            if (record.key_accomplishments) {
                html += `<h3>Key Accomplishments</h3>`;
                html += `<div class="accomplishments">`;
                
                // Convert bullet points
                const accomplishments = record.key_accomplishments.split('\n').filter(l => l.trim());
                if (accomplishments.length > 1) {
                    html += `<ul>`;
                    accomplishments.forEach(acc => {
                        const cleaned = acc.replace(/^[-•*]\s*/, '').trim();
                        if (cleaned) {
                            html += `<li>${cleaned}</li>`;
                        }
                    });
                    html += `</ul>`;
                } else {
                    html += `<p>${record.key_accomplishments.replace(/\n/g, '<br>')}</p>`;
                }
                html += `</div>`;
            }

            // Client Satisfaction
            if (record.client_satisfaction_summary) {
                html += `<h3>Client Satisfaction</h3>`;
                html += `<p>${record.client_satisfaction_summary.replace(/\n/g, '<br>')}</p>`;
            }

            html += `</div>`;
        });

        html += `</body></html>`;

        return Response.json({
            status: 'success',
            html,
            filename: `past-performance-${Date.now()}.html`
        });

    } catch (error) {
        console.error('Error generating Word document:', error);
        return Response.json({ 
            status: 'error',
            error: error.message 
        }, { status: 500 });
    }
});