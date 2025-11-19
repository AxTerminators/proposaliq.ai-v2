import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GripVertical } from 'lucide-react';

/**
 * Select Options Editor Component
 * 
 * Phase 1: Configure dropdown options
 */
export default function SelectOptionsEditor({ field, onUpdate }) {
  const options = field.options || [];

  const handleAddOption = () => {
    const newOption = {
      id: `opt_${Date.now()}`,
      label: 'New Option',
      value: 'new_option'
    };
    onUpdate({ options: [...options, newOption] });
  };

  const handleUpdateOption = (index, updates) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], ...updates };
    onUpdate({ options: newOptions });
  };

  const handleRemoveOption = (index) => {
    onUpdate({ options: options.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs">Dropdown Options</Label>
      
      {options.length === 0 ? (
        <p className="text-xs text-slate-500 italic">No options yet</p>
      ) : (
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
              <Input
                value={option.label}
                onChange={(e) => handleUpdateOption(index, { label: e.target.value })}
                placeholder="Display label"
                className="text-sm flex-1"
              />
              <Input
                value={option.value}
                onChange={(e) => handleUpdateOption(index, { value: e.target.value })}
                placeholder="Value"
                className="text-sm flex-1 font-mono"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveOption(index)}
                className="h-8 w-8"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={handleAddOption}
        className="w-full gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Option
      </Button>
    </div>
  );
}