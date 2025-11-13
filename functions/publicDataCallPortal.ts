import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    // Parse URL parameters
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    const dataCallId = url.searchParams.get('id');

    console.log('[publicDataCallPortal] Request received:', { token: token?.substring(0, 10) + '...', dataCallId });

    if (!token || !dataCallId) {
      return new Response(renderErrorPage('Invalid access link. Please use the link provided in your email.'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // CRITICAL: Use service role to validate token WITHOUT requiring user authentication
    const base44 = createClientFromRequest(req);

    // Fetch the data call using service role (no user auth needed)
    const dataCalls = await base44.asServiceRole.entities.DataCallRequest.filter({
      id: dataCallId,
      access_token: token
    });

    if (dataCalls.length === 0) {
      console.error('[publicDataCallPortal] Invalid token or ID');
      return new Response(renderErrorPage('Invalid or expired access token. Please contact the sender for a new link.'), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const dataCall = dataCalls[0];

    // Check if token is expired
    if (dataCall.token_expires_at) {
      const expiresAt = new Date(dataCall.token_expires_at);
      if (expiresAt < new Date()) {
        return new Response(renderErrorPage('This access link has expired. Please contact the sender for a new link.'), {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }
    }

    // Update portal access tracking
    await base44.asServiceRole.entities.DataCallRequest.update(dataCall.id, {
      portal_accessed_count: (dataCall.portal_accessed_count || 0) + 1,
      last_portal_access: new Date().toISOString()
    });

    console.log('[publicDataCallPortal] Data call loaded successfully:', dataCall.request_title);

    // Serve the HTML page
    return new Response(renderPortalPage(dataCall), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    console.error('[publicDataCallPortal] Error:', error);
    return new Response(renderErrorPage('An error occurred loading the data call portal: ' + error.message), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
});

function renderErrorPage(message) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Denied - ProposalIQ.ai</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen flex items-center justify-center p-6">
  <div class="max-w-md w-full bg-white rounded-xl shadow-2xl border-2 border-red-300 p-8 text-center">
    <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
      </svg>
    </div>
    <h1 class="text-2xl font-bold text-slate-900 mb-3">Access Denied</h1>
    <p class="text-slate-700 mb-6">${message}</p>
    <div class="text-xs text-slate-500 bg-slate-50 rounded p-4 text-left">
      <p class="font-semibold mb-2">Troubleshooting:</p>
      <p>• Make sure you're using the link from your email</p>
      <p>• Check that the link hasn't expired</p>
      <p>• Contact the sender if you continue having issues</p>
    </div>
  </div>
</body>
</html>`;
}

function renderPortalPage(dataCall) {
  const completedItems = dataCall.checklist_items.filter(item => 
    item.status === 'completed' || item.status === 'not_applicable'
  ).length;
  const totalItems = dataCall.checklist_items.length;
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const allRequiredCompleted = dataCall.checklist_items
    .filter(item => item.is_required)
    .every(item => item.status === 'completed' || item.status === 'not_applicable');

  const dueDate = dataCall.due_date ? new Date(dataCall.due_date).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'short', day: 'numeric' 
  }) : 'No deadline';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${dataCall.request_title} - ProposalIQ.ai Data Call Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .progress-bar {
      width: ${progressPercentage}%;
      transition: width 0.3s ease;
    }
  </style>
</head>
<body class="bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-4 md:p-6">
  <div class="max-w-5xl mx-auto space-y-6">
    <!-- Branding Header -->
    <div class="flex items-center justify-center gap-3 mb-4">
      <div class="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
        </svg>
      </div>
      <div>
        <h1 class="text-2xl font-bold text-slate-900">ProposalIQ.ai</h1>
        <p class="text-xs text-slate-500">Secure Data Call Portal</p>
      </div>
    </div>

    <!-- Header Card -->
    <div class="bg-white rounded-xl shadow-xl overflow-hidden">
      <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="text-xl md:text-2xl font-bold mb-2">${dataCall.request_title}</h2>
            <p class="text-blue-100 text-sm">Requested by ${dataCall.created_by_name || dataCall.created_by_email}</p>
          </div>
          <span class="px-3 py-1 rounded-full text-sm font-semibold ${
            dataCall.overall_status === 'completed' ? 'bg-green-600' :
            dataCall.overall_status === 'overdue' ? 'bg-red-600' :
            'bg-amber-600'
          }">
            ${dataCall.overall_status}
          </span>
        </div>
      </div>
      
      <div class="p-6 space-y-4">
        ${dataCall.request_description ? `<p class="text-slate-700">${dataCall.request_description}</p>` : ''}
        
        <div class="grid md:grid-cols-3 gap-4 py-4 border-t border-b">
          <div class="flex items-center gap-2 text-sm">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <div>
              <p class="text-slate-500">Due Date</p>
              <p class="font-semibold text-slate-900">${dueDate}</p>
            </div>
          </div>
          
          <div class="flex items-center gap-2 text-sm">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <div>
              <p class="text-slate-500">Progress</p>
              <p class="font-semibold text-slate-900">${completedItems} of ${totalItems} items</p>
            </div>
          </div>
          
          <div class="flex items-center gap-2 text-sm">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
            <div>
              <p class="text-slate-500">Priority</p>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 capitalize">
                ${dataCall.priority || 'medium'}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div class="w-full bg-slate-200 rounded-full h-3 mb-2">
            <div class="progress-bar h-3 rounded-full ${
              progressPercentage === 100 ? 'bg-green-500' :
              progressPercentage >= 50 ? 'bg-blue-500' :
              'bg-amber-500'
            }"></div>
          </div>
          <p class="text-xs text-slate-500 text-center">${Math.round(progressPercentage)}% Complete</p>
        </div>
      </div>
    </div>

    <!-- Checklist Items -->
    <div class="space-y-4" id="checklist-container">
      ${dataCall.checklist_items.map((item, index) => renderChecklistItem(item, index, dataCall)).join('')}
    </div>

    ${dataCall.overall_status !== 'completed' ? `
      <div class="bg-white rounded-xl shadow-xl border-2 border-blue-300 p-6">
        <div class="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 class="font-semibold text-slate-900 mb-1">Ready to Submit?</h3>
            <p class="text-sm ${allRequiredCompleted ? 'text-green-700' : 'text-amber-700'}">
              ${allRequiredCompleted ? '✓ All required items completed' : '⚠️ Some required items are still pending'}
            </p>
          </div>
          <button
            onclick="submitDataCall()"
            ${!allRequiredCompleted ? 'disabled' : ''}
            class="px-6 py-3 rounded-lg font-semibold text-white ${
              allRequiredCompleted 
                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer' 
                : 'bg-slate-300 cursor-not-allowed'
            }"
          >
            Submit Data Call
          </button>
        </div>
      </div>
    ` : `
      <div class="bg-white rounded-xl shadow-xl border-2 border-green-300 bg-green-50 p-8 text-center">
        <svg class="w-12 h-12 mx-auto mb-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 class="font-semibold text-green-900 text-xl mb-2">Data Call Submitted!</h3>
        <p class="text-green-700">Thank you for providing the requested information. The consulting team has been notified.</p>
      </div>
    `}

    <!-- Toast Container -->
    <div id="toast-container" class="fixed top-4 right-4 z-50 space-y-2"></div>
  </div>

  <script>
    const TOKEN = '${token}';
    const DATA_CALL_ID = '${dataCallId}';
    const API_BASE = window.location.origin + '/api/functions';

    function showToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = \`px-4 py-3 rounded-lg shadow-lg text-white \${type === 'success' ? 'bg-green-600' : 'bg-red-600'} animate-slide-in\`;
      toast.textContent = message;
      document.getElementById('toast-container').appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }

    async function uploadFile(itemId, fileInput) {
      const file = fileInput.files[0];
      if (!file) return;

      const btn = document.getElementById('upload-btn-' + itemId);
      btn.disabled = true;
      btn.innerHTML = '<svg class="animate-spin h-4 w-4 mr-2 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Uploading...';

      try {
        const formData = new FormData();
        formData.append('token', TOKEN);
        formData.append('data_call_id', DATA_CALL_ID);
        formData.append('item_id', itemId);
        formData.append('file', file);

        const response = await fetch(API_BASE + '/uploadDataCallFile', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        showToast('✅ File uploaded successfully!');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed: ' + error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Upload';
      }
    }

    async function markAsNA(itemId) {
      try {
        const response = await fetch(API_BASE + '/updateDataCallItem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: TOKEN,
            data_call_id: DATA_CALL_ID,
            item_id: itemId,
            status: 'not_applicable'
          })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        showToast('Item marked as not applicable');
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        showToast('Failed: ' + error.message, 'error');
      }
    }

    async function submitDataCall() {
      if (!confirm('Submit this data call? You will not be able to make changes after submission.')) {
        return;
      }

      try {
        const response = await fetch(API_BASE + '/updateDataCallItem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: TOKEN,
            data_call_id: DATA_CALL_ID,
            mark_completed: true
          })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        showToast('✅ Data call submitted successfully!');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        showToast('Submission failed: ' + error.message, 'error');
      }
    }
  </script>
</body>
</html>`;
}

function renderChecklistItem(item, index, dataCall) {
  const isCompleted = item.status === 'completed' || item.status === 'not_applicable';
  
  return `
    <div class="bg-white rounded-xl shadow-lg border-2 ${
      item.status === 'completed' ? 'border-green-300 bg-green-50' :
      item.status === 'not_applicable' ? 'border-slate-300 bg-slate-50' :
      item.is_required ? 'border-amber-300' : 'border-slate-200'
    } p-6">
      <div class="flex items-start gap-3 mb-4">
        <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          item.status === 'completed' ? 'bg-green-600 text-white' :
          item.status === 'not_applicable' ? 'bg-slate-400 text-white' :
          'bg-slate-200 text-slate-600'
        }">
          ${item.status === 'completed' ? `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          ` : `<span class="font-semibold text-sm">${index + 1}</span>`}
        </div>

        <div class="flex-1">
          <h3 class="text-lg font-bold text-slate-900 mb-1">
            ${item.item_label}
            ${item.is_required ? '<span class="ml-2 px-2 py-1 rounded text-xs font-semibold bg-amber-600 text-white">Required</span>' : ''}
          </h3>
          ${item.item_description ? `<p class="text-sm text-slate-600 mb-3">${item.item_description}</p>` : ''}
          
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            item.status === 'completed' ? 'bg-green-600 text-white' :
            item.status === 'not_applicable' ? 'bg-slate-400 text-white' :
            'bg-slate-200 text-slate-700'
          }">
            ${item.status === 'pending' ? 'Pending' :
              item.status === 'in_progress' ? 'In Progress' :
              item.status === 'completed' ? 'Completed' :
              'Not Applicable'}
          </span>
        </div>
      </div>

      ${!isCompleted ? `
        <div class="space-y-4 ml-11">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Upload Document</label>
            <div class="flex items-center gap-2">
              <input
                type="file"
                id="file-${item.id}"
                onchange="uploadFile('${item.id}', this)"
                class="flex-1 text-sm border border-slate-300 rounded-lg p-2 cursor-pointer"
              />
              <button
                id="upload-btn-${item.id}"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                style="display: none;"
              >
                Upload
              </button>
            </div>
          </div>

          <button
            onclick="markAsNA('${item.id}')"
            class="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Mark as Not Applicable
          </button>
        </div>
      ` : ''}

      ${item.uploaded_files?.length > 0 ? `
        <div class="bg-green-50 border border-green-200 rounded-lg p-3 ml-11 mt-4">
          <p class="text-sm font-semibold text-green-900">✓ ${item.uploaded_files.length} file(s) uploaded</p>
        </div>
      ` : ''}

      ${item.status === 'not_applicable' && item.submitted_notes ? `
        <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 ml-11 mt-4">
          <p class="text-sm text-slate-700"><strong>Note:</strong> ${item.submitted_notes}</p>
        </div>
      ` : ''}
    </div>
  `;
}