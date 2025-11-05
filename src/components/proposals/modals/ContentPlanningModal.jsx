import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTION_LIBRARY = [
  {
    id: "executive_summary",
    name: "Executive Summary",
    category: "Required",
    defaultWordCount: 500,
    description: "High-level overview for decision-makers"
  },
  {
    id: "technical_approach",
    name: "Technical Approach",
    category: "Required",
    defaultWordCount: 3000,
    description: "How you'll deliver the solution"
  },
  {
    id: "management_plan",
    name: "Management Plan",
    category: "Required",
    defaultWordCount: 2500,
    description: "How you'll manage the project"
  },
  {
    id: "staffing_plan",
    name: "Staffing Plan",
    category: "Required",
    defaultWordCount: 1500,
    description: "Personnel strategy and resumes"
  },
  {
    id: "past_performance",
    name: "Past Performance",
    category: "Required",
    defaultWordCount: 2000,
    description: "Relevant experience and references"
  },
  {
    id: "quality_control",
    name: "Quality Control Plan",
    category: "Optional",
    defaultWordCount: 1800,
    description: "QA/QC processes and metrics"
  },
  {
    id: "transition_plan",
    name: "Transition Plan",
    category: "Optional",
    defaultWordCount: 1500,
    description: "Onboarding and knowledge transfer"
  },
  {
    id: "compliance",
    name: "Compliance & Certifications",
    category: "Optional",
    defaultWordCount: 1200,
    description: "Regulatory and certification requirements"
  }
];

export default function ContentPlanningModal({ isOpen, onClose, proposalId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSections, setSelectedSections] = useState([]);

  useEffect(() => {
    if (isOpen && proposalId) {
      loadExistingSections();
    }
  }, [isOpen, proposalId]);

  const loadExistingSections = async () => {
    try {
      setLoading(true);
      const sections = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId
      });
      
      const existingSectionTypes = sections.map(s => s.section_type);
      setSelectedSections(existingSectionTypes);
    } catch (error) {
      console.error("Error loading sections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSection = (sectionId) => {
    setSelectedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Load existing sections
      const existingSections = await base44.entities.ProposalSection.filter({
        proposal_id: proposalId
      });

      const existingSectionTypes = existingSections.map(s => s.section_type);

      // Create new sections that were selected but don't exist
      const sectionsToCreate = SECTION_LIBRARY.filter(section => 
        selectedSections.includes(section.id) && !existingSectionTypes.includes(section.id)
      );

      for (const section of sectionsToCreate) {
        await base44.entities.ProposalSection.create({
          proposal_id: proposalId,
          section_name: section.name,
          section_type: section.id,
          content: "",
          word_count: 0,
          status: "draft",
          order: SECTION_LIBRARY.findIndex(s => s.id === section.id)
        });
      }

      alert(`✓ Created ${sectionsToCreate.length} new section(s)!`);
      onClose();
    } catch (error) {
      console.error("Error saving sections:", error);
      alert("Error saving sections. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const requiredSections = SECTION_LIBRARY.filter(s => s.category === "Required");
  const optionalSections = SECTION_LIBRARY.filter(s => s.category === "Optional");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Plan Proposal Content
          </DialogTitle>
          <DialogDescription>
            Select the sections you want to include in your proposal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Summary Stats */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-900 font-medium">
                      {selectedSections.length} sections selected
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Est. {SECTION_LIBRARY.filter(s => selectedSections.includes(s.id)).reduce((sum, s) => sum + s.defaultWordCount, 0).toLocaleString()} words
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            {/* Required Sections */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Badge variant="destructive">Required</Badge>
                Core Sections
              </h3>
              <div className="space-y-2">
                {requiredSections.map((section) => (
                  <Card
                    key={section.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedSections.includes(section.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-blue-300"
                    )}
                    onClick={() => handleToggleSection(section.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedSections.includes(section.id)}
                          onCheckedChange={() => handleToggleSection(section.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <Label className="font-semibold text-slate-900 cursor-pointer">
                              {section.name}
                            </Label>
                            <Badge variant="outline" className="text-xs">
                              ~{section.defaultWordCount} words
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Optional Sections */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Badge variant="secondary">Optional</Badge>
                Additional Sections
              </h3>
              <div className="space-y-2">
                {optionalSections.map((section) => (
                  <Card
                    key={section.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedSections.includes(section.id)
                        ? "border-green-500 bg-green-50"
                        : "border-slate-200 hover:border-green-300"
                    )}
                    onClick={() => handleToggleSection(section.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedSections.includes(section.id)}
                          onCheckedChange={() => handleToggleSection(section.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <Label className="font-semibold text-slate-900 cursor-pointer">
                              {section.name}
                            </Label>
                            <Badge variant="outline" className="text-xs">
                              ~{section.defaultWordCount} words
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{section.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || selectedSections.length === 0}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Sections...
              </>
            ) : (
              `Create ${selectedSections.length} Section(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}