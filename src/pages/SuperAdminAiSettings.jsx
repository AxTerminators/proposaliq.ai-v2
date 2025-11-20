import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Plus, Edit, Trash2, Save, X, Settings, Shield, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SuperAdminAiSettings() {
  const queryClient = useQueryClient();
  const [editingConfig, setEditingConfig] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Fetch all AI configurations
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['aiConfigurations'],
    queryFn: () => base44.entities.AiConfiguration.list('-created_date'),
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (configData) => {
      if (configData.id) {
        return base44.entities.AiConfiguration.update(configData.id, configData);
      } else {
        return base44.entities.AiConfiguration.create(configData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiConfigurations'] });
      setIsDialogOpen(false);
      setEditingConfig(null);
      setValidationErrors({});
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AiConfiguration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aiConfigurations'] });
    },
  });

  // Validation function
  const validateConfig = (config) => {
    const errors = {};
    
    if (!config.config_name?.trim()) {
      errors.config_name = "Configuration name is required";
    }
    
    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
      errors.temperature = "Temperature must be between 0 and 2";
    }
    
    if (config.max_tokens && config.max_tokens < 100) {
      errors.max_tokens = "Max tokens must be at least 100";
    }
    
    if (config.default_word_count_min && config.default_word_count_max) {
      if (config.default_word_count_min > config.default_word_count_max) {
        errors.default_word_count_min = "Min word count cannot exceed max";
      }
    }
    
    if (!config.core_prompt_template?.trim()) {
      errors.core_prompt_template = "Core prompt template is required";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (validateConfig(editingConfig)) {
      saveMutation.mutate(editingConfig);
    }
  };

  // Handle new config
  const handleNew = () => {
    setEditingConfig({
      config_name: "",
      is_global_default: false,
      llm_provider: "gemini",
      temperature: 0.7,
      max_tokens: 4000,
      default_tone: "professional",
      reading_level: "government_official",
      default_word_count_min: 200,
      default_word_count_max: 1000,
      citation_style: "inline",
      core_prompt_template: "You are an expert government proposal writer. Generate a {section_type} section with a {tone} tone, targeting {reading_level} readers. Word count: {word_count_min}-{word_count_max} words.",
      system_instructions: "You are an expert government proposal writer with deep knowledge of federal acquisition regulations and proposal best practices.",
      guardrails: {
        forbidden_phrases: [],
        required_disclaimers: [],
        formatting_rules: [],
        safety_filters: ["No profanity", "No discriminatory language"]
      },
      context_priority_weights: {
        solicitation_weight: 1.0,
        reference_proposals_weight: 0.8,
        content_library_weight: 0.6,
        general_rag_weight: 0.4
      },
      use_rag: true,
      use_content_library: true,
      use_solicitation_parsing: true,
      enable_confidence_scoring: true,
      enable_compliance_check: true,
      enable_multi_version_generation: false,
      is_active: true
    });
    setIsDialogOpen(true);
    setValidationErrors({});
  };

  // Handle edit
  const handleEdit = (config) => {
    // Ensure guardrails object exists
    const configToEdit = {
      ...config,
      guardrails: config.guardrails || {
        forbidden_phrases: [],
        required_disclaimers: [],
        formatting_rules: [],
        safety_filters: []
      },
      context_priority_weights: config.context_priority_weights || {
        solicitation_weight: 1.0,
        reference_proposals_weight: 0.8,
        content_library_weight: 0.6,
        general_rag_weight: 0.4
      }
    };
    setEditingConfig(configToEdit);
    setIsDialogOpen(true);
    setValidationErrors({});
  };

  // Handle delete
  const handleDelete = (id, configName) => {
    if (window.confirm(`Are you sure you want to delete "${configName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  // Update editing config
  const updateConfig = (field, value) => {
    setEditingConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update nested guardrails
  const updateGuardrails = (field, value) => {
    setEditingConfig(prev => ({
      ...prev,
      guardrails: {
        ...(prev.guardrails || {}),
        [field]: value
      }
    }));
  };

  // Update context weights
  const updateContextWeight = (field, value) => {
    setEditingConfig(prev => ({
      ...prev,
      context_priority_weights: {
        ...(prev.context_priority_weights || {}),
        [field]: parseFloat(value) || 0
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-500">Loading AI configurations...</div>
      </div>
    );
  }

  const globalDefault = configs.find(c => c.is_global_default);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">AI Configuration Management</h1>
                <p className="text-slate-600">Super-Admin: Manage global AI settings and defaults</p>
              </div>
            </div>
          </div>
          <Button onClick={handleNew} className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <Plus className="w-4 h-4 mr-2" />
            New Configuration
          </Button>
        </div>

        {/* Global Default Alert */}
        {globalDefault && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Global Default:</strong> "{globalDefault.config_name}" is set as the system-wide default configuration.
              Organizations without specific overrides will use these settings.
            </AlertDescription>
          </Alert>
        )}

        {!globalDefault && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-900">
              <strong>No Global Default:</strong> Please create and mark one configuration as the global default for the system.
            </AlertDescription>
          </Alert>
        )}

        {/* Configurations List */}
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id} className={cn(
              "border-2 transition-all",
              config.is_global_default ? "border-blue-300 bg-blue-50/50" : "border-slate-200"
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{config.config_name}</CardTitle>
                      {config.is_global_default && (
                        <Badge className="bg-blue-600">Global Default</Badge>
                      )}
                      {!config.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                      {config.organization_id && (
                        <Badge variant="outline">Org-Specific</Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span>Provider: <strong>{config.llm_provider}</strong></span>
                      <span>Tone: <strong>{config.default_tone}</strong></span>
                      <span>Reading Level: <strong>{config.reading_level}</strong></span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(config)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(config.id, config.config_name)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Temperature:</span>
                    <div className="font-semibold">{config.temperature}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Max Tokens:</span>
                    <div className="font-semibold">{config.max_tokens}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Word Count Range:</span>
                    <div className="font-semibold">{config.default_word_count_min}-{config.default_word_count_max}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Citation Style:</span>
                    <div className="font-semibold capitalize">{config.citation_style}</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  {config.use_rag && <Badge variant="outline">RAG Enabled</Badge>}
                  {config.use_content_library && <Badge variant="outline">Content Library</Badge>}
                  {config.enable_confidence_scoring && <Badge variant="outline">Confidence Scoring</Badge>}
                  {config.enable_compliance_check && <Badge variant="outline">Compliance Check</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}

          {configs.length === 0 && (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 text-center">
                  No AI configurations yet. Create your first configuration to get started.
                </p>
                <Button onClick={handleNew} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Configuration
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Edit/Create Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig?.id ? 'Edit AI Configuration' : 'New AI Configuration'}
              </DialogTitle>
              <DialogDescription>
                Configure AI settings for proposal content generation
              </DialogDescription>
            </DialogHeader>

            {editingConfig ? (
              <Tabs defaultValue="basic" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Model Configuration</TabsTrigger>
                  <TabsTrigger value="prompts">System Prompts</TabsTrigger>
                  <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>

                {/* Basic Settings Tab */}
                <TabsContent value="basic" className="space-y-4 mt-4" forceMount={false}>
                  <div>
                    <Label htmlFor="config_name">Configuration Name *</Label>
                    <Input
                      id="config_name"
                      value={editingConfig.config_name}
                      onChange={(e) => updateConfig('config_name', e.target.value)}
                      placeholder="e.g., Default AI Settings"
                      className={validationErrors.config_name ? 'border-red-500' : ''}
                    />
                    {validationErrors.config_name && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.config_name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingConfig.is_global_default}
                        onChange={(e) => updateConfig('is_global_default', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Set as Global Default</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingConfig.is_active}
                        onChange={(e) => updateConfig('is_active', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">Active</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="llm_provider">LLM Provider</Label>
                      <Select
                        value={editingConfig?.llm_provider || 'gemini'}
                        onValueChange={(value) => {
                          console.log('Provider changed:', value);
                          updateConfig('llm_provider', value);
                        }}
                      >
                        <SelectTrigger id="llm_provider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini">Google Gemini</SelectItem>
                          <SelectItem value="claude">Anthropic Claude</SelectItem>
                          <SelectItem value="chatgpt">OpenAI GPT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="model_name">Model Name (Optional)</Label>
                      <Input
                        id="model_name"
                        value={editingConfig.model_name || ''}
                        onChange={(e) => updateConfig('model_name', e.target.value)}
                        placeholder="e.g., gpt-4, claude-3-opus"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="temperature">
                        Temperature: {editingConfig?.temperature?.toFixed(2) || '0.70'}
                      </Label>
                      <Slider
                        id="temperature"
                        value={[editingConfig?.temperature || 0.7]}
                        onValueChange={(values) => {
                          console.log('Temperature changed:', values[0]);
                          updateConfig('temperature', values[0]);
                        }}
                        min={0}
                        max={2}
                        step={0.01}
                        className="w-full"
                      />
                      <p className="text-xs text-slate-500">
                        Drag to adjust: 0 = deterministic, 2 = creative
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="max_tokens">Max Tokens</Label>
                      <Input
                        id="max_tokens"
                        type="number"
                        value={editingConfig.max_tokens}
                        onChange={(e) => updateConfig('max_tokens', parseInt(e.target.value))}
                        className={validationErrors.max_tokens ? 'border-red-500' : ''}
                      />
                      {validationErrors.max_tokens && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.max_tokens}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="default_tone">Default Tone</Label>
                      <Select
                        value={editingConfig.default_tone}
                        onValueChange={(value) => updateConfig('default_tone', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="persuasive">Persuasive</SelectItem>
                          <SelectItem value="conversational">Conversational</SelectItem>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="reading_level">Reading Level</Label>
                      <Select
                        value={editingConfig.reading_level}
                        onValueChange={(value) => updateConfig('reading_level', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general_public">General Public</SelectItem>
                          <SelectItem value="technical_expert">Technical Expert</SelectItem>
                          <SelectItem value="executive">Executive</SelectItem>
                          <SelectItem value="academic">Academic</SelectItem>
                          <SelectItem value="government_official">Government Official</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editingConfig.default_tone === 'custom' && (
                    <div>
                      <Label htmlFor="custom_tone_description">Custom Tone Description</Label>
                      <Textarea
                        id="custom_tone_description"
                        value={editingConfig.custom_tone_description || ''}
                        onChange={(e) => updateConfig('custom_tone_description', e.target.value)}
                        placeholder="Describe the desired tone..."
                        rows={3}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="default_word_count_min">Min Word Count</Label>
                      <Input
                        id="default_word_count_min"
                        type="number"
                        value={editingConfig.default_word_count_min}
                        onChange={(e) => updateConfig('default_word_count_min', parseInt(e.target.value))}
                        className={validationErrors.default_word_count_min ? 'border-red-500' : ''}
                      />
                      {validationErrors.default_word_count_min && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.default_word_count_min}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="default_word_count_max">Max Word Count</Label>
                      <Input
                        id="default_word_count_max"
                        type="number"
                        value={editingConfig.default_word_count_max}
                        onChange={(e) => updateConfig('default_word_count_max', parseInt(e.target.value))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="citation_style">Citation Style</Label>
                      <Select
                        value={editingConfig.citation_style}
                        onValueChange={(value) => updateConfig('citation_style', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inline">Inline</SelectItem>
                          <SelectItem value="footnotes">Footnotes</SelectItem>
                          <SelectItem value="endnotes">Endnotes</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* Prompts Tab */}
                <TabsContent value="prompts" className="space-y-4 mt-4" forceMount={false}>
                  <div className="space-y-2">
                    <Label htmlFor="system_instructions">System Instructions</Label>
                    <Textarea
                      id="system_instructions"
                      value={editingConfig?.system_instructions || ''}
                      onChange={(e) => {
                        console.log('System instructions changed');
                        updateConfig('system_instructions', e.target.value);
                      }}
                      placeholder="High-level instructions for the AI (e.g., 'You are an expert government proposal writer')"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="core_prompt_template">Core Prompt Template *</Label>
                    <Textarea
                      id="core_prompt_template"
                      value={editingConfig?.core_prompt_template || ''}
                      onChange={(e) => {
                        console.log('Prompt template changed');
                        updateConfig('core_prompt_template', e.target.value);
                      }}
                      placeholder="Use placeholders: {section_type}, {tone}, {reading_level}, {word_count_min}, {word_count_max}"
                      rows={6}
                      className={validationErrors.core_prompt_template ? 'border-red-500' : ''}
                    />
                    {validationErrors.core_prompt_template && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.core_prompt_template}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Available placeholders: {'{section_type}'}, {'{tone}'}, {'{reading_level}'}, {'{word_count_min}'}, {'{word_count_max}'}
                    </p>
                  </div>
                </TabsContent>

                {/* Guardrails Tab */}
                <TabsContent value="guardrails" className="space-y-4 mt-4" forceMount={false}>
                  <div className="space-y-2">
                    <Label htmlFor="forbidden_phrases">Forbidden Phrases</Label>
                    <Textarea
                      id="forbidden_phrases"
                      value={editingConfig?.guardrails?.forbidden_phrases?.join('\n') || ''}
                      onChange={(e) => {
                        console.log('Forbidden phrases changed');
                        updateGuardrails('forbidden_phrases', e.target.value.split('\n').filter(p => p.trim()));
                      }}
                      placeholder="One phrase per line"
                      rows={4}
                    />
                    <p className="text-xs text-slate-500 mt-1">Phrases that should never appear in generated content</p>
                  </div>

                  <div>
                    <Label htmlFor="required_disclaimers">Required Disclaimers</Label>
                    <Textarea
                      id="required_disclaimers"
                      value={editingConfig.guardrails?.required_disclaimers?.join('\n') || ''}
                      onChange={(e) => updateGuardrails('required_disclaimers', e.target.value.split('\n').filter(d => d.trim()))}
                      placeholder="One disclaimer per line"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="formatting_rules">Formatting Rules</Label>
                    <Textarea
                      id="formatting_rules"
                      value={editingConfig.guardrails?.formatting_rules?.join('\n') || ''}
                      onChange={(e) => updateGuardrails('formatting_rules', e.target.value.split('\n').filter(r => r.trim()))}
                      placeholder="One rule per line (e.g., 'Always use numbered lists for benefits')"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="safety_filters">Safety Filters</Label>
                    <Textarea
                      id="safety_filters"
                      value={editingConfig.guardrails?.safety_filters?.join('\n') || ''}
                      onChange={(e) => updateGuardrails('safety_filters', e.target.value.split('\n').filter(f => f.trim()))}
                      placeholder="One filter per line"
                      rows={3}
                    />
                  </div>
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="space-y-4 mt-4" forceMount={false}>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Context Sources</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingConfig?.use_rag || false}
                        onChange={(e) => {
                          console.log('Use RAG changed:', e.target.checked);
                          updateConfig('use_rag', e.target.checked);
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-sm">Use RAG (Reference Proposals)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingConfig.use_content_library}
                        onChange={(e) => updateConfig('use_content_library', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Use Content Library</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingConfig.use_solicitation_parsing}
                        onChange={(e) => updateConfig('use_solicitation_parsing', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Parse Solicitation Documents</span>
                    </label>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm mb-3">Context Priority Weights</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="solicitation_weight">Solicitation Weight</Label>
                        <Input
                          id="solicitation_weight"
                          type="number"
                          step="0.1"
                          value={editingConfig.context_priority_weights?.solicitation_weight || 1.0}
                          onChange={(e) => updateContextWeight('solicitation_weight', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="reference_proposals_weight">Reference Proposals Weight</Label>
                        <Input
                          id="reference_proposals_weight"
                          type="number"
                          step="0.1"
                          value={editingConfig.context_priority_weights?.reference_proposals_weight || 0.8}
                          onChange={(e) => updateContextWeight('reference_proposals_weight', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="content_library_weight">Content Library Weight</Label>
                        <Input
                          id="content_library_weight"
                          type="number"
                          step="0.1"
                          value={editingConfig.context_priority_weights?.content_library_weight || 0.6}
                          onChange={(e) => updateContextWeight('content_library_weight', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="general_rag_weight">General RAG Weight</Label>
                        <Input
                          id="general_rag_weight"
                          type="number"
                          step="0.1"
                          value={editingConfig.context_priority_weights?.general_rag_weight || 0.4}
                          onChange={(e) => updateContextWeight('general_rag_weight', e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Higher weights = higher priority in context selection</p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Feature Flags</h3>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingConfig.enable_confidence_scoring}
                        onChange={(e) => updateConfig('enable_confidence_scoring', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Enable Confidence Scoring</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingConfig.enable_compliance_check}
                        onChange={(e) => updateConfig('enable_compliance_check', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Enable Compliance Check</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingConfig.enable_multi_version_generation}
                        onChange={(e) => updateConfig('enable_multi_version_generation', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Enable Multi-Version Generation</span>
                    </label>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="py-8 text-center text-slate-500">
                Loading configuration...
              </div>
            )}

            {/* Dialog Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingConfig(null);
                  setValidationErrors({});
                }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}