import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Globe, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * WebhookConfig Component
 * 
 * Phase 6: Configure webhooks that trigger after modal submission
 */
export default function WebhookConfig({ webhooks = [], onChange, allFields = [] }) {
  const handleAddWebhook = () => {
    const newWebhook = {
      id: `webhook_${Date.now()}`,
      url: '',
      method: 'POST',
      headers: {},
      includeFormData: true,
      includeContext: false,
      customPayload: '',
      enabled: true
    };
    onChange([...webhooks, newWebhook]);
  };

  const handleUpdateWebhook = (webhookId, updates) => {
    onChange(webhooks.map(w => w.id === webhookId ? { ...w, ...updates } : w));
  };

  const handleRemoveWebhook = (webhookId) => {
    onChange(webhooks.filter(w => w.id !== webhookId));
  };

  const handleAddHeader = (webhookId) => {
    const webhook = webhooks.find(w => w.id === webhookId);
    if (webhook) {
      const headers = { ...webhook.headers, '': '' };
      handleUpdateWebhook(webhookId, { headers });
    }
  };

  const handleUpdateHeader = (webhookId, oldKey, newKey, value) => {
    const webhook = webhooks.find(w => w.id === webhookId);
    if (webhook) {
      const headers = { ...webhook.headers };
      if (oldKey !== newKey && oldKey !== '') {
        delete headers[oldKey];
      }
      if (newKey !== '') {
        headers[newKey] = value;
      }
      handleUpdateWebhook(webhookId, { headers });
    }
  };

  const handleRemoveHeader = (webhookId, key) => {
    const webhook = webhooks.find(w => w.id === webhookId);
    if (webhook) {
      const headers = { ...webhook.headers };
      delete headers[key];
      handleUpdateWebhook(webhookId, { headers });
    }
  };

  if (webhooks.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
        <Globe className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Webhooks Configured</h3>
        <p className="text-sm text-slate-600 mb-4">
          Trigger external services after modal submission
        </p>
        <Button onClick={handleAddWebhook} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Webhook
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Post-Submission Webhooks</h3>
          <p className="text-xs text-slate-600">Call external APIs after form submission</p>
        </div>
        <Button size="sm" onClick={handleAddWebhook} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Webhook
        </Button>
      </div>

      {webhooks.map((webhook, index) => (
        <div key={webhook.id} className="border border-slate-200 rounded-lg p-4 space-y-4 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-slate-600" />
              <span className="font-medium text-slate-900">Webhook {index + 1}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveWebhook(webhook.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* URL and Method */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-3">
              <Label>Webhook URL*</Label>
              <Input
                value={webhook.url}
                onChange={(e) => handleUpdateWebhook(webhook.id, { url: e.target.value })}
                placeholder="https://api.example.com/webhook"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={webhook.method}
                onValueChange={(value) => handleUpdateWebhook(webhook.id, { method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Headers</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAddHeader(webhook.id)}
                className="text-xs h-7"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Header
              </Button>
            </div>
            {Object.keys(webhook.headers || {}).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(webhook.headers || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Input
                      value={key}
                      onChange={(e) => handleUpdateHeader(webhook.id, key, e.target.value, value)}
                      placeholder="Header name"
                      className="flex-1"
                    />
                    <Input
                      value={value}
                      onChange={(e) => handleUpdateHeader(webhook.id, key, key, e.target.value)}
                      placeholder="Header value"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveHeader(webhook.id, key)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No custom headers</p>
            )}
          </div>

          {/* Payload Options */}
          <div className="space-y-3 bg-slate-50 p-3 rounded-lg">
            <Label className="text-xs font-semibold text-slate-700">Payload Configuration</Label>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={webhook.includeFormData}
                onChange={(e) => handleUpdateWebhook(webhook.id, { includeFormData: e.target.checked })}
                className="rounded"
              />
              <Label className="text-sm font-normal">Include form data</Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={webhook.includeContext}
                onChange={(e) => handleUpdateWebhook(webhook.id, { includeContext: e.target.checked })}
                className="rounded"
              />
              <Label className="text-sm font-normal">Include context (proposal, organization, user)</Label>
            </div>

            <div>
              <Label className="text-sm">Custom Payload (JSON)</Label>
              <Textarea
                value={webhook.customPayload}
                onChange={(e) => handleUpdateWebhook(webhook.id, { customPayload: e.target.value })}
                placeholder='{"custom_field": "value", "form_data": "$FORM_DATA"}'
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use $FORM_DATA and $CONTEXT as placeholders
              </p>
            </div>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <input
              type="checkbox"
              checked={webhook.enabled}
              onChange={(e) => handleUpdateWebhook(webhook.id, { enabled: e.target.checked })}
              className="rounded"
            />
            <Label className="text-sm font-normal">
              Webhook enabled
            </Label>
          </div>

          {!webhook.url && (
            <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 p-2 rounded">
              <AlertCircle className="w-4 h-4" />
              <span>Webhook URL is required</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}