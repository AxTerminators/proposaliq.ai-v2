import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Sparkles, Loader2 } from "lucide-react";

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

export default function Phase5SectionsModal({ open, onOpenChange, proposal }) {
  const [sections, setSections] = useState({});
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    // Initialize sections from proposal strategy or defaults
    if (proposal?.strategy_config) {
      try {
        const parsedStrategy = JSON.parse(proposal.strategy_config);
        if (parsedStrategy.sections) {
          setSections(parsedStrategy.sections);
          return;
        }
      } catch (error) {
        console.error("Error parsing strategy config:", error);
      }
    }

    // Initialize with defaults
    const initialSections = {};
    PROPOSAL_SECTIONS.forEach(section => {
      initialSections[section.id] = {
        included: true,
        tone: "clear",
        wordCount: section.defaultWordCount,
        subsections: {}
      };
      section.subsections.forEach(sub => {
        initialSections[section.id].subsections[sub.id] = {
          included: true,
          tone: "clear",
          wordCount: sub.defaultWordCount
        };
      });
    });
    setSections(initialSections);
  }, [proposal]);

  const suggestWordCounts = async () => {
    setIsLoadingSuggestions(true);
    try {
      const prompt = `Based on this ${proposal.project_type} for ${proposal.agency_name}, suggest optimal word counts for each proposal section. Consider government contracting standards and the complexity of: ${proposal.project_title}.

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

      const updatedSections = { ...sections };
      Object.keys(result.sections || {}).forEach(sectionId => {
        if (updatedSections[sectionId]) {
          updatedSections[sectionId].wordCount = result.sections[sectionId];
        }
      });
      setSections(updatedSections);
      alert("✓ AI suggested word counts applied!");
    } catch (error) {
      console.error("Error suggesting word counts:", error);
      alert("Error getting AI suggestions. Please try again.");
    }
    setIsLoadingSuggestions(false);
  };

  const updateSubsection = (sectionId, subId, field, value) => {
    setSections(prev => {
      const newSections = { ...prev };
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
      return newSections;
    });
  };

  const handleSave = async () => {
    if (!proposal?.id) return;
    
    try {
      // Get existing strategy config
      let existingStrategy = {};
      if (proposal.strategy_config) {
        try {
          existingStrategy = JSON.parse(proposal.strategy_config);
        } catch (error) {
          console.error("Error parsing existing strategy:", error);
        }
      }

      // Update with new sections
      const updatedStrategy = {
        ...existingStrategy,
        sections: sections
      };

      await base44.entities.Proposal.update(proposal.id, {
        strategy_config: JSON.stringify(updatedStrategy)
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving sections:", error);
      alert("Error saving section configuration.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Section Selection & Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Alert className="bg-blue-50 border-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <AlertDescription>
              <p className="font-semibold text-blue-900 mb-1">📄 Configure Proposal Sections</p>
              <p className="text-sm text-blue-800">
                Select which sections to include and optionally override the tone and word count for each section.
              </p>
            </AlertDescription>
          </Alert>

          <Button
            onClick={suggestWordCounts}
            disabled={isLoadingSuggestions}
            variant="outline"
            className="w-full"
          >
            {isLoadingSuggestions ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                AI is analyzing your proposal...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Suggest Optimal Word Counts with AI
              </>
            )}
          </Button>

          <div className="space-y-4">
            {PROPOSAL_SECTIONS.map((section) => (
              <Card key={section.id} className="border-slate-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Checkbox
                      checked={sections[section.id]?.included || false}
                      onCheckedChange={(checked) => {
                        setSections(prev => ({
                          ...prev,
                          [section.id]: { 
                            ...prev[section.id], 
                            included: checked 
                          }
                        }));
                      }}
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{section.name}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={sections[section.id]?.tone || "clear"}
                        onValueChange={(value) => {
                          setSections(prev => ({
                            ...prev,
                            [section.id]: { 
                              ...prev[section.id], 
                              tone: value 
                            }
                          }));
                        }}
                      >
                        <SelectTrigger className="w-40">
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
                        value={sections[section.id]?.wordCount || section.defaultWordCount}
                        onChange={(e) => {
                          setSections(prev => ({
                            ...prev,
                            [section.id]: { 
                              ...prev[section.id], 
                              wordCount: parseInt(e.target.value) || 0
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
                            checked={sections[section.id]?.subsections?.[sub.id]?.included || false}
                            onCheckedChange={(checked) => updateSubsection(section.id, sub.id, 'included', checked)}
                          />
                          <span className="text-sm flex-1">{sub.name}</span>
                          <Select
                            value={sections[section.id]?.subsections?.[sub.id]?.tone || "clear"}
                            onValueChange={(value) => updateSubsection(section.id, sub.id, 'tone', value)}
                          >
                            <SelectTrigger className="w-40">
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
                            value={sections[section.id]?.subsections?.[sub.id]?.wordCount || sub.defaultWordCount}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Section Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}