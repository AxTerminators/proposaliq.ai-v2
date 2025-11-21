import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, FileText, Calendar, TrendingUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * DuplicateResourceDialog - Shows potential duplicate resources and offers resolution options
 */
export default function DuplicateResourceDialog({
  isOpen,
  onClose,
  duplicates,
  onLinkExisting,
  onUploadAnyway,
}) {
  if (!duplicates || duplicates.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <DialogTitle>Potential Duplicate Resources Found</DialogTitle>
          </div>
          <DialogDescription>
            We found {duplicates.length} existing resource{duplicates.length > 1 ? 's' : ''} that might be similar to your upload.
            You can link to an existing resource instead of uploading a duplicate.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {duplicates.map((duplicate, index) => (
              <div
                key={duplicate.id}
                className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <h4 className="font-semibold text-slate-900">
                        {duplicate.title}
                      </h4>
                      {index === 0 && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          Best Match
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {duplicate.file_name}
                    </p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {duplicate.similarity_score}% match
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(duplicate.created_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Used {duplicate.usage_count || 0} times
                  </div>
                </div>

                <p className="text-sm text-slate-600">
                  <span className="font-medium">Why it matches:</span> {duplicate.match_reason}
                </p>

                {index === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLinkExisting(duplicate)}
                    className="w-full mt-2"
                  >
                    Link to This Resource
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Linking to existing resources helps maintain data quality and improves AI performance
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onUploadAnyway} className="bg-blue-600 hover:bg-blue-700">
              Upload Anyway
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}