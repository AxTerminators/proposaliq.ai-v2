import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Save, 
  Eye,
  Layers,
  ListOrdered,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import FieldPalette from './FieldPalette';
import CanvasArea from './CanvasArea';
import StepManager from './StepManager';
import LivePreview from './LivePreview';
import EntityOperationsEditor from './EntityOperationsEditor';
import TemplateImportExport from './TemplateImportExport';
import { ValidationAlert, validateModalConfig } from './ErrorHandling';
import ModalBuilderGuide, { GuideButton } from './ModalBuilderGuide';
import { useModalValidation } from './useModalValidation';
import ModalHealthPanel from './ModalHealthPanel';

/**
 * Modal Builder Editor
 * 
 * Phase 2: Added multi-step forms and live preview
 * Phase 6: Added workflow automation and template import/export
 */
export default function ModalBuilderEditor({ config, onClose }) {
  const [name, setName] = useState(config?.name || '');
  const [description, setDescription] = useState(config?.description || '');
  const [iconEmoji, setIconEmoji] = useState(config?.icon_emoji || '📋');
  const [fields, setFields] = useState([]);
  const [steps, setSteps] = useState([]);
  const [entityOperations, setEntityOperations] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [emailNotifications, setEmailNotifications] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState('fields');

  // Validation
  const validation = useModalValidation({
    name,
    description,
    fields,
    steps,
    entityOperations,
    webhooks,
    emailNotifications,
    statusUpdates,
  });

  // Auto-show guide on first visit
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenModalBuilderGuide');
    if (!hasSeenGuide && !config) {
      setShowGuide(true);
    }
  }, [config]);

  // Load existing config if editing
  useEffect(() => {
    if (config?.config_json) {
      try {
        const parsed = JSON.parse(config.config_json);
        setFields(parsed.fields || []);
        setSteps(parsed.steps || []);
        setEntityOperations(parsed.entityOperations || []);
        setWebhooks(parsed.webhooks || []);
        setEmailNotifications(parsed.emailNotifications || []);
        setStatusUpdates(parsed.statusUpdates || []);
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
    // Validate before saving
    const errors = validateModalConfig({ name, description }, fields, steps);
    if (errors.length > 0) {
      alert('Please fix the following errors:\n\n' + errors.join('\n'));
      return;
    }

    setSaving(true);
    try {
      const user = await base44.auth.me();
      
      const configJson = JSON.stringify({
        title: name,
        description: description,
        fields: fields,
        steps: steps,
        entityOperations: entityOperations,
        webhooks: webhooks,
        emailNotifications: emailNotifications,
        statusUpdates: statusUpdates
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
              <GuideButton onClick={() => setShowGuide(true)} />
              <TemplateImportExport
                config={config}
                onImport={async (importedData) => {
                  const user = await base44.auth.me();
                  importedData.created_by_email = user.email;
                  await base44.entities.ModalConfig.create(importedData);
                  alert('Template imported successfully!');
                  onClose();
                }}
              />
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setShowPreview(true)}
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving || validation.criticalIssues}
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
            {/* Health Panel */}
            <ModalHealthPanel 
              validation={validation} 
              onJumpToSection={(tab) => setActiveTab(tab)}
            />

            {/* Basic Info */}
            <Card id="basic-info-section">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Basic Information
                  {validation?.sections?.basicInfo?.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                </CardTitle>
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
                    className={cn(!name && 'border-red-300')}
                  />
                  {!name && (
                    <p className="text-xs text-red-600 mt-1">Name is required</p>
                  )}
                </div>
                <div>
                  <Label>Description*</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this modal collects..."
                    rows={3}
                    className={cn(!description && 'border-red-300')}
                  />
                  {!description && (
                    <p className="text-xs text-red-600 mt-1">Description is required</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Field Palette */}
            <FieldPalette onAddField={handleAddField} />
          </div>

          {/* Center - Canvas Area with Tabs */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-slate-600" />
                    <CardTitle className="text-base">Form Builder</CardTitle>
                  </div>
                  <div className="text-sm text-slate-600">
                    {fields.length} {fields.length === 1 ? 'field' : 'fields'}
                    {steps.length > 0 && ` • ${steps.length} steps`}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="fields" className="gap-2" id="fields-tab">
                      <Layers className="w-4 h-4" />
                      Fields
                      {validation?.sections?.fields?.isValid ? (
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-600" />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="steps" className="gap-2" id="steps-tab">
                      <ListOrdered className="w-4 h-4" />
                      Steps
                      {steps.length > 0 && (
                        validation?.sections?.steps?.isValid ? (
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                        )
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="operations" className="gap-2" id="operations-tab">
                      <Save className="w-4 h-4" />
                      Operations
                      {validation?.sections?.operations?.isValid ? (
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-600" />
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="fields">
                    <CanvasArea
                      fields={fields}
                      steps={steps}
                      onUpdateField={handleUpdateField}
                      onRemoveField={handleRemoveField}
                      onReorderFields={handleReorderFields}
                    />
                  </TabsContent>

                  <TabsContent value="steps">
                    <StepManager
                      steps={steps}
                      onUpdateSteps={setSteps}
                      fields={fields}
                      onUpdateField={handleUpdateField}
                    />
                  </TabsContent>

                  <TabsContent value="operations">
                    <EntityOperationsEditor
                      modalConfig={{ 
                        entityOperations,
                        webhooks,
                        emailNotifications,
                        statusUpdates
                      }}
                      onUpdate={(updates) => {
                        if (updates.entityOperations !== undefined) {
                          setEntityOperations(updates.entityOperations);
                        }
                        if (updates.webhooks !== undefined) {
                          setWebhooks(updates.webhooks);
                        }
                        if (updates.emailNotifications !== undefined) {
                          setEmailNotifications(updates.emailNotifications);
                        }
                        if (updates.statusUpdates !== undefined) {
                          setStatusUpdates(updates.statusUpdates);
                        }
                      }}
                      allFields={fields}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      <LivePreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        modalConfig={{ name, description }}
        fields={fields}
        steps={steps}
      />

      {/* Onboarding Guide */}
      <ModalBuilderGuide
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
        onStepChange={(step) => {
          // Optionally highlight sections based on tour step
          if (step.target) {
            const element = document.getElementById(step.target);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }}
      />
    </div>
  );
}