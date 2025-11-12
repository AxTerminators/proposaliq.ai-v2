import { base44 } from "@/api/base44Client";

/**
 * Utility functions for logging data call security audit events
 */

export const logDataCallAction = async (actionType, dataCall, user, details = {}) => {
  try {
    await base44.entities.AuditLog.create({
      admin_email: user.email,
      admin_role: user.role || 'user',
      action_type: actionType,
      target_entity: `data_call:${dataCall.id}`,
      details: JSON.stringify({
        data_call_id: dataCall.id,
        data_call_title: dataCall.request_title,
        recipient_type: dataCall.recipient_type,
        recipient_email: dataCall.assigned_to_email,
        organization_id: dataCall.organization_id,
        ...details
      }),
      success: true
    });
  } catch (error) {
    console.error('Failed to log audit action:', error);
    // Don't throw - audit logging shouldn't break the main flow
  }
};

export const DataCallAuditActions = {
  VIEWED: 'data_call_viewed',
  EXPORTED_PDF: 'data_call_exported_pdf',
  EXPORTED_EXCEL: 'data_call_exported_excel',
  BATCH_EXPORTED: 'data_call_batch_exported',
  PORTAL_LINK_ACCESSED: 'data_call_portal_accessed',
  PORTAL_LINK_COPIED: 'data_call_portal_copied',
  SENSITIVE_DATA_ACCESSED: 'data_call_sensitive_accessed',
  FILES_DOWNLOADED: 'data_call_files_downloaded',
  EDITED: 'data_call_edited',
  DELETED: 'data_call_deleted',
  APPROVAL_DECISION: 'data_call_approval_decision',
  REMINDER_SENT: 'data_call_reminder_sent'
};

/**
 * Helper to check if data call contains sensitive information
 */
export const isSensitiveDataCall = (dataCall) => {
  const sensitiveKeywords = ['financial', 'proprietary', 'confidential', 'classified', 'nda'];
  const title = (dataCall.request_title || '').toLowerCase();
  const description = (dataCall.request_description || '').toLowerCase();
  
  return sensitiveKeywords.some(keyword => 
    title.includes(keyword) || description.includes(keyword)
  );
};

/**
 * Batch logging for bulk operations
 */
export const logBulkDataCallAction = async (actionType, dataCallIds, user, details = {}) => {
  try {
    await base44.entities.AuditLog.create({
      admin_email: user.email,
      admin_role: user.role || 'user',
      action_type: actionType,
      target_entity: `bulk_data_calls:${dataCallIds.length}`,
      details: JSON.stringify({
        data_call_ids: dataCallIds,
        count: dataCallIds.length,
        ...details
      }),
      success: true
    });
  } catch (error) {
    console.error('Failed to log bulk audit action:', error);
  }
};