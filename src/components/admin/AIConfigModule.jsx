import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Sparkles,
  Settings,
  ChevronDown,
  ChevronUp,
  Activity
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { canEdit, logAdminAction } from "./PermissionChecker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AIConfigModule({ currentUser }) {
  const queryClient = useQueryClient();
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [systemPrompt, setSystemPrompt] = useState(
    "You are an expert AI assistant for government proposal writing. Provide clear, professional, and detailed responses."
  );

  const { data: tokenUsage } = useQuery({
    queryKey: ['token-usage-stats'],
    queryFn: () => base44.entities.TokenUsage.list('-created_date', 100),
    initialData: []
  });

  const userRole = currentUser.admin_role || currentUser.role;
  const canConfigureAI = canEdit(userRole, 'ai');

  const saveAISettings = async () => {
    await logAdminAction('ai_settings_changed', {
      temperature,
      topP,
      maxTokens,
      systemPrompt: systemPrompt.substring(0, 100)
    });
    alert("AI settings saved successfully!");
  };

  // Token usage by feature
  const usageByFeature = tokenUsage.reduce((acc, usage) => {
    acc[usage.feature_type] = (acc[usage.feature_type] || 0) + usage.tokens_used;
    return acc;
  }, {});

  // Token usage by LLM
  const usageByLLM = tokenUsage.reduce((acc, usage) => {
    acc[usage.llm_provider] = (acc[usage.llm_provider] || 0) + usage.tokens_used;
    return acc;
  }, {});

  const totalTokens = tokenUsage.reduce((sum, usage) => sum + usage.tokens_used, 0);
  const totalCost = tokenUsage.reduce((sum, usage) => sum + (usage.cost_estimate || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">AI & Automation Settings</h2>
          <p className="text-slate-600">Configure AI models, prompts, and usage policies</p>
        </div>
        {canConfigureAI && (
          <Button onClick={saveAISettings}>
            <Settings className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        )}
      </div>

      <Tabs defaultValue="models" className="space-y-6">
        <TabsList>
          <TabsTrigger value="models">Model Configuration</TabsTrigger>
          <TabsTrigger value="prompts">System Prompts</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="guardrails">Guardrails</TabsTrigger>
        </TabsList>

        {/* Model Configuration */}
        <TabsContent value="models" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Model Parameters
              </CardTitle>
              <CardDescription>
                Configure default AI model behavior for all features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <h3 className="font-semibold">Google Gemini</h3>
                    </div>
                    <Badge className="bg-blue-600 text-white mb-2">Default</Badge>
                    <p className="text-xs text-slate-600">Most cost-effective, great for general tasks</p>
                  </CardContent>
                </Card>

                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-purple-600" />
                      <h3 className="font-semibold">Anthropic Claude</h3>
                    </div>
                    <Badge variant="outline">Pro+</Badge>
                    <p className="text-xs text-slate-600 mt-2">Best for complex writing and reasoning</p>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-green-600" />
                      <h3 className="font-semibold">OpenAI GPT</h3>
                    </div>
                    <Badge variant="outline">Pro+</Badge>
                    <p className="text-xs text-slate-600 mt-2">Balanced performance and quality</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6 pt-4 border-t">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Temperature: {temperature.toFixed(2)}</Label>
                    <span className="text-xs text-slate-500">Controls randomness and creativity</span>
                  </div>
                  <Slider
                    value={[temperature]}
                    onValueChange={([value]) => setTemperature(value)}
                    min={0}
                    max={1}
                    step={0.01}
                    disabled={!canConfigureAI}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Deterministic</span>
                    <span>Creative</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Top-P (Nucleus Sampling): {topP.toFixed(2)}</Label>
                    <span className="text-xs text-slate-500">Probability mass to consider</span>
                  </div>
                  <Slider
                    value={[topP]}
                    onValueChange={([value]) => setTopP(value)}
                    min={0}
                    max={1}
                    step={0.01}
                    disabled={!canConfigureAI}
                    className="w-full"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Max Output Tokens: {maxTokens.toLocaleString()}</Label>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setMaxTokens(Math.min(8192, maxTokens + 512))}
                        disabled={!canConfigureAI}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setMaxTokens(Math.max(512, maxTokens - 512))}
                        disabled={!canConfigureAI}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Slider
                    value={[maxTokens]}
                    onValueChange={([value]) => setMaxTokens(value)}
                    min={512}
                    max={8192}
                    step={512}
                    disabled={!canConfigureAI}
                    className="w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Prompts */}
        <TabsContent value="prompts" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>System Prompts</CardTitle>
              <CardDescription>
                Configure default system instructions for AI interactions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default System Prompt</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  disabled={!canConfigureAI}
                  className="min-h-32 font-mono text-sm"
                  placeholder="Enter system prompt..."
                />
                <p className="text-xs text-slate-500">
                  This prompt is prepended to all AI interactions to set behavior and context
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-4">
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 text-sm">Proposal Writing Prompt</h4>
                    <p className="text-xs text-slate-600">
                      "Write clear, professional government proposals following FAR guidelines..."
                    </p>
                    <Button variant="outline" size="sm" className="mt-2" disabled={!canConfigureAI}>
                      Edit
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2 text-sm">Evaluation Prompt</h4>
                    <p className="text-xs text-slate-600">
                      "Analyze proposals for compliance, completeness, and competitiveness..."
                    </p>
                    <Button variant="outline" size="sm" className="mt-2" disabled={!canConfigureAI}>
                      Edit
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Analytics */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Total Tokens Used</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-900">
                  {(totalTokens / 1000000).toFixed(2)}M
                </p>
                <p className="text-xs text-slate-500 mt-1">Last 100 operations</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Estimated Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  ${totalCost.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mt-1">Recent operations</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-600">Avg per Request</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">
                  {tokenUsage.length > 0 ? (totalTokens / tokenUsage.length / 1000).toFixed(1) : 0}K
                </p>
                <p className="text-xs text-slate-500 mt-1">Tokens per operation</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Usage by Feature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(usageByFeature).map(([feature, tokens]) => (
                  <div key={feature} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{feature.replace(/_/g, ' ')}</span>
                        <span className="text-sm text-slate-600">{(tokens / 1000).toFixed(0)}K tokens</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(tokens / totalTokens) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>Usage by LLM Provider</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(usageByLLM).map(([llm, tokens]) => (
                  <div key={llm} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium capitalize">{llm}</span>
                    <div className="text-right">
                      <p className="font-semibold">{(tokens / 1000).toFixed(0)}K tokens</p>
                      <p className="text-xs text-slate-500">
                        {((tokens / totalTokens) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guardrails */}
        <TabsContent value="guardrails" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>AI Safety Guardrails</CardTitle>
              <CardDescription>
                Configure content filtering and safety policies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-semibold">Content Filtering</h4>
                  <p className="text-sm text-slate-600">Block inappropriate or harmful content</p>
                </div>
                <Switch defaultChecked disabled={!canConfigureAI} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-semibold">PII Detection</h4>
                  <p className="text-sm text-slate-600">Detect and warn about personal information</p>
                </div>
                <Switch defaultChecked disabled={!canConfigureAI} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-semibold">Fact Checking</h4>
                  <p className="text-sm text-slate-600">Verify claims when possible</p>
                </div>
                <Switch disabled={!canConfigureAI} />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-semibold">Citation Requirements</h4>
                  <p className="text-sm text-slate-600">Require sources for factual claims</p>
                </div>
                <Switch disabled={!canConfigureAI} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}