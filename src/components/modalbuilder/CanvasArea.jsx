import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  GripVertical,
  Trash2,
  Settings,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import FieldPropertyEditor from './FieldPropertyEditor';

/**
 * Canvas Area Component
 * 
 * Phase 2: Enhanced with step support and conditional logic indicators
 */
export default function CanvasArea({ 
  fields, 
  steps,
  onUpdateField, 
  onRemoveField,
  onReorderFields 
}) {
  const [selectedFieldId, setSelectedFieldId] = useState(null);

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    onReorderFields(newFields);
  };

  const handleMoveDown = (index) => {
    if (index === fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    onReorderFields(newFields);
  };

  if (fields.length === 0) {
    return (
      <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center">
        <div className="text-slate-400 mb-2">
          <Settings className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          Empty Canvas
        </h3>
        <p className="text-slate-600 text-sm">
          Add fields from the palette on the left to start building your form
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <Card 
          key={field.id}
          className={cn(
            "transition-all",
            selectedFieldId === field.id && "ring-2 ring-blue-500"
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Drag Handle & Reorder */}
              <div className="flex flex-col gap-1 pt-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 cursor-move"
                  disabled
                >
                  <GripVertical className="w-4 h-4 text-slate-400" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === fields.length - 1}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>

              {/* Field Preview */}
              <div className="flex-1">
                <div className="mb-3">
                  <Label className="text-sm font-semibold text-slate-900">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.helpText && (
                    <p className="text-xs text-slate-600 mt-1">{field.helpText}</p>
                  )}
                </div>

                {/* Field Type Preview */}
                {field.type === 'text' && (
                  <Input placeholder={field.placeholder || 'Enter text...'} disabled />
                )}
                {field.type === 'textarea' && (
                  <Textarea placeholder={field.placeholder || 'Enter text...'} disabled rows={3} />
                )}
                {field.type === 'number' && (
                  <Input type="number" placeholder={field.placeholder || 'Enter number...'} disabled />
                )}
                {field.type === 'date' && (
                  <Input type="date" disabled />
                )}
                {field.type === 'select' && (
                  <select className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" disabled>
                    <option>{field.placeholder || 'Select an option...'}</option>
                    {field.options?.map(opt => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                )}
                {field.type === 'checkbox' && (
                  <div className="flex items-center gap-2">
                    <Checkbox disabled />
                    <span className="text-sm text-slate-600">
                      {field.placeholder || 'Checkbox option'}
                    </span>
                  </div>
                )}
                {field.type === 'file' && (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                    <p className="text-sm text-slate-600">Click or drag to upload</p>
                  </div>
                )}
                {field.type === 'richtext' && (
                  <div className="border border-slate-300 rounded-md p-3 bg-slate-50 min-h-[100px]">
                    <p className="text-sm text-slate-400">Rich text editor</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSelectedFieldId(
                    selectedFieldId === field.id ? null : field.id
                  )}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:text-red-700"
                  onClick={() => onRemoveField(field.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Conditional Logic Indicator */}
            {field.conditions && field.conditions.length > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-purple-700">
                <Eye className="w-3 h-3" />
                <span>Has {field.conditions.length} visibility {field.conditions.length === 1 ? 'rule' : 'rules'}</span>
              </div>
            )}

            {/* Property Editor */}
            {selectedFieldId === field.id && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <FieldPropertyEditor
                  field={field}
                  allFields={fields}
                  steps={steps}
                  onUpdate={(updates) => onUpdateField(field.id, updates)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}