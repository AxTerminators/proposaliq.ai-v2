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
  Layers
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    onUpdateSteps(items);
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="steps">
        {(provided, snapshot) => (
          <div 
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "space-y-3",
              snapshot.isDraggingOver && "bg-purple-50/50 rounded-lg"
            )}
          >
            {steps.map((step, index) => (
              <Draggable key={step.id} draggableId={step.id} index={index}>
                {(provided, snapshot) => (
                  <Card 
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={cn(
                      "border-purple-200",
                      snapshot.isDragging && "shadow-lg ring-2 ring-purple-400"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div 
                          {...provided.dragHandleProps}
                          className="flex flex-col gap-1 pt-2 cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="w-5 h-5 text-slate-400 hover:text-slate-600" />
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
          )}
        </Draggable>
      ))}
      {provided.placeholder}
      
      <Button
        variant="outline"
        onClick={handleAddStep}
        className="w-full gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Step
      </Button>
    </div>
  )}
</Droppable>
</DragDropContext>
  );
}