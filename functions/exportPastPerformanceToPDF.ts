import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

/**
 * Export Past Performance Records to PDF
 * 
 * Generates professional PDF reports for past performance records
 * Supports single or multiple records with custom formatting
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { record_ids, format = 'detailed', include_narratives = true } = await req.json();

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

        const doc = new jsPDF();
        let currentY = 20;

        // Title Page
        doc.setFontSize(24);
        doc.text('Past Performance Summary', 20, currentY);
        currentY += 10;

        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, currentY);
        doc.text(`Records: ${validRecords.length}`, 20, currentY + 5);
        currentY += 20;

        // Process each record
        for (let i = 0; i < validRecords.length; i++) {
            const record = validRecords[i];
            
            if (i > 0) {
                doc.addPage();
                currentY = 20;
            }

            // Record Header
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(record.title || 'Untitled Project', 20, currentY);
            currentY += 8;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            // Customer/Agency
            if (record.customer_agency) {
                doc.text(`Customer/Agency: ${record.customer_agency}`, 20, currentY);
                currentY += 6;
            }

            // Contract Details
            if (record.contract_number) {
                doc.text(`Contract Number: ${record.contract_number}`, 20, currentY);
                currentY += 6;
            }

            if (record.contract_type) {
                doc.text(`Contract Type: ${record.contract_type}`, 20, currentY);
                currentY += 6;
            }

            if (record.role) {
                doc.text(`Role: ${record.role}`, 20, currentY);
                currentY += 6;
            }

            // Period of Performance
            if (record.pop_start_date && record.pop_end_date) {
                doc.text(
                    `Period: ${new Date(record.pop_start_date).toLocaleDateString()} - ${new Date(record.pop_end_date).toLocaleDateString()}`,
                    20,
                    currentY
                );
                currentY += 6;
            }

            // Contract Value
            if (record.contract_value) {
                const formatter = new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0
                });
                doc.text(`Contract Value: ${formatter.format(record.contract_value)}`, 20, currentY);
                currentY += 6;
            }

            currentY += 4;

            // CPARS Ratings
            if (record.record_type === 'cpars' && record.overall_rating) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('CPARS Performance Rating', 20, currentY);
                currentY += 6;

                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.text(`Overall Rating: ${record.overall_rating}`, 25, currentY);
                currentY += 6;

                if (record.performance_ratings) {
                    const ratings = record.performance_ratings;
                    Object.entries(ratings).forEach(([key, value]) => {
                        if (value && value !== 'Not Applicable') {
                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            doc.text(`  ${label}: ${value}`, 25, currentY);
                            currentY += 5;
                        }
                    });
                }
                currentY += 4;
            }

            // Narratives
            if (include_narratives && format === 'detailed') {
                if (record.project_description) {
                    doc.setFontSize(12);
                    doc.setFont(undefined, 'bold');
                    doc.text('Project Description', 20, currentY);
                    currentY += 6;

                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    const descLines = doc.splitTextToSize(record.project_description, 170);
                    descLines.forEach(line => {
                        if (currentY > 270) {
                            doc.addPage();
                            currentY = 20;
                        }
                        doc.text(line, 20, currentY);
                        currentY += 5;
                    });
                    currentY += 4;
                }

                if (record.key_accomplishments) {
                    if (currentY > 250) {
                        doc.addPage();
                        currentY = 20;
                    }

                    doc.setFontSize(12);
                    doc.setFont(undefined, 'bold');
                    doc.text('Key Accomplishments', 20, currentY);
                    currentY += 6;

                    doc.setFontSize(10);
                    doc.setFont(undefined, 'normal');
                    const accompLines = doc.splitTextToSize(record.key_accomplishments, 170);
                    accompLines.forEach(line => {
                        if (currentY > 270) {
                            doc.addPage();
                            currentY = 20;
                        }
                        doc.text(line, 20, currentY);
                        currentY += 5;
                    });
                }
            }

            // Tags
            if (record.work_scope_tags && record.work_scope_tags.length > 0) {
                if (currentY > 260) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFontSize(10);
                doc.text(`Tags: ${record.work_scope_tags.join(', ')}`, 20, currentY);
            }
        }

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=past-performance-${Date.now()}.pdf`
            }
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return Response.json({ 
            status: 'error',
            error: error.message 
        }, { status: 500 });
    }
});