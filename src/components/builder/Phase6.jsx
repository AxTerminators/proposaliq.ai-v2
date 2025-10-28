import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { hasPermission, logActivity } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  PenTool, 
  Sparkles, 
  Save,
  Loader2,
  Upload,
  FileText,
  Lock
} from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Phase6({ proposalData, setProposalData, proposalId, user }) {
  const queryClient = useQueryClient();
  const [strategy, setStrategy] = useState(null);
  const [activeSections, setActiveSections] = useState([]);
  const [isGenerating, setIsGenerating] = useState({});
  const [sectionContent, setSectionContent] = useState({});
  const [currentOrgId, setCurrentOrgId] = useState(null);

  useEffect(() => {
    const loadStrategy = async () => {
      if (!proposalId) return;
      
      try {
        const strategyData = await base44.entities.ProposalSection.filter({
          proposal_id: proposalId,
          section_type: "strategy"
        });
        
        if (strategyData.length > 0) {
          const parsedStrategy = typeof strategyData[0].content === 'string' 
            ? JSON.parse(strategyData[0].content)
            : strategyData[0].content;
          setStrategy(parsedStrategy);
          
          const sections = [];
          parsedStrategy.outline?.forEach((section, idx) => {
            sections.push({
              id: `section-${idx}`,
              name: section.section_name,
              wordCount: section.word_count || 500,
              tone: section.tone || 'professional'
            });
            
            section.subsections?.forEach((sub, subIdx) => {
              sections.push({
                id: `section-${idx}-sub-${subIdx}`,
                name: `${section.section_name} - ${sub.subsection_name}`,
                wordCount: sub.word_count || 250,
                tone: sub.tone || 'professional',
                isSubsection: true
              });
            });
          });
          
          setActiveSections(sections);
          
          const existing = await base44.entities.ProposalSection.filter({
            proposal_id: proposalId,
            section_type: "custom"
          });
          
          const contentMap = {};
          existing.forEach(sec => {
            contentMap[sec.section_id] = sec.content;
          });
          setSectionContent(contentMap);
        }

        const orgs = await base44.entities.Organization.filter(
          { created_by: user?.email || proposalData.created_by },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setCurrentOrgId(orgs[0].id);
        }
      } catch (error) {
        console.error("Error loading strategy:", error);
      }
    };
    
    loadStrategy();
  }, [proposalId, user, proposalData]);

  const trackTokenUsage = async (tokensUsed, prompt, response) => {
    try {
      if (currentOrgId) {
        await base44.entities.TokenUsage.create({
          organization_id: currentOrgId,
          user_email: user?.email,
          feature_type: "auto_draft",
          tokens_used: tokensUsed,
          llm_provider: "gemini",
          prompt: prompt?.substring(0, 500),
          response_preview: response?.substring(0, 200),
          cost_estimate: (tokensUsed / 1000000) * 0.5
        });

        const subs = await base44.entities.Subscription.filter({ organization_id: currentOrgId }, '-created_date', 1);
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

  const autoDraft = async (sectionId, sectionName, wordCount, tone, isSubsection = false) => {
    if (!proposalId || !currentOrgId) {
      alert("Please save the proposal first");
      return;
    }

    // PERMISSION CHECK: Verify user can access AI features
    if (!user || !hasPermission(user, 'can_access_ai_features')) {
      alert("You don't have permission to use AI features. Please contact your administrator.");
      return;
    }

    setIsGenerating(prev => ({ ...prev, [sectionId]: true }));

    try {
      const refDocs = await base44.entities.ProposalResource.filter({
        proposal_id: proposalId,
        resource_type: "reference_document"
      });

      const solDocs = await base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId
      });

      const fileUrls = [
        ...refDocs.map(doc => doc.file_url),
        ...solDocs.map(doc => doc.document_url)
      ].filter(Boolean);

      const prompt = `You are an expert proposal writer. Write a compelling ${sectionName} section for a government proposal.

Requirements:
- Target word count: ${wordCount} words
- Tone: ${tone}
- Proposal: ${proposalData.proposal_name}
- Agency: ${proposalData.agency_name}
- Project Type: ${proposalData.project_type}

Strategy context:
${JSON.stringify(strategy, null, 2)}

Write the content in a professional, persuasive manner that addresses the requirements and demonstrates capability. Use specific examples and quantifiable results where possible.

Return ONLY the section content, no additional commentary.`;

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

      if (existing.length > 0) {
        await base44.entities.ProposalSection.update(existing[0].id, {
          content,
          word_count: content.split(/\s+/).length,
          status: "ai_generated"
        });
      } else {
        await base44.entities.ProposalSection.create({
          proposal_id: proposalId,
          section_id: sectionId,
          section_name: sectionName,
          section_type: "custom",
          content,
          word_count: content.split(/\s+/).length,
          status: "ai_generated",
          order: 0
        });
      }

      // Log activity
      await logActivity({
        user,
        organizationId: currentOrgId,
        actionType: "create",
        resourceType: "section",
        resourceId: sectionId,
        resourceName: sectionName,
        details: `AI generated section: ${sectionName} (${wordCount} words)`
      });

      setSectionContent(prev => ({ ...prev, [sectionId]: content }));
      queryClient.invalidateQueries({ queryKey: ['proposal-sections'] });
      
    } catch (error) {
      console.error("Error generating section:", error);
      alert("Error generating section. Please try again.");
    }

    setIsGenerating(prev => ({ ...prev, [sectionId]: false }));
  };

  const handleContentChange = (sectionId, value) => {
    setSectionContent(prev => ({ ...prev, [sectionId]: value }));
  };

  const saveContent = async (sectionId, sectionName) => {
    try {
      const content = sectionContent[sectionId] || "";
      
      const existing = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId,
        section_id: sectionId
      });

      if (existing.length > 0) {
        await base44.entities.ProposalSection.update(existing[0].id, {
          content,
          word_count: content.split(/\s+/).length,
          status: "draft"
        });
      } else {
        await base44.entities.ProposalSection.create({
          proposal_id: proposalId,
          section_id: sectionId,
          section_name: sectionName,
          section_type: "custom",
          content,
          word_count: content.split(/\s+/).length,
          status: "draft",
          order: 0
        });
      }

      if (user && currentOrgId) {
        await logActivity({
          user,
          organizationId: currentOrgId,
          actionType: "edit",
          resourceType: "section",
          resourceId: sectionId,
          resourceName: sectionName,
          details: `Manually saved section: ${sectionName}`
        });
      }

      alert("Section saved!");
      queryClient.invalidateQueries({ queryKey: ['proposal-sections'] });
    } catch (error) {
      console.error("Error saving content:", error);
    }
  };

  const saveAll = async () => {
    for (const section of activeSections) {
      if (sectionContent[section.id]) {
        await saveContent(section.id, section.name);
      }
    }
    alert("All sections saved!");
  };

  const handleUploadContext = async (files) => {
    if (!proposalId) {
      alert("Please save the proposal first");
      return;
    }

    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        await base44.entities.ProposalResource.create({
          proposal_id: proposalId,
          organization_id: currentOrgId,
          resource_type: "reference_document",
          file_name: file.name,
          file_url: file_url,
          file_size: file.size,
          entity_type: "proposal"
        });

        if (user && currentOrgId) {
          await logActivity({
            user,
            organizationId: currentOrgId,
            actionType: "upload",
            resourceType: "document",
            resourceId: file_url,
            resourceName: file.name,
            details: `Uploaded reference document: ${file.name}`
          });
        }
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }
    alert("Files uploaded successfully!");
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

  const hasAIAccess = user && hasPermission(user, 'can_access_ai_features');

  return (
    <div className="space-y-6">
      {!hasAIAccess && (
        <Alert className="border-amber-300 bg-amber-50">
          <Lock className="w-4 h-4" />
          <AlertDescription>
            Your role ({user?.user_role || 'viewer'}) does not allow AI content generation. You can still edit sections manually. Contact your administrator for AI access.
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-none shadow-xl">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-blue-600" />
            Proposal Writer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.xlsx"
                onChange={(e) => handleUploadContext(Array.from(e.target.files))}
                className="hidden"
                id="context-upload"
              />
              <label htmlFor="context-upload">
                <Button asChild variant="outline">
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Reference Docs
                  </span>
                </Button>
              </label>
            </div>
            <Button onClick={saveAll} variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save All Sections
            </Button>
          </div>

          <div className="space-y-6">
            {activeSections.map((section) => (
              <Card key={section.id} className={section.isSubsection ? "ml-8 border-l-4 border-l-blue-200" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{section.name}</h3>
                      <p className="text-sm text-slate-500">
                        Target: {section.wordCount} words • Tone: {section.tone}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => autoDraft(section.id, section.name, section.wordCount, section.tone, section.isSubsection)}
                        disabled={isGenerating[section.id] || !hasAIAccess}
                        className="bg-gradient-to-r from-purple-600 to-blue-600"
                      >
                        {isGenerating[section.id] ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : hasAIAccess ? (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Auto-Draft
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            No Access
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveContent(section.id, section.name)}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ReactQuill
                    theme="snow"
                    value={sectionContent[section.id] || ""}
                    onChange={(value) => handleContentChange(section.id, value)}
                    className="bg-white"
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link'],
                        ['clean']
                      ]
                    }}
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Current word count: {(sectionContent[section.id] || "").split(/\s+/).filter(Boolean).length}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}