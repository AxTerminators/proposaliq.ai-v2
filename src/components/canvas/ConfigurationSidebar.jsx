import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { X, Sparkles, Palette, BookOpen, User, FileText, Building2, Target, Plus, Trash2, Workflow, Link2, Zap, Save, Database, Bell, Settings as SettingsIcon, Download, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ConfigurationSidebar({ node, onClose, onSave }) {
  // Parse node data
  const nodeData = typeof node.data === 'string' ? JSON.parse(node.data) : node.data || {};
  const session = nodeData.session || {};
  
  const [activePanel, setActivePanel] = useState("behavior");
  const [config, setConfig] = useState({
    model: session.config?.model || 'gemini',
    tone: session.config?.tone || ['clear', 'professional'],
    creativity: session.config?.creativity || 50,
    response_length: session.config?.response_length || 'medium',
    persona: session.config?.persona || 'proposal_manager',
    style_guide: session.config?.style_guide || 'federal_proposal',
    section_focus: session.config?.section_focus || 'full_proposal',
    agency_type: session.config?.agency_type || 'generic',
    compliance_matrix_mode: session.config?.compliance_matrix_mode || false,
    evaluation_matching: session.config?.evaluation_matching !== false,
    compliance_alerts: session.config?.compliance_alerts !== false,
    win_themes: session.config?.win_themes || [],
    execution_mode: session.config?.execution_mode || 'sequential',
    auto_trigger: session.config?.auto_trigger || false,
    context_retention: session.config?.context_retention || 70,
    chained_prompt: session.config?.chained_prompt || '',
    output_storage: session.config?.output_storage || 'session_only',
    auto_save: session.config?.auto_save !== false,
    version_control: session.config?.version_control || false,
    export_format: session.config?.export_format || ['docx'],
    retention_days: session.config?.retention_days || 90,
    enable_notifications: session.config?.enable_notifications || false,
    notification_email: session.config?.notification_email || '',
    webhook_url: session.config?.webhook_url || '',
    external_integrations: session.config?.external_integrations || []
  });

  const [documentIds, setDocumentIds] = useState(session.document_ids || []);
  const [newTheme, setNewTheme] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: allDocuments = [] } = useQuery({
    queryKey: ['all-documents'],
    queryFn: () => base44.entities.SolicitationDocument.list('-created_date'),
    initialData: [],
  });

  const toneOptions = [
    'persuasive', 'confident', 'clear', 'concise',
    'technical', 'friendly', 'formal', 'professional'
  ];

  const exportFormatOptions = ['docx', 'pdf', 'markdown', 'txt'];
  const integrationOptions = ['slack', 'teams', 'email', 'api'];

  const toggleTone = (tone) => {
    setConfig(prev => ({
      ...prev,
      tone: prev.tone.includes(tone)
        ? prev.tone.filter(t => t !== tone)
        : [...prev.tone, tone]
    }));
  };

  const toggleDocument = (docId) => {
    setDocumentIds(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const toggleExportFormat = (format) => {
    setConfig(prev => ({
      ...prev,
      export_format: prev.export_format.includes(format)
        ? prev.export_format.filter(f => f !== format)
        : [...prev.export_format, format]
    }));
  };

  const toggleIntegration = (integration) => {
    setConfig(prev => ({
      ...prev,
      external_integrations: prev.external_integrations.includes(integration)
        ? prev.external_integrations.filter(i => i !== integration)
        : [...prev.external_integrations, integration]
    }));
  };

  const addWinTheme = () => {
    if (newTheme.trim()) {
      setConfig(prev => ({
        ...prev,
        win_themes: [...prev.win_themes, newTheme.trim()]
      }));
      setNewTheme("");
    }
  };

  const removeWinTheme = (index) => {
    setConfig(prev => ({
      ...prev,
      win_themes: prev.win_themes.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedData = {
        ...nodeData,
        session: {
          ...session,
          config: config,
          document_ids: documentIds
        }
      };
      
      await onSave(node.id, updatedData);
      onClose();
    } catch (error) {
      console.error("Error saving configuration:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50">
        <div>
          <h2 className="text-lg font-bold text-slate-800">AI Agent Configuration</h2>
          <p className="text-sm text-slate-600">{node.title}</p>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activePanel} onValueChange={setActivePanel} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-5 mx-4 mt-4">
          <TabsTrigger value="behavior" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Behavior
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs">
            <BookOpen className="w-3 h-3 mr-1" />
            Content
          </TabsTrigger>
          <TabsTrigger value="workflow" className="text-xs">
            <Workflow className="w-3 h-3 mr-1" />
            Workflow
          </TabsTrigger>
          <TabsTrigger value="data" className="text-xs">
            <Database className="w-3 h-3 mr-1" />
            Data
          </TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs">
            <Bell className="w-3 h-3 mr-1" />
            Alerts
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Panel 1: Behavior */}
          <TabsContent value="behavior" className="space-y-4 mt-0">
            <div>
              <Label>AI Model</Label>
              <Select value={config.model} onValueChange={(value) => setConfig({...config, model: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Persona</Label>
              <Select value={config.persona} onValueChange={(value) => setConfig({...config, persona: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proposal_manager">Proposal Manager</SelectItem>
                  <SelectItem value="technical_writer">Technical Writer</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="strategist">Strategist</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tone (select multiple)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {toneOptions.map((tone) => (
                  <Badge
                    key={tone}
                    onClick={() => toggleTone(tone)}
                    className={`cursor-pointer ${
                      config.tone.includes(tone)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tone}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Creativity: {config.creativity}%</Label>
              <Slider
                value={[config.creativity]}
                onValueChange={(value) => setConfig({...config, creativity: value[0]})}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>
          </TabsContent>

          {/* Panel 2: Content */}
          <TabsContent value="content" className="space-y-4 mt-0">
            <div>
              <Label>Section Focus</Label>
              <Select value={config.section_focus} onValueChange={(value) => setConfig({...config, section_focus: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_proposal">Full Proposal</SelectItem>
                  <SelectItem value="executive_summary">Executive Summary</SelectItem>
                  <SelectItem value="technical_approach">Technical Approach</SelectItem>
                  <SelectItem value="management_plan">Management Plan</SelectItem>
                  <SelectItem value="past_performance">Past Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Agency Type</Label>
              <Select value={config.agency_type} onValueChange={(value) => setConfig({...config, agency_type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="dod">Department of Defense</SelectItem>
                  <SelectItem value="dhs">Department of Homeland Security</SelectItem>
                  <SelectItem value="nasa">NASA</SelectItem>
                  <SelectItem value="civilian">Civilian Agency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Win Themes</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add win theme..."
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addWinTheme();
                    }
                  }}
                />
                <Button onClick={addWinTheme} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {config.win_themes.map((theme, idx) => (
                  <Badge key={idx} className="bg-purple-100 text-purple-800">
                    {theme}
                    <button
                      onClick={() => removeWinTheme(idx)}
                      className="ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Connected Documents ({documentIds.length})</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 mt-2 space-y-2">
                {allDocuments.map((doc) => (
                  <label key={doc.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={documentIds.includes(doc.id)}
                      onChange={() => toggleDocument(doc.id)}
                      className="rounded"
                    />
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm truncate flex-1">{doc.file_name}</span>
                  </label>
                ))}
                {allDocuments.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No documents available
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Panel 3: Workflow */}
          <TabsContent value="workflow" className="space-y-4 mt-0">
            <div>
              <Label>Execution Mode</Label>
              <Select value={config.execution_mode} onValueChange={(value) => setConfig({...config, execution_mode: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequential</SelectItem>
                  <SelectItem value="parallel">Parallel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto-trigger on connection</Label>
              <input
                type="checkbox"
                checked={config.auto_trigger}
                onChange={(e) => setConfig({...config, auto_trigger: e.target.checked})}
                className="rounded"
              />
            </div>

            <div>
              <Label>Context Retention: {config.context_retention}%</Label>
              <Slider
                value={[config.context_retention]}
                onValueChange={(value) => setConfig({...config, context_retention: value[0]})}
                max={100}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Chained Prompt Template</Label>
              <Textarea
                placeholder="Enter prompt template for chained execution..."
                value={config.chained_prompt}
                onChange={(e) => setConfig({...config, chained_prompt: e.target.value})}
                rows={4}
              />
            </div>
          </TabsContent>

          {/* Panel 4: Data */}
          <TabsContent value="data" className="space-y-4 mt-0">
            <div>
              <Label>Output Storage</Label>
              <Select value={config.output_storage} onValueChange={(value) => setConfig({...config, output_storage: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="session_only">Session Only</SelectItem>
                  <SelectItem value="create_section">Create Proposal Section</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="file_export">File Export</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Auto-save outputs</Label>
              <input
                type="checkbox"
                checked={config.auto_save}
                onChange={(e) => setConfig({...config, auto_save: e.target.checked})}
                className="rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Version control</Label>
              <input
                type="checkbox"
                checked={config.version_control}
                onChange={(e) => setConfig({...config, version_control: e.target.checked})}
                className="rounded"
              />
            </div>

            <div>
              <Label>Export Formats</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {exportFormatOptions.map((format) => (
                  <Badge
                    key={format}
                    onClick={() => toggleExportFormat(format)}
                    className={`cursor-pointer ${
                      config.export_format.includes(format)
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {format.toUpperCase()}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Data Retention (days)</Label>
              <Input
                type="number"
                value={config.retention_days}
                onChange={(e) => setConfig({...config, retention_days: parseInt(e.target.value) || 90})}
                min={1}
                max={365}
              />
            </div>
          </TabsContent>

          {/* Panel 5: Integrations */}
          <TabsContent value="integrations" className="space-y-4 mt-0">
            <div className="flex items-center justify-between">
              <Label>Enable Notifications</Label>
              <input
                type="checkbox"
                checked={config.enable_notifications}
                onChange={(e) => setConfig({...config, enable_notifications: e.target.checked})}
                className="rounded"
              />
            </div>

            {config.enable_notifications && (
              <>
                <div>
                  <Label>Notification Email</Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={config.notification_email}
                    onChange={(e) => setConfig({...config, notification_email: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Webhook URL (optional)</Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={config.webhook_url}
                    onChange={(e) => setConfig({...config, webhook_url: e.target.value})}
                  />
                </div>
              </>
            )}

            <div>
              <Label>External Integrations</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {integrationOptions.map((integration) => (
                  <Badge
                    key={integration}
                    onClick={() => toggleIntegration(integration)}
                    className={`cursor-pointer ${
                      config.external_integrations.includes(integration)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {integration}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="p-4 border-t bg-slate-50 flex gap-2">
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white"
        >
          {isSaving ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
}