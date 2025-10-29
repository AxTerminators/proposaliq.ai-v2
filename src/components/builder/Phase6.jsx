
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenTool, Upload, Sparkles, Loader2, RefreshCw, History, RotateCcw, Lightbulb, Plus, GitCompare } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CollaborationPanel from "../collaboration/CollaborationPanel";
import VersionComparison from "./VersionComparison";
import AIWritingAssistant from "./AIWritingAssistant";

export default function Phase6({ proposalData, setProposalData, proposalId }) {
  const queryClient = useQueryClient();
  const [strategy, setStrategy] = useState(null);
  const [activeSections, setActiveSections] = useState([]);
  const [isGenerating, setIsGenerating] = useState({});
  const [sectionContent, setSectionContent] = useState({});
  const [currentOrgId, setCurrentOrgId] = useState(null);
  const [user, setUser] = useState(null);
  
  // History viewer state
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedSectionForHistory, setSelectedSectionForHistory] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Version comparison state
  const [showComparisonDialog, setShowComparisonDialog] = useState(false);
  const [selectedSectionForComparison, setSelectedSectionForComparison] = useState(null);

  // Content suggestions state
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [currentSectionId, setCurrentSectionId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    const loadStrategy = async () => {
      if (!proposalId) return;
      
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const orgs = await base44.entities.Organization.filter(
          { created_by: currentUser.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }

        const proposals = await base44.entities.Proposal.filter({ id: proposalId }, '-created_date', 1);
        if (proposals.length > 0 && proposals[0].strategy_config) {
          const config = JSON.parse(proposals[0].strategy_config);
          setStrategy(config);
          
          // Build active sections list
          const sections = [];
          Object.entries(config.sections || {}).forEach(([sectionId, sectionData]) => {
            if (sectionData.included) {
              sections.push({ id: sectionId, ...sectionData, subsections: [] });
              
              Object.entries(sectionData.subsections || {}).forEach(([subId, subData]) => {
                if (subData.included) {
                  sections[sections.length - 1].subsections.push({ id: subId, ...subData });
                }
              });
            }
          });
          setActiveSections(sections);

          // Load existing content
          const existingSections = await base44.entities.ProposalSection.filter({ proposal_id: proposalId });
          const contentMap = {};
          existingSections.forEach(sec => {
            contentMap[sec.section_id] = sec.content;
          });
          setSectionContent(contentMap);
        }
      } catch (error) {
        console.error("Error loading strategy:", error);
      }
    };

    loadStrategy();
  }, [proposalId]);

  const trackTokenUsage = async (tokens, prompt, response) => {
    try {
      const user = await base44.auth.me();
      await base44.entities.TokenUsage.create({
        organization_id: currentOrgId,
        user_email: user.email,
        feature_type: "proposal_generation",
        tokens_used: tokens,
        llm_provider: strategy?.aiModel || "gemini",
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

  const getToneInstructions = (tone) => {
    const tones = {
      clear: "Write in clear, straightforward language that is easy to understand.",
      formal: "Use formal, professional language appropriate for government contracting.",
      concise: "Be brief and to the point, avoiding unnecessary words.",
      courteous: "Use respectful and courteous language throughout.",
      confident: "Write with confidence, emphasizing your capabilities and experience.",
      persuasive: "Use persuasive language that convinces the reader of your value.",
      professional: "Maintain a professional tone throughout.",
      humanized: "Write in a warm, human tone while maintaining professionalism.",
      conversational: "Use a conversational style that engages the reader."
    };
    return tones[tone] || tones.clear;
  };

  const getReadingLevelInstructions = (level) => {
    const levels = {
      government_plain: "Write using Government Plain Language standards - clear, concise, and well-organized.",
      flesch_60: "Target Flesch-Kincaid Grade Level 10 (Flesch Reading Ease 60+) - accessible to most adults.",
      flesch_70: "Target Flesch-Kincaid Grade Level 8 (Flesch Reading Ease 70+) - easy to read for broad audience."
    };
    return levels[level] || levels.government_plain;
  };

  const createVersionHistory = async (sectionId, sectionName, content, changeType, changeSummary = null) => {
    try {
      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId,
        section_id: sectionId
      });

      if (sections.length === 0) return;

      const section = sections[0];

      const existingHistory = await base44.entities.ProposalSectionHistory.filter({
        proposal_section_id: section.id
      }, '-version_number', 1);

      const nextVersion = existingHistory.length > 0 ? existingHistory[0].version_number + 1 : 1;
      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;

      await base44.entities.ProposalSectionHistory.create({
        proposal_section_id: section.id,
        version_number: nextVersion,
        content: content,
        changed_by_user_email: user.email,
        changed_by_user_name: user.full_name || user.email,
        change_summary: changeSummary || `${changeType.replace(/_/g, ' ')}`,
        word_count: wordCount,
        change_type: changeType
      });
    } catch (error) {
      console.error("Error creating version history:", error);
    }
  };

  const findContentSuggestions = async (sectionId, sectionName) => {
    if (!currentOrgId) return;

    setLoadingSuggestions(true);
    setCurrentSectionId(sectionId);
    setShowSuggestionsPanel(true);

    try {
      const allResources = await base44.entities.ProposalResource.filter({
        organization_id: currentOrgId,
        resource_type: "boilerplate_text"
      }, '-usage_count');

      if (allResources.length === 0) {
        setSuggestions([]);
        setLoadingSuggestions(false);
        return;
      }

      const currentContent = sectionContent[sectionId] || "";
      const contentPreview = currentContent.replace(/<[^>]*>/g, '').substring(0, 500);

      const prompt = `You are analyzing a proposal section to find the most relevant boilerplate content from a library.

**SECTION BEING WRITTEN:**
Section Name: ${sectionName}
Current Content: ${contentPreview || "Not yet written"}

**AVAILABLE BOILERPLATE CONTENT:**
${allResources.map((r, idx) => `
${idx + 1}. Title: ${r.title}
   Category: ${r.content_category}
   Tags: ${r.tags?.join(', ') || 'none'}
   Content Preview: ${r.boilerplate_content?.replace(/<[^>]*>/g, '').substring(0, 200)}
`).join('\n')}

**YOUR TASK:**
Analyze the section being written and identify the 3-5 most relevant boilerplate pieces that would be helpful. Consider:
- Topic relevance
- Content category alignment
- Tag matches
- Quality and usefulness of the content

Return a JSON array of resource IDs (zero-indexed, 0 to ${allResources.length - 1}) ranked by relevance, with a brief explanation of why each is relevant.

Example: [
  {"index": 2, "reason": "Directly addresses quality assurance processes relevant to this technical section"},
  {"index": 0, "reason": "Contains company overview that could strengthen the introduction"}
]`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "number" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      await trackTokenUsage(3000, prompt, JSON.stringify(result));

      const suggestedResources = (result.suggestions || [])
        .filter(s => s.index >= 0 && s.index < allResources.length)
        .map(s => ({
          ...allResources[s.index],
          relevance_reason: s.reason
        }))
        .slice(0, 5);

      setSuggestions(suggestedResources);
    } catch (error) {
      console.error("Error finding suggestions:", error);
      setSuggestions([]);
    }

    setLoadingSuggestions(false);
  };

  const insertBoilerplate = async (resource, sectionId) => {
    const currentContent = sectionContent[sectionId] || "";
    
    const newContent = currentContent + 
      (currentContent ? '<p><br></p>' : '') + 
      resource.boilerplate_content;
    
    setSectionContent(prev => ({ ...prev, [sectionId]: newContent }));

    try {
      await base44.entities.ProposalResource.update(resource.id, {
        usage_count: (resource.usage_count || 0) + 1,
        last_used_date: new Date().toISOString(),
        linked_proposal_ids: [...new Set([...(resource.linked_proposal_ids || []), proposalId])]
      });

      queryClient.invalidateQueries({ queryKey: ['resources'] });
    } catch (error) {
      console.error("Error updating usage:", error);
    }

    alert(`✓ Inserted "${resource.title}" into section!`);
  };

  const autoDraft = async (sectionId, sectionName, wordCount, tone, isSubsection = false) => {
    if (!proposalId || !currentOrgId) {
      alert("Please save the proposal first");
      return;
    }

    setIsGenerating(prev => ({ ...prev, [sectionId]: true }));

    try {
      const referenceDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: currentOrgId,
        document_type: "reference"
      });

      const solicitationDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        organization_id: currentOrgId,
        document_type: { $in: ["rfp", "rfq", "sow", "pws"] }
      });

      const fileUrls = [...referenceDocs, ...solicitationDocs]
        .map(doc => doc.file_url)
        .filter(url => url && !url.startsWith('proposal:'));

      const effectiveTone = tone === "default" ? strategy.tone : tone;
      const toneInstruction = getToneInstructions(effectiveTone);
      const readingLevelInstruction = getReadingLevelInstructions(strategy.readingLevel);

      const prompt = `You are an expert proposal writer for government contracts. Generate a comprehensive "${sectionName}" section for this proposal.

**PROPOSAL DETAILS:**
- Name: ${proposalData.proposal_name}
- Type: ${proposalData.project_type}
- Agency: ${proposalData.agency_name}
- Project: ${proposalData.project_title}
- Prime: ${proposalData.prime_contractor_name}

**WRITING INSTRUCTIONS:**
- Target word count: ${wordCount} words
- Tone: ${toneInstruction}
- Reading Level: ${readingLevelInstruction}
${strategy.requestCitations ? '- Include citations to source materials where applicable' : ''}

**SECTION:** ${sectionName}

**REQUIREMENTS:**
1. Review the reference documents and solicitation requirements provided
2. Extract relevant information, writing style, and tone from reference docs
3. Generate compelling content that addresses the solicitation requirements
4. Use specific examples and details from the reference materials
5. Match the professional tone specified above
6. Make it persuasive and focused on value to the government
7. Target the specified word count

**IMPORTANT:** 
- Write in a professional, government proposal style
- Be specific and detailed
- Include concrete examples where possible
- Focus on benefits to the agency
- Use active voice and clear language
${strategy.requestCitations ? '- Cite sources in [Source: Document Name] format when using specific information' : ''}

Generate the section content now in HTML format (use <p>, <h3>, <ul>, <li>, <strong> tags):`;

      const content = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: fileUrls.length > 0 ? fileUrls.slice(0, 10) : undefined,
        response_json_schema: undefined
      });

      await trackTokenUsage(wordCount * 4, prompt, content);

      const existing = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId,
        section_id: sectionId
      });

      const wordCountActual = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;

      if (existing.length > 0) {
        await createVersionHistory(sectionId, sectionName, content, existing[0].content ? "ai_regenerated" : "ai_generated");

        await base44.entities.ProposalSection.update(existing[0].id, {
          content,
          word_count: wordCountActual,
          status: "ai_generated"
        });
      } else {
        const newSection = await base44.entities.ProposalSection.create({
          proposal_id: proposalId,
          section_id: sectionId,
          section_name: sectionName,
          section_type: "custom",
          content,
          word_count: wordCountActual,
          status: "ai_generated",
          order: 0
        });

        await createVersionHistory(sectionId, sectionName, content, "initial_creation");
      }

      setSectionContent(prev => ({ ...prev, [sectionId]: content }));
      queryClient.invalidateQueries({ queryKey: ['proposal-sections'] });
      
    } catch (error) {
      console.error("Error generating section:", error);
      alert("Error generating section. Please try again.");
    }

    setIsGenerating(prev => ({ ...prev, [sectionId]: false }));
  };

  const handleContentChange = (sectionId, content) => {
    setSectionContent(prev => ({ ...prev, [sectionId]: content }));
  };

  const saveContent = async (sectionId, sectionName, content) => {
    if (!proposalId) return;

    try {
      const existing = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId,
        section_id: sectionId
      });

      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;

      if (existing.length > 0) {
        await createVersionHistory(sectionId, sectionName, content, "user_edit", "Manual edit by user");

        await base44.entities.ProposalSection.update(existing[0].id, {
          content,
          word_count: wordCount,
          status: "reviewed"
        });
      } else {
        const newSection = await base44.entities.ProposalSection.create({
          proposal_id: proposalId,
          section_id: sectionId,
          section_name: sectionName,
          section_type: "custom",
          content,
          word_count: wordCount,
          status: "draft",
          order: 0
        });

        await createVersionHistory(sectionId, sectionName, content, "initial_creation");
      }

      alert("✓ Content saved!");
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Error saving content.");
    }
  };

  const saveAll = async () => {
    for (const [sectionId, content] of Object.entries(sectionContent)) {
      if (content) {
        const section = activeSections.find(s => s.id === sectionId) || 
                        activeSections.flatMap(s => s.subsections).find(s => `${s.parent_id}_${s.id}` === sectionId);

        if (section) {
          const sectionName = section.id.includes('_') ? section.id.split('_').pop() : section.id;
          await saveContent(sectionId, sectionName, content);
        }
      }
    }
    alert("✓ All sections saved!");
  };

  const handleUploadContext = async (sectionId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.docx,.txt';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        await base44.entities.SolicitationDocument.create({
          proposal_id: proposalId,
          organization_id: currentOrgId,
          document_type: "reference",
          file_name: file.name,
          file_url: file_url,
          file_size: file.size,
          description: `Context for section: ${sectionId}`
        });

        alert(`✓ Context file "${file.name}" uploaded! It will be used when regenerating this section.`);
      } catch (error) {
        console.error("Error uploading context:", error);
        alert("Error uploading file.");
      }
    };
    input.click();
  };

  const loadHistory = async (sectionId) => {
    setLoadingHistory(true);
    try {
      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId,
        section_id: sectionId
      });

      if (sections.length === 0) {
        setHistoryRecords([]);
        return;
      }

      const history = await base44.entities.ProposalSectionHistory.filter({
        proposal_section_id: sections[0].id
      }, '-version_number');

      setHistoryRecords(history);
    } catch (error) {
      console.error("Error loading history:", error);
      setHistoryRecords([]);
    }
    setLoadingHistory(false);
  };

  const handleViewHistory = (sectionId, sectionName) => {
    setSelectedSectionForHistory({ id: sectionId, name: sectionName });
    setShowHistoryDialog(true);
    loadHistory(sectionId);
  };

  const handleViewComparison = (sectionId, sectionName) => {
    setSelectedSectionForComparison({ id: sectionId, name: sectionName });
    setShowComparisonDialog(true);
  };

  const handleRestoreVersion = async (historyRecord) => {
    if (!confirm(`Restore version ${historyRecord.version_number}? This will replace the current content.`)) {
      return;
    }

    try {
      await createVersionHistory(
        selectedSectionForHistory.id,
        selectedSectionForHistory.name,
        historyRecord.content,
        "restored_from_history",
        `Restored from version ${historyRecord.version_number}`
      );

      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId,
        section_id: selectedSectionForHistory.id
      });

      if (sections.length > 0) {
        await base44.entities.ProposalSection.update(sections[0].id, {
          content: historyRecord.content,
          word_count: historyRecord.word_count,
          status: "reviewed"
        });
      }

      setSectionContent(prev => ({ ...prev, [selectedSectionForHistory.id]: historyRecord.content }));
      
      await loadHistory(selectedSectionForHistory.id);
      
      alert("✓ Version restored successfully!");
    } catch (error) {
      console.error("Error restoring version:", error);
      alert("Error restoring version.");
    }
  };

  if (!strategy) {
    return (
      <Card className="border-none shadow-xl">
        <CardContent className="py-12 text-center">
          <PenTool className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 mb-4">Please complete Phase 5 (Strategy) first to configure your proposal structure.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <PenTool className="w-6 h-6 text-green-600" />
            Proposal Writer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {activeSections.map((section) => (
                <div key={section.id} className="space-y-4">
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{section.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{section.wordCount} words target</Badge>
                            <Badge variant="secondary">{section.tone === "default" ? strategy.tone : section.tone}</Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => findContentSuggestions(section.id, section.id.replace(/_/g, ' '))}
                          >
                            <Lightbulb className="w-4 h-4 mr-2" />
                            Suggest Content
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewComparison(section.id, section.id.replace(/_/g, ' '))}
                          >
                            <GitCompare className="w-4 h-4 mr-2" />
                            Compare
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewHistory(section.id, section.id.replace(/_/g, ' '))}
                          >
                            <History className="w-4 h-4 mr-2" />
                            History
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ReactQuill
                        value={sectionContent[section.id] || ""}
                        onChange={(content) => handleContentChange(section.id, content)}
                        theme="snow"
                        className="bg-white min-h-[300px]"
                      />
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUploadContext(section.id)}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Context
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => autoDraft(section.id, section.id.replace(/_/g, ' '), section.wordCount, section.tone)}
                          disabled={isGenerating[section.id]}
                        >
                          {isGenerating[section.id] ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          {sectionContent[section.id] ? 'Regenerate' : 'Auto-Draft'}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => saveContent(section.id, section.id, sectionContent[section.id])}
                        >
                          Save Section
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Subsections */}
                  {section.subsections && section.subsections.map((sub) => (
                    <Card key={sub.id} className="ml-8 border-slate-300">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-base">{sub.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{sub.wordCount} words</Badge>
                              <Badge variant="secondary" className="text-xs">{sub.tone === "default" ? strategy.tone : sub.tone}</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => findContentSuggestions(`${section.id}_${sub.id}`, sub.id.replace(/_/g, ' '))}
                            >
                              <Lightbulb className="w-4 h-4 mr-2" />
                              Suggest
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewComparison(`${section.id}_${sub.id}`, sub.id.replace(/_/g, ' '))}
                            >
                              <GitCompare className="w-4 h-4 mr-2" />
                              Compare
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewHistory(`${section.id}_${sub.id}`, sub.id.replace(/_/g, ' '))}
                            >
                              <History className="w-4 h-4 mr-2" />
                              History
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ReactQuill
                          value={sectionContent[`${section.id}_${sub.id}`] || ""}
                          onChange={(content) => handleContentChange(`${section.id}_${sub.id}`, content)}
                          theme="snow"
                          className="bg-white min-h-[250px]"
                        />
                        
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUploadContext(`${section.id}_${sub.id}`)}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Context
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => autoDraft(`${section.id}_${sub.id}`, sub.id.replace(/_/g, ' '), sub.wordCount, sub.tone, true)}
                            disabled={isGenerating[`${section.id}_${sub.id}`]}
                          >
                            {isGenerating[`${section.id}_${sub.id}`] ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-2" />
                            )}
                            Auto-Draft
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-6">
                <AIWritingAssistant
                  content={sectionContent[activeSections[0]?.id] || ""}
                  onApplySuggestion={(newContent) => {
                    if (activeSections[0]) {
                      handleContentChange(activeSections[0].id, newContent);
                    }
                  }}
                  sectionName={activeSections[0]?.id.replace(/_/g, ' ')}
                />
                <CollaborationPanel proposalId={proposalId} />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-6 border-t">
            <Button onClick={saveAll} size="lg" className="flex-1">
              Save All Sections
            </Button>
            <Button 
              size="lg" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                saveAll().then(() => {
                  const event = new CustomEvent('navigateToPhase', { detail: 'phase7' });
                  window.dispatchEvent(event);
                });
              }}
            >
              Continue to Finalize
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Suggestions Panel */}
      <Dialog open={showSuggestionsPanel} onOpenChange={setShowSuggestionsPanel}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              Suggested Content from Library
            </DialogTitle>
            <DialogDescription>
              Relevant boilerplate content you can insert into this section
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Lightbulb className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p className="mb-2">No relevant content found</p>
                <p className="text-sm text-slate-400">Create boilerplate content in the Resources page to get suggestions here</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-sm text-blue-900">
                    Found {suggestions.length} relevant pieces of content from your library
                  </AlertDescription>
                </Alert>

                {suggestions.map((resource) => (
                  <Card key={resource.id} className="border-slate-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle className="text-base">{resource.title}</CardTitle>
                            <Badge variant="secondary" className="capitalize text-xs">
                              {resource.content_category?.replace(/_/g, ' ')}
                            </Badge>
                            {resource.word_count && (
                              <Badge variant="outline" className="text-xs">
                                {resource.word_count} words
                              </Badge>
                            )}
                          </div>
                          
                          {resource.relevance_reason && (
                            <Alert className="bg-amber-50 border-amber-200 mt-2">
                              <AlertDescription className="text-xs text-amber-900">
                                <strong>Why this is relevant:</strong> {resource.relevance_reason}
                              </AlertDescription>
                            </Alert>
                          )}

                          {resource.tags && resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {resource.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => insertBoilerplate(resource, currentSectionId)}
                          className="ml-4"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Insert
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="prose prose-sm max-w-none text-slate-700 p-3 bg-slate-50 rounded border line-clamp-4"
                        dangerouslySetInnerHTML={{ __html: resource.boilerplate_content }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuggestionsPanel(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Version Comparison Dialog */}
      <Dialog open={showComparisonDialog} onOpenChange={setShowComparisonDialog}>
        <DialogContent className="max-w-7xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-blue-600" />
              Version Comparison: {selectedSectionForComparison?.name}
            </DialogTitle>
            <DialogDescription>
              Compare different versions side-by-side and restore any previous version
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[70vh]">
            {selectedSectionForComparison && (
              <VersionComparison
                sectionId={selectedSectionForComparison.id}
                sectionName={selectedSectionForComparison.name}
                proposalId={proposalId}
                onRestore={handleRestoreVersion}
                currentContent={sectionContent[selectedSectionForComparison.id]}
              />
            )}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComparisonDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simple History Viewer Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Version History: {selectedSectionForHistory?.name}</DialogTitle>
            <DialogDescription>
              View and restore previous versions of this section
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[500px] pr-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <History className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>No version history yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyRecords.map((record) => (
                  <Card key={record.id} className="border-slate-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">Version {record.version_number}</Badge>
                            <Badge className={
                              record.change_type === 'ai_generated' ? 'bg-purple-100 text-purple-700' :
                              record.change_type === 'ai_regenerated' ? 'bg-indigo-100 text-indigo-700' :
                              record.change_type === 'user_edit' ? 'bg-blue-100 text-blue-700' :
                              record.change_type === 'restored_from_history' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            }>
                              {record.change_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            {record.changed_by_user_name} • {new Date(record.created_date).toLocaleString()} • {record.word_count} words
                          </p>
                          {record.change_summary && (
                            <p className="text-sm text-slate-500 mt-1">{record.change_summary}</p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreVersion(record)}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Restore
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div 
                        className="prose prose-sm max-w-none text-slate-700 p-3 bg-slate-50 rounded border"
                        dangerouslySetInnerHTML={{ __html: record.content }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
