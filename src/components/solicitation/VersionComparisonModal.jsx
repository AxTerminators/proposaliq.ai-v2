import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ArrowRight,
  GitCompare,
  AlertTriangle,
  FileText,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Compare two versions of solicitation documents
 * Highlights what changed between base and amendments
 */
export default function VersionComparisonModal({
  isOpen,
  onClose,
  proposalId,
  baseDocumentId = null,
}) {
  const [selectedBase, setSelectedBase] = useState(baseDocumentId || "");
  const [selectedCompare, setSelectedCompare] = useState("");

  const { data: documents = [] } = useQuery({
    queryKey: ["solicitation-docs", proposalId],
    queryFn: () =>
      base44.entities.SolicitationDocument.filter({
        proposal_id: proposalId,
      }),
    enabled: isOpen && !!proposalId,
  });

  // Fetch comparison if both selected
  const { data: comparison, isLoading: comparing } = useQuery({
    queryKey: ["doc-comparison", selectedBase, selectedCompare],
    queryFn: async () => {
      const baseDoc = documents.find((d) => d.id === selectedBase);
      const compareDoc = documents.find((d) => d.id === selectedCompare);

      if (!baseDoc || !compareDoc) return null;

      // Extract and compare content
      let baseContent = null;
      let compareContent = null;

      try {
        if (baseDoc.extracted_data) {
          baseContent = JSON.parse(baseDoc.extracted_data);
        }
      } catch (e) {
        console.warn("Failed to parse base content");
      }

      try {
        if (compareDoc.extracted_data) {
          compareContent = JSON.parse(compareDoc.extracted_data);
        }
      } catch (e) {
        console.warn("Failed to parse compare content");
      }

      // Identify changes
      const changes = [];

      if (
        compareContent?.changes_and_clarifications &&
        compareContent.changes_and_clarifications.length > 0
      ) {
        compareContent.changes_and_clarifications.forEach((change) => {
          changes.push({
            type: "change",
            text: change,
            severity: "high",
          });
        });
      }

      // Compare requirements
      if (baseContent?.key_requirements && compareContent?.key_requirements) {
        const baseReqs = new Set(baseContent.key_requirements);
        const newReqs = compareContent.key_requirements.filter(
          (req) => !baseReqs.has(req)
        );

        newReqs.forEach((req) => {
          changes.push({
            type: "new_requirement",
            text: req,
            severity: "medium",
          });
        });
      }

      // Compare dates
      if (baseContent?.important_dates && compareContent?.important_dates) {
        const baseDates = new Set(baseContent.important_dates);
        const newDates = compareContent.important_dates.filter(
          (date) => !baseDates.has(date)
        );

        newDates.forEach((date) => {
          changes.push({
            type: "date_change",
            text: date,
            severity: "high",
          });
        });
      }

      return {
        baseDoc,
        compareDoc,
        changes,
        summary: {
          totalChanges: changes.length,
          highSeverity: changes.filter((c) => c.severity === "high").length,
          mediumSeverity: changes.filter((c) => c.severity === "medium").length,
        },
      };
    },
    enabled: !!selectedBase && !!selectedCompare && selectedBase !== selectedCompare,
  });

  const baseDocuments = documents.filter((d) => !d.is_supplementary);
  const supplementaryDocs = documents.filter((d) => d.is_supplementary);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle>Document Version Comparison</DialogTitle>
              <DialogDescription>
                Compare solicitation documents to identify changes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Document Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Base Document
              </label>
              <Select value={selectedBase} onValueChange={setSelectedBase}>
                <SelectTrigger>
                  <SelectValue placeholder="Select base document" />
                </SelectTrigger>
                <SelectContent>
                  {baseDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.file_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Compare With
              </label>
              <Select value={selectedCompare} onValueChange={setSelectedCompare}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document to compare" />
                </SelectTrigger>
                <SelectContent>
                  {supplementaryDocs.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.file_name}
                      {doc.amendment_number && ` (Amendment #${doc.amendment_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison Results */}
          {comparing && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-slate-600">Comparing documents...</span>
            </div>
          )}

          {comparison && !comparing && (
            <>
              {/* Summary */}
              <Alert
                className={cn(
                  "border-2",
                  comparison.summary.highSeverity > 0
                    ? "bg-red-50 border-red-300"
                    : comparison.summary.totalChanges > 0
                    ? "bg-amber-50 border-amber-300"
                    : "bg-green-50 border-green-300"
                )}
              >
                <AlertTriangle
                  className={cn(
                    "h-5 w-5",
                    comparison.summary.highSeverity > 0
                      ? "text-red-600"
                      : comparison.summary.totalChanges > 0
                      ? "text-amber-600"
                      : "text-green-600"
                  )}
                />
                <AlertDescription className="text-sm">
                  <strong>
                    {comparison.summary.totalChanges} change
                    {comparison.summary.totalChanges !== 1 ? "s" : ""} detected
                  </strong>
                  {comparison.summary.highSeverity > 0 && (
                    <span className="ml-2 text-red-700">
                      ({comparison.summary.highSeverity} critical)
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {/* Changes List */}
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="space-y-3">
                  {comparison.changes.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No significant changes detected</p>
                    </div>
                  ) : (
                    comparison.changes.map((change, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "p-4 rounded-lg border-l-4",
                          change.severity === "high"
                            ? "bg-red-50 border-red-500"
                            : change.severity === "medium"
                            ? "bg-amber-50 border-amber-500"
                            : "bg-blue-50 border-blue-500"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <Badge
                            className={cn(
                              "mt-0.5",
                              change.severity === "high"
                                ? "bg-red-100 text-red-700 border-red-300"
                                : change.severity === "medium"
                                ? "bg-amber-100 text-amber-700 border-amber-300"
                                : "bg-blue-100 text-blue-700 border-blue-300"
                            )}
                          >
                            {change.type.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                          <p className="text-sm text-slate-900 flex-1">
                            {change.text}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Document Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-sm">
                  <p className="font-medium text-slate-700 mb-1">Base:</p>
                  <p className="text-slate-600">
                    {comparison.baseDoc.file_name}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="font-medium text-slate-700 mb-1">Comparing:</p>
                  <p className="text-slate-600">
                    {comparison.compareDoc.file_name}
                  </p>
                </div>
              </div>
            </>
          )}

          {!selectedBase || !selectedCompare ? (
            <div className="text-center py-12 text-slate-500">
              <ArrowRight className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Select both documents to compare</p>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}