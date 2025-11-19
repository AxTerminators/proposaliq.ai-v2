import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Layers,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Step Manager Component
 * 
 * Phase 2: Configure multi-step forms
 */
export default function StepManager({ steps, onUpdateSteps, fields, onUpdateField }) {
  const handleAddStep = () => {
    const newStep = {
      id: `step_${Date.now()}`,
      title: `Step ${steps.length + 1}`,
      description: ''
    };
    onUpdateSteps([...steps, newStep]);
  };

  const handleUpdateStep = (index, updates) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    onUpdateSteps(newSteps);
  };

  const handleRemoveStep = (index) => {
    const stepId = steps[index].id;
    // Unassign fields from this step
    fields.forEach(field => {
      if (field.stepId === stepId) {
        onUpdateField(field.id, { stepId: null });
      }
    });
    onUpdateSteps(steps.filter((_, i) => i !== index));
  };

  const handleMoveStep = (index, direction) => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    onUpdateSteps(newSteps);
  };

  const getStepFieldCount = (stepId) => {
    return fields.filter(f => f.stepId === stepId).length;
  };

  if (steps.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="p-6 text-center">
          <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-900 mb-2">
            Single-Step Form
          </h4>
          <p className="text-xs text-slate-600 mb-4">
            All fields will appear in a single form. Add steps to create a multi-step wizard.
          </p>
          <Button onClick={handleAddStep} variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Create Multi-Step Form
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <Card key={step.id} className="border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 pt-2">
                <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveStep(index, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveStep(index, 'down')}
                  disabled={index === steps.length - 1}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Step {index + 1}
                  </Badge>
                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                    {getStepFieldCount(step.id)} fields
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Step Title</Label>
                    <Input
                      value={step.title}
                      onChange={(e) => handleUpdateStep(index, { title: e.target.value })}
                      placeholder="Step title"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description (optional)</Label>
                    <Input
                      value={step.description || ''}
                      onChange={(e) => handleUpdateStep(index, { description: e.target.value })}
                      placeholder="Brief description"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveStep(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={handleAddStep}
        className="w-full gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Step
      </Button>
    </div>
  );
}