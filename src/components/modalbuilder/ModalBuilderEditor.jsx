import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Save, 
  Eye,
  Layers
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import FieldPalette from './FieldPalette';
import CanvasArea from './CanvasArea';

/**
 * Modal Builder Editor
 * 
 * Main editing interface for creating/editing modal configurations
 * Phase 0: Basic field addition and configuration
 */
export default function ModalBuilderEditor({ config, onClose }) {
  const [name, setName] = useState(config?.name || '');
  const [description, setDescription] = useState(config?.description || '');
  const [iconEmoji, setIconEmoji] = useState(config?.icon_emoji || '📋');
  const [fields, setFields] = useState([]);
  const [saving, setSaving] = useState(false);

  // Load existing config if editing
  useEffect(() => {
    if (config?.config_json) {
      try {
        const parsed = JSON.parse(config.config_json);
        setFields(parsed.fields || []);
      } catch (error) {
        console.error('Error parsing config JSON:', error);
      }
    }
  }, [config]);

  // Add field to canvas
  const handleAddField = (fieldType) => {
    const newField = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: `New ${fieldType} Field`,
      placeholder: '',
      required: false,
      helpText: ''
    };
    setFields([...fields, newField]);
  };

  // Update field properties
  const handleUpdateField = (fieldId, updates) => {
    setFields(fields.map(f => 
      f.id === fieldId ? { ...f, ...updates } : f
    ));
  };

  // Remove field
  const handleRemoveField = (fieldId) => {
    setFields(fields.filter(f => f.id !== fieldId));
  };

  // Reorder fields
  const handleReorderFields = (newFields) => {
    setFields(newFields);
  };

  // Save configuration
  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please provide a name for this modal configuration');
      return;
    }

    setSaving(true);
    try {
      const user = await base44.auth.me();
      
      const configJson = JSON.stringify({
        title: name,
        description: description,
        fields: fields
      });

      const data = {
        name,
        description,
        icon_emoji: iconEmoji,
        config_json: configJson,
        template_type: 'system',
        category: 'custom',
        is_active: true,
        version: config?.version ? config.version + 1 : 1,
        last_modified_by_email: user.email
      };

      if (!config) {
        data.created_by_email = user.email;
      }

      if (config) {
        await base44.entities.ModalConfig.update(config.id, data);
      } else {
        await base44.entities.ModalConfig.create(data);
      }

      onClose();
    } catch (error) {
      console.error('Error saving modal config:', error);
      alert('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {config ? 'Edit Modal Configuration' : 'New Modal Configuration'}
                </h1>
                <p className="text-sm text-slate-600">
                  Design your dynamic form structure
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Basic Info & Field Palette */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Icon Emoji</Label>
                  <Input
                    value={iconEmoji}
                    onChange={(e) => setIconEmoji(e.target.value)}
                    placeholder="📋"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label>Modal Name*</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Team Information Form"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this modal collects..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Field Palette */}
            <FieldPalette onAddField={handleAddField} />
          </div>

          {/* Center - Canvas Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-slate-600" />
                    <CardTitle className="text-base">Form Canvas</CardTitle>
                  </div>
                  <div className="text-sm text-slate-600">
                    {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CanvasArea
                  fields={fields}
                  onUpdateField={handleUpdateField}
                  onRemoveField={handleRemoveField}
                  onReorderFields={handleReorderFields}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}