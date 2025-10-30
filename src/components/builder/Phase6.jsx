
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Sparkles,
  Save,
  Loader2,
  RefreshCw,
  FileCode,
  ChevronDown,
  ChevronRight,
  History,
  Mic,
  AlertCircle
} from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import SectionVersionHistory from "./SectionVersionHistory";
import AICollaborationAssistant from "../collaboration/AICollaborationAssistant";

const PROPOSAL_SECTIONS = [
  {
    id: "executive_summary",
    name: "Executive Summary",
    defaultWordCount: 500,
    subsections: []
  },
  {
    id: "volume_1_technical",
    name: "Volume I - Technical Approach",
    defaultWordCount: 3000,
    subsections: [
      { id: "technical_capability", name: "Technical Capability", defaultWordCount: 400 },
      { id: "understanding_problem", name: "Understanding the Problem", defaultWordCount: 400 },
      { id: "proposed_methodology", name: "Proposed Methodology and Solution", defaultWordCount: 600 },
      { id: "work_plan", name: "Work Plan", defaultWordCount: 500 },
      { id: "tools_technologies", name: "Tools and Technologies", defaultWordCount: 300 },
      { id: "standards_practices", name: "Standards and Practices", defaultWordCount: 300 },
      { id: "risk_management", name: "Risk Management", defaultWordCount: 400 },
      { id: "innovation_value", name: "Innovation and Value", defaultWordCount: 300 },
      { id: "innovation_discriminators", name: "Innovation Discriminators", defaultWordCount: 300 },
      { id: "benefits", name: "Benefits", defaultWordCount: 300 }
    ]
  },
  {
    id: "volume_1_management",
    name: "Volume I - Management Plan",
    defaultWordCount: 2500,
    subsections: [
      { id: "management_description", name: "Management Plan Description", defaultWordCount: 400 },
      { id: "management_flowchart", name: "Management Plan Flowchart", defaultWordCount: 200 },
      { id: "organizational_structure", name: "Organizational Structure", defaultWordCount: 300 },
      { id: "key_personnel", name: "Key Personnel", defaultWordCount: 300 },
      { id: "roles_responsibilities", name: "Roles and Responsibilities", defaultWordCount: 400 },
      { id: "subcontractor_integration", name: "Subcontractor Integration", defaultWordCount: 300 },
      { id: "project_control", name: "Project Control and Management Systems", defaultWordCount: 400 },
      { id: "schedule_management", name: "Schedule Management", defaultWordCount: 300 },
      { id: "cost_financial", name: "Cost and Financial Management", defaultWordCount: 300 },
      { id: "quality_assurance", name: "Quality Assurance (QA) / (QC)", defaultWordCount: 400 },
      { id: "communications_reporting", name: "Communications and Reporting Plan", defaultWordCount: 300 },
      { id: "internal_comms", name: "Internal Communications", defaultWordCount: 200 },
      { id: "external_comms", name: "External Communications", defaultWordCount: 200 }
    ]
  },
  {
    id: "volume_1_staffing",
    name: "Volume I - Staffing Plan",
    defaultWordCount: 1500,
    subsections: [
      { id: "recruiting_plan", name: "Recruiting Plan", defaultWordCount: 300 },
      { id: "retention_plan", name: "Retention Plan", defaultWordCount: 300 },
      { id: "training", name: "Training", defaultWordCount: 300 },
      { id: "resume_pm", name: "Resume of Program Manager", defaultWordCount: 200 },
      { id: "resume_proj", name: "Resume of Project Manager", defaultWordCount: 200 },
      { id: "resume_sme1", name: "Resume of SME 1", defaultWordCount: 200 },
      { id: "resume_sme2", name: "Resume of SME 2", defaultWordCount: 200 }
    ]
  },
  {
    id: "volume_3_past_performance",
    name: "Volume III - Past Performance",
    defaultWordCount: 2000,
    subsections: [
      { id: "contract_id", name: "Contract Identification", defaultWordCount: 200 },
      { id: "scope_objectives", name: "Scope and Objectives", defaultWordCount: 300 },
      { id: "relevance", name: "Relevance to Current Requirement", defaultWordCount: 300 },
      { id: "performance_outcomes", name: "Performance Outcomes and Results", defaultWordCount: 400 },
      { id: "key_personnel_involved", name: "Key Personnel Involved", defaultWordCount: 200 },
      { id: "customer_reference", name: "Customer Reference - POC", defaultWordCount: 200 },
      { id: "cpars", name: "CPARS / Evaluation Summary", defaultWordCount: 200 },
      { id: "role_contribution", name: "Role (Prime/Sub) and Contribution", defaultWordCount: 200 },
      { id: "risk_lessons", name: "Risk Mitigation and Lessons Learned", defaultWordCount: 300 }
    ]
  },
  {
    id: "quality_control_plan",
    name: "Quality Control Plan",
    defaultWordCount: 1800,
    subsections: [
      { id: "qc_org_roles", name: "QC Organization & Roles", defaultWordCount: 300 },
      { id: "qc_processes", name: "Quality Control Processes", defaultWordCount: 400 },
      { id: "metrics_monitoring", name: "Metrics and Performance Monitoring", defaultWordCount: 300 },
      { id: "inspections_audits", name: "Inspections and Audits", defaultWordCount: 300 },
      { id: "capa", name: "Corrective and Preventive Actions-CAPA", defaultWordCount: 300 },
      { id: "reporting_comms", name: "Reporting and Communication", defaultWordCount: 200 },
      { id: "continuous_improvement", name: "Continuous Improvement Program", defaultWordCount: 300 },
      { id: "documentation", name: "Documentation and Traceability", defaultWordCount: 200 }
    ]
  },
  {
    id: "transition_plan",
    name: "Transition Plan",
    defaultWordCount: 1500,
    subsections: [
      { id: "objectives_strategy", name: "Objectives & Strategy", defaultWordCount: 300 },
      { id: "phased_timeline", name: "Phased Timeline", defaultWordCount: 300 },
      { id: "staffing_key", name: "Staffing & Key Personnel", defaultWordCount: 300 },
      { id: "comms_plan", name: "Communications Plan", defaultWordCount: 200 },
      { id: "risk_mitigation", name: "Risk Management & Mitigation", defaultWordCount: 300 },
      { id: "performance_measurement", name: "Performance Measurement", defaultWordCount: 200 },
      { id: "deliverables", name: "Deliverables", defaultWordCount: 200 }
    ]
  },
  {
    id: "compliance",
    name: "Compliance",
    defaultWordCount: 1200,
    subsections: [
      { id: "safety_plan", name: "Safety Plan", defaultWordCount: 200 },
      { id: "quality_plan", name: "Quality Plan", defaultWordCount: 200 },
      { id: "insurance", name: "Insurance (GL, Cyber, etc)", defaultWordCount: 200 },
      { id: "bonding", name: "Bonding", defaultWordCount: 200 },
      { id: "cyber_cmmc", name: "Cyber / CMMC Requirements", defaultWordCount: 200 },
      { id: "facility_clearance", name: "Facility Clearance Requirements", defaultWordCount: 200 },
      { id: "socio_economic", name: "Socio-Economic Status/Certifications", defaultWordCount: 200 },
      { id: "small_business", name: "Small Business Plan", defaultWordCount: 200 }
    ]
  }
];

