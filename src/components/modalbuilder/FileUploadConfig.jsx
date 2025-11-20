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
    enabled: false,
    extractData: false,
    targetSchema: '',
    autoIngest: true
  };

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
        autoIngest: value === 'auto'
      }
    });
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
            <div>
              <Label className="text-xs">Target JSON Schema</Label>
              <Textarea
                value={ragConfig.targetSchema}
                onChange={(e) => handleSchemaChange(e.target.value)}
                placeholder='{"partner_name": "string", "capabilities": "array"}'
                rows={4}
                className="text-xs font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Define the structure of data to extract from uploaded files
              </p>
            </div>

            <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
              <AlertCircle className="w-3 h-3 text-yellow-700 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-800">
                AI will attempt to extract structured data matching this schema. Works best with PDFs and DOCX files.
              </p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}