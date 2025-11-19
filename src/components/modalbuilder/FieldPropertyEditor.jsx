import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * Field Property Editor Component
 * 
 * Phase 0: Basic field configuration (label, placeholder, required, helpText)
 * Future phases will add validation rules, conditional logic, data mapping
 */
export default function FieldPropertyEditor({ field, onUpdate }) {
  
  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm text-slate-900">Field Properties</h4>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Label */}
        <div>
          <Label className="text-xs">Label*</Label>
          <Input
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Field label"
            className="text-sm"
          />
        </div>

        {/* Placeholder */}
        <div>
          <Label className="text-xs">Placeholder</Label>
          <Input
            value={field.placeholder || ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            placeholder="Placeholder text"
            className="text-sm"
          />
        </div>

        {/* Help Text */}
        <div className="col-span-2">
          <Label className="text-xs">Help Text</Label>
          <Textarea
            value={field.helpText || ''}
            onChange={(e) => onUpdate({ helpText: e.target.value })}
            placeholder="Additional guidance for users..."
            rows={2}
            className="text-sm"
          />
        </div>

        {/* Required */}
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={field.required || false}
              onCheckedChange={(checked) => onUpdate({ required: checked })}
            />
            <Label className="text-xs font-normal cursor-pointer">
              Required field
            </Label>
          </div>
        </div>
      </div>

      {/* Field Type Specific Options */}
      {field.type === 'select' && (
        <div>
          <Label className="text-xs">Dropdown Options (coming soon)</Label>
          <p className="text-xs text-slate-500 mt-1">
            Phase 1 will add the ability to configure dropdown options
          </p>
        </div>
      )}
    </div>
  );
}