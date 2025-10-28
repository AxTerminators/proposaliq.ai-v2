
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenTool, Upload, Sparkles, Loader2, RefreshCw, Lock } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Alert, AlertDescription } from "@/components/ui/alert"; // Import Alert components

// Helper function for permission checks
const hasPermission = (user, permissionKey) => {
  if (!user || !user.user_role) {
    return false;
  }
  // This is a simplified example. In a real application, you would
  // likely fetch or define granular permissions for each role.
  // For 'can_access_ai_features', we'll assume 'admin' and 'editor' roles have it.
  const rolePermissions = {
    admin: ['can_access_ai_features', 'can_manage_users', 'can_edit_proposals'],
    editor: ['can_access_ai_features', 'can_edit_proposals'],
    contributor: ['can_edit_own_sections'],
    viewer: [],
  };
  return rolePermissions[user.user_role]?.includes(permissionKey) || false;
};

// Helper function to log activities
const logActivity = async ({ user, organizationId, actionType, resourceType, resourceId, resourceName, details }) => {
  try {
    if (!user || !organizationId || !actionType || !resourceType || !resourceId) {
      console.warn("Missing required fields for activity log.");
      return;
    }
    await base44.entities.ActivityLog.create({
      organization_id: organizationId,
      user_email: user.email,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_name: resourceName,
      details: details,
      created_date: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};


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
        // The user prop passed down should already contain this info,
        // but this part of the original code was fetching it directly.
        // Keeping it for consistency with the original `currentOrgId` logic.
        const currentUser = user || await base44.auth.me(); 
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
  }, [proposalId, user]); // Added user to dependencies

  const trackTokenUsage = async (tokens, prompt, response) => {
    try {
      const currentUser = user || await base44.auth.me(); // Ensure user data is available
      await base44.entities.TokenUsage.create({
        organization_id: currentOrgId,
        user_email: currentUser.email,
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

      // Save to database
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
        resourceType: "proposal_section", // Changed from "section" to "proposal_section" for clarity
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

      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;

      if (existing.length > 0) {
        await base44.entities.ProposalSection.update(existing[0].id, {
          content,
          word_count: wordCount,
          status: "reviewed"
        });
      } else {
        await base44.entities.ProposalSection.create({
          proposal_id: proposalId,
          section_id: sectionId,
          section_name: sectionName,
          section_type: "custom",
          content,
          word_count: wordCount,
          status: "draft",
          order: 0
        });
      }

      // Log activity for manual save
      await logActivity({
        user,
        organizationId: currentOrgId,
        actionType: "update",
        resourceType: "proposal_section",
        resourceId: sectionId,
        resourceName: sectionName,
        details: `Manually saved section: ${sectionName} (${wordCount} words)`
      });

      alert("✓ Content saved!");
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Error saving content.");
    }
  };

  const saveAll = async () => {
    for (const [sectionId, content] of Object.entries(sectionContent)) {
      if (content) {
        // Find the section (or subsection) data to get its name
        let sectionName = sectionId; // Default to sectionId
        const mainSection = activeSections.find(s => s.id === sectionId);
        if (mainSection) {
          sectionName = mainSection.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else {
          // Check if it's a subsection (e.g., "main_sub")
          const parts = sectionId.split('_');
          if (parts.length > 1) {
            const parentId = parts[0];
            const subId = parts.slice(1).join('_');
            const parentSection = activeSections.find(s => s.id === parentId);
            const subsection = parentSection?.subsections?.find(sub => sub.id === subId);
            if (subsection) {
              sectionName = subsection.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
          }
        }
        await saveContent(sectionId, sectionName, content);
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

        // Log activity for context upload
        await logActivity({
          user,
          organizationId: currentOrgId,
          actionType: "upload",
          resourceType: "solicitation_document",
          resourceId: file.name, // Use file name as a temporary resourceId, or file_url ID if available
          resourceName: `Context for section ${sectionId}`,
          details: `Uploaded context file "${file.name}" for section ${sectionId}`
        });

        alert(`✓ Context file "${file.name}" uploaded! It will be used when regenerating this section.`);
      } catch (error) {
        console.error("Error uploading context:", error);
        alert("Error uploading file.");
      }
    };
    input.click();
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

  // Check AI access permission for UI
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
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <PenTool className="w-6 h-6 text-green-600" />
            Proposal Writer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
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
                      disabled={!hasAIAccess} // Disable if no AI access
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Context
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => autoDraft(section.id, section.id.replace(/_/g, ' '), section.wordCount, section.tone)}
                      disabled={isGenerating[section.id] || !hasAIAccess} // Disable if generating or no AI access
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
                      onClick={() => saveContent(section.id, section.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), sectionContent[section.id])}
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
                        disabled={!hasAIAccess} // Disable if no AI access
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Context
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => autoDraft(`${section.id}_${sub.id}`, sub.id.replace(/_/g, ' '), sub.wordCount, sub.tone, true)}
                        disabled={isGenerating[`${section.id}_${sub.id}`] || !hasAIAccess} // Disable if generating or no AI access
                      >
                        {isGenerating[`${section.id}_${sub.id}`] ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Auto-Draft
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveContent(`${section.id}_${sub.id}`, sub.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), sectionContent[`${section.id}_${sub.id}`])}
                      >
                        Save Section
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}

          <div className="flex gap-4 pt-6 border-t">
            <Button onClick={saveAll} size="lg" className="flex-1">
              Save All Sections
            </Button>
            <Button 
              size="lg" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                saveAll().then(() => {
                  // Move to next phase
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
    </div>
  );
}
