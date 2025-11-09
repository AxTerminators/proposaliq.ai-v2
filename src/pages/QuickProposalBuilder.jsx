import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  FileText,
  DollarSign,
  Upload,
  Wand2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  Eye,
  Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganization } from "../components/layout/OrganizationContext";

const QUICK_STEPS = [
  { id: 1, title: "Basic Info", icon: FileText, description: "Enter opportunity details" },
  { id: 2, title: "AI Generation", icon: Sparkles, description: "AI creates content" },
  { id: 3, title: "Refine", icon: Wand2, description: "Customize and enhance" },
  { id: 4, title: "Finalize", icon: CheckCircle2, description: "Review and export" }
];

export default function QuickProposalBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organization, user } = useOrganization();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposalId, setProposalId] = useState(null);
  
  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    proposal_name: '',
    agency_name: '',
    solicitation_number: '',
    due_date: '',
    contract_value: '',
    project_title: '',
    brief_description: ''
  });
  
  // Step 2: AI Generated Content
  const [aiContent, setAiContent] = useState({
    executive_summary: '',
    technical_approach: '',
    past_performance: '',
    pricing_narrative: ''
  });
  
  // Step 3: Refinements
  const [refinedContent, setRefinedContent] = useState({
    executive_summary: '',
    technical_approach: '',
    past_performance: '',
    pricing_narrative: ''
  });

  const createProposalMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.Proposal.create({
        ...data,
        organization_id: organization.id,
        proposal_type_category: 'OTHER',
        current_phase: 'phase1',
        status: 'draft'
      });
    },
    onSuccess: (proposal) => {
      setProposalId(proposal.id);
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    }
  });

  const handleGenerateWithAI = async () => {
    if (!basicInfo.proposal_name || !basicInfo.project_title) {
      alert("Please enter at least a proposal name and project title");
      return;
    }

    setIsGenerating(true);
    try {
      // Create proposal first if not exists
      let currentProposalId = proposalId;
      if (!currentProposalId) {
        const proposal = await createProposalMutation.mutateAsync(basicInfo);
        currentProposalId = proposal.id;
      }

      // Fetch organization's past performance and resources for context
      const [pastPerf, resources] = await Promise.all([
        base44.entities.PastPerformance.filter(
          { organization_id: organization.id },
          '-usage_count',
          3
        ),
        base44.entities.ProposalResource.filter(
          { organization_id: organization.id, resource_type: 'boilerplate_text' },
          '-usage_count',
          5
        )
      ]);

      const contextInfo = {
        organization_name: organization.organization_name,
        past_performance: pastPerf.map(p => ({
          project: p.project_name,
          client: p.client_name,
          description: p.project_description
        })),
        boilerplate_samples: resources.map(r => r.boilerplate_content).join('\n\n')
      };

      // Generate Executive Summary
      const executiveSummaryPrompt = `You are a professional government proposal writer. Create a compelling executive summary for the following opportunity:

Proposal: ${basicInfo.proposal_name}
Project Title: ${basicInfo.project_title}
Agency: ${basicInfo.agency_name || 'Not specified'}
Brief Description: ${basicInfo.brief_description || 'Not provided'}
Contract Value: ${basicInfo.contract_value ? '$' + parseInt(basicInfo.contract_value).toLocaleString() : 'Not specified'}

Organization: ${contextInfo.organization_name}
Relevant Past Performance: ${JSON.stringify(contextInfo.past_performance, null, 2)}

Write a concise, persuasive executive summary (300-400 words) that:
1. Clearly states what we're proposing
2. Highlights our unique qualifications
3. Demonstrates understanding of the requirement
4. Emphasizes our commitment to success

Write in professional, confident tone. Focus on value to the customer.`;

      const execSummaryResponse = await base44.integrations.Core.InvokeLLM({
        prompt: executiveSummaryPrompt,
        add_context_from_internet: false
      });

      // Generate Technical Approach
      const technicalPrompt = `You are a professional government proposal writer. Create a technical approach section for:

Proposal: ${basicInfo.proposal_name}
Project Title: ${basicInfo.project_title}
Brief Description: ${basicInfo.brief_description || 'Not provided'}

Organization Experience:
${contextInfo.past_performance.map(p => `- ${p.project} for ${p.client}: ${p.description}`).join('\n')}

Write a clear technical approach (400-500 words) that:
1. Outlines our methodology
2. Describes key deliverables
3. Explains our process and timeline
4. Highlights our technical advantages

Be specific and solution-focused.`;

      const technicalResponse = await base44.integrations.Core.InvokeLLM({
        prompt: technicalPrompt,
        add_context_from_internet: false
      });

      // Generate Past Performance Summary
      const pastPerfPrompt = `You are a professional government proposal writer. Create a past performance summary for:

Our Relevant Projects:
${JSON.stringify(contextInfo.past_performance, null, 2)}

Target Opportunity: ${basicInfo.project_title}

Write a compelling past performance section (300-400 words) that:
1. Highlights our most relevant experience
2. Shows measurable results and outcomes
3. Demonstrates our track record of success
4. Connects our experience to this opportunity

Focus on relevance and results.`;

      const pastPerfResponse = await base44.integrations.Core.InvokeLLM({
        prompt: pastPerfPrompt,
        add_context_from_internet: false
      });

      // Generate Pricing Narrative
      const pricingPrompt = `You are a professional government proposal writer. Create a brief pricing narrative for:

Contract Value: ${basicInfo.contract_value ? '$' + parseInt(basicInfo.contract_value).toLocaleString() : 'To be determined'}
Project: ${basicInfo.project_title}

Write a concise pricing narrative (200-300 words) that:
1. Explains our pricing approach
2. Highlights our competitive value
3. Justifies our pricing structure
4. Emphasizes cost-effectiveness

Be persuasive about value, not just cost.`;

      const pricingResponse = await base44.integrations.Core.InvokeLLM({
        prompt: pricingPrompt,
        add_context_from_internet: false
      });

      setAiContent({
        executive_summary: execSummaryResponse,
        technical_approach: technicalResponse,
        past_performance: pastPerfResponse,
        pricing_narrative: pricingResponse
      });

      setRefinedContent({
        executive_summary: execSummaryResponse,
        technical_approach: technicalResponse,
        past_performance: pastPerfResponse,
        pricing_narrative: pricingResponse
      });

      setCurrentStep(2);
    } catch (error) {
      console.error("AI generation error:", error);
      alert("Error generating content with AI: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      if (!proposalId) {
        const proposal = await createProposalMutation.mutateAsync(basicInfo);
        setProposalId(proposal.id);
      }

      // Save sections
      const sectionsToSave = [
        { section_type: 'executive_summary', content: refinedContent.executive_summary, section_name: 'Executive Summary' },
        { section_type: 'technical_approach', content: refinedContent.technical_approach, section_name: 'Technical Approach' },
        { section_type: 'past_performance', content: refinedContent.past_performance, section_name: 'Past Performance' },
        { section_type: 'pricing', content: refinedContent.pricing_narrative, section_name: 'Pricing Narrative' }
      ];

      for (let i = 0; i < sectionsToSave.length; i++) {
        const section = sectionsToSave[i];
        await base44.entities.ProposalSection.create({
          proposal_id: proposalId,
          ...section,
          order: i,
          status: 'draft'
        });
      }

      alert("✅ Progress saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Error saving: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleExport = () => {
    navigate(createPageUrl("ExportCenter") + `?proposal_id=${proposalId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Quick Proposal Builder</h1>
              <p className="text-slate-600">AI-powered rapid proposal creation in 4 simple steps</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-6">
            {QUICK_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex-1">
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                        isActive && "bg-purple-600 border-purple-600 text-white scale-110",
                        isCompleted && "bg-green-600 border-green-600 text-white",
                        !isActive && !isCompleted && "bg-white border-slate-300 text-slate-400"
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <div className="text-center mt-2">
                        <p className={cn(
                          "text-sm font-semibold",
                          isActive && "text-purple-600",
                          isCompleted && "text-green-600",
                          !isActive && !isCompleted && "text-slate-400"
                        )}>
                          {step.title}
                        </p>
                        <p className="text-xs text-slate-500">{step.description}</p>
                      </div>
                    </div>
                  </div>
                  {idx < QUICK_STEPS.length - 1 && (
                    <div className={cn(
                      "flex-shrink-0 w-20 h-0.5 mb-8 transition-colors",
                      currentStep > step.id ? "bg-green-600" : "bg-slate-300"
                    )} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Basic Opportunity Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proposal Name *</Label>
                  <Input
                    value={basicInfo.proposal_name}
                    onChange={(e) => setBasicInfo({...basicInfo, proposal_name: e.target.value})}
                    placeholder="e.g., Cloud Migration for VA"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Project Title *</Label>
                  <Input
                    value={basicInfo.project_title}
                    onChange={(e) => setBasicInfo({...basicInfo, project_title: e.target.value})}
                    placeholder="e.g., Veteran Affairs Cloud Modernization"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Agency/Organization</Label>
                  <Input
                    value={basicInfo.agency_name}
                    onChange={(e) => setBasicInfo({...basicInfo, agency_name: e.target.value})}
                    placeholder="e.g., Department of Veterans Affairs"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Solicitation Number</Label>
                  <Input
                    value={basicInfo.solicitation_number}
                    onChange={(e) => setBasicInfo({...basicInfo, solicitation_number: e.target.value})}
                    placeholder="e.g., VA-24-R-0001"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={basicInfo.due_date}
                    onChange={(e) => setBasicInfo({...basicInfo, due_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estimated Contract Value</Label>
                  <Input
                    type="number"
                    value={basicInfo.contract_value}
                    onChange={(e) => setBasicInfo({...basicInfo, contract_value: e.target.value})}
                    placeholder="e.g., 500000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Brief Description (helps AI generate better content)</Label>
                <Textarea
                  value={basicInfo.brief_description}
                  onChange={(e) => setBasicInfo({...basicInfo, brief_description: e.target.value})}
                  placeholder="Briefly describe the opportunity, key requirements, and what you plan to offer..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleGenerateWithAI}
                  disabled={!basicInfo.proposal_name || !basicInfo.project_title || isGenerating}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin mr-2">⏳</div>
                      Generating with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate with AI
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: AI Generation Results */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  AI-Generated Content
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Review the AI-generated sections below. You can edit them in the next step.
                </p>
              </CardHeader>
            </Card>

            {Object.entries(aiContent).map(([key, content]) => {
              const titles = {
                executive_summary: 'Executive Summary',
                technical_approach: 'Technical Approach',
                past_performance: 'Past Performance',
                pricing_narrative: 'Pricing Narrative'
              };
              
              return (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-lg">{titles[key]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-slate max-w-none bg-white p-4 rounded-lg border border-slate-200">
                      {content ? (
                        <div className="whitespace-pre-wrap">{content}</div>
                      ) : (
                        <p className="text-slate-400 italic">No content generated</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
                Continue to Refine
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Refine Content */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-6 h-6 text-cyan-600" />
                  Refine & Customize
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Edit and enhance the AI-generated content. Add specific details, examples, and your expertise.
                </p>
              </CardHeader>
            </Card>

            {Object.entries(refinedContent).map(([key, content]) => {
              const titles = {
                executive_summary: 'Executive Summary',
                technical_approach: 'Technical Approach',
                past_performance: 'Past Performance',
                pricing_narrative: 'Pricing Narrative'
              };
              
              return (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-lg">{titles[key]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={content}
                      onChange={(e) => setRefinedContent({
                        ...refinedContent,
                        [key]: e.target.value
                      })}
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </CardContent>
                </Card>
              );
            })}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSaveProgress} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Progress'}
                </Button>
                <Button onClick={handleNext} className="bg-cyan-600 hover:bg-cyan-700">
                  Continue to Finalize
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Finalize */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  Finalize Your Proposal
                </CardTitle>
                <p className="text-sm text-slate-600">
                  Your proposal is ready! Review the final content and export when ready.
                </p>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proposal Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-600">Proposal Name</Label>
                    <p className="font-semibold text-slate-900">{basicInfo.proposal_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Project Title</Label>
                    <p className="font-semibold text-slate-900">{basicInfo.project_title}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Agency</Label>
                    <p className="font-semibold text-slate-900">{basicInfo.agency_name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Due Date</Label>
                    <p className="font-semibold text-slate-900">{basicInfo.due_date || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">4</div>
                    <div className="text-xs text-slate-600">Sections</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.values(refinedContent).reduce((sum, content) => 
                        sum + (content?.split(' ').length || 0), 0
                      )}
                    </div>
                    <div className="text-xs text-slate-600">Words</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {basicInfo.contract_value ? '$' + (parseInt(basicInfo.contract_value) / 1000).toFixed(0) + 'K' : 'N/A'}
                    </div>
                    <div className="text-xs text-slate-600">Value</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600">⚡</div>
                    <div className="text-xs text-slate-600">Quick Mode</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Edit
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSaveProgress} disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Proposal
                </Button>
                <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export Proposal
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}