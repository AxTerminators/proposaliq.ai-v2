import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

/**
 * StatusUpdateConfig Component
 * 
 * Phase 6: Configure automatic status updates after modal submission
 */
export default function StatusUpdateConfig({ statusUpdates = [], onChange, allFields = [] }) {
  const [availableEntities] = useState(['Proposal', 'ProposalTask', 'DataCallRequest']);

  const handleAddStatusUpdate = () => {
    const newUpdate = {
      id: `status_${Date.now()}`,
      entity: '',
      targetField: 'status',
      newValue: '',
      idResolution: {
        method: 'context',
        contextPath: 'proposal.id'
      },
      enabled: true
    };
    onChange([...statusUpdates, newUpdate]);
  };

  const handleUpdateStatusUpdate = (updateId, updates) => {
    onChange(statusUpdates.map(u => u.id === updateId ? { ...u, ...updates } : u));
  };

  const handleRemoveStatusUpdate = (updateId) => {
    onChange(statusUpdates.filter(u => u.id !== updateId));
  };

  if (statusUpdates.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
        <CheckCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Status Updates</h3>
        <p className="text-sm text-slate-600 mb-4">
          Automatically update entity statuses after submission
        </p>
        <Button onClick={handleAddStatusUpdate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Status Update
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Status Updates</h3>
          <p className="text-xs text-slate-600">Update entity statuses automatically</p>
        </div>
        <Button size="sm" onClick={handleAddStatusUpdate} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Update
        </Button>
      </div>

      {statusUpdates.map((update, index) => (
        <div key={update.id} className="border border-slate-200 rounded-lg p-4 space-y-4 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-slate-600" />
              <span className="font-medium text-slate-900">Status Update {index + 1}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveStatusUpdate(update.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Entity Selection */}
          <div>
            <Label>Target Entity*</Label>
            <Select
              value={update.entity}
              onValueChange={(value) => handleUpdateStatusUpdate(update.id, { entity: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select entity..." />
              </SelectTrigger>
              <SelectContent>
                {availableEntities.map(entity => (
                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Field and Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Field to Update*</Label>
              <Input
                value={update.targetField}
                onChange={(e) => handleUpdateStatusUpdate(update.id, { targetField: e.target.value })}
                placeholder="status"
              />
            </div>
            <div>
              <Label>New Value*</Label>
              <Input
                value={update.newValue}
                onChange={(e) => handleUpdateStatusUpdate(update.id, { newValue: e.target.value })}
                placeholder="in_progress"
              />
              <p className="text-xs text-slate-500 mt-1">
                Use {`{{field_name}}`} for dynamic values
              </p>
            </div>
          </div>

          {/* ID Resolution */}
          <div className="bg-slate-50 p-3 rounded-lg space-y-3">
            <Label className="text-xs font-semibold text-slate-700">Entity ID Resolution</Label>
            
            <div>
              <Label className="text-sm">Method</Label>
              <Select
                value={update.idResolution?.method || 'context'}
                onValueChange={(value) => handleUpdateStatusUpdate(update.id, {
                  idResolution: { ...update.idResolution, method: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="context">From Context Data</SelectItem>
                  <SelectItem value="field">From Form Field</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {update.idResolution?.method === 'context' ? (
              <div>
                <Label className="text-sm">Context Path</Label>
                <Input
                  value={update.idResolution?.contextPath || ''}
                  onChange={(e) => handleUpdateStatusUpdate(update.id, {
                    idResolution: { ...update.idResolution, contextPath: e.target.value }
                  })}
                  placeholder="proposal.id"
                />
                <p className="text-xs text-slate-500 mt-1">
                  E.g., proposal.id, organization.id
                </p>
              </div>
            ) : (
              <div>
                <Label className="text-sm">Form Field</Label>
                <Select
                  value={update.idResolution?.fieldId || ''}
                  onValueChange={(value) => handleUpdateStatusUpdate(update.id, {
                    idResolution: { ...update.idResolution, fieldId: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allFields.map(field => (
                      <SelectItem key={field.id} value={field.id}>
                        {field.label || field.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
            <input
              type="checkbox"
              checked={update.enabled}
              onChange={(e) => handleUpdateStatusUpdate(update.id, { enabled: e.target.checked })}
              className="rounded"
            />
            <Label className="text-sm font-normal">Enabled</Label>
          </div>

          {(!update.entity || !update.targetField || !update.newValue) && (
            <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 p-2 rounded">
              <AlertCircle className="w-4 h-4" />
              <span>Entity, field, and value are required</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}