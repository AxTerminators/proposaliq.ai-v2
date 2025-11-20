import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Prefill Mapping Editor Component
 * 
 * Phase 4: Configure automatic pre-filling of form fields from extracted data
 */
export default function PrefillMappingEditor({ field, allFields, onUpdate }) {
  const [mappings, setMappings] = useState(field.prefillMappings || []);

  // Find all file upload fields with extraction enabled
  const fileFieldsWithExtraction = allFields.filter(f => 
    f.type === 'file' && 
    f.ragConfig?.extractData &&
    f.id !== field.id
  );

  // Load template mappings if available
  useEffect(() => {
    if (field.templateId && field.prefillMappings && mappings.length === 0) {
      setMappings(field.prefillMappings);
    }
  }, [field.templateId]);

  const handleAddMapping = () => {
    const newMapping = {
      id: `mapping_${Date.now()}`,
      sourceFileFieldId: '',
      sourceFieldPath: '',
      fallbackFieldPath: ''
    };
    const updated = [...mappings, newMapping];
    setMappings(updated);
    onUpdate({ prefillMappings: updated });
  };

  const handleUpdateMapping = (mappingId, updates) => {
    const updated = mappings.map(m => 
      m.id === mappingId ? { ...m, ...updates } : m
    );
    setMappings(updated);
    onUpdate({ prefillMappings: updated });
  };

  const handleRemoveMapping = (mappingId) => {
    const updated = mappings.filter(m => m.id !== mappingId);
    setMappings(updated);
    onUpdate({ prefillMappings: updated });
  };

  // Auto-suggest mapping based on field name similarity
  const handleAutoSuggest = () => {
    const currentFieldName = field.label?.toLowerCase() || '';
    const newMappings = [];

    fileFieldsWithExtraction.forEach(fileField => {
      const extractionDesc = fileField.ragConfig?.extractionFieldsDescription || '';
      const extractedFields = extractionDesc.split(',').map(f => f.trim().toLowerCase());

      // Try to match current field with extracted fields
      extractedFields.forEach(extractedField => {
        const similarity = currentFieldName.includes(extractedField) || 
                          extractedField.includes(currentFieldName);
        
        if (similarity) {
          newMappings.push({
            id: `mapping_${Date.now()}_${Math.random()}`,
            sourceFileFieldId: fileField.id,
            sourceFieldPath: extractedField,
            fallbackFieldPath: ''
          });
        }
      });
    });

    if (newMappings.length > 0) {
      setMappings(newMappings);
      onUpdate({ prefillMappings: newMappings });
    } else {
      alert('No matching fields found. Please configure manually.');
    }
  };

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-blue-600" />
          <h5 className="font-semibold text-sm text-slate-900">Pre-fill from Context</h5>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleAutoSuggest}
            size="sm"
            variant="outline"
            className="text-xs"
            disabled={fileFieldsWithExtraction.length === 0}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Auto-suggest
          </Button>
          <Button
            type="button"
            onClick={handleAddMapping}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Mapping
          </Button>
        </div>
      </div>

      {field.templateId && field.prefillMappings && field.prefillMappings.length > 0 && (
        <div className="flex items-start gap-2 p-2 bg-purple-50 rounded border border-purple-200">
          <Sparkles className="w-3 h-3 text-purple-700 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-purple-800">
            Template includes {field.prefillMappings.length} pre-configured mapping(s)
          </p>
        </div>
      )}

      {fileFieldsWithExtraction.length === 0 && (
        <p className="text-xs text-slate-600 italic">
          No file upload fields with data extraction available. Add a file field with AI extraction first.
        </p>
      )}

      {mappings.length === 0 && fileFieldsWithExtraction.length > 0 && (
        <p className="text-xs text-slate-600 italic">
          No mappings configured. Click "Add Mapping" to start.
        </p>
      )}

      <div className="space-y-3">
        {mappings.map((mapping) => {
          const selectedFileField = allFields.find(f => f.id === mapping.sourceFileFieldId);
          const extractedFields = selectedFileField?.ragConfig?.extractionFieldsDescription
            ?.split(',')
            .map(f => f.trim())
            .filter(Boolean) || [];

          return (
            <div key={mapping.id} className="p-3 bg-white rounded border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700">Mapping Configuration</span>
                <Button
                  type="button"
                  onClick={() => handleRemoveMapping(mapping.id)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </Button>
              </div>

              <div>
                <Label className="text-xs">Source File Field</Label>
                <Select
                  value={mapping.sourceFileFieldId}
                  onValueChange={(value) => handleUpdateMapping(mapping.id, { 
                    sourceFileFieldId: value,
                    sourceFieldPath: '' 
                  })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select file field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {fileFieldsWithExtraction.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mapping.sourceFileFieldId && (
                <>
                  <div>
                    <Label className="text-xs">Extracted Field</Label>
                    <Select
                      value={mapping.sourceFieldPath}
                      onValueChange={(value) => handleUpdateMapping(mapping.id, { 
                        sourceFieldPath: value 
                      })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select extracted field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {extractedFields.map(ef => (
                          <SelectItem key={ef} value={ef.toLowerCase().replace(/\s+/g, '_')}>
                            {ef}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Fallback Field (Optional)</Label>
                    <Input
                      value={mapping.fallbackFieldPath}
                      onChange={(e) => handleUpdateMapping(mapping.id, { 
                        fallbackFieldPath: e.target.value 
                      })}
                      placeholder="e.g., description"
                      className="text-xs"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Alternative field if primary is empty
                    </p>
                  </div>

                  {mapping.sourceFieldPath && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                      <Badge variant="secondary" className="text-xs">
                        {selectedFileField?.label} → {field.label}
                      </Badge>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 p-2 bg-blue-100 rounded">
        <Sparkles className="w-3 h-3 text-blue-700 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          This field will be automatically populated with data extracted from uploaded files
        </p>
      </div>
    </div>
  );
}