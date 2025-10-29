
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Sparkles,
  Save,
  Loader2,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Shield,
  Lightbulb,
  RefreshCw,
  ZapIcon
} from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";


const PROPOSAL_SECTIONS = [
  {
    id: "executive_summary",
    name: "Executive Summary",
    defaultWordCount: 500,
    description: "High-level overview of your proposal and value proposition"
  },
  {
    id: "volume_1_technical",
    name: "Volume I - Technical Approach",
    defaultWordCount: 3000,
    description: "Detailed technical solution and methodology"
  },
  {
    id: "volume_1_management",
    name: "Volume I - Management Plan",
    defaultWordCount: 2500,
    description: "Project management approach and organizational structure"
  },
  {
    id: "volume_1_staffing",
    name: "Volume I - Staffing Plan",
    defaultWordCount: 1500,
    description: "Personnel and staffing strategy"
  },
  {
    id: "volume_3_past_performance",
    name: "Volume III - Past Performance",
    defaultWordCount: 2000,
    description: "Relevant past performance examples"
  },
  {
    id: "quality_control_plan",
    name: "Quality Control Plan",
    defaultWordCount: 1800,
    description: "Quality assurance and control processes"
  },
  {
    id: "transition_plan",
    name: "Transition Plan",
    defaultWordCount: 1500,
    description: "Transition strategy and timeline"
  },
  {
    id: "compliance",
    name: "Compliance",
    defaultWordCount: 1200,
    description: "Compliance with requirements and regulations"
  }
];

