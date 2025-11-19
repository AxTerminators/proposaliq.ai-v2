import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { History, RotateCcw, Eye, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

/**
 * Section History Viewer
 * Shows all previous versions of a section with restore capability
 */
export default function SectionHistoryViewer({ section }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(null);

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['sectionHistory', section?.id],
    queryFn: async () => {
      if (!section?.id) return [];
      const records = await base44.entities.ProposalSectionHistory.filter(
        { proposal_section_id: section.id },
        '-version_number',
        50
      );
      return records;
    },
    enabled: isOpen && !!section?.id,
  });

  const restoreMutation = useMutation({
    mutationFn: async (historyRecord) => {
      // Create a new history record for current content before restoring
      await base44.entities.ProposalSectionHistory.create({
        proposal_section_id: section.id,
        version_number: (history[0]?.version_number || 0) + 1,
        content: section.content,
        changed_by_user_email: (await base44.auth.me()).email,
        changed_by_user_name: (await base44.auth.me()).full_name,
        change_summary: 'Saved before restoring from history',
        word_count: section.word_count,
        change_type: 'user_edit'
      });

      // Restore the historical content
      return base44.entities.ProposalSection.update(section.id, {
        content: historyRecord.content,
        word_count: historyRecord.word_count,
        status: 'reviewed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposalSections'] });
      queryClient.invalidateQueries({ queryKey: ['sectionHistory', section.id] });
      toast.success('Version restored successfully');
      setIsOpen(false);
      setPreviewVersion(null);
    },
    onError: (error) => {
      toast.error('Failed to restore version: ' + error.message);
    }
  });

  const handleRestore = (historyRecord) => {
    if (window.confirm(`Restore this version?\n\nThis will save your current content to history before restoring version ${historyRecord.version_number}.`)) {
      restoreMutation.mutate(historyRecord);
    }
  };

  const getChangeTypeColor = (type) => {
    switch (type) {
      case 'ai_generated': return 'bg-purple-100 text-purple-700';
      case 'ai_regenerated': return 'bg-pink-100 text-pink-700';
      case 'user_edit': return 'bg-blue-100 text-blue-700';
      case 'restored_from_history': return 'bg-amber-100 text-amber-700';
      case 'initial_creation': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (!section) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="w-4 h-4" />
          Version History
          {history.length > 0 && (
            <Badge variant="secondary" className="ml-1">{history.length}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Version History</SheetTitle>
          <SheetDescription>
            {section.section_name?.replace(/_/g, ' ')}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          )}

          {!isLoading && history.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No version history yet</p>
              <p className="text-xs mt-1">Changes will be tracked automatically</p>
            </div>
          )}

          {history.map((record, index) => (
            <Card 
              key={record.id}
              className={cn(
                "border-2 transition-all",
                previewVersion?.id === record.id && "border-blue-400 bg-blue-50"
              )}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="text-xs">Version {record.version_number}</Badge>
                        <Badge className={cn("text-xs", getChangeTypeColor(record.change_type))}>
                          {record.change_type?.replace(/_/g, ' ')}
                        </Badge>
                        {index === 0 && (
                          <Badge className="bg-green-500 text-xs">Latest</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        {record.changed_by_user_name || record.changed_by_user_email}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(record.created_date).toLocaleString()}
                      </p>
                      {record.change_summary && (
                        <p className="text-sm text-slate-700 mt-2 italic">
                          "{record.change_summary}"
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold">{record.word_count}</p>
                      <p className="text-xs text-slate-500">words</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant={previewVersion?.id === record.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewVersion(previewVersion?.id === record.id ? null : record)}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      {previewVersion?.id === record.id ? 'Hide' : 'Preview'}
                    </Button>
                    {index > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(record)}
                        disabled={restoreMutation.isPending}
                        className="flex-1"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restore
                      </Button>
                    )}
                  </div>

                  {/* Preview */}
                  {previewVersion?.id === record.id && (
                    <div className="border-t pt-3 mt-3">
                      <div className="prose prose-sm max-w-none max-h-96 overflow-y-auto bg-white p-4 rounded border">
                        <ReactMarkdown>{record.content || '*No content*'}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}