
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Lightbulb, Sparkles, Settings, Loader2, ChevronUp, ChevronDown, Target, Award } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CompetitorAnalysis from "./CompetitorAnalysis";
import WinThemeGenerator from "./WinThemeGenerator";

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

export default function Phase5({ proposalData, setProposalData, proposalId, onSaveAndGoToPipeline }) {
  const [strategy, setStrategy] = useState({
    tone: "clear",
    readingLevel: "government_plain",
    requestCitations: false,
    aiModel: "gemini",
    temperature: 0.70,
    topP: 0.70,
    maxTokens: 2048,
    sections: {},
    winThemes: null
  });
  
  const [isLoadingSuggestWordCount, setIsLoadingSuggestWordCount] = useState(false);
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
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

    const initialSections = {};
    PROPOSAL_SECTIONS.forEach(section => {
      initialSections[section.id] = {
        included: true,
        tone: "clear", // Changed from "default" to "clear"
        wordCount: section.defaultWordCount,
        subsections: {}
      };
      section.subsections.forEach(sub => {
        initialSections[section.id].subsections[sub.id] = {
          included: true,
          tone: "clear", // Changed from "default" to "clear"
          wordCount: sub.defaultWordCount
        };
      });
    });
    setStrategy(prev => ({ ...prev, sections: initialSections }));
  }, []);

  const suggestWordCounts = async () => {
    setIsLoadingSuggestWordCount(true);
    try {
      const prompt = `Based on this ${proposalData.project_type} for ${proposalData.agency_name}, suggest optimal word counts for each proposal section. Consider government contracting standards and the complexity of: ${proposalData.project_title}.

Return JSON with section IDs and recommended word counts.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            sections: {
              type: "object",
              additionalProperties: { type: "number" }
            }
          }
        }
      });

      const updatedSections = { ...strategy.sections };
      Object.keys(result.sections || {}).forEach(sectionId => {
        if (updatedSections[sectionId]) {
          updatedSections[sectionId].wordCount = result.sections[sectionId];
        }
      });
      setStrategy(prev => ({ ...prev, sections: updatedSections }));
      alert("✓ AI suggested word counts applied!");
    } catch (error) {
      console.error("Error suggesting word counts:", error);
      alert("Error getting AI suggestions. Please try again.");
    }
    setIsLoadingSuggestWordCount(false);
  };

  const suggestStrategy = async () => {
    setIsLoadingStrategy(true);
    try {
      const prompt = `Develop win themes and strategic recommendations for this proposal:
- Agency: ${proposalData.agency_name}
- Project: ${proposalData.project_title}
- Type: ${proposalData.project_type}
- Prime: ${proposalData.prime_contractor_name}

Provide 3-5 win themes with specific strategies tied to evaluation factors.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            win_themes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  theme: { type: "string" },
                  strategy: { type: "string" },
                  evaluation_tie: { type: "string" }
                }
              }
            }
          }
        }
      });

      setStrategy(prev => ({ ...prev, winThemes: result.win_themes }));
    } catch (error) {
      console.error("Error suggesting strategy:", error);
      alert("Error generating strategy. Please try again.");
    }
    setIsLoadingStrategy(false);
  };

  const saveStrategy = async () => {
    if (!proposalId) return;
    
    try {
      await base44.entities.Proposal.update(proposalId, {
        strategy_config: JSON.stringify(strategy)
      });
      alert("✓ Strategy saved!");
    } catch (error) {
      console.error("Error saving strategy:", error);
      alert("Error saving strategy.");
    }
  };

  const updateSubsection = (sectionId, subId, field, value) => {
    setStrategy(prev => {
      const newSections = { ...prev.sections };
      if (!newSections[sectionId]) {
        newSections[sectionId] = { included: true, tone: "clear", wordCount: 0, subsections: {} };
      }
      if (!newSections[sectionId].subsections) {
        newSections[sectionId].subsections = {};
      }
      if (!newSections[sectionId].subsections[subId]) {
        newSections[sectionId].subsections[subId] = { included: true, tone: "clear", wordCount: 0 };
      }
      newSections[sectionId].subsections[subId] = {
        ...newSections[sectionId].subsections[subId],
        [field]: value
      };
      return { ...prev, sections: newSections };
    });
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Phase 5: Comprehensive Strategy</CardTitle>
        <CardDescription>
          Develop your competitive strategy, win themes, and proposal structure
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="competitors">
              <Target className="w-4 h-4 mr-2" />
              Competitors
            </TabsTrigger>
            <TabsTrigger value="themes">
              <Award className="w-4 h-4 mr-2" />
              Win Themes
            </TabsTrigger>
            <TabsTrigger value="sections">
              <Lightbulb className="w-4 h-4 mr-2" />
              Sections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={suggestWordCounts}
                disabled={isLoadingSuggestWordCount}
                variant="outline"
              >
                {isLoadingSuggestWordCount ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Suggest Word Counts
              </Button>

              <Button
                onClick={suggestStrategy}
                disabled={isLoadingStrategy}
                variant="outline"
              >
                {isLoadingStrategy ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="w-4 h-4 mr-2" />
                )}
                Suggest Strategy
              </Button>

              <Button
                onClick={() => setShowAISettings(!showAISettings)}
                variant="outline"
              >
                <Settings className="w-4 h-4 mr-2" />
                AI Model Settings
              </Button>
            </div>

            {showAISettings && (
              <Card className="bg-slate-50 border-slate-300">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>AI Model</Label>
                      <Select
                        value={strategy.aiModel}
                        onValueChange={(value) => setStrategy(prev => ({ ...prev, aiModel: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gemini">Google Gemini (Most cost-effective)</SelectItem>
                          <SelectItem value="claude">Anthropic Claude (Best for writing)</SelectItem>
                          <SelectItem value="chatgpt">OpenAI ChatGPT (Balanced performance)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Temperature: {strategy.temperature.toFixed(2)}</Label>
                        <span className="text-xs text-slate-500">Controls randomness. Lower is more deterministic.</span>
                      </div>
                      <Slider
                        value={[strategy.temperature]}
                        onValueChange={([value]) => setStrategy(prev => ({ ...prev, temperature: value }))}
                        min={0}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Top-P: {strategy.topP.toFixed(2)}</Label>
                        <span className="text-xs text-slate-500">Nucleus sampling. Considers tokens with top_p probability mass.</span>
                      </div>
                      <Slider
                        value={[strategy.topP]}
                        onValueChange={([value]) => setStrategy(prev => ({ ...prev, topP: value }))}
                        min={0}
                        max={1}
                        step={0.01}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Max Output Tokens</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={strategy.maxTokens}
                          onChange={(e) => setStrategy(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                          className="w-32"
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setStrategy(prev => ({ ...prev, maxTokens: prev.maxTokens + 128 }))}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setStrategy(prev => ({ ...prev, maxTokens: Math.max(128, prev.maxTokens - 128) }))}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {strategy.winThemes && (
              <Card className="bg-amber-50 border-amber-300">
                <CardHeader>
                  <CardTitle className="text-lg">Suggested Win Themes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {strategy.winThemes.map((theme, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-lg border">
                        <h4 className="font-semibold text-amber-900 mb-1">{theme.theme}</h4>
                        <p className="text-sm text-slate-700 mb-2">{theme.strategy}</p>
                        <p className="text-xs text-slate-500">Ties to: {theme.evaluation_tie}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-4">Overall Drafting Style (default settings)</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select
                    value={strategy.tone}
                    onValueChange={(value) => setStrategy(prev => ({ ...prev, tone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clear">Clear (default)</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="concise">Concise</SelectItem>
                      <SelectItem value="courteous">Courteous</SelectItem>
                      <SelectItem value="confident">Confident</SelectItem>
                      <SelectItem value="persuasive">Persuasive</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="humanized">Humanized</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reading Level</Label>
                  <Select
                    value={strategy.readingLevel}
                    onValueChange={(value) => setStrategy(prev => ({ ...prev, readingLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="government_plain">Government Plain Language</SelectItem>
                      <SelectItem value="flesch_60">Flesch–Kincaid Grade Level ~10 (Flesch 60+)</SelectItem>
                      <SelectItem value="flesch_70">Flesch–Kincaid Grade Level ~8 (Flesch 70+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Citations</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      checked={strategy.requestCitations}
                      onCheckedChange={(checked) => setStrategy(prev => ({ ...prev, requestCitations: checked }))}
                    />
                    <label className="text-sm text-slate-700">
                      Request Citations (Ask model to cite sources if applicable)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={saveStrategy} className="w-full" size="lg">
              Save Strategy Configuration
            </Button>
          </TabsContent>

          <TabsContent value="competitors">
            <CompetitorAnalysis
              proposalId={proposalId}
              proposalData={proposalData}
              organizationId={currentOrgId}
            />
          </TabsContent>

          <TabsContent value="themes">
            <WinThemeGenerator
              proposalId={proposalId}
              proposalData={proposalData}
              organizationId={currentOrgId}
            />
          </TabsContent>

          <TabsContent value="sections" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Proposal Sections</h3>
              <p className="text-sm text-slate-600 mb-4">
                Select which sections to include in the next step, Proposal Writer, and optionally override the overall tone for each specific section or subsection.
              </p>

              <div className="space-y-4">
                {PROPOSAL_SECTIONS.map((section) => (
                  <Card key={section.id} className="border-slate-300">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Checkbox
                          checked={strategy.sections[section.id]?.included || false}
                          onCheckedChange={(checked) => {
                            setStrategy(prev => ({
                              ...prev,
                              sections: {
                                ...prev.sections,
                                [section.id]: { 
                                  ...prev.sections[section.id], 
                                  included: checked 
                                }
                              }
                            }));
                          }}
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900">{section.name}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={strategy.sections[section.id]?.tone || "clear"}
                            onValueChange={(value) => {
                              setStrategy(prev => ({
                                ...prev,
                                sections: {
                                  ...prev.sections,
                                  [section.id]: { 
                                    ...prev.sections[section.id], 
                                    tone: value 
                                  }
                                }
                              }));
                            }}
                          >
                            <SelectTrigger className="w-40"> {/* Changed w-32 to w-40 */}
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="clear">Clear (default)</SelectItem>
                              <SelectItem value="formal">Formal</SelectItem>
                              <SelectItem value="concise">Concise</SelectItem>
                              <SelectItem value="courteous">Courteous</SelectItem>
                              <SelectItem value="confident">Confident</SelectItem>
                              <SelectItem value="persuasive">Persuasive</SelectItem>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="humanized">Humanized</SelectItem>
                              <SelectItem value="conversational">Conversational</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={strategy.sections[section.id]?.wordCount || section.defaultWordCount}
                            onChange={(e) => {
                              setStrategy(prev => ({
                                ...prev,
                                sections: {
                                  ...prev.sections,
                                  [section.id]: { 
                                    ...prev.sections[section.id], 
                                    wordCount: parseInt(e.target.value) || 0
                                  }
                                }
                              }));
                            }}
                            className="w-24"
                            placeholder="Words"
                          />
                        </div>
                      </div>

                      {section.subsections && section.subsections.length > 0 && (
                        <div className="ml-8 space-y-2 mt-2 pt-2 border-t">
                          {section.subsections.map((sub) => (
                            <div key={sub.id} className="flex items-center gap-3">
                              <Checkbox
                                checked={strategy.sections[section.id]?.subsections?.[sub.id]?.included || false}
                                onCheckedChange={(checked) => updateSubsection(section.id, sub.id, 'included', checked)}
                              />
                              <span className="text-sm flex-1">{sub.name}</span>
                              <Select
                                value={strategy.sections[section.id]?.subsections?.[sub.id]?.tone || "clear"}
                                onValueChange={(value) => updateSubsection(section.id, sub.id, 'tone', value)}
                              >
                                <SelectTrigger className="w-40"> {/* Changed w-28 to w-40 */}
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="clear">Clear (default)</SelectItem>
                                  <SelectItem value="formal">Formal</SelectItem>
                                  <SelectItem value="concise">Concise</SelectItem>
                                  <SelectItem value="courteous">Courteous</SelectItem>
                                  <SelectItem value="confident">Confident</SelectItem>
                                  <SelectItem value="persuasive">Persuasive</SelectItem>
                                  <SelectItem value="professional">Professional</SelectItem>
                                  <SelectItem value="humanized">Humanized</SelectItem>
                                  <SelectItem value="conversational">Conversational</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                type="number"
                                value={strategy.sections[section.id]?.subsections?.[sub.id]?.wordCount || sub.defaultWordCount}
                                onChange={(e) => updateSubsection(section.id, sub.id, 'wordCount', parseInt(e.target.value) || 0)}
                                className="w-20"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Button onClick={saveStrategy} className="w-full" size="lg">
              Save Strategy Configuration
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>

      {onSaveAndGoToPipeline && (
        <div className="px-6 pb-6">
          <div className="flex justify-center pt-4 border-t">
            <Button
              variant="outline"
              onClick={onSaveAndGoToPipeline}
              className="bg-white hover:bg-slate-50"
            >
              Save and Go to Pipeline
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
