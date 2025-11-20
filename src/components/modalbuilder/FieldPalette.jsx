import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Type, 
  Hash, 
  Calendar,
  ChevronDown,
  CheckSquare,
  Upload,
  FileText,
  GripVertical,
  Sparkles
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

/**
 * Field Palette Component
 * 
 * Displays basic field types + file upload templates
 * Users can click to add fields to the canvas
 */
export default function FieldPalette({ onAddField }) {
  
  // Load file upload templates
  const { data: fileTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['fileUploadTemplates'],
    queryFn: async () => {
      const templates = await base44.entities.FileUploadTemplate.list('display_order');
      return templates || [];
    }
  });

  const basicFieldTypes = [
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
      label: 'File Upload (Basic)',
      icon: Upload,
      description: 'Generic file upload'
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
          Click to add fields to the canvas
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Templates Section */}
        {!templatesLoading && fileTemplates.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-slate-900">File Upload Templates</h3>
            </div>
            {fileTemplates.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                className="w-full justify-start h-auto py-3 border-purple-200 hover:border-purple-400 hover:bg-purple-50"
                onClick={() => onAddField('file', template)}
              >
                <div className="flex items-start gap-3 w-full text-left">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Upload className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-900">
                        {template.template_name}
                      </span>
                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                        Auto-configured
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {template.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
            <div className="border-t border-slate-200 my-3"></div>
          </div>
        )}

        {/* Basic Field Types Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Basic Fields</h3>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="palette" isDropDisabled={true}>
              {(provided) => (
                <div 
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {basicFieldTypes.map((field, index) => (
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
        </div>
      </CardContent>
    </Card>
  );
}