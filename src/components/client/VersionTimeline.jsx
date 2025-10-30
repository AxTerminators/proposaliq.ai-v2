import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  Eye,
  Download,
  GitCompare,
  User,
  Clock,
  FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import moment from "moment";

export default function VersionTimeline({ sectionId }) {
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState(null);

  const { data: versions } = useQuery({
    queryKey: ['section-versions', sectionId],
    queryFn: () => base44.entities.ProposalSectionHistory.filter({ 
      proposal_section_id: sectionId 
    }, '-version_number'),
    initialData: []
  });

  const { data: currentSection } = useQuery({
    queryKey: ['current-section', sectionId],
    queryFn: async () => {
      const sections = await base44.entities.ProposalSection.filter({ id: sectionId });
      return sections[0];
    },
    enabled: !!sectionId
  });

  const getChangeTypeColor = (type) => {
    const colors = {
      user_edit: "bg-blue-100 text-blue-700",
      ai_generated: "bg-purple-100 text-purple-700",
      ai_regenerated: "bg-indigo-100 text-indigo-700",
      restored_from_history: "bg-amber-100 text-amber-700",
      initial_creation: "bg-green-100 text-green-700"
    };
    return colors[type] || "bg-slate-100 text-slate-700";
  };

  const getChangeTypeLabel = (type) => {
    const labels = {
      user_edit: "Manual Edit",
      ai_generated: "AI Generated",
      ai_regenerated: "AI Regenerated",
      restored_from_history: "Restored",
      initial_creation: "Initial Version"
    };
    return labels[type] || type;
  };

  const handleViewVersion = (version) => {
    setSelectedVersion(version);
    setCompareMode(false);
    setShowVersionDialog(true);
  };

  const handleCompare = (version) => {
    if (!compareVersion) {
      setCompareVersion(version);
      setCompareMode(true);
    } else {
      setSelectedVersion(version);
      setShowVersionDialog(true);
    }
  };

  const calculateDiff = (oldText, newText) => {
    // Simple word-level diff
    const oldWords = oldText.split(/\s+/);
    const newWords = newText.split(/\s+/);
    
    const added = newWords.filter(w => !oldWords.includes(w)).length;
    const removed = oldWords.filter(w => !newWords.includes(w)).length;
    const changed = Math.max(added, removed);
    
    return { added, removed, changed };
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Version History
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                {versions.length + 1} version{versions.length !== 0 ? 's' : ''} • Current + {versions.length} historical
              </p>
            </div>
            {compareMode && (
              <Badge className="bg-blue-100 text-blue-700">
                <GitCompare className="w-3 h-3 mr-1" />
                Compare Mode
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Version */}
            {currentSection && (
              <div className="relative pl-8 pb-8 border-l-2 border-blue-500">
                <div className="absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full bg-blue-500 border-4 border-white" />
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Badge className="bg-blue-600 text-white mb-2">Current Version</Badge>
                      <p className="font-semibold text-slate-900">
                        Latest ({currentSection.word_count || 0} words)
                      </p>
                      <p className="text-sm text-slate-600">
                        Last updated: {moment(currentSection.updated_date).format('MMM D, YYYY [at] h:mm A')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewVersion({ 
                        content: currentSection.content,
                        version_number: 'current',
                        changed_by_user_name: 'Current',
                        created_date: currentSection.updated_date
                      })}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Historical Versions */}
            {versions.map((version, index) => {
              const diff = index < versions.length - 1 
                ? calculateDiff(versions[index + 1].content, version.content)
                : { added: 0, removed: 0, changed: 0 };

              return (
                <div key={version.id} className="relative pl-8 pb-8 border-l-2 border-slate-300 last:border-0">
                  <div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-400 border-4 border-white" />
                  <div className="bg-white p-4 rounded-lg border-2 hover:border-blue-300 transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">v{version.version_number}</Badge>
                          <Badge className={getChangeTypeColor(version.change_type)}>
                            {getChangeTypeLabel(version.change_type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                          <User className="w-4 h-4" />
                          <span>{version.changed_by_user_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4" />
                          <span>{moment(version.created_date).format('MMM D, YYYY [at] h:mm A')}</span>
                        </div>
                        {version.change_summary && (
                          <p className="text-sm text-slate-700 mt-2 italic">"{version.change_summary}"</p>
                        )}
                        <div className="flex gap-3 mt-2 text-xs">
                          <span className="text-slate-600">
                            <FileText className="w-3 h-3 inline mr-1" />
                            {version.word_count || 0} words
                          </span>
                          {diff.changed > 0 && (
                            <>
                              {diff.added > 0 && (
                                <span className="text-green-600">+{diff.added}</span>
                              )}
                              {diff.removed > 0 && (
                                <span className="text-red-600">-{diff.removed}</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewVersion(version)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCompare(version)}
                          className={compareVersion?.id === version.id ? 'border-blue-500 bg-blue-50' : ''}
                        >
                          <GitCompare className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {versions.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No version history yet</p>
                <p className="text-sm">Changes will be tracked here</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Version View Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {compareMode && compareVersion && selectedVersion 
                ? `Compare v${compareVersion.version_number} vs v${selectedVersion.version_number}`
                : `Version ${selectedVersion?.version_number || 'Current'}`
              }
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {compareMode && compareVersion && selectedVersion ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Badge className="mb-2">v{compareVersion.version_number}</Badge>
                  <div className="p-4 bg-slate-50 rounded-lg border max-h-96 overflow-y-auto">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: compareVersion.content }}
                    />
                  </div>
                </div>
                <div>
                  <Badge className="mb-2">v{selectedVersion.version_number}</Badge>
                  <div className="p-4 bg-slate-50 rounded-lg border max-h-96 overflow-y-auto">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              selectedVersion && (
                <div className="p-6 bg-slate-50 rounded-lg border max-h-96 overflow-y-auto">
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                  />
                </div>
              )
            )}

            {selectedVersion && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Changed by</p>
                    <p className="font-semibold">{selectedVersion.changed_by_user_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Date</p>
                    <p className="font-semibold">
                      {moment(selectedVersion.created_date).format('MMM D, YYYY h:mm A')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Word Count</p>
                    <p className="font-semibold">{selectedVersion.word_count || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowVersionDialog(false);
                setCompareMode(false);
                setCompareVersion(null);
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}