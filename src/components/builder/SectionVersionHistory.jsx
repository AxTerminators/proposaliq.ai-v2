import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  RotateCcw,
  Eye,
  User,
  FileText,
  GitBranch,
  AlertCircle,
  CheckCircle2,
  History
} from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function SectionVersionHistory({ section, isOpen, onClose, onVersionRestored }) {
  const queryClient = useQueryClient();
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareVersionId, setCompareVersionId] = useState(null);
  const [showRevertConfirm, setShowRevertConfirm] = useState(false);
  const [versionToRevert, setVersionToRevert] = useState(null);

  const { data: versions, isLoading } = useQuery({
    queryKey: ['section-history', section?.id],
    queryFn: async () => {
      if (!section?.id) return [];
      return base44.entities.ProposalSectionHistory.filter(
        { proposal_section_id: section.id },
        '-version_number'
      );
    },
    initialData: [],
    enabled: !!section?.id && isOpen,
  });

  const revertMutation = useMutation({
    mutationFn: async ({ sectionId, versionContent, versionNumber }) => {
      const user = await base44.auth.me();
      
      // Update the section with the old content
      await base44.entities.ProposalSection.update(sectionId, {
        content: versionContent.content,
        word_count: versionContent.word_count,
        status: 'reviewed'
      });

      // Create a new version history entry marking this as a restoration
      const newVersionNumber = Math.max(...versions.map(v => v.version_number), 0) + 1;
      await base44.entities.ProposalSectionHistory.create({
        proposal_section_id: sectionId,
        version_number: newVersionNumber,
        content: versionContent.content,
        changed_by_user_email: user.email,
        changed_by_user_name: user.full_name,
        change_summary: `Restored from version ${versionNumber}`,
        word_count: versionContent.word_count,
        change_type: 'restored_from_history'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['section-history'] });
      queryClient.invalidateQueries({ queryKey: ['proposal-sections'] });
      setShowRevertConfirm(false);
      setVersionToRevert(null);
      if (onVersionRestored) onVersionRestored();
      alert("✓ Version restored successfully!");
    },
  });

  const handleRevert = (version) => {
    setVersionToRevert(version);
    setShowRevertConfirm(true);
  };

  const confirmRevert = () => {
    if (versionToRevert) {
      revertMutation.mutate({
        sectionId: section.id,
        versionContent: {
          content: versionToRevert.content,
          word_count: versionToRevert.word_count
        },
        versionNumber: versionToRevert.version_number
      });
    }
  };

  const getChangeTypeColor = (changeType) => {
    switch (changeType) {
      case 'ai_generated':
        return 'bg-purple-100 text-purple-700';
      case 'ai_regenerated':
        return 'bg-indigo-100 text-indigo-700';
      case 'user_edit':
        return 'bg-blue-100 text-blue-700';
      case 'restored_from_history':
        return 'bg-amber-100 text-amber-700';
      case 'initial_creation':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getChangeTypeIcon = (changeType) => {
    switch (changeType) {
      case 'ai_generated':
      case 'ai_regenerated':
        return '🤖';
      case 'user_edit':
        return '✏️';
      case 'restored_from_history':
        return '↩️';
      case 'initial_creation':
        return '🆕';
      default:
        return '📝';
    }
  };

  // Get current version (highest version number)
  const currentVersion = versions.length > 0 ? versions[0] : null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              Version History: {section?.section_name}
            </DialogTitle>
            <DialogDescription>
              Track changes, compare versions, and restore previous content
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600">Loading version history...</p>
              </div>
            ) : versions.length === 0 ? (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  No version history available for this section yet.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                <Alert className="bg-blue-50 border-blue-200">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <strong>{versions.length} version{versions.length !== 1 ? 's' : ''}</strong> saved. 
                    Current version: <strong>v{currentVersion?.version_number}</strong>
                  </AlertDescription>
                </Alert>

                {versions.map((version, index) => (
                  <Card 
                    key={version.id}
                    className={`${index === 0 ? 'border-blue-300 bg-blue-50' : 'hover:shadow-md'} transition-all`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="font-bold">
                              Version {version.version_number}
                            </Badge>
                            {index === 0 && (
                              <Badge className="bg-green-600 text-white">
                                Current
                              </Badge>
                            )}
                            <Badge className={getChangeTypeColor(version.change_type)}>
                              {getChangeTypeIcon(version.change_type)} {version.change_type?.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {version.word_count || 0} words
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{version.changed_by_user_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{format(new Date(version.created_date), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                          </div>

                          {version.change_summary && (
                            <p className="text-sm text-slate-700 italic">
                              "{version.change_summary}"
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedVersion(version);
                              setShowPreview(true);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Preview
                          </Button>
                          {index !== 0 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCompareVersionId(version.id);
                                  setShowCompare(true);
                                }}
                              >
                                <GitBranch className="w-3 h-3 mr-1" />
                                Compare
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevert(version)}
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Restore
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {showPreview && selectedVersion && (
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                Version {selectedVersion.version_number} Preview
              </DialogTitle>
              <DialogDescription>
                By {selectedVersion.changed_by_user_name} on {format(new Date(selectedVersion.created_date), 'MMM d, yyyy h:mm a')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto prose max-w-none p-4 border rounded-lg bg-slate-50">
              <div dangerouslySetInnerHTML={{ __html: selectedVersion.content }} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Compare Dialog */}
      {showCompare && compareVersionId && currentVersion && (
        <Dialog open={showCompare} onOpenChange={setShowCompare}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Compare Versions</DialogTitle>
              <DialogDescription>
                Side-by-side comparison of current version vs. selected version
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="font-semibold text-blue-900 text-sm">
                      Current Version ({currentVersion.version_number})
                    </p>
                    <p className="text-xs text-blue-700">
                      {currentVersion.word_count} words • {format(new Date(currentVersion.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="prose max-w-none p-4 border rounded-lg bg-white max-h-[60vh] overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: currentVersion.content }} />
                  </div>
                </div>
                <div>
                  <div className="mb-2 p-2 bg-slate-50 border border-slate-200 rounded">
                    <p className="font-semibold text-slate-900 text-sm">
                      Selected Version ({versions.find(v => v.id === compareVersionId)?.version_number})
                    </p>
                    <p className="text-xs text-slate-700">
                      {versions.find(v => v.id === compareVersionId)?.word_count} words • {format(new Date(versions.find(v => v.id === compareVersionId)?.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="prose max-w-none p-4 border rounded-lg bg-white max-h-[60vh] overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: versions.find(v => v.id === compareVersionId)?.content }} />
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Revert Confirmation */}
      <AlertDialog open={showRevertConfirm} onOpenChange={setShowRevertConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              Restore Previous Version?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                You are about to restore <strong>version {versionToRevert?.version_number}</strong> of this section.
              </p>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-900 text-sm font-medium mb-1">ℹ️ What happens:</p>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Current content will be replaced with the selected version</li>
                  <li>• A new version will be created marking this restoration</li>
                  <li>• You can always undo this by restoring a different version</li>
                  <li>• No data is permanently lost</li>
                </ul>
              </div>
              <p className="text-slate-700">
                Version details: <strong>{versionToRevert?.word_count} words</strong> by {versionToRevert?.changed_by_user_name}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRevert}
              className="bg-amber-600 hover:bg-amber-700"
              disabled={revertMutation.isPending}
            >
              {revertMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Yes, Restore Version
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}