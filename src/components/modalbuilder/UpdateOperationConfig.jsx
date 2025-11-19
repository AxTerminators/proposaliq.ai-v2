import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { KeyRound, AlertCircle } from 'lucide-react';

/**
 * Update Operation Configuration Component
 * 
 * Phase 5: Configure how to resolve entity IDs for update operations
 */
export default function UpdateOperationConfig({ operation, allFields, onUpdate }) {
  const idResolution = operation.idResolution || {
    method: 'field', // 'field' or 'context'
    fieldId: '',
    contextPath: ''
  };

  const handleUpdateIdResolution = (updates) => {
    onUpdate({ 
      idResolution: { 
        ...idResolution, 
        ...updates 
      } 
    });
  };

  return (
    <div className="space-y-3 p-3 bg-amber-50 rounded border border-amber-200">
      <div className="flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-amber-600" />
        <h6 className="font-semibold text-xs text-slate-900">Update Configuration</h6>
      </div>

      <p className="text-xs text-slate-600">
        Specify how to identify the entity to update
      </p>

      {/* ID Resolution Method */}
      <div>
        <Label className="text-xs">ID Source</Label>
        <Select
          value={idResolution.method}
          onValueChange={(val) => handleUpdateIdResolution({ 
            method: val,
            fieldId: '',
            contextPath: ''
          })}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="field">From Form Field</SelectItem>
            <SelectItem value="context">From Context Data</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Field ID Selection */}
      {idResolution.method === 'field' && (
        <div>
          <Label className="text-xs">Field Containing Entity ID</Label>
          <Select
            value={idResolution.fieldId}
            onValueChange={(val) => handleUpdateIdResolution({ fieldId: val })}
          >
            <SelectTrigger className="text-xs h-8">
              <SelectValue placeholder="Select field..." />
            </SelectTrigger>
            <SelectContent>
              {allFields.map(field => (
                <SelectItem key={field.id} value={field.id}>
                  {field.label} ({field.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 mt-1">
            Field must contain a valid entity ID
          </p>
        </div>
      )}

      {/* Context Path */}
      {idResolution.method === 'context' && (
        <div>
          <Label className="text-xs">Context Path</Label>
          <Input
            value={idResolution.contextPath}
            onChange={(e) => handleUpdateIdResolution({ contextPath: e.target.value })}
            placeholder="e.g., proposal.id or organization.id"
            className="text-xs h-8 font-mono"
          />
          <p className="text-xs text-slate-500 mt-1">
            Path to the entity ID in context data
          </p>
        </div>
      )}

      {/* Warning if not configured */}
      {(!idResolution.fieldId && idResolution.method === 'field') || 
       (!idResolution.contextPath && idResolution.method === 'context') ? (
        <div className="flex items-start gap-2 p-2 bg-amber-100 rounded border border-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Update operation will fail if ID source is not configured
          </p>
        </div>
      ) : null}
    </div>
  );
}