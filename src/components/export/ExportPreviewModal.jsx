import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  FileType,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  BookOpen,
  List,
  Droplet,
  FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ExportPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  proposal,
  selectedFormat,
  selectedSections,
  willHaveWatermark,
  options
}) {
  const FormatIcon = selectedFormat === 'pdf' ? FileType : FileText;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            Confirm Export
          </DialogTitle>
          <DialogDescription>
            Review your export configuration before generating the document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Watermark Status Alert */}
          <div className={cn(
            "p-4 rounded-lg border-2",
            willHaveWatermark 
              ? "bg-orange-50 border-orange-200" 
              : "bg-green-50 border-green-200"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                willHaveWatermark ? "bg-orange-100" : "bg-green-100"
              )}>
                {willHaveWatermark ? (
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div className="flex-1">
                <p className={cn(
                  "font-semibold mb-1",
                  willHaveWatermark ? "text-orange-900" : "text-green-900"
                )}>
                  {willHaveWatermark ? "DRAFT watermark will be applied" : "No watermark - approved version"}
                </p>
                <p className={cn(
                  "text-sm",
                  willHaveWatermark ? "text-orange-700" : "text-green-700"
                )}>
                  {willHaveWatermark 
                    ? "This export is for review purposes. Approve proposal to remove watermark." 
                    : "This is the final version without watermark."}
                </p>
              </div>
            </div>
          </div>

          {/* Export Details */}
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Format */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FormatIcon className="w-5 h-5 text-slate-600" />
                  <span className="font-medium">Format:</span>
                </div>
                <Badge variant="outline" className="uppercase">
                  {selectedFormat}
                </Badge>
              </div>

              {/* Proposal */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-slate-600 mt-0.5" />
                  <div>
                    <span className="font-medium block">Proposal:</span>
                    <span className="text-sm text-slate-600">{proposal.proposal_name}</span>
                  </div>
                </div>
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <List className="w-5 h-5 text-slate-600" />
                  <span className="font-medium">Sections ({selectedSections.length}):</span>
                </div>
                <div className="ml-7 space-y-1 max-h-32 overflow-y-auto">
                  {selectedSections.map((section) => (
                    <div key={section.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      <span className="text-slate-700">{section.section_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className="border-t pt-3 space-y-2">
                {options.includeCoverPage && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <BookOpen className="w-4 h-4" />
                    <span>Cover page included</span>
                  </div>
                )}
                {options.includeTableOfContents && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <List className="w-4 h-4" />
                    <span>Table of contents included</span>
                  </div>
                )}
                {willHaveWatermark && (
                  <div className="flex items-center gap-2 text-sm text-orange-600">
                    <Droplet className="w-4 h-4" />
                    <span className="font-medium">DRAFT watermark will be applied</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Visual Preview */}
          <div className="bg-slate-50 rounded-lg p-4 border-2 border-dashed border-slate-300">
            <div className="text-center">
              <div className={cn(
                "w-16 h-20 mx-auto mb-3 rounded-lg border-4 relative",
                willHaveWatermark ? "border-orange-300 bg-orange-50" : "border-green-300 bg-green-50"
              )}>
                <FormatIcon className={cn(
                  "w-8 h-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
                  willHaveWatermark ? "text-orange-400" : "text-green-400"
                )} />
                {willHaveWatermark && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-orange-400 rotate-[-45deg] opacity-30">
                      DRAFT
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">Document Preview</p>
              <p className="text-xs text-slate-400 mt-1">
                {willHaveWatermark ? "With DRAFT watermark" : "Final version"}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className={cn(
              willHaveWatermark ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"
            )}
          >
            <Download className="w-4 h-4 mr-2" />
            {willHaveWatermark ? "Export with Watermark" : "Export Final Version"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}