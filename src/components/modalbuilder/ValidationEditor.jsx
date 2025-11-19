import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, AlertCircle } from 'lucide-react';

/**
 * Validation Editor Component
 * 
 * Phase 1: Configure validation rules for fields
 */
export default function ValidationEditor({ field, onUpdate }) {
  const validationRules = field.validation || {};

  const handleValidationChange = (key, value) => {
    onUpdate({
      validation: {
        ...validationRules,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-blue-600" />
        <h5 className="font-semibold text-sm text-slate-900">Validation Rules</h5>
      </div>

      {/* Text/Textarea specific */}
      {(field.type === 'text' || field.type === 'textarea') && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Min Length</Label>
              <Input
                type="number"
                value={validationRules.minLength || ''}
                onChange={(e) => handleValidationChange('minLength', parseInt(e.target.value) || null)}
                placeholder="0"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Max Length</Label>
              <Input
                type="number"
                value={validationRules.maxLength || ''}
                onChange={(e) => handleValidationChange('maxLength', parseInt(e.target.value) || null)}
                placeholder="No limit"
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Pattern Type</Label>
            <Select 
              value={validationRules.pattern || 'none'}
              onValueChange={(val) => handleValidationChange('pattern', val === 'none' ? null : val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No pattern</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="phone">Phone Number</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Number specific */}
      {field.type === 'number' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Min Value</Label>
            <Input
              type="number"
              value={validationRules.min || ''}
              onChange={(e) => handleValidationChange('min', parseFloat(e.target.value) || null)}
              placeholder="No min"
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Max Value</Label>
            <Input
              type="number"
              value={validationRules.max || ''}
              onChange={(e) => handleValidationChange('max', parseFloat(e.target.value) || null)}
              placeholder="No max"
              className="text-sm"
            />
          </div>
        </div>
      )}

      {/* Date specific */}
      {field.type === 'date' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Min Date</Label>
            <Input
              type="date"
              value={validationRules.minDate || ''}
              onChange={(e) => handleValidationChange('minDate', e.target.value || null)}
              className="text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Max Date</Label>
            <Input
              type="date"
              value={validationRules.maxDate || ''}
              onChange={(e) => handleValidationChange('maxDate', e.target.value || null)}
              className="text-sm"
            />
          </div>
        </div>
      )}

      {/* Custom Error Message */}
      <div>
        <Label className="text-xs">Custom Error Message</Label>
        <Input
          value={validationRules.errorMessage || ''}
          onChange={(e) => handleValidationChange('errorMessage', e.target.value || null)}
          placeholder="This field is invalid"
          className="text-sm"
        />
      </div>

      <div className="flex items-start gap-2 p-2 bg-blue-100 rounded">
        <AlertCircle className="w-3 h-3 text-blue-700 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          Validation will be enforced when users submit the form
        </p>
      </div>
    </div>
  );
}