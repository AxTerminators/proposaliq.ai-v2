import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Sparkles, AlertCircle, Wand2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import FileTypeHelper from './FileTypeHelper';

/**
 * File Upload Configuration Component
 * 
 * Phase 3: Configure RAG ingestion and AI extraction for file fields
 * Includes DOCX parsing support
 */
export default function FileUploadConfig({ field, onUpdate }) {
  const ragConfig = field.ragConfig || {
    enabled: true,
    extractData: true,
    targetSchema: '',
    autoIngest: true,
    ingestionMode: 'full_document',
    extractionFieldsDescription: ''
  };

  // User-friendly fields input (comma-separated or description)
  const [fieldsToExtract, setFieldsToExtract] = useState(
    ragConfig.extractionFieldsDescription || ''
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load template-based extraction fields on mount
  React.useEffect(() => {
    if (field.templateId && ragConfig.extractionFieldsDescription && !fieldsToExtract) {
      setFieldsToExtract(ragConfig.extractionFieldsDescription);
    }
  }, [field.templateId]);

  const handleToggleRAG = (checked) => {
    onUpdate({
      ragConfig: {
        ...ragConfig,
        enabled: checked
      }
    });
  };

  const handleToggleExtraction = (checked) => {
    onUpdate({
      ragConfig: {
        ...ragConfig,
        extractData: checked
      }
    });
  };

  const handleSchemaChange = (value) => {
    onUpdate({
      ragConfig: {
        ...ragConfig,
        targetSchema: value
      }
    });
  };

  const handleIngestModeChange = (value) => {
    onUpdate({
      ragConfig: {
        ...ragConfig,
        autoIngest: value === 'auto',
        ingestionMode: value
      }
    });
  };

  const handleExtractionDescriptionChange = (value) => {
    setFieldsToExtract(value);
    onUpdate({
      ragConfig: {
        ...ragConfig,
        extractionFieldsDescription: value
      }
    });
  };

  // Convert simple field names to JSON schema
  const handleFieldsChange = (value) => {
    setFieldsToExtract(value);
    
    if (!value.trim()) {
      handleSchemaChange('');
      return;
    }

    // Split by comma and create JSON schema
    const fields = value.split(',').map(f => f.trim()).filter(Boolean);
    const schema = {};
    
    fields.forEach(fieldName => {
      const cleanName = fieldName.toLowerCase().replace(/\s+/g, '_');
      schema[cleanName] = "string";
    });

    handleSchemaChange(JSON.stringify(schema, null, 2));
  };

  // AI-powered suggestions based on field label or template
  const handleAISuggestion = () => {
    // If template provides description, use that
    if (field.templateId && ragConfig.extractionFieldsDescription) {
      setFieldsToExtract(ragConfig.extractionFieldsDescription);
      handleExtractionDescriptionChange(ragConfig.extractionFieldsDescription);
      return;
    }

    const fieldLabel = field.label?.toLowerCase() || '';
    let suggested = '';

    if (fieldLabel.includes('solicitation') || fieldLabel.includes('rfp') || fieldLabel.includes('rfi')) {
      suggested = 'project title, solicitation number, contracting officer name, contracting officer email, response date, description, Q&A date, agency, opportunity type, set-aside type, NAICS code, place of performance, submission method, submission portal URL, submission instructions, requirement summaries, evaluation factors, contract type, key personnel requirements, performance period, past performance requirements, facility clearance requirements, CMMC requirement';
    } else if (fieldLabel.includes('resume') || fieldLabel.includes('cv')) {
      suggested = 'name, email, phone, experience, skills, education';
    } else if (fieldLabel.includes('capability') || fieldLabel.includes('partner')) {
      suggested = 'company_name, capabilities, past_performance, certifications';
    } else if (fieldLabel.includes('invoice') || fieldLabel.includes('receipt')) {
      suggested = 'vendor_name, amount, date, invoice_number, items';
    } else if (fieldLabel.includes('contract')) {
      suggested = 'contract_number, parties, start_date, end_date, value';
    } else {
      suggested = 'name, email, date, description';
    }

    setFieldsToExtract(suggested);
    handleExtractionDescriptionChange(suggested);
  };

  return (
    <div className="space-y-4">
      {/* AI-Powered Suggestions */}
      <FileTypeHelper
        field={field}
        onApplySuggestion={(config) => onUpdate({ ragConfig: config })}
      />

      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <h5 className="font-semibold text-sm text-slate-900">File Upload Configuration</h5>
        </div>

      {/* File Types */}
      <div>
        <Label className="text-xs">Accepted File Types</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="text-xs">PDF</Badge>
          <Badge variant="outline" className="text-xs">DOCX</Badge>
          <Badge variant="outline" className="text-xs">DOC</Badge>
          <Badge variant="outline" className="text-xs">TXT</Badge>
          <Badge variant="outline" className="text-xs">Images</Badge>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          DOCX files will be parsed using advanced document extraction
        </p>
      </div>

      {/* RAG Ingestion */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={ragConfig.enabled}
            onCheckedChange={handleToggleRAG}
          />
          <Label className="text-xs font-normal">
            Enable RAG Ingestion (make content searchable)
          </Label>
        </div>

        {ragConfig.enabled && (
          <div className="ml-6 space-y-3">
            <div>
              <Label className="text-xs">Ingestion Mode</Label>
              <Select
                value={ragConfig.autoIngest ? 'auto' : 'manual'}
                onValueChange={handleIngestModeChange}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automatic (on upload)</SelectItem>
                  <SelectItem value="manual">Manual (on demand)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 p-2 bg-indigo-100 rounded">
              <Sparkles className="w-3 h-3 text-indigo-700 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-indigo-800">
                Files will be processed and made available for AI-powered search and references
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI Data Extraction */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={ragConfig.extractData}
            onCheckedChange={handleToggleExtraction}
          />
          <Label className="text-xs font-normal">
            Enable AI Data Extraction
          </Label>
        </div>

        {ragConfig.extractData && (
         <div className="ml-6 space-y-3">
           {field.templateId && (
             <div className="flex items-start gap-2 p-2 bg-purple-50 rounded border border-purple-200">
               <Sparkles className="w-3 h-3 text-purple-700 mt-0.5 flex-shrink-0" />
               <p className="text-xs text-purple-800">
                 This field uses <strong>{field.templateName}</strong> with pre-configured extraction fields
               </p>
             </div>
           )}
           <div>
             <Label className="text-xs">What information to extract?</Label>
             <div className="flex gap-2 mt-1">
               <Textarea
                 value={fieldsToExtract}
                 onChange={(e) => handleExtractionDescriptionChange(e.target.value)}
                 placeholder="e.g., project title, solicitation number, agency, response date..."
                 className="text-xs flex-1 min-h-[80px]"
                 rows={3}
               />
             </div>
             <div className="flex items-center gap-2 mt-2">
               <Button
                 type="button"
                 onClick={handleAISuggestion}
                 size="sm"
                 variant="outline"
                 className="shrink-0"
               >
                 <Wand2 className="w-3 h-3 mr-1" />
                 {field.templateId ? 'Restore Template' : 'Suggest'}
               </Button>
               <p className="text-xs text-slate-500">
                 Describe all fields to extract, separated by commas.
               </p>
             </div>
           </div>

            {ragConfig.targetSchema && (
              <div className="flex items-start gap-2 p-2 bg-green-50 rounded border border-green-200">
                <Sparkles className="w-3 h-3 text-green-700 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-green-800">
                  AI will extract: {fieldsToExtract || 'specified fields'}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              {showAdvanced ? 'Hide' : 'Show'} advanced JSON schema
            </button>

            {showAdvanced && (
              <div>
                <Label className="text-xs">Generated JSON Schema</Label>
                <Textarea
                  value={ragConfig.targetSchema}
                  onChange={(e) => handleSchemaChange(e.target.value)}
                  rows={4}
                  className="text-xs font-mono"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Advanced users can manually edit the JSON schema
                </p>
              </div>
            )}

            <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
              <AlertCircle className="w-3 h-3 text-yellow-700 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-800">
                AI will attempt to extract structured data. Works best with PDFs and DOCX files.
              </p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}