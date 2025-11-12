import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data_call_ids, options = {} } = await req.json();

    if (!data_call_ids || data_call_ids.length === 0) {
      return Response.json({ error: 'No data calls specified' }, { status: 400 });
    }

    // Build CSV data (Excel-compatible)
    const rows = [];
    
    // Headers
    rows.push([
      'Data Call Title',
      'Status',
      'Priority',
      'Recipient Type',
      'Recipient Name',
      'Recipient Email',
      'Due Date',
      'Created Date',
      'Sent Date',
      'Completed Date',
      'Total Items',
      'Completed Items',
      'Progress %',
      'Overdue'
    ]);

    // Fetch and process each data call
    for (const dataCallId of data_call_ids) {
      const dataCalls = await base44.asServiceRole.entities.DataCallRequest.filter({ id: dataCallId });
      const dataCall = dataCalls[0];
      
      if (!dataCall) continue;

      const totalItems = dataCall.checklist_items?.length || 0;
      const completedItems = dataCall.checklist_items?.filter(i => i.status === 'completed').length || 0;
      const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      const isOverdue = dataCall.due_date && 
                       new Date(dataCall.due_date) < new Date() && 
                       dataCall.overall_status !== 'completed';

      rows.push([
        dataCall.request_title || '',
        dataCall.overall_status || '',
        dataCall.priority || '',
        dataCall.recipient_type || '',
        dataCall.assigned_to_name || '',
        dataCall.assigned_to_email || '',
        dataCall.due_date || '',
        dataCall.created_date || '',
        dataCall.sent_date || '',
        dataCall.completed_date || '',
        totalItems.toString(),
        completedItems.toString(),
        progressPct.toString() + '%',
        isOverdue ? 'Yes' : 'No'
      ]);

      // Add checklist items if requested
      if (options.includeFiles) {
        rows.push([]); // Empty row
        rows.push(['Checklist Items:']);
        rows.push(['Item', 'Description', 'Required', 'Status', 'Files Uploaded']);
        
        (dataCall.checklist_items || []).forEach(item => {
          rows.push([
            item.item_label || '',
            item.item_description || '',
            item.is_required ? 'Yes' : 'No',
            item.status || 'pending',
            (item.uploaded_files?.length || 0).toString()
          ]);
        });
        
        rows.push([]); // Empty row separator
      }
    }

    // Convert to CSV
    const csvContent = rows.map(row => 
      row.map(cell => {
        const cellStr = (cell || '').toString();
        // Escape quotes and wrap in quotes if contains comma or newline
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="data-calls-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Excel export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});