export default function Phase6({ proposalData, setProposalData, proposalId }) {
  const queryClient = useQueryClient();
  const [organization, setOrganization] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [sectionContent, setSectionContent] = useState({});
  const [selectedTones, setSelectedTones] = useState({});
  const [generatingSection, setGeneratingSection] = useState(null);
  const [savingSection, setSavingSection] = useState(null);
  const [showBoilerplateDialog, setShowBoilerplateDialog] = useState(false);
  const [currentSectionForBoilerplate, setCurrentSectionForBoilerplate] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistorySection, setVersionHistorySection] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        const orgs = await base44.entities.Organization.filter(
          { created_by: user.email },
          '-created_date',
          1
        );
        if (orgs.length > 0) {
          setOrganization(orgs[0]);
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

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['proposal-sections', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalSection.filter(
        { proposal_id: proposalId },
        'order'
      );
    },
    enabled: !!proposalId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['proposal-tasks', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalTask.filter({ proposal_id: proposalId });
    },
    enabled: !!proposalId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['proposal-comments', proposalId],
    queryFn: async () => {
      if (!proposalId) return [];
      return base44.entities.ProposalComment.filter({ proposal_id: proposalId });
    },
    enabled: !!proposalId,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => {
        const accesses = u.client_accesses || [];
        return accesses.some(a => a.organization_id === organization.id);
      });
    },
    enabled: !!organization?.id,
  });

  const { data: boilerplates = [] } = useQuery({
    queryKey: ['boilerplates', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      return base44.entities.ProposalResource.filter({
        organization_id: organization.id,
        resource_type: 'boilerplate_text'
      });
    },
    enabled: !!organization?.id && showBoilerplateDialog,
  });

  // Load existing content into state
  useEffect(() => {
    if (sections.length > 0) {
      const contentMap = {};
      sections.forEach(section => {
        contentMap[section.section_type] = section.content || "";
      });
      setSectionContent(contentMap);
    }
  }, [sections]);

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

  const createVersionHistory = async (sectionId, content, wordCount, changeType, changeSummary) => {
    if (!currentUser || !sectionId) return;

    try {
      const existingVersions = await base44.entities.ProposalSectionHistory.filter(
        { proposal_section_id: sectionId },
        '-version_number',
        1
      );
      
      const nextVersionNumber = existingVersions.length > 0 
        ? existingVersions[0].version_number + 1 
        : 1;

      await base44.entities.ProposalSectionHistory.create({
        proposal_section_id: sectionId,
        version_number: nextVersionNumber,
        content,
        changed_by_user_email: currentUser.email,
        changed_by_user_name: currentUser.full_name,
        change_summary: changeSummary,
        word_count: wordCount,
        change_type: changeType
      });
    } catch (error) {
      console.error("Error creating version history:", error);
    }
  };

  const generateSectionContent = async (sectionConfig, subsectionConfig = null, isRegenerate = false) => {
    if (!proposalId || !organization) {
      alert("Please save the proposal first");
      return;
    }

    const sectionKey = subsectionConfig 
      ? `${sectionConfig.id}_${subsectionConfig.id}`
      : sectionConfig.id;

    setGeneratingSection(sectionKey);

    try {
      // Gather context
      const [solicitationDocs, teamingPartners, resources, complianceReqs, winThemes, pastPerformance] = await Promise.all([
        base44.entities.SolicitationDocument.filter({
          proposal_id: proposalId,
          organization_id: organization.id
        }),
        base44.entities.TeamingPartner.filter({
          organization_id: organization.id
        }).then(partners => {
          const partnerIds = proposalData.teaming_partner_ids || [];
          return partners.filter(p => partnerIds.includes(p.id));
        }),
        base44.entities.ProposalResource.filter({
          organization_id: organization.id,
          resource_type: { $in: ['boilerplate_text', 'capability_statement', 'past_proposal'] }
        }),
        base44.entities.ComplianceRequirement.filter({
          proposal_id: proposalId,
          organization_id: organization.id
        }),
        base44.entities.WinTheme.filter({
          proposal_id: proposalId,
          organization_id: organization.id
        }),
        base44.entities.PastPerformance.filter({
          organization_id: organization.id
        }).then(pp => pp.slice(0, 5))
      ]);

      // Build context strings
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
        .map(req => `- ${req.requirement_id}: ${req.requirement_title}\n  Description: ${req.requirement_description}`)
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
      const sectionTone = selectedTones[sectionKey] || 
                         strategy?.sections?.[sectionConfig.id]?.tone || 
                         strategy?.tone || 
                         "clear";
      
      const readingLevel = strategy?.readingLevel || "government_plain";
      
      const targetWordCount = subsectionConfig
        ? (strategy?.sections?.[sectionConfig.id]?.subsections?.[subsectionConfig.id]?.wordCount || subsectionConfig.defaultWordCount)
        : (strategy?.sections?.[sectionConfig.id]?.wordCount || sectionConfig.defaultWordCount);

      const sectionName = subsectionConfig 
        ? `${sectionConfig.name} - ${subsectionConfig.name}`
        : sectionConfig.name;

      // Get existing content if regenerating
      const existingContent = isRegenerate ? (sectionContent[sectionKey] || "") : "";

      const prompt = `You are an expert proposal writer for government contracts. ${isRegenerate ? 'REGENERATE and IMPROVE' : 'Write'} a compelling ${sectionName} section for this proposal.

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

${isRegenerate && existingContent ? `
**EXISTING CONTENT TO IMPROVE:**
${existingContent}

**YOUR TASK:** Regenerate this section by improving the existing content. Keep what's good, enhance what's weak, add missing elements, and make it more compelling and persuasive.
` : ''}

**WRITING REQUIREMENTS:**
- Tone: ${sectionTone}
- Reading Level: ${readingLevel}
- Target Word Count: ${targetWordCount} words
${strategy?.requestCitations ? '- Include citations to source documents where applicable' : ''}

**YOUR TASK:**
Write a professional, persuasive ${sectionName} section that:
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

      const wordCount = result.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;

      // Update content in state
      setSectionContent(prev => ({
        ...prev,
        [sectionKey]: result
      }));

      // Save to database
      const existingSection = sections.find(s => s.section_type === sectionKey);

      if (existingSection) {
        await updateSectionMutation.mutateAsync({
          id: existingSection.id,
          data: {
            content: result,
            word_count: wordCount,
            status: 'ai_generated'
          }
        });
        
        await createVersionHistory(
          existingSection.id,
          result,
          wordCount,
          isRegenerate ? 'ai_regenerated' : 'ai_generated',
          `AI ${isRegenerate ? 'regenerated' : 'generated'} content for ${sectionName}`
        );
      } else {
        const newSection = await createSectionMutation.mutateAsync({
          proposal_id: proposalId,
          section_name: sectionName,
          section_type: sectionKey,
          content: result,
          word_count: wordCount,
          order: sections.length,
          status: 'ai_generated',
          ai_prompt_used: prompt.substring(0, 500)
        });
        
        await createVersionHistory(
          newSection.id,
          result,
          wordCount,
          'initial_creation',
          `Initial AI generation of ${sectionName}`
        );
      }

      alert(`✓ AI ${isRegenerate ? 'regenerated' : 'generated'} ${wordCount} words for ${sectionName}`);

    } catch (error) {
      console.error("Error generating content:", error);
      alert("Error generating content. Please try again.");
    } finally {
      setGeneratingSection(null);
    }
  };

  const handleSaveSection = async (sectionKey, sectionName) => {
    const content = sectionContent[sectionKey] || "";
    if (!content.trim()) {
      alert("Cannot save empty content");
      return;
    }

    setSavingSection(sectionKey);
    try {
      const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(w => w.length > 0).length;
      const existingSection = sections.find(s => s.section_type === sectionKey);

      if (existingSection) {
        await updateSectionMutation.mutateAsync({
          id: existingSection.id,
          data: {
            content,
            word_count: wordCount,
            status: 'reviewed'
          }
        });

        await createVersionHistory(
          existingSection.id,
          content,
          wordCount,
          'user_edit',
          'Manual content update'
        );
      } else {
        const newSection = await createSectionMutation.mutateAsync({
          proposal_id: proposalId,
          section_name: sectionName,
          section_type: sectionKey,
          content,
          word_count: wordCount,
          order: sections.length,
          status: 'draft'
        });

        await createVersionHistory(
          newSection.id,
          content,
          wordCount,
          'initial_creation',
          'Initial manual creation'
        );
      }

      alert("✓ Section saved successfully!");
    } catch (error) {
      console.error("Error saving section:", error);
      alert("Error saving section. Please try again.");
    } finally {
      setSavingSection(null);
    }
  };

  const handleInsertBoilerplate = (boilerplate) => {
    if (!currentSectionForBoilerplate) return;

    const existingContent = sectionContent[currentSectionForBoilerplate] || "";
    const newContent = existingContent 
      ? `${existingContent}\n\n${boilerplate.boilerplate_content}`
      : boilerplate.boilerplate_content;

    setSectionContent(prev => ({
      ...prev,
      [currentSectionForBoilerplate]: newContent
    }));

    setShowBoilerplateDialog(false);
    setCurrentSectionForBoilerplate(null);
  };

  const handleViewHistory = (sectionKey) => {
    const section = sections.find(s => s.section_type === sectionKey);
    if (section) {
      setVersionHistorySection(section);
      setShowVersionHistory(true);
    }
  };

  const handleVersionRestored = () => {
    queryClient.invalidateQueries({ queryKey: ['proposal-sections', proposalId] });
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const getIncludedSections = () => {
    if (!strategy?.sections) return PROPOSAL_SECTIONS;
    
    return PROPOSAL_SECTIONS.filter(section => {
      const sectionConfig = strategy.sections[section.id];
      return sectionConfig?.included !== false;
    }).map(section => ({
      ...section,
      subsections: section.subsections.filter(sub => {
        const subConfig = strategy.sections[section.id]?.subsections?.[sub.id];
        return subConfig?.included !== false;
      })
    }));
  };

  const includedSections = getIncludedSections();

  if (!proposalId || !organization) {
    return (
      <Card className="border-none shadow-xl">
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
          <p className="text-slate-600">Please complete Phase 1 and save your proposal before creating sections.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          Phase 6: AI-Powered Proposal Writer
        </CardTitle>
        <CardDescription>
          Generate and edit proposal sections and subsections with AI assistance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Collaboration Assistant */}
        {proposalId && organization && currentUser && (
          <AICollaborationAssistant
            proposal={{ id: proposalId, ...proposalData }}
            sections={sections}
            tasks={tasks}
            comments={comments}
            teamMembers={teamMembers}
            user={currentUser}
            organization={organization}
          />
        )}

        <Alert className="bg-indigo-50 border-indigo-200">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <AlertDescription>
            <p className="font-semibold text-indigo-900 mb-1">Section-by-Section AI Writing:</p>
            <ul className="text-sm text-indigo-800 space-y-1">
              <li>✓ Generate initial content for each section/subsection</li>
              <li>✓ Regenerate to improve existing content</li>
              <li>✓ Override tone per section</li>
              <li>✓ Insert boilerplate content</li>
              <li>✓ AI integrates boilerplate with regeneration</li>
            </ul>
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading sections...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {includedSections.map((section) => {
              const hasSubsections = section.subsections && section.subsections.length > 0;
              const isExpanded = expandedSections[section.id];

              return (
                <Card key={section.id} className="border-2">
                  <CardHeader
                    className={hasSubsections ? "cursor-pointer hover:bg-slate-50 transition-colors" : ""}
                    onClick={() => hasSubsections && toggleSection(section.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {hasSubsections && (
                          isExpanded ? 
                            <ChevronDown className="w-5 h-5 text-slate-500" /> : 
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                        )}
                        <CardTitle className="text-lg">{section.name}</CardTitle>
                        <Badge variant="outline">{section.defaultWordCount} words</Badge>
                      </div>
                    </div>
                  </CardHeader>

                  {!hasSubsections && (
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Button
                          size="sm"
                          onClick={() => generateSectionContent(section, null, false)}
                          disabled={generatingSection === section.id}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {generatingSection === section.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          AI Generate
                        </Button>

                        {sectionContent[section.id] && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateSectionContent(section, null, true)}
                              disabled={generatingSection === section.id}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Regenerate
                            </Button>

                            <Select
                              value={selectedTones[section.id] || "default"}
                              onValueChange={(value) => setSelectedTones(prev => ({ ...prev, [section.id]: value }))}
                            >
                              <SelectTrigger className="w-32">
                                <Mic className="w-4 h-4 mr-2" />
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">Default</SelectItem>
                                <SelectItem value="formal">Formal</SelectItem>
                                <SelectItem value="persuasive">Persuasive</SelectItem>
                                <SelectItem value="concise">Concise</SelectItem>
                                <SelectItem value="confident">Confident</SelectItem>
                                <SelectItem value="professional">Professional</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCurrentSectionForBoilerplate(section.id);
                                setShowBoilerplateDialog(true);
                              }}
                            >
                              <FileCode className="w-4 h-4 mr-2" />
                              Boilerplate
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewHistory(section.id)}
                            >
                              <History className="w-4 h-4 mr-2" />
                              History
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => handleSaveSection(section.id, section.name)}
                              disabled={savingSection === section.id}
                            >
                              {savingSection === section.id ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-2" />
                              )}
                              Save
                            </Button>
                          </>
                        )}
                      </div>

                      <ReactQuill
                        value={sectionContent[section.id] || ""}
                        onChange={(value) => setSectionContent(prev => ({ ...prev, [section.id]: value }))}
                        className="min-h-64 mb-12"
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
                    </CardContent>
                  )}

                  {hasSubsections && isExpanded && (
                    <CardContent className="space-y-6 pt-0">
                      {section.subsections.map((subsection) => {
                        const subsectionKey = `${section.id}_${subsection.id}`;

                        return (
                          <div key={subsection.id} className="border-l-4 border-indigo-300 pl-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-slate-900">{subsection.name}</h4>
                              <Badge variant="outline" className="text-xs">{subsection.defaultWordCount} words</Badge>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <Button
                                size="sm"
                                onClick={() => generateSectionContent(section, subsection, false)}
                                disabled={generatingSection === subsectionKey}
                                className="bg-indigo-600 hover:bg-indigo-700"
                              >
                                {generatingSection === subsectionKey ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Sparkles className="w-4 h-4 mr-2" />
                                )}
                                AI Generate
                              </Button>

                              {sectionContent[subsectionKey] && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => generateSectionContent(section, subsection, true)}
                                    disabled={generatingSection === subsectionKey}
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Regenerate
                                  </Button>

                                  <Select
                                    value={selectedTones[subsectionKey] || "default"}
                                    onValueChange={(value) => setSelectedTones(prev => ({ ...prev, [subsectionKey]: value }))}
                                  >
                                    <SelectTrigger className="w-32">
                                      <Mic className="w-4 h-4 mr-2" />
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="default">Default</SelectItem>
                                      <SelectItem value="formal">Formal</SelectItem>
                                      <SelectItem value="persuasive">Persuasive</SelectItem>
                                      <SelectItem value="concise">Concise</SelectItem>
                                      <SelectItem value="confident">Confident</SelectItem>
                                      <SelectItem value="professional">Professional</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setCurrentSectionForBoilerplate(subsectionKey);
                                      setShowBoilerplateDialog(true);
                                    }}
                                  >
                                    <FileCode className="w-4 h-4 mr-2" />
                                    Boilerplate
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewHistory(subsectionKey)}
                                  >
                                    <History className="w-4 h-4 mr-2" />
                                    History
                                  </Button>

                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveSection(subsectionKey, `${section.name} - ${subsection.name}`)}
                                    disabled={savingSection === subsectionKey}
                                  >
                                    {savingSection === subsectionKey ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Save className="w-4 h-4 mr-2" />
                                    )}
                                    Save
                                  </Button>
                                </>
                              )}
                            </div>

                            <ReactQuill
                              value={sectionContent[subsectionKey] || ""}
                              onChange={(value) => setSectionContent(prev => ({ ...prev, [subsectionKey]: value }))}
                              className="min-h-48 mb-12"
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
                        );
                      })}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Boilerplate Dialog */}
        <Dialog open={showBoilerplateDialog} onOpenChange={setShowBoilerplateDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Boilerplate Content</DialogTitle>
              <DialogDescription>
                Choose pre-approved content to insert into this section
              </DialogDescription>
            </DialogHeader>

            {boilerplates.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileCode className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <p>No boilerplate content available.</p>
                <p className="text-sm mt-2">Add boilerplate content in the Resources page.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {boilerplates.map((boilerplate) => (
                  <Card key={boilerplate.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleInsertBoilerplate(boilerplate)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{boilerplate.title}</h4>
                          {boilerplate.description && (
                            <p className="text-sm text-slate-600 mb-2">{boilerplate.description}</p>
                          )}
                          <div className="flex gap-2">
                            {boilerplate.content_category && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {boilerplate.content_category.replace(/_/g, ' ')}
                              </Badge>
                            )}
                            {boilerplate.word_count && (
                              <Badge variant="outline" className="text-xs">
                                {boilerplate.word_count} words
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div 
                        className="text-sm text-slate-700 line-clamp-3 mt-2 p-2 bg-slate-50 rounded"
                        dangerouslySetInnerHTML={{ __html: boilerplate.boilerplate_content?.substring(0, 200) + '...' }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBoilerplateDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Version History Dialog */}
        {versionHistorySection && (
          <SectionVersionHistory
            section={versionHistorySection}
            isOpen={showVersionHistory}
            onClose={() => {
              setShowVersionHistory(false);
              setVersionHistorySection(null);
            }}
            onVersionRestored={handleVersionRestored}
          />
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
