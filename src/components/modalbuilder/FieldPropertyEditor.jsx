import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import DataMappingEditor from './DataMappingEditor';
import ValidationEditor from './ValidationEditor';
import SelectOptionsEditor from './SelectOptionsEditor';

/**
 * Field Property Editor Component
 * 
 * Phase 1: Enhanced with validation rules and data mapping
 */
export default function FieldPropertyEditor({ field, onUpdate }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
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

      {/* Dropdown Options */}
      {field.type === 'select' && (
        <SelectOptionsEditor field={field} onUpdate={onUpdate} />
      )}

      {/* Advanced Settings Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full gap-2"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
      </Button>

      {showAdvanced && (
        <div className="space-y-4">
          {/* Validation Rules */}
          <ValidationEditor field={field} onUpdate={onUpdate} />
          
          {/* Data Mapping */}
          <DataMappingEditor field={field} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}