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
import { Plus, Trash2, GitBranch } from 'lucide-react';

/**
 * Conditional Operations Editor Component
 * 
 * Phase 5: Configure conditions for when entity operations should execute
 * Supports simple field comparisons and logical operators
 */
export default function ConditionalOperationsEditor({ operation, allFields, onUpdate }) {
  const conditions = operation.conditions || [];

  const handleAddCondition = () => {
    const newCondition = {
      id: `cond_${Date.now()}`,
      field: '',
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

  return (
    <div className="space-y-3 p-3 bg-blue-50 rounded border border-blue-200">
      <div className="flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-blue-600" />
        <h6 className="font-semibold text-xs text-slate-900">Conditional Execution</h6>
      </div>

      <p className="text-xs text-slate-600">
        Execute this operation only when conditions are met
      </p>

      {conditions.length === 0 ? (
        <div className="text-center py-2">
          <p className="text-xs text-slate-500 mb-2">
            No conditions. Operation will always execute.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCondition}
            className="gap-2 h-8 text-xs"
          >
            <Plus className="w-3 h-3" />
            Add Condition
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {conditions.map((condition, index) => (
              <div key={condition.id} className="p-2 bg-white rounded border border-blue-200">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    {/* Field Selection */}
                    <div>
                      <Label className="text-xs">Field</Label>
                      <Select
                        value={condition.field}
                        onValueChange={(val) => handleUpdateCondition(index, { field: val })}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue placeholder="Select field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allFields.map(field => (
                            <SelectItem key={field.id} value={field.id}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operator */}
                    <div>
                      <Label className="text-xs">Operator</Label>
                      <Select
                        value={condition.operator}
                        onValueChange={(val) => handleUpdateCondition(index, { operator: val })}
                      >
                        <SelectTrigger className="text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="not_equals">Not Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="not_contains">Not Contains</SelectItem>
                          <SelectItem value="is_empty">Is Empty</SelectItem>
                          <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                          <SelectItem value="greater_than">Greater Than</SelectItem>
                          <SelectItem value="less_than">Less Than</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Value (not needed for is_empty/is_not_empty) */}
                    {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                      <div>
                        <Label className="text-xs">Value</Label>
                        <Input
                          value={condition.value}
                          onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                          placeholder="Comparison value..."
                          className="text-xs h-8"
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCondition(index)}
                    className="h-6 w-6 mt-5"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Logic Type */}
          {conditions.length > 1 && (
            <div>
              <Label className="text-xs">Logic</Label>
              <Select
                value={operation.conditionLogic || 'and'}
                onValueChange={(val) => onUpdate({ conditionLogic: val })}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">All conditions must match (AND)</SelectItem>
                  <SelectItem value="or">Any condition can match (OR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddCondition}
            className="w-full gap-2 h-8 text-xs"
          >
            <Plus className="w-3 h-3" />
            Add Another Condition
          </Button>
        </>
      )}
    </div>
  );
}