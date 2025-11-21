import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Live Preview Component
 * 
 * Phase 2: Real-time preview of modal form with conditional logic
 */
export default function LivePreview({ isOpen, onClose, modalConfig, fields, steps }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({});

  const isMultiStep = steps && steps.length > 0;

  // Check if field should be visible based on conditions
  const isFieldVisible = (field) => {
    if (!field.conditions || field.conditions.length === 0) return true;

    return field.conditions.every(condition => {
      const fieldValue = formData[condition.targetFieldId];
      
      switch (condition.operator) {
        case 'equals':
          return String(fieldValue) === String(condition.value);
        case 'notEquals':
          return String(fieldValue) !== String(condition.value);
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'isEmpty':
          return !fieldValue || fieldValue === '';
        case 'isNotEmpty':
          return fieldValue && fieldValue !== '';
        default:
          return true;
      }
    });
  };

  // Get fields for current step
  const getVisibleFields = () => {
    let fieldsToShow = fields;

    if (isMultiStep) {
      const currentStepId = steps[currentStep]?.id;
      fieldsToShow = fields.filter(f => f.stepId === currentStepId);
    }

    return fieldsToShow.filter(isFieldVisible);
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const visibleFields = getVisibleFields();

  const renderField = (field) => {
    const value = formData[field.id] || '';

    return (
      <div key={field.id} className="space-y-2">
        <Label className="text-sm">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {field.helpText && (
          <p className="text-xs text-slate-600">{field.helpText}</p>
        )}

        {field.type === 'text' && (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        )}
        
        {field.type === 'textarea' && (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        )}
        
        {field.type === 'number' && (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        )}
        
        {field.type === 'date' && (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
          />
        )}
        
        {field.type === 'select' && (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">{field.placeholder || 'Select an option...'}</option>
            {field.options?.map(opt => (
              <option key={opt.id} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        
        {field.type === 'checkbox' && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={value === true}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
            <span className="text-sm">{field.placeholder}</span>
          </div>
        )}

        {field.type === 'file' && (
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
            <p className="text-sm text-slate-600">File upload (preview only)</p>
          </div>
        )}

        {field.type === 'richtext' && (
          <div className="border border-slate-300 rounded-md p-3 bg-white min-h-[120px]">
            <p className="text-sm text-slate-400">Rich text editor (preview)</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{modalConfig?.name || 'Form Preview'}</DialogTitle>
              {modalConfig?.description && (
                <p className="text-sm text-slate-600 mt-1">{modalConfig.description}</p>
              )}
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Preview Mode
            </Badge>
          </div>
        </DialogHeader>

        {isMultiStep && (
          <div className="flex items-center gap-2 mb-4">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                      ${idx === currentStep 
                        ? 'bg-blue-600 text-white' 
                        : idx < currentStep 
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }
                    `}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{step.title}</p>
                      {step.description && (
                        <p className="text-xs text-slate-600">{step.description}</p>
                      )}
                    </div>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-400 mx-2" />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {visibleFields.length > 0 ? (
            visibleFields.map(renderField)
          ) : (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No fields in this {isMultiStep ? 'step' : 'form'}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          {isMultiStep ? (
            <>
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </Button>
              <span className="text-sm text-slate-600">
                Step {currentStep + 1} of {steps.length}
              </span>
              <Button
                onClick={() => {
                  if (currentStep < steps.length - 1) {
                    setCurrentStep(currentStep + 1);
                  }
                }}
                disabled={currentStep === steps.length - 1}
                className="gap-2"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <div />
              <Button>Submit (Preview)</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}