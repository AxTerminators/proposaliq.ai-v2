import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Layers, 
  List, 
  Calculator,
  ChevronDown,
  ChevronUp 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * Advanced Field Mapping Component
 * 
 * Phase 5: Configure nested object mapping, array mapping, and computed values
 */
export default function AdvancedFieldMapping({ field, allFields, onUpdate }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const advancedMapping = field.advancedMapping || {
    isNested: false,
    nestedPath: '',
    isArray: false,
    isComputed: false,
    computedExpression: '',
    computedFields: []
  };

  const handleUpdateAdvanced = (updates) => {
    onUpdate({ 
      advancedMapping: { 
        ...advancedMapping, 
        ...updates 
      } 
    });
  };

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full gap-2 text-xs"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        Advanced Mapping Options
      </Button>

      {showAdvanced && (
        <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
          {/* Nested Object Mapping */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <Label className="text-xs font-semibold">Nested Object Mapping</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                checked={advancedMapping.isNested}
                onCheckedChange={(checked) => handleUpdateAdvanced({ 
                  isNested: checked,
                  nestedPath: checked ? advancedMapping.nestedPath : ''
                })}
              />
              <Label className="text-xs font-normal cursor-pointer">
                Map to nested object path
              </Label>
            </div>

            {advancedMapping.isNested && (
              <div>
                <Label className="text-xs">Nested Path</Label>
                <Input
                  value={advancedMapping.nestedPath}
                  onChange={(e) => handleUpdateAdvanced({ nestedPath: e.target.value })}
                  placeholder="e.g., address.street or contact_info.primary.email"
                  className="text-xs font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use dot notation for nested attributes
                </p>
              </div>
            )}
          </div>

          {/* Array Field Mapping */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-purple-600" />
              <Label className="text-xs font-semibold">Array Mapping</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                checked={advancedMapping.isArray}
                onCheckedChange={(checked) => handleUpdateAdvanced({ isArray: checked })}
              />
              <Label className="text-xs font-normal cursor-pointer">
                This field produces an array of values
              </Label>
            </div>

            {advancedMapping.isArray && (
              <div className="p-2 bg-white rounded border border-purple-200">
                <p className="text-xs text-slate-600">
                  Field value will be treated as an array. Useful for multi-select fields 
                  or dynamically repeated fields that map to array attributes in the entity.
                </p>
              </div>
            )}
          </div>

          {/* Computed Field Values */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-purple-600" />
              <Label className="text-xs font-semibold">Computed Value</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                checked={advancedMapping.isComputed}
                onCheckedChange={(checked) => handleUpdateAdvanced({ 
                  isComputed: checked,
                  computedExpression: checked ? advancedMapping.computedExpression : '',
                  computedFields: checked ? advancedMapping.computedFields : []
                })}
              />
              <Label className="text-xs font-normal cursor-pointer">
                Compute value from other fields
              </Label>
            </div>

            {advancedMapping.isComputed && (
              <>
                <div>
                  <Label className="text-xs">Source Fields</Label>
                  <Select
                    value={advancedMapping.computedFields?.[0] || ''}
                    onValueChange={(val) => {
                      const currentFields = advancedMapping.computedFields || [];
                      if (!currentFields.includes(val)) {
                        handleUpdateAdvanced({ 
                          computedFields: [...currentFields, val] 
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Add source field..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allFields
                        .filter(f => f.id !== field.id)
                        .map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  {advancedMapping.computedFields && advancedMapping.computedFields.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {advancedMapping.computedFields.map(fieldId => {
                        const sourceField = allFields.find(f => f.id === fieldId);
                        return (
                          <div 
                            key={fieldId}
                            className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs flex items-center gap-1"
                          >
                            {sourceField?.label || fieldId}
                            <button
                              onClick={() => handleUpdateAdvanced({
                                computedFields: advancedMapping.computedFields.filter(id => id !== fieldId)
                              })}
                              className="ml-1 hover:text-purple-900"
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Computation Type</Label>
                  <Select
                    value={advancedMapping.computationType || 'concat'}
                    onValueChange={(val) => handleUpdateAdvanced({ computationType: val })}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concat">Concatenate (join text)</SelectItem>
                      <SelectItem value="sum">Sum (add numbers)</SelectItem>
                      <SelectItem value="average">Average (mean of numbers)</SelectItem>
                      <SelectItem value="custom">Custom Expression</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {advancedMapping.computationType === 'concat' && (
                  <div>
                    <Label className="text-xs">Separator</Label>
                    <Input
                      value={advancedMapping.computationSeparator || ' '}
                      onChange={(e) => handleUpdateAdvanced({ computationSeparator: e.target.value })}
                      placeholder="e.g., ' ' or ', '"
                      className="text-xs"
                    />
                  </div>
                )}

                {advancedMapping.computationType === 'custom' && (
                  <div>
                    <Label className="text-xs">Custom Expression</Label>
                    <Textarea
                      value={advancedMapping.computedExpression}
                      onChange={(e) => handleUpdateAdvanced({ computedExpression: e.target.value })}
                      placeholder="e.g., field1 + field2, or field1.toUpperCase()"
                      className="text-xs font-mono"
                      rows={3}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Use field IDs as variables. Example: field_123 + ' - ' + field_456
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}