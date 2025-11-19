import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import DataMappingEditor from './DataMappingEditor';
import ValidationEditor from './ValidationEditor';
import SelectOptionsEditor from './SelectOptionsEditor';
import ConditionalLogicEditor from './ConditionalLogicEditor';
import ContextDataEditor from './ContextDataEditor';
import FileUploadConfig from './FileUploadConfig';
import AdvancedFieldMapping from './AdvancedFieldMapping';

/**
 * Field Property Editor Component
 * 
 * Phase 5: Enhanced with advanced field mappings (nested, array, computed)
 */
export default function FieldPropertyEditor({ field, onUpdate, allFields, steps }) {
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

      {/* Step Assignment (if multi-step) */}
      {steps && steps.length > 0 && (
        <div>
          <Label className="text-xs">Assign to Step</Label>
          <Select 
            value={field.stepId || 'none'}
            onValueChange={(val) => onUpdate({ stepId: val === 'none' ? null : val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No step (hidden)</SelectItem>
              {steps.map((step, idx) => (
                <SelectItem key={step.id} value={step.id}>
                  Step {idx + 1}: {step.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dropdown Options */}
      {field.type === 'select' && (
        <SelectOptionsEditor field={field} onUpdate={onUpdate} />
      )}

      {/* File Upload Configuration */}
      {field.type === 'file' && (
        <FileUploadConfig field={field} onUpdate={onUpdate} />
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
          {/* Pre-fill from Context */}
          <ContextDataEditor field={field} onUpdate={onUpdate} />
          
          {/* Conditional Logic */}
          <ConditionalLogicEditor field={field} allFields={allFields} onUpdate={onUpdate} />
          
          {/* Validation Rules */}
          <ValidationEditor field={field} onUpdate={onUpdate} />
          
          {/* Data Mapping */}
          <DataMappingEditor field={field} onUpdate={onUpdate} />

          {/* Advanced Field Mapping */}
          <AdvancedFieldMapping field={field} allFields={allFields} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}