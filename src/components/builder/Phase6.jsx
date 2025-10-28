import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PenTool, Sparkles, Plus, Edit2, Trash2, Loader2, FileText, CheckCircle2 } from "lucide-react";
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
  { value: "custom", label: "Custom Section" }
];

export default function Phase6({ proposalData, setProposalData, proposalId }) {
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [showNewSection, setShowNewSection] = useState(false);
  const [selectedSectionType, setSelectedSectionType] = useState("executive_summary");
  const [currentOrgId, setCurrentOrgId] = useState(null);

  React.useEffect(() => {
    const loadOrgId = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading org:", error);
      }
    };
    loadOrgId();
  }, []);

  const { data: sections, isLoading } = useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: () => proposalId ? base44.entities.ProposalSection.filter({ proposal_id: proposalId }, 'order') : [],
    initialData: [],
    enabled: !!proposalId
  });

  const createSectionMutation = useMutation({
    mutationFn: (data) => base44.entities.ProposalSection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections'] });
      setShowNewSection(false);
      setNewSectionName("");
    }
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProposalSection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections'] });
    }
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id) => base44.entities.ProposalSection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections'] });
      setSelectedSection(null);
    }
  });

  const trackTokenUsage = async (tokens, prompt, response) => {
    try {
      const user = await base44.auth.me();
      await base44.entities.TokenUsage.create({
        organization_id: currentOrgId,
        user_email: user.email,
        feature_type: "proposal_generation",
        tokens_used: tokens,
        llm_provider: "gemini",
        prompt: prompt?.substring(0, 500),
        response_preview: response?.substring(0, 200),
        cost_estimate: (tokens / 1000000) * 0.5
      });

      const subs = await base44.entities.Subscription.filter({ organization_id: currentOrgId }, '-created_date', 1);
      if (subs.length > 0) {
        await base44.entities.Subscription.update(subs[0].id, {
          token_credits_used: (subs[0].token_credits_used || 0) + tokens
        });
      }
    } catch (error) {
      console.error("Error tracking tokens:", error);
    }
  };

  const generateSection = async (section) => {
    if (!proposalId || !currentOrgId) {
      alert("Please save the proposal first");
      return;
    }

    setIsGenerating(true);
    try {
      // Get reference documents
      const referenceDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: currentOrgId,
        document_type: "reference"
      });

      // Get solicitation documents
      const solicitationDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: currentOrgId,
        document_type: { $in: ["rfp", "rfq", "sow", "pws"] }
      });

      const fileUrls = [...referenceDocs, ...solicitationDocs]
        .map(doc => doc.file_url)
        .filter(url => url && !url.startsWith('proposal:'));

      const prompt = `You are an expert proposal writer for government contracts. Generate a comprehensive ${section.section_name} section for this proposal.

**PROPOSAL DETAILS:**
- Name: ${proposalData.proposal_name}
- Type: ${proposalData.project_type}
- Agency: ${proposalData.agency_name}
- Project: ${proposalData.project_title}
- Prime: ${proposalData.prime_contractor_name}

**SECTION TYPE:** ${section.section_type}
**SECTION NAME:** ${section.section_name}

**INSTRUCTIONS:**
1. Review the reference documents and solicitation requirements provided
2. Extract writing style, tone, and relevant information from reference docs
3. Generate compelling content that addresses the solicitation requirements
4. Use specific examples and details from the reference materials
5. Match the professional tone and style of the reference documents
6. Make it persuasive and focused on value to the government

**IMPORTANT:** 
- Write in a professional, government proposal style
- Be specific and detailed (aim for 500-1000 words)
- Include concrete examples where possible
- Focus on benefits to the agency
- Use active voice and clear language

Generate the section content now:`;

      const content = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined
      });

      await trackTokenUsage(8000, prompt, content);

      const wordCount = content.split(/\s+/).length;

      updateSectionMutation.mutate({
        id: section.id,
        data: {
          content,
          word_count: wordCount,
          status: "ai_generated",
          ai_prompt_used: prompt.substring(0, 500)
        }
      });

      setSelectedSection({...section, content, word_count: wordCount, status: "ai_generated"});

    } catch (error) {
      console.error("Error generating section:", error);
      alert("Error generating section. Please try again.");
    }
    setIsGenerating(false);
  };

  const createNewSection = () => {
    if (!newSectionName || !proposalId) return;

    createSectionMutation.mutate({
      proposal_id: proposalId,
      section_name: newSectionName,
      section_type: selectedSectionType,
      order: sections.length,
      status: "draft"
    });
  };

  const saveContent = (content) => {
    if (!selectedSection) return;

    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;

    updateSectionMutation.mutate({
      id: selectedSection.id,
      data: {
        content,
        word_count: wordCount,
        status: "reviewed"
      }
    });
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="w-5 h-5 text-green-600" />
          Phase 6: AI Proposal Writer
        </CardTitle>
        <CardDescription>
          AI will generate proposal content based on your references
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!proposalId && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 text-sm">
              ⚠️ Please complete Phase 1 and save your proposal first
            </p>
          </div>
        )}

        {/* Section List */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Proposal Sections</h3>
          <Button
            onClick={() => setShowNewSection(true)}
            size="sm"
            disabled={!proposalId}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Section
          </Button>
        </div>

        {showNewSection && (
          <Card className="bg-slate-50 border-slate-300">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Section Type</label>
                <select
                  value={selectedSectionType}
                  onChange={(e) => setSelectedSectionType(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  {SECTION_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Section Name</label>
                <Input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="e.g., Executive Summary"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createNewSection} size="sm">
                  Create Section
                </Button>
                <Button onClick={() => setShowNewSection(false)} variant="ghost" size="sm">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-2" />
            <p className="text-slate-600">Loading sections...</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 mb-2">No sections yet</p>
            <p className="text-sm text-slate-500">Click "Add Section" to get started</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Section List */}
            <div className="space-y-2">
              {sections.map((section) => (
                <div
                  key={section.id}
                  onClick={() => setSelectedSection(section)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedSection?.id === section.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-slate-200 hover:border-green-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm text-slate-900">{section.section_name}</h4>
                    {section.status === 'ai_generated' && (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {section.section_type?.replace(/_/g, ' ')}
                  </Badge>
                  {section.word_count > 0 && (
                    <p className="text-xs text-slate-500 mt-1">{section.word_count} words</p>
                  )}
                </div>
              ))}
            </div>

            {/* Section Editor */}
            <div className="md:col-span-2">
              {!selectedSection ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg">
                  <PenTool className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-600">Select a section to edit or generate</p>
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{selectedSection.section_name}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => generateSection(selectedSection)}
                          disabled={isGenerating}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              {selectedSection.content ? 'Regenerate' : 'Generate'}
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => deleteSectionMutation.mutate(selectedSection.id)}
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge className="capitalize">
                        {selectedSection.section_type?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant={selectedSection.status === 'ai_generated' ? 'default' : 'secondary'}>
                        {selectedSection.status?.replace(/_/g, ' ')}
                      </Badge>
                      {selectedSection.word_count > 0 && (
                        <Badge variant="outline">{selectedSection.word_count} words</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedSection.content ? (
                      <div className="space-y-4">
                        <ReactQuill
                          value={selectedSection.content}
                          onChange={saveContent}
                          theme="snow"
                          className="min-h-[400px]"
                        />
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg">
                        <Sparkles className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-600 mb-4">No content yet</p>
                        <Button
                          onClick={() => generateSection(selectedSection)}
                          disabled={isGenerating}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Generate with AI
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}