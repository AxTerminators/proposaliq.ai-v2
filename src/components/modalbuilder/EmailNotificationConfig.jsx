import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Mail, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * EmailNotificationConfig Component
 * 
 * Phase 6: Configure email notifications after modal submission
 */
export default function EmailNotificationConfig({ notifications = [], onChange, allFields = [] }) {
  const handleAddNotification = () => {
    const newNotification = {
      id: `email_${Date.now()}`,
      to: '',
      fromName: '',
      subject: '',
      body: '',
      includeFormData: true,
      enabled: true
    };
    onChange([...notifications, newNotification]);
  };

  const handleUpdateNotification = (notificationId, updates) => {
    onChange(notifications.map(n => n.id === notificationId ? { ...n, ...updates } : n));
  };

  const handleRemoveNotification = (notificationId) => {
    onChange(notifications.filter(n => n.id !== notificationId));
  };

  // Helper to insert field placeholder at cursor position
  const insertFieldPlaceholder = (notificationId, fieldName, targetField) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      const placeholder = `{{${fieldName}}}`;
      const currentValue = notification[targetField] || '';
      handleUpdateNotification(notificationId, {
        [targetField]: currentValue + placeholder
      });
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
        <Mail className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Email Notifications</h3>
        <p className="text-sm text-slate-600 mb-4">
          Send automated emails after modal submission
        </p>
        <Button onClick={handleAddNotification} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Email Notification
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Email Notifications</h3>
          <p className="text-xs text-slate-600">Send automated emails after form submission</p>
        </div>
        <Button size="sm" onClick={handleAddNotification} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Notification
        </Button>
      </div>

      {notifications.map((notification, index) => (
        <div key={notification.id} className="border border-slate-200 rounded-lg p-4 space-y-4 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-slate-600" />
              <span className="font-medium text-slate-900">Email {index + 1}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveNotification(notification.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Recipients and From Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>To (Email)*</Label>
              <Input
                value={notification.to}
                onChange={(e) => handleUpdateNotification(notification.id, { to: e.target.value })}
                placeholder="user@example.com or {{user_email}}"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use {`{{field_name}}`} for dynamic values
              </p>
            </div>
            <div>
              <Label>From Name</Label>
              <Input
                value={notification.fromName}
                onChange={(e) => handleUpdateNotification(notification.id, { fromName: e.target.value })}
                placeholder="GovHQ.ai"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Subject*</Label>
              {allFields.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">Insert field:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        insertFieldPlaceholder(notification.id, e.target.value, 'subject');
                        e.target.value = '';
                      }
                    }}
                    className="text-xs border border-slate-200 rounded px-2 py-1"
                  >
                    <option value="">Select...</option>
                    {allFields.map(field => (
                      <option key={field.id} value={field.label || field.id}>
                        {field.label || field.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <Input
              value={notification.subject}
              onChange={(e) => handleUpdateNotification(notification.id, { subject: e.target.value })}
              placeholder="New submission from {{user_name}}"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Body*</Label>
              {allFields.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">Insert field:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        insertFieldPlaceholder(notification.id, e.target.value, 'body');
                        e.target.value = '';
                      }
                    }}
                    className="text-xs border border-slate-200 rounded px-2 py-1"
                  >
                    <option value="">Select...</option>
                    {allFields.map(field => (
                      <option key={field.id} value={field.label || field.id}>
                        {field.label || field.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <Textarea
              value={notification.body}
              onChange={(e) => handleUpdateNotification(notification.id, { body: e.target.value })}
              placeholder="A new form submission has been received.&#10;&#10;Details:&#10;Name: {{user_name}}&#10;Email: {{user_email}}"
              rows={6}
            />
            <p className="text-xs text-slate-500 mt-1">
              Use {`{{field_name}}`} for form values. Available: {`{{user_name}}, {{user_email}}, {{organization_name}}`}
            </p>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notification.includeFormData}
                onChange={(e) => handleUpdateNotification(notification.id, { includeFormData: e.target.checked })}
                className="rounded"
              />
              <Label className="text-sm font-normal">Attach full form data</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={notification.enabled}
                onChange={(e) => handleUpdateNotification(notification.id, { enabled: e.target.checked })}
                className="rounded"
              />
              <Label className="text-sm font-normal">Enabled</Label>
            </div>
          </div>

          {(!notification.to || !notification.subject || !notification.body) && (
            <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 p-2 rounded">
              <AlertCircle className="w-4 h-4" />
              <span>Email, subject, and body are required</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}