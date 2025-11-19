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
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

/**
 * Conditional Logic Editor Component
 * 
 * Phase 2: Configure when fields are shown/hidden based on other field values
 */
export default function ConditionalLogicEditor({ field, allFields, onUpdate }) {
  const conditions = field.conditions || [];

  const handleAddCondition = () => {
    const newCondition = {
      id: `cond_${Date.now()}`,
      targetFieldId: '',
      operator: 'equals',
      value: ''
    };
    onUpdate({ conditions: [...conditions, newCondition] });
  };

  const handleUpdateCondition = (index, updates) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    onUpdate({ conditions: newConditions });
  };

  const handleRemoveCondition = (index) => {
    onUpdate({ conditions: conditions.filter((_, i) => i !== index) });
  };

  // Filter out current field and fields that come after it
  const availableFields = allFields.filter(f => f.id !== field.id);

  return (
    <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
      <div className="flex items-center gap-2 mb-2">
        <Eye className="w-4 h-4 text-purple-600" />
        <h5 className="font-semibold text-sm text-slate-900">Conditional Visibility</h5>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          checked={conditions.length > 0}
          onCheckedChange={(checked) => {
            if (!checked) {
              onUpdate({ conditions: [] });
            }
          }}
        />
        <Label className="text-xs font-normal">
          Show this field only when conditions are met
        </Label>
      </div>

      {conditions.length > 0 && (
        <>
          <div className="space-y-3">
            {conditions.map((condition, index) => {
              const targetField = availableFields.find(f => f.id === condition.targetFieldId);
              
              return (
                <div key={condition.id} className="p-3 bg-white rounded border border-purple-200">
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-4">
                      <Label className="text-xs">Field</Label>
                      <Select 
                        value={condition.targetFieldId}
                        onValueChange={(val) => handleUpdateCondition(index, { targetFieldId: val })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map(f => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-3">
                      <Label className="text-xs">Condition</Label>
                      <Select 
                        value={condition.operator}
                        onValueChange={(val) => handleUpdateCondition(index, { operator: val })}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="notEquals">Not Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="isEmpty">Is Empty</SelectItem>
                          <SelectItem value="isNotEmpty">Is Not Empty</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {!['isEmpty', 'isNotEmpty'].includes(condition.operator) && (
                      <div className="col-span-4">
                        <Label className="text-xs">Value</Label>
                        {targetField?.type === 'checkbox' ? (
                          <Select 
                            value={condition.value}
                            onValueChange={(val) => handleUpdateCondition(index, { value: val })}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Checked</SelectItem>
                              <SelectItem value="false">Unchecked</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : targetField?.type === 'select' ? (
                          <Select 
                            value={condition.value}
                            onValueChange={(val) => handleUpdateCondition(index, { value: val })}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {targetField.options?.map(opt => (
                                <SelectItem key={opt.id} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={condition.value}
                            onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                            placeholder="Enter value"
                            className="text-xs"
                          />
                        )}
                      </div>
                    )}

                    <div className="col-span-1 pt-5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCondition(index)}
                        className="h-7 w-7"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCondition}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Condition
          </Button>

          <p className="text-xs text-purple-700 italic">
            All conditions must be met for this field to be shown (AND logic)
          </p>
        </>
      )}
    </div>
  );
}