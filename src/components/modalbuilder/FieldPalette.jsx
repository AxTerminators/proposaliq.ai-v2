import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Type, 
  Hash, 
  Calendar,
  ChevronDown,
  CheckSquare,
  Upload,
  FileText,
  GripVertical
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';

/**
 * Field Palette Component
 * 
 * Phase 0: Static list of basic field types
 * Users can click to add fields to the canvas
 */
export default function FieldPalette({ onAddField }) {
  
  const fieldTypes = [
    {
      type: 'text',
      label: 'Text Input',
      icon: Type,
      description: 'Single-line text field'
    },
    {
      type: 'textarea',
      label: 'Multi-line Text',
      icon: Type,
      description: 'Large text area'
    },
    {
      type: 'number',
      label: 'Number',
      icon: Hash,
      description: 'Numeric input'
    },
    {
      type: 'date',
      label: 'Date Picker',
      icon: Calendar,
      description: 'Date selection'
    },
    {
      type: 'select',
      label: 'Dropdown',
      icon: ChevronDown,
      description: 'Single selection'
    },
    {
      type: 'checkbox',
      label: 'Checkbox',
      icon: CheckSquare,
      description: 'Yes/No option'
    },
    {
      type: 'file',
      label: 'File Upload',
      icon: Upload,
      description: 'File upload with RAG'
    },
    {
      type: 'richtext',
      label: 'Rich Text Editor',
      icon: FileText,
      description: 'Formatted text input'
    }
  ];

  const handleDragEnd = (result) => {
    // Dragging from palette to canvas is handled by the parent
    // This is just for visual feedback
    if (!result.destination) return;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Field Types</CardTitle>
        <p className="text-xs text-slate-600">
          Drag fields to the canvas or click to add
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="palette" isDropDisabled={true}>
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {fieldTypes.map((field, index) => (
                  <Draggable 
                    key={field.type} 
                    draggableId={`palette-${field.type}`} 
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Button
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        variant="outline"
                        className={cn(
                          "w-full justify-start h-auto py-3 cursor-grab active:cursor-grabbing",
                          snapshot.isDragging && "shadow-lg ring-2 ring-blue-400 opacity-80"
                        )}
                        onClick={() => onAddField(field.type)}
                      >
                        <div className="flex items-start gap-3 w-full text-left">
                          <div className="flex items-center gap-1">
                            <GripVertical className="w-4 h-4 text-slate-400" />
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <field.icon className="w-4 h-4 text-slate-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900">
                              {field.label}
                            </div>
                            <div className="text-xs text-slate-600">
                              {field.description}
                            </div>
                          </div>
                        </div>
                      </Button>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </CardContent>
    </Card>
  );
}