export default function Phase6({ proposalData, setProposalData, proposalId }) {
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [strategy, setStrategy] = useState(null);

  // AI Enhancement States
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);
  const [complianceResults, setComplianceResults] = useState(null);
  const [qualityResults, setQualityResults] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0]);
        }

        if (proposalId) {
          const proposals = await base44.entities.Proposal.filter({ id: proposalId });
          if (proposals.length > 0 && proposals[0].strategy_config) {
            try {
              setStrategy(JSON.parse(proposals[0].strategy_config));
            } catch (e) {
              console.error("Error parsing strategy:", e);
            }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, [proposalId]);

  const { data: sections, isLoading } = useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalSection.filter(
        { proposal_id: proposalId },
        'order'
      );
    },
    initialData: [],
    enabled: !!proposalId,
  });

  const createSectionMutation = useMutation({
    mutationFn: async (data) => {
      return base44.entities.ProposalSection.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections'] });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.ProposalSection.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections'] });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.ProposalSection.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-sections'] });
      setSelectedSection(null);
      setEditingSection(null);
    },
  });

  const autoDraft = async (sectionConfig) => {
    if (!proposalId || !currentOrgId) {
      alert("Please save the proposal first");
      return;
    }

    setIsGenerating(true);

    try {
      // Gather comprehensive context
      const [solicitationDocs, teamingPartners, resources, complianceReqs, winThemes, pastPerformance] = await Promise.all([
        base44.entities.SolicitationDocument.filter({
          proposal_id: proposalId,
          organization_id: currentOrgId.id
        }),
        base44.entities.TeamingPartner.filter({
          organization_id: currentOrgId.id
        }).then(partners => {
          const partnerIds = proposalData.teaming_partner_ids || [];
          return partners.filter(p => partnerIds.includes(p.id));
        }),
        base44.entities.ProposalResource.filter({
          organization_id: currentOrgId.id,
          resource_type: { $in: ['boilerplate_text', 'capability_statement', 'past_proposal'] }
        }),
        base44.entities.ComplianceRequirement.filter({
          proposal_id: proposalId,
          organization_id: currentOrgId.id
        }),
        base44.entities.WinTheme.filter({
          proposal_id: proposalId,
          organization_id: currentOrgId.id
        }),
        base44.entities.PastPerformance.filter({
          organization_id: currentOrgId.id
        }).then(pp => pp.slice(0, 5))
      ]);

      // Build context for AI
      const teamingPartnerContext = teamingPartners.map(p => `
**Partner: ${p.partner_name}**
- Type: ${p.partner_type}
- Core Capabilities: ${p.core_capabilities?.join(', ') || 'N/A'}
- Differentiators: ${p.differentiators?.join(', ') || 'N/A'}
- Past Performance: ${p.past_performance_summary || 'N/A'}
- Certifications: ${p.certifications?.join(', ') || 'N/A'}
`).join('\n');

      const complianceContext = complianceReqs
        .filter(req => req.addressed_in_sections?.includes(sectionConfig.id) || req.requirement_category === 'mandatory')
        .slice(0, 10)
        .map(req => `- ${req.requirement_title}: ${req.requirement_description}`)
        .join('\n');

      const winThemeContext = winThemes
        .filter(wt => wt.status === 'approved' || wt.priority === 'primary')
        .map(wt => `- ${wt.theme_title}: ${wt.theme_statement}`)
        .join('\n');

      const pastPerformanceContext = pastPerformance.map(pp => `
**Project: ${pp.project_name}**
- Client: ${pp.client_name}
- Description: ${pp.project_description}
- Key Outcomes: On-time: ${pp.outcomes?.on_time_delivery_pct}%, Quality: ${pp.outcomes?.quality_score}/5
`).join('\n');

      // Get file URLs for context
      const fileUrls = solicitationDocs
        .filter(doc => doc.file_url)
        .map(doc => doc.file_url)
        .slice(0, 10);

      // Get strategy settings
      const sectionTone = strategy?.sections?.[sectionConfig.id]?.tone || strategy?.tone || "clear";
      const readingLevel = strategy?.readingLevel || "government_plain";
      const targetWordCount = strategy?.sections?.[sectionConfig.id]?.wordCount || sectionConfig.defaultWordCount;

      const prompt = `You are an expert proposal writer for government contracts. Write a compelling ${sectionConfig.name} section for this proposal.

**PROPOSAL DETAILS:**
- Proposal Name: ${proposalData.proposal_name}
- Agency: ${proposalData.agency_name}
- Project: ${proposalData.project_title}
- Type: ${proposalData.project_type}
- Solicitation #: ${proposalData.solicitation_number}
- Prime Contractor: ${proposalData.prime_contractor_name}

**TEAMING PARTNERS:**
${teamingPartnerContext || 'N/A'}

**WIN THEMES TO EMPHASIZE:**
${winThemeContext || 'N/A'}

**KEY MANDATORY REQUIREMENTS:**
${complianceContext || 'N/A'}

**RELEVANT PAST PERFORMANCE:**
${pastPerformanceContext || 'N/A'}

**WRITING REQUIREMENTS:**
- Tone: ${sectionTone}
- Reading Level: ${readingLevel}
- Target Word Count: ${targetWordCount} words
- Section Purpose: ${sectionConfig.description}
${strategy?.requestCitations ? '- Include citations to source documents where applicable' : ''}

**YOUR TASK:**
Write a professional, persuasive ${sectionConfig.name} section that:
1. Directly addresses the mandatory requirements listed above
2. Emphasizes our win themes throughout
3. Showcases our team's strengths and our teaming partners' capabilities
4. Uses relevant past performance examples as proof points
5. Maintains the specified tone and reading level
6. Is approximately ${targetWordCount} words
7. Uses clear headings and bullet points for readability
8. Follows government proposal writing best practices

The content should be ready to insert into the proposal document. Use HTML formatting for structure.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls : undefined
      });

      // Create or update the section
      const wordCount = result.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;

      const existingSection = sections.find(s => s.section_type === sectionConfig.id);

      if (existingSection) {
        await updateSectionMutation.mutateAsync({
          id: existingSection.id,
          data: {
            content: result,
            word_count: wordCount,
            status: 'ai_generated'
          }
        });
        setSelectedSection({ ...existingSection, content: result, word_count: wordCount, status: 'ai_generated' });
        setEditingSection({ ...existingSection, content: result, word_count: wordCount, status: 'ai_generated' });
        setContent(result);
      } else {
        const newSection = await createSectionMutation.mutateAsync({
          proposal_id: proposalId,
          section_name: sectionConfig.name,
          section_type: sectionConfig.id,
          content: result,
          word_count: wordCount,
          order: sections.length,
          status: 'ai_generated',
          ai_prompt_used: prompt.substring(0, 500)
        });
        setSelectedSection(newSection);
        setEditingSection(newSection);
        setContent(newSection.content);
      }

      alert(`✓ AI generated ${wordCount} words for ${sectionConfig.name}`);

    } catch (error) {
      console.error("Error generating content:", error);
      alert("Error generating content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const checkCompliance = async () => {
    if (!editingSection || !editingSection.content) {
      alert("Please open a section with content for editing first");
      return;
    }

    setIsCheckingCompliance(true);

    try {
      const complianceReqs = await base44.entities.ComplianceRequirement.filter({
        proposal_id: proposalId,
        organization_id: currentOrgId.id
      });

      const relevantReqs = complianceReqs.filter(req =>
        req.addressed_in_sections?.includes(editingSection.section_type) ||
        req.requirement_category === 'mandatory'
      );

      const prompt = `You are a proposal compliance analyst. Review this proposal section against the listed mandatory requirements.

**SECTION: ${editingSection.section_name}**

**CONTENT:**
${editingSection.content}

**MANDATORY REQUIREMENTS TO CHECK:**
${relevantReqs.map(req => `
- ${req.requirement_id}: ${req.requirement_title}
  Description: ${req.requirement_description}
`).join('\n')}

**YOUR TASK:**
Analyze the section content and determine:
1. Which requirements are fully addressed
2. Which requirements are partially addressed
3. Which requirements are missing or not addressed
4. Specific recommendations for improving compliance

Return JSON with this structure:
{
  "overall_compliance_score": number (0-100),
  "requirements_checked": [
    {
      "requirement_id": "string",
      "requirement_title": "string",
      "status": "fully_addressed|partially_addressed|not_addressed",
      "confidence": number (0-100),
      "evidence": "string (quote from section that addresses this)",
      "recommendation": "string (what to add/improve)"
    }
  ],
  "missing_critical_elements": ["string"],
  "overall_recommendation": "string"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_compliance_score: { type: "number" },
            requirements_checked: { type: "array" },
            missing_critical_elements: { type: "array" },
            overall_recommendation: { type: "string" }
          }
        }
      });

      setComplianceResults(result);

    } catch (error) {
      console.error("Error checking compliance:", error);
      alert("Error checking compliance. Please try again.");
    } finally {
      setIsCheckingCompliance(false);
    }
  };

  const checkQuality = async () => {
    if (!editingSection || !editingSection.content) {
      alert("Please open a section with content for editing first");
      return;
    }

    setIsCheckingQuality(true);

    try {
      const prompt = `You are a proposal quality analyst and editor. Review this proposal section for quality, clarity, and persuasiveness.

**SECTION: ${editingSection.section_name}**

**CONTENT:**
${content}

**EVALUATE:**
1. Writing Quality (grammar, clarity, professionalism)
2. Persuasiveness (compelling arguments, benefits-focused)
3. Structure & Flow (logical organization, transitions)
4. Technical Accuracy (if technical content)
5. Compliance with Government Plain Language guidelines
6. Reading Level (appropriate for evaluators)
7. Use of Evidence (data, examples, proof points)

**PROVIDE:**
- Scores (0-100) for each criterion
- Specific issues found
- Actionable recommendations for improvement
- Suggested edits or rewrites for weak areas

Return JSON with this structure:
{
  "overall_quality_score": number (0-100),
  "criteria_scores": {
    "writing_quality": number,
    "persuasiveness": number,
    "structure_flow": number,
    "technical_accuracy": number,
    "plain_language": number,
    "reading_level": number,
    "evidence_use": number
  },
  "issues_found": [
    {
      "severity": "high|medium|low",
      "issue": "string",
      "location": "string (specific excerpt)",
      "recommendation": "string"
    }
  ],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggested_improvements": ["string"],
  "overall_recommendation": "string"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_quality_score: { type: "number" },
            criteria_scores: { type: "object" },
            issues_found: { type: "array" },
            strengths: { type: "array" },
            weaknesses: { type: "array" },
            suggested_improvements: { type: "array" },
            overall_recommendation: { type: "string" }
          }
        }
      });

      setQualityResults(result);

    } catch (error) {
      console.error("Error checking quality:", error);
      alert("Error checking quality. Please try again.");
    } finally {
      setIsCheckingQuality(false);
    }
  };

  const generateContentSuggestions = async () => {
    if (!editingSection) {
      alert("Please open a section for editing first");
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const [complianceReqs, winThemes, resources] = await Promise.all([
        base44.entities.ComplianceRequirement.filter({
          proposal_id: proposalId,
          organization_id: currentOrgId.id,
          compliance_status: { $in: ['not_started', 'in_progress'] }
        }),
        base44.entities.WinTheme.filter({
          proposal_id: proposalId,
          organization_id: currentOrgId.id,
          status: { $in: ['approved', 'reviewed'] }
        }),
        base44.entities.ProposalResource.filter({
          organization_id: currentOrgId.id,
          resource_type: 'boilerplate_text'
        })
      ]);

      const prompt = `You are a proposal content strategist. Suggest specific content additions for this section.

**SECTION: ${editingSection.section_name}**
**CURRENT CONTENT PREVIEW:**
${content ? content.substring(0, 500) + '...' : 'Empty section'}

**UNADDRESSED REQUIREMENTS:**
${complianceReqs.slice(0, 5).map(req => `- ${req.requirement_title}`).join('\n')}

**WIN THEMES TO EMPHASIZE:**
${winThemes.slice(0, 3).map(wt => `- ${wt.theme_title}: ${wt.theme_statement}`).join('\n')}

**YOUR TASK:**
Generate 5-7 specific content suggestions that would strengthen this section. Each suggestion should be:
- Specific and actionable
- Address a requirement or win theme
- Include the actual text/paragraph to add
- Indicate where it should be inserted

Return JSON:
{
  "suggestions": [
    {
      "title": "string (brief title)",
      "rationale": "string (why add this)",
      "content": "string (actual text to insert)",
      "placement": "beginning|middle|end",
      "addresses_requirement": "string (requirement ID if applicable)",
      "emphasizes_win_theme": "string (win theme if applicable)"
    }
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: { type: "array" }
          }
        }
      });

      setAiSuggestions(result.suggestions || []);

    } catch (error) {
      console.error("Error generating suggestions:", error);
      alert("Error generating suggestions. Please try again.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const insertSuggestion = (suggestion) => {
    if (!editingSection) {
      alert("Please open the section for editing first");
      return;
    }

    let newContent = content;
    if (suggestion.placement === 'beginning') {
      newContent = suggestion.content + (newContent ? '\n\n' + newContent : '');
    } else if (suggestion.placement === 'end') {
      newContent = (newContent ? newContent + '\n\n' : '') + suggestion.content;
    } else {
      // Insert in middle
      const midPoint = Math.floor(content.length / 2);
      newContent = content.slice(0, midPoint) + '\n\n' + suggestion.content + '\n\n' + content.slice(midPoint);
    }

    setContent(newContent);
    alert('✓ Suggestion inserted! Review and adjust as needed.');
  };

  const handleSave = async () => {
    if (!editingSection) return;

    setIsSaving(true);
    try {
      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;
      await updateSectionMutation.mutateAsync({
        id: editingSection.id,
        data: {
          content,
          word_count: wordCount,
          status: 'reviewed'
        }
      });

      setSelectedSection({ ...editingSection, content, word_count: wordCount, status: 'reviewed' });
      setEditingSection(null);
      alert("✓ Section saved successfully!");
    } catch (error) {
      console.error("Error saving section:", error);
      alert("Error saving section. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (section) => {
    setEditingSection(section);
    setContent(section.content || "");
    setComplianceResults(null);
    setQualityResults(null);
    setAiSuggestions([]);
    setSelectedSection(null); // Deselect if editing
  };

  const handleDelete = async (section) => {
    if (confirm(`Delete section "${section.section_name}"?`)) {
      await deleteSectionMutation.mutateAsync(section.id);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'reviewed': return 'bg-blue-100 text-blue-700';
      case 'ai_generated': return 'bg-purple-100 text-purple-700';
      case 'draft': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Phase 6: AI-Powered Proposal Writer
        </CardTitle>
        <CardDescription>
          Generate, edit, and optimize proposal sections with AI assistance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-indigo-50 border-indigo-200">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <AlertDescription>
            <p className="font-semibold text-indigo-900 mb-1">Enhanced AI Features Available:</p>
            <ul className="text-sm text-indigo-800 space-y-1">
              <li>✓ Auto-draft using solicitation docs + teaming partner data</li>
              <li>✓ Real-time compliance checking against requirements</li>
              <li>✓ Quality & readability analysis</li>
              <li>✓ Tailored content suggestions</li>
            </ul>
          </AlertDescription>
        </Alert>

        {!proposalId && (
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              Please complete Phase 1 and save your proposal before creating sections.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4">
          <div>
            <h3 className="font-semibold mb-3">Available Sections</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PROPOSAL_SECTIONS.map((sectionConfig) => {
                const existingSection = sections.find(s => s.section_type === sectionConfig.id);

                return (
                  <Card key={sectionConfig.id} className={`cursor-pointer transition-all ${
                    existingSection
                      ? 'border-green-300 bg-green-50 hover:shadow-md'
                      : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm mb-1">{sectionConfig.name}</h4>
                          <p className="text-xs text-slate-600 mb-2">{sectionConfig.description}</p>
                          {existingSection && (
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getStatusColor(existingSection.status)}>
                                {existingSection.status}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {existingSection.word_count} words
                              </span>
                            </div>
                          )}
                        </div>
                        {existingSection && (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex gap-2">
                        {existingSection ? (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setSelectedSection(existingSection)} className="flex-1">
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(existingSection)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(existingSection)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => autoDraft(sectionConfig)}
                            disabled={isGenerating || !proposalId}
                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                          >
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Generate
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {isGenerating && (
          <Alert className="bg-blue-50 border-blue-200">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <AlertDescription>
              <p className="font-semibold text-blue-900">AI is generating your content...</p>
              <p className="text-sm text-blue-700">Analyzing solicitation, teaming partners, requirements, and win themes...</p>
            </AlertDescription>
          </Alert>
        )}

        {editingSection && (
          <Card className="border-indigo-300 bg-indigo-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Editing: {editingSection.section_name}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={generateContentSuggestions}
                    disabled={isLoadingSuggestions}
                    size="sm"
                    variant="outline"
                  >
                    {isLoadingSuggestions ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Lightbulb className="w-4 h-4 mr-2" />
                    )}
                    AI Suggestions
                  </Button>
                  <Button
                    onClick={checkCompliance}
                    disabled={isCheckingCompliance}
                    size="sm"
                    variant="outline"
                  >
                    {isCheckingCompliance ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4 mr-2" />
                    )}
                    Check Compliance
                  </Button>
                  <Button
                    onClick={checkQuality}
                    disabled={isCheckingQuality}
                    size="sm"
                    variant="outline"
                  >
                    {isCheckingQuality ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <TrendingUp className="w-4 h-4 mr-2" />
                    )}
                    Check Quality
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving} size="sm">
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save
                  </Button>
                  <Button onClick={() => { setEditingSection(null); setAiSuggestions([]); setComplianceResults(null); setQualityResults(null); }} size="sm" variant="outline">
                    Cancel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg">
                <ReactQuill
                  value={content}
                  onChange={setContent}
                  className="h-96"
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      ['link'],
                      ['clean']
                    ]
                  }}
                />
              </div>

              {aiSuggestions.length > 0 && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-600" />
                      AI Content Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {aiSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="p-3 bg-white border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h5 className="font-semibold text-sm text-yellow-900">{suggestion.title}</h5>
                            <p className="text-xs text-yellow-700 mt-1">{suggestion.rationale}</p>
                            {suggestion.addresses_requirement && (
                              <Badge variant="outline" className="text-xs mt-1">
                                Addresses: {suggestion.addresses_requirement}
                              </Badge>
                            )}
                          </div>
                          <Button size="sm" onClick={() => insertSuggestion(suggestion)}>
                            <Plus className="w-3 h-3 mr-1" />
                            Insert
                          </Button>
                        </div>
                        <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
                          <div dangerouslySetInnerHTML={{ __html: suggestion.content.substring(0, 200) + '...' }} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {complianceResults && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      Compliance Analysis
                      <Badge className={
                        complianceResults.overall_compliance_score >= 80 ? 'bg-green-100 text-green-700' :
                          complianceResults.overall_compliance_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                      }>
                        {complianceResults.overall_compliance_score}% Compliant
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={complianceResults.overall_compliance_score} className="h-2" />

                    <div className="space-y-2">
                      {complianceResults.requirements_checked?.slice(0, 5).map((req, idx) => (
                        <div key={idx} className="p-2 bg-white rounded border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{req.requirement_title}</span>
                            <Badge className={
                              req.status === 'fully_addressed' ? 'bg-green-100 text-green-700' :
                                req.status === 'partially_addressed' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                            }>
                              {req.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          {req.recommendation && (
                            <p className="text-xs text-slate-600">{req.recommendation}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {complianceResults.missing_critical_elements?.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="w-4 h-4" />
                        <AlertDescription>
                          <p className="font-semibold mb-1">Missing Critical Elements:</p>
                          <ul className="text-sm space-y-1">
                            {complianceResults.missing_critical_elements.map((elem, idx) => (
                              <li key={idx}>• {elem}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {qualityResults && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      Quality Analysis
                      <Badge className={
                        qualityResults.overall_quality_score >= 80 ? 'bg-green-100 text-green-700' :
                          qualityResults.overall_quality_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                      }>
                        {qualityResults.overall_quality_score}/100
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(qualityResults.criteria_scores || {}).map(([key, score]) => (
                        <div key={key} className="p-2 bg-white rounded border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="text-xs font-bold">{score}/100</span>
                          </div>
                          <Progress value={score} className="h-1" />
                        </div>
                      ))}
                    </div>

                    {qualityResults.strengths?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-green-900 mb-1">Strengths:</p>
                        <ul className="text-xs text-green-800 space-y-1">
                          {qualityResults.strengths.map((strength, idx) => (
                            <li key={idx}>✓ {strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {qualityResults.issues_found?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-red-900 mb-1">Issues Found:</p>
                        <div className="space-y-2">
                          {qualityResults.issues_found.slice(0, 3).map((issue, idx) => (
                            <div key={idx} className="p-2 bg-white border rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={
                                  issue.severity === 'high' ? 'destructive' :
                                    issue.severity === 'medium' ? 'secondary' :
                                      'outline'
                                }>
                                  {issue.severity}
                                </Badge>
                                <span className="text-xs font-medium">{issue.issue}</span>
                              </div>
                              <p className="text-xs text-slate-600">{issue.recommendation}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}

        {selectedSection && !editingSection && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedSection.section_name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getStatusColor(selectedSection.status)}>
                      {selectedSection.status}
                    </Badge>
                    <span className="text-sm text-slate-600">
                      {selectedSection.word_count} words
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleEdit(selectedSection)} size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => autoDraft(PROPOSAL_SECTIONS.find(s => s.id === selectedSection.section_type))}
                    size="sm"
                    variant="outline"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Regenerate
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedSection.content }}
              />
            </CardContent>
          </Card>
        )}
         <div className="flex gap-4 pt-6 border-t">
          <Button
            size="lg"
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => {
              const event = new CustomEvent('navigateToPhase', { detail: 'phase7' });
              window.dispatchEvent(event);
            }}
          >
            Continue to Finalize
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
