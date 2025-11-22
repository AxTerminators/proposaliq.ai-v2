import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  TrendingUp,
  Target,
  Calendar,
  DollarSign,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Analyze impact of amendments on proposal sections
 * Shows which sections need updates based on changes
 */
export default function AmendmentImpactAnalysis({ proposalId }) {
  const { data: amendments = [] } = useQuery({
    queryKey: ["amendments", proposalId],
    queryFn: () =>
      base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
        is_supplementary: true,
        supplementary_type: "amendment",
      }),
    enabled: !!proposalId,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ["proposalSections", proposalId],
    queryFn: () =>
      base44.entities.ProposalSection.filter({
        proposal_id: proposalId,
      }),
    enabled: !!proposalId,
  });

  // Analyze impact
  const impactAnalysis = React.useMemo(() => {
    if (amendments.length === 0) return null;

    const impacts = [];
    const affectedSections = new Set();

    amendments.forEach((amendment) => {
      let extracted = null;
      try {
        if (amendment.extracted_data) {
          extracted = JSON.parse(amendment.extracted_data);
        }
      } catch (e) {
        console.warn("Failed to parse amendment data");
      }

      if (!extracted) return;

      // Analyze changes
      const changes = extracted.changes_and_clarifications || [];

      changes.forEach((change) => {
        const changeLower = change.toLowerCase();

        // Map changes to affected sections
        const sectionMappings = [
          {
            keywords: ["technical", "methodology", "approach", "solution"],
            section: "technical_approach",
            label: "Technical Approach",
          },
          {
            keywords: ["management", "organization", "staffing", "team"],
            section: "management_plan",
            label: "Management Plan",
          },
          {
            keywords: ["schedule", "timeline", "deadline", "date"],
            section: "timeline",
            label: "Project Timeline",
          },
          {
            keywords: ["price", "cost", "budget", "fee"],
            section: "pricing",
            label: "Pricing",
          },
          {
            keywords: ["requirement", "specification", "deliverable"],
            section: "requirements",
            label: "Requirements",
          },
          {
            keywords: ["personnel", "staff", "key person", "resume"],
            section: "key_personnel",
            label: "Key Personnel",
          },
        ];

        sectionMappings.forEach((mapping) => {
          const hasKeyword = mapping.keywords.some((kw) =>
            changeLower.includes(kw)
          );

          if (hasKeyword) {
            affectedSections.add(mapping.section);

            // Determine severity
            let severity = "low";
            if (
              changeLower.includes("must") ||
              changeLower.includes("required") ||
              changeLower.includes("shall")
            ) {
              severity = "high";
            } else if (
              changeLower.includes("should") ||
              changeLower.includes("modified")
            ) {
              severity = "medium";
            }

            impacts.push({
              amendmentId: amendment.id,
              amendmentNumber: amendment.amendment_number,
              change,
              affectedSection: mapping.section,
              sectionLabel: mapping.label,
              severity,
            });
          }
        });
      });
    });

    // Check if sections exist and have been updated
    const sectionStatus = Array.from(affectedSections).map((sectionType) => {
      const section = sections.find((s) => s.section_type === sectionType);
      const sectionImpacts = impacts.filter(
        (i) => i.affectedSection === sectionType
      );

      const highSeverity = sectionImpacts.filter(
        (i) => i.severity === "high"
      ).length;

      return {
        sectionType,
        sectionLabel:
          sectionImpacts[0]?.sectionLabel || sectionType.replace(/_/g, " "),
        exists: !!section,
        needsUpdate: true,
        impacts: sectionImpacts,
        severity: highSeverity > 0 ? "high" : "medium",
      };
    });

    return {
      totalAmendments: amendments.length,
      totalChanges: impacts.length,
      affectedSections: sectionStatus,
      highPriority: sectionStatus.filter((s) => s.severity === "high").length,
    };
  }, [amendments, sections]);

  if (amendments.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No amendments to analyze</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!impactAnalysis) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400 mr-2" />
            <span className="text-slate-600">Analyzing impact...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityIcon = (severity) => {
    if (severity === "high")
      return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (severity === "medium")
      return <Target className="w-4 h-4 text-amber-600" />;
    return <TrendingUp className="w-4 h-4 text-blue-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Amendment Impact Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <Alert
          className={cn(
            "border-2",
            impactAnalysis.highPriority > 0
              ? "bg-red-50 border-red-300"
              : "bg-amber-50 border-amber-300"
          )}
        >
          <AlertTriangle
            className={cn(
              "h-5 w-5",
              impactAnalysis.highPriority > 0 ? "text-red-600" : "text-amber-600"
            )}
          />
          <AlertDescription>
            <strong>
              {impactAnalysis.totalAmendments} amendment
              {impactAnalysis.totalAmendments !== 1 ? "s" : ""} affecting{" "}
              {impactAnalysis.affectedSections.length} section
              {impactAnalysis.affectedSections.length !== 1 ? "s" : ""}
            </strong>
            {impactAnalysis.highPriority > 0 && (
              <span className="ml-2 text-red-700">
                ({impactAnalysis.highPriority} high priority)
              </span>
            )}
          </AlertDescription>
        </Alert>

        {/* Affected Sections */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {impactAnalysis.affectedSections.map((section, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 rounded-lg border-2",
                  section.severity === "high"
                    ? "bg-red-50 border-red-300"
                    : "bg-amber-50 border-amber-300"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(section.severity)}
                    <h4 className="font-semibold text-slate-900">
                      {section.sectionLabel}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {section.exists ? (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                        Exists
                      </Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-700 border-slate-300">
                        Not Created
                      </Badge>
                    )}
                    <Badge
                      className={cn(
                        section.severity === "high"
                          ? "bg-red-100 text-red-700 border-red-300"
                          : "bg-amber-100 text-amber-700 border-amber-300"
                      )}
                    >
                      Update Required
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">
                    Changes affecting this section:
                  </p>
                  {section.impacts.slice(0, 3).map((impact, iIdx) => (
                    <div
                      key={iIdx}
                      className="text-sm text-slate-600 pl-4 border-l-2 border-slate-300"
                    >
                      <div className="flex items-start gap-2 mb-1">
                        {impact.amendmentNumber && (
                          <Badge
                            variant="outline"
                            className="text-xs flex-shrink-0"
                          >
                            Amendment #{impact.amendmentNumber}
                          </Badge>
                        )}
                      </div>
                      <p>{impact.change}</p>
                    </div>
                  ))}
                  {section.impacts.length > 3 && (
                    <p className="text-xs text-slate-500 pl-4">
                      +{section.impacts.length - 3} more change
                      {section.impacts.length - 3 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                {section.exists && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      // Navigate to section edit
                      const url = `/proposal-builder?id=${proposalId}&section=${section.sectionType}`;
                      window.location.href = url;
                    }}
                  >
                    Review & Update Section
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}