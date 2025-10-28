import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Sparkles, 
  Plus, 
  FileText, 
  Edit,
  Trash2,
  Download,
  Save,
  Wand2,
  CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const SECTION_TYPES = [
  { value: "executive_summary", label: "Executive Summary" },
  { value: "technical_approach", label: "Technical Approach" },
  { value: "management_plan", label: "Management Plan" },
  { value: "past_performance", label: "Past Performance" },
  { value: "key_personnel", label: "Key Personnel" },
  { value: "corporate_experience", label: "Corporate Experience" },
  { value: "quality_assurance", label: "Quality Assurance" },
  { value: "transition_plan", label: "Transition Plan" },
  { value: "pricing", label: "Pricing" },
  { value: "custom", label: "Custom Section" }
];

export default function Phase5({ proposalData, proposalId }) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNewSection, setShowNewSection] = useState(false);
  const [newSectionData, setNewSectionData] = useState({
    section_name: "",
    section_type: "executive_summary",
    content: ""
  });

  const { data: sections, isLoading } = useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: () => proposalId ? base44.entities.ProposalSection.filter({ proposal_id: proposalId }, 'order') : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: solicitationDocs } = useQuery({
    queryKey: ['solicitation-docs', proposalId],
    queryFn: () => proposalId ? base44.entities.SolicitationDocument.filter({ proposal_id: proposalId }) : [],
    initialData: [],
    enabled: !!proposalId
  });

  const { data: organization } = useQuery({
    queryKey: ['organization', proposalData.prime_contractor_id],
    queryFn: async () => {
      if (!proposalData.prime_contractor_id) return null;
      const orgs = await base44.entities.Organization.filter({ id: proposalData.prime_contractor_id });
      return orgs[0] || null;
    },
    enabled: !!proposalData.prime_contractor_id
  });

  const createMutation = useMutation({
    mutationFn: (sectionData) => base44.entities.ProposalSection.create({
      ...sectionData,
      proposal_id: proposalId,
      order: sections.length,
      word_count: sectionData.content.split(/\s+/).length
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections', proposalId] });
      setShowNewSection(false);
      setNewSectionData({
        section_name: "",
        section_type: "executive_summary",
        content: ""
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProposalSection.update(id, {
      ...data,
      word_count: data.content.split(/\s+/).length
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections', proposalId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProposalSection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections', proposalId] });
      setActiveSection(null);
    },
  });

  const trackTokenUsage = async (tokensUsed, prompt, response, llm) => {
    try {
      const user = await base44.auth.me();
      const orgs = await base44.entities.Organization.filter({ created_by: user.email }, '-created_date', 1);
      
      if (orgs.length > 0) {
        await base44.entities.TokenUsage.create({
          organization_id: orgs[0].id,
          user_email: user.email,
          feature_type: "proposal_generation",
          tokens_used: tokensUsed,
          llm_provider: llm,
          prompt: prompt.substring(0, 500),
          response_preview: response?.substring(0, 200),
          cost_estimate: (tokensUsed / 1000000) * 0.5
        });

        const subs = await base44.entities.Subscription.filter({ organization_id: orgs[0].id }, '-created_date', 1);
        if (subs.length > 0) {
          await base44.entities.Subscription.update(subs[0].id, {
            token_credits_used: (subs[0].token_credits_used || 0) + tokensUsed
          });
        }
      }
    } catch (error) {
      console.error("Error tracking token usage:", error);
    }
  };

  const generateSection = async (sectionType, customPrompt = "") => {
    setIsGenerating(true);
    try {
      const sectionLabel = SECTION_TYPES.find(t => t.value === sectionType)?.label || sectionType;
      
      let contextPrompt = `You are an expert proposal writer. Generate a professional ${sectionLabel} section for a government proposal.

Proposal Details:
- Project: ${proposalData.project_title || 'Not specified'}
- Agency: ${proposalData.agency_name || 'Not specified'}
- Type: ${proposalData.project_type}
- Organization: ${proposalData.prime_contractor_name || organization?.organization_name || 'Not specified'}`;

      if (organization) {
        contextPrompt += `\n- Certifications: ${organization.certifications?.join(', ') || 'None'}`;
        contextPrompt += `\n- NAICS: ${organization.primary_naics || 'Not specified'}`;
      }

      if (customPrompt) {
        contextPrompt += `\n\nAdditional Instructions: ${customPrompt}`;
      }

      contextPrompt += `\n\nWrite a compelling, detailed ${sectionLabel} that addresses the requirements and demonstrates capability. Use professional language suitable for federal proposals. Format with clear headings and paragraphs. Aim for 500-800 words.`;

      const allDocs = solicitationDocs.filter(doc => doc.file_url && !doc.file_url.startsWith('proposal:'));
      const fileUrls = allDocs.map(doc => doc.file_url);

      const subs = await base44.entities.Subscription.list('-created_date', 1);
      const preferredLLM = subs.length > 0 ? subs[0].preferred_llm : 'gemini';

      const content = await base44.integrations.Core.InvokeLLM({
        prompt: contextPrompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined
      });

      await trackTokenUsage(8000, contextPrompt, content, preferredLLM);

      return content;
    } catch (error) {
      console.error("Error generating section:", error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAndSave = async (sectionType, customPrompt) => {
    const content = await generateSection(sectionType, customPrompt);
    const sectionLabel = SECTION_TYPES.find(t => t.value === sectionType)?.label || sectionType;
    
    await createMutation.mutateAsync({
      section_name: sectionLabel,
      section_type: sectionType,
      content: content,
      status: "ai_generated",
      ai_prompt_used: customPrompt
    });
  };

  const handleUpdateContent = (sectionId, content) => {
    updateMutation.mutate({
      id: sectionId,
      data: { content, status: "reviewed" }
    });
  };

  const exportToWord = () => {
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);
    let docContent = `${proposalData.proposal_name}\n\n`;
    docContent += `Solicitation: ${proposalData.solicitation_number}\n`;
    docContent += `Agency: ${proposalData.agency_name}\n\n`;
    docContent += "=" .repeat(50) + "\n\n";

    sortedSections.forEach(section => {
      docContent += `\n${section.section_name.toUpperCase()}\n`;
      docContent += "-".repeat(section.section_name.length) + "\n\n";
      docContent += section.content.replace(/<[^>]*>/g, '') + "\n\n";
    });

    const blob = new Blob([docContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proposalData.proposal_name || 'proposal'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!proposalId) {
    return (
      <Card className="border-none shadow-xl">
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600">Please save your proposal in previous phases first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader className="border-b">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-600" />
                Phase 5: AI Proposal Writer
              </CardTitle>
              <CardDescription>Generate and edit proposal sections with AI assistance using your reference documents</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={exportToWord}
                disabled={sections.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button
                onClick={() => setShowNewSection(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Section
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="sections" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sections">Proposal Sections ({sections.length})</TabsTrigger>
              <TabsTrigger value="generator">AI Generator</TabsTrigger>
            </TabsList>

            <TabsContent value="sections" className="space-y-4">
              {sections.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                  <p className="mb-4">No sections created yet</p>
                  <Button onClick={() => setShowNewSection(true)}>
                    Create First Section
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.map((section) => (
                    <Card key={section.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{section.section_name}</CardTitle>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">{section.section_type.replace(/_/g, ' ')}</Badge>
                              <Badge variant={
                                section.status === 'approved' ? 'default' :
                                section.status === 'reviewed' ? 'secondary' :
                                'outline'
                              }>
                                {section.status}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {section.word_count || 0} words
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setActiveSection(section)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(section.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="prose prose-sm max-w-none text-slate-700 line-clamp-3"
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="generator" className="space-y-4">
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <Sparkles className="w-5 h-5" />
                    Quick Section Generator
                  </CardTitle>
                  <CardDescription>Generate common proposal sections with one click - AI will reference your uploaded documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {SECTION_TYPES.filter(t => t.value !== 'custom').map((type) => (
                      <Button
                        key={type.value}
                        variant="outline"
                        className="justify-start h-auto p-4"
                        onClick={() => handleGenerateAndSave(type.value, "")}
                        disabled={isGenerating}
                      >
                        <div className="flex items-center gap-3 w-full">
                          {isGenerating ? (
                            <Sparkles className="w-5 h-5 animate-spin" />
                          ) : (
                            <FileText className="w-5 h-5 text-indigo-600" />
                          )}
                          <span className="flex-1 text-left">{type.label}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200">
                <CardHeader>
                  <CardTitle>Custom Section Generator</CardTitle>
                  <CardDescription>Create a custom section with specific instructions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Section Type</Label>
                    <Select
                      value={newSectionData.section_type}
                      onValueChange={(value) => setNewSectionData({...newSectionData, section_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Section Name</Label>
                    <Input
                      value={newSectionData.section_name}
                      onChange={(e) => setNewSectionData({...newSectionData, section_name: e.target.value})}
                      placeholder="Enter section name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Custom Instructions (Optional)</Label>
                    <Textarea
                      value={newSectionData.ai_prompt_used || ""}
                      onChange={(e) => setNewSectionData({...newSectionData, ai_prompt_used: e.target.value})}
                      placeholder="Provide specific instructions for the AI..."
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={() => handleGenerateAndSave(newSectionData.section_type, newSectionData.ai_prompt_used)}
                    disabled={isGenerating || !newSectionData.section_name}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate Section
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {activeSection && (
        <Card className="border-none shadow-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Edit: {activeSection.section_name}</CardTitle>
                <CardDescription className="mt-1">
                  Make changes and save when ready
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                onClick={() => setActiveSection(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="bg-white rounded-lg border">
                <ReactQuill
                  theme="snow"
                  value={activeSection.content}
                  onChange={(content) => setActiveSection({...activeSection, content})}
                  style={{ minHeight: '400px' }}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                      ['link'],
                      ['clean']
                    ]
                  }}
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-slate-600">
                  Word count: {activeSection.content.replace(/<[^>]*>/g, '').split(/\s+/).length}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const content = await generateSection(activeSection.section_type, "Regenerate this section with improvements");
                      setActiveSection({...activeSection, content});
                    }}
                    disabled={isGenerating}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button
                    onClick={() => {
                      handleUpdateContent(activeSection.id, activeSection.content);
                      setActiveSection(null);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showNewSection && (
        <Card className="border-none shadow-2xl">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Create New Section</CardTitle>
                <CardDescription className="mt-1">
                  Write your own content or generate with AI
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                onClick={() => setShowNewSection(false)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Section Name *</Label>
                <Input
                  value={newSectionData.section_name}
                  onChange={(e) => setNewSectionData({...newSectionData, section_name: e.target.value})}
                  placeholder="e.g., Executive Summary"
                />
              </div>
              <div className="space-y-2">
                <Label>Section Type</Label>
                <Select
                  value={newSectionData.section_type}
                  onValueChange={(value) => setNewSectionData({...newSectionData, section_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <div className="bg-white rounded-lg border">
                <ReactQuill
                  theme="snow"
                  value={newSectionData.content}
                  onChange={(content) => setNewSectionData({...newSectionData, content})}
                  placeholder="Write your content here or use the AI generator..."
                  style={{ minHeight: '300px' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const content = await generateSection(newSectionData.section_type, "");
                  setNewSectionData({...newSectionData, content});
                }}
                disabled={isGenerating}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate with AI
              </Button>
              <Button
                onClick={() => createMutation.mutate(newSectionData)}
                disabled={!newSectionData.section_name || !newSectionData.content}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Section
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}