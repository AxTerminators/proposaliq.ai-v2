import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Upload, Copy, Check, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

/**
 * TemplateImportExport Component
 * 
 * Phase 6: Import and export modal configurations as JSON
 */
export default function TemplateImportExport({ config, onImport }) {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState('');

  // Generate exportable JSON
  const getExportJson = () => {
    if (!config) return '{}';

    try {
      const exportData = {
        version: '6.0',
        name: config.name,
        description: config.description,
        icon_emoji: config.icon_emoji,
        category: config.category,
        config: JSON.parse(config.config_json),
        exported_at: new Date().toISOString(),
        exported_by: 'GovHQ.ai Modal Builder'
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error generating export:', error);
      return '{}';
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getExportJson());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Download as file
  const handleDownload = () => {
    const json = getExportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modal-template-${config?.name?.replace(/\s+/g, '-').toLowerCase() || 'config'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Validate and import JSON
  const handleImport = async () => {
    setImportError('');
    
    try {
      const parsed = JSON.parse(importJson);
      
      // Validate structure
      if (!parsed.config || !parsed.config.fields) {
        setImportError('Invalid template format: missing config.fields');
        return;
      }

      // Create imported config data
      const importedData = {
        name: parsed.name || 'Imported Template',
        description: parsed.description || '',
        icon_emoji: parsed.icon_emoji || '📋',
        category: parsed.category || 'custom',
        config_json: JSON.stringify(parsed.config),
        template_type: 'organization',
        is_active: true,
        version: 1
      };

      // Call onImport callback
      if (onImport) {
        await onImport(importedData);
        setShowImport(false);
        setImportJson('');
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportError(error.message || 'Failed to parse JSON. Please check the format.');
    }
  };

  // Load from file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setImportJson(event.target?.result || '');
      setImportError('');
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex gap-2">
      {/* Export Button */}
      {config && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowExport(true)}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export Template
        </Button>
      )}

      {/* Import Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowImport(true)}
        className="gap-2"
      >
        <Upload className="w-4 h-4" />
        Import Template
      </Button>

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Export Modal Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template JSON</Label>
              <Textarea
                value={getExportJson()}
                readOnly
                rows={15}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} className="gap-2">
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <Button onClick={handleDownload} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Download as File
              </Button>
            </div>
            <p className="text-xs text-slate-600">
              Share this JSON with others or save it for backup. You can import it later to recreate this modal configuration.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Modal Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Upload JSON File</Label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-500">OR paste JSON</span>
              </div>
            </div>

            <div>
              <Label>Template JSON</Label>
              <Textarea
                value={importJson}
                onChange={(e) => {
                  setImportJson(e.target.value);
                  setImportError('');
                }}
                placeholder="Paste exported modal template JSON here..."
                rows={12}
                className="font-mono text-xs"
              />
            </div>

            {importError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={!importJson}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Import Template
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowImport(false);
                  setImportJson('');
                  setImportError('');
                }}
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs text-slate-600">
              Import a previously exported modal template. This will create a new modal configuration based on the imported JSON.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}